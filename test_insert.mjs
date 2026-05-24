import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mhpaituddudtamoiwdut.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ocGFpdHVkZHVkdGFtb2l3ZHV0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzI2NTE1MSwiZXhwIjoyMDkyODQxMTUxfQ.5K1zptw8J4rJBboqGCc61LTNhF5z0H1EpTyx2xXIluc';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Probando inserción con Service Role (saltando RLS)...");
  const { data, error } = await supabase.from('organizaciones').insert([{
    nombre: "Test Org",
    color_primario: "#000000",
    logo_url: "test"
  }]).select();

  if (error) {
    console.error("Error de Schema:", error);
  } else {
    console.log("¡Éxito! Inserción funciona. Borrando prueba...");
    await supabase.from('organizaciones').delete().eq('id', data[0].id);
    console.log("Prueba borrada. Confirmado: Es un problema de RLS.");
  }
}
run();
