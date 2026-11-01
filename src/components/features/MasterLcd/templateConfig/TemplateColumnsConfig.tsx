import React from 'react';
import { SlidersHorizontal, CheckSquare, RotateCcw, Square } from 'lucide-react';
import { DEFAULT_COLUMNS } from '../types';

interface TemplateColumnsConfigProps {
  visibleKeys: string[];
  onChangeVisibleKeys: (keys: string[]) => void;
}

export function TemplateColumnsConfig({
  visibleKeys,
  onChangeVisibleKeys
}: TemplateColumnsConfigProps) {
  const allKeys = DEFAULT_COLUMNS.map((c) => c.key);
  const defaultVisibleKeys = DEFAULT_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.key);

  const handleToggle = (key: string) => {
    if (visibleKeys.includes(key)) {
      if (visibleKeys.length <= 1) return; // keep at least 1
      onChangeVisibleKeys(visibleKeys.filter((k) => k !== key));
    } else {
      onChangeVisibleKeys([...visibleKeys, key]);
    }
  };

  const handleSelectAll = () => {
    onChangeVisibleKeys(allKeys);
  };

  const handleResetDefault = () => {
    onChangeVisibleKeys(defaultVisibleKeys);
  };

  return (
    <div className="space-y-3 pt-2">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
            <span>Pilih Kolom Yang Akan Ditampilkan:</span>
          </span>
          <span className="text-[11px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100">
            {visibleKeys.length} dari {DEFAULT_COLUMNS.length} Aktif
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSelectAll}
            className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-md transition-colors"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Pilih Semua</span>
          </button>
          <button
            type="button"
            onClick={handleResetDefault}
            className="flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-md transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Standar</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1 max-h-64 overflow-y-auto pr-1">
        {DEFAULT_COLUMNS.map((col) => {
          const isChecked = visibleKeys.includes(col.key);
          return (
            <label
              key={col.key}
              className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                isChecked
                  ? 'bg-indigo-50/60 border-indigo-200 text-slate-800 font-semibold'
                  : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => handleToggle(col.key)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 shrink-0"
              />
              <span className="truncate flex-1">{col.label}</span>
              {col.key === 'stock' && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 shrink-0">
                  Stok
                </span>
              )}
            </label>
          );
        })}
      </div>
    </div>
  );
}
