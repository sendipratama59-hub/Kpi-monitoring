import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { 
  Upload, 
  FileSpreadsheet, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  Eye, 
  Layers, 
  X,
  FileCheck
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { supabase } from '../../../services/supabase';
import { DatabaseLcdItem } from './types';

interface DatabaseLcdUploadProps {
  onUploadSuccess: () => void;
  onClose?: () => void;
}

export function DatabaseLcdUpload({ onUploadSuccess, onClose }: DatabaseLcdUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<DatabaseLcdItem[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadMode, setUploadMode] = useState<'append' | 'replace'>('append');
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Parse Excel date helpers
  const parseExcelDate = (val: any): string | null => {
    if (!val) return null;
    if (typeof val === 'number') {
      // Excel serial date number
      const date = new Date(Math.round((val - 25569) * 86400 * 1000));
      return !isNaN(date.getTime()) ? date.toISOString().split('T')[0] : null;
    }
    if (typeof val === 'string') {
      const clean = val.trim();
      if (!clean) return null;
      // Handle DD/MM/YYYY or DD-MM-YYYY
      const parts = clean.split(/[-/]/);
      if (parts.length === 3) {
        if (parts[2].length === 4) {
          // DD/MM/YYYY
          const d = parts[0].padStart(2, '0');
          const m = parts[1].padStart(2, '0');
          const y = parts[2];
          return `${y}-${m}-${d}`;
        } else if (parts[0].length === 4) {
          // YYYY-MM-DD
          return clean;
        }
      }
      const d = new Date(clean);
      return !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : null;
    }
    return null;
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    const selectedFile = acceptedFiles[0];
    setFile(selectedFile);
    setError(null);
    setIsParsing(true);
    setParsedRows([]);

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawJson = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

      if (!rawJson || rawJson.length === 0) {
        throw new Error('File Excel tidak memiliki baris data!');
      }

      // Flexible column matcher
      const findVal = (row: Record<string, any>, possibleKeys: string[]): string => {
        // 1. Exact cleaned match
        for (const pk of possibleKeys) {
          const cleanPk = pk.toLowerCase().replace(/[^a-z0-9]/g, '');
          const match = Object.keys(row).find(
            k => k.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanPk
          );
          if (match !== undefined && row[match] !== undefined && row[match] !== null) {
            return String(row[match]).trim();
          }
        }
        // 2. Loose substring match
        for (const pk of possibleKeys) {
          const cleanPk = pk.toLowerCase();
          const match = Object.keys(row).find(
            k => k.toLowerCase().includes(cleanPk)
          );
          if (match !== undefined && row[match] !== undefined && row[match] !== null) {
            return String(row[match]).trim();
          }
        }
        return '';
      };

      const mapped: DatabaseLcdItem[] = rawJson.map(row => {
        const kode_barang = findVal(row, ['kode_barang', 'kode barang', 'kode_produk', 'type', 'item_code', 'goods_code', 'kode']);
        const nama_barang = findVal(row, ['nama_barang', 'nama barang', 'nama_produk', 'item_name', 'goods_name', 'deskripsi', 'nama']);
        const kode_customer = findVal(row, ['kode_customer', 'kode customer', 'id_toko', 'id toko', 'customer_code', 'cust_code', 'kode_toko', 'kd_cust']);
        const nama_customer = findVal(row, ['nama_customer', 'nama customer', 'nama_toko', 'nama toko', 'customer_name', 'cust_name', 'toko']);
        const no_so = findVal(row, ['no_so', 'no so', 'so_number', 'so_no', 'sales_order', 'nomor so', 'noso']);
        const raw_tgl_so = findVal(row, ['tgl_so', 'tgl so', 'tanggal_so', 'tanggal so', 'so_date', 'date', 'tgl', 'tanggal']);
        const no_sd = findVal(row, ['no_sd', 'no sd', 'sd_number', 'sd_no', 'no_surat_jalan', 'surat_jalan', 'delivery_order', 'no do', 'nosd']);

        return {
          kode_barang,
          nama_barang,
          kode_customer,
          nama_customer,
          no_so,
          tgl_so: parseExcelDate(raw_tgl_so),
          no_sd
        };
      }).filter(r => r.kode_barang || r.nama_barang || r.no_so || r.no_sd);

      if (mapped.length === 0) {
        throw new Error('Tidak ada baris data valid yang berhasil dibaca. Pastikan nama kolom sesuai format.');
      }

      setParsedRows(mapped);
      setShowPreview(true);
    } catch (err: any) {
      console.error('Error parsing excel:', err);
      setError(err?.message || 'Gagal memproses file Excel.');
    } finally {
      setIsParsing(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: false
  });

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        kode_barang: 'LC-SAM-A50',
        nama_barang: 'LCD SAMSUNG A50 / A50S / A30S OLED HITAM',
        kode_customer: 'CUST-001',
        nama_customer: 'BERKAH CELL BANDUNG',
        no_so: 'SO-2026-0412',
        tgl_so: '2026-04-12',
        no_sd: 'SD-2026-0889'
      },
      {
        kode_barang: 'LC-OPP-A5S',
        nama_barang: 'LCD OPPO A5S / A7 / A12 / REALME 3 OG CROWN',
        kode_customer: 'CUST-002',
        nama_customer: 'CENTRAL PHONE ITC',
        no_so: 'SO-2026-0415',
        tgl_so: '2026-04-15',
        no_sd: 'SD-2026-0895'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Database_LCD');
    XLSX.writeFile(wb, 'template_database_lcd.xlsx');
  };

  const handleSaveToDatabase = async () => {
    if (parsedRows.length === 0) return;
    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      // 1. If replace mode is chosen, wipe existing rows first
      if (uploadMode === 'replace') {
        const { error: deleteErr } = await supabase
          .from('database_lcd')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows
        if (deleteErr) {
          console.warn('Replace delete warning:', deleteErr);
        }
      }

      // 2. Batch insert in chunks of 500 rows to prevent payload size limits
      const chunkSize = 500;
      const total = parsedRows.length;
      let inserted = 0;

      for (let i = 0; i < total; i += chunkSize) {
        const chunk = parsedRows.slice(i, i + chunkSize);
        const { error: insertErr } = await supabase
          .from('database_lcd')
          .insert(chunk);

        if (insertErr) {
          throw new Error(`Gagal menyimpan data pada baris ${i + 1}: ${insertErr.message}`);
        }

        inserted += chunk.length;
        setUploadProgress(Math.min(100, Math.round((inserted / total) * 100)));
      }

      onUploadSuccess();
      if (onClose) onClose();
    } catch (err: any) {
      console.error('Upload to database error:', err);
      setError(err?.message || 'Terjadi kesalahan saat mengunggah data ke database.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Upload className="w-5 h-5 text-indigo-600" />
            Upload File Excel Database LCD
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Format kolom yang didukung: <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600">kode_barang</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600">nama_barang</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600">kode_customer</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600">nama_customer</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600">no_so</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600">tgl_so</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600">no_sd</code>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownloadTemplate}
            className="text-xs flex items-center gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            <Download className="w-3.5 h-3.5" />
            Download Format Excel
          </Button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-red-700 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{error}</div>
        </div>
      )}

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all ${
          isDragActive 
            ? 'border-indigo-500 bg-indigo-50/50 scale-[0.99]' 
            : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50/60'
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shadow-xs">
            {isParsing ? (
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            ) : (
              <FileSpreadsheet className="w-6 h-6" />
            )}
          </div>
          <div>
            <p className="text-sm font-bold text-slate-700">
              {isParsing ? 'Membaca dan memetakan file Excel...' : isDragActive ? 'Lepaskan file Excel di sini' : 'Klik atau seret file Excel ke sini'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Mendukung format <span className="font-semibold text-slate-600">.xlsx</span> dan <span className="font-semibold text-slate-600">.xls</span>
            </p>
          </div>
          {file && (
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-700 text-xs rounded-full font-medium mt-1">
              <FileCheck className="w-3.5 h-3.5" />
              <span>{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
            </div>
          )}
        </div>
      </div>

      {/* Upload Settings & Summary */}
      {parsedRows.length > 0 && (
        <div className="space-y-4 pt-2 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">
                  {parsedRows.length.toLocaleString('id-ID')} baris data siap diimpor
                </p>
                <p className="text-[11px] text-slate-500">
                  Data berhasil dipetakan sesuai kolom database LCD
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setUploadMode('append')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                    uploadMode === 'append'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tambahkan (Append)
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMode('replace')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                    uploadMode === 'replace'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Ganti Semua (Replace)
                </button>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
                className="text-xs flex items-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5" />
                {showPreview ? 'Sembunyikan Preview' : 'Lihat Preview (5 Baris)'}
              </Button>
            </div>
          </div>

          {/* Progress Bar when uploading */}
          {isUploading && (
            <div className="space-y-1.5 bg-indigo-50/50 p-3.5 rounded-xl border border-indigo-100">
              <div className="flex justify-between text-xs font-semibold text-indigo-900">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                  Sedang menyimpan data ke database...
                </span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-indigo-600 h-2 transition-all duration-300 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Preview Table */}
          {showPreview && (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <div className="bg-slate-100/80 px-3 py-2 text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Preview 5 Baris Pertama</span>
                <span className="text-[11px] text-slate-500 font-normal">Kolom sesuai struktur yang diminta</span>
              </div>
              <div className="overflow-x-auto w-full max-h-60">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2 font-bold whitespace-nowrap">No</th>
                      <th className="px-3 py-2 font-bold whitespace-nowrap">kode_barang</th>
                      <th className="px-3 py-2 font-bold whitespace-nowrap">nama_barang</th>
                      <th className="px-3 py-2 font-bold whitespace-nowrap">kode_customer</th>
                      <th className="px-3 py-2 font-bold whitespace-nowrap">nama_customer</th>
                      <th className="px-3 py-2 font-bold whitespace-nowrap">no_so</th>
                      <th className="px-3 py-2 font-bold whitespace-nowrap">tgl_so</th>
                      <th className="px-3 py-2 font-bold whitespace-nowrap">no_sd</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedRows.slice(0, 5).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-3 py-2 text-slate-400 font-medium">{idx + 1}</td>
                        <td className="px-3 py-2 font-mono font-bold text-indigo-600 whitespace-nowrap">{row.kode_barang || '-'}</td>
                        <td className="px-3 py-2 font-medium text-slate-800">{row.nama_barang || '-'}</td>
                        <td className="px-3 py-2 font-mono text-slate-600 whitespace-nowrap">{row.kode_customer || '-'}</td>
                        <td className="px-3 py-2 text-slate-800">{row.nama_customer || '-'}</td>
                        <td className="px-3 py-2 font-semibold text-slate-700 whitespace-nowrap">{row.no_so || '-'}</td>
                        <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{row.tgl_so || '-'}</td>
                        <td className="px-3 py-2 font-semibold text-slate-700 whitespace-nowrap">{row.no_sd || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFile(null);
                setParsedRows([]);
                setError(null);
              }}
              disabled={isUploading}
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleSaveToDatabase}
              disabled={isUploading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyimpan ({uploadProgress}%)...</span>
                </>
              ) : (
                <>
                  <Layers className="w-4 h-4" />
                  <span>Simpan ke Database LCD ({parsedRows.length.toLocaleString('id-ID')} Data)</span>
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
