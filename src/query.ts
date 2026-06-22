// query
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data } = await supabase.from('form_configs').select('fields_config').eq('form_id', 'survey_channel').single();
  console.log(data);
}
run();
