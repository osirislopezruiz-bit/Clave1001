import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhpaituddudtamoiwdut.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ocGFpdHVkZHVkdGFtb2l3ZHV0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzI2NTE1MSwiZXhwIjoyMDkyODQxMTUxfQ.5K1zptw8J4rJBboqGCc61LTNhF5z0H1EpTyx2xXIluc'
);

async function checkTable(tableName) {
  console.log(`\n--- Estructura de ${tableName} ---`);
  const { data, error } = await supabase.from(tableName).select('*').limit(1);
  if (error) {
    console.error(`Error leyendo ${tableName}:`, error.message);
    return;
  }
  if (data && data.length > 0) {
    console.log("Columnas detectadas:", Object.keys(data[0]));
  } else {
    console.log("Tabla vacía, no se pueden detectar columnas vía SELECT *.");
    // Intento de inserción fallida para forzar error de esquema
    const { error: schemaErr } = await supabase.from(tableName).insert([{}]).select();
    console.log("Error de esquema (para diagnóstico):", schemaErr?.message);
  }
}

async function run() {
  await checkTable('usuarios_clave');
  await checkTable('alertas_crisis');
  await checkTable('organizaciones');
}

run();
