import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Search, Package, Plus, Hash, X, Calendar, FileText, CheckCircle2, ChevronDown } from 'lucide-react';
import { cn } from '../../../utils/cn';
import { LcdReturItem, formatMonthYearId } from '../../../services/lcdReturService';
import { Customer } from './ReturCustomerSection';

export interface Product {
  goods_code: string;
  goods_name: string;
  category?: string;
}

interface ReturProductSectionProps {
  products: Product[];
  lcdRecords: LcdReturItem[];
  selectedCustomer: Customer | null;
  selectedProduct: Product | null;
  onSelectProduct: (p: Product | null) => void;
  isLcdMode: boolean;
  noSo: string;
  noSd: string;
  onNoSoChange: (val: string) => void;
  onNoSdChange: (val: string) => void;
  qty: number;
  onQtyChange: (val: number) => void;
  isManualProduct: boolean;
  onToggleManualProduct: (val: boolean) => void;
  manualGoodsCode: string;
  onManualGoodsCodeChange: (val: string) => void;
  manualGoodsName: string;
  onManualGoodsNameChange: (val: string) => void;
  manualCategory: string;
  onManualCategoryChange: (val: string) => void;
  categories: string[];
}

export function ReturProductSection({
  products,
  lcdRecords,
  selectedCustomer,
  selectedProduct,
  onSelectProduct,
  isLcdMode,
  noSo,
  noSd,
  onNoSoChange,
  onNoSdChange,
  qty,
  onQtyChange,
  isManualProduct,
  onToggleManualProduct,
  manualGoodsCode,
  onManualGoodsCodeChange,
  manualGoodsName,
  onManualGoodsNameChange,
  manualCategory,
  onManualCategoryChange,
  categories
}: ReturProductSectionProps) {
  const [prodSearch, setProdSearch] = useState('');
  const [showProdDropdown, setShowProdDropdown] = useState(false);
  const [showSoDropdown, setShowSoDropdown] = useState(false);
  const [showCatDropdown, setShowCatDropdown] = useState(false);
  const [selectedSoPeriod, setSelectedSoPeriod] = useState<string>('');

  // 1. Prepare available products depending on whether it's LCD Mode or All Kategori
  const availableProducts = useMemo<Product[]>(() => {
    if (!isLcdMode) {
      return products;
    }

    // In LCD Mode: Load from database_lcd
    if (selectedCustomer) {
      // Step 1: Filter database_lcd rows for this customer
      const custCode = (selectedCustomer.customer_code || '').trim().toLowerCase();
      const custName = (selectedCustomer.customer_name || '').trim().toLowerCase();

      const matchedCustRows = lcdRecords.filter(r => {
        const rCustCode = (r.customer_code || '').trim().toLowerCase();
        const rCustName = (r.customer_name || '').trim().toLowerCase();
        return (custCode && rCustCode === custCode) || (custName && rCustName === custName);
      });

      if (matchedCustRows.length > 0) {
        // Extract distinct products for this customer
        const prodMap = new Map<string, Product>();
        matchedCustRows.forEach(r => {
          const key = (r.goods_name || '').trim().toLowerCase();
          if (key && !prodMap.has(key)) {
            prodMap.set(key, {
              goods_code: r.goods_code || '',
              goods_name: r.goods_name,
              category: 'LCD'
            });
          }
        });
        return Array.from(prodMap.values());
      }
    }

    // If no customer selected yet, or customer has no prior rows, load all distinct products from database_lcd
    const allLcdProdMap = new Map<string, Product>();
    lcdRecords.forEach(r => {
      const key = (r.goods_name || '').trim().toLowerCase();
      if (key && !allLcdProdMap.has(key)) {
        allLcdProdMap.set(key, {
          goods_code: r.goods_code || '',
          goods_name: r.goods_name,
          category: 'LCD'
        });
      }
    });

    return Array.from(allLcdProdMap.values());
  }, [isLcdMode, selectedCustomer, lcdRecords, products]);

  // Filtered product suggestions for the search input
  const filteredProducts = useMemo(() => {
    const q = prodSearch.trim().toLowerCase();
    if (!q) return availableProducts.slice(0, 15);
    return availableProducts.filter(p =>
      (p.goods_name || '').toLowerCase().includes(q) ||
      (p.goods_code || '').toLowerCase().includes(q)
    ).slice(0, 15);
  }, [availableProducts, prodSearch]);

  // 2. Cascading SO & SD suggestions filtered by selected customer & selected product
  const soSuggestions = useMemo(() => {
    if (!isLcdMode || !selectedCustomer || !selectedProduct) {
      return [];
    }

    const custCode = (selectedCustomer.customer_code || '').trim().toLowerCase();
    const custName = (selectedCustomer.customer_name || '').trim().toLowerCase();
    const prodName = (selectedProduct.goods_name || '').trim().toLowerCase();
    const prodCode = (selectedProduct.goods_code || '').trim().toLowerCase();

    // Find all rows in database_lcd matching BOTH customer and product
    const matchingRows = lcdRecords.filter(r => {
      const rCustCode = (r.customer_code || '').trim().toLowerCase();
      const rCustName = (r.customer_name || '').trim().toLowerCase();
      const matchesCust = (custCode && rCustCode === custCode) || (custName && rCustName === custName);

      if (!matchesCust) return false;

      const rProdName = (r.goods_name || '').trim().toLowerCase();
      const rProdCode = (r.goods_code || '').trim().toLowerCase();
      const matchesProd = (prodName && rProdName === prodName) || (prodCode && rProdCode === prodCode);

      return matchesProd;
    });

    // Map into SO & SD suggestion objects with formatted Month & Year from tgl_so
    const seenSo = new Set<string>();
    const options: Array<{
      no_so: string;
      no_sd: string;
      tgl_so?: string | null;
      month_year: string;
      raw: LcdReturItem;
    }> = [];

    matchingRows.forEach(r => {
      const soVal = (r.no_so || '').trim();
      const sdVal = (r.no_sd || '').trim();
      const tglVal = r.tgl_so || r.date || null;
      const monthYear = formatMonthYearId(tglVal) || 'Periode SO';

      const uniqueKey = `${soVal}__${sdVal}`;
      if (!seenSo.has(uniqueKey)) {
        seenSo.add(uniqueKey);
        options.push({
          no_so: soVal,
          no_sd: sdVal,
          tgl_so: tglVal,
          month_year: monthYear,
          raw: r
        });
      }
    });

    return options;
  }, [isLcdMode, selectedCustomer, selectedProduct, lcdRecords]);

  // Handle selecting a Month & Year from SO suggestions
  const handleSelectSoOption = (option: {
    no_so: string;
    no_sd: string;
    month_year: string;
  }) => {
    // Label/input still gets the real no_so value!
    onNoSoChange(option.no_so);
    // Auto-fill no_sd because it belongs to the same row in database_lcd!
    onNoSdChange(option.no_sd);
    setSelectedSoPeriod(option.month_year);
    setShowSoDropdown(false);
  };

  const filteredCategories = categories.filter(cat =>
    cat.toLowerCase().includes(manualCategory.toLowerCase())
  );

  return (
    <Card className="border-none shadow-xl shadow-slate-200/50 overflow-visible h-full">
      <CardHeader className="border-b border-slate-50 bg-slate-50/30">
        <CardTitle className="text-base flex items-center justify-between text-slate-800">
          <span className="flex items-center">
            <Package className="w-4 h-4 mr-2 text-rose-500" />
            Detail Produk & Qty
          </span>
          {isLcdMode && (
            <span className="text-[9px] font-bold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-md border border-cyan-100">
              Katalog Database LCD ({availableProducts.length})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5 space-y-4">
        {!isManualProduct ? (
          <div className="space-y-3">
            {/* Selected Product Card */}
            {selectedProduct && (
              <div className="flex items-center justify-between p-3 bg-rose-50/80 border border-rose-100 rounded-xl text-xs">
                <div className="truncate pr-2">
                  <div className="font-black text-rose-950 truncate text-sm">
                    {selectedProduct.goods_name}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-mono font-black text-rose-600 bg-white px-2 py-0.5 rounded border border-rose-200">
                      TYPE: {selectedProduct.goods_code || '-'}
                    </span>
                    {selectedProduct.category && (
                      <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        {selectedProduct.category}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onSelectProduct(null);
                    onNoSoChange('');
                    onNoSdChange('');
                    setSelectedSoPeriod('');
                  }}
                  className="text-rose-400 hover:text-rose-700 p-1.5 shrink-0 bg-white/80 rounded-lg transition-colors cursor-pointer"
                  title="Ganti Produk"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Field: Cari Barang */}
            <div className="space-y-2 relative" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-end">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  {selectedProduct ? 'Ganti Barang' : 'Cari Barang'}
                  <span className="text-[8px] font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded">
                    ({availableProducts.length} Terload)
                  </span>
                </label>
                {isLcdMode && selectedCustomer && (
                  <span className="text-[9px] font-bold text-cyan-600">
                    Filter Toko: {selectedCustomer.customer_name}
                  </span>
                )}
              </div>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder={
                    isLcdMode
                      ? "Cari nama barang LCD..."
                      : "Nama atau kode barang..."
                  }
                  value={prodSearch}
                  onChange={(e) => {
                    setProdSearch(e.target.value);
                    setShowProdDropdown(true);
                  }}
                  onFocus={() => setShowProdDropdown(true)}
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
              </div>

              {showProdDropdown && (prodSearch || !selectedProduct) && (
                <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-2xl border border-slate-100 py-1 max-h-60 overflow-y-auto">
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map((p, idx) => (
                      <button
                        key={`${p.goods_code}-${idx}`}
                        type="button"
                        onClick={() => {
                          onSelectProduct(p);
                          setShowProdDropdown(false);
                          setProdSearch('');
                          // Reset SO/SD when changing product
                          onNoSoChange('');
                          onNoSdChange('');
                          setSelectedSoPeriod('');
                        }}
                        className="w-full px-4 py-2 hover:bg-rose-50/60 text-left flex flex-col transition-colors cursor-pointer border-b border-slate-50 last:border-0"
                      >
                        <span className="text-sm font-bold text-slate-700">{p.goods_name}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-mono text-slate-400 font-semibold">{p.goods_code}</span>
                          {p.category && (
                            <span className="text-[9px] text-slate-400">· {p.category}</span>
                          )}
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-3 text-center space-y-2">
                      <p className="text-xs text-slate-400 italic">Barang tidak ditemukan di daftar</p>
                      <button
                        type="button"
                        onClick={() => {
                          onToggleManualProduct(true);
                          setShowProdDropdown(false);
                        }}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Input Manual Baru</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-between items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onToggleManualProduct(true)}
                className="text-indigo-600 font-black italic text-[10px] h-auto p-0 hover:bg-transparent"
              >
                + Input Manual Barang
              </Button>
            </div>

            {/* ======================================================== */}
            {/* FIELDS NO SO & NO SD DIRECTLY UNDER CARI BARANG          */}
            {/* ======================================================== */}
            <div className={cn(
              "p-3.5 rounded-2xl border transition-all space-y-3 mt-2",
              isLcdMode
                ? "bg-gradient-to-r from-cyan-50/70 via-sky-50/50 to-indigo-50/50 border-cyan-200/80"
                : "bg-slate-50/80 border-slate-200"
            )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-cyan-700" />
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    {isLcdMode ? 'Nomor Referensi LCD (SO & SD)' : 'Nomor Referensi (SO & SD)'}
                  </span>
                </div>
                {isLcdMode && (
                  <span className="text-[9px] font-bold text-cyan-800 bg-white/80 px-2 py-0.5 rounded-full border border-cyan-200">
                    Auto-Filter Database LCD
                  </span>
                )}
              </div>

              {isLcdMode && (!selectedCustomer || !selectedProduct) && (
                <div className="p-2.5 bg-white/70 rounded-xl border border-dashed border-cyan-200 text-[11px] text-cyan-800 font-medium">
                  {!selectedCustomer ? (
                    <span>👉 Langkah 1: Pilih <strong>Toko/Customer</strong> terlebih dahulu di sebelah kiri.</span>
                  ) : (
                    <span>👉 Langkah 2: Pilih <strong>Barang LCD</strong> di atas untuk memfilter No SO & No SD toko ini.</span>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Field: NO SO with Bulan & Tahun Suggestion */}
                <div className="space-y-1 relative" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider flex items-center gap-1">
                      <span>No SO</span>
                      {selectedSoPeriod && (
                        <span className="text-[9px] font-bold text-cyan-700 bg-cyan-100/70 px-1.5 py-0.2 rounded">
                          ({selectedSoPeriod})
                        </span>
                      )}
                    </label>
                    {isLcdMode && soSuggestions.length > 0 && (
                      <span className="text-[9px] font-bold text-cyan-600">
                        {soSuggestions.length} Pilihan SO
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      placeholder={isLcdMode ? "Pilih atau ketik No SO..." : "No SO (opsional)..."}
                      value={noSo}
                      onChange={(e) => onNoSoChange(e.target.value)}
                      onFocus={() => {
                        if (isLcdMode && soSuggestions.length > 0) {
                          setShowSoDropdown(true);
                        }
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all"
                    />

                    {isLcdMode && soSuggestions.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowSoDropdown(!showSoDropdown)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Suggestion Dropdown showing Bulan & Tahun from tgl_so */}
                  {showSoDropdown && isLcdMode && (
                    <div className="absolute z-50 w-full mt-1 bg-white rounded-xl shadow-2xl border border-cyan-100 py-1 max-h-56 overflow-y-auto animate-in fade-in slide-in-from-top-1">
                      <div className="px-3 py-1.5 bg-cyan-50/60 border-b border-cyan-100 text-[10px] font-black text-cyan-800 uppercase tracking-wider flex items-center justify-between">
                        <span>Pilih Bulan & Tahun SO:</span>
                        <span className="text-[9px] font-normal text-slate-500">Auto-fill No SD</span>
                      </div>

                      {soSuggestions.length > 0 ? (
                        soSuggestions.map((item, idx) => (
                          <button
                            key={`${item.no_so}-${item.no_sd}-${idx}`}
                            type="button"
                            onClick={() => handleSelectSoOption(item)}
                            className="w-full px-3 py-2 hover:bg-cyan-50/70 text-left flex items-center justify-between gap-2 border-b border-slate-50 last:border-0 transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <Calendar className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                              <div className="truncate">
                                <div className="text-xs font-black text-slate-800">
                                  {item.month_year}
                                </div>
                                <div className="text-[10px] font-mono text-slate-500 font-semibold">
                                  SO: {item.no_so} {item.no_sd ? `· SD: ${item.no_sd}` : ''}
                                </div>
                              </div>
                            </div>
                            <span className="text-[9px] font-bold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-full shrink-0">
                              Pilih
                            </span>
                          </button>
                        ))
                      ) : (
                        <div className="p-3 text-xs text-slate-400 italic text-center">
                          Tidak ditemukan riwayat No SO untuk customer & barang ini
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Field: NO SD (Surat Jalan) - auto-filled when SO is selected */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider">
                      No SD (Surat Jalan)
                    </label>
                    {isLcdMode && noSd && (
                      <span className="text-[9px] font-bold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Terisi otomatis
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="No SD..."
                    value={noSd}
                    onChange={(e) => onNoSdChange(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all"
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Manual Input Section */
          <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded-full">
                Input Manual Baru
              </span>
              <button
                type="button"
                onClick={() => onToggleManualProduct(false)}
                className="text-slate-400 text-[10px] font-bold hover:text-slate-600 cursor-pointer"
              >
                Batal
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Type / Kode</label>
                <input
                  type="text"
                  placeholder="Kode..."
                  value={manualGoodsCode}
                  onChange={(e) => onManualGoodsCodeChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border-none rounded-lg text-xs font-bold text-slate-700 focus:ring-1 focus:ring-indigo-500/20"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nama Barang</label>
                <input
                  type="text"
                  placeholder="Nama barang..."
                  value={manualGoodsName}
                  onChange={(e) => onManualGoodsNameChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border-none rounded-lg text-xs font-bold text-slate-700 focus:ring-1 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            <div className="space-y-1.5 relative" onClick={(e) => e.stopPropagation()}>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
                <span>Kategori Produk</span>
                <span className="text-[7px] text-indigo-500 bg-indigo-50 px-1 rounded">{categories.length} Kategori</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Pilih atau ketik kategori..."
                  value={manualCategory}
                  onChange={(e) => {
                    onManualCategoryChange(e.target.value);
                    setShowCatDropdown(true);
                  }}
                  onFocus={() => setShowCatDropdown(true)}
                  className="w-full px-3 py-2 bg-slate-50 border-none rounded-lg text-xs font-bold text-slate-700 focus:ring-1 focus:ring-indigo-500/20"
                />
                {showCatDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-white rounded-lg shadow-xl border border-slate-100 py-1 max-h-40 overflow-y-auto">
                    {filteredCategories.length > 0 ? (
                      filteredCategories.map((cat, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            onManualCategoryChange(cat);
                            setShowCatDropdown(false);
                          }}
                          className="w-full px-3 py-1.5 hover:bg-slate-50 text-left text-[11px] font-bold text-slate-600 cursor-pointer"
                        >
                          {cat}
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-[10px] text-slate-400 italic">Kategori baru akan ditambahkan</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Manual No SO & No SD */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">No SO</label>
                <input
                  type="text"
                  placeholder="No SO..."
                  value={noSo}
                  onChange={(e) => onNoSoChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border-none rounded-lg text-xs font-bold text-slate-700 focus:ring-1 focus:ring-indigo-500/20"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">No SD</label>
                <input
                  type="text"
                  placeholder="No SD..."
                  value={noSd}
                  onChange={(e) => onNoSdChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border-none rounded-lg text-xs font-bold text-slate-700 focus:ring-1 focus:ring-indigo-500/20"
                />
              </div>
            </div>
          </div>
        )}

        {/* Quantity (QTY) Field */}
        <div className="space-y-2 pt-2 border-t border-slate-50">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
            <Hash className="w-3 h-3 mr-1" />
            Quantity (QTY)
          </label>
          <input
            type="number"
            min="1"
            value={qty}
            onChange={(e) => onQtyChange(parseInt(e.target.value) || 0)}
            className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-lg font-black text-indigo-600 focus:ring-2 focus:ring-indigo-500/20 transition-all"
          />
        </div>
      </CardContent>
    </Card>
  );
}
