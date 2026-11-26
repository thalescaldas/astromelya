"""
Assinatura HTZ — vetorização fiel e caminhos de escrita.

Entrada: PNG original (traço branco sobre preto).
Saídas (public/about/signature/):
  htz-signature.svg        contorno vetorial (preenchimento branco, sem fundo)
  htz-signature.png        PNG transparente (alfa = luminância original, traço branco)
  htz-strokes.json         linhas centrais de cada gesto, em ordem de escrita
O desenho nunca é redesenhado: o SVG é o contorno do próprio PNG; as linhas
centrais servem apenas como máscara para revelar o traço original.
"""
import json, sys, os
import numpy as np, cv2
from skimage.morphology import skeletonize
from skimage.graph import route_through_array

src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
g = cv2.imread(src, cv2.IMREAD_GRAYSCALE)
H, W = g.shape
PAD = 12
ys, xs = np.where(g > 8)
x0, x1, y0, y1 = xs.min() - PAD, xs.max() + PAD + 1, ys.min() - PAD, ys.max() + PAD + 1
crop = g[y0:y1, x0:x1]
cw, ch = crop.shape[1], crop.shape[0]

# ── PNG transparente: traço branco, alfa = luminância (antisserrilhado preservado)
rgba = np.zeros((ch, cw, 4), np.uint8); rgba[..., :3] = 255; rgba[..., 3] = crop
cv2.imwrite(f"{out}/htz-signature.png", rgba, [cv2.IMWRITE_PNG_COMPRESSION, 9])

# ── Vetorização: contorno sub-pixel (ampliação 8×, limiar no meio-tom)
K = 8
big = cv2.resize(crop, (cw * K, ch * K), interpolation=cv2.INTER_CUBIC)
binary = (big >= 128).astype(np.uint8)
contours, hier = cv2.findContours(binary, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
parts = []
for c in contours:
    if len(c) < 12:
        continue
    p = c[:, 0, :].astype(np.float64)
    # suavização circular leve (remove degraus da grade sem alterar a forma)
    k = np.array([1, 4, 6, 4, 1], float); k /= k.sum()
    p = np.stack([np.convolve(np.r_[p[-2:, i], p[:, i], p[:2, i]], k, "valid") for i in (0, 1)], 1)
    ap = cv2.approxPolyDP(p.astype(np.float32).reshape(-1, 1, 2), 0.12 * K, True)[:, 0, :] / K
    if len(ap) < 3:
        continue
    parts.append("M" + " L".join(f"{x:.2f} {y:.2f}" for x, y in ap) + "Z")
svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {cw} {ch}" width="{cw}" height="{ch}">'
       f'<title>HTZ</title><path fill="#ffffff" fill-rule="evenodd" d="{" ".join(parts)}"/></svg>')
open(f"{out}/htz-signature.svg", "w").write(svg)

# ── Linhas centrais por gesto (ordem de escrita), seguindo o esqueleto do traço
mask = crop >= 60
dist = cv2.distanceTransform(mask.astype(np.uint8), cv2.DIST_L2, 5)
skel = skeletonize(mask)
cost = np.where(skel, 1.0, np.where(mask, 6.0 / (dist + 0.5), 1e4))
WAY = {  # pontos de passagem aproximados (coordenadas da imagem original)
    "stem": [(545, 345), (521, 430), (497, 560), (472, 680), (452, 780), (426, 902)],
    "arch": [(472, 690), (490, 612), (530, 545), (580, 502), (612, 492), (648, 512), (661, 560), (657, 620), (640, 720), (619, 820)],
    "bar":  [(411, 471), (520, 428), (640, 382), (728, 349)],
    "zed":  [(411, 667), (520, 625), (650, 572), (738, 543), (700, 566), (600, 630), (470, 730), (378, 815),
             (450, 790), (560, 752), (700, 713), (850, 686), (993, 643)],
}
sy, sx = np.nonzero(skel)


def snap(x, y):
    """Leva o ponto de passagem ao pixel de esqueleto mais próximo (sem desvios)."""
    i = int(np.argmin((sx - (x - x0)) ** 2 + (sy - (y - y0)) ** 2))
    return int(sx[i]) + x0, int(sy[i]) + y0


strokes = []
for name, pts in WAY.items():
    path = []
    pts = [pts[0]] + [snap(*q) for q in pts[1:-1]] + [pts[-1]]
    for (ax, ay), (bx, by) in zip(pts[:-1], pts[1:]):
        r, _ = route_through_array(cost, (ay - y0, ax - x0), (by - y0, bx - x0), fully_connected=True, geometric=True)
        path += r if not path else r[1:]
    P = np.array([(c, r) for r, c in path], float)
    # suaviza e reamostra a cada ~2 px
    for _ in range(3):
        P[1:-1] = (P[:-2] + 2 * P[1:-1] + P[2:]) / 4
    seg = np.r_[0, np.cumsum(np.linalg.norm(np.diff(P, axis=0), axis=1))]
    t = np.arange(0, seg[-1], 2.0)
    P = np.stack([np.interp(t, seg, P[:, 0]), np.interp(t, seg, P[:, 1])], 1)
    width = float(dist[P[:, 1].astype(int).clip(0, ch - 1), P[:, 0].astype(int).clip(0, cw - 1)].max() * 2)
    strokes.append({"name": name, "length": round(float(seg[-1]), 1), "maxWidth": round(width, 2),
                    "d": "M" + " L".join(f"{x:.1f} {y:.1f}" for x, y in P)})
# ── Divisão da tinta por gesto: cada gesto recebe o traço dentro da sua faixa
#    (meia-largura HALF); tinta fora de todas as faixas vai para o gesto mais próximo.
#    Na animação, cada gesto é revelado apenas pela própria máscara.
MARGIN = 0.8   # px além da meia-largura local do traço
dists, bands = [], []
for st in strokes:
    canvas = np.full((ch * K, cw * K), 255, np.uint8)
    P = np.array([[float(v) for v in tok.split()] for tok in st["d"][1:].split(" L")])
    cv2.polylines(canvas, [np.round(P * K).astype(np.int32)], False, 0, 1, cv2.LINE_8)
    dists.append(cv2.distanceTransform(canvas, cv2.DIST_L2, 5) / K)
    # meia-largura local: mediana móvel da distância ao fundo (ignora cruzamentos)
    r = dist[P[:, 1].astype(int).clip(0, ch - 1), P[:, 0].astype(int).clip(0, cw - 1)]
    rm = np.array([np.median(r[max(0, j - 10): j + 11]) for j in range(len(r))])
    band = np.zeros((ch * K, cw * K), np.uint8)
    for (x, y), rr in zip(P, rm):
        cv2.circle(band, (int(round(x * K)), int(round(y * K))), int(round((rr + MARGIN) * K)), 1, -1)
    bands.append(band > 0)
D = np.stack(dists)
nearest = np.argmin(D, axis=0)
coverage = []
for i, st in enumerate(strokes):
    own = (binary > 0) & (bands[i] | (nearest == i))
    cs, _ = cv2.findContours(own.astype(np.uint8), cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    ps = []
    for c in cs:
        if len(c) < 12:
            continue
        q = cv2.approxPolyDP(c.astype(np.float32), 0.12 * K, True)[:, 0, :] / K
        if len(q) >= 3:
            ps.append("M" + " L".join(f"{x:.2f} {y:.2f}" for x, y in q) + "Z")
    st["ink"] = " ".join(ps)
    coverage.append(own)
union = np.any(np.stack(coverage), axis=0)
print("tinta coberta pela divisão:", round(float((union & (binary > 0)).sum() / (binary > 0).sum()), 5))

# ── Ritmo da escrita: velocidade variável (aceleração/desaceleração, freio nas curvas)
PAUSE, TOTAL = 0.11, 3.0
lengths = np.array([st["length"] for st in strokes])
draw_time = TOTAL - PAUSE * (len(strokes) - 1)
t = 0.0
for st in strokes:
    P = np.array([[float(v) for v in tok.split()] for tok in st["d"][1:].split(" L")])
    seg = np.r_[0, np.cumsum(np.linalg.norm(np.diff(P, axis=0), axis=1))]
    # curvatura (mudança de direção) → frenagem natural nas voltas
    d = np.diff(P, axis=0); ang = np.arctan2(d[:, 1], d[:, 0])
    turn = np.abs(np.angle(np.exp(1j * np.diff(ang)))); turn = np.r_[0, turn, 0]
    turn = np.convolve(turn, np.ones(9) / 9, "same")
    u = seg / seg[-1]
    speed = (0.35 + 0.65 * np.sin(np.pi * np.clip(u, 0, 1)) ** 0.6) / (1 + 18 * turn)
    dt = np.r_[0, np.diff(seg) / np.maximum((speed[1:] + speed[:-1]) / 2, 1e-3)]
    tt = np.cumsum(dt); tt /= tt[-1]
    idx = np.unique(np.r_[np.searchsorted(tt, np.linspace(0, 1, 24)), len(tt) - 1].clip(0, len(tt) - 1))
    st["keyframes"] = [[round(float(tt[k]), 4), round(float(u[k]), 4)] for k in idx]
    dur = draw_time * st["length"] / lengths.sum()
    st["delay"] = round(t, 3); st["duration"] = round(dur, 3)
    t += dur + PAUSE
# linha central mais leve para o HTML (1 ponto a cada ~6 px basta para a máscara)
for st in strokes:
    pts = st["d"][1:].split(" L")
    st["d"] = "M" + " L".join(pts[::3] + ([pts[-1]] if (len(pts) - 1) % 3 else []))
data = {"viewBox": [0, 0, cw, ch], "strokes": strokes}
json.dump(data, open(f"{out}/htz-strokes.json", "w"))
# cópia usada pelo componente (renderizado no servidor; visível sem JavaScript)
comp = os.path.join(os.path.dirname(__file__), "..", "..", "src", "components", "about", "htz-signature.json")
json.dump(data, open(comp, "w"))
print("recorte", cw, ch, "| contornos", len(parts), "| svg", os.path.getsize(f"{out}/htz-signature.svg"), "bytes")
for s in strokes: print(f"  {s['name']:5s} comprimento {s['length']:6.1f}px  espessura máx {s['maxWidth']:.1f}px")
