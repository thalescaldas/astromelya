"""Verificações de integridade: interseções entre tépalas, normais e espessura no GLB."""
import sys, json, struct, itertools
import numpy as np
sys.path.insert(0, __import__("os").path.dirname(__file__))
from geometry import tepal_surface

prm = json.load(open(sys.argv[1])); glb = sys.argv[2]
names = list(prm["tepals"].keys())
pts = {}
for i, n in enumerate(names):
    P, U, V = tepal_surface(prm["tepals"][n], prm["global"], nu=160, nv=81, seed=i)
    keep = U > 0.18                                  # base: convergência anatômica no receptáculo
    pts[n] = P[keep]
CELL, TH = 0.01, 0.004
def buckets(P):
    d = {}
    for idx, key in enumerate(map(tuple, np.floor(P / CELL).astype(int))):
        d.setdefault(key, []).append(idx)
    return d
B = {n: buckets(p) for n, p in pts.items()}
total = 0
for a, b in itertools.combinations(names, 2):
    pa, pb, bb = pts[a], pts[b], B[b]
    close = 0
    for key, idxs in B[a].items():
        cand = [j for dx in (-1, 0, 1) for dy in (-1, 0, 1) for dz in (-1, 0, 1) for j in bb.get((key[0]+dx, key[1]+dy, key[2]+dz), [])]
        if not cand: continue
        d = np.linalg.norm(pa[idxs][:, None, :] - pb[cand][None, :, :], axis=2)
        close += int((d.min(axis=1) < TH).sum())
    if close: print(f"  contato/interseção {a}×{b}: {close} pontos (de {len(pa)})")
    total += close
print("interseções entre tépalas (fora da base):", total)

# normais e atributos no GLB
d = open(glb, "rb").read(); n = struct.unpack("<I", d[12:16])[0]; j = json.loads(d[20:20 + n])
binoff = 20 + n + 8
def acc(i):
    a = j["accessors"][i]; v = j["bufferViews"][a["bufferView"]]
    comps = {"SCALAR": 1, "VEC2": 2, "VEC3": 3}[a["type"]]
    arr = np.frombuffer(d, dtype=np.float32, count=a["count"] * comps, offset=binoff + v.get("byteOffset", 0) + a.get("byteOffset", 0))
    return arr.reshape(a["count"], comps)
bad = 0; nanv = 0
for m in j["meshes"]:
    at = m["primitives"][0]["attributes"]
    N = acc(at["NORMAL"]); L = np.linalg.norm(N, axis=1)
    bad += int((np.abs(L - 1) > 0.02).sum()); nanv += int(np.isnan(N).sum())
print("normais não unitárias:", bad, "| NaN:", nanv)
tep = [m for m in j["meshes"] if m["name"].startswith("petal_")]
print("tépalas com _ANCHOR/_FLEX/_EDGE/UV:", sum(all(k in m["primitives"][0]["attributes"] for k in ("_ANCHOR", "_FLEX", "_EDGE", "TEXCOORD_0")) for m in tep), "de", len(tep))
