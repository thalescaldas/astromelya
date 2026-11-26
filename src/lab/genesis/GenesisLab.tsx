"use client";

import Image from "next/image";
import { useEffect, useRef, type CSSProperties } from "react";
import { LAB_GENESIS } from "./config";
import { createReferenceStage } from "./stages/reference";
import type { LabStage } from "./types";
import styles from "./GenesisLab.module.css";

/**
 * Laboratório Genesis: área de renderização em tela cheia, câmera fixa,
 * fundo preto absoluto. Hoje exibe a fotografia oficial como referência;
 * o estágio 3D substituirá `createReferenceStage` quando aprovado.
 */
export function GenesisLab() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { reference } = LAB_GENESIS;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const stage: LabStage = createReferenceStage({ container });
    const onResize = () =>
      stage.resize(
        container.clientWidth,
        container.clientHeight,
        Math.min(window.devicePixelRatio || 1, LAB_GENESIS.renderer.maxPixelRatio),
      );
    onResize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      stage.dispose();
    };
  }, []);

  const style = {
    "--reference-ratio": reference.width / reference.height,
    "--reference-height": reference.heightRatio,
  } as CSSProperties;

  return (
    <div ref={containerRef} className={styles.stage} style={style}>
      <Image
        src={reference.src}
        alt=""
        width={reference.width}
        height={reference.height}
        unoptimized
        preload
        draggable={false}
        className={styles.reference}
      />
    </div>
  );
}
