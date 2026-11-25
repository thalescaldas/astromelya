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
src/components/intro           introdução (~4,3 s): cena WebGL única (IntroScene) e shaders
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

### Introdução

- Toca uma vez por sessão do navegador, apenas ao entrar pela Home.
- Para assistir de novo: `http://localhost:3000/?intro`.
- Clique, toque ou qualquer tecla aceleram até o fim.
- Com `prefers-reduced-motion: reduce`, a introdução não é exibida.
- Configuração em `src/config/evolution.ts` → `animations.intro` (`enabled`, `durationMs`, `oncePerSession`).
