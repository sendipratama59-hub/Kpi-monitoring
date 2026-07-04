import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: years } = await supabase.from('salesman_kpi').select('period_year').limit(1);
  const year = years && years.length ? years[0].period_year : 2024;
  
  for (let m=1; m<=12; m++) {
      const { data, error } = await supabase.rpc('get_salesman_kpi_summary', {
          p_month: m,
          p_year: year
      });
      if (!error && data) {
          for (const d of data) {
              if (d.payment_3c > 130000000 && d.payment_3c < 145000000) {
                  console.log(`Month: ${m}, Salesman: ${d.salesman_name}, KPI Payment 3C: ${d.payment_3c}`);
              }
          }
      }
  }
}
run();
