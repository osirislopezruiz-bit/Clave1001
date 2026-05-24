import { supabase } from './supabase';

/** Duración máxima de grabación de evidencia en emergencia (Fase 1). */
export const EVIDENCIA_MAX_SEC = 300;

const DB_NAME = 'clave1001_evidencias';
const DB_STORE = 'pendientes';
const DB_VERSION = 1;

export function getRecorderOptions() {
  const candidates = ['video/webm;codecs=vp8,opus', 'video/webm', ''];
  for (const mimeType of candidates) {
    if (!mimeType || (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mimeType))) {
      return mimeType ? { mimeType } : {};
    }
  }
  return {};
}

export function formatEvidenceDuration(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function downloadEvidenceBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  return url;
}

export async function sha256Blob(blob) {
  if (!window.crypto?.subtle) {
    return null;
  }
  const buf = await blob.arrayBuffer();
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

function openEvidenceDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Fragmento de evidencia mientras la alerta sigue activa (resiliencia si bloquean el teléfono). */
export async function savePartialEvidenceToIndexedDB(entry) {
  return saveEvidenceToIndexedDB({ ...entry, partial: true });
}

/** Respaldo local en el dispositivo del usuario (sin subir video a la nube). */
export async function saveEvidenceToIndexedDB(entry) {
  const db = await openEvidenceDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readwrite');
    tx.objectStore(DB_STORE).put(entry);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function tryUpdateAlertaEvidencia(alertId, fields) {
  if (!alertId || String(alertId).startsWith('pending-')) return;
  try {
    const { error } = await supabase.from('alertas_crisis').update(fields).eq('id', alertId);
    if (error && !error.message?.includes('column')) {
      console.warn('evidencia metadata:', error.message);
    }
  } catch (e) {
    console.warn('evidencia metadata skip:', e);
  }
}

/** Config Bridge Fase 2 desde perfil u organización cargada en Supabase. */
export function getBridgeConfig(source) {
  const org = source?.organization || source?.organizacion || source;
  if (!org?.bridge_url || !org?.bridge_api_key) return null;
  if (org.storage_mode && org.storage_mode !== 'local_bridge') return null;
  return {
    bridgeUrl: String(org.bridge_url).replace(/\/$/, ''),
    apiKey: org.bridge_api_key,
    organizacionId: org.id,
  };
}

/**
 * Envía el .webm al Bridge del franquiciatario (disco local, no Storage en nube).
 */
export async function uploadEvidenceToBridge({
  bridgeUrl,
  apiKey,
  alertId,
  organizacionId,
  blob,
  duracionSeg,
  origen,
  usuarioNombre,
}) {
  const form = new FormData();
  form.append('file', blob, `evidencia_${alertId}.webm`);
  form.append('alert_id', String(alertId));
  form.append('organizacion_id', String(organizacionId));
  if (duracionSeg != null) form.append('duracion_seg', String(duracionSeg));
  if (origen) form.append('origen', origen);
  if (usuarioNombre) form.append('usuario_nombre', usuarioNombre);

  const res = await fetch(`${bridgeUrl}/api/v1/evidencias`, {
    method: 'POST',
    headers: { 'X-Bridge-Api-Key': apiKey },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Bridge HTTP ${res.status}`);
  }
  return res.json();
}

/** IndexedDB + Bridge (si hay config). */
export async function persistEvidenceWithBridge({
  blob,
  alertId,
  userProfile,
  duracionSeg,
  origen,
  indexedEntry,
}) {
  if (indexedEntry) {
    await saveEvidenceToIndexedDB(indexedEntry);
  }

  const bridge = getBridgeConfig(userProfile?.organization || userProfile);
  if (!bridge || !blob?.size) {
    return { bridge: false };
  }

  try {
    const result = await uploadEvidenceToBridge({
      ...bridge,
      alertId,
      organizacionId: bridge.organizacionId,
      blob,
      duracionSeg,
      origen,
      usuarioNombre: userProfile?.nombre_completo,
    });
    await tryUpdateAlertaEvidencia(alertId, {
      evidencia_estado: 'en_bridge',
      evidencia_duracion_seg: duracionSeg,
      evidencia_hash: result.hash,
      evidencia_ruta_local: result.ruta_local,
      evidencia_subida_at: result.subida_at,
    });
    return { bridge: true, result };
  } catch (e) {
    console.warn('[Bridge] fallo subida:', e.message);
    return { bridge: false, error: e.message };
  }
}
