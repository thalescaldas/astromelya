"""
The Unbound Hybrid — Beyond Form (vórtice gravitacional): geometria implícita.

Referência: prancha "Five states — one entity", estado 03. Anatomia:
  • Singularity: vazio circular dominante atravessando o centro, com borda tensionada;
  • poço gravitacional: membrana em funil que mergulha no vazio;
  • Unknown Anatomy: teia de superfície mínima (giroide) em coordenadas torcidas por
    um vórtice — mais torção perto do centro, como matéria arrastada pela gravidade;
  • braços em espiral: fitas de membrana torcidas, largas na base e afiladas em
    crescente nas pontas, fundidas ao corpo por união suave.

Tudo é uma única entidade contínua (campo de distância) — sem pétalas, sem núcleo radial
de elementos independentes. Coordenadas glTF: Y para cima, Z em direção à câmera.
"""
from __future__ import annotations
import math
import numpy as np


def smin(a, b, k):
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0, 1)
    return b * (1 - h) + a * h - k * h * (1 - h)


def smax(a, b, k):
    return -smin(-a, -b, k)


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)


def unit(v):
    v = np.asarray(v, float); return v / np.linalg.norm(v, axis=-1, keepdims=True)


def rot(ax, ay):
    """Inclinação do disco da entidade (graus): em torno de X e depois de Y."""
    a, b = math.radians(ax), math.radians(ay)
    Rx = np.array([[1, 0, 0], [0, math.cos(a), -math.sin(a)], [0, math.sin(a), math.cos(a)]])
    Ry = np.array([[math.cos(b), 0, math.sin(b)], [0, 1, 0], [-math.sin(b), 0, math.cos(b)]])
    return Ry @ Rx                       # local → mundo


def to_local(X, Y, Z, M):
    P = np.stack([X, Y, Z], -1) @ M      # mundo → local (M ortogonal: inversa = transposta)
    return P[..., 0], P[..., 1], P[..., 2]


# ── componentes ──────────────────────────────────────────────────────────────
def envelope(u, v, w, E):
    """Lente achatada, levemente oval e irregular (silhueta não convexa)."""
    rho = np.sqrt((u / E["rx"]) ** 2 + (v / E["ry"]) ** 2)
    r = np.sqrt(u * u + v * v)
    h = E["h"] * np.sqrt(np.clip(1 - (r / (E["ry"] * 1.05)) ** 2, 0, 1)) + 0.06
    d = smax((rho - 1) * min(E["rx"], E["ry"]), np.abs(w) - h, 0.12)
    phi = np.arctan2(v, u)
    d += 0.05 * np.sin(3 * phi + 2.1 * r) + 0.03 * np.sin(5 * phi - 1.3)
    return d


def vortex_tpms(u, v, w, V):
    """Giroide em coordenadas de vórtice: ângulo torcido em função do raio."""
    r = np.sqrt(u * u + v * v) + 1e-6
    phi = np.arctan2(v, u)
    swirl = V["swirl"] * np.exp(-r / V["swirl_r"]) + V["spiral"] * r
    x, y = r * np.cos(phi + swirl), r * np.sin(phi + swirl)
    z = w * V["z_scale"]
    f, ph = V["f"], V["phase"]
    x, y, z = f * x + ph[0], f * y + ph[1], f * z + ph[2]
    g = np.sin(x) * np.cos(y) + np.sin(y) * np.cos(z) + np.sin(z) * np.cos(x)
    return g / (1.25 * f)


def funnel(u, v, w, F, t):
    """Poço gravitacional: membrana que se curva para dentro do vazio central."""
    r = np.sqrt(u * u + v * v)
    depth = -F["depth"] * np.exp(-((r - F["r_void"]) / F["width"]) ** 2) + F["lift"] * smoothstep(0.4, 0.9, r)
    slope = np.abs(np.gradient(depth, axis=-1)) if depth.ndim else 0
    d = np.abs(w - depth) / np.sqrt(1 + 0 * slope) - t / 2
    return smax(d, r - F["r_out"], 0.06)


def arm_path(i, A):
    """Braço i: espiral logarítmica no plano do disco, com gancho na ponta."""
    t = np.linspace(0, 1, A["samples"])
    phi0 = math.radians(i * 360 / A["count"] + A["jitter"][i])
    r = A["r0"] + A["length"][i] * t ** 1.05
    phi = phi0 + A["sweep"] * t ** 0.85 + A["hook"] * smoothstep(0.65, 1.0, t)
    if A.get("alternate"):     # velas: alternadamente para frente e para trás (profundidade)
        w = A["lift"] * (1 if i % 2 else -1) * t ** 1.5 + 0.05 * np.sin(np.pi * t + i)
    else:
        w = A["lift"] * np.sin(np.pi * t + i * 1.3)
    return t, np.stack([r * np.cos(phi), r * np.sin(phi), w], -1)


def ribbon(u, v, w, P, t, width, twist0, twist, thick):
    """Fita torcida ao longo da polilinha P: largura afilada, espessura fina."""
    T = unit(np.gradient(P, axis=0))
    axis = np.array([0.0, 0.0, 1.0])
    W0 = unit(np.cross(T, axis)); N0 = np.cross(T, W0)
    tau = twist0 + twist * t
    Wd = np.cos(tau)[:, None] * W0 + np.sin(tau)[:, None] * N0
    Nd = np.cross(T, Wd)
    ds = np.linalg.norm(np.diff(P, axis=0), axis=1).mean()
    Q = np.stack([u, v, w], -1)
    best = np.full(u.shape, 10.0)
    for k in range(len(P)):
        q = Q - P[k]
        a = np.abs(q @ Wd[k]) - width[k] / 2
        b = q @ Nd[k]
        c = np.abs(q @ T[k]) - ds / 2
        d = np.sqrt(np.maximum(a, 0) ** 2 + b ** 2 + np.maximum(c, 0) ** 2) - thick / 2
        best = np.minimum(best, d)
    return best


# ── Tensioned Web: lâmina curva recortada por círculos côncavos ────────────────
def circle_cuts(u, v, cuts, k):
    """União suave de discos (distância 2D): as regiões removidas da lâmina."""
    d = np.full(u.shape, 10.0)
    for (cx, cy, r) in cuts:
        d = smin(d, np.sqrt((u - cx) ** 2 + (v - cy) ** 2) - r, k)
    return d


def tip_angles(seed, n_tips, rot0):
    """Ângulos das pontas: entre festões consecutivos (mesma semente de web_layout)."""
    rng = np.random.default_rng(seed)
    cut_a = [rot0 + 2 * np.pi * (i + 0.5) / n_tips + rng.uniform(-0.22, 0.22) for i in range(n_tips) if rng.uniform(0, 1, 2) is not None]
    return [0.5 * (cut_a[i] + cut_a[(i + 1) % n_tips] + (2 * np.pi if i == n_tips - 1 else 0)) for i in range(n_tips)]


def web_layout(seed, n_tips, r_out, scallop_r, inner_n, inner_ring, inner_r, rot0):
    """Disposição assimétrica dos recortes: festões externos (definem pontas) e cavidades internas."""
    rng = np.random.default_rng(seed)
    cuts = []
    for i in range(n_tips):
        a = rot0 + 2 * np.pi * (i + 0.5) / n_tips + rng.uniform(-0.22, 0.22)
        rr = scallop_r * rng.uniform(0.82, 1.18)
        R = r_out + rr * rng.uniform(0.55, 0.8)
        cuts.append((R * np.cos(a), R * np.sin(a), rr))
    for i in range(inner_n):
        a = rot0 + 2 * np.pi * i / inner_n + rng.uniform(-0.25, 0.25)
        R = inner_ring * rng.uniform(0.9, 1.12)
        cuts.append((R * np.cos(a), R * np.sin(a), inner_r * rng.uniform(0.7, 1.3)))
    return cuts


def web_layer(u, v, w, L, return_region=False):
    """Uma camada: lâmina com altura h(u, v), recortada em coordenadas de vórtice."""
    r = np.sqrt(u * u + v * v) + 1e-6
    phi = np.arctan2(v, u)
    # vórtice: o recorte é feito em coordenadas torcidas → pontas em crescente, bandas espirais
    ps = phi + L["swirl"] * np.exp(-r / 0.7) + L["spiral"] * r
    us, vs = r * np.cos(ps) * L["sx"], r * np.sin(ps)
    outline = (np.sqrt((us / L["rx"]) ** 2 + (vs / L["ry"]) ** 2) - 1) * min(L["rx"], L["ry"])  # elipse externa
    region = outline
    cuts = circle_cuts(us, vs, L["cuts"], 0.035)
    region = smax(region, -cuts, 0.04)                                      # festões e cavidades
    # nervuras estruturais: raios retos nas coordenadas de vórtice → espirais reais, do anel
    # do vazio até cada ponta (garantem continuidade e formam as cristas luminosas)
    rs = np.sqrt(us * us + vs * vs)
    for a in L["ribs"]:
        along = us * np.cos(a) + vs * np.sin(a)
        across = np.abs(-us * np.sin(a) + vs * np.cos(a))
        rib = np.where(along > 0, across, rs) - L["rib_w"] * (1 - 0.6 * np.clip(along / 1.8, 0, 1))
        rib = smax(rib, outline + 0.04, 0.03)              # nervura contida no contorno
        region = smin(region, rib, 0.05)
    region = smax(region, -(np.sqrt((u - L["void_c"][0]) ** 2 + (v - L["void_c"][1]) ** 2) - L["void"]), 0.05)
    # altura: sela torcida + poço gravitacional + ondulação suave
    def height(uu, vv):
        rr = np.sqrt(uu * uu + vv * vv) + 1e-6; pp = np.arctan2(vv, uu)
        return (L["z0"] + L["saddle"] * (rr ** 2) * np.sin(2 * pp + L["saddle_ph"])
                - L["well"] * np.exp(-((rr - L["void"]) / 0.26) ** 2)
                + L.get("wave", 0.05) * np.sin(3 * pp + 2.3 * rr + L["saddle_ph"]) * np.clip(rr / 0.8, 0, 1.6))
    e = 1e-3
    h = height(u, v)
    gx = (height(u + e, v) - h) / e; gy = (height(u, v + e) - h) / e
    h = h + L["curl"] * np.exp(-np.abs(region) / 0.07)      # bordas levantadas: tensão e brilho de Fresnel
    # distância à lâmina corrigida pela inclinação (espessura constante mesmo em regiões íngremes)
    t = L["thick"][1] + (L["thick"][0] - L["thick"][1]) * np.clip(1 - r / 1.2, 0, 1)
    sheet = np.abs(w - h) / np.sqrt(1 + gx * gx + gy * gy) - t / 2
    if return_region:
        return smax(sheet, region, 0.02), region, sheet
    return smax(sheet, region, 0.02)


def web_variant():
    # camada frontal: padrão principal (vazio + anel de cavidades em lente + pontas em crescente)
    front = dict(z0=0.08, wave=0.16, saddle=0.26, saddle_ph=0.6, well=0.24, curl=0.02, thick=(0.05, 0.032),
                 swirl=1.8, spiral=0.6, sx=1.0, rx=1.45, ry=1.9, void=0.33, void_c=(0.04, -0.06),
                 cuts=web_layout(7, 6, 1.25, 0.84, 6, 0.78, 0.37, 0.3), ribs=tip_angles(7, 6, 0.3), rib_w=0.05, rib_len=1.9)
    # camada posterior: teia mais tênue, girada — sobreposição e profundidade
    back = dict(z0=-0.24, wave=0.12, saddle=-0.22, saddle_ph=2.1, well=-0.1, curl=0.015, thick=(0.044, 0.03),
                swirl=-1.4, spiral=0.7, sx=1.0, rx=1.35, ry=1.5, void=0.37, void_c=(0.04, -0.06),
                cuts=web_layout(23, 5, 1.1, 0.8, 5, 0.78, 0.4, 1.2), ribs=tip_angles(23, 5, 1.2), rib_w=0.028, rib_len=1.6)
    return dict(M=rot(12, -14), web=[front, back])


# ── variações volumétricas ──────────────────────────────────────────────────
ARMS = dict(count=6, samples=170, r0=0.48, length=[0.95, 0.8, 0.9, 0.72, 0.98, 0.82],
            jitter=[0, 14, -8, 20, -12, 6], sweep=1.35, hook=0.55, lift=0.12,
            width0=0.42, twist0=0.4, twist=1.7, thick=0.03)


def variant(name: str) -> dict:
    base = dict(M=rot(14, -10), E=dict(rx=1.02, ry=1.14, h=0.34),
                F=dict(r_void=0.33, width=0.24, depth=0.22, lift=0.05, r_out=0.8),
                void=0.31, thickness=(0.05, 0.028), arms=ARMS)
    if name == "A":    # Vortex — teia de superfície mínima arrastada pelo vórtice (escolhida)
        return dict(base, E=dict(rx=0.98, ry=1.1, h=0.24), F=dict(r_void=0.33, width=0.2, depth=0.2, lift=0.04, r_out=0.66),
                    tpms=dict(f=3.5, phase=(0.4, 1.3, 0.7), swirl=2.0, swirl_r=0.55, spiral=0.55, z_scale=1.8))
    if name == "B":    # Turbine Sails — velas torcidas: bases formam o anel do vazio, pontas em crescente
        sails = dict(ARMS, r0=0.40, length=[0.82, 0.7, 0.8, 0.62, 0.86, 0.72], jitter=[0, 10, -6, 14, -10, 4],
                     sweep=0.8, hook=0.45, lift=0.2, alternate=True, width0=0.64, taper=0.8,
                     twist0=0.0, twist=1.55, thick=0.032)
        return dict(base, tpms=None, arms=sails, F=dict(r_void=0.33, width=0.16, depth=0.16, lift=0.0, r_out=0.52))
    if name == "C":    # Tensioned Web — duas lâminas curvas recortadas, unidas pelo poço do vazio (escolhida)
        return web_variant()
    raise ValueError(name)


def field(X, Y, Z, V, parts=False):
    if "web" in V:
        u, v, w = to_local(X, Y, Z, V["M"])
        res = [web_layer(u, v, w, L, return_region=parts) for L in V["web"]]
        layers = [x[0] for x in res] if parts else res
        body = smin(layers[0], layers[1], 0.05)
        # anel do vazio: as duas camadas se fundem num poço contínuo em torno da singularidade
        r = np.sqrt((u - 0.04) ** 2 + (v + 0.06) ** 2)
        ring = np.sqrt((r - 0.4) ** 2 + (w + 0.05) ** 2 * 0.25) - 0.03
        ring = smax(ring, np.abs(w + 0.05) - 0.17, 0.03)
        body = smin(body, ring, 0.06)
        if parts:
            # distância (2D) até a borda da membrana, na camada mais próxima do ponto
            near = np.argmin(np.stack([np.abs(x[2]) for x in res]), axis=0)
            edge = np.where(near == 0, np.abs(res[0][1]), np.abs(res[1][1]))
            edge = np.minimum(edge, np.abs(ring) + 0.02)
            return body, dict(env=edge, horns=np.full(u.shape, 10.0), cut=r - 0.33, body=body, spike=np.full(u.shape, 10.0),
                              layer=near.astype(np.float32), rr=r)
        return body
    u, v, w = to_local(X, Y, Z, V["M"])
    r = np.sqrt(u * u + v * v)
    t_in, t_out = V["thickness"]
    th = t_out + (t_in - t_out) * np.clip(1 - r / 1.1, 0, 1) ** 1.2
    env = envelope(u, v, w, V["E"])
    body = np.full(u.shape, 10.0)
    if V["tpms"] is not None:
        sheet = np.abs(vortex_tpms(u, v, w, V["tpms"])) - th / 2
        body = smax(sheet, env, 0.03)
    body = smin(body, funnel(u, v, w, V["F"], t_in * 0.9), 0.05)
    A = V["arms"]
    arms = np.full(u.shape, 10.0)
    for i in range(A["count"]):
        t, P = arm_path(i, A)
        width = A["width0"] * (1 - t) ** A.get("taper", 0.85) + 0.006
        arms = np.minimum(arms, ribbon(u, v, w, P, t, width, A["twist0"] + 0.7 * i, A["twist"], A["thick"]))
    body = smin(body, arms, 0.05)
    cut = r - V["void"]                                   # Singularity: vazio atravessando o centro
    body = smax(body, -cut, 0.06)
    if parts:
        return body, dict(env=env, horns=arms, cut=cut, body=body, spike=arms)
    return body
