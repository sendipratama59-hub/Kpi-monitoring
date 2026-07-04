import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('salesman_payments')
    .select('salesman_code, salesman_name, total_amount, brand_name, category')
    .eq('salesman_code', '81457')
    .eq('period_month', 6);

  if (error) {
    console.error(error);
    return;
  }
  
  let sendi_sum = 0;
  let other_sum = 0;
  let sendi_payment_3c = 0;
  let other_payment_3c = 0;
  
  const brandsPayment3C = ['vivan', 'robot', 'acome acc', 'acome iot', 'gamen'];
  const validLcdCats = ['vivan lcd team', 'vivan sparepart', 'xpas sparepart', 'xpas lcd 事业部'];

  for (const d of data) {
      const bName = (d.brand_name || "").toLowerCase().trim();
      const cat = (d.category || "").toLowerCase().trim();
      const isLcdTeamCategory = (bName === 'vivan' || bName === 'xpas') && validLcdCats.includes(cat);
      const is3C = brandsPayment3C.includes(bName) && !isLcdTeamCategory;

      if (d.salesman_name && d.salesman_name.includes('Sendi Yusuf')) {
          sendi_sum += Number(d.total_amount);
          if (is3C) sendi_payment_3c += Number(d.total_amount);
      } else {
          other_sum += Number(d.total_amount);
          if (is3C) other_payment_3c += Number(d.total_amount);
      }
  }
  console.log(`Sendi 3C: ${sendi_payment_3c}, Other 3C: ${other_payment_3c}`);
  console.log(`Sendi Total: ${sendi_sum}, Other Total: ${other_sum}`);
}
run();
