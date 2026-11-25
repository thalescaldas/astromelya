import { BLOOM_STORAGE_KEY } from "./bloomBoot";

/**
 * Florescimento de Genesis
 * ------------------------
 * Vídeo de crescimento exibido exatamente sobre a imagem oficial.
 *
 * O arquivo (public/flowers/genesis-growth.mp4) foi reconstruído no espaço da
 * fotografia (1672×941): alinhamento por ECC, tom monocromático com preto
 * absoluto e, no último 1,25 s, um morph por fluxo óptico até genesis.webp.
 * Os 0,5 s finais são a própria fotografia, estática. A troca vídeo → <img>
 * acontece nesse trecho, quando os dois são o mesmo quadro parado.
 */

export interface BloomOptions {
  image: HTMLImageElement;
  src: string;
  /** Proporção da imagem oficial (mesma caixa do vídeo). */
  ratio: number;
  /** Segundos finais do vídeo que são a fotografia estática. */
  hold: number;
}

export interface BloomController {
  dispose(): void;
}

const READY_TIMEOUT_MS = 6000;
const FALLBACK_FADE_MS = 850;
const SKIP_FADE_MS = 350;

export function runBloom(options: BloomOptions): BloomController {
  const { image } = options;
  const root = document.documentElement;
  const figure = image.parentElement;
  const abort = new AbortController();

  let video: HTMLVideoElement | null = null;
  let objectUrl: string | null = null;
  let frame = 0;
  let timeout = 0;
  let done = false;

  root.setAttribute("data-bloom-js", "");
  try {
    // Marcado no início: voltar à Home na mesma sessão mostra a flor completa.
    sessionStorage.setItem(BLOOM_STORAGE_KEY, "1");
  } catch {
    // armazenamento indisponível: o florescimento apenas voltará a tocar
  }

  const detachInput = () => {
    window.removeEventListener("pointerdown", skip);
    window.removeEventListener("keydown", skip);
  };

  /** Encerra o estado de florescimento com a imagem oficial visível. */
  const settle = (fadeMs: number) => {
    if (done) return;
    done = true;
    detachInput();
    window.clearTimeout(timeout);
    image.style.transition = fadeMs ? `opacity ${fadeMs}ms ease` : "none";
    image.style.opacity = "1";
    root.removeAttribute("data-bloom");
    root.removeAttribute("data-bloom-js");
    const clear = () => {
      image.style.transition = "";
      image.style.opacity = "";
    };
    if (fadeMs) window.setTimeout(clear, fadeMs + 50);
    else requestAnimationFrame(clear);
  };

  const removeVideo = (fadeMs: number) => {
    const element = video;
    video = null;
    if (!element) return;
    const drop = () => {
      element.pause();
      element.removeAttribute("src");
      element.load();
      element.remove();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      objectUrl = null;
    };
    if (!fadeMs) {
      // Dois quadros: garante que a <img> idêntica já foi pintada por baixo.
      requestAnimationFrame(() => requestAnimationFrame(drop));
      return;
    }
    element.style.transition = `opacity ${fadeMs}ms ease`;
    element.style.opacity = "0";
    window.setTimeout(drop, fadeMs + 50);
  };

  /** Sem vídeo (rede, codec, autoplay bloqueado): revelação da imagem oficial. */
  const fallback = () => {
    cancelAnimationFrame(frame);
    removeVideo(0);
    settle(FALLBACK_FADE_MS);
  };

  function skip() {
    if (done) return;
    cancelAnimationFrame(frame);
    // A imagem oficial assume por baixo; o vídeo se desfaz por cima.
    settle(0);
    removeVideo(SKIP_FADE_MS);
  }

  /**
   * Troca no trecho estático final (vídeo = fotografia, parado).
   * A <img> opaca assume por baixo e o vídeo se dissolve sobre ela, guiado pelo
   * tempo do próprio vídeo. Como os dois mostram o mesmo quadro sem movimento,
   * a dissolução apenas absorve diferenças de decodificação entre navegadores
   * (~1% de brilho, deslocamento subpixel) — nada se move, nada se duplica.
   */
  const watch = () => {
    const element = video;
    if (!element) return;
    const duration = Number.isFinite(element.duration) ? element.duration : 0;
    const holdStart = duration - options.hold;
    if (duration && element.currentTime >= holdStart) {
      settle(0);
      const x = Math.min(1, (element.currentTime - holdStart) / (options.hold * 0.9));
      element.style.opacity = String(1 - x * x * (3 - 2 * x));
      if (x >= 1) {
        removeVideo(0);
        return;
      }
    }
    frame = requestAnimationFrame(watch);
  };

  const start = (url: string) => {
    if (done || !figure) return;
    const element = document.createElement("video");
    element.className = image.className;
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
    // Mesma caixa da imagem oficial. O arquivo tem 1 linha preta de preenchimento
    // (altura par): `cover` + topo descarta essa linha e mantém o mapeamento 1:1.
    element.style.aspectRatio = String(options.ratio);
    element.style.objectFit = "cover";
    element.style.objectPosition = "top";
    element.style.background = "#000";
    element.addEventListener("ended", () => {
      cancelAnimationFrame(frame);
      settle(0);
      removeVideo(0);
    });
    element.addEventListener("error", fallback, { once: true });
    element.src = url;
    video = element;
    figure.appendChild(element);
    element.play().then(() => {
      window.clearTimeout(timeout);
      frame = requestAnimationFrame(watch);
    }, fallback);
  };

  // Garante que a flor nunca fique invisível: sem início em tempo hábil, fallback.
  timeout = window.setTimeout(fallback, READY_TIMEOUT_MS);

  const playable = document.createElement("video").canPlayType("video/mp4") !== "";
  if (!playable || !figure) {
    fallback();
  } else {
    // Download completo antes de tocar: reprodução sem travamentos.
    fetch(options.src, { signal: abort.signal })
      .then((response) => (response.ok ? response.blob() : Promise.reject(new Error(String(response.status)))))
      .then((blob) => {
        if (done) return;
        objectUrl = URL.createObjectURL(blob);
        start(objectUrl);
      })
      .catch(() => {
        if (!abort.signal.aborted) fallback();
      });
    window.addEventListener("pointerdown", skip);
    window.addEventListener("keydown", skip);
  }

  return {
    dispose() {
      abort.abort();
      cancelAnimationFrame(frame);
      settle(0);
      removeVideo(0);
    },
  };
}
