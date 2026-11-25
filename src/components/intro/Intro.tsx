"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { runIntro } from "@/animations/intro";
import type { AnimationConfig } from "@/config/evolution";
import styles from "./Intro.module.css";

const FILTER_ID = "astromelya-organic";

interface IntroProps {
  config: AnimationConfig["intro"];
}

/**
 * Camada da introdução. É renderizada no HTML estático, mas só fica visível
 * quando o script de boot marca `<html data-intro="play">`.
 * Puramente decorativa: o conteúdo acessível da página não depende dela.
 */
export function Intro({ config }: IntroProps) {
  const [done, setDone] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wordmarkRef = useRef<HTMLImageElement>(null);
  const symbolRef = useRef<HTMLImageElement>(null);
  const turbulenceRef = useRef<SVGFETurbulenceElement>(null);
  const displacementRef = useRef<SVGFEDisplacementMapElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (!config.enabled || root.getAttribute("data-intro") !== "play") return;

    const overlay = overlayRef.current;
    const canvas = canvasRef.current;
    const wordmark = wordmarkRef.current;
    const symbol = symbolRef.current;
    const turbulence = turbulenceRef.current;
    const displacement = displacementRef.current;
    if (!overlay || !canvas || !wordmark || !symbol || !turbulence || !displacement) return;

    // O JavaScript assumiu: desativa a salvaguarda CSS.
    root.setAttribute("data-intro-js", "");

    const controller = runIntro({
      overlay,
      canvas,
      wordmark,
      symbol,
      turbulence,
      displacement,
      durationMs: config.durationMs,
      onComplete: () => setDone(true),
    });

    return () => controller.dispose();
  }, [config.enabled, config.durationMs]);

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
        preload
        draggable={false}
        className={styles.wordmark}
        style={{ filter: `url(#${FILTER_ID})` }}
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
        style={{ filter: `url(#${FILTER_ID})` }}
      />

      <svg className={styles.defs} focusable="false">
        <filter
          id={FILTER_ID}
          x="-20%"
          y="-120%"
          width="140%"
          height="340%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            ref={turbulenceRef}
            type="fractalNoise"
            baseFrequency="0.006 0.03"
            numOctaves={2}
            seed={7}
            result="noise"
          />
          <feDisplacementMap
            ref={displacementRef}
            in="SourceGraphic"
            in2="noise"
            scale={0}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </svg>
    </div>
  );
}
