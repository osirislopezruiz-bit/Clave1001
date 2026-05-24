import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mhpaituddudtamoiwdut.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ocGFpdHVkZHVkdGFtb2l3ZHV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNjUxNTEsImV4cCI6MjA5Mjg0MTE1MX0.fV433dD7OyuiROGrOhhO6aS90qeEzbz6vlGhqZJJ7B4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
