"use client";

import { useEffect, useId, useRef } from "react";
import data from "./htz-signature.json";

interface HtzSignatureProps {
  className?: string;
  label: string;
}

/** Largura do traço da máscara (unidades do viewBox): cobre toda a espessura do gesto. */
const PEN_WIDTH = 24;

/**
 * Assinatura oficial HTZ.
 *
 * O desenho é o contorno vetorial do PNG original, dividido nos quatro gestos
 * da escrita (haste, arco, barra, Z). Cada gesto é revelado por uma máscara que
 * percorre a sua linha central — a espessura original nunca é alterada.
 *
 * Sem JavaScript ou com movimento reduzido: assinatura completa, estática.
 * Com JavaScript: escrita única (~3 s) quando a assinatura entra na tela.
 */
export function HtzSignature({ className, label }: HtzSignatureProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window) || !Element.prototype.animate) return;

    const pens = Array.from(svg.querySelectorAll<SVGPathElement>("[data-pen]"));
    // Prepara: gestos ainda não escritos (a seção 04 está fora da tela neste momento).
    for (const pen of pens) {
      pen.style.strokeDashoffset = "1";
      pen.style.opacity = "0";
    }

    const animations: Animation[] = [];
    const write = () => {
      data.strokes.forEach((stroke, i) => {
        const pen = pens[i];
        const frames: Keyframe[] = [
          { offset: 0, strokeDashoffset: "1", opacity: 0 },
          { offset: 0.002, opacity: 1 },
          ...stroke.keyframes
            .slice(1)
            .map(([time, length]) => ({ offset: time, strokeDashoffset: String(1 - length), opacity: 1 })),
        ];
        animations.push(
          pen.animate(frames, {
            duration: stroke.duration * 1000,
            delay: stroke.delay * 1000,
            easing: "linear",
            fill: "both",
          }),
        );
      });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          observer.disconnect();
          write();
        }
      },
      { threshold: 0.6 },
    );
    observer.observe(svg);
    return () => {
      observer.disconnect();
      for (const a of animations) a.cancel();
      for (const pen of pens) {
        pen.style.strokeDashoffset = "";
        pen.style.opacity = "";
      }
    };
  }, []);

  const [, , w, h] = data.viewBox;
  return (
    <svg
      ref={svgRef}
      className={className}
      viewBox={data.viewBox.join(" ")}
      role="img"
      aria-label={label}
      focusable="false"
    >
      <defs>
        {data.strokes.map((stroke, i) => (
          <mask key={stroke.name} id={`${uid}-m${i}`} maskUnits="userSpaceOnUse" x="0" y="0" width={w} height={h}>
            <path
              data-pen
              d={stroke.d}
              fill="none"
              stroke="#fff"
              strokeWidth={PEN_WIDTH}
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={1}
              strokeDasharray="1 1"
              strokeDashoffset={0}
            />
          </mask>
        ))}
      </defs>
      {data.strokes.map((stroke, i) => (
        <path key={stroke.name} d={stroke.ink} fill="currentColor" fillRule="evenodd" mask={`url(#${uid}-m${i})`} />
      ))}
    </svg>
  );
}
