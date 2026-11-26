# Genesis 3D — modelagem

Modelo tridimensional da Genesis construído **no Blender** (módulo `bpy`, Blender 5.3)
por scripts Python, ajustado à fotografia oficial `public/flowers/genesis.webp`.

> **Estado: protótipo.** A geometria é real (superfícies 3D com espessura, malhas
> independentes, topologia preparada para deformação), mas ainda não é o modelo
> definitivo. Ver "Limitações" no relatório da fase 03.3.2.

## Estrutura

```
genesis3d/
├── scripts/
│   ├── geometry.py        superfícies paramétricas (tépalas, tubos, elipsoides) + câmera
│   ├── fit.py             ajuste à fotografia (silhueta, pontos anatômicos, regiões por tépala)
│   ├── overlay.py         sobreposição diagnóstica modelo × foto
│   └── build_blender.py   constrói a cena no Blender, salva .blend e exporta GLB
├── params/
│   ├── initial.json       leitura anatômica inicial da fotografia (alvos e parâmetros)
│   └── genesis.json       parâmetros ajustados (fonte do modelo)
├── blender/genesis.blend  cena editável (modificador Solidify não aplicado)
└── model-manifest.json    malhas, contagens e atributos

public/lab/genesis/genesis.glb   modelo exportado (usado só em /lab/genesis)
```

## Regenerar

Requer Python 3.13 com `bpy`, `numpy` e `opencv-python-headless` (fora do projeto web):

```bash
cd genesis3d/scripts
python fit.py ../../public/flowers/genesis-mask.png ../params/genesis.json ../params/genesis.json 3000
python build_blender.py
```

## Anatomia modelada (leitura da fotografia)

| Malha | Estrutura |
|---|---|
| `petal_A_outer` | tépala externa superior esquerda, recurvada para trás |
| `petal_B_inner` | tépala interna superior (manchada na foto), voltada ao observador |
| `petal_C_outer` | tépala externa direita, borda ondulada |
| `petal_D_outer` | tépala externa inferior direita, pendente |
| `petal_E_inner` | tépala interna frontal esquerda, dobrada (vista pelo dorso) |
| `petal_F_inner` | sexta tépala, oculta atrás de B/C |
| `stamen_1…6` + `anther_1…6` | filetes arqueados + anteras alongadas |
| `style` + `stigma_1…3` | estilete com estigma trífido |
| `receptacle`, `stem` | ovário/receptáculo e caule |

## Preparação para deformação

- Cada tépala é uma malha independente: grade regular 72 × 33 (superfície média) com
  espessura de 0,0045 (Solidify), UV contínuo (u = largura, v = base → ponta).
- Atributos por vértice (glTF): `_ANCHOR` (1 = base fixa), `_FLEX` (0 rígido → 1 ponta),
  `_EDGE` (0 nervura → 1 borda), além de `NORMAL` e `TEXCOORD_0`.
- A geometria de repouso é a própria posição exportada: em tempo de execução, cloná-la
  em `restPosition` antes de deformar (recuperação elástica).
