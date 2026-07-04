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

  let differences = [];
  
  const trackedBrands = ["VIVAN", "ROBOT", "ACOME ACC", "ACOME IOT", "GAMEN", "LCD XPAS", "LCD VIVAN"];
  const brandsPayment3C = ['vivan', 'robot', 'acome acc', 'acome iot', 'gamen'];
  const validLcdCats = ['vivan lcd team', 'vivan sparepart', 'xpas sparepart', 'xpas lcd 事业部'];

  let omset_total = 0;
  let kpi_total = 0;

  for (const p of data) {
      if (p.period_month !== 6) continue; // let's assume month 6
      if (p.salesman_name !== 'MUHAMMAD AGUS SUPRIYANTO') continue; // let's guess a salesman or we just sum all? No, let's group by salesman and month

  }
  
  const results = {};
  for (const p of data) {
      const salesman = p.salesman_name || 'unknown';
      const m = p.period_month;
      const key = `${salesman}_${m}`;
      
      if (!results[key]) results[key] = { omset: 0, kpi: 0, diff: 0 };
      
      const bName = (p.brand_name || "").toLowerCase().trim();
      const cat = (p.category || "").toLowerCase().trim();
      const amount = Number(p.total_amount) || 0;
      
      // Omset Logic
      let mappedBrand = bName.toUpperCase();
      if (cat === "vivan lcd team" || cat === "vivan sparepart") mappedBrand = "LCD VIVAN";
      else if (bName === "vivan" && cat === "screen assembly") mappedBrand = "LCD VIVAN";
      else if (bName === "vivan" && cat !== "screen assembly") mappedBrand = "VIVAN";
      else if (bName === "robot") mappedBrand = "ROBOT";
      else if (bName === "acome acc") mappedBrand = "ACOME ACC";
      else if (bName === "acome iot") mappedBrand = "ACOME IOT";
      else if (bName === "gamen") mappedBrand = "GAMEN";
      else if (bName === "xpas") mappedBrand = "LCD XPAS";
      
      let in_omset = false;
      if (["VIVAN", "ROBOT", "ACOME ACC", "ACOME IOT", "GAMEN"].includes(mappedBrand)) {
          in_omset = true;
          results[key].omset += amount;
      }
      
      // KPI Logic
      const isLcdTeamCategory = (bName === 'vivan' || bName === 'xpas') && validLcdCats.includes(cat);
      let in_kpi = brandsPayment3C.includes(bName) && !isLcdTeamCategory;
      if (in_kpi) {
          results[key].kpi += amount;
      }
      
      if (in_omset !== in_kpi) {
         // console.log(`Difference in ${key}: bName=${bName}, cat=${cat}, amount=${amount}, in_omset=${in_omset}, in_kpi=${in_kpi}`);
      }
  }
  
  for (const key in results) {
      if (Math.abs(results[key].kpi - results[key].omset) > 0) {
          console.log(`Salesman/Month: ${key} | Omset: ${results[key].omset} | KPI: ${results[key].kpi} | Diff: ${results[key].kpi - results[key].omset}`);
      }
  }
}
run();
