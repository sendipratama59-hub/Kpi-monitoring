import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('salesman_kpi')
    .select('customer_name, brand_name, category, total_amount, idle_customer, period_month, period_year')
    .gt('idle_customer', 0)
    .eq('period_month', 6)
    .eq('period_year', 2026);
  
  if (error) {
    console.error("Error:", error);
  } else {
    // Count how many times each customer appears
    const counts = {};
    data.forEach(r => {
      counts[r.customer_name] = (counts[r.customer_name] || []).concat(r);
    });
    
    // Print customers with multiple idle rows
    Object.keys(counts).forEach(name => {
      if (counts[name].length > 1) {
        console.log(`Customer: ${name} has ${counts[name].length} idle rows:`, JSON.stringify(counts[name], null, 2));
      }
    });
  }
}
run();
