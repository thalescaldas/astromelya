import { FIELD } from "@/config/field";

/**
 * Genesis viva
 * ------------
 * Campo de partículas em duas camadas Canvas 2D (atrás e à frente da fotografia),
 * parallax em três profundidades e um campo gravitacional secreto ao pressionar
 * a flor. Um único ciclo requestAnimationFrame; nenhum estado React por quadro.
 *
 * Física: cada partícula tem uma órbita "natural" (elipse inclinada com ondulação
 * orgânica). A posição real segue essa órbita por uma mola criticamente amortecida;
 * sob gravidade, a mola cede lugar à atração por um anel giratório no coração da
 * flor. Como a posição e a velocidade são integradas continuamente, ativar e
 * soltar nunca produz saltos.
 */

export interface FieldElements {
  back: HTMLCanvasElement;
  front: HTMLCanvasElement;
  /** Figura da flor (recebe o parallax intermediário). */
  figure: HTMLElement;
  /** Fotografia oficial (referência de posição e escala). */
  image: HTMLImageElement;
}

export interface FieldOptions extends FieldElements {
  /** Florescimento em andamento: aguardar o evento de assentamento. */
  waitForBloom: boolean;
  reducedMotion: boolean;
}

export interface FieldController {
  dispose(): void;
}

interface Particle {
  radius: number;
  flatten: number;
  tilt: number;
  phase: number;
  speed: number;
  inclination: number;
  size: number;
  brightness: number;
  wanderFreq: [number, number];
  wanderPhase: [number, number];
  twinkleFreq: number;
  twinklePhase: number;
  delay: number;
  ring: number;
  ringPhase: number;
  // estado integrado (px CSS, relativo ao centro)
  x: number;
  y: number;
  vx: number;
  vy: number;
  z: number;
}

export const BLOOM_SETTLING_EVENT = "astromelya:bloom-settling";

const P = FIELD.particles;
const TAU = Math.PI * 2;
const rand = (min: number, max: number) => min + Math.random() * (max - min);
const smooth = (x: number) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};

/** Sprite do halo: um único gradiente radial pré-renderizado. */
function createSprite(): HTMLCanvasElement {
  const size = 64;
  const sprite = document.createElement("canvas");
  sprite.width = sprite.height = size;
  const ctx = sprite.getContext("2d");
  if (ctx) {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.18, "rgba(255,255,255,0.55)");
    g.addColorStop(0.45, "rgba(255,255,255,0.12)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  return sprite;
}

function createParticle(): Particle {
  // Distribuição natural: mais partículas perto da flor, algumas mais afastadas.
  const r = P.radius.min + (P.radius.max - P.radius.min) * Math.pow(Math.random(), 1.35);
  return {
    radius: r,
    flatten: rand(P.flatten.min, P.flatten.max),
    tilt: rand(-0.6, 0.6),
    phase: rand(0, TAU),
    speed: rand(P.angularSpeed.min, P.angularSpeed.max) * (Math.random() < 0.82 ? 1 : -1),
    inclination: rand(0.35, 1),
    size: P.size.min + (P.size.max - P.size.min) * Math.pow(Math.random(), 1.8),
    brightness: rand(0.55, 1),
    wanderFreq: [rand(P.wander.frequency.min, P.wander.frequency.max), rand(P.wander.frequency.min, P.wander.frequency.max)],
    wanderPhase: [rand(0, TAU), rand(0, TAU)],
    twinkleFreq: rand(P.twinkle.frequency.min, P.twinkle.frequency.max),
    twinklePhase: rand(0, TAU),
    delay: Math.random() * FIELD.emergence.stagger,
    ring: rand(FIELD.gravity.ring.min, FIELD.gravity.ring.max),
    ringPhase: rand(0, TAU),
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    z: 0,
  };
}

export function runField(options: FieldOptions): FieldController {
  const { back, front, figure, image, reducedMotion } = options;
  const backCtx = back.getContext("2d");
  const frontCtx = front.getContext("2d");
  if (!backCtx || !frontCtx) return { dispose() {} };

  const sprite = createSprite();
  const viewportCount = window.innerWidth < P.mobileBreakpoint ? P.mobile : P.desktop;
  const particles: Particle[] = Array.from({ length: viewportCount }, createParticle);
  let active = particles.length;

  // Geometria (atualizada só em resize)
  let vw = 0;
  let vh = 0;
  let dpr = 1;
  let cx = 0;
  let cy = 0;
  let w = 1;

  // Interação
  let pointerX = 0;
  let pointerY = 0;
  let px = 0; // parallax suavizado (-1..1)
  let py = 0;
  let pressed = false;
  let gRaw = 0;

  // Tempo
  let raf = 0;
  let last = 0;
  let clock = 0;
  let emergeAt = options.waitForBloom ? Number.POSITIVE_INFINITY : 0.25;
  let flowerX = 0;
  let flowerY = 0;

  // Desempenho
  let sampled = 0;
  let sampleSum = 0;
  let adapted = false;

  const measure = () => {
    vw = window.innerWidth;
    vh = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, FIELD.performance.maxPixelRatio);
    for (const canvas of [back, front]) {
      canvas.width = Math.round(vw * dpr);
      canvas.height = Math.round(vh * dpr);
    }
    // A figura pode estar deslocada pelo parallax: desconta o deslocamento atual.
    const rect = image.getBoundingClientRect();
    w = rect.width || vw;
    cx = rect.left - flowerX + FIELD.center.x * rect.width;
    cy = rect.top - flowerY + FIELD.center.y * rect.height;
  };

  /** Órbita natural de uma partícula no instante t (px CSS, relativo ao centro). */
  const orbit = (p: Particle, t: number) => {
    const a = p.phase + p.speed * t;
    const rx = p.radius * w;
    const ry = rx * p.flatten;
    let ox = Math.cos(a) * rx;
    let oy = Math.sin(a) * ry * p.inclination;
    const z = Math.sin(a) * p.inclination;
    // ondulação orgânica (soma de senoides lentas)
    const amp = P.wander.amplitude * w;
    ox += Math.sin(t * TAU * p.wanderFreq[0] + p.wanderPhase[0]) * amp;
    oy += Math.sin(t * TAU * p.wanderFreq[1] + p.wanderPhase[1]) * amp * 0.8;
    const ct = Math.cos(p.tilt);
    const st = Math.sin(p.tilt);
    return { x: ox * ct - oy * st, y: ox * st + oy * ct, z };
  };

  const placeAll = (t: number) => {
    for (const p of particles) {
      const o = orbit(p, t);
      p.x = o.x;
      p.y = o.y;
      p.z = o.z;
      p.vx = 0;
      p.vy = 0;
    }
  };

  const step = (dt: number) => {
    const G = FIELD.gravity;
    const target = pressed ? 1 : 0;
    gRaw += (target > gRaw ? dt / G.rise : -dt / G.release);
    gRaw = Math.min(1, Math.max(0, gRaw));
    const g = smooth(gRaw);

    const kHome = G.home * (1 - g);
    const kPull = G.pull * g;
    const damping = 2 * Math.sqrt(Math.max(kHome + kPull, 0.0001));
    const maxV = G.maxSpeed * w;

    for (let i = 0; i < active; i++) {
      const p = particles[i];
      const o = orbit(p, clock);
      p.z = o.z;
      // anel giratório no coração da flor (alvo sob gravidade)
      const ra = p.ringPhase + clock * G.spin * (0.6 + p.ring / G.ring.max);
      const rr = p.ring * w;
      const tx = Math.cos(ra) * rr;
      const ty = Math.sin(ra) * rr * 0.7;
      const ax = kHome * (o.x - p.x) + kPull * (tx - p.x) - damping * p.vx;
      const ay = kHome * (o.y - p.y) + kPull * (ty - p.y) - damping * p.vy;
      p.vx += ax * dt;
      p.vy += ay * dt;
      const speed = Math.hypot(p.vx, p.vy);
      if (speed > maxV) {
        p.vx *= maxV / speed;
        p.vy *= maxV / speed;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    return g;
  };

  const draw = (g: number) => {
    const PX = FIELD.parallax;
    backCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    frontCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    backCtx.clearRect(0, 0, vw, vh);
    frontCtx.clearRect(0, 0, vw, vh);
    backCtx.globalCompositeOperation = "lighter";
    frontCtx.globalCompositeOperation = "lighter";

    for (let i = 0; i < active; i++) {
      const p = particles[i];
      const appear = smooth((clock - emergeAt - p.delay) / FIELD.emergence.duration);
      if (appear <= 0) continue;
      // profundidade 0 (fundo) … 1 (frente); sob gravidade, todos convergem ao plano da flor
      const depth = (p.z + 1) / 2;
      const nearLayer = p.z > 0;
      const ctx = nearLayer ? frontCtx : backCtx;
      // Parallax contínuo pela profundidade: fundo (far) → plano da flor → frente (near).
      const parallax =
        depth < 0.5
          ? PX.far * 0.5 + (PX.flower - PX.far * 0.5) * (depth * 2)
          : PX.flower + (PX.near - PX.flower) * ((depth - 0.5) * 2);
      const sx = cx + p.x - px * parallax;
      const sy = cy + p.y - py * parallax;
      const twinkle = 1 - P.twinkle.depth * (0.5 + 0.5 * Math.sin(clock * TAU * p.twinkleFreq + p.twinklePhase));
      const glow = 1 + FIELD.gravity.glow * g;
      const scale = 0.75 + 0.5 * depth;
      const core = p.size * scale;
      const intensity = appear * p.brightness * twinkle * (0.6 + 0.4 * depth) * glow;

      const halo = core * P.haloScale;
      ctx.globalAlpha = Math.min(1, P.alpha.halo * intensity * 1.6);
      ctx.drawImage(sprite, sx - halo, sy - halo, halo * 2, halo * 2);
      ctx.globalAlpha = Math.min(1, P.alpha.core * intensity);
      ctx.drawImage(sprite, sx - core, sy - core, core * 2, core * 2);
    }
    backCtx.globalAlpha = 1;
    frontCtx.globalAlpha = 1;
  };

  const applyFlowerParallax = () => {
    const tx = Math.round(-px * FIELD.parallax.flower * 100) / 100;
    const ty = Math.round(-py * FIELD.parallax.flower * 100) / 100;
    if (tx !== flowerX || ty !== flowerY) {
      flowerX = tx;
      flowerY = ty;
      figure.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
    }
  };

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    const dtRaw = last ? (now - last) / 1000 : 1 / 60;
    last = now;
    const dt = Math.min(dtRaw, 1 / 30);
    clock += dt;

    if (!adapted) {
      sampled++;
      if (sampled > 10) sampleSum += dtRaw * 1000;
      if (sampled >= FIELD.performance.sampleFrames) {
        adapted = true;
        if (sampleSum / (sampled - 10) > FIELD.performance.reduceAt) {
          active = Math.max(12, Math.round(particles.length * FIELD.performance.reduceTo));
        }
      }
    }

    // parallax suavizado (interpolação exponencial contínua)
    const k = 1 - Math.exp(-dt * FIELD.parallax.smoothing);
    px += (pointerX - px) * k;
    py += (pointerY - py) * k;
    applyFlowerParallax();

    const g = step(dt);
    draw(g);
  };

  const start = () => {
    if (raf || reducedMotion) return;
    last = 0;
    raf = requestAnimationFrame(frame);
  };

  const stop = () => {
    cancelAnimationFrame(raf);
    raf = 0;
  };

  // ── Eventos ─────────────────────────────────────────────────────────
  const onResize = () => {
    measure();
    if (reducedMotion) draw(0);
  };

  const onPointerMove = (e: PointerEvent) => {
    if (e.pointerType === "mouse") {
      let nx = (e.clientX / vw) * 2 - 1;
      let ny = (e.clientY / vh) * 2 - 1;
      // Limite circular: o deslocamento máximo vale em qualquer direção (inclusive diagonais).
      const length = Math.hypot(nx, ny);
      if (length > 1) {
        nx /= length;
        ny /= length;
      }
      pointerX = nx;
      pointerY = ny;
    }
  };

  const insideFlower = (x: number, y: number) => {
    const dx = (x - cx - flowerX) / (FIELD.gravity.hitRadius.x * w);
    const dy = (y - cy - flowerY) / (FIELD.gravity.hitRadius.y * w);
    return dx * dx + dy * dy <= 1;
  };

  const onPointerDown = (e: PointerEvent) => {
    if (e.button > 0 || !insideFlower(e.clientX, e.clientY)) return;
    // links e controles do cabeçalho mantêm seu comportamento
    if ((e.target as Element | null)?.closest("a, button, header")) return;
    pressed = true;
  };

  const release = () => {
    pressed = false;
  };

  const onVisibility = () => {
    if (document.hidden) stop();
    else start();
  };

  const onSettling = () => {
    if (emergeAt === Number.POSITIVE_INFINITY) emergeAt = clock;
  };

  measure();
  placeAll(0);

  if (reducedMotion) {
    // Movimento reduzido: um único quadro estático, sem parallax nem gravidade.
    emergeAt = -100;
    clock = 0;
    draw(0);
  } else {
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    window.addEventListener("blur", release);
    window.addEventListener(BLOOM_SETTLING_EVENT, onSettling);
    document.addEventListener("visibilitychange", onVisibility);
    if (!document.hidden) start();
  }
  window.addEventListener("resize", onResize);

  return {
    dispose() {
      stop();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
      window.removeEventListener("blur", release);
      window.removeEventListener(BLOOM_SETTLING_EVENT, onSettling);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      figure.style.transform = "";
      for (const canvas of [back, front]) {
        canvas.width = 0;
        canvas.height = 0;
      }
    },
  };
}
