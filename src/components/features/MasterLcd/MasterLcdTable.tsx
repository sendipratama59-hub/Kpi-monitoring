import React, { useState, useMemo, useEffect } from 'react';
import { MasterLcdItem, ColumnDefinition, DEFAULT_COLUMNS } from './types';
import { ColumnFilterPopover } from './ColumnFilterPopover';
import { MasterLcdTopBar } from './MasterLcdTopBar';
import { 
  ChevronLeft, 
  ChevronRight, 
  Filter, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  RotateCcw
} from 'lucide-react';

interface MasterLcdTableProps {
  items: MasterLcdItem[];
  visibleKeys: string[];
  isLoading: boolean;
  onFilteredItemsChange?: (filtered: MasterLcdItem[]) => void;
}

export function MasterLcdTable({
  items,
  visibleKeys,
  isLoading,
  onFilteredItemsChange
}: MasterLcdTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string>('ALL');
  const [selectedBrandHp, setSelectedBrandHp] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [sortField, setSortField] = useState<string>('kode_lcd');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // Column filters state: Record<columnKey, selectedValues[]>
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({});
  const [openFilterCol, setOpenFilterCol] = useState<string | null>(null);

  // Active columns in order
  const activeColumns: ColumnDefinition[] = useMemo(() => {
    return DEFAULT_COLUMNS.filter(col => visibleKeys.includes(col.key));
  }, [visibleKeys]);

  // Unique HP brands for dropdown
  const uniqueHpBrands = useMemo(() => {
    const set = new Set<string>();
    items.forEach(i => {
      if (i.brand_hp) set.add(i.brand_hp.toUpperCase());
    });
    return Array.from(set).sort();
  }, [items]);

  // Counts for Brand tabs
  const brandStats = useMemo(() => {
    let vivan = 0;
    let xpas = 0;
    let other = 0;
    items.forEach(i => {
      const b = (i.brand_ || i.brand_lcd || '').toUpperCase();
      if (b.includes('VIVAN')) vivan++;
      else if (b.includes('XPAS') || b.includes('X-PAS') || b === 'XP') xpas++;
      else other++;
    });
    return { vivan, xpas, other, all: items.length };
  }, [items]);

  // Filtering & Sorting
  const filteredItems = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();

    return items
      .filter(item => {
        const itemBrand = (item.brand_ || item.brand_lcd || '').toUpperCase();

        if (selectedBrand === 'VIVAN' && !itemBrand.includes('VIVAN')) return false;
        if (selectedBrand === 'XPAS' && (!itemBrand.includes('XPAS') && !itemBrand.includes('X-PAS') && itemBrand !== 'XP')) return false;
        if (selectedBrand === 'OTHER' && (itemBrand.includes('VIVAN') || itemBrand.includes('XPAS') || itemBrand.includes('X-PAS'))) return false;

        if (selectedBrandHp !== 'ALL' && item.brand_hp?.toUpperCase() !== selectedBrandHp) return false;

        if (q) {
          const matchSearch = (
            item.kode_lcd?.toLowerCase().includes(q) ||
            item.nama_lcd?.toLowerCase().includes(q) ||
            item.model_lcd?.toLowerCase().includes(q) ||
            item.brand_hp?.toLowerCase().includes(q) ||
            itemBrand.toLowerCase().includes(q)
          );
          if (!matchSearch) return false;
        }

        for (const [colKey, allowedValues] of Object.entries(columnFilters)) {
          if (allowedValues && allowedValues.length > 0) {
            let val = (item as any)[colKey];
            if (val === undefined || val === null || val === '') {
              val = '(Kosong)';
            } else {
              val = String(val).trim();
            }
            if (!allowedValues.includes(val)) {
              return false;
            }
          }
        }

        return true;
      })
      .sort((a, b) => {
        let valA = (a as any)[sortField];
        let valB = (b as any)[sortField];
        if (valA === undefined || valA === null) valA = '';
        if (valB === undefined || valB === null) valB = '';

        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortAsc ? valA - valB : valB - valA;
        }

        const comp = String(valA).localeCompare(String(valB));
        return sortAsc ? comp : -comp;
      });
  }, [items, selectedBrand, selectedBrandHp, searchTerm, columnFilters, sortField, sortAsc]);

  // Sync filtered items with parent for export
  useEffect(() => {
    onFilteredItemsChange?.(filteredItems);
  }, [filteredItems, onFilteredItemsChange]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  const handleSort = (key: string) => {
    if (sortField === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(key);
      setSortAsc(true);
    }
  };

  const handleResetAllFilters = () => {
    setColumnFilters({});
    setSelectedBrand('ALL');
    setSelectedBrandHp('ALL');
    setSearchTerm('');
    setCurrentPage(1);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  const renderCell = (item: MasterLcdItem, col: ColumnDefinition) => {
    const val = (item as any)[col.key];

    if (col.key === 'brand_' || col.key === 'brand_lcd') {
      const b = String(item.brand_ || item.brand_lcd || val || '').toUpperCase();
      const isVivan = b.includes('VIVAN');
      const isXpas = b.includes('XPAS') || b.includes('X-PAS') || b === 'XP';
      return (
        <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-extrabold ${
          isVivan ? 'bg-indigo-100 text-indigo-700' : isXpas ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
        }`}>
          {b || '-'}
        </span>
      );
    }

    if (col.key === 'brand_hp') {
      return (
        <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-800">
          {val || '-'}
        </span>
      );
    }

    if (col.key === 'applied_discount_text') {
      if (!val) return <span className="text-slate-300">-</span>;
      return (
        <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-700">
          {val}
        </span>
      );
    }

    if (col.format === 'currency') {
      const origVal = col.key === 'harga_box' ? item.original_harga_box : item.original_harga_pcs;
      const hasDiscount = origVal !== undefined && origVal > Number(val);

      return (
        <div className="flex flex-col items-end">
          <span className={`font-mono font-bold ${hasDiscount ? 'text-rose-600' : 'text-slate-700'}`}>
            {formatCurrency(Number(val))}
          </span>
          {hasDiscount && (
            <span className="font-mono text-[10px] line-through text-slate-400">
              {formatCurrency(Number(origVal))}
            </span>
          )}
        </div>
      );
    }

    if (col.format === 'number') {
      if (col.key === 'stock') {
        const num = Number(val || 0);
        return (
          <span className={`font-mono font-bold ${num > 20 ? 'text-emerald-600' : num > 0 ? 'text-amber-600' : 'text-red-500'}`}>
            {num.toLocaleString()}
          </span>
        );
      }
      return <span className="font-mono">{Number(val || 0).toLocaleString()}</span>;
    }

    return <span>{val !== undefined && val !== null && val !== '' ? String(val) : '-'}</span>;
  };

  return (
    <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-visible flex flex-col">
      {/* Top Filter Bar Component */}
      <MasterLcdTopBar
        selectedBrand={selectedBrand}
        onSelectBrand={(b) => { setSelectedBrand(b); setCurrentPage(1); }}
        brandStats={brandStats}
        selectedBrandHp={selectedBrandHp}
        onSelectBrandHp={(hp) => { setSelectedBrandHp(hp); setCurrentPage(1); }}
        uniqueHpBrands={uniqueHpBrands}
        searchTerm={searchTerm}
        onSearchChange={(q) => { setSearchTerm(q); setCurrentPage(1); }}
        columnFilters={columnFilters}
        activeColumns={activeColumns}
        onResetAllFilters={handleResetAllFilters}
      />

      {/* Responsive Table Wrapper */}
      <div className="overflow-x-auto w-full min-h-[350px]">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-700 font-bold tracking-tight">
              <th className="py-2.5 px-3 w-12 text-center text-slate-400 border-r border-slate-200/60">
                #
              </th>
              {activeColumns.map(col => {
                const isFiltered = !!columnFilters[col.key];
                const isSorted = sortField === col.key;
                return (
                  <th
                    key={col.key}
                    className={`py-2 px-2.5 relative select-none border-r border-slate-200/60 last:border-r-0 ${
                      col.width || ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      {/* Sortable Header Label */}
                      <button
                        type="button"
                        onClick={() => handleSort(col.key)}
                        className="flex items-center gap-1 font-bold text-slate-700 hover:text-indigo-600 truncate text-left focus:outline-none"
                        title={`Urutkan ${col.label}`}
                      >
                        <span className="truncate">{col.label}</span>
                        {isSorted ? (
                          sortAsc ? (
                            <ArrowUp className="w-3 h-3 text-indigo-600 shrink-0" />
                          ) : (
                            <ArrowDown className="w-3 h-3 text-indigo-600 shrink-0" />
                          )
                        ) : (
                          <ArrowUpDown className="w-2.5 h-2.5 text-slate-300 hover:text-slate-500 shrink-0 opacity-60" />
                        )}
                      </button>

                      {/* Filter Button on every header */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenFilterCol(openFilterCol === col.key ? null : col.key);
                        }}
                        className={`p-1 rounded transition-all shrink-0 ${
                          isFiltered
                            ? 'bg-indigo-600 text-white shadow-xs hover:bg-indigo-700'
                            : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/80'
                        }`}
                        title={`Filter nilai kolom ${col.label}`}
                      >
                        <Filter className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Excel Popover Filter */}
                    {openFilterCol === col.key && (
                      <ColumnFilterPopover
                        column={col}
                        items={items}
                        selectedValues={columnFilters[col.key] || null}
                        onApply={(vals) => {
                          setColumnFilters(prev => {
                            const next = { ...prev };
                            if (vals === null) {
                              delete next[col.key];
                            } else {
                              next[col.key] = vals;
                            }
                            return next;
                          });
                          setCurrentPage(1);
                        }}
                        onSort={(asc) => {
                          setSortField(col.key);
                          setSortAsc(asc);
                        }}
                        isSortedAsc={isSorted ? sortAsc : null}
                        onClose={() => setOpenFilterCol(null)}
                      />
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={activeColumns.length + 1} className="py-12 text-center text-slate-400">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent mb-2"></div>
                  <div className="text-xs font-semibold">Memuat data Master LCD...</div>
                </td>
              </tr>
            ) : paginatedItems.length === 0 ? (
              <tr>
                <td colSpan={activeColumns.length + 1} className="py-12 text-center text-slate-400">
                  <div className="text-sm font-semibold text-slate-600 mb-1">Tidak ada data ditemukan</div>
                  <div className="text-xs mb-3">Silakan sesuaikan filter pencarian atau unggah file Master LCD.</div>
                  {Object.keys(columnFilters).length > 0 && (
                    <button
                      onClick={handleResetAllFilters}
                      className="px-3 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold inline-flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" /> Reset Semua Filter Kolom
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              paginatedItems.map((item, idx) => {
                const rowNumber = (currentPage - 1) * pageSize + idx + 1;
                return (
                  <tr
                    key={item.id || idx}
                    className="hover:bg-indigo-50/30 transition-colors odd:bg-white even:bg-slate-50/40"
                  >
                    <td className="py-2 px-3 text-center text-[11px] font-mono text-slate-400 border-r border-slate-100">
                      {rowNumber}
                    </td>
                    {activeColumns.map(col => (
                      <td
                        key={col.key}
                        className={`py-2 px-3 border-r border-slate-100 last:border-r-0 ${
                          col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'
                        }`}
                      >
                        {renderCell(item, col)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination & Footer */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <span>Menampilkan</span>
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
            className="bg-white border border-slate-300 rounded px-2 py-1 text-xs font-semibold text-slate-700"
          >
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
          </select>
          <span>dari <strong>{filteredItems.length.toLocaleString()}</strong> data</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1 || isLoading}
            className="p-1.5 border border-slate-300 rounded-md bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-3 font-semibold text-slate-700">
            Halaman {currentPage} dari {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages || isLoading}
            className="p-1.5 border border-slate-300 rounded-md bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
