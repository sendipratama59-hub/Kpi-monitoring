import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Button } from '../ui/Button';
import { ConfirmModal } from '../ui/ConfirmModal';
import { supabase } from '../../services/supabase';
import { Package, Search, Loader2, FileSpreadsheet, Trash, AlertCircle } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { useAlert } from '../ui/AlertModal';

interface DatabaseBarang {
  id: string;
  goods_code: string;
  goods_name: string;
  warna: string;
  category: string;
}

export function DatabaseBarangDB() {
  const { showAlert } = useAlert();
  const [data, setData] = useState<DatabaseBarang[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewData, setPreviewData] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setPreviewData(null);
    setCurrentPage(1);
    try {
      let allRecords: DatabaseBarang[] = [];
      let from = 0;
      const limit = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: records, error } = await supabase
          .from('database_barang')
          .select('*')
          .range(from, from + limit - 1)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Fetch error:', error);
          break;
        }

        if (records && records.length > 0) {
          allRecords = [...allRecords, ...records as DatabaseBarang[]];
          from += limit;
          if (records.length < limit) {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }
      setData(allRecords);
    } catch (err) {
      console.error(err);
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

      // Map dynamic header names to column expectations loosely to make it easier for user
      const mappedData = parsedData.map(row => {
        const getVal = (possibleKeys: string[]) => {
          // Try exact match first (ignoring spaces and underscores)
          for (const pk of possibleKeys) {
            const exactKey = Object.keys(row).find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '') === pk.toLowerCase().replace(/[^a-z0-9]/g, ''));
            if (exactKey) return row[exactKey];
          }
          // Fallback to substring match
          for (const pk of possibleKeys) {
             const matchKey = Object.keys(row).find(k => k.toLowerCase().includes(pk));
             if (matchKey) return row[matchKey];
          }
          return '';
        };

        return {
          id: Math.random().toString(), // assign temporary ID for mapping
          goods_code: String(getVal(['kode barang', 'kode_barang', 'kode', 'goods_code', 'goods code']) || ''),
          goods_name: String(getVal(['nama barang', 'nama_barang', 'nama', 'goods_name', 'goods name']) || ''),
          warna: String(getVal(['warna', 'color']) || ''),
          category: String(getVal(['kategori', 'category']) || ''),
        };
      }).filter(item => item.goods_code || item.goods_name);

      if (mappedData.length === 0) {
        throw new Error("Tidak dapat menemukan kolom yang sesuai (goods_code, goods_name, dll)");
      }

      // Set to preview instead of directly saving to db
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
      // Remove temporary ID before inserting and deduplicate by goods_code
      const uniqueData = new Map();
      previewData.forEach(({ id, ...rest }) => {
        if (rest.goods_code) {
          uniqueData.set(rest.goods_code, rest);
        }
      });
      const dataToInsert = Array.from(uniqueData.values());
      
      const BATCH_SIZE = 500;
      for (let i = 0; i < dataToInsert.length; i += BATCH_SIZE) {
        const batch = dataToInsert.slice(i, i + BATCH_SIZE);
        const { error: insertError } = await supabase.from('database_barang').upsert(batch, { onConflict: 'goods_code' });
        if (insertError) throw insertError;
      }

      await fetchData(); // This will also reset previewData
      showAlert('Data berhasil disimpan ke database!', 'success');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Gagal menyimpan data ke database.');
    } finally {
      setIsSaving(false);
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

  const handleDeleteAll = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.from('database_barang').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all trick
      if (error) throw error;
      await fetchData();
    } catch (err) {
      console.error(err);
      showAlert('Gagal menghapus data', 'error');
      setLoading(false);
    }
  };

  const filteredData = (previewData || data).filter(d => {
    const namaTokoStr = String(d.goods_name || '').toLowerCase();
    const kodeStr = String(d.goods_code || '').toLowerCase();
    const warnaStr = String(d.warna || '').toLowerCase();
    const kategoriStr = String(d.category || '').toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    return namaTokoStr.includes(searchLower) || 
           kodeStr.includes(searchLower) ||
           warnaStr.includes(searchLower) ||
           kategoriStr.includes(searchLower);
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const prevPage = () => setCurrentPage(p => Math.max(1, p - 1));
  const nextPage = () => setCurrentPage(p => Math.min(totalPages, p + 1));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 mb-8">
        <h2 className="text-3xl font-black tracking-tight text-slate-800 flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200">
            <Package className="w-6 h-6 text-white" />
          </div>
          Database Barang
        </h2>
        <p className="text-slate-500 font-medium">Kelola master data barang (goods_code, goods_name, warna, category)</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 text-sm font-medium rounded-md border border-red-200 flex items-center">
          <AlertCircle className="w-4 h-4 mr-2" />
          {error}
        </div>
      )}

      {previewData && (
        <div className="p-4 bg-amber-50 text-amber-800 text-sm border border-amber-200 rounded-md flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="font-semibold block sm:inline">Mode Preview: </span>
            Ini adalah pratinjau data excel Anda. Data belum tersimpan ke database.
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setPreviewData(null)} disabled={isSaving}>Batal</Button>
            <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={handleSaveToDatabase} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Simpan ke Database ({previewData.length})
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <Card className="border-none shadow-xl shadow-slate-200/60 overflow-hidden">
            <div className="h-1 bg-indigo-600 w-full" />
            <CardHeader className="pt-6">
              <CardTitle className="text-lg font-black text-slate-800 uppercase tracking-tight">Upload Master Data</CardTitle>
              <CardDescription className="text-xs font-medium">
                Pilih file Excel (.xlsx) dengan kolom: kode_barang, nama_barang, warna, kategori.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div 
                {...getRootProps()} 
                className={`
                  group relative border-2 border-dashed rounded-3xl p-8 text-center transition-all duration-300 cursor-pointer
                  ${isDragActive ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-slate-50/50 hover:border-indigo-400 hover:bg-white'}
                `}
              >
                <input {...getInputProps()} />
                {isUploading ? (
                  <div className="flex flex-col items-center justify-center space-y-3 py-4">
                    <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                    <p className="text-xs text-slate-600 font-black uppercase tracking-widest">Memproses...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center space-y-4 py-4">
                    <div className="w-16 h-16 bg-white text-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-slate-100 group-hover:scale-110 group-hover:-rotate-3 transition-all">
                      <FileSpreadsheet className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-800">Tarik file ke sini</p>
                      <p className="text-[10px] text-slate-500 mt-1 font-medium">Atau klik untuk pilih file</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="h-full flex flex-col border-none shadow-xl shadow-slate-200/60 overflow-hidden">
            <div className="h-1 bg-slate-800 w-full opacity-10" />
            <CardHeader className="pb-3 border-b border-slate-50 bg-white">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <CardTitle className="text-lg flex items-center w-full md:w-auto">
                  <Package className="mr-2 h-5 w-5 text-indigo-500" />
                  Master Data
                  <span className="ml-2 px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full whitespace-nowrap">
                    {data.length} records
                  </span>
                </CardTitle>
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                  <div className="relative flex-1 md:w-64">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Cari kode, nama, atau kategori..." 
                      value={searchTerm}
                      onChange={e => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full pl-9 pr-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <Button variant="outline" size="icon" onClick={() => setIsDeleteAllModalOpen(true)} title="Hapus Semua Data" className="shrink-0">
                    <Trash className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <ConfirmModal
              isOpen={isDeleteAllModalOpen}
              onClose={() => setIsDeleteAllModalOpen(false)}
              onConfirm={handleDeleteAll}
              title="Hapus Semua Data"
              message="Yakin ingin menghapus seluruh data Barang? Tindakan ini tidak dapat dibatalkan."
              isDestructive={true}
              confirmText="Hapus Semua"
            />
            <CardContent className="p-0 flex-1 relative min-h-[400px]">
              <div className="absolute inset-0 overflow-auto">
                <table className="w-full text-sm text-left whitespace-nowrap">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3">Goods Code</th>
                      <th className="px-4 py-3">Goods Name</th>
                      <th className="px-4 py-3">Warna</th>
                      <th className="px-4 py-3">Category</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                          Memuat data...
                        </td>
                      </tr>
                    ) : paginatedData.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                          Belum ada data atau tidak ditemukan.
                        </td>
                      </tr>
                    ) : (
                      paginatedData.map((row) => (
                        <tr key={row.id} className="border-b hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-700">{row.goods_code}</td>
                          <td className="px-4 py-3 text-slate-900">{row.goods_name}</td>
                          <td className="px-4 py-3 text-slate-700">{row.warna}</td>
                          <td className="px-4 py-3 font-medium text-slate-500">{row.category}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t bg-slate-50 rounded-b-lg">
                <div className="text-sm text-slate-500">
                  Menampilkan {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredData.length)} dari {filteredData.length} data
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={prevPage} disabled={currentPage === 1}>Sebelumnya</Button>
                  <Button variant="outline" size="sm" onClick={nextPage} disabled={currentPage === totalPages}>Selanjutnya</Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
