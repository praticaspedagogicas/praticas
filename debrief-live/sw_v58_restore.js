const VERSION = '58d';
const APP_PATH = '/praticas/debrief-live/app-v58-dilemas.html';
const PARTS = Array.from({ length: 9 }, (_, i) => `index.parts/part${String(i + 1).padStart(2, '0')}.txt?v=${VERSION}`);

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

function restoreV58(source) {
  let html = source;

  html = html.replace(
    /\n\n\/\* V59 · Encerramento \*\/.*?@media\(max-width:760px\)\{\.thankyou-card\{padding:34px 22px\}\.thankyou-logo\{width:190px\}\.thankyou-title\{font-size:58px\}\}\n/s,
    '\n'
  );

  html = html.replace(
    /\n\n    <!-- 7 encerramento -->\n    <section class="stage" data-stage="7">.*?\n    <\/div><\/section>/s,
    ''
  );

  html = html.replace(
    " {name:'Próximos passos',minutes:5,label:'Último frame'},\n {name:'Encerramento',minutes:0,label:'Obrigada'}",
    " {name:'Próximos passos',minutes:5,label:'Último frame'}"
  );

  html = html.replace(
    "$('#finishBtn').onclick=()=>{state.finished=true;save();chime();closeParticipationInBackground();setStage(7)};$('#returnHomeBtn').onclick=()=>setStage(0);",
    "$('#finishBtn').onclick=()=>{state.finished=true;save();chime();renderSummaryContent();openModal('summaryModal');toast('Sessão concluída. A atualizar resultados em segundo plano.');refreshRevealedResultsInBackground('Resumo final atualizado.')};"
  );

  if (!html.startsWith('<!doctype html>')) throw new Error('O ficheiro base não começou corretamente.');
  if (!html.includes("{name:'Próximos passos',minutes:5,label:'Último frame'}")) throw new Error('O percurso V58 não foi restaurado.');
  if (html.includes('data-stage="7"') || html.includes('V59 · Encerramento')) throw new Error('A página de encerramento da V59 ainda está presente.');

  return html;
}

async function buildV58() {
  const responses = await Promise.all(PARTS.map(async part => {
    const response = await fetch(part, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Parte indisponível: ${part} (${response.status})`);
    return response.text();
  }));

  const v59 = responses.join('');
  const v58 = restoreV58(v59);

  return new Response(v58, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
    }
  });
}

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.pathname === APP_PATH || url.pathname.endsWith('/debrief-live/app-v58-dilemas.html')) {
    event.respondWith(buildV58().catch(error => new Response(
      `<!doctype html><meta charset="utf-8"><title>Erro</title><style>body{font-family:Arial;padding:40px;color:#222}strong{color:#a71920}</style><strong>Não foi possível abrir a V58.</strong><p>${String(error.message || error)}</p>`,
      { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } }
    )));
  }
});
