import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(url, key);

async function run() {
  console.time('Sequential');
  const fetchStartDate = '2026-04-01';
  const endDate = '2026-07-01';
  
  let allPayments: any[] = [];
  let hasMorePayments = true;
  let fromPayments = 0;

  while (hasMorePayments) {
    const { data, error } = await supabase
      .from('salesman_payments')
      .select('customer_name, brand_name, category, payment_date, total_amount, salesman_name')
      .gte('payment_date', fetchStartDate)
      .lt('payment_date', endDate)
      .range(fromPayments, fromPayments + 999);
      
    if (error) throw error;
    
    if (data && data.length > 0) {
      allPayments = [...allPayments, ...data];
      fromPayments += 1000;
    } else {
      hasMorePayments = false;
    }
  }
  console.timeEnd('Sequential');
  
  console.time('Parallel');
  const { count, error } = await supabase
    .from('salesman_payments')
    .select('*', { count: 'exact', head: true })
    .gte('payment_date', fetchStartDate)
    .lt('payment_date', endDate);
    
  if (count) {
    const promises = [];
    for (let i = 0; i < count; i += 1000) {
      promises.push(supabase
        .from('salesman_payments')
        .select('customer_name, brand_name, category, payment_date, total_amount, salesman_name')
        .gte('payment_date', fetchStartDate)
        .lt('payment_date', endDate)
        .range(i, i + 999)
      );
    }
    const results = await Promise.all(promises);
    const allP = results.flatMap(r => r.data || []);
  }
  console.timeEnd('Parallel');
}

run();
