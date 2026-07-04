import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('salesman_payments')
    .select('brand_name, category, total_amount')
    .eq('period_month', 6) // Let's guess month 6
    ;

  if (error) throw error;

  let total_3c_1 = 0; // Exclude lcd team, sparepart
  let total_3c_2 = 0; // Exclude lcd team, sparepart, AND screen assembly
  let total_screen_assembly = 0;
  
  const brands = ['vivan', 'robot', 'acome acc', 'acome iot', 'gamen'];

  for (const row of data) {
    const brand = (row.brand_name || "").toLowerCase().trim();
    const cat = (row.category || "").toLowerCase().trim();
    const amount = Number(row.total_amount) || 0;

    if (brands.includes(brand)) {
        let exclude1 = false;
        let exclude2 = false;
        
        if ((brand === 'vivan' || brand === 'xpas') && ['vivan lcd team', 'vivan sparepart', 'xpas sparepart', 'xpas lcd 事业部'].includes(cat)) {
            exclude1 = true;
            exclude2 = true;
        }
        if ((brand === 'xpas' || brand === 'vivan') && cat === 'screen assembly') {
            exclude2 = true;
            total_screen_assembly += amount;
        }
        
        if (!exclude1) total_3c_1 += amount;
        if (!exclude2) total_3c_2 += amount;
    }
  }

  console.log("Month 6 - Total 3C (excluding lcd team, sparepart):", total_3c_1);
  console.log("Month 6 - Total 3C (excluding lcd team, sparepart, screen assembly):", total_3c_2);
  console.log("Month 6 - Total Screen Assembly:", total_screen_assembly);
}
run();
