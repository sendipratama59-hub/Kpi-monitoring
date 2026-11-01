# Rencana Implementasi: Fitur Master LCD & Pemisah Pricelist Otomatis (VIVAN & XPAS)

## 1. Ringkasan Kebutuhan & Tujuan
User mengalami kesulitan dan inefisiensi harian saat harus menyaring master data LCD dan memisahkannya secara manual ke dalam sheet terpisah (VIVAN vs XPAS) di Excel. Berdasarkan gambar yang dilampirkan dan jawaban preferensi user:
- Dibuat menu baru **Master LCD** di sidebar.
- Dilengkapi fitur upload file Excel Master LCD dengan preview live excel/spreadsheet yang interaktif.
- Fitur memilih/menonaktifkan header (toggle visibilitas kolom) seperti filter di Excel.
- Data disimpan secara permanen di database Supabase (tabel `master_lcd`) dan mendukung sinkronisasi lokal.
- Fitur ekspor **1 file Excel dengan sheet terpisah per brand** (misal: Sheet `VIVAN`, Sheet `XPAS`, dan opsi Sheet `SEMUA DATA`), di mana hanya kolom-kolom yang berstatus **aktif** yang akan dimasukkan ke dalam sheet ekspor.

---

## 2. Struktur Database Supabase (`master_lcd`)
Sesuai aturan `<RULE[AGENTS_md]>`, skema tabel baru harus didaftarkan ke `SQL_SCRIPT` di `src/components/features/SetupDatabase/sql-scripts.ts` agar dapat dimigrasikan secara aman oleh user via menu DB Setup.

### Skema Tabel `master_lcd`
```sql
CREATE TABLE IF NOT EXISTS master_lcd (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kode_lcd TEXT,
  brand_hp TEXT,
  status_lcd TEXT,
  oled_soft_oled TEXT,
  iphone_new TEXT,
  batrai_iphone TEXT,
  nama_lcd TEXT,
  model_lcd TEXT,
  packing NUMERIC DEFAULT 0,
  harga_box NUMERIC DEFAULT 0,
  harga_pcs NUMERIC DEFAULT 0,
  stock NUMERIC DEFAULT 0,
  brand_ TEXT, -- 'VIVAN', 'XPAS', dll
  raw_data JSONB, -- Fleksibilitas jika ada kolom tambahan tak terduga dari excel
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indeks untuk query cepat berdasarkan brand dan kode
CREATE INDEX IF NOT EXISTS idx_master_lcd_brand ON master_lcd(brand_);
CREATE INDEX IF NOT EXISTS idx_master_lcd_kode ON master_lcd(kode_lcd);
CREATE INDEX IF NOT EXISTS idx_master_lcd_brand_hp ON master_lcd(brand_hp);

-- RLS Policy
ALTER TABLE master_lcd ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'master_lcd' AND policyname = 'Allow all operations for master_lcd'
  ) THEN
    CREATE POLICY "Allow all operations for master_lcd" ON master_lcd FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
```

---

## 3. Arsitektur Komponen Modular (Aturan File Size < 400 baris)
Komponen akan diletakkan di direktori baru `/src/components/features/MasterLcd/`:

1. **`types.ts`**:
   - Tipe data `MasterLcdRow`, `MasterLcdColumnConfig`, `MasterLcdFilterState`, `BrandSummary`.
2. **`MasterLcdHeaderToggle.tsx`**:
   - Modal / popover dropdown untuk mengaktifkan / menonaktifkan kolom header (seperti "Show/Hide Columns" di Excel).
   - Opsi: *Pilih Semua*, *Reset ke Default*, *Simpan Konfigurasi* (disimpan di `localStorage` agar pengaturan kolom tidak hilang saat refresh).
3. **`MasterLcdUploadModal.tsx`**:
   - Drag & drop file Excel Master LCD (.xlsx / .xls).
   - Parser menggunakan pustaka `xlsx` dengan pemetaan kolom otomatis yang toleran terhadap variasi penamaan header (`kode_lcd`, `brand_hp`, `nama_lcd`, `packing`, `harga_box`, `harga_pcs`, `stock`, `brand_`).
   - Progress bar upload & batch upsert ke Supabase (menggunakan chunking 500 rows per batch).
4. **`MasterLcdTable.tsx`**:
   - Tampilan live spreadsheet yang bersih dan modern.
   - Mengikuti aturan responsif: pembungkus `<div className="overflow-x-auto w-full">`, baris zebra, badge status & brand.
   - Pagination client-side (50 / 100 / 200 baris per halaman) agar performa tetap cepat.
   - Filter cepat berdasarkan Brand (`SEMUA`, `VIVAN`, `XPAS`, dll.), Brand HP (`IPHONE`, `SAMSUNG`, `OPPO`, dll.), dan pencarian kata kunci.
5. **`MasterLcdExportModal.tsx`**:
   - Logika pembuatan file Excel menggunakan `xlsx`.
   - Mengambil data yang aktif, membagi baris per brand (`VIVAN`, `XPAS`).
   - Menyusun 1 Workbook dengan Sheet terpisah:
     - Sheet 1: **VIVAN** (hanya berisi data VIVAN dengan kolom yang aktif)
     - Sheet 2: **XPAS** (hanya berisi data XPAS dengan kolom yang aktif)
     - Sheet 3: **SEMUA** (opsional / toggle untuk memasukkan sheet gabungan)
   - Styling lebar kolom otomatis (auto-fit column width) dan formatting angka/rupiah.
6. **`index.tsx` (Main View `MasterLcdView`)**:
   - Pengatur state utama: memuat data dari Supabase (dengan loop `.range()` 1.000 rows sesuai aturan pagination data besar), integrasi modal upload, toggle kolom, filter tab, dan tombol export langsung.

---

## 4. Integrasi Navigasi & Routing
1. **`src/components/layout/Sidebar.tsx`**:
   - Tambahkan menu baru **Master LCD** di bawah grup Katalog LCD atau di level utama dengan icon `FileSpreadsheet`.
2. **`src/App.tsx`**:
   - Daftarkan `currentView === 'master-lcd'` dan render `<MasterLcdView />`.
3. **`src/components/features/SetupDatabase/sql-scripts.ts`**:
   - Tambahkan skrip migrasi `master_lcd` ke `SQL_SCRIPT`.

---

## 5. Rencana Verifikasi & Uji Coba
- **Uji Upload Excel**: Menguji pembacaan file Excel dengan header sesuai gambar (`kode_lcd`, `brand_hp`, `nama_lcd`, `packing`, `harga_box`, `harga_pcs`, `stock`, `brand_`).
- **Uji Toggle Kolom**: Menonaktifkan kolom tertentu (misal: `oled_soft oled`, `iphone_new`, `batrai_iphone`) -> kolom hilang dari live table.
- **Uji Ekspor Multi-Sheet**: Menekan tombol Ekspor Excel -> memastikan file yang terunduh memiliki sheet terpisah ("VIVAN" dan "XPAS"), dan kolom yang dinonaktifkan tidak ikut diekspor.
- **Uji Lint & Compile**: Menjalankan `compile_applet` untuk memastikan tidak ada error TypeScript maupun Vite build.
