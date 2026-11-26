/**
 * Laboratório The Unbound — parâmetros (escultura orgânica do About).
 * Modelo gerado por unbound/scripts/build_blender.py.
 */
export const UNBOUND_STATES = ["origin", "essence", "beyond-form", "metamorphosis", "unknown"] as const;
export type UnboundState = (typeof UNBOUND_STATES)[number];

/** Índice do morph target de cada estado (origin = forma base, sem morph). */
export const MORPH_INDEX: Record<UnboundState, number> = {
  origin: -1,
  essence: 0,
  "beyond-form": 1,
  metamorphosis: 2,
  unknown: 3,
};

export const LAB_UNBOUND = {
  model: "/lab/unbound/unbound.glb",
  camera: { fov: 30, near: 0.05, far: 60, position: [0.35, 0.25, 6.2] as const, margin: 1.06 },
  renderer: { maxPixelRatio: 2, exposure: 1.0, background: 0x000000 },
  /** Iluminação cinematográfica provisória: chave lateral alta, recorte traseiro forte, sombras profundas. */
  lighting: {
    key: { intensity: 2.6, position: [-3, 3.5, 2.5] as const },
    rim: { intensity: 3.2, position: [2.5, 1.5, -4] as const },
    fill: { intensity: 0.18, position: [3, -1, 3] as const },
    ambient: 0.04,
  },
  materials: {
    neutral: { color: 0xb4b4b4, roughness: 0.55, metalness: 0 },
    wireframe: { color: 0xd9d9d9, opacity: 0.5 },
  },
  /** Transição entre estados no modo inspect (teclas 1–5), em segundos. */
  inspectTransition: 1.2,
} as const;

export type UnboundView = UnboundState | "compare" | "wireframe" | "inspect";

export function parseParams(search: string): { view: UnboundView; state: UnboundState; look: "neutral" | "ethereal" } {
  const q = new URLSearchParams(search);
  const v = q.get("view") ?? "beyond-form";
  const s = q.get("state") ?? "beyond-form";
  const isState = (x: string): x is UnboundState => (UNBOUND_STATES as readonly string[]).includes(x);
  const view: UnboundView = isState(v) || v === "compare" || v === "wireframe" || v === "inspect" ? v : "beyond-form";
  return { view, state: isState(s) ? s : "beyond-form", look: q.get("look") === "ethereal" ? "ethereal" : "neutral" };
}
