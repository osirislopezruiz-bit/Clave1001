-- FASE 1: Políticas de Seguridad a Nivel de Fila (RLS)
-- Esto previene que cualquier usuario pueda leer las alertas y datos de otros.

-- 1. Habilitar RLS en todas las tablas sensibles
ALTER TABLE public.usuarios_clave ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alertas_crisis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispositivos_nfc ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vinculos_guardian ENABLE ROW LEVEL SECURITY;

-- 2. Políticas para 'usuarios_clave' (Perfiles)
-- Un usuario solo puede ver y editar su propio perfil
CREATE POLICY "Usuario_Ver_Propio_Perfil" ON public.usuarios_clave
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Usuario_Editar_Propio_Perfil" ON public.usuarios_clave
FOR UPDATE USING (auth.uid() = id);

-- Los administradores y operadores pueden ver todos los perfiles
CREATE POLICY "Admin_Ver_Todos_Perfiles" ON public.usuarios_clave
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.usuarios_clave 
    WHERE id = auth.uid() AND rol IN ('admin', 'operador')
  )
);

-- 3. Políticas para 'alertas_crisis'
-- Un usuario solo puede ver e insertar sus propias alertas
CREATE POLICY "Usuario_Ver_Propias_Alertas" ON public.alertas_crisis
FOR SELECT USING (auth.uid() = usuario_id);

CREATE POLICY "Usuario_Crear_Alerta" ON public.alertas_crisis
FOR INSERT WITH CHECK (auth.uid() = usuario_id);

-- Administradores/Operadores pueden ver y editar TODAS las alertas (para el centro de mando)
CREATE POLICY "Admin_Ver_Todas_Alertas" ON public.alertas_crisis
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.usuarios_clave 
    WHERE id = auth.uid() AND rol IN ('admin', 'operador')
  )
);

CREATE POLICY "Admin_Editar_Alertas" ON public.alertas_crisis
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.usuarios_clave 
    WHERE id = auth.uid() AND rol IN ('admin', 'operador')
  )
);

-- 4. Políticas para 'dispositivos_nfc'
CREATE POLICY "Usuario_Ver_NFC" ON public.dispositivos_nfc
FOR SELECT USING (auth.uid() = usuario_id);

CREATE POLICY "Admin_Ver_NFC" ON public.dispositivos_nfc
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.usuarios_clave 
    WHERE id = auth.uid() AND rol IN ('admin', 'operador')
  )
);

-- 5. Políticas para 'vinculos_guardian'
CREATE POLICY "Usuario_Ver_Guardianes" ON public.vinculos_guardian
FOR SELECT USING (auth.uid() = usuario_id OR auth.uid() = guardian_id);
