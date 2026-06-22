import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Search, Loader2, DollarSign, Plus, X, Trash2, Edit2, Download } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { buildLcdCompareHtml } from './buildLcdCompareHtml';

interface CompetitorPrice {
  name: string;
  price: number;
}

interface LcdProduct {
  id: string;
  goods_code: string;
  brand_lcd: string;
  brand_hp: string;
  model_hp: string;
  packing: string;
  price: number;
  competitors?: CompetitorPrice[];
}

export function HighlightedText({ text, highlight }: { text: string; highlight: string }) {
  if (!highlight.trim()) return <>{text}</>;
  const searchTerms = highlight.trim().split(/\s+/).filter(Boolean);
  if (searchTerms.length === 0) return <>{text}</>;
  const pattern = searchTerms.map(t => t.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|');
  const regex = new RegExp(`(${pattern})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.filter(String).map((part, i) => 
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-300 text-slate-800 rounded-sm px-0.5">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

export function LcdCompare() {
  const [products, setProducts] = useState<LcdProduct[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchName, setSearchName] = useState('');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [showOnlyWithCompetitors, setShowOnlyWithCompetitors] = useState(false);

  // Modal State
  const [activeProduct, setActiveProduct] = useState<LcdProduct | null>(null);
  const [compName, setCompName] = useState('');
  const [compPrice, setCompPrice] = useState('');
  const [savingComp, setSavingComp] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('lcd_catalog_products')
      .select('id, goods_code, brand_lcd, brand_hp, model_hp, packing, price, competitors')
      .order('brand_hp')
      .order('model_hp');

    if (!error && data) {
      setProducts(data);
    }
    setLoading(false);
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const text = `${p.goods_code || ''} ${p.brand_lcd || ''} ${p.brand_hp || ''} ${p.model_hp || ''} ${p.packing || ''}`.toLowerCase();
      
      if (searchName) {
        const searchTerms = searchName.toLowerCase().split(' ').filter(Boolean);
        const match = searchTerms.every(term => text.includes(term));
        if (!match) return false;
      }
      
      if (showOnlyWithCompetitors && (!p.competitors || p.competitors.length === 0)) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      if (searchName) {
        const sLower = searchName.toLowerCase();
        let scoreA = 0;
        let scoreB = 0;
        
        const aFull = `${a.brand_hp || ''} ${a.model_hp || ''}`.trim().toLowerCase();
        const bFull = `${b.brand_hp || ''} ${b.model_hp || ''}`.trim().toLowerCase();
        
        // Exact startsWith gets highest priority
        if (aFull.startsWith(sLower)) scoreA += 100;
        if (bFull.startsWith(sLower)) scoreB += 100;
        
        // Starts with word boundary
        if (` ${aFull}`.includes(` ${sLower}`)) scoreA += 50;
        if (` ${bFull}`.includes(` ${sLower}`)) scoreB += 50;

        // Exact match of model
        const aModel = (a.model_hp || '').toLowerCase();
        const bModel = (b.model_hp || '').toLowerCase();
        if (aModel === sLower) scoreA += 75;
        if (bModel === sLower) scoreB += 75;

        // Exact match of goods code
        const aCode = (a.goods_code || '').toLowerCase();
        const bCode = (b.goods_code || '').toLowerCase();
        if (aCode === sLower) scoreA += 150;
        if (bCode === sLower) scoreB += 150;

        if (scoreA !== scoreB) return scoreB - scoreA;
      }
      return 0;
    });
  }, [products, searchName, showOnlyWithCompetitors]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchName, showOnlyWithCompetitors]);

  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredProducts, currentPage]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  const calculatePcsPrice = (price: number, packing: string) => {
    const packingStr = String(packing || '1');
    const pcsMatch = packingStr.match(/(\d+)\s*pcs/i) || packingStr.match(/(\d+)/);
    const pcsPerKotak = pcsMatch ? parseInt(pcsMatch[1], 10) : 1;
    const safePcs = Math.max(1, pcsPerKotak);
    return price / safePcs;
  };

  const handleAddCompetitor = async () => {
    if (!activeProduct || !compName.trim() || !compPrice) return;
    const priceNum = parseFloat(compPrice);
    if (isNaN(priceNum) || priceNum <= 0) return;

    setSavingComp(true);
    let updatedCompetitors = [...(activeProduct.competitors || [])];
    
    if (editIndex !== null) {
      updatedCompetitors[editIndex] = { name: compName.trim(), price: priceNum };
    } else {
      updatedCompetitors.push({ name: compName.trim(), price: priceNum });
    }
    
    const { error } = await supabase
      .from('lcd_catalog_products')
      .update({ competitors: updatedCompetitors })
      .eq('id', activeProduct.id);

    if (!error) {
      const updatedProduct = { ...activeProduct, competitors: updatedCompetitors };
      setActiveProduct(updatedProduct);
      setProducts(prev => prev.map(p => p.id === activeProduct.id ? updatedProduct : p));
      setCompName('');
      setCompPrice('');
      setEditIndex(null);
    }
    setSavingComp(false);
  };

  const handleDeleteCompetitor = async (index: number) => {
    if (!activeProduct) return;
    setSavingComp(true);
    const updatedCompetitors = [...(activeProduct.competitors || [])];
    updatedCompetitors.splice(index, 1);
    
    const { error } = await supabase
      .from('lcd_catalog_products')
      .update({ competitors: updatedCompetitors })
      .eq('id', activeProduct.id);

    if (!error) {
      const updatedProduct = { ...activeProduct, competitors: updatedCompetitors };
      setActiveProduct(updatedProduct);
      setProducts(prev => prev.map(p => p.id === activeProduct.id ? updatedProduct : p));
    }
    setSavingComp(false);
  };

  const handleDownloadHtml = async () => {
    try {
      const dbUrl = import.meta.env.VITE_SUPABASE_URL || '';
      const dbKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
      const rawHtml = buildLcdCompareHtml(dbUrl, dbKey);
      
      const blob = new Blob([rawHtml], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Public_Perbandingan_LCD_${new Date().getTime()}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (e) {
      console.error("Failed to build HTML:", e);
      alert("Gagal men-generate HTML");
    }
  };

  return (
    <div className="p-4 w-full space-y-6">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-indigo-600 p-6 rounded-2xl text-white shadow-xl">
        <div className="flex items-center gap-3">
          <DollarSign className="w-8 h-8 shrink-0" />
          <div>
            <h1 className="text-2xl font-black tracking-tight mb-1">Perbandingan Harga LCD</h1>
            <p className="text-indigo-200 text-sm">Bandingkan harga LCD termurah dengan kompetitor secara per-pcs.</p>
          </div>
        </div>
        <div className="flex gap-2 w-full xl:w-auto">
          <button 
            onClick={handleDownloadHtml}
            className="flex flex-1 xl:flex-none justify-center items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold py-2.5 px-4 rounded-xl border border-white/20 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" /> Download HTML Public
          </button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex justify-start">
               <button 
                  onClick={() => setShowOnlyWithCompetitors(!showOnlyWithCompetitors)}
                  className={`text-xs font-bold px-4 py-2 rounded-xl border transition-colors flex items-center gap-2 ${showOnlyWithCompetitors ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
               >
                 <DollarSign className="w-4 h-4" /> 
                 {showOnlyWithCompetitors ? 'Menampilkan: Dengan Kompetitor' : 'Filter: Yang ada kompetitornya'}
               </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-xs font-bold text-slate-500 mb-1">Cari Nama LCD</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    value={searchName}
                    onChange={e => setSearchName(e.target.value)}
                    placeholder="Infinix note 30, vivan..." 
                    className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl w-full text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Diskon Kita (%)</label>
                <input 
                  type="number"
                  min="0"
                  max="100"
                  value={discountPercent}
                  onChange={e => setDiscountPercent(parseFloat(e.target.value) || 0)}
                  placeholder="Contoh: 15"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-indigo-700 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {loading ? (
              <div className="col-span-full p-8 text-center text-slate-500">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                Memuat data...
              </div>
            ) : paginatedProducts.length === 0 ? (
              <div className="col-span-full p-8 text-center text-slate-500 font-medium">
                <div className="text-4xl mb-2">🤷‍♂️</div>
                Tidak ada produk ditemukan.
              </div>
            ) : (
              paginatedProducts.map((p, idx) => {
                const baseHargaPcs = calculatePcsPrice(p.price || 0, p.packing);
                const discountAmt = baseHargaPcs * (discountPercent / 100);
                const netHargaPcs = baseHargaPcs - discountAmt;
                const isVivan = (p.brand_lcd || '').toLowerCase() === 'vivan';

                return (
                  <Card key={p.id} className={`border overflow-hidden hover:shadow-lg transition-shadow bg-white relative flex flex-col ${isVivan ? 'border-indigo-100' : 'border-emerald-100'}`}>
                     <div className={`px-4 py-3 border-b border-slate-100/70 flex flex-col gap-2 ${isVivan ? 'bg-indigo-50/30' : 'bg-emerald-50/30'}`}>
                        <div className="flex flex-col gap-1 pr-2">
                           <h3 className="font-bold text-slate-800 text-[15px] uppercase leading-tight">
                             <HighlightedText text={`${p.brand_hp || ''} ${p.model_hp || ''}`} highlight={searchName} />
                           </h3>
                           <div className="flex flex-wrap items-center gap-1.5 mt-1">
                             <span className="font-mono text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 uppercase">
                               <HighlightedText text={p.goods_code || '-'} highlight={searchName} />
                             </span>
                             <span className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase ${isVivan ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}`}>
                               <HighlightedText text={p.brand_lcd || 'Vivan'} highlight={searchName} />
                             </span>
                             <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 uppercase whitespace-nowrap">
                               <HighlightedText text={p.packing} highlight={searchName} />
                             </span>
                           </div>
                        </div>

                        <div className="flex justify-between items-end mt-2 pt-2 border-t border-slate-200/50">
                           <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-slate-500 uppercase">Harga Normal</span>
                              <span className="text-sm font-bold text-slate-400 line-through">
                                Rp {new Intl.NumberFormat('id-ID').format(Math.round(baseHargaPcs))}
                              </span>
                           </div>
                           <div className="flex flex-col text-right">
                              <span className="text-[10px] font-bold text-indigo-500 uppercase">Harga Diskon</span>
                              <span className="text-lg font-black text-indigo-600">
                                Rp {new Intl.NumberFormat('id-ID').format(Math.round(netHargaPcs))}
                              </span>
                           </div>
                        </div>
                     </div>

                     <div className="p-4 flex-1 flex flex-col bg-slate-50/50">
                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">Kompetitor</div>
                        
                        <div className="flex-1 flex flex-col gap-2 mb-4">
                           {(p.competitors && p.competitors.length > 0) ? (
                              p.competitors.map((c, cIdx) => {
                                 const diff = c.price - netHargaPcs;
                                 const isCheaper = netHargaPcs < c.price;
                                 const isExpensive = netHargaPcs > c.price;
                                 
                                 return (
                                    <div key={cIdx} className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2">
                                       <div className="flex justify-between items-start">
                                          <span className="text-xs font-bold text-slate-700 leading-none">{c.name}</span>
                                          <span className="text-sm font-black text-slate-800 leading-none">Rp {new Intl.NumberFormat('id-ID').format(c.price)}</span>
                                       </div>
                                       
                                       <div className="flex justify-end">
                                          {isCheaper ? (
                                             <div className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md border border-emerald-100 w-full justify-between">
                                                <span className="text-[10px] font-bold uppercase">Kita Lebih Murah</span>
                                                <span className="text-xs font-black">+{new Intl.NumberFormat('id-ID').format(diff)}</span>
                                             </div>
                                          ) : isExpensive ? (
                                             <div className="flex items-center gap-1 bg-rose-50 text-rose-700 px-2.5 py-1 rounded-md border border-rose-100 w-full justify-between">
                                                <span className="text-[10px] font-bold uppercase">Kita Lebih Mahal</span>
                                                <span className="text-xs font-black">{new Intl.NumberFormat('id-ID').format(diff)}</span>
                                             </div>
                                          ) : (
                                             <div className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 w-full text-center">
                                                Harga Sama Persis
                                             </div>
                                          )}
                                       </div>
                                    </div>
                                 );
                              })
                           ) : (
                              <div className="flex-1 flex flex-col items-center justify-center py-6 text-slate-400 border border-dashed border-slate-200 rounded-xl bg-white">
                                 <DollarSign className="w-6 h-6 mb-1 opacity-50" />
                                 <span className="text-xs font-medium">Belum ada kompetitor</span>
                              </div>
                           )}
                        </div>

                        <button 
                           onClick={() => setActiveProduct(p)}
                           className="w-full bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold py-2 px-3 rounded-lg border border-slate-200 flex items-center justify-center gap-1.5 transition-colors shadow-sm mt-auto"
                        >
                           <Plus className="w-3.5 h-3.5" /> Atur Kompetitor
                        </button>
                     </div>
                  </Card>
                );
              })
            )}
          </div>
          
          {totalPages > 1 && (
            <div className="flex flex-wrap justify-center items-center gap-2 mt-8 py-2">
              <button 
                onClick={() => {
                  setCurrentPage(p => Math.max(1, p - 1));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                disabled={currentPage === 1}
                className="px-4 py-2 text-sm font-bold bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Prev
              </button>
              
              <span className="text-sm font-black text-slate-600 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl">
                Halaman {currentPage} / {totalPages}
              </span>

              <button 
                onClick={() => {
                  setCurrentPage(p => Math.min(totalPages, p + 1));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                disabled={currentPage === totalPages}
                className="px-4 py-2 text-sm font-bold bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Competitor Modal */}
      {activeProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-800">Kompetitor LCD</h3>
                <p className="text-xs text-slate-500 uppercase">
                  <HighlightedText text={`${activeProduct.brand_hp} ${activeProduct.model_hp} - ${activeProduct.brand_lcd || 'Vivan'}`} highlight={searchName} />
                </p>
              </div>
              <button onClick={() => { setActiveProduct(null); setEditIndex(null); setCompName(''); setCompPrice(''); }} className="p-1 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1">
              {(!activeProduct.competitors || activeProduct.competitors.length === 0) ? (
                <div className="text-center p-6 bg-slate-50 rounded-xl border border-dashed border-slate-200 mb-4">
                  <div className="text-3xl mb-2">🏆</div>
                  <p className="text-slate-500 text-sm font-medium">Belum ada kompetitor untuk LCD ini.</p>
                </div>
              ) : (
                <div className="space-y-3 mb-6">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Daftar Kompetitor</h4>
                  {activeProduct.competitors.map((c, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                      <div>
                        <div className="text-sm font-bold text-slate-800">{c.name}</div>
                        <div className="text-xs text-slate-500 font-medium">Rp {new Intl.NumberFormat('id-ID').format(c.price)} / pcs</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => {
                            setCompName(c.name);
                            setCompPrice(c.price.toString());
                            setEditIndex(idx);
                          }}
                          disabled={savingComp}
                          className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 p-2 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteCompetitor(idx)}
                          disabled={savingComp}
                          className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 p-2 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h4 className="text-xs font-bold text-slate-600 mb-3 flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> {editIndex !== null ? 'Edit Kompetitor' : 'Tambah Kompetitor'}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Nama Kompetitor</label>
                    <input 
                      type="text" 
                      value={compName}
                      onChange={e => setCompName(e.target.value)}
                      placeholder="Contoh: Braderparts..." 
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Harga (per Pcs)</label>
                    <input 
                      type="number" 
                      value={compPrice}
                      onChange={e => setCompPrice(e.target.value)}
                      placeholder="Contoh: 155000" 
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={handleAddCompetitor}
                    disabled={savingComp || !compName.trim() || !compPrice}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold py-2.5 rounded-lg transition-colors shadow-md shadow-indigo-500/20"
                  >
                    {savingComp ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : (editIndex !== null ? 'Update Kompetitor' : 'Simpan Kompetitor Baru')}
                  </button>
                  {editIndex !== null && (
                    <button 
                      onClick={() => {
                        setEditIndex(null);
                        setCompName('');
                        setCompPrice('');
                      }}
                      className="px-4 bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 text-sm font-bold rounded-lg transition-colors"
                    >
                      Batal
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button 
                onClick={() => { setActiveProduct(null); setEditIndex(null); setCompName(''); setCompPrice(''); }}
                className="bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 px-4 py-2 rounded-xl text-sm font-bold transition-colors"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LcdCompare;
