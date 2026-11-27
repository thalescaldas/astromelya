/**
 * The Passage — dissolução em partículas (Canvas 2D).
 * A tela é dividida em células; cada célula se dissolve num instante próprio
 * (padrão aleatório, radial ou descendente), enquanto poeira luminosa se
 * desprende e sobe. "out": a página se desfaz no preto; "in": o preto se desfaz.
 */
export type DissolvePattern = "random" | "radial" | "descend";

const CELL = 22;
const SPREAD = 0.6; // fração do tempo usada para escalonar as células

interface Grid {
  cols: number;
  rows: number;
  order: Float32Array; // 0..1 — quando cada célula se dissolve
  jitter: Float32Array;
}

function buildGrid(w: number, h: number, pattern: DissolvePattern): Grid {
  const cols = Math.ceil(w / CELL) + 1;
  const rows = Math.ceil(h / CELL) + 1;
  const order = new Float32Array(cols * rows);
  const jitter = new Float32Array(cols * rows);
  const cx = cols / 2, cy = rows / 2, rmax = Math.hypot(cx, cy);
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x;
      const n = Math.random();
      jitter[i] = Math.random();
      if (pattern === "radial") order[i] = 0.75 * (Math.hypot(x - cx, y - cy) / rmax) + 0.25 * n;
      else if (pattern === "descend") order[i] = 0.7 * (y / rows) + 0.3 * n;
      else order[i] = n;
    }
  return { cols, rows, order, jitter };
}

const ease = (t: number) => t * t * (3 - 2 * t);

/** Executa uma fase; resolve ao terminar. `cancel` interrompe (desmontagem). */
export function dissolve(
  canvas: HTMLCanvasElement,
  direction: "out" | "in",
  pattern: DissolvePattern,
  duration: number,
  signal: { cancelled: boolean },
): Promise<void> {
  const ctx = canvas.getContext("2d");
  const w = window.innerWidth, h = window.innerHeight;
  canvas.width = w;
  canvas.height = h; // dpr 1: partículas são grossas por natureza; custo mínimo
  if (!ctx || duration <= 0) {
    if (ctx) {
      ctx.fillStyle = "#000";
      if (direction === "out") ctx.fillRect(0, 0, w, h);
      else ctx.clearRect(0, 0, w, h);
    }
    return Promise.resolve();
  }
  const g = buildGrid(w, h, pattern);
  const r0 = CELL * 0.75;
  return new Promise((resolve) => {
    const t0 = performance.now();
    const frame = (now: number) => {
      if (signal.cancelled) return resolve();
      const p = Math.min(1, (now - t0) / duration);
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#000";
      for (let y = 0; y < g.rows; y++)
        for (let x = 0; x < g.cols; x++) {
          const i = y * g.cols + x;
          const local = ease(Math.min(1, Math.max(0, (p - g.order[i] * SPREAD) / (1 - SPREAD))));
          const cover = direction === "out" ? local : 1 - local; // 1 = célula preta
          if (cover <= 0.001) continue;
          const px = x * CELL, py = y * CELL;
          if (cover >= 0.999) {
            ctx.fillRect(px - CELL / 2, py - CELL / 2, CELL + 1, CELL + 1);
          } else {
            ctx.beginPath();
            ctx.arc(px, py, r0 * cover, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      // poeira: fragmentos luminosos que se desprendem durante a dissolução
      for (let i = 0; i < g.order.length; i += 7) {
        const local = Math.min(1, Math.max(0, (p - g.order[i] * SPREAD) / (1 - SPREAD)));
        if (local <= 0.05 || local >= 0.85) continue;
        const a = Math.sin(local * Math.PI) * 0.55;
        const x = (i % g.cols) * CELL + (g.jitter[i] - 0.5) * CELL;
        const y = Math.floor(i / g.cols) * CELL - local * 18 * (0.5 + g.jitter[i]);
        ctx.fillStyle = `rgba(217,217,217,${a.toFixed(3)})`;
        ctx.fillRect(x, y, 1.5, 1.5);
        ctx.fillStyle = "#000";
      }
      if (p < 1) requestAnimationFrame(frame);
      else {
        if (direction === "out") ctx.fillRect(0, 0, w, h);
        else ctx.clearRect(0, 0, w, h);
        resolve();
      }
    };
    requestAnimationFrame(frame);
  });
}
