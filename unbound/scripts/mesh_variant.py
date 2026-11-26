"""Avalia o campo numa grade e extrai a superfície (marching cubes). Salva .npz."""
import sys, os, time
import numpy as np
from skimage.measure import marching_cubes
sys.path.insert(0, os.path.dirname(__file__))
import hybrid_field as H

name, out = sys.argv[1], sys.argv[2]
voxel = float(sys.argv[3]) if len(sys.argv) > 3 else 0.011
V = H.variant(name)
lo = np.array([-1.45, -1.55, -1.0]); hi = np.array([1.45, 1.75, 1.0])
xs, ys, zs = (np.arange(lo[i], hi[i] + voxel, voxel) for i in range(3))
t0 = time.time()
F = np.empty((len(xs), len(ys), len(zs)), np.float32)
Yg, Zg = np.meshgrid(ys, zs, indexing="ij")
for i, x in enumerate(xs):                         # fatia a fatia (memória controlada)
    F[i] = H.field(np.full_like(Yg, x), Yg, Zg, V)
verts, faces, normals, _ = marching_cubes(F, 0.0, spacing=(voxel,) * 3)
verts += lo
np.savez_compressed(out, verts=verts.astype(np.float32), faces=faces.astype(np.int32))
print(f"{name}: grade {F.shape} | {len(verts)} vértices, {len(faces)} triângulos | {time.time()-t0:.0f}s")
