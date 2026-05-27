const express = require('express');
const cors = require('cors');
const multer = require('multer');
const os = require('os');
const path = require('path');
const fs = require('fs');

const { loadConfig } = require('./config');
const { saveEvidenceFile, ensureDir } = require('./storage');
const { createBridgeSupabase, updateAlertaEvidencia, subscribeAlerts } = require('./supabase-sync');

const config = loadConfig();
ensureDir(config.storagePath);

const supabase = createBridgeSupabase(config);
const upload = multer({ dest: path.join(os.tmpdir(), 'clave1001-bridge') });

const app = express();
app.use(express.json({ limit: '2mb' }));

app.use(
  cors({
    origin(origin, cb) {
      if (!origin || config.corsOrigins.includes('*') || config.corsOrigins.includes(origin)) {
        cb(null, true);
      } else {
        cb(new Error('CORS no permitido'));
      }
    },
  })
);

function authBridge(req, res, next) {
  const key = req.headers['x-bridge-api-key'];
  if (!key || key !== config.apiKey) {
    return res.status(401).json({ error: 'API key inválida' });
  }
  next();
}

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'clave1001-bridge',
    version: '1.0.0',
    organizacionId: config.organizacionId,
    organizacionNombre: config.organizacionNombre,
    storagePath: config.storagePath,
    supabase: Boolean(supabase),
  });
});

app.post('/api/v1/evidencias', authBridge, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Falta archivo (campo file)' });
    }

    const alertId = req.body.alert_id;
    const orgId = req.body.organizacion_id || config.organizacionId;

    if (!alertId) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Falta alert_id' });
    }

    if (config.organizacionId && orgId && orgId !== config.organizacionId) {
      fs.unlinkSync(req.file.path);
      return res.status(403).json({ error: 'organizacion_id no coincide con esta instalación' });
    }

    const saved = saveEvidenceFile({
      storagePath: config.storagePath,
      organizacionId: orgId || 'local',
      alertId,
      tempPath: req.file.path,
      originalName: req.file.originalname,
    });

    const duracion = parseInt(req.body.duracion_seg, 10) || null;
    const origen = req.body.origen || 'desconocido';

    const meta = {
      evidencia_estado: 'en_bridge',
      evidencia_ruta_local: saved.ruta_local,
      evidencia_hash: saved.hash,
      evidencia_duracion_seg: duracion,
      evidencia_subida_at: saved.subida_at,
    };

    await updateAlertaEvidencia(supabase, alertId, meta);

    console.log(
      `[Bridge] Evidencia guardada (${origen}) alerta=${alertId} → ${saved.ruta_local} (${saved.sizeBytes} bytes)`
    );

    res.json({
      ok: true,
      alert_id: alertId,
      ...saved,
      origen,
    });
  } catch (err) {
    console.error('[Bridge] Error upload:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/v1/acuerdos_legales', authBridge, (req, res) => {
  try {
    const { usuario_id, nombre, organizacionId, content } = req.body;
    if (!usuario_id || !content) {
      return res.status(400).json({ error: 'Faltan datos (usuario_id, content)' });
    }

    const orgDir = organizacionId || config.organizacionId || 'Central';
    const dir = path.join(config.storagePath, 'Acuerdos_Legales', orgDir);
    ensureDir(dir);

    const safeName = (nombre || 'Usuario').replace(/[^a-zA-Z0-9_-]/g, '_');
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `Acuerdo_${safeName}_${ts}.txt`;
    const destPath = path.join(dir, filename);

    fs.writeFileSync(destPath, content, 'utf8');

    console.log(`[Bridge] Acuerdo legal guardado: ${destPath}`);

    res.json({ ok: true, ruta_local: destPath, filename });
  } catch (err) {
    console.error('[Bridge] Error al guardar acuerdo:', err);
    res.status(500).json({ error: err.message });
  }
});

// ----------- NUEVO ENDPOINT: Registro simplificado con INE -----------
app.post('/api/v1/validate_user', authBridge, upload.fields([{ name: 'ine_file', maxCount: 1 }, { name: 'ine_responsable_file', maxCount: 1 }]), async (req, res) => {
  try {
    const { email, es_menor } = req.body;
    const ineFile = req.files['ine_file'] ? req.files['ine_file'][0] : null;
    const responsableFile = req.files['ine_responsable_file'] ? req.files['ine_responsable_file'][0] : null;

    if (!email || !ineFile) {
      return res.status(400).json({ error: 'Faltan email o archivo INE del usuario' });
    }
    if (es_menor === 'true' && !responsableFile) {
      return res.status(400).json({ error: 'Menor requiere INE del responsable' });
    }

    // Guardar INE del usuario
    const savedIne = saveEvidenceFile({
      storagePath: config.storagePath,
      organizacionId: config.organizacionId || 'local',
      alertId: 'registro-ine',
      tempPath: ineFile.path,
      originalName: ineFile.originalname,
    });

    let savedResp = null;
    if (responsableFile) {
      savedResp = saveEvidenceFile({
        storagePath: config.storagePath,
        organizacionId: config.organizacionId || 'local',
        alertId: 'registro-ine-resp',
        tempPath: responsableFile.path,
        originalName: responsableFile.originalname,
      });
    }

    // Upsert en Supabase
    const upsertData = {
      email,
      ine_path: savedIne.ruta_local,
      ine_hash: savedIne.hash,
      es_menor: es_menor === 'true',
    };
    if (savedResp) {
      upsertData.ine_responsable_path = savedResp.ruta_local;
      upsertData.ine_responsable_hash = savedResp.hash;
    }
    const { error } = await supabase.from('usuarios_clave').upsert(upsertData, { onConflict: ['email'] });
    if (error) {
      console.error('[Bridge] Error upsert registro:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ ok: true, email, es_menor: es_menor === 'true' });
  } catch (err) {
    console.error('[Bridge] Error registro usuario:', err);
    res.status(500).json({ error: err.message });
  }
});

const server = app.listen(config.port, config.host, () => {
  console.log('\n══════════════════════════════════════════');
  console.log('  CLAVE 1001 BRIDGE — Fase 2');
  console.log(`  Escuchando: http://${config.host === '0.0.0.0' ? 'localhost' : config.host}:${config.port}`);
  console.log(`  Carpeta:    ${config.storagePath}`);
  console.log(`  Franquicia: ${config.organizacionNombre}`);
  console.log('══════════════════════════════════════════\n');
});

if (supabase) {
  subscribeAlerts(supabase, config, (alert) => {
    console.log(`[Bridge] 🚨 Nueva alerta ${alert.id} — listo para recibir evidencia`);
    const dir = path.join(
      config.storagePath,
      config.organizacionId || 'local',
      new Date().getFullYear().toString(),
      String(new Date().getMonth() + 1).padStart(2, '0')
    );
    ensureDir(dir);
  });
}

process.on('SIGINT', () => {
  server.close();
  process.exit(0);
});
