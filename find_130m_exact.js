import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('salesman_payments')
    .select('brand_name, category, total_amount, period_month, salesman_name')
    ;

  if (error) throw error;

  let total_omset = 0;
  let total_kpi = 0;

  const brandsPayment3C = ['vivan', 'robot', 'acome acc', 'acome iot', 'gamen'];
  const validLcdCats = ['vivan lcd team', 'vivan sparepart', 'xpas sparepart', 'xpas lcd 事业部'];

  // Let's just group by EVERYTHING
  // Group by salesman, by month, or by total?
  // Let's group by month and just salesman name maybe there is a team filter?
  
  const results = {};
  for (const p of data) {
      const salesman = p.salesman_name || 'unknown';
      const m = p.period_month;
      
      const bName = (p.brand_name || "").toLowerCase().trim();
      const cat = (p.category || "").toLowerCase().trim();
      const amount = Number(p.total_amount) || 0;
      
      if (!results[salesman]) results[salesman] = 0;
      if (!results[m]) results[m] = 0;
      
      const isLcdTeamCategory = (bName === 'vivan' || bName === 'xpas') && validLcdCats.includes(cat);
      if (brandsPayment3C.includes(bName) && !isLcdTeamCategory) {
          results[salesman] += amount;
          results[m] += amount;
      }
  }
  
  console.log("Looking for 130116937 or 139554936...");
  for (const key in results) {
      if (results[key] > 120000000 && results[key] < 150000000) {
          console.log(`Key: ${key} = ${results[key]}`);
      }
  }
}
run();
