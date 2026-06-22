import React, { useState, useEffect } from 'react';
import { Loader2, Search, Target } from 'lucide-react';
import { supabase } from '../../../services/supabase';
import { useAlert } from '../../ui/AlertModal';

export function ManualKpiLogger({ 
  salesmanCode, 
  metricId, 
  periodMonth, 
  periodYear,
  onSave
}: { 
  salesmanCode: string, 
  metricId: string, 
  periodMonth: number, 
  periodYear: number,
  onSave: () => void
}) {
  const { showAlert } = useAlert();
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<{code: string, name: string} | null>(null);
  const [subType, setSubType] = useState<'Pasang Spanduk' | 'Pasang Stiker'>('Pasang Spanduk');
  const [isSaving, setIsSaving] = useState(false);

  // Close modal with Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onSave();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const fetchCustomers = async (searchStr: string, pageNum: number, append: boolean = false) => {
    setIsLoading(true);
    try {
      const from = pageNum * 20;
      const to = from + 19;
      
      let query = supabase
        .from('salesman_customer')
        .select('customer_code, customer_name')
        .eq('salesman_code', salesmanCode)
        .order('customer_name', { ascending: true })
        .range(from, to);

      if (searchStr) {
        query = query.ilike('customer_name', `%${searchStr}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (append) {
        setCustomers(prev => [...prev, ...(data || [])]);
      } else {
        setCustomers(data || []);
      }
      setHasMore((data || []).length === 20);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(0);
      fetchCustomers(search, 0);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, salesmanCode]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchCustomers(search, nextPage, true);
  };

  const handleSave = async () => {
    if (!selectedCustomer) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('salesman_manual_activities')
        .insert({
          salesman_code: salesmanCode,
          customer_code: selectedCustomer.code,
          customer_name: selectedCustomer.name,
          activity_type: metricId === 'perbaikan_display' ? 'perbaikan_display' : 'pemasangan_spanduk_stiker',
          sub_activity_type: metricId === 'pemasangan_spanduk' ? subType : null,
          period_month: periodMonth,
          period_year: periodYear
        });

      if (error) throw error;
      setSelectedCustomer(null);
      setSearch('');
      onSave();
    } catch (err) {
      console.error(err);
      showAlert('Gagal menyimpan data.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white border rounded-lg p-4 shadow-sm mb-4">
      <h5 className="text-xs font-black uppercase text-slate-800 mb-3 flex items-center gap-2">
        <Target className="w-3.5 h-3.5 text-indigo-500" /> Log Aktivitas Manual
      </h5>
      
      <div className="space-y-4">
        {!selectedCustomer ? (
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Cari & Pilih Customer</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Nama atau Kode Customer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            
            <div className="mt-2 max-h-48 overflow-y-auto border rounded-md divide-y custom-scrollbar">
              {isLoading && page === 0 && <div className="p-4 text-center text-xs text-slate-400">Memuat customer...</div>}
              {customers.map((c, i) => (
                <button 
                  key={i} 
                  onClick={() => setSelectedCustomer({ code: c.customer_code, name: c.customer_name })}
                  className="w-full text-left p-2.5 text-xs hover:bg-slate-50 transition-colors flex flex-col"
                >
                  <span className="font-bold text-slate-700">{c.customer_name}</span>
                  <span className="text-[10px] text-slate-400">{c.customer_code}</span>
                </button>
              ))}
              {hasMore && !isLoading && (
                <button 
                  onClick={loadMore}
                  className="w-full p-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50"
                >
                  Muat Lebih Banyak
                </button>
              )}
              {!isLoading && customers.length === 0 && (
                <div className="p-4 text-center text-xs text-slate-400 italic">Customer tidak ditemukan.</div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-indigo-50 p-3 rounded-md flex justify-between items-center border border-indigo-100">
            <div>
              <p className="text-[10px] font-bold text-indigo-600 uppercase">Customer Terpilih</p>
              <p className="text-sm font-black text-slate-800">{selectedCustomer.name}</p>
            </div>
            <button 
              onClick={() => setSelectedCustomer(null)}
              className="text-[10px] font-bold text-rose-500 hover:underline"
            >
              Ganti
            </button>
          </div>
        )}

        {metricId === 'pemasangan_spanduk' && (
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tipe Pemasangan</label>
            <select 
              value={subType}
              onChange={(e) => setSubType(e.target.value as any)}
              className="w-full text-sm border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="Pasang Spanduk">Pasang Spanduk</option>
              <option value="Pasang Stiker">Pasang Stiker</option>
            </select>
          </div>
        )}

        <button 
          onClick={handleSave}
          disabled={!selectedCustomer || isSaving}
          className="w-full py-2.5 bg-indigo-600 text-white rounded-md text-sm font-black shadow-sm shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'SIMPAN AKTIVITAS'}
        </button>
      </div>
    </div>
  );
}
