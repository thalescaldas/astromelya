"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { startCursor } from "./cursor";
import { dissolve, type DissolvePattern } from "./dissolve";

/**
 * The Passage — transições globais (1200 ms): saída em partículas 500 ms,
 * vazio 100 ms, entrada 600 ms. O cabeçalho fica acima da camada (z-index),
 * permanecendo visível durante toda a passagem.
 *
 * - Intercepta apenas links internos simples; voltar/avançar usam a navegação
 *   nativa (histórico e restauração de rolagem preservados).
 * - Cada página tem entrada própria (CSS em passage.css via html[data-passage-enter]).
 * - Exhibition → Immersion: a mídia viaja até o hero (transição compartilhada).
 */
const OUT = 500, VOID = 100, IN = 600;
const NAV_TIMEOUT = 5000;

type PageKey = "home" | "about" | "projects" | "immersion" | "contact" | "other";

function pageKey(path: string): PageKey {
  if (path === "/") return "home";
  if (path === "/about") return "about";
  if (path === "/projects") return "projects";
  if (path.startsWith("/projects/")) return "immersion";
  if (path === "/contact") return "contact";
  return "other";
}

const ENTER_PATTERN: Record<PageKey, DissolvePattern> = {
  home: "radial", // emerge da escuridão a partir da flor
  about: "descend", // revelação gradual, de cima para baixo
  projects: "random",
  immersion: "random",
  contact: "radial", // o ponto luminoso origina as ondas
  other: "random",
};

/** Retângulo ocupado por uma mídia com object-fit: contain dentro de `box`. */
function fit(box: DOMRect, aspect: number) {
  let w = box.width, h = box.width / aspect;
  if (h > box.height) { h = box.height; w = h * aspect; }
  return { left: box.left + (box.width - w) / 2, top: box.top + (box.height - h) / 2, width: w, height: h };
}

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function Passage() {
  const router = useRouter();
  const pathname = usePathname();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const busy = useRef(false);
  const arrival = useRef<((path: string) => void) | null>(null);

  // chegada de uma navegação iniciada pela passagem
  useEffect(() => {
    arrival.current?.(pathname);
  }, [pathname]);

  // cursor (somente ponteiros finos)
  useEffect(() => {
    const ring = ringRef.current, dot = dotRef.current;
    if (!ring || !dot || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    return startCursor(ring, dot, window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const root = document.documentElement;
    const signal = { cancelled: false };
    const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const waitForPath = (target: string) =>
      new Promise<void>((resolve) => {
        const timer = setTimeout(() => { arrival.current = null; resolve(); }, NAV_TIMEOUT);
        arrival.current = (p) => {
          if (p === target) { clearTimeout(timer); arrival.current = null; resolve(); }
        };
      });

    const run = async (href: string, path: string) => {
      busy.current = true;
      const r = reduced();
      const enter = pageKey(path);
      // transição compartilhada: Exhibition → Immersion
      const source = enter === "immersion" ? document.querySelector<HTMLElement>("[data-passage-media]") : null;
      const src = source?.dataset.passageSrc;
      const aspect = Number(source?.dataset.passageAspect) || 16 / 9;
      let clone: HTMLImageElement | null = null;
      if (source && src && !r) {
        const box = fit(source.getBoundingClientRect(), aspect);
        clone = document.createElement("img");
        clone.src = src;
        clone.alt = "";
        clone.className = "passage-clone";
        Object.assign(clone.style, { left: `${box.left}px`, top: `${box.top}px`, width: `${box.width}px`, height: `${box.height}px` });
        document.body.appendChild(clone);
        root.setAttribute("data-passage-shared", "");
      }

      canvas.style.display = "block";
      await dissolve(canvas, "out", "random", r ? 0 : OUT, signal);
      if (signal.cancelled) return;
      root.setAttribute("data-passage-enter", enter);
      router.push(href);
      await waitForPath(path);
      await nextFrame();
      await nextFrame();
      await wait(r ? 0 : VOID);

      if (clone) {
        const hero = document.querySelector<HTMLElement>("[data-passage-hero]");
        if (hero) {
          const from = clone.getBoundingClientRect();
          const to = fit(hero.getBoundingClientRect(), aspect);
          const anim = clone.animate(
            [
              { transform: "translate(0, 0) scale(1, 1)" },
              {
                transform: `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(${to.width / from.width}, ${to.height / from.height})`,
              },
            ],
            { duration: IN, easing: "cubic-bezier(0.65, 0, 0.35, 1)", fill: "forwards" },
          );
          const reveal = dissolve(canvas, "in", ENTER_PATTERN[enter], IN, signal);
          await anim.finished.catch(() => undefined);
          root.removeAttribute("data-passage-shared"); // o hero real assume no lugar do clone
          await nextFrame();
          clone.remove();
          await reveal;
        } else {
          clone.remove();
          root.removeAttribute("data-passage-shared");
          await dissolve(canvas, "in", ENTER_PATTERN[enter], r ? 0 : IN, signal);
        }
      } else {
        await dissolve(canvas, "in", ENTER_PATTERN[enter], r ? 0 : IN, signal);
      }
      canvas.style.display = "none";
      // mantém o atributo o suficiente para as entradas CSS terminarem
      setTimeout(() => root.getAttribute("data-passage-enter") === enter && root.removeAttribute("data-passage-enter"), 1400);
      busy.current = false;
    };

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest("a");
      if (!a || a.target || a.hasAttribute("download") || a.dataset.passage === "off") return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname.startsWith("/lab")) return;
      if (url.pathname === location.pathname) return; // âncoras e mesma página: comportamento nativo
      e.preventDefault();
      if (busy.current) return;
      void run(url.pathname + url.search + url.hash, url.pathname);
    };
    // fase de captura: assume antes do <Link> do Next (que respeita defaultPrevented)
    document.addEventListener("click", onClick, true);
    return () => {
      signal.cancelled = true;
      document.removeEventListener("click", onClick, true);
      document.querySelectorAll(".passage-clone").forEach((n) => n.remove());
      root.removeAttribute("data-passage-shared");
    };
  }, [router]);

  return (
    <>
      <canvas ref={canvasRef} className="passage-layer" aria-hidden="true" />
      <div ref={ringRef} className="passage-cursor-ring" aria-hidden="true" />
      <div ref={dotRef} className="passage-cursor-dot" aria-hidden="true" />
    </>
  );
}
