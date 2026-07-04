import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('salesman_payments')
    .select('brand_name, category, total_amount, period_month')
    ;

  if (error) throw error;

  const brands = ['vivan', 'robot', 'acome acc', 'acome iot', 'gamen'];

  const results = {};

  for (const row of data) {
    const brand = (row.brand_name || "").toLowerCase().trim();
    const cat = (row.category || "").toLowerCase().trim();
    const amount = Number(row.total_amount) || 0;
    const m = row.period_month;
    if (!results[m]) {
        results[m] = {
            total_3c_1: 0,
            total_3c_2: 0,
            total_screen_assembly: 0,
            total_vivan_lcd: 0
        };
    }

    if (brands.includes(brand)) {
        let exclude1 = false;
        let exclude2 = false;
        
        if ((brand === 'vivan' || brand === 'xpas') && ['vivan lcd team', 'vivan sparepart', 'xpas sparepart', 'xpas lcd 事业部'].includes(cat)) {
            exclude1 = true;
            exclude2 = true;
            results[m].total_vivan_lcd += amount;
        }
        if ((brand === 'xpas' || brand === 'vivan') && cat === 'screen assembly') {
            exclude2 = true;
            results[m].total_screen_assembly += amount;
        }
        
        if (!exclude1) results[m].total_3c_1 += amount;
        if (!exclude2) results[m].total_3c_2 += amount;
    }
  }

  console.log(results);
}
run();
