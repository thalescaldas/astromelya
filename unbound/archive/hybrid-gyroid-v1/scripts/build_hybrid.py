"""
The Unbound Hybrid — Beyond Form: construção no Blender a partir do campo implícito.

  python build_hybrid.py <variante> <malha.npz> <saída.glb> [<saída.blend>] [triângulos-alvo]

Etapas: importa a superfície (marching cubes) → funde vértices → remove fragmentos →
suaviza (Laplaciano leve, preserva volume) → reduz para o alvo (colapso de arestas,
triângulos regulares) → normais suaves → UV (Smart UV Project, ilhas contínuas) →
atributos de deformação calculados a partir dos componentes do campo → exporta GLB.
"""
import json, os, sys
import numpy as np
import bpy, bmesh

HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import hybrid_field as H

name, npz, glb = sys.argv[1:4]
blend = sys.argv[4] if len(sys.argv) > 4 and sys.argv[4] != "-" else None
target = int(sys.argv[5]) if len(sys.argv) > 5 else 60000


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)


bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
data = np.load(npz)
V, F = data["verts"].astype(np.float64), data["faces"]
to_b = lambda P: np.stack([P[:, 0], -P[:, 2], P[:, 1]], -1)       # glTF → Blender (Z para cima)
from_b = lambda P: np.stack([P[:, 0], P[:, 2], -P[:, 1]], -1)

mesh = bpy.data.meshes.new("unbound"); mesh.from_pydata([tuple(v) for v in to_b(V)], [], [tuple(f) for f in F]); mesh.update()
obj = bpy.data.objects.new("TheUnbound", mesh); bpy.context.scene.collection.objects.link(obj)
bpy.context.view_layer.objects.active = obj; obj.select_set(True)

bm = bmesh.new(); bm.from_mesh(mesh)
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
# remove fragmentos soltos (ilhas muito pequenas do marching cubes)
seen, islands = set(), []
for f in bm.faces:
    if f.index in seen: continue
    stack, isl = [f], []
    seen.add(f.index)
    while stack:
        g = stack.pop(); isl.append(g)
        for e in g.edges:
            for h in e.link_faces:
                if h.index not in seen: seen.add(h.index); stack.append(h)
    islands.append(isl)
islands.sort(key=len, reverse=True)
removed = 0
for isl in islands[1:]:
    if len(isl) < 0.10 * len(islands[0]):   # remove fragmentos flutuantes (< 10% do corpo)
        bmesh.ops.delete(bm, geom=isl, context="FACES"); removed += len(isl)
bm.to_mesh(mesh); bm.free()

def apply(mod):
    bpy.ops.object.modifier_apply(modifier=mod.name)

m = obj.modifiers.new("smooth", "LAPLACIANSMOOTH"); m.lambda_factor = 0.35; m.iterations = 2; m.use_volume_preserve = True; apply(m)
tris = sum(len(p.vertices) - 2 for p in mesh.polygons)
m = obj.modifiers.new("reduce", "DECIMATE"); m.ratio = min(1.0, target / max(tris, 1)); m.use_collapse_triangulate = True; apply(m)
m = obj.modifiers.new("relax", "LAPLACIANSMOOTH"); m.lambda_factor = 0.2; m.iterations = 1; m.use_volume_preserve = True; apply(m)
mesh.polygons.foreach_set("use_smooth", [True] * len(mesh.polygons)); mesh.update()

# UV contínuas por ilha
bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.uv.smart_project(angle_limit=1.15, island_margin=0.004)
bpy.ops.object.mode_set(mode="OBJECT")

# atributos de deformação a partir do campo
co = np.zeros(len(mesh.vertices) * 3); mesh.vertices.foreach_get("co", co)
P = from_b(co.reshape(-1, 3))
Vn = H.variant(name)
_, parts = H.field(P[:, 0], P[:, 1], P[:, 2], Vn, parts=True)
center = np.array([-0.05, 0.05, 0.0])
dist = np.linalg.norm(P - center, axis=1)
is_spike = parts["horns"] < -0.01                                     # dentro dos chifres: extremidades
# bordas: onde o envelope ou o vazio principal recortam a folha (arestas tensionadas)
rim = 1 - smoothstep(0.0, 0.05, np.minimum(np.abs(parts["env"]), np.abs(parts["cut"])))
region = np.where(is_spike, 2, np.where(rim > 0.5, 1, 0)).astype(np.float32)
anchor = (1 - smoothstep(0.18, 0.5, dist)).astype(np.float32)
flex = np.clip(smoothstep(0.2, 1.3, dist) + 0.35 * is_spike, 0, 1).astype(np.float32)
stiff = np.clip((1 - flex) * 0.75 + 0.25 * rim + 0.05, 0, 1).astype(np.float32)
for k, v in (("_REGION", region), ("_ANCHOR", anchor), ("_FLEX", flex), ("_STIFFNESS", stiff)):
    a = mesh.attributes.new(name=k, type="FLOAT", domain="POINT"); a.data.foreach_set("value", v)

# ── integridade: arestas não manifold, auto-interseções, normais ──
from mathutils.bvhtree import BVHTree
bm = bmesh.new(); bm.from_mesh(mesh); bm.faces.ensure_lookup_table()
non_manifold = sum(1 for e in bm.edges if not e.is_manifold)
tree = BVHTree.FromBMesh(bm)
inter = 0
for a, b in tree.overlap(tree):
    if a < b and not (set(v.index for v in bm.faces[a].verts) & set(v.index for v in bm.faces[b].verts)):
        inter += 1
bm.free()
mesh.calc_loop_triangles()

mat = bpy.data.materials.new("Unbound_Membrane"); mat.use_nodes = True
mat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.85, 0.85, 0.85, 1)
mesh.materials.append(mat)

if blend:
    os.makedirs(os.path.dirname(blend), exist_ok=True); bpy.ops.wm.save_as_mainfile(filepath=blend, compress=True)
os.makedirs(os.path.dirname(glb), exist_ok=True)
bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", export_yup=True, export_apply=True, export_normals=True,
                          export_texcoords=True, export_attributes=True, export_materials="EXPORT",
                          export_cameras=False, export_lights=False, export_morph=False)
mesh.calc_loop_triangles()
info = dict(variant=name, vertices=len(mesh.vertices), triangles=len(mesh.loop_triangles), islands_removed_faces=removed,
            non_manifold_edges=non_manifold, self_intersecting_face_pairs=inter,
            region_counts={int(k): int((region == k).sum()) for k in (0, 1, 2)})
print(json.dumps(info))
