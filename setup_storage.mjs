import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhpaituddudtamoiwdut.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ocGFpdHVkZHVkdGFtb2l3ZHV0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzI2NTE1MSwiZXhwIjoyMDkyODQxMTUxfQ.5K1zptw8J4rJBboqGCc61LTNhF5z0H1EpTyx2xXIluc'
);

async function setup() {
  console.log("Creando bucket 'logos'...");
  const { data, error } = await supabase.storage.createBucket('logos', {
    public: true,
    fileSizeLimit: 10485760, // 10MB
  });
  
  if (error) {
    if (error.message.includes('already exists') || error.statusCode === '400') {
      console.log("El bucket 'logos' ya existe.");
    } else {
      console.error("Error creando bucket:", error);
    }
  } else {
    console.log("Bucket 'logos' creado correctamente.");
  }
}

setup();
