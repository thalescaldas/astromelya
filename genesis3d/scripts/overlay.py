"""Sobreposição diagnóstica: silhueta do modelo (vermelho) × fotografia, com pontos-alvo."""
import json, sys
import numpy as np, cv2
sys.path.insert(0, __import__("os").path.dirname(__file__))
from fit import silhouette, SCALE
from geometry import tepal_surface, project

photo, params, out = sys.argv[1:4]
prm = json.load(open(params))
g = cv2.imread(photo); H, W = g.shape[:2]
sil = cv2.resize(silhouette(prm, W, H), (W, H), interpolation=cv2.INTER_NEAREST)
ov = g.copy(); ov[sil > 127] = (0.55 * ov[sil > 127] + 0.45 * np.array([40, 40, 230])).astype(np.uint8)
for i, (name, p) in enumerate(prm["tepals"].items()):
    P, _, _ = tepal_surface(p, prm["global"], nu=34, nv=13, seed=i)
    q = project(P, prm["camera"], W, H)
    tip = tuple(np.round(q[-1, q.shape[1] // 2]).astype(int))
    cv2.circle(ov, tip, 7, (0, 255, 255), 2); cv2.putText(ov, name, (tip[0] + 8, tip[1]), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 255), 2)
for name, t in prm["targets"]["tips"].items():
    c = (int(t[0] * W), int(t[1] * H)); cv2.drawMarker(ov, c, (0, 255, 0), cv2.MARKER_CROSS, 18, 2)
cv2.imwrite(out, cv2.resize(ov[:, 300:1300], (800, 753)))
