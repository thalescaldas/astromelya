/**
 * Sistema evolutivo da Astromelya.
 *
 * A fase visual ativa é definida manualmente em `ACTIVE_PHASE_ID`.
 * Não há evolução automática, contagem regressiva ou indicador público de fase.
 *
 * Cada fase concentra, por configuração, tudo o que muda entre estágios:
 * imagem da flor, partículas, animações e áudio. Os blocos ainda não
 * implementados ficam desativados e servem como contrato para as próximas etapas.
 */

export type PhaseId = "genesis" | "metamorphosis";

export type PhaseStatus = "active" | "reserved";

export interface FlowerAsset {
  /** Caminho público da imagem oficial (não modificar o arquivo). */
  src: string;
  /** Dimensões intrínsecas — preservam a proporção original. */
  width: number;
  height: number;
  /** Texto alternativo. */
  alt: string;
  /**
   * Ponto focal da flor dentro da imagem (0–1). Usado para centralizar
   * a composição quando as margens escuras da imagem são recortadas
   * em telas estreitas.
   */
  focal: { x: number; y: number };
}

export interface ParticlesConfig {
  enabled: boolean;
  /** Preset futuro (ex.: órbita luminosa, dissolução, gravidade). */
  preset: "orbit" | "dissolve" | "gravity" | null;
  density: number;
}

export interface AnimationConfig {
  /**
   * Introdução (~3 s): nome → deformação orgânica → partículas → símbolo.
   * `oncePerSession` evita repetir a introdução na mesma sessão do navegador
   * (adicione `?intro` à URL para assistir novamente).
   */
  intro: { enabled: boolean; durationMs: number; oncePerSession: boolean };
  /** Parallax e profundidade em torno da flor. */
  parallax: { enabled: boolean; intensity: number };
  /** Distorção gravitacional / deformação orgânica. */
  distortion: { enabled: boolean; strength: number };
  /** Easter egg ao pressionar a flor. */
  easterEgg: { enabled: boolean };
}

export interface AudioConfig {
  enabled: boolean;
  src: string | null;
}

export interface EvolutionPhase {
  id: PhaseId;
  order: number;
  name: string;
  status: PhaseStatus;
  flower: FlowerAsset;
  particles: ParticlesConfig;
  animations: AnimationConfig;
  audio: AudioConfig;
}

const FLOWER_WIDTH = 1672;
const FLOWER_HEIGHT = 941;

const disabledAnimations: AnimationConfig = {
  intro: { enabled: false, durationMs: 3000, oncePerSession: true },
  parallax: { enabled: false, intensity: 0 },
  distortion: { enabled: false, strength: 0 },
  easterEgg: { enabled: false },
};

const disabledParticles: ParticlesConfig = {
  enabled: false,
  preset: null,
  density: 0,
};

const disabledAudio: AudioConfig = { enabled: false, src: null };

export const phases: Record<PhaseId, EvolutionPhase> = {
  genesis: {
    id: "genesis",
    order: 1,
    name: "Genesis",
    status: "active",
    flower: {
      src: "/flowers/genesis.webp",
      width: FLOWER_WIDTH,
      height: FLOWER_HEIGHT,
      alt: "Flor Genesis em preto e branco sobre fundo escuro",
      focal: { x: 0.484, y: 0.5 },
    },
    particles: disabledParticles,
    animations: {
      ...disabledAnimations,
      intro: { enabled: true, durationMs: 3000, oncePerSession: true },
    },
    audio: disabledAudio,
  },
  metamorphosis: {
    id: "metamorphosis",
    order: 2,
    name: "Metamorphosis",
    status: "reserved",
    flower: {
      src: "/flowers/metamorphosis.webp",
      width: FLOWER_WIDTH,
      height: FLOWER_HEIGHT,
      alt: "Flor Metamorphosis em preto e branco sobre fundo escuro",
      focal: { x: 0.5, y: 0.5 },
    },
    particles: disabledParticles,
    animations: disabledAnimations,
    audio: disabledAudio,
  },
};

/** Fase visual ativa — altere manualmente para evoluir o site. */
export const ACTIVE_PHASE_ID: PhaseId = "genesis";

export function getActivePhase(): EvolutionPhase {
  return phases[ACTIVE_PHASE_ID];
}
