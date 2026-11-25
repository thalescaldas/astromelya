"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { runField } from "@/animations/field";
import styles from "./GenesisField.module.css";

interface GenesisFieldProps {
  children: ReactNode;
}

/**
 * Genesis viva: envolve a flor com duas camadas de partículas (atrás e à frente).
 * Sem JavaScript, as camadas ficam vazias e a Home permanece intacta.
 */
export function GenesisField({ children }: GenesisFieldProps) {
  const backRef = useRef<HTMLCanvasElement>(null);
  const frontRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const back = backRef.current;
    const front = frontRef.current;
    const figure = back?.parentElement?.querySelector<HTMLElement>("figure");
    const image = figure?.querySelector<HTMLImageElement>("[data-bloom-image]");
    if (!back || !front || !figure || !image) return;

    let controller: { dispose(): void } | null = null;
    const begin = () => {
      controller = runField({
        back,
        front,
        figure,
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
  }, []);

  return (
    <>
      <canvas ref={backRef} className={`${styles.layer} ${styles.back}`} aria-hidden="true" />
      {children}
      <canvas ref={frontRef} className={`${styles.layer} ${styles.front}`} aria-hidden="true" />
    </>
  );
}
