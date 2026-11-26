"""
Reconstrução individual da tépala E: varredura sistemática de orientação
(azimute 0–360°, abertura, torção, enrolamento) com as demais tépalas fixas,
seguida de refinamento local só de E. Custo próprio de E: ponta, crista da
margem enrolada, cobertura da sua região e vazamento fora da silhueta.
"""
import sys, json, copy, itertools
import numpy as np, cv2
sys.path.insert(0, __import__("os").path.dirname(__file__))
import fit
from geometry import tepal_surface, project

pin, pout = sys.argv[1:3]
prm = json.load(open(pin))
mask_full = cv2.imread("../../public/flowers/genesis-mask.png", cv2.IMREAD_UNCHANGED)[..., 3]
H, W = mask_full.shape
mask = cv2.resize(mask_full, (int(W * fit.SCALE), int(H * fit.SCALE)), interpolation=cv2.INTER_AREA) > 127
region = fit.regions(prm, W, H)["E"]
t = prm["targets"]; cam = prm["camera"]; g = prm["global"]
idx = list(prm["tepals"].keys()).index("E")
tip_t = np.array(t["tips"]["E"]); crest = t["surface_points"][0]


REG = fit.regions(prm, W, H)
NAMES = list(prm["tepals"].keys())


def cost_e(p):
    trial = dict(prm); trial["tepals"] = {**prm["tepals"], "E": p}
    lab = fit.render_labels(trial, W, H)
    own = lab == idx + 1
    cover = own[region].mean()
    # oclusão indevida: E aparecendo nas regiões das outras tépalas
    steal = np.mean([own[r].mean() for n, r in REG.items() if n != "E"])
    spill = (own & ~mask).sum() / max(1, own.sum()) + 2.0 * steal
    P, U, V = tepal_surface(p, g, nu=34, nv=13, seed=idx)
    q = project(P, cam, W, H)
    tip = np.linalg.norm(q[-1, q.shape[1] // 2] / [W, H] - tip_t)
    ui = int(round(crest["u"] * (P.shape[0] - 1)))
    cr = min(np.linalg.norm(q[ui, 0] / [W, H] - crest["xy"]), np.linalg.norm(q[ui, -1] / [W, H] - crest["xy"]))
    return 2.0 * tip + 1.5 * cr + (1 - cover) + 1.5 * spill, (tip, cr, cover, spill)


E0 = copy.deepcopy(prm["tepals"]["E"])
E0["warp_n"] = [[0.0] * 3 for _ in range(4)]; E0["warp_b"] = [[0.0] * 3 for _ in range(4)]
best = (1e9, None, None)
for az, b1, tw, rn in itertools.product(range(0, 360, 10), (35, 60, 85, 110), (-60, -30, 0, 30, 60), (0.0, 0.6, 1.0)):
    p = {**E0, "azimuth": az, "beta1": b1, "twist": tw, "roll_neg": rn, "roll_pos": 0.0}
    c, parts = cost_e(p)
    if c < best[0]:
        best = (c, p, parts)
print("varredura: melhor azimute %.0f°, abertura %.0f°, torção %.0f°, enrolamento %.1f | ponta %.1f%%, crista %.1f%%, cobertura %.0f%%, vazamento %.0f%%"
      % (best[1]["azimuth"], best[1]["beta1"], best[1]["twist"], best[1]["roll_neg"], best[2][0] * 100, best[2][1] * 100, best[2][2] * 100, best[2][3] * 100))

# refinamento local (somente E)
rng = np.random.default_rng(3)
keys = {"azimuth": (-180, 540), "beta0": (8, 45), "beta1": (20, 150), "bend_power": (1.0, 2.6), "length": (0.7, 1.4),
        "width": (0.22, 0.45), "widest": (0.35, 0.65), "cup": (0.0, 0.6), "twist": (-90, 90), "tip_curl": (-40, 60),
        "roll_neg": (-1.2, 1.2), "roll_pos": (-1.2, 1.2), "tip_roll": (-70, 70)}
cur, cc = best[1], best[0]
sigma = 0.08
for it in range(2500):
    cand = copy.deepcopy(cur)
    for k in rng.choice(list(keys), size=rng.integers(1, 4), replace=False):
        lo, hi = keys[k]
        cand[k] = float(np.clip(cand.get(k, 0.0) + rng.normal() * sigma * (hi - lo), lo, hi))
    c, parts = cost_e(cand)
    if c < cc:
        cur, cc = cand, c; sigma = min(0.2, sigma * 1.15)
    else:
        sigma = max(0.004, sigma * 0.997)
c, parts = cost_e(cur)
print("refinado: ponta %.1f%%, crista %.1f%%, cobertura %.0f%%, vazamento %.0f%%" % (parts[0] * 100, parts[1] * 100, parts[2] * 100, parts[3] * 100))
prm["tepals"]["E"] = cur
json.dump(prm, open(pout, "w"), indent=2)
