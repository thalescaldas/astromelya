import {
  AmbientLight,
  BufferGeometry,
  Color,
  DirectionalLight,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  ACESFilmicToneMapping,
  WebGLRenderer,
  DoubleSide,
  type Object3D,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { LAB_GENESIS } from "../config";
import type { LabStage, ThreeStageOptions } from "../types";

const { camera: CAM, reference: REF } = LAB_GENESIS;

/**
 * Estágio tridimensional: cena Three.js real com o modelo exportado do Blender.
 * Câmera fixa (exceto em ?view=inspect). Renderização sob demanda: a cena só
 * é redesenhada ao carregar, ao redimensionar ou ao inspecionar.
 */
export function createThreeStage(options: ThreeStageOptions): LabStage {
  const { container, wireframe, inspect } = options;
  const renderer = new WebGLRenderer({ antialias: LAB_GENESIS.renderer.antialias, alpha: false });
  renderer.setClearColor(LAB_GENESIS.renderer.background, 1);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = LAB_GENESIS.renderer.exposure;
  renderer.domElement.style.display = "block";
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  container.appendChild(renderer.domElement);

  const scene = new Scene();
  scene.background = new Color(LAB_GENESIS.renderer.background);
  const camera = new PerspectiveCamera(CAM.photoFov, 1, CAM.near, CAM.far);
  camera.position.set(...CAM.position);
  camera.lookAt(...CAM.target);

  const L = LAB_GENESIS.lighting;
  const key = new DirectionalLight(0xffffff, L.key.intensity);
  key.position.set(...L.key.position);
  const fill = new DirectionalLight(0xffffff, L.fill.intensity);
  fill.position.set(...L.fill.position);
  const rim = new DirectionalLight(0xffffff, L.rim.intensity);
  rim.position.set(...L.rim.position);
  scene.add(key, fill, rim, new AmbientLight(0xffffff, L.ambient.intensity));

  const M = LAB_GENESIS.materials;
  const neutral = new MeshStandardMaterial({ ...M.neutral, side: DoubleSide });
  const anther = new MeshStandardMaterial({ ...M.anther, side: DoubleSide });
  const wire = new MeshBasicMaterial({ color: M.wireframe.color, wireframe: true, transparent: true, opacity: M.wireframe.opacity });

  let disposed = false;
  let width = 1;
  let height = 1;
  let controls: { update(): boolean; dispose(): void; addEventListener(t: string, f: () => void): void; target: { set(x: number, y: number, z: number): void } } | null = null;
  const geometries: BufferGeometry[] = [];

  const render = () => {
    if (!disposed) renderer.render(scene, camera);
  };

  /**
   * fov que faz o modelo ocupar a mesma área da fotografia de referência:
   * a foto ocupa min(88% da altura, 175% da largura / proporção) da tela.
   */
  const fitCamera = () => {
    const ratio = REF.width / REF.height;
    const photoHeight = Math.min(height * REF.heightRatio, (width * 1.75) / ratio);
    const half = Math.tan((CAM.photoFov * Math.PI) / 360) * (height / photoHeight);
    camera.fov = (Math.atan(half) * 360) / Math.PI;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };

  new GLTFLoader().load(LAB_GENESIS.model.src, (gltf) => {
    if (disposed) return;
    let vertices = 0;
    let triangles = 0;
    let meshes = 0;
    gltf.scene.traverse((node: Object3D) => {
      const mesh = node as Mesh;
      if (!mesh.isMesh) return;
      meshes++;
      const geometry = mesh.geometry as BufferGeometry;
      geometries.push(geometry);
      vertices += geometry.attributes.position.count;
      triangles += (geometry.index ? geometry.index.count : geometry.attributes.position.count) / 3;
      mesh.material = wireframe ? wire : mesh.name.startsWith(LAB_GENESIS.model.nodes.anthers) ? anther : neutral;
    });
    scene.add(gltf.scene);
    render();
    options.onReady?.({ meshes, vertices, triangles });
  });

  if (inspect) {
    // Somente na inspeção: rotação/zoom livres. Importado sob demanda.
    void import("three/examples/jsm/controls/OrbitControls.js").then(({ OrbitControls }) => {
      if (disposed) return;
      const c = new OrbitControls(camera, renderer.domElement);
      c.target.set(-0.1, 0, 0);
      c.enableDamping = false;
      c.addEventListener("change", render);
      controls = c;
      render();
    });
  }

  return {
    resize(w, h, pixelRatio) {
      width = Math.max(1, w);
      height = Math.max(1, h);
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(width, height, false);
      fitCamera();
      render();
    },
    dispose() {
      disposed = true;
      controls?.dispose();
      for (const g of geometries) g.dispose();
      neutral.dispose();
      anther.dispose();
      wire.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
