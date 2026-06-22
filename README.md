# KPI Monitoring Dashboard

Aplikasi Dashboard Monitoring KPI dengan fitur unggah data Excel, penyimpanan Supabase, dan analisis berbasis AI menggunakan Gemini (Natural Language Query).

## 🗂 Rekomendasi Struktur Folder (Scalable Architecture)
```text
/src
 ├── /assets          # Statis seperti gambar atau icon kustom
 ├── /components      # Reusable UI components
 │    ├── /ui         # Komponen dasar (Button, Input, Table, dll.)
 │    ├── /layout     # Wrapper layout (Sidebar, Navbar)
 │    └── /features   # Komponen spesifik fitur (ExcelUploader, AIQueryInput, KPICards)
 ├── /hooks           # Custom React Hooks (useExcelImport, useSupabase, useAIAnalysis)
 ├── /services        # Integrasi backend/API
 │    ├── supabase.ts # Konfigurasi dan helper Supabase
 │    └── gemini.ts   # Helper untuk panggilan API Gemini
 ├── /types           # TypeScript interfaces & types (supabase.types.ts, index.ts)
 ├── /utils           # Fungsi utilitas murni (formatter, data cleaning, mapping)
 ├── App.tsx          # Main router / view manager
 └── main.tsx         # Entry point React
```

## 🗄️ Skema Database SQL (Supabase PostgreSQL)

Berikut adalah DDL untuk tabel beserta pengaturan Row Level Security (RLS). Agar relasi valid, gunakan User ID yang direferensikan dari `auth.users` bawaan Supabase.

```sql
-- 1. Profiles Table (Ekstensi dari auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Upload Logs (Melacak riwayat file Excel yang diunggah)
CREATE TABLE upload_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  upload_date TIMESTAMPTZ DEFAULT NOW(),
  record_count INTEGER NOT NULL,
  status TEXT DEFAULT 'success' CHECK (status IN ('pending', 'success', 'error')),
  error_message TEXT
);

-- 3. Sales Data (Data utama dari Excel)
CREATE TABLE sales_data (
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
CREATE TABLE kpi_targets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  region TEXT NOT NULL,
  period TEXT NOT NULL, -- Format: YYYY-MM
  target_revenue NUMERIC NOT NULL,
  target_units INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(region, period) -- Mencegah target ganda di region & bulan yang sama
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Pastikan RLS Aktif untuk semua tabel
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE upload_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_targets ENABLE ROW LEVEL SECURITY;

-- Contoh Policy: User hanya bisa melihat data miliknya sendiri (tergantung arsitektur)
-- Jika ini dashboard perusahaan internal (Office HQ), kita asumsikan authenticated user bisa read.

-- Profiles: Hanya bisa baca profile sendiri
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Upload Logs: Hanya uploader yang bisa lihat/insert log miliknya
CREATE POLICY "Users can insert own logs" ON upload_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own logs" ON upload_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Sales Data: Baca semua jika authenticated (Dashboard)
CREATE POLICY "Authenticated users can view sales data" ON sales_data
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can insert data to their logs" ON sales_data
  FOR INSERT WITH CHECK (
    auth.uid() = (SELECT user_id FROM upload_logs WHERE id = upload_id)
  );

-- KPI Targets: Bisa diakses publik/internal untuk dashboard
CREATE POLICY "Authenticated users can view KPI" ON kpi_targets
  FOR SELECT USING (auth.role() = 'authenticated');
```

## 📦 Daftar Library (Dependencies)

Saya telah menambahkan instalasi library berikut untuk project ini:
- **`@supabase/supabase-js`**: Client backend Supabase (Auth & DB).
- **`xlsx`** (SheetJS): Library utama untuk memparsing, membaca, dan memvalidasi file Excel (.xlsx / .csv).
- **`recharts`**: Pembuatan grafik interaktif untuk Dashboard KPI.
- **`react-dropzone`**: Implementasi komponen drag-and-drop unggah file secara seamless.
- **`react-error-boundary`**: Catching error React tree untuk fail-safe (tidak white screen saat error component / parsing render).
- **`lucide-react`**: Ikon SVG standar.
- **`clsx` & `tailwind-merge`**: Utilitas untuk membantu mengatur CSS classes secara clean dan dinamis.
- **`@google/genai`**: SDK Gemini untuk menembak query Natural Language.

## 🔀 Strategi Pemetaan (Mapping Strategy) Kolom Excel

Jika header Excel dari pusat suka berubah nama (misal: "Pendapatan", "Rev", "Total Sales"), ini adalah strategi sistem yang akan diimplementasikan:

1. **Standardization (Normalisasi Header):** 
   Setiap baris header dari SheetJS pertama-tama dibersihkan: Hilangkan spasi berlebih (`.trim()`), hapus karakter spesial, dan ubah ke huruf kecil (`.toLowerCase()`).
2. **Dictionary / Alias Fallback (Alias Map):**
   Memiliki struktur configuration di file config `utils/excelConfig.ts`:
   ```typescript
   const COLUMN_MAP = {
      revenue: ["revenue", "pendapatan", "total_sales", "total_penjualan", "rev", "nilai"],
      region: ["region", "area", "cabang", "wilayah", "lokasi"],
      transaction_date: ["date", "tanggal", "tgl", "transaction_date", "waktu"],
      units_sold: ["units", "qty", "quantity", "unit_terjual", "jumlah"]
   };
   ```
3. **Fuzzy Indexing (Opsional untuk lanjut):**
   Melakukan loop pada header Excel yang ditemukan, lalu dicocokkan `.includes()` dengan array dalam `COLUMN_MAP`.
4. **Validation Pipeline (Type Safety):** 
   Setelah baris dipetakan ke format JSON `{ region, revenue, units_sold, transaction_date }`, datanya divalidasi dan diubah tipe datanya:
   - Apabila "revenue" string dengan koma, hilangkan koma dan ubah ke Number.
   - Apabila tanggal berupa format Excel statis (angka), conversi via fungsi SheetJS ke Date Object, lalu simpan terformat ISO.
5. **Preview Panel:**
   Beri UI kepada User untuk *review* sample (5 data pertama) sebelum menekan "Upload to Database", agar user bisa mengecek jika ada mapping kolom yang gagal dikenali.

## ⚙️ Environment Variables

Anda harus menyiapkan kredensial berikut di setting AI Studio:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `GEMINI_API_KEY` (Sudah terinjeksi otomatis)

---
*Silakan baca dan konfirmasi jika ini sesuai harapan. Jika ya, kita akan langsung membuat kode frontend UI dan fungsi upload.*
