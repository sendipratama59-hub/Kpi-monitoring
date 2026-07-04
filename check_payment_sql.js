import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: viewData, error: viewError } = await supabase.from('test_payment_data').select('*').eq('salesman_code', '81457');
  console.log("View Data:", viewData);
  console.log("View Error:", viewError);
}
run();
