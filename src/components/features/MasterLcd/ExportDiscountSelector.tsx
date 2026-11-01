import React from 'react';
import { Percent, Tag, Check, Sparkles, Layers } from 'lucide-react';
import { DiscountRule } from './types';

interface ExportDiscountSelectorProps {
  discountRules: DiscountRule[];
  xpasDiscountChoice: string;
  setXpasDiscountChoice: (val: string) => void;
  vivanDiscountChoice: string;
  setVivanDiscountChoice: (val: string) => void;
  hasXpasItems: boolean;
  hasVivanItems: boolean;
}

export function ExportDiscountSelector({
  discountRules,
  xpasDiscountChoice,
  setXpasDiscountChoice,
  vivanDiscountChoice,
  setVivanDiscountChoice,
  hasXpasItems,
  hasVivanItems
}: ExportDiscountSelectorProps) {
  // Filter active or available rules
  const xpasRules = discountRules.filter(r => r.targetBrandLcd === 'XPAS');
  const vivanRules = discountRules.filter(r => r.targetBrandLcd === 'VIVAN');
  const globalRules = discountRules.filter(r => r.targetBrandLcd === 'ALL');

  if (discountRules.length === 0) {
    return null;
  }

  const formatRuleName = (rule: DiscountRule) => {
    const val = rule.discountType === 'percentage'
      ? `${rule.discountValue}%`
      : rule.discountType === 'nominal_pcs'
      ? `Rp ${rule.discountValue.toLocaleString()}/pcs`
      : `Rp ${rule.discountValue.toLocaleString()}/box`;

    const details: string[] = [];
    if (rule.targetBrandHp !== 'ALL') details.push(`HP: ${rule.targetBrandHp}`);
    if (rule.targetStatusLcd !== 'ALL') details.push(`Status: ${rule.targetStatusLcd}`);
    if (rule.targetOled !== 'ALL') details.push(`OLED: ${rule.targetOled}`);

    return {
      discountBadge: `Diskon ${val}`,
      subtext: details.length > 0 ? details.join(', ') : 'Semua item brand ini'
    };
  };

  return (
    <div className="bg-rose-50/50 border border-rose-200 rounded-xl p-3.5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-rose-950 flex items-center gap-1.5">
          <Percent className="w-4 h-4 text-rose-600" />
          Pilih Diskon Sebelum Download:
        </span>
        <span className="text-[10px] font-bold bg-rose-200 text-rose-900 px-2 py-0.5 rounded-full flex items-center gap-1">
          <Tag className="w-3 h-3" />
          Multi-Tier Diskon
        </span>
      </div>

      <p className="text-[11px] text-slate-600">
        Pilih aturan diskon yang ingin diterapkan pada masing-masing sheet pricelist. Anda juga dapat mengekspor kedua tier diskon sekaligus menjadi sheet terpisah.
      </p>

      {/* XPAS Selection Section */}
      {hasXpasItems && (
        <div className="bg-white border border-rose-200/80 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded">XPAS</span>
              Diskon Sheet XPAS:
            </span>
            {xpasRules.length > 1 && (
              <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                Ditemukan {xpasRules.length} Aturan Diskon XPAS
              </span>
            )}
          </div>

          <div className="space-y-1.5">
            {/* If there are multiple XPAS rules, option to export all tiers into separate sheets */}
            {xpasRules.length > 1 && (
              <label className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer transition-all ${
                xpasDiscountChoice === 'ALL_TIERS'
                  ? 'bg-emerald-50/70 border-emerald-400 font-bold text-emerald-950'
                  : 'bg-slate-50/60 border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}>
                <input
                  type="radio"
                  name="xpasDiscount"
                  checked={xpasDiscountChoice === 'ALL_TIERS'}
                  onChange={() => setXpasDiscountChoice('ALL_TIERS')}
                  className="mt-0.5 w-3.5 h-3.5 text-emerald-600"
                />
                <div className="text-xs">
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="font-bold text-slate-900">
                      Ekspor Kedua Diskon (Pisah Sheet &quot;XPAS (22%)&quot; &amp; &quot;XPAS (18%)&quot;)
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-normal block mt-0.5">
                    Membuat sheet terpisah untuk setiap tingkatan diskon dalam satu file Excel
                  </span>
                </div>
              </label>
            )}

            {/* Individual XPAS Rules */}
            {xpasRules.map(rule => {
              const info = formatRuleName(rule);
              return (
                <label
                  key={rule.id}
                  className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer transition-all ${
                    xpasDiscountChoice === rule.id
                      ? 'bg-rose-50/70 border-rose-400 font-bold text-rose-950'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="xpasDiscount"
                    checked={xpasDiscountChoice === rule.id}
                    onChange={() => setXpasDiscountChoice(rule.id)}
                    className="mt-0.5 w-3.5 h-3.5 text-rose-600"
                  />
                  <div className="text-xs flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded text-[11px]">
                        {info.discountBadge}
                      </span>
                      <span className="text-slate-700 font-semibold">Gunakan hanya diskon ini untuk Sheet XPAS</span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-normal block mt-0.5">
                      {info.subtext}
                    </span>
                  </div>
                </label>
              );
            })}

            {/* Current Active or Master Base */}
            <label className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer transition-all ${
              xpasDiscountChoice === 'NONE'
                ? 'bg-slate-100 border-slate-400 font-bold text-slate-900'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}>
              <input
                type="radio"
                name="xpasDiscount"
                checked={xpasDiscountChoice === 'NONE'}
                onChange={() => setXpasDiscountChoice('NONE')}
                className="mt-0.5 w-3.5 h-3.5 text-slate-600"
              />
              <div className="text-xs">
                <span className="font-semibold text-slate-800">Tanpa Diskon (Gunakan Harga Normal Asli Master)</span>
                <span className="text-[11px] text-slate-500 font-normal block mt-0.5">
                  Harga per box dan per pcs dihitung tanpa pengurangan diskon
                </span>
              </div>
            </label>
          </div>
        </div>
      )}

      {/* VIVAN Selection Section if Vivan rules exist */}
      {hasVivanItems && vivanRules.length > 0 && (
        <div className="bg-white border border-rose-200/80 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] font-black rounded">VIVAN</span>
              Diskon Sheet VIVAN:
            </span>
            <span className="text-[10px] text-indigo-700 font-semibold bg-indigo-50 px-2 py-0.5 rounded">
              {vivanRules.length} Aturan VIVAN
            </span>
          </div>

          <div className="space-y-1.5">
            <label className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer transition-all ${
              vivanDiscountChoice === 'ACTIVE_RULES'
                ? 'bg-indigo-50/70 border-indigo-400 font-bold text-indigo-950'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}>
              <input
                type="radio"
                name="vivanDiscount"
                checked={vivanDiscountChoice === 'ACTIVE_RULES'}
                onChange={() => setVivanDiscountChoice('ACTIVE_RULES')}
                className="mt-0.5 w-3.5 h-3.5 text-indigo-600"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-900">
                  Terapkan Semua Aturan Aktif VIVAN ({vivanRules.filter(r => r.isActive).length} Aktif)
                </span>
                <span className="text-[11px] text-slate-500 font-normal block mt-0.5">
                  Misal: Diskon nonupgrade &amp; upgrade otomatis menyesuaikan dengan status masing-masing item
                </span>
              </div>
            </label>

            <label className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer transition-all ${
              vivanDiscountChoice === 'NONE'
                ? 'bg-slate-100 border-slate-400 font-bold text-slate-900'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}>
              <input
                type="radio"
                name="vivanDiscount"
                checked={vivanDiscountChoice === 'NONE'}
                onChange={() => setVivanDiscountChoice('NONE')}
                className="mt-0.5 w-3.5 h-3.5 text-slate-600"
              />
              <div className="text-xs">
                <span className="font-semibold text-slate-800">Tanpa Diskon (Harga Normal Asli Master)</span>
                <span className="text-[11px] text-slate-500 font-normal block mt-0.5">
                  Sheet VIVAN diekspor dengan harga dasar tanpa diskon
                </span>
              </div>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
