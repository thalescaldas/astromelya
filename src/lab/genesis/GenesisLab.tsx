"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { LAB_GENESIS, parseView, type LabView } from "./config";
import type { LabStage } from "./types";
import styles from "./GenesisLab.module.css";

/**
 * Laboratório Genesis 3D (/lab/genesis).
 *
 * Modos (somente via URL, sem controles visíveis):
 *   (padrão) / ?view=model — modelo 3D, câmera fixa
 *   ?view=reference        — fotografia original
 *   ?view=wireframe        — topologia
 *   ?view=compare          — fotografia × modelo, lado a lado
 *   ?view=inspect          — rotação/zoom livres para inspecionar a geometria
 */
export function GenesisLab() {
  const [view, setView] = useState<LabView | null>(null);
  const modelRef = useRef<HTMLDivElement>(null);
  const { reference } = LAB_GENESIS;

  useEffect(() => {
    // O modo vem da URL; decidido no cliente (página estática).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setView(parseView(window.location.search));
  }, []);

  useEffect(() => {
    if (!view || view === "reference") return;
    const container = modelRef.current;
    if (!container) return;
    let stage: LabStage | null = null;
    let cancelled = false;

    const onResize = () =>
      stage?.resize(
        container.clientWidth,
        container.clientHeight,
        Math.min(window.devicePixelRatio || 1, LAB_GENESIS.renderer.maxPixelRatio),
      );

    void import("./stages/three").then(({ createThreeStage }) => {
      if (cancelled) return;
      stage = createThreeStage({
        container,
        wireframe: view === "wireframe",
        inspect: view === "inspect",
        onReady: (info) => {
          container.dataset.ready = "true";
          container.dataset.meshes = String(info.meshes);
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
      stage?.dispose();
    };
  }, [view]);

  const style = {
    "--reference-ratio": reference.width / reference.height,
    "--reference-height": reference.heightRatio,
  } as CSSProperties;

  const photo = (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={reference.src} alt="" width={reference.width} height={reference.height} draggable={false} className={styles.reference} />
  );

  return (
    <div className={styles.stage} style={style} data-view={view ?? ""}>
      {view === "reference" && <div className={styles.pane}>{photo}</div>}
      {view === "compare" && <div className={`${styles.pane} ${styles.half}`}>{photo}</div>}
      {view && view !== "reference" && (
        <div ref={modelRef} className={`${styles.pane} ${view === "compare" ? `${styles.half} ${styles.right}` : ""}`} />
      )}
    </div>
  );
}
