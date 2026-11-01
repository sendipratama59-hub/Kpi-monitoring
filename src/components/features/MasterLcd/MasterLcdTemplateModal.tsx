import React, { useState, useEffect, useMemo } from 'react';
import { 
  Bookmark, 
  X, 
  Save, 
  Trash2, 
  CheckCircle2, 
  FileText, 
  FileSpreadsheet, 
  SlidersHorizontal, 
  Percent, 
  Filter, 
  RefreshCw, 
  Plus, 
  Layers, 
  Sparkles,
  ChevronDown,
  ChevronUp,
  Edit2
} from 'lucide-react';
import { DiscountRule, MasterLcdItem } from './types';
import { 
  MasterLcdTemplate, 
  MasterLcdTemplateConfig, 
  fetchTemplates, 
  createTemplate, 
  updateTemplate, 
  deleteTemplate 
} from './templateService';
import { TemplateFilterConfig } from './templateConfig/TemplateFilterConfig';
import { TemplateColumnsConfig } from './templateConfig/TemplateColumnsConfig';
import { TemplateDiscountConfig } from './templateConfig/TemplateDiscountConfig';
import { TemplatePdfConfig } from './templateConfig/TemplatePdfConfig';
import { TemplateExcelConfig } from './templateConfig/TemplateExcelConfig';
import { applyDiscountsToItems } from './discountUtils';

interface CurrentStateProps {
  selectedBrand: string;
  selectedBrandHp: string;
  searchTerm: string;
  columnFilters: Record<string, string[]>;
  visibleKeys: string[];
  discountRules: DiscountRule[];
  pdfConfig?: any;
  excelConfig?: any;
}

interface MasterLcdTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentState: CurrentStateProps;
  items?: MasterLcdItem[];
  onApplyTemplate: (template: MasterLcdTemplate, openAction?: 'apply_only' | 'open_pdf' | 'open_excel') => void;
  onTemplatesChanged?: () => void;
}

type AccordionSection = 'filters' | 'columns' | 'discounts' | 'pdf' | 'excel' | null;

export function MasterLcdTemplateModal({
  isOpen,
  onClose,
  currentState,
  items = [],
  onApplyTemplate,
  onTemplatesChanged
}: MasterLcdTemplateModalProps) {
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
  const [templates, setTemplates] = useState<MasterLcdTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Form states for template metadata
  const [templateName, setTemplateName] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');
  const [targetType, setTargetType] = useState<'all' | 'pdf' | 'excel' | 'view'>('all');
  
  // What components to include in the saved template
  const [includeFilters, setIncludeFilters] = useState(true);
  const [includeColumns, setIncludeColumns] = useState(true);
  const [includeDiscounts, setIncludeDiscounts] = useState(true);
  const [includePdfConfig, setIncludePdfConfig] = useState(true);
  const [includeExcelConfig, setIncludeExcelConfig] = useState(true);

  // Accordion active expanded section
  const [expandedSection, setExpandedSection] = useState<AccordionSection>('filters');

  // Interactive configurations for each component (initialized from currentState)
  const [filterBrand, setFilterBrand] = useState(currentState.selectedBrand || 'ALL');
  const [filterBrandHp, setFilterBrandHp] = useState(currentState.selectedBrandHp || 'ALL');
  const [filterSearchTerm, setFilterSearchTerm] = useState(currentState.searchTerm || '');
  const [filterColFilters, setFilterColFilters] = useState<Record<string, string[]>>(currentState.columnFilters || {});

  const [activeVisibleKeys, setActiveVisibleKeys] = useState<string[]>(currentState.visibleKeys || []);
  const [activeDiscountRules, setActiveDiscountRules] = useState<DiscountRule[]>(currentState.discountRules || []);

  const [activePdfConfig, setActivePdfConfig] = useState<any>(currentState.pdfConfig || {
    dataScope: 'all',
    brandLcd: 'XPAS',
    orientation: 'portrait',
    splitMode: 'auto_threshold',
    maxRowsPerPage: 50,
    includeStock: false
  });

  const [activeExcelConfig, setActiveExcelConfig] = useState<any>(currentState.excelConfig || {
    dataScope: 'all',
    includeVivan: true,
    includeXpas: true,
    includeAll: false,
    useGoldenStyle: true,
    showStock: false,
    customSheetTitle: '',
    primarySortCol: 'brand_hp',
    primarySortAsc: true,
    secondarySortCol: 'model_lcd',
    secondarySortAsc: true
  });

  // Edit & Delete confirmation state
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Available brands derived from data
  const availableBrandsHp = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      if (i.brand_hp) set.add(i.brand_hp.trim().toUpperCase());
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
  }, [items]);

  // Items with discounts dynamically applied according to active discount rules
  const effectiveItems = useMemo(() => {
    if (includeDiscounts && activeDiscountRules && activeDiscountRules.length > 0) {
      return applyDiscountsToItems(items, activeDiscountRules);
    }
    return items;
  }, [items, includeDiscounts, activeDiscountRules]);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const data = await fetchTemplates();
      setTemplates(data);
      if (onTemplatesChanged) onTemplatesChanged();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
      setSuccessMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleAccordion = (section: AccordionSection) => {
    setExpandedSection((prev) => (prev === section ? null : section));
  };

  const handleStartCreateNew = () => {
    setEditingTemplateId(null);
    setTemplateName('');
    setTemplateDesc('');
    setTargetType('all');
    setIncludeFilters(true);
    setIncludeColumns(true);
    setIncludeDiscounts(true);
    setIncludePdfConfig(true);
    setIncludeExcelConfig(true);

    // Reset to current state
    setFilterBrand(currentState.selectedBrand || 'ALL');
    setFilterBrandHp(currentState.selectedBrandHp || 'ALL');
    setFilterSearchTerm(currentState.searchTerm || '');
    setFilterColFilters(currentState.columnFilters || {});
    setActiveVisibleKeys(currentState.visibleKeys || []);
    setActiveDiscountRules(currentState.discountRules || []);
    setActivePdfConfig(currentState.pdfConfig || {
      dataScope: 'all',
      brandLcd: 'XPAS',
      orientation: 'portrait',
      splitMode: 'auto_threshold',
      maxRowsPerPage: 50,
      includeStock: false
    });
    setActiveExcelConfig(currentState.excelConfig || {
      dataScope: 'all',
      includeVivan: true,
      includeXpas: true,
      includeAll: false,
      useGoldenStyle: true,
      showStock: false,
      customSheetTitle: '',
      primarySortCol: 'brand_hp',
      primarySortAsc: true,
      secondarySortCol: 'model_lcd',
      secondarySortAsc: true
    });

    setExpandedSection('filters');
    setActiveTab('create');
  };

  const handleStartEdit = (tmpl: MasterLcdTemplate) => {
    setEditingTemplateId(tmpl.id);
    setTemplateName(tmpl.name);
    setTemplateDesc(tmpl.description || '');
    setTargetType(tmpl.target_type || 'all');

    const cfg = tmpl.config || {};

    const hasFilters = Boolean(cfg.selectedBrand || cfg.selectedBrandHp || cfg.searchTerm || cfg.columnFilters);
    const hasColumns = Boolean(cfg.visibleKeys && cfg.visibleKeys.length > 0);
    const hasDiscounts = Boolean(cfg.discountRules && cfg.discountRules.length > 0);
    const hasPdf = Boolean(cfg.pdfConfig);
    const hasExcel = Boolean(cfg.excelConfig);

    setIncludeFilters(hasFilters);
    setIncludeColumns(hasColumns);
    setIncludeDiscounts(hasDiscounts);
    setIncludePdfConfig(hasPdf);
    setIncludeExcelConfig(hasExcel);

    if (cfg.selectedBrand) setFilterBrand(cfg.selectedBrand);
    if (cfg.selectedBrandHp) setFilterBrandHp(cfg.selectedBrandHp);
    if (cfg.searchTerm !== undefined) setFilterSearchTerm(cfg.searchTerm);
    if (cfg.columnFilters) setFilterColFilters(cfg.columnFilters);
    if (cfg.visibleKeys) setActiveVisibleKeys(cfg.visibleKeys);
    if (cfg.discountRules) setActiveDiscountRules(cfg.discountRules);
    if (cfg.pdfConfig) setActivePdfConfig(cfg.pdfConfig);
    if (cfg.excelConfig) setActiveExcelConfig(cfg.excelConfig);

    // Expand the first active section
    if (hasFilters) setExpandedSection('filters');
    else if (hasColumns) setExpandedSection('columns');
    else if (hasDiscounts) setExpandedSection('discounts');
    else if (hasPdf) setExpandedSection('pdf');
    else setExpandedSection('excel');

    setActiveTab('create');
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim()) return;

    setIsSaving(true);
    try {
      const config: MasterLcdTemplateConfig = {};

      if (includeFilters) {
        config.selectedBrand = filterBrand;
        config.selectedBrandHp = filterBrandHp;
        config.searchTerm = filterSearchTerm;
        config.columnFilters = filterColFilters;
      }

      if (includeColumns) {
        config.visibleKeys = activeVisibleKeys;
      }

      if (includeDiscounts) {
        config.discountRules = activeDiscountRules;
      }

      if (includePdfConfig) {
        config.pdfConfig = activePdfConfig;
      }

      if (includeExcelConfig) {
        config.excelConfig = activeExcelConfig;
      }

      if (editingTemplateId) {
        await updateTemplate(editingTemplateId, {
          name: templateName.trim(),
          description: templateDesc.trim(),
          target_type: targetType,
          config
        });
        setSuccessMessage('Template berhasil diperbarui!');
      } else {
        await createTemplate({
          name: templateName.trim(),
          description: templateDesc.trim(),
          target_type: targetType,
          config
        });
        setSuccessMessage('Template baru berhasil disimpan ke database!');
      }

      await loadTemplates();
      setTimeout(() => {
        setSuccessMessage(null);
        setActiveTab('list');
      }, 1200);
    } catch (err: any) {
      alert(`Gagal menyimpan template: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async (id: string) => {
    setIsLoading(true);
    try {
      await deleteTemplate(id);
      await loadTemplates();
      setSuccessMessage('Template berhasil dihapus!');
      setTimeout(() => setSuccessMessage(null), 2000);
    } catch (err: any) {
      alert(`Gagal menghapus template: ${err.message}`);
    } finally {
      setConfirmDeleteId(null);
      setIsLoading(false);
    }
  };

  const filteredTemplates = templates.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      (t.description && t.description.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-indigo-700 text-white rounded-xl shadow-xs">
              <Bookmark className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                  Template & Preset Master LCD
                </h2>
                <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                  Supabase DB
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Kustomisasi & simpan semua pilihan filter, kolom aktif, diskon, dan ekspor ke database
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-white px-5 pt-3 gap-3">
          <button
            onClick={() => setActiveTab('list')}
            className={`pb-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'list'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Daftar Template ({templates.length})</span>
          </button>
          <button
            onClick={handleStartCreateNew}
            className={`pb-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'create'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>{editingTemplateId ? 'Edit Template' : 'Buat / Kustomisasi Template'}</span>
          </button>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="mx-5 mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800 font-semibold animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'list' ? (
            <div className="space-y-4">
              {/* Search & Actions Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <input
                  type="text"
                  placeholder="Cari template tersimpan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 flex-1"
                />
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={loadTemplates}
                    disabled={isLoading}
                    className="p-2 border border-slate-300 rounded-xl hover:bg-slate-50 text-slate-600"
                    title="Muat Ulang dari Database"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
                  </button>
                  <button
                    onClick={handleStartCreateNew}
                    className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Template Baru</span>
                  </button>
                </div>
              </div>

              {/* Template Items List */}
              {isLoading && templates.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" />
                  Mengambil template dari Supabase...
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl p-6">
                  <Bookmark className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-bold text-slate-700">Belum ada template tersimpan</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                    Kustomisasi dan simpan settingan filter, kolom aktif, diskon, dan ekspor agar bisa langsung dipakai kembali kapan saja.
                  </p>
                  <button
                    onClick={handleStartCreateNew}
                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Buat Template Sekarang</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {filteredTemplates.map((tmpl) => {
                    const cfg = tmpl.config || {};
                    const colCount = cfg.visibleKeys ? cfg.visibleKeys.length : null;
                    const discountCount = cfg.discountRules ? cfg.discountRules.filter((r) => r.isActive).length : 0;
                    const brandFilter = cfg.selectedBrand && cfg.selectedBrand !== 'ALL' ? cfg.selectedBrand : null;
                    const brandHpFilter = cfg.selectedBrandHp && cfg.selectedBrandHp !== 'ALL' ? cfg.selectedBrandHp : null;

                    return (
                      <div
                        key={tmpl.id}
                        className="bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md rounded-2xl p-4 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                      >
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 text-sm">{tmpl.name}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 uppercase tracking-wider">
                              {tmpl.target_type || 'ALL'}
                            </span>
                          </div>
                          {tmpl.description && (
                            <p className="text-xs text-slate-500 line-clamp-1">{tmpl.description}</p>
                          )}

                          {/* Badges of included configs */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            {brandFilter && (
                              <span className="text-[10px] font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md border border-indigo-100 flex items-center gap-1">
                                <Filter className="w-3 h-3" /> Brand: {brandFilter}
                              </span>
                            )}
                            {brandHpFilter && (
                              <span className="text-[10px] font-semibold bg-sky-50 text-sky-700 px-2 py-0.5 rounded-md border border-sky-100">
                                HP: {brandHpFilter}
                              </span>
                            )}
                            {colCount !== null && (
                              <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md flex items-center gap-1">
                                <SlidersHorizontal className="w-3 h-3" /> {colCount} Kolom
                              </span>
                            )}
                            {discountCount > 0 && (
                              <span className="text-[10px] font-semibold bg-rose-50 text-rose-700 px-2 py-0.5 rounded-md border border-rose-100 flex items-center gap-1">
                                <Percent className="w-3 h-3" /> {discountCount} Diskon
                              </span>
                            )}
                            {cfg.pdfConfig && (
                              <span className="text-[10px] font-semibold bg-red-50 text-red-700 px-2 py-0.5 rounded-md border border-red-100 flex items-center gap-1">
                                <FileText className="w-3 h-3" /> PDF
                              </span>
                            )}
                            {cfg.excelConfig && (
                              <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-100 flex items-center gap-1">
                                <FileSpreadsheet className="w-3 h-3" /> Excel
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-wrap items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                          {confirmDeleteId === tmpl.id ? (
                            <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 p-1 rounded-xl animate-in fade-in zoom-in-95 duration-100">
                              <span className="text-xs font-bold text-rose-800 px-1">Hapus?</span>
                              <button
                                type="button"
                                onClick={() => handleDeleteConfirm(tmpl.id)}
                                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg transition-colors shadow-2xs"
                              >
                                Ya, Hapus
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-2.5 py-1 bg-white border border-slate-300 text-slate-700 font-bold text-xs rounded-lg hover:bg-slate-50 transition-colors"
                              >
                                Batal
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => onApplyTemplate(tmpl, 'apply_only')}
                                className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-2xs"
                                title="Terapkan ke tabel Master LCD saat ini"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Terapkan</span>
                              </button>

                              {cfg.pdfConfig && (
                                <button
                                  onClick={() => onApplyTemplate(tmpl, 'open_pdf')}
                                  className="p-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg transition-colors"
                                  title="Terapkan dan Buka Ekspor PDF"
                                >
                                  <FileText className="w-4 h-4" />
                                </button>
                              )}

                              {cfg.excelConfig && (
                                <button
                                  onClick={() => onApplyTemplate(tmpl, 'open_excel')}
                                  className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg transition-colors"
                                  title="Terapkan dan Buka Ekspor Excel"
                                >
                                  <FileSpreadsheet className="w-4 h-4" />
                                </button>
                              )}

                              <button
                                onClick={() => handleStartEdit(tmpl)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                                title="Edit Data Template"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => setConfirmDeleteId(tmpl.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Hapus Template"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Create / Edit Form with Interactive Config Accordion */
            <form onSubmit={handleSaveTemplate} className="space-y-4">
              {/* Template Basic Info */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                  Informasi Template
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Template <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Pricelist XPAS Promo Diskon 5% (Format PDF Siap Kirim)"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Keterangan (Opsional)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Template penawaran khusus toko partner"
                      value={templateDesc}
                      onChange={(e) => setTemplateDesc(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Kategori Target Template
                    </label>
                    <select
                      value={targetType}
                      onChange={(e: any) => setTargetType(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                    >
                      <option value="all">Semua Pengaturan (Lengkap)</option>
                      <option value="pdf">Khusus Format Ekspor PDF</option>
                      <option value="excel">Khusus Format Ekspor Excel</option>
                      <option value="view">Khusus Tampilan Tabel & Filter</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Interactive Config Sections */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <div className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                    Pengaturan Komponen Template:
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Klik judul atau tombol panah untuk mengatur detail masing-masing komponen
                  </span>
                </div>

                {/* 1. FILTER & PENCARIAN ACCORDION */}
                <div className={`border rounded-xl transition-all overflow-hidden bg-white ${
                  includeFilters ? 'border-indigo-200 shadow-2xs' : 'border-slate-200 opacity-60'
                }`}>
                  <div className="p-3.5 bg-slate-50 flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeFilters}
                        onChange={(e) => setIncludeFilters(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
                          <Filter className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-xs text-slate-900">
                            1. Filter & Pencarian
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Brand LCD: <b className="text-slate-700">{filterBrand}</b> | HP: <b className="text-slate-700">{filterBrandHp}</b> {filterSearchTerm ? `| Cari: "${filterSearchTerm}"` : ''} {Object.keys(filterColFilters).length > 0 ? `| ${Object.keys(filterColFilters).length} Filter Kolom` : ''}
                          </div>
                        </div>
                      </div>
                    </label>

                    <button
                      type="button"
                      onClick={() => toggleAccordion('filters')}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      <span>{expandedSection === 'filters' ? 'Tutup Pilihan' : 'Atur Pilihan'}</span>
                      {expandedSection === 'filters' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  {expandedSection === 'filters' && (
                    <div className="p-4 border-t border-slate-200 bg-white">
                      <TemplateFilterConfig
                        selectedBrand={filterBrand}
                        onChangeSelectedBrand={setFilterBrand}
                        selectedBrandHp={filterBrandHp}
                        onChangeSelectedBrandHp={setFilterBrandHp}
                        searchTerm={filterSearchTerm}
                        onChangeSearchTerm={setFilterSearchTerm}
                        columnFilters={filterColFilters}
                        onChangeColumnFilters={setFilterColFilters}
                        availableBrandsHp={availableBrandsHp}
                        items={effectiveItems}
                      />
                    </div>
                  )}
                </div>

                {/* 2. KOLOM AKTIF ACCORDION */}
                <div className={`border rounded-xl transition-all overflow-hidden bg-white ${
                  includeColumns ? 'border-indigo-200 shadow-2xs' : 'border-slate-200 opacity-60'
                }`}>
                  <div className="p-3.5 bg-slate-50 flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeColumns}
                        onChange={(e) => setIncludeColumns(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
                          <SlidersHorizontal className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-xs text-slate-900">
                            2. Kolom Aktif Tabel
                          </div>
                          <div className="text-[11px] text-slate-500">
                            <b className="text-slate-700">{activeVisibleKeys.length}</b> kolom dicentang aktif untuk template ini
                          </div>
                        </div>
                      </div>
                    </label>

                    <button
                      type="button"
                      onClick={() => toggleAccordion('columns')}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      <span>{expandedSection === 'columns' ? 'Tutup Pilihan' : 'Atur Pilihan'}</span>
                      {expandedSection === 'columns' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  {expandedSection === 'columns' && (
                    <div className="p-4 border-t border-slate-200 bg-white">
                      <TemplateColumnsConfig
                        visibleKeys={activeVisibleKeys}
                        onChangeVisibleKeys={setActiveVisibleKeys}
                      />
                    </div>
                  )}
                </div>

                {/* 3. ATURAN DISKON ACCORDION */}
                <div className={`border rounded-xl transition-all overflow-hidden bg-white ${
                  includeDiscounts ? 'border-rose-200 shadow-2xs' : 'border-slate-200 opacity-60'
                }`}>
                  <div className="p-3.5 bg-slate-50 flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeDiscounts}
                        onChange={(e) => setIncludeDiscounts(e.target.checked)}
                        className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                      />
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-rose-100 text-rose-700 rounded-lg">
                          <Percent className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-xs text-slate-900">
                            3. Aturan Diskon
                          </div>
                          <div className="text-[11px] text-slate-500">
                            <b className="text-rose-700">{activeDiscountRules.filter((r) => r.isActive).length}</b> aturan diskon aktif terpasang
                          </div>
                        </div>
                      </div>
                    </label>

                    <button
                      type="button"
                      onClick={() => toggleAccordion('discounts')}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <span>{expandedSection === 'discounts' ? 'Tutup Pilihan' : 'Atur Pilihan'}</span>
                      {expandedSection === 'discounts' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  {expandedSection === 'discounts' && (
                    <div className="p-4 border-t border-slate-200 bg-white">
                      <TemplateDiscountConfig
                        discountRules={activeDiscountRules}
                        onChangeDiscountRules={setActiveDiscountRules}
                        availableBrandsHp={availableBrandsHp}
                      />
                    </div>
                  )}
                </div>

                {/* 4. PENGATURAN PDF ACCORDION */}
                <div className={`border rounded-xl transition-all overflow-hidden bg-white ${
                  includePdfConfig ? 'border-red-200 shadow-2xs' : 'border-slate-200 opacity-60'
                }`}>
                  <div className="p-3.5 bg-slate-50 flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includePdfConfig}
                        onChange={(e) => setIncludePdfConfig(e.target.checked)}
                        className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                      />
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-red-100 text-red-700 rounded-lg">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-xs text-slate-900">
                            4. Pengaturan Ekspor PDF
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Brand: <b className="text-slate-700">{activePdfConfig.brandLcd || 'XPAS'}</b> | Mode: <b className="text-slate-700">{activePdfConfig.splitMode || 'auto'}</b> | Stok: <b className="text-slate-700">{activePdfConfig.includeStock ? 'Ya' : 'Tidak'}</b>
                          </div>
                        </div>
                      </div>
                    </label>

                    <button
                      type="button"
                      onClick={() => toggleAccordion('pdf')}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <span>{expandedSection === 'pdf' ? 'Tutup Pilihan' : 'Atur Pilihan'}</span>
                      {expandedSection === 'pdf' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  {expandedSection === 'pdf' && (
                    <div className="p-4 border-t border-slate-200 bg-white">
                      <TemplatePdfConfig
                        pdfConfig={activePdfConfig}
                        onChangePdfConfig={setActivePdfConfig}
                        availableBrandsHp={availableBrandsHp}
                      />
                    </div>
                  )}
                </div>

                {/* 5. PENGATURAN EXCEL ACCORDION */}
                <div className={`border rounded-xl transition-all overflow-hidden bg-white ${
                  includeExcelConfig ? 'border-emerald-200 shadow-2xs' : 'border-slate-200 opacity-60'
                }`}>
                  <div className="p-3.5 bg-slate-50 flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeExcelConfig}
                        onChange={(e) => setIncludeExcelConfig(e.target.checked)}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
                          <FileSpreadsheet className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-xs text-slate-900">
                            5. Pengaturan Ekspor Excel
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Gaya Emas: <b className="text-slate-700">{activeExcelConfig.useGoldenStyle ? 'Ya' : 'Tidak'}</b> | Stok: <b className="text-slate-700">{activeExcelConfig.showStock ? 'Ya' : 'Tidak'}</b> | Sort: <b className="text-slate-700">{activeExcelConfig.primarySortCol}</b>
                          </div>
                        </div>
                      </div>
                    </label>

                    <button
                      type="button"
                      onClick={() => toggleAccordion('excel')}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors"
                    >
                      <span>{expandedSection === 'excel' ? 'Tutup Pilihan' : 'Atur Pilihan'}</span>
                      {expandedSection === 'excel' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  {expandedSection === 'excel' && (
                    <div className="p-4 border-t border-slate-200 bg-white">
                      <TemplateExcelConfig
                        excelConfig={activeExcelConfig}
                        onChangeExcelConfig={setActiveExcelConfig}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !templateName.trim()}
                  className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Menyimpan...' : editingTemplateId ? 'Simpan Perubahan' : 'Simpan Template'}</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <span>
            {templates.length} template tersimpan di tabel <code className="font-mono bg-slate-200/70 px-1 py-0.5 rounded text-[11px]">master_lcd_templates</code>
          </span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg font-bold text-xs transition-colors"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
}
