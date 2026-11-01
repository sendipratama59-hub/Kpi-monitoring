import React, { useState, useMemo } from 'react';
import { 
  Filter, 
  Search, 
  Smartphone, 
  Tag, 
  X, 
  SlidersHorizontal, 
  CheckSquare, 
  Square, 
  RotateCcw,
  Plus,
  Check
} from 'lucide-react';
import { ColumnDefinition, DEFAULT_COLUMNS, MasterLcdItem } from '../types';

interface TemplateFilterConfigProps {
  selectedBrand: string;
  onChangeSelectedBrand: (brand: string) => void;
  selectedBrandHp: string;
  onChangeSelectedBrandHp: (brandHp: string) => void;
  searchTerm: string;
  onChangeSearchTerm: (term: string) => void;
  columnFilters: Record<string, string[]>;
  onChangeColumnFilters: (filters: Record<string, string[]>) => void;
  availableBrandsHp: string[];
  availableBrandsLcd?: string[];
  items?: MasterLcdItem[];
}

export function TemplateFilterConfig({
  selectedBrand,
  onChangeSelectedBrand,
  selectedBrandHp,
  onChangeSelectedBrandHp,
  searchTerm,
  onChangeSearchTerm,
  columnFilters,
  onChangeColumnFilters,
  availableBrandsHp,
  availableBrandsLcd = ['ALL', 'XPAS', 'VIVAN'],
  items = []
}: TemplateFilterConfigProps) {
  // Column selected for custom header filtering
  const [activeHeaderColKey, setActiveHeaderColKey] = useState<string>('status_lcd');
  const [valSearchQuery, setValSearchQuery] = useState('');

  const activeColFilterKeys = Object.keys(columnFilters).filter(
    (k) => columnFilters[k] && columnFilters[k].length > 0
  );

  const activeColDef = DEFAULT_COLUMNS.find((c) => c.key === activeHeaderColKey) || DEFAULT_COLUMNS[0];

  // Calculate distinct values and counts for the currently selected column header
  const distinctColumnValues = useMemo(() => {
    if (!activeHeaderColKey || items.length === 0) return [];
    const counts = new Map<string, number>();

    items.forEach((item) => {
      let raw = (item as any)[activeHeaderColKey];
      if (raw === undefined || raw === null || raw === '') {
        raw = '(Kosong)';
      } else {
        raw = String(raw).trim();
      }
      counts.set(raw, (counts.get(raw) || 0) + 1);
    });

    const list = Array.from(counts.entries()).map(([value, count]) => ({
      value,
      count
    }));

    // Sort distinct values alphabetically or numerically
    list.sort((a, b) => {
      if (activeColDef.format === 'number' || activeColDef.format === 'currency') {
        const numA = parseFloat(a.value.replace(/[^0-9.-]/g, '')) || 0;
        const numB = parseFloat(b.value.replace(/[^0-9.-]/g, '')) || 0;
        return numA - numB;
      }
      return a.value.localeCompare(b.value);
    });

    return list;
  }, [items, activeHeaderColKey, activeColDef]);

  // Current filter status on this column
  const isColFiltered = Boolean(columnFilters[activeHeaderColKey] !== undefined);

  // If column has not been filtered yet, all distinct values are considered checked by default
  const currentCheckedValues = useMemo(() => {
    if (!isColFiltered) {
      return distinctColumnValues.map((v) => v.value);
    }
    return columnFilters[activeHeaderColKey] || [];
  }, [columnFilters, activeHeaderColKey, isColFiltered, distinctColumnValues]);

  const isAllChecked = distinctColumnValues.length > 0 &&
    distinctColumnValues.every((v) => currentCheckedValues.includes(v.value));

  // Filtered distinct values by search
  const filteredDistinctValues = useMemo(() => {
    if (!valSearchQuery.trim()) return distinctColumnValues;
    const q = valSearchQuery.toLowerCase();
    return distinctColumnValues.filter((v) => v.value.toLowerCase().includes(q));
  }, [distinctColumnValues, valSearchQuery]);

  const handleToggleValue = (val: string) => {
    const isChecked = currentCheckedValues.includes(val);
    let nextVals: string[];

    if (isChecked) {
      nextVals = currentCheckedValues.filter((v) => v !== val);
    } else {
      nextVals = [...currentCheckedValues, val];
    }

    const nextFilters = { ...columnFilters };
    if (nextVals.length === distinctColumnValues.length) {
      // If all distinct values are selected, remove the filter constraint
      delete nextFilters[activeHeaderColKey];
    } else {
      nextFilters[activeHeaderColKey] = nextVals;
    }
    onChangeColumnFilters(nextFilters);
  };

  const handleToggleSelectAll = () => {
    const nextFilters = { ...columnFilters };
    if (isAllChecked) {
      // Uncheck all
      nextFilters[activeHeaderColKey] = [];
    } else {
      // Check all (remove filter constraint)
      delete nextFilters[activeHeaderColKey];
    }
    onChangeColumnFilters(nextFilters);
  };

  const handleClearColumnFilter = (colKey: string) => {
    const nextFilters = { ...columnFilters };
    delete nextFilters[colKey];
    onChangeColumnFilters(nextFilters);
  };

  const handleResetAllColumnFilters = () => {
    onChangeColumnFilters({});
  };

  return (
    <div className="space-y-4 pt-2">
      {/* Brand LCD Selector */}
      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5 text-indigo-600" />
          <span>Brand LCD Produk</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {availableBrandsLcd.map((b) => {
            const isSelected = selectedBrand.toUpperCase() === b.toUpperCase();
            return (
              <button
                key={b}
                type="button"
                onClick={() => onChangeSelectedBrand(b)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                {b === 'ALL' ? 'Semua Brand LCD' : b}
              </button>
            );
          })}
        </div>
      </div>

      {/* Brand HP Selector */}
      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
          <Smartphone className="w-3.5 h-3.5 text-sky-600" />
          <span>Filter Brand Smartphone / HP</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <select
            value={selectedBrandHp}
            onChange={(e) => onChangeSelectedBrandHp(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white font-medium"
          >
            <option value="ALL">Semua Brand Smartphone (ALL)</option>
            {availableBrandsHp.map((hp) => (
              <option key={hp} value={hp}>
                {hp}
              </option>
            ))}
          </select>
          <div className="text-[11px] text-slate-500 flex items-center">
            Pilihan: {selectedBrandHp === 'ALL' ? 'Tidak ada filter spesifik HP' : `Hanya tampilkan tipe ${selectedBrandHp}`}
          </div>
        </div>
      </div>

      {/* Keyword Search Term */}
      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
          <Search className="w-3.5 h-3.5 text-slate-600" />
          <span>Kata Kunci Pencarian Default (Opsional)</span>
        </label>
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onChangeSearchTerm(e.target.value)}
            placeholder="Contoh: OLED, 11 Pro, NEW, dll..."
            className="w-full pl-8 pr-8 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          {searchTerm && (
            <button
              type="button"
              onClick={() => onChangeSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* FILTER HEADER KOLOM INTERAKTIF */}
      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-indigo-600 shrink-0" />
            <div>
              <span className="text-xs font-bold text-slate-800">
                Filter Berdasarkan Header Kolom Spesifik
              </span>
              <p className="text-[11px] text-slate-500">
                Pilih kolom di bawah untuk memfilter data berdasarkan nilai spesifik (seperti Status LCD, OLED, Packing, dll.)
              </p>
            </div>
          </div>
          {activeColFilterKeys.length > 0 && (
            <button
              type="button"
              onClick={handleResetAllColumnFilters}
              className="flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-md transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Semua Filter Kolom ({activeColFilterKeys.length})</span>
            </button>
          )}
        </div>

        {/* Column Header Dropdown Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Pilih Header Kolom:
            </label>
            <select
              value={activeHeaderColKey}
              onChange={(e) => {
                setActiveHeaderColKey(e.target.value);
                setValSearchQuery('');
              }}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              {DEFAULT_COLUMNS.map((col) => {
                const isFiltered = columnFilters[col.key] !== undefined;
                const count = (columnFilters[col.key] || []).length;
                return (
                  <option key={col.key} value={col.key}>
                    {col.label} {isFiltered ? `✓ (${count} nilai aktif)` : ''}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Cari Nilai Pada Kolom "{activeColDef.label}":
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder={`Cari nilai di ${activeColDef.label}...`}
                value={valSearchQuery}
                onChange={(e) => setValSearchQuery(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              {valSearchQuery && (
                <button
                  type="button"
                  onClick={() => setValSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Distinct Values Checklist for Active Column */}
        <div className="bg-white border border-slate-200 rounded-lg p-2.5 space-y-2">
          <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-100">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              <span>Nilai Kolom: <b className="text-indigo-600">{activeColDef.label}</b></span>
              <span className="text-[10px] text-slate-400">({distinctColumnValues.length} nilai unik)</span>
            </span>

            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded transition-colors">
                <input
                  type="checkbox"
                  checked={isAllChecked}
                  onChange={handleToggleSelectAll}
                  className="rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                />
                <span>(Pilih Semua)</span>
                <span className="text-[10px] text-indigo-600/70 font-mono ml-0.5">
                  {currentCheckedValues.length}/{distinctColumnValues.length}
                </span>
              </label>
              <span className="text-slate-300">•</span>
              <button
                type="button"
                onClick={() => handleClearColumnFilter(activeHeaderColKey)}
                className="text-[11px] font-semibold text-rose-600 hover:underline"
              >
                Hapus Filter Kolom Ini
              </button>
            </div>
          </div>

          {distinctColumnValues.length === 0 ? (
            <div className="py-4 text-center text-xs text-slate-400">
              Tidak ada data nilai untuk kolom ini.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto pr-1">
              {filteredDistinctValues.map((item) => {
                const isChecked = currentCheckedValues.includes(item.value);
                return (
                  <label
                    key={item.value}
                    className={`flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-md border text-xs cursor-pointer transition-colors ${
                      isChecked
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-900 font-medium'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleValue(item.value)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 shrink-0"
                      />
                      <span className="truncate">{item.value}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded font-mono shrink-0">
                      {item.count}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Active Column Filter Badges Summary */}
        {activeColFilterKeys.length > 0 && (
          <div className="pt-2 border-t border-slate-200">
            <div className="text-[11px] font-bold text-slate-700 mb-1.5">
              Filter Kolom Yang Sedang Diterapkan ({activeColFilterKeys.length}):
            </div>
            <div className="flex flex-wrap gap-1.5">
              {activeColFilterKeys.map((colKey) => {
                const col = DEFAULT_COLUMNS.find((c) => c.key === colKey);
                const colLabel = col?.label || colKey;
                const vals = columnFilters[colKey] || [];
                const isActive = activeHeaderColKey === colKey;

                return (
                  <div
                    key={colKey}
                    className={`inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                      isActive
                        ? 'bg-indigo-100 border-indigo-300 text-indigo-900 shadow-2xs'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setActiveHeaderColKey(colKey);
                        setValSearchQuery('');
                      }}
                      className="flex items-center gap-1 text-left"
                      title="Klik untuk mengubah nilai filter kolom ini"
                    >
                      <span className="font-bold">{colLabel}:</span>
                      <span className="text-indigo-600 font-medium max-w-[120px] truncate">
                        {vals.slice(0, 2).join(', ')}
                        {vals.length > 2 ? ` (+${vals.length - 2})` : ''}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleClearColumnFilter(colKey)}
                      className="p-0.5 text-slate-400 hover:text-rose-600 rounded transition-colors ml-1"
                      title={`Hapus filter ${colLabel}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
