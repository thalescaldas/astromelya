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
 *                              2.20 ──────── condensação no símbolo ──────── 3.00
 *                                                3.30 ── o símbolo se desfaz no centro ── 3.95
 *                                                     3.55 ── símbolo do cabeçalho + Projetos ── 4.25
 *                                                    3.50 ─────────── flor ─────────── 4.70
 *
 * O símbolo não se desloca: desaparece no centro enquanto o símbolo oficial
 * se materializa no cabeçalho, junto com a flor e o botão Projetos.
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
  SYMBOL_FADE_START: 3.3,
  SYMBOL_FADE_END: 3.95,
  /** Símbolo do cabeçalho e botão Projetos surgem juntos. */
  CHROME_START: 3.55,
  CHROME_DURATION: 0.7,
  FLOWER_START: 3.5,
  FLOWER_DURATION: 1.2,
  TOTAL: 4.7,
  /** Janela usada para medir o desempenho antes de as partículas surgirem. */
  ADAPT_AT: 0.85,
} as const;

export const INTRO_BASE_DURATION = INTRO_TIMINGS.TOTAL;
