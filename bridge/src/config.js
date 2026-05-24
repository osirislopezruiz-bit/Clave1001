const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', 'config.json');

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error('\n❌ Falta bridge/config.json — copie config.example.json y complete los datos.\n');
    process.exit(1);
  }
  const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  if (!raw.apiKey || raw.apiKey.includes('CAMBIAR')) {
    throw new Error('Configure apiKey en config.json');
  }
  if (!raw.storagePath) {
    throw new Error('Configure storagePath en config.json');
  }
  return {
    port: raw.port ?? 9876,
    host: raw.host ?? '0.0.0.0',
    storagePath: raw.storagePath,
    apiKey: raw.apiKey,
    organizacionId: raw.organizacionId || null,
    organizacionNombre: raw.organizacionNombre || 'Franquicia',
    supabaseUrl: raw.supabaseUrl || null,
    supabaseServiceKey: raw.supabaseServiceKey || null,
    corsOrigins: raw.corsOrigins || ['*'],
  };
}

module.exports = { loadConfig, CONFIG_PATH };
