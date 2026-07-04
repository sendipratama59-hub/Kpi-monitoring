import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('salesman_kpi')
    .select('customer_name, brand_name, category, total_amount, idle_customer')
    .gt('idle_customer', 0)
    .limit(10);
  
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Idle Customer rows:", JSON.stringify(data, null, 2));
  }
}
run();
