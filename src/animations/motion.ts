/**
 * Tokens de movimento compartilhados pelas futuras animações (GSAP / Three.js).
 * Nenhuma animação é executada nesta fase.
 */
export const easing = {
  cinematic: "power3.inOut",
  organic: "sine.inOut",
  reveal: "expo.out",
} as const;

export const duration = {
  fast: 0.24,
  base: 0.6,
  slow: 1.2,
  intro: 3,
} as const;

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** Retorna `true` quando o usuário solicitou redução de movimento. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return true;
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}
