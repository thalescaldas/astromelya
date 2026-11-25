"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { runIntro } from "@/animations/intro";
import type { AnimationConfig } from "@/config/evolution";
import styles from "./Intro.module.css";

interface IntroProps {
  config: AnimationConfig["intro"];
}

/**
 * Camada da introdução. É renderizada no HTML estático, mas só fica visível
 * quando o script de boot marca `<html data-intro="play">`.
 * Puramente decorativa: o conteúdo acessível da página não depende dela.
 * A animação acontece no <canvas> (WebGL); as imagens só são usadas no
 * fallback sem WebGL.
 */
export function Intro({ config }: IntroProps) {
  const [done, setDone] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wordmarkRef = useRef<HTMLImageElement>(null);
  const symbolRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (!config.enabled || root.getAttribute("data-intro") !== "play") return;

    const overlay = overlayRef.current;
    const canvas = canvasRef.current;
    const wordmark = wordmarkRef.current;
    const symbol = symbolRef.current;
    if (!overlay || !canvas || !wordmark || !symbol) return;

    // O JavaScript assumiu: desativa a salvaguarda CSS.
    root.setAttribute("data-intro-js", "");

    const controller = runIntro({
      overlay,
      canvas,
      wordmark,
      symbol,
      onComplete: () => setDone(true),
    });

    return () => controller.dispose();
  }, [config.enabled]);

  if (done || !config.enabled) return null;

  return (
    <div ref={overlayRef} className={styles.overlay} aria-hidden="true">
      <canvas ref={canvasRef} className={styles.canvas} />

      <Image
        ref={wordmarkRef}
        src="/brand/wordmark.svg"
        alt=""
        width={491}
        height={41}
        unoptimized
        draggable={false}
        className={styles.wordmark}
      />

      <Image
        ref={symbolRef}
        src="/brand/simbolo.svg"
        alt=""
        width={289}
        height={236}
        unoptimized
        draggable={false}
        className={styles.symbol}
      />
    </div>
  );
}
