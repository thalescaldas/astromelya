"""
Genesis 3D — construção no Blender (bpy).

Gera, a partir de params/genesis.json (ajustado à fotografia por fit.py):
  • blender/genesis.blend          — cena editável (modificadores não aplicados)
  • ../public/lab/genesis/genesis.glb — modelo exportado para o laboratório
  • model-manifest.json            — estrutura das malhas e contagens

Uso:  python build_blender.py   (com o módulo bpy instalado)
"""
import json, math, os, sys
import numpy as np
import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from geometry import tepal_surface, tube, ellipsoid, stem_path, stamen_paths, flower_frame, unit, smoothstep

PARAMS = os.path.join(ROOT, "params", "genesis.json")
BLEND = os.path.join(ROOT, "blender", "genesis.blend")
GLB = os.path.join(ROOT, "..", "public", "lab", "genesis", "genesis.glb")
MANIFEST = os.path.join(ROOT, "model-manifest.json")

TEPAL_RES = (72, 33)        # (u: base → ponta, v: borda → borda) da superfície média
TEPAL_THICKNESS = 0.0045    # espessura delicada (unidades de mundo; tépala ~1,3)


def to_blender(P):
    """glTF (Y para cima) → Blender (Z para cima); o exportador desfaz a conversão."""
    P = np.asarray(P)
    return np.stack([P[..., 0], -P[..., 2], P[..., 1]], axis=-1)


def grid_faces(nu, nv, wrap=False):
    faces = []
    cols = nv if wrap else nv - 1
    for i in range(nu - 1):
        for j in range(cols):
            a = i * nv + j
            b = i * nv + (j + 1) % nv
            faces.append((a, a + nv, b + nv, b))
    return faces


def make_material(name, gray, roughness, specular=0.4):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (gray, gray, gray, 1)
    bsdf.inputs["Roughness"].default_value = roughness
    if "Specular IOR Level" in bsdf.inputs:
        bsdf.inputs["Specular IOR Level"].default_value = specular
    return m


def add_mesh(name, verts, faces, parent, material, uv=None, attrs=None, smooth=True):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata([tuple(v) for v in verts], [], faces)
    mesh.update()
    if uv is not None:
        layer = mesh.uv_layers.new(name="UVMap")
        for poly in mesh.polygons:
            for li in poly.loop_indices:
                vi = mesh.loops[li].vertex_index
                layer.data[li].uv = tuple(uv[vi])
    for key, values in (attrs or {}).items():
        a = mesh.attributes.new(name=key, type="FLOAT", domain="POINT")
        a.data.foreach_set("value", np.asarray(values, dtype=np.float32))
    for p in mesh.polygons:
        p.use_smooth = smooth
    obj = bpy.data.objects.new(name, mesh)
    obj.parent = parent
    obj.data.materials.append(material)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def main():
    prm = json.load(open(PARAMS))
    g = prm["global"]
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.preferences.filepaths.save_version = 0  # sem cópias .blend1
    scene = bpy.context.scene

    root = bpy.data.objects.new("Genesis", None)
    scene.collection.objects.link(root)

    mat_petal = make_material("Genesis_Neutral_Petal", 0.72, 0.55)
    mat_stem = make_material("Genesis_Neutral_Stem", 0.55, 0.6)
    mat_stamen = make_material("Genesis_Neutral_Stamen", 0.68, 0.5)
    mat_anther = make_material("Genesis_Neutral_Anther", 0.16, 0.7)

    manifest = {"units": "metros (escala arbitrária; tépala ≈ 1,3)", "up": "+Y (glTF)", "meshes": []}

    # ── tépalas: malhas independentes, espessura por Solidify (não aplicado no .blend) ──
    nu, nv = TEPAL_RES
    for i, (name, p) in enumerate(prm["tepals"].items()):
        P, U, V = tepal_surface(p, g, nu=nu, nv=nv, seed=i)
        verts = to_blender(P.reshape(-1, 3))
        faces = grid_faces(nu, nv)
        uv = np.stack([(V.reshape(-1) + 1) / 2, U.reshape(-1)], axis=1)
        u = U.reshape(-1)
        anchor = 1.0 - smoothstep(0.04, 0.14, u)       # 1 = fixo na base
        flex = smoothstep(0.08, 1.0, u) ** 1.2          # 0 = rígido … 1 = ponta livre
        edge = np.abs(V.reshape(-1))                     # 0 = nervura … 1 = borda
        obj = add_mesh(
            f"petal_{name}_{p['whorl']}", verts, faces, root, mat_petal, uv=uv,
            attrs={"_anchor": anchor, "_flex": flex, "_edge": edge},
        )
        mod = obj.modifiers.new("Espessura", "SOLIDIFY")
        mod.thickness = TEPAL_THICKNESS
        mod.offset = 0.0
        mod.use_rim = True
        mod.use_even_offset = True
        manifest["meshes"].append({"name": obj.name, "kind": "tepal", "whorl": p["whorl"],
                                   "grid": [nu, nv], "thickness": TEPAL_THICKNESS})

    # ── receptáculo / ovário ──
    A, R0 = flower_frame(g)
    base = np.array(g["base"])
    E = ellipsoid(base - A * 0.05, A, 0.16, 0.05, nu=18, nv=20)
    add_mesh("receptacle", to_blender(E.reshape(-1, 3)), grid_faces(E.shape[0], E.shape[1], wrap=True), root, mat_stem)
    manifest["meshes"].append({"name": "receptacle", "kind": "receptacle"})

    # ── caule ──
    path = stem_path(g)
    r = g["stem"]["radius"] * (1.0 + 0.25 * np.linspace(0, 1, len(path)))
    T = tube(path, r, nseg=18)
    add_mesh("stem", to_blender(T.reshape(-1, 3)), grid_faces(T.shape[0], T.shape[1], wrap=True), root, mat_stem)
    manifest["meshes"].append({"name": "stem", "kind": "stem"})

    # ── estames: filetes + anteras ──
    for k, sp in enumerate(stamen_paths(prm["stamens"], g), start=1):
        rr = np.linspace(0.0075, 0.005, len(sp))
        T = tube(sp, rr, nseg=10)
        add_mesh(f"stamen_{k}", to_blender(T.reshape(-1, 3)), grid_faces(T.shape[0], T.shape[1], wrap=True), root, mat_stamen)
        tip_dir = unit(sp[-1] - sp[-4])
        side = unit(np.cross(tip_dir, A))
        an = ellipsoid(sp[-1] + tip_dir * 0.01, unit(tip_dir * 0.35 + side), 0.11, 0.019, nu=16, nv=14)
        add_mesh(f"anther_{k}", to_blender(an.reshape(-1, 3)), grid_faces(an.shape[0], an.shape[1], wrap=True), root, mat_anther)
        manifest["meshes"].append({"name": f"stamen_{k}", "kind": "filament"})
        manifest["meshes"].append({"name": f"anther_{k}", "kind": "anther"})

    # ── estilete + estigma trífido ──
    style_p = stamen_paths([{"azimuth": -30, "length": 0.78, "spread": 0.1, "lift": 0.03}], g)[0]
    T = tube(style_p, np.linspace(0.008, 0.006, len(style_p)), nseg=10)
    add_mesh("style", to_blender(T.reshape(-1, 3)), grid_faces(T.shape[0], T.shape[1], wrap=True), root, mat_stamen)
    tip, d = style_p[-1], unit(style_p[-1] - style_p[-4])
    ex = unit(np.cross(d, A)); ey = np.cross(d, ex)
    for k in range(3):
        a = k * 2 * math.pi / 3
        out = unit(math.cos(a) * ex + math.sin(a) * ey)
        lobe = np.array([tip + d * 0.01 * s + out * 0.035 * s - d * 0.012 * s * s for s in np.linspace(0, 1, 10)])
        T = tube(lobe, np.linspace(0.005, 0.0025, len(lobe)), nseg=8)
        add_mesh(f"stigma_{k + 1}", to_blender(T.reshape(-1, 3)), grid_faces(T.shape[0], T.shape[1], wrap=True), root, mat_stamen)
    manifest["meshes"].append({"name": "style", "kind": "style"})
    manifest["meshes"] += [{"name": f"stigma_{k}", "kind": "stigma_lobe"} for k in (1, 2, 3)]

    # ── salvar .blend e exportar GLB ──
    os.makedirs(os.path.dirname(BLEND), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=BLEND, compress=True)
    os.makedirs(os.path.dirname(GLB), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=GLB, export_format="GLB", export_apply=True, export_yup=True,
        export_normals=True, export_texcoords=True, export_attributes=True,
        export_materials="EXPORT", export_cameras=False, export_lights=False,
    )

    # contagens finais (malhas avaliadas = como exportadas)
    dg = bpy.context.evaluated_depsgraph_get()
    tv = tt = 0
    for entry in manifest["meshes"]:
        ob = bpy.data.objects[entry["name"]].evaluated_get(dg)
        me = ob.to_mesh()
        me.calc_loop_triangles()
        entry["vertices"] = len(me.vertices)
        entry["triangles"] = len(me.loop_triangles)
        tv += entry["vertices"]; tt += entry["triangles"]
        ob.to_mesh_clear()
    manifest["totals"] = {"meshes": len(manifest["meshes"]), "vertices": tv, "triangles": tt}
    manifest["attributes"] = {
        "_anchor": "1 na base da tépala (fixa), 0 a partir de ~14% do comprimento",
        "_flex": "0 rígido na base → 1 na ponta (flexibilidade para deformação)",
        "_edge": "0 na nervura central → 1 nas bordas",
        "TEXCOORD_0": "u = posição ao longo da largura (0–1), v = base → ponta (0–1)",
    }
    json.dump(manifest, open(MANIFEST, "w"), indent=2, ensure_ascii=False)
    print(json.dumps(manifest["totals"]))


if __name__ == "__main__":
    main()
