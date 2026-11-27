"""The Unbound — Beyond Form · Ethereal Continuum (conceito B).

Fita única em S vertical, torcida (~1.5π) e enrolada em arco, de modo que as
membranas se fecham em bolsões. Cavidades reais são recortadas da grade fixa
(u ao longo da altura, v através da largura) por campos elípticos em espaço de
parâmetro; as bordas são ajustadas sobre a curva de corte. Pontas afiladas:
cauda inferior por estreitamento, dois chifres superiores por um entalhe.

A grade (NU×NV) é fixa e as faces removidas são determinísticas: a topologia é
estável para futuros morph targets.

uso: python -I build_continuum.py <saida.glb> <saida.blend>
"""
import json, math, sys
import numpy as np
import bpy, bmesh
from mathutils.bvhtree import BVHTree

NU, NV, H = 280, 76, 3.2
u = np.linspace(0, 1, NU); v = np.linspace(-1, 1, NV)
ss = lambda a, b, x: np.clip((x - a) / (b - a), 0, 1) ** 2 * (3 - 2 * np.clip((x - a) / (b - a), 0, 1))

# ── espinha em S ─────────────────────────────────────────────────────────────
def spine(t):
    return np.stack([-0.5 * np.sin(2 * np.pi * t) + 0.18 * t - 0.06,
                     H * (t - 0.5),
                     0.22 * np.sin(np.pi * (1.4 * t + 0.15)) - 0.1], -1)

def frame(t):
    e = 1e-4
    T = spine(t + e) - spine(t - e); T /= np.linalg.norm(T, axis=-1, keepdims=True)
    ref = np.array([1.0, 0.0, 0.0])
    B0 = ref - (T @ ref)[..., None] * T; B0 /= np.linalg.norm(B0, axis=-1, keepdims=True)
    N0 = np.cross(T, B0)
    phi = 1.5 * np.pi * t - 0.55 + 0.35 * np.sin(3 * np.pi * t)        # torção
    c, s = np.cos(phi)[..., None], np.sin(phi)[..., None]
    return T, c * B0 + s * N0, -s * B0 + c * N0

def width(t):                                                              # meia-largura
    body = np.sin(np.pi * np.clip(0.02 + 0.98 * t, 0, 1)) ** 0.55
    return 0.04 + 0.82 * body * (1 + 0.22 * np.sin(2 * np.pi * t + 0.9)) + 0.12 * ss(0.8, 1, t)

def curl(t):                                                               # ângulo do arco (k·w)
    return 1.5 + 0.8 * np.sin(2 * np.pi * t + 0.6) + 0.6 * ss(0.85, 1, t)

def surface(U, V):
    C = spine(U); T, B, N = frame(U)
    w = width(U); off = 0.08 * np.sin(np.pi * 2.2 * U + 0.4)              # assimetria transversal
    s = (V + off) * w
    k = curl(U) / w
    a, b = np.sin(k * s) / k, (1 - np.cos(k * s)) / k
    P = C + a[..., None] * B + b[..., None] * N
    hook = (ss(0.86, 1, U) * np.abs(V) ** 2 * 0.22 + ss(0.14, 0, U) * 0.08)  # ganchos nas pontas
    return P + hook[..., None] * (N * np.sign(V + 1e-9)[..., None] * 0.6 + T * 0.4)

# ── cortes (d<0 = removido), métrica: altura × largura ──────────────────────
HOLES = [  # (u0, v0, ru [m], rv [frac. largura])
    (0.79, -0.08, 0.26, 0.52), (0.66, 0.36, 0.20, 0.38), (0.565, -0.42, 0.14, 0.30),
    (0.47, 0.16, 0.19, 0.44), (0.355, -0.32, 0.19, 0.38), (0.265, 0.44, 0.14, 0.28),
    (0.18, -0.12, 0.16, 0.44), (0.085, 0.52, 0.07, 0.2), (0.895, 0.58, 0.07, 0.18),
    (0.67, -0.80, 0.07, 0.12),
]
def cut(U, V):
    d = np.full(np.shape(U), 10.0)
    for u0, v0, ru, rv in HOLES:
        e = np.sqrt(((U - u0) * H / ru) ** 2 + ((V - v0) / rv) ** 2)
        d = np.minimum(d, (e - 1) * min(ru, rv * 0.5))
    g = 0.97 * ((U - 0.83) / 0.17).clip(0) ** 0.75                         # entalhe → dois chifres
    notch = np.where(U > 0.83, np.abs(V - 0.12 + 0.1 * (U - 0.83)) - g, 10.0) * 0.5
    return np.minimum(d, notch)

UU, VV = np.meshgrid(u, v, indexing="ij")
quads = np.array([(i * NV + j, (i + 1) * NV + j, (i + 1) * NV + j + 1, i * NV + j + 1)
                  for i in range(NU - 1) for j in range(NV - 1)])
cu = UU.ravel()[quads].mean(1); cv = VV.ravel()[quads].mean(1)
quads = quads[cut(cu, cv) > 0]

# ajusta vértices da borda dos furos sobre a curva de corte (Newton em (u,v))
pu, pv = UU.ravel().copy(), VV.ravel().copy()
used = np.unique(quads)
edge_cnt = {}
for q in quads:
    for a, b in zip(q, np.roll(q, -1)):
        k = (min(a, b), max(a, b)); edge_cnt[k] = edge_cnt.get(k, 0) + 1
bverts = np.unique([x for k, c in edge_cnt.items() if c == 1 for x in k])
inner = bverts[(np.abs(pv[bverts]) < 0.999) & (pu[bverts] > 1e-6) & (pu[bverts] < 1 - 1e-6)]
for _ in range(6):
    du, dv = 1e-4, 1e-4
    d0 = cut(pu[inner], pv[inner])
    gu = (cut(pu[inner] + du, pv[inner]) - d0) / du; gv = (cut(pu[inner], pv[inner] + dv) - d0) / dv
    g2 = gu ** 2 + gv ** 2 + 1e-12
    pu[inner] -= 0.9 * d0 * gu / g2; pv[inner] -= 0.9 * d0 * gv / g2
pu = pu.clip(0, 1); pv = pv.clip(-1, 1)

remap = -np.ones(NU * NV, np.int64); remap[used] = np.arange(len(used))
faces = remap[quads].tolist()
pu, pv = pu[used], pv[used]
verts = surface(pu, pv)
verts -= (verts.max(0) + verts.min(0)) / 2

dist_edge = np.minimum(1 - np.abs(pv), np.clip(cut(pu, pv) / 0.08, 0, 1))
tip = np.maximum(ss(0.86, 1, pu) * np.abs(pv), ss(0.12, 0, pu))
flex = np.clip(1 - dist_edge + 0.5 * tip, 0, 1)
attrs = {
    "_REGION": np.where(tip > 0.4, 2, np.where(dist_edge < 0.15, 1, 0)).astype(np.float32),
    "_ANCHOR": np.exp(-(pv / 0.25) ** 2).astype(np.float32),
    "_FLEX": flex.astype(np.float32),
    "_STIFFNESS": (1 - 0.85 * flex).astype(np.float32),
    "_GUIDE": (np.abs(pv) < 1.5 / NV).astype(np.float32),
}

# ── Blender ─────────────────────────────────────────────────────────────────
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
to_b = lambda Q: np.stack([Q[:, 0], -Q[:, 2], Q[:, 1]], -1)
mesh = bpy.data.meshes.new("unbound")
mesh.from_pydata([tuple(p) for p in to_b(verts)], [], faces); mesh.update()
uv = mesh.uv_layers.new(name="UVMap")
lv = np.zeros(len(mesh.loops), np.int32); mesh.loops.foreach_get("vertex_index", lv)
uv.data.foreach_set("uv", np.stack([pu, (pv + 1) / 2], 1).astype(np.float32)[lv].ravel())
for k, a in attrs.items():
    mesh.attributes.new(name=k, type="FLOAT", domain="POINT").data.foreach_set("value", a)
mesh.polygons.foreach_set("use_smooth", [True] * len(mesh.polygons))
mat = bpy.data.materials.new("Unbound_Neutral"); mat.use_nodes = True
mat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.6, 0.6, 0.6, 1)
mesh.materials.append(mat)
obj = bpy.data.objects.new("TheUnbound", mesh); bpy.context.scene.collection.objects.link(obj)

# ── integridade ──────────────────────────────────────────────────────────────
bm = bmesh.new(); bm.from_mesh(mesh); bm.faces.ensure_lookup_table()
boundary = sum(1 for e in bm.edges if len(e.link_faces) == 1)
nonmanifold = sum(1 for e in bm.edges if len(e.link_faces) > 2)
seen, comps = set(), 0
for f in bm.faces:
    if f.index in seen: continue
    comps += 1; stack = [f]; seen.add(f.index)
    while stack:
        for e in stack.pop().edges:
            for g in e.link_faces:
                if g.index not in seen: seen.add(g.index); stack.append(g)
tree = BVHTree.FromBMesh(bm)
pairs = [(a, b) for a, b in tree.overlap(tree) if a < b and not set(x.index for x in bm.faces[a].verts) & set(x.index for x in bm.faces[b].verts)]
if "--diag" in sys.argv and pairs:
    fu = [float(np.mean([pu[x.index] for x in bm.faces[f].verts])) for a, b in pairs for f in (a, b)]
    print("DIAG u:", np.histogram(fu, bins=10, range=(0, 1))[0].tolist())
bm.free()
ext = verts.max(0) - verts.min(0)
bpy.ops.wm.save_as_mainfile(filepath=sys.argv[2], compress=True)
bpy.ops.export_scene.gltf(filepath=sys.argv[1], export_format="GLB", export_yup=True, export_normals=True,
                          export_texcoords=True, export_attributes=True, export_materials="EXPORT",
                          export_cameras=False, export_lights=False)
mesh.calc_loop_triangles()
print(json.dumps(dict(vertices=len(mesh.vertices), triangles=len(mesh.loop_triangles), components=comps,
                      boundary_edges=boundary, nonmanifold_edges=nonmanifold, self_intersections=len(pairs),
                      extent_xyz=[round(float(x), 2) for x in ext], depth_ratio=round(float(ext[2] / ext[0]), 2))))
