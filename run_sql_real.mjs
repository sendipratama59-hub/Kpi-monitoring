import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const sql = fs.readFileSync('src/components/features/SetupDatabase/sql-scripts.ts', 'utf8');
const match = sql.split('`');
if (match.length > 3) {
    const query = match[3]; 
    const { data, error } = await supabase.rpc('exec_sql', {
        query_text: query
    });
    if (error) {
        console.error("Error executing SQL:", error);
    } else {
        console.log("Success! Updated Supabase views via exec_sql.");
    }
}
