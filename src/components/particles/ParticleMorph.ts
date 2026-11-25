import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  OrthographicCamera,
  Points,
  Scene,
  ShaderMaterial,
  WebGLRenderer,
} from "three";

/**
 * Sistema de partículas que se dissolve de uma forma e se reconstrói em outra.
 * `uProgress` (0 → 1) conduz a transição; cada partícula tem atraso, deriva
 * e brilho próprios, com um leve redemoinho gravitacional em torno do centro.
 * Reutilizável nas próximas fases (órbita da flor, easter egg).
 */

const vertexShader = /* glsl */ `
  attribute vec3 aFrom;
  attribute vec3 aTo;
  attribute vec4 aSeed;

  uniform float uProgress;
  uniform float uTime;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uScatter;

  varying float vAlpha;

  float easeInOutCubic(float t) {
    return t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0;
  }

  void main() {
    float delay = aSeed.x * 0.4;
    float t = clamp((uProgress - delay) / 0.6, 0.0, 1.0);
    float e = easeInOutCubic(t);
    float arc = sin(3.14159265 * t);

    vec3 pos = mix(aFrom, aTo, e);

    // Atração gravitacional: contrai e gira em torno do centro durante o voo.
    vec2 p = pos.xy * (1.0 - 0.22 * arc);
    float swirl = arc * (0.55 + 0.6 * aSeed.z) * (1.0 - smoothstep(0.0, uScatter * 5.0, length(p)));
    float s = sin(swirl);
    float c = cos(swirl);
    p = mat2(c, -s, s, c) * p;

    // Deriva orgânica individual.
    float angle = aSeed.y * 6.2831853 + uTime * (0.5 + aSeed.z);
    p += vec2(cos(angle), sin(angle * 1.3)) * uScatter * (0.25 + aSeed.w) * arc;

    pos.xy = p;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = uSize * uPixelRatio * (0.75 + aSeed.z * 0.5) * (1.0 + arc * 0.5);

    float flicker = 0.8 + 0.2 * sin(uTime * (3.0 + aSeed.w * 4.0) + aSeed.y * 40.0);
    vAlpha = (0.55 + 0.45 * aSeed.w) * mix(1.0, flicker, arc);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vAlpha;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float a = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(uColor, a * vAlpha * uOpacity);
  }
`;

export interface ParticleMorphUniforms {
  uProgress: { value: number };
  uOpacity: { value: number };
  uTime: { value: number };
  uSize: { value: number };
  uPixelRatio: { value: number };
  uScatter: { value: number };
  uColor: { value: Color };
  [key: string]: { value: unknown };
}

export class ParticleMorph {
  readonly uniforms: ParticleMorphUniforms;
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera = new OrthographicCamera(-1, 1, 1, -1, -10, 10);
  private readonly geometry = new BufferGeometry();
  private readonly material: ShaderMaterial;

  static isSupported(): boolean {
    try {
      const canvas = document.createElement("canvas");
      return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
    } catch {
      return false;
    }
  }

  constructor(canvas: HTMLCanvasElement, color = "#d9d9d9") {
    this.renderer = new WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
      powerPreference: "high-performance",
    });
    this.renderer.setClearColor(0x000000, 0);

    this.uniforms = {
      uProgress: { value: 0 },
      uOpacity: { value: 0 },
      uTime: { value: 0 },
      uSize: { value: 1.6 },
      uPixelRatio: { value: 1 },
      uScatter: { value: 80 },
      uColor: { value: new Color(color) },
    };

    this.material = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: this.uniforms,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: AdditiveBlending,
    });

    const points = new Points(this.geometry, this.material);
    points.frustumCulled = false;
    this.scene.add(points);
  }

  setShapes(from: Float32Array, to: Float32Array): void {
    const count = Math.min(from.length, to.length) / 3;
    const seeds = new Float32Array(count * 4);
    for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random();

    this.geometry.setAttribute("position", new BufferAttribute(from.slice(0, count * 3), 3));
    this.geometry.setAttribute("aFrom", new BufferAttribute(from.slice(0, count * 3), 3));
    this.geometry.setAttribute("aTo", new BufferAttribute(to.slice(0, count * 3), 3));
    this.geometry.setAttribute("aSeed", new BufferAttribute(seeds, 4));
  }

  resize(width: number, height: number): void {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    this.camera.left = -width / 2;
    this.camera.right = width / 2;
    this.camera.top = height / 2;
    this.camera.bottom = -height / 2;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(width, height, false);
    this.uniforms.uPixelRatio.value = ratio;
    this.uniforms.uScatter.value = Math.min(width, height) * 0.12;
  }

  render(time: number): void {
    this.uniforms.uTime.value = time;
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.renderer.dispose();
  }
}
