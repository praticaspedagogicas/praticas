# Templates Pedagógicos — Pacote Final para Publicação

Pacote validado para publicação no GitHub Pages em
`praticaspedagogicas.github.io/praticas/` mantendo **100% dos URLs públicos já
partilhados com os coordenadores**.

## URLs públicos preservados (sem alteração)

| Caminho | Fonte |
|---|---|
| `/CBL.html` | `finais/CBL.html` |
| `/PBL.html` | `finais/PBL.html` |
| `/Proj-BL.html` | `finais/PROJ-BL.html` (renomeado para casing público) |
| `/RBL.html` | `finais/RBL.html` |
| `/SBL.html` | `finais/SBL.html` (com correção do placeholder Docente) |
| `/CBL_Teste.html` | `testes/CBL_Teste.html` |
| `/PBL_Teste.html` | `testes/PBL_Teste.html` |
| `/Proj-BL_Teste.html` | `testes/PROJ-BL_Teste.html` |
| `/RBL_Teste.html` | `testes/RBL_Teste.html` |
| `/SBL_Teste.html` | `testes/SBL_Teste.html` |
| `/index.html` | landing estático (cards para os 5 templates) |
| `/header_logos.png` | logótipos Universidade Europeia / IADE / IPAM |
| `/SBL.scripts.js`, `/SBL_Teste.scripts.js` | scripts auxiliares |
| `/robots.txt` | bloqueio de crawlers em `/api/guioes/` e `/api/legacy/` |
| `/.nojekyll` | GitHub Pages: desativa Jekyll |
| `/.github/workflows/ci.yml` | CI (npm ci + typecheck + build + test) |

## O que está incluído

### Raiz (publicável diretamente no GitHub Pages)
- 5 templates de produção + 5 templates de teste (caminhos `/CBL.html`, `/SBL_Teste.html`, etc.)
- Landing page estático (`index.html`)
- `header_logos.png`, `SBL.scripts.js`, `SBL_Teste.scripts.js`
- `robots.txt`, `.nojekyll`
- `.nvmrc` (Node ≥20), `.editorconfig`, `.gitattributes`, `.gitignore`
- `SECURITY.md`, `CHANGELOG.md`, `.env.example`
- `.github/workflows/ci.yml`
- `package.json`, `package-lock.json`

### Source (modernização Vite + React + Fastify)
- `apps/web/` — aplicação React/Vite (shell, dashboard, iframe wrapper)
  - `index.html`, `package.json`, configs (Vite/Tailwind/TS/PostCSS)
  - `public/` — header_logos.png, robots.txt
  - `src/` — main.tsx, App.tsx, componentes, lib/apiClient.ts, styles/base.css, templates/
- `apps/api/` — API Fastify com sanitização Power Automate
  - `package.json`, `tsconfig.json`, `src/` (server, routes, schemas, lib, config)

### Fontes preservadas para rastreabilidade
- `finais/` — 5 templates de produção (fonte antes de mover para a raiz)
- `testes/` — 5 templates de teste (fonte)
- `docs/` — 13 ficheiros de documentação (arquitectura, deploy, segurança, etc.)

## O que NÃO está incluído (excluído propositadamente)

- `node_modules/` (129 MB) — reinstalar com `npm install`
- `.env` — contém secrets reais (Power Automate URLs assinadas, `sig=`)
- `apps/api/dist/` — build output, regenerado por `npm run build`
- `apps/web/dist/` — build output, regenerado por CI
- `*.tsbuildinfo` — cache TypeScript
- `.DS_Store` — macOS
- `Arquivo.zip` (64 MB) — backup antigo
- `coverage/`, `playwright-report/`, `test-results/` — artefactos de testes

## Correção de bug incluída

**SBL — placeholder do campo Docente(s)** agora tem o mesmo `font-size` (13px)
e `line-height` (1.25) dos restantes campos do bloco da oferta (UC, Email,
Curso, Ano letivo). Adicionado `#professor::placeholder` ao seletor da regra
`sbl62-oferta-quatro-campos-uniformes-css` em `finais/SBL.html` (e
consequentemente em `SBL.html` na raiz).

## Outras melhorias incluídas

- `referrerpolicy="no-referrer"` no iframe do shell React
- `rel="noopener noreferrer"` no link `target="_blank"` do PDF no SBL
- `loading="lazy"` + `decoding="async"` no logo do dashboard React
- Favicon (referência a `header_logos.png`)
- Removidas dependências mortas (`react-hook-form`, `@hookform/resolvers`)
- Adicionado `packageManager: npm@11.11.0`

## Próximos passos (quando estiver pronto para deploy)

1. Validar localmente servindo esta pasta:
   ```bash
   python3 -m http.server 8080
   ```
   Abrir `http://localhost:8080/CBL.html`, etc.

2. Inicializar repositório Git e fazer commit:
   ```bash
   git init
   git add .
   git commit -m "chore: templates pedagógicos finais (preserva URLs públicos)"
   ```

3. Adicionar remote correto:
   ```bash
   git remote add origin https://github.com/praticaspedagogicas/praticas.git
   ```

4. Push para `main` (sem `--force`):
   ```bash
   git push -u origin main
   ```

## Notas

- O **API Fastify** (`apps/api/`) **não é necessário para GitHub Pages** (que é
  puramente estático). Os templates funcionam com os URLs `sig=` Power Automate
  embutidos. Para uma arquitetura mais segura no futuro, considerar deploy da API
  num serviço separado (Cloudflare Worker, Vercel, etc.) e sanitização em build-time.
- O **shell React** (`apps/web/`) está incluído como source mas **não é buildado
  para GitHub Pages neste pacote** (excluímos `apps/web/dist/`). Se quiseres
  servir o dashboard React, corre `npm install && npm run build` e copia
  `apps/web/dist/*` para um subdiretório tipo `/app/`.