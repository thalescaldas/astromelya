# Astromelya

astromelya.com

## Fase 01 — Fundação e Home

Next.js (App Router) · TypeScript · CSS puro (CSS Modules + tokens globais) · GSAP e Three.js instalados para as próximas fases.

### Desenvolvimento

```bash
npm install
npm run dev        # http://localhost:3000
```

### Verificações

```bash
npm run typecheck
npm run lint
npm run build && npm run start
```

### Estrutura

```
public/brand, public/flowers   recursos oficiais (não modificar)
src/app                        rotas (/ e /projetos), layout e metadados
src/components/header          símbolo + botão Projetos
src/components/flower          flor protagonista
src/components/intro           introdução (8 s): cena WebGL única (IntroScene) e shaders
src/components/particles       rasterização e amostragem dos SVGs oficiais
src/components/gallery         (reservado) galeria de projetos
src/components/transitions     (reservado) transições entre páginas
src/animations                 linha do tempo principal (GSAP), mapa de tempos, script de boot e tokens
src/config/evolution.ts        sistema evolutivo — fase ativa definida manualmente
src/config/site.ts             dados institucionais e rotas
src/projects                   registro de projetos (vazio)
src/styles                     tokens e estilos globais
```

### Trocar a fase visual

Em `src/config/evolution.ts`, altere `ACTIVE_PHASE_ID` para `"metamorphosis"`.

### Entrada da Home

- A Home abre diretamente: cabeçalho com o wordmark oficial e o botão Projetos.
- **Florescimento de Genesis** (`src/animations/bloom.ts`): o vídeo `public/flowers/genesis-growth.mp4`
  toca sobre a imagem oficial assim que estiver pronto — uma vez por sessão; `/?intro` reproduz novamente.
  Com `prefers-reduced-motion`, a flor completa aparece diretamente (o vídeo nem é baixado).
- O vídeo foi reconstruído no espaço da fotografia (1672×941): alinhamento ECC, tom monocromático com
  preto absoluto e, no último 1,25 s, morph por fluxo óptico até `genesis.webp`. Os 0,5 s finais são a
  própria fotografia, estática; a troca para a `<img>` acontece nesse trecho.
- Sem vídeo (rede, codec, autoplay bloqueado), a imagem oficial é revelada diretamente.

### Genesis viva (Fase 03)

- **Partículas permanentes** (`src/animations/field.ts`, `src/components/particles/GenesisField.tsx`):
  uma camada Canvas 2D sobre a fotografia, recortada a cada quadro pela máscara de oclusão
  `public/flowers/genesis-mask.png` (silhueta de pétalas, caule e estames gerada a partir de
  `genesis.webp`) — todas as partículas e halos ficam atrás da flor. Órbitas elípticas inclinadas,
  ondulação orgânica, cintilação lenta e profundidade contínua.
- **Surgimento gradual**: após o florescimento, a Home começa sem partículas; elas nascem uma a uma ao
  longo de 180 s de permanência visível (`progress = (elapsed / 180)^1.4`), cada uma com fade-in de
  4–8 s e já em órbita. O tempo só conta com a Home aberta e visível, é preservado na sessão
  (`sessionStorage`) ao navegar e recomeça em uma nova sessão.
- **Parallax** em três profundidades (partículas distantes, flor, partículas próximas), com interpolação
  exponencial e limite circular. O cabeçalho é estático.
- **Gravidade secreta**: pressionar e segurar a flor (mouse ou toque) atrai as partículas para o coração
  da flor; ao soltar, retornam às órbitas. Integração com mola criticamente amortecida: posição e
  velocidade contínuas.
- **Parâmetros**: `src/config/field.ts` (quantidade, tamanhos, órbitas, parallax, gravidade, desempenho).
- Ciclo único `requestAnimationFrame`, sem estado React por quadro; pausa com a aba oculta; recursos
  liberados ao sair da Home. Movimento reduzido: quadro estático, sem parallax nem gravidade.

### Introdução cinematográfica (descontinuada)

Os arquivos da antiga introdução (nome → partículas → símbolo) foram preservados em
`src/components/intro`, `src/components/particles` e `src/animations/intro*.ts`, mas não são importados
nem carregados (`animations.intro.enabled: false` em `src/config/evolution.ts`).
