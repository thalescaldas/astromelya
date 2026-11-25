/**
 * Genesis viva — parâmetros do campo de partículas, parallax e gravidade.
 * Fonte única para refinamentos. Distâncias relativas usam a largura da
 * fotografia exibida (`w`), para que a composição seja igual em qualquer tela.
 */
export const FIELD = {
  /** Centro orbital (fração da fotografia): coração da flor, junto aos estames. */
  center: { x: 0.53, y: 0.44 },

  particles: {
    desktop: 110,
    mobile: 42,
    /** Abaixo desta largura de viewport, usa a contagem mobile. */
    mobileBreakpoint: 768,
    /** Diâmetro do núcleo em px CSS (antes do halo suave). */
    size: { min: 0.5, max: 2 },
    /** Raio orbital (fração de w). */
    radius: { min: 0.1, max: 0.5 },
    /** Achatamento da elipse orbital (ry/rx). */
    flatten: { min: 0.45, max: 0.9 },
    /** Velocidade angular (rad/s): uma volta leva de ~60 s a ~3 min. */
    angularSpeed: { min: 0.035, max: 0.1 },
    /** Ondulação orgânica sobre a órbita (fração de w) e sua frequência (Hz). */
    wander: { amplitude: 0.018, frequency: { min: 0.03, max: 0.09 } },
    /** Cintilação lenta do brilho (Hz) e profundidade da variação. */
    twinkle: { frequency: { min: 0.05, max: 0.18 }, depth: 0.4 },
    /** Opacidade máxima do núcleo e do halo. */
    alpha: { core: 1, halo: 0.4 },
    /** Halo = núcleo × este fator. */
    haloScale: 5,
  },

  /**
   * Surgimento gradual: recompensa quem permanece na Home.
   * Após o florescimento, a população cresce partícula a partícula ao longo de
   * `totalSeconds` de permanência visível, seguindo
   *   progress = clamp((elapsed / totalSeconds) ^ exponent, 0, 1)
   * (lenta no início). Nascimentos com jitter estratificado: sem intervalos
   * mecânicos e sem grupos simultâneos.
   */
  emergence: {
    totalSeconds: 180,
    exponent: 1.4,
    /** Fade-in individual de cada partícula (s). */
    fade: { min: 4, max: 8 },
    /** Ao voltar à Home na mesma sessão, as já nascidas reaparecem com este fade (s). */
    resumeFade: 1.5,
    /** Tempo de permanência acumulado na sessão (sessionStorage). */
    storageKey: "astromelya:field-elapsed",
    /** Intervalo de gravação do progresso (s). */
    saveInterval: 2,
    /** Maior passo de tempo contabilizado por quadro (s): ignora travamentos. */
    maxStep: 0.25,
  },

  parallax: {
    /** Deslocamento máximo (px CSS). */
    far: 6,
    flower: 8,
    near: 20,
    /** Constante de suavização (1/s): maior = responde mais rápido. */
    smoothing: 2.4,
  },

  gravity: {
    /** Ativação e retorno (s). */
    rise: 1.5,
    release: 2.5,
    /** Área de toque: elipse ao redor do centro (fração de w). */
    hitRadius: { x: 0.3, y: 0.42 },
    /** Anel de condensação ao redor do centro (fração de w). */
    ring: { min: 0.015, max: 0.09 },
    /** Rotação do anel sob gravidade (rad/s) — trajetórias curvas. */
    spin: 0.55,
    /** Rigidez da atração e da volta à órbita (1/s²); amortecimento crítico. */
    pull: 2.2,
    home: 3.2,
    /** Velocidade máxima (fração de w por segundo): sem sucção abrupta. */
    maxSpeed: 0.32,
    /** Intensificação do brilho sob gravidade. */
    glow: 0.9,
  },

  performance: {
    maxPixelRatio: 2,
    /** Janela de medição (quadros) e limites de tempo médio por quadro (ms). */
    sampleFrames: 90,
    reduceAt: 20,
    reduceTo: 0.6,
  },
} as const;
