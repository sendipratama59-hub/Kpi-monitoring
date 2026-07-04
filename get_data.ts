import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(url, key);

async function run() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const startStr = `${year}-${month.toString().padStart(2, '0')}-01`;
  
  let total = 0;
  let hasMore = true;
  let from = 0;
  
  while (hasMore) {
    const { data, error } = await supabase
      .from('salesman_payments')
      .select('total_amount, brand_name, payment_date')
      .gte('payment_date', startStr)
      .range(from, from + 999);
      
    if (error) {
      console.error(error);
      break;
    }
    
    if (data && data.length > 0) {
      data.forEach(p => {
        if (p.brand_name && p.brand_name.toLowerCase().trim() === 'robot') {
          total += Number(p.total_amount) || 0;
        }
      });
      from += 1000;
    } else {
      hasMore = false;
    }
  }
  
  console.log('TOTAL_PAYMENT_ROBOT_THIS_MONTH=' + total);
}

run();
