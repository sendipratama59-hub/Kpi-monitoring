import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/Card';
import { Search, Loader2, MonitorSmartphone, ShieldCheck, Zap, Award, CheckCircle2, MessageCircle, Package, ChevronDown, ChevronUp, Download, FileImage, FileText, Copy, Check, ClipboardPaste, MapPin, FileSpreadsheet } from 'lucide-react';
import { supabase } from '../../../services/supabase';
import { GenieModal } from '../../ui/GenieModal';
import * as LucideIcons from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import * as htmlToImage from 'html-to-image';
import * as XLSX from 'xlsx-js-style';
import { PricelistExport } from './Export/PricelistExport';
import { CustomerTableView } from './CustomerTableView';
import { OrderListChecker } from './OrderListChecker';

function CopyableCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!code || code === '-') return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!code || code === '-') return null;

  return (
    <button 
      onClick={handleCopy}
      title="Click to copy product code"
      className="group flex items-center justify-center gap-1.5 px-3 py-1.5 mt-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-300 w-full"
    >
      <span className="text-[10px] font-black uppercase tracking-wider">Kode:</span>
      <span className="font-mono font-bold tracking-tight text-[11px]">{code}</span>
      {copied ? (
        <Check className="w-3.5 h-3.5 text-emerald-500" />
      ) : (
        <Copy className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />
      )}
    </button>
  );
}

function HighlightedText({ text, highlight }: { text: string; highlight: string }) {
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

interface LcdProduct {
  id: string;
  brand: string;
  brand_hp: string;
  brand_lcd: string;
  model_hp: string;
  type_lcd: string;
  packing: string;
  price: number;
  stock_status: string;
  stock?: string;
  warranty_months: number;
  goods_code?: string;
  custom_discount?: string;
}

export function LcdCatalogViewer() {
  const urlParams = new URLSearchParams(window.location.search);
  const isShared = urlParams.get('shared') === 'true';
  const initialMode = isShared ? 'Table' : (urlParams.get('mode') === 'grid' ? 'Grid' : 'Table');
  const [viewMode, setViewMode] = useState<'Grid' | 'Table'>(initialMode);
  const [products, setProducts] = useState<LcdProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedBrandHp, setSelectedBrandHp] = useState('All');
  const [selectedBrandLcd, setSelectedBrandLcd] = useState<'Vivan' | 'XPas' | 'All'>('All');
  const [selectedPromoFilter, setSelectedPromoFilter] = useState('All');
  const [globalDiscount, setGlobalDiscount] = useState<string>('0');
  const [globalTerms, setGlobalTerms] = useState<string>('');
  const [isTermsOpen, setIsTermsOpen] = useState(false);

  const [salesmanWaTemplate, setSalesmanWaTemplate] = useState('');
  const [showSalesmanModal, setShowSalesmanModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showWarrantyModal, setShowWarrantyModal] = useState(false);
  const [showGrosirModal, setShowGrosirModal] = useState(false);
  const [termsContent, setTermsContent] = useState('');
  const [salesmen, setSalesmen] = useState<any[]>([]);
  const [promos, setPromos] = useState<any[]>([]);
  const [warranties, setWarranties] = useState<any[]>([]);
  const [wholesaleStores, setWholesaleStores] = useState<any[]>([]);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState<'Image' | 'PDF' | 'Excel'>('Image');
  const ALL_EXCEL_COLUMNS = ['No', 'Kode Barang', 'Brand HP', 'Model HP', 'Kualitas / Brand LCD', 'Isi / Kotak', 'Harga Pricelist', 'Diskon', 'Harga / Pcs', 'Status Stok', 'Garansi (Bulan)'];
  const [downloadExcelColumns, setDownloadExcelColumns] = useState<string[]>(ALL_EXCEL_COLUMNS);
  const [downloadFilterLcd, setDownloadFilterLcd] = useState<'All' | 'Vivan' | 'XPas'>('All');
  const [downloadFilterBrandHp, setDownloadFilterBrandHp] = useState<string[]>([]);
  const [downloadCustomDiscount, setDownloadCustomDiscount] = useState<number>(0);
  const [downloadFilterPromo, setDownloadFilterPromo] = useState('All');
  const [downloadSalesmanId, setDownloadSalesmanId] = useState<string>('none');
  const [downloadTerms, setDownloadTerms] = useState<string>('');
  
  useEffect(() => {
    try {
      const savedCols = localStorage.getItem('lcd_export_excel_cols');
      if (savedCols) {
        setDownloadExcelColumns(JSON.parse(savedCols));
      }
      const savedDiscount = localStorage.getItem('lcd_export_discount');
      if (savedDiscount) {
        setDownloadCustomDiscount(parseFloat(savedDiscount) || 0);
      }
    } catch(e) {}
  }, []);

  useEffect(() => {
    localStorage.setItem('lcd_export_excel_cols', JSON.stringify(downloadExcelColumns));
  }, [downloadExcelColumns]);

  useEffect(() => {
    localStorage.setItem('lcd_export_discount', downloadCustomDiscount.toString());
  }, [downloadCustomDiscount]);
  const [isExporting, setIsExporting] = useState(false);
  const [showOrderListChecker, setShowOrderListChecker] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    async function trackVisitor() {
      if (!isShared) return;
      try {
        let visitorId = localStorage.getItem('lcd_visitor_id');
        if (!visitorId) {
          visitorId = crypto.randomUUID();
          localStorage.setItem('lcd_visitor_id', visitorId);
        }
        
        await supabase.from('lcd_catalog_visitors').upsert({
          visitor_id: visitorId,
          last_active: new Date().toISOString(),
          device_info: navigator.userAgent,
          last_path: window.location.search
        }, { onConflict: 'visitor_id' });
      } catch (err) {
        console.error('Failed to track visitor', err);
      }
    }

    trackVisitor();
    const interval = setInterval(trackVisitor, 30000); // Ping every 30 seconds
    return () => clearInterval(interval);
  }, [isShared]);

  const defaultHero = {
    title: 'Premium Quality LCD',
    highlight: 'Garansi 1 Tahun.',
    desc: 'Lebih terang, lebih responsif, dan lebih awet. Pilihan tepat untuk penggantian layar HP kesayangan Anda dengan kualitas setara original.',
    features: [
      { id: '1', icon: 'Zap', color: 'amber', title: 'True Color Display', desc: 'Warna lebih pekat dan cerah dengan color gamut luas. Tidak pudar seperti LCD murah.' },
      { id: '2', icon: 'ShieldCheck', color: 'indigo', title: 'Garansi 12 Bulan', desc: 'Satu-satunya LCD yang berani memberikan garansi 1 tahun penuh. Rusak ganti baru.' },
      { id: '3', icon: 'Award', color: 'emerald', title: 'Presisi 100%', desc: 'Ukuran presisi tanpa bingkai tebal. Touchscreen sangat responsif untuk gaming sekalipun.' }
    ]
  };
  const [heroSettings, setHeroSettings] = useState(defaultHero);

  useEffect(() => {
    fetchProducts();
    fetchDiscountAndSalesmen();

    const scrollContainer = document.getElementById('main-scroll-container') || window;

    const handleScroll = () => {
      const currentScroll = scrollContainer === window ? window.scrollY : (scrollContainer as HTMLElement).scrollTop;
      if (currentScroll > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (viewMode === 'Grid') {
      url.searchParams.set('mode', 'grid');
    } else {
      url.searchParams.delete('mode');
    }
    window.history.replaceState({}, '', url);
  }, [viewMode]);

  const scrollToTopSlow = () => {
    const scrollContainer = document.getElementById('main-scroll-container') || window;
    const startY = scrollContainer === window ? window.scrollY : (scrollContainer as HTMLElement).scrollTop;
    const duration = 1500; // 1.5 seconds format for a slower, smoother scroll
    const startTime = performance.now();

    const scrollTo = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (easeInOutCubic)
      const easeInOutCubic = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const easeProgress = easeInOutCubic(progress);

      const targetY = startY * (1 - easeProgress);

      if (scrollContainer === window) {
        window.scrollTo(0, targetY);
      } else {
        (scrollContainer as HTMLElement).scrollTop = targetY;
      }

      if (elapsed < duration) {
        requestAnimationFrame(scrollTo);
      }
    };

    requestAnimationFrame(scrollTo);
  };

  const fetchDiscountAndSalesmen = async () => {
    try {
      const { data: dData, error: dErr } = await supabase.from('lcd_catalog_content').select('*').eq('section_key', 'discount_setting').single();
      if (!dErr && dData && dData.content) {
        setGlobalDiscount(dData.content);
      }
      const { data: tData } = await supabase.from('lcd_catalog_content').select('*').eq('section_key', 'global_terms_setting').single();
      if (tData && tData.content) {
        setGlobalTerms(tData.content);
      }
      const { data: sData, error: sErr } = await supabase.from('lcd_catalog_content').select('*').eq('section_key', 'salesmen_list').single();
      if (!sErr && sData && sData.content) {
        try {
          setSalesmen(JSON.parse(sData.content));
        } catch (e) {
          setSalesmen([]);
        }
      }
      const { data: pData, error: pErr } = await supabase.from('lcd_catalog_content').select('*').eq('section_key', 'promo_setting').single();
      if (!pErr && pData && pData.content) {
        try {
          setPromos(JSON.parse(pData.content));
        } catch (e) {
          setPromos([]);
        }
      }
      const { data: wData, error: wErr } = await supabase.from('lcd_catalog_content').select('*').eq('section_key', 'warranty_notes').single();
      if (!wErr && wData && wData.content) {
        try {
          setWarranties(JSON.parse(wData.content));
        } catch (e) {
          setWarranties([]);
        }
      }
      const { data: hData } = await supabase.from('lcd_catalog_content').select('*').eq('section_key', 'hero_setting').single();
      if (hData && hData.content) {
        try {
          setHeroSettings(JSON.parse(hData.content));
        } catch (e) {
          setHeroSettings(defaultHero);
        }
      }
      const { data: gData } = await supabase.from('lcd_catalog_content').select('*').eq('section_key', 'wholesale_stores').single();
      if (gData && gData.content) {
        try {
          setWholesaleStores(JSON.parse(gData.content));
        } catch (e) {
          setWholesaleStores([]);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('lcd_catalog_products').select('*').order('brand_hp').order('model_hp');
      if (!error && data) {
        setProducts(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p => {
    const hpBrand = p.brand_hp || p.brand || '';
    const lcdBrand = p.brand_lcd || 'Vivan'; // default legacy fallback

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

    const text = `${p.goods_code || ''} ${p.model_hp || ''} ${p.brand_hp || ''} ${p.brand || ''} ${p.type_lcd || ''} ${p.packing || ''} ${dText}`.toLowerCase();
    const matchSearch = search ? search.toLowerCase().split(' ').filter(Boolean).every(term => text.includes(term)) : true;

    const matchBrandHp = selectedBrandHp === 'All' || hpBrand === selectedBrandHp;
    const matchBrandLcd = selectedBrandLcd === 'All' || lcdBrand === selectedBrandLcd;
    
    let matchPromo = selectedPromoFilter === 'All';
    if (selectedPromoFilter === 'None') {
      matchPromo = customPromos.length === 0;
    } else if (selectedPromoFilter !== 'All') {
      matchPromo = customPromos.some(pr => pr.id === selectedPromoFilter);
    }

    const isOutOfStock = p.stock_status === 'Kosong' || p.stock === '0' || Number(p.stock) === 0;
    if (selectedPromoFilter !== 'All' && selectedPromoFilter !== 'None' && isOutOfStock) return false;

    return matchSearch && matchBrandHp && matchBrandLcd && matchPromo;
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

    const isBrandFiltered = selectedBrandLcd !== 'All' || selectedBrandHp !== 'All';
    if (isBrandFiltered) {
      const outA = a.stock_status === 'Kosong' || a.stock === '0' || Number(a.stock) === 0;
      const outB = b.stock_status === 'Kosong' || b.stock === '0' || Number(b.stock) === 0;
      if (outA && !outB) return 1;
      if (!outA && outB) return -1;
    }
    const brandA = (a.brand_hp || a.brand || '').toLowerCase();
    const brandB = (b.brand_hp || b.brand || '').toLowerCase();
    if (brandA !== brandB) return brandA.localeCompare(brandB);
    return (a.model_hp || '').localeCompare(b.model_hp || '');
  });

  const hpBrands = ['All', ...Array.from(new Set(products.map(p => p.brand_hp || p.brand))).sort()];

  const exportFilteredProducts = products.filter(p => {
    const hpBrand = p.brand_hp || p.brand;
    const lcdBrand = p.brand_lcd || 'Vivan';
    const matchBrandLcd = downloadFilterLcd === 'All' || lcdBrand === downloadFilterLcd;
    const matchBrandHp = downloadFilterBrandHp.length === 0 || downloadFilterBrandHp.includes(hpBrand);
    const matchPromo = downloadFilterPromo === 'All' || (() => {
       const promo = promos.find(pr => pr.id === downloadFilterPromo);
       if (!promo) return false;
       if (promo.selected_products && promo.selected_products.includes(p.id)) return true;
       if (promo.type === 'brand' && (hpBrand || '').toLowerCase().includes((promo.value || '').toLowerCase())) return true;
       if (promo.type === 'model' && (p.model_hp || '').toLowerCase().includes((promo.value || '').toLowerCase())) return true;
       if (promo.type === 'product' && promo.value === p.id) return true;
       return false;
    })();
    return matchBrandLcd && matchBrandHp && matchPromo;
  }).sort((a, b) => {
    const brandA = (a.brand_hp || a.brand || '').toLowerCase();
    const brandB = (b.brand_hp || b.brand || '').toLowerCase();
    if (brandA !== brandB) return brandA.localeCompare(brandB);
    return (a.model_hp || '').localeCompare(b.model_hp || '');
  });

  const handleDownload = async () => {
    if (downloadFormat === 'Excel') {
      try {
        if (exportFilteredProducts.length === 0) {
           alert('Tidak ada data produk untuk di-download dengan filter ini.');
           return;
        }

        const rows = exportFilteredProducts.map((p, idx) => {
          const price = p.price || 0;
          const discountPct = downloadCustomDiscount || 0;
          const discountAmount = price * (discountPct / 100);
          const nettPrice = price - discountAmount;
          
          const packingStr = p.packing || p.type_lcd || '1';
          const pcsMatch = packingStr.match(/(\d+)\s*pcs/i) || packingStr.match(/(\d+)/);
          const pcsPerKotak = pcsMatch ? parseInt(pcsMatch[1], 10) : 1;
          const hargaPerPcsNett = nettPrice / Math.max(1, pcsPerKotak);
          
          const rowData: any = {};
          if (downloadExcelColumns.includes('No')) rowData['No'] = idx + 1;
          if (downloadExcelColumns.includes('Kode Barang')) rowData['Kode Barang'] = p.goods_code || '-';
          if (downloadExcelColumns.includes('Brand HP')) rowData['Brand HP'] = p.brand_hp || '-';
          if (downloadExcelColumns.includes('Model HP')) rowData['Model HP'] = p.model_hp || '-';
          if (downloadExcelColumns.includes('Kualitas / Brand LCD')) rowData['Kualitas / Brand LCD'] = p.brand_lcd || 'Vivan';
          if (downloadExcelColumns.includes('Isi / Kotak')) rowData['Isi / Kotak'] = packingStr;
          if (downloadExcelColumns.includes('Harga Pricelist')) rowData['Harga Pricelist'] = price;
          if (downloadExcelColumns.includes('Diskon')) rowData[`Diskon (${discountPct}%)`] = discountAmount;
          if (downloadExcelColumns.includes('Harga / Pcs')) rowData['Harga / Pcs'] = hargaPerPcsNett;
          if (downloadExcelColumns.includes('Status Stok')) rowData['Status Stok'] = p.stock_status || '-';
          if (downloadExcelColumns.includes('Garansi (Bulan)')) rowData['Garansi (Bulan)'] = p.warranty_months || 0;
          
          return rowData;
        });

        const worksheet = XLSX.utils.json_to_sheet(rows);
        
        // Define columns width & styles
        const refRange = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
        const colWidths: {wch: number}[] = [];
        const headers = Object.keys(rows[0]);
        
        for (let C = refRange.s.c; C <= refRange.e.c; ++C) {
          const header = headers[C];
          // Auto width except Model HP
          if (header === 'Model HP') {
            colWidths[C] = { wch: 25 }; 
          } else {
             let maxLen = header.length;
             for (let R = refRange.s.r + 1; R <= refRange.e.r; ++R) {
                const cellRef = XLSX.utils.encode_cell({r: R, c: C});
                const cell = worksheet[cellRef];
                if (cell && cell.v !== undefined && cell.v !== null) {
                   // if it's formatted as currency, it will be longer. Just rough estimate
                   let strVal = String(cell.v);
                   if (typeof cell.v === 'number' && (header.includes('Harga') || header.includes('Diskon'))) {
                     strVal = strVal.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
                   }
                   maxLen = Math.max(maxLen, strVal.length);
                }
             }
             colWidths[C] = { wch: maxLen + 3 };
          }
        }
        worksheet['!cols'] = colWidths;
        
        for (let R = refRange.s.r; R <= refRange.e.r; ++R) {
          for (let C = refRange.s.c; C <= refRange.e.c; ++C) {
            const cellAddress = {c: C, r: R};
            const cellRef = XLSX.utils.encode_cell(cellAddress);
            if (!worksheet[cellRef]) continue;

            const header = headers[C];
            worksheet[cellRef].s = worksheet[cellRef].s || {};
            
            // All borders
            worksheet[cellRef].s.border = {
              top: { style: 'thin' },
              bottom: { style: 'thin' },
              left: { style: 'thin' },
              right: { style: 'thin' }
            };

            // Vertical center always
            worksheet[cellRef].s.alignment = worksheet[cellRef].s.alignment || {};
            worksheet[cellRef].s.alignment.vertical = 'center';

            // Header styling
            if (R === 0) {
              worksheet[cellRef].s.alignment.horizontal = 'center';
              worksheet[cellRef].s.font = { bold: true };
            }

            // Currency formatting
            if (R > 0 && typeof worksheet[cellRef].v === 'number' && (header.includes('Harga') || header.includes('Diskon'))) {
              worksheet[cellRef].z = '"Rp "#,##0';
            }
            
            // Align center or right for specific columns
            if (R > 0 && (header === 'No' || header === 'Status Stok' || header === 'Garansi (Bulan)')) {
               worksheet[cellRef].s.alignment.horizontal = 'center';
            }
          }
        }

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Pricelist LCD');
        XLSX.writeFile(workbook, `Pricelist_LCD_${downloadFilterLcd}_Diskon_${downloadCustomDiscount}Pct_${new Date().getTime()}.xlsx`);
        setShowDownloadModal(false);
      } catch (e) {
        console.error('Failed to download Excel', e);
        alert('Gagal mengekspor file Excel.');
      }
      return;
    }

    if (!exportRef.current) return;
    setIsExporting(true);
    try {
      // Small delay to ensure render
      await new Promise(r => setTimeout(r, 100));
      
      const element = exportRef.current;
      const pages = Array.from(element.querySelectorAll('[data-export-page="true"]')) as HTMLElement[];
      const pagesToProcess = pages.length > 0 ? pages : [element as HTMLElement];
      
      if (downloadFormat === 'Image') {
        for (let i = 0; i < pagesToProcess.length; i++) {
          const pageElement = pagesToProcess[i];
          const dataUrl = await htmlToImage.toPng(pageElement, {
            pixelRatio: 2, 
            backgroundColor: '#ffffff',
            cacheBust: true,
            style: { filter: 'grayscale(100%)' }
          });
          const link = document.createElement('a');
          link.download = `Pricelist_LCD_${downloadFilterLcd}_Hal${i+1}_${new Date().getTime()}.png`;
          link.href = dataUrl;
          link.click();
          await new Promise(r => setTimeout(r, 300));
        }
        setShowDownloadModal(false);
      } else {
        try {
          let pdf: jsPDF | null = null;
          
          for (let i = 0; i < pagesToProcess.length; i++) {
            const pageElement = pagesToProcess[i];
            const dataUrl = await htmlToImage.toPng(pageElement, {
              pixelRatio: 2, 
              backgroundColor: '#ffffff',
              cacheBust: true,
              style: { filter: 'grayscale(100%)' }
            });

            const img = new window.Image();
            img.src = dataUrl;
            await new Promise((resolve) => {
              img.onload = resolve;
            });
            
            const pWidth = pageElement.offsetWidth || img.width;
            const pHeight = pageElement.offsetHeight || img.height;

            if (!pdf) {
              pdf = new jsPDF({
                orientation: pWidth > pHeight ? 'l' : 'p',
                unit: 'px',
                format: [pWidth, pHeight]
              });
            } else {
              pdf.addPage([pWidth, pHeight], pWidth > pHeight ? 'l' : 'p');
            }
            
            pdf.addImage(dataUrl, 'PNG', 0, 0, pWidth, pHeight);
          }
          
          if (pdf) {
            pdf.save(`Pricelist_LCD_${downloadFilterLcd}_${new Date().getTime()}.pdf`);
          }
          
          setShowDownloadModal(false);
        } catch (pdfError) {
          console.error("PDF generation failed:", pdfError);
          alert('Format PDF gagal dibuat. Silakan coba mengunduh tipe Gambar saja.');
        }
      }
    } catch (error) {
      console.error('Export failed', error);
      alert('Gagal mengekspor pricelist. Silakan coba lagi.');
    } finally {
      setIsExporting(false);
    }
  };




  return (
    <div className="bg-slate-50 min-h-screen pb-12">
      {viewMode === 'Table' ? (
        <CustomerTableView 
          products={products} 
          promos={promos}
          selectedPromoFilter={selectedPromoFilter}
          globalDiscount={globalDiscount}
          searchQuery={search}
          onBackToGrid={() => setViewMode('Grid')} 
          onContactSalesman={(msg) => {
            if (msg) setSalesmanWaTemplate(msg);
            setShowSalesmanModal(true);
          }}
          onClaimWarranty={() => setShowWarrantyModal(true)}
          onGrosirLocation={() => setShowGrosirModal(true)}
        />
      ) : (
        <>
          {/* Hero Section */}
      <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white pt-16 pb-20 px-6 sm:px-12 rounded-b-[3rem] shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80')] opacity-10 bg-cover bg-center mix-blend-overlay"></div>
        <div className="max-w-5xl mx-auto relative z-10 flex flex-col items-center text-center">
          <div className="flex gap-2">
            <div className="bg-indigo-500/20 backdrop-blur-sm px-4 py-1.5 rounded-full border border-indigo-400/30 text-indigo-200 text-sm font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
              <MonitorSmartphone className="w-4 h-4" /> Vivan LCD
            </div>
            <div className="bg-emerald-500/20 backdrop-blur-sm px-4 py-1.5 rounded-full border border-emerald-400/30 text-emerald-200 text-sm font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
              <MonitorSmartphone className="w-4 h-4" /> XPas LCD
            </div>
          </div>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tighter mb-6 leading-tight">
            {heroSettings.title} <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">{heroSettings.highlight}</span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-300 max-w-2xl font-medium leading-relaxed mb-8">
            {heroSettings.desc}
          </p>
          <div className="flex flex-wrap gap-4 items-center justify-center">
            <button 
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('pricelist')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="bg-white text-indigo-950 px-8 py-3 rounded-full font-bold shadow-xl shadow-white/10 hover:shadow-white/20 transition-all hover:-translate-y-1"
            >
              Lihat Pricelist
            </button>
            <button 
              onClick={(e) => {
                e.preventDefault();
                setViewMode('Table');
              }}
              className="bg-indigo-600/50 backdrop-blur border border-indigo-500/50 text-white px-8 py-3 rounded-full font-bold shadow-xl shadow-indigo-900/20 hover:shadow-indigo-900/40 transition-all hover:-translate-y-1"
            >
              Mode Tabel List
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 -mt-10 relative z-20 space-y-12">
        {/* Keunggulan Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {heroSettings.features.map((feature: any) => {
            const IconComponent = (LucideIcons as any)[feature.icon] || LucideIcons.CheckCircle2;
            return (
              <Card key={feature.id} className="border-none shadow-xl shadow-slate-200/50 group hover:-translate-y-1 transition-all">
                <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform bg-${feature.color}-100 text-${feature.color}-600`}>
                    <IconComponent className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-slate-800">{feature.title}</h3>
                    <p className="text-slate-500 text-sm mt-2">{feature.desc}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Pricelist Section */}
        <div id="pricelist" className="space-y-6 scroll-mt-24 pb-24">
            <div className="flex flex-col xl:flex-row justify-between items-end xl:items-center gap-4 border-b pb-4">
              <div className="flex flex-wrap gap-2">
                {!isShared && (
                  <button 
                    onClick={() => setShowDownloadModal(true)}
                    className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 px-4 py-2 rounded-xl font-bold text-sm shadow-sm flex items-center gap-2 transition-all active:scale-95"
                  >
                    <Download className="w-4 h-4" /> Download Pricelist
                  </button>
                )}
                {!isShared && (
                  <button 
                    onClick={() => setShowOrderListChecker(true)}
                    className="bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 px-4 py-2 rounded-xl font-bold text-sm shadow-sm flex items-center gap-2 transition-all active:scale-95"
                  >
                    <ClipboardPaste className="w-4 h-4" /> Cek List Orderan WA
                  </button>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
                <div className="flex bg-slate-900 border border-slate-700 p-1 rounded-xl">
                  {['All', 'Vivan', 'XPas'].map(b => (
                    <button 
                      key={b}
                        onClick={() => {
                        setSelectedBrandLcd(b as any);
                        setSelectedPromoFilter('All');
                        setSelectedBrandHp('All');
                        setSearch('');
                        setTimeout(() => {
                          document.getElementById('product-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }, 50);
                      }}
                      className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${selectedBrandLcd === b ? 'bg-indigo-600 shadow-[0_0_15px_rgba(79,70,229,0.8)] text-white' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      {b === 'All' ? 'Brand LCD' : b}
                    </button>
                  ))}
                </div>
                <select 
                  className="border rounded-xl px-4 py-2 font-medium bg-white shadow-sm focus:ring-2 focus:ring-indigo-500"
                  value={selectedBrandHp}
                  onChange={e => {
                    setSelectedBrandHp(e.target.value);
                    setSelectedPromoFilter('All');
                    setSelectedBrandLcd('All');
                    setSearch('');
                  }}
                >
                  {hpBrands.map(b => <option key={b} value={b}>{b === 'All' ? 'Brand HP' : b}</option>)}
                </select>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text"
                    placeholder="Cari tipe HP atau Brand..." 
                    className="pl-9 w-full sm:w-64 border rounded-xl px-4 py-2 bg-white shadow-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    value={search}
                    onChange={e => {
                      setSearch(e.target.value);
                      setSelectedPromoFilter('All');
                      setSelectedBrandLcd('All');
                      setSelectedBrandHp('All');
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center sm:justify-start gap-2 w-full mb-6 mt-3 relative z-30">
              <button onClick={() => setShowSalesmanModal(true)} className="text-indigo-600 hover:text-indigo-700 font-black text-xs sm:text-sm flex items-center gap-1.5 transition-all active:scale-95">
                <MessageCircle className="w-4 h-4" /> Hubungi Salesman
              </button>
              <div className="text-slate-300 mx-1">|</div>
              <button onClick={() => setShowWarrantyModal(true)} className="text-emerald-600 hover:text-emerald-700 font-black text-xs sm:text-sm flex items-center gap-1.5 transition-all active:scale-95">
                <ShieldCheck className="w-4 h-4" /> Klaim Garansi
              </button>
              <div className="text-slate-300 mx-1">|</div>
              <button onClick={() => setShowGrosirModal(true)} className="text-rose-600 hover:text-rose-700 font-black text-xs sm:text-sm flex items-center gap-1.5 transition-all active:scale-95">
                <MapPin className="w-4 h-4" /> Lokasi Grosir
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
              </div>
            ) : (
              <>
                {promos.length > 0 && (
                  <div className="flex bg-emerald-50 border border-emerald-200 p-1 rounded-xl w-full sm:w-max overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    <button
                      onClick={() => {
                        setSelectedPromoFilter('All');
                        setSelectedBrandLcd('All');
                        setSelectedBrandHp('All');
                        setSearch('');
                      }}
                      className={`px-4 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap transition-all flex items-center justify-center ${selectedPromoFilter === 'All' ? 'bg-white shadow text-emerald-700' : 'text-emerald-600/70 hover:text-emerald-700'}`}
                    >
                      Semua Promo
                    </button>
                    <button
                      onClick={() => {
                        setSelectedPromoFilter('None');
                        setSelectedBrandLcd('All');
                        setSelectedBrandHp('All');
                        setSearch('');
                      }}
                      className={`px-4 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap transition-all flex items-center justify-center ${selectedPromoFilter === 'None' ? 'bg-white shadow text-slate-700' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Tanpa Promo
                    </button>
                    {[...promos].sort((a, b) => (a.discountPercentage || 0) - (b.discountPercentage || 0)).map(promo => (
                      <button
                        key={promo.id}
                        onClick={() => {
                          setSelectedPromoFilter(promo.id);
                          setSelectedBrandLcd('All');
                          setSelectedBrandHp('All');
                          setSearch('');
                        }}
                        className={`px-4 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${selectedPromoFilter === promo.id ? 'bg-white shadow text-emerald-700' : 'text-emerald-600/70 hover:text-emerald-700'}`}
                      >
                        {promo.discountPercentage || 0}%
                      </button>
                    ))}
                  </div>
                )}
                {selectedPromoFilter === 'All' && globalTerms ? (
                <div className="bg-slate-50 border border-slate-200 rounded-xl mb-4 overflow-hidden">
                  <button 
                    onClick={() => setIsTermsOpen(!isTermsOpen)}
                    className="w-full flex items-center justify-between p-4 text-left focus:outline-none group"
                  >
                    <h4 className="font-bold flex items-center gap-2 text-slate-800">
                      <Award className="w-4 h-4 text-indigo-500 group-hover:scale-110 transition-transform" />
                      Syarat & Ketentuan Global:
                    </h4>
                    <motion.div animate={{ rotate: isTermsOpen ? 180 : 0 }} transition={{ duration: 0.3 }} className="text-slate-400 group-hover:text-indigo-500">
                      <ChevronDown className="w-5 h-5" />
                    </motion.div>
                  </button>
                  <AnimatePresence>
                    {isTermsOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.5, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 pt-0 text-sm space-y-1 text-slate-600 border-t border-slate-100">
                          {globalTerms.split('\n').map((line, i) => (
                            <p key={i}>{line}</p>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : selectedPromoFilter !== 'All' && (() => {
                const activePromo = promos.find(p => p.id === selectedPromoFilter);
                if (activePromo && activePromo.terms) {
                  return (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl mb-4 overflow-hidden">
                      <button 
                        onClick={() => setIsTermsOpen(!isTermsOpen)}
                        className="w-full flex items-center justify-between p-4 text-left focus:outline-none group"
                      >
                        <h4 className="font-bold flex items-center gap-2 text-emerald-900">
                          <Award className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
                          Syarat & Ketentuan Promo:
                        </h4>
                        <motion.div animate={{ rotate: isTermsOpen ? 180 : 0 }} transition={{ duration: 0.3 }} className="text-emerald-500 group-hover:text-emerald-700">
                          <ChevronDown className="w-5 h-5" />
                        </motion.div>
                      </button>
                      <AnimatePresence>
                        {isTermsOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.5, ease: "easeInOut" }}
                            className="overflow-hidden"
                          >
                            <div className="p-4 pt-0 text-sm space-y-1 text-emerald-800/80 border-t border-emerald-100">
                              {activePromo.terms.split('\n').map((line: string, i: number) => (
                                <p key={i}>{line}</p>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )
                }
                return null;
              })()}
              <div id="product-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 scroll-mt-[100px]">
              {filteredProducts.length === 0 ? (
                <div className="col-span-full py-16 text-center text-slate-400">
                  <MonitorSmartphone className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p className="font-medium text-lg">Tidak ada LCD yang sesuai pencarian.</p>
                </div>
              ) : (
                filteredProducts.map(p => {
                  const hpBrand = p.brand_hp || p.brand;
                  const lcdBrand = p.brand_lcd || 'Vivan';
                  const isVivan = lcdBrand === 'Vivan';
                  const packingStr = p.packing || p.type_lcd || '1';
                  const pcsMatch = packingStr.match(/(\d+)\s*pcs/i) || packingStr.match(/(\d+)/);
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

                  // Parse discounts like "10:10, 50:12" or "10, 12"
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
                      minQty = index === 0 ? 1 : index === 1 ? 10 : index === 2 ? 50 : 100;
                    }
                    if (isNaN(d) || d <= 0) return null;
                    return {
                      minQty,
                      discount: d,
                      price: baseHargaPcs * (1 - (d / 100))
                    };
                  }).filter(Boolean) as {minQty: number, discount: number, price: number}[];

                  return (
                    <Card key={p.id} className={`border overflow-hidden hover:shadow-lg transition-shadow bg-white relative ${isVivan ? 'border-indigo-100' : 'border-emerald-100'}`}>
                      <div className={`px-4 pt-3 pb-0 ${isVivan ? 'bg-indigo-50/20' : 'bg-emerald-50/20'}`}>
                        <div className="flex justify-between items-center pb-2.5 border-b border-slate-200/70">
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-widest ${isVivan ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>{lcdBrand}</span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{hpBrand}</span>
                          </div>
                          <div>
                            <span className={`text-[10px] px-2 py-1 rounded-full font-black uppercase whitespace-nowrap ${
                              (p.stock_status === 'Kosong' || p.stock === '0' || Number(p.stock) === 0) ? 'bg-rose-100 text-rose-700' :
                              p.stock_status === 'Indent' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                            }`}>
                              STOK : {(p.stock !== undefined && p.stock !== null && p.stock !== '') ? p.stock : (p.stock_status === 'Kosong' ? '0' : p.stock_status || 'Ready')}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-center min-h-[4rem] py-3.5">
                          <h3 
                            className="font-black text-lg sm:text-[1.35rem] text-slate-800 leading-tight text-center line-clamp-2"
                            title={p.model_hp}
                          >
                            <HighlightedText text={p.model_hp} highlight={search} />
                          </h3>
                        </div>
                      </div>
                      
                      <div className="mx-4 border-t-2 border-dashed border-slate-100"></div>

                      <div className="p-3 sm:p-4 bg-white flex items-stretch">
                        <div className="w-[35%] shrink-0 flex flex-col items-center justify-center text-center pr-2">
                          <Package className={`w-8 h-8 mb-2 ${isVivan ? 'text-indigo-500' : 'text-emerald-500'}`} strokeWidth={1.5} />
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Packing</p>
                          <p className="font-black text-slate-700 text-sm sm:text-base leading-tight break-words max-w-full">{packingStr}</p>
                          <CopyableCode code={p.goods_code || '-'} />
                        </div>
                        
                        <div className="w-[1px] shrink-0 bg-slate-200"></div>

                        <div className="flex-1 flex flex-col items-center justify-center text-center pl-2 min-w-0">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Harga/Kotak</p>
                          <p className="font-black text-rose-600 text-lg sm:text-xl leading-none mt-0.5">{hargaKotak.toLocaleString()}</p>
                          <div className="mt-2 flex justify-center w-full min-w-0">
                            <div className="grid grid-cols-[auto_minmax(0,1fr)_38px] gap-x-1.5 gap-y-1.5 items-center mx-auto">
                               <div className="text-[10px] sm:text-[11px] font-bold text-slate-500 text-right">/Pcs:</div>
                               <div className="text-indigo-700 font-black text-xs sm:text-sm text-right truncate">{Math.round(baseHargaPcs).toLocaleString()}</div>
                               <div></div>
                               
                               {discountRows.map((row, i) => {
                                 const finalPrice = row.price;
                                 return (
                                   <React.Fragment key={i}>
                                     <div className="text-[10px] sm:text-[11px] font-bold text-slate-500 text-right">{row.minQty <= 1 ? 'Mix:' : `≥${row.minQty}:`}</div>
                                     <div className="text-indigo-700 font-black text-xs sm:text-sm text-right truncate">{Math.round(finalPrice).toLocaleString()}</div>
                                     <div className="bg-indigo-100/80 text-indigo-800 py-0.5 rounded-md text-[9px] sm:text-[10px] font-black tracking-tighter text-center">-{row.discount}%</div>
                                   </React.Fragment>
                                 );
                               })}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mx-4 border-t border-slate-100"></div>

                      <div className="px-4 py-3 text-[11px] font-bold text-slate-500 bg-white border-b border-slate-100 flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <ShieldCheck className={`w-4 h-4 ${isVivan ? 'text-indigo-500' : 'text-emerald-500'}`} /> Garansi Lem {p.warranty_months || 12} Bulan
                          </div>
                          <button
                            onClick={() => {
                              const terms = customPromos.length > 0 && customPromos[0].terms ? customPromos[0].terms : globalTerms;
                              if (terms) {
                                setTermsContent(terms);
                                setShowTermsModal(true);
                              } else {
                                setTermsContent('Belum ada Syarat & Ketentuan.');
                                setShowTermsModal(true);
                              }
                            }}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-md text-xs self-center font-bold transition-colors ml-auto shadow-sm tracking-wide"
                          >
                            Klik S&K
                          </button>
                        </div>
                        <div className="text-[10px] font-medium text-slate-400 italic mb-1 mt-1">
                          Pembelian per-kotak tidak dijual satuan
                        </div>
                        {customPromos.map((customPromo, idx) => (
                           <div key={idx} className="flex items-center gap-1.5 text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 font-black mt-1 mb-1 text-xs">
                             Promo {customPromo.name || 'Spesial'} - Diskon {customPromo.discountPercentage || 0}% : Rp {Math.round(baseHargaPcs * (1 - (customPromo.discountPercentage / 100 || 0))).toLocaleString('id-ID')} /pcs
                           </div>
                        ))}
                      </div>
                    </Card>
                  )
                })
              )}
              </div>
            </>
          )}
        </div>

      </div>
      </>
      )}

      {/* Fixed Bottom CTA Contact */}
      {viewMode === 'Grid' && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center justify-center sm:justify-start gap-3 w-full sm:w-auto text-center sm:text-left">
              <div className="w-full">
                <h3 className="font-black text-slate-800 text-sm sm:text-base leading-tight">Tertarik menjadi reseller/distributor?</h3>
                <p className="text-xs text-slate-500 font-medium">Dapatkan harga spesial untuk pembelian quantity.</p>
              </div>
            </div>
            <div className="flex w-full sm:w-auto items-center justify-center gap-2 sm:gap-3 flex-wrap">
              <button onClick={() => setShowGrosirModal(true)} className="flex-1 sm:flex-none bg-rose-50 text-rose-700 px-2 sm:px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 hover:bg-rose-100 transition-all active:scale-95 whitespace-nowrap border border-rose-200">
                <MapPin className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Lokasi Grosir</span>
              </button>
              <button onClick={() => setShowWarrantyModal(true)} className="flex-1 sm:flex-none bg-slate-100 text-slate-700 px-2 sm:px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 hover:bg-slate-200 transition-all active:scale-95 whitespace-nowrap border border-slate-200">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Klaim Garansi</span>
              </button>
              <div className="text-slate-300 shrink-0 hidden sm:block">|</div>
              <button onClick={() => setShowSalesmanModal(true)} className="flex-1 sm:flex-none bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-2 sm:px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 hover:shadow-lg hover:shadow-indigo-500/20 transition-all active:scale-95 whitespace-nowrap">
                <MessageCircle className="w-4 h-4 shrink-0" />
                <span>Hubungi Salesman</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <GenieModal
        isOpen={showSalesmanModal}
        onClose={() => setShowSalesmanModal(false)}
        title="Daftar Salesman"
        subtitle="Hubungi salesman di area Anda"
      >
        <div className="overflow-x-auto w-full border border-slate-200 rounded-lg max-h-[60vh] overflow-y-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b text-slate-600 font-medium sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3">Nama Salesman</th>
                <th className="px-4 py-3">Area</th>
                <th className="px-4 py-3 text-center w-24">Hubungi</th>
              </tr>
            </thead>
            <tbody className="divide-y text-slate-700 bg-white">
              {salesmen.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-slate-400">Belum ada data salesman.</td>
                </tr>
              ) : (
                salesmen.map((sm, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold text-slate-800">{sm.name}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-semibold">{sm.area}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <a href={`https://wa.me/${sm.phone.replace(/^0/, '62').replace(/\D/g, '')}${salesmanWaTemplate ? `?text=${encodeURIComponent(salesmanWaTemplate)}` : ''}`} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 hover:bg-emerald-200 transition-colors">
                        <MessageCircle className="w-4 h-4" />
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GenieModal>

      <GenieModal
        isOpen={showGrosirModal}
        onClose={() => setShowGrosirModal(false)}
        title="Daftar Toko Grosir"
        subtitle="Temukan toko grosir kami di kota Anda"
      >
        <div className="overflow-x-auto w-full border border-slate-200 rounded-lg max-h-[60vh] overflow-y-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b text-slate-600 font-medium sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3">Nama Toko</th>
                <th className="px-4 py-3">Area</th>
                <th className="px-4 py-3">Alamat Lengkap</th>
                <th className="px-4 py-3 text-center w-24">Lokasi</th>
              </tr>
            </thead>
            <tbody className="divide-y text-slate-700 bg-white">
              {wholesaleStores.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-400">Belum ada data toko grosir.</td>
                </tr>
              ) : (
                wholesaleStores.map((sm, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold text-slate-800">{sm.customer_name}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-semibold">{sm.area}</span>
                    </td>
                    <td className="px-4 py-3 max-w-xs">{sm.address}</td>
                    <td className="px-4 py-3 text-center">
                      <a href={sm.maps_link ? sm.maps_link : `https://maps.google.com/?q=${encodeURIComponent(sm.customer_name + ' ' + (sm.address || ''))}`} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-rose-100 text-rose-600 hover:bg-rose-200 transition-colors font-bold text-xs">
                        <MapPin className="w-3.5 h-3.5 mr-1" /> Maps
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GenieModal>

      <GenieModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        title="Syarat & Ketentuan"
        speed="slow"
      >
        <div className="text-sm space-y-2 text-slate-700 max-h-[60vh] overflow-y-auto p-4 bg-slate-50 rounded-xl">
          {termsContent ? termsContent.split('\n').map((line, i) => (
            <p key={i}>{line}</p>
          )) : (
            <p className="text-slate-500 italic">Belum ada info syarat & ketentuan.</p>
          )}
        </div>
      </GenieModal>

      <GenieModal
        isOpen={showWarrantyModal}
        onClose={() => setShowWarrantyModal(false)}
        title="Catatan Garansi"
        subtitle="Informasi syarat & klaim garansi produk"
      >
        <div className="max-h-[60vh] overflow-y-auto p-2 bg-slate-50 rounded-xl space-y-4">
          {warranties.length > 0 ? warranties.map((w, index) => (
            <div key={w.id || index} className="relative group ml-1 mt-1">
              <div className="absolute inset-0 bg-yellow-200 transform -rotate-1 rounded-sm shadow-md"></div>
              <div className="relative bg-yellow-50 text-slate-800 p-5 rounded-sm border-t-8 border-yellow-300 shadow-sm font-medium">
                {w.title && <h3 className="font-bold text-yellow-800 mb-2 border-b border-yellow-200 pb-1">{w.title}</h3>}
                <div className="text-sm space-y-1">
                  {w.content.split('\n').map((line: string, i: number) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
              </div>
            </div>
          )) : (
             <div className="text-center p-8 text-slate-400 font-medium italic border-2 border-dashed border-slate-200 rounded-xl">
               Belum ada catatan klaim garansi.
             </div>
          )}
        </div>
      </GenieModal>

      <GenieModal
        isOpen={showDownloadModal}
        onClose={() => !isExporting && setShowDownloadModal(false)}
        title="Download Pricelist LCD"
        subtitle="Ekspor pricelist berdasarkan filter"
      >
        <div className="space-y-6">
          <div className="space-y-4 bg-slate-50 p-4 border border-slate-200 rounded-xl">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Brand HP</label>
              <div className="flex flex-wrap gap-2">
                {hpBrands.filter(b => b !== 'All').map(b => {
                  const isSelected = downloadFilterBrandHp.includes(b);
                  return (
                    <button
                      key={b}
                      onClick={() => setDownloadFilterBrandHp(prev => isSelected ? prev.filter(x => x !== b) : [...prev, b])}
                      className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all border ${isSelected ? 'bg-indigo-600 text-white border-indigo-600 shadow' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'}`}
                    >
                      {b}
                    </button>
                  );
                })}
                {downloadFilterBrandHp.length > 0 && (
                  <button 
                    onClick={() => setDownloadFilterBrandHp([])}
                    className="px-3 py-1.5 rounded-lg text-sm font-bold transition-all border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Brand LCD</label>
                <div className="flex bg-white border border-slate-200 p-1 rounded-xl">
                  {['All', 'Vivan', 'XPas'].map(b => (
                    <button 
                      key={b}
                      onClick={() => setDownloadFilterLcd(b as any)}
                      className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${downloadFilterLcd === b ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      {b === 'All' ? 'Semua' : b}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Diskon Tambahan (%)</label>
                <div className="relative">
                  <input 
                    type="number"
                    min="0"
                    max="100"
                    value={downloadCustomDiscount || ''}
                    onChange={e => setDownloadCustomDiscount(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2 pr-8 bg-white text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                </div>
              </div>
            </div>
            
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Pilih Promo Khusus</label>
              <select 
                title="Pilih Promo"
                className="w-full border rounded-xl px-4 py-2 bg-white text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500"
                value={downloadFilterPromo}
                onChange={e => setDownloadFilterPromo(e.target.value)}
              >
                <option value="All">Tidak ada (Harga Normal & Diskon Global)</option>
                {promos.map(promo => (
                  <option key={promo.id} value={promo.id}>Promo {promo.discountPercentage}% ({promo.name})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Pilih Kontak Salesman</label>
                <select 
                  title="Pilih Salesman"
                  className="w-full border rounded-xl px-4 py-2 bg-white text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500"
                  value={downloadSalesmanId}
                  onChange={e => setDownloadSalesmanId(e.target.value)}
                >
                  <option value="none">Tanpa Kontak</option>
                  {salesmen.map((sm, idx) => (
                    <option key={idx} value={sm.name}>{sm.name} - {sm.area}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Syarat & Ketentuan Tambahan</label>
                <input 
                  type="text"
                  value={downloadTerms}
                  onChange={e => setDownloadTerms(e.target.value)}
                  placeholder="Misal: Pembayaran tunai"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2 bg-white text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          <div>
             <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Pilih Format Hasil</label>
             <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setDownloadFormat('Image')}
                  className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                    downloadFormat === 'Image' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 hover:border-emerald-200 hover:bg-slate-50 text-slate-500'
                  }`}
                >
                  <FileImage className="w-8 h-8" />
                  <span className="font-bold text-xs sm:text-sm">Gambar (PNG)</span>
                </button>
                <button
                  onClick={() => setDownloadFormat('PDF')}
                  className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                    downloadFormat === 'PDF' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 hover:border-indigo-200 hover:bg-slate-50 text-slate-500'
                  }`}
                >
                  <FileText className="w-8 h-8" />
                  <span className="font-bold text-xs sm:text-sm">Dokumen (PDF)</span>
                </button>
                <button
                  onClick={() => setDownloadFormat('Excel')}
                  className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                    downloadFormat === 'Excel' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 hover:border-emerald-200 hover:bg-slate-50 text-slate-500'
                  }`}
                >
                  <FileSpreadsheet className="w-8 h-8" />
                  <span className="font-bold text-xs sm:text-sm">Excel (XLSX)</span>
                </button>
             </div>
          </div>
          
          {downloadFormat === 'Excel' && (
            <div className="mt-4 p-4 border border-slate-200 rounded-xl bg-slate-50">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block">Pilih Kolom Excel</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {ALL_EXCEL_COLUMNS.map((col) => {
                  const isChecked = downloadExcelColumns.includes(col);
                  return (
                    <label key={col} className="flex items-center gap-2 cursor-pointer group">
                      <div className={`w-5 h-5 rounded border flex items-center justify-center ${isChecked ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white group-hover:border-indigo-400'}`}>
                        {isChecked && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <input 
                        type="checkbox" 
                        className="hidden"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            setDownloadExcelColumns(prev => prev.filter(c => c !== col));
                          } else {
                            setDownloadExcelColumns(prev => [...prev, col]);
                          }
                        }}
                      />
                      <span className="text-sm font-medium text-slate-700">{col}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <button
            onClick={handleDownload}
            disabled={isExporting}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg disabled:opacity-70 disabled:cursor-not-allowed transition-all"
          >
            {isExporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            {isExporting ? 'Sedang Mengekspor...' : 'Mulai Download'}
          </button>
        </div>
      </GenieModal>

      <OrderListChecker 
        isOpen={showOrderListChecker}
        onClose={() => setShowOrderListChecker(false)}
        products={products}
      />

      <PricelistExport
        ref={exportRef}
        products={exportFilteredProducts}
        filteredBrandLcd={downloadFilterLcd}
        filteredPromoName={downloadFilterPromo === 'All' ? 'All' : (promos.find(p => p.id === downloadFilterPromo)?.name || 'All')}
        globalDiscount={globalDiscount}
        customDiscount={downloadCustomDiscount}
        salesman={salesmen.find(s => s.name === downloadSalesmanId)}
        terms={downloadTerms}
      />

      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={scrollToTopSlow}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="fixed bottom-36 sm:bottom-28 right-6 p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg hover:shadow-indigo-500/30 transition-colors z-[100] flex items-center justify-center cursor-pointer"
          >
            <ChevronUp className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
