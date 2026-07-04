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

  const results = {};

  const brandsPayment3C = ['vivan', 'robot', 'acome acc', 'acome iot', 'gamen'];
  const validLcdCats = ['vivan lcd team', 'vivan sparepart', 'xpas sparepart', 'xpas lcd 事业部'];

  for (const p of data) {
      const salesman = p.salesman_name || 'unknown';
      const m = p.period_month;
      const key = `${salesman}_${m}`;
      
      if (!results[key]) results[key] = { omset: 0, kpi: 0 };
      
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
      
      if (["VIVAN", "ROBOT", "ACOME ACC", "ACOME IOT", "GAMEN"].includes(mappedBrand)) {
          results[key].omset += amount;
      }
      
      // KPI Logic
      const isLcdTeamCategory = (bName === 'vivan' || bName === 'xpas') && validLcdCats.includes(cat);
      if (brandsPayment3C.includes(bName) && !isLcdTeamCategory) {
          results[key].kpi += amount;
      }
  }
  
  for (const key in results) {
      if (results[key].omset >= 130000000 && results[key].omset <= 140000000) {
          console.log(`Salesman/Month: ${key} | Omset: ${results[key].omset} | KPI: ${results[key].kpi}`);
      }
      if (results[key].kpi >= 130000000 && results[key].kpi <= 140000000) {
          if (results[key].omset < 130000000 || results[key].omset > 140000000) {
              console.log(`Salesman/Month: ${key} | Omset: ${results[key].omset} | KPI: ${results[key].kpi}`);
          }
      }
  }
}
run();
