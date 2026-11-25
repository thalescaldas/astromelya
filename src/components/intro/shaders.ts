import { INTRO_TIMINGS as T } from "@/animations/introTimings";

/**
 * Shaders da introdução. Nome, partículas e símbolo compartilham as mesmas
 * funções (campo gravitacional, máscara de nascimento, chegada, trajetória),
 * garantindo que posição, velocidade e opacidade sejam contínuas entre estados.
 */

const f = (n: number) => n.toFixed(4);

const defines = /* glsl */ `
#define REVEAL_END ${f(T.REVEAL_END)}
#define DEFORM_START ${f(T.DEFORM_START)}
#define DEFORM_END ${f(T.DEFORM_END)}
#define DISSOLVE_START ${f(T.DISSOLVE_START)}
#define DISSOLVE_SPAN ${f(T.DISSOLVE_SPAN)}
#define BIRTH_FADE ${f(T.BIRTH_FADE)}
#define MIN_TRAVEL ${f(T.MIN_TRAVEL)}
#define SOLID_START ${f(T.SOLID_START)}
#define SOLID_SPAN ${f(T.SOLID_SPAN)}
#define CONDENSE_IN ${f(T.CONDENSE_IN)}
#define CONDENSE_OUT ${f(T.CONDENSE_OUT)}
#define FLIGHT_START ${f(T.FLIGHT_START)}
#define FLIGHT_END ${f(T.FLIGHT_END)}
#define HANDOFF_START ${f(T.HANDOFF_START)}
#define HANDOFF_END ${f(T.HANDOFF_END)}
#define GRAVITY vec2(0.14, 0.045)
#define RESIDUAL_RATIO 0.2
`;

const common = /* glsl */ `
${defines}
uniform float uClock;
uniform float uWordHalf;
uniform float uWordAmp;
uniform float uSymbolRadius;
uniform vec2 uP0;
uniform vec2 uP1;
uniform vec2 uP2;
uniform vec2 uP3;
uniform float uScaleEnd;

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 u = fract(p);
  u = u * u * (3.0 - 2.0 * u);
  return mix(
    mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x),
    mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

vec2 vnoise2(vec2 p) {
  return vec2(vnoise(p), vnoise(p + vec2(31.41, 17.73))) * 2.0 - 1.0;
}

/* Mesma função em TypeScript (ordenação dos pares). */
float trigNoise(vec2 p) {
  return 0.5 + 0.25 * (sin(1.7 * p.x + 0.9 * p.y) + sin(-0.8 * p.x + 1.3 * p.y + 1.7));
}

float smoother(float x) {
  x = clamp(x, 0.0, 1.0);
  return x * x * x * (x * (x * 6.0 - 15.0) + 10.0);
}

float window01(float t, float a, float b) {
  return clamp((t - a) / (b - a), 0.0, 1.0);
}

/* Intensidade do campo: cresce devagar e acelera, como uma atração. */
float deformAmount() {
  float x = window01(uClock, DEFORM_START, DEFORM_END);
  return x * x * (3.0 - 2.0 * x);
}

vec2 gravityScale() {
  float k = deformAmount();
  return GRAVITY * k * k;
}

vec2 organic(vec2 p) {
  return vnoise2(p * 0.018 + vec2(uClock * 0.35, -uClock * 0.25)) * uWordAmp * deformAmount();
}

/* Deslocamento aplicado à matéria do nome (traços e partículas). */
vec2 field(vec2 p) {
  return -p * gravityScale() + organic(p);
}

/* Instante em que cada ponto do nome deixa de ser traço e vira partícula. */
float birthTime(vec2 p) {
  float edge = 1.0 - clamp(abs(p.x) / uWordHalf, 0.0, 1.0);
  float b = clamp(0.6 * edge + 0.4 * trigNoise(p * 0.02), 0.0, 1.0);
  return DISSOLVE_START + b * DISSOLVE_SPAN;
}

/* Instante em que cada ponto do símbolo se condensa (do centro para fora). */
float arriveTime(vec2 p) {
  float o = clamp(0.8 * length(p) / uSymbolRadius + 0.2 * trigNoise(p * 0.06), 0.0, 1.0);
  return SOLID_START + o * SOLID_SPAN;
}

/* Curva de migração: partida e chegada com velocidade nula, chegada longa. */
float flightProgress(float lag) {
  float x = window01(uClock - lag, FLIGHT_START, FLIGHT_END);
  return smoother(pow(x, 0.82));
}

vec2 bezier(float t) {
  float u = 1.0 - t;
  return u * u * u * uP0 + 3.0 * u * u * t * uP1 + 3.0 * u * t * t * uP2 + t * t * t * uP3;
}

float flightScale(float t) {
  return mix(1.0, uScaleEnd, t);
}
`;

/* ── Nome (wordmark) ─────────────────────────────────────────────── */

export const wordmarkVertex = /* glsl */ `
${common}
varying vec2 vLocal;
void main() {
  vLocal = position.xy;
  float reveal = smoother(uClock / REVEAL_END);
  vec2 world = position.xy * mix(0.985, 1.0, reveal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(world, 0.0, 1.0);
}
`;

export const wordmarkFragment = /* glsl */ `
${common}
uniform sampler2D uMap;
uniform vec2 uSize;
varying vec2 vLocal;
void main() {
  // Inversa do campo: qual ponto original do nome aparece aqui.
  vec2 src = (vLocal - organic(vLocal)) / (1.0 - gravityScale());
  vec2 uv = src / uSize + 0.5;
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) discard;
  float a = texture2D(uMap, uv).a;
  float birth = birthTime(src);
  float alive = 1.0 - smoothstep(birth, birth + BIRTH_FADE, uClock);
  float reveal = smoother(uClock / REVEAL_END);
  float alpha = a * alive * reveal;
  if (alpha < 0.002) discard;
  gl_FragColor = vec4(vec3(1.0), alpha);
}
`;

/* ── Símbolo ─────────────────────────────────────────────────────── */

export const symbolVertex = /* glsl */ `
${common}
varying vec2 vLocal;
void main() {
  vLocal = position.xy;
  float t = flightProgress(0.0);
  vec2 world = bezier(t) + position.xy * flightScale(t);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(world, 0.0, 1.0);
}
`;

export const symbolFragment = /* glsl */ `
${common}
uniform sampler2D uMapLarge;
uniform sampler2D uMapSmall;
uniform vec2 uSize;
uniform float uOpacityEnd;
varying vec2 vLocal;
void main() {
  vec2 uv = vLocal / uSize + 0.5;
  float t = flightProgress(0.0);
  float tex = mix(texture2D(uMapLarge, uv).a, texture2D(uMapSmall, uv).a, smoothstep(0.55, 1.0, t));
  float arrive = arriveTime(vLocal);
  float solid = smoothstep(arrive + CONDENSE_IN, arrive + CONDENSE_OUT, uClock);
  float a = tex * solid * mix(1.0, uOpacityEnd, t);
  // Troca pelo símbolo do header: mantém a cobertura composta constante.
  float h = window01(uClock, HANDOFF_START, HANDOFF_END);
  float q = a * (1.0 - h) / max(1.0 - a * h, 0.0001);
  if (q < 0.002) discard;
  gl_FragColor = vec4(vec3(1.0), q);
}
`;

/* ── Partículas ──────────────────────────────────────────────────── */

export const particleVertex = /* glsl */ `
${common}
attribute vec2 aFrom;
attribute vec2 aTo;
attribute vec4 aSeed;
uniform float uSize;
uniform float uPixelRatio;
uniform float uScatter;
varying float vAlpha;

void main() {
  bool residual = aSeed.w < RESIDUAL_RATIO;
  float birth = birthTime(aFrom);
  float arrive = max(arriveTime(aTo), birth + MIN_TRAVEL);

  // Residuais seguem a migração com atraso e se dissipam aos poucos.
  float lag = residual ? 0.05 + 0.22 * aSeed.x : 0.0;
  float t = flightProgress(lag);
  vec2 center = bezier(t);
  vec2 target = center + aTo * flightScale(t);

  // Partida exatamente onde o traço deformado estava.
  vec2 start = aFrom + field(aFrom);

  float s = window01(uClock, birth, arrive);
  float e = smoother(s);
  float bell = 16.0 * s * s * (1.0 - s) * (1.0 - s);

  vec2 pos = mix(start, target, e);

  // Vórtice gravitacional em torno do centro de massa em movimento.
  vec2 rel = pos - center;
  float theta = (0.45 + 0.6 * aSeed.z) * bell;
  float cs = cos(theta);
  float sn = sin(theta);
  rel = mat2(cs, sn, -sn, cs) * rel * (1.0 - 0.2 * bell);
  pos = center + rel + vnoise2(aFrom * 0.05 + uClock * 0.6) * uScatter * (0.3 + aSeed.x) * bell;

  float flight = window01(uClock, FLIGHT_START, FLIGHT_END);
  float born = smoothstep(birth, birth + BIRTH_FADE, uClock);
  float condense = 0.0;
  float dissipate = 0.0;
  if (residual) {
    float drift = smoothstep(arrive - 0.2, arrive + 0.4, uClock);
    pos += vnoise2(aTo * 0.08 + aSeed.xy * 10.0 + uClock * 0.7) * (1.5 + 16.0 * flight) * drift;
    dissipate = smoothstep(0.2, 1.0, flight);
  } else {
    condense = smoothstep(arrive + CONDENSE_IN, arrive + CONDENSE_OUT, uClock);
  }

  vAlpha = born * (1.0 - condense) * (1.0 - dissipate) * (0.5 + 0.5 * aSeed.z) * (residual ? 0.8 : 1.0);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 0.0, 1.0);
  gl_PointSize = vAlpha < 0.003
    ? 0.0
    : uSize * uPixelRatio * (0.8 + 0.4 * aSeed.y) * (1.0 + 0.35 * bell) * mix(1.0, 0.85, t);
}
`;

export const particleFragment = /* glsl */ `
precision highp float;
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  float a = smoothstep(0.5, 0.05, d) * vAlpha;
  gl_FragColor = vec4(vec3(0.92), a);
}
`;
