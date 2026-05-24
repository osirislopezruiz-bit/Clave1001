-- ═══════════════════════════════════════════════════════════════
-- CLAVE 1001 — ESQUEMA DE ACUERDOS LEGALES Y PRIVACIDAD
-- ═══════════════════════════════════════════════════════════════

-- Agregar columnas para rastrear la aceptación legal en usuarios_clave
ALTER TABLE public.usuarios_clave ADD COLUMN IF NOT EXISTS acuerdos_aceptados BOOLEAN DEFAULT false;
ALTER TABLE public.usuarios_clave ADD COLUMN IF NOT EXISTS acuerdos_hash TEXT;
ALTER TABLE public.usuarios_clave ADD COLUMN IF NOT EXISTS acuerdos_fecha TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.usuarios_clave ADD COLUMN IF NOT EXISTS acuerdos_ip TEXT;
