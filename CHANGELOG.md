# Changelog

Todas as alterações notáveis neste projeto são documentadas aqui.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-PT/1.1.0/),
e este projeto segue [Semantic Versioning](https://semver.org/lang/pt-PT/).

## [Não publicado]

### Segurança
- Adicionado `referrerpolicy="no-referrer"` ao iframe que serve os templates legacy.
- Adicionado `rel="noopener noreferrer"` ao link `target="_blank"` do PDF no SBL.
- Criada política de reporte de vulnerabilidades em `SECURITY.md`.

### Adicionado
- Favicon (referência ao `header_logos.png` em `apps/web/index.html`).
- `loading="lazy"` e `decoding="async"` no logo do dashboard.
- Ficheiro `.nvmrc` (Node ≥20).
- Ficheiro `.editorconfig`.
- Ficheiro `.gitattributes` (line endings LF).
- `robots.txt` em `apps/web/public/` (bloqueia `/api/guioes/` e `/api/legacy/`).
- Workflow GitHub Actions `.github/workflows/ci.yml` (install, typecheck, build, test, upload de artefactos).
- Campo `packageManager` em `package.json` (npm 11.11.0).

### Removido
- Dependências não utilizadas `react-hook-form` e `@hookform/resolvers` de `apps/web/package.json`.

## [0.1.0] — 2026-06-XX

### Corrigido
- **SBL**: placeholder do campo `Docente(s)` agora tem o mesmo `font-size` (13px) e `line-height` (1.25) dos restantes campos do bloco da oferta (UC, Email, Curso, Ano letivo). Adicionado `#professor::placeholder` ao seletor da regra `sbl62-oferta-quatro-campos-uniformes-css`.

### Adicionado
- Migração conservadora dos templates pedagógicos (CBL, SBL, RBL, PBL, PROJ-BL) para Vite + React + Fastify.
- Dashboard com cards para os 5 templates.
- Iframe shell para servir os templates legacy com sanitização de URLs Power Automate.
- API Fastify com validação Zod para `/api/guioes/submit` e `/api/guioes/load`.
- Modo mock (`MOCK_POWER_AUTOMATE=1`) para desenvolvimento local e testes.
- Autosave por template em `localStorage`.
- Geração de PDF via jsPDF dentro de cada template.
- Sanitização automática de URLs Power Automate com assinatura (substituídas por endpoints internos).
- `<base target="_self">` injetado nos templates servidos (evita navegação fora do iframe).