"""Verificações: compatibilidade dos morph targets (GLB) e interseções entre membranas."""
import json, struct, sys, itertools, os
import numpy as np
from scipy.spatial import cKDTree
sys.path.insert(0, os.path.dirname(__file__))
import geometry as G

glb = sys.argv[1]
d = open(glb, "rb").read(); n = struct.unpack("<I", d[12:16])[0]; j = json.loads(d[20:20 + n]); off = 20 + n + 8
def acc(i, comps=3):
    a = j["accessors"][i]; v = j["bufferViews"][a["bufferView"]]
    return np.frombuffer(d, np.float32, a["count"] * comps, off + v.get("byteOffset", 0) + a.get("byteOffset", 0)).reshape(-1, comps)
pr = j["meshes"][0]["primitives"][0]
base = acc(pr["attributes"]["POSITION"]); nb = acc(pr["attributes"]["NORMAL"])
names = j["meshes"][0].get("extras", {}).get("targetNames", [])
print("morph targets:", names, "| vértices base:", len(base))
for name, t in zip(names, pr["targets"]):
    dp = acc(t["POSITION"]); dn = acc(t["NORMAL"])
    nn = np.linalg.norm(nb + dn, axis=1)
    print(f"  {name:14s} contagem {len(dp)} | NaN {int(np.isnan(dp).sum() + np.isnan(dn).sum())} | normal final unitária: mín {nn.min():.3f} máx {nn.max():.3f}")

def membranes_mid(state_mix):
    """Superfícies médias por membrana para uma mistura linear de estados."""
    out = []
    for i in range(len(G.MEMBRANES)):
        acc_top = 0
        for s, w in state_mix:
            top, bot, N, U, V = G.membrane(s, i)
            acc_top = acc_top + w * (top + bot) / 2
        out.append((acc_top, U))
    return out

def intersections(state_mix, tol=0.006):
    mids = membranes_mid(state_mix)
    pts = [m[0][m[1] > 0.15] for m in mids]     # raízes convergem no núcleo (esperado)
    trees = [cKDTree(p) for p in pts]
    total = 0; pairs = {}
    for a, b in itertools.combinations(range(len(pts)), 2):
        c = sum(len(x) > 0 for x in trees[b].query_ball_point(pts[a], tol))
        if c: pairs[f"{a+1}×{b+1}"] = c; total += c
    return total, pairs

S = G.STATES
for s in S:
    t, p = intersections([(s, 1.0)])
    print(f"estado {s:14s}: pontos de contato entre membranas {t:4d} {p if p else ''}")
for a, b in zip(S[:-1], S[1:]):
    t, p = intersections([(a, 0.5), (b, 0.5)])
    print(f"meio {a}→{b}: {t} {p if p else ''}")
