const { createClient } = require('@supabase/supabase-js');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { organization_id, organization_name, nombre_completo, rol, creado_por } = req.body;

  if (!organization_id || !nombre_completo || !rol) {
    return res.status(400).json({ error: 'Faltan campos requeridos: organization_id, nombre_completo, rol' });
  }

  const VALID_ROLES = [
    'franquicia_admin', 'franquicia_gerente', 'franquicia_coordinador',
    'franquicia_supervisor', 'franquicia_representante', 'vigilante'
  ];

  if (!VALID_ROLES.includes(rol)) {
    return res.status(400).json({ error: `Rol inválido. Roles permitidos: ${VALID_ROLES.join(', ')}` });
  }

  const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || 'https://mhpaituddudtamoiwdut.supabase.co';
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ocGFpdHVkZHVkdGFtb2l3ZHV0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzI2NTE1MSwiZXhwIjoyMDkyODQxMTUxfQ.5K1zptw8J4rJBboqGCc61LTNhF5z0H1EpTyx2xXIluc';

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  try {
    // Generar username basado en nombre + rol + org
    const slug = nombre_completo.trim().toLowerCase().replace(/[^a-z0-9áéíóúñ]/gi, '_').replace(/_{2,}/g, '_');
    const orgSlug = (organization_name || 'org').trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
    const username = `${slug}_${orgSlug}`;
    const email = `${username}@clave1001.com`;
    const password = 'Clave1001_Staff!';

    // Verificar si ya existe
    const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    if (usersError) throw usersError;

    const existingUser = usersData?.users?.find(u => u.email === email);
    let userId;

    if (existingUser) {
      userId = existingUser.id;
      // Actualizar rol si ya existe
      await supabaseAdmin.from('usuarios_clave').upsert({
        id: userId,
        correo: email,
        rol: rol,
        organizacion_id: organization_id,
        nombre_completo: nombre_completo,
        telefono: '0000000000',
        estatus: 'activo',
        creado_por: creado_por || null
      });
    } else {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: {
          organizacion_id: organization_id,
          rol: rol,
          nombre_completo: nombre_completo
        }
      });

      if (authError) throw authError;
      userId = authData.user.id;

      const { error: dbError } = await supabaseAdmin.from('usuarios_clave').upsert({
        id: userId,
        correo: email,
        rol: rol,
        organizacion_id: organization_id,
        nombre_completo: nombre_completo,
        telefono: '0000000000',
        estatus: 'activo',
        creado_por: creado_por || null
      });

      if (dbError) throw dbError;
    }

    // Etiqueta legible del rol
    const ROL_LABELS = {
      'franquicia_admin': 'Administrador',
      'franquicia_gerente': 'Gerente',
      'franquicia_coordinador': 'Coordinador',
      'franquicia_supervisor': 'Supervisor',
      'franquicia_representante': 'Representante de Turno',
      'vigilante': 'Vigilante / Elemento'
    };

    return res.status(200).json({
      message: `${ROL_LABELS[rol] || rol} creado correctamente`,
      credentials: {
        username: email,
        shortUsername: username,
        password: password,
        rol: rol,
        rolLabel: ROL_LABELS[rol] || rol,
        nombre: nombre_completo
      }
    });

  } catch (error) {
    console.error('Error generando staff de franquicia:', error);
    return res.status(500).json({ error: error.message || 'Error Interno del Servidor' });
  }
}
