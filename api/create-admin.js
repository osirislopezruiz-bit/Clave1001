const { createClient } = require('@supabase/supabase-js');

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { organization_id, organization_name, admin_name } = req.body;
  if (!organization_id || !organization_name || !admin_name) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }

  // Use the service role key. Hardcoded fallback since this is a private internal project.
  const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || 'https://mhpaituddudtamoiwdut.supabase.co';
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ocGFpdHVkZHVkdGFtb2l3ZHV0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzI2NTE1MSwiZXhwIjoyMDkyODQxMTUxfQ.5K1zptw8J4rJBboqGCc61LTNhF5z0H1EpTyx2xXIluc';

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  try {
    // Generate username format
    const username = admin_name.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
    const email = `${username}@clave1001.com`;
    const password = 'Clave1001_Password!'; // Generic initial password

    const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    if (usersError) throw usersError;
    
    const existingUser = usersData?.users?.find(u => u.email === email);
    let userId;

    if (existingUser) {
      userId = existingUser.id;
    } else {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: {
          organizacion_id: organization_id,
          rol: 'admin',
          nombre_completo: `${organization_name} Admin`
        }
      });

      if (authError) throw authError;
      userId = authData.user.id;
    }

    // Upsert into usuarios_clave
    const { error: dbError } = await supabaseAdmin.from('usuarios_clave').upsert({
      id: userId,
      correo: email,
      rol: 'admin',
      organizacion_id: organization_id,
      nombre_completo: `${organization_name} Admin`,
      telefono: '0000000000',
      estatus: 'activo'
    });

    if (dbError) throw dbError;

    return res.status(200).json({
      message: 'Admin generado correctamente',
      credentials: {
        username: email, // Usan el correo completo o podemos mostrar ambos
        password: password
      }
    });

  } catch (error) {
    console.error('Error generando credenciales admin:', error);
    return res.status(500).json({ error: error.message || 'Error Interno del Servidor' });
  }
}
