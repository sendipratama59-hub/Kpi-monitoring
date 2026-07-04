import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../services/supabase';
import { Search, Eye, EyeOff, Download, RefreshCw, AlertCircle, FileSpreadsheet, ChevronDown } from 'lucide-react';
import * as XLSX from 'xlsx';

export function LiveExcel({ isMobile = false }: { isMobile?: boolean }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [selectedTable, setSelectedTable] = useState('salesman_kpi');
  
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const [periodMonth, setPeriodMonth] = useState<number>(currentMonth);
  const [periodYear, setPeriodYear] = useState<number>(currentYear);
  
  const userRole = localStorage.getItem('user_role') || 'admin';
  const loggedInSalesmanName = localStorage.getItem('salesman_name') || '';
  
  const [salesmen, setSalesmen] = useState<string[]>([]);
  const [selectedSalesman, setSelectedSalesman] = useState<string>(
    userRole === 'salesman' && loggedInSalesmanName ? loggedInSalesmanName : 'all'
  );

  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({});
  const [openFilterCol, setOpenFilterCol] = useState<string | null>(null);
  const [filterSearchQuery, setFilterSearchQuery] = useState<string>('');
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set(['id', 'created_at', 'updated_at', 'upload_batch']));

  const tables = [
    { id: 'salesman_kpi', label: 'Data KPI (Omset)' },
    { id: 'salesman_payments', label: 'Data Pembayaran' },
    { id: 'piutang_customer', label: 'Data Piutang Customer' },
    { id: 'visit_customer', label: 'Data Visit Customer' },
    { id: 'program_bulanan', label: 'Data Program Bulanan' },
    { id: 'program_spu', label: 'Data Program SPU' },
  ];

  useEffect(() => {
    fetchSalesmen();
  }, []);

  useEffect(() => {
    fetchData();
  }, [selectedTable, periodMonth, periodYear, selectedSalesman]);

  const fetchSalesmen = async () => {
    try {
      const { data: kpiTargets, error } = await supabase
        .from('salesman_kpi_targets')
        .select('salesman_name')
        .order('salesman_name');
      
      if (!error && kpiTargets) {
        const names = Array.from(new Set(kpiTargets.map(k => k.salesman_name).filter(Boolean)));
        setSalesmen(names);
      }
    } catch (err) {
      console.error('Error fetching salesmen:', err);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setColumnFilters({});
    try {
      let query = supabase
        .from(selectedTable)
        .select('*');
        
      if (selectedTable !== 'database_customer' && selectedTable !== 'database_barang') {
        query = query.eq('period_month', periodMonth).eq('period_year', periodYear);
      }
      
      if (selectedSalesman !== 'all') {
        query = query.ilike('salesman_name', `%${selectedSalesman}%`);
      } else if (userRole === 'salesman' && loggedInSalesmanName) {
        query = query.ilike('salesman_name', `%${loggedInSalesmanName}%`);
      }
      
      const { data: resultData, error } = await query;
      
      if (error) throw error;
      
      setData(resultData || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const allColumns = useMemo(() => {
    if (data.length === 0) return [];
    return Object.keys(data[0]);
  }, [data]);

  const visibleColumns = useMemo(() => {
    return allColumns.filter(col => !hiddenColumns.has(col));
  }, [allColumns, hiddenColumns]);

  const filteredData = useMemo(() => {
    return data.filter(row => {
      return Object.entries(columnFilters).every(([col, filterVals]) => {
        if (!filterVals || filterVals.length === 0) return true;
        const cellValue = String(row[col] ?? '');
        return filterVals.includes(cellValue);
      });
    });
  }, [data, columnFilters]);

  const handleFilterToggle = (col: string, val: string) => {
    setColumnFilters(prev => {
      const current = prev[col] || [];
      if (current.includes(val)) {
        return { ...prev, [col]: current.filter(v => v !== val) };
      } else {
        return { ...prev, [col]: [...current, val] };
      }
    });
  };

  const getColumnTotal = (col: string) => {
    const isNumericColumn = ['amount', 'omset', 'target', 'achieve', 'total', 'harga', 'price', 'qty', 'quantity'].some(kw => col.toLowerCase().includes(kw));
    if (!isNumericColumn) return null;

    let sum = 0;
    let hasNumeric = false;
    for (const row of filteredData) {
      const val = row[col];
      if (typeof val === 'number') {
        sum += val;
        hasNumeric = true;
      } else if (typeof val === 'string' && !isNaN(Number(val)) && val.trim() !== '') {
        sum += Number(val);
        hasNumeric = true;
      }
    }

    if (!hasNumeric) return null;

    if (['amount', 'omset', 'harga', 'price'].some(kw => col.toLowerCase().includes(kw))) {
      return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(sum);
    }
    return new Intl.NumberFormat('id-ID').format(sum);
  };

  const toggleColumn = (col: string) => {
    setHiddenColumns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(col)) newSet.delete(col);
      else newSet.add(col);
      return newSet;
    });
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    XLSX.writeFile(wb, `LiveExcel_${selectedTable}_${periodMonth}_${periodYear}.xlsx`);
  };

  return (
    <div className={`flex flex-col ${isMobile ? 'h-full bg-slate-50' : 'h-full p-6 bg-slate-50 min-h-screen'}`}>
      <div className={`${isMobile ? 'p-2 bg-white border-b border-slate-100 shadow-sm shrink-0 flex justify-between items-center' : 'mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4'}`}>
        <div>
          <h1 className="text-lg sm:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
            Live Excel
          </h1>
          <p className="hidden sm:block text-slate-500 text-sm mt-1">Lihat dan filter data upload langsung dari database</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="flex items-center gap-1 sm:gap-2 px-2 py-1 sm:px-3 sm:py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 text-xs sm:text-sm font-medium transition-colors">
            <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button onClick={exportToExcel} className="flex items-center gap-1 sm:gap-2 px-2 py-1 sm:px-3 sm:py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 text-xs sm:text-sm font-medium transition-colors">
            <Download className="w-3 h-3 sm:w-4 sm:h-4" />
            Export
          </button>
        </div>
      </div>

      <div className={`bg-white ${isMobile ? 'p-2 border-b border-slate-100 shrink-0' : 'rounded-xl shadow-sm border border-slate-200 p-4 mb-4'} flex flex-col gap-2 sm:gap-4`}>
        <div className="flex flex-col flex-wrap sm:flex-row gap-2 sm:gap-4">
          <div className="flex-1 min-w-[140px] sm:min-w-[200px]">
            <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-tight mb-1">Sumber Data</label>
            <select 
              value={selectedTable}
              onChange={e => setSelectedTable(e.target.value)}
              className="w-full text-xs sm:text-sm border border-slate-300 rounded sm:rounded-lg px-2 py-1 sm:px-3 sm:py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            >
              {tables.map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>
          
          <div className="flex flex-row gap-2 w-full sm:w-auto">
            <div className="flex-1 sm:w-32">
              <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-tight mb-1">Bulan</label>
              <select 
                value={periodMonth}
                onChange={e => setPeriodMonth(Number(e.target.value))}
                className="w-full text-xs sm:text-sm border border-slate-300 rounded sm:rounded-lg px-2 py-1 sm:px-3 sm:py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>{new Date(2024, m - 1).toLocaleString('id-ID', { month: 'long' })}</option>
                ))}
              </select>
            </div>

            <div className="flex-1 sm:w-32">
              <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-tight mb-1">Tahun</label>
              <select 
                value={periodYear}
                onChange={e => setPeriodYear(Number(e.target.value))}
                className="w-full text-xs sm:text-sm border border-slate-300 rounded sm:rounded-lg px-2 py-1 sm:px-3 sm:py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              >
                {[2024, 2025, 2026, 2027].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {userRole === 'admin' && (
            <div className="flex-1 min-w-[140px] sm:min-w-[200px]">
              <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-tight mb-1">Salesman</label>
              <select 
                value={selectedSalesman}
                onChange={e => setSelectedSalesman(e.target.value)}
                className="w-full text-xs sm:text-sm border border-slate-300 rounded sm:rounded-lg px-2 py-1 sm:px-3 sm:py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              >
                <option value="all">Semua Salesman</option>
                {salesmen.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className={`bg-white flex-1 flex flex-col min-h-0 ${isMobile ? '' : 'rounded-xl shadow-sm border border-slate-200 mt-4'}`}>
        <div className={`${isMobile ? 'p-2' : 'p-4'} border-b border-slate-100 overflow-x-auto flex gap-2 hide-scrollbar shrink-0`}>
          {allColumns.map(col => {
            const isHidden = hiddenColumns.has(col);
            return (
              <button
                key={col}
                onClick={() => toggleColumn(col)}
                className={`flex-shrink-0 flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-medium transition-colors border ${isHidden ? 'bg-slate-50 border-slate-200 text-slate-400' : 'bg-indigo-50 border-indigo-200 text-indigo-700'}`}
              >
                {isHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                {col}
              </button>
            )
          })}
        </div>

        <div className="flex-1 overflow-auto w-full relative">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-indigo-600"></div>
              <span className="text-sm font-medium text-slate-500">Memuat data...</span>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-500">
              <AlertCircle className="w-12 h-12 text-slate-300" />
              <span className="text-sm font-medium">Tidak ada data ditemukan</span>
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-max">
              <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-2 py-1.5 sm:px-4 sm:py-3 border-b border-slate-200 text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50 sticky top-0 z-20 shadow-sm">
                    No
                  </th>
                  {visibleColumns.map(col => {
                    const uniqueValues = Array.from(new Set(data.map(row => String(row[col] ?? '')))).sort();
                    const filterOptions = uniqueValues.filter(v => v.toLowerCase().includes(filterSearchQuery.toLowerCase()));
                    const selectedCount = (columnFilters[col] || []).length;
                    return (
                    <th key={col} className="px-2 py-1.5 sm:px-4 sm:py-3 border-b border-slate-200 text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50 sticky top-0 z-20 shadow-sm">
                      <div className="flex flex-col gap-2 relative">
                        <span>{col}</span>
                        <div className="relative">
                          <button
                            onClick={() => {
                              if (openFilterCol === col) {
                                setOpenFilterCol(null);
                              } else {
                                setOpenFilterCol(col);
                                setFilterSearchQuery('');
                              }
                            }}
                            className="w-full min-w-[120px] text-xs font-normal border border-slate-300 rounded px-2 py-1 flex justify-between items-center bg-white hover:bg-slate-50"
                          >
                            <span className="truncate max-w-[90px]">
                              {selectedCount > 0 ? `${selectedCount} dipilih` : 'Semua'}
                            </span>
                            <ChevronDown className="w-3 h-3 text-slate-400" />
                          </button>
                          
                          {openFilterCol === col && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setOpenFilterCol(null)}></div>
                              <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-xl z-50 flex flex-col max-h-64">
                                <div className="p-2 border-b border-slate-100 shrink-0">
                                  <input
                                    type="text"
                                    autoFocus
                                    placeholder="Cari..."
                                    value={filterSearchQuery}
                                    onChange={(e) => setFilterSearchQuery(e.target.value)}
                                    className="w-full text-xs font-normal border border-slate-300 rounded px-2 py-1 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                  />
                                </div>
                                <div className="p-2 border-b border-slate-100 flex justify-between items-center shrink-0">
                                  <button
                                    onClick={() => setColumnFilters(p => ({ ...p, [col]: [] }))}
                                    className="text-[10px] font-semibold text-rose-600 hover:text-rose-700"
                                  >
                                    Reset
                                  </button>
                                  <button
                                    onClick={() => setColumnFilters(p => ({ ...p, [col]: filterOptions }))}
                                    className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-700"
                                  >
                                    Pilih Semua
                                  </button>
                                </div>
                                <div className="p-2 overflow-y-auto flex-1 flex flex-col gap-1 font-normal">
                                  {filterOptions.map(val => (
                                    <label key={val} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer p-1.5 hover:bg-slate-50 rounded">
                                      <input
                                        type="checkbox"
                                        checked={(columnFilters[col] || []).includes(val)}
                                        onChange={() => handleFilterToggle(col, val)}
                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                      />
                                      <span className="truncate">{val || '(Kosong)'}</span>
                                    </label>
                                  ))}
                                  {filterOptions.length === 0 && (
                                    <div className="text-center text-slate-400 py-2 text-[10px]">
                                      Tidak ada data
                                    </div>
                                  )}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </th>
                  )})}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-2 py-1 sm:px-4 sm:py-3 text-[10px] sm:text-sm text-slate-500 text-center font-mono">{idx + 1}</td>
                    {visibleColumns.map(col => (
                      <td key={col} className="px-2 py-1 sm:px-4 sm:py-3 text-[11px] sm:text-sm text-slate-700 whitespace-nowrap">
                        {row[col] !== null && row[col] !== undefined ? String(row[col]) : <span className="text-slate-300 italic">null</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 sticky bottom-0 z-10 shadow-[0_-1px_0_rgba(203,213,225,1)]">
                <tr>
                  <th className="px-2 py-1.5 sm:px-4 sm:py-3 border-t border-slate-200 text-[10px] sm:text-xs font-bold text-slate-700 uppercase tracking-wider text-center">
                    Total
                  </th>
                  {visibleColumns.map(col => {
                    const total = getColumnTotal(col);
                    return (
                      <th key={col} className="px-2 py-1.5 sm:px-4 sm:py-3 border-t border-slate-200 text-[10px] sm:text-xs font-bold text-slate-700 whitespace-nowrap">
                        {total !== null ? total : '-'}
                      </th>
                    );
                  })}
                </tr>
              </tfoot>
            </table>
          )}
        </div>
        <div className="p-3 border-t border-slate-100 bg-slate-50 text-xs text-slate-500 text-right font-medium">
          Menampilkan {filteredData.length} baris data
        </div>
      </div>
    </div>
  );
}
