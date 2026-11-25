# Astromelya

Universo criativo independente — astromelya.com

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
src/components/intro           (reservado) introdução ~3 s
src/components/particles       (reservado) partículas Three.js
src/components/gallery         (reservado) galeria de projetos
src/components/transitions     (reservado) transições entre páginas
src/animations                 tokens de movimento e utilitário de reduced-motion
src/config/evolution.ts        sistema evolutivo — fase ativa definida manualmente
src/config/site.ts             dados institucionais e rotas
src/projects                   registro de projetos (vazio)
src/styles                     tokens e estilos globais
```

### Trocar a fase visual

Em `src/config/evolution.ts`, altere `ACTIVE_PHASE_ID` para `"metamorphosis"`.
