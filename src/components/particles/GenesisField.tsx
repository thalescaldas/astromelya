"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { runField } from "@/animations/field";
import styles from "./GenesisField.module.css";

interface GenesisFieldProps {
  /** Máscara de oclusão da flor (mantém todas as partículas atrás dela). */
  maskSrc: string;
  children: ReactNode;
}

/**
 * Genesis viva: uma camada de partículas sobre a flor, recortada pela silhueta
 * da Genesis — visualmente, todas as partículas ficam atrás dela.
 * Sem JavaScript, a camada fica vazia e a Home permanece intacta.
 */
export function GenesisField({ maskSrc, children }: GenesisFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const figure = canvas?.parentElement?.querySelector<HTMLElement>("figure");
    const image = figure?.querySelector<HTMLImageElement>("[data-bloom-image]");
    if (!canvas || !figure || !image) return;

    let controller: { dispose(): void } | null = null;
    const begin = () => {
      controller = runField({
        canvas,
        maskSrc,
        image,
        waitForBloom: document.documentElement.getAttribute("data-bloom") === "play",
        reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      });
    };
    // Geometria da fotografia exige a imagem com dimensões resolvidas.
    if (image.complete && image.naturalWidth) begin();
    else image.addEventListener("load", begin, { once: true });

    return () => {
      image.removeEventListener("load", begin);
      controller?.dispose();
    };
  }, [maskSrc]);

  return (
    <>
      {children}
      <canvas ref={canvasRef} className={styles.layer} aria-hidden="true" />
    </>
  );
}
