import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://mhpaituddudtamoiwdut.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ocGFpdHVkZHVkdGFtb2l3ZHV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNjUxNTEsImV4cCI6MjA5Mjg0MTE1MX0.fV433dD7OyuiROGrOhhO6aS90qeEzbz6vlGhqZJJ7B4';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function generateDirectory() {
  const { data: orgs, error } = await supabase.from('organizaciones').select('*').order('nombre');
  if (error) {
    console.error('Error fetching orgs:', error);
    return;
  }

  let markdown = `# Directorio Oficial de Franquicias - Clave 1001\n\n`;
  markdown += `Documento generado automáticamente con las credenciales por defecto y enlaces de invitación para cada franquiciatario.\n\n`;
  markdown += `> **Nota de Seguridad:** Las contraseñas en Supabase están encriptadas. Esta es la contraseña predeterminada que asigna el sistema. Si el administrador la cambió, deberá usar la función "Olvidé mi contraseña".\n\n`;
  markdown += `---\n\n`;

  orgs.forEach(org => {
    const adminEmail = org.nombre.trim().toLowerCase().replace(/[^a-z0-9]/g, '_') + '_admin@clave1001.com';
    const inviteLink = `https://clave-1001-standalone.vercel.app/?org=${org.id}`;
    
    markdown += `## ${org.nombre}\n`;
    if (org.slogan) markdown += `*Slogan:* ${org.slogan}\n\n`;
    markdown += `- **ID de Organización:** \`${org.id}\`\n`;
    markdown += `- **Enlace para Usuarios:** [${inviteLink}](${inviteLink})\n`;
    markdown += `- **Usuario (Operador):** \`${adminEmail}\`\n`;
    markdown += `- **Contraseña por defecto:** \`Clave1001_Password!\`\n\n`;
  });

  fs.writeFileSync('docs/DIRECTORIO-FRANQUICIAS.md', markdown);
  console.log('Directorio generado en docs/DIRECTORIO-FRANQUICIAS.md');
}

generateDirectory();
