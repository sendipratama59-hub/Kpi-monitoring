import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { BookOpen, Database, ArrowRight, Layers, FileSpreadsheet, BarChart2 } from 'lucide-react';

export function Documentation() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-800">Dokumentasi & Arsitektur</h2>
        <p className="text-sm text-slate-500">Panduan teknis aliran data (Data Flow) untuk pengembangan dan pemeliharaan aplikasi.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="col-span-1 md:col-span-3 border-indigo-100 shadow-sm">
          <CardHeader className="bg-indigo-50/50 pb-4 border-b border-indigo-100">
            <CardTitle className="text-lg flex items-center text-indigo-800">
              <Layers className="w-5 h-5 mr-2 text-indigo-500" />
              Aliran Data (Data Flow) Sistem KPI
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 text-center">
              <div className="flex flex-col items-center p-4 bg-white border border-slate-200 rounded-xl w-full md:w-1/4 shadow-sm relative">
                <FileSpreadsheet className="w-10 h-10 text-emerald-500 mb-3" />
                <h4 className="font-bold text-slate-700">1. Upload Excel</h4>
                <p className="text-xs text-slate-500 mt-2">Data mentah transaksi sales & KPI diunggah dengan memilih Periode Bulan & Tahun pada menu Upload.</p>
              </div>

              <div className="hidden md:flex justify-center text-slate-300">
                <ArrowRight className="w-8 h-8" />
              </div>
              <div className="md:hidden flex justify-center text-slate-300 rotate-90 my-2">
                <ArrowRight className="w-8 h-8" />
              </div>

              <div className="flex flex-col items-center p-4 bg-white border border-slate-200 rounded-xl w-full md:w-1/4 shadow-sm">
                <Database className="w-10 h-10 text-blue-500 mb-3" />
                <h4 className="font-bold text-slate-700">2. Tabel Supabase</h4>
                <p className="text-xs text-slate-500 mt-2">Data tersimpan di tabel <code className="bg-slate-100 px-1 rounded">salesman_kpi</code> lengkap dengan data nama toko, omset, qty produk, dan batch upload.</p>
              </div>

              <div className="hidden md:flex justify-center text-slate-300">
                <ArrowRight className="w-8 h-8" />
              </div>
              <div className="md:hidden flex justify-center text-slate-300 rotate-90 my-2">
                <ArrowRight className="w-8 h-8" />
              </div>

              <div className="flex flex-col items-center p-4 bg-white border border-slate-200 rounded-xl w-full md:w-1/4 shadow-sm">
                <BarChart2 className="w-10 h-10 text-indigo-500 mb-3" />
                <h4 className="font-bold text-slate-700">3. RPC / View DB</h4>
                <p className="text-xs text-slate-500 mt-2">Fungsi RPC (Stored Procedure) di Supabase (seperti <code className="bg-slate-100 px-1 rounded">get_salesman_kpi_summary</code>) mengagregasi data jutaan baris dengan cepat berdasarkan filter bulan.</p>
              </div>
              
              <div className="hidden md:flex justify-center text-slate-300">
                <ArrowRight className="w-8 h-8" />
              </div>
              <div className="md:hidden flex justify-center text-slate-300 rotate-90 my-2">
                <ArrowRight className="w-8 h-8" />
              </div>

              <div className="flex flex-col items-center p-4 bg-white border border-slate-200 rounded-xl w-full md:w-1/4 shadow-sm ring-1 ring-indigo-500/20">
                <BookOpen className="w-10 h-10 text-indigo-600 mb-3" />
                <h4 className="font-bold text-slate-700">4. Dashboard / Report UI</h4>
                <p className="text-xs text-slate-500 mt-2">Aplikasi React memanggil RPC via Supabase Client dan menampilkan hasil ringkasannya dengan cepat tanpa me-render data mentah yang rawan error.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 md:col-span-3">
          <CardHeader className="pb-4 border-b">
            <CardTitle className="text-lg">Daftar Fungsi Database (RPC) & Tabel Utama</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div>
              <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-2">
                <Database className="w-4 h-4 text-blue-500" /> Tabel Utama
              </h3>
              <ul className="list-disc list-inside text-sm text-slate-600 space-y-2 ml-2">
                <li><strong className="text-slate-800">salesman_kpi:</strong> Tabel historikal. Setiap baris mewakili pembelian per customer/toko untuk 1 salesman per batch Excel. Ditambah dengan `period_month` dan `period_year` untuk memudahkan filter periodik.</li>
                <li><strong className="text-slate-800">salesman_kpi_targets:</strong> Tabel master untuk setup target KPI untuk tiap salesman. 1 salesman punya 1 baris record.</li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-2">
                <Layers className="w-4 h-4 text-emerald-500" /> Fungsi RPC (Remote Procedure Call)
              </h3>
              <p className="text-sm text-slate-500 mb-3">
                Karena ukuran database kita akan membesar jika kita mulai meng-unggah data dari tahun 2026, 
                kita wajib menggunakan arsitektur ini agar aplikasi tidak *hang/nge-lag* akibat men-download jutaan baris lewat API ke memori browser setiap hari.
                Sebaliknya, proses hitung-hitungan (seperti SUM, COUNT) dibebankan ke server database PostgresSQL secara instan.
              </p>
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 border rounded-lg">
                  <p className="font-mono text-xs text-indigo-600 font-bold mb-1">get_dashboard_summary(p_month: integer, p_year: integer)</p>
                  <p className="text-sm text-slate-600">Dipanggil oleh halaman <b>Dashboard Overview</b>. Merangkum seluruh transaksi seluruh salesman untuk bulan spesifik ke dalam 1 object JSON sederhana yang berisi omset all brand, omset 3C, dll.</p>
                </div>
                <div className="bg-slate-50 p-4 border rounded-lg">
                  <p className="font-mono text-xs text-indigo-600 font-bold mb-1">get_salesman_kpi_summary(p_month: integer, p_year: integer)</p>
                  <p className="text-sm text-slate-600">Dipanggil oleh halaman <b>Salesman KPI</b>. Mengembalikan list performa agregasi untuk <i>masing-masing</i> salesman (Omset LCD, Pcs Hydrogel, dll.). Data dikembalikan dalam bentuk array siap pakai untuk Leaderboard.</p>
                </div>
              </div>
            </div>
            
            <div className="pt-4 border-t">
               <h3 className="font-bold text-slate-800 text-sm mb-2">Apa yang perlu dilakukan jika ingin menambah KPI baru?</h3>
               <ol className="list-decimal list-inside text-sm text-slate-600 space-y-1 ml-1">
                 <li>Update UI ExcelUploader untuk mem-parsing kolom excel yang baru ke database jika format berubah.</li>
                 <li>Pastikan kolom tersebut ada di tabel <code className="bg-slate-100 px-1 rounded">salesman_kpi</code> (via menu Setup DB &gt; Edit script).</li>
                 <li>Buka kembali menu Setup DB, tambahkan formula logika <code className="bg-slate-100 px-1 rounded">SUM(kolom_baru)</code> di dalam bagian fungsi RPC <code className="bg-slate-100 px-1 rounded">get_salesman_kpi_summary</code>.</li>
                 <li>Eksekusi ulang script (Overwrite fungsi yang lama).</li>
                 <li>Update UI React <code className="bg-slate-100 px-1 rounded">SalesmanKpiReport.tsx</code> & <code className="bg-slate-100 px-1 rounded">Dashboard.tsx</code> untuk menampilkan <i>keys</i> data baru dari RPC.</li>
               </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
