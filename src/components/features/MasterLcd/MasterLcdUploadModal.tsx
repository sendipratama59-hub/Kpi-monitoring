import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Upload, X, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, Sparkles, RefreshCw } from 'lucide-react';
import { supabase } from '../../../services/supabase';
import { MasterLcdItem } from './types';

interface MasterLcdUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
}

export function MasterLcdUploadModal({
  isOpen,
  onClose,
  onUploadSuccess
}: MasterLcdUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<MasterLcdItem[]>([]);
  const [brandCounts, setBrandCounts] = useState<{ vivan: number; xpas: number; other: number }>({ vivan: 0, xpas: 0, other: 0 });
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMode, setUploadMode] = useState<'replace' | 'append'>('replace');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetState = () => {
    setFile(null);
    setParsedData([]);
    setBrandCounts({ vivan: 0, xpas: 0, other: 0 });
    setIsProcessingFile(false);
    setIsUploading(false);
    setUploadProgress(0);
    setErrorMsg(null);
  };

  const handleClose = () => {
    if (isUploading) return;
    resetState();
    onClose();
  };

  const normalizeHeaderKey = (rawKey: string): string => {
    return rawKey.trim().toLowerCase().replace(/\s+/g, '_');
  };

  const parseNumber = (val: any): number => {
    if (val === undefined || val === null || val === '') return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    const cleanStr = String(val).replace(/[^0-9.-]/g, '');
    const num = parseFloat(cleanStr);
    return isNaN(num) ? 0 : num;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setErrorMsg(null);
    setFile(selectedFile);
    setIsProcessingFile(true);

    try {
      const buffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (!rawRows || rawRows.length === 0) {
        throw new Error('File Excel kosong atau tidak memiliki data yang valid.');
      }

      let vivan = 0;
      let xpas = 0;
      let other = 0;

      const cleanText = (val: any) => {
        if (val === null || val === undefined) return '';
        return String(val)
          .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
          .replace(/[\uFF01-\uFF5E]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
          .replace(/[【〔〈「『]/g, '[')
          .replace(/[】〕〉」』]/g, ']')
          .replace(/[“”„‟]/g, '"')
          .replace(/[‘’‚‛]/g, "'")
          .trim();
      };

      const items: MasterLcdItem[] = rawRows.map((row) => {
        // Map keys flexibly
        const normalizedRow: Record<string, any> = {};
        for (const [k, v] of Object.entries(row)) {
          normalizedRow[normalizeHeaderKey(k)] = v;
        }

        const kodeLcd = cleanText(
          normalizedRow['kode_lcd'] || 
          normalizedRow['kode'] || 
          normalizedRow['item_code'] || 
          ''
        );

        const namaLcd = cleanText(
          normalizedRow['nama_lcd'] || 
          normalizedRow['nama_barang'] || 
          normalizedRow['nama'] || 
          ''
        );

        const brandHp = cleanText(
          normalizedRow['brand_hp'] || 
          normalizedRow['merk_hp'] || 
          normalizedRow['brandhp'] || 
          ''
        ).toUpperCase();

        const modelLcd = cleanText(
          normalizedRow['model_lcd'] || 
          normalizedRow['model'] || 
          ''
        );

        // Brand LCD (VIVAN vs XPAS)
        // Explicitly check brand_lcd first, then brand_, brand, merk_lcd, etc.
        let rawBrand = String(
          normalizedRow['brand_lcd'] || 
          normalizedRow['brand_'] || 
          normalizedRow['brand'] || 
          normalizedRow['brandlcd'] || 
          normalizedRow['merk_lcd'] || 
          normalizedRow['merk'] || 
          normalizedRow['brand_barang'] || 
          ''
        ).trim();

        // If not found, scan any key containing 'brand' or 'merk' (excluding brand_hp)
        if (!rawBrand) {
          for (const [k, v] of Object.entries(normalizedRow)) {
            if ((k.includes('brand') || k.includes('merk')) && !k.includes('hp') && v) {
              rawBrand = String(v).trim();
              break;
            }
          }
        }

        let brand = rawBrand.toUpperCase();

        // Standardize brand name
        if (brand.includes('XPAS') || brand.includes('X-PAS') || brand === 'XP') {
          brand = 'XPAS';
        } else if (brand.includes('VIVAN') || brand === 'VSA') {
          brand = 'VIVAN';
        }

        // Autodetect brand from nama_lcd or model_lcd if brand_lcd is still empty
        if (!brand) {
          const upperNama = (namaLcd + ' ' + modelLcd).toUpperCase();
          if (upperNama.includes('XPAS') || upperNama.includes('X-PAS') || upperNama.includes('XP-') || upperNama.startsWith('XPAS')) {
            brand = 'XPAS';
          } else if (upperNama.includes('VIVAN') || upperNama.startsWith('VSA') || upperNama.startsWith('VIVAN')) {
            brand = 'VIVAN';
          } else {
            brand = rawBrand || 'LAINNYA';
          }
        }

        if (brand === 'VIVAN') vivan++;
        else if (brand === 'XPAS') xpas++;
        else other++;

        return {
          kode_lcd: kodeLcd,
          brand_hp: brandHp,
          status_lcd: String(normalizedRow['status_lcd'] || normalizedRow['status'] || '').trim(),
          oled_soft_oled: String(normalizedRow['oled_soft_oled'] || normalizedRow['oled_soft_oled'] || normalizedRow['oled'] || '').trim(),
          iphone_new: String(normalizedRow['iphone_new'] || '').trim(),
          batrai_iphone: String(normalizedRow['batrai_iphone'] || '').trim(),
          nama_lcd: namaLcd,
          model_lcd: modelLcd,
          packing: parseNumber(normalizedRow['packing']),
          harga_box: parseNumber(normalizedRow['harga_box'] || normalizedRow['hargabox']),
          harga_pcs: parseNumber(normalizedRow['harga_pcs'] || normalizedRow['hargapcs']),
          stock: parseNumber(normalizedRow['stock'] || normalizedRow['stok']),
          brand_: brand,
          raw_data: row
        };
      }).filter(item => item.kode_lcd || item.nama_lcd);

      if (items.length === 0) {
        throw new Error('Tidak ditemukan baris data dengan Kode LCD atau Nama LCD yang valid.');
      }

      setParsedData(items);
      setBrandCounts({ vivan, xpas, other });
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Gagal memproses file Excel.');
      setParsedData([]);
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleUploadToDatabase = async () => {
    if (parsedData.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);
    setErrorMsg(null);

    try {
      // If replace mode, clear old master_lcd records first
      if (uploadMode === 'replace') {
        const { error: deleteErr } = await supabase
          .from('master_lcd')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        if (deleteErr) {
          console.warn('Delete warning:', deleteErr);
        }
      }

      // Batch insert in chunks of 200
      const CHUNK_SIZE = 200;
      const total = parsedData.length;
      let inserted = 0;

      for (let i = 0; i < total; i += CHUNK_SIZE) {
        const chunk = parsedData.slice(i, i + CHUNK_SIZE).map(item => ({
          kode_lcd: item.kode_lcd,
          brand_hp: item.brand_hp,
          status_lcd: item.status_lcd || null,
          oled_soft_oled: item.oled_soft_oled || null,
          iphone_new: item.iphone_new || null,
          batrai_iphone: item.batrai_iphone || null,
          nama_lcd: item.nama_lcd,
          model_lcd: item.model_lcd,
          packing: item.packing || 0,
          harga_box: item.harga_box || 0,
          harga_pcs: item.harga_pcs || 0,
          stock: item.stock || 0,
          brand_: item.brand_ || 'LAINNYA',
          brand_lcd: item.brand_ || 'LAINNYA',
          raw_data: item.raw_data || null,
          updated_at: new Date().toISOString()
        }));

        const { error: insertErr } = await supabase
          .from('master_lcd')
          .insert(chunk);

        if (insertErr) {
          throw new Error(`Gagal menyimpan batch data: ${insertErr.message}`);
        }

        inserted += chunk.length;
        setUploadProgress(Math.min(100, Math.round((inserted / total) * 100)));
      }

      // Success!
      onUploadSuccess();
      handleClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Terjadi kesalahan saat mengunggah data ke Supabase.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Upload Master LCD</h3>
              <p className="text-xs text-slate-500">
                Unggah file master pricelist LCD untuk memisahkan VIVAN & XPAS
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isUploading}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>{errorMsg}</div>
            </div>
          )}

          {/* Dropzone */}
          <div className="border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-xl p-6 text-center transition-colors bg-slate-50/50">
            <input
              type="file"
              id="master-lcd-file-input"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileChange}
              disabled={isUploading || isProcessingFile}
              className="hidden"
            />
            <label
              htmlFor="master-lcd-file-input"
              className="cursor-pointer flex flex-col items-center justify-center gap-2"
            >
              <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div className="text-sm font-bold text-slate-800">
                {file ? file.name : 'Pilih atau Tarik File Excel Master LCD'}
              </div>
              <p className="text-xs text-slate-500 max-w-sm">
                Mendukung format .xlsx, .xls sesuai header (kode_lcd, brand_hp, nama_lcd, model_lcd, harga, stock, brand_)
              </p>
              <span className="mt-2 inline-flex items-center px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-2xs">
                {file ? 'Ganti File' : 'Browse File'}
              </span>
            </label>
          </div>

          {isProcessingFile && (
            <div className="flex items-center justify-center gap-2 py-4 text-xs font-semibold text-slate-600">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
              Menganalisis & memvalidasi struktur Excel...
            </div>
          )}

          {/* Preview Parsed Summary */}
          {parsedData.length > 0 && !isProcessingFile && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  Data Berhasil Dibaca
                </span>
                <span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                  Total: {parsedData.length.toLocaleString()} Baris
                </span>
              </div>

              {/* Breakdown Brands */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center">
                <div className="bg-white border border-slate-200 p-2.5 rounded-lg shadow-2xs">
                  <span className="text-[11px] text-slate-500 font-medium block">Brand VIVAN</span>
                  <span className="text-base font-extrabold text-indigo-600">
                    {brandCounts.vivan.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-400 block">Item LCD</span>
                </div>
                <div className="bg-white border border-slate-200 p-2.5 rounded-lg shadow-2xs">
                  <span className="text-[11px] text-slate-500 font-medium block">Brand XPAS</span>
                  <span className="text-base font-extrabold text-emerald-600">
                    {brandCounts.xpas.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-400 block">Item LCD</span>
                </div>
                <div className="bg-white border border-slate-200 p-2.5 rounded-lg shadow-2xs">
                  <span className="text-[11px] text-slate-500 font-medium block">Brand Lainnya</span>
                  <span className="text-base font-extrabold text-amber-600">
                    {brandCounts.other.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-400 block">Item LCD</span>
                </div>
              </div>

              {/* Upload Mode */}
              <div className="pt-2 border-t border-slate-200">
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Mode Penyimpanan Database:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <label className={`flex items-center gap-2 p-2 border rounded-lg cursor-pointer transition-all ${
                    uploadMode === 'replace' ? 'bg-indigo-50 border-indigo-300 font-semibold text-indigo-900' : 'bg-white border-slate-200 text-slate-600'
                  }`}>
                    <input
                      type="radio"
                      name="uploadMode"
                      value="replace"
                      checked={uploadMode === 'replace'}
                      onChange={() => setUploadMode('replace')}
                    />
                    <span>Ganti Semua Data (Replace)</span>
                  </label>
                  <label className={`flex items-center gap-2 p-2 border rounded-lg cursor-pointer transition-all ${
                    uploadMode === 'append' ? 'bg-indigo-50 border-indigo-300 font-semibold text-indigo-900' : 'bg-white border-slate-200 text-slate-600'
                  }`}>
                    <input
                      type="radio"
                      name="uploadMode"
                      value="append"
                      checked={uploadMode === 'append'}
                      onChange={() => setUploadMode('append')}
                    />
                    <span>Tambah Data Baru (Append)</span>
                  </label>
                </div>
              </div>

              {/* Progress Bar */}
              {isUploading && (
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-xs font-semibold text-slate-600">
                    <span>Menyimpan ke Supabase...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between rounded-b-xl">
          <button
            type="button"
            onClick={handleClose}
            disabled={isUploading}
            className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleUploadToDatabase}
            disabled={parsedData.length === 0 || isUploading || isProcessingFile}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Menyimpan ({uploadProgress}%)...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Simpan {parsedData.length.toLocaleString()} Baris ke Database</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
