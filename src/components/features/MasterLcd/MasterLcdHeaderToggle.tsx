import React, { useState } from 'react';
import { ColumnDefinition, DEFAULT_COLUMNS } from './types';
import { Eye, EyeOff, CheckSquare, Square, RotateCcw, X, Search, SlidersHorizontal } from 'lucide-react';

interface MasterLcdHeaderToggleProps {
  visibleKeys: string[];
  onChange: (keys: string[]) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function MasterLcdHeaderToggle({
  visibleKeys,
  onChange,
  isOpen,
  onClose
}: MasterLcdHeaderToggleProps) {
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const filteredColumns = DEFAULT_COLUMNS.filter(col =>
    col.label.toLowerCase().includes(search.toLowerCase()) ||
    col.key.toLowerCase().includes(search.toLowerCase())
  );

  const toggleKey = (key: string) => {
    if (visibleKeys.includes(key)) {
      if (visibleKeys.length === 1) {
        return; // Minimal harus ada 1 kolom
      }
      onChange(visibleKeys.filter(k => k !== key));
    } else {
      onChange([...visibleKeys, key]);
    }
  };

  const selectAll = () => {
    onChange(DEFAULT_COLUMNS.map(c => c.key));
  };

  const selectPricelistOnly = () => {
    const compactKeys = ['kode_lcd', 'brand_hp', 'nama_lcd', 'model_lcd', 'packing', 'harga_box', 'harga_pcs', 'stock', 'brand_'];
    onChange(compactKeys);
  };

  const resetDefault = () => {
    onChange(DEFAULT_COLUMNS.filter(c => c.defaultVisible).map(c => c.key));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Filter Kolom / Header</h3>
              <p className="text-xs text-slate-500">
                Pilih kolom yang ingin ditampilkan di tabel & diekspor ke Excel
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Presets */}
        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={selectAll}
              className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded shadow-2xs"
            >
              Pilih Semua ({DEFAULT_COLUMNS.length})
            </button>
            <button
              onClick={selectPricelistOnly}
              className="px-2.5 py-1 text-xs font-semibold bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 rounded shadow-2xs"
            >
              Preset Pricelist
            </button>
            <button
              onClick={resetDefault}
              className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-800 flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          </div>
          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
            {visibleKeys.length} / {DEFAULT_COLUMNS.length} aktif
          </span>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-slate-100">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari nama header..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>
        </div>

        {/* Columns List */}
        <div className="p-4 overflow-y-auto space-y-1.5 flex-1 divide-y divide-slate-100">
          {filteredColumns.map((col) => {
            const isVisible = visibleKeys.includes(col.key);
            return (
              <div
                key={col.key}
                onClick={() => toggleKey(col.key)}
                className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all ${
                  isVisible
                    ? 'bg-indigo-50/50 hover:bg-indigo-50 text-slate-800 font-medium'
                    : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {isVisible ? (
                    <CheckSquare className="w-4 h-4 text-indigo-600 shrink-0" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-300 shrink-0" />
                  )}
                  <div>
                    <div className="text-xs font-semibold">{col.label}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{col.key}</div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {isVisible ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                      <Eye className="w-3 h-3" /> Tampil
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                      <EyeOff className="w-3 h-3" /> Sembunyi
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between rounded-b-xl">
          <span className="text-xs text-slate-500">
            Perubahan otomatis tersimpan dan diterapkan.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-sm transition-colors"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
}
