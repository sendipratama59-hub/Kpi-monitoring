import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('salesman_kpi')
    .select('salesman_code, salesman_name')
    .eq('period_month', 6)
    .ilike('salesman_name', '%Dicki%');

  if (error) throw error;
  console.log(data);
}
run();
