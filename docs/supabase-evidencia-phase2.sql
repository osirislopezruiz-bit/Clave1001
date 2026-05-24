-- Fase 2: Bridge local por franquicia
ALTER TABLE organizaciones
  ADD COLUMN IF NOT EXISTS storage_mode text DEFAULT 'manual_download',
  ADD COLUMN IF NOT EXISTS bridge_url text,
  ADD COLUMN IF NOT EXISTS bridge_api_key text;

ALTER TABLE alertas_crisis
  ADD COLUMN IF NOT EXISTS evidencia_ruta_local text,
  ADD COLUMN IF NOT EXISTS evidencia_subida_at timestamptz;

COMMENT ON COLUMN organizaciones.storage_mode IS 'manual_download | local_bridge';
COMMENT ON COLUMN organizaciones.bridge_url IS 'URL base del Bridge (sin barra final), ej. http://192.168.1.10:9876';
COMMENT ON COLUMN organizaciones.bridge_api_key IS 'Clave compartida PWA/War Room ↔ Bridge (rotar por franquicia)';
