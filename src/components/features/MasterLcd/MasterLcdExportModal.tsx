import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx-js-style';
import { 
  Download, 
  X, 
  FileSpreadsheet, 
  CheckCircle, 
  Layers, 
  Filter, 
  ArrowUpDown, 
  Palette, 
  Type,
  Package,
  Bookmark
} from 'lucide-react';
import { MasterLcdItem, ColumnDefinition, DEFAULT_COLUMNS, DiscountRule } from './types';
import { createStyledWorksheet, ExportSortConfig } from './styledExcelGenerator';
import { ExportDiscountSelector } from './ExportDiscountSelector';
import { applyDiscountsToItems } from './discountUtils';
import { MasterLcdTemplate, fetchTemplates } from './templateService';

interface MasterLcdExportModalProps {
  items: MasterLcdItem[];
  filteredItems?: MasterLcdItem[];
  visibleKeys: string[];
  isOpen: boolean;
  onClose: () => void;
  discountRules?: DiscountRule[];
  initialTemplate?: MasterLcdTemplate | null;
}

export function MasterLcdExportModal({
  items,
  filteredItems,
  visibleKeys,
  isOpen,
  onClose,
  discountRules = [],
  initialTemplate = null
}: MasterLcdExportModalProps) {
  const [dataScope, setDataScope] = useState<'all' | 'filtered'>('all');
  const [includeVivan, setIncludeVivan] = useState(true);
  const [includeXpas, setIncludeXpas] = useState(true);
  const [includeAll, setIncludeAll] = useState(false);

  // Sorting state
  const [primarySortCol, setPrimarySortCol] = useState<string>('brand_hp');
  const [primarySortAsc, setPrimarySortAsc] = useState<boolean>(true);
  const [secondarySortCol, setSecondarySortCol] = useState<string>('model_lcd');
  const [secondarySortAsc, setSecondarySortAsc] = useState<boolean>(true);

  // Styling & Title options matching reference image
  const [useGoldenStyle, setUseGoldenStyle] = useState<boolean>(true);
  const [customSheetTitle, setCustomSheetTitle] = useState<string>('');

  // Template discount rules override props if template is selected
  const [activeTemplateRules, setActiveTemplateRules] = useState<DiscountRule[] | null>(
    initialTemplate?.config?.discountRules || null
  );

  const effectiveRules = activeTemplateRules || discountRules;

  // Discount Selection for XPAS & VIVAN sheets
  const xpasRules = effectiveRules.filter(r => r.targetBrandLcd === 'XPAS' || r.targetBrandLcd === 'ALL');
  const vivanRules = effectiveRules.filter(r => r.targetBrandLcd === 'VIVAN' || r.targetBrandLcd === 'ALL');

  const [xpasDiscountChoice, setXpasDiscountChoice] = useState<string>(() => {
    if (xpasRules.length > 1) return 'ALL_TIERS';
    if (xpasRules.length === 1) return xpasRules[0].id;
    return 'CURRENT';
  });

  const [vivanDiscountChoice, setVivanDiscountChoice] = useState<string>('ACTIVE_RULES');

  const [fileName, setFileName] = useState(() => {
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    return `Pricelist_LCD_VIVAN_XPAS_${today}.xlsx`;
  });
  const [isExporting, setIsExporting] = useState(false);

  // Option to include stock in Excel export
  const [includeStock, setIncludeStock] = useState<boolean>(() => visibleKeys.includes('stock'));

  // Template loader state
  const [savedTemplates, setSavedTemplates] = useState<MasterLcdTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  useEffect(() => {
    fetchTemplates().then(list => {
      setSavedTemplates(list.filter(t => t.target_type === 'all' || t.target_type === 'excel' || t.config?.excelConfig));
    });
  }, []);

  const applyExcelTemplate = (tmpl: MasterLcdTemplate) => {
    if (tmpl.config?.discountRules) {
      setActiveTemplateRules(tmpl.config.discountRules);
    }
    if (!tmpl.config?.excelConfig) return;
    const e = tmpl.config.excelConfig;
    if (e.dataScope) setDataScope(e.dataScope);
    if (e.includeVivan !== undefined) setIncludeVivan(e.includeVivan);
    if (e.includeXpas !== undefined) setIncludeXpas(e.includeXpas);
    if (e.includeAll !== undefined) setIncludeAll(e.includeAll);
    if (e.primarySortCol) setPrimarySortCol(e.primarySortCol);
    if (e.primarySortAsc !== undefined) setPrimarySortAsc(e.primarySortAsc);
    if (e.secondarySortCol) setSecondarySortCol(e.secondarySortCol);
    if (e.secondarySortAsc !== undefined) setSecondarySortAsc(e.secondarySortAsc);
    if (e.useGoldenStyle !== undefined) setUseGoldenStyle(e.useGoldenStyle);
    if (e.customSheetTitle !== undefined) setCustomSheetTitle(e.customSheetTitle);
    if (e.xpasDiscountChoice) setXpasDiscountChoice(e.xpasDiscountChoice);
    if (e.vivanDiscountChoice) setVivanDiscountChoice(e.vivanDiscountChoice);
    if (e.showStock !== undefined) setIncludeStock(e.showStock);
    setSelectedTemplateId(tmpl.id);
  };

  useEffect(() => {
    if (initialTemplate) {
      applyExcelTemplate(initialTemplate);
    }
  }, [initialTemplate]);

  // Active columns configured by the user, dynamically adjusted by includeStock toggle
  const activeColumns: ColumnDefinition[] = useMemo(() => {
    let cols = DEFAULT_COLUMNS.filter(col => visibleKeys.includes(col.key));
    if (includeStock) {
      if (!cols.some(c => c.key === 'stock')) {
        const stockCol = DEFAULT_COLUMNS.find(c => c.key === 'stock');
        if (stockCol) {
          const pcsIdx = cols.findIndex(c => c.key === 'harga_pcs');
          if (pcsIdx !== -1) {
            cols = [...cols.slice(0, pcsIdx + 1), stockCol, ...cols.slice(pcsIdx + 1)];
          } else {
            cols = [...cols, stockCol];
          }
        }
      }
    } else {
      cols = cols.filter(c => c.key !== 'stock');
    }
    return cols;
  }, [visibleKeys, includeStock]);

  if (!isOpen) return null;

  // Choose between all items or filtered items
  const sourceItems = dataScope === 'filtered' && filteredItems ? filteredItems : items;

  const vivanItems = sourceItems.filter(item => {
    const b = String(item.brand_ || item.brand_lcd || '').toUpperCase();
    return b.includes('VIVAN');
  });
  const xpasItems = sourceItems.filter(item => {
    const b = String(item.brand_ || item.brand_lcd || '').toUpperCase();
    return b.includes('XPAS') || b.includes('X-PAS') || b === 'XP';
  });

  // Helper to ensure base prices are clean before applying tier discounts
  const toBasePrices = (itemList: MasterLcdItem[]) => itemList.map(i => ({
    ...i,
    harga_pcs: i.original_harga_pcs !== undefined ? i.original_harga_pcs : i.harga_pcs,
    harga_box: i.original_harga_box !== undefined ? i.original_harga_box : i.harga_box,
  }));

  const sortConfig: ExportSortConfig = {
    primaryColumn: primarySortCol,
    primaryAsc: primarySortAsc,
    secondaryColumn: secondarySortCol !== 'NONE' ? secondarySortCol : undefined,
    secondaryAsc: secondarySortAsc
  };

  const handleExport = () => {
    if (!includeVivan && !includeXpas && !includeAll) {
      alert('Pilih minimal satu sheet untuk diekspor.');
      return;
    }

    setIsExporting(true);

    try {
      const workbook = XLSX.utils.book_new();

      // 1. Sheet VIVAN
      if (includeVivan && vivanItems.length > 0) {
        let vivanExportList: MasterLcdItem[] = vivanItems;
        if (vivanDiscountChoice === 'NONE') {
          vivanExportList = toBasePrices(vivanItems);
        } else if (vivanDiscountChoice === 'ACTIVE_RULES') {
          const activeVivanRules = effectiveRules.filter(r => 
            (r.targetBrandLcd === 'VIVAN' || r.targetBrandLcd === 'ALL') && r.isActive
          );
          vivanExportList = applyDiscountsToItems(toBasePrices(vivanItems), activeVivanRules);
        }

        const title = customSheetTitle.trim() || 'VIVAN';
        const vivanSheet = createStyledWorksheet({
          title,
          sheetName: 'VIVAN',
          items: vivanExportList,
          activeColumns,
          sortConfig,
          useGoldenStyle
        });
        XLSX.utils.book_append_sheet(workbook, vivanSheet, 'VIVAN');
      }

      // 2. Sheet XPAS
      if (includeXpas && xpasItems.length > 0) {
        if (xpasDiscountChoice === 'ALL_TIERS' && xpasRules.length > 1) {
          // Export each tier as a distinct sheet (e.g. XPAS (22%) and XPAS (18%))
          xpasRules.forEach(rule => {
            const tierItems = applyDiscountsToItems(toBasePrices(xpasItems), [rule]);
            const badge = rule.discountType === 'percentage'
              ? `${rule.discountValue}%`
              : `-${rule.discountValue}`;
            const sheetName = `XPAS (${badge})`;
            const title = customSheetTitle.trim() || `XPAS (DISKON ${badge})`;
            const sheet = createStyledWorksheet({
              title,
              sheetName,
              items: tierItems,
              activeColumns,
              sortConfig,
              useGoldenStyle
            });
            XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
          });
        } else {
          // Single XPAS Sheet based on selected tier
          let xpasExportList: MasterLcdItem[] = xpasItems;
          const chosenRule = xpasRules.find(r => r.id === xpasDiscountChoice);

          if (chosenRule) {
            xpasExportList = applyDiscountsToItems(toBasePrices(xpasItems), [chosenRule]);
          } else if (xpasDiscountChoice === 'NONE') {
            xpasExportList = toBasePrices(xpasItems);
          } else {
            // CURRENT or fallback
            const activeXpasRules = discountRules.filter(r => 
              (r.targetBrandLcd === 'XPAS' || r.targetBrandLcd === 'ALL') && r.isActive
            );
            xpasExportList = applyDiscountsToItems(toBasePrices(xpasItems), activeXpasRules);
          }

          const title = customSheetTitle.trim() || 'XPAS';
          const xpasSheet = createStyledWorksheet({
            title,
            sheetName: 'XPAS',
            items: xpasExportList,
            activeColumns,
            sortConfig,
            useGoldenStyle
          });
          XLSX.utils.book_append_sheet(workbook, xpasSheet, 'XPAS');
        }
      }

      // 3. Sheet SEMUA DATA
      if (includeAll || (vivanItems.length === 0 && xpasItems.length === 0)) {
        const title = customSheetTitle.trim() || 'SEMUA PRODUK LCD';
        const allSheet = createStyledWorksheet({
          title,
          sheetName: 'SEMUA DATA',
          items: sourceItems,
          activeColumns,
          sortConfig,
          useGoldenStyle
        });
        XLSX.utils.book_append_sheet(workbook, allSheet, 'SEMUA DATA');
      }

      // Write file
      const finalName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
      XLSX.writeFile(workbook, finalName);

      onClose();
    } catch (err: any) {
      console.error(err);
      alert(`Gagal mengekspor file: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const hasFilterActive = filteredItems && filteredItems.length !== items.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Ekspor Pricelist Excel</h3>
              <p className="text-xs text-slate-500">
                Pilih urutan data dan download file Excel berdesain rapi
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

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Quick Preset Template Loader */}
          {savedTemplates.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-xs font-bold text-slate-800">Muat Preset Template:</span>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={selectedTemplateId}
                  onChange={(e) => {
                    const tmpl = savedTemplates.find(t => t.id === e.target.value);
                    if (tmpl) applyExcelTemplate(tmpl);
                  }}
                  className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 w-full sm:w-64"
                >
                  <option value="">-- Pilih Template Tersimpan ({savedTemplates.length}) --</option>
                  {savedTemplates.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* File Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nama File Excel:
            </label>
            <input
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white font-mono"
            />
          </div>

          {/* Sorting Before Export Section */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <ArrowUpDown className="w-4 h-4 text-indigo-600" />
                Urutan Data Excel (Sort Ascending / Descending):
              </span>
              <span className="text-[11px] text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded">
                Sebelum Download
              </span>
            </div>

            {/* Primary Sort */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Urutkan Berdasarkan (Utama):
                </label>
                <select
                  value={primarySortCol}
                  onChange={(e) => setPrimarySortCol(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500"
                >
                  {activeColumns.map(col => (
                    <option key={col.key} value={col.key}>{col.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Arah Urutan:
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPrimarySortAsc(true)}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold border transition-colors ${
                      primarySortAsc ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs' : 'bg-white border-slate-300 text-slate-700'
                    }`}
                  >
                    A ke Z (Asc)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrimarySortAsc(false)}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold border transition-colors ${
                      !primarySortAsc ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs' : 'bg-white border-slate-300 text-slate-700'
                    }`}
                  >
                    Z ke A (Desc)
                  </button>
                </div>
              </div>
            </div>

            {/* Secondary Sort */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-200">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Urutkan Kedua (Opsional):
                </label>
                <select
                  value={secondarySortCol}
                  onChange={(e) => setSecondarySortCol(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="NONE">Tidak Ada</option>
                  {activeColumns.filter(c => c.key !== primarySortCol).map(col => (
                    <option key={col.key} value={col.key}>{col.label}</option>
                  ))}
                </select>
              </div>

              {secondarySortCol !== 'NONE' && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Arah Urutan Kedua:
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSecondarySortAsc(true)}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold border transition-colors ${
                        secondarySortAsc ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs' : 'bg-white border-slate-300 text-slate-700'
                      }`}
                    >
                      A ke Z (Asc)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSecondarySortAsc(false)}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold border transition-colors ${
                        !secondarySortAsc ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs' : 'bg-white border-slate-300 text-slate-700'
                      }`}
                    >
                      Z ke A (Desc)
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Design Style Options */}
          <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                <Palette className="w-4 h-4 text-amber-600" />
                Format & Desain Excel (Sesuai Contoh Gambar):
              </span>
              <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
                Golden Style
              </span>
            </div>

            <div className="space-y-2">
              <label className="flex items-start gap-2.5 p-2.5 bg-white border border-amber-200 rounded-lg cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={useGoldenStyle}
                  onChange={(e) => setUseGoldenStyle(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded mt-0.5"
                />
                <div>
                  <span className="font-bold text-slate-800 block">
                    Header Kuning Emas (#FFC000) & Border Hitam Penuh
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Otomatis mengaktifkan tombol Filter Excel (*AutoFilter*) di header & perataan tengah pada kolom Harga/Box dan Harga/Pcs.
                  </span>
                </div>
              </label>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Type className="w-3.5 h-3.5 text-slate-500" />
                  Judul Besar di Baris Atas (Opsional, contoh: INFINIX):
                </label>
                <input
                  type="text"
                  placeholder="Kosongkan jika ingin auto sesuai nama Sheet (VIVAN / XPAS)"
                  value={customSheetTitle}
                  onChange={(e) => setCustomSheetTitle(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-bold text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* Opsi Tampilkan Kolom Stok di Excel */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-emerald-600" />
                Pilihan Kolom Stok di Excel:
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                includeStock ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-200 text-slate-700'
              }`}>
                {includeStock ? 'Kolom STOK Aktif' : 'Tanpa Kolom STOK'}
              </span>
            </div>

            <label className="flex items-start gap-2.5 p-2.5 bg-white border border-emerald-200 rounded-lg cursor-pointer text-xs transition-all hover:bg-emerald-50/30">
              <input
                type="checkbox"
                checked={includeStock}
                onChange={(e) => setIncludeStock(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded mt-0.5"
              />
              <div>
                <span className="font-bold text-slate-800 block">
                  Tampilkan Kolom &quot;STOK&quot; pada Hasil Ekspor Excel
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  {includeStock
                    ? 'Kolom STOK akan dicantumkan di lembar Excel dengan font Calibri 10.5pt dan perataan tengah.'
                    : 'Kolom STOK tidak akan disertakan pada lembar Excel yang diekspor.'}
                </span>
              </div>
            </label>
          </div>

          {/* Data Scope Option if Filter Active */}
          {hasFilterActive && (
            <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3.5 space-y-2">
              <label className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-indigo-600" />
                Pilihan Baris Data:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <label className={`flex items-center gap-2 p-2.5 border rounded-lg cursor-pointer transition-all ${
                  dataScope === 'all' ? 'bg-white border-indigo-400 shadow-xs font-bold text-indigo-900' : 'bg-white/60 border-slate-200 text-slate-600'
                }`}>
                  <input
                    type="radio"
                    name="dataScope"
                    checked={dataScope === 'all'}
                    onChange={() => setDataScope('all')}
                  />
                  <span>Semua Data ({items.length.toLocaleString()})</span>
                </label>
                <label className={`flex items-center gap-2 p-2.5 border rounded-lg cursor-pointer transition-all ${
                  dataScope === 'filtered' ? 'bg-white border-indigo-400 shadow-xs font-bold text-indigo-900' : 'bg-white/60 border-slate-200 text-slate-600'
                }`}>
                  <input
                    type="radio"
                    name="dataScope"
                    checked={dataScope === 'filtered'}
                    onChange={() => setDataScope('filtered')}
                  />
                  <span>Hasil Filter ({filteredItems.length.toLocaleString()})</span>
                </label>
              </div>
            </div>
          )}

          {/* Discount Selection Section (Multi-tier discount selection like XPAS 22% vs 18%) */}
          <ExportDiscountSelector
            discountRules={discountRules}
            xpasDiscountChoice={xpasDiscountChoice}
            setXpasDiscountChoice={setXpasDiscountChoice}
            vivanDiscountChoice={vivanDiscountChoice}
            setVivanDiscountChoice={setVivanDiscountChoice}
            hasXpasItems={includeXpas && xpasItems.length > 0}
            hasVivanItems={includeVivan && vivanItems.length > 0}
          />

          {/* Sheets Selection */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-indigo-600" />
              Pilih Sheet yang Ingin Dibuat:
            </span>

            <div className="space-y-2">
              <label className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-indigo-300 transition-colors">
                <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={includeVivan}
                    onChange={(e) => setIncludeVivan(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span>Sheet &quot;VIVAN&quot;</span>
                </div>
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                  {vivanItems.length.toLocaleString()} Baris
                </span>
              </label>

              <label className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-emerald-300 transition-colors">
                <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={includeXpas}
                    onChange={(e) => setIncludeXpas(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span>
                    {xpasDiscountChoice === 'ALL_TIERS' && xpasRules.length > 1
                      ? `Sheet XPAS (Otomatis Pisah ${xpasRules.length} Sheet Diskon)`
                      : 'Sheet "XPAS"'}
                  </span>
                </div>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                  {xpasItems.length.toLocaleString()} Baris
                </span>
              </label>

              <label className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-slate-300 transition-colors">
                <div className="flex items-center gap-2.5 text-xs font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={includeAll}
                    onChange={(e) => setIncludeAll(e.target.checked)}
                    className="w-4 h-4 text-slate-600 rounded"
                  />
                  <span>Sheet &quot;SEMUA DATA&quot; (Opsional)</span>
                </div>
                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                  {sourceItems.length.toLocaleString()} Baris
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-100 transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting || sourceItems.length === 0}
            className="flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 shadow-md transition-all disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>Download Excel Sesuai Contoh</span>
          </button>
        </div>
      </div>
    </div>
  );
}
