import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.rpc('exec_sql', {
      query_text: `
      SELECT salesman_code, salesman_name,
             SUM(CASE WHEN TRIM(LOWER(brand_name)) IN ('vivan', 'robot', 'acome acc', 'acome iot', 'gamen') AND NOT (TRIM(LOWER(brand_name)) = 'vivan' AND TRIM(COALESCE(LOWER(category), '')) IN ('vivan lcd team', 'vivan sparepart')) THEN total_amount ELSE 0 END) as total_payment_3c
      FROM salesman_payments
      WHERE period_month = 6 AND period_year = 2026 AND salesman_code = '81457'
      GROUP BY salesman_code, salesman_name;
      `
  });
  console.log(error || data);
}
run();
