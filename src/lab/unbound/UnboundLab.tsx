"use client";

import { useEffect, useRef, useState } from "react";
import { LAB_UNBOUND, parseParams } from "./config";
import styles from "./UnboundLab.module.css";

/**
 * Laboratório The Unbound (/lab/unbound). Sem controles visíveis.
 *   ?view=origin | essence | beyond-form | metamorphosis | unknown — um estado
 *   ?view=compare   — os cinco estados lado a lado
 *   ?view=wireframe — topologia (&state=… para escolher o estado)
 *   ?view=inspect   — rotação/zoom livres; teclas 1–5 alternam os estados
 *   &look=ethereal  — prévia de membrana translúcida (diagnóstico)
 */
export function UnboundLab() {
  const ref = useRef<HTMLDivElement>(null);
  const [params, setParams] = useState<ReturnType<typeof parseParams> | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setParams(parseParams(window.location.search));
  }, []);

  useEffect(() => {
    const container = ref.current;
    if (!container || !params) return;
    let scene: { resize(w: number, h: number, r: number): void; dispose(): void } | null = null;
    let cancelled = false;
    const onResize = () =>
      scene?.resize(container.clientWidth, container.clientHeight, Math.min(window.devicePixelRatio || 1, LAB_UNBOUND.renderer.maxPixelRatio));
    void import("./scene").then(({ createUnboundScene }) => {
      if (cancelled) return;
      scene = createUnboundScene({
        container,
        view: params.view,
        state: params.view === "wireframe" || params.view === "inspect" ? params.state : params.view === "compare" ? "origin" : params.view,
        look: params.look,
        onReady: (info) => {
          container.dataset.ready = "true";
          container.dataset.vertices = String(info.vertices);
          container.dataset.triangles = String(info.triangles);
          container.dataset.morphTargets = String(info.morphTargets);
        },
      });
      onResize();
    });
    window.addEventListener("resize", onResize);
    return () => {
      cancelled = true;
      window.removeEventListener("resize", onResize);
      scene?.dispose();
    };
  }, [params]);

  return <div ref={ref} className={styles.stage} data-view={params?.view ?? ""} />;
}
