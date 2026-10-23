import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { supabase } from '../../../services/supabase';
import { Search, Loader2, Calendar, Filter, Download, Trash2, Printer, Edit2, CheckCircle, RefreshCw, X, FileText, Check, Copy } from 'lucide-react';
import { cn } from '../../../utils/cn';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { ReturProcessModal } from './ReturProcessModal';
import { ReturEditModal } from './ReturEditModal';
import { ReturBulkEditModal } from './ReturBulkEditModal';
import { ReturPrintModal } from './ReturPrintModal';
import { useAlert } from '../../ui/AlertModal';

interface ReturRecord {
  id: string;
  customer_code: string;
  customer_name: string;
  return_date: string;
  category?: string;
  goods_code: string;
  goods_name: string;
  qty: number;
  finished_qty: number;
  status: 'Pending' | 'Partial' | 'Completed';
  description: string;
  retur_type?: string;
  no_so?: string;
  no_sd?: string;
  replacement_goods_code?: string;
  replacement_goods_name?: string;
  replacement_qty?: number;
  created_at: string;
}

interface ReturHistoryProps {
  categories: string[];
  isShared?: boolean;
  salesmanCode?: string;
}

export function ReturHistory({ categories, isShared, salesmanCode }: ReturHistoryProps) {
  const { showAlert, showConfirm } = useAlert();
  const [data, setData] = useState<ReturRecord[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [returTypeFilter, setReturTypeFilter] = useState('All');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const [processingRecord, setProcessingRecord] = useState<ReturRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<ReturRecord | null>(null);
  const [isBulkEditing, setIsBulkEditing] = useState(false);
  const [printRecords, setPrintRecords] = useState<ReturRecord[]>([]);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const handleOpenPrintModal = (records: ReturRecord[]) => {
    if (!records || records.length === 0) return;
    setPrintRecords(records);
    setIsPrintModalOpen(true);
  };

  useEffect(() => {
    fetchHistory();
    fetchProducts();
  }, [salesmanCode]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('retur_barang')
        .select('*');

      if (isShared && salesmanCode) {
        query = query.eq('salesman_code', salesmanCode);
      }

      const { data: res, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setData(res || []);
      setSelectedIds([]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      let all: any[] = [];
      let from = 0;
      let hasMore = true;
      while (hasMore) {
        const { data: res, error } = await supabase
          .from('database_barang')
          .select('goods_code, goods_name, warna')
          .range(from, from + 999);
        
        if (error) throw error;
        if (res && res.length > 0) {
          all = [...all, ...res.map(p => ({ 
            goods_code: p.goods_code, 
            goods_name: p.warna ? `${p.goods_name} ${p.warna}` : p.goods_name 
          }))];
          if (res.length < 1000) hasMore = false;
          else from += 1000;
        } else hasMore = false;
      }
      setProducts(all);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    showConfirm({
      message: 'Hapus data retur ini?',
      type: 'error',
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('retur_barang').delete().eq('id', id);
          if (error) throw error;
          setData(prev => prev.filter(item => item.id !== id));
          setSelectedIds(prev => prev.filter(i => i !== id));
          showAlert('Data retur berhasil dihapus', 'success');
        } catch (err) {
          console.error(err);
          showAlert('Gagal menghapus data', 'error');
        }
      }
    });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    
    showConfirm({
      message: `Hapus ${selectedIds.length} data terpilih?`,
      type: 'error',
      onConfirm: async () => {
        setLoading(true);
        try {
          const chunkSize = 50;
          for (let i = 0; i < selectedIds.length; i += chunkSize) {
            const chunk = selectedIds.slice(i, i + chunkSize);
            const { error } = await supabase.from('retur_barang').delete().in('id', chunk);
            if (error) throw error;
          }
          setData(prev => prev.filter(item => !selectedIds.includes(item.id)));
          setSelectedIds([]);
          showAlert(`${selectedIds.length} data berhasil dihapus`, 'success');
        } catch (err: any) {
          console.error(err);
          showAlert(`Gagal menghapus data masal: ${err.message}`, 'error');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleBulkStatusChange = async (newStatus: string) => {
    if (selectedIds.length === 0) return;
    setLoading(true);
    try {
      const chunkSize = 50;
      for (let i = 0; i < selectedIds.length; i += chunkSize) {
        const chunk = selectedIds.slice(i, i + chunkSize);
        const { error } = await supabase.from('retur_barang').update({ status: newStatus }).in('id', chunk);
        if (error) throw error;
      }
      setData(prev => prev.map(item => selectedIds.includes(item.id) ? { ...item, status: newStatus as any } : item));
    } catch (err: any) {
      console.error(err);
      showAlert(`Gagal update status masal: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredData.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredData.map(item => item.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase.from('retur_barang').update({ status: newStatus }).eq('id', id);
      if (error) throw error;
      setData(prev => prev.map(item => item.id === id ? { ...item, status: newStatus as any } : item));
    } catch (err) {
      console.error(err);
      showAlert('Gagal update status', 'error');
    }
  };

  const handleCopyText = (record: ReturRecord) => {
    let cleanDesc = record.description || '-';
    cleanDesc = cleanDesc.replace(/,\s*video\s*ok/gi, '')
                         .replace(/video\s*ok\s*,?/gi, '')
                         .replace(/,\s*no\s*video/gi, '')
                         .replace(/no\s*video\s*,?/gi, '')
                         .trim();
    // remove dangling commas
    cleanDesc = cleanDesc.replace(/^,\s*/, '').replace(/,\s*$/, '').trim();
    if (!cleanDesc) cleanDesc = '-';

    const soSdLine = [
      record.no_so ? `No SO : ${record.no_so}` : '',
      record.no_sd ? `No SD : ${record.no_sd}` : ''
    ].filter(Boolean).join('\n');

    const text = `Nama toko : ${record.customer_name}
Kode toko : ${record.customer_code}
Produk : ${record.goods_name}
Kode Produk : ${record.goods_code || '-'}
${soSdLine ? `${soSdLine}\n` : ''}Keterangan : ${cleanDesc}
Qty : ${record.qty}
@Achmad Sukmara @Dimas Awwaluddin Adha`;

    navigator.clipboard.writeText(text).then(() => {
      showAlert('Teks berhasil disalin!', 'success');
    }).catch(err => {
      console.error('Failed to copy text: ', err);
      showAlert('Gagal menyalin teks.', 'error');
    });
  };

  const exportToExcel = () => {
    const exportData = filteredData.map(item => ({
      'Tanggal Retur': format(new Date(item.return_date), 'dd/MM/yyyy'),
      'Tipe Retur': item.retur_type === 'lcd' ? 'Produk LCD' : 'All Kategori',
      'No SO': item.no_so || '-',
      'No SD': item.no_sd || '-',
      'Kategori': item.category || '-',
      'Kode Customer': item.customer_code,
      'Nama Customer': item.customer_name,
      'Kode Barang': item.goods_code,
      'Nama Barang': item.goods_name,
      'QTY': item.qty,
      'Status': item.status,
      'Keterangan': item.description
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'History Retur');
    XLSX.writeFile(wb, `Riwayat_Retur_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
  };

  const handlePrintLabels = (records: ReturRecord[]) => {
    handleOpenPrintModal(records);
  };

  const filteredData = data.filter(item => {
    const matchesSearch = 
      item.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.customer_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.goods_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.goods_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.no_so?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.no_sd?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
    
    const matchesReturType = 
      returTypeFilter === 'All' || 
      (returTypeFilter === 'lcd' && item.retur_type === 'lcd') ||
      (returTypeFilter === 'all' && item.retur_type !== 'lcd');

    const matchesDate = (!dateStart || item.return_date >= dateStart) && 
                       (!dateEnd || item.return_date <= dateEnd);

    return matchesSearch && matchesStatus && matchesReturType && matchesDate;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Partial': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center">
            <RefreshCw className={cn("w-5 h-5 mr-2 text-indigo-500", loading && "animate-spin")} />
            Riwayat Retur
          </h2>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mt-1">Total: {filteredData.length} records</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 pr-4 mr-4 border-r border-slate-200 animate-in fade-in slide-in-from-right-4">
              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{selectedIds.length} Terpilih</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  const selectedRecords = data.filter(r => selectedIds.includes(r.id));
                  handleOpenPrintModal(selectedRecords);
                }}
                title="Cetak Label Retur"
                className="rounded-xl border-indigo-200 text-indigo-600 font-bold h-10 px-4 hover:bg-indigo-50 flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span className="text-xs">Cetak</span>
              </Button>
              {!isShared && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsBulkEditing(true)}
                    className="rounded-xl border-blue-200 text-blue-600 font-bold h-10 px-4 hover:bg-blue-50"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleBulkStatusChange('Completed')}
                    className="rounded-xl border-emerald-200 text-emerald-600 font-bold h-10 px-4 hover:bg-emerald-50"
                  >
                    Done
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleBulkDelete}
                    className="rounded-xl border-rose-200 text-rose-600 font-bold h-10 px-4 hover:bg-rose-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={exportToExcel}
            className="rounded-xl border-slate-200 text-slate-700 font-bold h-10 px-4"
          >
            <Download className="w-4 h-4 mr-2" />
            Excel
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              setSearchTerm('');
              setDateStart('');
              setDateEnd('');
              setStatusFilter('All');
            }}
            className="rounded-xl text-slate-400 font-bold h-10 px-4"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-xl shadow-slate-200/50 overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative col-span-1 md:col-span-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text"
                placeholder="Cari toko, barang, No SO, No SD..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            
            <div className="flex items-center gap-2 col-span-1 md:col-span-2">
              <div className="relative flex-1">
                <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="date"
                  value={dateStart}
                  onChange={(e) => setDateStart(e.target.value)}
                  className="w-full pl-9 pr-2 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-700 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <span className="text-slate-400 font-bold">-</span>
              <div className="relative flex-1">
                <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="date"
                  value={dateEnd}
                  onChange={(e) => setDateEnd(e.target.value)}
                  className="w-full pl-9 pr-2 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-700 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 col-span-1">
              <select 
                value={returTypeFilter}
                onChange={(e) => setReturTypeFilter(e.target.value as any)}
                className="w-1/2 px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-700 focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="All">Semua Tipe</option>
                <option value="lcd">Khusus LCD</option>
                <option value="all">Non-LCD</option>
              </select>
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-1/2 px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-700 focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="All">Semua Status</option>
                <option value="Pending">Pending</option>
                <option value="Partial">Partial</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 w-10">
                    <input 
                      type="checkbox" 
                      checked={selectedIds.length === filteredData.length && filteredData.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </th>
                  <th className="px-6 py-4">Produk & Type</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4 text-center">Qty</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={6} className="px-6 py-8 bg-slate-50/20"></td>
                    </tr>
                  ))
                ) : filteredData.length > 0 ? (
                  filteredData.map((record) => (
                    <tr key={record.id} className={cn("group hover:bg-slate-50/50 transition-colors", selectedIds.includes(record.id) && "bg-indigo-50/30")}>
                      <td className="px-6 py-4">
                        <input 
                          type="checkbox" 
                          checked={selectedIds.includes(record.id)}
                          onChange={() => toggleSelect(record.id)}
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-slate-800">{record.goods_name}</span>
                          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                            <span className="text-[10px] font-mono font-bold text-slate-500 tracking-tight">
                              {record.goods_code}
                            </span>
                            {record.retur_type === 'lcd' ? (
                              <span className="text-[8.5px] font-black text-cyan-700 bg-cyan-100 px-1.5 py-0.5 rounded uppercase">
                                LCD
                              </span>
                            ) : record.category ? (
                              <span className="text-[8.5px] font-black text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded uppercase">
                                {record.category}
                              </span>
                            ) : null}
                          </div>
                          {(record.no_so || record.no_sd) && (
                            <div className="flex items-center gap-2 mt-1 text-[9.5px] font-bold text-slate-500">
                              {record.no_so && <span>SO: <strong className="text-slate-700 font-mono">{record.no_so}</strong></span>}
                              {record.no_sd && <span>SD: <strong className="text-slate-700 font-mono">{record.no_sd}</strong></span>}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-slate-800">{record.customer_name}</span>
                          <span className="text-[10px] font-bold text-slate-400 tracking-tight">{record.customer_code}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-base font-black">
                          {record.qty}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border", getStatusColor(record.status))}>
                            {record.status}
                          </span>
                          {record.finished_qty > 0 && (
                            <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase">
                              Finished: {record.finished_qty}/{record.qty}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            variant="default" 
                            size="icon" 
                            onClick={() => handleCopyText(record)}
                            title="Copy Text"
                            className="h-8 w-8 bg-slate-500 hover:bg-slate-600 text-white shadow-sm"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="default" 
                            size="icon" 
                            onClick={() => handlePrintLabels([record])}
                            title="Print Label"
                            className="h-8 w-8 bg-indigo-500 hover:bg-indigo-600 text-white shadow-sm"
                          >
                            <Printer className="w-4 h-4" />
                          </Button>
                          {!isShared && (
                            <>
                              <Button 
                                variant="default" 
                                size="icon" 
                                onClick={() => setEditingRecord(record)}
                                title="Edit"
                                className="h-8 w-8 bg-blue-500 hover:bg-blue-600 text-white shadow-sm"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="default" 
                                size="icon" 
                                onClick={() => setProcessingRecord(record)}
                                title="Proses"
                                className="h-8 w-8 bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="default" 
                                size="icon" 
                                onClick={() => handleDelete(record.id)}
                                title="Hapus"
                                className="h-8 w-8 bg-rose-500 hover:bg-rose-600 text-white shadow-sm"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-bold italic">
                      Tidak ada data ditemukan
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <ReturProcessModal 
        isOpen={!!processingRecord}
        record={processingRecord}
        onClose={() => setProcessingRecord(null)}
        onSuccess={fetchHistory}
        products={products}
      />

      <ReturEditModal 
        isOpen={!!editingRecord}
        record={editingRecord}
        onClose={() => setEditingRecord(null)}
        onSuccess={fetchHistory}
        categories={categories}
      />

      <ReturBulkEditModal 
        isOpen={isBulkEditing}
        selectedIds={selectedIds}
        onClose={() => setIsBulkEditing(false)}
        onSuccess={() => {
          fetchHistory();
          setSelectedIds([]);
        }}
      />

      <ReturPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        records={printRecords}
      />
    </div>
  );
}
