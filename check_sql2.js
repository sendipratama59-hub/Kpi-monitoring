import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.rpc('get_salesman_kpi_summary', {
      p_month: 6,
      p_year: 2025 // Or 2024? Wait, the month 6 is in 2025 maybe?
  });

  if (error) throw error;
  
  if (data) {
      for (const d of data) {
          if (d.salesman_name && d.salesman_name.includes('Sendi Yusuf')) {
              console.log(`SQL KPI Payment 3C (2025): ${d.payment_3c}`);
          }
      }
  }
}
run();
