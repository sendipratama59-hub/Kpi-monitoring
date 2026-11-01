import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { 
  PackageCheck, 
  X, 
  Upload, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Layers, 
  Check, 
  ArrowRight,
  Info,
  RotateCcw
} from 'lucide-react';
import { supabase } from '../../../services/supabase';
import { MasterLcdItem } from './types';

interface MasterLcdStockUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateSuccess: () => void;
  masterItems: MasterLcdItem[];
}

export function MasterLcdStockUpdateModal({
  isOpen,
  onClose,
  onUpdateSuccess,
  masterItems
}: MasterLcdStockUpdateModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  
  // Column mapping states
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [selectedCodeCol, setSelectedCodeCol] = useState<string>('');
  const [selectedStockCol, setSelectedStockCol] = useState<string>('');
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
  
  // Options
  const [resetMissingToZero, setResetMissingToZero] = useState(false);
  
  // Processing states
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(0);
  const [updateResult, setUpdateResult] = useState<{ updatedCount: number; notFoundCount: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const normalizeCode = (val: any): string => {
    if (val === null || val === undefined) return '';
    let str = String(val).trim();
    // Remove trailing .0 if Excel treated numbers as floats (e.g., 10049276.0)
    str = str.replace(/\.0$/, '');
    return str.trim();
  };

  const parseStockNumber = (val: any): number => {
    if (val === undefined || val === null || val === '') return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : Math.max(0, Math.round(val));
    const cleanStr = String(val).replace(/[^0-9.-]/g, '');
    const num = parseFloat(cleanStr);
    return isNaN(num) ? 0 : Math.max(0, Math.round(num));
  };

  // Map of existing items by normalized kode_lcd for fast lookup
  const masterLookup = useMemo(() => {
    const map = new Map<string, MasterLcdItem>();
    masterItems.forEach(item => {
      const code = normalizeCode(item.kode_lcd);
      if (code) {
        map.set(code.toLowerCase(), item);
      }
    });
    return map;
  }, [masterItems]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setErrorMsg(null);
    setUpdateResult(null);
    setFile(selectedFile);
    setIsReadingFile(true);

    try {
      const buffer = await selectedFile.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      
      if (!wb.SheetNames || wb.SheetNames.length === 0) {
        throw new Error('File Excel tidak memiliki lembar kerja (worksheet).');
      }

      setWorkbook(wb);
      setSheetNames(wb.SheetNames);
      const firstSheet = wb.SheetNames[0];
      setSelectedSheet(firstSheet);
      processSheet(wb, firstSheet);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Gagal membaca file Excel.');
      setWorkbook(null);
      setSheetNames([]);
      setAvailableColumns([]);
      setRawRows([]);
    } finally {
      setIsReadingFile(false);
    }
  };

  const processSheet = (wb: XLSX.WorkBook, sheetName: string) => {
    const ws = wb.Sheets[sheetName];
    if (!ws) return;

    // Get rows as JSON with header row
    const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
    if (!rows || rows.length === 0) {
      setAvailableColumns([]);
      setRawRows([]);
      setErrorMsg(`Sheet "${sheetName}" kosong atau tidak memiliki data.`);
      return;
    }

    setRawRows(rows);

    // Extract all column headers from first row
    const cols = Object.keys(rows[0] || {}).map(c => c.trim()).filter(Boolean);
    setAvailableColumns(cols);

    // Auto-detect Code column
    let detectedCode = cols.find(c => {
      const lower = c.toLowerCase().replace(/[\s_-]+/g, '');
      return ['kodelcd', 'kodebarang', 'itemcode', 'kodeproduk', 'sku', 'kode', 'barcode', 'partnumber'].includes(lower);
    });
    if (!detectedCode) {
      detectedCode = cols.find(c => /kode|code|sku|item|barcode/i.test(c));
    }
    setSelectedCodeCol(detectedCode || (cols.length > 0 ? cols[0] : ''));

    // Auto-detect Stock column
    let detectedStock = cols.find(c => {
      const lower = c.toLowerCase().replace(/[\s_-]+/g, '');
      return ['stok', 'stock', 'qty', 'jumlah', 'saldo', 'saldoakhir', 'totalstok', 'kuantiti', 'fisik', 'sisa', 'available'].includes(lower);
    });
    if (!detectedStock) {
      detectedStock = cols.find(c => /stok|stock|qty|jumlah|saldo|kuantiti|fisik/i.test(c));
    }
    // Make sure stock column is different from code column if possible
    if (detectedStock && detectedStock === detectedCode && cols.length > 1) {
      const alternative = cols.find(c => c !== detectedCode && /stok|stock|qty|jumlah/i.test(c));
      if (alternative) detectedStock = alternative;
    }
    setSelectedStockCol(detectedStock || (cols.length > 1 ? cols[1] : cols[0] || ''));
  };

  const handleSheetChange = (sheetName: string) => {
    setSelectedSheet(sheetName);
    if (workbook) {
      processSheet(workbook, sheetName);
    }
  };

  // Analyze rows with selected columns
  const matchAnalysis = useMemo(() => {
    if (!selectedCodeCol || !selectedStockCol || rawRows.length === 0) {
      return {
        matchedItems: [],
        unmatchedItems: [],
        totalParsedStock: 0,
        sampleRows: []
      };
    }

    interface ParsedStockRow {
      rowIndex: number;
      rawCode: string;
      cleanCode: string;
      newStock: number;
      matchedItem?: MasterLcdItem;
      status: 'matched' | 'unmatched';
    }

    const matched: { item: MasterLcdItem; newStock: number }[] = [];
    const unmatched: { rawCode: string; newStock: number }[] = [];
    const sample: ParsedStockRow[] = [];
    let totalStock = 0;

    // Track seen items so duplicates in excel don't double count; last entry takes precedence
    const seenItemIds = new Map<string, { item: MasterLcdItem; newStock: number }>();

    rawRows.forEach((row, idx) => {
      const rawCode = String(row[selectedCodeCol] ?? '').trim();
      const cleanCode = normalizeCode(rawCode);
      if (!cleanCode) return; // skip rows without code

      const newStock = parseStockNumber(row[selectedStockCol]);
      totalStock += newStock;

      const matchedMaster = masterLookup.get(cleanCode.toLowerCase());
      const isMatched = Boolean(matchedMaster);

      if (matchedMaster) {
        seenItemIds.set(matchedMaster.id, { item: matchedMaster, newStock });
      } else {
        unmatched.push({ rawCode: cleanCode, newStock });
      }

      if (sample.length < 10) {
        sample.push({
          rowIndex: idx + 1,
          rawCode,
          cleanCode,
          newStock,
          matchedItem: matchedMaster,
          status: isMatched ? 'matched' : 'unmatched'
        });
      }
    });

    const uniqueMatched = Array.from(seenItemIds.values());

    return {
      matchedItems: uniqueMatched,
      unmatchedItems: unmatched,
      totalParsedStock: totalStock,
      sampleRows: sample
    };
  }, [rawRows, selectedCodeCol, selectedStockCol, masterLookup]);

  const handleExecuteUpdate = async () => {
    if (matchAnalysis.matchedItems.length === 0) {
      setErrorMsg('Tidak ada item yang cocok dengan database Master LCD untuk diupdate.');
      return;
    }

    setIsUpdating(true);
    setUpdateProgress(0);
    setErrorMsg(null);

    try {
      const itemsToUpdate = matchAnalysis.matchedItems;
      const nowIso = new Date().toISOString();

      // If resetMissingToZero is true, include all other master items with 0 stock
      const allUpdatesMap = new Map<string, number>();
      itemsToUpdate.forEach(u => {
        allUpdatesMap.set(u.item.id, u.newStock);
      });

      if (resetMissingToZero) {
        masterItems.forEach(item => {
          if (!allUpdatesMap.has(item.id)) {
            allUpdatesMap.set(item.id, 0);
          }
        });
      }

      const updateList: { id: string; stock: number }[] = Array.from(allUpdatesMap.entries()).map(([id, stock]) => ({
        id,
        stock
      }));

      const totalUpdates = updateList.length;

      // Try fast SQL batch update via exec_sql RPC if available
      let rpcSucceeded = false;
      try {
        const CHUNK_SQL = 250;
        for (let i = 0; i < totalUpdates; i += CHUNK_SQL) {
          const chunk = updateList.slice(i, i + CHUNK_SQL);
          const valuesSql = chunk
            .map(c => `('${c.id}'::uuid, ${c.stock})`)
            .join(',\n');

          const sql = `
            UPDATE master_lcd AS m
            SET stock = c.stock, updated_at = NOW()
            FROM (VALUES
              ${valuesSql}
            ) AS c(id, stock)
            WHERE m.id = c.id;
          `;

          const { error: rpcErr } = await supabase.rpc('exec_sql', { query_text: sql });
          if (rpcErr) throw rpcErr;
          
          setUpdateProgress(Math.min(100, Math.round(((i + chunk.length) / totalUpdates) * 100)));
        }
        rpcSucceeded = true;
      } catch (rpcErr) {
        console.warn('Fast RPC batch update unavailable or failed, falling back to parallel direct updates:', rpcErr);
      }

      // Fallback: chunked parallel individual updates
      if (!rpcSucceeded) {
        const BATCH_SIZE = 25;
        let done = 0;

        for (let i = 0; i < totalUpdates; i += BATCH_SIZE) {
          const batch = updateList.slice(i, i + BATCH_SIZE);
          await Promise.all(
            batch.map(item =>
              supabase
                .from('master_lcd')
                .update({ stock: item.stock, updated_at: nowIso })
                .eq('id', item.id)
            )
          );
          done += batch.length;
          setUpdateProgress(Math.min(100, Math.round((done / totalUpdates) * 100)));
        }
      }

      setUpdateResult({
        updatedCount: totalUpdates,
        notFoundCount: matchAnalysis.unmatchedItems.length
      });

      // Notify parent to refresh table
      onUpdateSuccess();
    } catch (err: any) {
      console.error('Update stock error:', err);
      setErrorMsg(err.message || 'Terjadi kesalahan saat mengupdate stok ke database.');
    } finally {
      setIsUpdating(false);
    }
  };

  const resetAll = () => {
    setFile(null);
    setWorkbook(null);
    setSheetNames([]);
    setSelectedSheet('');
    setAvailableColumns([]);
    setSelectedCodeCol('');
    setSelectedStockCol('');
    setRawRows([]);
    setUpdateProgress(0);
    setUpdateResult(null);
    setErrorMsg(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 via-teal-50 to-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                Update Stok Terkini (Realtime)
              </h2>
              <p className="text-xs text-slate-500">
                Cocokkan kode LCD & perbarui jumlah stok langsung dari file Excel ERP kantor
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isUpdating}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Error Banner */}
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Success Banner */}
          {updateResult && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-emerald-800">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Stok Berhasil Diperbarui Secara Realtime!</span>
              </div>
              <p className="text-emerald-700">
                Sebanyak <strong>{updateResult.updatedCount.toLocaleString()}</strong> item Master LCD telah disinkronkan dengan stok terkini.
                {updateResult.notFoundCount > 0 && (
                  <span> ({updateResult.notFoundCount.toLocaleString()} baris pada file tidak cocok dengan kode di Master LCD).</span>
                )}
              </p>
              <div className="pt-2 flex flex-wrap gap-2">
                <button
                  onClick={resetAll}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Upload File Lain
                </button>
                <button
                  onClick={onClose}
                  className="px-3 py-1.5 bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100/50 rounded-lg font-bold text-xs transition-colors"
                >
                  Tutup Selesai
                </button>
              </div>
            </div>
          )}

          {/* File Picker if not uploaded yet */}
          {!updateResult && (
            <>
              {!file ? (
                <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/20 rounded-2xl p-6 sm:p-8 text-center transition-all cursor-pointer relative group">
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="p-3.5 bg-emerald-100 text-emerald-700 rounded-full group-hover:scale-110 transition-transform">
                      <FileSpreadsheet className="w-7 h-7" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        Klik atau seret file Excel stok ERP ke sini
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Mendukung file format <span className="font-semibold text-emerald-700">.xlsx, .xls, .csv</span>
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg shadow-xs group-hover:bg-emerald-700 transition-colors">
                      <Upload className="w-3.5 h-3.5" /> Pilih File Excel
                    </span>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-600 text-white rounded-lg shadow-xs">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 truncate max-w-xs sm:max-w-md">
                        {file.name}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {(file.size / 1024).toFixed(1)} KB &bull; {rawRows.length.toLocaleString()} baris data terbaca
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={resetAll}
                    disabled={isUpdating}
                    className="text-xs text-slate-600 hover:text-red-600 hover:underline font-semibold flex items-center gap-1 self-end sm:self-center"
                  >
                    Ganti File
                  </button>
                </div>
              )}

              {/* Sheet & Column Mapping Config (Shown when file is loaded) */}
              {file && availableColumns.length > 0 && (
                <div className="space-y-4 pt-1">
                  
                  {/* Sheet Selector (if multiple sheets) */}
                  {sheetNames.length > 1 && (
                    <div className="flex items-center gap-2 text-xs">
                      <Layers className="w-4 h-4 text-slate-500" />
                      <span className="font-bold text-slate-700">Pilih Lembar (Sheet):</span>
                      <select
                        value={selectedSheet}
                        onChange={(e) => handleSheetChange(e.target.value)}
                        className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                      >
                        {sheetNames.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Header Column Mapping Box */}
                  <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-xl p-4 space-y-3">
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                      <div className="text-xs text-emerald-900">
                        <span className="font-bold">Pemetaan Kolom Otomatis:</span>
                        <p className="text-emerald-700 mt-0.5">
                          Sistem membaca 2 kolom di bawah. Anda tidak perlu mengubah nama header file dari ERP. Cukup pilih kolom yang sesuai:
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {/* Column for Kode LCD */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                          1. Kolom Kode LCD
                        </label>
                        <select
                          value={selectedCodeCol}
                          onChange={(e) => setSelectedCodeCol(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-2xs"
                        >
                          <option value="">-- Pilih Kolom Kode LCD --</option>
                          {availableColumns.map(col => (
                            <option key={col} value={col}>
                              {col}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Column for Jumlah Stok */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                          2. Kolom Jumlah Stok
                        </label>
                        <select
                          value={selectedStockCol}
                          onChange={(e) => setSelectedStockCol(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-2xs"
                        >
                          <option value="">-- Pilih Kolom Jumlah Stok --</option>
                          {availableColumns.map(col => (
                            <option key={col} value={col}>
                              {col}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Summary Metric Badges */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Baris Excel</span>
                      <p className="text-base font-black text-slate-800 mt-0.5">
                        {rawRows.length.toLocaleString()}
                      </p>
                    </div>
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase">Cocok di Master</span>
                      <p className="text-base font-black text-emerald-800 mt-0.5">
                        {matchAnalysis.matchedItems.length.toLocaleString()}
                      </p>
                    </div>
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-center">
                      <span className="text-[10px] font-bold text-amber-700 uppercase">Tidak Ditemukan</span>
                      <p className="text-base font-black text-amber-800 mt-0.5">
                        {matchAnalysis.unmatchedItems.length.toLocaleString()}
                      </p>
                    </div>
                    <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-xl text-center">
                      <span className="text-[10px] font-bold text-indigo-700 uppercase">Total Unit Stok</span>
                      <p className="text-base font-black text-indigo-800 mt-0.5">
                        {matchAnalysis.totalParsedStock.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Preview Table of First 10 Items */}
                  {matchAnalysis.sampleRows.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700">
                          Pratinjau Pencocokan ({matchAnalysis.sampleRows.length} baris pertama):
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Real-time match preview
                        </span>
                      </div>

                      <div className="overflow-x-auto w-full border border-slate-200 rounded-xl max-h-48 shadow-2xs">
                        <table className="w-full text-left text-[11px] divide-y divide-slate-200">
                          <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0">
                            <tr>
                              <th className="px-2.5 py-1.5 w-10">No</th>
                              <th className="px-2.5 py-1.5">Kode (Excel)</th>
                              <th className="px-2.5 py-1.5">Model / Nama di Database</th>
                              <th className="px-2.5 py-1.5 text-right">Stok Lama</th>
                              <th className="px-2.5 py-1.5 text-right">Stok Baru</th>
                              <th className="px-2.5 py-1.5 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {matchAnalysis.sampleRows.map((sample) => {
                              const oldStock = sample.matchedItem ? Number(sample.matchedItem.stock || 0) : null;
                              const diff = oldStock !== null ? sample.newStock - oldStock : 0;

                              return (
                                <tr key={sample.rowIndex} className="hover:bg-slate-50">
                                  <td className="px-2.5 py-1.5 text-slate-400 font-mono">
                                    {sample.rowIndex}
                                  </td>
                                  <td className="px-2.5 py-1.5 font-bold font-mono text-slate-900">
                                    {sample.cleanCode}
                                  </td>
                                  <td className="px-2.5 py-1.5 text-slate-700 truncate max-w-[200px]">
                                    {sample.matchedItem ? (
                                      <span>
                                        {sample.matchedItem.brand_hp && (
                                          <span className="font-bold text-indigo-600 mr-1">
                                            [{sample.matchedItem.brand_hp}]
                                          </span>
                                        )}
                                        {sample.matchedItem.model_lcd || sample.matchedItem.nama_lcd}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 italic">
                                        Tidak ada di Master LCD
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-2.5 py-1.5 text-right font-mono text-slate-500">
                                    {oldStock !== null ? oldStock.toLocaleString() : '-'}
                                  </td>
                                  <td className="px-2.5 py-1.5 text-right font-mono font-bold text-emerald-700">
                                    {sample.newStock.toLocaleString()}
                                    {diff !== 0 && (
                                      <span className={`text-[10px] ml-1 font-semibold ${diff > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                        ({diff > 0 ? `+${diff}` : diff})
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-2.5 py-1.5 text-center">
                                    {sample.status === 'matched' ? (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                        <Check className="w-3 h-3" /> Cocok
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                        Lewati
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Reset missing options */}
                  <div className="pt-1">
                    <label className="flex items-start gap-2 cursor-pointer text-xs text-slate-700 select-none">
                      <input
                        type="checkbox"
                        checked={resetMissingToZero}
                        onChange={(e) => setResetMissingToZero(e.target.checked)}
                        className="mt-0.5 h-4 w-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span>
                        <strong>Reset stok menjadi 0</strong> untuk barang di Master LCD yang tidak ada dalam file Excel ini (gunakan jika file ERP berisi seluruh daftar stok aktif).
                      </span>
                    </label>
                  </div>

                  {/* Progress Bar during update */}
                  {isUpdating && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1.5">
                      <div className="flex justify-between text-xs font-bold text-emerald-800">
                        <span className="flex items-center gap-1.5">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Menyinkronkan stok ke database...
                        </span>
                        <span>{updateProgress}%</span>
                      </div>
                      <div className="w-full bg-emerald-200 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-600 h-full transition-all duration-200 rounded-full"
                          style={{ width: `${updateProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={onClose}
            disabled={isUpdating}
            className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
          >
            {updateResult ? 'Tutup' : 'Batal'}
          </button>

          {!updateResult && (
            <button
              onClick={handleExecuteUpdate}
              disabled={
                !file || 
                !selectedCodeCol || 
                !selectedStockCol || 
                matchAnalysis.matchedItems.length === 0 || 
                isUpdating || 
                isReadingFile
              }
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Mengupdate ({updateProgress}%)...</span>
                </>
              ) : (
                <>
                  <PackageCheck className="w-4 h-4" />
                  <span>
                    Update Stok Sekarang ({matchAnalysis.matchedItems.length.toLocaleString()} Item)
                  </span>
                </>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
