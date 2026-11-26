"""
Ajuste do modelo à fotografia oficial (genesis.webp).

Objetivo = (1 − IoU da silhueta) + λ · erro dos pontos anatômicos
(pontas das tépalas, garganta, base, caule, anteras), com limites
anatômicos em cada parâmetro. Estratégia (1+1)-ES com passo adaptativo.

Uso:  python fit.py <máscara.png> <params_in.json> <params_out.json> [iterações]
"""
import json, math, sys, copy
import numpy as np, cv2
sys.path.insert(0, __import__("os").path.dirname(__file__))
from geometry import tepal_surface, tube, stem_path, stamen_paths, project, flower_frame

import os
SCALE = float(os.environ.get("FIT_SCALE", "0.5"))  # resolução de rasterização
IOU_WEIGHT = float(os.environ.get("FIT_IOU_WEIGHT", "1.0"))  # peso da silhueta (polimento)

# limites anatômicos (parâmetro: (mín, máx))
BOUNDS_TEPAL = {
    "azimuth": (-40, 40),  # relativo ao valor inicial
    "beta0": (10, 40), "beta1": (35, 140), "bend_power": (1.0, 2.6),
    "length": (0.7, 1.7), "width": (0.18, 0.42), "widest": (0.35, 0.65),
    "cup": (0.05, 0.6), "twist": (-40, 40), "tip_curl": (-30, 60), "asym": (-0.15, 0.15),
}
# E (frontal, dobrada e vista pelo dorso) precisa de mais liberdade angular
BOUNDS_OVERRIDE = {"E": {"azimuth": (-90, 90), "twist": (-90, 90), "beta1": (20, 150), "width": (0.22, 0.45)}}
# controles de forma adicionais (todas as tépalas)
BOUNDS_SHAPE = {"roll_pos": (-1.2, 1.2), "roll_neg": (-1.2, 1.2), "tip_roll": (-70, 70), "side_wave": (-0.06, 0.06)}
WARP_LIMIT = 0.2      # deslocamento máximo de um ponto de controle (unidades de mundo)
WARP_PENALTY = 0.35   # regularização: magnitude e variação entre pontos vizinhos
BOUNDS_GLOBAL = {"yaw": (5, 55), "pitch": (0, 40), "roll": (-30, 30)}
BOUNDS_STAMEN = {"azimuth": (-20, 20), "length": (0.4, 0.95), "spread": (0.05, 0.35), "lift": (0.0, 0.15)}


def silhouette(prm, W, H, include_stamens=False, per_tepal=None):
    """Silhueta total; se `per_tepal` for um dict, recebe também a silhueta de cada tépala."""
    cam = prm["camera"]; g = prm["global"]
    img = np.zeros((int(H * SCALE), int(W * SCALE)), np.uint8)
    polys = []
    for i, (name, p) in enumerate(prm["tepals"].items()):
        P, _, _ = tepal_surface(p, g, nu=34, nv=13, seed=i)
        q = project(P, cam, W, H) * SCALE
        quads = np.stack([q[:-1, :-1], q[1:, :-1], q[1:, 1:], q[:-1, 1:]], axis=2).reshape(-1, 4, 2)
        # cada tépala é desenhada uma única vez; a silhueta total é a união
        own = np.zeros_like(img)
        for quad in np.round(quads).astype(np.int32):
            cv2.fillConvexPoly(own, quad, 255)
        img |= own
        if per_tepal is not None:
            per_tepal[name] = own
    path = stem_path(g)
    T = tube(path, np.full(len(path), g["stem"]["radius"]), nseg=10)
    q = project(T, cam, W, H) * SCALE
    stem_quads = np.stack([q[:-1, :-1], q[1:, :-1], q[1:, 1:], q[:-1, 1:]], axis=2).reshape(-1, 4, 2)
    # cada célula individualmente: fillPoly com vários polígonos sobrepostos os cancelaria
    for quad in np.round(stem_quads).astype(np.int32):
        cv2.fillConvexPoly(img, quad, 255)
    return img


def render_labels(prm, W, H):
    """Mapa de rótulos com profundidade (algoritmo do pintor por célula):
    0 = fundo, 1..n = tépala visível em cada pixel, n+1 = caule."""
    cam = prm["camera"]; g = prm["global"]
    lab = np.zeros((int(H * SCALE), int(W * SCALE)), np.uint8)
    quads_all, depth_all, label_all = [], [], []
    for i, (name, p) in enumerate(prm["tepals"].items()):
        P, _, _ = tepal_surface(p, g, nu=34, nv=13, seed=i)
        q = project(P, cam, W, H) * SCALE
        quads = np.stack([q[:-1, :-1], q[1:, :-1], q[1:, 1:], q[:-1, 1:]], axis=2).reshape(-1, 4, 2)
        z = ((P[:-1, :-1, 2] + P[1:, 1:, 2]) / 2).reshape(-1)   # maior z = mais perto da câmera
        quads_all.append(quads); depth_all.append(z); label_all.append(np.full(len(z), i + 1))
    path = stem_path(g)
    T = tube(path, np.full(len(path), g["stem"]["radius"]), nseg=10)
    q = project(T, cam, W, H) * SCALE
    quads_all.append(np.stack([q[:-1, :-1], q[1:, :-1], q[1:, 1:], q[:-1, 1:]], axis=2).reshape(-1, 4, 2))
    zt = ((T[:-1, :-1, 2] + T[1:, 1:, 2]) / 2).reshape(-1)
    depth_all.append(zt); label_all.append(np.full(len(zt), len(prm["tepals"]) + 1))
    quads = np.round(np.concatenate(quads_all)).astype(np.int32)
    depth = np.concatenate(depth_all); labels = np.concatenate(label_all)
    for k in np.argsort(depth):                      # do mais distante ao mais próximo
        cv2.fillConvexPoly(lab, quads[k], int(labels[k]))
    return lab


def keypoints(prm, W, H):
    cam = prm["camera"]; g = prm["global"]; t = prm["targets"]
    A, _ = flower_frame(g)
    base = np.array(g["base"])
    pts, tgt = [], []
    for i, (name, p) in enumerate(prm["tepals"].items()):
        if name in t["tips"]:
            P, _, _ = tepal_surface(p, g, nu=34, nv=13, seed=i)
            pts.append(P[-1, P.shape[1] // 2]); tgt.append(t["tips"][name])
    # pontos de superfície (ex.: crista da margem enrolada de E): o lado mais próximo do alvo
    for sp in t.get("surface_points", []):
        names = list(prm["tepals"].keys())
        i = names.index(sp["tepal"])
        P, U, V = tepal_surface(prm["tepals"][sp["tepal"]], g, nu=34, nv=13, seed=i)
        ui = int(round(sp["u"] * (P.shape[0] - 1)))
        cands = project(np.array([P[ui, 0], P[ui, -1]]), cam, W, H) / np.array([W, H])
        best = int(np.argmin(np.linalg.norm(cands - np.array(sp["xy"]), axis=1)))
        pts.append(P[ui, 0 if best == 0 else -1]); tgt.append(sp["xy"])
    pts.append(base); tgt.append(t["base"])
    pts.append(base + A * 0.22); tgt.append(t["throat"])
    sp = stem_path(g); pts.append(sp[-1]); tgt.append(t["stem_end"])
    for path, a in zip(stamen_paths(prm["stamens"], g), t["anthers"]):
        pts.append(path[-1]); tgt.append(a)
    q = project(np.array(pts), cam, W, H) / np.array([W, H])
    return np.linalg.norm(q - np.array(tgt), axis=1)


_REGION_CACHE = {}


def regions(prm, W, H):
    """Regiões visíveis de cada tépala na foto (polígonos aproximados), rasterizadas."""
    key = id(prm["targets"].get("regions"))
    if key not in _REGION_CACHE:
        out = {}
        for name, poly in prm["targets"].get("regions", {}).items():
            img = np.zeros((int(H * SCALE), int(W * SCALE)), np.uint8)
            pts = np.round(np.array(poly) * np.array([W, H]) * SCALE).astype(np.int32)
            cv2.fillPoly(img, [pts], 255)
            out[name] = img > 127
        _REGION_CACHE.clear(); _REGION_CACHE[key] = out
    return _REGION_CACHE[key]


def objective(prm, mask, W, H):
    lab = render_labels(prm, W, H)
    sil = lab > 0
    m = mask > 127
    iou = (sil & m).sum() / max(1, (sil | m).sum())
    kp = keypoints(prm, W, H)
    # visibilidade: em cada região da foto, deve aparecer a PRÓPRIA tépala (com oclusão)
    reg = regions(prm, W, H)
    weights = prm["targets"].get("region_weights", {})
    names = list(prm["tepals"].keys())
    miss = 0.0
    for n, r in reg.items():
        if n in names:
            miss += weights.get(n, 0.5) * (1 - (lab[r] == names.index(n) + 1).mean())
    # regularização do campo Bézier: pequeno e suave (sem amassados artificiais)
    reg_pen = 0.0
    for p in prm["tepals"].values():
        for comp in ("warp_n", "warp_b"):
            if comp in p:
                c = np.asarray(p[comp])
                reg_pen += np.mean(np.abs(c)) + 0.5 * (np.mean(np.abs(np.diff(c, axis=0))) + np.mean(np.abs(np.diff(c, axis=1))))
    reg_pen /= max(1, len(prm["tepals"]))
    return IOU_WEIGHT * (1 - iou) + 2.0 * kp.mean() + 0.6 * miss + WARP_PENALTY * reg_pen, iou, kp


def vectorize(prm, ref):
    """Lista de (getter/setter, limites) para os parâmetros livres."""
    out = []
    for k, (lo, hi) in BOUNDS_GLOBAL.items():
        out.append((("global", k), lo, hi))
    for name, p in prm["tepals"].items():
        bounds = {**BOUNDS_TEPAL, **BOUNDS_SHAPE, **BOUNDS_OVERRIDE.get(name, {})}
        for k, (lo, hi) in bounds.items():
            if k == "azimuth":
                a0 = ref["tepals"][name]["azimuth"]
                out.append((("tepals", name, k), a0 + lo, a0 + hi))
            else:
                out.append((("tepals", name, k), lo, hi))
    for i in range(len(prm["stamens"])):
        for k, (lo, hi) in BOUNDS_STAMEN.items():
            if k == "azimuth":
                a0 = ref["stamens"][i]["azimuth"]
                out.append((("stamens", i, k), a0 + lo, a0 + hi))
            else:
                out.append((("stamens", i, k), lo, hi))
    # pontos de controle Bézier de cada tépala (normal e largura)
    for name, p in prm["tepals"].items():
        for comp in ("warp_n", "warp_b"):
            if comp in p:
                for a in range(len(p[comp])):
                    for b in range(len(p[comp][a])):
                        lim = WARP_LIMIT if comp == "warp_n" else 0.45  # warp_b: fração da largura local
                        out.append((("tepals", name, comp, a, b), -lim, lim))
    # base da flor (x, y) e ponto final do caule
    for axis in (0, 1):
        out.append((("global", "base", axis), prm["global"]["base"][axis] - 0.15, prm["global"]["base"][axis] + 0.15))
    for axis in (0, 1):
        out.append((("global", "stem", "end", axis), prm["global"]["stem"]["end"][axis] - 0.3, prm["global"]["stem"]["end"][axis] + 0.3))
    return out


def get(prm, path):
    x = prm
    for k in path:
        # parâmetros de forma opcionais ausentes valem 0 (sem efeito)
        x = x.get(k, 0.0) if isinstance(x, dict) else x[k]
    return x


def put(prm, path, value):
    x = prm
    for k in path[:-1]: x = x[k]
    x[path[-1]] = float(value)


def coverage(prm, W, H):
    """Fração de cada região da foto em que a própria tépala é a visível (com oclusão)."""
    lab = render_labels(prm, W, H)
    names = list(prm["tepals"].keys())
    return {n: round(float((lab[r] == names.index(n) + 1).mean()), 3) for n, r in regions(prm, W, H).items()}


def main():
    mask_path, pin, pout = sys.argv[1:4]
    iters = int(sys.argv[4]) if len(sys.argv) > 4 else 3000
    mask_full = cv2.imread(mask_path, cv2.IMREAD_UNCHANGED)
    alpha = mask_full[..., 3] if mask_full.ndim == 3 and mask_full.shape[2] == 4 else mask_full
    H, W = alpha.shape
    mask = cv2.resize(alpha, (int(W * SCALE), int(H * SCALE)), interpolation=cv2.INTER_AREA)
    prm = json.load(open(pin)); ref = copy.deepcopy(prm)
    space = vectorize(prm, ref)
    rng = np.random.default_rng(7)
    best, iou, kp = objective(prm, mask, W, H)
    print(f"início: objetivo {best:.4f} | IoU {iou:.3f} | erro médio dos pontos {kp.mean()*100:.2f}% da imagem")
    sigma = 0.08
    accepted = 0
    for it in range(iters):
        cand = copy.deepcopy(prm)
        k = rng.integers(1, 5)
        for idx in rng.choice(len(space), size=k, replace=False):
            path, lo, hi = space[idx]
            val = get(cand, path) + rng.normal() * sigma * (hi - lo)
            put(cand, path, np.clip(val, lo, hi))
        f, i2, kp2 = objective(cand, mask, W, H)
        if f < best:
            prm, best, iou, kp = cand, f, i2, kp2
            accepted += 1
            sigma = min(0.2, sigma * 1.15)
        else:
            sigma = max(0.005, sigma * 0.995)
        if it % 500 == 0:
            print(f"  it {it:5d}: objetivo {best:.4f} | IoU {iou:.3f} | pontos {kp.mean()*100:.2f}% | passo {sigma:.3f}")
    print(f"fim: objetivo {best:.4f} | IoU {iou:.3f} | erro médio dos pontos {kp.mean()*100:.2f}% | aceitos {accepted}")
    print("cobertura por região:", coverage(prm, W, H))
    json.dump(prm, open(pout, "w"), indent=2)


if __name__ == "__main__":
    main()
