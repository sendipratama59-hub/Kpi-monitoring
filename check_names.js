import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  for (const t of ['salesman_kpi', 'salesman_payments', 'piutang_customer', 'program_bulanan', 'program_spu']) {
    const { data } = await supabase.from(t).select('*').limit(1);
    console.log(t, Object.keys(data[0] || {}));
  }
}
run();
