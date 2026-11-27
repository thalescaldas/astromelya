"""
The Unbound Hybrid — Beyond Form, anatomia espacial (curvas-guia + membranas tensionadas).

1. Esqueleto: curva espinhal fechada e assimétrica em 3D (contorna o vazio central,
   com profundidade real) e duas curvas de borda (L, R) deslocadas em direções que
   giram entre o plano do anel e o eixo de profundidade → dobras e torções.
2. Membranas: grade entre L → espinha → R, relaxada (Laplaciano) com as três
   curvas-guia fixas → superfície próxima de mínima, tensionada entre as curvas.
3. Extremidades: protuberâncias estreitas e varridas nas bordas → crescentes.

Malha única, topologia fixa (grade NU × NV, periódica em u) → pronta para morph
targets. Bordas abertas intencionais: as duas curvas de borda (L e R).
Uso: python build_spatial.py <saída.glb> <saída.blend>
"""
import json, math, sys
import numpy as np
import bpy, bmesh
from mathutils.bvhtree import BVHTree

NU, NV = 480, 41          # ao redor × através (linha 0 = L, 20 = espinha, 40 = R)
MID = NV // 2
th = np.linspace(0, 2 * np.pi, NU, endpoint=False)


def gauss(x, c, s):
    d = np.angle(np.exp(1j * (x - c)))          # distância angular periódica
    return np.exp(-(d / s) ** 2)


# ── esqueleto ────────────────────────────────────────────────────────────────
M = np.stack([
    0.64 * np.cos(th) + 0.22 * np.cos(2 * th + 0.6) + 0.06 * np.cos(3 * th + 2.0),
    0.80 * np.sin(th) + 0.12 * np.sin(2 * th + 0.2),
    0.40 * np.sin(2 * th + 0.3) + 0.08 * np.cos(3 * th + 1.0),
], -1)
T = np.roll(M, -1, 0) - np.roll(M, 1, 0); T /= np.linalg.norm(T, axis=1, keepdims=True)
c = M.mean(0)
radial = M - c; radial -= T * (radial * T).sum(1, keepdims=True); radial /= np.linalg.norm(radial, axis=1, keepdims=True)
depth = np.cross(T, radial)                    # perpendicular ao anel
# torção: a membrana alterna entre o plano do anel e a parede em profundidade
tau = 0.95 * np.sin(th + 0.4) + 0.55 * np.sin(2 * th - 0.9) + 0.25 * np.sin(5 * th + 0.3)
B = np.cos(tau)[:, None] * radial + np.sin(tau)[:, None] * depth
Nn = np.cross(T, B)

# larguras assimétricas; bordas irregulares; extremidades em crescente (lado externo)
tips = [(0.55, 0.11, 0.85), (1.7, 0.09, 0.6), (3.1, 0.2, 0.72), (4.25, 0.08, 0.6), (5.35, 0.1, 0.8)]
tipw = sum(a * gauss(th, c0, s) for c0, s, a in tips)
wL = 0.30 + 0.10 * np.sin(3 * th + 0.7) + 0.022 * np.sin(7 * th + 1.3) + tipw
wR = (0.17 + 0.05 * np.sin(2 * th + 2.2) + 0.025 * np.sin(9 * th)) * (1 - 0.6 * gauss(th, 2.3, 0.6))  # estreita onde a espinha curva forte
dL = 0.18 * np.sin(2 * th + 1.1) + 0.12 * np.sin(4 * th)          # bordas fora do plano → dobras
dR = -0.14 * np.sin(3 * th + 0.4) * (1 - 0.7 * gauss(th, 2.3, 0.6))
sweep = sum(a * 0.2 * gauss(th, c0, s * 2.0) * np.sign(np.sin(c0 * 3 + 1)) for c0, s, a in tips)
L = M + wL[:, None] * B + dL[:, None] * Nn + sweep[:, None] * T
R = M - wR[:, None] * B + dR[:, None] * Nn

# ── membranas: interpolação inicial + relaxação com as curvas-guia fixas ─────
v = np.linspace(-1, 1, NV)                    # −1 = L, 0 = espinha, +1 = R
P = np.zeros((NU, NV, 3))
for j, s in enumerate(v):
    a = abs(s)
    P[:, j] = (1 - a) * M + a * (L if s < 0 else R) + (a * (1 - a) * 0.35 * Nn * (1 if s < 0 else -1))
fixed = np.zeros(NV, bool); fixed[[0, MID, NV - 1]] = True
for _ in range(260):
    avg = 0.25 * (np.roll(P, 1, 0) + np.roll(P, -1, 0) + np.roll(P, 1, 1) + np.roll(P, -1, 1))
    P[:, ~fixed] = 0.4 * P[:, ~fixed] + 0.6 * avg[:, ~fixed]

# ── malha ────────────────────────────────────────────────────────────────────
verts = P.reshape(-1, 3)
faces = [(i * NV + j, ((i + 1) % NU) * NV + j, ((i + 1) % NU) * NV + j + 1, i * NV + j + 1)
         for i in range(NU) for j in range(NV - 1)]
U, V = np.meshgrid(th / (2 * np.pi), v, indexing="ij")
tip_f = (tipw / tipw.max())[:, None] * np.clip(-V, 0, 1)
attrs = {
    "_REGION": np.where(tip_f.ravel() > 0.35, 2, np.where(np.abs(V).ravel() > 0.85, 1, 0)).astype(np.float32),
    "_ANCHOR": np.exp(-(V / 0.2) ** 2).ravel().astype(np.float32),
    "_FLEX": np.clip(np.abs(V) + 0.4 * tip_f, 0, 1).ravel().astype(np.float32),
    "_STIFFNESS": (1 - np.clip(np.abs(V) + 0.4 * tip_f, 0, 1) * 0.85).ravel().astype(np.float32),
    "_GUIDE": np.isin(np.arange(NV), [0, MID, NV - 1])[None, :].repeat(NU, 0).ravel().astype(np.float32),
}

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
to_b = lambda Q: np.stack([Q[:, 0], -Q[:, 2], Q[:, 1]], -1)
mesh = bpy.data.meshes.new("unbound")
mesh.from_pydata([tuple(p) for p in to_b(verts)], [], faces)
mesh.update()
uv = mesh.uv_layers.new(name="UVMap")
lv = np.zeros(len(mesh.loops), np.int32); mesh.loops.foreach_get("vertex_index", lv)
UVv = np.stack([U.ravel(), (V.ravel() + 1) / 2], 1).astype(np.float32)
uv.data.foreach_set("uv", UVv[lv].ravel())
for k, a in attrs.items():
    at = mesh.attributes.new(name=k, type="FLOAT", domain="POINT"); at.data.foreach_set("value", a)
mesh.polygons.foreach_set("use_smooth", [True] * len(mesh.polygons))
mat = bpy.data.materials.new("Unbound_Neutral"); mat.use_nodes = True
mat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.6, 0.6, 0.6, 1)
mesh.materials.append(mat)
obj = bpy.data.objects.new("TheUnbound", mesh); bpy.context.scene.collection.objects.link(obj)

# ── integridade ──────────────────────────────────────────────────────────────
bm = bmesh.new(); bm.from_mesh(mesh); bm.faces.ensure_lookup_table()
boundary = sum(1 for e in bm.edges if len(e.link_faces) == 1)       # bordas abertas intencionais
nonmanifold = sum(1 for e in bm.edges if len(e.link_faces) > 2)     # defeitos
tree = BVHTree.FromBMesh(bm)
pairs = [(a, b) for a, b in tree.overlap(tree) if a < b and not set(x.index for x in bm.faces[a].verts) & set(x.index for x in bm.faces[b].verts)]
inter = len(pairs)
if "--diag" in sys.argv:
    loc = [(f // (NV - 1), f % (NV - 1)) for a, b in pairs for f in (a, b)]
    hu = np.histogram([round(math.degrees(th[i])) for i, _ in loc], bins=12, range=(0, 360))[0].tolist()
    hv = np.histogram([j for _, j in loc], bins=8, range=(0, NV - 1))[0].tolist()
    print("DIAG ângulo (30°):", hu, "| linha através (L→R):", hv)
bm.free()
ext = verts.max(0) - verts.min(0)
bpy.ops.wm.save_as_mainfile(filepath=sys.argv[2], compress=True)
bpy.ops.export_scene.gltf(filepath=sys.argv[1], export_format="GLB", export_yup=True, export_normals=True,
                          export_texcoords=True, export_attributes=True, export_materials="EXPORT",
                          export_cameras=False, export_lights=False)
mesh.calc_loop_triangles()
print(json.dumps(dict(vertices=len(mesh.vertices), triangles=len(mesh.loop_triangles), components=1,
                      boundary_edges=boundary, nonmanifold_edges=nonmanifold, self_intersections=inter,
                      extent_xyz=[round(float(x), 2) for x in ext], depth_ratio=round(float(ext[2] / ext[0]), 2))))
