import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const sql = fs.readFileSync('src/components/features/SetupDatabase/sql-scripts.ts', 'utf8');
const match = sql.match(/execute_sql_query\([\s\S]*?`([\s\S]+?)`\)/);
if (match) {
    const query = match[1];
    const { data, error } = await supabase.rpc('execute_sql_query', {
        sql_query: query
    });
    if (error) {
        console.error(error);
    } else {
        console.log("Success!");
    }
}
