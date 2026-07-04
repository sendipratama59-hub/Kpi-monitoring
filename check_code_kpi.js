import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('salesman_kpi')
    .select('salesman_code, salesman_name')
    .eq('period_month', 6)
    .ilike('salesman_name', '%Sendi Yusuf%');

  if (error) throw error;
  
  const codes = [...new Set(data.map(d => d.salesman_code))];
  console.log("Salesman codes for Sendi in kpi:", codes);

  // let's check what sum is for EACH of his codes in salesman_payments
  for (const c of codes) {
      const { data: pay, error: payErr } = await supabase
        .from('salesman_payments')
        .select('total_amount, brand_name, category, salesman_name')
        .eq('period_month', 6)
        .eq('salesman_code', c);
      
      let sum_3c = 0;
      for (const p of pay) {
          const bName = (p.brand_name || "").toLowerCase().trim();
          const cat = (p.category || "").toLowerCase().trim();
          const amount = Number(p.total_amount) || 0;
          
          if (['vivan', 'robot', 'acome acc', 'acome iot', 'gamen'].includes(bName)) {
              if (!(bName === 'vivan' && ['vivan lcd team', 'vivan sparepart'].includes(cat))) {
                  sum_3c += amount;
              }
          }
      }
      console.log(`Code ${c} payment 3c sum in SQL logic: ${sum_3c}`);
  }
}
run();
