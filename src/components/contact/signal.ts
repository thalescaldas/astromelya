/**
 * The Signal — ondas orgânicas monocromáticas em Canvas 2D.
 * Um único ciclo rAF; pausa com a aba oculta; cliques/toques geram ondas propagantes.
 */
export interface SignalController {
  dispose(): void;
}

interface Pulse {
  x: number;
  y: number;
  t0: number;
}

const LINES = 26;
const PULSE_LIFE = 3.2; // s
const PULSE_SPEED = 0.42; // fração da largura por segundo
const MAX_DPR = 2;

export function runSignal(canvas: HTMLCanvasElement, reducedMotion: boolean): SignalController {
  const ctx = canvas.getContext("2d");
  if (!ctx) return { dispose() {} };

  let w = 0;
  let h = 0;
  let dpr = 1;
  let raf = 0;
  let start = performance.now();
  let pointerX = -1;
  let pointerY = -1;
  const pulses: Pulse[] = [];

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    if (reducedMotion) draw(4);
  };

  const draw = (t: number) => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const cy = h * 0.5;
    const amp = Math.min(h * 0.11, 90);
    const intro = reducedMotion ? 1 : Math.min(1, t / 2.4);
    const ease = intro * intro * (3 - 2 * intro);
    const step = Math.max(4, w / 220);
    const now = t;

    for (let i = 0; i < LINES; i++) {
      const k = i / (LINES - 1);
      const spread = (k - 0.5) * 2; // −1 … 1
      const phase = i * 0.37;
      const alpha = (0.05 + 0.32 * (1 - Math.abs(spread)) ** 1.6) * ease;
      ctx.strokeStyle = `rgba(217,217,217,${alpha.toFixed(3)})`;
      ctx.lineWidth = Math.abs(spread) < 0.08 ? 1.1 : 0.7;
      ctx.beginPath();
      for (let x = 0; x <= w + step; x += step) {
        const u = x / w;
        // envelope: o sinal emerge do centro e se dissipa nas bordas
        const env = Math.exp(-(((u - 0.5) / 0.32) ** 2)) * ease;
        let y =
          Math.sin(u * 9.0 + now * 0.55 + phase) * 0.55 +
          Math.sin(u * 17.0 - now * 0.38 + phase * 1.7) * 0.25 +
          Math.sin(u * 4.0 + now * 0.21 + spread * 2.0) * 0.35;
        y *= amp * env * (0.35 + 0.65 * (1 - Math.abs(spread)));
        y += spread * amp * 0.55 * env;
        // ondas propagantes (clique/toque) e ondulação local do cursor
        for (const p of pulses) {
          const age = now - p.t0;
          const r = age * PULSE_SPEED * w;
          const d = Math.hypot(x - p.x, cy + y - p.y);
          const ring = Math.exp(-(((d - r) / 26) ** 2)) * (1 - age / PULSE_LIFE);
          y += Math.sin((d - r) * 0.09) * ring * 18;
        }
        if (pointerX >= 0) {
          const d = Math.hypot(x - pointerX, cy + y - pointerY);
          y += Math.sin(d * 0.05 - now * 3) * 10 * Math.exp(-((d / 120) ** 2));
        }
        if (x === 0) ctx.moveTo(x, cy + y);
        else ctx.lineTo(x, cy + y);
      }
      ctx.stroke();
    }

    // ponto luminoso de origem
    const glow = ctx.createRadialGradient(w / 2, cy, 0, w / 2, cy, 18);
    glow.addColorStop(0, `rgba(255,255,255,${(0.9 * ease).toFixed(3)})`);
    glow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(w / 2 - 18, cy - 18, 36, 36);
  };

  const frame = (ms: number) => {
    raf = requestAnimationFrame(frame);
    const t = (ms - start) / 1000;
    for (let i = pulses.length - 1; i >= 0; i--) if (t - pulses[i].t0 > PULSE_LIFE) pulses.splice(i, 1);
    draw(t);
  };

  const onPointerDown = (e: PointerEvent) => {
    if ((e.target as Element | null)?.closest("a, button")) return;
    const rect = canvas.getBoundingClientRect();
    pulses.push({ x: e.clientX - rect.left, y: e.clientY - rect.top, t0: (performance.now() - start) / 1000 });
    if (pulses.length > 6) pulses.shift();
  };
  const onPointerMove = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    const rect = canvas.getBoundingClientRect();
    pointerX = e.clientX - rect.left;
    pointerY = e.clientY - rect.top;
  };
  const onPointerLeave = () => {
    pointerX = pointerY = -1;
  };
  const onVisibility = () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
      raf = 0;
    } else if (!raf) {
      raf = requestAnimationFrame(frame);
    }
  };

  resize();
  window.addEventListener("resize", resize);
  if (!reducedMotion) {
    start = performance.now();
    raf = requestAnimationFrame(frame);
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("pointerleave", onPointerLeave);
    document.addEventListener("visibilitychange", onVisibility);
  }

  return {
    dispose() {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerleave", onPointerLeave);
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.width = canvas.height = 0;
    },
  };
}
