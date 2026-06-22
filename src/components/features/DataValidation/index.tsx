import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../services/supabase';
import { useAlert } from '../../ui/AlertModal';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Loader2, Search, Database, Download, FilterX, RefreshCcw } from 'lucide-react';
import * as XLSX from 'xlsx';

const TABLE_LIST = [
  { id: 'raw_master_data', name: 'Master Data / Raw Master' },
  { id: 'salesman_customer', name: 'Salesman & Customer' },
  { id: 'database_barang', name: 'Database Barang' },
  { id: 'lcd_catalog_products', name: 'Katalog LCD (Produk)' },
  { id: 'survey_channel', name: 'Survey Channel' },
  { id: 'target_salesman', name: 'Target Salesman' },
  { id: 'retur_barang', name: 'Retur Barang' },
];

export function DataValidation() {
  const { showAlert } = useAlert();
  const [selectedTable, setSelectedTable] = useState<string>('raw_master_data');
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Table state
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const rowsPerPage = 50;

  const loadTableData = async () => {
    if (!selectedTable) return;
    setLoading(true);
    setFilters({});
    setPage(1);
    
    try {
      let allData: any[] = [];
      let hasMore = true;
      let from = 0;
      const step = 1000;
      
      while(hasMore) {
        const { data: chunk, error } = await supabase
          .from(selectedTable)
          .select('*')
          .range(from, from + step - 1);
          
        if (error) {
           throw error;
        }
        
        if (chunk && chunk.length > 0) {
          allData = [...allData, ...chunk];
          from += step;
          // hard limit 15,000 for browser safety
          if (chunk.length < step || allData.length >= 15000) {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }

      setData(allData);
      
      const cols = new Set<string>();
      allData.forEach(row => {
        Object.keys(row).forEach(k => cols.add(k));
      });
      setColumns(Array.from(cols));
      
      if (allData.length === 0) {
        showAlert('Tabel kosong atau tidak ada data yang ditemukan.', 'info');
      }
    } catch (err: any) {
      console.error(err);
      showAlert(`Gagal memuat data: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (col: string, val: string) => {
    setFilters(prev => ({
      ...prev,
      [col]: val
    }));
    setPage(1); // reset to page 1 on filter
  };

  const clearFilters = () => {
    setFilters({});
    setPage(1);
  };

  // derived filtered data
  const filteredData = useMemo(() => {
    return data.filter(row => {
      for (const col of Object.keys(filters)) {
        const query = filters[col].toLowerCase();
        if (!query) continue;
        const val = row[col] !== null && row[col] !== undefined ? String(row[col]).toLowerCase() : '';
        if (!val.includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [data, filters]);

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const currentData = filteredData.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const exportToExcel = () => {
    if (filteredData.length === 0) return;
    try {
      const ws = XLSX.utils.json_to_sheet(filteredData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Data Validasi");
      XLSX.writeFile(wb, `ValidasiData_${selectedTable}.xlsx`);
    } catch (e: any) {
      showAlert('Gagal export ke Excel: ' + e.message, 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden p-2 sm:p-4">
      {/* Header Info Banner */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-2xl font-black mb-2 flex items-center gap-2">
            <Database className="w-6 h-6" />
            Validasi Data & Pengecekan Database
          </h2>
          <p className="text-indigo-100 max-w-2xl text-sm leading-relaxed">
            Pilih tabel untuk mengecek isi datanya seperti di Excel. Anda dapat memfilter setiap kolom secara real-time untuk memastikan hasil upload excel sesuai dengan yang tersimpan di database.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
          <div className="flex flex-col sm:flex-row gap-4 items-end justify-between">
            <div className="w-full sm:w-1/3">
              <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Pilih Tabel Database</label>
              <select
                value={selectedTable}
                onChange={(e) => setSelectedTable(e.target.value)}
                className="w-full border-2 border-slate-200 rounded-xl p-2.5 bg-white text-slate-800 font-bold focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
              >
                {TABLE_LIST.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.id})</option>
                ))}
              </select>
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto">
              <Button 
                onClick={loadTableData}
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex-1 sm:flex-none shadow-md"
              >
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCcw className="w-4 h-4 mr-2" />}
                Tampilkan Data
              </Button>
              {data.length > 0 && (
                <Button 
                  onClick={exportToExcel}
                  variant="outline"
                  className="font-bold border-emerald-200 text-emerald-700 hover:bg-emerald-50 bg-white"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Excel
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center">
              <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
              <p className="mt-4 text-sm font-bold text-slate-500 animate-pulse uppercase tracking-widest">
                Mengunduh Data Database...
              </p>
            </div>
          ) : data.length > 0 ? (
            <div className="flex flex-col">
              {/* Toolbar */}
              <div className="p-4 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between bg-white">
                <div className="text-sm font-medium text-slate-600">
                  Total Data: <span className="font-black text-indigo-600">{filteredData.length}</span> baris
                  {filteredData.length !== data.length && ` (Difilter dari total ${data.length})`}
                </div>
                {Object.values(filters).some(v => v !== '') && (
                  <Button 
                    onClick={clearFilters}
                    size="sm"
                    variant="outline"
                    className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
                  >
                    <FilterX className="w-3.5 h-3.5 mr-1" />
                    Reset Filter
                  </Button>
                )}
              </div>

              {/* Table Wrapper for horizontal scroll */}
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-slate-50 text-slate-600">
                    {/* Headers */}
                    <tr>
                      <th className="py-2 px-3 font-bold border-b border-r border-slate-200 bg-slate-100 sticky left-0 z-10 w-12 text-center">
                        No.
                      </th>
                      {columns.map(col => (
                        <th key={col} className="py-2 px-3 font-bold border-b border-slate-200 whitespace-nowrap bg-slate-50">
                          {col}
                        </th>
                      ))}
                    </tr>
                    {/* Filter Inputs Row */}
                    <tr>
                      <th className="py-1 px-3 border-b border-r border-slate-200 bg-slate-100 sticky left-0 z-10"></th>
                      {columns.map(col => (
                        <th key={`filter-${col}`} className="py-1.5 px-2 border-b border-slate-200 bg-white">
                          <div className="relative">
                            <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="text"
                              placeholder={`Filter ${col}...`}
                              value={filters[col] || ''}
                              onChange={(e) => handleFilterChange(col, e.target.value)}
                              className="w-full pl-7 pr-2 py-1 text-xs border border-slate-200 rounded-md focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none bg-slate-50 font-normal transition-all"
                            />
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {currentData.length === 0 ? (
                      <tr>
                        <td colSpan={columns.length + 1} className="py-12 text-center text-slate-500">
                          Tidak ada data yang sesuai dengan filter.
                        </td>
                      </tr>
                    ) : (
                      currentData.map((row, idx) => (
                        <tr key={idx} className="border-b border-slate-100 hover:bg-indigo-50/50 transition-colors group">
                          <td className="py-2 px-3 text-slate-400 font-mono text-xs border-r border-slate-100 bg-white/50 group-hover:bg-indigo-50/50 sticky left-0 text-center">
                            {(page - 1) * rowsPerPage + idx + 1}
                          </td>
                          {columns.map(col => {
                            let valStr = row[col] !== null && row[col] !== undefined ? String(row[col]) : '';
                            // Truncate overly long strings for display
                            const isLong = valStr.length > 100;
                            return (
                              <td key={`${idx}-${col}`} className="py-2 px-3 text-slate-700 whitespace-nowrap max-w-xs overflow-hidden text-ellipsis" title={isLong ? valStr : undefined}>
                                {valStr}
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-slate-50 border-t border-slate-100 gap-4">
                  <div className="text-sm font-medium text-slate-500">
                    Menampilkan <span className="text-slate-800 font-bold">{(page - 1) * rowsPerPage + 1}</span> hingga <span className="text-slate-800 font-bold">{Math.min(page * rowsPerPage, filteredData.length)}</span> dari <span className="text-slate-800 font-bold">{filteredData.length}</span> data
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-4 py-2"
                    >
                      Sebelumnya
                    </Button>
                    <div className="flex items-center px-4 font-black text-sm text-indigo-700 bg-indigo-50 rounded-md border border-indigo-100">
                      Hal. {page} / {totalPages}
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      className="px-4 py-2"
                    >
                      Selanjutnya
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-20 text-center flex flex-col items-center">
              <Database className="w-16 h-16 text-slate-200 mb-4" />
              <h3 className="text-lg font-bold text-slate-400">Pilih Tabel untuk Memulai</h3>
              <p className="text-slate-500 text-sm mt-1 max-w-sm">
                Klik tombol "Tampilkan Data" untuk mengambil seluruh isi tabel dari database.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
