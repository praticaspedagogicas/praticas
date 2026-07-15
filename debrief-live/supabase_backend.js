(() => {
  'use strict';

  const cfg = window.DEBRIEF_SUPABASE || {};
  const api = { ready: false, error: '' };

  function timeout(promise, ms = 12000, label = 'pedido') {
    let handle;
    const timer = new Promise((_, reject) => {
      handle = setTimeout(() => reject(new Error(`Tempo excedido no ${label}.`)), ms);
    });
    return Promise.race([promise, timer]).finally(() => clearTimeout(handle));
  }

  function requireClient() {
    if (!api.ready) throw new Error(api.error || 'Supabase ainda não está disponível.');
    return api.client;
  }

  function normaliseRow(data) {
    if (Array.isArray(data)) return data[0] || null;
    return data || null;
  }

  try {
    if (!cfg.url || !cfg.publishableKey) throw new Error('Configuração do Supabase incompleta.');
    if (!window.supabase?.createClient) throw new Error('A biblioteca Supabase não foi carregada. Verifique a ligação à internet.');

    const client = window.supabase.createClient(cfg.url, cfg.publishableKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      },
      realtime: {
        params: { eventsPerSecond: 20 }
      }
    });

    api.client = client;
    api.ready = true;

    api.getState = async function getState(sessionCode) {
      const query = client
        .from(cfg.stateTable || 'debrief_live_state')
        .select('session_code,institution,run_id,active_moment,is_open,session_title,session_date,updated_at')
        .eq('session_code', sessionCode)
        .maybeSingle();
      const { data, error } = await timeout(query, 10000, 'leitura do estado');
      if (error) throw error;
      if (!data) throw new Error('Sessão não encontrada no Supabase.');
      return data;
    };

    api.setMoment = async function setMoment({ sessionCode, controlKey, runId, moment, sessionTitle = '', sessionDate = null }) {
      const call = client.rpc('debrief_set_moment', {
        p_session_code: sessionCode,
        p_control_key: controlKey,
        p_run_id: runId,
        p_moment: moment,
        p_session_title: sessionTitle || null,
        p_session_date: sessionDate || null
      });
      const { data, error } = await timeout(call, 12000, 'alteração da participação');
      if (error) throw error;
      return normaliseRow(data);
    };

    api.submitResponse = async function submitResponse({ sessionCode, runId, moment, question, participantId, answer }) {
      const call = client.rpc('debrief_submit_response', {
        p_session_code: sessionCode,
        p_run_id: runId,
        p_moment: moment,
        p_question: question,
        p_participant_id: participantId,
        p_answer: answer
      });
      const { data, error } = await timeout(call, 12000, 'registo da resposta');
      if (error) throw error;
      return data;
    };

    api.getResults = async function getResults(sessionCode, runId) {
      const query = client
        .from(cfg.resultsTable || 'debrief_results')
        .select('session_code,run_id,question,counts,texts,total,updated_at')
        .eq('session_code', sessionCode)
        .eq('run_id', runId)
        .order('question', { ascending: true });
      const { data, error } = await timeout(query, 10000, 'leitura dos resultados');
      if (error) throw error;
      return data || [];
    };

    api.subscribeState = function subscribeState(sessionCode, onRow, onStatus) {
      const channel = client
        .channel(`debrief-state-${sessionCode}-${Math.random().toString(36).slice(2)}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: cfg.stateTable || 'debrief_live_state',
          filter: `session_code=eq.${sessionCode}`
        }, payload => onRow?.(payload.new || payload.old || null))
        .subscribe(status => onStatus?.(status));
      return () => client.removeChannel(channel);
    };

    api.subscribeResults = function subscribeResults(sessionCode, runId, onRow, onStatus) {
      const channel = client
        .channel(`debrief-results-${sessionCode}-${runId}-${Math.random().toString(36).slice(2)}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: cfg.resultsTable || 'debrief_results',
          filter: `session_code=eq.${sessionCode}`
        }, payload => {
          const row = payload.new || payload.old || null;
          if (row && row.run_id === runId) onRow?.(row);
        })
        .subscribe(status => onStatus?.(status));
      return () => client.removeChannel(channel);
    };

    api.unsubscribeAll = async function unsubscribeAll() {
      await client.removeAllChannels();
    };
  } catch (error) {
    api.error = error?.message || String(error);
    console.error('Falha ao inicializar Supabase', error);
  }

  window.DebriefSupabase = api;
})();
