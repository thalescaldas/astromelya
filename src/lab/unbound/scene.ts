import {
  AmbientLight,
  Box3,
  Color,
  DirectionalLight,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  ACESFilmicToneMapping,
  Vector3,
  WebGLRenderer,
  type BufferGeometry,
  type Object3D,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { LAB_UNBOUND, type UnboundParams } from "./config";
import { createMembraneMaterial } from "./membrane";

export interface UnboundSceneOptions {
  container: HTMLElement;
  params: UnboundParams;
  onReady?: (info: { vertices: number; triangles: number }) => void;
}

export interface UnboundScene {
  resize(width: number, height: number, pixelRatio: number): void;
  dispose(): void;
}

/**
 * Cena do laboratório: uma única entidade, câmera fixa (exceto em inspect),
 * renderização sob demanda (nenhum ciclo contínuo; sem animação automática).
 */
export function createUnboundScene({ container, params, onReady }: UnboundSceneOptions): UnboundScene {
  const renderer = new WebGLRenderer({ antialias: true });
  renderer.setClearColor(LAB_UNBOUND.renderer.background, 1);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  Object.assign(renderer.domElement.style, { display: "block", width: "100%", height: "100%" });
  container.appendChild(renderer.domElement);

  const scene = new Scene();
  scene.background = new Color(LAB_UNBOUND.renderer.background);
  const C = LAB_UNBOUND.camera;
  const camera = new PerspectiveCamera(C.fov, 1, C.near, C.far);
  const L = LAB_UNBOUND.lighting;
  for (const l of [L.key, L.rim, L.fill]) {
    const light = new DirectionalLight(0xffffff, l.intensity);
    light.position.set(l.position[0], l.position[1], l.position[2]);
    scene.add(light);
  }
  scene.add(new AmbientLight(0xffffff, L.ambient));

  const membrane = createMembraneMaterial();
  const clay = new MeshStandardMaterial({ ...LAB_UNBOUND.clay, side: DoubleSide });
  const wire = new MeshBasicMaterial({ color: 0xd9d9d9, wireframe: true, transparent: true, opacity: 0.45 });
  const useClay = params.view === "clay" || (params.view === "inspect" && params.look === "clay");

  let mesh: Mesh | null = null;
  let disposed = false;
  let width = 1;
  let height = 1;
  const center = new Vector3();
  const half = new Vector3(1, 1, 1);
  let framed = false; // a câmera é enquadrada no modelo uma vez (inspect: depois o usuário controla)
  let controls: { dispose(): void; target: Vector3; addEventListener(t: string, f: () => void): void } | null = null;

  const render = () => {
    if (disposed || !mesh) return;
    membrane.uniforms.uCenterDist.value = camera.position.distanceTo(center);
    renderer.render(scene, camera);
  };

  const fit = () => {
    camera.aspect = width / height;
    const vfov = (C.fov * Math.PI) / 180;
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
    const dist = Math.max(half.x / Math.tan(hfov / 2), half.y / Math.tan(vfov / 2)) * C.margin + half.z;
    if (!controls || !framed) {
      camera.position.copy(center).addScaledVector(new Vector3(...C.direction).normalize(), dist);
      camera.lookAt(center);
      if (mesh) framed = true;
    }
    camera.updateProjectionMatrix();
  };

  const src = params.variant ? LAB_UNBOUND.study[params.variant] : LAB_UNBOUND.model;
  new GLTFLoader().load(src, (gltf) => {
    if (disposed) return;
    gltf.scene.traverse((node: Object3D) => {
      if ((node as Mesh).isMesh) mesh = node as Mesh;
    });
    if (!mesh) return;
    const m = mesh as Mesh;
    m.material = params.view === "wireframe" ? wire : useClay ? clay : membrane;
    const geometry = m.geometry as BufferGeometry;
    const box = new Box3().setFromObject(gltf.scene);
    box.getCenter(center);
    box.getSize(half).multiplyScalar(0.5);
    scene.add(gltf.scene);
    fit();
    if (controls) controls.target.copy(center);
    render();
    onReady?.({
      vertices: geometry.attributes.position.count,
      triangles: (geometry.index ? geometry.index.count : geometry.attributes.position.count) / 3,
    });
  });

  if (params.view === "inspect") {
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
      fit();
      render();
    },
    dispose() {
      disposed = true;
      controls?.dispose();
      mesh?.geometry.dispose();
      membrane.dispose();
      clay.dispose();
      wire.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
