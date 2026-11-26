/**
 * Laboratório Genesis 3D — parâmetros.
 *
 * A câmera reproduz exatamente a usada no ajuste do modelo à fotografia
 * (genesis3d/params/genesis.json): fov vertical 30° sobre a altura da foto,
 * posição (0, 0, 4) olhando para a origem. No laboratório, a foto ocupa
 * `reference.heightRatio` da altura da tela; o fov é recalculado para que o
 * modelo ocupe exatamente a mesma área.
 */
export const LAB_GENESIS = {
  /** Referência visual: a fotografia oficial, centralizada. */
  reference: {
    src: "/flowers/genesis.webp",
    width: 1672,
    height: 941,
    /** Fração da altura da viewport ocupada pela referência (como na Home). */
    heightRatio: 0.88,
  },

  /** Câmera fixa (sem órbita, sem zoom, sem parallax) — igual à do ajuste. */
  camera: {
    /** fov vertical (graus) que cobre exatamente a altura da fotografia. */
    photoFov: 30,
    position: [0, 0, 4] as const,
    target: [0, 0, 0] as const,
    near: 0.05,
    far: 40,
  },

  renderer: {
    maxPixelRatio: 2,
    antialias: true,
    exposure: 1.05,
    background: 0x000000,
  },

  /** Modelo exportado pelo Blender (genesis3d/scripts/build_blender.py). */
  model: {
    src: "/lab/genesis/genesis.glb",
    nodes: { petals: "petal_", stem: "stem", stamens: "stamen_", anthers: "anther_" },
  },

  /** Iluminação provisória monocromática (luz principal do alto à esquerda, como na foto). */
  lighting: {
    key: { intensity: 3.2, position: [-2.5, 3.2, 3.5] as const },
    fill: { intensity: 0.45, position: [3, -1, 2.5] as const },
    rim: { intensity: 1.6, position: [2, 2.5, -3] as const },
    ambient: { intensity: 0.08 },
  },

  /** Material neutro para avaliar a geometria (sem texturas). */
  materials: {
    neutral: { color: 0xbdbdbd, roughness: 0.62, metalness: 0 },
    anther: { color: 0x2a2a2a, roughness: 0.75, metalness: 0 },
    wireframe: { color: 0xd9d9d9, opacity: 0.55 },
  },

  /** Planejado (próximas etapas): raycasting e simulação elástica. */
  interaction: { radius: 0.18 },
  elasticity: { maxDisplacement: 0.04, stiffness: 38, damping: 7, falloff: 0.65 },
} as const;

/** Modos de diagnóstico (somente via ?view=). O padrão é o modelo, sem controles. */
export type LabView = "model" | "reference" | "wireframe" | "compare" | "inspect";

export function parseView(search: string): LabView {
  const v = new URLSearchParams(search).get("view");
  return v === "reference" || v === "wireframe" || v === "compare" || v === "inspect" ? v : "model";
}
