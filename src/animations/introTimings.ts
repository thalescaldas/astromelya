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
 *     0.35 ──────────── deformação + atração gravitacional (lenta) ──────────── 3.20
 *                    1.70 ──────────── dissolução em partículas ──────────── 3.50
 *                                                3.20 ──── condensação no símbolo ──── 4.20
 *                                                                4.20 ──── contemplação ──── 5.40
 *                                                                          5.40 ── o símbolo se desfaz ── 6.10
 *                                                                             5.65 ────── flor ────── 6.50
 *                                                                              5.70 ── cabeçalho + Projetos ── 6.40
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
  /** Viagem mínima de uma partícula; garante que os últimos traços cheguem até ~4,2 s. */
  MIN_TRAVEL: 0.55,
  /** Condensação: o centro do símbolo se forma primeiro, as pontas por último. */
  SOLID_START: 3.15,
  SOLID_SPAN: 0.78,
  CONDENSE_IN: 0.03,
  CONDENSE_OUT: 0.27,
  /** Contemplação: 4,2 s → 5,4 s, símbolo completo, nítido e estável. */
  SYMBOL_FADE_START: 5.4,
  SYMBOL_FADE_END: 6.1,
  /** Símbolo do cabeçalho e botão Projetos surgem juntos. */
  CHROME_START: 5.7,
  CHROME_DURATION: 0.7,
  FLOWER_START: 5.65,
  FLOWER_DURATION: 0.85,
  TOTAL: 6.5,
  /** Janela usada para medir o desempenho antes de as partículas surgirem. */
  ADAPT_AT: 1.2,
} as const;

/** Duração total da introdução em milissegundos (derivada, não editar). */
export const INTRO_DURATION_MS = Math.round(INTRO_TIMINGS.TOTAL * 1000);
