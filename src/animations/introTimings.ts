/**
 * Relógio único da introdução (segundos, na duração de referência).
 *
 * Todas as etapas derivam deste relógio — no shader e na linha do tempo GSAP —
 * e se sobrepõem de propósito: não existe um instante em que uma etapa
 * "termina" e outra "começa".
 *
 *   0.00 ───── revelação ───── 0.80
 *        0.35 ─────────── deformação + atração gravitacional ───────── 2.10
 *                  0.95 ────────── dissolução (nascimento das partículas) ── 2.30
 *                              2.20 ──────── condensação no símbolo ──────── 3.40
 *                                    2.70 ─────────── migração (Bézier) ─────────── 4.15
 *                                          3.00 ─────── flor ─────── 4.30
 *                                                         4.05 ─ troca ─ 4.20
 */
export const INTRO_TIMINGS = {
  REVEAL_END: 0.8,
  DEFORM_START: 0.35,
  DEFORM_END: 2.1,
  DISSOLVE_START: 0.95,
  DISSOLVE_SPAN: 1.35,
  BIRTH_FADE: 0.16,
  MIN_TRAVEL: 0.85,
  SOLID_START: 2.2,
  SOLID_SPAN: 0.9,
  CONDENSE_IN: 0.05,
  CONDENSE_OUT: 0.32,
  FLIGHT_START: 2.7,
  FLIGHT_END: 4.15,
  HANDOFF_START: 4.05,
  HANDOFF_END: 4.2,
  FLOWER_START: 3.0,
  FLOWER_DURATION: 1.3,
  NAV_START: 3.55,
  NAV_DURATION: 0.65,
  TOTAL: 4.3,
  /** Janela usada para medir o desempenho antes de as partículas surgirem. */
  ADAPT_AT: 0.85,
} as const;

export const INTRO_BASE_DURATION = INTRO_TIMINGS.TOTAL;
