const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function sha256File(filePath) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex').toUpperCase();
}

/**
 * Guarda evidencia en disco: {storagePath}/{orgId}/{YYYY}/{MM}/{alertId}_{ts}.webm
 */
function saveEvidenceFile({ storagePath, organizacionId, alertId, tempPath, originalName }) {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const ts = now.toISOString().replace(/[:.]/g, '-');
  const safeAlert = String(alertId).replace(/[^a-zA-Z0-9_-]/g, '_');
  const ext = path.extname(originalName || '.webm') || '.webm';
  const dir = path.join(storagePath, organizacionId || 'sin-org', String(y), m);
  ensureDir(dir);
  const filename = `${safeAlert}_${ts}${ext}`;
  const destPath = path.join(dir, filename);
  fs.renameSync(tempPath, destPath);
  const stat = fs.statSync(destPath);
  const hash = sha256File(destPath);
  return {
    ruta_local: destPath,
    filename,
    sizeBytes: stat.size,
    hash,
    subida_at: now.toISOString(),
  };
}

module.exports = { saveEvidenceFile, ensureDir };
