import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mhpaituddudtamoiwdut.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ocGFpdHVkZHVkdGFtb2l3ZHV0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzI2NTE1MSwiZXhwIjoyMDkyODQxMTUxfQ.5K1zptw8J4rJBboqGCc61LTNhF5z0H1EpTyx2xXIluc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Forzando confirmación de correo...");
  
  const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
  if (usersError) {
      console.error("Error al listar usuarios:", usersError);
      return;
  }
  
  const user = usersData.users.find(u => u.email === 'ceo@arche.com');
  if (user) {
      const { error } = await supabase.auth.admin.updateUserById(user.id, { email_confirm: true });
      if (!error) {
        console.log("¡Éxito! Correo confirmado oficialmente por el Super Admin.");
      } else {
        console.error("Error al confirmar correo:", error);
      }
  } else {
       console.log("No se pudo encontrar el usuario.");
  }
}

run();
