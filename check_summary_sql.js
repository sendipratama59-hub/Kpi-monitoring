import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.rpc('get_salesman_kpi_summary', {
      p_month: 6,
      p_year: 2026 // or 2024? I'll just check period year 2026 first
  });

  if (error) {
    console.error(error);
    return;
  }
  
  if (data) {
      for (const d of data) {
          if (d.salesman_name && d.salesman_name.includes('Sendi Yusuf')) {
              console.log(`Summary KPI Payment 3C: ${d.payment_3c} for ${d.salesman_name} (${d.salesman_code})`);
          }
      }
  }
}
run();
