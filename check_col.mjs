import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mhpaituddudtamoiwdut.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ocGFpdHVkZHVkdGFtb2l3ZHV0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzI2NTE1MSwiZXhwIjoyMDkyODQxMTUxfQ.5K1zptw8J4rJBboqGCc61LTNhF5z0H1EpTyx2xXIluc';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // Test if we can insert with organización_id
  const { error } = await supabase.from('usuarios_clave').update({ 'organización_id': null }).eq('id', '00000000-0000-0000-0000-000000000000');
  if (error && error.code !== 'PGRST116') {
    console.error("Error/Column might be missing:", error);
  } else {
    console.log("Column organización_id exists or request was valid.");
  }
}
run();
