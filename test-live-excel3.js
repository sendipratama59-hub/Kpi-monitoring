import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('salesman_payments')
    .select('brand_name, category, total_amount, period_month, salesman_name')
    ;

  if (error) throw error;

  let screen_assembly_sum = 0;
  for (const row of data) {
    const brand = (row.brand_name || "").toLowerCase().trim();
    const cat = (row.category || "").toLowerCase().trim();
    const amount = Number(row.total_amount) || 0;

    if (brand === 'vivan' && cat === 'screen assembly') {
        screen_assembly_sum += amount;
    }
  }

  console.log("Total Screen Assembly across all data:", screen_assembly_sum);
}
run();
