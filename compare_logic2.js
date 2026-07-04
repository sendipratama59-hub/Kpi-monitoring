import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = envFile.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = envFile.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('salesman_payments')
    .select('brand_name, category, total_amount, period_month, salesman_name')
    ;

  if (error) throw error;

  let omset_total = 0;
  let kpi_total = 0;

  for (const p of data) {
      if (p.salesman_name === 'MUHAMMAD AGUS SUPRIYANTO' && p.period_month === 6) {
          // let's just log ALL of their payments
          console.log(`Brand: ${p.brand_name}, Cat: ${p.category}, Amt: ${p.total_amount}`);
      }
  }
}
run();
