import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function addErexColumn() {
  console.log("Adding erex_asignado_id to alertas_crisis...");
  const sql = `
    ALTER TABLE alertas_crisis ADD COLUMN IF NOT EXISTS erex_asignado_id UUID REFERENCES usuarios_clave(id);
  `;
  
  // Como no hay endpoint rpc genérico por defecto, intentamos hacerlo via REST si existe función ejecutora
  // Pero lo mejor es que el usuario lo corra en el panel de Supabase SQL si no tenemos rpc.
  // Intentemos hacer un dummy update para ver si falla.
  const { data, error } = await supabase.from('alertas_crisis').select('erex_asignado_id').limit(1);
  if (error && error.message.includes('erex_asignado_id')) {
    console.log("La columna no existe. Por favor ejecuta este SQL en tu panel de Supabase:");
    console.log("ALTER TABLE alertas_crisis ADD COLUMN erex_asignado_id UUID REFERENCES usuarios_clave(id);");
  } else {
    console.log("La columna erex_asignado_id ya existe o no se detectó error.");
  }
}

addErexColumn();
