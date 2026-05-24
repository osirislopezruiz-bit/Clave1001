-- ESQUEMA DE ACTUALIZACION: ETIQUETA BLANCA E IoT

-- 1. Ampliación de Organizaciones (Etiqueta Blanca)
ALTER TABLE public.organizaciones ADD COLUMN IF NOT EXISTS tipo_letra TEXT DEFAULT 'Inter';
ALTER TABLE public.organizaciones ADD COLUMN IF NOT EXISTS color_secundario TEXT;
ALTER TABLE public.organizaciones ADD COLUMN IF NOT EXISTS color_acento TEXT;
ALTER TABLE public.organizaciones ADD COLUMN IF NOT EXISTS slogan TEXT;
ALTER TABLE public.organizaciones ADD COLUMN IF NOT EXISTS domicilio TEXT;
ALTER TABLE public.organizaciones ADD COLUMN IF NOT EXISTS redes_sociales JSONB DEFAULT '{}'::jsonb;

-- 2. Esquema IoT (Exclusivo Clave 1001)

CREATE TABLE IF NOT EXISTS public.dispositivos_iot (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mac_address TEXT UNIQUE,
  tipo TEXT CHECK (tipo IN ('camara', 'gps', 'boton_panico')),
  estado TEXT DEFAULT 'activo',
  bateria INTEGER,
  ultima_conexion TIMESTAMP WITH TIME ZONE,
  asignado_a UUID REFERENCES public.usuarios_clave(id) -- Opcional, para botones asignados a guardias
);

CREATE TABLE IF NOT EXISTS public.cctv_streams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT,
  stream_url TEXT,
  latitud DOUBLE PRECISION,
  longitud DOUBLE PRECISION,
  estado TEXT DEFAULT 'activo'
);

CREATE TABLE IF NOT EXISTS public.vehiculos_gps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  placas TEXT UNIQUE,
  conductor_id UUID REFERENCES public.usuarios_clave(id),
  latitud_actual DOUBLE PRECISION,
  longitud_actual DOUBLE PRECISION,
  ultima_actualizacion TIMESTAMP WITH TIME ZONE
);

-- Nota: No relacionamos estos al tenant porque son exclusivos de Clave 1001
