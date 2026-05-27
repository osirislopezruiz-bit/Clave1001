ALTER TABLE public.usuarios_clave ADD COLUMN IF NOT EXISTS ine_path TEXT;
ALTER TABLE public.usuarios_clave ADD COLUMN IF NOT EXISTS ine_hash TEXT;
ALTER TABLE public.usuarios_clave ADD COLUMN IF NOT EXISTS es_menor BOOLEAN DEFAULT FALSE;
ALTER TABLE public.usuarios_clave ADD COLUMN IF NOT EXISTS ine_responsable_path TEXT;
ALTER TABLE public.usuarios_clave ADD COLUMN IF NOT EXISTS ine_responsable_hash TEXT;
