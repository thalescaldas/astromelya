# Laboratório Genesis 3D

Rota isolada `/lab/genesis` (não indexada, sem links públicos).

## Modos (somente via URL; o padrão não tem controles visíveis)

| URL | Modo |
|---|---|
| `/lab/genesis` ou `?view=model` | modelo 3D, câmera fixa |
| `?view=reference` | fotografia original |
| `?view=wireframe` | topologia |
| `?view=compare` | fotografia × modelo, lado a lado |
| `?view=inspect` | rotação e zoom livres (arrastar / rolar) |

## Arquivos

- `config.ts` — câmera (idêntica à do ajuste em `genesis3d/`), luzes, materiais neutros;
  parâmetros planejados de interação e elasticidade (ainda não usados).
- `types.ts` — contrato `LabStage`.
- `stages/three.ts` — cena Three.js real com o GLB (carregada por `import()` dinâmico;
  nunca entra no pacote da Home). Renderização sob demanda.
- `GenesisLab.tsx` — escolhe o modo pela URL e monta os painéis.

Modelo: `public/lab/genesis/genesis.glb`, gerado por `genesis3d/scripts/build_blender.py`.
Sem física de contato nesta etapa.
