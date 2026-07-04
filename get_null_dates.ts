import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(url, key);

async function run() {
  const { data, error } = await supabase
    .from('salesman_payments')
    .select('payment_date')
    .eq('period_month', 6)
    .eq('period_year', 2026);
    
  if (error) {
    console.error(error);
    return;
  }
  
  let nullDates = 0;
  let outOfRangeDates = 0;
  let validDates = 0;
  
  // fetchStartDate for June 2026 is April 2026
  // endDate is July 2026
  const fetchStartDate = new Date('2026-04-01');
  const endDate = new Date('2026-07-01');
  
  data.forEach(p => {
    if (!p.payment_date) {
      nullDates++;
    } else {
      const date = new Date(p.payment_date);
      if (date >= fetchStartDate && date < endDate) {
        validDates++;
      } else {
        outOfRangeDates++;
      }
    }
  });
  
  console.log(`NULL dates: ${nullDates}`);
  console.log(`Out of range dates: ${outOfRangeDates}`);
  console.log(`Valid dates: ${validDates}`);
}

run();
