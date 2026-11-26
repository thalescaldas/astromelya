# Laboratório Genesis 3D

Rota isolada `/lab/genesis` (não indexada, sem links públicos) para desenvolver
a futura Genesis tridimensional com deformação física localizada das pétalas.

## Estado atual (preparação)

- Tela cheia, fundo preto absoluto, câmera fixa, sem cabeçalho, sem partículas.
- Referência visual: `genesis.webp` centralizada.
- `config.ts` — parâmetros planejados (câmera, renderizador, modelo, luzes,
  materiais, raycasting, elasticidade). Ainda não utilizados.
- `types.ts` — contrato `LabStage` (resize/dispose).
- `stages/reference.ts` — estágio atual (fotografia).

## Próximas etapas (após aprovação)

1. `stages/three.ts` — cena Three.js carregada por `import()` dinâmico (fora
   do pacote da Home); câmera fixa a partir de `LAB_GENESIS.camera`.
2. Carregamento do modelo glTF (`LAB_GENESIS.model`) com nós segmentados
   (pétalas, caule, estames).
3. Iluminação e materiais (`lighting`, `materials`), calibrados contra a
   fotografia de referência.
4. Raycasting do cursor/toque (`interaction`).
5. Deformação de vértices localizada e simulação elástica (`elasticity`),
   preferencialmente em shader (vertex) para não alocar por quadro.

Dependência já presente no projeto: `three`. Nenhuma outra foi instalada.
