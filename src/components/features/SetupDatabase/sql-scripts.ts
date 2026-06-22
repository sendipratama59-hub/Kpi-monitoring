// JALANKAN INI SATU KALI SAJA DI SUPABASE SQL EDITOR
// Fungsi ini mengizinkan eksekusi SQL dari frontend (Hanya untuk Development!)
export const RPC_SCRIPT = `CREATE OR REPLACE FUNCTION exec_sql(query_text text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE query_text;
END;
$$;`;

export const SQL_SCRIPT = `-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Upload Logs
CREATE TABLE IF NOT EXISTS upload_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  upload_date TIMESTAMPTZ DEFAULT NOW(),
  record_count INTEGER NOT NULL,
  status TEXT DEFAULT 'success' CHECK (status IN ('pending', 'success', 'error')),
  error_message TEXT
);

-- 3. Sales Data
CREATE TABLE IF NOT EXISTS sales_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  upload_id UUID REFERENCES upload_logs(id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL,
  region TEXT NOT NULL,
  sales_rep TEXT,
  revenue NUMERIC NOT NULL,
  units_sold INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. KPI Targets
CREATE TABLE IF NOT EXISTS kpi_targets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  region TEXT NOT NULL,
  period TEXT NOT NULL,
  target_revenue NUMERIC NOT NULL,
  target_units INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(region, period)
);

-- 5. Survey Channel
CREATE TABLE IF NOT EXISTS survey_channel (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cabang TEXT,
  kecamatan TEXT,
  nama_toko TEXT,
  salesman_name TEXT,
  alamat_toko TEXT,
  pengambil_keputusan TEXT,
  no_telepon TEXT,
  total_omset_lcd NUMERIC DEFAULT 0,
  data_lcd TEXT,
  order_lcd_dari TEXT,
  total_omset_batrai NUMERIC DEFAULT 0,
  data_batrai TEXT,
  order_batrai_dari TEXT,
  status_regist TEXT,
  butuh_support TEXT,
  ada_stok_lcd_batrai TEXT,
  foto_toko TEXT,
  latitude TEXT,
  longitude TEXT,
  extra_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- MIGRATION: Add new columns if they don't exist yet
ALTER TABLE IF EXISTS survey_channel ADD COLUMN IF NOT EXISTS ada_stok_lcd_batrai TEXT;
ALTER TABLE IF EXISTS survey_channel ADD COLUMN IF NOT EXISTS foto_toko TEXT;
ALTER TABLE IF EXISTS survey_channel ADD COLUMN IF NOT EXISTS latitude TEXT;
ALTER TABLE IF EXISTS survey_channel ADD COLUMN IF NOT EXISTS longitude TEXT;
ALTER TABLE IF EXISTS survey_channel ADD COLUMN IF NOT EXISTS extra_data JSONB DEFAULT '{}'::jsonb;

ALTER TABLE IF EXISTS survey_channel ADD COLUMN IF NOT EXISTS status_validation TEXT DEFAULT 'Valid';

-- 6. Salesman and Customer
CREATE TABLE IF NOT EXISTS salesman_customer (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  salesman_code TEXT,
  salesman_name TEXT,
  customer_code TEXT,
  customer_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Sales Survey Targets
CREATE TABLE IF NOT EXISTS sales_survey_targets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  salesman_name TEXT UNIQUE,
  target_value INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Dynamic Apps (for Dynamic Excel Manager)
CREATE TABLE IF NOT EXISTS dynamic_apps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Dynamic Data (for Dynamic Excel Manager)
CREATE TABLE IF NOT EXISTS dynamic_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  app_id UUID REFERENCES dynamic_apps(id) ON DELETE CASCADE,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- 8. Database Barang
CREATE TABLE IF NOT EXISTS database_barang (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  goods_code TEXT UNIQUE,
  goods_name TEXT,
  warna TEXT,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- MIGRATION: Rename columns in database_barang
DO $$ 
BEGIN 
  -- Rename kode_barang to goods_code
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'database_barang' AND column_name = 'kode_barang') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'database_barang' AND column_name = 'goods_code') THEN
      ALTER TABLE database_barang RENAME COLUMN kode_barang TO goods_code;
    ELSE
      UPDATE database_barang SET goods_code = kode_barang WHERE goods_code IS NULL;
      ALTER TABLE database_barang DROP COLUMN IF EXISTS kode_barang;
    END IF;
  END IF;

  -- Rename nama_barang to goods_name
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'database_barang' AND column_name = 'nama_barang') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'database_barang' AND column_name = 'goods_name') THEN
      ALTER TABLE database_barang RENAME COLUMN nama_barang TO goods_name;
    ELSE
      UPDATE database_barang SET goods_name = nama_barang WHERE goods_name IS NULL;
      ALTER TABLE database_barang DROP COLUMN IF EXISTS nama_barang;
    END IF;
  END IF;

  -- Rename kategori to category in database_barang
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'database_barang' AND column_name = 'kategori') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'database_barang' AND column_name = 'category') THEN
      ALTER TABLE database_barang RENAME COLUMN kategori TO category;
    ELSE
      UPDATE database_barang SET category = kategori WHERE category IS NULL;
      ALTER TABLE database_barang DROP COLUMN IF EXISTS kategori;
    END IF;
  END IF;

  -- Rename kategori to category in retur_barang
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'retur_barang' AND column_name = 'kategori') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'retur_barang' AND column_name = 'category') THEN
      ALTER TABLE retur_barang RENAME COLUMN kategori TO category;
    ELSE
      UPDATE retur_barang SET category = kategori WHERE category IS NULL;
      ALTER TABLE retur_barang DROP COLUMN IF EXISTS kategori;
    END IF;
  END IF;
END $$;

-- 22. Retur Barang
CREATE TABLE IF NOT EXISTS retur_barang (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_code TEXT,
  customer_name TEXT,
  return_date DATE NOT NULL DEFAULT CURRENT_DATE,
  goods_code TEXT,
  goods_name TEXT,
  qty INTEGER DEFAULT 1,
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Partial', 'Completed')),
  description TEXT,
  salesman_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- MIGRATION: Add qty and status to retur_barang if they don't exist
ALTER TABLE IF EXISTS retur_barang ADD COLUMN IF NOT EXISTS qty INTEGER DEFAULT 1;
ALTER TABLE IF EXISTS retur_barang ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Pending';
ALTER TABLE IF EXISTS retur_barang ADD COLUMN IF NOT EXISTS finished_qty INTEGER DEFAULT 0;
ALTER TABLE IF EXISTS retur_barang ADD COLUMN IF NOT EXISTS replacements JSONB DEFAULT '[]'::jsonb;
ALTER TABLE IF EXISTS retur_barang ADD COLUMN IF NOT EXISTS replacement_goods_code TEXT;
ALTER TABLE IF EXISTS retur_barang ADD COLUMN IF NOT EXISTS replacement_goods_name TEXT;
ALTER TABLE IF EXISTS retur_barang ADD COLUMN IF NOT EXISTS replacement_qty INTEGER DEFAULT 0;
ALTER TABLE IF EXISTS retur_barang ADD COLUMN IF NOT EXISTS kategori TEXT;
ALTER TABLE IF EXISTS retur_barang ADD COLUMN IF NOT EXISTS salesman_code TEXT;

DROP POLICY IF EXISTS "Allow all operations for retur_barang" ON retur_barang;
CREATE POLICY "Allow all operations for retur_barang" ON retur_barang FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE retur_barang ENABLE ROW LEVEL SECURITY;

-- 23. LCD Catalog Products
CREATE TABLE IF NOT EXISTS lcd_catalog_products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand TEXT NOT NULL,
  model_hp TEXT NOT NULL,
  type_lcd TEXT NOT NULL,
  price DECIMAL(15,2) NOT NULL,
  price_modal DECIMAL(15,2),
  stock_status TEXT DEFAULT 'Ready',
  warranty_months INTEGER DEFAULT 12,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  goods_code TEXT,
  brand_hp TEXT,
  packing TEXT,
  brand_lcd TEXT DEFAULT 'Vivan'
);

ALTER TABLE IF EXISTS lcd_catalog_products ADD COLUMN IF NOT EXISTS goods_code TEXT;
ALTER TABLE IF EXISTS lcd_catalog_products ADD COLUMN IF NOT EXISTS brand_hp TEXT;
ALTER TABLE IF EXISTS lcd_catalog_products ADD COLUMN IF NOT EXISTS packing TEXT;
ALTER TABLE IF EXISTS lcd_catalog_products ADD COLUMN IF NOT EXISTS brand_lcd TEXT DEFAULT 'Vivan';
ALTER TABLE IF EXISTS lcd_catalog_products ADD COLUMN IF NOT EXISTS custom_discount TEXT;
ALTER TABLE IF EXISTS lcd_catalog_products ADD COLUMN IF NOT EXISTS stock TEXT;
ALTER TABLE IF EXISTS lcd_catalog_products ADD COLUMN IF NOT EXISTS competitors JSONB DEFAULT '[]'::jsonb;

-- 24. LCD Catalog Content
CREATE TABLE IF NOT EXISTS lcd_catalog_content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  section_key TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE lcd_catalog_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE lcd_catalog_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations for lcd_catalog_products" ON lcd_catalog_products;
CREATE POLICY "Allow all operations for lcd_catalog_products" ON lcd_catalog_products FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations for lcd_catalog_content" ON lcd_catalog_content;
CREATE POLICY "Allow all operations for lcd_catalog_content" ON lcd_catalog_content FOR ALL USING (true) WITH CHECK (true);

-- 115. RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE upload_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_channel ENABLE ROW LEVEL SECURITY;
ALTER TABLE salesman_customer ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_survey_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE dynamic_apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE dynamic_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE database_barang ENABLE ROW LEVEL SECURITY;
ALTER TABLE retur_barang ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations for upload_logs" ON upload_logs;
CREATE POLICY "Allow all operations for upload_logs" ON upload_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations for sales_data" ON sales_data;
CREATE POLICY "Allow all operations for sales_data" ON sales_data FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations for kpi_targets" ON kpi_targets;
CREATE POLICY "Allow all operations for kpi_targets" ON kpi_targets FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations for survey_channel" ON survey_channel;
CREATE POLICY "Allow all operations for survey_channel" ON survey_channel FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations for salesman_customer" ON salesman_customer;
CREATE POLICY "Allow all operations for salesman_customer" ON salesman_customer FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations for sales_survey_targets" ON sales_survey_targets;
CREATE POLICY "Allow all operations for sales_survey_targets" ON sales_survey_targets FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations for dynamic_apps" ON dynamic_apps;
CREATE POLICY "Allow all operations for dynamic_apps" ON dynamic_apps FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations for dynamic_data" ON dynamic_data;
CREATE POLICY "Allow all operations for dynamic_data" ON dynamic_data FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations for database_barang" ON database_barang;
CREATE POLICY "Allow all operations for database_barang" ON database_barang FOR ALL USING (true) WITH CHECK (true);

-- 10. Salesman KPI Raw Data
CREATE TABLE IF NOT EXISTS salesman_kpi (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_no TEXT,
  order_date TIMESTAMP,
  order_status TEXT,
  customer_code TEXT,
  city TEXT,
  customer_name TEXT,
  salesman_code TEXT,
  salesman_name TEXT,
  goods_code TEXT,
  goods_name TEXT,
  qty_order INTEGER,
  qty INTEGER,
  harga_modal NUMERIC,
  total_amount NUMERIC,
  brand_name TEXT,
  category TEXT,
  team TEXT,
  delivery_no TEXT,
  hydrogel_pcs NUMERIC,
  tg_pcs NUMERIC,
  omset_lcd NUMERIC,
  omset_redskull NUMERIC,
  omset_pb NUMERIC,
  omset_co NUMERIC,
  omset_home_appliances NUMERIC,
  omset_homeliving NUMERIC,
  omset_dll NUMERIC,
  new_customer NUMERIC,
  idle_customer NUMERIC,
  co_mesin_vqm NUMERIC,
  co_tg NUMERIC,
  omset_5jt NUMERIC,
  upload_batch TEXT,
  period_month INTEGER,
  period_year INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE IF EXISTS salesman_kpi ADD COLUMN IF NOT EXISTS hydrogel_pcs NUMERIC;
ALTER TABLE IF EXISTS salesman_kpi ADD COLUMN IF NOT EXISTS tg_pcs NUMERIC;
ALTER TABLE IF EXISTS salesman_kpi ADD COLUMN IF NOT EXISTS omset_lcd NUMERIC;
ALTER TABLE IF EXISTS salesman_kpi ADD COLUMN IF NOT EXISTS omset_redskull NUMERIC;
ALTER TABLE IF EXISTS salesman_kpi ADD COLUMN IF NOT EXISTS omset_home_appliances NUMERIC;
ALTER TABLE IF EXISTS salesman_kpi ADD COLUMN IF NOT EXISTS omset_homeliving NUMERIC;
ALTER TABLE IF EXISTS salesman_kpi ADD COLUMN IF NOT EXISTS omset_dll NUMERIC;
ALTER TABLE IF EXISTS salesman_kpi ADD COLUMN IF NOT EXISTS new_customer NUMERIC;
ALTER TABLE IF EXISTS salesman_kpi ADD COLUMN IF NOT EXISTS idle_customer NUMERIC;
ALTER TABLE IF EXISTS salesman_kpi ADD COLUMN IF NOT EXISTS co_mesin_vqm NUMERIC;
ALTER TABLE IF EXISTS salesman_kpi ADD COLUMN IF NOT EXISTS co_tg NUMERIC;
ALTER TABLE IF EXISTS salesman_kpi ADD COLUMN IF NOT EXISTS omset_5jt NUMERIC;
ALTER TABLE IF EXISTS salesman_kpi ADD COLUMN IF NOT EXISTS discount NUMERIC;
ALTER TABLE IF EXISTS salesman_kpi ADD COLUMN IF NOT EXISTS lcd_pcs NUMERIC;
ALTER TABLE IF EXISTS salesman_kpi ADD COLUMN IF NOT EXISTS period_month INTEGER;
ALTER TABLE IF EXISTS salesman_kpi ADD COLUMN IF NOT EXISTS period_year INTEGER;

UPDATE salesman_kpi SET period_month = 5, period_year = 2026 WHERE period_month IS NULL;

ALTER TABLE IF EXISTS salesman_kpi ADD COLUMN IF NOT EXISTS payment_amount NUMERIC DEFAULT 0;
ALTER TABLE IF EXISTS salesman_kpi ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT FALSE;
ALTER TABLE IF EXISTS salesman_kpi ADD COLUMN IF NOT EXISTS payment_date DATE;

DROP POLICY IF EXISTS "Allow all operations for salesman_kpi" ON salesman_kpi;
CREATE POLICY "Allow all operations for salesman_kpi" ON salesman_kpi FOR ALL USING (true) WITH CHECK (true);

-- 12. Salesman KPI Targets
CREATE TABLE IF NOT EXISTS salesman_kpi_targets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  salesman_code TEXT UNIQUE,
  salesman_name TEXT,
  target_omset_all_brand NUMERIC DEFAULT 0,
  target_omset_lcd NUMERIC DEFAULT 0,
  target_omset_redskull NUMERIC DEFAULT 0,
  target_co_3c NUMERIC DEFAULT 0,
  target_hydrogel_pcs NUMERIC DEFAULT 0,
  target_tg_pcs NUMERIC DEFAULT 0,
  target_new_customer NUMERIC DEFAULT 0,
  target_idle_customer NUMERIC DEFAULT 0,
  target_co_mesin_vqm NUMERIC DEFAULT 0,
  target_co_tg NUMERIC DEFAULT 0,
  target_omset_5jt NUMERIC DEFAULT 0,
  target_payment_3c NUMERIC DEFAULT 0,
  target_program_bulanan NUMERIC DEFAULT 0,
  target_payment_3c_lcd NUMERIC DEFAULT 0,
  target_payment_all_brand NUMERIC DEFAULT 0,
  target_spu NUMERIC DEFAULT 0,
  target_perbaikan_display NUMERIC DEFAULT 0,
  target_pemasangan_spanduk NUMERIC DEFAULT 0,
  target_visit_customer NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- MIGRATION: Ensure id has default and salesman_code is unique
ALTER TABLE IF EXISTS salesman_kpi_targets ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE IF EXISTS salesman_kpi_targets ALTER COLUMN id SET NOT NULL;
ALTER TABLE IF EXISTS salesman_kpi_targets ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE IF EXISTS salesman_kpi_targets ALTER COLUMN updated_at SET DEFAULT NOW();

-- Fix existing NULL values
UPDATE salesman_kpi_targets SET created_at = NOW() WHERE created_at IS NULL;
UPDATE salesman_kpi_targets SET updated_at = NOW() WHERE updated_at IS NULL;

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_salesman_kpi_targets ON salesman_kpi_targets;
CREATE TRIGGER set_updated_at_salesman_kpi_targets
BEFORE UPDATE ON salesman_kpi_targets
FOR EACH ROW
EXECUTE FUNCTION handle_updated_at();

ALTER TABLE IF EXISTS salesman_kpi_targets ADD COLUMN IF NOT EXISTS salesman_code TEXT;
ALTER TABLE IF EXISTS salesman_kpi_targets DROP CONSTRAINT IF EXISTS salesman_kpi_targets_salesman_name_key;
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'salesman_kpi_targets_salesman_code_key') THEN
    ALTER TABLE salesman_kpi_targets ADD CONSTRAINT salesman_kpi_targets_salesman_code_key UNIQUE (salesman_code);
  END IF;
END $$;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'salesman_kpi_targets' AND column_name = 'target_payment') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'salesman_kpi_targets' AND column_name = 'target_payment_3c') THEN
      ALTER TABLE salesman_kpi_targets RENAME COLUMN target_payment TO target_payment_3c;
    ELSE
      ALTER TABLE salesman_kpi_targets DROP COLUMN IF EXISTS target_payment;
    END IF;
  END IF;
END $$;

ALTER TABLE IF EXISTS salesman_kpi_targets ADD COLUMN IF NOT EXISTS target_payment_3c NUMERIC DEFAULT 0;
ALTER TABLE IF EXISTS salesman_kpi_targets ADD COLUMN IF NOT EXISTS target_program_bulanan NUMERIC DEFAULT 0;
ALTER TABLE IF EXISTS salesman_kpi_targets ADD COLUMN IF NOT EXISTS target_payment_3c_lcd NUMERIC DEFAULT 0;
ALTER TABLE IF EXISTS salesman_kpi_targets ADD COLUMN IF NOT EXISTS target_payment_all_brand NUMERIC DEFAULT 0;
ALTER TABLE IF EXISTS salesman_kpi_targets ADD COLUMN IF NOT EXISTS target_spu NUMERIC DEFAULT 0;
ALTER TABLE IF EXISTS salesman_kpi_targets ADD COLUMN IF NOT EXISTS target_perbaikan_display NUMERIC DEFAULT 0;
ALTER TABLE IF EXISTS salesman_kpi_targets ADD COLUMN IF NOT EXISTS target_pemasangan_spanduk NUMERIC DEFAULT 0;
ALTER TABLE IF EXISTS salesman_kpi_targets ADD COLUMN IF NOT EXISTS target_visit_customer NUMERIC DEFAULT 0;


DROP POLICY IF EXISTS "Allow all operations for salesman_kpi_targets" ON salesman_kpi_targets;
CREATE POLICY "Allow all operations for salesman_kpi_targets" ON salesman_kpi_targets FOR ALL USING (true) WITH CHECK (true);

-- 12.1. Salesman Payments Data
CREATE TABLE IF NOT EXISTS salesman_payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  upload_batch TEXT,
  period_month INTEGER,
  period_year INTEGER,
  delivery_no TEXT,
  salesman_code TEXT,
  salesman_name TEXT,
  customer_code TEXT,
  customer_name TEXT,
  brand_name TEXT,
  category TEXT,
  total_amount NUMERIC DEFAULT 0,
  due_date INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- MIGRATION: Add/Fix due_date to salesman_payments
ALTER TABLE IF EXISTS salesman_payments DROP COLUMN IF EXISTS due_date;
ALTER TABLE IF EXISTS salesman_payments ADD COLUMN IF NOT EXISTS due_date INTEGER;
ALTER TABLE IF EXISTS salesman_payments ADD COLUMN IF NOT EXISTS payment_date DATE;

DROP POLICY IF EXISTS "Allow all operations for salesman_payments" ON salesman_payments;
CREATE POLICY "Allow all operations for salesman_payments" ON salesman_payments FOR ALL USING (true) WITH CHECK (true);

-- 12.2 Sync Payment Data
CREATE OR REPLACE FUNCTION sync_payment_data(p_month INTEGER, p_year INTEGER)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE salesman_kpi k
    SET is_paid = true,
        payment_amount = k.total_amount,
        payment_date = p.payment_date
    FROM salesman_payments p
    WHERE k.delivery_no = p.delivery_no
      AND k.period_month = p_month
      AND k.period_year = p_year
      AND p.period_month = p_month
      AND p.period_year = p_year;
END;
$$;

-- 13. Get DB Stats (Memory/Storage Usage)
CREATE OR REPLACE FUNCTION get_db_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'database_size_bytes', pg_database_size(current_database()),
    'database_size_pretty', pg_size_pretty(pg_database_size(current_database())),
    'table_stats', (
      SELECT json_agg(
        json_build_object(
          'table_name', relname,
          'schema_name', schemaname,
          'total_bytes', pg_total_relation_size(relid),
          'total_size_pretty', pg_size_pretty(pg_total_relation_size(relid))
        )
      )
      FROM pg_stat_user_tables
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- 14. Dashboard Summary RPC
CREATE OR REPLACE FUNCTION get_dashboard_summary(p_month INTEGER, p_year INTEGER)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
    result json;
BEGIN
    WITH raw_data AS (
        SELECT 
            customer_code,
            customer_name,
            total_amount,
            omset_lcd,
            omset_redskull,
            omset_home_appliances,
            omset_homeliving,
            omset_dll,
            hydrogel_pcs,
            tg_pcs,
            new_customer,
            idle_customer,
            co_mesin_vqm,
            co_tg,
            omset_5jt,
            LOWER(brand_name) as brand,
            LOWER(category) as category
        FROM salesman_kpi
        WHERE period_month = p_month AND period_year = p_year
    ),
    payment_raw AS (
        SELECT 
           COALESCE(SUM(total_amount), 0) as payment_total,
           COALESCE(SUM(CASE WHEN LOWER(brand_name) IN ('vivan', 'robot', 'acome acc', 'acome iot', 'gamen') AND NOT (LOWER(brand_name) = 'vivan' AND LOWER(category) IN ('vivan lcd team', 'vivan sparepart')) AND NOT (LOWER(brand_name) = 'xpas' AND LOWER(category) IN ('xpas sparepart', 'xpas lcd 事业部')) THEN total_amount ELSE 0 END), 0) as payment_3c,
           COALESCE(SUM(CASE WHEN LOWER(brand_name) = 'redskull' THEN total_amount ELSE 0 END), 0) as payment_redskull
        FROM salesman_payments
        WHERE period_month = p_month AND period_year = p_year
    ),
    piutang_raw AS (
        SELECT 
           COALESCE(SUM(CASE WHEN LOWER(brand_name) IN ('vivan', 'robot', 'acome acc', 'acome iot', 'gamen') AND NOT (LOWER(brand_name) = 'vivan' AND LOWER(category) IN ('vivan lcd team', 'vivan sparepart')) AND NOT (LOWER(brand_name) = 'xpas' AND LOWER(category) IN ('xpas sparepart', 'xpas lcd 事业部')) THEN total_amount ELSE 0 END), 0) as piutang_3c
        FROM piutang_customer
        WHERE period_month = p_month AND period_year = p_year
    ),
    target_raw AS (
        SELECT
            COALESCE(SUM(target_omset_all_brand), 0) as target_omset_total,
            COALESCE(SUM(target_payment_all_brand), 0) as target_payment_total,
            COALESCE(SUM(target_omset_redskull), 0) as target_omset_redskull,
            COALESCE(SUM(target_payment_3c), 0) as target_payment_3c,
            COALESCE(SUM(target_omset_lcd), 0) as target_omset_lcd,
            COALESCE(SUM(target_co_3c), 0) as target_co_3c,
            COALESCE(SUM(target_omset_5jt), 0) as target_omset_5jt,
            COALESCE(SUM(target_hydrogel_pcs), 0) as target_hydrogel_pcs,
            COALESCE(SUM(target_tg_pcs), 0) as target_tg_pcs,
            COALESCE(SUM(target_new_customer), 0) as target_new_customer,
            COALESCE(SUM(target_idle_customer), 0) as target_idle_customer,
            COALESCE(SUM(target_co_mesin_vqm), 0) as target_co_mesin_vqm,
            COALESCE(SUM(target_co_tg), 0) as target_co_tg,
            COALESCE(SUM(target_payment_3c_lcd), 0) as target_payment_3c_lcd
        FROM salesman_kpi_targets
    )
    SELECT json_build_object(
        'omsetTotal', COALESCE(SUM(total_amount), 0),
        'paymentTotal', (SELECT payment_total FROM payment_raw),
        'payment3C', (SELECT payment_3c FROM payment_raw),
        'sisaPiutang3C', (SELECT piutang_3c FROM piutang_raw),
        'paymentRedskull', (SELECT payment_redskull FROM payment_raw),
        'omsetLcd', COALESCE(SUM(CASE WHEN brand IN ('xpas', 'vivan') AND category = 'screen assembly' THEN total_amount ELSE 0 END), 0),
        'omsetRedskull', COALESCE(SUM(omset_redskull), 0),
        'omsetHomeAppliances', COALESCE(SUM(omset_home_appliances), 0),
        'omsetHomeLiving', COALESCE(SUM(omset_homeliving), 0),
        'omsetDll', COALESCE(SUM(omset_dll), 0),
        'omset3C', COALESCE(SUM(CASE WHEN brand IN ('vivan', 'robot', 'acome acc', 'acome iot', 'gamen', 'aula', 'dp', 'philips') THEN total_amount ELSE 0 END), 0),
        'co3C', (SELECT COUNT(DISTINCT COALESCE(customer_code, customer_name, 'unknown')) FROM raw_data WHERE brand IN ('vivan', 'robot', 'acome acc', 'acome iot', 'gamen', 'aula', 'dp', 'philips') AND total_amount > 0),
        'coAllBrand', (SELECT COUNT(DISTINCT COALESCE(customer_code, customer_name, 'unknown')) FROM raw_data WHERE total_amount > 0),
        'coHomeLiving', (SELECT COUNT(DISTINCT COALESCE(customer_code, customer_name, 'unknown')) FROM raw_data WHERE omset_homeliving > 0),
        'coHomeAppliances', (SELECT COUNT(DISTINCT COALESCE(customer_code, customer_name, 'unknown')) FROM raw_data WHERE omset_home_appliances > 0),
        'coDll', (SELECT COUNT(DISTINCT COALESCE(customer_code, customer_name, 'unknown')) FROM raw_data WHERE omset_dll > 0),
        'co5Jt', (
             SELECT COUNT(*) FROM (
                SELECT COALESCE(customer_code, customer_name, 'unknown') as c, SUM(total_amount) as t 
                FROM raw_data 
                WHERE brand IN ('vivan', 'robot', 'acome acc', 'acome iot', 'gamen', 'aula', 'dp', 'philips') 
                GROUP BY 1 HAVING SUM(total_amount) >= 5000000
             ) sub
        ),
        'hydrogelPcs', COALESCE(SUM(hydrogel_pcs), 0),
        'tgPcs', COALESCE(SUM(tg_pcs), 0),
        'newCustomers', (SELECT COUNT(DISTINCT COALESCE(customer_code, customer_name, 'unknown')) FROM raw_data WHERE new_customer > 0),
        'idleCustomers', (SELECT COUNT(DISTINCT COALESCE(customer_code, customer_name, 'unknown')) FROM raw_data WHERE idle_customer > 0),
        'coMesinVqm', (SELECT COUNT(DISTINCT COALESCE(customer_code, customer_name, 'unknown')) FROM raw_data WHERE co_mesin_vqm > 0),
        'coTg', (SELECT COUNT(DISTINCT COALESCE(customer_code, customer_name, 'unknown')) FROM raw_data WHERE co_tg > 0),
        'targets', (SELECT row_to_json(t) FROM target_raw t)
    ) INTO result FROM raw_data;

    RETURN result;
END;
$$;

-- 15. Salesman KPI Summary RPC
DROP FUNCTION IF EXISTS get_salesman_kpi_summary(INTEGER, INTEGER);
CREATE OR REPLACE FUNCTION get_salesman_kpi_summary(p_month INTEGER, p_year INTEGER)
RETURNS TABLE (
    salesman_code TEXT,
    salesman_name TEXT,
    total_revenue NUMERIC,
    omset_lcd NUMERIC,
    omset_redskull NUMERIC,
    omset_3c NUMERIC,
    hydrogel_pcs NUMERIC,
    tg_pcs NUMERIC,
    new_customers BIGINT,
    idle_customers BIGINT,
    co_mesin_vqm BIGINT,
    co_tg BIGINT,
    co_3c BIGINT,
    omset_5jt BIGINT,
    payment_3c NUMERIC,
    payment_all_brand NUMERIC,
    total_customers BIGINT,
    program_bulanan_achieved BIGINT,
    program_spu_achieved BIGINT,
    sisa_piutang_3c NUMERIC,
    perbaikan_display BIGINT,
    pemasangan_spanduk BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH payment_data AS (
        SELECT 
            sp.salesman_code,
            SUM(CASE WHEN LOWER(sp.brand_name) IN ('vivan', 'robot', 'acome acc', 'acome iot', 'gamen') AND NOT (LOWER(sp.brand_name) = 'vivan' AND LOWER(sp.category) IN ('vivan lcd team', 'vivan sparepart')) AND NOT (LOWER(sp.brand_name) = 'xpas' AND LOWER(sp.category) IN ('xpas sparepart', 'xpas lcd 事业部')) THEN sp.total_amount ELSE 0 END) as total_payment_3c,
            SUM(sp.total_amount) as total_payment_all
        FROM salesman_payments sp
        WHERE sp.period_month = p_month 
          AND sp.period_year = p_year
        GROUP BY sp.salesman_code
    ),
    program_data AS (
        SELECT
            pb.salesman_code,
            COUNT(DISTINCT COALESCE(pb.customer_code, pb.customer_name)) as total_achieved
        FROM program_bulanan pb
        WHERE pb.period_month = p_month
          AND pb.period_year = p_year
          AND pb.customer_achieve >= pb.customer_targets
          AND pb.customer_targets > 0
        GROUP BY pb.salesman_code
    ),
    spu_data AS (
        SELECT
            ps.salesman_code,
            COUNT(DISTINCT COALESCE(ps.customer_code, ps.customer_name)) as total_achieved
        FROM program_spu ps
        WHERE ps.period_month = p_month
          AND ps.period_year = p_year
          AND ps.customer_achieve >= ps.customer_targets
          AND ps.customer_targets > 0
        GROUP BY ps.salesman_code
    ),
    manual_data AS (
        SELECT
            sma.salesman_code,
            COUNT(DISTINCT CASE WHEN sma.activity_type = 'perbaikan_display' THEN sma.customer_code END) as total_perbaikan,
            COUNT(DISTINCT CASE WHEN sma.activity_type = 'pemasangan_spanduk_stiker' THEN sma.customer_code END) as total_pemasangan
        FROM salesman_manual_activities sma
        WHERE sma.period_month = p_month
          AND sma.period_year = p_year
        GROUP BY sma.salesman_code
    ),
    piutang_data AS (
        SELECT 
            pc.salesman_code,
            SUM(CASE WHEN LOWER(pc.brand_name) IN ('vivan', 'robot', 'acome acc', 'acome iot', 'gamen') AND NOT (LOWER(pc.brand_name) = 'vivan' AND LOWER(pc.category) IN ('vivan lcd team', 'vivan sparepart')) AND NOT (LOWER(pc.brand_name) = 'xpas' AND LOWER(pc.category) IN ('xpas sparepart', 'xpas lcd 事业部')) THEN pc.total_amount ELSE 0 END) as sisa_piutang_3c
        FROM piutang_customer pc
        WHERE pc.period_month = p_month AND pc.period_year = p_year
        GROUP BY pc.salesman_code
    ),
    base_data AS (
        SELECT 
            s.salesman_code,
            s.salesman_name,
            s.customer_code,
            s.customer_name,
            s.total_amount,
            s.omset_lcd,
            s.omset_redskull,
            s.hydrogel_pcs,
            s.tg_pcs,
            s.new_customer,
            s.idle_customer,
            s.co_mesin_vqm,
            s.co_tg,
            s.omset_5jt,
            s.is_paid,
            s.payment_amount,
            LOWER(s.brand_name) as brand,
            LOWER(s.category) as category,
            COALESCE(s.customer_code, s.customer_name, 'unknown') as store_id
        FROM salesman_kpi s
        WHERE s.period_month = p_month AND s.period_year = p_year AND s.salesman_code IS NOT NULL
    )
    SELECT
        b.salesman_code,
        b.salesman_name,
        SUM(b.total_amount) as total_revenue,
        SUM(CASE WHEN b.brand IN ('xpas', 'vivan') AND b.category = 'screen assembly' THEN b.total_amount ELSE 0 END) as omset_lcd,
        SUM(b.omset_redskull) as omset_redskull,
        SUM(CASE WHEN b.brand IN ('vivan', 'robot', 'acome acc', 'acome iot', 'aula', 'philips', 'dp', 'gamen') THEN b.total_amount ELSE 0 END) as omset_3c,
        SUM(b.hydrogel_pcs) as hydrogel_pcs,
        SUM(b.tg_pcs) as tg_pcs,
        COUNT(DISTINCT CASE WHEN b.new_customer > 0 THEN b.store_id END) as new_customers,
        COUNT(DISTINCT CASE WHEN b.idle_customer > 0 THEN b.store_id END) as idle_customers,
        COUNT(DISTINCT CASE WHEN b.co_mesin_vqm > 0 THEN b.store_id END) as co_mesin_vqm,
        COUNT(DISTINCT CASE WHEN b.co_tg > 0 THEN b.store_id END) as co_tg,
        COUNT(DISTINCT CASE WHEN b.brand IN ('vivan', 'robot', 'acome acc', 'acome iot', 'aula', 'philips', 'dp', 'gamen') AND b.total_amount > 0 THEN b.store_id END) as co_3c,
        (
            SELECT COUNT(*)
            FROM (
                SELECT inner_b.store_id
                FROM base_data inner_b
                WHERE inner_b.salesman_code = b.salesman_code
                  AND inner_b.brand IN ('vivan', 'robot', 'acome acc', 'acome iot', 'gamen', 'aula', 'dp', 'philips')
                GROUP BY inner_b.store_id
                HAVING SUM(inner_b.total_amount) >= 5000000
            ) as t
        ) as omset_5jt,
        COALESCE(MAX(pd.total_payment_3c), 0) as payment_3c,
        COALESCE(MAX(pd.total_payment_all), 0) as payment_all_brand,
        COUNT(DISTINCT b.store_id) as total_customers,
        COALESCE(MAX(prg.total_achieved), 0) as program_bulanan_achieved,
        COALESCE(MAX(spu.total_achieved), 0) as program_spu_achieved,
        COALESCE(MAX(piutang.sisa_piutang_3c), 0) as sisa_piutang_3c,
        COALESCE(MAX(md.total_perbaikan), 0) as perbaikan_display,
        COALESCE(MAX(md.total_pemasangan), 0) as pemasangan_spanduk
    FROM base_data b
    LEFT JOIN payment_data pd ON b.salesman_code = pd.salesman_code
    LEFT JOIN program_data prg ON b.salesman_code = prg.salesman_code
    LEFT JOIN spu_data spu ON b.salesman_code = spu.salesman_code
    LEFT JOIN piutang_data piutang ON b.salesman_code = piutang.salesman_code
    LEFT JOIN manual_data md ON b.salesman_code = md.salesman_code
    GROUP BY b.salesman_code, b.salesman_name;
END;
$$;

-- 16. Report LCD
CREATE TABLE IF NOT EXISTS report_lcd (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  cabang TEXT,
  visit_new_customer TEXT,
  visit_total_new_customer TEXT,
  order_total_new_customer TEXT,
  visit_customer_lama TEXT,
  visit_total_customer_lama TEXT,
  order_total_customer_lama TEXT,
  omset_new_customer TEXT,
  omset_customer_lama TEXT,
  omset_total TEXT,
  keterangan_hasil TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP POLICY IF EXISTS "Allow all operations for report_lcd" ON report_lcd;
CREATE POLICY "Allow all operations for report_lcd" ON report_lcd FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE report_lcd ENABLE ROW LEVEL SECURITY;

-- 17. Program Bulanan
CREATE TABLE IF NOT EXISTS program_bulanan (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  upload_batch TEXT,
  period_month INTEGER,
  period_year INTEGER,
  salesman_code TEXT,
  salesman_name TEXT,
  customer_code TEXT,
  customer_name TEXT,
  customer_targets NUMERIC DEFAULT 0,
  customer_achieve NUMERIC DEFAULT 0,
  customer_join TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP POLICY IF EXISTS "Allow all operations for program_bulanan" ON program_bulanan;
CREATE POLICY "Allow all operations for program_bulanan" ON program_bulanan FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE program_bulanan ENABLE ROW LEVEL SECURITY;

-- 18. Program SPU
CREATE TABLE IF NOT EXISTS program_spu (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  upload_batch TEXT,
  period_month INTEGER,
  period_year INTEGER,
  salesman_code TEXT,
  salesman_name TEXT,
  customer_code TEXT,
  customer_name TEXT,
  customer_targets NUMERIC DEFAULT 0,
  customer_achieve NUMERIC DEFAULT 0,
  customer_join TEXT,
  customer_reward TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE IF EXISTS program_spu ADD COLUMN IF NOT EXISTS customer_reward TEXT;

DROP POLICY IF EXISTS "Allow all operations for program_spu" ON program_spu;
CREATE POLICY "Allow all operations for program_spu" ON program_spu FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE program_spu ENABLE ROW LEVEL SECURITY;

-- 19. App Guides (Notes for every menu)
CREATE TABLE IF NOT EXISTS app_guides (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_id TEXT UNIQUE NOT NULL,
  guide_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP POLICY IF EXISTS "Allow all operations for app_guides" ON app_guides;
CREATE POLICY "Allow all operations for app_guides" ON app_guides FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE app_guides ENABLE ROW LEVEL SECURITY;

-- 20. Form Placeholders
CREATE TABLE IF NOT EXISTS form_placeholders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id TEXT NOT NULL,
  field_name TEXT NOT NULL,
  placeholder_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(form_id, field_name)
);

DROP POLICY IF EXISTS "Allow all operations for form_placeholders" ON form_placeholders;
CREATE POLICY "Allow all operations for form_placeholders" ON form_placeholders FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE form_placeholders ENABLE ROW LEVEL SECURITY;

-- 20b. Form Configs
CREATE TABLE IF NOT EXISTS form_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id TEXT UNIQUE NOT NULL,
  fields_config JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP POLICY IF EXISTS "Allow all operations for form_configs" ON form_configs;
CREATE POLICY "Allow all operations for form_configs" ON form_configs FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE form_configs ENABLE ROW LEVEL SECURITY;

-- 21. Customer KPI Targets (Persistence for manual input)
CREATE TABLE IF NOT EXISTS customer_kpi_targets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_code TEXT NOT NULL,
  title TEXT NOT NULL,
  target_value NUMERIC DEFAULT 0,
  actual_value NUMERIC DEFAULT 0,
  reward_projection NUMERIC DEFAULT 0,
  color_theme TEXT DEFAULT 'indigo',
  period TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP POLICY IF EXISTS "Allow all operations for customer_kpi_targets" ON customer_kpi_targets;
CREATE POLICY "Allow all operations for customer_kpi_targets" ON customer_kpi_targets FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE customer_kpi_targets ENABLE ROW LEVEL SECURITY;

-- 23. Piutang Customer
CREATE TABLE IF NOT EXISTS piutang_customer (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  upload_batch TEXT,
  delivery_no TEXT,
  customer_code TEXT,
  customer_name TEXT,
  salesman_code TEXT,
  salesman_name TEXT,
  brand_name TEXT,
  category TEXT,
  total_amount NUMERIC DEFAULT 0,
  due_date INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- MIGRATION: Add/Fix due_date to piutang_customer
ALTER TABLE IF EXISTS piutang_customer DROP COLUMN IF EXISTS due_date;
ALTER TABLE IF EXISTS piutang_customer ADD COLUMN IF NOT EXISTS due_date INTEGER;

DROP POLICY IF EXISTS "Allow all operations for piutang_customer" ON piutang_customer;
CREATE POLICY "Allow all operations for piutang_customer" ON piutang_customer FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE piutang_customer ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS piutang_customer ADD COLUMN IF NOT EXISTS period_month INTEGER;
ALTER TABLE IF EXISTS piutang_customer ADD COLUMN IF NOT EXISTS period_year INTEGER;

-- 24. Visit Customer
CREATE TABLE IF NOT EXISTS visit_customer (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  upload_batch TEXT,
  salesman_code TEXT,
  salesman_name TEXT,
  total_customer NUMERIC DEFAULT 0,
  total_visit NUMERIC DEFAULT 0,
  percentage NUMERIC DEFAULT 0,
  reward_punishment NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  period_month INTEGER,
  period_year INTEGER
);

ALTER TABLE IF EXISTS visit_customer ADD COLUMN IF NOT EXISTS period_month INTEGER;
ALTER TABLE IF EXISTS visit_customer ADD COLUMN IF NOT EXISTS period_year INTEGER;

DROP POLICY IF EXISTS "Allow all operations for visit_customer" ON visit_customer;
CREATE POLICY "Allow all operations for visit_customer" ON visit_customer FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE visit_customer ENABLE ROW LEVEL SECURITY;

-- 25. Salesman Manual Activities
CREATE TABLE IF NOT EXISTS salesman_manual_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  salesman_code TEXT,
  customer_code TEXT,
  customer_name TEXT,
  activity_type TEXT NOT NULL, -- 'perbaikan_display' or 'pemasangan_spanduk_stiker'
  sub_activity_type TEXT, -- 'Pasang Spanduk' or 'Pasang Stiker'
  period_month INTEGER,
  period_year INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP POLICY IF EXISTS "Allow all operations for salesman_manual_activities" ON salesman_manual_activities;
CREATE POLICY "Allow all operations for salesman_manual_activities" ON salesman_manual_activities FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE salesman_manual_activities ENABLE ROW LEVEL SECURITY;

-- 26. KPI Teams
CREATE TABLE IF NOT EXISTS kpi_teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  leader_code TEXT NOT NULL,
  team_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP POLICY IF EXISTS "Allow all operations for kpi_teams" ON kpi_teams;
CREATE POLICY "Allow all operations for kpi_teams" ON kpi_teams FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE kpi_teams ENABLE ROW LEVEL SECURITY;

-- 27. KPI Team Members
CREATE TABLE IF NOT EXISTS kpi_team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES kpi_teams(id) ON DELETE CASCADE,
  salesman_code TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

DROP POLICY IF EXISTS "Allow all operations for kpi_team_members" ON kpi_team_members;
CREATE POLICY "Allow all operations for kpi_team_members" ON kpi_team_members FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE kpi_team_members ENABLE ROW LEVEL SECURITY;

-- 28. KPI Salesman Configs
CREATE TABLE IF NOT EXISTS kpi_salesman_configs (
  salesman_code TEXT PRIMARY KEY,
  is_eligible BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP POLICY IF EXISTS "Allow all operations for kpi_salesman_configs" ON kpi_salesman_configs;
CREATE POLICY "Allow all operations for kpi_salesman_configs" ON kpi_salesman_configs FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE kpi_salesman_configs ENABLE ROW LEVEL SECURITY;

-- 29. Deletion Logs (History)
CREATE TABLE IF NOT EXISTS deletion_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id TEXT,
  deleted_data JSONB,
  deleted_by TEXT,
  deleted_at TIMESTAMPTZ DEFAULT NOW()
);

DROP POLICY IF EXISTS "Allow all operations for deletion_logs" ON deletion_logs;
CREATE POLICY "Allow all operations for deletion_logs" ON deletion_logs FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE deletion_logs ENABLE ROW LEVEL SECURITY;

-- 30. LCD Catalog Visitors
CREATE TABLE IF NOT EXISTS lcd_catalog_visitors (
  visitor_id TEXT PRIMARY KEY,
  first_visit TIMESTAMPTZ DEFAULT NOW(),
  last_active TIMESTAMPTZ DEFAULT NOW(),
  visit_count INTEGER DEFAULT 1,
  device_info TEXT,
  last_path TEXT
);

DROP POLICY IF EXISTS "Allow all operations for lcd_catalog_visitors" ON lcd_catalog_visitors;
CREATE POLICY "Allow all operations for lcd_catalog_visitors" ON lcd_catalog_visitors FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE lcd_catalog_visitors ENABLE ROW LEVEL SECURITY;

-- 31. Survey LCD
CREATE TABLE IF NOT EXISTS survey_lcd (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  salesman_code TEXT,
  nama_salesman TEXT,
  nama_toko TEXT,
  no_telp TEXT,
  brand_lcd TEXT,
  qty_lcd TEXT,
  omset_lcd TEXT,
  order_lcd_dari TEXT,
  brand_baterai TEXT,
  qty_baterai TEXT,
  omset_baterai TEXT,
  order_baterai_dari TEXT,
  latitude TEXT,
  longitude TEXT,
  alamat_asli TEXT,
  foto_toko TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE IF EXISTS survey_lcd ADD COLUMN IF NOT EXISTS salesman_code TEXT;
ALTER TABLE IF EXISTS survey_lcd ADD COLUMN IF NOT EXISTS nama_salesman TEXT;

DROP POLICY IF EXISTS "Allow all operations for survey_lcd" ON survey_lcd;
CREATE POLICY "Allow all operations for survey_lcd" ON survey_lcd FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE survey_lcd ENABLE ROW LEVEL SECURITY;

-- 32. Form COD Tempo
CREATE TABLE IF NOT EXISTS form_cod_tempo (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  salesman_name TEXT,
  pengajuan_sistem TEXT,
  limit_juta NUMERIC,
  periode_tempo INTEGER,
  jumlah_toko INTEGER,
  luas_area TEXT,
  customer_type TEXT,
  status_kepemilikan TEXT,
  produk_utama TEXT,
  brand_produk TEXT,
  omset_rata_rata NUMERIC,
  lain_lain TEXT,
  history_pesanan JSONB,
  alasan_pengajuan TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

DROP POLICY IF EXISTS "Allow all operations for form_cod_tempo" ON form_cod_tempo;
CREATE POLICY "Allow all operations for form_cod_tempo" ON form_cod_tempo FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE form_cod_tempo ENABLE ROW LEVEL SECURITY;

-- 33. Maps Analyzer
CREATE TABLE IF NOT EXISTS maps_analyzer (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nama_customer TEXT,
  kecamatan_kota TEXT,
  alamat_lengkap TEXT,
  lat FLOAT,
  lng FLOAT,
  final_url TEXT,
  rating FLOAT,
  user_rating_count INT,
  place_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE IF EXISTS maps_analyzer ADD COLUMN IF NOT EXISTS rating FLOAT;
ALTER TABLE IF EXISTS maps_analyzer ADD COLUMN IF NOT EXISTS user_rating_count INT;
ALTER TABLE IF EXISTS maps_analyzer ADD COLUMN IF NOT EXISTS place_type TEXT;

DROP POLICY IF EXISTS "Allow all operations for maps_analyzer" ON maps_analyzer;
CREATE POLICY "Allow all operations for maps_analyzer" ON maps_analyzer FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE maps_analyzer ENABLE ROW LEVEL SECURITY;

-- 34. App Settings (Global Settings)
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP POLICY IF EXISTS "Allow all operations for app_settings" ON app_settings;
CREATE POLICY "Allow all operations for app_settings" ON app_settings FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
`;
