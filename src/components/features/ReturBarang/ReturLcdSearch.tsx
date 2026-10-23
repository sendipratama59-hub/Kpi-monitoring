import React, { useState } from 'react';
import { Search, Loader2, Sparkles, Check, FileText, Smartphone, RefreshCw, X } from 'lucide-react';
import { searchLcdDatabase, LcdReturItem } from '../../../services/lcdReturService';
import { cn } from '../../../utils/cn';

interface ReturLcdSearchProps {
  noSo: string;
  noSd: string;
  onNoSoChange: (val: string) => void;
  onNoSdChange: (val: string) => void;
  onSelectRecord: (record: LcdReturItem) => void;
}

export function ReturLcdSearch({
  noSo,
  noSd,
  onNoSoChange,
  onNoSdChange,
  onSelectRecord
}: ReturLcdSearchProps) {
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<LcdReturItem[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeSearchType, setActiveSearchType] = useState<'so' | 'sd' | 'all'>('so');

  const handleSearch = async (type: 'so' | 'sd' | 'all', termOverride?: string) => {
    setSearching(true);
    setActiveSearchType(type);
    try {
      const term = termOverride !== undefined ? termOverride : (type === 'so' ? noSo : noSd);
      const res = await searchLcdDatabase({
        no_so: type === 'so' ? term : undefined,
        no_sd: type === 'sd' ? term : undefined,
        keyword: type === 'all' ? term : undefined
      });
      setResults(res);
      setShowDropdown(true);
    } catch (err) {
      console.error('Error searching LCD db:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleSelect = (item: LcdReturItem) => {
    onSelectRecord(item);
    setShowDropdown(false);
  };

  return (
    <div className="p-4 bg-gradient-to-r from-cyan-500/10 via-indigo-500/10 to-blue-500/10 border border-cyan-200/60 rounded-2xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-cyan-600 text-white flex items-center justify-center shadow-sm">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <span>Pencarian Data Database LCD</span>
              <span className="px-1.5 py-0.5 bg-cyan-100 text-cyan-800 rounded text-[9px] font-bold">Auto-Fill</span>
            </h4>
            <p className="text-[11px] font-medium text-slate-500">
              Cari No SO atau No SD untuk mengisi data toko, produk, dan kode secara otomatis
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => handleSearch('all', '')}
          className="text-xs font-bold text-cyan-700 hover:text-cyan-800 flex items-center gap-1 self-start sm:self-auto cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Lihat Semua Data LCD</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative">
        {/* Field No SO */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>No SO (Sales Order)</span>
            <span className="text-[9px] font-bold text-cyan-600">Tekan Enter atau klik cari</span>
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Contoh: SO-2026-0412..."
              value={noSo}
              onChange={(e) => {
                onNoSoChange(e.target.value);
                if (e.target.value.length > 2) {
                  handleSearch('so', e.target.value);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSearch('so');
                }
              }}
              className="w-full pl-3 pr-20 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
            />
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {noSo && (
                <button
                  type="button"
                  onClick={() => onNoSoChange('')}
                  className="p-1 text-slate-300 hover:text-slate-500"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => handleSearch('so')}
                className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-[10px] font-black flex items-center gap-1 shadow-sm transition-all"
              >
                {searching && activeSearchType === 'so' ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Search className="w-3 h-3" />
                )}
                <span>Cari SO</span>
              </button>
            </div>
          </div>
        </div>

        {/* Field No SD */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>No SD (Surat Jalan / Delivery)</span>
            <span className="text-[9px] font-bold text-cyan-600">Tekan Enter atau klik cari</span>
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Contoh: SD-2026-0889..."
              value={noSd}
              onChange={(e) => {
                onNoSdChange(e.target.value);
                if (e.target.value.length > 2) {
                  handleSearch('sd', e.target.value);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSearch('sd');
                }
              }}
              className="w-full pl-3 pr-20 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
            />
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {noSd && (
                <button
                  type="button"
                  onClick={() => onNoSdChange('')}
                  className="p-1 text-slate-300 hover:text-slate-500"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => handleSearch('sd')}
                className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-[10px] font-black flex items-center gap-1 shadow-sm transition-all"
              >
                {searching && activeSearchType === 'sd' ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Search className="w-3 h-3" />
                )}
                <span>Cari SD</span>
              </button>
            </div>
          </div>
        </div>

        {/* Search Results Dropdown */}
        {showDropdown && (
          <div className="col-span-1 sm:col-span-2 absolute top-full left-0 right-0 z-50 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-72 overflow-y-auto animate-in fade-in slide-in-from-top-2">
            <div className="p-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                Hasil Pencarian Database LCD ({results.length} ditemukan)
              </span>
              <button
                type="button"
                onClick={() => setShowDropdown(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold p-1"
              >
                Tutup
              </button>
            </div>

            {results.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {results.map((item, idx) => (
                  <button
                    key={item.id || idx}
                    type="button"
                    onClick={() => handleSelect(item)}
                    className="w-full text-left p-3 hover:bg-cyan-50/60 transition-colors flex flex-col gap-1 cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-cyan-100 text-cyan-800 rounded font-black text-[10px]">
                          SO: {item.no_so || '-'}
                        </span>
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded font-black text-[10px]">
                          SD: {item.no_sd || '-'}
                        </span>
                      </div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                        {item.customer_code}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xs font-black text-slate-800">{item.customer_name}</span>
                      <span className="text-[11px] font-black text-indigo-600 font-mono">
                        {item.goods_code}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 font-medium truncate">
                      {item.goods_name}
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center space-y-2">
                <p className="text-xs font-bold text-slate-500">
                  Tidak ada data yang cocok dengan pencarian No SO / No SD.
                </p>
                <p className="text-[11px] text-slate-400">
                  Anda tetap dapat mengetik No SO dan No SD secara manual di kolom input.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
