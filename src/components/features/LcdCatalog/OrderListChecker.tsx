import React, { useState, useMemo, useEffect } from 'react';
import { GenieModal } from '../../ui/GenieModal';
import { Button } from '../../ui/Button';
import { ClipboardPaste, Search, CheckCircle2, AlertCircle, Copy, Check } from 'lucide-react';

interface OrderListCheckerProps {
  isOpen: boolean;
  onClose: () => void;
  products: any[];
}

export function OrderListChecker({ isOpen, onClose, products }: OrderListCheckerProps) {
  const [inputText, setInputText] = useState('');
  const [copied, setCopied] = useState(false);
  
  // Track which rows are selected to be included in the response
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  // Track which match is selected for each row (rowId -> matchIndex)
  const [selectedMatches, setSelectedMatches] = useState<Record<number, number>>({});
  
  const getPcsCount = (packing: string) => {
    if (!packing) return 1;
    const match = packing.match(/(\d+)\s*pcs/i);
    return match ? parseInt(match[1], 10) : 1;
  };
  
  const getMaxDiscount = (discountStr: string) => {
    if (!discountStr) return 0;
    const parts = discountStr.split(/[,\+]/).map(d => d.trim()).filter(Boolean);
    let maxPct = 0;
    parts.forEach(p => {
      let valStr = p;
      if (p.includes(':')) {
        valStr = p.split(':')[1];
      }
      const val = parseFloat(valStr.replace('%', '').trim());
      if (!isNaN(val) && val > maxPct) {
        maxPct = val;
      }
    });
    return maxPct;
  };

  const calculateFinalPricePerPcs = (price: number, packing: string, discountStr: string) => {
      const pcs = getPcsCount(packing);
      const perPcs = Math.round((price || 0) / pcs);
      const discount = getMaxDiscount(discountStr);
      return Math.round(perPcs * (1 - discount / 100));
  };
  
  const results = useMemo(() => {
    if (!inputText.trim()) return [];
    
    const lines = inputText.split('\n').filter(l => l.trim().length > 0);
    const ignoreRegex = /lcd|\**list lcd\**|\(kosong\)|\(\s*sisa\s*\d+\s*\)|laku|lumayan|baru|kosong|jarang|incel|incell|black|white|gold|\b4g\b|\b5g\b/ig;
    
    return lines.map((line, index) => {
      const numbersInLine = line.match(/\d+/g) || [];
      
      const cleanLine = line.replace(ignoreRegex, '').replace(/\*/g, '').replace(/\s+/g, ' ').trim();
      if (!cleanLine && numbersInLine.length === 0) return { id: index, raw: line, clean: '', matches: [] };
      
      const searchTerms = cleanLine.toLowerCase().split(' ').filter(Boolean);
      
      const matches = products.map(p => {
        const hpBrand = (p.brand_hp || p.brand || '').toLowerCase();
        const modelHp = (p.model_hp || '').toLowerCase();
        const text = `${p.goods_code || ''} ${p.brand_lcd || 'Vivan'} ${hpBrand} ${modelHp} ${p.type_lcd || ''} ${p.packing || ''}`.toLowerCase();
        
        let score = 0;
        let matchedTerms = 0;
        
        searchTerms.forEach(term => {
          if (text.includes(term)) {
            matchedTerms++;
            score += term.length * 2; 
            
            if (new RegExp(`\\b${term}\\b`).test(text)) {
              score += 20;
            }
            if (modelHp.includes(term)) {
              score += 30;
            }
            if (hpBrand === term) {
              score += 50;
            }
          }
        });
        
        // Exact matching
        if (searchTerms.every(term => text.includes(term))) {
            score += 100;
        }

        // Heavy penalty if a known brand is in the search terms but this product is a different brand
        const knownBrands = ['samsung', 'oppo', 'vivo', 'realme', 'xiaomi', 'redmi', 'poco', 'infinix', 'tecno', 'itel', 'iphone', 'apple', 'asus', 'nokia', 'itel'];
        const brandsInSearch = searchTerms.filter(t => knownBrands.includes(t));
        if (brandsInSearch.length > 0 && !brandsInSearch.includes(hpBrand)) {
            score -= 500;
        }

        if (numbersInLine.length > 0) {
          const numbersInModel = modelHp.match(/\d+/g) || [];
          let hasMatchingNumber = false;
          numbersInLine.forEach(num => {
             if (numbersInModel.includes(num)) {
               score += 50;
               hasMatchingNumber = true;
             }
          });
          if (!hasMatchingNumber) {
             score -= 100;
          }
        }
        
        if (p.model_hp && p.model_hp.toLowerCase().includes(cleanLine.toLowerCase())) {
            score += 200;
        }

        return { product: p, score, matchedTerms };
      }).filter(m => m.matchedTerms > 0 && m.score > 0)
        .sort((a, b) => {
           if (b.score !== a.score) return b.score - a.score;
           const aPricePerPcs = calculateFinalPricePerPcs(a.product.price, a.product.packing, a.product.custom_discount);
           const bPricePerPcs = calculateFinalPricePerPcs(b.product.price, b.product.packing, b.product.custom_discount);
           return aPricePerPcs - bPricePerPcs;
        })
        .slice(0, 3); // top 3 matches
      
      return {
        id: index,
        raw: line,
        clean: cleanLine,
        matches
      };
    });
  }, [inputText, products]);

  // When results change, reset selections
  useEffect(() => {
    const newSelectedRows = new Set<number>();
    const newSelectedMatches: Record<number, number> = {};
    
    results.forEach(r => {
      if (r.matches.length > 0) {
        newSelectedRows.add(r.id);
        newSelectedMatches[r.id] = 0; // Default to best match
      }
    });
    
    setSelectedRows(newSelectedRows);
    setSelectedMatches(newSelectedMatches);
  }, [results]);

  const toggleRowSelection = (id: number) => {
    const next = new Set(selectedRows);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedRows(next);
  };

  const setMatchSelection = (rowId: number, matchIndex: number) => {
    setSelectedMatches(prev => ({ ...prev, [rowId]: matchIndex }));
    // Auto-check the row if they select a match
    if (!selectedRows.has(rowId)) {
      toggleRowSelection(rowId);
    }
  };

  const handleCopyResult = () => {
    let resultText = "*✅ Hasil Pengecekan Ketersediaan & Harga LCD*\n\n";
    
    results.forEach((r, idx) => {
      if (!selectedRows.has(r.id)) return; // Skip unselected rows
      
      resultText += `${idx + 1}. *${r.raw.trim()}*\n`;
      if (r.matches.length > 0) {
        const matchIdxToUse = selectedMatches[r.id] ?? 0;
        const selectedMatch = r.matches[matchIdxToUse]?.product || r.matches[0].product;
        
        const isOutOfStock = !selectedMatch.stock || Number(selectedMatch.stock) <= 0;
        
        const calcPricePerPcs = calculateFinalPricePerPcs(selectedMatch.price, selectedMatch.packing, selectedMatch.custom_discount);
        
        const productName = `${selectedMatch.brand_lcd || 'Vivan'} ${selectedMatch.brand_hp || selectedMatch.brand || ''} ${selectedMatch.model_hp} (${selectedMatch.type_lcd || 'Incell'})`;
        const priceStr = calcPricePerPcs ? calcPricePerPcs.toLocaleString('id-ID') : '0';
        const stockStatus = isOutOfStock ? '❌ KOSONG' : '✅ READY';
        
        resultText += `➢ ${productName}\n`;
        resultText += `💰 Rp ${priceStr}/pcs  |  ${stockStatus}\n`;
      } else {
        resultText += `➢ ⚠️ Tidak ditemukan di sistem\n`;
      }
      resultText += `\n`;
    });
    
    navigator.clipboard.writeText(resultText.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <GenieModal
      isOpen={isOpen}
      onClose={onClose}
      title="Cek List Orderan (WhatsApp)"
      subtitle="Paste list orderan dari toko untuk memfilter stok & harga otomatis"
      maxWidth="max-w-6xl"
    >
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-1/3 flex flex-col gap-3">
          <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
            <ClipboardPaste className="w-4 h-4" /> Paste Text Di Sini:
          </label>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="w-full h-64 lg:h-[500px] p-4 border-2 border-slate-200 rounded-xl bg-slate-50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-mono"
            placeholder="Contoh:&#10;*List LCD*&#10;Lcd INFINIX NOTE 11 12 (sisa 4)&#10;Lcd SAMSUNG A10 (sisa 3) LAKU"
          />
        </div>
        
        <div className="w-full lg:w-2/3 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
              <Search className="w-4 h-4" /> Hasil Pengecekan ({results.length} Baris):
            </label>
            {results.length > 0 && (
              <button
                onClick={handleCopyResult}
                className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Tersalin!' : 'Copy Untuk Balas WA'}
              </button>
            )}
          </div>
          
          <div className="bg-white border rounded-xl shadow-inner flex-1 overflow-auto max-h-[500px]">
            {results.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 font-medium p-8 text-center flex-col gap-2 min-h-[200px]">
                <Search className="w-10 h-10 text-slate-200" />
                <p>Belum ada hasil. Paste text di sebelah kiri.</p>
              </div>
            ) : (
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm text-xs uppercase text-slate-500 font-bold">
                  <tr>
                    <th className="p-3 border-b border-slate-200 w-1/3">Text Asli Toko</th>
                    <th className="p-3 border-b border-slate-200 w-2/3">Saran Stok / Harga (Top Matches)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {results.map(r => {
                    const rowSelected = selectedRows.has(r.id);
                    return (
                    <tr key={r.id} className={`align-top hover:bg-slate-50/50 transition-colors ${!rowSelected ? 'opacity-60 bg-slate-50/50 grayscale-[20%]' : ''}`}>
                      <td className="p-3">
                        <div className="flex gap-2.5 items-start">
                          <input 
                            type="checkbox" 
                            className="mt-1 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer" 
                            checked={rowSelected} 
                            onChange={() => toggleRowSelection(r.id)} 
                          />
                          <div className="flex-1">
                            <p className={`font-mono text-xs break-words line-clamp-3 ${rowSelected ? 'font-bold text-slate-800' : 'font-medium text-slate-600'}`} title={r.raw}>{r.raw}</p>
                            {r.clean && <span className="inline-block mt-1.5 px-1.5 py-0.5 bg-slate-100 border border-slate-200 text-[10px] rounded text-slate-500 font-mono">FIlter: {r.clean}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        {r.matches.length > 0 ? (
                          <div className="space-y-2">
                            {r.matches.map((m, i) => {
                              const p = m.product;
                              const isOutOfStock = !p.stock || Number(p.stock) <= 0;
                              const calcPricePerPcs = calculateFinalPricePerPcs(p.price, p.packing, p.custom_discount);
                              const isSelectedMatch = selectedMatches[r.id] === i;
                              
                              return (
                                <div key={i} 
                                     onClick={() => setMatchSelection(r.id, i)}
                                     className={`p-2 rounded-lg border flex flex-col gap-1.5 cursor-pointer transition-all ${isSelectedMatch ? 'bg-indigo-50/60 border-indigo-400 shadow-sm ring-1 ring-indigo-400' : 'bg-white border-slate-200 hover:border-indigo-200 hover:bg-slate-50'}`}>
                                  <div className="flex items-start gap-2.5">
                                    <div className="mt-0.5">
                                      <input type="radio" checked={isSelectedMatch} readOnly className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                                    </div>
                                    <div className="flex-1 w-full truncate">
                                      <div className="flex items-start justify-between gap-2">
                                        <div>
                                          <p className={`text-xs ${isSelectedMatch ? 'font-bold text-indigo-900' : 'font-semibold text-slate-700'}`}>
                                            {i === 0 && <span className="inline-block mr-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500" title="Best Match"></span>}
                                            {p.brand_lcd || 'Vivan'} {p.brand_hp || p.brand || ''} {p.model_hp} <span className="text-slate-500 font-medium">({p.type_lcd})</span>
                                          </p>
                                          {p.packing && <p className="text-[10px] items-center text-slate-400 font-medium mt-0.5">{p.packing}</p>}
                                        </div>
                                        <div className="text-right whitespace-nowrap">
                                          <div className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full inline-flex border ${isOutOfStock ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                                            {isOutOfStock ? 'KOSONG' : 'READY'}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-4 text-xs font-medium mt-1.5">
                                        <span className={`font-black ${isSelectedMatch ? 'text-indigo-600' : 'text-slate-700'}`}>Rp {calcPricePerPcs.toLocaleString('id-ID')}/pcs</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="p-2 border border-dashed border-rose-200 rounded bg-rose-50/50 flex items-center gap-2 text-rose-600">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span className="text-xs font-bold w-full">Tidak ada match di database.</span>
                          </div>
                        )}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </GenieModal>
  );
}
