import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Database, 
  Upload, 
  Trash2, 
  Layers, 
  Store, 
  FileText, 
  ShoppingBag, 
  Sparkles,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { ConfirmModal } from '../../ui/ConfirmModal';
import { useAlert } from '../../ui/AlertModal';
import { supabase } from '../../../services/supabase';
import { DatabaseLcdItem, DatabaseLcdStats } from './types';
import { DatabaseLcdUpload } from './DatabaseLcdUpload';
import { DatabaseLcdTable } from './DatabaseLcdTable';

export function DatabaseLcd() {
  const { showAlert } = useAlert();
  const [data, setData] = useState<DatabaseLcdItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch all records using chunked range per RULE[AGENTS_md]
  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      let allRecords: DatabaseLcdItem[] = [];
      let from = 0;
      const limit = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: records, error } = await supabase
          .from('database_lcd')
          .select('*')
          .range(from, from + limit - 1)
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('Error fetching database_lcd:', error);
          // If table doesn't exist yet, show helpful hint
          if (error.code === '42P01' || error.message.includes('relation "database_lcd" does not exist')) {
            setErrorMessage('Tabel database_lcd belum dibuat di Supabase. Silakan buka menu "DB Setup" dan jalankan query setup.');
          }
          break;
        }

        if (records && records.length > 0) {
          allRecords = [...allRecords, ...records as DatabaseLcdItem[]];
          from += limit;
          if (records.length < limit) {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }

      setData(allRecords);
    } catch (err: any) {
      console.error('Fetch database_lcd error:', err);
      setErrorMessage(err?.message || 'Terjadi kesalahan saat mengambil data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate statistics
  const stats: DatabaseLcdStats = useMemo(() => {
    const custSet = new Set<string>();
    const soSet = new Set<string>();
    const prodSet = new Set<string>();

    data.forEach(item => {
      if (item.kode_customer) custSet.add(item.kode_customer);
      else if (item.nama_customer) custSet.add(item.nama_customer);

      if (item.no_so) soSet.add(item.no_so);
      if (item.kode_barang) prodSet.add(item.kode_barang);
    });

    return {
      total: data.length,
      uniqueCustomers: custSet.size,
      uniqueSo: soSet.size,
      uniqueProducts: prodSet.size
    };
  }, [data]);

  const handleDeleteRow = async (id: string) => {
    try {
      const { error } = await supabase
        .from('database_lcd')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setData(prev => prev.filter(r => r.id !== id));
      showAlert('Data berhasil dihapus', 'success');
    } catch (err: any) {
      console.error('Error deleting row:', err);
      showAlert(err?.message || 'Gagal menghapus baris data', 'error');
    }
  };

  const handleDeleteAll = async () => {
    setIsDeletingAll(true);
    try {
      const { error } = await supabase
        .from('database_lcd')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (error) throw error;
      setData([]);
      showAlert('Semua data di database LCD berhasil dihapus', 'success');
      setIsDeleteAllOpen(false);
    } catch (err: any) {
      console.error('Error deleting all rows:', err);
      showAlert(err?.message || 'Gagal menghapus data', 'error');
    } finally {
      setIsDeletingAll(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white flex items-center justify-center shadow-md shadow-indigo-100">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
              Database LCD
              <span className="text-[10px] uppercase font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200/60">
                Live Excel
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Upload file Excel master LCD. Terhubung otomatis ke menu Retur Barang saat retur produk LCD.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            type="button"
            onClick={() => setShowUpload(!showUpload)}
            className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 shadow-sm rounded-xl px-4 py-2"
          >
            <Upload className="w-4 h-4" />
            <span>{showUpload ? 'Tutup Upload' : 'Upload File Excel'}</span>
          </Button>

          {data.length > 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteAllOpen(true)}
              className="text-xs border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 flex items-center gap-1.5 rounded-xl px-3 py-2"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Semua</span>
            </Button>
          )}
        </div>
      </div>

      {/* Database Setup Warning if table doesn't exist */}
      {errorMessage && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-900 text-xs">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-sm">Perhatian Skema Database</p>
            <p>{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Baris LCD</div>
            <div className="text-lg font-black text-slate-800">
              {stats.total.toLocaleString('id-ID')}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Toko / Customer</div>
            <div className="text-lg font-black text-slate-800">
              {stats.uniqueCustomers.toLocaleString('id-ID')}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">No SO Unik</div>
            <div className="text-lg font-black text-slate-800">
              {stats.uniqueSo.toLocaleString('id-ID')}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Kode Barang Unik</div>
            <div className="text-lg font-black text-slate-800">
              {stats.uniqueProducts.toLocaleString('id-ID')}
            </div>
          </div>
        </div>
      </div>

      {/* Upload Section (collapsible / toggleable) */}
      {showUpload && (
        <DatabaseLcdUpload
          onUploadSuccess={() => {
            fetchData();
            showAlert('Data Excel berhasil disimpan ke Database LCD!', 'success');
          }}
          onClose={() => setShowUpload(false)}
        />
      )}

      {/* Live Table with 20-30 rows pagination */}
      <DatabaseLcdTable
        data={data}
        loading={loading}
        onRefresh={fetchData}
        onDeleteRow={handleDeleteRow}
      />

      {/* Confirm Delete All Modal */}
      <ConfirmModal
        isOpen={isDeleteAllOpen}
        title="Hapus Seluruh Data Database LCD"
        message={`Apakah Anda yakin ingin menghapus semua ${data.length.toLocaleString('id-ID')} data di Database LCD? Tindakan ini tidak dapat dibatalkan.`}
        confirmText={isDeletingAll ? 'Menghapus Semua...' : 'Ya, Hapus Semua'}
        isDestructive={true}
        onConfirm={handleDeleteAll}
        onClose={() => setIsDeleteAllOpen(false)}
      />
    </div>
  );
}
export default DatabaseLcd;
