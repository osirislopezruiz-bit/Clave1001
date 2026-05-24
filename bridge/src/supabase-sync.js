const { createClient } = require('@supabase/supabase-js');

function createBridgeSupabase(config) {
  if (!config.supabaseUrl || !config.supabaseServiceKey) {
    return null;
  }
  return createClient(config.supabaseUrl, config.supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function updateAlertaEvidencia(supabase, alertId, fields) {
  if (!supabase || !alertId || String(alertId).startsWith('pending-')) return;
  const { error } = await supabase.from('alertas_crisis').update(fields).eq('id', alertId);
  if (error) {
    console.warn('[Bridge] No se pudo actualizar alerta en Supabase:', error.message);
  }
}

function subscribeAlerts(supabase, config, onAlert) {
  if (!supabase || !config.organizacionId) {
    console.log('[Bridge] Realtime desactivado (falta supabase o organizacionId).');
    return () => {};
  }

  const channel = supabase
    .channel(`bridge-org-${config.organizacionId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'alertas_crisis',
        filter: `organizacion_id=eq.${config.organizacionId}`,
      },
      (payload) => {
        onAlert(payload.new);
      }
    )
    .subscribe((status) => {
      console.log('[Bridge] Realtime alertas:', status);
    });

  return () => supabase.removeChannel(channel);
}

module.exports = { createBridgeSupabase, updateAlertaEvidencia, subscribeAlerts };
