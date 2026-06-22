import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('salesman_kpi').select('id, period_month, period_year').limit(5);
  console.log('KPI DATA:', JSON.stringify(data, null, 2));
  console.log('ERROR:', error);
  
  const { data: qData, error: qError } = await supabase.rpc('get_salesman_kpi_summary', { p_month: 5, p_year: 2026 });
  console.log('summary:', JSON.stringify(qData, null, 2));
  console.log('error summary:', qError);
}
check();
