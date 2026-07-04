import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Parse .env.local to get supabase credentials
const envFile = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = envFile.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = envFile.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

const content = fs.readFileSync('src/components/features/SetupDatabase/sql-scripts.ts', 'utf8');
const match = content.match(/export const SQL_SCRIPT = `([\s\S]*?)`;/);
if (match) {
  const sql = match[1];
  const { data, error } = await supabase.rpc('exec_sql', { query_text: sql });
  if (error) {
    console.error('Error executing SQL:', error);
  } else {
    console.log('SQL executed successfully!');
  }
} else {
  console.log('Could not parse SQL_SCRIPT');
}
