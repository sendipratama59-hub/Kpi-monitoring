const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://fake.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'fake';
console.log("and(period_month.eq.7,period_year.eq.2026),and(period_month.eq.6,period_year.eq.2026)");
