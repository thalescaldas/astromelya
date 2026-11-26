/**
 * Laboratório Genesis 3D — parâmetros planejados.
 *
 * ESTADO: preparação. Nada abaixo além de `reference` e `camera` é usado ainda.
 * Os blocos marcados como "planejado" documentam o contrato que a futura cena
 * tridimensional (Three.js + glTF) deverá seguir; servem de ponto único para
 * refinamentos, como src/config/field.ts na Home.
 */
export const LAB_GENESIS = {
  /** Referência visual atual: a fotografia oficial, centralizada. */
  reference: {
    src: "/flowers/genesis.webp",
    width: 1672,
    height: 941,
    /** Fração da altura da viewport ocupada pela referência (como na Home). */
    heightRatio: 0.88,
  },

  /** Câmera fixa (sem órbita, sem zoom, sem parallax). */
  camera: {
    fov: 35,
    position: [0, 0, 4] as const,
    target: [0, 0, 0] as const,
    near: 0.1,
    far: 50,
  },

  /** Planejado: renderizador. */
  renderer: {
    maxPixelRatio: 2,
    antialias: true,
    toneMapping: "ACESFilmic" as const,
    exposure: 1,
    background: "#000000",
  },

  /** Planejado: modelo fotorrealista da flor (glTF binário, Draco/Meshopt). */
  model: {
    src: "/lab/genesis/genesis.glb",
    /** Nós esperados no arquivo, para segmentação e deformação por parte. */
    nodes: { petals: "petal_", stem: "stem", stamens: "stamen_" },
  },

  /** Planejado: iluminação de estúdio monocromática (fundo preto absoluto). */
  lighting: {
    key: { intensity: 2.2, position: [2.5, 3, 4] as const },
    rim: { intensity: 1.4, position: [-3, 2, -2] as const },
    ambient: { intensity: 0.05 },
  },

  /** Planejado: materiais das pétalas (translucidez leve, sem cor). */
  materials: {
    petal: { roughness: 0.55, sheen: 0.35, transmission: 0.08, thickness: 0.02 },
    stem: { roughness: 0.7 },
  },

  /** Planejado: interação por raycasting com o cursor/toque. */
  interaction: {
    /** Raio de influência do contato (unidades de mundo). */
    radius: 0.18,
  },

  /** Planejado: deformação localizada de vértices + simulação elástica. */
  elasticity: {
    /** Deslocamento máximo de um vértice (unidades de mundo). */
    maxDisplacement: 0.04,
    /** Mola de retorno e amortecimento (por segundo). */
    stiffness: 38,
    damping: 7,
    /** Propagação ao longo da pétala (0 = local, 1 = pétala inteira). */
    falloff: 0.65,
  },
} as const;
