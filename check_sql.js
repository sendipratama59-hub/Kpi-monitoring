import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.rpc('get_salesman_kpi_summary', {
      p_month: 6,
      p_year: 2024
  });

  if (error) throw error;
  
  for (const d of data) {
      if (d.salesman_name.includes('Sendi Yusuf Pratama')) {
          console.log(`SQL KPI Payment 3C: ${d.payment_3c}`);
      }
  }
}
run();
