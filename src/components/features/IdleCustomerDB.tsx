import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Button } from '../ui/Button';
import { ConfirmModal } from '../ui/ConfirmModal';
import { GenieModal } from '../ui/GenieModal';
import { supabase } from '../../services/supabase';
import { Users, Search, Loader2, UploadCloud, FileSpreadsheet, Trash2, Trash, AlertCircle, Plus, Check } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { useAlert } from '../ui/AlertModal';

interface IdleCustomer {
  id: string;
  salesman_code: string;
  salesman_name: string;
  customer_code: string;
  customer_name: string;
  upload_month?: string;
  upload_year?: string;
  created_at?: string;
}

export function IdleCustomerDB() {
  const { showAlert } = useAlert();
  const [data, setData] = useState<IdleCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewData, setPreviewData] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  // Toggle options from the request image
  const [replaceExisting, setReplaceExisting] = useState(true);
  const [forcePeriod, setForcePeriod] = useState(true);

  // Manual Form State
  const [newSalesmanCode, setNewSalesmanCode] = useState('');
  const [newSalesmanName, setNewSalesmanName] = useState('');
  const [newCustomerCode, setNewCustomerCode] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [isSavingManual, setIsSavingManual] = useState(false);

  const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');
  const currentYear = new Date().getFullYear().toString();
  const [periodMonth, setPeriodMonth] = useState(currentMonth);
  const [periodYear, setPeriodYear] = useState(currentYear);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  useEffect(() => {
    fetchData();
  }, [periodMonth, periodYear]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let allRecords: IdleCustomer[] = [];
      let hasMore = true;
      let from = 0;

      while (hasMore) {
        const { data: chunk, error: fetchError } = await supabase
          .from('salesman_idle_customer')
          .select('*')
          .eq('upload_month', periodMonth)
          .eq('upload_year', periodYear)
          .range(from, from + 999);

        if (fetchError) throw fetchError;

        if (chunk && chunk.length > 0) {
          allRecords = [...allRecords, ...chunk];
          if (chunk.length < 1000) {
            hasMore = false;
          } else {
            from += 1000;
          }
        } else {
          hasMore = false;
        }
      }
      setData(allRecords);
    } catch (err) {
      console.error("Error loading idle customers:", err);
    } finally {
      setLoading(false);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setError(null);
    setIsUploading(true);
    const file = acceptedFiles[0];

    try {
      const parsedData = await new Promise<any[]>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const buffer = e.target?.result;
            const workbook = XLSX.read(buffer, { type: 'binary' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(worksheet);
            resolve(json);
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = reject;
        reader.readAsBinaryString(file);
      });

      if (!parsedData || parsedData.length === 0) {
        throw new Error("File Excel kosong");
      }

      // Map dynamic header names based on columns customer_code, customer_name, salesman_code, salesman_name
      const mappedData = parsedData.map(row => {
        const getVal = (possibleKeys: string[]) => {
          const key = Object.keys(row).find(k => 
            possibleKeys.some(pK => k.toLowerCase().trim().replace(/_/g, ' ') === pK || k.toLowerCase().trim().replace(/_/g, '') === pK || k.toLowerCase().includes(pK))
          );
          return key ? row[key] : '';
        };

        return {
          id: Math.random().toString(), // temporary ID
          customer_code: String(getVal(['customer code', 'customer_code', 'kode customer', 'kode_customer', 'kode toko', 'customercode', 'kode_toko']) || '').trim(),
          customer_name: String(getVal(['customer name', 'customer_name', 'nama customer', 'nama_customer', 'nama toko', 'customername', 'nama_toko']) || '').trim(),
          salesman_code: String(getVal(['salesman code', 'salesman_code', 'kode salesman', 'kode_salesman', 'kode sales', 'salesmancode', 'kode_sales']) || '').trim(),
          salesman_name: String(getVal(['salesman name', 'salesman_name', 'nama salesman', 'nama_salesman', 'nama sales', 'salesmanname', 'nama_sales']) || '').trim(),
        };
      }).filter(item => item.customer_code || item.customer_name);

      if (mappedData.length === 0) {
        throw new Error("Tidak dapat mendeteksi data customer. Pastikan kolom Excel memiliki nama 'customer_code', 'customer_name', 'salesman_code', atau 'salesman_name'");
      }

      setPreviewData(mappedData);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Gagal memproses file Excel.');
    } finally {
      setIsUploading(false);
    }
  }, []);

  const handleSaveToDatabase = async () => {
    if (!previewData || previewData.length === 0) return;

    setIsSaving(true);
    setError(null);
    try {
      // 1. CLEAR EXISTING BATCH logic
      if (replaceExisting) {
        const { error: deleteError } = await supabase
          .from('salesman_idle_customer')
          .delete()
          .eq('upload_month', periodMonth)
          .eq('upload_year', periodYear);

        if (deleteError) throw deleteError;
      }

      // 2. Prepare data to insert
      const dataToInsert = previewData.map(({ id, ...rest }) => ({
        ...rest,
        upload_month: forcePeriod ? periodMonth : currentMonth,
        upload_year: forcePeriod ? periodYear : currentYear,
      }));

      const BATCH_SIZE = 500;
      for (let i = 0; i < dataToInsert.length; i += BATCH_SIZE) {
        const batch = dataToInsert.slice(i, i + BATCH_SIZE);
        const { error: insertError } = await supabase.from('salesman_idle_customer').insert(batch);
        if (insertError) throw insertError;
      }

      setPreviewData(null);
      await fetchData();

      // Automatically trigger recalculation of KPI achievements for this month and year
      const { error: recalcError } = await supabase.rpc('recalculate_kpi_achievements', {
        p_month: parseInt(periodMonth, 10),
        p_year: parseInt(periodYear, 10),
      });
      if (recalcError) {
        console.error('Gagal menjalankan recalculate_kpi_achievements:', recalcError);
      }

      showAlert('Data Idle Customer berhasil disimpan ke database dan pencapaian KPI otomatis dihitung!', 'success');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Gagal menyimpan data ke database.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAll = async () => {
    try {
      const { error: deleteError } = await supabase
        .from('salesman_idle_customer')
        .delete()
        .eq('upload_month', periodMonth)
        .eq('upload_year', periodYear);

      if (deleteError) throw deleteError;

      showAlert(`Semua data Idle Customer periode ${getMonthName(periodMonth)} ${periodYear} berhasil dihapus.`, 'success');
      setIsDeleteAllModalOpen(false);
      await fetchData();
    } catch (err: any) {
      console.error(err);
      showAlert(err.message || 'Gagal menghapus data.', 'error');
    }
  };

  const handleSaveManual = async () => {
    if (!newCustomerCode || !newCustomerName) {
      showAlert('Kode Customer dan Nama Customer harus diisi.', 'warning');
      return;
    }

    setIsSavingManual(true);
    try {
      const { error: insertError } = await supabase
        .from('salesman_idle_customer')
        .insert([{
          customer_code: newCustomerCode,
          customer_name: newCustomerName,
          salesman_code: newSalesmanCode || '-',
          salesman_name: newSalesmanName || '-',
          upload_month: periodMonth,
          upload_year: periodYear,
        }]);

      if (insertError) throw insertError;

      // Automatically trigger recalculation of KPI achievements for this month and year
      const { error: recalcError } = await supabase.rpc('recalculate_kpi_achievements', {
        p_month: parseInt(periodMonth, 10),
        p_year: parseInt(periodYear, 10),
      });
      if (recalcError) {
        console.error('Gagal menjalankan recalculate_kpi_achievements:', recalcError);
      }

      showAlert('Data Idle Customer berhasil ditambahkan dan pencapaian KPI otomatis dihitung!', 'success');
      setIsManualModalOpen(false);
      setNewCustomerCode('');
      setNewCustomerName('');
      setNewSalesmanCode('');
      setNewSalesmanName('');

      await fetchData();
    } catch (err: any) {
      console.error(err);
      showAlert(err.message || 'Gagal menambahkan data manual.', 'error');
    } finally {
      setIsSavingManual(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv']
    },
    multiple: false
  });

  const getMonthName = (m: string) => {
    const names = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return names[parseInt(m) - 1] || m;
  };

  // Filter and Paginate Local Data
  const filteredData = data.filter(item => {
    const term = searchTerm.toLowerCase();
    return (
      item.customer_code.toLowerCase().includes(term) ||
      item.customer_name.toLowerCase().includes(term) ||
      item.salesman_code.toLowerCase().includes(term) ||
      item.salesman_name.toLowerCase().includes(term)
    );
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Users className="w-7 h-7 text-indigo-600" />
            Database Idle Customer
          </h2>
          <p className="text-sm text-slate-500 font-medium">
            Kelola data Customer Pasif (Idle) per periode penjualan.
          </p>
        </div>

        {/* Periode Selector */}
        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border shadow-sm self-start">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Periode:</span>
          <select
            value={periodMonth}
            onChange={(e) => { setPeriodMonth(e.target.value); setCurrentPage(1); }}
            className="text-sm font-bold text-slate-700 bg-transparent focus:outline-none cursor-pointer"
          >
            {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(m => (
              <option key={m} value={m}>{getMonthName(m)}</option>
            ))}
          </select>
          <select
            value={periodYear}
            onChange={(e) => { setPeriodYear(e.target.value); setCurrentPage(1); }}
            className="text-sm font-bold text-slate-700 bg-transparent focus:outline-none cursor-pointer"
          >
            {Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - 2 + i)).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Upload & Configuration Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Upload Area */}
        <Card className="lg:col-span-1 shadow-sm border border-slate-100 rounded-3xl overflow-hidden bg-white">
          <CardHeader className="border-b bg-slate-50/50 py-4 px-6">
            <CardTitle className="text-base font-black uppercase text-slate-700 tracking-tight">Import Excel</CardTitle>
            <CardDescription className="text-xs">Unggah daftar Idle Customer untuk periode terpilih</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {!previewData ? (
              <div
                {...getRootProps()}
                className={`
                  border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-300
                  ${isDragActive ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50/50'}
                `}
              >
                <input { ...getInputProps() } />
                {isUploading ? (
                  <div className="flex flex-col items-center py-4">
                    <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-2" />
                    <p className="text-sm text-slate-600 font-bold">Membaca file Excel...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-4">
                    <UploadCloud className="w-12 h-12 text-slate-400 mb-2 group-hover:text-indigo-500 transition-colors" />
                    <p className="text-sm font-bold text-slate-700 mb-1">Pilih atau Tarik File Excel</p>
                    <p className="text-xs text-slate-400">Hanya file .xlsx atau .xls</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl border border-emerald-100 flex items-start gap-3">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold">File Excel Siap Diimport!</p>
                    <p className="text-xs text-emerald-700/80 font-medium mt-0.5">
                      Berhasil mendeteksi <span className="font-bold">{previewData.length} baris</span> data.
                    </p>
                  </div>
                </div>

                {error && (
                  <div className="bg-rose-50 text-rose-800 p-4 rounded-xl border border-rose-100 flex items-start gap-3 text-xs font-semibold">
                    <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                    <p>{error}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={handleSaveToDatabase}
                    disabled={isSaving}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl py-3 text-xs uppercase"
                  >
                    {isSaving ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...
                      </span>
                    ) : 'Simpan ke Database'}
                  </Button>
                  <Button
                    onClick={() => { setPreviewData(null); setError(null); }}
                    variant="outline"
                    className="border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-xl py-3 text-xs uppercase"
                  >
                    Batal
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column: Interactive options in style of the image */}
        <div className="lg:col-span-2 space-y-4">
          <div
            onClick={() => setReplaceExisting(!replaceExisting)}
            className={`
              p-6 rounded-[24px] border-2 transition-all duration-300 cursor-pointer flex items-center gap-6 group relative overflow-hidden
              ${replaceExisting ? "border-amber-200 bg-gradient-to-br from-amber-50/30 to-white" : "border-slate-100 bg-white hover:border-indigo-200"}
            `}
          >
            {replaceExisting && (
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -mr-16 -mt-16 blur-3xl" />
            )}
            <div
              className={`
                w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-sm flex-shrink-0
                ${replaceExisting ? "bg-amber-100 text-amber-600 rotate-0 shadow-amber-200/50" : "bg-slate-50 text-slate-300 rotate-12 group-hover:rotate-0 group-hover:bg-indigo-50 group-hover:text-indigo-600"}
              `}
            >
              {replaceExisting ? (
                <Check className="w-6 h-6 transition-all duration-500 scale-100 opacity-100" />
              ) : (
                <div className="w-5 h-5 border-2 border-slate-200 rounded-lg" />
              )}
            </div>
            <div>
              <h4 className="font-black text-slate-900 uppercase tracking-tight text-sm">
                CLEAR EXISTING BATCH
              </h4>
              <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">
                Hapus semua data untuk <span className="text-amber-600 font-bold">{getMonthName(periodMonth)} {periodYear}</span> sebelum mengimport. Mencegah duplikasi data.
              </p>
            </div>
          </div>

          <div
            onClick={() => setForcePeriod(!forcePeriod)}
            className={`
              p-6 rounded-[24px] border-2 transition-all duration-300 cursor-pointer flex items-center gap-6 group relative overflow-hidden
              ${forcePeriod ? "border-indigo-200 bg-gradient-to-br from-indigo-50/30 to-white" : "border-slate-100 bg-white hover:border-indigo-200"}
            `}
          >
            {forcePeriod && (
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-16 -mt-16 blur-3xl" />
            )}
            <div
              className={`
                w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-sm flex-shrink-0
                ${forcePeriod ? "bg-indigo-100 text-indigo-600 rotate-0 shadow-indigo-200/50" : "bg-slate-50 text-slate-300 rotate-12 group-hover:rotate-0 group-hover:bg-indigo-50 group-hover:text-indigo-600"}
              `}
            >
              {forcePeriod ? (
                <Check className="w-6 h-6 transition-all duration-500 scale-100 opacity-100" />
              ) : (
                <div className="w-5 h-5 border-2 border-slate-200 rounded-lg" />
              )}
            </div>
            <div>
              <h4 className="font-black text-slate-900 uppercase tracking-tight text-sm">
                PENGAKUAN MANUAL BULAN & TAHUN
              </h4>
              <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">
                Ubah tanggal transaksi pada Excel agar <span className="text-indigo-600 font-bold">diakui masuk ke bulan {getMonthName(periodMonth)} {periodYear}</span> pada menu Analisa Omset.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <Card className="shadow-sm border border-slate-100 rounded-3xl overflow-hidden bg-white">
        <CardHeader className="border-b bg-slate-50/50 py-4 px-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base font-black uppercase text-slate-700 tracking-tight">
              Daftar Idle Customer - {getMonthName(periodMonth)} {periodYear}
            </CardTitle>
            <CardDescription className="text-xs">
              Menampilkan total {filteredData.length} records.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Search Box */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari idle customer..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-4 py-2 border rounded-xl text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
              />
            </div>

            {/* Tambah Manual Button */}
            <Button
              onClick={() => setIsManualModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs py-2 px-4 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Tambah Manual
            </Button>

            {/* Delete All Button */}
            {data.length > 0 && (
              <Button
                onClick={() => setIsDeleteAllModalOpen(true)}
                variant="destructive"
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs py-2 px-4 flex items-center gap-1.5"
              >
                <Trash className="w-4 h-4" /> Hapus Semua
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0 relative min-h-[300px]">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 font-bold">Kode Customer</th>
                  <th className="px-6 py-4 font-bold">Nama Customer</th>
                  <th className="px-6 py-4 font-bold">Kode Salesman</th>
                  <th className="px-6 py-4 font-bold">Nama Salesman</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                        <span className="text-xs font-bold">Memuat data...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400 text-xs font-semibold">
                      Belum ada data Idle Customer untuk periode ini.
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-indigo-600 font-bold">{row.customer_code}</td>
                      <td className="px-6 py-4 font-semibold text-slate-800 text-xs">{row.customer_name}</td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-500">{row.salesman_code}</td>
                      <td className="px-6 py-4 text-slate-600 text-xs">{row.salesman_name}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-4 border-t flex items-center justify-between gap-4 bg-slate-50/30">
              <span className="text-xs text-slate-500 font-bold">
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  variant="outline"
                  className="px-3 py-1.5 text-xs font-bold rounded-lg border-slate-200"
                >
                  Prev
                </Button>
                <Button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  variant="outline"
                  className="px-3 py-1.5 text-xs font-bold rounded-lg border-slate-200"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tambah Manual Modal */}
      <GenieModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        title={`Tambah Idle Customer - ${getMonthName(periodMonth)} ${periodYear}`}
        maxWidth="max-w-md"
      >
        <div className="space-y-4 pt-2 text-left">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Kode Customer *</label>
              <input
                type="text"
                value={newCustomerCode}
                onChange={e => setNewCustomerCode(e.target.value)}
                placeholder="Cth: C001"
                className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nama Customer *</label>
              <input
                type="text"
                value={newCustomerName}
                onChange={e => setNewCustomerName(e.target.value)}
                placeholder="Cth: Toko Berkah"
                className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Kode Salesman</label>
              <input
                type="text"
                value={newSalesmanCode}
                onChange={e => setNewSalesmanCode(e.target.value)}
                placeholder="Cth: S001"
                className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nama Salesman</label>
              <input
                type="text"
                value={newSalesmanName}
                onChange={e => setNewSalesmanName(e.target.value)}
                placeholder="Cth: Ahmad"
                className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 font-bold">* Wajib diisi</p>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              onClick={() => setIsManualModalOpen(false)}
              variant="outline"
              className="px-4 py-2 text-xs font-bold rounded-xl"
            >
              Batal
            </Button>
            <Button
              onClick={handleSaveManual}
              disabled={isSavingManual}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs px-4 py-2"
            >
              {isSavingManual ? "Menyimpan..." : "Tambah Data"}
            </Button>
          </div>
        </div>
      </GenieModal>

      {/* Delete All Modal */}
      <ConfirmModal
        isOpen={isDeleteAllModalOpen}
        onClose={() => setIsDeleteAllModalOpen(false)}
        title="Hapus Semua Data?"
        message={`Apakah Anda yakin ingin menghapus semua data Idle Customer untuk periode ${getMonthName(periodMonth)} ${periodYear}? Tindakan ini permanen.`}
        confirmText="Hapus Sekarang"
        cancelText="Batal"
        onConfirm={handleDeleteAll}
        isDestructive={true}
      />
    </div>
  );
}
