import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function runSQL() {
  const code = fs.readFileSync('src/components/features/SetupDatabase.tsx', 'utf8');
  const sqlMatch = code.match(/const SQL_SCRIPT = `([\s\S]*?)`;/);
  if (sqlMatch) {
    const rawSql = sqlMatch[1];
    const { error } = await supabase.rpc('exec_sql', { query_text: rawSql });
    console.log('Setup DB Execute Query Error:', error);
  } else {
    console.log('No SQL_SCRIPT found');
  }
}
runSQL();
