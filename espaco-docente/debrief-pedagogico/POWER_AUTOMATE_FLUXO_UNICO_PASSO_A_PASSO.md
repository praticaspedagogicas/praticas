# Fluxo único — Debrief Pedagógico API

## Arquitetura correta
O GitHub Pages não consulta diretamente a lista SharePoint. Um único fluxo HTTP funciona como ponte para quatro ações:
- `obterEstado`
- `alterarMomento`
- `registarResposta`
- `obterResultados`

A página `participar.html` usa sempre o mesmo QR code por sessão e consulta o fluxo a cada 5 segundos.

## Pré-requisitos das listas
### Debrief_Sessoes
Título; Instituição; Data_hora_sessão; Momento Ativo; Estado; Chave Facilitadora.

### Debrief_Respostas
Título; Sessão; Instituição; Momento; Pergunta; Resposta; Dispositivo; ChaveResposta.

## Criar o fluxo
1. Power Automate > Criar > Fluxo de cloud instantâneo.
2. Gatilho: **Quando um pedido HTTP é recebido**.
3. Nome: `Debrief Pedagógico - API`.
4. Cole o esquema JSON abaixo.

```json
{
  "type": "object",
  "properties": {
    "acao": {"type":"string"},
    "sessao": {"type":"string"},
    "momento": {"type":"string"},
    "estado": {"type":"string"},
    "pergunta": {"type":"string"},
    "resposta": {"type":"string"},
    "dispositivo": {"type":"string"},
    "chaveResposta": {"type":"string"},
    "chaveFacilitadora": {"type":"string"}
  },
  "required": ["acao","sessao"]
}
```

5. Adicione **Mudar/Switch** usando `triggerBody()?['acao']`.
6. Crie os casos: `obterEstado`, `alterarMomento`, `registarResposta`, `obterResultados`.

## Caso obterEstado
1. SharePoint > Obter itens > `Debrief_Sessoes`.
2. Consulta de filtro:
`concat('Title eq ''', triggerBody()?['sessao'], '''')`
3. Contagem superior: 1.
4. Resposta HTTP 200, cabeçalhos:
`Access-Control-Allow-Origin` = `*`
`Content-Type` = `application/json`
5. Corpo:
```json
{
  "sessao":"@{first(body('Obter_itens_Sessao')?['value'])?['Title']}",
  "instituicao":"@{first(body('Obter_itens_Sessao')?['value'])?['Institui_x00e7__x00e3_o']}",
  "momentoAtivo":"@{first(body('Obter_itens_Sessao')?['value'])?['Momento_x0020_Ativo']}",
  "estado":"@{first(body('Obter_itens_Sessao')?['value'])?['Estado']?['Value']}"
}
```
Os nomes internos podem diferir; selecione os campos pelo conteúdo dinâmico, em vez de escrever manualmente.

## Caso alterarMomento
1. Obter itens da sessão pelo Título.
2. Condição: a `chaveFacilitadora` recebida é igual à coluna Chave Facilitadora.
3. Se verdadeiro: Atualizar item com Momento Ativo e Estado recebidos.
4. Responder `{ "ok": true }`.
5. Se falso: Resposta 403.

## Caso registarResposta
1. Obter itens em `Debrief_Respostas` filtrando `ChaveResposta`.
2. Se não existir, Criar item.
3. Se existir, Atualizar item existente.
4. A instituição deve ser obtida da sessão, não confiada ao navegador.
5. Responder `{ "ok": true }`.

## Caso obterResultados
1. Validar a Chave Facilitadora contra a sessão.
2. Obter itens em `Debrief_Respostas` filtrando Sessão e Pergunta.
3. Usar operações de dados para contar cada resposta.
4. Responder JSON com os totais.

## Comunicação sem preflight
O HTML envia `POST` com `Content-Type: text/plain`, evitando o pedido OPTIONS em muitos navegadores. O corpo continua a ser JSON e é interpretado pelo gatilho.

## Depois de guardar
1. Copie o URL HTTP gerado pelo gatilho.
2. Abra `config_backend.js`.
3. Substitua `COLE_AQUI_O_URL_DO_FLUXO_POWER_AUTOMATE` pelo URL.
4. Publique todos os ficheiros juntos no GitHub Pages.
