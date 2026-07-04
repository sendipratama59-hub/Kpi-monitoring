import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.rpc('exec_sql', {
      query_text: "SELECT pg_get_functiondef('get_salesman_kpi_summary'::regproc);"
  });
  console.log(error || data);
}
run();
