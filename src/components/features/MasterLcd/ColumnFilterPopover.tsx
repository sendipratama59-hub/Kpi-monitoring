import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ColumnDefinition, MasterLcdItem } from './types';
import { 
  ArrowUpAZ, 
  ArrowDownZA, 
  Search, 
  CheckSquare, 
  Square, 
  X, 
  RotateCcw, 
  Filter
} from 'lucide-react';

interface ColumnFilterPopoverProps {
  column: ColumnDefinition;
  items: MasterLcdItem[];
  selectedValues: string[] | null; // null means no filter active (all included)
  onApply: (selectedValues: string[] | null) => void;
  onSort: (asc: boolean) => void;
  isSortedAsc?: boolean | null;
  onClose: () => void;
}

export function ColumnFilterPopover({
  column,
  items,
  selectedValues,
  onApply,
  onSort,
  isSortedAsc,
  onClose
}: ColumnFilterPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Extract unique distinct values and their frequency in this column
  const distinctStats = useMemo(() => {
    const map = new Map<string, number>();
    items.forEach(item => {
      let val = (item as any)[column.key];
      if (val === undefined || val === null || val === '') {
        val = '(Kosong)';
      } else {
        val = String(val).trim();
      }
      map.set(val, (map.get(val) || 0) + 1);
    });

    const list = Array.from(map.entries()).map(([value, count]) => ({
      value,
      count
    }));

    // Sort distinct values alphabetically or numerically
    list.sort((a, b) => {
      if (column.format === 'number' || column.format === 'currency') {
        const numA = parseFloat(a.value.replace(/[^0-9.-]/g, '')) || 0;
        const numB = parseFloat(b.value.replace(/[^0-9.-]/g, '')) || 0;
        return numA - numB;
      }
      return a.value.localeCompare(b.value);
    });

    return list;
  }, [items, column]);

  // Local state of checked values
  const [checkedSet, setCheckedSet] = useState<Set<string>>(() => {
    if (selectedValues === null) {
      // All checked by default
      return new Set(distinctStats.map(s => s.value));
    }
    const set = new Set(selectedValues);

    // For price columns, also include discounted values if their corresponding original price is selected
    if (column.key === 'harga_box' || column.key === 'harga_pcs') {
      const origKey = column.key === 'harga_box' ? 'original_harga_box' : 'original_harga_pcs';
      items.forEach(item => {
        const currentVal = String((item as any)[column.key] ?? '').trim();
        const origVal = (item as any)[origKey] !== undefined ? String((item as any)[origKey]).trim() : '';
        if (origVal && set.has(origVal)) {
          set.add(currentVal);
        }
      });
    }

    return set;
  });

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Filter distinct values by search term
  const filteredDistinct = useMemo(() => {
    if (!searchTerm.trim()) return distinctStats;
    const q = searchTerm.toLowerCase();
    return distinctStats.filter(s => s.value.toLowerCase().includes(q));
  }, [distinctStats, searchTerm]);

  const isAllChecked = distinctStats.length > 0 && distinctStats.every(s => checkedSet.has(s.value));

  const toggleSelectAll = () => {
    if (isAllChecked) {
      setCheckedSet(new Set());
    } else {
      setCheckedSet(new Set(distinctStats.map(s => s.value)));
    }
  };

  const toggleValue = (val: string) => {
    const next = new Set(checkedSet);
    if (next.has(val)) {
      next.delete(val);
    } else {
      next.add(val);
    }
    setCheckedSet(next);
  };

  const handleApply = () => {
    if (checkedSet.size === distinctStats.length) {
      // If all are selected, no filter needed
      onApply(null);
    } else {
      onApply(Array.from(checkedSet));
    }
    onClose();
  };

  const handleResetFilter = () => {
    onApply(null);
    onClose();
  };

  const isNumberType = column.format === 'number' || column.format === 'currency';

  return (
    <div
      ref={popoverRef}
      className="absolute top-full right-0 mt-1 z-50 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 text-slate-800 text-xs flex flex-col font-normal text-left overflow-hidden animate-in fade-in zoom-in-95 duration-100"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="px-3 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-bold text-slate-800">
          <Filter className="w-3.5 h-3.5 text-indigo-600" />
          <span>Filter: {column.label}</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Sort Actions */}
      <div className="p-2 border-b border-slate-100 space-y-1">
        <button
          onClick={() => { onSort(true); onClose(); }}
          className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors ${
            isSortedAsc === true ? 'bg-indigo-50 text-indigo-700 font-bold' : 'hover:bg-slate-100 text-slate-700'
          }`}
        >
          <ArrowUpAZ className="w-4 h-4 text-indigo-500" />
          <span>{isNumberType ? 'Urutkan Terkecil ke Terbesar' : 'Urutkan A ke Z'}</span>
        </button>
        <button
          onClick={() => { onSort(false); onClose(); }}
          className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors ${
            isSortedAsc === false ? 'bg-indigo-50 text-indigo-700 font-bold' : 'hover:bg-slate-100 text-slate-700'
          }`}
        >
          <ArrowDownZA className="w-4 h-4 text-indigo-500" />
          <span>{isNumberType ? 'Urutkan Terbesar ke Terkecil' : 'Urutkan Z ke A'}</span>
        </button>
      </div>

      {/* Search Inside Column */}
      <div className="p-2 border-b border-slate-100">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
          <input
            type="text"
            placeholder="Cari nilai di kolom ini..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-7 pr-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
          />
        </div>
      </div>

      {/* Select All Checkbox */}
      <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px]">
        <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
          <input
            type="checkbox"
            checked={isAllChecked}
            onChange={toggleSelectAll}
            className="w-3.5 h-3.5 rounded text-indigo-600"
          />
          <span>(Pilih Semua)</span>
        </label>
        <span className="text-slate-400 font-mono">
          {checkedSet.size} / {distinctStats.length}
        </span>
      </div>

      {/* Values List */}
      <div className="max-h-48 overflow-y-auto p-2 space-y-1 divide-y divide-slate-50">
        {filteredDistinct.length === 0 ? (
          <div className="text-center py-4 text-slate-400 text-xs">
            Tidak ada nilai yang cocok
          </div>
        ) : (
          filteredDistinct.map((item) => {
            const isChecked = checkedSet.has(item.value);
            return (
              <label
                key={item.value}
                className="flex items-center justify-between px-1.5 py-1 rounded hover:bg-slate-100 cursor-pointer text-xs transition-colors"
              >
                <div className="flex items-center gap-2 truncate pr-2">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleValue(item.value)}
                    className="w-3.5 h-3.5 rounded text-indigo-600 shrink-0"
                  />
                  <span className={`truncate ${item.value === '(Kosong)' ? 'italic text-slate-400' : 'text-slate-700 font-medium'}`}>
                    {item.value}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full font-mono shrink-0">
                  {item.count}
                </span>
              </label>
            );
          })
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
        <button
          onClick={handleResetFilter}
          className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded font-medium flex items-center gap-1"
        >
          <RotateCcw className="w-3 h-3" /> Reset
        </button>
        <button
          onClick={handleApply}
          className="px-3.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded shadow-xs transition-colors"
        >
          Terapkan
        </button>
      </div>
    </div>
  );
}
