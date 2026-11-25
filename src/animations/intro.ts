import gsap from "gsap";
import type { ParticleMorph } from "@/components/particles/ParticleMorph";
import { sampleImagePoints } from "@/components/particles/sampleImage";
import { INTRO_STORAGE_KEY } from "./introBoot";

/**
 * Introdução da Astromelya (~3 s)
 *
 *   0.00  o nome surge
 *   0.45  deformação orgânica dos traços (SVG turbulence + displacement)
 *   0.95  o nome se dissolve em partículas (Three.js)
 *   0.95–2.30  as partículas orbitam o centro e se reconstroem no símbolo
 *   2.10  o símbolo nítido assume e os traços se acomodam
 *   2.45  o símbolo viaja até o canto superior esquerdo
 *   2.55  a flor emerge; a navegação aparece em seguida
 *
 * Qualquer clique, toque ou tecla acelera a introdução até o fim.
 */

const BASE_DURATION = 3.3;
const ASSET_TIMEOUT_MS = 2500;

export interface IntroElements {
  overlay: HTMLElement;
  canvas: HTMLCanvasElement;
  wordmark: HTMLImageElement;
  symbol: HTMLImageElement;
  turbulence: SVGFETurbulenceElement;
  displacement: SVGFEDisplacementMapElement;
}

export interface IntroOptions extends IntroElements {
  durationMs: number;
  onComplete: () => void;
}

export interface IntroController {
  dispose: () => void;
}

function decode(image: HTMLImageElement): Promise<void> {
  if (image.complete && image.naturalWidth > 0) return Promise.resolve();
  return image.decode().catch(() => undefined);
}

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

async function createMorph(canvas: HTMLCanvasElement): Promise<ParticleMorph | null> {
  try {
    const { ParticleMorph } = await import("@/components/particles/ParticleMorph");
    if (!ParticleMorph.isSupported()) return null;
    return new ParticleMorph(canvas);
  } catch {
    return null;
  }
}

function withTimeout<T>(promise: Promise<T>, fallback: T, ms: number): Promise<T> {
  return Promise.race([promise, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))]);
}

export function runIntro(options: IntroOptions): IntroController {
  const { overlay, canvas, wordmark, symbol, turbulence, displacement } = options;
  const root = document.documentElement;
  const ctx = gsap.context(() => {});

  let disposed = false;
  let finished = false;
  let morph: ParticleMorph | null = null;
  let timeline: gsap.core.Timeline | null = null;

  const render = () => morph?.render(gsap.ticker.time);

  const skip = () => {
    if (timeline && !finished) gsap.to(timeline, { timeScale: 8, duration: 0.25, ease: "power1.in" });
  };

  const detach = () => {
    window.removeEventListener("pointerdown", skip);
    window.removeEventListener("keydown", skip);
    window.removeEventListener("resize", skip);
    gsap.ticker.remove(render);
    morph?.dispose();
    morph = null;
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

  const build = () => {
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const flower = document.querySelector<HTMLElement>('[data-intro-hide="flower"]');
    const nav = document.querySelector<HTMLElement>('[data-intro-hide="nav"]');
    const anchor = document.querySelector<HTMLElement>('[data-intro-hide="symbol"]');

    const wordRect = wordmark.getBoundingClientRect();
    const symbolRect = symbol.getBoundingClientRect();

    if (morph) {
      const count = viewport.width < 768 ? 2400 : 4600;
      morph.setShapes(
        sampleImagePoints(wordmark, wordRect, viewport, count),
        sampleImagePoints(symbol, symbolRect, viewport, count),
      );
      morph.resize(viewport.width, viewport.height);
      gsap.ticker.add(render);
    }

    // Voo do símbolo até a posição exata do símbolo do header.
    const anchorRect = anchor?.getBoundingClientRect();
    const flight = anchorRect
      ? {
          x: anchorRect.left + anchorRect.width / 2 - (symbolRect.left + symbolRect.width / 2),
          y: anchorRect.top + anchorRect.height / 2 - (symbolRect.top + symbolRect.height / 2),
          scale: anchorRect.width / symbolRect.width,
        }
      : { x: 0, y: 0, scale: 1 };

    ctx.add(() => {
      const tl = gsap.timeline({ onComplete: finish });
      timeline = tl;

      tl.fromTo(
        wordmark,
        { autoAlpha: 0, scale: 0.985 },
        { autoAlpha: 1, scale: 1, duration: 0.6, ease: "power2.out" },
        0,
      )
        .to(displacement, { attr: { scale: 18 }, duration: 0.6, ease: "sine.in" }, 0.45)
        .to(turbulence, { attr: { baseFrequency: "0.018 0.08" }, duration: 0.6, ease: "sine.inOut" }, 0.45);

      if (morph) {
        const u = morph.uniforms;
        tl.to(u.uOpacity, { value: 1, duration: 0.2, ease: "none" }, 0.9)
          .to(wordmark, { autoAlpha: 0, duration: 0.25, ease: "power1.in" }, 0.95)
          .to(u.uProgress, { value: 1, duration: 1.35, ease: "none" }, 0.95)
          .fromTo(symbol, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3, ease: "power1.out" }, 2.1)
          .to(u.uOpacity, { value: 0, duration: 0.35, ease: "power1.in" }, 2.2);
      } else {
        // Sem WebGL: metamorfose direta, mantendo a deformação orgânica.
        tl.to(wordmark, { autoAlpha: 0, duration: 0.5, ease: "power1.in" }, 1.0)
          .fromTo(symbol, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6, ease: "power1.out" }, 1.5);
      }

      tl.to(displacement, { attr: { scale: 0 }, duration: 0.35, ease: "sine.out" }, 2.1)
        .set(symbol, { filter: "none" }, 2.45)
        .to(symbol, { ...flight, duration: 0.75, ease: "power3.inOut" }, 2.45);

      if (flower) {
        tl.fromTo(
          flower,
          { autoAlpha: 0, scale: 1.035 },
          { autoAlpha: 1, scale: 1, duration: 0.8, ease: "power2.out" },
          2.55,
        );
      }
      if (nav) tl.fromTo(nav, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5, ease: "power1.out" }, 2.8);
      if (anchor) tl.set(anchor, { autoAlpha: 1 }, 3.2);
      tl.set(symbol, { autoAlpha: 0 }, 3.2);

      tl.timeScale(BASE_DURATION / Math.max(options.durationMs / 1000, 0.5));
    });

    overlay.dataset.state = "running";
    window.addEventListener("pointerdown", skip);
    window.addEventListener("keydown", skip);
    window.addEventListener("resize", skip);
  };

  void (async () => {
    const pendingMorph = createMorph(canvas);
    const [, created] = await Promise.all([
      withTimeout(Promise.all([decode(wordmark), decode(symbol)]).then(() => true), false, ASSET_TIMEOUT_MS),
      withTimeout(pendingMorph, null, ASSET_TIMEOUT_MS),
    ]);
    // Se o WebGL chegou tarde demais, descarta-o: a introdução segue sem partículas.
    if (!created) void pendingMorph.then((late) => late?.dispose());
    if (disposed) {
      created?.dispose();
      return;
    }
    morph = created;
    await waitForVisible();
    if (disposed) return;
    build();
  })();

  return {
    dispose() {
      disposed = true;
      detach();
      ctx.revert();
    },
  };
}
