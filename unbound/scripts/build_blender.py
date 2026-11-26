"""
The Unbound — construção no Blender (bpy) e exportação.

  • ../blender/unbound.blend               cena editável: 1 malha, Basis = Origin + 4 shape keys
  • ../../public/lab/unbound/unbound.glb   glTF com 4 morph targets (posição + normal)
  • ../model-manifest.json                 contagens, estados, atributos
"""
import json, os, sys
import numpy as np
import bpy

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import geometry as G

BLEND = os.path.join(ROOT, "blender", "unbound.blend")
GLB = os.path.join(ROOT, "..", "public", "lab", "unbound", "unbound.glb")
MANIFEST = os.path.join(ROOT, "model-manifest.json")


def to_blender(P):
    return np.stack([P[:, 0], -P[:, 2], P[:, 1]], axis=-1)


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.preferences.filepaths.save_version = 0
    builds = {s: G.build(s) for s in G.STATES}
    verts, faces, uv, attrs = builds["origin"]

    mesh = bpy.data.meshes.new("unbound")
    mesh.from_pydata([tuple(v) for v in to_blender(verts)], [], faces)
    mesh.update()
    layer = mesh.uv_layers.new(name="UVMap")
    loops_v = np.zeros(len(mesh.loops), np.int32); mesh.loops.foreach_get("vertex_index", loops_v)
    layer.data.foreach_set("uv", uv[loops_v].astype(np.float32).ravel())
    for k, val in attrs.items():
        a = mesh.attributes.new(name=k, type="FLOAT", domain="POINT")
        a.data.foreach_set("value", val.astype(np.float32))
    mesh.polygons.foreach_set("use_smooth", [True] * len(mesh.polygons))

    mat = bpy.data.materials.new("Unbound_Neutral"); mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (0.7, 0.7, 0.7, 1); bsdf.inputs["Roughness"].default_value = 0.5
    mesh.materials.append(mat)

    obj = bpy.data.objects.new("Unbound", mesh)
    bpy.context.scene.collection.objects.link(obj)
    # shape keys: Basis = Origin; demais estados absolutos (mesma ordem de vértices)
    obj.shape_key_add(name="origin", from_mix=False)
    for s in G.STATES[1:]:
        kb = obj.shape_key_add(name=s, from_mix=False)
        kb.data.foreach_set("co", to_blender(builds[s][0]).astype(np.float32).ravel())
        kb.value = 0.0

    os.makedirs(os.path.dirname(BLEND), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=BLEND, compress=True)
    os.makedirs(os.path.dirname(GLB), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=GLB, export_format="GLB", export_yup=True, export_apply=False,
        export_normals=True, export_texcoords=True, export_attributes=True,
        export_morph=True, export_morph_normal=True, export_morph_tangent=False,
        export_materials="EXPORT", export_cameras=False, export_lights=False,
    )
    me = obj.data; me.calc_loop_triangles()
    manifest = {
        "entity": "The Unbound", "units": "escala arbitrária (entidade ≈ 2 unidades)", "up": "+Y (glTF)",
        "mesh": "unbound (malha única)", "vertices": len(me.vertices), "triangles": len(me.loop_triangles),
        "membranes": len(G.MEMBRANES), "membrane_grid": [G.NU, G.NV], "core_grid": [G.CORE_NU, G.CORE_NV],
        "states": {"basis": "origin", "morph_targets": G.STATES[1:]},
        "attributes": {
            "_MEMBRANE": "0 = núcleo; 1–8 = membrana",
            "_ANCHOR": "1 na raiz (fixa) → 0 a partir de ~12% do comprimento",
            "_FLEX": "0 rígido na raiz → 1 na extremidade",
            "_EDGE": "0 na nervura central → 1 na borda",
            "_STIFFNESS": "rigidez local (raiz e nervura mais rígidas; bordas e pontas flexíveis)",
            "TEXCOORD_0": "u = largura (0–1), v = raiz → ponta (0–1), contínuo por membrana",
        },
    }
    json.dump(manifest, open(MANIFEST, "w"), indent=2, ensure_ascii=False)
    print(json.dumps({k: manifest[k] for k in ("vertices", "triangles", "membranes")}))


if __name__ == "__main__":
    main()
