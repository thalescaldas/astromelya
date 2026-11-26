import { FIELD } from "@/config/field";

/**
 * Genesis viva
 * ------------
 * Campo de partículas em uma camada Canvas 2D desenhada sobre a fotografia e
 * recortada por uma máscara de oclusão da silhueta da Genesis: todas as
 * partículas (e seus halos) ficam atrás da flor. A flor permanece fixa (sem
 * parallax); um campo gravitacional secreto age ao pressionar a flor.
 * Um único ciclo requestAnimationFrame; nenhum estado React por quadro.
 *
 * Física: cada partícula tem uma órbita "natural" (elipse inclinada com ondulação
 * orgânica). A posição real segue essa órbita por uma mola criticamente amortecida;
 * sob gravidade, a mola cede lugar à atração por um anel giratório no coração da
 * flor. Como a posição e a velocidade são integradas continuamente, ativar e
 * soltar nunca produz saltos.
 */

export interface FieldElements {
  canvas: HTMLCanvasElement;
  /** Silhueta da flor (alfa), mesma geometria da fotografia. */
  maskSrc: string;
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
  /** Instante de nascimento (s de permanência acumulada) e duração do fade-in. */
  birth: number;
  fade: number;
  /** Visibilidade atual (0–1), calculada uma vez por quadro. */
  appear: number;
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
    birth: 0,
    fade: rand(FIELD.emergence.fade.min, FIELD.emergence.fade.max),
    appear: 0,
    ring: rand(FIELD.gravity.ring.min, FIELD.gravity.ring.max),
    ringPhase: rand(0, TAU),
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    z: 0,
  };
}

/**
 * Momentos de nascimento: um quantil por partícula, com jitter dentro da própria
 * faixa (estratificado), convertido pelo inverso da curva de progressão e
 * distribuído em ordem aleatória entre as partículas.
 */
function assignBirths(particles: Particle[]) {
  const E = FIELD.emergence;
  const n = particles.length;
  const order = particles.map((_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [order[i], order[j]] = [order[j], order[i]];
  }
  for (let k = 0; k < n; k++) {
    const q = (k + 0.15 + Math.random() * 0.7) / n;
    particles[order[k]].birth = E.totalSeconds * Math.pow(q, 1 / E.exponent);
  }
}

function loadElapsed(): number {
  try {
    const value = Number.parseFloat(sessionStorage.getItem(FIELD.emergence.storageKey) ?? "");
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

function saveElapsed(value: number) {
  try {
    sessionStorage.setItem(FIELD.emergence.storageKey, value.toFixed(2));
  } catch {
    // armazenamento indisponível: o progresso recomeça na próxima visita
  }
}

export function runField(options: FieldOptions): FieldController {
  const { canvas, image, reducedMotion } = options;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { dispose() {} };

  // Máscara de oclusão: carregada uma vez, reescalada só em resize.
  const maskImage = new Image();
  const maskCanvas = document.createElement("canvas");
  let maskReady = false;

  const sprite = createSprite();
  const viewportCount = window.innerWidth < P.mobileBreakpoint ? P.mobile : P.desktop;
  const particles: Particle[] = Array.from({ length: viewportCount }, createParticle);
  assignBirths(particles);
  let active = particles.length;

  // Permanência acumulada (somente com a Home visível e após o florescimento).
  const E = FIELD.emergence;
  let elapsed = loadElapsed();
  const resumedAt = elapsed;
  let sinceSave = 0;
  let bornCount = -1;

  // Geometria (atualizada só em resize)
  let vw = 0;
  let vh = 0;
  let dpr = 1;
  let cx = 0;
  let cy = 0;
  let w = 1;
  let imgLeft = 0;
  let imgTop = 0;
  let imgHeight = 0;

  // Interação
  let pressed = false;
  let gRaw = 0;

  // Tempo
  let raf = 0;
  let last = 0;
  let clock = 0;
  let emergeAt = options.waitForBloom ? Number.POSITIVE_INFINITY : 0.25;

  // Desempenho
  let sampled = 0;
  let sampleSum = 0;
  let adapted = false;

  const measure = () => {
    vw = window.innerWidth;
    vh = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, FIELD.performance.maxPixelRatio);
    canvas.width = Math.round(vw * dpr);
    canvas.height = Math.round(vh * dpr);
    // Posição fixa da fotografia (sem parallax): a máscara usa exatamente esta caixa.
    const rect = image.getBoundingClientRect();
    w = rect.width || vw;
    imgLeft = rect.left;
    imgTop = rect.top;
    imgHeight = rect.height;
    cx = imgLeft + FIELD.center.x * rect.width;
    cy = imgTop + FIELD.center.y * rect.height;
    prepareMask();
  };

  /** Reescala a máscara para a resolução exata da tela (cópia 1:1 por quadro). */
  function prepareMask() {
    if (!maskImage.naturalWidth) return;
    maskCanvas.width = Math.max(1, Math.round(w * dpr));
    maskCanvas.height = Math.max(1, Math.round(imgHeight * dpr));
    const mctx = maskCanvas.getContext("2d");
    if (!mctx) return;
    mctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
    mctx.imageSmoothingQuality = "high";
    mctx.drawImage(maskImage, 0, 0, maskCanvas.width, maskCanvas.height);
    maskReady = true;
  }

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

    const maxV = G.maxSpeed * w;
    const resume = smooth((elapsed - resumedAt) / E.resumeFade);
    let born = 0;

    for (let i = 0; i < active; i++) {
      const p = particles[i];
      // Visibilidade: fade-in individual a partir do nascimento; as que já tinham
      // nascido numa visita anterior da sessão reaparecem suavemente.
      const fresh = smooth((elapsed - p.birth) / p.fade);
      p.appear = reducedMotion ? 1 : p.birth <= resumedAt ? fresh * resume : fresh;
      if (p.appear > 0) born++;
      // A gravidade age somente sobre partículas nascidas (proporcional à visibilidade).
      const gb = g * p.appear;
      const kHome = G.home * (1 - gb);
      const kPull = G.pull * gb;
      const damping = 2 * Math.sqrt(Math.max(kHome + kPull, 0.0001));
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
    if (born !== bornCount) {
      bornCount = born;
      // Diagnóstico leve (muda no máximo uma vez por nascimento): partículas nascidas.
      canvas.dataset.born = String(born);
    }
    return g;
  };

  const draw = (g: number) => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, vw, vh);
    // Sem máscara, nenhuma partícula é desenhada (nunca sobre a flor).
    if (!maskReady) return;
    ctx.globalCompositeOperation = "lighter";

    for (let i = 0; i < active; i++) {
      const p = particles[i];
      const appear = p.appear;
      if (appear <= 0) continue;
      // profundidade 0 (distante) … 1 (próxima): define tamanho e brilho
      const depth = (p.z + 1) / 2;
      const sx = cx + p.x;
      const sy = cy + p.y;
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
    ctx.globalAlpha = 1;

    // Oclusão: apaga tudo o que cai sobre a silhueta (partículas e halos),
    // na posição exata (e fixa) da fotografia.
    ctx.globalCompositeOperation = "destination-out";
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(maskCanvas, imgLeft * dpr, imgTop * dpr);
    ctx.globalCompositeOperation = "source-over";
  };

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    const dtRaw = last ? (now - last) / 1000 : 1 / 60;
    last = now;
    const dt = Math.min(dtRaw, 1 / 30);
    clock += dt;
    // Permanência: conta só depois do florescimento (pausada com a aba oculta,
    // pois o ciclo para). Pressionar a flor não altera este relógio.
    if (clock >= emergeAt) {
      const step = Math.min(dtRaw, E.maxStep);
      elapsed += step;
      sinceSave += step;
      if (sinceSave >= E.saveInterval) {
        sinceSave = 0;
        saveElapsed(elapsed);
      }
    }

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
    if (!reducedMotion) saveElapsed(elapsed);
  };

  // ── Eventos ─────────────────────────────────────────────────────────
  const onResize = () => {
    measure();
    if (reducedMotion) draw(0);
  };

  const insideFlower = (x: number, y: number) => {
    const dx = (x - cx) / (FIELD.gravity.hitRadius.x * w);
    const dy = (y - cy) / (FIELD.gravity.hitRadius.y * w);
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

  maskImage.decoding = "async";
  maskImage.onload = () => {
    prepareMask();
    if (reducedMotion) {
      step(0);
      draw(0);
    }
  };
  maskImage.src = options.maskSrc;

  if (reducedMotion) {
    // Movimento reduzido: um único quadro estático, sem gravidade.
    emergeAt = -100;
    clock = 0;
  } else {
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
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
      window.removeEventListener("blur", release);
      window.removeEventListener(BLOOM_SETTLING_EVENT, onSettling);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      maskImage.onload = null;
      canvas.width = 0;
      canvas.height = 0;
      maskCanvas.width = 0;
      maskCanvas.height = 0;
    },
  };
}
