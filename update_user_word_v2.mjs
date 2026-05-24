import { createClient } from '@supabase/supabase-js';

// Usamos la service_role key que tiene más permisos
const supabase = createClient(
  'https://mhpaituddudtamoiwdut.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ocGFpdHVkZHVkdGFtb2l3ZHV0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzI2NTE1MSwiZXhwIjoyMDkyODQxMTUxfQ.5K1zptw8J4rJBboqGCc61LTNhF5z0H1EpTyx2xXIluc'
);

async function run() {
  console.log("Intentando actualizar palabra clave...");
  
  // Si la columna no existe, el update fallará. 
  // La única forma de crear columnas es vía SQL Editor o una función RPC 'exec_sql'.
  
  const { data, error } = await supabase.from('usuarios_clave').update({
    clave_seguridad: 'Loro'
  }).eq('id', '97a4d8ae-af28-46d2-8cf8-0a61218a009f');

  if (error) {
    if (error.message.includes('column')) {
      console.log("❌ ERROR: La columna 'clave_seguridad' no existe en la tabla 'usuarios_clave'.");
      console.log("Necesitas ejecutar este comando en el SQL Editor de Supabase:");
      console.log("ALTER TABLE usuarios_clave ADD COLUMN clave_seguridad TEXT;");
    } else {
      console.log("Error:", error.message);
    }
  } else {
    console.log("✅ Palabra clave actualizada a 'Loro'.");
  }
}

run();
