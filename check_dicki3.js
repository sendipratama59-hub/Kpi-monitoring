import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('salesman_payments')
    .select('salesman_code, total_amount')
    .eq('period_month', 6)
    .ilike('salesman_name', '%Dicki%');

  if (error) throw error;
  
  const map = {};
  for (const p of data) {
      if (!map[p.salesman_code]) map[p.salesman_code] = 0;
      map[p.salesman_code] += Number(p.total_amount);
  }
  console.log(map);
}
run();
