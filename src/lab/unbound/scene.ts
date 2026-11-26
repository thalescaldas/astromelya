import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  AmbientLight,
  Box3,
  BufferAttribute,
  Color,
  DirectionalLight,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
  type BufferGeometry,
  type Material,
  type Object3D,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { LAB_UNBOUND, MORPH_INDEX, UNBOUND_STATES, type UnboundState, type UnboundView } from "./config";

export interface UnboundSceneOptions {
  container: HTMLElement;
  view: UnboundView;
  state: UnboundState;
  look: "neutral" | "ethereal";
  onReady?: (info: { vertices: number; triangles: number; morphTargets: number }) => void;
}

export interface UnboundScene {
  resize(width: number, height: number, pixelRatio: number): void;
  dispose(): void;
}

/** Pesos dos morph targets para um estado (origin = todos 0). */
function weightsFor(state: UnboundState): number[] {
  const w = [0, 0, 0, 0];
  const i = MORPH_INDEX[state];
  if (i >= 0) w[i] = 1;
  return w;
}

/**
 * Prévia "ethereal" (diagnóstico, não é o material definitivo): membrana
 * aditiva com brilho de Fresnel nas bordas e fibras longitudinais pelo UV,
 * para comparar a geometria com a concept art.
 */
function etherealMaterial(): Material {
  const m = new MeshStandardMaterial({ side: DoubleSide, transparent: true, depthWrite: false, blending: AdditiveBlending });
  m.defines = { USE_UV: "" };
  m.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <dithering_fragment>",
      `#include <dithering_fragment>
      float fres = pow(1.0 - abs(dot(normalize(vViewPosition), normal)), 2.4);
      float fib = pow(abs(cos(vUv.x * 3.14159 * 22.0 + sin(vUv.y * 9.0) * 0.9)), 46.0) * (1.0 - 0.7 * vUv.y);
      float body = 0.035 + 0.75 * fres + 0.22 * fib;
      gl_FragColor = vec4(vec3(0.92) * body, 1.0);`,
    );
  };
  return m;
}

export function createUnboundScene(options: UnboundSceneOptions): UnboundScene {
  const { container, view, look } = options;
  const renderer = new WebGLRenderer({ antialias: true });
  renderer.setClearColor(LAB_UNBOUND.renderer.background, 1);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = LAB_UNBOUND.renderer.exposure;
  renderer.autoClear = false;
  Object.assign(renderer.domElement.style, { display: "block", width: "100%", height: "100%" });
  container.appendChild(renderer.domElement);

  const scene = new Scene();
  scene.background = new Color(LAB_UNBOUND.renderer.background);
  const C = LAB_UNBOUND.camera;
  const camera = new PerspectiveCamera(C.fov, 1, C.near, C.far);
  camera.position.set(...C.position);

  const L = LAB_UNBOUND.lighting;
  for (const l of [L.key, L.rim, L.fill]) {
    const light = new DirectionalLight(0xffffff, l.intensity);
    light.position.set(l.position[0], l.position[1], l.position[2]);
    scene.add(light);
  }
  scene.add(new AmbientLight(0xffffff, L.ambient));

  const neutral = new MeshStandardMaterial({ ...LAB_UNBOUND.materials.neutral, side: DoubleSide });
  const wire = new MeshBasicMaterial({ color: LAB_UNBOUND.materials.wireframe.color, wireframe: true, transparent: true, opacity: LAB_UNBOUND.materials.wireframe.opacity });
  const ethereal = etherealMaterial();

  let mesh: Mesh | null = null;
  let width = 1;
  let height = 1;
  let disposed = false;
  let raf = 0;
  let controls: { dispose(): void; update(): boolean; target: Vector3; addEventListener(t: string, f: () => void): void } | null = null;
  const current = weightsFor(options.state);
  const target = [...current];
  const center = new Vector3();
  const halfSize = new Vector3(1, 1, 1);

  const setWeights = (w: number[]) => {
    if (mesh?.morphTargetInfluences) w.forEach((v, i) => (mesh!.morphTargetInfluences![i] = v));
  };

  const render = () => {
    if (disposed || !mesh) return;
    renderer.setScissorTest(false);
    renderer.clear();
    if (view === "compare") {
      // cinco estados lado a lado, mesmo enquadramento e mesma escala
      const n = UNBOUND_STATES.length;
      const pw = width / n;
      camera.aspect = pw / height;
      fitCamera(pw, height);
      renderer.setScissorTest(true);
      UNBOUND_STATES.forEach((s, i) => {
        setWeights(weightsFor(s));
        renderer.setViewport(i * pw, 0, pw, height);
        renderer.setScissor(i * pw, 0, pw, height);
        renderer.render(scene, camera);
      });
      return;
    }
    setWeights(current);
    renderer.setViewport(0, 0, width, height);
    renderer.render(scene, camera);
  };

  /** Distância da câmera para caber a esfera que envolve TODOS os estados. */
  const fitCamera = (w: number, h: number) => {
    camera.aspect = w / h;
    const vfov = (C.fov * Math.PI) / 180;
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
    // enquadramento por eixo: meia-largura e meia-altura reais de todos os estados
    const dist =
      Math.max(halfSize.x / Math.tan(hfov / 2), halfSize.y / Math.tan(vfov / 2)) * C.margin + halfSize.z;
    if (!controls) {
      const dir = new Vector3(...C.position).normalize();
      camera.position.copy(center).addScaledVector(dir, dist);
      camera.lookAt(center);
    }
    camera.updateProjectionMatrix();
  };

  new GLTFLoader().load(LAB_UNBOUND.model, (gltf) => {
    if (disposed) return;
    gltf.scene.traverse((node: Object3D) => {
      if ((node as Mesh).isMesh) mesh = node as Mesh;
    });
    if (!mesh) return;
    const m = mesh as Mesh;
    const geometry = m.geometry as BufferGeometry;
    m.material = view === "wireframe" ? wire : look === "ethereal" ? ethereal : neutral;
    m.frustumCulled = false;
    // limites de todos os estados (base + cada morph absoluto)
    const box = new Box3().setFromBufferAttribute(geometry.attributes.position as BufferAttribute);
    const base = geometry.attributes.position as BufferAttribute;
    for (const t of geometry.morphAttributes.position ?? []) {
      const p = new Vector3();
      for (let i = 0; i < base.count; i += 7) {
        p.set(base.getX(i) + t.getX(i), base.getY(i) + t.getY(i), base.getZ(i) + t.getZ(i));
        box.expandByPoint(p);
      }
    }
    box.getCenter(center);
    box.getSize(halfSize).multiplyScalar(0.5);
    scene.add(gltf.scene);
    fitCamera(width, height);
    if (controls) controls.target.copy(center);
    render();
    const index = geometry.index;
    options.onReady?.({
      vertices: base.count,
      triangles: (index ? index.count : base.count) / 3,
      morphTargets: geometry.morphAttributes.position?.length ?? 0,
    });
  });

  // ── inspect: rotação/zoom livres; teclas 1–5 transitam entre os estados ──
  const onKey = (e: KeyboardEvent) => {
    const i = Number(e.key) - 1;
    if (!(i >= 0 && i < UNBOUND_STATES.length)) return;
    weightsFor(UNBOUND_STATES[i]).forEach((v, k) => (target[k] = v));
    const from = [...current];
    const t0 = performance.now();
    cancelAnimationFrame(raf);
    const step = (now: number) => {
      const x = Math.min(1, (now - t0) / (LAB_UNBOUND.inspectTransition * 1000));
      const e2 = x * x * (3 - 2 * x);
      for (let k = 0; k < current.length; k++) current[k] = from[k] + (target[k] - from[k]) * e2;
      render();
      if (x < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  };
  if (view === "inspect") {
    window.addEventListener("keydown", onKey);
    void import("three/examples/jsm/controls/OrbitControls.js").then(({ OrbitControls }) => {
      if (disposed) return;
      const c = new OrbitControls(camera, renderer.domElement);
      c.target.copy(center);
      c.addEventListener("change", render);
      controls = c as unknown as typeof controls;
      render();
    });
  }

  return {
    resize(w, h, pixelRatio) {
      width = Math.max(1, w);
      height = Math.max(1, h);
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(width, height, false);
      // viewport/scissor do Three usam pixels CSS
      fitCamera(width, height);
      render();
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      controls?.dispose();
      mesh?.geometry.dispose();
      neutral.dispose();
      wire.dispose();
      ethereal.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
