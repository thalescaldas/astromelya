"use client";

import { useEffect, useRef, useState } from "react";
import { LAB_UNBOUND, parseParams, type UnboundParams } from "./config";
import styles from "./UnboundLab.module.css";

/**
 * The Unbound Hybrid — Beyond Form (/lab/unbound). No visible controls.
 *   (default) / ?view=beauty — translucent membrane, cinematic light
 *   ?view=clay       — neutral material (anatomy)
 *   ?view=wireframe  — topology
 *   ?view=inspect    — free rotation/zoom (&look=clay for neutral)
 *   ?view=compare    — official concept (left) × model (right)
 *   &variant=A|B|C   — study variants (A vortex lattice, B turbine sails, C tensioned web — chosen)
 */
export function UnboundLab() {
  const ref = useRef<HTMLDivElement>(null);
  const [params, setParams] = useState<UnboundParams | null>(null);

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
        params: params.view === "compare" ? { ...params, view: "beauty" } : params,
        onReady: (info) => {
          container.dataset.ready = "true";
          container.dataset.vertices = String(info.vertices);
          container.dataset.triangles = String(info.triangles);
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

  const compare = params?.view === "compare";
  return (
    <div className={styles.stage} data-view={params?.view ?? ""}>
      {compare && (
        <div className={`${styles.pane} ${styles.left}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LAB_UNBOUND.reference.src} alt="" className={styles.reference} />
        </div>
      )}
      <div ref={ref} className={`${styles.pane} ${compare ? styles.right : ""}`} />
    </div>
  );
}
