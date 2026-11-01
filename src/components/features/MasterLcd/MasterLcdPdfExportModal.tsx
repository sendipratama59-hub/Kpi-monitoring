import React, { useState, useMemo, useEffect } from 'react';
import { 
  FileText, 
  X, 
  Download, 
  Layers, 
  Sliders, 
  Square, 
  Percent, 
  FileCheck,
  CheckCircle2,
  Filter,
  Package,
  Bookmark
} from 'lucide-react';
import { MasterLcdItem, DiscountRule } from './types';
import { 
  SplitPackingMode, 
  PdfExportConfig, 
  generateMasterLcdPdf, 
  buildBrandPageGroups 
} from './pdfExportGenerator';
import { MasterLcdTemplate, fetchTemplates } from './templateService';

interface MasterLcdPdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: MasterLcdItem[];
  filteredItems?: MasterLcdItem[];
  discountRules?: DiscountRule[];
  initialTemplate?: MasterLcdTemplate | null;
}

export function MasterLcdPdfExportModal({
  isOpen,
  onClose,
  items,
  filteredItems,
  discountRules = [],
  initialTemplate = null
}: MasterLcdPdfExportModalProps) {
  // Check if header column filter is active in the table
  const hasFilterActive = Boolean(
    filteredItems && filteredItems.length > 0 && filteredItems.length !== items.length
  );

  // Data scope: default to 'filtered' if user filtered the table
  const [dataScope, setDataScope] = useState<'filtered' | 'all'>('filtered');

  useEffect(() => {
    if (hasFilterActive) {
      setDataScope('filtered');
    }
  }, [hasFilterActive]);

  // Brand LCD selection: XPAS, VIVAN, ALL, or FILTERED
  const [brandLcd, setBrandLcd] = useState<'XPAS' | 'VIVAN' | 'ALL' | 'FILTERED'>('FILTERED');

  // Source items determined by dataScope
  const sourceItems = useMemo(() => {
    if (dataScope === 'filtered' && filteredItems && filteredItems.length > 0) {
      return filteredItems;
    }
    return items;
  }, [dataScope, filteredItems, items]);

  // Template discount rules override props if template is selected
  const [activeTemplateRules, setActiveTemplateRules] = useState<DiscountRule[] | null>(
    initialTemplate?.config?.discountRules || null
  );

  const effectiveRules = activeTemplateRules || discountRules;

  // Rules for selected brand
  const xpasRules = useMemo(() => effectiveRules.filter(r => r.targetBrandLcd === 'XPAS' || r.targetBrandLcd === 'ALL'), [effectiveRules]);
  const vivanRules = useMemo(() => effectiveRules.filter(r => r.targetBrandLcd === 'VIVAN' || r.targetBrandLcd === 'ALL'), [effectiveRules]);

  // Discount selection (default to CURRENT if filtered so table discount is kept)
  const [discountChoice, setDiscountChoice] = useState<string>('CURRENT');

  // Split Packing Mode (User's specific requirement)
  const [splitMode, setSplitMode] = useState<SplitPackingMode>('auto_threshold');
  const [maxRowsPerPage, setMaxRowsPerPage] = useState<number>(50);
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('portrait');
  const [includeStock, setIncludeStock] = useState<boolean>(false);

  // Available Brand HP list extracted from source items
  const availableBrands = useMemo(() => {
    const set = new Set<string>();
    sourceItems.forEach(i => {
      let match = true;
      if (brandLcd === 'XPAS') {
        const b = String(i.brand_ || i.brand_lcd || '').toUpperCase();
        match = b.includes('XPAS') || b.includes('X-PAS') || b === 'XP';
      } else if (brandLcd === 'VIVAN') {
        const b = String(i.brand_ || i.brand_lcd || '').toUpperCase();
        match = b.includes('VIVAN');
      }
      if (match && i.brand_hp) {
        set.add(i.brand_hp.trim().toUpperCase());
      }
    });

    const preferredOrder = [
      'OPPO', 'REALME', 'VIVO', 'INFINIX', 'REDMI', 
      'XIAOMI', 'SAMSUNG', 'IPHONE', 'TECNO', 'ITEL', 
      'HUAWEI', 'ZTE', 'POCO'
    ];

    return Array.from(set).sort((a, b) => {
      const idxA = preferredOrder.indexOf(a);
      const idxB = preferredOrder.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [sourceItems, brandLcd]);

  // Selected brands to include in PDF
  const [selectedBrands, setSelectedBrands] = useState<string[]>(availableBrands);

  // Template loader state
  const [savedTemplates, setSavedTemplates] = useState<MasterLcdTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  useEffect(() => {
    fetchTemplates().then(list => {
      setSavedTemplates(list.filter(t => t.target_type === 'all' || t.target_type === 'pdf' || t.config?.pdfConfig));
    });
  }, []);

  const applyPdfTemplate = (tmpl: MasterLcdTemplate) => {
    if (tmpl.config?.discountRules) {
      setActiveTemplateRules(tmpl.config.discountRules);
    }
    if (!tmpl.config?.pdfConfig) return;
    const p = tmpl.config.pdfConfig;
    if (p.dataScope) setDataScope(p.dataScope);
    if (p.brandLcd) setBrandLcd(p.brandLcd);
    if (p.splitMode) setSplitMode(p.splitMode);
    if (p.maxRowsPerPage) setMaxRowsPerPage(p.maxRowsPerPage);
    if (p.orientation) setOrientation(p.orientation);
    if (p.includeStock !== undefined) setIncludeStock(p.includeStock);
    if (p.discountChoice) setDiscountChoice(p.discountChoice);
    if (p.selectedBrands && p.selectedBrands.length > 0) setSelectedBrands(p.selectedBrands);
    setSelectedTemplateId(tmpl.id);
  };

  useEffect(() => {
    if (initialTemplate) {
      applyPdfTemplate(initialTemplate);
    }
  }, [initialTemplate]);

  // Sync selectedBrands if availableBrands shifts
  useEffect(() => {
    setSelectedBrands(availableBrands);
  }, [availableBrands]);

  // File name
  const [fileName, setFileName] = useState(() => {
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    return `PL_XPAS_GROSIR_${today}.pdf`;
  });

  const [isExporting, setIsExporting] = useState(false);

  // Preview generated pages count based on current settings
  const previewPages = useMemo(() => {
    if (selectedBrands.length === 0) return [];
    
    const brandLcdItems = sourceItems.filter(item => {
      if (brandLcd === 'ALL' || brandLcd === 'FILTERED') return true;
      const b = String(item.brand_ || item.brand_lcd || '').toUpperCase();
      if (brandLcd === 'XPAS') return b.includes('XPAS') || b.includes('X-PAS') || b === 'XP';
      if (brandLcd === 'VIVAN') return b.includes('VIVAN');
      return true;
    });

    return buildBrandPageGroups(brandLcdItems, selectedBrands, splitMode, maxRowsPerPage);
  }, [sourceItems, brandLcd, selectedBrands, splitMode, maxRowsPerPage]);

  if (!isOpen) return null;

  const handleToggleBrand = (brand: string) => {
    setSelectedBrands(prev => 
      prev.includes(brand) ? prev.filter(b => b !== brand) : [...prev, brand]
    );
  };

  const handleExportPdf = () => {
    if (selectedBrands.length === 0) {
      alert('Pilih minimal satu Brand HP untuk diekspor ke PDF.');
      return;
    }

    setIsExporting(true);

    try {
      const config: PdfExportConfig = {
        brandLcd: dataScope === 'filtered' && brandLcd === 'FILTERED' ? 'FILTERED' : brandLcd,
        discountOption: discountChoice,
        discountRules,
        splitPackingMode: splitMode,
        maxRowsPerPage,
        selectedBrands,
        fileName,
        orientation,
        fontSize: 10.5,
        includeStock
      };

      generateMasterLcdPdf(sourceItems, config);
      onClose();
    } catch (err: any) {
      console.error('PDF Export Error:', err);
      alert(`Gagal membuat PDF: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const relevantRules = brandLcd === 'XPAS' ? xpasRules : brandLcd === 'VIVAN' ? vivanRules : discountRules;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-red-50 text-red-600 rounded-xl">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-800">Ekspor PDF Pricelist (Kertas A4)</h3>
                <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                  Format Sesuai Contoh
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Mengikuti hasil filter tabel, judul besar per brand HP &amp; pengaturan split packing
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
                <Bookmark className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="text-xs font-bold text-slate-800">Muat Preset Template:</span>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={selectedTemplateId}
                  onChange={(e) => {
                    const tmpl = savedTemplates.find(t => t.id === e.target.value);
                    if (tmpl) applyPdfTemplate(tmpl);
                  }}
                  className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-full sm:w-64"
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

          {/* Data Scope Option (Filter Header Kolom) */}
          {hasFilterActive && (
            <div className="bg-indigo-50/80 border border-indigo-200 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-indigo-600" />
                  Filter Header Kolom Sedang Aktif di Tabel:
                </span>
                <span className="text-[10px] font-bold bg-indigo-200 text-indigo-900 px-2 py-0.5 rounded-full">
                  {filteredItems?.length.toLocaleString()} Produk Terfilter
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <label className={`flex items-center gap-2 p-2.5 border rounded-lg cursor-pointer transition-all ${
                  dataScope === 'filtered'
                    ? 'bg-white border-indigo-500 shadow-xs font-bold text-indigo-950'
                    : 'bg-white/60 border-slate-200 text-slate-600 hover:bg-white'
                }`}>
                  <input
                    type="radio"
                    name="pdfDataScope"
                    checked={dataScope === 'filtered'}
                    onChange={() => {
                      setDataScope('filtered');
                      setBrandLcd('FILTERED');
                    }}
                    className="w-3.5 h-3.5 text-indigo-600"
                  />
                  <span>Gunakan Hasil Filter ({filteredItems?.length.toLocaleString()} produk)</span>
                </label>

                <label className={`flex items-center gap-2 p-2.5 border rounded-lg cursor-pointer transition-all ${
                  dataScope === 'all'
                    ? 'bg-white border-indigo-500 shadow-xs font-bold text-indigo-950'
                    : 'bg-white/60 border-slate-200 text-slate-600 hover:bg-white'
                }`}>
                  <input
                    type="radio"
                    name="pdfDataScope"
                    checked={dataScope === 'all'}
                    onChange={() => {
                      setDataScope('all');
                      setBrandLcd('XPAS');
                    }}
                    className="w-3.5 h-3.5 text-indigo-600"
                  />
                  <span>Gunakan Semua Data ({items.length.toLocaleString()} produk)</span>
                </label>
              </div>
            </div>
          )}

          {/* Brand LCD Selector */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
            <label className="block text-xs font-bold text-slate-800">
              Pilihan Data Brand LCD:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setBrandLcd('FILTERED')}
                className={`py-2 px-2.5 rounded-lg text-xs font-bold border transition-all ${
                  brandLcd === 'FILTERED'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {dataScope === 'filtered' ? 'Sesuai Filter Tabel' : 'Semua Data'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setBrandLcd('XPAS');
                  setFileName(`PL_XPAS_GROSIR_${new Date().toISOString().split('T')[0].replace(/-/g, '')}.pdf`);
                  if (xpasRules.length > 0) setDiscountChoice(xpasRules[0].id);
                }}
                className={`py-2 px-2.5 rounded-lg text-xs font-bold border transition-all ${
                  brandLcd === 'XPAS'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Hanya XPAS
              </button>
              <button
                type="button"
                onClick={() => {
                  setBrandLcd('VIVAN');
                  setFileName(`PL_VIVAN_${new Date().toISOString().split('T')[0].replace(/-/g, '')}.pdf`);
                  setDiscountChoice('ACTIVE');
                }}
                className={`py-2 px-2.5 rounded-lg text-xs font-bold border transition-all ${
                  brandLcd === 'VIVAN'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Hanya VIVAN
              </button>
              <button
                type="button"
                onClick={() => {
                  setBrandLcd('ALL');
                  setFileName(`PL_SEMUA_LCD_${new Date().toISOString().split('T')[0].replace(/-/g, '')}.pdf`);
                  setDiscountChoice('ACTIVE');
                }}
                className={`py-2 px-2.5 rounded-lg text-xs font-bold border transition-all ${
                  brandLcd === 'ALL'
                    ? 'bg-slate-800 text-white border-slate-800 shadow-xs'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Gabung VSA+XP
              </button>
            </div>
          </div>

          {/* Discount Rules Picker */}
          <div className="bg-rose-50/50 border border-rose-200 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-950 flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-rose-600" />
                Pilihan Diskon &amp; Harga:
              </span>
              <span className="text-[10px] font-semibold text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                {relevantRules.length} Aturan Diskon
              </span>
            </div>

            <div className="space-y-1.5">
              {/* Option to keep exact current prices as seen on table */}
              <label
                className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer text-xs transition-all ${
                  discountChoice === 'CURRENT'
                    ? 'bg-white border-rose-500 font-bold text-rose-950 shadow-2xs'
                    : 'bg-white/70 border-slate-200 text-slate-700 hover:bg-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="pdfDiscountChoice"
                    checked={discountChoice === 'CURRENT'}
                    onChange={() => setDiscountChoice('CURRENT')}
                    className="w-3.5 h-3.5 text-rose-600"
                  />
                  <span>Sesuai Tampilan Tabel Saat Ini (Harga Live dengan Diskon Aktif)</span>
                </div>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                  Live
                </span>
              </label>

              {relevantRules.map(rule => {
                const val = rule.discountType === 'percentage'
                  ? `${rule.discountValue}%`
                  : `Rp ${rule.discountValue.toLocaleString()}`;
                return (
                  <label
                    key={rule.id}
                    className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer text-xs transition-all ${
                      discountChoice === rule.id
                        ? 'bg-white border-rose-400 font-bold text-rose-950 shadow-2xs'
                        : 'bg-white/70 border-slate-200 text-slate-700 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="pdfDiscountChoice"
                        checked={discountChoice === rule.id}
                        onChange={() => setDiscountChoice(rule.id)}
                        className="w-3.5 h-3.5 text-rose-600"
                      />
                      <span>Gunakan Khusus Diskon {val} ({rule.targetBrandLcd})</span>
                    </div>
                    <span className="text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded font-bold">
                      {val}
                    </span>
                  </label>
                );
              })}

              <label
                className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer text-xs transition-all ${
                  discountChoice === 'NONE'
                    ? 'bg-white border-slate-400 font-bold text-slate-900 shadow-2xs'
                    : 'bg-white/70 border-slate-200 text-slate-600 hover:bg-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="pdfDiscountChoice"
                    checked={discountChoice === 'NONE'}
                    onChange={() => setDiscountChoice('NONE')}
                    className="w-3.5 h-3.5 text-slate-600"
                  />
                  <span>Tanpa Diskon (Harga Master Normal)</span>
                </div>
              </label>
            </div>
          </div>

          {/* Highlight Feature: Pengaturan Pemisahan Isi Box (Isi 10 & Isi 3) */}
          <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-amber-700" />
                Pengaturan Pemisahan Halaman (Isi 10 &amp; Isi 3):
              </span>
              <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
                Fitur Khusus
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <label className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                splitMode === 'auto_threshold'
                  ? 'bg-white border-amber-500 shadow-xs'
                  : 'bg-white/60 border-amber-200 text-slate-700 hover:bg-white'
              }`}>
                <input
                  type="radio"
                  name="splitMode"
                  checked={splitMode === 'auto_threshold'}
                  onChange={() => setSplitMode('auto_threshold')}
                  className="mt-0.5 w-4 h-4 text-amber-600"
                />
                <div>
                  <span className="font-bold text-slate-900 block">
                    Otomatis Pisah jika Baris Melebihi {maxRowsPerPage} Baris (Sesuai Contoh PDF)
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Jika total item &gt; {maxRowsPerPage} baris (seperti SAMSUNG &amp; REDMI), otomatis dipisah per Isi 10 dan Isi 3 dengan judul brand yang sama. Brand dengan total item &le; {maxRowsPerPage} baris (OPPO, VIVO, REALME, dll.) tetap digabung 1 halaman.
                  </span>
                </div>
              </label>

              <label className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                splitMode === 'always_split'
                  ? 'bg-white border-amber-500 shadow-xs'
                  : 'bg-white/60 border-amber-200 text-slate-700 hover:bg-white'
              }`}>
                <input
                  type="radio"
                  name="splitMode"
                  checked={splitMode === 'always_split'}
                  onChange={() => setSplitMode('always_split')}
                  className="mt-0.5 w-4 h-4 text-amber-600"
                />
                <div>
                  <span className="font-bold text-slate-900 block">
                    Selalu Pisahkan Isi 10 dan Isi 3 ke Halaman Berbeda
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Semua brand HP akan dibuatkan halaman terpisah khusus untuk Isi 10 dan khusus untuk Isi 3.
                  </span>
                </div>
              </label>

              <div className="pt-2 border-t border-amber-200/80 flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700">
                  Batas Maksimal Baris per Halaman A4:
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="20"
                    max="60"
                    value={maxRowsPerPage}
                    onChange={(e) => setMaxRowsPerPage(Number(e.target.value))}
                    className="w-24 accent-amber-600"
                  />
                  <span className="text-xs font-black bg-amber-100 text-amber-900 px-2 py-0.5 rounded min-w-[32px] text-center">
                    {maxRowsPerPage}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Orientation & 10.5px Font Format */}
          <div className="bg-sky-50/70 border border-sky-200 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-sky-950 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-sky-600" />
                Format Tabel 10,5px (Tanpa Terwrap):
              </span>
              <span className="text-[10px] font-bold bg-sky-200 text-sky-900 px-2 py-0.5 rounded-full">
                Font 10,5px
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <label className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer transition-all ${
                orientation === 'portrait'
                  ? 'bg-white border-sky-500 shadow-xs'
                  : 'bg-white/60 border-sky-200 text-slate-700 hover:bg-white'
              }`}>
                <input
                  type="radio"
                  name="pdfOrientation"
                  checked={orientation === 'portrait'}
                  onChange={() => setOrientation('portrait')}
                  className="mt-0.5 w-3.5 h-3.5 text-sky-600"
                />
                <div>
                  <span className="font-bold text-slate-900 block flex items-center gap-1.5">
                    Portrait (Tegak - 210 x 297 mm)
                    <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                      Sesuai Contoh
                    </span>
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Desain rapi 1 baris per produk, header &amp; harga tidak terwrap.
                  </span>
                </div>
              </label>

              <label className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer transition-all ${
                orientation === 'landscape'
                  ? 'bg-white border-sky-500 shadow-xs'
                  : 'bg-white/60 border-sky-200 text-slate-700 hover:bg-white'
              }`}>
                <input
                  type="radio"
                  name="pdfOrientation"
                  checked={orientation === 'landscape'}
                  onChange={() => setOrientation('landscape')}
                  className="mt-0.5 w-3.5 h-3.5 text-sky-600"
                />
                <div>
                  <span className="font-bold text-slate-900 block">
                    Landscape (Melebar - 297 x 210 mm)
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Kolom Model HP ekstra lebar untuk tipe yang sangat panjang.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Pilihan Menampilkan Kolom Stok */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-emerald-600" />
                Pilihan Kolom Stok:
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
                  Tampilkan Kolom &quot;STOK&quot; pada Hasil Ekspor PDF
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  {includeStock 
                    ? 'Kolom STOK akan dicantumkan di samping kolom HARGA/PCS dengan perataan tengah dan pas 1 baris tanpa terwrap.'
                    : 'Format standar sesuai contoh (6 kolom: KODE LCD, BRAND HP, MODEL HP, ISI/BOX, HARGA/BOX, HARGA/PCS).'}
                </span>
              </div>
            </label>
          </div>

          {/* Brand HP Selector */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                Pilih Brand HP yang Ingin Diekspor ({selectedBrands.length}/{availableBrands.length}):
              </span>
              <div className="flex gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => setSelectedBrands(availableBrands)}
                  className="text-indigo-600 hover:underline font-semibold"
                >
                  Pilih Semua
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => setSelectedBrands([])}
                  className="text-slate-500 hover:underline"
                >
                  Kosongkan
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1">
              {availableBrands.map(brand => {
                const isSelected = selectedBrands.includes(brand);
                return (
                  <button
                    key={brand}
                    type="button"
                    onClick={() => handleToggleBrand(brand)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                      isSelected
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {isSelected ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-slate-300" />
                    )}
                    <span>{brand}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* File Name & Summary */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700">
              Nama File PDF:
            </label>
            <input
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          {/* Live Page Preview Badge */}
          <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-700">
              <FileCheck className="w-4 h-4 text-emerald-600" />
              <span>Estimasi Hasil Cetak:</span>
            </div>
            <div className="font-bold text-slate-900 bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs">
              {previewPages.length} Halaman A4 ({selectedBrands.length} Brand HP, {previewPages.reduce((acc, p) => acc + p.items.length, 0)} Produk)
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
            onClick={handleExportPdf}
            disabled={isExporting || selectedBrands.length === 0}
            className="flex items-center gap-2 px-5 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 shadow-md transition-all disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Membuat PDF...' : 'Download PDF Sesuai Filter'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
