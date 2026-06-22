import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);
async function main() {
  const { error } = await supabase.rpc('sync_payment_data', { p_month: 5, p_year: 2026 });
  console.log('Sync Error:', error);
}
main();
