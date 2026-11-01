import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, Check, X } from 'lucide-react';

interface DiscountMultiSelectDropdownProps {
  label: string;
  allOptionLabel: string;
  options: string[];
  selectedValues: string[]; // e.g. ['ALL'] or ['IPHONE', 'SAMSUNG']
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function DiscountMultiSelectDropdown({
  label,
  allOptionLabel,
  options,
  selectedValues,
  onChange,
  placeholder = 'Pilih...',
  className = ''
}: DiscountMultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isAllSelected = useMemo(() => {
    if (!selectedValues || selectedValues.length === 0) return true;
    if (selectedValues.includes('ALL')) return true;
    if (options.length > 0 && options.every(opt => selectedValues.includes(opt))) return true;
    return false;
  }, [selectedValues, options]);

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase();
    return options.filter(opt => opt.toLowerCase().includes(q));
  }, [options, searchQuery]);

  const toggleAll = () => {
    if (isAllSelected) {
      onChange([]);
    } else {
      onChange(['ALL']);
    }
  };

  const toggleOption = (opt: string) => {
    if (isAllSelected) {
      const allOthers = options.filter(o => o !== opt);
      onChange(allOthers);
    } else {
      let next: string[];
      if (selectedValues.includes(opt)) {
        next = selectedValues.filter(o => o !== opt);
      } else {
        next = [...selectedValues, opt];
      }

      if (next.length === 0) {
        onChange(['ALL']);
      } else if (options.length > 0 && next.length === options.length) {
        onChange(['ALL']);
      } else {
        onChange(next);
      }
    }
  };

  const displayLabel = useMemo(() => {
    if (isAllSelected) return allOptionLabel;
    if (selectedValues.length === 0) return allOptionLabel;
    if (selectedValues.length === 1) return selectedValues[0];
    if (selectedValues.length <= 2) return selectedValues.join(', ');
    return `${selectedValues.length} item dipilih`;
  }, [isAllSelected, allOptionLabel, selectedValues]);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
          {label}
        </label>
      )}

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium text-slate-800 text-left"
      >
        <span className="truncate pr-1">{displayLabel}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white rounded-xl shadow-xl border border-slate-200 text-xs overflow-hidden flex flex-col min-w-[180px]">
          {/* Search bar if many options */}
          {options.length > 5 && (
            <div className="p-1.5 border-b border-slate-100 bg-slate-50">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={`Cari ${label}...`}
                  className="w-full pl-6 pr-5 py-1 text-[11px] bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <Search className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="max-h-48 overflow-y-auto p-1 space-y-0.5">
            {/* All Checkbox Option */}
            <label className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-indigo-50/60 cursor-pointer font-bold text-indigo-900 border-b border-slate-100">
              <div className="flex items-center gap-2 truncate">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={toggleAll}
                  className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 shrink-0"
                />
                <span className="truncate">{allOptionLabel}</span>
              </div>
              {isAllSelected && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
            </label>

            {/* Individual Options */}
            {filteredOptions.length === 0 ? (
              <div className="px-2 py-3 text-center text-slate-400 text-[11px]">
                Tidak ada opsi cocok
              </div>
            ) : (
              filteredOptions.map(opt => {
                const isChecked = isAllSelected || selectedValues.includes(opt);
                return (
                  <label
                    key={opt}
                    className={`flex items-center justify-between px-2 py-1 rounded cursor-pointer text-slate-700 transition-colors ${
                      isChecked ? 'bg-indigo-50/40 text-indigo-900 font-medium' : 'hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate pr-1">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleOption(opt)}
                        className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 shrink-0"
                      />
                      <span className="truncate">{opt}</span>
                    </div>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
