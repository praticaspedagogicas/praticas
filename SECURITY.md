# Segurança

Este projeto lida com dados pedagógicos (cenários de aprendizagem) submetidos por docentes. A segurança dos dados e dos endpoints é uma prioridade.

## Reporte de vulnerabilidades

Se encontrares uma vulnerabilidade de segurança, **não abras um issue público**.

Envia um e-mail para: `security@example.pt` (substituir pelo contacto real da equipa de segurança institucional).

Inclui:

- Descrição clara do problema e impacto potencial.
- Passos para reproduzir (URL, payload, headers).
- Ambiente afetado (template, browser, modo mock vs produção).
- Sugestão de mitigação, se existir.

Acusamos a receção em 3 dias úteis. Vulnerabilidades confirmadas são tratadas de forma prioritária e, quando apropriado, divulgadas após correção.

## Política sobre segredos

- **Nunca** faças commit de segredos (tokens, `sig=`, connection strings, passwords) no repositório.
- Configura segredos localmente em `.env` (já está no `.gitignore`).
- Em produção/CI, usa variáveis de ambiente ou o cofre de segredos da plataforma.
- As URLs assinadas do Power Automate (`POWER_AUTOMATE_SUBMIT_URL`, `POWER_AUTOMATE_LOAD_URL`) **nunca** chegam ao front-end: a API substitui-as pelos endpoints internos `/api/guioes/submit` e `/api/guioes/load` antes de servir os templates.

## Boas práticas aplicadas

- Submissão e carregamento de guiões passam por endpoints protegidos (`apps/api/src/routes/guioes.ts`).
- Sanitização automática de URLs externas antes de servir templates legacy (`apps/api/src/lib/legacyTemplate.ts`).
- Validação de payloads com Zod (`apps/api/src/schemas/guiao.ts`).
- Iframe que serve templates legacy tem `referrerPolicy="no-referrer"` para não vazar dados de navegação.

## Boas práticas em uso pelo front-end

- Não usar `eval`, `new Function`, ou `document.write` (verificado).
- Todos os campos preenchidos pelo utilizador são escapados antes de inserção no DOM/PDF.
- Cookies sensíveis devem usar `HttpOnly` + `Secure` + `SameSite=Strict` quando aplicável.