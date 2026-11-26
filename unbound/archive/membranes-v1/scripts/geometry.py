"""
The Unbound — geometria paramétrica de uma única entidade (numpy puro).

Uma entidade = núcleo (haste curta, quase oculta) + 8 membranas enraizadas nele.
Cada membrana é uma lâmina fina com espessura real (face superior, inferior e
borda), linha central curva, largura em forma de chama, concha, ondulações,
nervuras longitudinais em relevo e extremidade afilada em gancho.

Os cinco estados (origin, essence, beyond_form, metamorphosis, unknown) são
apenas conjuntos de parâmetros: a topologia e a ordem dos vértices são idênticas
por construção, o que permite shape keys / morph targets.

Coordenadas glTF: Y para cima, Z em direção à câmera.
"""
from __future__ import annotations
import math
import numpy as np

STATES = ["origin", "essence", "beyond_form", "metamorphosis", "unknown"]
NU, NV = 52, 23          # resolução da superfície de cada membrana (comprimento × largura)
CORE_NU, CORE_NV = 40, 18


def unit(v):
    return v / np.linalg.norm(v, axis=-1, keepdims=True)


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0.0, 1.0)
    return t * t * (3 - 2 * t)


def bezier(P, t):
    P = np.asarray(P, float); n = len(P) - 1
    return sum(math.comb(n, i) * (t ** i)[:, None] * ((1 - t) ** (n - i))[:, None] * P[i] for i in range(n + 1))


# ── membranas: personalidade fixa (independente do estado) ───────────────────
MEMBRANES = [
    # posição na haste, azimute, comprimento, largura, lado da varredura, semente
    dict(t=0.42, az=0,   L=1.55, W=0.50, side=+1, seed=1),
    dict(t=0.46, az=128, L=1.45, W=0.46, side=-1, seed=2),
    dict(t=0.40, az=242, L=1.40, W=0.44, side=+1, seed=3),
    dict(t=0.62, az=62,  L=1.15, W=0.36, side=-1, seed=4),
    dict(t=0.66, az=188, L=1.10, W=0.35, side=+1, seed=5),
    dict(t=0.60, az=302, L=1.05, W=0.33, side=-1, seed=6),
    dict(t=0.84, az=104, L=0.80, W=0.24, side=+1, seed=7),
    dict(t=0.86, az=258, L=0.74, W=0.22, side=-1, seed=8),
]


def state_params(state: str, i: int, m: dict) -> dict:
    """Parâmetros de forma da membrana i no estado dado (ângulos em graus).
    elev: ângulo inicial em relação ao eixo da entidade (0 = ao longo do eixo,
    90 = perpendicular); bend: abertura adicional ao longo do comprimento;
    curl: dobra da metade final; sweep/hook: varredura lateral e gancho da ponta."""
    rng = np.random.default_rng(100 + m["seed"])
    j = rng.uniform(-1, 1, 8)                   # variação individual (fixa entre estados)
    outer = 1.0 if i < 3 else (0.65 if i < 6 else 0.3)
    s = m["side"]
    if state == "origin":       # botão compacto e fechado, em chama; membranas envolvem o núcleo
        # camadas: externas envolvem por fora, internas mais estreitas e fechadas por dentro
        return dict(L=0.62 + 0.06 * j[0], W=0.62 + 0.18 * outer, az=m["az"], elev=1 + 8 * outer + 2 * j[1], bend=8 + 10 * outer,
                    curl=-14 - 6 * j[2], sweep=(24 + 6 * j[3]) * s, twist=55 + 12 * j[4], cup=0.95,
                    hook=-6, ruffle=0.006)
    if state == "essence":      # primeiras membranas se abrem para a direita; interior revelado
        side_open = 0.5 + 0.5 * math.cos(math.radians(m["az"] - 70))
        return dict(L=0.82 + 0.05 * j[0], W=1.05, az=m["az"] + 8 * j[5], elev=12 + 30 * outer * side_open,
                    bend=26 + 55 * outer * side_open + 8 * j[1], curl=22 + 10 * j[2], sweep=(26 + 10 * j[3]) * s,
                    twist=30 + 10 * j[4], cup=0.55, hook=35 * outer, ruffle=0.02)
    if state == "beyond_form":  # expansão máxima: membranas abertas em todas as direções, pontas em gancho
        # assimetria: aberturas e direções desiguais (não uma corola regular)
        return dict(L=1.25 + 0.08 * j[0], W=0.9, az=m["az"] + 28 * j[5], elev=48 + 34 * j[6],
                    bend=14 + 34 * outer + 22 * j[1], curl=36 + 24 * j[2], sweep=(44 + 18 * j[3]) * s,
                    twist=20 + 18 * j[4], cup=0.32, hook=95 + 25 * j[7], ruffle=0.035)
    if state == "metamorphosis":  # torção e reorganização: metade das membranas dobra sobre a entidade
        fold = 1.0 if i in (0, 2, 4, 6) else 0.0
        return dict(L=0.95 + 0.05 * j[0], W=1.08, az=m["az"] + 70 * m["t"] + 15 * j[5],
                    elev=40 + 25 * (1 - fold) + 10 * j[6], bend=20 + 110 * fold * outer + 12 * j[1],
                    curl=-40 * fold + 28 * (1 - fold), sweep=(-60 if fold else 45) * s,
                    twist=95 + 25 * j[4], cup=0.42, hook=-35 * fold + 55 * (1 - fold), ruffle=0.03)
    if state == "unknown":      # alongada e delicada: fios de membrana ascendentes, como fumaça
        # fios de fumaça: estreitos, longos, todos derivando para o mesmo lado
        return dict(L=1.45 + 0.12 * j[0], W=0.46 + 0.06 * j[1], az=m["az"] * 0.6 + 15, elev=10 + 9 * j[6] + 8 * outer,
                    bend=6 + 6 * outer + 4 * j[1], curl=26 + 14 * j[2], sweep=-(30 + 14 * j[3]),
                    twist=120 + 30 * j[4], cup=0.22, hook=70 + 20 * j[7], ruffle=0.01)
    raise ValueError(state)


def _core(start, direction, length, lateral):
    """Bézier do núcleo a partir da base, na direção do eixo da entidade."""
    p0 = np.array(start, float); d = np.array(direction, float); d /= np.linalg.norm(d)
    lat = np.array(lateral, float)
    return [p0, p0 + d * length * 0.33 + lat * 0.5, p0 + d * length * 0.66 - lat * 0.3, p0 + d * length]


CORE = {  # eixo da entidade por estado (base, direção, comprimento, desvio lateral)
    "origin":        _core((0.0, -0.55, 0.0), (0.0, 1.0, 0.05), 0.32, (0.01, 0, 0.0)),
    "essence":       _core((0.0, -0.45, 0.0), (0.35, 0.85, 0.45), 0.34, (0.03, 0, -0.02)),
    "beyond_form":   _core((0.0, -0.30, -0.15), (0.05, 0.42, 0.9), 0.34, (0.03, 0.02, 0.0)),
    "metamorphosis": _core((0.0, -0.35, -0.1), (-0.3, 0.55, 0.78), 0.36, (0.06, -0.04, 0.03)),
    "unknown":       _core((0.05, -1.0, 0.0), (0.22, 1.0, -0.05), 0.6, (-0.08, 0, 0.02)),
}


def core_frame(state):
    t = np.linspace(0, 1, CORE_NU)
    C = bezier(CORE[state], t)
    T = unit(np.gradient(C, axis=0))
    # referência fixa (X do mundo): azimutes coerentes entre os estados
    ref = np.array([1.0, 0.0, 0.0])
    R = unit(ref[None, :] - T * (T @ ref)[:, None])
    B = np.cross(T, R)
    return t, C, T, R, B


def membrane(state, i):
    """Superfície média + espessura. Retorna (top, bottom, N, U, V)."""
    m = MEMBRANES[i]; p = state_params(state, i, m)
    t, C, T, R, B = core_frame(state)
    k = int(round(m["t"] * (CORE_NU - 1)))
    az = math.radians(p["az"])
    Rd = math.cos(az) * R[k] + math.sin(az) * B[k]          # direção radial
    Bd = np.cross(T[k], Rd)                                   # direção lateral
    u = np.linspace(0, 1, NU) ** 1.15
    v = np.linspace(-1, 1, NV)
    L = m["L"] * p["L"]
    th = np.radians(p["elev"] + p["bend"] * u ** 1.6 + p["curl"] * smoothstep(0.55, 1.0, u))
    # varredura lateral + contra-curva em S + gancho da ponta (gavinha)
    ph = np.radians(p["sweep"] * u ** 1.4 - 0.35 * p["hook"] * smoothstep(0.35, 0.7, u) * (1 - smoothstep(0.7, 0.9, u))
                    + p["hook"] * smoothstep(0.62, 1.0, u) ** 1.8)
    d = (np.cos(th) * np.cos(ph))[:, None] * T[k] + (np.sin(th) * np.cos(ph))[:, None] * Rd + np.sin(ph)[:, None] * Bd
    du = np.diff(u, prepend=0.0)
    center = C[k] + Rd * 0.035 + np.cumsum(d * (du * L)[:, None], axis=0)
    # eixo da largura: lateral, girado em torno da tangente pela torção
    wv = unit(Bd - d * (d @ Bd)[:, None])
    tw = np.radians(p["twist"] * u ** 1.2)
    nv0 = np.cross(d, wv)
    Wv = np.cos(tw)[:, None] * wv + np.sin(tw)[:, None] * nv0
    Nv = np.cross(d, Wv)
    # largura em forma de chama: base estreita, máximo ~35%, ponta longa e fina
    rng = np.random.default_rng(m["seed"])
    # largura em chama: máximo perto de 25–30% e ponta longa, afilada
    w = m["W"] * p["W"] * (0.05 + 0.95 * np.sin(np.pi * np.clip(u, 0, 1) ** 0.5) ** 1.25)
    w *= 1 - 0.96 * smoothstep(0.4, 1.0, u) ** 1.25
    w = np.maximum(w, 0.004)
    asym = 0.12 * rng.uniform(-1, 1)
    edge = 1 + 0.06 * np.sin(u * 9.0 + rng.uniform(0, 6)) * smoothstep(0.2, 0.9, u)
    U, V = np.meshgrid(u, v, indexing="ij")
    half = (w * edge)[:, None] * V * np.where(V < 0, 1 - asym, 1 + asym)
    cup = -p["cup"] * w[:, None] * V ** 2
    ruff = p["ruffle"] * np.abs(V) ** 3 * np.sin(U * 2 * np.pi * 3.5 + V * 2 + rng.uniform(0, 6)) * smoothstep(0.2, 1.0, U)
    mid = center[:, None, :] + half[..., None] * Wv[:, None, :] + (cup + ruff)[..., None] * Nv[:, None, :]
    # espessura variável (mais espessa na base e na nervura, finíssima nas bordas e na ponta)
    thick = 0.012 * (1 - 0.8 * U) * (1 - 0.85 * V ** 2) + 0.0012
    # fibras longitudinais em relevo: irradiam da raiz e convergem para a ponta
    fibers = 0.0065 * np.abs(np.cos(np.pi * 6.5 * V * (1 - 0.35 * U) + 0.6 * np.sin(U * 5))) ** 10 * smoothstep(0.04, 0.3, U) * (1 - 0.75 * U)
    rib = 0.006 * np.exp(-(V / 0.09) ** 2) * (1 - 0.8 * U)
    N = Nv[:, None, :] * np.ones((1, NV, 1))
    top = mid + N * (thick / 2 + fibers + rib)[..., None]
    bot = mid - N * (thick / 2)[..., None]
    return top, bot, N, U, V


def core(state):
    t, C, T, R, B = core_frame(state)
    ang = np.linspace(0, 2 * np.pi, CORE_NV, endpoint=False)
    r = 0.045 * (1 - 0.45 * t) * (1 - 0.6 * smoothstep(0.85, 1.0, t)) + 0.004
    P = C[:, None, :] + r[:, None, None] * (np.cos(ang)[None, :, None] * R[:, None, :] + np.sin(ang)[None, :, None] * B[:, None, :])
    return P, t


# ── malha completa (mesma topologia em todos os estados) ─────────────────────
def grid_faces(base, nu, nv, flip=False, wrap=False):
    f = []
    cols = nv if wrap else nv - 1
    for a in range(nu - 1):
        for b in range(cols):
            i0 = base + a * nv + b; i1 = base + a * nv + (b + 1) % nv
            q = (i0, i0 + nv, i1 + nv, i1)
            f.append(q[::-1] if flip else q)
    return f


def boundary(nu, nv):
    loop = [(0, b) for b in range(nv)] + [(a, nv - 1) for a in range(1, nu)]
    loop += [(nu - 1, b) for b in range(nv - 2, -1, -1)] + [(a, 0) for a in range(nu - 2, 0, -1)]
    return loop


def build(state):
    """Retorna vértices, faces (só no 1º uso importam), uv e atributos por vértice."""
    verts, faces, uvs = [], [], []
    attr = {k: [] for k in ("_MEMBRANE", "_ANCHOR", "_FLEX", "_EDGE", "_STIFFNESS")}
    n = 0

    def add(P, uv, mem, anchor, flex, edge, stiff):
        nonlocal n
        P = P.reshape(-1, 3); verts.append(P); uvs.append(uv.reshape(-1, 2))
        for k, val in zip(attr, (mem, anchor, flex, edge, stiff)):
            attr[k].append(np.broadcast_to(np.asarray(val, np.float32).reshape(-1) if np.ndim(val) else val, P.shape[:1]).astype(np.float32).ravel())
        start = n; n += len(P); return start

    for i in range(len(MEMBRANES)):
        top, bot, N, U, V = membrane(state, i)
        uv = np.stack([(V + 1) / 2, U], -1)
        anchor = 1 - smoothstep(0.03, 0.12, U); flex = smoothstep(0.06, 1.0, U) ** 1.1; edge = np.abs(V)
        stiff = (1 - flex) * (1 - 0.6 * edge) + 0.05
        a = add(top, uv, i + 1, anchor, flex, edge, stiff)
        b = add(bot, uv, i + 1, anchor, flex, edge, stiff)
        faces += grid_faces(a, NU, NV) + grid_faces(b, NU, NV, flip=True)
        # borda: vértices próprios (sombreamento nítido entre as faces da lâmina)
        loop = boundary(NU, NV)
        rt = np.array([top[a_, b_] for a_, b_ in loop]); rb = np.array([bot[a_, b_] for a_, b_ in loop])
        ru = np.array([[(V[a_, b_] + 1) / 2, U[a_, b_]] for a_, b_ in loop])
        lu = np.array([U[a_, b_] for a_, b_ in loop]); lv = np.array([abs(V[a_, b_]) for a_, b_ in loop])
        an = 1 - smoothstep(0.03, 0.12, lu); fl = smoothstep(0.06, 1.0, lu) ** 1.1
        r0 = add(np.concatenate([rt, rb]), np.concatenate([ru, ru]), i + 1, np.r_[an, an], np.r_[fl, fl], np.r_[lv, lv], np.r_[(1 - fl) * 0.4 + 0.05, (1 - fl) * 0.4 + 0.05])
        L = len(loop)
        for q in range(L):
            q1 = (q + 1) % L
            faces.append((r0 + q, r0 + q1, r0 + L + q1, r0 + L + q))
    P, t = core(state)
    uv = np.stack(np.meshgrid(t, np.linspace(0, 1, CORE_NV), indexing="ij")[::-1], -1)
    c = add(P, uv, 0, smoothstep(0.0, 1.0, 1 - t[:, None] * np.ones((1, CORE_NV))), 0.05, 0.0, 1.0)
    faces += grid_faces(c, CORE_NU, CORE_NV, wrap=True)
    return (np.concatenate(verts), faces, np.concatenate(uvs), {k: np.concatenate(v) for k, v in attr.items()})
