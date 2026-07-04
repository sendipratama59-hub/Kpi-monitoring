import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('salesman_payments')
    .select('*')
    .eq('period_month', 6)
    .ilike('salesman_name', '%Sendi Yusuf%');

  if (error) throw error;
  
  let sum_sql = 0;
  let sum_js = 0;

  for (const p of data) {
      const bName = (p.brand_name || "").toLowerCase().trim();
      const cat = (p.category || "").toLowerCase().trim();
      const amount = Number(p.total_amount) || 0;
      
      let in_sql = false;
      if (['vivan', 'robot', 'acome acc', 'acome iot', 'gamen'].includes(bName)) {
          if (!(bName === 'vivan' && ['vivan lcd team', 'vivan sparepart'].includes(cat))) {
              in_sql = true;
              sum_sql += amount;
          }
      }
      
      let in_js = false;
      const validLcdCats = ['vivan lcd team', 'vivan sparepart', 'xpas sparepart', 'xpas lcd 事业部'];
      if (['vivan', 'robot', 'acome acc', 'acome iot', 'gamen'].includes(bName)) {
          if (!( (bName === 'vivan' || bName === 'xpas') && validLcdCats.includes(cat) )) {
              in_js = true;
              sum_js += amount;
          }
      }
      
      if (in_sql !== in_js) {
          console.log(`Difference row: Brand=${p.brand_name}, Cat=${p.category}, Amount=${amount}`);
      }
  }
  
  console.log(`Sum SQL: ${sum_sql}, Sum JS: ${sum_js}`);
}
run();
