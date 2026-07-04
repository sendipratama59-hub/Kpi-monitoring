import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const sql = fs.readFileSync('src/components/features/SetupDatabase/sql-scripts.ts', 'utf8');
const match = sql.split('`');
if (match.length > 2) {
    const query = match[1]; 
    const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: query
    });
    if (error) {
        console.error(error);
    } else {
        console.log("Success! Extracted and ran SQL via exec_sql.");
    }
}
