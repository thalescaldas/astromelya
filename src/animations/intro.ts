import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import type { IntroScene } from "@/components/intro/IntroScene";
import { loadImage, rasterize } from "@/components/particles/raster";
import { INTRO_STORAGE_KEY } from "./introBoot";
import { INTRO_BASE_DURATION, INTRO_TIMINGS as T } from "./introTimings";

gsap.registerPlugin(CustomEase, MotionPathPlugin);

/**
 * Introdução da Astromelya — um único fenômeno contínuo (~4,3 s).
 *
 * Uma linha do tempo principal avança um relógio. Esse relógio conduz, no
 * mesmo shader, o nome, a matéria que dele se desprende e o símbolo que se
 * condensa: cada traço se apaga no instante exato em que sua partícula nasce,
 * no mesmo lugar e sob o mesmo campo gravitacional; cada partícula pousa no
 * símbolo enquanto ele já migra, por uma curva Bézier, rumo ao cabeçalho.
 * Ver `introTimings.ts` para o mapa de sobreposições.
 *
 * Qualquer clique, toque ou tecla acelera a introdução até o fim.
 */

/** Chegada longa e macia, sem rebote (flor e fallback). */
const settleEase = CustomEase.create("astro-settle", "M0,0 C0.2,0.06 0.24,1 1,1");
/** Equivalente da curva de migração do shader, para o fallback sem WebGL. */
const flightEase = CustomEase.create("astro-flight", "M0,0 C0.34,0 0.22,1 1,1");

const ASSET_TIMEOUT_MS = 2500;
const WORDMARK_RATIO = 41 / 491;
const SYMBOL_RATIO = 236 / 289;

export interface IntroElements {
  overlay: HTMLElement;
  canvas: HTMLCanvasElement;
  /** Usados apenas no fallback sem WebGL. */
  wordmark: HTMLImageElement;
  symbol: HTMLImageElement;
}

export interface IntroOptions extends IntroElements {
  durationMs: number;
  onComplete: () => void;
}

export interface IntroController {
  dispose: () => void;
}

const clamp = (min: number, max: number, value: number) => Math.min(max, Math.max(min, value));

function waitForVisible(): Promise<void> {
  if (!document.hidden) return Promise.resolve();
  return new Promise((resolve) => {
    const onChange = () => {
      if (document.hidden) return;
      document.removeEventListener("visibilitychange", onChange);
      resolve();
    };
    document.addEventListener("visibilitychange", onChange);
  });
}

function withTimeout<V>(promise: Promise<V>, fallback: V, ms: number): Promise<V> {
  return Promise.race([promise, new Promise<V>((resolve) => setTimeout(() => resolve(fallback), ms))]);
}

/** Orçamento inicial de partículas conforme o dispositivo. */
function particleBudget(viewportWidth: number): number {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const lowEnd = (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4;
  const base = viewportWidth < 768 ? 3200 : 6500;
  return Math.round(base * (lowEnd ? 0.6 : 1));
}

export function runIntro(options: IntroOptions): IntroController {
  const { overlay, canvas, wordmark, symbol } = options;
  const root = document.documentElement;
  const ctx = gsap.context(() => {});
  const clock = { value: 0 };

  let disposed = false;
  let finished = false;
  let scene: IntroScene | null = null;
  let timeline: gsap.core.Timeline | null = null;

  // Medição de desempenho enquanto as partículas ainda não são visíveis.
  let adapted = false;
  let lastFrame = 0;
  let frames = 0;
  let frameSum = 0;

  const render = () => {
    if (!scene) return;
    if (!adapted) {
      const now = performance.now();
      if (lastFrame) {
        frames++;
        if (frames > 4) frameSum += now - lastFrame;
      }
      lastFrame = now;
      if (clock.value >= T.ADAPT_AT && frames > 8) {
        adapted = true;
        const average = frameSum / (frames - 4);
        scene.setDensity(average > 26 ? 0.45 : average > 19 ? 0.7 : 1);
      }
    }
    scene.render(clock.value);
  };

  const skip = () => {
    if (timeline && !finished) gsap.to(timeline, { timeScale: 7, duration: 0.3, ease: "power1.in" });
  };

  // Barras do navegador móvel alteram só a altura: apenas rotação/redimensionamento real encerra.
  let startWidth = 0;
  const onResize = () => {
    if (Math.abs(window.innerWidth - startWidth) > 2) skip();
  };

  const detach = () => {
    window.removeEventListener("pointerdown", skip);
    window.removeEventListener("keydown", skip);
    window.removeEventListener("resize", onResize);
    gsap.ticker.remove(render);
    scene?.dispose();
    scene = null;
  };

  const finish = () => {
    if (finished || disposed) return;
    finished = true;
    detach();
    try {
      sessionStorage.setItem(INTRO_STORAGE_KEY, "1");
    } catch {
      // armazenamento indisponível: a introdução apenas voltará a tocar
    }
    // Remove o estado de introdução e devolve os elementos ao estilo natural.
    root.removeAttribute("data-intro");
    root.removeAttribute("data-intro-js");
    ctx.revert();
    options.onComplete();
  };

  const start = async () => {
    // Única leitura de layout: viewport e símbolo definitivo do cabeçalho.
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    startWidth = vw;
    const flower = document.querySelector<HTMLElement>('[data-intro-hide="flower"]');
    const nav = document.querySelector<HTMLElement>('[data-intro-hide="nav"]');
    const anchor = document.querySelector<HTMLElement>('[data-intro-hide="symbol"]');
    const anchorRect = anchor?.getBoundingClientRect();
    const anchorOpacity = anchor?.parentElement
      ? Number.parseFloat(getComputedStyle(anchor.parentElement).opacity) || 1
      : 1;

    // Mesmas dimensões do CSS do fallback (Intro.module.css).
    const wordW = clamp(240, 608, vw * 0.58);
    const wordH = wordW * WORDMARK_RATIO;
    const symW = clamp(72, 132, vw * 0.11);
    const symH = symW * SYMBOL_RATIO;
    const target = anchorRect
      ? {
          x: anchorRect.left + anchorRect.width / 2 - vw / 2,
          y: vh / 2 - (anchorRect.top + anchorRect.height / 2),
          width: anchorRect.width,
          height: anchorRect.height,
        }
      : { x: 0, y: 0, width: symW, height: symH };

    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    // WebGL: carrega cena e SVGs em paralelo.
    const sceneModule = withTimeout(
      import("@/components/intro/IntroScene").then((m) => (m.IntroScene.isSupported() ? m.IntroScene : null)),
      null,
      ASSET_TIMEOUT_MS,
    ).catch(() => null);
    const images = withTimeout(
      Promise.all([loadImage("/brand/wordmark.svg"), loadImage("/brand/simbolo.svg")]),
      null,
      ASSET_TIMEOUT_MS,
    ).catch(() => null);

    const [SceneClass, loaded] = await Promise.all([sceneModule, images]);
    if (disposed) return;

    if (SceneClass && loaded) {
      const [wordImage, symbolImage] = loaded;
      try {
        scene = new SceneClass({
          canvas,
          viewport: { width: vw, height: vh },
          pixelRatio,
          wordmark: rasterize(wordImage, wordW, wordH, pixelRatio),
          symbolLarge: rasterize(symbolImage, symW, symH, pixelRatio),
          symbolSmall: rasterize(symbolImage, target.width, target.height, pixelRatio),
          anchor: { x: target.x, y: target.y, width: target.width },
          anchorOpacity,
          particleCount: particleBudget(vw),
        });
        scene.render(0);
      } catch {
        scene = null;
      }
    }

    await waitForVisible();
    if (disposed) return;

    ctx.add(() => {
      const tl = gsap.timeline({ onComplete: finish });
      timeline = tl;

      if (scene) {
        // Relógio único: toda a metamorfose acontece no shader.
        tl.to(clock, { value: T.TOTAL, duration: T.TOTAL, ease: "none" }, 0);
        gsap.ticker.add(render);
      } else {
        buildFallback(tl, { wordmark, symbol, vw, vh, target, symW, symH });
      }

      if (flower) {
        tl.fromTo(
          flower,
          { autoAlpha: 0, scale: 1.03 },
          { autoAlpha: 1, scale: 1, duration: T.FLOWER_DURATION, ease: settleEase },
          T.FLOWER_START,
        );
      }
      if (nav) {
        tl.fromTo(nav, { autoAlpha: 0 }, { autoAlpha: 1, duration: T.NAV_DURATION, ease: "sine.inOut" }, T.NAV_START);
      }
      if (anchor) {
        // O shader compensa esta entrada: a cobertura total permanece constante.
        tl.fromTo(
          anchor,
          { autoAlpha: 0 },
          { autoAlpha: 1, duration: T.HANDOFF_END - T.HANDOFF_START, ease: "none" },
          T.HANDOFF_START,
        );
      }
      tl.set({}, {}, T.TOTAL);
      tl.timeScale(INTRO_BASE_DURATION / Math.max(options.durationMs / 1000, 0.5));
    });

    overlay.dataset.state = "running";
    window.addEventListener("pointerdown", skip);
    window.addEventListener("keydown", skip);
    window.addEventListener("resize", onResize);
  };

  void start();

  return {
    dispose() {
      disposed = true;
      detach();
      ctx.revert();
    },
  };
}

interface FallbackParams {
  wordmark: HTMLImageElement;
  symbol: HTMLImageElement;
  vw: number;
  vh: number;
  target: { x: number; y: number; width: number; height: number };
  symW: number;
  symH: number;
}

/** Sem WebGL: mesma coreografia com os SVGs no DOM e trajetória Bézier. */
function buildFallback(tl: gsap.core.Timeline, p: FallbackParams) {
  const dx = p.target.x;
  const dy = -p.target.y; // DOM: y para baixo
  const length = Math.hypot(dx, dy) || 1;
  let px = -dy / length;
  let py = dx / length;
  if (py > 0) {
    px = -px;
    py = -py;
  }
  const path = [
    { x: 0, y: 0 },
    { x: dx * 0.28 + px * length * 0.16, y: dy * 0.28 + py * length * 0.16 },
    { x: dx * 0.74 + px * length * 0.07, y: dy * 0.74 + py * length * 0.07 },
    { x: dx, y: dy },
  ];

  tl.fromTo(p.wordmark, { autoAlpha: 0, scale: 0.985 }, { autoAlpha: 1, scale: 1, duration: T.REVEAL_END, ease: "sine.out" }, 0)
    .to(
      p.wordmark,
      { scaleX: 0.86, scaleY: 1.045, duration: T.DEFORM_END - T.DEFORM_START, ease: "power2.in" },
      T.DEFORM_START,
    )
    .to(p.wordmark, { autoAlpha: 0, duration: T.DISSOLVE_SPAN, ease: "sine.in" }, T.DISSOLVE_START)
    .fromTo(
      p.symbol,
      { autoAlpha: 0, scale: 1.06 },
      { autoAlpha: 1, scale: 1, duration: T.SOLID_SPAN + 0.3, ease: settleEase },
      T.SOLID_START - 0.3,
    )
    .to(
      p.symbol,
      {
        motionPath: { path, type: "cubic" },
        scale: p.target.width / p.symW,
        duration: T.FLIGHT_END - T.FLIGHT_START,
        ease: flightEase,
      },
      T.FLIGHT_START,
    )
    .set(p.symbol, { autoAlpha: 0 }, T.HANDOFF_END);
}
