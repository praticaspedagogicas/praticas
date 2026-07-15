(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  function feedback(message = '') {
    const modalBody = $('#settingsModal .modal-body');
    if (!modalBody) return;
    let box = $('#settingsModal .start-feedback');
    if (!box) {
      box = document.createElement('div');
      box.className = 'start-feedback';
      box.setAttribute('role', 'status');
      box.setAttribute('aria-live', 'polite');
      modalBody.appendChild(box);
    }
    box.textContent = message;
    box.classList.toggle('show', Boolean(message));
  }

  function revealField(selector) {
    const field = $(selector)?.closest('.field') || $(selector);
    const body = $('#settingsModal .modal-body');
    if (!field || !body) return;
    const top = Math.max(0, field.offsetTop - 16);
    body.scrollTo({ top, behavior: 'smooth' });
    setTimeout(() => $(selector)?.focus?.(), 180);
  }

  function syncModalState() {
    const active = $('.modal-backdrop.open');
    document.documentElement.classList.toggle('modal-open', Boolean(active));
    document.body.classList.toggle('modal-open', Boolean(active));
    if (active) {
      const body = $('.modal-body', active);
      if (body && !active.dataset.v60Opened) {
        active.dataset.v60Opened = '1';
        body.scrollTop = 0;
      }
    }
    $$('.modal-backdrop:not(.open)[data-v60-opened]').forEach(m => delete m.dataset.v60Opened);
  }

  const observer = new MutationObserver(syncModalState);
  $$('.modal-backdrop').forEach(m => observer.observe(m, { attributes: true, attributeFilter: ['class'] }));
  syncModalState();

  const startButton = $('#saveAndStartBtn');
  if (startButton && typeof startButton.onclick === 'function' && !startButton.dataset.v60Wrapped) {
    const originalStart = startButton.onclick;
    startButton.dataset.v60Wrapped = '1';
    startButton.onclick = async function (event) {
      if (this.dataset.busy === '1') return;
      feedback('');

      const sessionCode = $('#institutionInput')?.value || '';
      const controlKey = $('#facilitatorKeyInput')?.value.trim() || '';

      if (!sessionCode) {
        try { await originalStart.call(this, event); } catch (error) { console.error(error); }
        feedback('Selecione primeiro a instituição / sessão.');
        revealField('#sessionChoiceGrid');
        return;
      }
      if (!controlKey) {
        try { await originalStart.call(this, event); } catch (error) { console.error(error); }
        feedback('Introduza a chave de controlo da sessão.');
        revealField('#facilitatorKeyInput');
        return;
      }

      const originalText = this.textContent;
      this.dataset.busy = '1';
      this.disabled = true;
      this.setAttribute('aria-busy', 'true');
      this.textContent = 'A iniciar…';

      try {
        await originalStart.call(this, event);
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const firstStage = $('.stage[data-stage="1"]');
        const modalStillOpen = $('#settingsModal')?.classList.contains('open');
        if (modalStillOpen && !firstStage?.classList.contains('active')) {
          throw new Error('A sessão não avançou para o primeiro momento.');
        }
      } catch (error) {
        console.error('Falha ao iniciar o debrief', error);
        feedback(`Não foi possível iniciar: ${error?.message || error}. Verifique os campos e tente novamente.`);
      } finally {
        this.disabled = false;
        this.removeAttribute('aria-busy');
        this.textContent = originalText;
        delete this.dataset.busy;
        syncModalState();
      }
    };
  }

  $('#settingsModal')?.addEventListener('keydown', event => {
    if (event.key !== 'Enter' || event.shiftKey || event.target?.tagName === 'TEXTAREA') return;
    event.preventDefault();
    startButton?.click();
  });
})();
