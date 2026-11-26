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

SCALE = 0.5  # rasterização em meia resolução

# limites anatômicos (parâmetro: (mín, máx))
BOUNDS_TEPAL = {
    "azimuth": (-40, 40),  # relativo ao valor inicial
    "beta0": (10, 40), "beta1": (35, 140), "bend_power": (1.0, 2.6),
    "length": (0.7, 1.7), "width": (0.18, 0.42), "widest": (0.35, 0.65),
    "cup": (0.05, 0.6), "twist": (-40, 40), "tip_curl": (-30, 60), "asym": (-0.15, 0.15),
}
# E (frontal, dobrada e torcida na foto) precisa de mais liberdade angular
BOUNDS_OVERRIDE = {"E": {"azimuth": (-60, 60), "twist": (-75, 75), "beta1": (20, 150), "width": (0.22, 0.42)}}
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
        polys.append(quads)
        if per_tepal is not None:
            own = np.zeros_like(img)
            for quad in np.round(quads).astype(np.int32):
                cv2.fillConvexPoly(own, quad, 255)
            per_tepal[name] = own
    path = stem_path(g)
    T = tube(path, np.full(len(path), g["stem"]["radius"]), nseg=10)
    q = project(T, cam, W, H) * SCALE
    polys.append(np.stack([q[:-1, :-1], q[1:, :-1], q[1:, 1:], q[:-1, 1:]], axis=2).reshape(-1, 4, 2))
    # cada célula individualmente: fillPoly com vários polígonos sobrepostos os cancelaria
    for quad in np.round(np.concatenate(polys)).astype(np.int32):
        cv2.fillConvexPoly(img, quad, 255)
    return img


def keypoints(prm, W, H):
    cam = prm["camera"]; g = prm["global"]; t = prm["targets"]
    A, _ = flower_frame(g)
    base = np.array(g["base"])
    pts, tgt = [], []
    for i, (name, p) in enumerate(prm["tepals"].items()):
        if name in t["tips"]:
            P, _, _ = tepal_surface(p, g, nu=34, nv=13, seed=i)
            pts.append(P[-1, P.shape[1] // 2]); tgt.append(t["tips"][name])
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
    own = {}
    sil = silhouette(prm, W, H, per_tepal=own) > 127
    m = mask > 127
    iou = (sil & m).sum() / max(1, (sil | m).sum())
    kp = keypoints(prm, W, H)
    # cobertura: cada tépala deve ocupar a própria região visível na foto
    reg = regions(prm, W, H)
    cover = [((own[n] > 127) & r).sum() / max(1, r.sum()) for n, r in reg.items() if n in own]
    miss = 1 - (np.mean(cover) if cover else 1)
    return (1 - iou) + 2.0 * kp.mean() + 0.6 * miss, iou, kp


def vectorize(prm, ref):
    """Lista de (getter/setter, limites) para os parâmetros livres."""
    out = []
    for k, (lo, hi) in BOUNDS_GLOBAL.items():
        out.append((("global", k), lo, hi))
    for name, p in prm["tepals"].items():
        bounds = {**BOUNDS_TEPAL, **BOUNDS_OVERRIDE.get(name, {})}
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
    # base da flor (x, y) e ponto final do caule
    for axis in (0, 1):
        out.append((("global", "base", axis), prm["global"]["base"][axis] - 0.15, prm["global"]["base"][axis] + 0.15))
    for axis in (0, 1):
        out.append((("global", "stem", "end", axis), prm["global"]["stem"]["end"][axis] - 0.3, prm["global"]["stem"]["end"][axis] + 0.3))
    return out


def get(prm, path):
    x = prm
    for k in path: x = x[k]
    return x


def put(prm, path, value):
    x = prm
    for k in path[:-1]: x = x[k]
    x[path[-1]] = float(value)


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
    json.dump(prm, open(pout, "w"), indent=2)


if __name__ == "__main__":
    main()
