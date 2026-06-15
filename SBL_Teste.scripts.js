
(function(){
'use strict';

var STORAGE_KEY = 'template_autosave_SBL';
var aulaCount = 1;

/* ── TOAST ── */
function toast(msg){
  var old = document.querySelector('.toast-message');
  if(old) old.remove();
  var d = document.createElement('div');
  d.className = 'toast-message';
  d.innerText = msg;
  document.body.appendChild(d);
  setTimeout(function(){ if(d.parentNode) d.remove(); }, 2500);
}

/* ── CAMPOS ── */
function fields(){
  return Array.from(document.querySelectorAll('input,textarea,select'))
    .filter(function(el){ return el.type !== 'hidden'; });
}

/* ── PROGRESSO ── */
function renderProgress(){
  var f = fields();
  if(!f.length) return;
  var filled = f.filter(function(el){ return (el.value||'').trim() !== ''; }).length;
  var pct = Math.round(filled / f.length * 100);
  var fill  = document.getElementById('progressFill');
  var label = document.getElementById('progressLabel');
  if(fill)  fill.style.width = pct + '%';
  if(label) label.innerText = 'Guião preenchido: ' + pct + '%';
}

/* ── AUTOSAVE STATUS ── */
function renderAutosave(txt){
  var el = document.getElementById('autosaveStatus');
  if(el) el.innerText = txt;
}

/* ── GUARDAR RASCUNHO ── */
function saveDraft(){
  var p = { timestamp: new Date().toLocaleTimeString('pt-PT'), data: {} };
  fields().forEach(function(el){
    var key = el.id || el.name;
    if(key) p.data[key] = el.value;
  });
  try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); }catch(e){}
  renderProgress();
  renderAutosave('Última gravação automática: ' + p.timestamp);
}

/* ── RESTAURAR RASCUNHO ── */
function restoreDraft(){
  var raw; try{ raw = localStorage.getItem(STORAGE_KEY); }catch(e){}
  if(!raw){ renderProgress(); renderAutosave('Última gravação automática: --'); return; }
  try{
    var p = JSON.parse(raw);
    var data = p && p.data ? p.data : {};
    var hasNamedKeys = Object.keys(data).some(function(k){ return isNaN(Number(k)); });
    if(!hasNamedKeys){
      // Rascunhos antigos por índice podem deslocar valores quando o layout muda.
      renderProgress();
      renderAutosave('Última gravação automática: --');
      return;
    }
    fields().forEach(function(el){
      var key = el.id || el.name;
      if(key && data[key] !== undefined) el.value = data[key];
    });
    renderProgress();
    renderAutosave('Última gravação automática: ' + (p.timestamp||'--'));
    toast('Rascunho restaurado com sucesso.');
  }catch(e){ renderProgress(); renderAutosave('Última gravação automática: --'); }
}

/* ── LIMPAR FORMULÁRIO ── */
function clearAll(){
  fields().forEach(function(el){
    if(el.tagName==='SELECT') el.selectedIndex=0; else el.value='';
    el.dispatchEvent(new Event('input'));
    el.dispatchEvent(new Event('change'));
  });
  try{ localStorage.removeItem(STORAGE_KEY); }catch(e){}
  renderProgress();
  renderAutosave('Última gravação automática: --');
  toast('Formulário limpo com sucesso.');
}

/* ── APAGAR RASCUNHO ── */
function deleteDraft(){
  try{ localStorage.removeItem(STORAGE_KEY); }catch(e){}
  renderAutosave('Última gravação automática: --');
  toast('Rascunho apagado. Formulário mantido.');
}

/* ── ENVIAR PARA VALIDAÇÃO ── */
async function submitValidacao(){
  var dados = { titulo: (document.querySelector('h1')||{}).innerText || document.title };
  fields().forEach(function(el){ if(el.id) dados[el.id] = el.value; });
  // PATCH institucional: o seletor pesquisável de Curso(s) pode guardar o valor em #curso.
  // Garante compatibilidade com o Power Automate, que espera o campo top-level "cursos".
  try {
    var _cursoEl = document.getElementById('curso') || document.querySelector('[name="curso"]');
    var _cursoVal = String((_cursoEl && _cursoEl.value) || dados.curso || dados.cursos || '').trim();
    if (_cursoVal) {
      dados.curso = _cursoVal;
      dados.cursos = _cursoVal;
    }
  } catch(e) {}

  try{
    var r = await fetch('https://default704e7b9d2c07436297683fef55c31b.7f.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/e204529fc1f342fc87cd935dfa2a58f1/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=twiVi70IgSoNelyf9E_StjR8n6gtjcasJu3ULIuXErc', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(dados)
    });
    toast(r.ok ? getGuiaoSuccessMessage(window.__lastGuiaoFlowResponse) : 'Erro ao enviar (código ' + r.status + ').');
  }catch(e){ toast('Erro de ligação: ' + e.message); }
}

/* ── BIND CAMPOS ── */
function bindFields(){
  fields().forEach(function(el){
    el.removeEventListener('input', saveDraft);
    el.removeEventListener('change', saveDraft);
    el.addEventListener('input', saveDraft);
    el.addEventListener('change', saveDraft);
  });
}

/* ── MENU MAIS OPÇÕES ── */
function initMenu(){
  var btn  = document.getElementById('btnMaisOpcoes');
  var menu = document.getElementById('uxMenuMaisOpcoes');
  if(!btn || !menu) return;

  // Substitui o conteúdo do menu pelos 5 botões uniformizados com RBL
  menu.innerHTML =
    '<button type="button" id="draftBtn">💾 Guardar rascunho</button>' +
    '<button type="button" id="restoreBtn">📂 Restaurar rascunho</button>' +
    '<button type="button" id="deleteBtn">🗑️ Apagar rascunho</button>' +
    '<button type="button" id="reuseHeaderBtn">↩️ Reutilizar cabeçalho</button>' +
    '<button type="button" id="clearBtn">🧹 Limpar formulário</button>';

  btn.addEventListener('click', function(e){
    e.preventDefault(); e.stopPropagation();
    menu.classList.toggle('open');
  });
  document.addEventListener('click', function(e){
    if(!menu.contains(e.target) && e.target !== btn) menu.classList.remove('open');
  });

  document.getElementById('draftBtn').addEventListener('click', function(){
    saveDraft(); menu.classList.remove('open'); toast('Rascunho guardado com sucesso.');
  });
  document.getElementById('restoreBtn').addEventListener('click', function(){
    restoreDraft(); menu.classList.remove('open');
  });
  document.getElementById('deleteBtn').addEventListener('click', function(){
    deleteDraft(); menu.classList.remove('open');
  });
  var reuseHeaderBtn = document.getElementById('reuseHeaderBtn');
  if(reuseHeaderBtn) reuseHeaderBtn.addEventListener('click', function(){
    try { if(typeof window.sblReuseHeader === 'function') window.sblReuseHeader(); } catch(e) {}
    menu.classList.remove('open');
  });
  document.getElementById('clearBtn').addEventListener('click', function(){
    clearAll(); menu.classList.remove('open');
  });
}

/* ── BOTÕES PRINCIPAIS ── */
function initButtons(){
  // Assistente IA — por id primeiro, fallback por texto
  var aiBtn = document.getElementById('btnAssistenteIA') ||
    Array.from(document.querySelectorAll('button')).find(function(b){
      return (b.innerText||'').includes('Assistente IA');
    });
  if(aiBtn) aiBtn.addEventListener('click', function(e){
    e.preventDefault();
    window.open('https://teams.microsoft.com/l/app/?titleId=T_3563aa57-a2da-f9ec-f15e-40e313566c90','_blank');
    toast('A abrir o Copilot institucional...');
  });

  // Enviar para Validação — por id primeiro
  var enviarBtn = document.getElementById('btnEnviarValidacao') ||
    Array.from(document.querySelectorAll('button')).find(function(b){
      return (b.innerText||'').includes('Enviar para Validação');
    });
  if(enviarBtn) enviarBtn.addEventListener('click', function(e){
    e.preventDefault(); toast(getGuiaoSuccessMessage(window.__lastGuiaoFlowResponse));
  });

  // Gerar guião em PDF
  var pdfBtn = document.getElementById('btnPDF') ||
    Array.from(document.querySelectorAll('button')).find(function(b){
      return (b.innerText||'').includes('Gerar guião em PDF');
    });
  if(pdfBtn) pdfBtn.addEventListener('click', function(e){
    e.preventDefault(); if (window.downloadGuiesPdf) { window.downloadGuiesPdf(); } else { window.print(); }
  });
}


/* ── INIT ── */
document.addEventListener('DOMContentLoaded', function(){
  // Não restaurar automaticamente: evita que rascunhos antigos desloquem valores
  // depois de alterações no cabeçalho. O utilizador pode restaurar manualmente em Mais opções.
  renderProgress();
  renderAutosave('Última gravação automática: --');
  bindFields();
  initMenu();
  initButtons();
});

})();

;

(function(){
  function toastSafe(msg){
    if(typeof toast === 'function'){
      toast(msg);
      return;
    }
    var old = document.querySelector('.toast-message');
    if(old) old.remove();
    var d = document.createElement('div');
    d.className = 'toast-message';
    d.innerText = msg;
    document.body.appendChild(d);
    setTimeout(function(){ if(d.parentNode) d.remove(); }, 2200);
  }

  function atualizarSafe(){
    if(typeof saveDraft === 'function') saveDraft();
    if(typeof renderProgress === 'function') renderProgress();
  }

  function getTabela(){
    return document.getElementById('quadroAcao');
  }

  function getBody(table){
    return table.tBodies && table.tBodies.length ? table.tBodies[0] : table;
  }

  function getControlRow(table){
    return Array.from(table.querySelectorAll('tr')).find(function(row){
      return row.querySelector('.btn-plus') || row.querySelector('.btn-minus');
    });
  }

  function normalizarLinhaBotoes(table){
    var controlRow = getControlRow(table);
    if(!controlRow) return null;

    controlRow.classList.add('sbl-controls-row');

    var body = controlRow.parentNode || getBody(table);

    // Mantém a linha dos botões sempre como última linha do quadro.
    if(controlRow !== body.lastElementChild){
      body.appendChild(controlRow);
    }

    var plus = controlRow.querySelector('.btn-plus');
    var minus = controlRow.querySelector('.btn-minus');

    if(plus){
      plus.setAttribute('type', 'button');
      plus.setAttribute('onclick', 'addRow()');
    }

    if(minus){
      minus.setAttribute('type', 'button');
      minus.setAttribute('onclick', 'removeRow()');
    }

    return controlRow;
  }

  function criarTextArea(placeholder){
    var ta = document.createElement('textarea');
    ta.rows = 3;
    ta.placeholder = placeholder;
    ta.style.width = '98%';
    ta.style.border = '1px solid #ccc';
    ta.style.borderRadius = '6px';
    ta.style.padding = '8px';
    ta.style.fontFamily = 'inherit';
    ta.addEventListener('input', atualizarSafe);
    ta.addEventListener('change', atualizarSafe);
    return ta;
  }

  function criarLinha(){
    var tr = document.createElement('tr');
    tr.style.background = '#fff';

    var td1 = document.createElement('td');
    td1.style.padding = '10px';
    td1.style.borderBottom = '1px solid #ddd';

    var td2 = document.createElement('td');
    td2.style.padding = '10px';
    td2.style.borderBottom = '1px solid #ddd';
    td2.style.borderLeft = '1px solid #ddd';

    td1.appendChild(criarTextArea('Descreva a ação do Ator/Personagem...'));
    td2.appendChild(criarTextArea('Descreva a reação do Técnico/Profissional...'));

    tr.appendChild(td1);
    tr.appendChild(td2);
    return tr;
  }

  window.addRow = function(){
    var table = getTabela();
    if(!table){
      toastSafe('Não encontrei o quadro Ação/Reação.');
      return;
    }

    var controlRow = normalizarLinhaBotoes(table);
    var novaLinha = criarLinha();

    if(controlRow && controlRow.parentNode){
      controlRow.parentNode.insertBefore(novaLinha, controlRow);
    }else{
      getBody(table).appendChild(novaLinha);
    }

    // Garante novamente que os botões ficam por último.
    normalizarLinhaBotoes(table);

    atualizarSafe();
    toastSafe('Linha adicionada.');
  };

  window.removeRow = function(){
    var table = getTabela();
    if(!table){
      toastSafe('Não encontrei o quadro Ação/Reação.');
      return;
    }

    normalizarLinhaBotoes(table);

    var linhasEditaveis = Array.from(table.querySelectorAll('tr')).filter(function(row){
      return row.querySelector('textarea') && !row.querySelector('.btn-plus') && !row.querySelector('.btn-minus');
    });

    if(linhasEditaveis.length <= 1){
      toastSafe('Mantenha pelo menos uma linha.');
      return;
    }

    linhasEditaveis[linhasEditaveis.length - 1].remove();

    // Se os botões tinham ficado no meio por uso anterior, volta a colocá-los no fim.
    normalizarLinhaBotoes(table);

    atualizarSafe();
    toastSafe('Linha removida.');
  };

  function init(){
    var table = getTabela();
    if(table) normalizarLinhaBotoes(table);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  }else{
    init();
  }
})();

;

(function(){
  function bindAutoGrow(textarea, minHeight){
    if(!textarea || textarea.dataset.sblLightGrow === '1') return;
    textarea.dataset.sblLightGrow = '1';

    function grow(){
      textarea.style.height = 'auto';
      textarea.style.height = Math.max(textarea.scrollHeight, minHeight || 44) + 'px';
    }

    textarea.addEventListener('input', grow);
    textarea.addEventListener('change', grow);
    setTimeout(grow, 0);
  }

  function makeTextarea(id, minHeight){
    var field = document.getElementById(id);
    if(!field || field.tagName === 'TEXTAREA') {
      if(field) bindAutoGrow(field, minHeight || 44);
      return;
    }

    var ta = document.createElement('textarea');
    ta.id = field.id;
    ta.name = field.name || '';
    ta.placeholder = field.getAttribute('placeholder') || '';
    ta.value = field.value || '';
    ta.setAttribute('data-expanded-from-input', 'true');

    field.parentNode.replaceChild(ta, field);
    bindAutoGrow(ta, minHeight || 44);
  }

  function camposLeves(){
    // Mantém estrutura original; só permite crescer onde faz sentido.
    ['uc','professor'].forEach(function(id){
      makeTextarea(id, 44);
    });

    ['objetivos','recursos','cenario','oq_simulacao','info_ator'].forEach(function(id){
      var el = document.getElementById(id);
      if(el) bindAutoGrow(el, 90);
    });

    document.querySelectorAll('#quadroAcao textarea').forEach(function(ta){
      bindAutoGrow(ta, 82);
    });
  }

  function iconesInfo(){
    document.querySelectorAll('button[title="Saiba mais"]').forEach(function(btn){
      btn.classList.add('sbl-info-i');
      btn.textContent = 'i';
    });
  }

  function quadroPremiumLeve(){
    var table = document.getElementById('quadroAcao');
    if(!table) return;

    var header = table.querySelector('tr:first-child');
    if(header){
      header.querySelectorAll('th').forEach(function(th){
        th.style.background = '#E31E24';
        th.style.color = '#fff';
      });
    }

    var last = table.querySelector('tr:last-child');
    if(last && (last.querySelector('.btn-plus') || last.querySelector('.btn-minus'))){
      last.classList.add('sbl-controls-row');
      var cell = last.querySelector('td');
      if(cell) {
        cell.colSpan = 2;
        cell.style.textAlign = 'right';
      }
    }
  }

  // Mantém addRow/removeRow, só garante que novas linhas entram com o visual correto.
  var originalAddRow = window.addRow;
  window.addRow = function(){
    if(typeof originalAddRow === 'function'){
      originalAddRow();
    }else{
      var table = document.getElementById('quadroAcao');
      if(!table) return;
      var controls = table.querySelector('.sbl-controls-row') || table.querySelector('tr:last-child');
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td><textarea placeholder="Nova ação do Ator/Personagem"></textarea></td>' +
        '<td><textarea placeholder="Nova reação do Técnico/Profissional"></textarea></td>';
      if(controls && controls.parentNode) controls.parentNode.insertBefore(tr, controls);
      else table.appendChild(tr);
    }

    setTimeout(function(){
      document.querySelectorAll('#quadroAcao textarea').forEach(function(ta){
        bindAutoGrow(ta, 82);
      });
      quadroPremiumLeve();
      if(typeof renderProgress === 'function') renderProgress();
    }, 0);
  };

  var originalRemoveRow = window.removeRow;
  window.removeRow = function(){
    if(typeof originalRemoveRow === 'function'){
      originalRemoveRow();
    }else{
      var table = document.getElementById('quadroAcao');
      if(!table) return;
      var rows = Array.from(table.querySelectorAll('tr')).filter(function(row){
        return row.querySelector('textarea');
      });
      if(rows.length > 1) rows[rows.length - 1].remove();
    }

    setTimeout(function(){
      quadroPremiumLeve();
      if(typeof renderProgress === 'function') renderProgress();
    }, 0);
  };

  function init(){
    camposLeves();
    iconesInfo();
    quadroPremiumLeve();

    if(typeof renderProgress === 'function') renderProgress();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  }else{
    init();
  }

  setTimeout(init, 150);
})();

;

(function(){
  function melhorarInstrucaoQuadro(){
    Array.from(document.querySelectorAll('div')).forEach(function(div){
      var text = (div.textContent || '').replace(/\s+/g,' ').trim();
      if(text.indexOf('O quadro seguinte deve ser preenchido') === 0){
        div.classList.add('sbl-quadro-instrucao');
        div.removeAttribute('style');
      }
    });
  }

  function centralizarHeaders(){
    var table = document.getElementById('quadroAcao');
    if(!table) return;
    var headers = table.querySelectorAll('tr:first-child th');
    headers.forEach(function(th){
      th.style.textAlign = 'center';
      th.style.verticalAlign = 'middle';
      th.style.color = '#fff';
    });
  }

  function ajustarInfoAtorI(){
    var btns = Array.from(document.querySelectorAll('button[title="Saiba mais"], .sbl-info-i'));
    btns.forEach(function(btn){
      var onclick = btn.getAttribute('onclick') || '';
      if(onclick.indexOf('hint_info_ator') !== -1){
        btn.classList.add('sbl-info-ator-button');
      }
    });
  }

  function init(){
    melhorarInstrucaoQuadro();
    centralizarHeaders();
    ajustarInfoAtorI();

    if(typeof renderProgress === 'function') renderProgress();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  }else{
    init();
  }

  setTimeout(init, 150);
})();

;

(function(){
  function suavizarInstrucao(){
    Array.from(document.querySelectorAll('div')).forEach(function(div){
      var text = (div.textContent || '').replace(/\s+/g,' ').trim();
      if(text.indexOf('O quadro seguinte deve ser preenchido') === 0){
        div.classList.add('sbl-quadro-instrucao');
        div.removeAttribute('style');
      }
    });
  }

  function centralizarCabecalhos(){
    var table = document.getElementById('quadroAcao');
    if(!table) return;
    table.querySelectorAll('tr:first-child th').forEach(function(th){
      th.style.textAlign = 'center';
      th.style.verticalAlign = 'middle';
      th.style.color = '#fff';
    });
  }

  function init(){
    suavizarInstrucao();
    centralizarCabecalhos();
    if(typeof renderProgress === 'function') renderProgress();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  }else{
    init();
  }

  setTimeout(init, 150);
})();

;

(function(){
  function addClassToSectionByField(fieldId, className){
    var el = document.getElementById(fieldId);
    if(!el) return;
    var sec = el.closest('.section');
    if(sec) sec.classList.add(className || 'sbl-rounded-block');
  }
  function markGuiaoAtorTitle(){
    var hint = document.getElementById('hint_ator');
    if(!hint) return;
    var sec = hint.closest('.section');
    if(sec) sec.classList.add('sbl-rounded-title-block');
  }
  function init(){
    ['objetivos','recursos','cenario','oq_simulacao','info_ator'].forEach(function(id){
      addClassToSectionByField(id, 'sbl-rounded-block');
    });
    markGuiaoAtorTitle();
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  setTimeout(init, 120);
})();

;

(function(){
  function updateLabels(){
    document.querySelectorAll('.header-grid + table th').forEach(function(th){
      var t = (th.textContent || '').replace(/\s+/g,' ').trim().toLowerCase();
      if(t === 'unidade curricular:' || t === 'unidade curricular'){
        th.textContent = 'Unidade(s) Curricular(es):';
      }
    });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', updateLabels);
  else updateLabels();
  setTimeout(updateLabels, 120);
})();

;

(function(){
  "use strict";

  const TEMPLATE_TYPE = "SBL";
  const TEMPLATE_SCENARIO = "SBL";
  const FLOW_URL = "https://default704e7b9d2c07436297683fef55c31b.7f.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/e204529fc1f342fc87cd935dfa2a58f1/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=twiVi70IgSoNelyf9E_StjR8n6gtjcasJu3ULIuXErc";
  const HTML2PDF_CDN = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
  const JSPDF_CDN = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
  let activeSubmission = false;

  function toast(message, type, duration){
    try {
      const old = document.querySelector(".toast-message.powerautomate-toast");
      if (old) old.remove();
      const div = document.createElement("div");
      const msgText = String(message || "");
      const isLong = msgText.toLowerCase().includes("assistente") || msgText.toLowerCase().includes("teams") || msgText.length > 80;
      div.className = "toast-message powerautomate-toast" + (isLong ? " sbl-toast-long" : "");
      div.textContent = msgText;
      div.style.background = type === "error" ? "#7a1f1f" : (type === "ok" ? "#1f4d2b" : "#333");
      div.style.whiteSpace = "normal";
      document.body.appendChild(div);
      setTimeout(() => { if(div.parentNode) div.remove(); }, duration || (type === "error" ? 8000 : (isLong ? 9000 : 3200)));
    } catch(e) { alert(message); }
  }
  window.toast = toast;
  window.showToast = toast;
  window.mostrarToast = toast;

  function normalizeText(value){
    return String(value || "")
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[º°ª()|\/\\\-_.:;,[\]]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function allFields(){
    return Array.from(document.querySelectorAll("input, textarea, select"))
      .filter(el => !el.disabled && el.type !== "hidden" && !el.closest(".no-print"));
  }

  function getLabelFor(el){
    if (!el) return "";
    if (el.id) {
      try {
        const explicit = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
        if (explicit) return explicit.innerText.trim();
      } catch(e) {}
    }
    const parentLabel = el.closest("label");
    if (parentLabel) return parentLabel.innerText.replace(el.value || "", "").trim();
    const cell = el.closest("td");
    if (cell) {
      const prev = cell.previousElementSibling;
      if (prev && /^(th|td)$/i.test(prev.tagName)) return prev.innerText.trim();
    }
    const card = el.closest(".header-card,.section,.sbl-meta-coupled-card,.sbl-rounded-block,.header-info");
    if (card) {
      const lab = card.querySelector("label,h3,strong,b");
      if (lab) return lab.innerText.trim();
    }
    return "";
  }

  function readValue(el){
    if (!el) return "";
    if (el.type === "checkbox") return el.checked ? "Sim" : "Não";
    if (el.type === "radio") return el.checked ? el.value : "";
    if (el.tagName === "SELECT") {
      const txt = (el.options[el.selectedIndex]?.text || el.value || "").trim();
      return /^Selecionar$/i.test(txt) ? "" : txt;
    }
    return (el.value || "").trim();
  }

  

  /* PATCH INSTITUCIONAL — compatibilidade com edição via itemId (Power Automate Guiões) */
  function getGuiaoItemIdFromUrl(){
    try {
      return new URLSearchParams(window.location.search).get('itemId') || '';
    } catch(e) {
      return '';
    }
  }

  function normalizeGuiaoPowerAutomatePayload(payload){
    payload = payload || {};
    var formData = payload.formData || {};
    function first(){
      for(var i = 0; i < arguments.length; i++){
        var value = arguments[i];
        if(value !== undefined && value !== null && String(value).trim() !== '') return String(value).trim();
      }
      return '';
    }

    function domValue(selector){
      try {
        var el = document.querySelector(selector);
        return el ? String(el.value || '').trim() : '';
      } catch(e) {
        return '';
      }
    }
    function guiaoIntervaloHora(){
      var inicio = first(formData.hora_inicio, formData.horaInicio, formData.hora, domValue('#hora_inicio'), domValue('#hora'), domValue('[name="hora"]'));
      var fim = first(formData.hora_fim, formData.horaFim, domValue('#hora_fim'), domValue('[name="hora_fim"]'));
      return (inicio && fim) ? (inicio + '–' + fim) : '';
    }

    payload.itemId = first(payload.itemId, getGuiaoItemIdFromUrl());
    payload.title = first(payload.title, payload.tituloProjeto, payload.ucs, payload.cursos, 'Guião');
    payload.templateType = first(payload.templateType, formData.templateType);
    payload.submittedAt = first(payload.submittedAt, formData.submittedAt, new Date().toISOString());
    payload.cursos = first(payload.cursos, payload.curso, formData.cursos, formData.curso);
    payload.ucs = first(payload.ucs, payload.uc, formData.ucs, formData.uc);
    payload.cenarioAprendizagem = first(payload.cenarioAprendizagem, payload.cenario, payload.scenario, formData.cenarioAprendizagem);
    payload.docentes = first(payload.docentes, payload.docenteTexto, formData.docentes, formData.docente, formData.professor);
    payload.nEstudantes = first(payload.nEstudantes, payload.numeroEstudantes, formData.nEstudantes, formData.numeroEstudantes, formData.n_estudantes, formData.numero_estudantes);
    payload.nGrupos = first(payload.nGrupos, payload.numeroGrupos, formData.nGrupos, formData.numeroGrupos, formData.n_grupos, formData.numero_grupos);
    payload.estadoGuiao = first(payload.estadoGuiao, formData.estadoGuiao, formData.estado);
    payload.autorias = first(payload.autorias, payload.autoria, formData.autorias, formData.autoria);
    payload.unidadeOrganica = first(payload.unidadeOrganica, formData.unidadeOrganica, formData.unidade_organica);
    payload.modalidade = first(payload.modalidade, formData.modalidade);
    payload.semestre = first(payload.semestre, formData.semestre);
    payload.turmaEdicao = first(payload.turmaEdicao, payload.turma, formData.turmaEdicao, formData.turma_edicao, formData.turma);
    payload.anoLetivo = first(payload.anoLetivo, payload.ano, formData.anoLetivo, formData.AnoLetivo, formData.ano);
    payload.autorizaRepositorio = first(payload.autorizaRepositorio, payload.autorizaPartilhaInterna, payload.partilhaRepositorio, formData.autorizaRepositorio);
    payload.data = first(payload.data, payload.Data, payload.date, formData.data, formData.Data, formData.date, formData.calendarizacao, formData.dataSessao, formData.data_simulacao, formData.aula1_data, domValue('#data'), domValue('[name="data"]'), domValue('#calendarizacao'), domValue('[id^="aula"][id$="_data"]'), domValue('#entregaveis input[type="date"]'), domValue('input[type="date"]'));
    payload.hora = first(payload.hora, payload.Hora, formData.hora, formData.Hora, guiaoIntervaloHora(), formData.hora_inicio, formData.hora_fim, formData.aula1_duracao, domValue('#hora'), domValue('[name="hora"]'), domValue('#hora_inicio'), domValue('#hora_fim'), domValue('[id^="aula"][id$="_duracao"]'), domValue('input[type="time"]'));
    payload.estruturaPedagogica = first(payload.estruturaPedagogica, formData.estruturaPedagogica);
    payload.emails = first(payload.emails, payload.email, formData.emails, formData.email);
    payload.organizacoesContacto = first(payload.organizacoesContacto, formData.organizacoesContacto, formData.organizacao, formData.organizacoes, formData.contacto, formData.contato);
    payload.tituloProjeto = first(payload.tituloProjeto, formData.tituloProjeto, formData.titulo_projeto);
    payload.pdfFileName = first(payload.pdfFileName);
    payload.pdfBase64 = first(payload.pdfBase64);
    payload.html = (payload.html === undefined || payload.html === null) ? '' : payload.html;
    return payload;
  }

  /* PATCH INSTITUCIONAL — fecho seguro do modo edição via itemId (não altera layout/PDF) */
  function guiaoFlowResponseToObject(text){
    if(!text) return {};
    try { return JSON.parse(text); } catch(e) { return { message: String(text || '') }; }
  }

  function getGuiaoFlowItemId(result){
    result = result || {};
    return String(result.itemId || result.ItemId || result.ID || result.id || '').trim();
  }

  function getGuiaoFlowMode(result){
    result = result || {};
    return String(result.mode || result.Mode || '').trim().toLowerCase();
  }


  function getGuiaoSubmissionMode(result){
    var mode = getGuiaoFlowMode(result);
    if(mode === 'updated' || mode === 'created') return mode;
    return isGuiaoEditMode() ? 'updated' : 'created';
  }

  function getGuiaoSuccessMessage(result){
    return getGuiaoSubmissionMode(result) === 'updated'
      ? 'Guião atualizado com sucesso. As alterações foram enviadas para nova validação.'
      : 'Guião submetido com sucesso. O seu guião foi enviado para validação.';
  }

  function persistGuiaoItemIdFromResponse(result){
    var returnedItemId = getGuiaoFlowItemId(result);
    if(!returnedItemId) return;
    window.__lastGuiaoFlowResponse = result || {};
    try { window.localStorage.setItem('guiao_itemId', returnedItemId); } catch(e) {}
    try {
      var url = new URL(window.location.href);
      if(url.searchParams.get('itemId') !== returnedItemId){
        url.searchParams.set('itemId', returnedItemId);
        window.history.replaceState(window.history.state, document.title, url.toString());
      }
    } catch(e) {}
    updateGuiaoSubmitButtonText();
  }

  function isGuiaoEditMode(){
    return !!getGuiaoItemIdFromUrl();
  }

  function guiaoSubmitButtons(){
    return Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"]')).filter(function(btn){
      var txt = String(btn.textContent || btn.value || '').toLowerCase();
      return btn.id === 'btnEnviarValidacao' || btn.id === 'btnValidacaoReal' ||
        txt.indexOf('enviar para valida') !== -1 || txt.indexOf('submeter') !== -1 || txt.indexOf('submiss') !== -1 ||
        txt.indexOf('atualizar guião') !== -1 || txt.indexOf('guardar alterações') !== -1;
    });
  }

  function updateGuiaoSubmitButtonText(){
    var editMode = isGuiaoEditMode();
    guiaoSubmitButtons().forEach(function(btn){
      var targetLabel = editMode ? 'Atualizar guião' : (btn.dataset.defaultSubmitLabel || btn.textContent || btn.value || 'Enviar para Validação');
      if(!btn.dataset.defaultSubmitLabel){
        var current = String(btn.textContent || btn.value || '').trim();
        btn.dataset.defaultSubmitLabel = current && current !== 'Atualizar guião' ? current : 'Enviar para Validação';
      }
      if(btn.tagName === 'INPUT') btn.value = targetLabel;
      else btn.textContent = targetLabel;
    });
  }

  function isGuiaoPowerAutomateRequest(input, init){
    try {
      var url = typeof input === 'string' ? input : (input && input.url) || '';
      var method = String((init && init.method) || (input && input.method) || 'GET').toUpperCase();
      return method === 'POST' && url && (url.indexOf('powerautomate') !== -1 || url.indexOf('/workflows/') !== -1 || url.indexOf('powerplatform.com') !== -1);
    } catch(e) { return false; }
  }

  function normalizeGuiaoFetchBody(init){
    if(!init || !init.body || typeof init.body !== 'string') return init;
    try {
      var payload = JSON.parse(init.body);
      if(payload && typeof payload === 'object' && !Array.isArray(payload)){
        normalizeGuiaoPowerAutomatePayload(payload);
        init.body = JSON.stringify(payload);
      }
    } catch(e) {}
    return init;
  }

  function installGuiaoPowerAutomateFetchGuard(){
    if(window.__guiaoPowerAutomateFetchGuardInstalled) return;
    if(typeof window.fetch !== 'function') return;
    window.__guiaoPowerAutomateFetchGuardInstalled = true;
    var nativeFetch = window.fetch.bind(window);
    window.fetch = async function(input, init){
      var guarded = isGuiaoPowerAutomateRequest(input, init);
      if(guarded){
        init = Object.assign({}, init || {});
        normalizeGuiaoFetchBody(init);
      }
      var response = await nativeFetch(input, init);
      if(guarded){
        try {
          var clone = response.clone();
          clone.text().then(function(text){
            var result = guiaoFlowResponseToObject(text);
            window.__lastGuiaoFlowResponse = result || {};
            persistGuiaoItemIdFromResponse(result);
          }).catch(function(){});
        } catch(e) {}
      }
      return response;
    };
  }

  installGuiaoPowerAutomateFetchGuard();
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', updateGuiaoSubmitButtonText);
  else updateGuiaoSubmitButtonText();

function collectFormData(){
    const fields = allFields();
    const values = {};
    const byId = {};
    const byLabel = {};
    const lines = [];

    fields.forEach((el, index) => {
      const value = readValue(el);
      const label = getLabelFor(el) || el.name || el.id || `Campo ${index + 1}`;
      const key = el.id || el.name || normalizeText(label) || `field_${index + 1}`;
      values[key] = value;
      if (el.id) byId[el.id] = value;
      const norm = normalizeText(label);
      if (norm) {
        if (!byLabel[norm]) byLabel[norm] = [];
        byLabel[norm].push(value);
      }
      if (value) lines.push(`${label}: ${value}`);
    });

    function firstById(ids){
      for (const id of ids) {
        if (byId[id] !== undefined && String(byId[id]).trim() !== "") return byId[id];
      }
      return "";
    }
    function firstByLabel(labels){
      for (const label of labels) {
        const norm = normalizeText(label);
        const arr = byLabel[norm];
        if (arr) {
          const found = arr.find(v => String(v || "").trim() !== "");
          if (found !== undefined) return found;
        }
      }
      return "";
    }

    function collectTableColumnBySectionLabel(sectionLabel, columnIndex){
      const sections = Array.from(document.querySelectorAll(".section"));
      const section = sections.find(sec => normalizeText(sec.querySelector("label,h3,strong,b")?.innerText || "").includes(normalizeText(sectionLabel)));
      if (!section) return "";
      const rows = Array.from(section.querySelectorAll("table tr"));
      const values = [];
      rows.forEach(row => {
        const cells = Array.from(row.querySelectorAll("td"));
        if (!cells.length) return;
        const cell = cells[columnIndex];
        if (!cell) return;
        const inputs = Array.from(cell.querySelectorAll("input,textarea,select"));
        const text = inputs.length ? inputs.map(readValue).filter(Boolean).join(" ") : cell.innerText.trim();
        if (text) values.push(text);
      });
      return values.join("\n");
    }


    const pageTitle = (document.querySelector("h1")?.innerText || document.title || TEMPLATE_TYPE).trim();
    const title = firstById(["titulo","title","titulo_projeto","projeto","nome","uc","curso"]) ||
                  firstByLabel(["Título", "Título do projeto", "Unidade Curricular", "Curso(s)", "Curso"]) ||
                  `${TEMPLATE_TYPE} - ${new Date().toLocaleDateString("pt-PT")}`;

    const docentes = firstById(["docente","docentes","professor","professor_responsavel"]) ||
                     firstByLabel(["Docente(s)", "Docente", "Docente(s)", "Docente(s)"]);
    const cursoElDireto = document.getElementById("curso") || document.querySelector('[name="curso"]');
    const cursoDireto = cursoElDireto ? readValue(cursoElDireto) : "";
    const cursos = firstById(["curso","cursos"]) || cursoDireto || firstByLabel(["Curso(s)", "Curso"]);
    if (cursos && !values.curso) values.curso = cursos;
    if (cursos && !values.cursos) values.cursos = cursos;
    const ucs = firstById(["uc","ucs","unidade_curricular"]) || firstByLabel(["UC(s)", "Unidade Curricular", "UC"]);
    const nEstudantes = firstById(["n_estudantes","numero_estudantes","estudantes"]) || firstByLabel(["Nº de estudantes", "N.º de estudantes", "Número de estudantes"]);
    const nGrupos = firstById(["n_grupos","numero_grupos","grupos"]) || firstByLabel(["Nº de Grupos", "N.º de grupos", "Número de grupos"]);
    const unidadeOrganica = firstById(["unidade_organica","unidadeOrganica"]) || firstByLabel(["Unidade Orgânica", "Unidade Organica"]);
    const modalidade = firstById(["modalidade"]) || firstByLabel(["Modalidade"]);
    const semestre = firstById(["semestre"]) || firstByLabel(["Semestre"]);
    const turmaEdicao = firstById(["turmaEdicao","turma_edicao","turma"]) || firstByLabel(["Turma/Edição", "Turma", "Edição"]);
    const data = firstById(["data","data_simulacao","dataSimulacao","date"]) || firstByLabel(["Data da simulação", "Data"]);
    const horaInicio = firstById(["hora","hora_inicio","horaInicio","time"]) || firstByLabel(["Hora de início", "Hora"]);
    const horaFim = firstById(["hora_fim","horaFim","hora_final","horaFinal"]) || firstByLabel(["Hora de fim", "Hora final"]);
    const hora = [horaInicio, horaFim].filter(Boolean).join(" - ");
    const emails = firstById(["emails","email"]) ||
                   collectTableColumnBySectionLabel("Docentes", 1) ||
                   firstByLabel(["Email(s)", "Email", "E-mail", "E-mail(s)"]);
    const organizacoesContacto = firstById(["organizacao","organizacoes","contacto","contato"]) || firstByLabel(["Organização(ões) | Contacto", "Organização", "Contacto", "Contato"]);
    const tituloProjeto = firstById(["titulo_projeto","tituloProjeto","project_title"]) || firstByLabel(["Título do projeto", "Título do Projeto"]);
    const estadoGuiaoFormulario = firstById(["estado","estado_guiao","estadoGuiaoFormulario","estado_formulario"]) || firstByLabel(["Estado do guião", "Estado do guia"]);
    const autorizacaoEl = document.querySelector('input[name="autorizaRepositorio"]:checked');
    const autorizaRepositorio = autorizacaoEl ? String(autorizacaoEl.value || "").trim() : "";

    return {
      title,
      pageTitle,
      templateType: TEMPLATE_TYPE,
      cenarioAprendizagem: TEMPLATE_SCENARIO,
      estadoGuiao: "Submetido",
      estadoGuiaoFormulario,
      autorizaRepositorio,
      partilhaRepositorio: autorizaRepositorio,
      docentes,
      docenteTexto: docentes,
      cursos,
      ucs,
      nEstudantes,
      nGrupos,
      autorias: firstById(["autoria","autorias"]) || firstByLabel(["Autoria(s)", "Autoria"]),
      unidadeOrganica,
      modalidade,
      semestre,
      turmaEdicao,
      turma: turmaEdicao,
      data,
      dataSimulacao: data,
      hora,
      horaInicio,
      horaFim,
      hora_fim: horaFim,
      emails,
      organizacoesContacto,
      tituloProjeto,
      submittedAt: new Date().toISOString(),
      sourceUrl: window.location.href,
      formData: values,
      estruturaPedagogica: JSON.stringify({
        templateType: TEMPLATE_TYPE,
        cenarioAprendizagem: TEMPLATE_SCENARIO,
        pageTitle,
        values,
        lines
      }, null, 2),
      resumoCampos: lines.join("\n")
    };
  }

  function loadScript(src){
    return new Promise((resolve, reject) => {
      if (window.html2pdf) return resolve();
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) { existing.addEventListener("load", resolve, {once:true}); existing.addEventListener("error", reject, {once:true}); return; }
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function preparePdfElementForExport(){
    // V49 — PDF documental limpo.
    // Em vez de tentar imprimir o formulário interativo, constrói um documento próprio,
    // estático, institucional e previsível. Isto elimina cortes, scrollbars, dobras,
    // pagebreaks estranhos e conflitos acumulados de CSS.

    const oldScrollX = window.scrollX || window.pageXOffset || 0;
    const oldScrollY = window.scrollY || window.pageYOffset || 0;

    function byId(id){ return document.getElementById(id); }

    function fieldText(id){
      const el = byId(id);
      if(!el) return "";
      if(el.tagName === "SELECT"){
        const opt = el.options && el.selectedIndex >= 0 ? el.options[el.selectedIndex] : null;
        const txt = String(opt ? opt.text : (el.value || "")).trim();
        return /^Selecionar$/i.test(txt) ? "" : txt;
      }
      return String(el.value || "").trim();
    }

    function escapeHtml(str){
      return String(str || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    function valueHtml(str){
      const safe = escapeHtml(str || "");
      if(!safe) return "";
      // transforma URLs em links reais no PDF, quando possível
      return safe.replace(/(https?:\/\/[^\s<]+)/g, function(url){
        return '<a href="' + url + '" target="_blank">' + url + '</a>';
      }).replace(/\n/g, "<br>");
    }

    function field(label, value, extraClass){
      const empty = !String(value || "").trim();
      return '<div class="pdf-field ' + (extraClass || "") + '">' +
        '<div class="pdf-label">' + escapeHtml(label) + '</div>' +
        '<div class="pdf-value ' + (empty ? "is-empty" : "") + '">' + valueHtml(value) + '</div>' +
      '</div>';
    }

    function section(title, inner, extraClass){
      return '<section class="pdf-section ' + (extraClass || "") + '">' +
        '<h2>' + escapeHtml(title) + '</h2>' +
        inner +
      '</section>';
    }

    function simpleBlock(label, value){
      return '<div class="pdf-soft-block">' +
        '<div class="pdf-label">' + escapeHtml(label) + '</div>' +
        '<div class="pdf-value ' + (!String(value || "").trim() ? "is-empty" : "") + '">' + valueHtml(value) + '</div>' +
      '</div>';
    }

    function collectActionRows(){
      const table = byId("quadroAcao");
      const rows = [];
      if(table){
        Array.from(table.querySelectorAll("tr")).forEach(tr => {
          const cells = Array.from(tr.querySelectorAll("td"));
          if(cells.length >= 2){
            const leftEl = cells[0].querySelector("textarea,input");
            const rightEl = cells[1].querySelector("textarea,input");
            const left = leftEl ? String(leftEl.value || "").trim() : String(cells[0].innerText || "").trim();
            const right = rightEl ? String(rightEl.value || "").trim() : String(cells[1].innerText || "").trim();
            if(left || right) rows.push([left, right]);
          }
        });
      }
      while(rows.length < 2) rows.push(["", ""]);
      return rows.slice(0, Math.max(rows.length, 2));
    }

    const logo = document.querySelector(".header img, .logo img");
    const logoSrc = logo ? (logo.getAttribute("src") || "") : "";

    const actionRows = collectActionRows();
    const actionTable = '<div class="pdf-action-shell"><table class="pdf-action-table">' +
      '<thead><tr><th>AÇÃO – Ator/Personagem</th><th>REAÇÃO – Técnico/Profissional</th></tr></thead>' +
      '<tbody>' + actionRows.map(row =>
        '<tr><td>' + valueHtml(row[0]) + '</td><td>' + valueHtml(row[1]) + '</td></tr>'
      ).join("") + '</tbody></table></div>';

    const htmlDoc = `
      <div class="sbl-clean-pdf">
        <header class="pdf-header">
          ${logoSrc ? `<img src="${escapeHtml(logoSrc)}" alt="Logótipos">` : ""}
          <h1>PLANO DE CENÁRIO DE SIMULAÇÃO COMPLEXA</h1>
        </header>

        ${section("Identificação do guião", `
          <table class="pdf-info-table" cellspacing="0" cellpadding="0">
            <tr>
              <td class="pdf-cell-label">Unidade Orgânica:</td>
              <td class="pdf-cell-value">${valueHtml(fieldText("unidadeOrganica"))}</td>
              <td class="pdf-cell-label">Curso(s):</td>
              <td class="pdf-cell-value">${valueHtml(fieldText("curso"))}</td>
            </tr>
            <tr>
              <td class="pdf-cell-label">Docente(s):</td>
              <td class="pdf-cell-value">${valueHtml(fieldText("professor"))}</td>
              <td class="pdf-cell-label">Email(s):</td>
              <td class="pdf-cell-value">${valueHtml(fieldText("emails"))}</td>
            </tr>
            <tr>
              <td class="pdf-cell-label">Unidade(s) Curricular(es):</td>
              <td class="pdf-cell-value">${valueHtml(fieldText("uc"))}</td>
              <td class="pdf-cell-label">Número de estudantes:</td>
              <td class="pdf-cell-value">${valueHtml(fieldText("n_estudantes"))}</td>
            </tr>
            <tr>
              <td class="pdf-cell-label" colspan="2" style="text-align:center;">Ano letivo:</td>
              <td class="pdf-cell-value" colspan="2" style="text-align:center;">${valueHtml(fieldText("ano_letivo"))}</td>
            </tr>
          </table>
          <div class="pdf-ident-grid">
            ${field("Autoria", fieldText("autoria"), "full")}
            ${field("Estado do guião", fieldText("estado"))}
            <div class="pdf-two-mini">
              ${field("Data", fieldText("data"))}
              ${field("Hora", fieldText("hora"))}
            </div>
          </div>
        `)}

        ${section("Enquadramento pedagógico", `
          ${simpleBlock("Objetivos:", fieldText("objetivos"))}
          ${simpleBlock("Recursos:", fieldText("recursos"))}
        `)}

        ${section("Cenário de simulação", `
          ${simpleBlock("Caso:", fieldText("cenario"))}
          ${simpleBlock("Informação inicial:", fieldText("oq_simulacao") || fieldText("info_inicial"))}
        `)}

        ${section("Guião para ator/personagem", `
          ${actionTable}
          ${simpleBlock("Informações para ator/personagem:", fieldText("info_ator") || fieldText("ator_personagem"))}
        `, "pdf-actor-section")}
      </div>
    `;

    const pdfHost = document.createElement("div");
    pdfHost.id = "sblPdfCleanHost";
    pdfHost.style.position = "fixed";
    pdfHost.style.left = "-100000px";
    pdfHost.style.top = "0";
    pdfHost.style.width = "794px";
    pdfHost.style.background = "#fff";
    pdfHost.style.zIndex = "-1";
    pdfHost.style.pointerEvents = "none";
    pdfHost.innerHTML = htmlDoc;
    document.body.appendChild(pdfHost);

    await new Promise(resolve => setTimeout(resolve, 120));

    return {
      element: pdfHost.querySelector(".sbl-clean-pdf"),
      restore: function(){
        try { if(pdfHost && pdfHost.parentNode) pdfHost.parentNode.removeChild(pdfHost); } catch(e) {}
        try { window.scrollTo(oldScrollX, oldScrollY); } catch(e) {}
      }
    };
  }

  
  async function generatePdfBlob(payload){
    await loadScript(JSPDF_CDN);
    const jsPDF = window.jspdf && window.jspdf.jsPDF;
    if (!jsPDF) throw new Error('jsPDF não carregou.');

    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const pageW = 210;
    const pageH = 297;
    const margin = 14;
    const contentW = pageW - margin * 2;

    const red = [227, 30, 36];
    const deepRed = [227, 30, 36];
    const ink = [38, 38, 38];
    const muted = [110, 110, 110];
    const pale = [253, 247, 247];
    const soft = [250, 250, 250];
    const line = [220, 220, 220];
    const white = [255, 255, 255];

    let y = 14;

    function byId(id){ return document.getElementById(id); }

    function clean(value){
      return String(value || '')
        .replace(/\r\n/g, '\n')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/\s+;/g, ';')
        .trim();
    }

    function selectedText(el){
      if (!el) return '';
      if (el.tagName === 'SELECT') {
        const opt = el.options && el.selectedIndex >= 0 ? el.options[el.selectedIndex] : null;
        const txt = clean(opt ? opt.text : (el.value || ''));
        return /^Selecionar$/i.test(txt) ? '' : txt;
      }
      return clean(el.value || '');
    }

    function val(id){ return selectedText(byId(id)); }

    function safeText(text){
      const t = clean(text);
      return t || '—';
    }

    function split(text, width, size, style){
      pdf.setFont('helvetica', style || 'normal');
      pdf.setFontSize(size || 9);
      return pdf.splitTextToSize(safeText(text), width);
    }

    function ensure(height){
      if (y + height > pageH - 18) {
        pdf.addPage();
        y = 14;
      }
    }

    function addFooters(){
      const pages = pdf.internal.getNumberOfPages();
      for (let p = 1; p <= pages; p++) {
        pdf.setPage(p);
        pdf.setDrawColor(232, 232, 232);
        pdf.setLineWidth(0.25);
        pdf.line(margin, pageH - 12, pageW - margin, pageH - 12);
        pdf.setFont('helvetica','normal');
        pdf.setFontSize(7.2);
        pdf.setTextColor(125,125,125);
        pdf.text('Guião Simulation-Based Learning · Universidade Europeia | IADE | IPAM', margin, pageH - 7);
        pdf.text('Página ' + p, pageW - margin, pageH - 7, {align:'right'});
      }
      pdf.setPage(pages);
      pdf.setTextColor(...ink);
    }

    function rounded(x, yy, w, h, fill, stroke, radius, lw){
      pdf.setFillColor(...(fill || white));
      pdf.setDrawColor(...(stroke || line));
      pdf.setLineWidth(lw == null ? 0.28 : lw);
      pdf.roundedRect(x, yy, w, h, radius || 3.2, radius || 3.2, 'FD');
    }

    function redLine(x, yy, w){
      pdf.setDrawColor(...red);
      pdf.setLineWidth(0.55);
      pdf.line(x, yy, x + w, yy);
    }

    function findLogoSrc(){
      const imgs = Array.from(document.querySelectorAll('img'));
      const preferred = imgs.find(img => {
        const alt = (img.getAttribute('alt') || '').toLowerCase();
        const cls = (img.className || '').toString().toLowerCase();
        return alt.includes('universidade') || alt.includes('ue') || cls.includes('logo') || img.closest('.header,.logo');
      }) || imgs[0];
      return preferred && preferred.src && preferred.src.indexOf('data:image') === 0 ? preferred.src : '';
    }

    function docHeader(){
      /* SBL — cabeçalho/quadro superior alinhado ao diâmetro do PBL,
         seguindo a lógica do CBL: caixa, logótipo, título, fita e autoria. */
      const boxX = 12;
      const boxY = y - 1;
      const boxW = pageW - (boxX * 2);
      const boxH = 36;
      const border = [31, 31, 31];
      const author = val('autoria') || val('professor');

      pdf.setFillColor(...white);
      pdf.setDrawColor(...border);
      pdf.setLineWidth(0.26);
      pdf.roundedRect(boxX, boxY, boxW, boxH, 2.8, 2.8, 'S');

      const logo = findLogoSrc();
      if (logo) {
        try {
          const logoW = 25;
          const logoH = 7.9;
          pdf.addImage(logo, 'PNG', (pageW - logoW) / 2, y + 2.6, logoW, logoH);
        } catch(e) {}
      }

      y += 14;
      pdf.setFont('helvetica','bold');
      pdf.setFontSize(13.8);
      pdf.setTextColor(...ink);
      pdf.text('Guião Simulation-Based Learning', pageW / 2, y, {align:'center'});

      y += 3.7;
      pdf.setDrawColor(...red);
      pdf.setLineWidth(0.42);
      pdf.line(boxX + 12, y, boxX + boxW - 12, y);

      y += 8.0;
      pdf.setFont('helvetica','normal');
      pdf.setFontSize(7.7);
      pdf.setTextColor(...muted);
      pdf.text('Autoria: ' + safeText(author), boxX + boxW - 6, y, {align:'right'});

      y = boxY + boxH + 8;
    }

    function section(title, keepWithNextHeight){
      ensure(16 + (keepWithNextHeight || 0));
      y += y > 45 ? 2.2 : 0;
      pdf.setFont('helvetica','bold');
      pdf.setFontSize(11.2);
      pdf.setTextColor(...deepRed);
      pdf.text(title, margin, y);
      y += 4.8;
      redLine(margin, y, contentW);
      y += 4.8;
      pdf.setTextColor(...ink);
    }

    function metaCard(label, value, x, yy, w, h){
      rounded(x, yy, w, h, white, line, 3.3, 0.25);
      pdf.setFont('helvetica','bold');
      pdf.setFontSize(7.4);
      pdf.setTextColor(...muted);
      pdf.text(label, x + 3.2, yy + 5.3);
      pdf.setFont('helvetica','normal');
      pdf.setFontSize(8.55);
      pdf.setTextColor(...ink);
      const lines = split(value, w - 6.4, 8.55);
      pdf.text(lines.slice(0, 3), x + 3.2, yy + 10.3, {lineHeightFactor:1.13});
    }

    function metaGrid(items, cols){
      cols = cols || 2;
      const gap = 4;
      const w = (contentW - gap * (cols - 1)) / cols;
      const h = 21.5;
      for (let i = 0; i < items.length; i += cols) {
        ensure(h + 5);
        const row = items.slice(i, i + cols);
        row.forEach((it, idx) => metaCard(it[0], it[1], margin + idx * (w + gap), y, w, h));
        y += h + 4.2;
      }
    }


    function identificationPblStyle(){
      /* SBL — identificação do guião com a mesma sequência/estrutura do PBL, mantendo o estilo cromático do SBL. */
      section('Identificação do guião');

      const cardX = margin;
      const cardW = contentW;
      const innerX = cardX + 6;
      const innerW = cardW - 12;
      const sepX = cardX + (cardW / 2);
      const cellPad = 6;
      const leftX = innerX;
      const rightX = sepX + cellPad;
      const leftW = sepX - innerX - cellPad;
      const rightW = (cardX + cardW - 6) - rightX;
      const singleW = innerW;

      const pairRows = [
        [
          ['Unidade Orgânica', val('unidadeOrganica') || val('unidade_organica')],
          ['Curso(s)', val('curso')]
        ],
        [
          ['Docente(s)', val('professor')],
          ['Email(s)', val('emails')]
        ],
        [
          ['Unidade(s) Curricular(es)', val('uc')],
          ['Ano letivo', val('ano_letivo') || val('ano')]
        ],
        [
          ['Número de estudantes', val('n_estudantes')],
          ['Número de grupos', val('n_grupos')]
        ],
        [
          ['Data da simulação', val('data')],
          ['Hora de início', val('hora')]
        ]
      ];
      const singleRow = ['Hora de fim', val('hora_fim') || val('horaFim') || val('hora_final')];

      const rowHeights = pairRows.map(function(pair){
        return Math.max.apply(null, pair.map(function(item, idx){
          const w = idx === 0 ? leftW : rightW;
          const lines = split(item[1] || ' ', w - 7, 8.25, 'normal');
          return Math.max(17.8, 9.2 + Math.max(1, lines.length) * 4.35);
        }));
      });
      const anoLines = split(singleRow[1] || ' ', singleW - 7, 8.25, 'normal');
      const singleRowH = Math.max(17.8, 9.2 + Math.max(1, anoLines.length) * 4.35);
      const cardH = rowHeights.reduce(function(acc, h){ return acc + h; }, 0) + singleRowH + 10;
      ensure(cardH + 4);

      pdf.setFillColor(...white);
      pdf.setDrawColor(45,45,45);
      pdf.setLineWidth(0.42);
      pdf.roundedRect(cardX, y, cardW, cardH, 3.8, 3.8, 'S');

      function drawCell(item, x, yy, w, align){
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7.7);
        pdf.setTextColor(...muted);
        pdf.text(item[0] + ':', align === 'center' ? x + (w / 2) : x, yy + 4.7, align === 'center' ? {align:'center'} : undefined);

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8.25);
        pdf.setTextColor(...ink);
        pdf.text(split(item[1] || ' ', w - 7, 8.25, 'normal'), align === 'center' ? x + (w / 2) : x, yy + 9.4, align === 'center' ? {align:'center', lineHeightFactor:1.15} : {lineHeightFactor:1.15});
      }

      let yy = y + 6;
      pairRows.forEach(function(pair, ri){
        const rowH = rowHeights[ri];

        drawCell(pair[0], leftX, yy, leftW);
        drawCell(pair[1], rightX, yy, rightW);

        pdf.setDrawColor(205,205,205);
        pdf.setLineWidth(0.18);
        pdf.line(sepX, yy + 1.1, sepX, yy + rowH - 3.9);

        yy += rowH;
        pdf.setDrawColor(...line);
        pdf.setLineWidth(0.18);
        pdf.line(innerX, yy - 0.4, innerX + innerW, yy - 0.4);
      });

      drawCell(singleRow, innerX, yy, singleW, 'center');
      y += cardH + 8;
    }

    function textCard(title, value, opts){
      value = clean(value);
      const o = opts || {};
      if (!value && o.skipEmpty) return;
      const inner = 4.2;
      const size = o.size || 8.45;
      const maxW = contentW - inner * 2;
      const lines = split(value || '—', maxW, size);
      const bodyH = Math.max(o.minBody || 8, lines.length * 3.95);
      const h = Math.max(o.minH || 19, 10.5 + bodyH + 3.6);
      ensure(h + 4);
      rounded(margin, y, contentW, h, white, line, 3.7, 0.28);

      pdf.setFillColor(...soft);
      pdf.roundedRect(margin + 0.2, y + 0.2, contentW - 0.4, 9.2, 3.5, 3.5, 'F');
      pdf.setDrawColor(...red);
      pdf.setLineWidth(0.28);
      pdf.line(margin + 4, y + 9.3, pageW - margin - 4, y + 9.3);

      pdf.setFont('helvetica','bold');
      pdf.setFontSize(8.6);
      pdf.setTextColor(...ink);
      pdf.text(title, margin + inner, y + 6.2);

      pdf.setFont('helvetica','normal');
      pdf.setFontSize(size);
      pdf.setTextColor(...ink);
      pdf.text(lines, margin + inner, y + 14, {lineHeightFactor:1.16});

      y += h + (o.after == null ? 4.4 : o.after);
    }

    function twoTextCards(leftTitle, leftValue, rightTitle, rightValue){
      const gap = 4.5;
      const w = (contentW - gap) / 2;
      const inner = 3.8;
      const size = 8.15;
      const leftLines = split(leftValue || '—', w - inner*2, size);
      const rightLines = split(rightValue || '—', w - inner*2, size);
      const bodyH = Math.max(15, Math.max(leftLines.length, rightLines.length) * 3.8);
      const h = Math.max(25, 10 + bodyH + 3);
      ensure(h + 5);

      function one(x, title, lines){
        rounded(x, y, w, h, white, line, 3.6, 0.28);
        pdf.setFillColor(...soft);
        pdf.roundedRect(x + 0.2, y + 0.2, w - 0.4, 9.0, 3.4, 3.4, 'F');
        pdf.setDrawColor(...red);
        pdf.setLineWidth(0.26);
        pdf.line(x + 3.5, y + 9.2, x + w - 3.5, y + 9.2);
        pdf.setFont('helvetica','bold');
        pdf.setFontSize(8.5);
        pdf.setTextColor(...ink);
        pdf.text(title, x + inner, y + 6.0);
        pdf.setFont('helvetica','normal');
        pdf.setFontSize(size);
        pdf.text(lines, x + inner, y + 13.5, {lineHeightFactor:1.15});
      }

      one(margin, leftTitle, leftLines);
      one(margin + w + gap, rightTitle, rightLines);
      y += h + 4.6;
    }

    function actionRows(){
      const table = byId('quadroAcao');
      const rows = [];
      if (table) {
        Array.from(table.querySelectorAll('tr')).forEach(tr => {
          if (tr.classList && tr.classList.contains('sbl-acoes-footer-row')) return;
          const cells = Array.from(tr.querySelectorAll('td'));
          if (cells.length < 2) return;
          const readCell = cell => {
            const el = cell.querySelector('textarea,input,select');
            return el ? selectedText(el) : clean(cell.innerText || '');
          };
          const a = readCell(cells[0]);
          const r = readCell(cells[1]);
          if (a || r) rows.push([a, r]);
        });
      }
      return rows.length ? rows : [['','']];
    }

    function actionReactionTable(rows){
      rows = (rows || []).filter(r => clean(r[0]) || clean(r[1]));
      if (!rows.length) rows = [['','']];

      const gap = 0;
      const indexW = 9;
      const colW = (contentW - indexW - gap) / 2;
      const inner = 3.5;
      const size = 8.05;

      rows.forEach((row, idx) => {
        const leftLines = split(row[0] || '—', colW - inner*2, size);
        const rightLines = split(row[1] || '—', colW - inner*2, size);
        const bodyH = Math.max(14, Math.max(leftLines.length, rightLines.length) * 3.7);
        const h = Math.max(28, 10.5 + bodyH + 5);
        ensure(h + 4);

        rounded(margin, y, contentW, h, white, line, 3.8, 0.28);

        pdf.setFillColor(...pale);
        pdf.roundedRect(margin + 0.2, y + 0.2, contentW - 0.4, 9.6, 3.6, 3.6, 'F');

        pdf.setFont('helvetica','bold');
        pdf.setFontSize(7.8);
        pdf.setTextColor(...deepRed);
        pdf.text(String(idx + 1).padStart(2, '0'), margin + 3, y + 6.3);

        pdf.setTextColor(...ink);
        pdf.text('Ação', margin + indexW + inner, y + 6.3);
        pdf.text('Reação', margin + indexW + colW + inner, y + 6.3);

        pdf.setDrawColor(...line);
        pdf.setLineWidth(0.24);
        pdf.line(margin + indexW, y, margin + indexW, y + h);
        pdf.line(margin + indexW + colW, y, margin + indexW + colW, y + h);
        pdf.line(margin, y + 9.8, margin + contentW, y + 9.8);

        pdf.setFont('helvetica','normal');
        pdf.setFontSize(size);
        pdf.setTextColor(...ink);
        pdf.text(leftLines, margin + indexW + inner, y + 15.2, {lineHeightFactor:1.15});
        pdf.text(rightLines, margin + indexW + colW + inner, y + 15.2, {lineHeightFactor:1.15});

        y += h + 3.8;
      });
    }

    docHeader();

    identificationPblStyle();

    section('Enquadramento da simulação');
    twoTextCards('Objetivos de aprendizagem', val('objetivos'), 'Recursos necessários', val('recursos'));
    textCard('Caso / cenário de simulação', val('cenario'), {minH:22});
    textCard('Informação inicial para estudantes', val('oq_simulacao') || val('info_inicial'), {minH:22});

    section('Guião para ator/personagem', 34);
    textCard('Informações para ator/personagem', val('info_ator') || val('ator_personagem'), {minH:20});
    actionReactionTable(actionRows());

    addFooters();
    return pdf.output('blob');
  }


  async function generatePdfBase64(payload){
    try {
      const blob = await generatePdfBlob(payload);
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(String(reader.result || "").split(",")[1] || "");
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch(e) {
      console.warn("[PowerAutomate] PDF automático falhou. Submissão seguirá sem PDF.", e);
      return "";
    }
  }

  
function guiaoPdfNormalizeFilePart(value){
  var text = String(value || '').trim();
  text = text.split(/\n|;|\||,/).map(function(x){ return x.trim(); }).filter(Boolean)[0] || text;
  try { text = text.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch(e) {}
  text = text.replace(/[^A-Za-z0-9]+/g, ' ').trim();
  if(!text) return '';
  text = text.split(/\s+/).map(function(part){
    return part ? part.charAt(0).toUpperCase() + part.slice(1) : '';
  }).join('');
  return text.slice(0, 50);
}
function guiaoPdfReadFirstUc(){
  var selectors = [
    '#uc','#unidade_curricular','[name="uc"]','[name="ucs"]','[name="unidade_curricular"]',
    '#ucProjeto','#nomeUCProjeto','#nomeUcProjeto','#nome_uc_projeto','#nomeProjetoUC','.projbl-nome-uc-projeto-field'
  ];
  for(var i=0;i<selectors.length;i++){
    var el = document.querySelector(selectors[i]);
    if(el && /^(INPUT|TEXTAREA|SELECT)$/i.test(el.tagName || '')){
      var v = String(el.value || '').trim();
      if(v) return v;
    }
  }
  var labels = Array.prototype.slice.call(document.querySelectorAll('label,th,strong,b'));
  for(var j=0;j<labels.length;j++){
    var t = String(labels[j].textContent || '').toLowerCase();
    if(t.indexOf('unidade') !== -1 && (t.indexOf('curricular') !== -1 || t.indexOf('uc') !== -1)){
      var root = labels[j].closest('tr, .section, .header-card, div') || labels[j].parentElement;
      if(root){
        var field = root.querySelector('textarea,input,select');
        if(field){
          var val = String(field.value || '').trim();
          if(val) return val;
        }
      }
    }
  }
  return '';
}
function guiaoPdfFileName(cenario, fallback){
  var uc = guiaoPdfNormalizeFilePart(guiaoPdfReadFirstUc());
  return String(cenario || 'Guiao') + '_' + (uc || fallback || 'Guiao') + '.pdf';
}
try { window.guiaoPdfFileName = guiaoPdfFileName; } catch(e) {}

async function downloadCurrentGuiesPdf(){
    try {
      toast("A preparar o PDF...");
      const payload = collectFormData();
      payload.pdfFileName = guiaoPdfFileName("SBL", "Guiao");
      const blob = await generatePdfBlob(payload);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = payload.pdfFileName;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
      toast("PDF gerado com sucesso.", "ok");
    } catch(e) {
      console.error("[PDF] Erro ao gerar PDF:", e);
      toast("Não foi possível gerar o PDF.", "error");
      alert("Não foi possível gerar o PDF.\n\nDetalhe técnico:\n" + (e.message || e));
    }
  }
  window.downloadGuiesPdf = downloadCurrentGuiesPdf;
  window.salvarPDF = downloadCurrentGuiesPdf;


  async function submitToPowerAutomate(button){
    if (activeSubmission) return;

    const emailField = document.getElementById("emails") || document.querySelector('[name="emails"], [name="email"], #email');
    if(emailField && !String(emailField.value || "").trim()){
      emailField.classList.add("sbl-email-error");
      try { emailField.scrollIntoView({behavior:"smooth", block:"center"}); emailField.focus({preventScroll:true}); } catch(e) { try { emailField.focus(); } catch(_) {} }
      toast("Para enviar o guião para validação, indique pelo menos um e-mail no campo Email(s).", "error");
      return;
    }
    if(emailField) emailField.classList.remove("sbl-email-error");

    activeSubmission = true;
    const originalText = button ? button.textContent : "";
    if (button) { button.disabled = true; button.textContent = "A enviar..."; }
    toast("A enviar para validação...", "info");

    try {
      const payload = collectFormData();
      normalizeGuiaoPowerAutomatePayload(payload);
      payload.pdfFileName = guiaoPdfFileName("SBL", "Guiao");
      payload.pdfBase64 = await Promise.race([
        generatePdfBase64(payload),
        new Promise(function(resolve){
          setTimeout(function(){
            console.warn("[PowerAutomate] Geração do PDF excedeu o tempo limite. Submissão seguirá sem PDF automático.");
            resolve("");
          }, 25000);
        })
      ]);
      payload.html = "<!DOCTYPE html>\n" + document.documentElement.outerHTML;

      const controller = (typeof AbortController !== "undefined") ? new AbortController() : null;
      const timeoutId = setTimeout(function(){
        try { if (controller) controller.abort(); } catch(e) {}
      }, 55000);
      let response;
      try {
        response = await fetch(FLOW_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller ? controller.signal : undefined
        });
      } finally {
        clearTimeout(timeoutId);
      }

      const responseText = await response.text();
      let responseJson = null;
      try { responseJson = responseText ? JSON.parse(responseText) : null; } catch(e) {}
      if (!response.ok) {
        throw new Error(`Power Automate respondeu ${response.status}. ${responseText || ""}`);
      }

      toast(getGuiaoSuccessMessage(responseJson || window.__lastGuiaoFlowResponse), "ok");
      console.log("[PowerAutomate] Submissão concluída", responseJson || responseText);
      showSubmissionConfirmation(responseJson);
    } catch(error) {
      console.error("[PowerAutomate] Erro na submissão:", error);
      const isTimeout = error && (error.name === "AbortError" || /abort|timeout|tempo limite/i.test(String(error.message || error)));
      const msg = isTimeout ? "O envio demorou demasiado e foi interrompido. Verifique o histórico do Power Automate antes de tentar novamente." : "Não foi possível enviar para validação.";
      toast(msg, "error");
      alert(msg + "\n\nDetalhe técnico:\n" + (error.message || error));
    } finally {
      activeSubmission = false;
      if (button) { button.disabled = false; button.textContent = originalText || "Enviar para Validação"; }
    }
  }

  function showSubmissionConfirmation(result){
    result = result || window.__lastGuiaoFlowResponse || {};
    try {
      let panel = document.getElementById("powerAutomateSubmissionConfirmation");
      if (!panel) {
        panel = document.createElement("div");
        panel.id = "powerAutomateSubmissionConfirmation";
        panel.className = "no-print";
        panel.style.margin = "18px 0";
        panel.style.padding = "16px 18px";
        panel.style.border = "1.5px solid #1f4d2b";
        panel.style.borderRadius = "14px";
        panel.style.background = "#f3fff6";
        panel.style.color = "#1f4d2b";
        panel.style.fontSize = "13px";
        const actions = document.querySelector(".ux-actions");
        if (actions && actions.parentNode) actions.parentNode.insertBefore(panel, actions);
        else document.body.appendChild(panel);
      }
      const itemInfo = '';
      var modo = getGuiaoSubmissionMode(result);
      var titulo = modo === "updated" ? "✅ Guião atualizado com sucesso." : "✅ Guião submetido com sucesso.";
      var texto = modo === "updated" ? "As alterações foram enviadas para nova validação" : "O seu guião foi enviado para validação";
      panel.innerHTML = `<strong>${titulo}</strong><br>${texto}.<br>Pode fechar esta página.`;
      panel.scrollIntoView({behavior:"smooth", block:"center"});
    } catch(e) {}
  }

  function findSubmitButtons(){
    return Array.from(document.querySelectorAll("button, input[type='button'], input[type='submit']")).filter(btn => {
      const text = (btn.textContent || btn.value || "").toLowerCase();
      return text.includes("enviar para valida") || text.includes("submeter") || text.includes("submiss") || btn.id === "btnValidacaoReal";
    });
  }

  function bindSubmitButtons(){
    const buttons = findSubmitButtons();
    buttons.forEach(btn => {
      if (btn.dataset.powerAutomateBound === "1") return;
      btn.dataset.powerAutomateBound = "1";
      btn.setAttribute("type", "button");
      btn.onclick = null;
      btn.addEventListener("click", function(ev){
        ev.preventDefault();
        ev.stopPropagation();
        submitToPowerAutomate(btn);
      }, true);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bindSubmitButtons);
  else bindSubmitButtons();
  setTimeout(bindSubmitButtons, 300);
  setTimeout(bindSubmitButtons, 1200);

  window.submitToGuiesPowerAutomate = submitToPowerAutomate;
})();

;

(function(){
  "use strict";
  const DOCENTE_OK_MESSAGE = "Guião submetido com sucesso. O seu guião foi enviado para validação.";
  function isSubmitButton(btn){
    const text = (btn && (btn.textContent || btn.value || "")).toLowerCase();
    return text.includes("enviar para valida") || text.includes("submeter") || text.includes("submiss") || (btn && btn.id === "btnValidacaoReal");
  }
  function bind(){
    document.querySelectorAll("button, input[type='button'], input[type='submit']").forEach(function(btn){
      if(!isSubmitButton(btn)) return;
      btn.removeAttribute("onclick");
      btn.type = "button";
      if(btn.dataset.submissaoDocenteFinal === "1") return;
      btn.dataset.submissaoDocenteFinal = "1";
      btn.addEventListener("click", function(ev){
        ev.preventDefault();
        ev.stopPropagation();
        ev.stopImmediatePropagation();
        if(window.submitToGuiesPowerAutomate){
          return window.submitToGuiesPowerAutomate(btn);
        }
        if(typeof toast === "function") toast("A preparar submissão...", "info");
      }, true);
    });
  }
  document.addEventListener("DOMContentLoaded", bind);
  setTimeout(bind, 80);
  setTimeout(bind, 500);
})();

;

(function(){
  var BOT_URL = "https://teams.microsoft.com/l/app/?titleId=T_3563aa57-a2da-f9ec-f15e-40e313566c90";
  window.abrirAssistentePedagogico = function(){
    if(typeof toast === 'function') toast('A abrir o Assistente IA no Teams...', 'ok', 2200);
    window.setTimeout(function(){
      window.open(BOT_URL, "_blank", "noopener,noreferrer");
    }, 900);
  };
})();

;

/* ===== Validação defensiva — campos numéricos ===== */
(function(){
  const fields = [
    {ids:["n_estudantes","nEstudantes"], label:"Nº de estudantes"},
    {ids:["n_grupos","nGrupos"], label:"Nº de Grupos"}
  ];

  function findInput(ids){
    for(const id of ids){
      const el = document.getElementById(id) || document.querySelector('[name="'+id+'"]');
      if(el) return el;
    }
    return null;
  }

  function isValidNumber(v){
    v = String(v || "").trim().replace(",", ".");
    return v === "" || /^[0-9]+(\.[0-9]+)?$/.test(v);
  }

  function warn(label){
    const msg = "Indique apenas o número em “" + label + "”, sem texto adicional. Exemplo: 30";
    if(typeof showToast === "function") showToast(msg);
    else if(typeof mostrarToast === "function") mostrarToast(msg);
    else alert(msg);
  }

  window.validarCamposNumericosGuiao = function(){
    for(const f of fields){
      const el = findInput(f.ids);
      if(el && !isValidNumber(el.value)){
        el.focus();
        warn(f.label);
        return false;
      }
    }
    return true;
  };

  document.addEventListener("input", function(ev){
    const el = ev.target;
    if(!el) return;
    const allIds = fields.flatMap(f => f.ids);
    if(allIds.includes(el.id) || allIds.includes(el.name)){
      el.value = el.value.replace(/[^\d.,]/g, "");
    }
  }, true);

  document.addEventListener("click", function(ev){
    const btn = ev.target && ev.target.closest ? ev.target.closest("button") : null;
    if(!btn) return;
    const txt = (btn.textContent || "").toLowerCase();
    if(txt.includes("enviar para validação") || btn.id === "btnEnviarValidacao" || btn.id === "btnValidacaoReal"){
      if(!window.validarCamposNumericosGuiao()){
        ev.preventDefault();
        ev.stopPropagation();
        ev.stopImmediatePropagation();
        return false;
      }
    }
  }, true);
})();

;

/* ===== Validação SBL — Data e hora da simulação ===== */
(function(){
  function toastSBL(message){
    if(typeof showToast === "function") showToast(message);
    else if(typeof mostrarToast === "function") mostrarToast(message);
    else if(typeof toast === "function") toast(message, "error");
    else alert(message);
  }

  window.validarDataHoraSBL = function(){
    const data = document.getElementById("data");
    const horaInicio = document.getElementById("hora");
    const horaFim = document.getElementById("hora_fim");
    if(!data || !horaInicio || !horaFim) return true;

    const missing = [];
    if(!String(data.value || "").trim()) missing.push("Data da simulação");
    if(!String(horaInicio.value || "").trim()) missing.push("Hora de início");
    if(!String(horaFim.value || "").trim()) missing.push("Hora de fim");

    if(missing.length){
      const target = !String(data.value || "").trim() ? data : (!String(horaInicio.value || "").trim() ? horaInicio : horaFim);
      try { target.focus(); } catch(e) {}
      toastSBL("No SBL, indique Data da simulação, Hora de início e Hora de fim.");
      return false;
    }
    return true;
  };

  document.addEventListener("click", function(ev){
    const btn = ev.target && ev.target.closest ? ev.target.closest("button") : null;
    if(!btn) return;
    const txt = (btn.textContent || "").toLowerCase();
    if(txt.includes("enviar para validação") || btn.id === "btnEnviarValidacao" || btn.id === "btnValidacaoReal"){
      if(!window.validarDataHoraSBL()){
        ev.preventDefault();
        ev.stopPropagation();
        ev.stopImmediatePropagation();
        return false;
      }
    }
  }, true);
})();

;

(function(){
  "use strict";

  var STORAGE_KEY = "template_autosave_SBL";

  function toastSafe(msg, type, duration){
    if(typeof window.toast === "function") return window.toast(msg, type, duration);
    var old = document.querySelector(".toast-message");
    if(old) old.remove();
    var d = document.createElement("div");
    d.className = "toast-message";
    d.textContent = msg;
    d.style.background = type === "error" ? "#7a1f1f" : (type === "ok" ? "#1f4d2b" : "#333");
    document.body.appendChild(d);
    setTimeout(function(){ if(d.parentNode) d.remove(); }, duration || 3200);
  }

  function fields(){
    return Array.prototype.slice.call(document.querySelectorAll("input, textarea, select"))
      .filter(function(el){ return !el.disabled && el.type !== "hidden"; });
  }

  function ownSaveDraft(){
    var p = { timestamp: new Date().toLocaleTimeString("pt-PT"), data: {} };
    fields().forEach(function(el){
      var key = el.id || el.name;
      if(key) p.data[key] = el.value;
    });
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); }catch(e){}
    var st = document.getElementById("autosaveStatus");
    if(st) st.textContent = "Última gravação automática: " + p.timestamp;
    toastSafe("Rascunho guardado com sucesso.", "ok");
  }

  function ownRestoreDraft(){
    var raw = null;
    try{ raw = localStorage.getItem(STORAGE_KEY); }catch(e){}
    if(!raw){ toastSafe("Não há rascunho guardado."); return; }
    try{
      var p = JSON.parse(raw);
      fields().forEach(function(el){
        var key = el.id || el.name;
        if(key && p.data && p.data[key] !== undefined){
          el.value = p.data[key];
          el.dispatchEvent(new Event("input", {bubbles:true}));
          el.dispatchEvent(new Event("change", {bubbles:true}));
        }
      });
      toastSafe("Rascunho restaurado.", "ok");
    }catch(e){
      toastSafe("Não foi possível restaurar o rascunho.", "error");
    }
  }

  function ownClear(){
    fields().forEach(function(el){
      if(el.tagName === "SELECT") el.selectedIndex = 0;
      else el.value = "";
      el.dispatchEvent(new Event("input", {bubbles:true}));
      el.dispatchEvent(new Event("change", {bubbles:true}));
    });
    toastSafe("Formulário limpo.");
  }

  function ownDelete(){
    try{ localStorage.removeItem(STORAGE_KEY); }catch(e){}
    var st = document.getElementById("autosaveStatus");
    if(st) st.textContent = "Última gravação automática: --";
    toastSafe("Rascunho local apagado.");
  }

  function replaceWithCleanClone(btn){
    if(!btn || !btn.parentNode) return btn;
    var clone = btn.cloneNode(true);
    btn.parentNode.replaceChild(clone, btn);
    return clone;
  }

  function bindMore(){
    var btn = document.getElementById("btnMaisOpcoes") ||
      Array.from(document.querySelectorAll("button")).find(function(b){
        return (b.textContent || "").toLowerCase().includes("mais opções");
      });
    var menu = document.getElementById("uxMenuMaisOpcoes") || document.querySelector(".ux-menu");
    if(!btn || !menu || btn.dataset.sblV2MoreBound === "1") return;

    btn = replaceWithCleanClone(btn);
    btn.dataset.sblV2MoreBound = "1";
    menu.id = menu.id || "uxMenuMaisOpcoes";
    menu.classList.add("ux-menu");
    menu.innerHTML =
      '<button type="button" id="draftBtn">💾 Guardar rascunho</button>' +
      '<button type="button" id="restoreBtn">📂 Restaurar rascunho</button>' +
      '<button type="button" id="deleteBtn">🗑️ Apagar rascunho</button>' +
      '<button type="button" id="reuseHeaderBtn">↩️ Reutilizar cabeçalho</button>' +
      '<button type="button" id="clearBtn">🧹 Limpar formulário</button>';

    btn.addEventListener("click", function(e){
      e.preventDefault();
      e.stopPropagation();
      menu.classList.toggle("open");
    }, true);

    document.addEventListener("click", function(e){
      if(!menu.contains(e.target) && e.target !== btn) menu.classList.remove("open");
    }, true);

    menu.querySelector("#draftBtn").addEventListener("click", function(){ ownSaveDraft(); menu.classList.remove("open"); });
    menu.querySelector("#restoreBtn").addEventListener("click", function(){ ownRestoreDraft(); menu.classList.remove("open"); });
    menu.querySelector("#deleteBtn").addEventListener("click", function(){ ownDelete(); menu.classList.remove("open"); });
    var reuseBtn = menu.querySelector("#reuseHeaderBtn");
    if(reuseBtn) reuseBtn.addEventListener("click", function(){ if(typeof window.sblReuseHeader === "function") window.sblReuseHeader(); menu.classList.remove("open"); });
    menu.querySelector("#clearBtn").addEventListener("click", function(){ ownClear(); menu.classList.remove("open"); });
  }

  function bindPdf(){
    var btn = document.getElementById("btnPDF") || document.getElementById("btnSalvarPDF") ||
      Array.from(document.querySelectorAll("button")).find(function(b){
        return (b.textContent || "").toLowerCase().includes("salvar pdf");
      });
    if(!btn || btn.dataset.sblV2PdfBound === "1") return;
    btn = replaceWithCleanClone(btn);
    btn.dataset.sblV2PdfBound = "1";
    btn.addEventListener("click", function(e){
      e.preventDefault();
      e.stopPropagation();
      if(e.stopImmediatePropagation) e.stopImmediatePropagation();
      if(window.downloadGuiesPdf) window.downloadGuiesPdf();
      else toastSafe("Não foi possível encontrar o gerador de PDF.", "error");
    }, true);
  }

  function bindAi(){
    var btn = document.getElementById("btnAssistenteIA") ||
      Array.from(document.querySelectorAll("button")).find(function(b){
        return (b.textContent || "").includes("Assistente IA");
      });
    if(!btn || btn.dataset.sblV2AiBound === "1") return;
    btn = replaceWithCleanClone(btn);
    btn.dataset.sblV2AiBound = "1";
    btn.addEventListener("click", function(e){
      e.preventDefault();
      e.stopPropagation();
      if(e.stopImmediatePropagation) e.stopImmediatePropagation();
      if(window.abrirAssistentePedagogico) window.abrirAssistentePedagogico();
      else toastSafe("Assistente IA disponível no ambiente institucional.");
    }, true);
  }

  function bindHints(){
    document.querySelectorAll('button[title="Saiba mais"]').forEach(function(btn){
      if(btn.dataset.sblV2HintBound === "1") return;
      btn.dataset.sblV2HintBound = "1";
      btn.addEventListener("click", function(e){
        e.preventDefault();
        e.stopPropagation();
        if(e.stopImmediatePropagation) e.stopImmediatePropagation();

        var targetId = "";
        var on = btn.getAttribute("onclick") || "";
        var m = on.match(/getElementById\(['"]([^'"]+)['"]\)/);
        if(m) targetId = m[1];

        var hint = targetId ? document.getElementById(targetId) : null;
        if(!hint){
          var next = btn.nextElementSibling;
          if(next && next.id && next.id.indexOf("hint_") === 0) hint = next;
        }
        if(hint){
          var isOpen = hint.style.display === "block";
          hint.style.display = isOpen ? "none" : "block";
        }
        return false;
      }, true);
      btn.removeAttribute("onclick");
    });
  }

  function addRowHelper(){
    var table = document.getElementById("quadroAcao");
    if(!table || table.querySelector(".sbl-row-helper")) return;
    var plus = table.querySelector(".btn-plus");
    var minus = table.querySelector(".btn-minus");
    if(!plus || !minus) return;
    var cell = plus.closest("td") || plus.parentNode;
    if(!cell) return;
    var helper = document.createElement("div");
    helper.className = "sbl-row-helper no-print";
    helper.innerHTML = '';
    cell.appendChild(helper);
  }

  function bindEmailCleaner(){
    var el = document.getElementById("emails") || document.querySelector('[name="emails"], [name="email"], #email');
    if(!el || el.dataset.sblEmailCleanerBound === "1") return;
    el.dataset.sblEmailCleanerBound = "1";
    el.addEventListener("input", function(){
      if(String(el.value || "").trim()) el.classList.remove("sbl-email-error");
    });
  }

  function init(){
    bindMore();
    bindPdf();
    bindAi();
    bindHints();
    addRowHelper();
    bindEmailCleaner();
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
  setTimeout(init, 250);
  setTimeout(init, 900);
})();

;

(function(){
  "use strict";

  function toastSafe(msg, type, duration){
    if(typeof window.toast === "function") return window.toast(msg, type, duration);
    var old = document.querySelector(".toast-message");
    if(old) old.remove();
    var d = document.createElement("div");
    d.className = "toast-message";
    d.textContent = msg;
    d.style.background = type === "error" ? "#7a1f1f" : (type === "ok" ? "#1f4d2b" : "#333");
    document.body.appendChild(d);
    setTimeout(function(){ if(d.parentNode) d.remove(); }, duration || 3200);
  }

  function emailField(){
    return document.getElementById("emails") ||
           document.querySelector('[name="emails"], [name="email"], #email');
  }

  function validateEmailForSubmission(){
    var el = emailField();
    if(!el) return true;
    if(String(el.value || "").trim()) {
      el.classList.remove("sbl-email-error");
      return true;
    }
    el.classList.add("sbl-email-error");
    try {
      el.scrollIntoView({behavior:"smooth", block:"center"});
      setTimeout(function(){ try { el.focus({preventScroll:true}); } catch(e){ el.focus(); } }, 180);
    } catch(e) {
      try { el.focus(); } catch(_) {}
    }
    toastSafe("Para enviar o guião para validação, indique pelo menos um e-mail no campo Email(s).", "error");
    return false;
  }

  function cleanEmailOnInput(){
    var el = emailField();
    if(!el || el.dataset.sblV3EmailCleaner === "1") return;
    el.dataset.sblV3EmailCleaner = "1";
    el.addEventListener("input", function(){
      if(String(el.value || "").trim()) el.classList.remove("sbl-email-error");
    });
  }

  function findValidationButton(){
    return document.getElementById("btnEnviarValidacao") ||
           document.getElementById("btnValidacaoReal") ||
           Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"]')).find(function(btn){
             var txt = (btn.textContent || btn.value || "").toLowerCase();
             return txt.includes("enviar para valida") || txt.includes("submeter") || txt.includes("submiss");
           });
  }

  function bindValidationButton(){
    var btn = findValidationButton();
    if(!btn || btn.dataset.sblV3ValidationBound === "1") return;

    var clone = btn.cloneNode(true);
    clone.dataset.sblV3ValidationBound = "1";
    clone.type = "button";
    btn.parentNode.replaceChild(clone, btn);

    clone.addEventListener("click", function(e){
      e.preventDefault();
      e.stopPropagation();
      if(e.stopImmediatePropagation) e.stopImmediatePropagation();

      if(!validateEmailForSubmission()) return false;

      if(typeof window.submitToGuiesPowerAutomate === "function"){
        window.submitToGuiesPowerAutomate(clone);
      }else{
        toastSafe("Não foi possível encontrar a função de envio para validação.", "error");
      }
      return false;
    }, true);
  }

  function setupTooltips(){
    document.querySelectorAll(".btn-plus, .btn-minus").forEach(function(btn){
      var isMinus = btn.classList.contains("btn-minus") || (btn.textContent || "").trim() === "-";
      var isPlus = btn.classList.contains("btn-plus") || (btn.textContent || "").trim() === "+";
      if(isMinus){
        btn.removeAttribute("title");
        btn.setAttribute("aria-label", "Remover linha");
        btn.setAttribute("data-sbl-tooltip", "Remover linha");
      }else if(isPlus){
        btn.removeAttribute("title");
        btn.setAttribute("aria-label", "Adicionar linha");
        btn.setAttribute("data-sbl-tooltip", "Adicionar linha");
      }
    });
  }

  function insertDividerBeforeObjectives(){
    var objetivos = document.getElementById("objetivos");
    if(!objetivos) return;
    var section = objetivos.closest(".section") || objetivos.parentElement;
    if(!section || section.previousElementSibling?.classList?.contains("sbl-section-divider-red")) return;

    var divider = document.createElement("div");
    divider.className = "sbl-section-divider-red";
    section.parentNode.insertBefore(divider, section);
  }

  function init(){
    cleanEmailOnInput();
    bindValidationButton();
    setupTooltips();
}

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  setTimeout(init, 250);
  setTimeout(init, 900);
})();

;

(function(){
  "use strict";

  var tooltipEl = null;

  function getTooltipText(btn){
    var txt = btn.getAttribute("data-sbl-tooltip") || btn.getAttribute("aria-label") || "";
    if(!txt){
      var raw = (btn.textContent || "").trim();
      if(raw === "-") txt = "Remover linha";
      else if(raw === "+") txt = "Adicionar linha";
    }
    return txt;
  }

  function showFloatingTooltip(btn){
    var txt = getTooltipText(btn);
    if(!txt) return;

    hideFloatingTooltip();

    tooltipEl = document.createElement("div");
    tooltipEl.className = "sbl-floating-tooltip";
    tooltipEl.textContent = txt;
    document.body.appendChild(tooltipEl);

    var rect = btn.getBoundingClientRect();
    var x = rect.left + rect.width / 2;
    var y = rect.top - 8;

    tooltipEl.style.left = x + "px";
    tooltipEl.style.top = y + "px";
  }

  function hideFloatingTooltip(){
    if(tooltipEl && tooltipEl.parentNode) tooltipEl.parentNode.removeChild(tooltipEl);
    tooltipEl = null;
  }

  function bindFloatingTooltips(){
    document.querySelectorAll(".btn-plus, .btn-minus").forEach(function(btn){
      var raw = (btn.textContent || "").trim();
      var isMinus = btn.classList.contains("btn-minus") || raw === "-";
      var isPlus = btn.classList.contains("btn-plus") || raw === "+";
      if(isMinus){
        btn.removeAttribute("title");
        btn.setAttribute("aria-label", "Remover linha");
        btn.setAttribute("data-sbl-tooltip", "Remover linha");
      }else if(isPlus){
        btn.removeAttribute("title");
        btn.setAttribute("aria-label", "Adicionar linha");
        btn.setAttribute("data-sbl-tooltip", "Adicionar linha");
      }else{
        return;
      }

      if(btn.dataset.sblV4TooltipBound === "1") return;
      btn.dataset.sblV4TooltipBound = "1";

      btn.addEventListener("mouseenter", function(){ showFloatingTooltip(btn); });
      btn.addEventListener("focus", function(){ showFloatingTooltip(btn); });
      btn.addEventListener("mouseleave", hideFloatingTooltip);
      btn.addEventListener("blur", hideFloatingTooltip);
      btn.addEventListener("click", function(){
        showFloatingTooltip(btn);
        setTimeout(hideFloatingTooltip, 650);
      }, true);
    });
  }

  function makeDivider(extraClass){
    var d = document.createElement("div");
    d.className = "sbl-divider-red" + (extraClass ? " " + extraClass : "");
    return d;
  }

  function insertVisualDividers(){
    /*
      Quebra visual sugerida:
      1) depois de Unidade Orgânica / Modalidade;
      2) antes de Objetivos.
      Isto separa o cabeçalho institucional dos dados do guião e evita o bloco único.
    */

    var headerGrid = document.querySelector(".header-grid");
    if(headerGrid && !headerGrid.nextElementSibling?.classList?.contains("sbl-divider-red")){
      headerGrid.parentNode.insertBefore(makeDivider("sbl-divider-soft"), headerGrid.nextSibling);
    }

    var objetivos = document.getElementById("objetivos");
    if(objetivos){
      var section = objetivos.closest(".section") || objetivos.parentElement;
      if(section && !section.previousElementSibling?.classList?.contains("sbl-divider-red")){
        section.parentNode.insertBefore(makeDivider("sbl-divider-soft"), section);
      }
    }
  }

  function init(){
    bindFloatingTooltips();
}

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  setTimeout(init, 250);
  setTimeout(init, 900);
})();

;

(function(){
  "use strict";

  function removeDividers(){
    document.querySelectorAll(".sbl-section-divider-red, .sbl-divider-red").forEach(function(el){
      if(el && el.parentNode) el.parentNode.removeChild(el);
    });
  }

  function neutralizeDividerInsertion(){
    /* Impede que scripts anteriores voltem a inserir as linhas extra */
    try {
      window.insertVisualDividers = function(){};
      window.insertDividerBeforeObjectives = function(){};
    } catch(e) {}
  }

  function init(){
    neutralizeDividerInsertion();
    removeDividers();
    setTimeout(removeDividers, 200);
    setTimeout(removeDividers, 900);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  var observer = new MutationObserver(function(){ removeDividers(); });
  function startObserver(){
    try {
      observer.observe(document.body, {childList:true, subtree:true});
    } catch(e) {}
  }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", startObserver);
  else startObserver();
})();

;

(function(){
  function removeExtraDividers(){
    document.querySelectorAll(".sbl-section-divider-red, .sbl-divider-red").forEach(function(el){
      if(el && el.parentNode) el.parentNode.removeChild(el);
    });
  }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", removeExtraDividers);
  else removeExtraDividers();
  setTimeout(removeExtraDividers, 250);
  setTimeout(removeExtraDividers, 900);
})();

;

(function(){
  "use strict";

  function makeSeparator(title){
    var wrap = document.createElement("div");
    wrap.className = "sbl-doc-separator-wrap";

    if(title){
      var t = document.createElement("div");
      t.className = "sbl-doc-block-title";
      t.textContent = title;
      wrap.appendChild(t);
    }

    var line = document.createElement("div");
    line.className = "sbl-doc-separator";
    wrap.appendChild(line);
    return wrap;
  }

  function alreadyHasSeparatorBefore(el){
    var prev = el && el.previousElementSibling;
    return !!(prev && prev.classList && prev.classList.contains("sbl-doc-separator-wrap"));
  }

  function sectionByControl(id){
    var el = document.getElementById(id);
    return el ? (el.closest(".section") || el.parentElement) : null;
  }

  function sectionByLabelText(txt){
    txt = String(txt || "").toLowerCase();
    return Array.from(document.querySelectorAll(".section, .sbl-rounded-block, .sbl-rounded-title-block")).find(function(sec){
      return (sec.textContent || "").toLowerCase().includes(txt);
    });
  }

  function removeOldDynamicLines(){
    document.querySelectorAll(".sbl-section-divider-red, .sbl-divider-red").forEach(function(el){
      if(el && el.parentNode) el.parentNode.removeChild(el);
    });
  }

  function insertSeparators(){
    removeOldDynamicLines();

    /* 1) Antes de Objetivos/Recursos — separa identificação do enquadramento pedagógico */
    var objetivosSec = sectionByControl("objetivos");
    if(objetivosSec && !alreadyHasSeparatorBefore(objetivosSec)){
      objetivosSec.parentNode.insertBefore(makeSeparator("Enquadramento pedagógico"), objetivosSec);
    }

    /* 2) Antes de Procedimentos/Briefing — separa preparação da simulação */
    var procedimentos = document.getElementById("hint_procedimentos");
    var procedimentosSec = procedimentos ? (procedimentos.closest(".section") || procedimentos.parentElement) : null;
    if(procedimentosSec && !alreadyHasSeparatorBefore(procedimentosSec)){
      procedimentosSec.parentNode.insertBefore(makeSeparator("Preparação da simulação"), procedimentosSec);
    }

    /* 3) Antes do Guião/Informações para Ator — separa bloco de personagem */
    var atorSec = document.getElementById("hint_ator");
    atorSec = atorSec ? (atorSec.closest(".section") || atorSec.parentElement) : sectionByLabelText("guião para ator");
    if(atorSec && !alreadyHasSeparatorBefore(atorSec)){
      atorSec.parentNode.insertBefore(makeSeparator("Guião para ator/personagem"), atorSec);
    }
  }

  function init(){
    insertSeparators();
    setTimeout(insertSeparators, 250);
    setTimeout(insertSeparators, 900);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

;

(function(){
  "use strict";

  function normalizeTitle(txt){
    txt = String(txt || "").trim().toLowerCase();
    if(txt === "preparação da simulação" || txt === "preparacao da simulacao"){
      return "Cenário de simulação";
    }
    if(txt === "guião para ator/personagem" || txt === "guiao para ator/personagem"){
      return "Guião para ator/personagem";
    }
    if(txt === "enquadramento pedagógico" || txt === "enquadramento pedagogico"){
      return "Enquadramento pedagógico";
    }
    return null;
  }

  function updateTitles(){
    document.querySelectorAll(".sbl-doc-block-title").forEach(function(el){
      var fixed = normalizeTitle(el.textContent);
      if(fixed) el.textContent = fixed;
    });
  }

  function removeInternalDuplicateLines(){
    document.querySelectorAll(".sbl-doc-separator-wrap").forEach(function(wrap){
      var next = wrap.nextElementSibling;
      if(!next) return;
      var line = next.querySelector(':scope > div[style*="border-top"]');
      if(line){
        line.style.display = "none";
        line.style.visibility = "hidden";
        line.style.height = "0";
        line.style.margin = "0";
        line.style.padding = "0";
        line.style.border = "0";
      }
    });
  }

  function init(){
    updateTitles();
    removeInternalDuplicateLines();
    setTimeout(updateTitles, 250);
    setTimeout(removeInternalDuplicateLines, 250);
    setTimeout(updateTitles, 900);
    setTimeout(removeInternalDuplicateLines, 900);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

;

(function(){
  function apply(){
    var objetivos = document.getElementById('objetivos');
    if(objetivos){
      var shell = objetivos.closest('.section') || objetivos.parentElement;
      if(shell){
        shell.classList.add('sbl-v13-objetivos-shell');
      }
    }
  }
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', apply);
  } else {
    apply();
  }
  setTimeout(apply, 300);
  setTimeout(apply, 1000);
})();

;

(function(){
  "use strict";
  function limparTooltipsDuplicadas(){
    document.querySelectorAll(".btn-plus[title], .btn-minus[title]").forEach(function(btn){
      var t = btn.getAttribute("title") || "";
      if(t) btn.setAttribute("aria-label", t);
      btn.removeAttribute("title");
    });
  }
  function harmonizarBotoes(){
    limparTooltipsDuplicadas();
    var pdf = document.getElementById("btnSalvarPDF");
    if(pdf) pdf.setAttribute("aria-label", "Gerar guião em PDF");
    var submit = document.getElementById("btnEnviarValidacao") || document.getElementById("btnValidacaoReal");
    if(submit) submit.setAttribute("aria-label", "Enviar guião SBL para validação");
  }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", harmonizarBotoes);
  else harmonizarBotoes();
  setTimeout(harmonizarBotoes, 500);
})();

;

(function(){
  'use strict';
  function fixUnidadeOrganica(){
    var s = document.getElementById('unidadeOrganica');
    if(!s) return;
    var atual = s.value || '';
    var opts = [
      {value:'', text:'Selecionar...'},
      {value:'IADE', text:'IADE'},
      {value:'IPAM Lisboa', text:'IPAM Lisboa'},
      {value:'IPAM Porto', text:'IPAM Porto'},
      {value:'FCS', text:'FCS'},
      {value:'FCST', text:'FCST'}
    ];
    var precisa = opts.some(function(o){ return !Array.prototype.some.call(s.options, function(op){ return op.value === o.value || op.text === o.text; }); });
    if(precisa || s.options.length !== opts.length){
      s.innerHTML = '';
      opts.forEach(function(o){
        var op = document.createElement('option');
        op.value = o.value;
        op.textContent = o.text;
        s.appendChild(op);
      });
      if(opts.some(function(o){return o.value === atual;})) s.value = atual;
    }
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fixUnidadeOrganica);
  else fixUnidadeOrganica();
  [100, 400, 900, 1500, 2400].forEach(function(ms){ setTimeout(fixUnidadeOrganica, ms); });
})();

;

(function(){
  'use strict';

  var targetIds = ['uc','professor','emails','objetivos','recursos','cenario','oq_simulacao','info_ator'];

  function unwrapOld(el){
    if(!el || !el.parentElement) return el;
    var parent = el.parentElement;
    if(parent.classList && (
      parent.classList.contains('sblx-wrap') ||
      parent.classList.contains('ana-expand-wrap') ||
      parent.classList.contains('textarea-resize-wrapper')
    )){
      var grand = parent.parentElement;
      if(grand){
        grand.insertBefore(el, parent);
        parent.remove();
      }
    }
    return el;
  }

  function ensureHandleForTextarea(el, opts){
    if(!el || el.tagName !== 'TEXTAREA') return false;
    el = unwrapOld(el);
    var wrap = (el.parentElement && el.parentElement.classList && el.parentElement.classList.contains('sbl-header-resize-wrap')) ? el.parentElement : null;
    if(!wrap){
      wrap = document.createElement('div');
      wrap.className = 'sbl-header-resize-wrap';
      el.parentNode.insertBefore(wrap, el);
      wrap.appendChild(el);
    }
    var handle = wrap.querySelector('.sbl-header-resize-handle');
    if(!handle){
      handle = document.createElement('span');
      handle.className = 'sbl-header-resize-handle';
      handle.setAttribute('aria-hidden','true');
      wrap.appendChild(handle);
    }

    el.removeAttribute('data-sblx-ready');
    el.removeAttribute('data-ana-expand-ready');
    el.classList.remove('ana-expand-target');

    el.style.setProperty('overflow','auto','important');
    el.style.setProperty('max-height','none','important');
    el.style.setProperty('box-sizing','border-box','important');
    el.style.setProperty('display','block','important');
    el.style.setProperty('resize','none','important');
    el.style.setProperty('padding-right','22px','important');

    var minH = (opts && opts.minHeight) ? opts.minHeight : 42;
    el.style.setProperty('min-height', minH + 'px', 'important');
    if(!el.dataset.sblManualResizeInit){
      var currentHeight = el.getBoundingClientRect().height;
      if(!currentHeight || currentHeight < minH){
        el.style.height = minH + 'px';
      }
      el.dataset.sblManualResizeInit = '1';
    }

    if(handle.dataset.bound === '1') return true;
    handle.dataset.bound = '1';

    function startResize(ev){
      ev.preventDefault();
      ev.stopPropagation();
      var pointer = ev.touches && ev.touches[0] ? ev.touches[0] : ev;
      var startY = pointer.clientY;
      var startH = el.getBoundingClientRect().height || minH;
      document.body.style.userSelect = 'none';
      function move(moveEv){
        var p = moveEv.touches && moveEv.touches[0] ? moveEv.touches[0] : moveEv;
        var delta = p.clientY - startY;
        var next = Math.max(minH, startH + delta);
        el.style.setProperty('height', next + 'px', 'important');
        el.dataset.sblManualResized = '1';
      }
      function stop(){
        document.removeEventListener('mousemove', move, true);
        document.removeEventListener('mouseup', stop, true);
        document.removeEventListener('touchmove', move, true);
        document.removeEventListener('touchend', stop, true);
        document.body.style.userSelect = '';
      }
      document.addEventListener('mousemove', move, true);
      document.addEventListener('mouseup', stop, true);
      document.addEventListener('touchmove', move, true);
      document.addEventListener('touchend', stop, true);
    }
    handle.addEventListener('mousedown', startResize, true);
    handle.addEventListener('touchstart', startResize, true);
    return true;
  }

  function cleanOldHandles(){
    document.querySelectorAll('.sblx-grip,.ana-expand-grip,.resize-handle,.sbl-resize-handle,.textarea-resize-handle,.resize-grip,.drag-corner').forEach(function(el){ el.remove(); });
  }

  function apply(){
    ['uc','professor','emails'].forEach(function(id){ ensureHandleForTextarea(document.getElementById(id), {minHeight:42}); });
    ['objetivos','recursos','cenario','oq_simulacao','info_ator'].forEach(function(id){ ensureHandleForTextarea(document.getElementById(id), {minHeight:84}); });
    document.querySelectorAll('#quadroAcao textarea').forEach(function(el){ ensureHandleForTextarea(el, {minHeight:72}); });
    cleanOldHandles();
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply); else apply();
  [100,300,800,1500,2500,4000].forEach(function(ms){ setTimeout(apply, ms); });

  window.SBL_TESTAR_PUXADORES_CABECALHO = function(){
    var arr = [];
    ['uc','professor','emails','objetivos','recursos','cenario','oq_simulacao','info_ator'].forEach(function(id){
      var el = document.getElementById(id);
      var handle = el && el.parentElement ? el.parentElement.querySelector('.sbl-header-resize-handle') : null;
      arr.push({id:id, existe:!!el, tag:el ? el.tagName : null, altura:el ? el.getBoundingClientRect().height : null, handle:!!handle});
    });
    document.querySelectorAll('#quadroAcao textarea').forEach(function(el, i){
      var handle = el.parentElement ? el.parentElement.querySelector('.sbl-header-resize-handle') : null;
      arr.push({id:'quadroAcao['+i+']', existe:true, tag:el.tagName, altura:el.getBoundingClientRect().height, handle:!!handle});
    });
    return arr;
  };
})();

;

(function(){
  'use strict';

  function byId(id){ return document.getElementById(id); }

  function findCardContaining(el){
    if(!el) return null;
    return el.closest('.sbl47-v53-card') || el.closest('td') || el.closest('.cbl-course-cell') || el.parentElement;
  }

  function makeField(labelText, contentEl, opts){
    var field = document.createElement('div');
    var cls = 'sbl-oferta-field';
    if(opts && opts.wide) cls += ' sbl-oferta-wide';
    if(opts && opts.cls) cls += ' ' + opts.cls;
    field.className = cls;

    var label = document.createElement('label');
    label.textContent = labelText;
    if(opts && opts.forId) label.setAttribute('for', opts.forId);
    field.appendChild(label);

    if(contentEl) field.appendChild(contentEl);
    return field;
  }

  function ensureHoraFim(){
    var existing = byId('hora_fim');
    if(existing) return existing;
    var hora = byId('hora');
    var input = document.createElement('input');
    input.id = 'hora_fim';
    input.name = 'hora_fim';
    input.type = 'time';
    input.placeholder = 'HH:MM';
    if(hora && hora.parentNode){
      var card = document.createElement('div');
      card.className = 'sbl47-v53-card';
      var lab = document.createElement('label');
      lab.setAttribute('for','hora_fim');
      lab.textContent = 'Hora de fim';
      card.appendChild(lab);
      card.appendChild(input);
      var horaCard = findCardContaining(hora);
      if(horaCard && horaCard.parentNode) horaCard.parentNode.insertBefore(card, horaCard.nextSibling);
    }
    return input;
  }

  function getCoursePicker(){
    var picker = document.querySelector('.cbl-course-picker');
    if(picker) return picker;

    var curso = byId('curso');
    if(!curso) return null;

    var oldValue = curso.value || curso.getAttribute('value') || '';
    var card = findCardContaining(curso);
    if(!card) return null;

    card.innerHTML =
      '<div class="cbl-course-picker" data-multicourse="true">' +
        '<input id="curso" name="curso" type="hidden"/>' +
        '<div class="cbl-course-search-row">' +
          '<input autocomplete="off" id="cursoBusca" list="cblCursosList" placeholder="Digite para procurar e selecione um curso" type="text"/>' +
        '</div>' +
        '<div aria-live="polite" class="cbl-course-chips" id="cblCursosSelecionados"></div>' +
        '<div class="cbl-course-helper">Selecione um curso na lista. Para adicionar mais cursos, repita a seleção.</div>' +
      '</div>';

    var hidden = byId('curso');
    if(hidden) hidden.value = oldValue;

    return card.querySelector('.cbl-course-picker');
  }

  function markOldContainersHidden(containers){
    containers.forEach(function(c){
      if(!c) return;
      var hasRelevant = c.querySelector && c.querySelector('#curso,#cursoBusca,#uc,#ano_letivo,#emails,#professor,#data,#hora,#hora_fim,#n_estudantes,#n_grupos');
      if(!hasRelevant){
        c.classList.add('sbl-oferta-original-hidden');
      }
    });
  }

  function apply(){
    if(document.querySelector('.sbl-oferta-section')) return;

    var coursePicker = getCoursePicker();
    var uc = byId('uc');
    var professor = byId('professor');
    var nEstudantes = byId('n_estudantes');
    var nGrupos = byId('n_grupos');
    var emails = byId('emails');
    var ano = byId('ano_letivo') || byId('ano');
    var data = byId('data');
    var hora = byId('hora');
    var horaFim = ensureHoraFim();

    if(!coursePicker || !uc || !ano || !emails || !professor) return;

    [nEstudantes, nGrupos].forEach(function(el){
      if(!el) return;
      el.setAttribute('type','number');
      el.setAttribute('inputmode','numeric');
      el.setAttribute('min','0');
      el.setAttribute('step','1');
    });

    if(data) data.setAttribute('type','date');
    if(hora) hora.setAttribute('type','time');
    if(horaFim) horaFim.setAttribute('type','time');

    var oldContainers = [
      findCardContaining(coursePicker),
      findCardContaining(uc),
      findCardContaining(professor),
      findCardContaining(nEstudantes),
      findCardContaining(nGrupos),
      findCardContaining(emails),
      findCardContaining(ano),
      findCardContaining(data),
      findCardContaining(hora),
      findCardContaining(horaFim)
    ];

    var section = document.createElement('div');
    section.className = 'section sbl-oferta-section sbl-oferta-simulacao-section';
    section.innerHTML = '<h3>Dados da oferta</h3><div class="sbl-oferta-grid"></div>';

    var grid = section.querySelector('.sbl-oferta-grid');

    grid.appendChild(makeField('Curso(s):', coursePicker, {forId:'cursoBusca', cls:'sbl-oferta-span-2'}));
    grid.appendChild(makeField('Unidade(s) Curricular(es):', uc, {forId:'uc', cls:'sbl-oferta-span-2'}));
    grid.appendChild(makeField('Docente(s):', professor, {forId:'professor', cls:'sbl-oferta-span-2'}));

    if(nEstudantes){
      var estudantesField = makeField('Número de estudantes', nEstudantes, {forId:'n_estudantes', cls:'sbl-oferta-numeric-field'});
      grid.appendChild(estudantesField);
    }
    if(nGrupos){
      var gruposField = makeField('Número de grupos', nGrupos, {forId:'n_grupos', cls:'sbl-oferta-numeric-field'});
      grid.appendChild(gruposField);
    }

    grid.appendChild(makeField('Email(s):', emails, {forId:'emails', cls:'sbl-oferta-span-2'}));
    grid.appendChild(makeField('Ano letivo:', ano, {forId:ano.id, cls:'sbl-oferta-span-2'}));

    if(data) grid.appendChild(makeField('Data da simulação', data, {forId:'data', cls:'sbl-oferta-date-field sbl-oferta-span-2'}));
    if(hora) grid.appendChild(makeField('Hora de início', hora, {forId:'hora', cls:'sbl-oferta-time-field'}));
    if(horaFim) grid.appendChild(makeField('Hora de fim', horaFim, {forId:'hora_fim', cls:'sbl-oferta-time-field'}));

    var anchor = oldContainers.find(Boolean);
    var block = anchor ? (anchor.closest('.sbl47-v53-header-cards') || anchor.closest('table') || anchor) : null;

    if(block && block.parentNode){
      block.parentNode.insertBefore(section, block);
    }else{
      var ident = document.querySelector('.sbl47-v53-header-cards') || document.querySelector('.cbl-ident-table') || document.querySelector('.header-grid');
      if(ident && ident.parentNode) ident.parentNode.insertBefore(section, ident.nextSibling);
      else document.body.insertBefore(section, document.body.firstChild);
    }

    markOldContainersHidden(oldContainers);

    var oldTable = anchor ? anchor.closest('table') : null;
    if(oldTable && !oldTable.querySelector('#curso,#cursoBusca,#uc,#ano_letivo,#ano,#emails,#professor,#data,#hora,#hora_fim,#n_estudantes,#n_grupos')){
      oldTable.classList.add('sbl-oferta-original-hidden');
    }

    var oldCards = document.querySelector('.sbl47-v53-header-cards');
    if(oldCards && !oldCards.querySelector('#curso,#cursoBusca,#uc,#ano_letivo,#ano,#emails,#professor,#data,#hora,#hora_fim,#n_estudantes,#n_grupos')){
      oldCards.classList.add('sbl-oferta-original-hidden');
    }

    if(typeof window.SBL_TESTAR_CURSO_CBL === 'function'){
      window.SBL_TESTAR_CURSO_CBL();
    }
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', apply);
  }else{
    apply();
  }

  [100, 300, 800, 1500].forEach(function(ms){ setTimeout(apply, ms); });
})();

;

(function(){
  'use strict';

  function apply(){
    var sec = document.querySelector('.sbl-oferta-section');
    if(sec){
      var h3 = sec.querySelector(':scope > h3');
      if(h3) h3.remove();
    }

    var courseField = document.querySelector('.sbl-oferta-field .cbl-course-picker');
    if(courseField){
      var field = courseField.closest('.sbl-oferta-field');
      if(field && !field.querySelector('label[for="cursoBusca"]')){
        var label = document.createElement('label');
        label.setAttribute('for','cursoBusca');
        label.textContent = 'Curso(s):';
        field.insertBefore(label, courseField);
      }
    }

    var chips = document.getElementById('cblCursosSelecionados');
    if(chips){
      Array.prototype.slice.call(chips.querySelectorAll('.cbl-course-helper')).forEach(function(el){
        if((el.textContent || '').toLowerCase().indexOf('nenhum curso') >= 0){
          el.remove();
        }
      });
    }
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', apply);
  }else{
    apply();
  }

  [100, 300, 800, 1500].forEach(function(ms){
    setTimeout(apply, ms);
  });
})();

;

(function(){
  'use strict';
  function apply(){
    var picker = document.querySelector('.cbl-course-picker');
    var chips = document.getElementById('cblCursosSelecionados');
    if(!picker || !chips) return;
    var count = chips.querySelectorAll('.cbl-course-chip').length;
    if(count > 0) picker.classList.add('has-chips');
    else picker.classList.remove('has-chips');

    // Garantir rótulo de Curso(s) se por qualquer motivo sumir
    var field = picker.closest('.sbl-oferta-field');
    if(field && !field.querySelector('label[for="cursoBusca"]')){
      var label = document.createElement('label');
      label.setAttribute('for','cursoBusca');
      label.textContent = 'Curso(s):';
      field.insertBefore(label, picker);
    }
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply); else apply();
  [100,300,800,1500,2500].forEach(function(ms){ setTimeout(apply, ms); });
})();

;

(function(){
  'use strict';
  function apply(){
    var picker = document.querySelector('.cbl-course-picker');
    var chips = document.getElementById('cblCursosSelecionados');
    var search = document.getElementById('cursoBusca');
    if(!picker || !chips || !search) return;

    function refresh(){
      var count = chips.querySelectorAll('.cbl-course-chip').length;
      if(count > 0) picker.classList.add('has-chips');
      else picker.classList.remove('has-chips');
    }

    if(search.dataset.sblHelperBound !== '1'){
      search.dataset.sblHelperBound = '1';
      search.addEventListener('focus', function(){
        if(!picker.classList.contains('has-chips')) picker.classList.add('show-helper');
      });
      search.addEventListener('blur', function(){
        setTimeout(function(){ picker.classList.remove('show-helper'); }, 120);
      });
      search.addEventListener('input', function(){ refresh(); });
    }

    refresh();
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply); else apply();
  [100,300,800,1500].forEach(function(ms){ setTimeout(apply, ms); });
})();

;

(function(){
  'use strict';
  function apply(){
    var email = document.getElementById('emails');
    if(email){
      email.style.setProperty('height','42px','important');
      email.style.setProperty('min-height','42px','important');
      email.style.setProperty('padding','9px 20px 9px 10px','important');
    }
    var ano = document.getElementById('ano_letivo') || document.getElementById('ano');
    if(ano){
      ano.style.setProperty('height','42px','important');
      ano.style.setProperty('min-height','42px','important');
      ano.style.setProperty('padding','9px 10px','important');
    }
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply); else apply();
  [100,300,800,1500].forEach(function(ms){ setTimeout(apply, ms); });
})();

;

(function(){
  'use strict';

  function makeCard(id, labelText, options){
    var card = document.createElement('div');
    card.className = 'header-card';

    var label = document.createElement('label');
    label.setAttribute('for', id);
    label.textContent = labelText;

    var select = document.createElement('select');
    select.id = id;

    options.forEach(function(opt){
      var option = document.createElement('option');
      if(typeof opt === 'string'){
        option.value = opt;
        option.textContent = opt;
      }else{
        option.value = opt.value;
        option.textContent = opt.text;
      }
      select.appendChild(option);
    });

    card.appendChild(label);
    card.appendChild(select);
    return card;
  }

  function ensureHeaderSelectors(){
    var grid = document.querySelector('.header-grid');
    if(!grid) return;

    // Evita duplicar se o ficheiro já tiver estes campos.
    var semestre = document.getElementById('semestre');
    var turma = document.getElementById('turmaEdicao');

    if(!semestre){
      grid.appendChild(makeCard('semestre', 'Semestre', [
        {value:'', text:'Selecionar'},
        '1.º Semestre',
        '2.º Semestre',
        'Anual'
      ]));
    }

    if(!turma){
      grid.appendChild(makeCard('turmaEdicao', 'Turma/Edição', [
        {value:'', text:'Selecionar'},
        'Turma 1',
        'Turma 2',
        'Turma 3',
        'Turma 4'
      ]));
    }

    // Garante a ordem desejada: Unidade Orgânica, Modalidade, Semestre, Turma/Edição.
    var wanted = ['unidadeOrganica', 'modalidade', 'semestre', 'turmaEdicao'];
    wanted.forEach(function(id){
      var el = document.getElementById(id);
      var card = el ? el.closest('.header-card') : null;
      if(card && card.parentElement === grid){
        grid.appendChild(card);
      }
    });

    // Dispara eventos leves para autosave/progresso caso existam.
    ['semestre','turmaEdicao'].forEach(function(id){
      var el = document.getElementById(id);
      if(el && el.dataset.sblHeaderBound !== '1'){
        el.dataset.sblHeaderBound = '1';
        el.addEventListener('change', function(){
          el.dispatchEvent(new Event('input', {bubbles:true}));
          if(typeof window.renderProgress === 'function') window.renderProgress();
        });
      }
    });
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', ensureHeaderSelectors);
  }else{
    ensureHeaderSelectors();
  }

  [100, 300, 800, 1500].forEach(function(ms){
    setTimeout(ensureHeaderSelectors, ms);
  });

  window.SBL_TESTAR_HEADER_QUATRO_SELETORES = function(){
    return ['unidadeOrganica','modalidade','semestre','turmaEdicao'].map(function(id){
      var el = document.getElementById(id);
      return {
        id:id,
        existe:!!el,
        tag:el ? el.tagName : null,
        valor:el ? el.value : null
      };
    });
  };
})();

;

(function(){
  'use strict';

  function norm(v){
    return String(v || '').replace(/\s+/g, ' ').trim();
  }

  function splitCourses(v){
    return String(v || '').split(';').map(norm).filter(Boolean);
  }

  function uniq(list){
    var out = [];
    var seen = {};
    list.forEach(function(item){
      var k = item.toLowerCase();
      if(!seen[k]){
        seen[k] = true;
        out.push(item);
      }
    });
    return out;
  }

  function getOptions(){
    var list = document.getElementById('cblCursosList');
    if(!list) return [];
    return Array.prototype.slice.call(list.querySelectorAll('option'))
      .map(function(o){ return norm(o.value); })
      .filter(Boolean);
  }

  function ensureStructure(){
    var hidden = document.getElementById('curso');
    var search = document.getElementById('cursoBusca');
    var chips = document.getElementById('cblCursosSelecionados');
    var picker = document.querySelector('.cbl-course-picker');

    if(hidden && search && chips && picker){
      hidden.type = 'hidden';
      hidden.name = hidden.name || 'curso';
      return {hidden:hidden, search:search, chips:chips, picker:picker};
    }

    return null;
  }

  function init(){
    var parts = ensureStructure();
    if(!parts) return;

    var hidden = parts.hidden;
    var search = parts.search;
    var chips = parts.chips;
    var picker = parts.picker;

    /* Remove listeners antigos clonando apenas o campo de busca.
       Mantém id/list/placeholders, mas evita scripts anteriores limitarem/reinicializarem. */
    if(search.dataset.sblUnlimitedReady !== '1'){
      var clone = search.cloneNode(true);
      clone.value = '';
      clone.dataset.sblUnlimitedReady = '1';
      clone.dataset.nativeList = clone.getAttribute('list') || clone.dataset.nativeList || 'cblCursosList';
      clone.removeAttribute('list');
      search.parentNode.replaceChild(clone, search);
      search = clone;
    }else{
      search.dataset.nativeList = search.getAttribute('list') || search.dataset.nativeList || 'cblCursosList';
      search.removeAttribute('list');
    }

    hidden.type = 'hidden';
    hidden.name = hidden.name || 'curso';
    hidden.style.setProperty('display', 'none', 'important');
    hidden.dataset.sblUnlimitedPayload = '1';

    function render(){
      var cursos = uniq(splitCourses(hidden.value));
      hidden.value = cursos.join('; ');
      chips.innerHTML = '';

      if(cursos.length > 0){
        picker.classList.add('has-chips');
      }else{
        picker.classList.remove('has-chips');
      }

      cursos.forEach(function(curso, idx){
        var chip = document.createElement('span');
        chip.className = 'cbl-course-chip';

        var label = document.createElement('span');
        label.textContent = curso;

        var rm = document.createElement('button');
        rm.type = 'button';
        rm.setAttribute('aria-label', 'Remover curso');
        rm.title = 'Remover curso';
        rm.textContent = '×';

        rm.addEventListener('click', function(){
          var atual = splitCourses(hidden.value);
          atual.splice(idx, 1);
          hidden.value = atual.join('; ');
          hidden.dispatchEvent(new Event('input', {bubbles:true}));
          hidden.dispatchEvent(new Event('change', {bubbles:true}));
          render();
          if(typeof window.renderProgress === 'function') window.renderProgress();
        });

        chip.appendChild(label);
        chip.appendChild(rm);
        chips.appendChild(chip);
      });
    }

    function addCourse(raw){
      var typed = norm(raw || search.value);
      if(!typed) return false;

      var current = splitCourses(hidden.value);
      typed.split(';').map(norm).filter(Boolean).forEach(function(item){
        current.push(item);
      });

      hidden.value = uniq(current).join('; ');
      search.value = '';

      hidden.dispatchEvent(new Event('input', {bubbles:true}));
      hidden.dispatchEvent(new Event('change', {bubbles:true}));

      render();
      if(typeof window.renderProgress === 'function') window.renderProgress();
      return true;
    }

    var timer = null;

    search.addEventListener('input', function(){
      clearTimeout(timer);
      timer = setTimeout(function(){
        var typed = norm(search.value);
        if(!typed) return;

        var exact = getOptions().find(function(o){
          return o.toLowerCase() === typed.toLowerCase();
        });

        if(exact) addCourse(exact);
      }, 80);
    });

    search.addEventListener('change', function(){
      if(norm(search.value)) addCourse(search.value);
    });

    search.addEventListener('keydown', function(ev){
      if(ev.key === 'Enter'){
        ev.preventDefault();
        addCourse(search.value);
      }
      if(ev.key === ';'){
        setTimeout(function(){ addCourse(search.value); }, 0);
      }
    });

    hidden.addEventListener('input', render);
    hidden.addEventListener('change', render);

    render();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  }else{
    init();
  }

  [100, 300, 800, 1500, 2500].forEach(function(ms){
    setTimeout(init, ms);
  });

  window.SBL_TESTAR_CURSOS_ILIMITADOS = function(){
    var hidden = document.getElementById('curso');
    var chips = document.getElementById('cblCursosSelecionados');
    return {
      valor: hidden ? hidden.value : null,
      quantidade: hidden ? splitCourses(hidden.value).length : 0,
      chips: chips ? chips.querySelectorAll('.cbl-course-chip').length : 0,
      busca: !!document.getElementById('cursoBusca'),
      datalist: !!document.getElementById('cblCursosList')
    };
  };
})();

;

(function(){
  'use strict';

  function ensureAuth(){
    var block = document.getElementById('partilhaRepositorio');
    var actions = document.querySelector('.ux-actions, div[aria-label="Ações do guião"]');

    if(!block && actions){
      actions.insertAdjacentHTML('beforebegin', `
<div class="section no-print sbl-repository-authorization" id="partilhaRepositorio">
  <h3 class="sbl-repository-title">Autorização para integração no repositório</h3>
  <p class="sbl-repository-text">
    Caso este guião seja validado, autoriza a sua integração no
    <strong>Repositório Institucional de Práticas Pedagógicas</strong>, para consulta interna e possível
    reutilização/adaptação por outros docentes?
  </p>

  <div class="sbl-repository-options" role="radiogroup" aria-label="Autorização para integração no repositório">
    <label class="sbl-repository-option" for="autorizaRepositorioSim">
      <input type="radio" id="autorizaRepositorioSim" name="autorizaRepositorio" value="Sim" checked />
      <span>Sim, autorizo a integração deste guião no repositório após validação.</span>
    </label>
    <label class="sbl-repository-option" for="autorizaRepositorioNao">
      <input type="radio" id="autorizaRepositorioNao" name="autorizaRepositorio" value="Não" />
      <span>Não autorizo a integração deste guião no repositório.</span>
    </label>
  </div>

  <p class="sbl-repository-note">
    A integração no repositório não é automática e depende sempre de validação prévia.
  </p>
</div>
`);
      block = document.getElementById('partilhaRepositorio');
    }

    if(!block) return;

    var sim = document.getElementById('autorizaRepositorioSim');
    var nao = document.getElementById('autorizaRepositorioNao');

    if(sim && !sim.name) sim.name = 'autorizaRepositorio';
    if(nao && !nao.name) nao.name = 'autorizaRepositorio';

    // Se nenhum estiver selecionado, mantém a opção do CBL como padrão.
    if(sim && nao && !sim.checked && !nao.checked) sim.checked = true;

    [sim, nao].forEach(function(el){
      if(el && el.dataset.sblRepoBound !== '1'){
        el.dataset.sblRepoBound = '1';
        el.addEventListener('change', function(){
          el.dispatchEvent(new Event('input', {bubbles:true}));
          if(typeof window.renderProgress === 'function') window.renderProgress();
        });
      }
    });
  }

  // Patch não invasivo: se collectFormData existir e devolver objeto,
  // acrescenta autorizaRepositorio sem alterar os restantes campos.
  function patchCollectFormData(){
    if(typeof window.collectFormData !== 'function' || window.collectFormData.datasetSblRepoPatched === '1') return;
    var original = window.collectFormData;
    function patched(){
      var data = original.apply(this, arguments);
      try{
        if(data && typeof data === 'object'){
          var checked = document.querySelector('input[name="autorizaRepositorio"]:checked');
          data.autorizaRepositorio = checked ? checked.value : '';
          data.partilhaRepositorio = checked ? checked.value : '';
        }
      }catch(e){}
      return data;
    }
    patched.datasetSblRepoPatched = '1';
    window.collectFormData = patched;
  }

  function init(){
    ensureAuth();
    patchCollectFormData();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  }else{
    init();
  }

  [100, 300, 800, 1500].forEach(function(ms){
    setTimeout(init, ms);
  });

  window.SBL_TESTAR_AUTORIZACAO_REPOSITORIO = function(){
    var checked = document.querySelector('input[name="autorizaRepositorio"]:checked');
    var payload = null;
    try{
      payload = typeof window.collectFormData === 'function' ? window.collectFormData() : null;
    }catch(e){
      payload = {erro:String(e)};
    }
    return {
      bloco: !!document.getElementById('partilhaRepositorio'),
      sim: !!document.getElementById('autorizaRepositorioSim'),
      nao: !!document.getElementById('autorizaRepositorioNao'),
      selecionado: checked ? checked.value : null,
      payloadAutorizaRepositorio: payload && payload.autorizaRepositorio ? payload.autorizaRepositorio : null,
      payloadPartilhaRepositorio: payload && payload.partilhaRepositorio ? payload.partilhaRepositorio : null
    };
  };
})();

;

(function(){
  'use strict';

  function getBlock(id){
    var el = document.getElementById(id);
    if(!el) return null;
    var block = el.closest('.section');
    if(block) return block;
    var wrap = el.closest('.sbl-header-resize-wrap');
    if(wrap && wrap.parentElement) return wrap.parentElement;
    return el.parentElement;
  }

  function apply(){
    ['objetivos','recursos'].forEach(function(id){
      var el = document.getElementById(id);
      var block = getBlock(id);
      if(!el || !block) return;

      block.classList.remove('sbl-objetivos-recursos-uniforme');
      block.classList.add('sbl-objetivos-recursos-compacto');

      // Altura compacta inicial. O puxador continua permitindo expansão.
      if(!el.dataset.sblObjRecUserResized){
        el.style.setProperty('height','78px','important');
        el.style.setProperty('min-height','78px','important');
      }

      if(el.dataset.sblCompactResizeBound !== '1'){
        el.dataset.sblCompactResizeBound = '1';
        el.addEventListener('mousedown', function(){
          el.dataset.sblObjRecUserResized = '1';
        });
        el.addEventListener('touchstart', function(){
          el.dataset.sblObjRecUserResized = '1';
        });
      }
    });
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', apply);
  }else{
    apply();
  }

  [100,300,800,1500].forEach(function(ms){
    setTimeout(apply, ms);
  });

  window.SBL_TESTAR_OBJETIVOS_RECURSOS_COMPACTOS = function(){
    return ['objetivos','recursos'].map(function(id){
      var el = document.getElementById(id);
      var block = getBlock(id);
      return {
        id:id,
        existe:!!el,
        alturaCampo:el ? getComputedStyle(el).height : null,
        classeCompacta:block ? block.classList.contains('sbl-objetivos-recursos-compacto') : false
      };
    });
  };
})();

;

(function(){
  'use strict';

  function apply(){
    ['uc','emails','professor'].forEach(function(id){
      var el = document.getElementById(id);
      if(!el) return;

      var wrap = el.parentElement;
      if(wrap && wrap.classList && wrap.classList.contains('sbl-header-resize-wrap')){
        wrap.classList.add('sbl-always-visible-handle');
      }
    });
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', apply);
  }else{
    apply();
  }

  [100, 300, 800, 1500].forEach(function(ms){
    setTimeout(apply, ms);
  });

  window.SBL_TESTAR_PUXADORES_OFERTA_VISIVEIS = function(){
    return ['uc','emails','professor'].map(function(id){
      var el = document.getElementById(id);
      var wrap = el && el.parentElement && el.parentElement.classList.contains('sbl-header-resize-wrap') ? el.parentElement : null;
      var handle = wrap ? wrap.querySelector('.sbl-header-resize-handle') : null;
      return {
        id:id,
        existe:!!el,
        wrap:!!wrap,
        classeSempreVisivel: !!(wrap && wrap.classList.contains('sbl-always-visible-handle')),
        handle:!!handle
      };
    });
  };
})();

;

(function(){
  'use strict';

  function nearestSectionFor(id){
    var el = document.getElementById(id);
    if(!el) return null;
    return el.closest('.section') || (el.parentElement && el.parentElement.closest('.section')) || el.parentElement;
  }

  function apply(){
    // Marca apenas os blocos superiores permitidos.
    ['autoria','estado','data','hora','n_estudantes','n_grupos'].forEach(function(id){
      var block = nearestSectionFor(id);
      if(block) block.classList.add('sbl-padronizacao-superior');
    });

    ['cenario','oq_simulacao'].forEach(function(id){
      var block = nearestSectionFor(id);
      if(block) block.classList.add('sbl-top-unified-block');
    });

    // Não tocar em info_ator nem no quadro de ator/personagem.
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', apply);
  }else{
    apply();
  }

  [100, 300, 800, 1500].forEach(function(ms){
    setTimeout(apply, ms);
  });

  window.SBL_TESTAR_PADRONIZACAO_SUPERIOR = function(){
    return {
      headerCards: document.querySelectorAll('.header-grid .header-card').length,
      oferta: !!document.querySelector('.sbl-oferta-section'),
      identificacao: ['autoria','estado','data','hora','n_estudantes','n_grupos'].map(function(id){
        var el = document.getElementById(id);
        return {id:id, existe:!!el};
      }),
      cenario: !!document.getElementById('cenario'),
      informacaoInicial: !!document.getElementById('oq_simulacao'),
      infoAtor: !!document.getElementById('info_ator')
    };
  };
})();

;

(function(){
  'use strict';
  function apply(){
    // Apenas reforço de marcação dos blocos superiores já existentes.
    ['autoria','estado','data','hora','n_estudantes','n_grupos'].forEach(function(id){
      var el = document.getElementById(id);
      var block = el ? (el.closest('.section') || el.parentElement) : null;
      if(block) block.classList.add('sbl-padronizacao-superior');
    });

    ['cenario','oq_simulacao'].forEach(function(id){
      var el = document.getElementById(id);
      var block = el ? (el.closest('.section') || el.parentElement) : null;
      if(block) block.classList.add('sbl-top-unified-block');
    });
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', apply);
  }else{
    apply();
  }
  [100,300,800,1500].forEach(function(ms){ setTimeout(apply, ms); });
})();

;

(function(){
  'use strict';
  function apply(){
    // bloco Informações para ator/personagem
    var infoAtor = document.getElementById('info_ator');
    if(infoAtor){
      var blocoAtor = infoAtor.closest('.section') || infoAtor.parentElement;
      if(blocoAtor) blocoAtor.classList.add('sbl-red-outer-equal');
    }

    // autorização para repositório
    var repo = document.getElementById('partilhaRepositorio');
    if(repo) repo.classList.add('sbl-red-outer-equal');
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', apply);
  }else{
    apply();
  }
  [100,300,800,1500].forEach(function(ms){ setTimeout(apply, ms); });
})();

;

(function(){
  'use strict';
  window.SBL_TESTAR_FOCO_SUAVE_VERMELHO = function(){
    return {
      camada: true,
      blocosComFoco: [
        '.header-grid .header-card',
        '.sbl-oferta-section',
        '.sbl-padronizacao-superior',
        '.sbl-objetivos-recursos-compacto',
        '.sbl-top-unified-block',
        '.sbl-red-outer-equal',
        '.sbl-repository-authorization'
      ]
    };
  };
})();

;

(function(){
  'use strict';
  function markById(id){
    var el = document.getElementById(id);
    if(!el) return;
    var block = el.closest('.section') || (el.parentElement && el.parentElement.closest('.section')) || el.parentElement;
    if(block) block.classList.add('sbl-red-equal-section');
  }
  function apply(){
    ['objetivos','recursos','cenario','oq_simulacao','info_ator','partilhaRepositorio'].forEach(markById);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply); else apply();
  [100,300,800,1500].forEach(function(ms){ setTimeout(apply, ms); });
})();

;

(function(){
  'use strict';
  function apply(){
    ['uc','emails'].forEach(function(id){
      var el = document.getElementById(id);
      if(!el) return;
      if(!el.dataset.sblUcEmailResizeBound){
        el.dataset.sblUcEmailResizeBound = '1';
        el.addEventListener('input', function(){
          var minH = window.innerWidth <= 760 ? 62 : 58;
          if(!el.dataset.sblUserResized){
            el.style.setProperty('height', minH + 'px', 'important');
            el.style.setProperty('min-height', minH + 'px', 'important');
          }
        });
        el.addEventListener('mousedown', function(){
          el.dataset.sblUserResized = '1';
        });
        el.addEventListener('touchstart', function(){
          el.dataset.sblUserResized = '1';
        });
      }
      if(!el.dataset.sblUserResized){
        var minH = window.innerWidth <= 760 ? 62 : 58;
        el.style.setProperty('height', minH + 'px', 'important');
        el.style.setProperty('min-height', minH + 'px', 'important');
      }
    });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply); else apply();
  [100,300,800,1500].forEach(function(ms){ setTimeout(apply, ms); });
})();

;

(function(){
  'use strict';
  function apply(){
    var els = document.querySelectorAll('body:not(.guiao-pdf-mode) input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"]):not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="file"]), body:not(.guiao-pdf-mode) textarea');
    els.forEach(function(el){
      el.style.setProperty('font-family', "'Century Gothic','Segoe UI',sans-serif", 'important');
      el.style.setProperty('font-size', '13px', 'important');
      el.style.setProperty('line-height', '1.35', 'important');
      el.style.setProperty('font-weight', '400', 'important');
      el.style.setProperty('color', '#333', 'important');
    });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply); else apply();
  [100,300,800,1500,2500].forEach(function(ms){ setTimeout(apply, ms); });
})();

;

(function(){
  'use strict';
  function apply(){
    ['cursoBusca','ano_letivo','ano','uc','emails'].forEach(function(id){
      var el = document.getElementById(id);
      if(!el) return;
      var h = window.innerWidth <= 760 ? 60 : 58;
      if(id === 'uc' || id === 'emails'){
        if(!el.dataset.sblUserResized){
          el.style.setProperty('height', h + 'px', 'important');
          el.style.setProperty('min-height', h + 'px', 'important');
        }
      } else {
        el.style.setProperty('height', h + 'px', 'important');
        el.style.setProperty('min-height', h + 'px', 'important');
      }
      el.style.setProperty('padding', '9px 24px 9px 10px', 'important');
      el.style.setProperty('border-radius', '13px', 'important');
      el.style.setProperty('font-size', '13px', 'important');
      el.style.setProperty('line-height', '1.25', 'important');
      if((id === 'uc' || id === 'emails') && !el.dataset.sblOfertaUniformResizeBound){
        el.dataset.sblOfertaUniformResizeBound = '1';
        el.addEventListener('mousedown', function(){ el.dataset.sblUserResized = '1'; });
        el.addEventListener('touchstart', function(){ el.dataset.sblUserResized = '1'; });
      }
    });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply); else apply();
  [100,300,800,1500,2500].forEach(function(ms){ setTimeout(apply, ms); });
})();

;

(function(){
  'use strict';

  var targetSelectors = [
    '#uc',
    '#emails',
    '#professor',
    '#objetivos',
    '#recursos',
    '#cenario',
    '#oq_simulacao',
    '#info_ator',
    '#quadroAcao textarea'
  ];

  function wrapTextarea(ta){
    if(!ta || ta.tagName !== 'TEXTAREA') return;

    var parent = ta.parentElement;
    if(parent && parent.classList && parent.classList.contains('sbl-final-resize-wrap')){
      if(!parent.querySelector(':scope > .sbl-final-resize-handle')){
        var h0 = document.createElement('span');
        h0.className = 'sbl-final-resize-handle';
        parent.appendChild(h0);
        bindHandle(ta, h0);
      }
      return;
    }

    var wrap = document.createElement('div');
    wrap.className = 'sbl-final-resize-wrap';

    parent.insertBefore(wrap, ta);
    wrap.appendChild(ta);

    var handle = document.createElement('span');
    handle.className = 'sbl-final-resize-handle';
    wrap.appendChild(handle);

    bindHandle(ta, handle);
  }

  function bindHandle(ta, handle){
    if(!ta || !handle || handle.dataset.sblResizeBound === '1') return;
    handle.dataset.sblResizeBound = '1';

    function start(clientY){
      var startY = clientY;
      var startH = ta.offsetHeight || parseFloat(getComputedStyle(ta).height) || 80;
      var minH = parseFloat(getComputedStyle(ta).minHeight) || 42;

      function move(ev){
        var y = ev.touches ? ev.touches[0].clientY : ev.clientY;
        var next = Math.max(minH, startH + (y - startY));
        ta.style.setProperty('height', next + 'px', 'important');
        ta.style.setProperty('min-height', Math.min(minH, next) + 'px', 'important');
        ta.dataset.sblUserResized = '1';
      }

      function stop(){
        document.removeEventListener('mousemove', move);
        document.removeEventListener('mouseup', stop);
        document.removeEventListener('touchmove', move);
        document.removeEventListener('touchend', stop);
      }

      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', stop);
      document.addEventListener('touchmove', move, {passive:false});
      document.addEventListener('touchend', stop);
    }

    handle.addEventListener('mousedown', function(ev){
      ev.preventDefault();
      start(ev.clientY);
    });

    handle.addEventListener('touchstart', function(ev){
      if(ev.touches && ev.touches[0]){
        ev.preventDefault();
        start(ev.touches[0].clientY);
      }
    }, {passive:false});
  }

  function apply(){
    targetSelectors.forEach(function(sel){
      document.querySelectorAll(sel).forEach(wrapTextarea);
    });
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', apply);
  }else{
    apply();
  }

  [100,300,800,1500,2500].forEach(function(ms){
    setTimeout(apply, ms);
  });

  window.SBL_INSPECAO_FINAL_PUXADORES = function(){
    return targetSelectors.map(function(sel){
      return {
        selector: sel,
        campos: document.querySelectorAll(sel).length,
        wrappers: Array.from(document.querySelectorAll(sel)).filter(function(el){
          return el.parentElement && el.parentElement.classList.contains('sbl-final-resize-wrap');
        }).length
      };
    });
  };
})();

;

(function(){
  "use strict";

  function fire(el){
    if(!el) return;
    el.dispatchEvent(new Event("input", {bubbles:true}));
    el.dispatchEvent(new Event("change", {bubbles:true}));
  }

  function setVal(id, value){
    var el = document.getElementById(id);
    if(!el) return false;
    el.value = value;
    fire(el);
    return true;
  }

  function setSelect(id, preferred){
    var el = document.getElementById(id);
    if(!el) return false;
    var wanted = String(preferred || "").trim().toLowerCase();
    var chosen = "";
    Array.from(el.options || []).forEach(function(opt){
      var ov = String(opt.value || "").trim().toLowerCase();
      var ot = String(opt.textContent || "").trim().toLowerCase();
      if(ov === wanted || ot === wanted) chosen = opt.value;
    });
    if(chosen) el.value = chosen;
    else el.value = preferred;
    fire(el);
    return true;
  }

  function setRadio(name, value){
    var el = document.querySelector('input[name="' + name + '"][value="' + value + '"]');
    if(el){
      el.checked = true;
      fire(el);
    }
  }

  function clearCourseChips(){
    var chips = document.getElementById("cblCursosSelecionados");
    if(chips) chips.innerHTML = "";
    setVal("curso", "");
    var busca = document.getElementById("cursoBusca");
    if(busca) busca.value = "";
  }

  function addCourse(name){
    var hidden = document.getElementById("curso");
    var search = document.getElementById("cursoBusca");

    if(search){
      search.value = name;
      fire(search);
    }

    // Try native template functions if present
    ["adicionarCursoCBL", "addCurso", "adicionarCurso"].forEach(function(fn){
      if(typeof window[fn] === "function"){
        try { window[fn](name); } catch(e){}
      }
    });

    // Guarantee hidden payload
    if(hidden){
      var parts = hidden.value ? hidden.value.split(";").map(function(x){ return x.trim(); }).filter(Boolean) : [];
      if(parts.indexOf(name) === -1) parts.push(name);
      hidden.value = parts.join("; ");
      fire(hidden);
    }

    // Guarantee visual chips if container exists
    var chips = document.getElementById("cblCursosSelecionados");
    if(chips && !Array.from(chips.children).some(function(c){ return c.textContent.indexOf(name) !== -1; })){
      var chip = document.createElement("span");
      chip.className = "cbl-curso-chip";
      chip.textContent = name;
      chips.appendChild(chip);
    }

    if(search){
      search.value = "";
      fire(search);
    }
  }

  function fillActionReaction(){
    var table = document.getElementById("quadroAcao");
    if(!table) return;

    var rows = Array.from(table.querySelectorAll("tr")).filter(function(tr){
      if(tr.classList && tr.classList.contains("sbl-acoes-footer-row")) return false;
      var cells = tr.querySelectorAll("td");
      return cells.length >= 2 && tr.querySelector("textarea, input");
    });

    var data = [
      ["Aborda a utente com acolhimento, identifica-se e confirma motivo da consulta.", "Responde de forma empática, estrutura a anamnese e recolhe dados-chave."],
      ["Explica o procedimento com linguagem simples e verifica compreensão.", "Reduz sinais de ansiedade e coloca perguntas de clarificação."],
      ["Perante resistência inicial, reformula a informação e valida emoções.", "Mostra-se mais tranquila e colaborante."],
      ["Fecha a interação, resume próximos passos e orienta follow-up.", "Aceita o encaminhamento e demonstra confiança no plano acordado."]
    ];

    rows.forEach(function(tr, i){
      if(!data[i]) return;
      var cells = tr.querySelectorAll("td");
      var a = cells[0] && cells[0].querySelector("textarea, input");
      var r = cells[1] && cells[1].querySelector("textarea, input");
      if(a){ a.value = data[i][0]; fire(a); }
      if(r){ r.value = data[i][1]; fire(r); }
    });
  }

  function fill(){
    // Prevent old index-based autosave from repopulating wrong fields.
    try { localStorage.removeItem("template_autosave_SBL"); } catch(e){}

    setSelect("unidadeOrganica", "IADE");
    setSelect("unidade_organica", "IADE");
    setSelect("modalidade", "Presencial");
    setSelect("semestre", "1.º Semestre");
    setVal("turmaEdicao", "Turma 2");
    setVal("turma", "Turma 2");

    clearCourseChips();
    addCourse("Licenciatura em Design");
    addCourse("Mestrado em Design Management");
    addCourse("Licenciatura em Ciências da Comunicação");

    setVal("uc", "Simulação Clínica; Comunicação em Contexto Profissional; Ética e Segurança do Doente.");
    setVal("professor", "Prof.ª Mariana Costa; Prof. João Almeida");
    setVal("emails", "mariana.costa@universidade.pt; joao.almeida@universidade.pt");
    setVal("ano_letivo", "2026/2027");
    setVal("anoLetivo", "2026/2027");
    setVal("n_estudantes", "32");
    setVal("n_grupos", "8");
    setSelect("estado", "Novo");
    setVal("autoria", "Prof.ª Mariana Costa; Prof. João Almeida");
    setVal("data", "2026-10-15");
    setVal("hora_fim", "12:00");
    setVal("hora", "10:00");

    setVal("objetivos", "Promover a tomada de decisão em contexto simulado, desenvolver comunicação clara e empática, aplicar protocolos de atuação e refletir criticamente sobre o desempenho individual e de grupo.");
    setVal("recursos", "Sala de simulação; briefing do caso; grelha de observação; cronómetro; computador; projetor; materiais de apoio à personagem; ficha de debriefing.");
    setVal("cenario", "Atendimento simulado a uma utente ansiosa que procura esclarecimento sobre um procedimento. A equipa deve acolher, recolher informação relevante, explicar etapas e gerir a comunicação com segurança e empatia.");
    setVal("oq_simulacao", "A simulação inicia com a apresentação breve do caso, distribuição de papéis e explicitação dos critérios de observação. Os estudantes devem atuar de forma colaborativa, respeitando o tempo definido e registando evidências para o debriefing.");
    setVal("info_ator", "O ator representa uma utente ansiosa, colaborante mas apreensiva. Deve revelar informação progressivamente, reagindo melhor quando a comunicação da equipa é clara, empática e estruturada.");

    fillActionReaction();
    setRadio("autorizaRepositorio", "Sim");

    if(typeof window.updateProgress === "function"){
      try { window.updateProgress(); } catch(e){}
    }
    if(typeof window.calcularProgresso === "function"){
      try { window.calcularProgresso(); } catch(e){}
    }
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", function(){
      setTimeout(fill, 350);
      setTimeout(fill, 1000);
    });
  } else {
    setTimeout(fill, 350);
    setTimeout(fill, 1000);
  }
})();

;

(function(){
  "use strict";

  function fire(el){
    if(!el) return;
    el.dispatchEvent(new Event("input", {bubbles:true}));
    el.dispatchEvent(new Event("change", {bubbles:true}));
  }

  function isVisible(el){
    if(!el) return false;
    if(el.type === "hidden") return false;
    if(el.disabled) return false;
    var style = window.getComputedStyle(el);
    if(style.display === "none" || style.visibility === "hidden") return false;
    return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  }

  function setVal(id, value){
    var el = document.getElementById(id);
    if(!el) return false;
    el.value = value;
    fire(el);
    return true;
  }

  function setSelect(id, preferred){
    var el = document.getElementById(id);
    if(!el) return false;
    var wanted = String(preferred || "").trim().toLowerCase();
    var chosen = "";
    Array.from(el.options || []).forEach(function(opt){
      var ov = String(opt.value || "").trim().toLowerCase();
      var ot = String(opt.textContent || "").trim().toLowerCase();
      if(ov === wanted || ot === wanted) chosen = opt.value;
    });
    if(chosen) el.value = chosen;
    else {
      var usable = Array.from(el.options || []).find(function(opt){
        return String(opt.value || opt.textContent || "").trim() &&
               !/selecionar|escolha/i.test(String(opt.textContent || ""));
      });
      el.value = usable ? usable.value : preferred;
    }
    fire(el);
    return true;
  }

  function setRadio(name, value){
    var el = document.querySelector('input[name="' + name + '"][value="' + value + '"]');
    if(el){
      el.checked = true;
      fire(el);
    }
  }

  function clearCourseChips(){
    var chips = document.getElementById("cblCursosSelecionados");
    if(chips) chips.innerHTML = "";
    setVal("curso", "");
    var busca = document.getElementById("cursoBusca");
    if(busca) busca.value = "";
  }

  function addCourse(name){
    var hidden = document.getElementById("curso");
    var search = document.getElementById("cursoBusca");

    if(search){
      search.value = name;
      fire(search);
    }

    ["adicionarCursoCBL", "addCurso", "adicionarCurso"].forEach(function(fn){
      if(typeof window[fn] === "function"){
        try { window[fn](name); } catch(e){}
      }
    });

    if(hidden){
      var parts = hidden.value ? hidden.value.split(";").map(function(x){ return x.trim(); }).filter(Boolean) : [];
      if(parts.indexOf(name) === -1) parts.push(name);
      hidden.value = parts.join("; ");
      fire(hidden);
    }

    var chips = document.getElementById("cblCursosSelecionados");
    if(chips && !Array.from(chips.children).some(function(c){ return c.textContent.indexOf(name) !== -1; })){
      var chip = document.createElement("span");
      chip.className = "cbl-curso-chip";
      chip.textContent = name;
      chips.appendChild(chip);
    }

    if(search){
      search.value = "";
      fire(search);
    }
  }

  function fillActionReaction(){
    var table = document.getElementById("quadroAcao");
    if(!table) return;

    var rows = Array.from(table.querySelectorAll("tr")).filter(function(tr){
      if(tr.classList && tr.classList.contains("sbl-acoes-footer-row")) return false;
      var cells = tr.querySelectorAll("td");
      return cells.length >= 2 && tr.querySelector("textarea, input");
    });

    var data = [
      ["Aborda a utente com acolhimento, identifica-se e confirma motivo da consulta.", "Responde de forma empática, estrutura a anamnese e recolhe dados-chave."],
      ["Explica o procedimento com linguagem simples e verifica compreensão.", "Reduz sinais de ansiedade e coloca perguntas de clarificação."],
      ["Perante resistência inicial, reformula a informação e valida emoções.", "Mostra-se mais tranquila e colaborante."],
      ["Fecha a interação, resume próximos passos e orienta follow-up.", "Aceita o encaminhamento e demonstra confiança no plano acordado."]
    ];

    rows.forEach(function(tr, i){
      var cells = tr.querySelectorAll("td");
      var fallback = data[i] || [
        "Executa a ação prevista no momento da simulação.",
        "Reage de acordo com o guião, oferecendo feedback e consequência pedagógica."
      ];
      var a = cells[0] && cells[0].querySelector("textarea, input");
      var r = cells[1] && cells[1].querySelector("textarea, input");
      if(a){ a.value = fallback[0]; fire(a); }
      if(r){ r.value = fallback[1]; fire(r); }
    });
  }

  function fillSpecific(){
    try { localStorage.removeItem("template_autosave_SBL"); } catch(e){}

    setSelect("unidadeOrganica", "IADE");
    setSelect("unidade_organica", "IADE");
    setSelect("modalidade", "Presencial");
    setSelect("semestre", "1.º Semestre");
    setVal("turmaEdicao", "Turma 2");
    setVal("turma", "Turma 2");

    clearCourseChips();
    addCourse("Licenciatura em Design");
    addCourse("Mestrado em Design Management");
    addCourse("Licenciatura em Ciências da Comunicação");

    setVal("uc", "Simulação Clínica; Comunicação em Contexto Profissional; Ética e Segurança do Doente.");
    setVal("professor", "Prof.ª Mariana Costa; Prof. João Almeida");
    setVal("emails", "mariana.costa@universidade.pt; joao.almeida@universidade.pt");
    setVal("ano_letivo", "2026/2027");
    setVal("anoLetivo", "2026/2027");
    setVal("n_estudantes", "32");
    setVal("n_grupos", "8");
    setSelect("estado", "Novo");
    setVal("autoria", "Prof.ª Mariana Costa; Prof. João Almeida");
    setVal("data", "2026-10-15");
    setVal("hora_fim", "12:00");
    setVal("hora", "10:00");

    setVal("objetivos", "Promover a tomada de decisão em contexto simulado, desenvolver comunicação clara e empática, aplicar protocolos de atuação e refletir criticamente sobre o desempenho individual e de grupo.");
    setVal("recursos", "Sala de simulação; briefing do caso; grelha de observação; cronómetro; computador; projetor; materiais de apoio à personagem; ficha de debriefing.");
    setVal("cenario", "Atendimento simulado a uma utente ansiosa que procura esclarecimento sobre um procedimento. A equipa deve acolher, recolher informação relevante, explicar etapas e gerir a comunicação com segurança e empatia.");
    setVal("oq_simulacao", "A simulação inicia com a apresentação breve do caso, distribuição de papéis e explicitação dos critérios de observação. Os estudantes devem atuar de forma colaborativa, respeitando o tempo definido e registando evidências para o debriefing.");
    setVal("info_ator", "O ator representa uma utente ansiosa, colaborante mas apreensiva. Deve revelar informação progressivamente, reagindo melhor quando a comunicação da equipa é clara, empática e estruturada.");

    fillActionReaction();
    setRadio("autorizaRepositorio", "Sim");
  }

  function fillRemainingVisible(){
    Array.from(document.querySelectorAll("select")).forEach(function(el){
      if(!isVisible(el)) return;
      if(String(el.value || "").trim()) return;
      var opt = Array.from(el.options || []).find(function(o){
        return String(o.value || o.textContent || "").trim() &&
               !/selecionar|escolha/i.test(String(o.textContent || ""));
      });
      if(opt){
        el.value = opt.value;
        fire(el);
      }
    });

    Array.from(document.querySelectorAll("input, textarea")).forEach(function(el){
      if(!isVisible(el)) return;
      if(el.type === "radio" || el.type === "checkbox") return;
      if(String(el.value || "").trim()) return;

      var id = (el.id || "").toLowerCase();
      var name = (el.name || "").toLowerCase();
      var label = "";
      try {
        var wrap = el.closest("label, .field, .form-group, .input-group, .ux-field, .sbl-field, div");
        label = wrap ? String(wrap.innerText || "").toLowerCase() : "";
      } catch(e){}

      var value = "Exemplo preenchido para teste funcional do guião.";
      if(id.includes("email") || name.includes("email") || label.includes("email")) value = "teste.sbl@universidade.pt";
      else if(id.includes("docente") || id.includes("prof") || label.includes("docente")) value = "Prof.ª Mariana Costa";
      else if(id.includes("curso") || label.includes("curso")) value = "Licenciatura em Design";
      else if(id.includes("uc") || label.includes("curricular")) value = "Simulação Clínica";
      else if(id.includes("ano")) value = "2026/2027";
      else if(id.includes("data")) value = "2026-10-15";
      else if(id.includes("hora_fim") || id.includes("horafim")) value = "12:00";
      else if(id.includes("hora")) value = "10:00";
      else if(id.includes("estud") || id.includes("grupo") || el.type === "number") value = "8";
      else if(el.tagName === "TEXTAREA") value = "Texto de exemplo preenchido para teste completo do guião SBL, garantindo validação, PDF e submissão sem campos em branco.";

      el.value = value;
      fire(el);
    });

    Array.from(document.querySelectorAll('input[type="radio"]')).forEach(function(r){
      var group = r.name;
      if(!group) return;
      var checked = document.querySelector('input[type="radio"][name="' + group + '"]:checked');
      if(!checked && isVisible(r)){
        r.checked = true;
        fire(r);
      }
    });
  }

  function updateAll(){
    if(typeof window.updateProgress === "function"){
      try { window.updateProgress(); } catch(e){}
    }
    if(typeof window.calcularProgresso === "function"){
      try { window.calcularProgresso(); } catch(e){}
    }
    var fill = document.getElementById("progressFill");
    var label = document.getElementById("progressLabel");
    if(fill) fill.style.width = "100%";
    if(label) label.innerText = "Guião preenchido: 100%";
  }

  function run(){
    fillSpecific();
    fillRemainingVisible();
    updateAll();
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", function(){
      setTimeout(run, 350);
      setTimeout(run, 1100);
      setTimeout(run, 2200);
    });
  } else {
    setTimeout(run, 350);
    setTimeout(run, 1100);
    setTimeout(run, 2200);
  }
})();

;

(function(){
  if (window.sblReuseHeader) return;
  window.sblReuseHeader = function(){
    var raw = '';
    try {
      raw = localStorage.getItem('sbl_cabecalho_reutilizavel') ||
            localStorage.getItem('rbl_cabecalho_reutilizavel') ||
            localStorage.getItem('projbl_cabecalho_reutilizavel') || '';
    } catch(e) {}
    if(!raw){
      try { if(typeof window.toast === 'function') window.toast('Ainda não há cabeçalho disponível para reutilizar.'); } catch(e) {}
      return;
    }
    var data = [];
    try { data = JSON.parse(raw) || []; } catch(e) { data = []; }
    data.forEach(function(item){
      var el = null;
      if(item.id) el = document.getElementById(item.id);
      if(!el && item.name && window.CSS && CSS.escape) el = document.querySelector('[name="' + CSS.escape(item.name) + '"]');
      if(!el) return;
      var type = String(el.type || '').toLowerCase();
      if(type === 'checkbox' || type === 'radio') el.checked = !!item.checked;
      else el.value = item.value || '';
      try {
        el.dispatchEvent(new Event('input', {bubbles:true}));
        el.dispatchEvent(new Event('change', {bubbles:true}));
      } catch(e) {}
    });
    try { if(typeof window.toast === 'function') window.toast('Cabeçalho reutilizado.'); } catch(e) {}
  };
})();

;

/* ===== Auditoria transversal — campos obrigatórios antes da submissão =====
   Camada cirúrgica: não altera IDs, payloads, botões, Curso(s), PDF, Power Automate ou estrutura pedagógica.
   Apenas bloqueia o clique em “Enviar para Validação” quando faltam dados mínimos institucionais. */
(function(){
  if(window.__guiaoRequiredSubmitValidationV1) return;
  window.__guiaoRequiredSubmitValidationV1 = true;
  function norm(s){ return String(s || '').replace(/\s+/g,' ').trim(); }
  function val(el){
    if(!el) return '';
    if(el.tagName === 'SELECT'){
      var v = norm(el.value);
      if(v && !/^sele/i.test(v)) return v;
      var opt = el.options && el.selectedIndex >= 0 ? el.options[el.selectedIndex] : null;
      return opt ? norm(opt.value || opt.textContent) : '';
    }
    return norm(el.value || el.textContent || '');
  }
  function first(selectors){
    for(var i=0;i<selectors.length;i++){
      var el = document.querySelector(selectors[i]);
      if(!el) continue;
      if(!/^(INPUT|TEXTAREA|SELECT)$/i.test(el.tagName || '')) continue;
      var v = val(el);
      if(v) return {value:v, element:el};
    }
    return {value:'', element:null};
  }
  function courseValue(){
    var direct = first(['#curso','[name="curso"]']);
    if(direct.value) return direct;
    var chips = Array.from(document.querySelectorAll('#cblCursosSelecionados .cbl-course-chip, .cbl-course-chip, [data-course-chip]')).map(function(x){ return norm(x.textContent).replace(/[×x]$/i,'').trim(); }).filter(Boolean).join('; ');
    if(chips) return {value:chips, element:document.querySelector('#cursoBusca') || document.querySelector('#cblCursosSelecionados')};
    return {value:'', element:document.querySelector('#cursoBusca') || document.querySelector('#curso')};
  }
  function ucValue(){
    return first(['#uc','#ucs','[name="uc"]','[name="ucs"]','#unidade_curricular','[name="unidade_curricular"]','.projbl-nome-uc-projeto-field','#ucProjeto','#nomeUCProjeto','#nomeUcProjeto','#nome_uc_projeto']);
  }
  function docenteValue(){
    return first(['#professor','#docentes','#docente','[name="professor"]','[name="docentes"]','[name="docente"]','.docente-nome','.proj-docente-field']);
  }
  function emailValue(){
    return first(['#emails','#email','[name="emails"]','[name="email"]','.docente-email']);
  }
  function unidadeValue(){
    return first(['#unidadeOrganica','#unidade_organica','#unidade-organica','[name="unidadeOrganica"]','[name="unidade_organica"]']);
  }
  function estadoValue(){
    return first(['#estado','#estadoGuiao','#estado_guiao','[name="estado"]','[name="estadoGuiao"]','[name="estado_guiao"]']);
  }
  function autorizacaoValue(){
    var checked = document.querySelector('input[name="autorizaRepositorio"]:checked, input[name="autorizaRepositorioOpcao"]:checked, input[name="autorizacaoRepositorio"]:checked');
    if(checked) return {value:norm(checked.value), element:checked};
    var ids = ['#autorizaRepositorio','#autorizacaoRepositorio'];
    for(var i=0;i<ids.length;i++){
      var el = document.querySelector(ids[i]);
      if(el && String(el.type || '').toLowerCase() !== 'radio'){
        var v = val(el);
        if(v) return {value:v, element:el};
      }
    }
    return {value:'', element:document.querySelector('input[name="autorizaRepositorio"], input[name="autorizaRepositorioOpcao"], input[name="autorizacaoRepositorio"]')};
  }
  function mark(el){
    try{
      if(!el) return;
      el.classList.add('guiao-required-missing');
      setTimeout(function(){ try{ el.classList.remove('guiao-required-missing'); }catch(e){} }, 4500);
    }catch(e){}
  }
  function notify(msg){
    if(typeof toast === 'function') return toast(msg, 'error', 6500);
    if(typeof showToast === 'function') return showToast(msg);
    if(typeof mostrarToast === 'function') return mostrarToast(msg);
    alert(msg);
  }
  window.guiaoValidarCamposObrigatoriosSubmissaoV1 = function(options){
    var checks = [
      ['Unidade Orgânica', unidadeValue()],
      ['Curso(s)', courseValue()],
      ['Unidade(s) Curricular(es)', ucValue()],
      ['Docente(s)', docenteValue()],
      ['Email(s)', emailValue()],
      ['Estado do guião', estadoValue()],
      ['Autorização para integração no repositório', autorizacaoValue()]
    ];
    var missing = checks.filter(function(c){ return !c[1].value; });
    if(missing.length){
      if(!options || !options.silent){
        var msg = 'Antes de enviar para validação, preencha: ' + missing.map(function(c){return c[0];}).join(', ') + '.';
        notify(msg);
        mark(missing[0][1].element);
        try{ missing[0][1].element && missing[0][1].element.focus && missing[0][1].element.focus(); }catch(e){}
      }
      return {ok:false, missing:missing.map(function(c){return c[0];})};
    }
    return {ok:true, missing:[]};
  };
  function isSubmitControl(el){
    if(!el) return false;
    var txt = norm(el.textContent || el.value).toLowerCase();
    return el.id === 'btnEnviarValidacao' || el.id === 'btnValidacaoReal' || txt.indexOf('enviar para valida') !== -1 || txt.indexOf('submeter') !== -1 || txt.indexOf('submiss') !== -1;
  }
  document.addEventListener('click', function(ev){
    var btn = ev.target && ev.target.closest ? ev.target.closest('button,input[type="button"],input[type="submit"]') : null;
    if(!isSubmitControl(btn)) return;
    var result = window.guiaoValidarCamposObrigatoriosSubmissaoV1();
    if(!result.ok){
      ev.preventDefault();
      ev.stopPropagation();
      if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
      return false;
    }
  }, true);
})();

;

(function(){
  'use strict';

  function clean(v){
    return String(v == null ? '' : v).replace(/\s+/g,' ').trim();
  }

  function strip(v){
    try{
      return clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    }catch(e){
      return clean(v).toLowerCase();
    }
  }

  function byId(ids){
    for(var i=0;i<ids.length;i++){
      var el=document.getElementById(ids[i]);
      if(el){
        var v = ('value' in el) ? el.value : el.textContent;
        if(clean(v)) return clean(v);
      }
    }
    return '';
  }

  function firstUnit(v){
    var parts = String(v || '').split(/[;\n]+/).map(clean).filter(Boolean);
    return parts[0] || clean(v);
  }

  function inferScenario(payload){
    var raw = clean(payload && (payload.templateType || payload.cenarioAprendizagem)) ||
              clean((document.querySelector('h1') || {}).textContent || document.title || '');
    var s = strip(raw);
    if(/\bproj\b|project[- ]?based|projeto interdisciplinar/.test(s)) return 'PROJ-BL';
    if(/\bpbl\b|problem[- ]?based/.test(s)) return 'PBL';
    if(/\bcbl\b|challenge[- ]?based/.test(s)) return 'CBL';
    if(/\brbl\b|research[- ]?based|laboratorio de investigacao/.test(s)) return 'RBL';
    if(/\bsbl\b|simulacao|simulacao complexa/.test(s)) return 'SBL';
    return raw || 'Guião';
  }

  function buildTitle(payload){
    var scenario = inferScenario(payload);
    var ucs = clean(payload && payload.ucs) ||
              byId(['uc','ucs','unidadeCurricular','unidadesCurriculares','unidades_curriculares']);
    var ucPrincipal = firstUnit(ucs);
    if(ucPrincipal) return scenario + ' - ' + ucPrincipal;
    return clean(payload && payload.title) || scenario;
  }

  function normalizePayload(payload){
    if(!payload || typeof payload !== 'object') return payload;

    var looksLikeGuiao = payload.pdfBase64 || payload.templateType || payload.cenarioAprendizagem || payload.html;
    if(!looksLikeGuiao) return payload;

    payload.title = buildTitle(payload);

    var anoDom = byId(['anoLetivo','anoLetivoProjeto','ano_letivo','ano','anoLetivoInput']);
    if(anoDom) payload.anoLetivo = anoDom;
    else if(!clean(payload.anoLetivo) && payload.values && typeof payload.values === 'object'){
      payload.anoLetivo = clean(payload.values.anoLetivo || payload.values.ano_letivo || payload.values.ano || '');
    }

    var dataDom = byId(['data','calendarizacao','dataSimulacao','data_simulacao','dataSessao','data_sessao']);
    if(dataDom && !clean(payload.data)) payload.data = dataDom;

    var hi = byId(['hora_inicio','horaInicio','hora_inicial','horaInicial']);
    var hf = byId(['hora_fim','horaFim','hora_final','horaFinal']);
    var horaDom = byId(['hora']);
    if((hi || hf) && !clean(payload.hora)) payload.hora = [hi,hf].filter(Boolean).join(' - ');
    else if(horaDom && !clean(payload.hora)) payload.hora = horaDom;

    return payload;
  }

  function installFetchPatch(){
    if(window.__guioesPayloadPadraoTituloAnoCursosV1) return;
    if(typeof window.fetch !== 'function') return;
    window.__guioesPayloadPadraoTituloAnoCursosV1 = true;
    var nativeFetch = window.fetch;
    window.fetch = function(input, init){
      try{
        if(init && typeof init.body === 'string'){
          var body = init.body.trim();
          if(body.charAt(0)==='{'){
            var payload = JSON.parse(body);
            init.body = JSON.stringify(normalizePayload(payload));
          }
        }
      }catch(e){}
      return nativeFetch.apply(this, arguments);
    };
  }

  function courseWordsMatch(valueNorm, queryNorm){
    if(!queryNorm) return false;
    var qWords = queryNorm.split(/\s+/).filter(Boolean);
    var vWords = valueNorm.split(/\s+/).filter(Boolean);
    if(!qWords.length) return false;
    var pos = 0;
    for(var i=0;i<qWords.length;i++){
      var qw = qWords[i];
      var found = false;
      for(var j=pos;j<vWords.length;j++){
        if(vWords[j].indexOf(qw) === 0){
          found = true;
          pos = j + 1;
          break;
        }
      }
      if(!found) return false;
    }
    return true;
  }

  function scoreCourse(value, query){
    var v = strip(value);
    var q = strip(query);
    if(!q) return 0;
    if(v === q) return 0;
    if(v.indexOf(q) === 0) return 1;
    if(courseWordsMatch(v, q)) return 2;
    if(v.indexOf(q) >= 0) return 3;
    var tokens = q.split(/\s+/).filter(Boolean);
    if(tokens.length && tokens.every(function(t){ return v.indexOf(t) >= 0; })) return 4;
    return 99;
  }

  function installCourseSearchFix(){
    function initInput(input){
      if(!input || input.dataset.guioesCursoFixV1 === '1') return;
      var listId = input.getAttribute('list');
      if(!listId) return;
      var dl = document.getElementById(listId);
      if(!dl) return;

      var original = Array.prototype.slice.call(dl.querySelectorAll('option')).map(function(o, idx){
        return { value: clean(o.value || o.textContent), label: o.getAttribute('label') || '', idx: idx };
      }).filter(function(o){ return !!o.value; });

      if(!original.length) return;
      input.dataset.guioesCursoFixV1 = '1';

      function reorder(){
        var q = input.value || '';
        var sorted = original.slice().sort(function(a,b){
          var sa = scoreCourse(a.value, q);
          var sb = scoreCourse(b.value, q);
          if(sa !== sb) return sa - sb;
          return a.idx - b.idx;
        });
        while(dl.firstChild) dl.removeChild(dl.firstChild);
        sorted.forEach(function(item){
          var opt = document.createElement('option');
          opt.value = item.value;
          if(item.label) opt.setAttribute('label', item.label);
          dl.appendChild(opt);
        });
      }

      input.addEventListener('input', reorder, true);
      input.addEventListener('focus', reorder, true);
      input.addEventListener('keydown', function(){ setTimeout(reorder, 0); }, true);
      reorder();
    }

    function initAll(){
      Array.prototype.slice.call(document.querySelectorAll('input[list]')).forEach(function(input){
        var id = strip(input.id || '');
        var ph = strip(input.getAttribute('placeholder') || '');
        var name = strip(input.getAttribute('name') || '');
        if(id.indexOf('curso') >= 0 || ph.indexOf('curso') >= 0 || name.indexOf('curso') >= 0) initInput(input);
      });
    }

    if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAll);
    else initAll();
    setTimeout(initAll, 300);
    setTimeout(initAll, 1000);
    setTimeout(initAll, 2000);
  }

  installFetchPatch();
  installCourseSearchFix();

  window.guioesPadronizarPayloadTituloAnoCursos = normalizePayload;
})();

;

/* Camada transversal v2 — bloqueio antes de chamar o Power Automate.
   Impede submissão com Curso(s) apenas digitado e campos institucionais mínimos em branco. */
(function(){
  if(window.__guiaoRequiredSubmitValidationV2) return;
  window.__guiaoRequiredSubmitValidationV2 = true;
  var CURSOS_VALIDOS = ["Licenciatura em Animação e Criação Visual", "Licenciatura em Animação Global", "Licenciatura em Fotografia e Cultura Visual", "Mestrado em Animação e Criação Visual", "Mestrado em Design e Produção de Jogos", "Mestrado em Comunicação Audiovisual e Multimédia", "Licenciatura em Ciências da Comunicação", "Licenciatura em Marketing e Publicidade", "Mestrado em Marketing e Inovação", "Mestrado em Branding e Estratégia", "Mestrado em Comunicação Estratégica", "Doutoramento em Comunicação, Media e Ambientes Digitais", "Licenciatura em Design", "Licenciatura em Design Global", "Mestrado em Design e Cultura Visual", "Mestrado em Design & Publicidade", "Mestrado em Design Management", "Mestrado em Design de Produto, Espaço e Interações", "Mestrado em Branding e Design de Moda", "Mestrado em Design para a Sustentabilidade", "Doutoramento em Design", "Licenciatura em Desenvolvimento de Jogos", "Licenciatura em Creative Tech", "Licenciatura em Engenharia Informática", "Licenciatura em Informática de Gestão", "Mestrado em Computação Criativa e Inteligência Artificial", "Doutoramento em Jogos Digitais", "Mestrado em Direção de Arte EaD", "Mestrado em Comunicação Multimedia EaD", "Licenciatura em Ciências da Comunicação EaD", "Licenciatura em Design Visual EaD", "Licenciatura em Engenharia Informática EaD", "Licenciatura em Psicologia", "Mestrado em Psicologia Clínica e da Saúde", "Licenciatura em Ciências da Nutrição", "Licenciatura em Psicologia EaD", "Mestrado em Gestão da Saúde EaD", "Mestrado em Neuropsicologia EaD", "Licenciatura em Gestão Recursos Humanos", "Mestrado em Gestão Recursos Humanos", "Mestrado em Psicologia Social e das Organizações", "Licenciatura em Gestão de Recursos Humanos EaD", "Mestrado em Gestão de Recursos Humanos EaD", "Licenciatura em Marketing EAD", "Licenciatura em Ciências Sociais EaD", "Licenciatura em Contabilidade EaD", "Licenciatura em Gestão de Empresas EaD", "Mestrado em Cibersegurança EaD", "M-Ciências de Dados e Análise de Negócios EaD", "Mestrado em Direito e Segurança da Informação EaD", "Mestrado em Gestão de Empresas EaD", "Mestrado em Marketing estratégico EaD", "Mestrado em Psicologia Social e de Organizações EaD", "Licenciatura em Gestão", "Licenciatura em Management", "Mestrado I Management", "Mestrado em Gestão", "L-Direito", "M-Direito Judiciário", "L-Ciência Dados Gestão", "L-Gestão do Desporto", "L- Gestão Hoteleira", "L-Tourism", "L-Turismo", "L- Gestão de Marketing", "L-Marketing Global", "Licenciatura em Gestão de Negócios", "Licenciatura em Negócios Global", "Mestrado em Global Business", "Mestrado em Marketing", "Mestrado em Gestão de Marketing", "Mestrado em Gestão de Negócios", "Mestrado em Marketing e Tecnologia", "Marketing Digital", "Gestão de Negócios Internacionais", "M-Gestão de Marketing EaD", "L.Gestão de Marketing online antiga", "L-Gestão de Marketing EaD", "M-Gestão de Negócios EaD", "L-Gestão de Marketing", "L-Gestão de Negócios", "Licenciatura em Marketing Global", "Licenciatura em Global Business", "Gestão Comercial e Vendas", "Mestrado em Design &amp; Publicidade", "Licenciatura em Design Visual", "Licenciatura em Design de Moda", "Licenciatura em Gestão de Marketing", "Licenciatura em Marketing", "Licenciatura em Gestão do Turismo", "Pós-Graduação em Branding", "Pós-Graduação em Marketing Digital", "Mestrado em Neuropsicologia Aplicada", "Mestrado em Psicologia da Educação", "Doutoramento em Psicologia", "Licenciatura em Gestão de Recursos Humanos", "Licenciatura em Gestão de Empresas", "Licenciatura em Gestão Hoteleira", "Licenciatura em Turismo", "Licenciatura em Gestão do Desporto", "Licenciatura em Ciência de Dados para Gestão", "Licenciatura em Gestão de Marketing e Comunicação", "Mestrado em Gestão de Recursos Humanos", "Mestrado em Gestão Hoteleira", "Mestrado em Turismo", "Mestrado em Gestão do Desporto", "Mestrado em Business Analytics"];
  function clean(v){ return String(v == null ? '' : v).replace(/\s+/g,' ').trim(); }
  function strip(v){ try{ return clean(v).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase(); }catch(e){ return clean(v).toLowerCase(); } }
  function isVisible(el){ return !!(el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length)); }
  function val(el){
    if(!el) return '';
    if(el.tagName === 'SELECT'){ var v=clean(el.value); if(v && !/^sele/i.test(v)) return v; }
    return clean(('value' in el) ? el.value : el.textContent);
  }
  function first(selectors){
    for(var i=0;i<selectors.length;i++){
      var nodes = Array.prototype.slice.call(document.querySelectorAll(selectors[i]));
      for(var j=0;j<nodes.length;j++){ var el=nodes[j]; var v=val(el); if(v) return {value:v, element:el}; }
    }
    return {value:'', element:null};
  }
  function selectedCourseChips(){
    return Array.prototype.slice.call(document.querySelectorAll('#cblCursosSelecionados .cbl-course-chip, #cblCursosSelecionados .projbl-course-chip, .cbl-course-chip, .projbl-course-chip, [data-course-chip]'))
      .map(function(x){ return clean((x.querySelector('span') || x).textContent || '').replace(/[×x]$/i,'').trim(); })
      .filter(Boolean);
  }
  function allCourseOptions(){
    var opts = CURSOS_VALIDOS.slice();
    Array.prototype.slice.call(document.querySelectorAll('datalist option, select option')).forEach(function(o){
      var v = clean(o.value || o.textContent); if(v) opts.push(v);
    });
    var seen={}, out=[];
    opts.forEach(function(v){ var k=strip(v); if(k && !seen[k]){ seen[k]=true; out.push(v); } });
    return out;
  }
  function courseExists(v){
    var key = strip(v);
    if(!key) return false;
    return allCourseOptions().some(function(c){ return strip(c) === key; });
  }
  function courseValue(){
    var chips = selectedCourseChips();
    if(chips.length) return {value:chips.join('; '), element:document.querySelector('#cblCursosSelecionados') || document.querySelector('.cbl-course-chip,.projbl-course-chip')};
    var hidden = document.querySelector('#curso[type="hidden"], input[name="curso"][type="hidden"]');
    var hv = val(hidden);
    if(hv) return {value:hv, element:hidden};
    var direct = first(['#curso:not([type="hidden"])','[name="curso"]:not([type="hidden"])']);
    if(direct.value && courseExists(direct.value)) return direct;
    return {value:'', typed: direct.value || val(document.querySelector('#cursoBusca,[name="cursoBusca"]')), element: direct.element || document.querySelector('#cursoBusca,[name="cursoBusca"],#curso')};
  }
  function ucValue(){ return first(['#uc','#ucs','[name="uc"]','[name="ucs"]','#unidade_curricular','[name="unidade_curricular"]','.projbl-nome-uc-projeto-field','#ucProjeto','#nomeUCProjeto','#nomeUcProjeto','#nome_uc_projeto']); }
  function docenteValue(){ return first(['#professor','#docentes','#docente','[name="professor"]','[name="docentes"]','[name="docente"]','.docente-nome','.proj-docente-field']); }
  function emailValue(){ return first(['#emails','#email','[name="emails"]','[name="email"]','.docente-email','input[type="email"]']); }
  function unidadeValue(){ return first(['#unidadeOrganica','#unidade_organica','#unidade-organica','[name="unidadeOrganica"]','[name="unidade_organica"]']); }
  function autorizacaoValue(){
    var checked = document.querySelector('input[name="autorizaRepositorio"]:checked, input[name="autorizaRepositorioOpcao"]:checked, input[name="autorizacaoRepositorio"]:checked');
    if(checked) return {value:clean(checked.value), element:checked};
    return first(['#autorizaRepositorio','#autorizacaoRepositorio','[name="autorizaRepositorio"]','[name="autorizacaoRepositorio"]']);
  }
  function validEmails(v){
    var parts = clean(v).split(/\s*;\s*|\s*,\s*/).filter(Boolean);
    return parts.length && parts.every(function(e){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); });
  }
  function mark(el){ try{ if(el){ el.classList.add('guiao-required-missing'); setTimeout(function(){ try{el.classList.remove('guiao-required-missing');}catch(e){} },5000); } }catch(e){} }
  function notify(msg){
    if(typeof toast === 'function') return toast(msg, 'error', 7500);
    if(typeof showToast === 'function') return showToast(msg);
    if(typeof mostrarToast === 'function') return mostrarToast(msg);
    alert(msg);
  }
  window.guiaoValidarCamposObrigatoriosSubmissaoV2 = function(options){
    var curso = courseValue(), email = emailValue();
    var missing = [];
    function add(label, obj){ if(!obj || !obj.value) missing.push([label, obj || {}]); }
    add('Unidade Orgânica', unidadeValue());
    add('Curso(s)', curso);
    add('Unidade(s) Curricular(es)', ucValue());
    add('Docente(s)', docenteValue());
    add('Email(s)', email);
    add('Autorização para integração no repositório', autorizacaoValue());
    var invalid = [];
    if(curso.value){
      var partes = curso.value.split(/\s*;\s*/).filter(Boolean);
      var invalidCourses = partes.filter(function(c){ return !courseExists(c); });
      if(invalidCourses.length) invalid.push(['Curso(s)', curso, 'Selecione o curso a partir da lista de sugestões. Não deixe apenas texto digitado no campo Curso(s).']);
    } else if(curso.typed){
      invalid.push(['Curso(s)', curso, 'Selecione o curso a partir da lista de sugestões. O texto digitado ainda não conta como curso selecionado.']);
    }
    if(email.value && !validEmails(email.value)) invalid.push(['Email(s)', email, 'Verifique o(s) e-mail(s) do(s) docente(s). Use endereços válidos, separados por ponto e vírgula quando houver mais de um.']);
    if(missing.length || invalid.length){
      if(!options || !options.silent){
        var msg = invalid.length ? invalid[0][2] : ('Antes de enviar para validação, preencha: ' + missing.map(function(c){return c[0];}).join(', ') + '.');
        notify(msg);
        var target = (invalid[0] && invalid[0][1] && invalid[0][1].element) || (missing[0] && missing[0][1] && missing[0][1].element);
        mark(target); try{ target && target.focus && target.focus(); }catch(e){}
      }
      return {ok:false, missing:missing.map(function(c){return c[0];}), invalid:invalid.map(function(c){return c[0];})};
    }
    return {ok:true, missing:[], invalid:[]};
  };
  /* compatibilidade: substitui a função v1 usada por cliques antigos */
  window.guiaoValidarCamposObrigatoriosSubmissaoV1 = window.guiaoValidarCamposObrigatoriosSubmissaoV2;
  function isSubmitControl(el){
    if(!el) return false; var txt=clean(el.textContent || el.value).toLowerCase();
    return el.id === 'btnEnviarValidacao' || el.id === 'btnValidacaoReal' || txt.indexOf('enviar para valida') !== -1 || txt.indexOf('submeter') !== -1 || txt.indexOf('submiss') !== -1 || txt.indexOf('atualizar guião') !== -1;
  }
  ['click','mousedown','pointerdown'].forEach(function(evt){
    document.addEventListener(evt, function(ev){
      var btn = ev.target && ev.target.closest ? ev.target.closest('button,input[type="button"],input[type="submit"]') : null;
      if(!isSubmitControl(btn)) return;
      var result = window.guiaoValidarCamposObrigatoriosSubmissaoV2();
      if(!result.ok){ ev.preventDefault(); ev.stopPropagation(); if(ev.stopImmediatePropagation) ev.stopImmediatePropagation(); return false; }
    }, true);
  });
})();

;

(function(){
  'use strict';

  function clean(v){ return String(v == null ? '' : v).replace(/\s+/g,' ').trim(); }
  function strip(v){
    try{ return clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(); }
    catch(e){ return clean(v).toLowerCase(); }
  }
  function wordsMatch(valueNorm, queryNorm){
    if(!queryNorm) return false;
    var qWords = queryNorm.split(/\s+/).filter(Boolean);
    var vWords = valueNorm.split(/\s+/).filter(Boolean);
    if(!qWords.length) return false;
    var pos = 0;
    for(var i=0;i<qWords.length;i++){
      var found = false;
      for(var j=pos;j<vWords.length;j++){
        if(vWords[j].indexOf(qWords[i]) === 0){ found = true; pos = j + 1; break; }
      }
      if(!found) return false;
    }
    return true;
  }
  function score(value, query){
    var v = strip(value), q = strip(query);
    if(!q) return 0;
    if(v === q) return 0;
    if(v.indexOf(q) === 0) return 1;
    if(wordsMatch(v, q)) return 2;
    if(v.indexOf(q) >= 0) return 3;
    var tokens = q.split(/\s+/).filter(Boolean);
    if(tokens.length && tokens.every(function(t){ return v.indexOf(t) >= 0; })) return 4;
    return 99;
  }
  function getOptions(listId){
    var dl = document.getElementById(listId);
    if(!dl) return [];
    var seen = {};
    return Array.prototype.slice.call(dl.querySelectorAll('option')).map(function(o, idx){
      return {value: clean(o.value || o.textContent), idx: idx};
    }).filter(function(o){
      var key = strip(o.value);
      if(!o.value || seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }
  function escapeHtml(v){
    return String(v).replace(/[&<>"']/g, function(ch){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];
    });
  }
  function selectCourse(input, value){
    input.value = value;
    input.dispatchEvent(new Event('input', {bubbles:true}));
    input.dispatchEvent(new Event('change', {bubbles:true}));
    setTimeout(function(){ input.value = ''; }, 120);
  }
  function initInput(input){
    if(!input || input.dataset.guioesCustomCursoV2 === '1') return;
    var listId = input.getAttribute('list') || input.dataset.nativeList || 'cblCursosList';
    var options = getOptions(listId);
    if(!options.length) return;

    input.dataset.nativeList = listId;
    input.removeAttribute('list');
    input.setAttribute('autocomplete','off');
    input.dataset.guioesCustomCursoV2 = '1';

    var wrap = input.closest('.cbl-course-search-row') || input.parentElement;
    if(!wrap) return;
    if(getComputedStyle(wrap).position === 'static') wrap.style.position = 'relative';

    var box = document.createElement('div');
    box.className = 'guioes-curso-suggestions-v2';
    box.setAttribute('role','listbox');
    box.setAttribute('aria-label','Sugestões de cursos');
    wrap.appendChild(box);

    var active = -1;
    var userOpenedCourseSearch = false;
    function close(){ box.classList.remove('is-open'); active = -1; }
    function open(){ if(box.children.length) box.classList.add('is-open'); }
    function render(allowOpen){
      var q = clean(input.value);
      if(q.length < 2){ box.innerHTML = ''; close(); return; }
      var qNorm = strip(q);
      var matches = options.map(function(o){ return {value:o.value, idx:o.idx, score:score(o.value, q)}; })
        .filter(function(o){ return qNorm && o.score < 99; })
        .sort(function(a,b){ return (a.score - b.score) || (a.idx - b.idx); })
        .slice(0, 10);

      box.innerHTML = '';
      active = -1;
      if(!matches.length){ close(); return; }
      matches.forEach(function(item, i){
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'guioes-curso-suggestion-v2';
        btn.setAttribute('role','option');
        btn.textContent = item.value;
        btn.addEventListener('mousedown', function(ev){ ev.preventDefault(); });
        btn.addEventListener('click', function(){ selectCourse(input, item.value); close(); input.focus(); });
        box.appendChild(btn);
      });
      if(allowOpen) open();
      else close();
    }
    function setActive(idx){
      var items = Array.prototype.slice.call(box.querySelectorAll('.guioes-curso-suggestion-v2'));
      items.forEach(function(el){ el.classList.remove('is-active'); });
      if(!items.length){ active = -1; return; }
      active = Math.max(0, Math.min(idx, items.length - 1));
      items[active].classList.add('is-active');
      items[active].scrollIntoView({block:'nearest'});
    }

    input.addEventListener('pointerdown', function(){ userOpenedCourseSearch = true; }, true);
    input.addEventListener('input', function(){
      render(userOpenedCourseSearch && document.activeElement === input);
    }, true);
    input.addEventListener('focus', function(){
      if(!userOpenedCourseSearch || clean(input.value).length < 2) close();
      else render(true);
    }, true);
    input.addEventListener('keydown', function(ev){
      userOpenedCourseSearch = true;
      var items = Array.prototype.slice.call(box.querySelectorAll('.guioes-curso-suggestion-v2'));
      if(ev.key === 'ArrowDown'){
        ev.preventDefault();
        if(!box.classList.contains('is-open')){ if(clean(input.value).length < 2) return; render(true); }
        setActive(active + 1);
      }else if(ev.key === 'ArrowUp'){
        ev.preventDefault();
        setActive(active <= 0 ? items.length - 1 : active - 1);
      }else if(ev.key === 'Enter'){
        if(box.classList.contains('is-open') && items.length){
          ev.preventDefault();
          var chosen = items[active >= 0 ? active : 0];
          selectCourse(input, chosen.textContent || '');
          close();
        }
      }else if(ev.key === 'Escape'){
        close();
      }
    }, true);
    document.addEventListener('click', function(ev){ if(!wrap.contains(ev.target)) close(); }, true);
  }
  function initAll(){
    Array.prototype.slice.call(document.querySelectorAll('input#cursoBusca, input[name="cursoBusca"], input[id*="curso" i][list], input[placeholder*="curso" i]')).forEach(initInput);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAll);
  else initAll();
  [200, 600, 1200, 2500].forEach(function(ms){ setTimeout(initAll, ms); });
})();

;

/* ===== Camada institucional — carregamento de guião para edição por itemId =====
   Abre o template com ?itemId=..., obtém os dados do fluxo “Obter guião por ID”
   e preenche o formulário sem alterar PDF, layout, submissão principal ou botões. */
(function(){
  'use strict';
  if(window.__guioesCarregamentoPorItemIdV2Instalado) return;
  window.__guioesCarregamentoPorItemIdV2Instalado = true;

  var OBTER_GUIAO_URL = 'https://default704e7b9d2c07436297683fef55c31b.7f.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/9e455e5d804746acb1794984f196dcf3/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=JQzGhGc6DQBJr5bfeH_RRLKzxKyOpha9O0AJqreUS7A';

  function clean(v){ return String(v == null ? '' : v).trim(); }
  function lower(v){ return clean(v).toLowerCase(); }
  function $(id){ return document.getElementById(id); }
  function getItemId(){
    try { return clean(new URLSearchParams(window.location.search).get('itemId')); }
    catch(e){ return ''; }
  }
  function notify(message, type, duration){
    if(typeof window.toast === 'function') return window.toast(message, type || '', duration || 4500);
    if(typeof window.showToast === 'function') return window.showToast(message, type || '', duration || 4500);
    if(type === 'error') alert(message);
  }
  function dispatch(el){
    if(!el) return;
    try { el.dispatchEvent(new Event('input', {bubbles:true})); } catch(e){}
    try { el.dispatchEvent(new Event('change', {bubbles:true})); } catch(e){}
  }
  function setField(id, value){
    var el = $(id);
    if(!el) return false;
    value = clean(value);
    if(el.type === 'radio') return false;
    if(el.type === 'checkbox'){
      el.checked = /^(sim|true|1|yes)$/i.test(value);
    } else if(el.tagName === 'SELECT'){
      var found = false;
      Array.prototype.forEach.call(el.options || [], function(opt){
        if(clean(opt.value).toLowerCase() === value.toLowerCase() || clean(opt.text).toLowerCase() === value.toLowerCase()){
          el.value = opt.value;
          found = true;
        }
      });
      if(!found && value) el.value = value;
    } else {
      el.value = value;
    }
    dispatch(el);
    return true;
  }
  function setFirst(ids, value){
    value = clean(value);
    if(!value) return false;
    for(var i=0;i<ids.length;i++){ if(setField(ids[i], value)) return true; }
    return false;
  }
  function setRadioGroup(name, value){
    value = clean(value);
    if(!value) return false;
    var done = false;
    Array.prototype.forEach.call(document.querySelectorAll('input[type="radio"][name="' + name + '"]'), function(radio){
      var same = clean(radio.value).toLowerCase() === value.toLowerCase();
      radio.checked = same;
      if(same) done = true;
      dispatch(radio);
    });
    return done;
  }
  function setAuthorization(value){
    value = clean(value);
    if(!value) return;
    setField('autorizaRepositorio', value);
    setField('autorizacaoRepositorio', value);
    ['autorizaRepositorio','autorizaRepositorioOpcao','autorizacaoRepositorio'].forEach(function(name){ setRadioGroup(name, value); });
  }
  function splitCourses(value){
    return clean(value).split(/;|\n|\|/).map(clean).filter(Boolean).filter(function(v,i,a){
      return a.findIndex(function(x){ return x.toLowerCase() === v.toLowerCase(); }) === i;
    });
  }
  function renderCourseFallback(container, value, chipClass){
    if(!container || !clean(value)) return;
    var existing = container.querySelector('.cbl-course-chip,.pbl-course-chip,.projbl-course-chip,.rbl-course-chip,.sbl-course-chip');
    if(existing) return;
    container.innerHTML = '';
    splitCourses(value).forEach(function(curso){
      var chip = document.createElement('span');
      chip.className = chipClass || 'cbl-course-chip';
      var span = document.createElement('span');
      span.textContent = curso;
      chip.appendChild(span);
      container.appendChild(chip);
    });
  }
  function setCursos(value){
    value = clean(value);
    if(!value) return;
    setFirst(['curso','cursos'], value);
    var search = $('cursoBusca');
    if(search){ search.value = ''; dispatch(search); }
    var chips = $('cblCursosSelecionados') || $('pblCursosSelecionados') || document.querySelector('.cbl-course-chips,.pbl-course-chips,.rbl-course-chip-area,.sbl-course-chips');
    if(chips){
      setTimeout(function(){
        dispatch($('curso'));
        renderCourseFallback(chips, value, chips.id === 'pblCursosSelecionados' ? 'pbl-course-chip' : 'cbl-course-chip');
      }, 80);
    }
  }
  function parseEstrutura(raw){
    if(!raw) return {};
    if(typeof raw === 'object') return raw;
    try { return JSON.parse(String(raw)); } catch(e){ return {}; }
  }
  function splitHoraIntervalo(hora){
    hora = clean(hora);
    if(!hora) return {};
    var parts = hora.split(/\s*[–—-]\s*/).map(clean).filter(Boolean);
    return {inicio: parts[0] || '', fim: parts[1] || ''};
  }
  function visibleControlsForFallback(){
    return Array.prototype.slice.call(document.querySelectorAll('input, textarea, select')).filter(function(el){
      return !el.disabled && el.type !== 'hidden' && !el.closest('.no-print');
    });
  }
  function applyValuesByKey(values){
    values = values || {};
    Object.keys(values).forEach(function(key){
      var val = values[key];
      if(/^campo_\d+$/.test(key) || /^field_\d+$/.test(key)) return;
      if($(key)) setField(key, val);
    });
    var controls = visibleControlsForFallback();
    Object.keys(values).forEach(function(key){
      var m = key.match(/^(?:campo|field)_(\d+)$/);
      if(!m) return;
      var idx = parseInt(m[1],10) - 1;
      var el = controls[idx];
      if(el && !el.id && !el.name){
        el.value = clean(values[key]);
        dispatch(el);
      }
    });
  }
  function addStatusBox(){
    if($('guioesModoEdicaoBox')) return;
    var ref = document.querySelector('.premium-status') || document.querySelector('.header') || document.querySelector('.page') || document.body.firstElementChild;
    if(!ref || !ref.parentNode) return;
    var box = document.createElement('div');
    box.id = 'guioesModoEdicaoBox';
    box.className = 'no-print';
    box.style.margin = '0 0 16px 0';
    box.style.padding = '12px 14px';
    box.style.border = '1.5px solid #1f4d2b';
    box.style.borderRadius = '14px';
    box.style.background = '#f3fff6';
    box.style.color = '#1f4d2b';
    box.style.fontSize = '13px';
    box.innerHTML = '<strong>Edição de guião submetido</strong><br>Os dados deste guião foram carregados automaticamente. Faça as alterações necessárias e submeta novamente para atualizar a versão existente.';
    ref.parentNode.insertBefore(box, ref.nextSibling);
  }
  function preencherFormulario(data){
    data = data || {};
    var estrutura = parseEstrutura(data.estruturaPedagogica);
    var values = (estrutura && estrutura.values && typeof estrutura.values === 'object') ? estrutura.values : {};
    var hora = splitHoraIntervalo(data.hora);

    applyValuesByKey(values);

    setFirst(['unidadeOrganica','unidade_organica'], values.unidadeOrganica || data.unidadeOrganica);
    setFirst(['modalidade'], values.modalidade || data.modalidade);
    setFirst(['semestre'], values.semestre || data.semestre);
    setFirst(['turmaEdicao','turma_edicao','turma'], values.turmaEdicao || values.turma || data.turmaEdicao);
    setCursos(values.curso || values.cursos || data.cursos);
    setFirst(['uc','ucs','unidade_curricular'], values.uc || values.ucs || data.ucs);
    setFirst(['titulo','tituloProjeto'], values.titulo || values.tituloProjeto || data.title);
    setFirst(['ano','ano_letivo','anoLetivo','anoLetivoProjeto'], values.ano || values.ano_letivo || values.anoLetivo || data.anoLetivo);
    setFirst(['professor','docentes'], values.professor || values.docentes || data.docentes);
    setFirst(['emails','email'], values.emails || values.email || data.emails);
    setFirst(['n_estudantes','numeroEstudantes'], values.n_estudantes || values.numeroEstudantes || data.nEstudantes);
    setFirst(['n_grupos','numeroGrupos'], values.n_grupos || values.numeroGrupos || data.nGrupos);
    setFirst(['autoria','autorias'], values.autoria || values.autorias || data.autorias);
    setFirst(['estado','estado_guiao','estadoGuiao'], values.estado || values.estadoGuiao || 'Atualizado');
    setFirst(['organizacao','organizacoes','contacto'], values.organizacao || values.organizacoesContacto || data.organizacoesContacto);
    setFirst(['calendarizacao','data','dataSimulacao'], values.calendarizacao || values.data || data.data);
    setFirst(['hora_inicio','horaInicio','hora'], values.hora_inicio || values.horaInicio || hora.inicio || data.hora);
    setFirst(['hora_fim','horaFim'], values.hora_fim || values.horaFim || hora.fim);
    setAuthorization(values.autorizaRepositorio || values.autorizacaoRepositorio || data.autorizaRepositorio);

    ['renderProgress','updateProgress','atualizarProgresso','calcularProgresso','syncCourseChips','renderCursosSelecionados'].forEach(function(fn){
      try { if(typeof window[fn] === 'function') window[fn](); } catch(e){}
    });
    document.body.classList.add('guiao-carregado-por-id');
  }
  async function carregarGuiaoPorId(){
    var itemId = getItemId();
    if(!itemId || window.__guioesCarregamentoPorItemIdExecutado) return;
    window.__guioesCarregamentoPorItemIdExecutado = true;
    addStatusBox();
    notify('A carregar dados do guião...', '', 2500);
    try {
      var res = await fetch(OBTER_GUIAO_URL, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({itemId: itemId})
      });
      var text = await res.text();
      var data = {};
      try { data = JSON.parse(text); } catch(e){ data = {raw:text}; }
      if(!res.ok || data.ok === false || data.success === false){
        throw new Error((data && (data.message || data.error)) || text || ('HTTP ' + res.status));
      }
      window.__guioesDadosCarregadosPorItemId = data;
      preencherFormulario(data);
      if(typeof window.__sblPreencherQuadroAcaoFromGuiao === 'function') window.__sblPreencherQuadroAcaoFromGuiao(data);
      notify('Dados do guião carregados para edição.', 'ok', 4500);
    } catch(e) {
      console.error('Erro ao carregar guião por itemId:', e);
      notify('Não foi possível carregar automaticamente os dados deste guião. Confirme o link de edição ou tente novamente.', 'error', 8000);
    }
  }
  function init(){ setTimeout(carregarGuiaoPorId, 450); }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

;

/* ===== PATCH SBL — edição por itemId: quadro Ação/Reação =====
   Garante IDs estáveis nas linhas dinâmicas e repõe valores guardados em estruturaPedagogica. */
(function(){
  'use strict';
  if(window.__sblQuadroAcaoEdicaoItemIdFix) return;
  window.__sblQuadroAcaoEdicaoItemIdFix = true;

  function clean(v){ return String(v == null ? '' : v).trim(); }
  function norm(v){
    return clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/[º°ª()|\\/\-_.:;,[\]]/g,' ')
      .replace(/\s+/g,' ').trim().toLowerCase();
  }
  function parseEstrutura(raw){
    if(!raw) return {};
    if(typeof raw === 'object') return raw;
    try { return JSON.parse(String(raw)); } catch(e){ return {}; }
  }
  function table(){ return document.getElementById('quadroAcao'); }
  function dataRows(){
    var t = table();
    if(!t) return [];
    return Array.prototype.slice.call(t.querySelectorAll('tr')).filter(function(row){
      return row.querySelectorAll('textarea').length >= 2 && !row.classList.contains('sbl-acoes-footer-row') && !row.querySelector('.btn-plus,.btn-minus');
    });
  }
  function ensureSblActionRowIds(){
    dataRows().forEach(function(row, idx){
      var i = idx + 1;
      var tas = row.querySelectorAll('textarea');
      if(tas[0]){
        tas[0].id = 'sbl_acao_' + i;
        tas[0].name = 'sbl_acao_' + i;
      }
      if(tas[1]){
        tas[1].id = 'sbl_reacao_' + i;
        tas[1].name = 'sbl_reacao_' + i;
      }
    });
  }
  function addRowsUntil(count){
    var t = table();
    if(!t) return;
    var rows = dataRows();
    while(rows.length < count){
      if(typeof window.addRow === 'function') window.addRow();
      else {
        var controls = t.querySelector('.sbl-acoes-footer-row') || t.querySelector('tr:last-child');
        var tr = document.createElement('tr');
        tr.innerHTML = '<td style="padding:10px;border-bottom:1px solid #ddd;"><textarea rows="3" style="width:98%;border:1px solid #ccc;border-radius:6px;padding:8px;font-family:inherit;"></textarea></td><td style="padding:10px;border-bottom:1px solid #ddd;border-left:1px solid #ddd;"><textarea rows="3" style="width:98%;border:1px solid #ccc;border-radius:6px;padding:8px;font-family:inherit;"></textarea></td>';
        if(controls && controls.parentNode) controls.parentNode.insertBefore(tr, controls);
        else t.appendChild(tr);
      }
      rows = dataRows();
      if(rows.length > 60) break;
    }
    ensureSblActionRowIds();
  }
  function dispatch(el){
    if(!el) return;
    try { el.dispatchEvent(new Event('input', {bubbles:true})); } catch(e){}
    try { el.dispatchEvent(new Event('change', {bubbles:true})); } catch(e){}
  }
  function setVal(id, val){
    var el = document.getElementById(id);
    if(!el) return false;
    el.value = clean(val);
    dispatch(el);
    return true;
  }
  function valueFromKeys(values, keys){
    for(var i=0;i<keys.length;i++){
      if(clean(values[keys[i]])) return clean(values[keys[i]]);
    }
    return '';
  }
  function lineValuesByLabel(estrutura){
    var lines = [];
    if(Array.isArray(estrutura && estrutura.lines)) lines = estrutura.lines;
    else if(typeof (estrutura && estrutura.resumoCampos) === 'string') lines = estrutura.resumoCampos.split(/\n+/);
    var out = [];
    lines.forEach(function(line){
      line = clean(line);
      if(!line) return;
      var idx = line.indexOf(':');
      if(idx < 0) return;
      var label = line.slice(0, idx);
      var value = line.slice(idx + 1).trim();
      var n = norm(label);
      if(!value) return;
      // Nos SBL anteriores, as células sem id do quadro eram guardadas como linhas repetidas com o rótulo "Guião para ator".
      if(n === 'guiao para ator' || n === 'guiao ator' || n.indexOf('guiao para ator') !== -1){
        out.push(value);
      }
    });
    return out;
  }
  function preencherSblQuadroAcao(data){
    var t = table();
    if(!t || !data) return;
    ensureSblActionRowIds();
    var estrutura = parseEstrutura(data.estruturaPedagogica);
    var values = (estrutura && estrutura.values && typeof estrutura.values === 'object') ? estrutura.values : {};
    var pares = [];

    for(var i=1;i<=60;i++){
      var acao = valueFromKeys(values, ['sbl_acao_'+i, 'acao_'+i, 'acaoAtor_'+i, 'acaoAtorPersonagem_'+i, 'ator_acao_'+i]);
      var reacao = valueFromKeys(values, ['sbl_reacao_'+i, 'reacao_'+i, 'reacaoTecnico_'+i, 'reacaoTecnicoProfissional_'+i, 'tecnico_reacao_'+i]);
      if(!acao && !reacao) continue;
      pares.push({acao:acao, reacao:reacao});
    }

    if(!pares.length){
      var seq = lineValuesByLabel(estrutura);
      for(var j=0;j<seq.length;j+=2){
        pares.push({acao: seq[j] || '', reacao: seq[j+1] || ''});
      }
    }

    pares = pares.filter(function(p){ return clean(p.acao) || clean(p.reacao); });
    if(!pares.length) return;

    addRowsUntil(Math.max(5, pares.length));
    pares.forEach(function(p, idx){
      var i = idx + 1;
      setVal('sbl_acao_' + i, p.acao);
      setVal('sbl_reacao_' + i, p.reacao);
    });
    try { if(typeof window.renderProgress === 'function') window.renderProgress(); } catch(e){}
  }

  window.__sblEnsureActionRowIds = ensureSblActionRowIds;
  window.__sblPreencherQuadroAcaoFromGuiao = preencherSblQuadroAcao;

  function wrapAddRow(){
    if(typeof window.addRow !== 'function' || window.addRow.__sblIdsWrapped) return;
    var original = window.addRow;
    window.addRow = function(){
      var ret = original.apply(this, arguments);
      setTimeout(ensureSblActionRowIds, 0);
      return ret;
    };
    window.addRow.__sblIdsWrapped = true;
  }
  function init(){
    ensureSblActionRowIds();
    wrapAddRow();
    if(window.__guioesDadosCarregadosPorItemId) preencherSblQuadroAcao(window.__guioesDadosCarregadosPorItemId);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  [200, 700, 1500, 3000].forEach(function(ms){ setTimeout(init, ms); });
})();
