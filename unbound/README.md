# The Unbound — escultura orgânica do About

Entidade tridimensional abstrata (Organic + Ethereal) baseada na concept art oficial.
Gerada no Blender (módulo `bpy`) por scripts Python. **Estado: protótipo de geometria**
(material neutro provisório; sem texturas, física, respiração ou rolagem).

Separado da Genesis: nada aqui é usado pela Home nem pelo About público.

## Arquivos

```
unbound/
├── scripts/
│   ├── geometry.py       geometria paramétrica: núcleo + 8 membranas, 5 estados
│   ├── build_blender.py  cena Blender (Basis + 4 shape keys) e exportação GLB
│   └── check.py          morph targets (contagem, NaN, normais) e interseções
├── blender/unbound.blend malha única editável com shape keys
└── model-manifest.json   contagens, estados e atributos
public/lab/unbound/unbound.glb   modelo com 4 morph targets (posição + normal)
```

Regenerar (Python com `bpy`, `numpy`, `scipy`):

```bash
cd unbound/scripts
python build_blender.py
python check.py ../../public/lab/unbound/unbound.glb
```

## Anatomia

| Parte | Descrição |
|---|---|
| Núcleo | haste curta e afilada (quase oculta) de onde todas as membranas nascem — continuidade anatômica |
| Membranas 1–3 | externas, longas e largas (L ≈ 1,4–1,55) |
| Membranas 4–6 | intermediárias (L ≈ 1,05–1,15) |
| Membranas 7–8 | internas, pequenas (L ≈ 0,75–0,8) |

Cada membrana: lâmina com espessura real (face superior, inferior e borda fechada), largura em
chama (máximo a ~25–30 % do comprimento, ponta longa), concha transversal, ondulações nas bordas,
contracurva em S e gancho na extremidade, nervura central e fibras longitudinais em relevo.
Espessura variável: ~0,013 na raiz e na nervura → ~0,001 nas bordas e na ponta.

## Estados (mesma topologia e ordem de vértices)

| Estado | Shape key / morph target | Forma |
|---|---|---|
| Origin | Basis (sem morph) | botão compacto em chama; membranas em camadas envolvendo o núcleo |
| Essence | `essence` (índice 0) | primeiras membranas se abrem para a direita; interior revelado |
| Beyond Form | `beyond_form` (1) | expansão máxima, assimétrica, membranas em várias direções com pontas em gancho |
| Metamorphosis | `metamorphosis` (2) | torção dos azimutes; metade das membranas dobra sobre a entidade |
| The Unknown | `unknown` (3) | alongada e ascendente, membranas estreitas como fumaça |

Os morph targets são relativos à Basis. Estado k: influência 1 no índice k; transições:
interpolação linear entre os pesos de estados vizinhos.

## Topologia e atributos de deformação

- Malha única `unbound`: 22 192 vértices, 39 644 triângulos.
- Membrana: grade regular 52 (raiz → ponta) × 23 (borda → borda), face superior e inferior
  com vértices próprios na borda (sombreamento nítido). Núcleo: 40 × 18.
- `TEXCOORD_0`: u = largura (0–1), v = raiz → ponta (0–1), contínuo por membrana.
- `_MEMBRANE` (0 = núcleo, 1–8), `_ANCHOR` (1 na raiz), `_FLEX` (0 raiz → 1 ponta),
  `_EDGE` (0 nervura → 1 borda), `_STIFFNESS` (rigidez local).
- Geometria de repouso = posição do estado atual (base + morph); a física futura somará
  deslocamentos a ela, permitindo combinar metamorfose e deformação.
