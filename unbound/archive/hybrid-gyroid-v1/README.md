# The Unbound Hybrid — Beyond Form (etapa C.1)

Escultura do About. Direção: **Singularity + Unknown Anatomy + Ascension**.
Estado desenvolvido: **03 — Beyond Form** (expansão máxima). Os outros quatro estados,
a física, a respiração e a rolagem ainda **não** foram implementados.

Protótipo anterior (8 membranas em torno de um núcleo — rejeitado por lembrar uma flor):
`archive/membranes-v1/` e branch `backup/unbound-membranes-v1`.

## Estratégia de modelagem: geometria implícita (campos de distância)

| Etapa | Técnica |
|---|---|
| Superfície principal | **folha de superfície mínima** (giroide, ~2 células) com o domínio deformado: alongamento vertical, torção, curvatura em S e ondulação de baixa frequência |
| Envelope | lobos elipsoidais em S + chifres afilados (crescentes); a folha é recortada pelo envelope com *smooth max* → bordas arredondadas e tensionadas |
| Vazio principal | elipsoide subtraído no centro (Singularity) |
| Extremidades | a folha preenche os chifres e se estreita até a ponta; um filete fino ao longo de cada chifre garante a continuidade |
| Espessura | variável: ~0,058 no núcleo → ~0,030 nas regiões externas |
| Malha | marching cubes (voxel 0,012) → Blender: fusão, remoção de fragmentos, suavização Laplaciana com preservação de volume, redução a 60 000 triângulos, UV (Smart UV Project), atributos |

A superfície mínima produz naturalmente o que a referência pede: cavidades reais que
atravessam a entidade, selas tensionadas, conexões entre regiões e um corpo contínuo.

### Variações estudadas (`public/lab/unbound/study/`, `?variant=A|B|C`)

| | Superfície | Resultado |
|---|---|---|
| **A — Singularity** | giroide + vazio central | vazio dominante + cavidades secundárias, conexões contínuas → **escolhida** |
| B — Lattice | Schwarz P | cavidades regulares e arredondadas demais; lembra estrutura industrial |
| C — Ascension | giroide alongado e mais torcido | fragmenta-se em "cortinas"; perde o vazio dominante |

Também foi testada (e descartada) uma casca perfurada de envelope convexo: lia-se como
uma cápsula com furos e chifres.

## Arquivos

```
unbound/
├── scripts/
│   ├── hybrid_field.py   campos: TPMS, deformação, envelope, chifres, vazio, variações
│   ├── mesh_variant.py   avalia o campo na grade e extrai a superfície (marching cubes)
│   └── build_hybrid.py   Blender: limpeza, redução, UV, atributos, verificações, .blend + GLB
├── blender/the-unbound-beyond-form.blend
└── archive/membranes-v1/ protótipo anterior (scripts, .blend, GLB)
public/lab/unbound/
├── beyond-form.glb       modelo do laboratório
├── study/beyond-form-{A,B,C}.glb
└── reference/beyond-form.png  recorte da prancha oficial (somente laboratório)
```

Regenerar (Python com `bpy`, `numpy`, `scikit-image`):

```bash
cd unbound/scripts
python mesh_variant.py A /tmp/A.npz 0.012
python build_hybrid.py A /tmp/A.npz ../../public/lab/unbound/beyond-form.glb ../blender/the-unbound-beyond-form.blend 60000
```

## Topologia e atributos (preparação para morph targets e física)

- Malha única, contínua, triangular, 29 986 vértices / 60 000 triângulos; 0 arestas não
  manifold; 0 pares de faces com auto-interseção (verificado no build).
- Futuros estados = deformações desta mesma malha (mesma ordem de vértices); a geometria
  atual é a geometria de repouso.
- `TEXCOORD_0`: ilhas contínuas (Smart UV Project).
- `_REGION`: 0 = membrana, 1 = borda tensionada (recorte do envelope/vazio), 2 = extremidade.
- `_ANCHOR`: 1 no núcleo denso (centro) → 0 a ~0,5 unidade.
- `_FLEX`: 0 no núcleo → 1 nas extremidades.
- `_STIFFNESS`: rigidez local (núcleo e bordas mais rígidos).

## Material translúcido preliminar (`src/lab/unbound/membrane.ts`)

Shader próprio, mistura **aditiva sem escrita de profundidade** (independente de ordem →
sem artefatos de ordenação de transparência; camadas sobrepostas ficam mais densas):
densidade base baixa + Fresnel (bordas e superfícies rasantes) + microfibras direcionais
(listras seguindo a torção da entidade) + luz lateral suave + atenuação por profundidade.
Parâmetros em `src/lab/unbound/config.ts` (`membrane`).
