-- Opcional (Fase 1): metadatos de evidencia sin archivo en Storage
ALTER TABLE alertas_crisis
  ADD COLUMN IF NOT EXISTS evidencia_estado text,
  ADD COLUMN IF NOT EXISTS evidencia_duracion_seg int,
  ADD COLUMN IF NOT EXISTS evidencia_hash text;
