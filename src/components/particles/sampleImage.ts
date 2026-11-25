/**
 * Amostra pontos a partir dos pixels opacos de uma imagem já carregada,
 * na posição em que ela aparece na tela. Retorna coordenadas de mundo
 * centradas na viewport (x para a direita, y para cima), prontas para uma
 * câmera ortográfica em pixels.
 */
export interface ScreenRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const OVERSAMPLE = 2;
const ALPHA_THRESHOLD = 96;

export function sampleImagePoints(
  image: CanvasImageSource,
  rect: ScreenRect,
  viewport: { width: number; height: number },
  count: number,
): Float32Array {
  const w = Math.max(1, Math.round(rect.width * OVERSAMPLE));
  const h = Math.max(1, Math.round(rect.height * OVERSAMPLE));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const points = new Float32Array(count * 3);
  if (!ctx) return points;

  ctx.drawImage(image, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);

  const candidates: number[] = [];
  for (let i = 0, p = 3; p < data.length; i++, p += 4) {
    if (data[p] > ALPHA_THRESHOLD) candidates.push(i);
  }

  const halfW = viewport.width / 2;
  const halfH = viewport.height / 2;

  for (let n = 0; n < count; n++) {
    let px: number;
    let py: number;
    if (candidates.length > 0) {
      const index = candidates[(Math.random() * candidates.length) | 0];
      px = (index % w) + Math.random();
      py = Math.floor(index / w) + Math.random();
    } else {
      px = Math.random() * w;
      py = Math.random() * h;
    }
    points[n * 3] = rect.x + px / OVERSAMPLE - halfW;
    points[n * 3 + 1] = halfH - (rect.y + py / OVERSAMPLE);
    points[n * 3 + 2] = 0;
  }

  return points;
}
