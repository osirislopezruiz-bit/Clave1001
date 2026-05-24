import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhpaituddudtamoiwdut.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ocGFpdHVkZHVkdGFtb2l3ZHV0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzI2NTE1MSwiZXhwIjoyMDkyODQxMTUxfQ.5K1zptw8J4rJBboqGCc61LTNhF5z0H1EpTyx2xXIluc'
);

async function run() {
  const partialId = '97a4d8ae-af2';

  // 1. Buscar en auth.users via admin API
  console.log("Buscando usuario en auth...");
  const { data: authUsers, error: authErr } = await supabase.auth.admin.listUsers();
  if (authErr) { console.error("Error auth:", authErr); return; }
  
  const authUser = authUsers.users.find(u => u.id.startsWith(partialId));
  if (!authUser) {
    console.log("❌ Usuario NO encontrado en auth.users con ese ID parcial.");
    return;
  }
  
  console.log("✅ Usuario encontrado en auth:");
  console.log(`  ID: ${authUser.id}`);
  console.log(`  Email: ${authUser.email}`);
  console.log(`  Email confirmado: ${authUser.email_confirmed_at ? 'SÍ' : 'NO ❌'}`);
  console.log(`  Creado: ${authUser.created_at}`);

  // 2. Buscar en usuarios_clave
  console.log("\nBuscando perfil en usuarios_clave...");
  const { data: profile, error: profileErr } = await supabase
    .from('usuarios_clave')
    .select('*')
    .eq('id', authUser.id)
    .single();

  if (profileErr || !profile) {
    console.log("❌ NO tiene perfil en usuarios_clave:", profileErr?.message);
    console.log("   → Creando perfil de emergencia...");
    const { error: insertErr } = await supabase.from('usuarios_clave').insert([{
      id: authUser.id,
      nombre_completo: authUser.user_metadata?.full_name || authUser.email,
      telefono: authUser.phone || null,
      rol: 'usuario'
    }]);
    if (insertErr) console.error("Error al crear perfil:", insertErr.message);
    else console.log("✅ Perfil creado.");
  } else {
    console.log("✅ Perfil encontrado:");
    console.log(`  Nombre: ${profile.nombre_completo}`);
    console.log(`  Rol: ${profile.rol}`);
    console.log(`  Org: ${profile['organización_id'] || 'Sin organización'}`);
  }

  // 3. Confirmar email si no está confirmado
  if (!authUser.email_confirmed_at) {
    console.log("\n⚡ Confirmando email automáticamente...");
    const { error: confirmErr } = await supabase.auth.admin.updateUserById(authUser.id, {
      email_confirm: true
    });
    if (confirmErr) console.error("Error confirmando email:", confirmErr.message);
    else console.log("✅ Email confirmado. El usuario ya puede acceder.");
  } else {
    console.log("\n✅ Email ya confirmado. El problema era otro.");
    console.log("   → Revisa si el perfil fue creado arriba.");
  }
}

run();
