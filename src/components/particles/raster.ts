/**
 * Utilitários de rasterização e amostragem dos SVGs oficiais.
 * Os arquivos não são modificados: são apenas desenhados em um canvas
 * na resolução exata da tela para virar textura e fonte de partículas.
 */

export function loadImage(src: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.decoding = "async";
  image.src = src;
  return image.decode().then(() => image);
}

export interface Raster {
  canvas: HTMLCanvasElement;
  /** Largura e altura em pixels CSS. */
  width: number;
  height: number;
  scale: number;
}

export function rasterize(image: CanvasImageSource, width: number, height: number, scale: number): Raster {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx?.drawImage(image, 0, 0, canvas.width, canvas.height);
  return { canvas, width, height, scale };
}

const ALPHA_THRESHOLD = 110;

/**
 * Sorteia `count` pontos sobre os pixels opacos do raster.
 * Coordenadas locais em pixels CSS, centradas, com y para cima.
 */
export function samplePoints(raster: Raster, count: number): Float32Array {
  const { canvas, width, height, scale } = raster;
  const points = new Float32Array(count * 2);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return points;

  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const opaque: number[] = [];
  for (let i = 0, p = 3; p < data.length; i++, p += 4) {
    if (data[p] > ALPHA_THRESHOLD) opaque.push(i);
  }

  const w = canvas.width;
  for (let n = 0; n < count; n++) {
    const index = opaque.length ? opaque[(Math.random() * opaque.length) | 0] : 0;
    const px = (index % w) + Math.random();
    const py = Math.floor(index / w) + Math.random();
    points[n * 2] = px / scale - width / 2;
    points[n * 2 + 1] = height / 2 - py / scale;
  }
  return points;
}
