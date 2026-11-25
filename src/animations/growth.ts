import gsap from "gsap";

/**
 * Nascimento de Genesis
 * ---------------------
 * Vídeo pré-renderizado do crescimento da flor, posicionado exatamente sobre a
 * imagem oficial (mesma caixa, mesmo enquadramento). O arquivo foi tratado para
 * coincidir com genesis.webp em escala, posição, luminância e preto absoluto.
 *
 * - É baixado durante a introdução (blob local), para começar sem atraso.
 * - Inicia com autoplay/muted/playsInline, sem loop, no instante definido.
 * - Nos últimos instantes, enquanto o movimento da flor converge, o vídeo se
 *   funde à imagem oficial que já está por baixo — a troca é imperceptível.
 * - Pular encerra o crescimento com uma fusão curta.
 */

export interface GrowthOptions {
  src: string;
  /** Proporção da imagem oficial (mesma caixa do vídeo). */
  ratio: number;
  /** Duração da fusão final vídeo → imagem (s). */
  blend: number;
}

export interface GrowthController {
  /** O vídeo já está disponível localmente. */
  readonly ready: boolean;
  /** Inicia o crescimento sobre a figura; `onVisible` é chamado no 1º quadro. */
  start(figure: HTMLElement, onVisible: () => void): boolean;
  /** Encerra rapidamente (atalho de pular). */
  skip(): void;
  dispose(): void;
}

const SKIP_BLEND = 0.35;

export function prepareGrowth(options: GrowthOptions): GrowthController {
  let objectUrl: string | null = null;
  let video: HTMLVideoElement | null = null;
  let ready = false;
  let ending = false;
  let disposed = false;

  const abort = new AbortController();
  const probe = document.createElement("video");
  const playable = probe.canPlayType("video/mp4") !== "";

  if (playable) {
    fetch(options.src, { signal: abort.signal })
      .then((response) => (response.ok ? response.blob() : Promise.reject(new Error(String(response.status)))))
      .then((blob) => {
        if (disposed) return;
        objectUrl = URL.createObjectURL(blob);
        ready = true;
      })
      .catch(() => {
        // Sem vídeo: a introdução usa a revelação estática da imagem oficial.
      });
  }

  const onSkip = () => controller.skip();

  const cleanup = () => {
    gsap.ticker.remove(tick);
    window.removeEventListener("pointerdown", onSkip);
    window.removeEventListener("keydown", onSkip);
    if (video) {
      video.pause();
      video.removeAttribute("src");
      video.load();
      video.remove();
      video = null;
    }
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = null;
    }
  };

  /** Fusão final: acompanha o tempo do próprio vídeo, quadro a quadro. */
  const tick = () => {
    if (!video || ending) return;
    if (!video.isConnected) return cleanup();
    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    if (!duration) return;
    const x = (video.currentTime - (duration - options.blend)) / options.blend;
    const t = Math.min(1, Math.max(0, x));
    video.style.opacity = String(1 - t * t * (3 - 2 * t));
  };

  const fadeOutAndClean = (seconds: number) => {
    if (!video || ending) return;
    ending = true;
    gsap.to(video, { opacity: 0, duration: seconds, ease: "sine.inOut", onComplete: cleanup });
  };

  const controller: GrowthController = {
    get ready() {
      return ready && !disposed;
    },

    start(figure, onVisible) {
      if (!ready || !objectUrl || disposed) return false;
      const image = figure.querySelector("img");
      const element = document.createElement("video");
      element.className = image?.className ?? "";
      element.muted = true;
      element.defaultMuted = true;
      element.playsInline = true;
      element.autoplay = true;
      element.loop = false;
      element.preload = "auto";
      element.disablePictureInPicture = true;
      element.setAttribute("muted", "");
      element.setAttribute("playsinline", "");
      element.setAttribute("autoplay", "");
      element.setAttribute("aria-hidden", "true");
      element.tabIndex = -1;
      // Mesma caixa da imagem oficial: mesmo enquadramento, sem cortes.
      element.style.aspectRatio = String(options.ratio);
      element.style.objectFit = "fill";
      element.style.background = "#000";
      // O broto entra pela borda inferior do quadro: uma fusão suave nessa borda
      // evita a linha de corte (a imagem oficial já é preta nos 6% inferiores).
      const edgeMask = "linear-gradient(to top, transparent 0%, #000 8%)";
      element.style.maskImage = edgeMask;
      element.style.setProperty("-webkit-mask-image", edgeMask);
      element.src = objectUrl;
      video = element;

      let shown = false;
      const show = () => {
        if (shown) return;
        shown = true;
        onVisible();
      };
      const withFrameCallback = element as HTMLVideoElement & {
        requestVideoFrameCallback?: (cb: () => void) => number;
      };
      if (withFrameCallback.requestVideoFrameCallback) withFrameCallback.requestVideoFrameCallback(show);
      element.addEventListener("playing", () => requestAnimationFrame(show), { once: true });
      element.addEventListener("ended", () => fadeOutAndClean(0.01), { once: true });
      element.addEventListener("error", () => {
        show();
        fadeOutAndClean(0.2);
      }, { once: true });

      figure.appendChild(element);
      element.play().catch(() => {
        // Reprodução bloqueada: a imagem oficial assume imediatamente.
        show();
        fadeOutAndClean(0.2);
      });

      gsap.ticker.add(tick);
      window.addEventListener("pointerdown", onSkip);
      window.addEventListener("keydown", onSkip);
      return true;
    },

    skip() {
      fadeOutAndClean(SKIP_BLEND);
    },

    dispose() {
      disposed = true;
      abort.abort();
      cleanup();
    },
  };

  return controller;
}
