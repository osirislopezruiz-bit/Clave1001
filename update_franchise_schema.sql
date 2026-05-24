-- ═══════════════════════════════════════════════════════════════
-- CLAVE 1001 — ESQUEMA DE DELEGACIÓN DE FRANQUICIAS
-- Arché Holding Labs · Sistema de Roles Jerárquicos
-- ═══════════════════════════════════════════════════════════════

-- 1. Expandir CHECK constraint de roles en usuarios_clave
ALTER TABLE public.usuarios_clave DROP CONSTRAINT IF EXISTS usuarios_clave_rol_check;
ALTER TABLE public.usuarios_clave ADD CONSTRAINT usuarios_clave_rol_check 
  CHECK (rol IN (
    'usuario',       -- Usuario final (botón de pánico)
    'guardian',       -- Guardián / tutor
    'admin',         -- Super Admin (Osiris / Clave 1001 Central)
    'operador',      -- Operador del centro de mando central
    'erex',          -- Patrullero EREX central
    'franquicia_admin',        -- Administrador de franquicia (acceso total dentro de su org)
    'franquicia_gerente',      -- Gerente de franquicia
    'franquicia_coordinador',  -- Coordinador operativo
    'franquicia_supervisor',   -- Supervisor de turno
    'franquicia_representante',-- Representante de turno
    'vigilante'                -- Elemento de seguridad / vigilante
  ));

-- 2. Agregar columna de organización si no existe (para vincular staff a franquicias)
ALTER TABLE public.usuarios_clave ADD COLUMN IF NOT EXISTS organizacion_id UUID REFERENCES public.organizaciones(id);

-- 3. Agregar columna de turno activo
ALTER TABLE public.usuarios_clave ADD COLUMN IF NOT EXISTS turno_activo BOOLEAN DEFAULT false;

-- 4. Agregar columna de creado_por (quién creó este usuario dentro de la franquicia)
ALTER TABLE public.usuarios_clave ADD COLUMN IF NOT EXISTS creado_por UUID REFERENCES auth.users(id);

-- 5. Agregar columna estatus
ALTER TABLE public.usuarios_clave ADD COLUMN IF NOT EXISTS estatus TEXT DEFAULT 'activo';

-- 6. Agregar columna correo
ALTER TABLE public.usuarios_clave ADD COLUMN IF NOT EXISTS correo TEXT;

-- 7. Tabla de bitácora de turnos (para representantes y vigilantes)
CREATE TABLE IF NOT EXISTS public.bitacora_turnos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID REFERENCES public.usuarios_clave(id),
  organizacion_id UUID REFERENCES public.organizaciones(id),
  tipo TEXT CHECK (tipo IN ('inicio_turno', 'fin_turno', 'novedad', 'ronda', 'incidente')),
  descripcion TEXT,
  latitud DOUBLE PRECISION,
  longitud DOUBLE PRECISION,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Agregar organizacion_id a alertas si no existe
ALTER TABLE public.alertas_crisis ADD COLUMN IF NOT EXISTS organizacion_id UUID REFERENCES public.organizaciones(id);
ALTER TABLE public.alertas_crisis ADD COLUMN IF NOT EXISTS erex_asignado_id UUID;

-- 9. Activar Realtime para nuevas tablas
ALTER PUBLICATION supabase_realtime ADD TABLE bitacora_turnos;
