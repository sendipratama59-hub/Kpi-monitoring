import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('salesman_payments')
    .select('salesman_code, salesman_name')
    .eq('period_month', 6);

  if (error) throw error;
  
  const map = {};
  for (const d of data) {
      if (!map[d.salesman_code]) map[d.salesman_code] = new Set();
      map[d.salesman_code].add(d.salesman_name);
  }
  
  for (const code in map) {
      if (map[code].size > 1) {
          console.log(`Code ${code} has multiple names:`, Array.from(map[code]));
      }
  }
}
run();
