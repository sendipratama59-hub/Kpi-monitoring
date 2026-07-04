import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: kpi, error: e1 } = await supabase.from('salesman_kpi').select('salesman_code, salesman_name').eq('period_month', 6);
  const { data: pay, error: e2 } = await supabase.from('salesman_payments').select('salesman_code, salesman_name').eq('period_month', 6);

  const kpiMap = {};
  for (const d of kpi) kpiMap[d.salesman_code] = d.salesman_name;
  
  const payMap = {};
  for (const d of pay) {
      if (!payMap[d.salesman_code]) payMap[d.salesman_code] = new Set();
      payMap[d.salesman_code].add(d.salesman_name);
  }
  
  let typos = 0;
  for (const code in payMap) {
      const kName = kpiMap[code];
      if (!kName) continue;
      
      for (const pName of payMap[code]) {
          if (pName !== kName) {
              console.log(`Code ${code}: KPI Name = "${kName}", Pay Name = "${pName}"`);
              typos++;
          }
      }
  }
  console.log(`Total mismatches: ${typos}`);
}
run();
