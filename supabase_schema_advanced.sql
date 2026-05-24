-- ESQUEMA MAESTRO: CLAVE 1001 - SISTEMA DE RESPUESTA TOTAL

-- 1. Tabla de Usuarios Avanzada (Extiende Auth)
CREATE TABLE IF NOT EXISTS public.usuarios_clave (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  telefono TEXT UNIQUE,
  nombre_completo TEXT,
  rol TEXT CHECK (rol IN ('usuario', 'guardian', 'admin', 'operador')) DEFAULT 'usuario',
  avatar_url TEXT,
  config_voz_activa BOOLEAN DEFAULT false,
  palabra_clave TEXT DEFAULT 'AYUDA 1001',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabla de Alertas de Crisis
CREATE TABLE IF NOT EXISTS public.alertas_crisis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID REFERENCES public.usuarios_clave(id),
  tipo_activacion TEXT CHECK (tipo_activacion IN ('boton', 'voz', 'nfc', 'caida')) DEFAULT 'boton',
  latitud DOUBLE PRECISION,
  longitud DOUBLE PRECISION,
  foto_evidencia_url TEXT,
  estado TEXT CHECK (estado IN ('activa', 'en_camino', 'resuelta', 'falsa_alarma')) DEFAULT 'activa',
  comentarios_operador TEXT,
  fecha_inicio TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fecha_fin TIMESTAMP WITH TIME ZONE
);

-- 3. Tabla de Chips NFC y Heartbeats (Seguridad Pasiva)
CREATE TABLE IF NOT EXISTS public.dispositivos_nfc (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID REFERENCES public.usuarios_clave(id),
  nfc_tag_id TEXT UNIQUE,
  frecuencia_minutos INTEGER DEFAULT 180, -- Las 3 horas que mencionas
  ultima_conexion TIMESTAMP WITH TIME ZONE,
  proxima_esperada TIMESTAMP WITH TIME ZONE,
  estado_monitoreo BOOLEAN DEFAULT true
);

-- 4. Vínculos de Guardianes (Red de Apoyo)
CREATE TABLE IF NOT EXISTS public.vinculos_guardian (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID REFERENCES public.usuarios_clave(id),
  guardian_id UUID REFERENCES public.usuarios_clave(id),
  parentesco TEXT,
  notificar_sms BOOLEAN DEFAULT true,
  acceso_gps_pasivo BOOLEAN DEFAULT false
);

-- 5. Activar Realtime para Alertas (Vital para el Centro de Mando)
ALTER PUBLICATION supabase_realtime ADD TABLE alertas_crisis;
