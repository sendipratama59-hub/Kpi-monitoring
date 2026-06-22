import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Search, Loader2, ChevronLeft, ChevronRight, FileDown, UploadCloud } from 'lucide-react';
import { supabase } from '../../../services/supabase';
import { DynamicApp } from './index';
import * as XLSX from 'xlsx';
import { useAlert } from '../../ui/AlertModal';

export function DynamicTableViewer({ app }: { app: DynamicApp }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [fixFormat, setFixFormat] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const { showAlert } = useAlert();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  useEffect(() => {
    fetchData();
  }, [app.id]);

  const fetchData = async () => {
    setLoading(true);
    let allData: any[] = [];
    let hasMore = true;
    let from = 0;
    const limit = 1000;

    try {
      while (hasMore) {
        const { data: records, error } = await supabase
          .from('dynamic_data')
          .select('data')
          .eq('app_id', app.id)
          .range(from, from + limit - 1);
          
        if (error) throw error;
        
        if (records && records.length > 0) {
          allData = [...allData, ...records.map(r => r.data)];
          from += limit;
          if (records.length < limit) hasMore = false;
        } else {
          hasMore = false;
        }
      }
      setData(allData);
    } catch (err) {
      console.error('Error fetching dynamic data:', err);
    } finally {
      setLoading(false);
    }
  };

  const columns = app.config.columns || [];
  
  const getMonthName = (month?: number) => {
    if (!month) return '';
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return months[month - 1] || '';
  };

  // Filter
  const filteredData = data.filter(row => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    // Check all values in the JSON
    return Object.values(row).some(
      val => String(val).toLowerCase().includes(term)
    );
  });

  const exportToExcel = () => {
    const columns = app.config.columns || [];
    
    let exportData = filteredData;
    
    if (fixFormat) {
      exportData = filteredData.map(row => {
        const newRow = { ...row };
        for (const key in newRow) {
          const val = newRow[key];
          if (typeof val === 'string' && /^-?\d+,\d{1,3}$/.test(val)) {
            newRow[key] = Math.round(parseFloat(val.replace(',', '.')) * 1000);
          } else if (typeof val === 'number' && val % 1 !== 0) {
            newRow[key] = Math.round(val * 1000);
          }
        }
        return newRow;
      });
    }

    const ws = XLSX.utils.json_to_sheet(exportData, { header: columns.length > 0 ? columns : undefined });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    XLSX.writeFile(wb, `${app.name}${searchTerm ? `_Filtered` : ''}.xlsx`);
  };

  const handleReplaceData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm("Apakah Anda yakin ingin mereplace data tabel ini dengan data dari file yang baru diunggah? Data lama akan dihapus permanen.")) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setReplacing(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const newExcelData = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (newExcelData.length === 0) {
          showAlert('File Excel kosong atau format tidak sesuai.', 'error');
          setReplacing(false);
          return;
        }
        
        // 1. Delete old data
        const { error: deleteErr } = await supabase.from('dynamic_data').delete().eq('app_id', app.id);
        if (deleteErr) throw deleteErr;

        // 2. Insert new data in chunks
        const chunkSize = 500;
        for (let i = 0; i < newExcelData.length; i += chunkSize) {
          const chunk = newExcelData.slice(i, i + chunkSize);
          const insertData = chunk.map(row => ({
            app_id: app.id,
            data: row
          }));
          
          const { error: dataError } = await supabase.from('dynamic_data').insert(insertData);
          if (dataError) throw dataError;
        }

        // 3. Update app columns in config if they changed
        const newCols = Object.keys(newExcelData[0]);
        await supabase.from('dynamic_apps').update({
          config: { ...app.config, columns: newCols }
        }).eq('id', app.id);

        showAlert('Data berhasil direplace!', 'success');
        
        // Reload data
        setCurrentPage(1);
        await fetchData();
        
      } catch (err: any) {
        console.error("Error replacing data:", err);
        showAlert(err.message || 'Gagal mereplace data.', 'error');
      } finally {
        setReplacing(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  // Paginate
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  if (loading) {
    return (
      <Card className="border-none shadow-sm h-64">
        <CardContent className="flex justify-center items-center h-full">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-sm h-full flex flex-col">
      <CardContent className="p-0 flex flex-col h-[calc(100vh-140px)]">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Cari data..." 
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-indigo-100 outline-none"
              />
            </div>
            {app.config.periodMonth && app.config.periodYear && (
              <span className="hidden md:inline-flex bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-bold shrink-0">
                Periode: {getMonthName(app.config.periodMonth)} {app.config.periodYear}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input 
              type="file" 
              accept=".xlsx,.xls" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleReplaceData}
            />
            <Button 
              onClick={() => fileInputRef.current?.click()} 
              variant="outline" 
              className="text-amber-600 border-amber-200 hover:bg-amber-50"
              disabled={replacing}
            >
              {replacing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <UploadCloud className="w-4 h-4 mr-2" />
              )}
              Replace Data
            </Button>
            <div className="flex items-center space-x-2 mr-2 ml-2">
              <input
                type="checkbox"
                id="fix-format"
                checked={fixFormat}
                onChange={(e) => setFixFormat(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
              />
              <label htmlFor="fix-format" className="text-xs text-slate-600 font-bold cursor-pointer">
                Perbaiki Format Excel
              </label>
            </div>
            <Button onClick={exportToExcel} variant="outline" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50">
              <FileDown className="w-4 h-4 mr-2" /> Download Excel
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-slate-50 relative">
          {filteredData.length > 0 ? (
            <div className="min-w-max w-full">
              <table className="w-full text-left border-collapse">
                <thead className="bg-white/80 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 bg-white">No</th>
                    {columns.map(col => (
                      <th key={col} className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 bg-white whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((row, idx) => (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-white transition-colors bg-transparent">
                      <td className="px-4 py-2.5 text-xs text-slate-500 font-medium">
                        {startIndex + idx + 1}
                      </td>
                      {columns.map(col => (
                        <td key={col} className="px-4 py-2.5 text-sm text-slate-700 whitespace-nowrap">
                          {row[col] !== undefined && row[col] !== null ? String(row[col]) : '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex justify-center items-center h-full text-sm text-slate-500">
              Tidak ada data ditemukan
            </div>
          )}
        </div>

        <div className="p-3 border-t border-slate-100 bg-white flex items-center justify-between text-xs sm:text-sm">
          <div className="text-slate-500 font-medium hidden sm:block">
            Menampilkan {paginatedData.length > 0 ? startIndex + 1 : 0} - {Math.min(startIndex + itemsPerPage, filteredData.length)} dari <span className="font-bold text-indigo-600">{filteredData.length}</span> data
          </div>
          <div className="flex items-center gap-2 max-sm:w-full max-sm:justify-between">
            <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
            >
                <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-slate-500 font-bold px-2 text-xs">
                {currentPage} / {totalPages || 1}
            </span>
            <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
            >
                <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
