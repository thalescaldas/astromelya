/**
 * Relógio único da introdução (segundos) — FONTE ÚNICA DE VERDADE.
 *
 * Todas as etapas derivam deste relógio — no shader e na linha do tempo GSAP —
 * e a duração total (`INTRO_DURATION_MS`) também. Nenhum outro arquivo define
 * a duração da introdução.
 *
 * As etapas se sobrepõem de propósito: não existe um instante em que uma
 * etapa "termina" e outra "começa".
 *
 *   0.00 ── revelação ── 0.80
 *     0.35 ──────── deformação + atração gravitacional (lenta) ──────── 3.20
 *                  1.70 ──────── dissolução em partículas ──────── 3.50
 *                                   3.20 ─────────── condensação gradual (partículas flutuando) ─────────── 5.70
 *                                                                              5.70 ──── contemplação ──── 6.90
 *                                                                                        6.90 ── o símbolo se desfaz ── 7.60
 *                                                                                           7.15 ────── flor ────── 8.00
 *                                                                                            7.20 ── cabeçalho + Projetos ── 7.90
 *
 * O símbolo não se desloca: desaparece no centro enquanto o símbolo oficial
 * se materializa no cabeçalho, junto com a flor e o botão Projetos.
 */
export const INTRO_TIMINGS = {
  REVEAL_END: 0.8,
  DEFORM_START: 0.35,
  DEFORM_END: 3.2,
  /** Os primeiros traços se desprendem em 1,7 s; os últimos, em 3,5 s. */
  DISSOLVE_START: 1.7,
  DISSOLVE_SPAN: 1.8,
  BIRTH_FADE: 0.18,
  /** Viagem mínima de uma partícula: nenhuma é "sugada" em menos de 1,6 s. */
  MIN_TRAVEL: 1.6,
  /** Condensação gradual: o centro do símbolo se forma primeiro, as pontas por último. */
  SOLID_START: 3.35,
  SOLID_SPAN: 1.95,
  CONDENSE_IN: 0.05,
  CONDENSE_OUT: 0.45,
  /** Contemplação: 5,7 s → 6,9 s, símbolo completo, nítido e estável. */
  SYMBOL_FADE_START: 6.9,
  SYMBOL_FADE_END: 7.6,
  /** Símbolo do cabeçalho e botão Projetos surgem juntos. */
  CHROME_START: 7.2,
  CHROME_DURATION: 0.7,
  FLOWER_START: 7.15,
  FLOWER_DURATION: 0.85,
  TOTAL: 8.0,
  /** Janela usada para medir o desempenho antes de as partículas surgirem. */
  ADAPT_AT: 1.2,
} as const;

/** Duração total da introdução em milissegundos (derivada, não editar). */
export const INTRO_DURATION_MS = Math.round(INTRO_TIMINGS.TOTAL * 1000);
