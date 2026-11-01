import React, { useState, useMemo } from 'react';
import { MasterLcdItem, DiscountRule, DiscountType } from './types';
import { matchesDiscountRule } from './discountUtils';
import { DiscountMultiSelectDropdown } from './DiscountMultiSelectDropdown';
import { 
  Percent, 
  Plus, 
  Trash2, 
  X, 
  CheckCircle, 
  RotateCcw, 
  Sparkles, 
  Tag, 
  Sliders, 
  Info
} from 'lucide-react';

interface MasterLcdDiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  rules: DiscountRule[];
  onSaveRules: (rules: DiscountRule[]) => void;
  items: MasterLcdItem[];
}

export function MasterLcdDiscountModal({
  isOpen,
  onClose,
  rules,
  onSaveRules,
  items
}: MasterLcdDiscountModalProps) {
  const [localRules, setLocalRules] = useState<DiscountRule[]>(rules);

  // Form State for new rule (multi-select)
  const [targetBrandLcdValues, setTargetBrandLcdValues] = useState<string[]>(['ALL']);
  const [targetBrandHpValues, setTargetBrandHpValues] = useState<string[]>(['ALL']);
  const [targetStatusLcdValues, setTargetStatusLcdValues] = useState<string[]>(['ALL']);
  const [targetOledValues, setTargetOledValues] = useState<string[]>(['ALL']);
  const [discountType, setDiscountType] = useState<DiscountType>('percentage');
  const [discountValue, setDiscountValue] = useState<number>(5);

  // Quick global discount state
  const [quickGlobalPercent, setQuickGlobalPercent] = useState<string>('');

  // Extract unique values from data (must be called unconditionally before any early return)
  const uniqueBrandHp = useMemo(() => {
    const set = new Set<string>();
    items.forEach(i => { if (i.brand_hp) set.add(i.brand_hp.toUpperCase()); });
    return Array.from(set).sort();
  }, [items]);

  const uniqueStatusLcd = useMemo(() => {
    const set = new Set<string>();
    items.forEach(i => { if (i.status_lcd) set.add(i.status_lcd.trim()); });
    return Array.from(set).filter(Boolean).sort();
  }, [items]);

  const uniqueOled = useMemo(() => {
    const set = new Set<string>();
    items.forEach(i => { if (i.oled_soft_oled) set.add(i.oled_soft_oled.trim()); });
    return Array.from(set).filter(Boolean).sort();
  }, [items]);

  // Joined string representations
  const targetBrandHpStr = useMemo(() => {
    return targetBrandHpValues.includes('ALL') || targetBrandHpValues.length === 0 ? 'ALL' : targetBrandHpValues.join(',');
  }, [targetBrandHpValues]);

  const targetStatusLcdStr = useMemo(() => {
    return targetStatusLcdValues.includes('ALL') || targetStatusLcdValues.length === 0 ? 'ALL' : targetStatusLcdValues.join(',');
  }, [targetStatusLcdValues]);

  const targetOledStr = useMemo(() => {
    return targetOledValues.includes('ALL') || targetOledValues.length === 0 ? 'ALL' : targetOledValues.join(',');
  }, [targetOledValues]);

  const targetBrandLcdStr = useMemo(() => {
    return targetBrandLcdValues.includes('ALL') || targetBrandLcdValues.length === 0 ? 'ALL' : targetBrandLcdValues.join(',');
  }, [targetBrandLcdValues]);

  // Preview how many items match the current form before adding
  const previewMatchCount = useMemo(() => {
    const mockRule: DiscountRule = {
      id: 'preview',
      targetBrandLcd: targetBrandLcdStr,
      targetBrandHp: targetBrandHpStr,
      targetStatusLcd: targetStatusLcdStr,
      targetOled: targetOledStr,
      discountType,
      discountValue: Number(discountValue) || 0,
      isActive: true
    };
    return items.filter(item => matchesDiscountRule(item, mockRule)).length;
  }, [items, targetBrandLcdStr, targetBrandHpStr, targetStatusLcdStr, targetOledStr, discountType, discountValue]);

  if (!isOpen) return null;

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!discountValue || discountValue <= 0) {
      alert('Masukkan nilai diskon yang valid.');
      return;
    }

    const newRule: DiscountRule = {
      id: `rule_${Date.now()}`,
      targetBrandLcd: targetBrandLcdStr,
      targetBrandHp: targetBrandHpStr,
      targetStatusLcd: targetStatusLcdStr,
      targetOled: targetOledStr,
      discountType,
      discountValue: Number(discountValue),
      isActive: true
    };

    setLocalRules(prev => [newRule, ...prev]);

    // Reset value input to default 5
    setDiscountValue(5);
  };

  const handleApplyQuickGlobal = () => {
    const val = parseFloat(quickGlobalPercent);
    if (isNaN(val) || val <= 0) {
      alert('Masukkan persentase diskon yang valid.');
      return;
    }

    const globalRule: DiscountRule = {
      id: `global_${Date.now()}`,
      name: `Diskon Global ${val}%`,
      targetBrandLcd: 'ALL',
      targetBrandHp: 'ALL',
      targetStatusLcd: 'ALL',
      targetOled: 'ALL',
      discountType: 'percentage',
      discountValue: val,
      isActive: true
    };

    setLocalRules(prev => [globalRule, ...prev]);
    setQuickGlobalPercent('');
  };

  const handleToggleRule = (id: string) => {
    setLocalRules(prev => prev.map(r => r.id === id ? { ...r, isActive: !r.isActive } : r));
  };

  const handleDeleteRule = (id: string) => {
    setLocalRules(prev => prev.filter(r => r.id !== id));
  };

  const handleSaveAndClose = () => {
    onSaveRules(localRules);
    onClose();
  };

  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleConfirmResetAll = () => {
    setLocalRules([]);
    onSaveRules([]);
    setShowResetConfirm(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
              <Percent className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Atur Diskon & Harga Otomatis</h3>
              <p className="text-xs text-slate-500">
                Harga box & pcs akan otomatis menyesuaikan berdasarkan kriteria yang dipilih
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
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Quick Global Preset */}
          <div className="bg-gradient-to-r from-rose-50 to-orange-50 border border-rose-200 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-rose-500 shrink-0" />
              <div>
                <span className="text-xs font-bold text-slate-800 block">Diskon Cepat untuk Semua LCD:</span>
                <span className="text-[11px] text-slate-500">Terapkan persentase diskon langsung ke seluruh item</span>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative w-28">
                <input
                  type="number"
                  min="1"
                  max="99"
                  placeholder="Contoh: 5"
                  value={quickGlobalPercent}
                  onChange={(e) => setQuickGlobalPercent(e.target.value)}
                  className="w-full pl-3 pr-7 py-1.5 text-xs bg-white border border-rose-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 font-bold text-slate-800"
                />
                <span className="absolute right-2.5 top-2 text-xs font-bold text-slate-400">%</span>
              </div>
              <button
                type="button"
                onClick={handleApplyQuickGlobal}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors shrink-0"
              >
                Terapkan Semua
              </button>
            </div>
          </div>

          {/* Form Create Specific Rule */}
          <form onSubmit={handleAddRule} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-indigo-600" />
                Tambah Aturan Diskon Khusus:
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                Target: <strong className="text-indigo-600">{previewMatchCount.toLocaleString()}</strong> item
              </span>
            </div>

            {/* Criteria Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Brand HP */}
              <DiscountMultiSelectDropdown
                label="Brand HP:"
                allOptionLabel="Semua Brand HP"
                options={uniqueBrandHp}
                selectedValues={targetBrandHpValues}
                onChange={setTargetBrandHpValues}
              />

              {/* Status LCD */}
              <DiscountMultiSelectDropdown
                label="Status LCD:"
                allOptionLabel="Semua Status"
                options={uniqueStatusLcd}
                selectedValues={targetStatusLcdValues}
                onChange={setTargetStatusLcdValues}
              />

              {/* OLED / Soft OLED */}
              <DiscountMultiSelectDropdown
                label="OLED / Soft OLED:"
                allOptionLabel="Semua Jenis"
                options={uniqueOled}
                selectedValues={targetOledValues}
                onChange={setTargetOledValues}
              />
            </div>

            {/* Brand LCD & Discount Input */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              {/* Brand LCD Target */}
              <DiscountMultiSelectDropdown
                label="Brand LCD:"
                allOptionLabel="Semua (VIVAN & XPAS)"
                options={['VIVAN', 'XPAS']}
                selectedValues={targetBrandLcdValues}
                onChange={setTargetBrandLcdValues}
              />

              {/* Discount Type */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Tipe Diskon:
                </label>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as DiscountType)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-semibold"
                >
                  <option value="percentage">Persen (%)</option>
                  <option value="nominal_pcs">Nominal per Pcs (Rp)</option>
                  <option value="nominal_box">Nominal per Box (Rp)</option>
                </select>
              </div>

              {/* Discount Value */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Nilai Diskon:
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    min="1"
                    required
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-bold"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-2xs flex items-center gap-1 shrink-0 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tambah
                  </button>
                </div>
              </div>
            </div>
          </form>

          {/* List of Active Rules */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                Daftar Aturan Diskon Aktif ({localRules.length}):
              </span>
              {localRules.length > 0 && (
                showResetConfirm ? (
                  <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 px-2 py-1 rounded-lg animate-in fade-in zoom-in-95 duration-100">
                    <span className="text-[11px] font-bold text-rose-800">Hapus semua aturan?</span>
                    <button
                      type="button"
                      onClick={handleConfirmResetAll}
                      className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] rounded transition-colors"
                    >
                      Ya, Hapus
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowResetConfirm(false)}
                      className="px-2 py-0.5 bg-white border border-slate-300 text-slate-700 font-bold text-[10px] rounded hover:bg-slate-50 transition-colors"
                    >
                      Batal
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(true)}
                    className="text-[11px] text-red-600 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <RotateCcw className="w-3 h-3" /> Hapus Semua Aturan
                  </button>
                )
              )}
            </div>

            {/* Note for multi-tier discounts */}
            {localRules.filter(r => r.targetBrandLcd === 'XPAS').length > 1 && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] text-emerald-800 flex items-start gap-2">
                <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Pemberitahuan Multi-Tier Diskon XPAS:</span>
                  <p className="mt-0.5 text-emerald-700">
                    Tersedia {localRules.filter(r => r.targetBrandLcd === 'XPAS').length} variasi diskon XPAS. Pada menu <strong>Ekspor Excel</strong>, Anda bisa memilih diskon mana yang ingin digunakan, atau otomatis mengekspor kedua tier menjadi sheet terpisah (&quot;XPAS (22%)&quot; &amp; &quot;XPAS (18%)&quot;).
                  </p>
                </div>
              </div>
            )}

            {localRules.length === 0 ? (
              <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                Belum ada aturan diskon yang ditambahkan. Harga masih menggunakan harga master asli.
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {localRules.map((rule) => {
                  const matchCount = items.filter(item => matchesDiscountRule(item, rule)).length;
                  return (
                    <div
                      key={rule.id}
                      className={`p-3 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 transition-all ${
                        rule.isActive ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-50 border-slate-200 opacity-60'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {/* Discount Badge */}
                          <span className="px-2 py-0.5 bg-rose-100 text-rose-700 font-black text-xs rounded-md">
                            {rule.discountType === 'percentage' 
                              ? `Diskon ${rule.discountValue}%` 
                              : rule.discountType === 'nominal_pcs' 
                              ? `-Rp ${rule.discountValue.toLocaleString()}/pcs` 
                              : `-Rp ${rule.discountValue.toLocaleString()}/box`}
                          </span>

                          {/* Brand LCD Tag */}
                          {rule.targetBrandLcd !== 'ALL' && (
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[11px] font-bold rounded">
                              Brand: {rule.targetBrandLcd}
                            </span>
                          )}

                          {/* Target Brand HP Tag */}
                          {rule.targetBrandHp !== 'ALL' && (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[11px] font-semibold rounded">
                              HP: {rule.targetBrandHp}
                            </span>
                          )}

                          {/* Target Status Tag */}
                          {rule.targetStatusLcd !== 'ALL' && (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[11px] font-semibold rounded">
                              Status: {rule.targetStatusLcd}
                            </span>
                          )}

                          {/* Target OLED Tag */}
                          {rule.targetOled !== 'ALL' && (
                            <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-[11px] font-semibold rounded">
                              OLED: {rule.targetOled}
                            </span>
                          )}

                          {rule.targetBrandHp === 'ALL' && rule.targetStatusLcd === 'ALL' && rule.targetOled === 'ALL' && rule.targetBrandLcd === 'ALL' && (
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[11px] font-bold rounded">
                              Semua Item LCD
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-slate-400">
                          Berlaku untuk <strong>{matchCount.toLocaleString()}</strong> item produk
                        </div>
                      </div>

                      {/* Rule Actions */}
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleToggleRule(rule.id)}
                          className={`px-2.5 py-1 text-[11px] font-bold rounded transition-colors ${
                            rule.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {rule.isActive ? 'Aktif' : 'Nonaktif'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRule(rule.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Hapus Aturan"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
            onClick={handleSaveAndClose}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-md transition-all"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Terapkan ({localRules.filter(r => r.isActive).length} Aturan Aktif)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
