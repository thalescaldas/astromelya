# The Unbound Hybrid — Beyond Form (etapa C.1.1: anatomia espacial)

Geometria atual: `scripts/build_spatial.py` — curva espinhal fechada e assimétrica em 3D em torno
do vazio central + duas curvas de borda em profundidades distintas (torção alterna entre o plano do
anel e a profundidade); membranas entre as três curvas-guia relaxadas (Laplaciano, curvas fixas) →
superfícies tensionadas próximas de mínimas; extremidades em crescente nas bordas externas.
Malha única 480 × 41 (periódica), 19 680 vértices / 38 400 triângulos; bordas abertas
intencionais = as duas curvas de borda; 0 arestas não manifold; 0 auto-interseções.
Atributos: `_REGION`, `_ANCHOR`, `_FLEX`, `_STIFFNESS`, `_GUIDE` (1 nas curvas-guia); UV (u ao redor, v através).

```bash
python unbound/scripts/build_spatial.py public/lab/unbound/beyond-form.glb unbound/blender/the-unbound-beyond-form.blend
```

Laboratório: `/lab/unbound` abre em cinza neutro (clay). Versões anteriores: branches
`backup/unbound-tensioned-web-v1`, `backup/unbound-hybrid-gyroid-v1`, `backup/unbound-membranes-v1`
e `archive/`. Documentação da versão anterior (lâminas recortadas) abaixo, para referência.

---

# The Unbound Hybrid — Beyond Form (etapa C.1)

Escultura do About. Direção (Master Blueprint 02.1): **Singularity + Unknown Anatomy** —
vazio gravitacional dominante + estruturas orgânicas interconectadas + alongamento ascendente.
Estado desenvolvido: **03 — Beyond Form**. Outros estados, física, respiração e rolagem: não implementados.

Referência principal: prancha "Five states — one entity", estado 03 (`public/lab/unbound/reference/beyond-form.png`).

Protótipos anteriores preservados:
- 8 membranas em torno de núcleo (rejeitado — floral): `archive/membranes-v1/`, branch `backup/unbound-membranes-v1`.
- Giroide em envelope (a9911f0): `archive/hybrid-gyroid-v1/`, branch `backup/unbound-hybrid-gyroid-v1`.

## Estratégia: superfícies tensionadas entre contornos (geometria implícita)

Lido na referência: uma lâmina curva da qual grandes discos côncavos foram removidos — festões
entre as pontas, um anel de cavidades em lente em torno do vazio central — deixando bandas finas
e teias tensionadas; as cristas luminosas são as bordas e as dobras.

| Elemento | Construção |
|---|---|
| Lâmina | altura h(u, v): sela torcida + poço gravitacional em torno do vazio + ondulação 3φ; distância corrigida pelo gradiente (espessura constante em regiões íngremes) |
| Recortes | união suave de discos em **coordenadas de vórtice** (ângulo torcido pelo raio) → festões côncavos, cavidades em lente e pontas em crescente curvas |
| Singularity | vazio circular atravessando o centro; anel tórico une as duas camadas num poço contínuo |
| Nervuras | raios retos nas coordenadas de vórtice (= espirais reais) do anel até cada ponta, contidos no contorno — continuidade estrutural e cristas |
| Profundidade | duas camadas (frontal e posterior, girada, com outro padrão) que se sobrepõem |
| Espessura | 0,05 junto ao vazio → 0,032 nas extremidades (frontal); 0,044 → 0,030 (posterior) |
| Bordas | levemente levantadas (curl) para captar Fresnel |

Malha: marching cubes (voxel 0,0085) → Blender: fusão, remoção de fragmentos soltos, suavização
Laplaciana com preservação de volume, redução a 60 000 triângulos, UV, atributos.

### Variações estudadas (`public/lab/unbound/study/`, `?variant=A|B|C`)

| | Técnica | Resultado |
|---|---|---|
| A — Vortex Lattice | giroide em coordenadas de vórtice + poço + braços | teia densa e confusa; muitas células pequenas, sem leitura clara do vazio |
| B — Turbine Sails | só fitas torcidas em espiral | lê-se como turbina/ventilador — mecânico |
| **C — Tensioned Web** | lâminas recortadas em coordenadas de vórtice + nervuras | vazio dominante, anel de cavidades, festões e pontas em crescente → **escolhida** |

## Arquivos

```
unbound/scripts/
  hybrid_field.py   campos: lâminas, recortes, vórtice, nervuras, anel, variações A/B/C
  mesh_variant.py   avalia o campo na grade e extrai a superfície (marching cubes)
  build_hybrid.py   Blender: limpeza, redução, UV, atributos, verificações, .blend + GLB
unbound/blender/the-unbound-beyond-form.blend
public/lab/unbound/beyond-form.glb · study/beyond-form-{A,B,C}.glb · reference/beyond-form.png
```

Regenerar (Python com `bpy`, `numpy`, `scikit-image`, `scipy`):

```bash
cd unbound/scripts
python mesh_variant.py C /tmp/C.npz 0.0085
python build_hybrid.py C /tmp/C.npz ../../public/lab/unbound/beyond-form.glb ../blender/the-unbound-beyond-form.blend 60000
```

## Topologia e atributos

- Malha única contínua (fragmentos soltos removidos), 30 011 vértices / 60 000 triângulos.
- Base para morph targets futuros: os estados serão deformações desta malha (mesma ordem de vértices).
- `TEXCOORD_0` (Smart UV Project), normais suaves.
- `_REGION` 0 membrana · 1 borda tensionada · 2 extremidade; `_ANCHOR` 1 no anel do vazio;
  `_FLEX` 0 no núcleo → 1 nas pontas; `_STIFFNESS` rigidez local;
  `_GLOW` proximidade da borda da membrana (costuras luminosas); `_LAYER` 0 frontal · 1 posterior.

## Material (`src/lab/unbound/membrane.ts`, parâmetros em `config.ts` → `membrane`)

Shader próprio, mistura aditiva sem escrita de profundidade (independente de ordem → sem
artefatos de ordenação; sobreposições ficam mais densas): base tênue + Fresnel + costuras (`_GLOW`)
+ microfibras em espiral logarítmica (seguem o vórtice) + luz lateral + atenuação por profundidade;
camada posterior a 55 %.
