import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('salesman_payments')
    .select('period_month')
    ;

  if (error) throw error;
  
  const months = [...new Set(data.map(d => d.period_month))];
  console.log("Months in salesman_payments:", months);
}
run();
