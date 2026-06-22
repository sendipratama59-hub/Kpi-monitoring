import React, { useState, useMemo, useRef } from 'react';
import { Search, Package, ArrowLeft, MessageCircle, ShieldCheck, Copy, Check, ShoppingCart, MapPin, Download } from 'lucide-react';
import { motion } from 'motion/react';
import { toPng } from 'html-to-image';

function CopyableCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!code || code === '-') return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!code || code === '-') return <span className="font-bold text-slate-800">-</span>;

  return (
    <button 
      onClick={handleCopy}
      title="Click to copy product code"
      className="group flex items-center gap-1.5 px-2 py-0.5 -ml-2 rounded-md hover:bg-slate-100 transition-colors cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-slate-200"
    >
      <span className="font-mono font-bold text-slate-800 tracking-tight text-[13px]">{code}</span>
      {copied ? (
        <Check className="w-3.5 h-3.5 text-emerald-500" />
      ) : (
        <Copy className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-colors" />
      )}
    </button>
  );
}

function HighlightedText({ text, highlight }: { text: string; highlight: string }) {
  if (!highlight.trim()) return <>{text}</>;
  
  // Escape regex specials and build alternation: "A54 Pro" -> "a54|pro"
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

interface LcdProduct {
  id: string;
  brand: string;
  brand_hp: string;
  brand_lcd: string;
  model_hp: string;
  type_lcd: string;
  packing: string;
  price: number;
}

interface TableViewProps {
  products: any[];
  promos?: any[];
  selectedPromoFilter?: string;
  globalDiscount?: string;
  searchQuery?: string;
  onBackToGrid: () => void;
  onContactSalesman?: (msg?: string) => void;
  onClaimWarranty?: () => void;
  onGrosirLocation?: () => void;
}

export function CustomerTableView({ products, promos = [], selectedPromoFilter = 'All', globalDiscount = '10', searchQuery = '', onBackToGrid, onContactSalesman, onClaimWarranty, onGrosirLocation }: TableViewProps) {
  const [search, setSearch] = useState('');
  const [showContohModal, setShowContohModal] = useState(false);
  const [cartItems, setCartItems] = useState<{product: any, qtyKotak: number}[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [animatingId, setAnimatingId] = useState<string | null>(null);
  
  const [manualDiscounts, setManualDiscounts] = useState<Record<string, number>>({});
  const [manualInputBrand, setManualInputBrand] = useState('vivan');
  const [manualInputDiscount, setManualInputDiscount] = useState('');
  const tableRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    if (tableRef.current) {
      try {
        const dataUrl = await toPng(tableRef.current, { backgroundColor: '#ffffff' });
        const link = document.createElement('a');
        link.download = 'estimasi-belanja.png';
        link.href = dataUrl;
        link.click();
      } catch (err) {
        console.error('Failed to download image', err);
      }
    }
  };

  const addToCart = (e: React.MouseEvent, p: any) => {
    e.stopPropagation();
    setAnimatingId(p.id);
    setTimeout(() => setAnimatingId(null), 300);
    setCartItems(prev => {
      const existing = prev.find(i => i.product.id === p.id);
      if (existing) {
        return prev.map(i => i.product.id === p.id ? { ...i, qtyKotak: i.qtyKotak + 1 } : i);
      }
      return [...prev, { product: p, qtyKotak: 1 }];
    });
  };
  
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // search
      const hpBrand = p.brand_hp || p.brand || '';
      const pBrandLcd = p.brand_lcd || 'Vivan';
      const isVivan = pBrandLcd.toLowerCase() === 'vivan';
      
      let customPromos: any[] = [];
      if (selectedPromoFilter !== 'All' && selectedPromoFilter !== 'None') {
        const mat = promos.find(pr => pr.id === selectedPromoFilter);
        if (mat) customPromos.push(mat);
      } else {
        for (const promo of promos) {
          if (promo.selected_products && promo.selected_products.includes(p.id)) {
            customPromos.push(promo);
            continue;
          }
          if (promo.type === 'brand' && hpBrand.toLowerCase().includes((promo.value || '').toLowerCase())) {
            customPromos.push(promo);
            continue;
          }
          if (promo.type === 'model' && (p.model_hp || '').toLowerCase().includes((promo.value || '').toLowerCase())) {
            customPromos.push(promo);
            continue;
          }
          if (promo.type === 'product' && promo.value === p.id) {
            customPromos.push(promo);
            continue;
          }
        }
      }

      let dText = '';
      if (customPromos.length > 0) {
        dText = customPromos.map(pr => `${pr.discountPercentage}% diskon ${pr.discountPercentage}%`).join(' ');
      } else {
        const discountStrToUse = p.custom_discount || globalDiscount;
        const discountParts = discountStrToUse.split(/[,\+]/).map(d => d.trim()).filter(d => d);
        dText = discountParts.map(d => {
          const v = d.split(':').pop();
          return `${v}% diskon ${v}%`;
        }).join(' ');
      }

      const text = `${p.goods_code || ''} ${p.brand_lcd || ''} ${p.brand_hp || ''} ${p.brand || ''} ${p.model_hp || ''} ${p.type_lcd || ''} ${p.packing || ''} ${dText}`.toLowerCase();
      
      let matchPromo = selectedPromoFilter === 'All';
      if (selectedPromoFilter === 'None') {
        matchPromo = customPromos.length === 0;
      } else if (selectedPromoFilter !== 'All') {
        matchPromo = customPromos.some(pr => pr.id === selectedPromoFilter);
      }
      
      if (!matchPromo) return false;

      if (search) {
        const searchTerms = search.toLowerCase().split(' ').filter(Boolean);
        const match = searchTerms.every(term => text.includes(term));
        if (!match) return false;
      }
      return true;
    }).sort((a, b) => {
      if (search) {
        const sLower = search.toLowerCase();
        let scoreA = 0;
        let scoreB = 0;
        
        const aFull = `${a.brand_hp || a.brand || ''} ${a.model_hp || ''}`.trim().toLowerCase();
        const bFull = `${b.brand_hp || b.brand || ''} ${b.model_hp || ''}`.trim().toLowerCase();
        
        // Exact startsWith gets highest priority
        if (aFull.startsWith(sLower)) scoreA += 100;
        if (bFull.startsWith(sLower)) scoreB += 100;
        
        // Starts with word boundary
        if (` ${aFull}`.includes(` ${sLower}`)) scoreA += 50;
        if (` ${bFull}`.includes(` ${sLower}`)) scoreB += 50;

        // Exact match of model
        const aModel = (a.model_hp || '').toLowerCase();
        const bModel = (b.model_hp || '').toLowerCase();
        if (aModel.startsWith(sLower)) scoreA += 80;
        if (bModel.startsWith(sLower)) scoreB += 80;

        // If scores are different, sort by score
        if (scoreA !== scoreB) {
          return scoreB - scoreA;
        }
      }

      const brandA = (a.brand_hp || a.brand || '').toLowerCase();
      const brandB = (b.brand_hp || b.brand || '').toLowerCase();
      if (brandA !== brandB) return brandA.localeCompare(brandB);
      return (a.model_hp || '').localeCompare(b.model_hp || '');
    });
  }, [products, search]);

  const isShared = new URLSearchParams(window.location.search).get('shared') === 'true';

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="bg-white pt-3 pb-2 px-4 shadow-sm border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">Pricelist LCD Vivan dan Xpas</h1>
              <p className="text-xs sm:text-sm font-semibold text-slate-500 mb-2">LCD Berkualitas Garansi Lem 1 Tahun</p>
            </div>
            {!isShared && (
              <button onClick={onBackToGrid} className="text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" /> Mode Grid
              </button>
            )}
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Cari model HP..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 rounded-lg py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>

          <div className="flex items-center justify-center sm:justify-start gap-2 w-full mt-2 relative z-30">
            {onContactSalesman && (
              <button onClick={() => onContactSalesman()} className="text-indigo-600 hover:text-indigo-700 font-black text-xs sm:text-sm flex items-center gap-1.5 transition-all active:scale-95">
                <MessageCircle className="w-4 h-4" /> Hubungi Salesman
              </button>
            )}
            {onContactSalesman && onClaimWarranty && <div className="text-slate-300 mx-1">|</div>}
            {onClaimWarranty && (
              <button onClick={() => onClaimWarranty()} className="text-emerald-600 hover:text-emerald-700 font-black text-xs sm:text-sm flex items-center gap-1.5 transition-all active:scale-95">
                <ShieldCheck className="w-4 h-4" /> Klaim Garansi
              </button>
            )}
            {onClaimWarranty && onGrosirLocation && <div className="text-slate-300 mx-1">|</div>}
            {onGrosirLocation && (
              <button onClick={onGrosirLocation} className="text-rose-600 hover:text-rose-700 font-black text-xs sm:text-sm flex items-center gap-1.5 transition-all active:scale-95">
                <MapPin className="w-4 h-4" /> Lokasi Grosir
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-2 sm:px-4 py-6">
        {/* Table List */}
        <div className="flex flex-col">
          {filteredProducts.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center text-slate-400 font-medium">
              Tidak ada produk yang sesuai dengan pencarian.
            </div>
          ) : (
            <div className="flex flex-col min-w-full">
              {/* Header Info */}
              <div className="px-1 py-1 mb-2 flex justify-between items-center">
                <span className="text-xs font-black uppercase text-slate-500">Daftar Produk LCD ({filteredProducts.length})</span>
              </div>
              
              {/* List Body */}
              <div className="flex flex-col gap-4">
                {filteredProducts.map((p, i) => {
                  const title = `${p.brand_hp || p.brand} ${p.model_hp}`;
                  const pBrandLcd = p.brand_lcd || 'Vivan';
                  const isVivan = pBrandLcd.toLowerCase() === 'vivan';
                  
                  const packingStr = p.packing || '1';
                  const pcsMatch = String(packingStr).match(/(\d+)\s*pcs/i) || String(packingStr).match(/(\d+)/);
                  const pcsPerKotak = pcsMatch ? parseInt(pcsMatch[1], 10) : 1;
                  
                  const hargaKotak = p.price || 0;
                  const baseHargaPcs = hargaKotak / Math.max(1, pcsPerKotak);

                  let customPromos: any[] = [];
                  if (selectedPromoFilter !== 'All') {
                    const matched = promos.find(pr => pr.id === selectedPromoFilter);
                    if (matched) customPromos.push(matched);
                  } else {
                    for (const promo of promos) {
                      if (promo.selected_products && promo.selected_products.includes(p.id)) {
                        customPromos.push(promo);
                        continue;
                      }
                      const hpBrand = p.brand_hp || p.brand || '';
                      if (promo.type === 'brand' && hpBrand.toLowerCase().includes((promo.value || '').toLowerCase())) {
                        customPromos.push(promo);
                        continue;
                      }
                      if (promo.type === 'model' && (p.model_hp || '').toLowerCase().includes((promo.value || '').toLowerCase())) {
                        customPromos.push(promo);
                        continue;
                      }
                      if (promo.type === 'product' && promo.value === p.id) {
                        customPromos.push(promo);
                        continue;
                      }
                    }
                  }

                  const discountStrToUse = p.custom_discount || globalDiscount;
                  const discountParts = discountStrToUse.split(/[,\+]/).map(d => d.trim()).filter(d => d);
                  const discountRows = discountParts.map((token, index) => {
                    const parts = token.split(':');
                    let minQty, d;
                    if (parts.length === 2) {
                      minQty = parseInt(parts[0], 10);
                      d = parseFloat(parts[1]);
                    } else {
                      d = parseFloat(parts[0]);
                      minQty = index === 0 ? 10 : index === 1 ? 50 : index === 2 ? 100 : 200;
                    }
                    if (isNaN(d) || d <= 0) return null;
                    return {
                      minQty,
                      discount: d,
                      priceKotak: hargaKotak * (1 - (d / 100)),
                      pricePcs: baseHargaPcs * (1 - (d / 100))
                    };
                  }).filter(Boolean) as {minQty: number, discount: number, priceKotak: number, pricePcs: number}[];

                  return (
                    <div key={p.id} className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 sm:p-5 hover:shadow-md transition-shadow">
                      <div className="font-black text-slate-800 text-base sm:text-lg leading-tight uppercase mb-3 break-words text-center">
                        <HighlightedText text={title} highlight={search || searchQuery} />
                      </div>
                      <div className="flex flex-col gap-1 text-sm font-medium text-slate-600 mb-4">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 w-20">Kode</span>
                          <span className="text-slate-400">:</span>
                          <CopyableCode code={p.goods_code || '-'} />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 w-20">Brand</span>
                          <span className="text-slate-400">:</span>
                          <span className={`font-black uppercase ${isVivan ? 'text-indigo-600' : 'text-emerald-600'}`}>
                            {pBrandLcd}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 w-20">Packing</span>
                          <span className="text-slate-400">:</span>
                          <span className="font-bold">{packingStr}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 w-20">Stok</span>
                          <span className="text-slate-400">:</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase whitespace-nowrap ${
                            (p.stock_status === 'Kosong' || p.stock === '0' || Number(p.stock) === 0) ? 'bg-rose-100 text-rose-700' :
                            p.stock_status === 'Indent' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {(p.stock !== undefined && p.stock !== null && p.stock !== '') ? p.stock : (p.stock_status === 'Kosong' ? '0' : p.stock_status || 'Ready')}
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-slate-400 w-20 pt-0.5">Hrg Normal</span>
                          <span className="text-slate-400 pt-0.5">:</span>
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center">
                              <span className="font-bold line-through text-slate-400 mr-1">{Math.round(hargaKotak).toLocaleString('id-ID')}</span>
                              <span className="text-slate-500 text-xs">/kotak</span>
                            </div>
                            <div className="flex items-center">
                              <span className="font-bold line-through text-slate-400 mr-1">{Math.round(baseHargaPcs).toLocaleString('id-ID')}</span>
                              <span className="text-slate-500 text-xs">/pcs</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col border border-slate-200 rounded-lg overflow-hidden bg-slate-200 gap-px mt-2">
                        <div className="bg-slate-100/90 py-2 px-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">
                          Harga Tangga
                        </div>
                        <div className="flex flex-col gap-px bg-slate-200">
                          {customPromos.map((customPromo, idx) => (
                             <div key={idx} className="bg-amber-100 flex items-stretch">
                                 <div className="w-1/2 p-2.5 flex flex-col justify-center border-r border-amber-200">
                                   <span className="text-xs font-bold text-amber-900">Promo: {customPromo.name || 'Spesial'}</span>
                                   <span className="text-xs text-amber-700 font-bold mt-0.5">Diskon {customPromo.discountPercentage || 0}%</span>
                                 </div>
                                 <div className="w-1/2 p-2.5 flex flex-col justify-center text-right text-xs">
                                   <div className="font-black text-amber-900">{Math.round(hargaKotak * (1 - ((customPromo.discountPercentage || 0)/100))).toLocaleString('id-ID')}/kotak</div>
                                   <div className="font-black text-amber-700 mt-0.5">{Math.round(baseHargaPcs * (1 - ((customPromo.discountPercentage || 0)/100))).toLocaleString('id-ID')}/pcs</div>
                                 </div>
                             </div>
                          ))}
                          {discountRows.map((row, idx) => (
                            <div key={idx} className="bg-white flex items-stretch">
                                <div className="w-1/2 p-2.5 flex flex-col justify-center border-r border-slate-200">
                                  <span className="text-xs font-bold text-slate-700">{row.minQty <= 1 ? 'Tanpa min. order' : `Beli Min. ${row.minQty} Pcs`}</span>
                                  <span className="text-xs text-emerald-600 font-bold mt-0.5">Diskon {row.discount}%</span>
                                </div>
                                <div className="w-1/2 p-2.5 flex flex-col justify-center text-right text-xs">
                                  <div className="font-black text-slate-800">{Math.round(row.priceKotak).toLocaleString('id-ID')}/kotak</div>
                                  <div className="font-black text-emerald-600 mt-0.5">{Math.round(row.pricePcs).toLocaleString('id-ID')}/pcs</div>
                                </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-0.5 mt-2">
                        {!customPromos.some(cp => (cp.name || '').toLowerCase().includes('tanpa minimal order')) && (
                          <div className="text-[10px] text-slate-500 italic text-center sm:text-left">
                            * Pembelian bisa campur dengan tipe lain
                          </div>
                        )}
                        {(pcsPerKotak === 3 || pcsPerKotak === 10) && (
                          <div className="text-[10px] text-slate-500 italic text-center sm:text-left">
                            * Dijual per kotak, tidak dijual per pcs
                          </div>
                        )}
                        <div className="flex justify-center sm:justify-start gap-2 mt-2 w-full">
                          {!customPromos.some(cp => (cp.name || '').toLowerCase().includes('tanpa minimal order')) && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setShowContohModal(true); }}
                              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-md shadow-sm border border-indigo-200 cursor-pointer transition-colors w-auto text-center"
                            >
                              Lihat Contoh
                            </button>
                          )}
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            animate={animatingId === p.id ? { scale: [1, 1.1, 1] } : {}}
                            transition={{ duration: 0.3 }}
                            onClick={(e) => addToCart(e as any, p)}
                            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-md shadow-sm border border-emerald-600 cursor-pointer transition-colors flex items-center justify-center gap-1 w-auto"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" /> + Keranjang
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="pb-24"></div>

      {showContohModal && (
        <div className="fixed inset-0 bg-black/60 z-[9999] p-4 flex items-center justify-center overflow-auto" onClick={() => setShowContohModal(false)}>
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                <Package className="w-5 h-5 text-indigo-500" />
                Contoh Nota Pembelian Campur LCD
              </h3>
              <button 
                onClick={() => setShowContohModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-500 font-bold"
              >
                X
              </button>
            </div>
            <div className="p-0 sm:p-4 overflow-auto">
              <div className="w-full sm:border border-black sm:rounded-none">
                <table className="w-full text-[9px] sm:text-sm whitespace-normal sm:whitespace-nowrap border-collapse border border-black">
                  <thead className="bg-slate-100 text-black text-[8px] sm:text-xs uppercase text-left border-b border-black">
                    <tr>
                      <th className="px-1 sm:px-3 py-1 sm:py-2 font-bold w-1/4 border border-black">Nama LCD</th>
                      <th className="px-1 sm:px-3 py-1 sm:py-2 font-bold text-center border border-black">Harga / Kotak<br/><span className="text-[8px] sm:text-[10px] text-emerald-600">Diskon 10%</span></th>
                      <th className="px-1 sm:px-3 py-1 sm:py-2 font-bold text-center border border-black">Harga / Pcs<br/><span className="text-[8px] sm:text-[10px] text-emerald-600">Diskon 10%</span></th>
                      <th className="px-1 sm:px-3 py-1 sm:py-2 font-bold text-center border border-black">Qty</th>
                      <th className="px-1 sm:px-3 py-1 sm:py-2 font-bold text-right border border-black">Total Harga</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black">
                    {(() => {
                      const sampleCodes = ['10042116', '10042109', '10042108', '10042112'];
                      // Find these products in actual product list
                      const samples = sampleCodes.map(code => products.find(p => String(p.goods_code) === code)).filter(Boolean);
                      
                      let sum = 0;
                      let totQty = 0;
                      let totQtyPcs = 0;

                      // Fallback if none found
                      const itemsToRender = samples.length > 0 ? samples : [
                         { id: 1, goods_code: '10042116', brand_lcd: 'VIVAN', model_hp: 'IP X', packing: '1/3', price: 474000 },
                         { id: 2, goods_code: '10042109', brand_lcd: 'VIVAN', model_hp: 'IP XR', packing: '1/10', price: 434000 },
                         { id: 3, goods_code: '10042108', brand_lcd: 'VIVAN', model_hp: 'IP 11', packing: '1/10', price: 434000 },
                         { id: 4, goods_code: '10042112', brand_lcd: 'VIVAN', model_hp: 'IP 11 PRO MAX', packing: '1/3', price: 745000 }
                      ];

                      return (
                        <>
                          {itemsToRender.map((itm, idx) => {
                            const packingStr = itm.packing || '1';
                            const pcsMatch = String(packingStr).match(/(\d+)\s*pcs/i) || String(packingStr).match(/(\d+)/);
                            const pcsPerKotak = pcsMatch ? parseInt(pcsMatch[1], 10) : 1;
                            const hKotak = itm.price || 0;
                            const bPcs = hKotak / Math.max(1, pcsPerKotak);
                            
                            // Applying 10% discount for example
                            const prKotak = hKotak * 0.9;
                            const prPcs = bPcs * 0.9;
                            
                            // We use Qty = 1 Kotak
                            const qty = 1; 
                            const qtyPcs = qty * pcsPerKotak;
                            const total = prKotak * qty; 
                            
                            sum += total;
                            totQty += qty;
                            totQtyPcs += qtyPcs;
                            return (
                              <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                <td className="px-1 sm:px-3 py-1 sm:py-3 text-slate-800 border border-black">
                                  <div className="font-bold leading-tight">{(itm.brand_hp || itm.brand || '')} {itm.model_hp}</div>
                                  <div className="text-[7px] sm:text-[10px] text-slate-500 mt-0.5 whitespace-nowrap">{itm.goods_code || '-'} &bull; <span className="text-indigo-500 font-bold uppercase">{itm.brand_lcd || 'VIVAN'}</span></div>
                                </td>
                                <td className="px-1 sm:px-3 py-1 sm:py-3 text-center border border-black">
                                  <div className="line-through text-slate-400 text-[8px] sm:text-[10px]">{Math.round(hKotak).toLocaleString('id-ID')}</div>
                                  <div className="font-black text-emerald-600 leading-tight">{Math.round(prKotak).toLocaleString('id-ID')}</div>
                                </td>
                                <td className="px-1 sm:px-3 py-1 sm:py-3 text-center border border-black">
                                  <div className="line-through text-slate-400 text-[8px] sm:text-[10px]">{Math.round(bPcs).toLocaleString('id-ID')}</div>
                                  <div className="font-black text-emerald-600 leading-tight">{Math.round(prPcs).toLocaleString('id-ID')}</div>
                                </td>
                                <td className="px-1 sm:px-3 py-1 sm:py-3 text-center text-slate-800 border border-black">
                                  <div className="font-bold text-xs sm:text-base leading-tight">{qty} Kotak</div>
                                  <div className="text-[7px] sm:text-[10px] text-slate-500">({qtyPcs} Pcs)</div>
                                </td>
                                <td className="px-1 sm:px-3 py-1 sm:py-3 text-right font-black text-slate-800 sm:min-w-[120px] leading-tight border border-black">
                                  Rp {Math.round(total).toLocaleString('id-ID')}
                                </td>
                              </tr>
                            );
                          })}
                          <tr className="bg-slate-100/50">
                            <td colSpan={3} className="px-1 sm:px-3 py-2 sm:py-4 text-right font-bold text-black uppercase text-[9px] sm:text-sm border border-black">Total:</td>
                            <td className="px-1 sm:px-3 py-2 sm:py-4 text-center font-black border border-black">
                              <div className="text-[9px] sm:text-lg leading-tight">{totQty} Kotak</div>
                              <div className="text-[7px] sm:text-[10px] text-slate-500 font-normal">({totQtyPcs} Pcs)</div>
                            </td>
                            <td className="px-1 sm:px-3 py-2 sm:py-4 text-right text-indigo-700 font-black tracking-tight text-xs sm:text-lg border border-black">Rp {Math.round(sum).toLocaleString('id-ID')}</td>
                          </tr>
                        </>
                      );
                    })()}
                  </tbody>
                </table>
              </div>

            </div>
          </div>
        </div>
      )}

      {cartItems.length > 0 && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={() => setShowCart(true)}
          className="fixed bottom-6 right-6 z-40 bg-emerald-600 text-white p-4 rounded-full shadow-2xl flex items-center justify-center cursor-pointer hover:bg-emerald-700 transition-colors"
        >
          <div className="relative pointer-events-none">
            <Package className="w-6 h-6" />
            <div className="absolute -top-3 -right-3 bg-rose-500 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full shadow-sm">
              {cartItems.reduce((acc, i) => acc + i.qtyKotak, 0)}
            </div>
          </div>
        </motion.button>
      )}

      {showCart && (
        <div className="fixed inset-0 bg-black/60 z-[9999] p-4 flex items-center justify-center overflow-auto" onClick={() => setShowCart(false)}>
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                <Package className="w-5 h-5 text-indigo-500" />
                Estimasi Total Belanja
              </h3>
              <button 
                onClick={() => setShowCart(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-500 font-bold"
              >
                X
              </button>
            </div>
            <div className="p-0 sm:p-4 overflow-auto">
              <div ref={tableRef} id="cart-table-export" className="w-full sm:border border-black sm:rounded-none bg-white p-2">
                <style dangerouslySetInnerHTML={{__html: `
                  @media print { .print-only-text { display: block !important; } }
                  .print-only-text { display: none; }
                `}} />
                <div className="font-bold text-center mb-2 text-lg uppercase tracking-wider print-only-text" style={{display: 'none'}}>Estimasi Pembelian</div>
                <table className="w-full text-[9px] sm:text-sm whitespace-normal sm:whitespace-nowrap border-collapse border border-black">
                  <thead className="bg-slate-100 text-black text-[8px] sm:text-xs uppercase text-left border-b border-black">
                    <tr>
                      <th className="px-1 sm:px-3 py-1 sm:py-2 font-bold w-1/4 border border-black">Nama LCD</th>
                      <th className="px-1 sm:px-3 py-1 sm:py-2 font-bold text-center border border-black">Harga / Kotak</th>
                      <th className="px-1 sm:px-3 py-1 sm:py-2 font-bold text-center border border-black">Harga / Pcs</th>
                      <th className="px-1 sm:px-3 py-1 sm:py-2 font-bold text-center border border-black">Qty</th>
                      <th className="px-1 sm:px-3 py-1 sm:py-2 font-bold text-right border border-black">Total Harga</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black">
                    {(() => {
                      let currentTotPcs = 0;
                      const cartPcsPerPromo: Record<string, number> = {};
                      const cartPcsPerBrandLcd: Record<string, number> = {};
                      
                      cartItems.forEach(item => {
                        const p = item.product;
                        const packingStr = p.packing || '1';
                        const pcsMatch = String(packingStr).match(/(\d+)\s*pcs/i) || String(packingStr).match(/(\d+)/);
                        const pcsPerKotak = pcsMatch ? parseInt(pcsMatch[1], 10) : 1;
                        const itemPcs = item.qtyKotak * pcsPerKotak;
                        currentTotPcs += itemPcs;

                        const brandLcd = (p.brand_lcd || 'VIVAN').toLowerCase();
                        cartPcsPerBrandLcd[brandLcd] = (cartPcsPerBrandLcd[brandLcd] || 0) + itemPcs;

                        let eligiblePromos: any[] = [];
                        if (selectedPromoFilter !== 'All' && selectedPromoFilter !== 'None') {
                          const matched = promos.find(pr => pr.id === selectedPromoFilter);
                          if (matched) eligiblePromos.push(matched);
                        } else {
                          for (const promo of promos) {
                            if (promo.selected_products && promo.selected_products.includes(p.id)) { eligiblePromos.push(promo); continue; }
                            const hpBrand = p.brand_hp || p.brand || '';
                            if (promo.type === 'brand' && hpBrand.toLowerCase().includes((promo.value || '').toLowerCase())) { eligiblePromos.push(promo); continue; }
                            if (promo.type === 'model' && (p.model_hp || '').toLowerCase().includes((promo.value || '').toLowerCase())) { eligiblePromos.push(promo); continue; }
                            if (promo.type === 'product' && promo.value === p.id) { eligiblePromos.push(promo); continue; }
                          }
                        }

                        eligiblePromos.forEach(pr => {
                          cartPcsPerPromo[pr.id] = (cartPcsPerPromo[pr.id] || 0) + itemPcs;
                        });
                      });

                      let sum = 0;
                      let totQtyKotak = 0;
                      let totQtyPcsLocal = 0;

                      return (
                        <>
                          {cartItems.map((itm, idx) => {
                            const p = itm.product;
                            const packingStr = p.packing || '1';
                            const pcsMatch = String(packingStr).match(/(\d+)\s*pcs/i) || String(packingStr).match(/(\d+)/);
                            const pcsPerKotak = pcsMatch ? parseInt(pcsMatch[1], 10) : 1;
                            const hKotak = p.price || 0;
                            const bPcs = hKotak / Math.max(1, pcsPerKotak);

                            let customPromosCart: any[] = [];
                            if (selectedPromoFilter !== 'All' && selectedPromoFilter !== 'None') {
                              const matched = promos.find(pr => pr.id === selectedPromoFilter);
                              if (matched) customPromosCart.push(matched);
                            } else {
                              for (const promo of promos) {
                                if (promo.selected_products && promo.selected_products.includes(p.id)) {
                                  customPromosCart.push(promo);
                                  continue;
                                }
                                const hpBrand = p.brand_hp || p.brand || '';
                                if (promo.type === 'brand' && hpBrand.toLowerCase().includes((promo.value || '').toLowerCase())) {
                                  customPromosCart.push(promo);
                                  continue;
                                }
                                if (promo.type === 'model' && (p.model_hp || '').toLowerCase().includes((promo.value || '').toLowerCase())) {
                                  customPromosCart.push(promo);
                                  continue;
                                }
                                if (promo.type === 'product' && promo.value === p.id) {
                                  customPromosCart.push(promo);
                                  continue;
                                }
                              }
                            }
                            
                            const activeCustomPromos = customPromosCart.filter(pr => {
                               const reqMatch = String(pr.name || '').match(/(\d+)/);
                               const minReq = reqMatch ? parseInt(reqMatch[1], 10) : 1;
                               return (cartPcsPerPromo[pr.id] || 0) >= minReq;
                            });

                            const bestPromoDiscount = activeCustomPromos.length > 0 ? Math.max(...activeCustomPromos.map(pr => pr.discountPercentage || 0)) : 0;

                            const dStr = p.custom_discount || globalDiscount;
                            const dParts = dStr.split(/[,\+]/).map(d => d.trim()).filter(d => d);
                            const rows = dParts.map((token, index) => {
                              const parts = token.split(':');
                              let minQty, d;
                              if (parts.length === 2) {
                                minQty = parseInt(parts[0], 10);
                                d = parseFloat(parts[1]);
                              } else {
                                d = parseFloat(parts[0]);
                                minQty = index === 0 ? 1 : index === 1 ? 10 : index === 2 ? 50 : 100;
                              }
                              return { minQty, discount: isNaN(d) ? 0 : d };
                            }).filter(r => r.discount > 0);

                            const brandLcd = (p.brand_lcd || 'VIVAN').toLowerCase();
                            const brandTotPcs = cartPcsPerBrandLcd[brandLcd] || 0;
                            const applicable = rows.filter(r => r.minQty <= brandTotPcs).sort((a,b) => b.discount - a.discount);
                            let usedDiscount = applicable.length > 0 ? applicable[0].discount : 0;
                            
                            usedDiscount = Math.max(usedDiscount, bestPromoDiscount);
                            if (manualDiscounts[brandLcd] !== undefined) {
                              usedDiscount = manualDiscounts[brandLcd];
                            }

                            const prKotak = hKotak * (1 - (usedDiscount / 100));
                            const prPcs = bPcs * (1 - (usedDiscount / 100));
                            
                            const qty = itm.qtyKotak;
                            const qtyPcs = qty * pcsPerKotak;
                            const total = prKotak * qty; 
                            
                            sum += total;
                            totQtyKotak += qty;
                            totQtyPcsLocal += qtyPcs;
                            
                            return (
                              <tr key={idx} className="bg-white">
                                <td className="px-1 sm:px-3 py-1 sm:py-3 text-slate-800 border border-black">
                                  <div className="font-bold leading-tight">{(p.brand_hp || p.brand || '')} {p.model_hp}</div>
                                  <div className="text-[7px] sm:text-[10px] text-slate-500 mt-0.5 whitespace-nowrap">{p.goods_code || '-'} &bull; <span className="text-indigo-500 font-bold uppercase">{p.brand_lcd || 'VIVAN'}</span></div>
                                </td>
                                <td className="px-1 sm:px-3 py-1 sm:py-3 text-center border border-black">
                                  {usedDiscount > 0 && <div className="line-through text-slate-400 text-[8px] sm:text-[10px]">{Math.round(hKotak).toLocaleString('id-ID')}</div>}
                                  <div className="font-black text-emerald-600 leading-tight">{Math.round(prKotak).toLocaleString('id-ID')}</div>
                                  {usedDiscount > 0 && <div className="text-[7px] sm:text-[9px] text-emerald-600">Diskon {usedDiscount}%</div>}
                                </td>
                                <td className="px-1 sm:px-3 py-1 sm:py-3 text-center border border-black">
                                  {usedDiscount > 0 && <div className="line-through text-slate-400 text-[8px] sm:text-[10px]">{Math.round(bPcs).toLocaleString('id-ID')}</div>}
                                  <div className="font-black text-emerald-600 leading-tight">{Math.round(prPcs).toLocaleString('id-ID')}</div>
                                  {usedDiscount > 0 && <div className="text-[7px] sm:text-[9px] text-emerald-600">Diskon {usedDiscount}%</div>}
                                </td>
                                <td className="px-1 sm:px-3 py-1 sm:py-3 text-center text-slate-800 border border-black">
                                  <div className="flex items-center justify-center gap-1 sm:gap-2">
                                    <button onClick={(e) => { e.stopPropagation(); setCartItems(prev => prev.map(i => i.product.id === p.id ? {...i, qtyKotak: Math.max(0, i.qtyKotak - 1)} : i).filter(i => i.qtyKotak > 0)) }} className="bg-slate-200 hover:bg-slate-300 px-1.5 sm:px-2 py-0.5 rounded text-xs font-bold transition-colors">-</button>
                                    <div className="font-bold text-xs sm:text-base leading-tight min-w-[1.5rem]">{qty}</div>
                                    <button onClick={(e) => addToCart(e, p)} className="bg-slate-200 hover:bg-slate-300 px-1.5 sm:px-2 py-0.5 rounded text-xs font-bold transition-colors">+</button>
                                  </div>
                                  <div className="text-[7px] sm:text-[10px] text-slate-500 mt-1">({qtyPcs} Pcs)</div>
                                </td>
                                <td className="px-1 sm:px-3 py-1 sm:py-3 text-right text-slate-800 leading-tight border border-black min-w-[80px] sm:min-w-[120px] whitespace-nowrap">
                                  {usedDiscount > 0 && <div className="line-through text-slate-400 text-[8px] sm:text-[10px]">Rp {Math.round(hKotak * qty).toLocaleString('id-ID')}</div>}
                                  <div className="font-black text-[10px] sm:text-base">Rp {Math.round(total).toLocaleString('id-ID')}</div>
                                </td>
                              </tr>
                            );
                          })}
                          <tr className="bg-slate-100/50">
                            <td colSpan={3} className="px-1 sm:px-3 py-2 sm:py-4 text-right font-bold text-black uppercase text-[9px] sm:text-sm border border-black">Total:</td>
                            <td className="px-1 sm:px-3 py-2 sm:py-4 text-center font-black border border-black">
                              <div className="text-[9px] sm:text-lg leading-tight">{totQtyKotak} Kotak</div>
                              <div className="text-[7px] sm:text-[10px] text-slate-500 font-normal">({totQtyPcsLocal} Pcs)</div>
                            </td>
                            <td className="px-1 sm:px-3 py-2 sm:py-4 text-right leading-tight border border-black whitespace-nowrap">
                               {sum < Object.values(cartItems).reduce((r, i) => r + (i.product.price * i.qtyKotak), 0) && (
                                   <div className="line-through text-slate-400 text-[8px] sm:text-[12px] mb-0.5">Rp {Math.round(Object.values(cartItems).reduce((r, i) => r + (i.product.price * i.qtyKotak), 0)).toLocaleString('id-ID')}</div>
                               )}
                               <div className="text-indigo-700 font-black tracking-tight text-xs sm:text-lg">Rp {Math.round(sum).toLocaleString('id-ID')}</div>
                            </td>
                          </tr>
                        </>
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
            {cartItems.length > 0 && (
              <div className="p-4 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center bg-slate-50 gap-4">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 w-full md:w-auto">
                    <select
                      className="border border-slate-300 focus:border-indigo-500 rounded-lg px-3 py-2 sm:py-2.5 text-xs sm:text-sm outline-none font-semibold text-slate-700 bg-white"
                      value={manualInputBrand}
                      onChange={e => setManualInputBrand(e.target.value)}
                    >
                      <option value="vivan">VIVAN</option>
                      <option value="xpas">XPAS</option>
                      {Array.from(new Set(cartItems.map(i => (i.product.brand_lcd || 'VIVAN').toLowerCase()))).filter(b => b !== 'vivan' && b !== 'xpas').map(b => (
                        <option key={b} value={b}>{b.toUpperCase()}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      placeholder="Diskon (%)"
                      className="border border-slate-300 focus:border-indigo-500 rounded-lg px-3 py-2 sm:py-2.5 text-xs sm:text-sm w-24 sm:w-28 outline-none font-semibold text-slate-700"
                      value={manualInputDiscount}
                      onChange={e => setManualInputDiscount(e.target.value)}
                    />
                    <button
                      onClick={() => {
                        const val = parseFloat(manualInputDiscount);
                        if (!isNaN(val)) {
                          setManualDiscounts(prev => ({ ...prev, [manualInputBrand]: val }));
                        } else {
                          setManualDiscounts(prev => {
                            const next = { ...prev };
                            delete next[manualInputBrand];
                            return next;
                          });
                        }
                      }}
                      className="px-4 py-2 sm:py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg transition-colors text-xs sm:text-sm flex-shrink-0"
                    >
                      Simpan
                    </button>
                    <button
                      onClick={handleDownload}
                      className="px-3 py-2 sm:py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg transition-colors flex items-center justify-center flex-shrink-0"
                      title="Download Tabel Estimasi"
                    >
                      <Download className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600" />
                    </button>
                 </div>
                <button
                  onClick={() => {
                     let currentTotPcs = 0;
                     const cartPcsPerPromo: Record<string, number> = {};
                     const cartPcsPerBrandLcd: Record<string, number> = {};

                     cartItems.forEach(item => {
                       const p = item.product;
                       const packingStr = p.packing || '1';
                       const pcsMatch = String(packingStr).match(/(\d+)\s*pcs/i) || String(packingStr).match(/(\d+)/);
                       const pcsPerKotak = pcsMatch ? parseInt(pcsMatch[1], 10) : 1;
                       const itemPcs = item.qtyKotak * pcsPerKotak;
                       currentTotPcs += itemPcs;

                       const brandLcd = (p.brand_lcd || 'VIVAN').toLowerCase();
                       cartPcsPerBrandLcd[brandLcd] = (cartPcsPerBrandLcd[brandLcd] || 0) + itemPcs;

                       let eligiblePromos: any[] = [];
                       if (selectedPromoFilter !== 'All' && selectedPromoFilter !== 'None') {
                         const matched = promos.find(pr => pr.id === selectedPromoFilter);
                         if (matched) eligiblePromos.push(matched);
                       } else {
                         for (const promo of promos) {
                           if (promo.selected_products && promo.selected_products.includes(p.id)) { eligiblePromos.push(promo); continue; }
                           const hpBrand = p.brand_hp || p.brand || '';
                           if (promo.type === 'brand' && hpBrand.toLowerCase().includes((promo.value || '').toLowerCase())) { eligiblePromos.push(promo); continue; }
                           if (promo.type === 'model' && (p.model_hp || '').toLowerCase().includes((promo.value || '').toLowerCase())) { eligiblePromos.push(promo); continue; }
                           if (promo.type === 'product' && promo.value === p.id) { eligiblePromos.push(promo); continue; }
                         }
                       }

                       eligiblePromos.forEach(pr => {
                         cartPcsPerPromo[pr.id] = (cartPcsPerPromo[pr.id] || 0) + itemPcs;
                       });
                     });
                     
                     let template = '*Detail Pesanan:*\n\n';
                     let grandTotal = 0;

                     cartItems.forEach(itm => {
                       const p = itm.product;
                       const packingStr = p.packing || '1';
                       const pcsMatch = String(packingStr).match(/(\d+)\s*pcs/i) || String(packingStr).match(/(\d+)/);
                       const pcsPerKotak = pcsMatch ? parseInt(pcsMatch[1], 10) : 1;
                       const hKotak = p.price || 0;
                       const bPcs = hKotak / Math.max(1, pcsPerKotak);
                       
                       let customPromosCart: any[] = [];
                       if (selectedPromoFilter !== 'All' && selectedPromoFilter !== 'None') {
                         const matched = promos.find(pr => pr.id === selectedPromoFilter);
                         if (matched) customPromosCart.push(matched);
                       } else {
                         for (const promo of promos) {
                           if (promo.selected_products && promo.selected_products.includes(p.id)) {
                             customPromosCart.push(promo);
                             continue;
                           }
                           const hpBrand = p.brand_hp || p.brand || '';
                           if (promo.type === 'brand' && hpBrand.toLowerCase().includes((promo.value || '').toLowerCase())) {
                             customPromosCart.push(promo);
                             continue;
                           }
                           if (promo.type === 'model' && (p.model_hp || '').toLowerCase().includes((promo.value || '').toLowerCase())) {
                             customPromosCart.push(promo);
                             continue;
                           }
                           if (promo.type === 'product' && promo.value === p.id) {
                             customPromosCart.push(promo);
                             continue;
                           }
                         }
                       }

                       const activeCustomPromos = customPromosCart.filter(pr => {
                          const reqMatch = String(pr.name || '').match(/(\d+)/);
                          const minReq = reqMatch ? parseInt(reqMatch[1], 10) : 1;
                          return (cartPcsPerPromo[pr.id] || 0) >= minReq;
                       });
                       const bestPromoDiscount = activeCustomPromos.length > 0 ? Math.max(...activeCustomPromos.map(pr => pr.discountPercentage || 0)) : 0;

                       const dStr = p.custom_discount || globalDiscount;
                       const dParts = dStr.split(/[,\+]/).map(d => d.trim()).filter(d => d);
                       const rows = dParts.map((token: string, index: number) => {
                         const parts = token.split(':');
                         let minQty, d;
                         if (parts.length === 2) {
                           minQty = parseInt(parts[0], 10);
                           d = parseFloat(parts[1]);
                         } else {
                           d = parseFloat(parts[0]);
                           minQty = index === 0 ? 1 : index === 1 ? 10 : index === 2 ? 50 : 100;
                         }
                         return { minQty, discount: isNaN(d) ? 0 : d };
                       }).filter(r => r.discount > 0);
                       const brandLcd = (p.brand_lcd || 'VIVAN').toLowerCase();
                       const brandTotPcs = cartPcsPerBrandLcd[brandLcd] || 0;
                       const applicable = rows.filter(r => r.minQty <= brandTotPcs).sort((a,b) => b.discount - a.discount);
                       let usedDiscount = applicable.length > 0 ? applicable[0].discount : 0;
                       usedDiscount = Math.max(usedDiscount, bestPromoDiscount);
                       if (manualDiscounts[brandLcd] !== undefined) {
                         usedDiscount = manualDiscounts[brandLcd];
                       }
                       
                       const prKotak = hKotak * (1 - (usedDiscount / 100));
                       const prPcs = bPcs * (1 - (usedDiscount / 100));
                       const qty = itm.qtyKotak;
                       const qtyPcs = qty * pcsPerKotak;
                       const total = prKotak * qty; 
                       grandTotal += total;
                       
                       const rawNamaLcd = `${(p.brand_hp || p.brand || '')} ${p.model_hp}`.trim();
                       const namaLcd = rawNamaLcd.length > 26 ? rawNamaLcd.substring(0, 26) : rawNamaLcd;

                       template += `Nama lcd : ${namaLcd}\n`;
                       template += `Harga/kotak : Rp ${Math.round(prKotak).toLocaleString('id-ID')}\n`;
                       template += `Harga/pcs : Rp ${Math.round(prPcs).toLocaleString('id-ID')}\n`;
                       template += `Qty : ${qty} Kotak (${qtyPcs} Pcs)\n`;
                       template += `Total harga : Rp ${Math.round(total).toLocaleString('id-ID')}\n\n`;
                     });
                     
                     template += `*Total Estimasi Belanja : Rp ${Math.round(grandTotal).toLocaleString('id-ID')}*\n\n`;

                     setShowCart(false);
                     if (onContactSalesman) onContactSalesman(template);
                  }}
                  className="w-full md:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-95 text-sm flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                  Hubungi Salesman
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
