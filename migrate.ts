import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

const queries = [
  // retur_barang
  `ALTER TABLE IF EXISTS retur_barang ADD COLUMN IF NOT EXISTS salesman_code TEXT;`,
  
  // survey_channel
  `ALTER TABLE IF EXISTS survey_channel RENAME COLUMN nama_sales TO salesman_name;`,
  
  // salesman_customer
  `ALTER TABLE IF EXISTS salesman_customer RENAME COLUMN kode_salesman TO salesman_code;`,
  `ALTER TABLE IF EXISTS salesman_customer RENAME COLUMN nama_salesman TO salesman_name;`,
  `ALTER TABLE IF EXISTS salesman_customer RENAME COLUMN kode_customer TO customer_code;`,
  `ALTER TABLE IF EXISTS salesman_customer RENAME COLUMN nama_customer TO customer_name;`,

  // sales_survey_targets
  `ALTER TABLE IF EXISTS sales_survey_targets RENAME COLUMN nama_salesman TO salesman_name;`,

  // salesman_kpi_targets
  `ALTER TABLE IF EXISTS salesman_kpi_targets RENAME COLUMN kode_salesman TO salesman_code;`,
  `ALTER TABLE IF EXISTS salesman_kpi_targets RENAME COLUMN nama_salesman TO salesman_name;`
];

async function run() {
  for (const q of queries) {
     const { error } = await supabase.rpc('exec_sql', { query_text: q });
     if (error) {
       console.log('Error on:', q, error);
     } else {
       console.log('Success on:', q);
     }
  }
}
run();
