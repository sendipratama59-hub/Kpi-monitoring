import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('salesman_payments')
    .select('salesman_code, salesman_name, total_amount')
    .eq('period_month', 6)
    .ilike('salesman_name', '%Sendi Yusuf%');

  if (error) throw error;
  
  const codes = [...new Set(data.map(d => d.salesman_code))];
  console.log("Salesman codes for Sendi Yusuf in payments:", codes);

  const { data: data2 } = await supabase
    .from('salesman_payments')
    .select('salesman_name, total_amount')
    .eq('period_month', 6)
    .in('salesman_code', codes);

  const names = [...new Set(data2.map(d => d.salesman_name))];
  console.log("All salesman_names for these codes in payments:", names);
  
  let total_3c_all = 0;
  for (const p of data2) {
      // Just approximate to see if it's 139M
      total_3c_all += Number(p.total_amount);
  }
  console.log("Total amount for these codes:", total_3c_all);
}
run();
