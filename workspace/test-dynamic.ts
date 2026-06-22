import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
const supabase_url = process.env.VITE_SUPABASE_URL || '';
const supabase_anon_key = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabase_url, supabase_anon_key);

const run = async () => {
  const { data, error } = await supabase.from('dynamic_apps').select('*');
  console.log("Data:", data, "Error:", error);
}
run();
