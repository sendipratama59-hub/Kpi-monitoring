import React, { useState, useMemo } from 'react';
import { Percent, Plus, Trash2, CheckCircle2, AlertCircle, Sliders } from 'lucide-react';
import { DiscountRule, DiscountType, MasterLcdItem } from '../types';
import { DiscountMultiSelectDropdown } from '../DiscountMultiSelectDropdown';
import { matchesDiscountRule } from '../discountUtils';

interface TemplateDiscountConfigProps {
  discountRules: DiscountRule[];
  onChangeDiscountRules: (rules: DiscountRule[]) => void;
  availableBrandsHp: string[];
  items?: MasterLcdItem[];
}

export function TemplateDiscountConfig({
  discountRules,
  onChangeDiscountRules,
  availableBrandsHp,
  items = []
}: TemplateDiscountConfigProps) {
  const [showAddForm, setShowAddForm] = useState(false);

  // Form State for new rule (Multi-select)
  const [targetBrandLcdValues, setTargetBrandLcdValues] = useState<string[]>(['ALL']);
  const [targetBrandHpValues, setTargetBrandHpValues] = useState<string[]>(['ALL']);
  const [targetStatusLcdValues, setTargetStatusLcdValues] = useState<string[]>(['ALL']);
  const [targetOledValues, setTargetOledValues] = useState<string[]>(['ALL']);
  const [discountType, setDiscountType] = useState<DiscountType>('percentage');
  const [discountValue, setDiscountValue] = useState<number>(5);

  // Unique status and OLED options extracted from data
  const uniqueStatusLcd = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      if (i.status_lcd) set.add(i.status_lcd.trim());
    });
    return Array.from(set).filter(Boolean).sort();
  }, [items]);

  const uniqueOled = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      if (i.oled_soft_oled) set.add(i.oled_soft_oled.trim());
    });
    return Array.from(set).filter(Boolean).sort();
  }, [items]);

  // Joined string representations for saving/previewing
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

  // Preview match count
  const previewMatchCount = useMemo(() => {
    if (items.length === 0) return 0;
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
    return items.filter((item) => matchesDiscountRule(item, mockRule)).length;
  }, [items, targetBrandLcdStr, targetBrandHpStr, targetStatusLcdStr, targetOledStr, discountType, discountValue]);

  const handleToggleRule = (id: string) => {
    onChangeDiscountRules(
      discountRules.map((r) => (r.id === id ? { ...r, isActive: !r.isActive } : r))
    );
  };

  const handleDeleteRule = (id: string) => {
    onChangeDiscountRules(discountRules.filter((r) => r.id !== id));
  };

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!discountValue || discountValue <= 0) {
      alert('Masukkan nilai diskon yang valid.');
      return;
    }

    const newRule: DiscountRule = {
      id: `rule_tmpl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      targetBrandLcd: targetBrandLcdStr,
      targetBrandHp: targetBrandHpStr,
      targetStatusLcd: targetStatusLcdStr,
      targetOled: targetOledStr,
      discountType,
      discountValue: Number(discountValue),
      isActive: true
    };

    onChangeDiscountRules([newRule, ...discountRules]);
    setShowAddForm(false);
    setDiscountValue(5);
  };

  return (
    <div className="space-y-3 pt-2">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Percent className="w-3.5 h-3.5 text-rose-600" />
            <span>Aturan Diskon Template:</span>
          </span>
          <span className="text-[11px] font-bold bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full border border-rose-100">
            {discountRules.filter((r) => r.isActive).length} Aktif dari {discountRules.length} Aturan
          </span>
        </div>

        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-md transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{showAddForm ? 'Batal Tambah' : 'Tambah Aturan Diskon'}</span>
        </button>
      </div>

      {/* Add New Rule Form */}
      {showAddForm && (
        <form onSubmit={handleAddRule} className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-rose-600" />
              Buat Aturan Diskon Baru:
            </span>
            {items.length > 0 && (
              <span className="text-[11px] font-semibold text-rose-700">
                Target: <strong>{previewMatchCount.toLocaleString()}</strong> item
              </span>
            )}
          </div>

          {/* Criteria Grid matching Gambar 1 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* Brand HP */}
            <DiscountMultiSelectDropdown
              label="Brand HP:"
              allOptionLabel="Semua Brand HP"
              options={availableBrandsHp}
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

          {/* Brand LCD, Type, Value */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
            {/* Brand LCD */}
            <DiscountMultiSelectDropdown
              label="Brand LCD:"
              allOptionLabel="Semua (VIVAN & XPAS)"
              options={['VIVAN', 'XPAS']}
              selectedValues={targetBrandLcdValues}
              onChange={setTargetBrandLcdValues}
            />

            {/* Discount Type */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Tipe Diskon:</label>
              <select
                value={discountType}
                onChange={(e: any) => setDiscountType(e.target.value as DiscountType)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-medium"
              >
                <option value="percentage">Persentase (%)</option>
                <option value="nominal_pcs">Nominal (Rp/pcs)</option>
                <option value="nominal_box">Nominal (Rp/box)</option>
              </select>
            </div>

            {/* Discount Value & Action */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Nilai Diskon:</label>
              <div className="flex gap-1.5">
                <input
                  type="number"
                  min="1"
                  step="any"
                  required
                  value={discountValue}
                  onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-bold"
                  placeholder={discountType === 'percentage' ? 'Contoh: 5' : 'Contoh: 10000'}
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition-colors shrink-0 flex items-center gap-1 shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Simpan</span>
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Rules list */}
      {discountRules.length === 0 ? (
        <div className="py-6 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
          <AlertCircle className="w-5 h-5 mx-auto mb-1 text-slate-300" />
          Tidak ada aturan diskon dalam template ini (harga normal).
        </div>
      ) : (
        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
          {discountRules.map((rule) => {
            const matchCount = items.length > 0 ? items.filter((i) => matchesDiscountRule(i, rule)).length : null;

            return (
              <div
                key={rule.id}
                className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border text-xs transition-colors ${
                  rule.isActive
                    ? 'bg-rose-50/40 border-rose-200 text-slate-800'
                    : 'bg-slate-50 border-slate-200 text-slate-400 opacity-70'
                }`}
              >
                <div className="flex flex-col gap-1 min-w-0">
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
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded">
                        Brand: {rule.targetBrandLcd}
                      </span>
                    )}

                    {/* Target Brand HP Tag */}
                    {rule.targetBrandHp !== 'ALL' && (
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-semibold rounded">
                        HP: {rule.targetBrandHp}
                      </span>
                    )}

                    {/* Target Status Tag */}
                    {rule.targetStatusLcd && rule.targetStatusLcd !== 'ALL' && (
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-semibold rounded">
                        Status: {rule.targetStatusLcd}
                      </span>
                    )}

                    {/* Target OLED Tag */}
                    {rule.targetOled && rule.targetOled !== 'ALL' && (
                      <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-[10px] font-semibold rounded">
                        OLED: {rule.targetOled}
                      </span>
                    )}

                    {rule.targetBrandHp === 'ALL' && rule.targetStatusLcd === 'ALL' && rule.targetOled === 'ALL' && rule.targetBrandLcd === 'ALL' && (
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-bold rounded">
                        Semua Item LCD
                      </span>
                    )}
                  </div>

                  {matchCount !== null && (
                    <div className="text-[10px] text-slate-400">
                      Berlaku untuk <strong>{matchCount.toLocaleString()}</strong> item produk
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleRule(rule.id)}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors ${
                      rule.isActive
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {rule.isActive ? 'Aktif' : 'Nonaktif'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteRule(rule.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
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
  );
}
