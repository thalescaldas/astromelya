"""
The Unbound Hybrid — Beyond Form: geometria implícita (campos de distância).

Anatomia: casca fina e contínua de um envelope orgânico torcido em S
(Ascension), perfurada por cavidades com bordas arredondadas (Unknown Anatomy)
— incluindo um vazio principal que atravessa toda a entidade (Singularity) —
e prolongada por extremidades em crescente fundidas ao corpo.

  casca   = |d_envelope| − espessura/2
  corpo   = smax(casca, −cavidades, k)      (subtração suave → bordas tensionadas)
  entidade = smin(corpo, extremidades, k)   (união suave → continuidade anatômica)

Coordenadas glTF: Y para cima, Z em direção à câmera. Altura ≈ 2,4 unidades.
"""
from __future__ import annotations
import math
import numpy as np


def smin(a, b, k):
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0, 1)
    return b * (1 - h) + a * h - k * h * (1 - h)


def smax(a, b, k):
    return -smin(-a, -b, k)


def unit(v):
    v = np.asarray(v, float); return v / np.linalg.norm(v)


# ── envelope: elipsoide alongado, curvado em S e torcido ─────────────────────
def envelope_frame(y, E):
    """Centro, ângulo de torção e raios do envelope na altura y (vetorizado)."""
    s = np.clip(y / E["half_height"], -1.2, 1.2)
    cx = E["bend_x"] * np.sin(E["bend_freq"] * y + E["bend_phase"])
    cz = E["bend_z"] * np.cos(E["bend_freq"] * 0.8 * y)
    prof = np.sqrt(np.clip(1 - s ** 2, 0, 1)) ** E["profile_power"]
    rx = E["rx"] * (prof + 1e-3) * (1 + E["swell"] * np.sin(1.4 * y + 0.6))
    rz = E["rz"] * (prof + 1e-3) * (1 - 0.35 * E["swell"] * np.sin(1.1 * y))
    th = E["twist"] * y
    return cx, cz, rx, rz, th


def d_envelope(X, Y, Z, E):
    cx, cz, rx, rz, th = envelope_frame(Y, E)
    px, pz = X - cx, Z - cz
    c, s = np.cos(th), np.sin(th)
    lx, lz = c * px + s * pz, -s * px + c * pz
    # elipse por fatia + extremidades verticais → distância aproximada (escala pelo menor raio)
    q = np.sqrt((lx / rx) ** 2 + (lz / rz) ** 2 + (Y / E["half_height"]) ** 8)
    d = (q - 1) * np.minimum(rx, rz)
    # ondulação orgânica de baixa frequência (sem ruído aleatório)
    d += E["wobble"] * (np.sin(3.1 * X + 1.7 * Y) * np.sin(2.3 * Z - 1.3 * Y + 0.4))
    return d


def surface_point(y, phi, E, push=0.0):
    """Ponto no envelope (altura y, ângulo φ na seção) e sua normal aproximada."""
    cx, cz, rx, rz, th = envelope_frame(np.array([y]), E)
    lx, lz = (rx * (1 + push)) * math.cos(phi), (rz * (1 + push)) * math.sin(phi)
    c, s = math.cos(th[0]), math.sin(th[0])
    p = np.array([cx[0] + c * lx[0] - s * lz[0], y, cz[0] + s * lx[0] + c * lz[0]])
    nl = np.array([math.cos(phi) / rx[0], math.sin(phi) / rz[0]])
    n = np.array([c * nl[0] - s * nl[1], 0.0, s * nl[0] + c * nl[1]])
    return p, unit(n)


# ── cavidades ────────────────────────────────────────────────────────────────
def d_ellipsoid_oriented(X, Y, Z, c, axes, n, roll=0.0):
    """Elipsoide orientado: eixo `n` (profundidade) + dois eixos tangentes."""
    n = unit(n); t = unit(np.cross(n, [0.0, 1.0, 0.0]) if abs(n[1]) < 0.95 else np.cross(n, [1.0, 0, 0]))
    b = np.cross(n, t)
    cr, sr = math.cos(roll), math.sin(roll)
    t, b = cr * t + sr * b, -sr * t + cr * b
    P = np.stack([X - c[0], Y - c[1], Z - c[2]], -1)
    u, v, w = P @ t / axes[0], P @ b / axes[1], P @ n / axes[2]
    k0 = np.sqrt(u * u + v * v + w * w)
    return (k0 - 1) * min(axes)


def d_drill(X, Y, Z, c, d, ra, rb, roll=0.0):
    """Túnel elíptico infinito na direção d (atravessa a entidade inteira)."""
    d = unit(d); t = unit(np.cross(d, [0.0, 1.0, 0.0])); b = np.cross(d, t)
    cr, sr = math.cos(roll), math.sin(roll); t, b = cr * t + sr * b, -sr * t + cr * b
    P = np.stack([X - c[0], Y - c[1], Z - c[2]], -1)
    u, v = P @ t / ra, P @ b / rb
    return (np.sqrt(u * u + v * v) - 1) * min(ra, rb)


# ── extremidades em crescente ────────────────────────────────────────────────
def bezier(P, t):
    P = np.asarray(P, float); n = len(P) - 1
    return sum(math.comb(n, i) * (t ** i)[:, None] * ((1 - t) ** (n - i))[:, None] * P[i] for i in range(n + 1))


def d_spike(X, Y, Z, ctrl, r0, flat=0.55, nseg=48):
    """Lâmina afilada ao longo de uma Bézier: raio r0·(1−t)^1.4, seção achatada."""
    pts = bezier(ctrl, np.linspace(0, 1, nseg + 1))
    P = np.stack([X, Y, Z], -1)
    best = np.full(X.shape, np.inf)
    for i in range(nseg):
        a, b = pts[i], pts[i + 1]
        ab = b - a; L2 = ab @ ab
        h = np.clip(((P - a) @ ab) / L2, 0, 1)
        t = (i + h) / nseg
        Q = P - (a + h[..., None] * ab)
        # achatamento: comprime a componente vertical local para formar lâmina
        side = unit(np.cross(ab, [0.0, 0.0, 1.0]) if abs(unit(ab)[2]) < 0.9 else np.cross(ab, [0, 1.0, 0]))
        qs = Q @ side
        Qf = Q + (1 / flat - 1) * qs[..., None] * side[None, :] if Q.ndim == 2 else Q + (1 / flat - 1) * qs[..., None] * side
        r = r0 * (1 - t) ** 1.4 + 0.0025
        best = np.minimum(best, np.linalg.norm(Qf, axis=-1) * flat - r)
    return best


# ── superfícies mínimas (TPMS) deformadas organicamente ─────────────────────
def warp(X, Y, Z, W):
    """Deformação do domínio: alongamento vertical, torção, curvatura em S e ondulação."""
    Ys = Y / W["stretch"]
    th = W["twist"] * Y
    c, s = np.cos(th), np.sin(th)
    Xb = X - W["bend"] * np.sin(1.6 * Y + 0.4)
    x, z = c * Xb + s * Z, -s * Xb + c * Z
    a = W["wobble"]
    x2 = x + a * np.sin(1.3 * Ys + 2.1 * z + 0.7)
    y2 = Ys + a * np.sin(1.1 * x + 1.7 * z + 1.9)
    z2 = z + a * np.sin(1.5 * x - 1.2 * Ys + 0.3)
    return x2, y2, z2


def tpms(x, y, z, kind, f, phase):
    """Distância aproximada à superfície mínima periódica (nível 0)."""
    x, y, z = f * x + phase[0], f * y + phase[1], f * z + phase[2]
    if kind == "gyroid":
        g = np.sin(x) * np.cos(y) + np.sin(y) * np.cos(z) + np.sin(z) * np.cos(x)
        return g / (1.25 * f)
    if kind == "schwarz_p":
        g = np.cos(x) + np.cos(y) + np.cos(z)
        return g / (1.5 * f)
    raise ValueError(kind)


def d_capsule_taper(X, Y, Z, ctrl, r0, r1, nseg=32):
    """Envelope em chifre: tubo ao longo de Bézier com raio r0 → r1 (afilado)."""
    pts = bezier(ctrl, np.linspace(0, 1, nseg + 1))
    P = np.stack([X, Y, Z], -1)
    best = np.full(X.shape, 10.0)
    for i in range(nseg):
        a, b = pts[i], pts[i + 1]; ab = b - a
        h = np.clip(((P - a) @ ab) / (ab @ ab), 0, 1)
        t = (i + h) / nseg
        r = r0 + (r1 - r0) * t ** 0.8
        best = np.minimum(best, np.linalg.norm(P - (a + h[..., None] * ab), axis=-1) - r)
    return best


def d_ellipsoid(X, Y, Z, c, r):
    q = np.sqrt(((X - c[0]) / r[0]) ** 2 + ((Y - c[1]) / r[1]) ** 2 + ((Z - c[2]) / r[2]) ** 2)
    return (q - 1) * min(r)


# ── variações volumétricas de Beyond Form ────────────────────────────────────
# Envelope comum: lobos em S (Ascension) + chifres afilados que viram as extremidades em crescente.
# composição diagonal em S: lobo superior à esquerda, inferior à direita, cintura torcida no centro
LOBES = [((-0.15, 0.52, 0.0), (0.6, 0.66, 0.48)), ((0.12, -0.32, 0.05), (0.64, 0.7, 0.5)), ((0.0, 0.1, -0.05), (0.5, 0.86, 0.42))]
HORNS = [
    [(0.2, 0.85, 0.0), (0.5, 1.35, 0.05), (0.95, 1.4, 0.05), (1.15, 0.95, 0.0)],       # crescente superior → direita
    [(-0.45, 0.45, 0.0), (-0.85, 0.5, 0.05), (-1.1, 0.3, 0.05), (-1.2, 0.1, 0.0)],     # ponta esquerda
    [(-0.25, -0.65, 0.05), (-0.65, -1.15, 0.1), (-1.0, -1.15, 0.05), (-1.15, -0.8, 0.0)],  # crescente inferior esquerdo
    [(0.35, -0.7, 0.0), (0.7, -1.2, 0.0), (1.0, -1.38, 0.0), (1.2, -1.2, 0.0)],        # crescente inferior direito
    [(0.45, 0.05, 0.0), (0.85, 0.1, 0.0), (1.05, -0.15, 0.0), (1.05, -0.45, 0.0)],     # gancho lateral direito
]


def variant(name: str) -> dict:
    if name == "A":   # Singularity — giroide, vazio dominante no centro, densidade no núcleo
        return dict(kind="gyroid", f=6.4, phase=(0.6, 1.1, 0.2), thickness=(0.058, 0.03),
                    W=dict(stretch=1.15, twist=0.55, bend=0.12, wobble=0.12), void=((-0.1, 0.15, 0.0), (0.36, 0.3, 0.9)),
                    horns=HORNS, horn_r=(0.34, 0.015), blades=True, blade_r=0.022, blade_flat=1.0)
    if name == "B":   # Lattice — Schwarz P: grandes cavidades arredondadas, teia mais regular
        return dict(kind="schwarz_p", f=6.0, phase=(0.0, 0.5, 0.0), thickness=(0.058, 0.03),
                    W=dict(stretch=1.1, twist=0.45, bend=0.1, wobble=0.14), void=None,
                    horns=HORNS[:4], horn_r=(0.15, 0.012))
    if name == "C":   # Ascension — giroide alongado e mais torcido (fluxo ascendente)
        return dict(kind="gyroid", f=6.0, phase=(1.4, 0.3, 0.9), thickness=(0.056, 0.03),
                    W=dict(stretch=1.6, twist=0.95, bend=0.2, wobble=0.1), void=((-0.05, 0.2, 0.0), (0.26, 0.42, 0.9)),
                    horns=[HORNS[0], HORNS[2], HORNS[3]], horn_r=(0.15, 0.012))
    raise ValueError(name)


def field(X, Y, Z, V, parts=False):
    """Folha de superfície mínima, recortada pelo envelope (lobos + chifres)."""
    env = 10.0 * np.ones_like(X)
    for c, r in LOBES:
        env = smin(env, d_ellipsoid(X, Y, Z, c, r), 0.25)
    horns = 10.0 * np.ones_like(X)
    for ctrl in V["horns"]:
        horns = np.minimum(horns, d_capsule_taper(X, Y, Z, ctrl, *V["horn_r"]))
    env = smin(env, horns, 0.12)
    # contorno irregular (silhueta fluida, não convexa)
    env += 0.035 * np.sin(2.3 * X + 1.1 * Y + 0.5) * np.sin(1.7 * Y - 2.1 * Z + 1.2)
    x, y, z = warp(X, Y, Z, V["W"])
    g = tpms(x, y, z, V["kind"], V["f"], V["phase"])
    # espessura variável: mais densa no núcleo, delicada nas extremidades
    r = np.sqrt(X ** 2 + (Y / 1.3) ** 2 + Z ** 2)
    t_in, t_out = V["thickness"]
    th = t_out + (t_in - t_out) * np.clip(1 - r / 1.1, 0, 1) ** 1.5
    sheet = np.abs(g) - th / 2
    body = smax(sheet, env, 0.03)                       # recorte suave → bordas arredondadas e brilhantes
    cut = 10.0 * np.ones_like(X)
    if V["void"] is not None:                           # vazio principal (Singularity)
        cut = d_ellipsoid(X, Y, Z, *V["void"])
        body = smax(body, -cut, 0.06)
    # extremidades em crescente: lâminas finas e afiladas fundidas ao corpo
    blades = 10.0 * np.ones_like(X)
    if V.get("blades"):
        P = np.stack([X, Y, Z], -1)
        for ctrl in V["horns"]:
            blades = np.minimum(blades, d_spike(P[..., 0], P[..., 1], P[..., 2], ctrl, V["blade_r"], flat=V["blade_flat"]))
        body = smin(body, blades, 0.045)
    if parts:
        return body, dict(env=env, horns=np.minimum(horns, blades), cut=cut, sheet=sheet, body=body, spike=blades, g=g)
    return body
