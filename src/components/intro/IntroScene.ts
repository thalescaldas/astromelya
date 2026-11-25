import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  LinearFilter,
  Mesh,
  NormalBlending,
  AdditiveBlending,
  OrthographicCamera,
  PlaneGeometry,
  Points,
  Scene,
  ShaderMaterial,
  Vector2,
  WebGLRenderer,
  type Texture,
} from "three";
import { samplePoints, type Raster } from "@/components/particles/raster";
import {
  particleFragment,
  particleVertex,
  symbolFragment,
  symbolVertex,
  wordmarkFragment,
  wordmarkVertex,
} from "./shaders";

/**
 * Cena única da introdução: nome, partículas e símbolo vivem no mesmo
 * espaço (pixels CSS, origem no centro da viewport, y para cima) e são
 * conduzidos por um único uniforme de relógio. O símbolo se forma e se
 * desfaz no centro; o símbolo definitivo surge no cabeçalho (DOM).
 */

export interface IntroSceneParams {
  canvas: HTMLCanvasElement;
  viewport: { width: number; height: number };
  pixelRatio: number;
  wordmark: Raster;
  symbol: Raster;
  particleCount: number;
}

/* Mesma função usada no shader (ordem de nascimento / chegada). */
function trigNoise(x: number, y: number): number {
  return 0.5 + 0.25 * (Math.sin(1.7 * x + 0.9 * y) + Math.sin(-0.8 * x + 1.3 * y + 1.7));
}

export class IntroScene {
  readonly uniforms;
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera: OrthographicCamera;
  private readonly disposables: { dispose(): void }[] = [];
  private readonly points: Points;
  private readonly count: number;

  static isSupported(): boolean {
    try {
      const canvas = document.createElement("canvas");
      return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
    } catch {
      return false;
    }
  }

  constructor(params: IntroSceneParams) {
    const { canvas, viewport, pixelRatio, wordmark, symbol } = params;
    const { width: vw, height: vh } = viewport;

    this.renderer = new WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
      powerPreference: "high-performance",
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(vw, vh, false);

    this.camera = new OrthographicCamera(-vw / 2, vw / 2, vh / 2, -vh / 2, -1, 1);

    const symbolRadius = Math.max(symbol.width, symbol.height) / 2;

    this.uniforms = {
      uClock: { value: 0 },
      uWordHalf: { value: wordmark.width / 2 },
      uWordAmp: { value: Math.max(3, wordmark.width * 0.024) },
      uSymbolRadius: { value: symbolRadius },
      uSize: { value: vw < 768 ? 1.5 : 1.7 },
      uPixelRatio: { value: pixelRatio },
      uScatter: { value: Math.min(vw, vh) * 0.06 },
    };

    this.addWordmark(wordmark);
    this.addSymbol(symbol);

    this.count = params.particleCount;
    this.points = this.createParticles(wordmark, symbol, params.particleCount, symbolRadius);
    this.scene.add(this.points);

    // Compila os shaders antes da linha do tempo começar (evita travadas).
    this.renderer.compile(this.scene, this.camera);
  }

  private texture(raster: Raster): Texture {
    const texture = new CanvasTexture(raster.canvas);
    texture.generateMipmaps = false;
    texture.minFilter = LinearFilter;
    texture.magFilter = LinearFilter;
    texture.needsUpdate = true;
    this.disposables.push(texture);
    return texture;
  }

  private material(vertexShader: string, fragmentShader: string, extra: Record<string, { value: unknown }>, additive = false) {
    const material = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: { ...this.uniforms, ...extra },
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: additive ? AdditiveBlending : NormalBlending,
    });
    this.disposables.push(material);
    return material;
  }

  private addWordmark(raster: Raster) {
    // Área maior que o nome para acomodar a deformação.
    const geometry = new PlaneGeometry(raster.width * 1.3, raster.height * 6);
    this.disposables.push(geometry);
    const mesh = new Mesh(
      geometry,
      this.material(wordmarkVertex, wordmarkFragment, {
        uMap: { value: this.texture(raster) },
        uSize: { value: new Vector2(raster.width, raster.height) },
      }),
    );
    mesh.renderOrder = 0;
    mesh.frustumCulled = false;
    this.scene.add(mesh);
  }

  private addSymbol(raster: Raster) {
    const geometry = new PlaneGeometry(raster.width, raster.height);
    this.disposables.push(geometry);
    const mesh = new Mesh(
      geometry,
      this.material(symbolVertex, symbolFragment, {
        uMap: { value: this.texture(raster) },
        uSize: { value: new Vector2(raster.width, raster.height) },
      }),
    );
    mesh.renderOrder = 1;
    mesh.frustumCulled = false;
    this.scene.add(mesh);
  }

  /**
   * Cada partícula liga um ponto do nome a um ponto do símbolo. Os pares são
   * ordenados: quem nasce primeiro (bordas do nome) chega primeiro (centro do
   * símbolo), o que mantém a formação contínua. Depois são embaralhados para
   * que reduzir a quantidade desenhada preserve a distribuição.
   */
  private createParticles(wordmark: Raster, symbol: Raster, count: number, symbolRadius: number): Points {
    const from = samplePoints(wordmark, count);
    const to = samplePoints(symbol, count);
    const half = wordmark.width / 2;

    const birthKey = new Float32Array(count);
    const arriveKey = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const fx = from[i * 2];
      const fy = from[i * 2 + 1];
      const edge = 1 - Math.min(Math.abs(fx) / half, 1);
      birthKey[i] = 0.6 * edge + 0.4 * trigNoise(fx * 0.02, fy * 0.02);
      const tx = to[i * 2];
      const ty = to[i * 2 + 1];
      arriveKey[i] = 0.8 * (Math.hypot(tx, ty) / symbolRadius) + 0.2 * trigNoise(tx * 0.06, ty * 0.06);
    }
    const byBirth = Array.from({ length: count }, (_, i) => i).sort((a, b) => birthKey[a] - birthKey[b]);
    const byArrive = Array.from({ length: count }, (_, i) => i).sort((a, b) => arriveKey[a] - arriveKey[b]);

    // Embaralhamento (Fisher–Yates) aplicado aos pares.
    const order = Array.from({ length: count }, (_, i) => i);
    for (let i = count - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [order[i], order[j]] = [order[j], order[i]];
    }

    const aFrom = new Float32Array(count * 2);
    const aTo = new Float32Array(count * 2);
    const aSeed = new Float32Array(count * 4);
    for (let k = 0; k < count; k++) {
      const rank = order[k];
      const fi = byBirth[rank];
      const ti = byArrive[rank];
      aFrom[k * 2] = from[fi * 2];
      aFrom[k * 2 + 1] = from[fi * 2 + 1];
      aTo[k * 2] = to[ti * 2];
      aTo[k * 2 + 1] = to[ti * 2 + 1];
      for (let c = 0; c < 4; c++) aSeed[k * 4 + c] = Math.random();
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(new Float32Array(count * 3), 3));
    geometry.setAttribute("aFrom", new BufferAttribute(aFrom, 2));
    geometry.setAttribute("aTo", new BufferAttribute(aTo, 2));
    geometry.setAttribute("aSeed", new BufferAttribute(aSeed, 4));
    this.disposables.push(geometry);

    const points = new Points(geometry, this.material(particleVertex, particleFragment, {}, true));
    points.renderOrder = 2;
    points.frustumCulled = false;
    return points;
  }

  /** Ajusta a quantidade desenhada (0–1) conforme o desempenho medido. */
  setDensity(ratio: number): void {
    this.points.geometry.setDrawRange(0, Math.max(1, Math.floor(this.count * ratio)));
  }

  render(clock: number): void {
    this.uniforms.uClock.value = clock;
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    for (const item of this.disposables) item.dispose();
    this.disposables.length = 0;
    this.renderer.dispose();
    // Libera o contexto WebGL imediatamente, sem esperar o coletor de lixo.
    this.renderer.forceContextLoss();
  }
}
