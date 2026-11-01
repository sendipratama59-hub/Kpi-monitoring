import React from 'react';
import { Search, Filter, RotateCcw } from 'lucide-react';
import { ColumnDefinition } from './types';

interface MasterLcdTopBarProps {
  selectedBrand: string;
  onSelectBrand: (brand: string) => void;
  brandStats: { vivan: number; xpas: number; other: number; all: number };
  selectedBrandHp: string;
  onSelectBrandHp: (brandHp: string) => void;
  uniqueHpBrands: string[];
  searchTerm: string;
  onSearchChange: (search: string) => void;
  columnFilters: Record<string, string[]>;
  activeColumns: ColumnDefinition[];
  onResetAllFilters: () => void;
}

export function MasterLcdTopBar({
  selectedBrand,
  onSelectBrand,
  brandStats,
  selectedBrandHp,
  onSelectBrandHp,
  uniqueHpBrands,
  searchTerm,
  onSearchChange,
  columnFilters,
  activeColumns,
  onResetAllFilters
}: MasterLcdTopBarProps) {
  const activeFilterCount = Object.keys(columnFilters).length;

  return (
    <>
      <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col lg:flex-row gap-3 justify-between items-start lg:items-center">
        {/* Brand Tabs */}
        <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => onSelectBrand('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs ${
              selectedBrand === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Semua ({brandStats.all.toLocaleString()})
          </button>
          <button
            onClick={() => onSelectBrand('VIVAN')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 ${
              selectedBrand === 'VIVAN'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-indigo-700 hover:bg-indigo-50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
            VIVAN ({brandStats.vivan.toLocaleString()})
          </button>
          <button
            onClick={() => onSelectBrand('XPAS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 ${
              selectedBrand === 'XPAS'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            XPAS ({brandStats.xpas.toLocaleString()})
          </button>
          {brandStats.other > 0 && (
            <button
              onClick={() => onSelectBrand('OTHER')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs ${
                selectedBrand === 'OTHER'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-amber-700 hover:bg-amber-50'
              }`}
            >
              Lainnya ({brandStats.other.toLocaleString()})
            </button>
          )}
        </div>

        {/* Search & HP Filter */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Brand HP Dropdown */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs shadow-2xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedBrandHp}
              onChange={(e) => onSelectBrandHp(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Semua Brand HP</option>
              {uniqueHpBrands.map(hp => (
                <option key={hp} value={hp}>{hp}</option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Cari kode, nama, model..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
            />
          </div>
        </div>
      </div>

      {/* Active Column Filters Banner */}
      {activeFilterCount > 0 && (
        <div className="px-4 py-2 bg-indigo-50/70 border-b border-indigo-100 flex flex-wrap items-center justify-between gap-2 text-xs text-indigo-900">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-indigo-600" />
            <span className="font-semibold">
              Filter Kolom Aktif ({activeFilterCount} kolom):
            </span>
            <div className="flex flex-wrap gap-1">
              {Object.keys(columnFilters).map(key => {
                const col = activeColumns.find(c => c.key === key);
                return (
                  <span key={key} className="bg-indigo-600 text-white px-2 py-0.5 rounded text-[11px] font-bold">
                    {col?.label || key}
                  </span>
                );
              })}
            </div>
          </div>
          <button
            onClick={onResetAllFilters}
            className="flex items-center gap-1 text-xs text-indigo-700 hover:text-indigo-900 font-bold hover:underline"
          >
            <RotateCcw className="w-3 h-3" /> Reset Semua Filter
          </button>
        </div>
      )}
    </>
  );
}
