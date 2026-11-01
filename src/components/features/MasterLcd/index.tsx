import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../../services/supabase';
import { MasterLcdItem, DEFAULT_COLUMNS, DiscountRule } from './types';
import { MasterLcdTable } from './MasterLcdTable';
import { MasterLcdHeaderToggle } from './MasterLcdHeaderToggle';
import { MasterLcdUploadModal } from './MasterLcdUploadModal';
import { MasterLcdExportModal } from './MasterLcdExportModal';
import { MasterLcdPdfExportModal } from './MasterLcdPdfExportModal';
import { MasterLcdDiscountModal } from './MasterLcdDiscountModal';
import { MasterLcdStockUpdateModal } from './MasterLcdStockUpdateModal';
import { MasterLcdTemplateModal } from './MasterLcdTemplateModal';
import { MasterLcdTemplate, fetchTemplates } from './templateService';
import { applyDiscountsToItems } from './discountUtils';
import { 
  FileSpreadsheet, 
  FileText,
  Upload, 
  Download, 
  SlidersHorizontal, 
  RefreshCw, 
  Trash2, 
  Layers, 
  Package, 
  PackageCheck,
  Sparkles,
  AlertTriangle,
  Percent,
  Tag,
  Bookmark
} from 'lucide-react';

const STORAGE_KEY_COLUMNS = 'master_lcd_visible_keys_v1';
const STORAGE_KEY_DISCOUNTS = 'master_lcd_discount_rules_v1';

export function MasterLcdView() {
  const [items, setItems] = useState<MasterLcdItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<MasterLcdItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isStockUpdateOpen, setIsStockUpdateOpen] = useState(false);
  const [isToggleOpen, setIsToggleOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isPdfExportOpen, setIsPdfExportOpen] = useState(false);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);

  // Selected template for passing to export modals
  const [selectedTemplateForPdf, setSelectedTemplateForPdf] = useState<MasterLcdTemplate | null>(null);
  const [selectedTemplateForExcel, setSelectedTemplateForExcel] = useState<MasterLcdTemplate | null>(null);
  const [templatesCount, setTemplatesCount] = useState<number>(0);

  // Live filter state reported from table
  const [currentFilterState, setCurrentFilterState] = useState({
    selectedBrand: 'ALL',
    selectedBrandHp: 'ALL',
    searchTerm: '',
    columnFilters: {} as Record<string, string[]>
  });

  // External filters to apply to table from template
  const [externalFilters, setExternalFilters] = useState<{
    selectedBrand?: string;
    selectedBrandHp?: string;
    searchTerm?: string;
    columnFilters?: Record<string, string[]>;
    key?: string | number;
  } | undefined>(undefined);

  // Discount rules state
  const [discountRules, setDiscountRules] = useState<DiscountRule[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DISCOUNTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse saved discount rules:', e);
    }
    return [];
  });

  const handleSaveDiscountRules = (rules: DiscountRule[]) => {
    setDiscountRules(rules);
    try {
      localStorage.setItem(STORAGE_KEY_DISCOUNTS, JSON.stringify(rules));
    } catch (e) {
      console.warn('Failed to save discount rules:', e);
    }
  };

  // Visible columns state
  const [visibleKeys, setVisibleKeys] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_COLUMNS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse saved columns:', e);
    }
    return DEFAULT_COLUMNS.filter(c => c.defaultVisible).map(c => c.key);
  });

  const handleVisibleKeysChange = (keys: string[]) => {
    setVisibleKeys(keys);
    try {
      localStorage.setItem(STORAGE_KEY_COLUMNS, JSON.stringify(keys));
    } catch (e) {
      console.warn('Failed to save columns preference:', e);
    }
  };

  // Fetch count of templates saved in database / local
  const refreshTemplatesCount = useCallback(async () => {
    try {
      const tmpls = await fetchTemplates();
      setTemplatesCount(tmpls.length);
    } catch (e) {
      console.warn('Failed to fetch template count:', e);
    }
  }, []);

  useEffect(() => {
    refreshTemplatesCount();
  }, [refreshTemplatesCount]);

  const handleApplyTemplate = (template: MasterLcdTemplate, openAction?: 'apply_only' | 'open_pdf' | 'open_excel') => {
    // 1. Apply visible columns if configured
    if (template.config.visibleKeys && template.config.visibleKeys.length > 0) {
      handleVisibleKeysChange(template.config.visibleKeys);
    }

    // 2. Apply discount rules if configured
    if (template.config.discountRules) {
      handleSaveDiscountRules(template.config.discountRules);
    }

    // 3. Apply filters if configured
    if (
      template.config.selectedBrand !== undefined ||
      template.config.selectedBrandHp !== undefined ||
      template.config.searchTerm !== undefined ||
      template.config.columnFilters !== undefined
    ) {
      const colFilters = { ...(template.config.columnFilters || {}) };

      // Synchronize price column filters with discounts if applicable
      const effectiveRules = template.config.discountRules || discountRules;
      if (effectiveRules && effectiveRules.length > 0) {
        const discountedItems = applyDiscountsToItems(items, effectiveRules);

        (['harga_box', 'harga_pcs'] as const).forEach((priceKey) => {
          if (colFilters[priceKey] && Array.isArray(colFilters[priceKey])) {
            const allowedSet = new Set<string>(colFilters[priceKey]);
            const origKey = priceKey === 'harga_box' ? 'original_harga_box' : 'original_harga_pcs';

            discountedItems.forEach((item) => {
              const origVal = (item as any)[origKey] !== undefined ? String((item as any)[origKey]).trim() : '';
              const currentVal = (item as any)[priceKey] !== undefined ? String((item as any)[priceKey]).trim() : '';
              if (origVal && allowedSet.has(origVal) && currentVal) {
                allowedSet.add(currentVal);
              }
            });

            colFilters[priceKey] = Array.from(allowedSet);
          }
        });
      }

      setExternalFilters({
        selectedBrand: template.config.selectedBrand ?? 'ALL',
        selectedBrandHp: template.config.selectedBrandHp ?? 'ALL',
        searchTerm: template.config.searchTerm ?? '',
        columnFilters: colFilters,
        key: Date.now()
      });
    }

    // 4. Handle open actions
    if (openAction === 'open_pdf') {
      setSelectedTemplateForPdf(template);
      setIsPdfExportOpen(true);
      setIsTemplateModalOpen(false);
    } else if (openAction === 'open_excel') {
      setSelectedTemplateForExcel(template);
      setIsExportOpen(true);
      setIsTemplateModalOpen(false);
    } else {
      setIsTemplateModalOpen(false);
    }
  };

  // Processed items with discounts dynamically applied to harga_box and harga_pcs
  const processedItems = useMemo(() => {
    return applyDiscountsToItems(items, discountRules);
  }, [items, discountRules]);

  const activeRulesCount = useMemo(() => {
    return discountRules.filter(r => r.isActive && r.discountValue > 0).length;
  }, [discountRules]);

  const discountedItemsCount = useMemo(() => {
    return processedItems.filter(i => i.applied_discount_text).length;
  }, [processedItems]);

  // Fetch all items with chunked .range() loop according to pagination rules
  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const CHUNK_SIZE = 1000;
      let allRecords: MasterLcdItem[] = [];
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error: fetchErr } = await supabase
          .from('master_lcd')
          .select('*')
          .range(from, from + CHUNK_SIZE - 1)
          .order('kode_lcd', { ascending: true });

        if (fetchErr) {
          // If table doesn't exist yet, attempt lazy auto-create
          if (fetchErr.code === '42P01') {
            try {
              await supabase.rpc('exec_sql', {
                query_text: `
                  CREATE TABLE IF NOT EXISTS master_lcd (
                    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                    kode_lcd TEXT,
                    brand_hp TEXT,
                    status_lcd TEXT,
                    oled_soft_oled TEXT,
                    iphone_new TEXT,
                    batrai_iphone TEXT,
                    nama_lcd TEXT,
                    model_lcd TEXT,
                    packing NUMERIC DEFAULT 0,
                    harga_box NUMERIC DEFAULT 0,
                    harga_pcs NUMERIC DEFAULT 0,
                    stock NUMERIC DEFAULT 0,
                    brand_ TEXT,
                    raw_data JSONB,
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    updated_at TIMESTAMPTZ DEFAULT NOW()
                  );
                  CREATE INDEX IF NOT EXISTS idx_master_lcd_brand_ ON master_lcd(brand_);
                  CREATE INDEX IF NOT EXISTS idx_master_lcd_kode_lcd ON master_lcd(kode_lcd);
                  CREATE INDEX IF NOT EXISTS idx_master_lcd_brand_hp ON master_lcd(brand_hp);
                  ALTER TABLE master_lcd ENABLE ROW LEVEL SECURITY;
                  DO $$
                  BEGIN
                    IF NOT EXISTS (
                      SELECT 1 FROM pg_policies WHERE tablename = 'master_lcd' AND policyname = 'Allow all operations for master_lcd'
                    ) THEN
                      CREATE POLICY "Allow all operations for master_lcd" ON master_lcd FOR ALL USING (true) WITH CHECK (true);
                    END IF;
                  END $$;
                `
              });
              // Retry fetch once
              const retry = await supabase.from('master_lcd').select('*').limit(10);
              if (!retry.error) {
                setItems(retry.data || []);
                return;
              }
            } catch (rpcErr) {
              console.warn('Auto create master_lcd failed:', rpcErr);
            }
            throw new Error('Tabel master_lcd belum dibuat di Supabase. Silakan buka menu DB Setup dan klik "Eksekusi Query Sekarang".');
          }
          throw new Error(fetchErr.message);
        }

        if (data && data.length > 0) {
          allRecords = allRecords.concat(data as MasterLcdItem[]);
          if (data.length < CHUNK_SIZE) {
            hasMore = false;
          } else {
            from += CHUNK_SIZE;
          }
        } else {
          hasMore = false;
        }
      }

      setItems(allRecords);
    } catch (err: any) {
      console.error('Error fetching master LCD data:', err);
      setError(err.message || 'Gagal mengambil data Master LCD');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Statistics
  const stats = useMemo(() => {
    let vivanCount = 0;
    let xpasCount = 0;
    let totalStock = 0;

    items.forEach(item => {
      const brand = String(item.brand_ || item.brand_lcd || '').toUpperCase();
      if (brand.includes('VIVAN')) vivanCount++;
      else if (brand.includes('XPAS') || brand.includes('X-PAS') || brand === 'XP') xpasCount++;
      totalStock += Number(item.stock || 0);
    });

    return {
      total: items.length,
      vivanCount,
      xpasCount,
      totalStock
    };
  }, [items]);

  const confirmDeleteAll = async () => {
    setIsDeleting(true);
    try {
      const { error: delErr } = await supabase
        .from('master_lcd')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (delErr) throw delErr;
      setItems([]);
      setShowDeleteAllModal(false);
    } catch (err: any) {
      setError(`Gagal menghapus data: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner / Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl shadow-xs border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-indigo-700 text-white rounded-xl shadow-md">
            <FileSpreadsheet className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Master LCD</h1>
              <span className="text-[11px] font-bold bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full border border-indigo-100">
                Pricelist Engine
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Live spreadsheet & generator otomatis pricelist VIVAN dan XPAS ke dalam sheet terpisah
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Template & Preset Manager Button */}
          <button
            onClick={() => setIsTemplateModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-all"
            title="Kelola & Terapkan Template Filter, Kolom, Diskon & Ekspor dari Database"
          >
            <Bookmark className="w-4 h-4" />
            <span>Template Preset {templatesCount > 0 && `(${templatesCount})`}</span>
          </button>

          {/* Header Visibility Toggle */}
          <button
            onClick={() => setIsToggleOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg shadow-2xs transition-all"
          >
            <SlidersHorizontal className="w-4 h-4 text-slate-500" />
            <span>Kolom Aktif ({visibleKeys.length})</span>
          </button>

          {/* Discount Settings Button */}
          <button
            onClick={() => setIsDiscountModalOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg shadow-2xs transition-all ${
              activeRulesCount > 0
                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs'
                : 'bg-white border border-slate-300 hover:bg-slate-50 text-slate-700'
            }`}
          >
            <Percent className="w-4 h-4" />
            <span>Atur Diskon {activeRulesCount > 0 && `(${activeRulesCount})`}</span>
          </button>

          {/* Upload Master LCD Button */}
          <button
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Master LCD</span>
          </button>

          {/* Update Realtime Stock Button */}
          <button
            onClick={() => setIsStockUpdateOpen(true)}
            disabled={items.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            title="Upload file Excel stok dari ERP untuk perbarui stok realtime"
          >
            <PackageCheck className="w-4 h-4" />
            <span>Update Stok</span>
          </button>

          {/* Export Excel Button */}
          <button
            onClick={() => setIsExportOpen(true)}
            disabled={items.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor Excel</span>
          </button>

          {/* Export PDF Button */}
          <button
            onClick={() => setIsPdfExportOpen(true)}
            disabled={items.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileText className="w-4 h-4" />
            <span>Ekspor PDF (A4)</span>
          </button>

          {/* Refresh */}
          <button
            onClick={fetchAllData}
            disabled={isLoading}
            className="p-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 rounded-lg shadow-2xs disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>

          {/* Delete All if has items */}
          {items.length > 0 && (
            <button
              onClick={() => setShowDeleteAllModal(true)}
              disabled={isDeleting || isLoading}
              className="p-2 border border-red-200 bg-white hover:bg-red-50 text-red-600 rounded-lg shadow-2xs disabled:opacity-50"
              title="Hapus Semua Data"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Master */}
        <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500">Total Master LCD</span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {stats.total.toLocaleString()}
            </div>
            <span className="text-[11px] text-slate-400">Item terdaftar</span>
          </div>
          <div className="p-3 bg-slate-100 text-slate-600 rounded-xl">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        {/* Brand VIVAN */}
        <div className="bg-white p-4 rounded-xl shadow-xs border border-indigo-100 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-indigo-600">Brand VIVAN</span>
            <div className="text-2xl font-black text-indigo-600 mt-1">
              {stats.vivanCount.toLocaleString()}
            </div>
            <span className="text-[11px] text-indigo-400">Siap diekspor ke sheet VIVAN</span>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <span className="font-black text-sm">VSA</span>
          </div>
        </div>

        {/* Brand XPAS */}
        <div className="bg-white p-4 rounded-xl shadow-xs border border-emerald-100 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-emerald-600">Brand XPAS</span>
            <div className="text-2xl font-black text-emerald-600 mt-1">
              {stats.xpasCount.toLocaleString()}
            </div>
            <span className="text-[11px] text-emerald-400">Siap diekspor ke sheet XPAS</span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <span className="font-black text-sm">XP</span>
          </div>
        </div>

        {/* Total Stock */}
        <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500">Total Stock LCD</span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {stats.totalStock.toLocaleString()}
            </div>
            <span className="text-[11px] text-slate-400">Unit tersedia</span>
          </div>
          <div className="p-3 bg-slate-100 text-slate-600 rounded-xl">
            <Package className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Pemberitahuan Database:</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Active Discount Alert Banner */}
      {activeRulesCount > 0 && (
        <div className="bg-gradient-to-r from-rose-50 to-orange-50 border border-rose-200 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-rose-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-500 text-white rounded-lg shadow-2xs">
              <Percent className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold flex items-center gap-1.5">
                <span>Diskon Aktif ({activeRulesCount} Aturan Diterapkan)</span>
                <span className="text-[10px] bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full font-bold">
                  {discountedItemsCount.toLocaleString()} item terpengaruh
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Harga per box dan harga per pcs otomatis telah dikurangi diskon pada tabel live dan ekspor Excel.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsDiscountModalOpen(true)}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg shadow-2xs text-xs transition-colors"
            >
              Ubah Diskon
            </button>
            <button
              onClick={() => handleSaveDiscountRules([])}
              className="px-2.5 py-1.5 bg-white border border-rose-300 hover:bg-rose-100 text-rose-700 font-bold rounded-lg text-xs transition-colors"
            >
              Hapus Diskon
            </button>
          </div>
        </div>
      )}

      {/* Live Excel Table Component */}
      <MasterLcdTable
        items={processedItems}
        visibleKeys={visibleKeys}
        isLoading={isLoading}
        onFilteredItemsChange={setFilteredItems}
        externalFilters={externalFilters}
        onFilterStateChange={setCurrentFilterState}
      />

      {/* Modals */}
      {isToggleOpen && (
        <MasterLcdHeaderToggle
          isOpen={isToggleOpen}
          onClose={() => setIsToggleOpen(false)}
          visibleKeys={visibleKeys}
          onChange={handleVisibleKeysChange}
        />
      )}

      {isUploadOpen && (
        <MasterLcdUploadModal
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
          onUploadSuccess={fetchAllData}
        />
      )}

      {isStockUpdateOpen && (
        <MasterLcdStockUpdateModal
          isOpen={isStockUpdateOpen}
          onClose={() => setIsStockUpdateOpen(false)}
          onUpdateSuccess={fetchAllData}
          masterItems={items}
        />
      )}

      {isExportOpen && (
        <MasterLcdExportModal
          isOpen={isExportOpen}
          onClose={() => {
            setIsExportOpen(false);
            setSelectedTemplateForExcel(null);
          }}
          items={items}
          filteredItems={filteredItems}
          visibleKeys={visibleKeys}
          discountRules={discountRules}
          initialTemplate={selectedTemplateForExcel}
        />
      )}

      {isPdfExportOpen && (
        <MasterLcdPdfExportModal
          isOpen={isPdfExportOpen}
          onClose={() => {
            setIsPdfExportOpen(false);
            setSelectedTemplateForPdf(null);
          }}
          items={items}
          filteredItems={filteredItems}
          discountRules={discountRules}
          initialTemplate={selectedTemplateForPdf}
        />
      )}

      {isDiscountModalOpen && (
        <MasterLcdDiscountModal
          isOpen={isDiscountModalOpen}
          onClose={() => setIsDiscountModalOpen(false)}
          rules={discountRules}
          onSaveRules={handleSaveDiscountRules}
          items={items}
        />
      )}

      {isTemplateModalOpen && (
        <MasterLcdTemplateModal
          isOpen={isTemplateModalOpen}
          onClose={() => setIsTemplateModalOpen(false)}
          items={items}
          currentState={{
            selectedBrand: currentFilterState.selectedBrand,
            selectedBrandHp: currentFilterState.selectedBrandHp,
            searchTerm: currentFilterState.searchTerm,
            columnFilters: currentFilterState.columnFilters,
            visibleKeys,
            discountRules,
            pdfConfig: {
              dataScope: filteredItems.length > 0 && filteredItems.length !== items.length ? 'filtered' : 'all',
              splitMode: 'auto_threshold',
              maxRowsPerPage: 50,
              orientation: 'portrait',
              includeStock: false
            },
            excelConfig: {
              dataScope: 'all',
              useGoldenStyle: true,
              showStock: visibleKeys.includes('stock')
            }
          }}
          onApplyTemplate={handleApplyTemplate}
          onTemplatesChanged={refreshTemplatesCount}
        />
      )}

      {/* Delete All Confirmation Modal */}
      {showDeleteAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-5 max-w-md w-full space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 bg-rose-50 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Hapus Seluruh Master LCD?</h3>
                <p className="text-xs text-slate-500">Tindakan ini tidak dapat dibatalkan.</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
              Apakah Anda yakin ingin menghapus seluruh <strong>{items.length.toLocaleString()}</strong> data Master LCD di database? Semua harga dan stok akan dikosongkan.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteAllModal(false)}
                disabled={isDeleting}
                className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeleteAll}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Menghapus...' : 'Ya, Hapus Semua'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
