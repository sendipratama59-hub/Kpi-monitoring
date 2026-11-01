import React from 'react';
import { FileText, Smartphone, CheckSquare, Square } from 'lucide-react';
import { SplitPackingMode } from '../pdfExportGenerator';

interface PdfConfigData {
  dataScope?: 'filtered' | 'all';
  brandLcd?: 'XPAS' | 'VIVAN' | 'ALL' | 'FILTERED';
  selectedBrands?: string[];
  discountChoice?: string;
  splitMode?: SplitPackingMode;
  maxRowsPerPage?: number;
  orientation?: 'landscape' | 'portrait';
  includeStock?: boolean;
}

interface TemplatePdfConfigProps {
  pdfConfig: PdfConfigData;
  onChangePdfConfig: (config: PdfConfigData) => void;
  availableBrandsHp: string[];
}

export function TemplatePdfConfig({
  pdfConfig,
  onChangePdfConfig,
  availableBrandsHp
}: TemplatePdfConfigProps) {
  const currentDataScope = pdfConfig.dataScope || 'all';
  const currentBrandLcd = pdfConfig.brandLcd || 'XPAS';
  const currentOrientation = pdfConfig.orientation || 'portrait';
  const currentSplitMode = pdfConfig.splitMode || 'auto_threshold';
  const currentMaxRows = pdfConfig.maxRowsPerPage || 50;
  const currentIncludeStock = Boolean(pdfConfig.includeStock);
  const currentSelectedBrands = pdfConfig.selectedBrands || availableBrandsHp;

  const update = (patch: Partial<PdfConfigData>) => {
    onChangePdfConfig({
      ...pdfConfig,
      ...patch
    });
  };

  const handleToggleBrandHp = (hp: string) => {
    const list = currentSelectedBrands.includes(hp)
      ? currentSelectedBrands.filter((b) => b !== hp)
      : [...currentSelectedBrands, hp];
    update({ selectedBrands: list });
  };

  return (
    <div className="space-y-4 pt-2">
      {/* Scope & Brand */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-red-600" />
            <span>Lingkup Data PDF</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => update({ dataScope: 'all' })}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border text-center transition-all ${
                currentDataScope === 'all'
                  ? 'bg-red-600 text-white border-red-600 shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              Semua Data
            </button>
            <button
              type="button"
              onClick={() => update({ dataScope: 'filtered' })}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border text-center transition-all ${
                currentDataScope === 'filtered'
                  ? 'bg-red-600 text-white border-red-600 shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              Sesuai Filter
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Brand LCD yang Dicetak
          </label>
          <select
            value={currentBrandLcd}
            onChange={(e: any) => update({ brandLcd: e.target.value })}
            className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-medium"
          >
            <option value="XPAS">XPAS Saja</option>
            <option value="VIVAN">VIVAN Saja</option>
            <option value="ALL">Semua Brand LCD</option>
            <option value="FILTERED">Sesuai Filter Tabel</option>
          </select>
        </div>
      </div>

      {/* Orientation & Split Mode */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Orientasi Kertas</label>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => update({ orientation: 'portrait' })}
              className={`px-2 py-1.5 text-xs font-bold rounded-lg border text-center ${
                currentOrientation === 'portrait'
                  ? 'bg-red-600 text-white border-red-600 shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              Portrait
            </button>
            <button
              type="button"
              onClick={() => update({ orientation: 'landscape' })}
              className={`px-2 py-1.5 text-xs font-bold rounded-lg border text-center ${
                currentOrientation === 'landscape'
                  ? 'bg-red-600 text-white border-red-600 shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              Landscape
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Mode Split Packing</label>
          <select
            value={currentSplitMode}
            onChange={(e: any) => update({ splitMode: e.target.value })}
            className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-medium"
          >
            <option value="auto_threshold">Otomatis (Berdasarkan Batas)</option>
            <option value="always_split">Selalu Pisahkan per Packing</option>
            <option value="max_rows">Batas Jumlah Baris per Halaman</option>
            <option value="single_page">1 Halaman Utuh (Tanpa Split)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Maks Baris / Halaman</label>
          <input
            type="number"
            min="10"
            max="200"
            value={currentMaxRows}
            onChange={(e) => update({ maxRowsPerPage: parseInt(e.target.value) || 50 })}
            className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-medium"
          />
        </div>
      </div>

      {/* Stock Toggle Checkbox */}
      <div className="p-2.5 bg-amber-50/60 border border-amber-200 rounded-lg">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={currentIncludeStock}
            onChange={(e) => update({ includeStock: e.target.checked })}
            className="rounded border-amber-300 text-amber-600 focus:ring-amber-500"
          />
          <div className="text-xs">
            <span className="font-bold text-slate-800">Tampilkan Kolom Stok di PDF</span>
            <p className="text-[11px] text-slate-500">
              Jika dicentang, kolom jumlah persediaan barang (Stock) akan dicetak pada lembar PDF.
            </p>
          </div>
        </label>
      </div>

      {/* Brand HP checklist */}
      {availableBrandsHp.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-slate-600" />
              <span>Brand Smartphone yang Dicetak ({currentSelectedBrands.length} Terpilih):</span>
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => update({ selectedBrands: availableBrandsHp })}
                className="text-[11px] font-bold text-red-600 hover:underline"
              >
                Pilih Semua
              </button>
              <span className="text-slate-300">•</span>
              <button
                type="button"
                onClick={() => update({ selectedBrands: [] })}
                className="text-[11px] font-bold text-slate-500 hover:underline"
              >
                Kosongkan
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1 border border-slate-200 rounded-lg bg-slate-50">
            {availableBrandsHp.map((hp) => {
              const isSelected = currentSelectedBrands.includes(hp);
              return (
                <button
                  key={hp}
                  type="button"
                  onClick={() => handleToggleBrandHp(hp)}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all border ${
                    isSelected
                      ? 'bg-red-600 text-white border-red-600'
                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {hp}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
