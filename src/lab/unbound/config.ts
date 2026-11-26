/**
 * The Unbound Hybrid — laboratório (estado Beyond Form).
 * Modelo gerado por unbound/scripts/build_hybrid.py a partir do campo implícito.
 */
export const LAB_UNBOUND = {
  model: "/lab/unbound/beyond-form.glb",
  /** Variações volumétricas estudadas (diagnóstico: &variant=A|B|C). */
  study: { A: "/lab/unbound/study/beyond-form-A.glb", B: "/lab/unbound/study/beyond-form-B.glb", C: "/lab/unbound/study/beyond-form-C.glb" },
  reference: { src: "/lab/unbound/reference/beyond-form.png", width: 440, height: 595 },
  camera: { fov: 28, near: 0.05, far: 60, direction: [0.12, 0.06, 1] as const, margin: 1.08 },
  renderer: { maxPixelRatio: 2, background: 0x000000 },
  /** Membrana translúcida preliminar (shader aditivo: sem problemas de ordenação). */
  membrane: {
    base: 0.034, // densidade mínima (face vista de frente)
    fresnel: 0.42, // brilho nas bordas e superfícies rasantes
    fresnelPower: 2.1,
    fibers: 0.11, // microfibras direcionais
    fiberScale: [34, 89] as const, // densidade das fibras primárias e finas (inteiros: sem emenda)
    side: 0.06, // luz lateral suave (revela curvatura)
    depthFade: 0.45, // atenuação das camadas posteriores
    tint: [0.86, 0.87, 0.9] as const, // prata levemente fria
    exposure: 1.0,
  },
  /** Material neutro para avaliação anatômica + luzes de estúdio. */
  clay: { color: 0x9c9c9c, roughness: 0.6 },
  lighting: {
    key: { intensity: 2.4, position: [-3, 3, 2.5] as const },
    rim: { intensity: 3.0, position: [2.5, 1.5, -4] as const },
    fill: { intensity: 0.15, position: [3, -1, 3] as const },
    ambient: 0.05,
  },
} as const;

export type UnboundView = "beauty" | "clay" | "wireframe" | "inspect" | "compare";

export interface UnboundParams {
  view: UnboundView;
  look: "beauty" | "clay";
  variant: "A" | "B" | "C" | null;
}

export function parseParams(search: string): UnboundParams {
  const q = new URLSearchParams(search);
  const v = q.get("view");
  const view: UnboundView = v === "clay" || v === "wireframe" || v === "inspect" || v === "compare" ? v : "beauty";
  const variant = q.get("variant");
  return {
    view,
    look: q.get("look") === "clay" ? "clay" : "beauty",
    variant: variant === "A" || variant === "B" || variant === "C" ? variant : null,
  };
}
