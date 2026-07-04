import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.rpc('get_salesman_kpi_summary', {
      p_month: 6, p_year: 2026
  });
  if (data) {
      console.log(data.filter(d => d.salesman_code === '81457'));
  }
}
run();
