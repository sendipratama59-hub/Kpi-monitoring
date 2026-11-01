import React from 'react';
import { FileSpreadsheet, Palette, ArrowUpDown } from 'lucide-react';
import { DEFAULT_COLUMNS } from '../types';

interface ExcelConfigData {
  dataScope?: 'all' | 'filtered';
  includeVivan?: boolean;
  includeXpas?: boolean;
  includeAll?: boolean;
  primarySortCol?: string;
  primarySortAsc?: boolean;
  secondarySortCol?: string;
  secondarySortAsc?: boolean;
  useGoldenStyle?: boolean;
  customSheetTitle?: string;
  xpasDiscountChoice?: string;
  vivanDiscountChoice?: string;
  showStock?: boolean;
}

interface TemplateExcelConfigProps {
  excelConfig: ExcelConfigData;
  onChangeExcelConfig: (config: ExcelConfigData) => void;
}

export function TemplateExcelConfig({
  excelConfig,
  onChangeExcelConfig
}: TemplateExcelConfigProps) {
  const currentDataScope = excelConfig.dataScope || 'all';
  const currentIncludeVivan = excelConfig.includeVivan ?? true;
  const currentIncludeXpas = excelConfig.includeXpas ?? true;
  const currentIncludeAll = excelConfig.includeAll ?? false;
  const currentUseGoldenStyle = excelConfig.useGoldenStyle ?? true;
  const currentShowStock = excelConfig.showStock ?? false;
  const currentCustomSheetTitle = excelConfig.customSheetTitle ?? '';
  const currentPrimarySortCol = excelConfig.primarySortCol || 'brand_hp';
  const currentPrimarySortAsc = excelConfig.primarySortAsc ?? true;
  const currentSecondarySortCol = excelConfig.secondarySortCol || 'model_lcd';
  const currentSecondarySortAsc = excelConfig.secondarySortAsc ?? true;

  const update = (patch: Partial<ExcelConfigData>) => {
    onChangeExcelConfig({
      ...excelConfig,
      ...patch
    });
  };

  return (
    <div className="space-y-4 pt-2">
      {/* Data Scope & Sheet Selections */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Lingkup Data Excel</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => update({ dataScope: 'all' })}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border text-center transition-all ${
                currentDataScope === 'all'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
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
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              Sesuai Filter
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Pemisahan Lembar Sheet Excel
          </label>
          <div className="flex flex-wrap gap-2 pt-0.5">
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 px-2.5 py-1 rounded-lg cursor-pointer hover:bg-slate-50">
              <input
                type="checkbox"
                checked={currentIncludeVivan}
                onChange={(e) => update({ includeVivan: e.target.checked })}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span>Sheet VIVAN</span>
            </label>
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 px-2.5 py-1 rounded-lg cursor-pointer hover:bg-slate-50">
              <input
                type="checkbox"
                checked={currentIncludeXpas}
                onChange={(e) => update({ includeXpas: e.target.checked })}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span>Sheet XPAS</span>
            </label>
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 px-2.5 py-1 rounded-lg cursor-pointer hover:bg-slate-50">
              <input
                type="checkbox"
                checked={currentIncludeAll}
                onChange={(e) => update({ includeAll: e.target.checked })}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span>Sheet Gabungan</span>
            </label>
          </div>
        </div>
      </div>

      {/* Style & Stock Toggles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-2.5 bg-amber-50/60 border border-amber-200 rounded-lg">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={currentUseGoldenStyle}
              onChange={(e) => update({ useGoldenStyle: e.target.checked })}
              className="rounded border-amber-300 text-amber-600 focus:ring-amber-500"
            />
            <div className="text-xs">
              <span className="font-bold text-slate-800 flex items-center gap-1">
                <Palette className="w-3.5 h-3.5 text-amber-600" />
                <span>Gaya Warna Emas VIVAN</span>
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Menggunakan styling elegan dengan border rapi & header emas.
              </p>
            </div>
          </label>
        </div>

        <div className="p-2.5 bg-emerald-50/60 border border-emerald-200 rounded-lg">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={currentShowStock}
              onChange={(e) => update({ showStock: e.target.checked })}
              className="rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
            />
            <div className="text-xs">
              <span className="font-bold text-slate-800">Tampilkan Kolom Stok di Excel</span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Menyertakan kolom stok pada file spreadsheet yang diunduh.
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Custom Title */}
      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1.5">
          Custom Judul Sheet / Header File (Opsional)
        </label>
        <input
          type="text"
          value={currentCustomSheetTitle}
          onChange={(e) => update({ customSheetTitle: e.target.value })}
          placeholder="Contoh: DAFTAR HARGA LCD RESMI VIVAN - XPAS"
          className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
        />
      </div>

      {/* Sorting Options */}
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
        <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
          <span>Pengurutan Baris (Sorting Order)</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Primary Sort */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
              Urutan Utama
            </label>
            <div className="flex gap-1.5">
              <select
                value={currentPrimarySortCol}
                onChange={(e) => update({ primarySortCol: e.target.value })}
                className="flex-1 px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
              >
                {DEFAULT_COLUMNS.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => update({ primarySortAsc: !currentPrimarySortAsc })}
                className="px-2.5 py-1 text-xs border border-slate-300 bg-white rounded-lg font-bold text-slate-700 hover:bg-slate-100"
              >
                {currentPrimarySortAsc ? 'A-Z' : 'Z-A'}
              </button>
            </div>
          </div>

          {/* Secondary Sort */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
              Urutan Kedua
            </label>
            <div className="flex gap-1.5">
              <select
                value={currentSecondarySortCol}
                onChange={(e) => update({ secondarySortCol: e.target.value })}
                className="flex-1 px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
              >
                {DEFAULT_COLUMNS.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => update({ secondarySortAsc: !currentSecondarySortAsc })}
                className="px-2.5 py-1 text-xs border border-slate-300 bg-white rounded-lg font-bold text-slate-700 hover:bg-slate-100"
              >
                {currentSecondarySortAsc ? 'A-Z' : 'Z-A'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
