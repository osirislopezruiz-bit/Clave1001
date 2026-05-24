import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mhpaituddudtamoiwdut.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ocGFpdHVkZHVkdGFtb2l3ZHV0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzI2NTE1MSwiZXhwIjoyMDkyODQxMTUxfQ.5K1zptw8J4rJBboqGCc61LTNhF5z0H1EpTyx2xXIluc';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Verificando tabla organizaciones...");
  const { data, error } = await supabase.from('organizaciones').select('*').limit(1);
  if (error) {
    console.error("Error al consultar organizaciones:", error);
  } else {
    console.log("Tabla organizaciones existe. Datos:", data);
  }
}
run();
