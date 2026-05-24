import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhpaituddudtamoiwdut.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ocGFpdHVkZHVkdGFtb2l3ZHV0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzI2NTE1MSwiZXhwIjoyMDkyODQxMTUxfQ.5K1zptw8J4rJBboqGCc61LTNhF5z0H1EpTyx2xXIluc'
);

async function run() {
  const userId = '97a4d8ae-af28-46d2-8cf8-0a61218a009f';
  const safetyWord = 'Loro';

  console.log(`Actualizando palabra clave para el usuario ${userId}...`);
  
  const { error } = await supabase
    .from('usuarios_clave')
    .update({ clave_seguridad: safetyWord })
    .eq('id', userId);

  if (error) {
    console.error("Error al actualizar:", error.message);
  } else {
    console.log(`✅ Palabra clave establecida correctamente: "${safetyWord}"`);
  }
}

run();
