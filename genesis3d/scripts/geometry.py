"""
Genesis 3D — geometria paramétrica (numpy puro).

Coordenadas no padrão glTF/Three.js: Y para cima, Z em direção à câmera.
Usado tanto pelo ajuste à silhueta (fit.py) quanto pela construção no
Blender (build_blender.py), garantindo que o modelo exportado seja
exatamente o mesmo que foi ajustado à fotografia.

Cada tépala é uma superfície (u ao longo do comprimento, base → ponta;
v ao longo da largura, −1 → 1) sobre uma linha central que se curva no
plano formado pelo eixo da flor e pela direção radial da tépala.
"""
from __future__ import annotations

import math
import numpy as np

# ── utilidades ───────────────────────────────────────────────────────────


def unit(v):
    v = np.asarray(v, dtype=np.float64)
    return v / np.linalg.norm(v)


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0.0, 1.0)
    return t * t * (3 - 2 * t)


def rot_axis(axis, angle):
    """Matriz de rotação de Rodrigues."""
    a = unit(axis)
    c, s = math.cos(angle), math.sin(angle)
    x, y, z = a
    return np.array(
        [
            [c + x * x * (1 - c), x * y * (1 - c) - z * s, x * z * (1 - c) + y * s],
            [y * x * (1 - c) + z * s, c + y * y * (1 - c), y * z * (1 - c) - x * s],
            [z * x * (1 - c) - y * s, z * y * (1 - c) + x * s, c + z * z * (1 - c)],
        ]
    )


def flower_frame(g):
    """Eixo da flor (A) e uma referência perpendicular (R0) a partir dos ângulos globais."""
    yaw, pitch, roll = math.radians(g["yaw"]), math.radians(g["pitch"]), math.radians(g["roll"])
    # eixo: começa apontando para a câmera (+Z), gira em yaw (em torno de Y) e pitch (em torno de X)
    A = np.array([math.sin(yaw) * math.cos(pitch), math.sin(pitch), math.cos(yaw) * math.cos(pitch)])
    A = unit(A)
    up = np.array([0.0, 1.0, 0.0])
    R0 = unit(up - A * np.dot(up, A))  # "para cima" projetado no plano da corola
    R0 = rot_axis(A, roll) @ R0
    return A, R0


# ── tépalas ──────────────────────────────────────────────────────────────


def u_samples(n, base_density=2.2):
    """Amostras em u mais densas perto da base (onde a tépala é estreita),
    para evitar triângulos alongados."""
    t = np.linspace(0.0, 1.0, n)
    return t ** base_density * 0.35 + t * 0.65 if base_density != 1 else t


def width_profile(u, p):
    """Largura relativa: garra estreita na base, máximo em p['widest'], ponta afinada."""
    up = p["widest"]
    q = math.log(0.5) / math.log(up)
    body = np.sin(np.pi * np.clip(u, 0, 1) ** q) ** p.get("tip_round", 0.75)
    claw = p.get("claw", 0.1)
    return claw * (1 - smoothstep(0.0, 0.35, u)) + (1 - claw * (1 - smoothstep(0.0, 0.35, u))) * body


def tepal_surface(p, g, nu=56, nv=23, seed=0):
    """Superfície de uma tépala. Retorna (P[nu,nv,3], U[nu,nv], V[nu,nv])."""
    rng = np.random.default_rng(seed)
    A, R0 = flower_frame(g)
    base = np.array(g["base"], dtype=np.float64)
    R = rot_axis(A, math.radians(p["azimuth"])) @ R0
    T0 = np.cross(A, R)

    u = u_samples(nu)
    v = np.linspace(-1.0, 1.0, nv)
    L = p["length"]

    # ângulo da linha central em relação ao eixo (abre e recurva ao longo do comprimento)
    th = (
        math.radians(p["beta0"])
        + (math.radians(p["beta1"]) - math.radians(p["beta0"])) * u ** p.get("bend_power", 1.6)
        + math.radians(p.get("tip_curl", 0.0)) * smoothstep(0.65, 1.0, u)
    )
    tang = np.cos(th)[:, None] * A + np.sin(th)[:, None] * R
    nrm = -np.sin(th)[:, None] * A + np.cos(th)[:, None] * R  # normal externa (no plano)

    # torção ao longo do comprimento
    tw = math.radians(p.get("twist", 0.0)) * u
    Bv = np.cos(tw)[:, None] * T0 + np.sin(tw)[:, None] * nrm
    Nv = np.cos(tw)[:, None] * nrm - np.sin(tw)[:, None] * T0

    # linha central integrada
    du = np.diff(u, prepend=0.0)
    center = base + R * g.get("ring", 0.035) + np.cumsum(tang * (du * L)[:, None], axis=0)

    # largura com assimetria e borda irregular (ruído suave por lado)
    w = width_profile(u, p) * p["width"]
    k = np.arange(1, 5)
    ph_l, ph_r = rng.uniform(0, 2 * np.pi, 4), rng.uniform(0, 2 * np.pi, 4)
    edge_l = 1 + p.get("edge_noise", 0.05) * np.sum(np.sin(np.outer(u, k) * 2 * np.pi * 1.7 + ph_l) / k, axis=1)
    edge_r = 1 + p.get("edge_noise", 0.05) * np.sum(np.sin(np.outer(u, k) * 2 * np.pi * 1.7 + ph_r) / k, axis=1)
    asym = p.get("asym", 0.0)

    U, V = np.meshgrid(u, v, indexing="ij")
    side = np.where(V < 0, (1 - asym) * edge_l[:, None], (1 + asym) * edge_r[:, None])
    half = (w[:, None] * side) * V

    # concha (bordas curvadas para dentro) + nervura central suave + ondulações nas bordas
    cup = p.get("cup", 0.3) * w[:, None] * V ** 2
    rib = p.get("rib", 0.012) * np.exp(-((V / 0.12) ** 2)) * smoothstep(0.05, 0.4, U)
    ruff = (
        p.get("ruffle", 0.02)
        * np.abs(V) ** 3
        * np.sin(U * 2 * np.pi * p.get("ruffle_freq", 5.0) + V * 1.3 + p.get("ruffle_phase", 0.0))
        * smoothstep(0.25, 1.0, U)
    )
    # venação longitudinal (sulcos suaves) e relevo irregular de baixa amplitude:
    # evita superfícies lisas demais; amplitude proporcional à largura local
    veins = (
        p.get("veins", 0.006)
        * w[:, None]
        * np.cos(V * np.pi * p.get("vein_count", 6))
        * smoothstep(0.08, 0.45, U)
        * (1 - 0.5 * smoothstep(0.7, 1.0, U))
    )
    crinkle = p.get("crinkle", 0.004) * (
        np.sin(U * 23.0 + V * 5.0 + seed) * np.sin(V * 9.0 - U * 7.0 + 2 * seed)
    ) * smoothstep(0.2, 0.8, U)
    offset_n = -cup + rib + ruff + veins + crinkle

    P = center[:, None, :] + half[..., None] * Bv[:, None, :] + offset_n[..., None] * Nv[:, None, :]
    return P, U, V


# ── tubos (caule, filetes) ───────────────────────────────────────────────


def bezier(points, t):
    p = np.asarray(points, dtype=np.float64)
    n = len(p) - 1
    out = np.zeros((len(t), 3))
    for i in range(n + 1):
        coef = math.comb(n, i) * (t ** i) * ((1 - t) ** (n - i))
        out += coef[:, None] * p[i]
    return out


def tube(path, radii, nseg=16):
    """Tubo ao longo de um caminho (quadros paralelos). Retorna (P[n,nseg,3], U[n], ang)."""
    path = np.asarray(path)
    n = len(path)
    tan = np.gradient(path, axis=0)
    tan /= np.linalg.norm(tan, axis=1, keepdims=True)
    ref = np.array([0.0, 0.0, 1.0]) if abs(tan[0][2]) < 0.9 else np.array([1.0, 0.0, 0.0])
    nx = unit(np.cross(tan[0], ref))
    frames = []
    for i in range(n):
        nx = nx - tan[i] * np.dot(nx, tan[i])
        nx = unit(nx)
        ny = np.cross(tan[i], nx)
        frames.append((nx, ny))
    ang = np.linspace(0, 2 * np.pi, nseg, endpoint=False)
    P = np.zeros((n, nseg, 3))
    for i, (nx, ny) in enumerate(frames):
        P[i] = path[i] + radii[i] * (np.cos(ang)[:, None] * nx + np.sin(ang)[:, None] * ny)
    return P


def ellipsoid(center, axis, length, radius, nu=14, nv=12):
    axis = unit(axis)
    ref = np.array([0.0, 1.0, 0.0]) if abs(axis[1]) < 0.9 else np.array([1.0, 0.0, 0.0])
    ex = unit(np.cross(axis, ref))
    ey = np.cross(axis, ex)
    th = np.linspace(0, np.pi, nu)
    ph = np.linspace(0, 2 * np.pi, nv, endpoint=False)
    P = np.zeros((nu, nv, 3))
    for i, t in enumerate(th):
        P[i] = (
            center
            + axis * (math.cos(t) * length / 2)
            + math.sin(t) * radius * (np.cos(ph)[:, None] * ex + np.sin(ph)[:, None] * ey)
        )
    return P


def stamen_paths(params, g):
    """Filetes: saem do fundo da garganta, seguem o eixo e se arqueiam."""
    A, R0 = flower_frame(g)
    base = np.array(g["base"], dtype=np.float64)
    out = []
    for s in params:
        R = rot_axis(A, math.radians(s["azimuth"])) @ R0
        b0 = base + A * 0.05 + R * 0.012
        b1 = b0 + A * s["length"] * 0.45 + R * s["length"] * s["spread"] * 0.3
        b2 = b0 + A * s["length"] * 0.8 + R * s["length"] * s["spread"]
        b3 = b0 + A * s["length"] * 0.9 + R * s["length"] * (s["spread"] + s["lift"])
        t = np.linspace(0, 1, 28)
        out.append(bezier([b0, b1, b2, b3], t))
    return out


def stem_path(g):
    A, _ = flower_frame(g)
    base = np.array(g["base"], dtype=np.float64)
    s = g["stem"]
    p0 = base - A * 0.03
    p1 = base - A * s["pull"]
    p3 = np.array(s["end"], dtype=np.float64)
    p2 = p3 + np.array(s["end_tangent"], dtype=np.float64)
    return bezier([p0, p1, p2, p3], np.linspace(0, 1, 40))


# ── câmera (idêntica à do laboratório Three.js) ──────────────────────────


def project(P, cam, W, H):
    """Projeção perspectiva: câmera em cam['position'] olhando para −Z, fov vertical em graus."""
    f = (H / 2) / math.tan(math.radians(cam["fov"]) / 2)
    cz = cam["position"][2]
    X, Y, Z = P[..., 0] - cam["position"][0], P[..., 1] - cam["position"][1], P[..., 2]
    d = cz - Z
    return np.stack([W / 2 + f * X / d, H / 2 - f * Y / d], axis=-1)
