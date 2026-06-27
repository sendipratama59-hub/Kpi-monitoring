import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Search, Loader2, Edit, Trash2, Plus, MonitorSmartphone, UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle, Share2, Link as LinkIcon, Copy, Download } from 'lucide-react';
import { supabase } from '../../../services/supabase';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { useAlert } from '../../ui/AlertModal';
import { GenieModal } from '../../ui/GenieModal';
import { VisitorsTab } from './VisitorsTab';
import { buildLcdCatalogListHtml } from './buildLcdCatalogListHtml';
import { buildSimplePricelistHtml } from './buildSimplePricelistHtml';

interface LcdProduct {
  id?: string;
  goods_code: string;
  brand_lcd: string;
  brand_hp: string;
  model_hp: string;
  packing: string;
  price: number;
  stock_status?: string;
  stock?: string;
  warranty_months?: number;
  custom_discount?: string;
}

export function AdminLcdCatalog() {
  const { showAlert, showConfirm } = useAlert();
  const [activeTab, setActiveTab] = useState<'list' | 'upload' | 'salesmen' | 'grosir' | 'promos' | 'hero' | 'warranties' | 'visitors'>('list');
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>('LCD_Catalog_List.html');
  const [promoActiveFor, setPromoActiveFor] = useState<number[]>([10, 12, 15, 18]);
  const [products, setProducts] = useState<LcdProduct[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Forms
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<LcdProduct>>({
    brand_hp: 'Apple',
    brand_lcd: 'Vivan',
    model_hp: '',
    packing: 'Incell',
    price: 0,
    stock_status: 'Ready',
    warranty_months: 12,
    goods_code: ''
  });
  
  // Upload State
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Filter & Selection State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBrandHp, setFilterBrandHp] = useState('All');
  const [filterModelHp, setFilterModelHp] = useState('');
  const [filterKode, setFilterKode] = useState('');
  const [filterPromo, setFilterPromo] = useState('All');
  const [filterStockStatus, setFilterStockStatus] = useState('All');
  const [brandFilter, setBrandFilter] = useState('All');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeleteBrand, setBulkDeleteBrand] = useState('All');
  const [globalDiscount, setGlobalDiscount] = useState<string>('0');
  const [globalTerms, setGlobalTerms] = useState<string>('');
  const [isApplyingDiscount, setIsApplyingDiscount] = useState(false);

  const [showDownloadExcelModal, setShowDownloadExcelModal] = useState(false);
  const [downloadExcelPct, setDownloadExcelPct] = useState<number>(0);

  // Salesmen State
  const [salesmen, setSalesmen] = useState<any[]>([]);
  const [isEditingSalesman, setIsEditingSalesman] = useState(false);
  const [salesmanForm, setSalesmanForm] = useState({ id: '', name: '', area: '', phone: '' });

  // Promos State
  const [promos, setPromos] = useState<any[]>([]);
  const [isEditingPromo, setIsEditingPromo] = useState(false);
  const defaultPromoForm = { id: '', name: '', type: 'product_list', value: '', discountPercentage: 10, target_brand: 'Semua', target_hp_brands: [] as string[], search: '', selected_products: [] as string[], terms: '' };
  const [promoForm, setPromoForm] = useState(defaultPromoForm);

  // Warranties State
  const [warranties, setWarranties] = useState<any[]>([]);
  const [isEditingWarranty, setIsEditingWarranty] = useState(false);
  const defaultWarrantyForm = { id: '', title: '', content: '' };
  const [warrantyForm, setWarrantyForm] = useState(defaultWarrantyForm);

  // Grosir State
  const [grosirs, setGrosirs] = useState<any[]>([]);
  const [isEditingGrosir, setIsEditingGrosir] = useState(false);
  const [grosirForm, setGrosirForm] = useState({ id: '', customer_name: '', address: '', area: '', maps_link: '' });
  const [customerList, setCustomerList] = useState<string[]>([]);

  const availableHpBrands = Array.from(new Set(products.map(p => p.brand_hp))).filter(Boolean).sort();

  // Hero & Feature State
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
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data: dData } = await supabase.from('lcd_catalog_content').select('*').eq('section_key', 'discount_setting').single();
    if (dData && dData.content) {
      setGlobalDiscount(dData.content);
    }
    const { data: tData } = await supabase.from('lcd_catalog_content').select('*').eq('section_key', 'global_terms_setting').single();
    if (tData && tData.content) {
      setGlobalTerms(tData.content);
    }
    const { data: sData } = await supabase.from('lcd_catalog_content').select('*').eq('section_key', 'salesmen_list').single();
    if (sData && sData.content) {
      try {
        setSalesmen(JSON.parse(sData.content));
      } catch (e) {
        setSalesmen([]);
      }
    }
    const { data: pData } = await supabase.from('lcd_catalog_content').select('*').eq('section_key', 'promo_setting').single();
    if (pData && pData.content) {
      try {
        setPromos(JSON.parse(pData.content));
      } catch (e) {
        setPromos([]);
      }
    }
    const { data: wData } = await supabase.from('lcd_catalog_content').select('*').eq('section_key', 'warranty_notes').single();
    if (wData && wData.content) {
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
        setGrosirs(JSON.parse(gData.content));
      } catch (e) {
        setGrosirs([]);
      }
    }
    const { data: custData } = await supabase.from('salesman_customer').select('customer_name');
    if (custData) {
      const uCust = Array.from(new Set(custData.map(c => c.customer_name).filter(Boolean)));
      setCustomerList(uCust.sort());
    }
  };

  const saveHeroSettingsToDb = async (newSettings: any) => {
    const jsonStr = JSON.stringify(newSettings);
    const { data } = await supabase.from('lcd_catalog_content').select('*').eq('section_key', 'hero_setting').single();
    if (data) {
      await supabase.from('lcd_catalog_content').update({ content: jsonStr }).eq('section_key', 'hero_setting');
    } else {
      await supabase.from('lcd_catalog_content').insert([{ section_key: 'hero_setting', title: 'Hero Setting', content: jsonStr }]);
    }
    showAlert('Pengaturan banner berhasil disimpan!', 'success');
  };

  const saveSalesmenToDb = async (newSalesmen: any[]) => {
    const jsonStr = JSON.stringify(newSalesmen);
    const { data } = await supabase.from('lcd_catalog_content').select('*').eq('section_key', 'salesmen_list').single();
    if (data) {
      await supabase.from('lcd_catalog_content').update({ content: jsonStr }).eq('section_key', 'salesmen_list');
    } else {
      await supabase.from('lcd_catalog_content').insert([{ section_key: 'salesmen_list', title: 'Daftar Salesman', content: jsonStr }]);
    }
  };

  const saveSalesman = async (e: React.FormEvent) => {
    e.preventDefault();
    let updated;
    if (salesmanForm.id) {
      updated = salesmen.map(sm => sm.id === salesmanForm.id ? salesmanForm : sm);
    } else {
      updated = [...salesmen, { ...salesmanForm, id: Math.random().toString(36).substring(7) }];
    }
    setSalesmen(updated);
    await saveSalesmenToDb(updated);
    setIsEditingSalesman(false);
  };

  const deleteSalesman = async (id: string) => {
    showConfirm({
      title: 'Hapus Salesman',
      message: 'Yakin ingin menghapus salesman ini?',
      type: 'warning',
      onConfirm: async () => {
        const updated = salesmen.filter(sm => sm.id !== id);
        setSalesmen(updated);
        await saveSalesmenToDb(updated);
      }
    });
  };

  const saveGrosirsToDb = async (newGrosirs: any[]) => {
    const jsonStr = JSON.stringify(newGrosirs);
    const { data } = await supabase.from('lcd_catalog_content').select('*').eq('section_key', 'wholesale_stores').single();
    if (data) {
      await supabase.from('lcd_catalog_content').update({ content: jsonStr }).eq('section_key', 'wholesale_stores');
    } else {
      await supabase.from('lcd_catalog_content').insert([{ section_key: 'wholesale_stores', title: 'Toko Grosir', content: jsonStr }]);
    }
  };

  const saveGrosir = async (e: React.FormEvent) => {
    e.preventDefault();
    let updated;
    if (grosirForm.id) {
      updated = grosirs.map(sm => sm.id === grosirForm.id ? grosirForm : sm);
    } else {
      updated = [...grosirs, { ...grosirForm, id: Math.random().toString(36).substring(7) }];
    }
    setGrosirs(updated);
    await saveGrosirsToDb(updated);
    setIsEditingGrosir(false);
  };

  const deleteGrosir = async (id: string) => {
    showConfirm({
      title: 'Hapus Toko Grosir',
      message: 'Yakin ingin menghapus toko grosir ini?',
      type: 'warning',
      onConfirm: async () => {
        const updated = grosirs.filter(sm => sm.id !== id);
        setGrosirs(updated);
        await saveGrosirsToDb(updated);
      }
    });
  };

  const savePromosToDb = async (newPromos: any[]) => {
    const jsonStr = JSON.stringify(newPromos);
    const { data } = await supabase.from('lcd_catalog_content').select('*').eq('section_key', 'promo_setting').single();
    if (data) {
      await supabase.from('lcd_catalog_content').update({ content: jsonStr }).eq('section_key', 'promo_setting');
    } else {
      await supabase.from('lcd_catalog_content').insert([{ section_key: 'promo_setting', title: 'Promo Setting', content: jsonStr }]);
    }
  };

  const saveWarrantiesToDb = async (newNotes: any[]) => {
    const jsonStr = JSON.stringify(newNotes);
    const { data } = await supabase.from('lcd_catalog_content').select('*').eq('section_key', 'warranty_notes').single();
    if (data) {
      await supabase.from('lcd_catalog_content').update({ content: jsonStr }).eq('section_key', 'warranty_notes');
    } else {
      await supabase.from('lcd_catalog_content').insert([{ section_key: 'warranty_notes', title: 'Catatan Garansi', content: jsonStr }]);
    }
  };

  const saveWarranty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!warrantyForm.title || !warrantyForm.content) {
      showAlert('Judul dan daftar catatan tidak boleh kosong!', 'error');
      return;
    }
    let updated;
    if (warrantyForm.id) {
      updated = warranties.map(w => w.id === warrantyForm.id ? warrantyForm : w);
    } else {
      updated = [...warranties, { ...warrantyForm, id: Math.random().toString(36).substring(7) }];
    }
    setWarranties(updated);
    await saveWarrantiesToDb(updated);
    setIsEditingWarranty(false);
    showAlert('Catatan Garansi disimpan!', 'success');
  };

  const deleteWarranty = async (id: string) => {
    showConfirm({
      title: 'Hapus Catatan',
      message: 'Yakin ingin menghapus catatan garansi ini?',
      type: 'warning',
      onConfirm: async () => {
        const updated = warranties.filter(w => w.id !== id);
        setWarranties(updated);
        await saveWarrantiesToDb(updated);
      }
    });
  };

  const savePromo = async () => {
    if (!promoForm.name) {
      showAlert('Nama promo tidak boleh kosong!', 'error');
      return;
    }
    let updated;
    if (promoForm.id) {
      updated = promos.map(p => p.id === promoForm.id ? promoForm : p);
    } else {
      updated = [...promos, { ...promoForm, id: Math.random().toString(36).substring(7) }];
    }
    setPromos(updated);
    await savePromosToDb(updated);
    setIsEditingPromo(false);
  };

  const duplicatePromo = async (promo: any) => {
    const newPromo = {
      ...promo,
      id: Math.random().toString(36).substring(7),
      name: `${promo.name || promo.value || 'Promo'} (Copy)`
    };
    const updated = [...promos, newPromo];
    setPromos(updated);
    await savePromosToDb(updated);
    showAlert('Promo berhasil diduplikat!', 'success');
  };

  const deletePromo = async (id: string) => {
    showConfirm({
      title: 'Hapus Promo',
      message: 'Yakin ingin menghapus promo ini?',
      type: 'warning',
      onConfirm: async () => {
        const updated = promos.filter(p => p.id !== id);
        setPromos(updated);
        await savePromosToDb(updated);
      }
    });
  };

  const saveDiscount = async (val: string) => {
    setGlobalDiscount(val);
    const { data } = await supabase.from('lcd_catalog_content').select('*').eq('section_key', 'discount_setting').single();
    if (data) {
      await supabase.from('lcd_catalog_content').update({ content: val }).eq('section_key', 'discount_setting');
    } else {
      await supabase.from('lcd_catalog_content').insert([{ section_key: 'discount_setting', title: 'Global Discount', content: val }]);
    }
  };

  const saveGlobalTerms = async (val: string) => {
    setGlobalTerms(val);
    const { data } = await supabase.from('lcd_catalog_content').select('*').eq('section_key', 'global_terms_setting').single();
    if (data) {
      await supabase.from('lcd_catalog_content').update({ content: val }).eq('section_key', 'global_terms_setting');
    } else {
      await supabase.from('lcd_catalog_content').insert([{ section_key: 'global_terms_setting', title: 'Global Terms', content: val }]);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('lcd_catalog_products').select('*').order('brand_hp').order('model_hp');
    if (!error && data) {
      setProducts(data);
    }
    setLoading(false);
  };

  const getCustomPromos = (p: any) => {
    let customPromos: any[] = [];
    const hpBrand = p.brand_hp || p.brand || '';
    for (const promo of promos) {
      if (promo.selected_products && promo.selected_products.includes(p.id)) {
        customPromos.push(promo);
        continue;
      }
      if (promo.type === 'brand' && hpBrand.toLowerCase().includes((promo.value || '').toLowerCase())) {
        customPromos.push(promo);
        continue;
      }
      if (promo.type === 'model' && String(p.model_hp || '').toLowerCase().includes((promo.value || '').toLowerCase())) {
        customPromos.push(promo);
        continue;
      }
      if (promo.type === 'product' && promo.value === p.id) {
        customPromos.push(promo);
        continue;
      }
    }
    return customPromos;
  };

  const filteredProducts = products.filter(p => {
    const term = searchTerm.toLowerCase();
    const matchSearch = String(p.model_hp || '').toLowerCase().includes(term) || String(p.brand_hp || '').toLowerCase().includes(term) || String(p.goods_code || '').toLowerCase().includes(term);
    
    const matchSpecificBrandHp = filterBrandHp === 'All' || p.brand_hp === filterBrandHp;
    const matchSpecificModelHp = filterModelHp === '' || String(p.model_hp || '').toLowerCase().includes(filterModelHp.toLowerCase());
    const matchSpecificKode = filterKode === '' || String(p.goods_code || '').toLowerCase().includes(filterKode.toLowerCase());
    
    const brandLcd = p.brand_lcd || 'Vivan';
    const matchBrand = brandFilter === 'All' || brandLcd === brandFilter;

    const matchStockStatus = filterStockStatus === 'All' || 
                            (filterStockStatus === 'Kosong' && p.stock_status === 'Kosong') ||
                            (filterStockStatus === 'Ready' && p.stock_status !== 'Kosong');

    let matchPromo = true;
    if (filterPromo === 'None') {
      const activePromos = getCustomPromos(p);
      matchPromo = activePromos.length === 0 && (!p.custom_discount || p.custom_discount === '' || p.custom_discount === '0');
    } else if (filterPromo !== 'All') {
      const activePromos = getCustomPromos(p);
      matchPromo = activePromos.some(pr => pr.id === filterPromo);
    }
    
    return matchSearch && matchSpecificBrandHp && matchSpecificModelHp && matchSpecificKode && matchBrand && matchPromo && matchStockStatus;
  });

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredProducts.map(p => p.id as string));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    showConfirm({
      title: 'Hapus Terpilih',
      message: `Yakin ingin menghapus ${selectedIds.length} produk terpilih?`,
      type: 'warning',
      onConfirm: async () => {
        setIsDeleting(true);
        const chunkSize = 50;
        for (let i = 0; i < selectedIds.length; i += chunkSize) {
          const chunk = selectedIds.slice(i, i + chunkSize);
          await supabase.from('lcd_catalog_products').delete().in('id', chunk);
        }
        setSelectedIds([]);
        await fetchProducts();
        setIsDeleting(false);
      }
    });
  };

  const handleDeleteAllByBrand = async () => {
    showConfirm({
      title: 'Mass Delete',
      message: `PERINGATAN: Yakin ingin menghapus SEMUA data ${bulkDeleteBrand === 'All' ? 'keseluruhan' : `brand ${bulkDeleteBrand}`} dari database? Aksi ini tidak dapat dibatalkan.`,
      type: 'error',
      confirmLabel: 'YAKIN, HAPUS',
      onConfirm: async () => {
        setIsDeleting(true);
        if (bulkDeleteBrand === 'All') {
          await supabase.from('lcd_catalog_products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        } else {
          await supabase.from('lcd_catalog_products').delete().eq('brand_lcd', bulkDeleteBrand);
        }
        setShowBulkDeleteModal(false);
        setSelectedIds([]);
        await fetchProducts();
        setIsDeleting(false);
      }
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const dataToSave = {
      ...formData,
      brand: formData.brand_hp, // fallback for schema
      type_lcd: formData.packing, // fallback for schema
    };
    if (formData.id) {
      await supabase.from('lcd_catalog_products').update(dataToSave).eq('id', formData.id);
    } else {
      await supabase.from('lcd_catalog_products').insert([dataToSave]);
    }
    setIsEditing(false);
    fetchProducts();
  };

  const handleApplyCustomDiscount = async () => {
    if (selectedIds.length === 0) {
      showAlert('Pilih minimal 1 produk untuk menerapkan diskon harga/pcs!', 'error', 'Error');
      return;
    }
    
    showConfirm({
      title: 'Terapkan Diskon',
      message: `Terapkan rules diskon "${globalDiscount}" ke ${selectedIds.length} produk terpilih?`,
      type: 'warning',
      onConfirm: async () => {
        setIsApplyingDiscount(true);
        let hasError = false;
        let lastError = null;
        const chunkSize = 50;
        for (let i = 0; i < selectedIds.length; i += chunkSize) {
          const chunk = selectedIds.slice(i, i + chunkSize);
          const { error } = await supabase.from('lcd_catalog_products').update({ custom_discount: globalDiscount || null }).in('id', chunk);
          if (error) {
            hasError = true;
            lastError = error;
            console.error(error);
          }
        }
        setIsApplyingDiscount(false);
        if (!hasError) {
          showAlert('Berhasil menerapkan diskon khusus!', 'success');
          setSelectedIds([]);
          fetchProducts();
        } else {
          showAlert('Gagal! Harap ke menu "DB Setup" dan klik "Execute Query" untuk update database. Detail error: ' + (lastError as any).message, 'error', 'Error DB');
        }
      }
    });
  };

  const handleClearCustomDiscount = async () => {
    if (selectedIds.length === 0) {
      showAlert('Pilih minimal 1 produk untuk menghapus diskon harga/pcs khusus!', 'error', 'Error');
      return;
    }
    
    showConfirm({
      title: 'Hapus Diskon Khusus',
      message: `Hapus diskon khusus dari ${selectedIds.length} produk terpilih dan kembalikan ke global diskon?`,
      type: 'warning',
      onConfirm: async () => {
        setIsApplyingDiscount(true);
        let hasError = false;
        let lastError = null;
        const chunkSize = 50;
        for (let i = 0; i < selectedIds.length; i += chunkSize) {
          const chunk = selectedIds.slice(i, i + chunkSize);
          const { error } = await supabase.from('lcd_catalog_products').update({ custom_discount: null }).in('id', chunk);
          if (error) {
            hasError = true;
            lastError = error;
            console.error(error);
          }
        }
        setIsApplyingDiscount(false);
        if (!hasError) {
          showAlert('Berhasil menghapus diskon khusus!', 'success');
          setSelectedIds([]);
          fetchProducts();
        } else {
          showAlert('Gagal! Harap ke menu "DB Setup" dan klik "Execute Query" untuk update database. Detail error: ' + (lastError as any).message, 'error', 'Error DB');
        }
      }
    });
  };

  const handleDelete = async (id: string) => {
    showConfirm({
      title: 'Hapus Produk',
      message: 'Yakin ingin menghapus produk ini?',
      type: 'warning',
      onConfirm: async () => {
        await supabase.from('lcd_catalog_products').delete().eq('id', id);
        fetchProducts();
      }
    });
  };

  const handleExportExcel = () => {
    if (filteredProducts.length === 0) {
       showAlert('Tidak ada data produk untuk di-download.', 'error');
       return;
    }
    
    const rows = filteredProducts.map((p, idx) => {
      const price = p.price || 0;
      const discountPct = downloadExcelPct || 0;
      const discountAmount = price * (discountPct / 100);
      const nettPrice = price - discountAmount;

      return {
        'No': idx + 1,
        'Kode Produk': p.goods_code || '-',
        'Brand HP': p.brand_hp || '-',
        'Model HP': p.model_hp || '-',
        'Packing': p.packing || '-',
        'Brand LCD': p.brand_lcd || '-',
        'Harga (Rp)': price,
        [`Diskon (${discountPct}%)`]: discountAmount,
        'Harga Nett (Rp)': nettPrice,
        'Status Stok': p.stock_status || '-'
      };
    });

    try {
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Pricelist LCD');
      XLSX.writeFile(workbook, `Pricelist_LCD_Diskon_${downloadExcelPct}Pct_${new Date().getTime()}.xlsx`);
      setShowDownloadExcelModal(false);
      showAlert('Pricelist Excel berhasil didownload.', 'success');
    } catch (e: any) {
      showAlert('Gagal mengekspor file Excel: ' + (e?.message || e), 'error');
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    setUploadError(null);
    setUploadSuccess(false);
    setParsedData([]);

    const file = acceptedFiles[0];
    setCurrentFile(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Expected columns: goods_code, brand_hp, model_hp, packing, price
        const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: null });
        if (rawJson.length === 0) throw new Error('File kosong atau format tidak sesuai.');
        
        setParsedData(rawJson);
      } catch (err: any) {
        setUploadError(err.message || 'Gagal memproses file Excel.');
      }
    };
    reader.onerror = () => setUploadError('Gagal membaca file');
    reader.readAsBinaryString(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    maxFiles: 1
  });

  const handleUploadToDatabase = async () => {
    if (parsedData.length === 0) return;
    setIsUploading(true);
    setUploadError(null);
    
    try {
      const { data: existingData, error: errExist } = await supabase.from('lcd_catalog_products').select('*');
      if (errExist) throw errExist;
      
      const existingMap = new Map();
      if (existingData) {
        existingData.forEach(d => {
          if (d.goods_code && d.goods_code !== '-') {
            existingMap.set(d.goods_code.toString().trim(), d);
          }
        });
      }

      const dataToUpsert = parsedData.map(row => {
        const getVal = (keys: string[]) => {
          for (const k of Object.keys(row)) {
            if (keys.includes(k.toLowerCase())) return row[k];
          }
          return undefined;
        };

        const rawGoodsCode = getVal(['goods_code', 'goods code', 'kode produk', 'kode']);
        const goods_code = rawGoodsCode ? String(rawGoodsCode).trim() : '-';
        
        const existingRow = existingMap.get(goods_code);

        const brand_hp = getVal(['brand_hp', 'brand hp', 'brand', 'merk hp', 'merk']);
        let rawModelHp = getVal(['model_hp', 'model hp', 'model', 'tipe hp', 'tipe']);
        
        // Clean up model_hp
        let model_hp: string | undefined = undefined;
        if (rawModelHp !== undefined) {
          model_hp = String(rawModelHp).trim();
          const parts = model_hp.split(/\s+FOR\s+/i);
          if (parts.length > 1) {
             let afterFor = parts[parts.length - 1].trim();
             const brandRegex = /^(OP|SAM|RE|RED|VI|INF|XM|IP)\s+(.*)/i;
             const brandMatch = afterFor.match(brandRegex);
             if (brandMatch) {
                 afterFor = brandMatch[2];
             }
             model_hp = afterFor.trim();
          } else {
             const brandRegexNoFor = /^(OP|SAM|RE|RED|VI|INF|XM|IP)\s+(.*)/i;
             const brandMatchNoFor = model_hp.match(brandRegexNoFor);
             if (brandMatchNoFor) {
                 model_hp = brandMatchNoFor[2].trim();
             }
          }
        }
        
        const packing = getVal(['packing', 'tipe lcd', 'tipe', 'quality']);
        
        const rawBrandLcd = getVal(['brand_lcd', 'brand lcd', 'merk lcd', 'merk_lcd', 'brandlcd']);
        let parsedBrandLcd = undefined;
        if (rawBrandLcd !== undefined) {
          const lowerBrand = String(rawBrandLcd).toLowerCase();
          if (lowerBrand.includes('xpas')) parsedBrandLcd = 'XPas';
          else if (lowerBrand.includes('vivan')) parsedBrandLcd = 'Vivan';
          else parsedBrandLcd = String(rawBrandLcd);
        }

        let price = undefined;
        const rawPrice = getVal(['price', 'harga', 'price (rp)']);
        if (rawPrice !== undefined) {
          price = typeof rawPrice === 'number' ? rawPrice : parseFloat(String(rawPrice).replace(/[^\d]/g, ''));
          if (isNaN(price)) price = 0;
        }

        let finalStockStatus = undefined;
        let stockVal = undefined;
        const rawStock = getVal(['stock', 'stok', 'qty', 'stock_status', 'status']);
        if (rawStock !== undefined && rawStock !== null) {
          stockVal = String(rawStock);
          const s = String(rawStock).trim().toLowerCase();
          if (s === '0' || s === 'kosong' || s === 'empty' || s === 'habis' || s === 'out of stock' || s === '') {
            finalStockStatus = 'Kosong';
          } else if (s === 'indent' || s === 'po') {
            finalStockStatus = 'Indent';
          } else if (s === 'ready') {
            finalStockStatus = 'Ready';
          } else {
            finalStockStatus = String(rawStock).trim();
          }
        }

        return {
          id: existingRow ? existingRow.id : crypto.randomUUID(),
          goods_code: goods_code,
          brand_lcd: parsedBrandLcd !== undefined ? parsedBrandLcd : (existingRow?.brand_lcd || 'Vivan'),
          brand_hp: brand_hp !== undefined ? String(brand_hp) : (existingRow?.brand_hp || 'Unknown'),
          brand: brand_hp !== undefined ? String(brand_hp) : (existingRow?.brand || existingRow?.brand_hp || 'Unknown'),
          model_hp: model_hp !== undefined ? String(model_hp) : (existingRow?.model_hp || 'Unknown'),
          packing: packing !== undefined ? String(packing) : (existingRow?.packing || 'Unknown'),
          type_lcd: packing !== undefined ? String(packing) : (existingRow?.type_lcd || existingRow?.packing || 'Unknown'),
          price: price !== undefined ? price : (existingRow?.price || 0),
          stock_status: finalStockStatus !== undefined ? finalStockStatus : (existingRow?.stock_status || 'Ready'),
          stock: stockVal !== undefined ? stockVal : (existingRow?.stock || null),
          warranty_months: existingRow?.warranty_months || 12,
          competitors: existingRow?.competitors || null
        };
      });

      // Upsert data in chunks
      const chunkSize = 100;
      for (let i = 0; i < dataToUpsert.length; i += chunkSize) {
        const chunk = dataToUpsert.slice(i, i + chunkSize);
        const { error } = await supabase.from('lcd_catalog_products').upsert(chunk, { onConflict: 'id' });
        if (error) throw error;
      }

      setUploadSuccess(true);
      setParsedData([]);
      setCurrentFile(null);
      fetchProducts();
    } catch (err: any) {
      setUploadError(err.message || 'Terjadi kesalahan saat menyimpan data ke database.');
    } finally {
      setIsUploading(false);
    }
  };

  const filteredAvailableProductsForPromo = products.filter(p => {
    if (promoForm.selected_products.includes(p.id)) return false;
    if (promoForm.target_brand !== 'Semua' && p.brand_lcd !== promoForm.target_brand) return false;
    if (promoForm.target_hp_brands.length > 0 && !promoForm.target_hp_brands.includes(p.brand_hp)) return false;
    
    if (promoForm.search) {
      const searchTerms = promoForm.search.split(/[\n,]+/).map(s => s.trim().toLowerCase()).filter(Boolean);
      if (searchTerms.length > 0) {
        const match = searchTerms.some(term => 
          p.brand_hp.toLowerCase().includes(term) || 
          (p.model_hp || '').toLowerCase().includes(term) || 
          (p.goods_code || '').toLowerCase().includes(term)
        );
        if (!match) return false;
      }
    }
    return true;
  });


  const handleDownloadHtml = () => {
    const html = buildLcdCatalogListHtml(import.meta.env.VITE_SUPABASE_URL || '', import.meta.env.VITE_SUPABASE_ANON_KEY || '');
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'LCD_Catalog_List.html';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePreviewHtml = () => {
    const html = buildLcdCatalogListHtml(import.meta.env.VITE_SUPABASE_URL || '', import.meta.env.VITE_SUPABASE_ANON_KEY || '');
    setPreviewHtml(html);
    setPreviewTitle('LCD_Catalog_List.html');
  };

  const handlePreviewSimple = (discount: number) => {
    const applyPromo = promoActiveFor.includes(discount);
    const html = buildSimplePricelistHtml(import.meta.env.VITE_SUPABASE_URL || '', import.meta.env.VITE_SUPABASE_ANON_KEY || '', discount, applyPromo);
    setPreviewHtml(html);
    setPreviewTitle(`Pricelist_LCD_Diskon_${discount}.html`);
  };

  const handleCopyLink = () => {
    const url = `https://kpi-monitoring-dashboard-670271053581.asia-southeast1.run.app/?view=catalog-lcd&shared=true`;
    navigator.clipboard.writeText(url);
    showAlert('Link brosur LCD telah disalin dan siap dibagikan.', 'success', 'Tersalin!');
  };

  const handleDownloadCurrentHtml = () => {
    if (!previewHtml) return;
    const blob = new Blob([previewHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = previewTitle;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (previewHtml) {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-900 flex flex-col h-screen w-screen">
        <div className="flex-1 bg-white relative">
          <iframe 
            srcDoc={previewHtml} 
            className="w-full h-full border-none absolute inset-0"
            title="Preview HTML"
          />
        </div>
        <div className="p-4 bg-white border-t border-slate-100 flex gap-3">
          <button onClick={() => setPreviewHtml(null)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl transition-colors text-sm">
             Tutup
          </button>
          <button onClick={() => { handleDownloadCurrentHtml(); setPreviewHtml(null); }} className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl transition-colors shadow-md shadow-indigo-500/30 text-sm flex items-center justify-center gap-2">
             <Download className="w-4 h-4" />
             Download HTML
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-2 w-full space-y-6">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-indigo-600 p-6 rounded-2xl text-white shadow-xl">
        <div className="flex items-center gap-3">
          <MonitorSmartphone className="w-8 h-8 shrink-0" />
          <div className="flex-1">
            <div className="flex items-center justify-between sm:justify-start gap-4 mb-1">
              <h1 className="text-2xl font-black tracking-tight">Admin Katalog LCD</h1>
              <button 
                onClick={handlePreviewHtml}
                className="hidden sm:flex text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg items-center gap-2 font-bold transition-colors border border-slate-600 shadow-sm"
              >
                <MonitorSmartphone className="w-3.5 h-3.5" />
                <span>Preview List HTML</span>
              </button>
              <button 
                onClick={handleDownloadHtml}
                className="hidden sm:flex text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg items-center gap-2 font-bold transition-colors border border-emerald-500 shadow-sm"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Download HTML</span>
              </button>
              <button 
                onClick={handleCopyLink}
                className="hidden sm:flex text-xs bg-indigo-500 hover:bg-indigo-400 text-white px-3 py-1.5 rounded-lg items-center gap-2 font-bold transition-colors border border-indigo-400 shadow-sm"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Salin Link Brosur</span>
              </button>
            </div>
            <p className="text-indigo-200 text-sm">Kelola harga, stok, dan upload pricelist.</p>
            
            <div className="flex flex-col gap-2 mt-3 bg-indigo-900/40 p-2 rounded-lg border border-indigo-700/50">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-indigo-200 font-bold">Terapkan Promo Khusus ke HTML:</span>
                <div className="flex gap-3 flex-wrap">
                  {[10, 12, 15, 18].map(d => (
                    <label key={`chk-${d}`} className="flex items-center gap-1 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={promoActiveFor.includes(d)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setPromoActiveFor(prev => [...prev, d]);
                          } else {
                            setPromoActiveFor(prev => prev.filter(x => x !== d));
                          }
                        }}
                        className="rounded border-indigo-500 text-indigo-500 bg-indigo-900/50 focus:ring-indigo-500 w-3 h-3"
                      />
                      <span className="text-[10px] text-indigo-100">{d}%</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="hidden sm:flex flex-wrap gap-2">
                {[10, 12, 15, 18].map(d => (
                  <button 
                    key={d}
                    onClick={() => handlePreviewSimple(d)}
                    className="text-[10px] bg-slate-700 hover:bg-slate-600 text-slate-100 px-2 py-1.5 rounded-md flex items-center gap-1 font-bold transition-colors border border-slate-700 shadow-sm"
                  >
                    <MonitorSmartphone className="w-3 h-3" />
                    <span>Preview {d}%</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2 mb-2 w-full flex-wrap sm:hidden">
          <button 
            onClick={handlePreviewHtml}
            className="flex-[1_1_calc(50%-0.25rem)] flex justify-center text-sm bg-slate-700 hover:bg-slate-600 text-white px-4 py-2.5 rounded-xl items-center gap-2 font-bold transition-colors border border-slate-600 shadow-sm"
          >
            <MonitorSmartphone className="w-4 h-4" />
            <span>Preview</span>
          </button>
          <button 
            onClick={handleDownloadHtml}
            className="flex-[1_1_calc(50%-0.25rem)] flex justify-center text-sm bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl items-center gap-2 font-bold transition-colors border border-emerald-500 shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Download</span>
          </button>
          <button 
            onClick={handleCopyLink}
            className="flex-[1_1_100%] flex justify-center text-sm bg-indigo-500 hover:bg-indigo-400 text-white px-4 py-2.5 rounded-xl items-center gap-2 font-bold transition-colors border border-indigo-400 shadow-sm mb-2"
          >
            <Share2 className="w-4 h-4" />
            <span>Salin Link Brosur</span>
          </button>
          <div className="flex w-full gap-2 mt-1 flex-wrap">
              {[10, 12, 15, 18].map(d => (
                <button 
                  key={d}
                  onClick={() => handlePreviewSimple(d)}
                  className="flex-[1_1_calc(25%-0.375rem)] justify-center text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-100 py-2 rounded-lg flex items-center gap-1 font-bold transition-colors border border-slate-700 shadow-sm"
                >
                  <MonitorSmartphone className="w-3 h-3 hidden sm:block" />
                  <span>{d}%</span>
                </button>
              ))}
          </div>
        </div>
        <div className="grid grid-cols-2 lg:flex lg:flex-wrap bg-indigo-700/50 p-1 rounded-lg w-full xl:w-auto gap-1">
          <button 
            onClick={() => setActiveTab('list')}
             className={`px-3 py-2 rounded-md text-sm font-bold transition-all text-center ${activeTab === 'list' ? 'bg-white text-indigo-700 shadow flex-1' : 'text-indigo-100 hover:text-white flex-1'}`}
          >
            Daftar Produk
          </button>
          <button 
            onClick={() => setActiveTab('upload')}
            className={`px-3 py-2 rounded-md text-sm font-bold transition-all text-center ${activeTab === 'upload' ? 'bg-white text-indigo-700 shadow flex-1' : 'text-indigo-100 hover:text-white flex-1'}`}
          >
            Upload Excel
          </button>
          <button 
            onClick={() => setActiveTab('salesmen')}
            className={`px-3 py-2 rounded-md text-sm font-bold transition-all text-center ${activeTab === 'salesmen' ? 'bg-white text-indigo-700 shadow flex-1' : 'text-indigo-100 hover:text-white flex-1'}`}
          >
            Salesman
          </button>
          <button 
            onClick={() => setActiveTab('grosir')}
            className={`px-3 py-2 rounded-md text-sm font-bold transition-all text-center ${activeTab === 'grosir' ? 'bg-white text-indigo-700 shadow flex-1' : 'text-indigo-100 hover:text-white flex-1'}`}
          >
            Toko Grosir
          </button>
          <button 
            onClick={() => setActiveTab('promos')}
            className={`px-3 py-2 rounded-md text-sm font-bold transition-all text-center ${activeTab === 'promos' ? 'bg-white text-indigo-700 shadow flex-1' : 'text-indigo-100 hover:text-white flex-1'}`}
          >
            Promo Khusus
          </button>
          <button 
            onClick={() => setActiveTab('warranties')}
            className={`px-3 py-2 rounded-md text-sm font-bold transition-all text-center ${activeTab === 'warranties' ? 'bg-white text-indigo-700 shadow flex-1' : 'text-indigo-100 hover:text-white flex-1'}`}
          >
            Catatan Garansi
          </button>
          <button 
            onClick={() => setActiveTab('hero')}
            className={`px-3 py-2 rounded-md text-sm font-bold transition-all text-center ${activeTab === 'hero' ? 'bg-white text-indigo-700 shadow flex-1' : 'text-indigo-100 hover:text-white flex-1'}`}
          >
            Banner & Fitur
          </button>
          <button 
            onClick={() => setActiveTab('visitors')}
            className={`col-span-2 lg:col-span-1 px-3 py-2 rounded-md text-sm font-bold transition-all text-center ${activeTab === 'visitors' ? 'bg-white text-emerald-700 shadow flex-1' : 'text-indigo-100 hover:text-white flex-1'}`}
          >
            Pengunjung Brosur
          </button>
        </div>
      </div>

      {activeTab === 'upload' ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload File Pricelist</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6 max-w-2xl mx-auto">
                <div 
                  {...getRootProps()} 
                  className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${isDragActive ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'}`}
                >
                  <input {...getInputProps()} />
                  <div className="flex justify-center mb-4">
                    <div className={`p-4 rounded-full ${isDragActive ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                      <FileSpreadsheet className="w-10 h-10" />
                    </div>
                  </div>
                  <h3 className="text-lg font-black text-slate-700 mb-2">
                    {isDragActive ? 'Lepaskan file di sini' : 'Tarik & Drop File Excel'}
                  </h3>
                  <p className="text-slate-500 text-sm max-w-sm mx-auto">
                    Mendukung format .xlsx dan .xls. Pastikan kolom memuat: <span className="font-bold">goods_code, brand_hp, model_hp, packing, price, brand_lcd</span>
                  </p>
                  <p className="text-xs text-indigo-500 font-medium mt-2">Dapat mengupload Vivan dan XPas sekaligus dalam 1 file.</p>
                </div>

                {uploadError && (
                  <div className="p-4 bg-rose-50 text-rose-700 rounded-xl border border-rose-200 flex gap-3 text-sm font-medium">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <p>{uploadError}</p>
                  </div>
                )}

                {uploadSuccess && (
                  <div className="p-4 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200 flex gap-3 text-sm font-medium">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <p>File berhasil diproses dan disimpan ke database.</p>
                  </div>
                )}

                {parsedData.length > 0 && (
                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-indigo-900">File siap diupload</h4>
                      <p className="text-sm text-indigo-700">{parsedData.length} baris data ditemukan</p>
                    </div>
                    <Button 
                      onClick={handleUploadToDatabase} 
                      disabled={isUploading}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md font-bold"
                    >
                      {isUploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</> : <><UploadCloud className="w-4 h-4 mr-2" /> Upload ke Database</>}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : activeTab === 'list' ? (
        <div className="space-y-6">
          {/* Controls: Search, Filter, Mass Delete, Add New */}
          <div className="flex flex-col lg:flex-row justify-between gap-4">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Semua (Global Pencarian)" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-4 py-2 border rounded-xl bg-white shadow-sm w-full focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <select 
                  value={brandFilter}
                  onChange={(e) => setBrandFilter(e.target.value)}
                  className="border rounded-xl px-4 py-2 bg-white shadow-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="All">Semua Brand LCD</option>
                  <option value="Vivan">Vivan</option>
                  <option value="XPas">XPas</option>
                </select>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <select 
                  value={filterBrandHp}
                  onChange={(e) => setFilterBrandHp(e.target.value)}
                  className="border rounded-xl px-4 py-2 bg-white shadow-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="All">Semua Brand HP</option>
                  {availableHpBrands.map(hp => (
                    <option key={hp} value={hp}>{hp}</option>
                  ))}
                </select>
                <input 
                  type="text" 
                  placeholder="Filter Model HP..." 
                  value={filterModelHp}
                  onChange={(e) => setFilterModelHp(e.target.value)}
                  className="px-4 py-2 border rounded-xl bg-white shadow-sm w-full focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <input 
                  type="text" 
                  placeholder="Filter Kode Produk..." 
                  value={filterKode}
                  onChange={(e) => setFilterKode(e.target.value)}
                  className="px-4 py-2 border rounded-xl bg-white shadow-sm w-full focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <select 
                  value={filterPromo}
                  onChange={(e) => setFilterPromo(e.target.value)}
                  className="border rounded-xl px-4 py-2 bg-white shadow-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="All">Semua Promo</option>
                  <option value="None">Tanpa Promo/Diskon</option>
                  {promos.map(promo => (
                    <option key={promo.id} value={promo.id}>{promo.name || 'Promo Tanpa Nama'}</option>
                  ))}
                </select>
                <select 
                  value={filterStockStatus}
                  onChange={(e) => setFilterStockStatus(e.target.value)}
                  className="border rounded-xl px-4 py-2 bg-white shadow-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="All">Semua Stok</option>
                  <option value="Ready">Stok Tersedia</option>
                  <option value="Kosong">Stok Kosong</option>
                </select>
              </div>
            </div>
            
            <div className="flex flex-col gap-2 mt-2">
              <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-2 sm:p-3 rounded-xl border border-slate-200">
                <div className="w-full sm:w-auto font-bold text-slate-700 text-sm mb-1 sm:mb-0">
                  Setup Harga Tangga: 
                  <span className="text-xs font-normal text-slate-500 ml-1">(Format: Qty:Diskon%. Contoh: 10:10, 50:12)</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input 
                    type="text"
                    value={globalDiscount}
                    onChange={(e) => setGlobalDiscount(e.target.value)}
                    placeholder="10:10, 50:12"
                    className="w-48 text-sm font-black text-indigo-700 placeholder-indigo-300 border border-indigo-200 rounded px-3 py-2 outline-none focus:border-indigo-500"
                  />
                  <Button 
                     size="sm" 
                     onClick={() => {
                       saveDiscount(globalDiscount);
                       showAlert('Diskon harga/pcs (GLOBAL) diubah!', 'success', 'Sukses');
                     }}
                     className="h-9 text-xs font-bold"
                     variant="outline"
                  >
                     Simpan Global
                  </Button>
                  {selectedIds.length > 0 && (
                    <>
                      <Button 
                        size="sm"
                        onClick={handleApplyCustomDiscount}
                        disabled={isApplyingDiscount}
                        className="h-9 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
                      >
                        Terapkan Ke {selectedIds.length} Terpilih
                      </Button>
                      <Button 
                        size="sm"
                        onClick={handleClearCustomDiscount}
                        disabled={isApplyingDiscount}
                        variant="outline"
                        className="h-9 text-xs font-bold text-slate-600 hover:text-rose-600 hover:bg-rose-50 border-slate-200"
                      >
                        Hapus Custom
                      </Button>
                    </>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col gap-2 mt-2 bg-slate-50 p-2 sm:p-3 rounded-xl border border-slate-200">
                <div className="w-full sm:w-auto font-bold text-slate-700 text-sm mb-1 sm:mb-0">Syarat & Ketentuan Global:</div>
                <div className="flex flex-col gap-2">
                  <textarea 
                    value={globalTerms}
                    onChange={(e) => setGlobalTerms(e.target.value)}
                    placeholder="Masukkan syarat & ketentuan global..."
                    className="w-full text-sm placeholder-slate-400 border border-slate-200 rounded px-3 py-2 outline-none focus:border-indigo-500 min-h-[80px]"
                  />
                  <Button 
                     size="sm" 
                     onClick={() => {
                       saveGlobalTerms(globalTerms);
                       showAlert('Syarat & Ketentuan (GLOBAL) diubah!', 'success', 'Sukses');
                     }}
                     className="w-fit h-9 text-xs font-bold"
                     variant="outline"
                  >
                     Simpan S&K Global
                  </Button>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {selectedIds.length > 0 && (
                  <Button 
                    onClick={handleBulkDelete} 
                    disabled={isDeleting}
                    className="h-9 bg-rose-100 text-rose-700 hover:bg-rose-200 border-none font-bold"
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Hapus {selectedIds.length} Terpilih
                  </Button>
                )}
                <Button 
                  onClick={() => setShowBulkDeleteModal(true)} 
                  variant="outline"
                  className="h-9 border-rose-200 text-rose-600 hover:bg-rose-50 font-bold"
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Mass Delete
                </Button>
                <div className="flex-1"></div>
                <Button 
                  onClick={() => setShowDownloadExcelModal(true)} 
                  className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm"
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" /> Download Excel
                </Button>
                <Button onClick={() => {
                  setFormData({ brand_hp: 'Apple', brand_lcd: 'Vivan', model_hp: '', packing: 'Incell', price: 0, stock_status: 'Ready', warranty_months: 12, goods_code: '' });
                  setIsEditing(true);
                }} className="h-9 bg-white border-2 border-indigo-100 text-indigo-600 hover:bg-indigo-50 font-bold shadow-sm">
                  <Plus className="w-4 h-4 mr-2" /> Tambah Manual
                </Button>
              </div>
            </div>
          </div>

          <GenieModal 
            isOpen={showBulkDeleteModal}
            onClose={() => setShowBulkDeleteModal(false)}
            title="Mass Delete"
            subtitle="Hapus Seluruh Data Database"
            maxWidth="max-w-xl"
          >
            <div className="space-y-4">
              <div className="p-4 bg-rose-50 text-rose-800 rounded-xl border border-rose-200 flex items-start gap-3">
                <AlertCircle className="w-6 h-6 shrink-0 text-rose-600" />
                <div>
                  <h4 className="font-bold">Peringatan: Aksi Tidak Dapat Dibatalkan!</h4>
                  <p className="text-sm mt-1 text-rose-600">Pilih data brand mana yang akan dihapus dari sistem. Semua produk yang berkaitan dengan brand terpilih akan dihapus permanen.</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Pilih Target Data</label>
                <select 
                  className="w-full border-2 border-slate-200 rounded-xl p-3 bg-white text-slate-800 font-bold focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none transition-all"
                  value={bulkDeleteBrand}
                  onChange={(e) => setBulkDeleteBrand(e.target.value)}
                >
                  <option value="All">Hapus Semua Data (Keseluruhan)</option>
                  <option value="Vivan">Hanya Hapus Vivan LCD</option>
                  <option value="XPas">Hanya Hapus XPas LCD</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button 
                   onClick={() => setShowBulkDeleteModal(false)}
                   variant="outline"
                   className="font-bold text-slate-600"
                >
                  Batal
                </Button>
                <Button 
                   onClick={handleDeleteAllByBrand}
                   disabled={isDeleting}
                   className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
                >
                   {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                   Eksekusi Hapus ({bulkDeleteBrand})
                </Button>
              </div>
            </div>
          </GenieModal>

          <GenieModal 
            isOpen={showDownloadExcelModal}
            onClose={() => setShowDownloadExcelModal(false)}
            title="Download Pricelist Excel"
            subtitle="Ekspor data ke format Excel"
            maxWidth="max-w-md"
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Diskon Global (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={downloadExcelPct || ''}
                  onChange={e => setDownloadExcelPct(parseFloat(e.target.value) || 0)}
                  className="w-full p-3 border-2 border-slate-200 rounded-xl bg-white outline-none focus:border-indigo-500 font-bold text-slate-700"
                  placeholder="Contoh: 10"
                />
                <p className="text-[10px] text-slate-500 font-medium">Kosongkan atau isi 0 jika tidak ada diskon.</p>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button 
                   onClick={() => setShowDownloadExcelModal(false)} 
                   variant="outline" 
                   className="font-bold text-slate-500"
                >
                   Batal
                </Button>
                <Button 
                   onClick={handleExportExcel} 
                   className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                   <FileSpreadsheet className="w-4 h-4 mr-2" /> Download Sekarang
                </Button>
              </div>
            </div>
          </GenieModal>

          {isEditing && (
            <Card className="border-indigo-100 shadow-md">
              <CardHeader>
                <CardTitle>{formData.id ? 'Edit' : 'Tambah'} Produk LCD</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Brand LCD</label>
                    <select className="w-full border rounded-lg p-2" value={formData.brand_lcd || ''} onChange={e => setFormData({...formData, brand_lcd: e.target.value})} required>
                      <option value="Vivan">Vivan</option>
                      <option value="XPas">XPas</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Goods Code</label>
                    <input type="text" className="w-full border rounded-lg p-2" value={formData.goods_code || ''} onChange={e => setFormData({...formData, goods_code: e.target.value})} required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Brand HP</label>
                    <input type="text" className="w-full border rounded-lg p-2" value={formData.brand_hp || ''} onChange={e => setFormData({...formData, brand_hp: e.target.value})} placeholder="Apple, Samsung..." required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Model HP</label>
                    <input type="text" className="w-full border rounded-lg p-2" value={formData.model_hp || ''} onChange={e => setFormData({...formData, model_hp: e.target.value})} placeholder="iPhone X" required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Packing / Tipe LCD</label>
                    <input type="text" className="w-full border rounded-lg p-2" value={formData.packing || ''} onChange={e => setFormData({...formData, packing: e.target.value})} placeholder="Incell / OLED" required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Harga/Kotak (Rp)</label>
                    <input type="number" className="w-full border rounded-lg p-2" value={formData.price || 0} onChange={e => setFormData({...formData, price: Number(e.target.value)})} required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Status Stok</label>
                    <input type="text" className="w-full border rounded-lg p-2" value={formData.stock_status || ''} onChange={e => setFormData({...formData, stock_status: e.target.value})} placeholder="Ready / Kosong / Jumlah (Misal: 5)" required />
                  </div>
                  <div className="col-span-full flex gap-2 justify-end mt-4">
                    <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>Batal</Button>
                    <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 font-bold">Simpan</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Daftar Pricelist LCD</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-y">
                    <tr>
                      <th className="px-4 py-3 w-10">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                          checked={filteredProducts.length > 0 && selectedIds.length === filteredProducts.length}
                          onChange={handleSelectAll}
                        />
                      </th>
                      <th className="px-4 py-3 font-semibold text-slate-600">Goods Code & Brand LCD</th>
                      <th className="px-4 py-3 font-semibold text-slate-600">Brand HP & Model HP</th>
                      <th className="px-4 py-3 font-semibold text-slate-600">Packing</th>
                      <th className="px-4 py-3 font-semibold text-slate-600">Harga/Kotak</th>
                      <th className="px-4 py-3 font-semibold text-slate-600">Diskon/Promo</th>
                      <th className="px-4 py-3 font-semibold text-slate-600">Stok</th>
                      <th className="px-4 py-3 font-semibold text-slate-600 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500" /></td>
                      </tr>
                    ) : filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-slate-400">Belum ada data pricelist.</td>
                      </tr>
                    ) : (
                      filteredProducts.map(p => {
                        const activePromos = getCustomPromos(p);
                        const isGlobalDiscountFallback = activePromos.length === 0;
                        const discountStrToUse = p.custom_discount || globalDiscount;
                        
                        return (
                        <tr key={p.id} className={`hover:bg-slate-50 ${selectedIds.includes(p.id as string) ? 'bg-indigo-50/50' : ''}`}>
                          <td className="px-4 py-3">
                            <input 
                              type="checkbox" 
                              className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                              checked={selectedIds.includes(p.id as string)}
                              onChange={() => handleSelectOne(p.id as string)}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <span className="block font-bold text-xs text-slate-400">{p.brand_lcd || 'Vivan'}</span>
                            <span className="font-bold text-slate-700">{p.goods_code || '-'}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="block font-bold text-xs text-slate-400">{p.brand_hp}</span>
                            <span className="font-bold text-slate-700">{p.model_hp}</span>
                          </td>
                          <td className="px-4 py-3"><span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-bold">{p.packing}</span></td>
                          <td className="px-4 py-3 font-black text-rose-600">Rp {(p.price || 0).toLocaleString()}</td>
                          <td className="px-4 py-3 text-xs leading-tight">
                            {activePromos.length > 0 ? (
                              <div className="flex flex-col gap-1">
                                {activePromos.map((pr, i) => (
                                  <span key={i} className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-bold whitespace-nowrap">
                                    Promo: {pr.discountPercentage}%
                                  </span>
                                ))}
                              </div>
                            ) : (
                               <div className="flex flex-col gap-1 text-slate-500 font-medium">
                                 {discountStrToUse ? discountStrToUse.split(/[,\+]/).map(d => d.trim()).filter(Boolean).map((d, i) => {
                                    const val = d.split(':').pop();
                                    return <span key={i} className="px-2 py-0.5 bg-slate-100 rounded inline-block whitespace-nowrap">Diskon {val}%</span>;
                                 }) : <span className="text-slate-400 italic">-</span>}
                               </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${p.stock_status === 'Kosong' ? 'bg-rose-100 text-rose-700' : p.stock_status === 'Indent' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                              {p.stock !== undefined && p.stock !== null ? p.stock : (p.stock_status || 'Ready')}
                            </span>
                          </td>
                          <td className="px-4 py-3 flex gap-2 justify-end">
                            <Button variant="outline" size="sm" onClick={() => { 
                              setFormData({
                                ...p, 
                                brand_hp: p.brand_hp, 
                                packing: p.packing,
                                brand_lcd: p.brand_lcd || 'Vivan'
                              }); 
                              setIsEditing(true); 
                            }}><Edit className="w-4 h-4" /></Button>
                            <Button variant="outline" size="sm" className="text-rose-600 hover:bg-rose-50" onClick={() => p.id && handleDelete(p.id)}><Trash2 className="w-4 h-4" /></Button>
                          </td>
                        </tr>
                      )})
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : activeTab === 'promos' ? (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>Kelola Promo Khusus</CardTitle>
              <Button onClick={() => { setIsEditingPromo(true); setPromoForm(defaultPromoForm); }} className="bg-indigo-600 hover:bg-indigo-700 font-bold">
                <Plus className="w-4 h-4 mr-2" /> Tambah Promo
              </Button>
            </CardHeader>
            <CardContent>
              {isEditingPromo && (
                <div className="mb-6 bg-slate-50 border border-slate-200 p-4 rounded-xl">
                  <h3 className="font-bold text-slate-800 mb-4">{promoForm.id ? 'Edit' : 'Tambah'} Promo</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Nama Promo</label>
                      <input type="text" value={promoForm.name || ''} onChange={e => setPromoForm({...promoForm, name: e.target.value})} className="w-full mt-1 border rounded-lg p-2" placeholder="Cth: Promo Lebaran XPas" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Diskon Promo (%)</label>
                      <input type="number" min="1" max="100" value={promoForm.discountPercentage} onChange={e => setPromoForm({...promoForm, discountPercentage: Number(e.target.value)})} className="w-full mt-1 border rounded-lg p-2" />
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <label className="text-xs font-bold text-slate-500 uppercase">Syarat & Ketentuan</label>
                    <textarea value={promoForm.terms || ''} onChange={e => setPromoForm({...promoForm, terms: e.target.value})} className="w-full mt-1 border rounded-lg p-2 min-h-[80px]" placeholder="Masukkan syarat dan ketentuan promo (opsional)..." />
                  </div>

                  <div className="border-t pt-4 mb-4 border-slate-200">
                    <h4 className="font-bold text-sm text-slate-800 mb-2">Filter & Cari Produk</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Target Brand LCD</label>
                        <select value={promoForm.target_brand} onChange={e => setPromoForm({...promoForm, target_brand: e.target.value})} className="w-full mt-1 border rounded-lg p-2 bg-white">
                          <option value="Semua">Semua</option>
                          <option value="Vivan">Vivan</option>
                          <option value="XPas">XPas</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Brand HP</label>
                        <div className="relative group">
                          <button type="button" className="w-full mt-1 border rounded-lg p-2 bg-white text-left text-sm whitespace-nowrap overflow-hidden text-ellipsis">
                            {promoForm.target_hp_brands.length > 0 ? promoForm.target_hp_brands.join(', ') : '-- Pilih Brand HP --'}
                          </button>
                          <div className="absolute top-full left-0 mt-1 w-full bg-white border rounded-lg shadow-xl z-50 p-2 max-h-48 overflow-y-auto hidden group-hover:block hover:block">
                            {availableHpBrands.map(hp => (
                              <label key={hp} className="flex items-center gap-2 p-1.5 hover:bg-slate-50 cursor-pointer text-sm">
                                <input 
                                  type="checkbox" 
                                  checked={promoForm.target_hp_brands.includes(hp)} 
                                  onChange={(e) => {
                                    const newBrands = e.target.checked 
                                      ? [...promoForm.target_hp_brands, hp] 
                                      : promoForm.target_hp_brands.filter(b => b !== hp);
                                    setPromoForm({...promoForm, target_hp_brands: newBrands});
                                  }} 
                                />
                                {hp}
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Pencarian / Input Bulk SKU (Bisa paste banyak data)</label>
                        <textarea 
                          rows={2}
                          value={promoForm.search} 
                          onChange={e => setPromoForm({...promoForm, search: e.target.value})} 
                          className="w-full mt-1 border rounded-lg p-2 text-sm" 
                          placeholder="Ketik atau paste SKU/model disini... (pisahkan dengan enter atau koma)" 
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="border rounded-lg bg-white overflow-hidden flex flex-col h-[400px]">
                      <div className="bg-slate-100 p-2 border-b font-bold text-slate-700 text-sm flex justify-between items-center gap-2">
                        <span>Pilih Produk</span>
                        <div className="flex gap-2 items-center">
                          <Button 
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const newIds = filteredAvailableProductsForPromo.map(p => p.id);
                              setPromoForm(prev => ({
                                ...prev, 
                                selected_products: Array.from(new Set([...prev.selected_products, ...newIds])), 
                                search: '' 
                              }));
                            }}
                            className="h-7 text-[10px] font-bold text-indigo-600 border-indigo-200"
                          >
                            Masukkan Semua ({filteredAvailableProductsForPromo.length})
                          </Button>
                          <div className="text-[10px] font-normal text-slate-500 bg-white px-2 py-0.5 rounded border hidden sm:block">Sisa: {filteredAvailableProductsForPromo.length}</div>
                        </div>
                      </div>
                      <div className="overflow-y-auto flex-1 p-2 space-y-1">
                        {filteredAvailableProductsForPromo.slice(0, 100).map(p => (
                          <div key={`av-${p.id}`} className="flex justify-between items-center bg-slate-50 p-2 rounded border hover:bg-indigo-50 group cursor-pointer" onClick={() => setPromoForm({...promoForm, selected_products: [...promoForm.selected_products, p.id]})}>
                            <div>
                               <div className="text-xs font-bold text-slate-800">{p.brand_hp} {p.model_hp} <span className="text-slate-400 font-normal">({p.brand_lcd})</span></div>
                               <div className="text-[10px] text-slate-500 uppercase tracking-wider">{p.goods_code || p.packing}</div>
                            </div>
                            <Plus className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="border rounded-lg bg-white overflow-hidden flex flex-col h-[400px]">
                      <div className="bg-indigo-50 p-2 border-b font-bold text-indigo-800 text-sm flex justify-between items-center">
                        <span>Preview Tabel (Masuk Promo)</span>
                        <div className="text-xs font-normal text-indigo-600 bg-white px-2 py-0.5 rounded border border-indigo-200">Total: {promoForm.selected_products.length}</div>
                      </div>
                      <div className="overflow-y-auto flex-1 p-2 space-y-1 bg-slate-50/50">
                        {promoForm.selected_products.map(id => {
                          const p = products.find(prod => prod.id === id);
                          if (!p) return null;
                          return (
                            <div key={`sel-${id}`} className="flex justify-between items-center bg-white p-2 rounded border border-indigo-100 hover:border-rose-200 group">
                              <div>
                                 <div className="text-xs font-bold text-slate-800">{p.brand_hp} {p.model_hp} <span className="text-slate-400 font-normal">({p.brand_lcd})</span></div>
                                 <div className="text-[10px] text-slate-500 uppercase tracking-wider">{p.goods_code || p.packing}</div>
                              </div>
                              <button onClick={() => setPromoForm({...promoForm, selected_products: promoForm.selected_products.filter(sid => sid !== id)})} className="p-1 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-200">
                    <Button type="button" variant="outline" onClick={() => setIsEditingPromo(false)}>Batal</Button>
                    <Button type="button" onClick={savePromo} className="bg-indigo-600 hover:bg-indigo-700 font-bold px-8">Simpan Promo</Button>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto border rounded-xl">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-slate-600">Nama Promo</th>
                      <th className="px-4 py-3 font-semibold text-slate-600">Detail Produk</th>
                      <th className="px-4 py-3 font-semibold text-slate-600">Diskon Promo</th>
                      <th className="px-4 py-3 font-semibold text-slate-600 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {promos.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-8 text-slate-400">Belum ada promo khusus.</td>
                      </tr>
                    ) : (
                      promos.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-bold text-slate-700">{p.name || p.value || 'Promo Tanpa Nama'}</td>
                          <td className="px-4 py-3">
                             <div className="text-xs text-slate-500">
                               {p.selected_products && p.selected_products.length > 0 ? (
                                  <span className="font-bold text-indigo-600">{p.selected_products.length} Produk Dipilih</span>
                               ) : p.type === 'product' ? (
                                  products.find(prod => prod.id === p.value)?.model_hp || p.value
                               ) : (
                                  <span className="uppercase">{p.type} {p.value}</span>
                               )}
                             </div>
                          </td>
                          <td className="px-4 py-3 text-rose-600 font-bold">-{p.discountPercentage}%</td>
                          <td className="px-4 py-3 flex gap-2 justify-end">
                            <Button variant="outline" size="sm" onClick={() => duplicatePromo(p)} title="Duplikat"><Copy className="w-4 h-4 text-emerald-600" /></Button>
                            <Button variant="outline" size="sm" onClick={() => { setPromoForm({...defaultPromoForm, ...p}); setIsEditingPromo(true); }}><Edit className="w-4 h-4" /></Button>
                            <Button variant="outline" size="sm" className="text-rose-600 hover:bg-rose-50" onClick={() => deletePromo(p.id)}><Trash2 className="w-4 h-4" /></Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : activeTab === 'salesmen' ? (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>Kelola Kontak Salesman</CardTitle>
              <Button onClick={() => { setIsEditingSalesman(true); setSalesmanForm({ id: '', name: '', area: '', phone: '' }); }} className="bg-indigo-600 hover:bg-indigo-700 font-bold">
                <Plus className="w-4 h-4 mr-2" /> Tambah Salesman
              </Button>
            </CardHeader>
            <CardContent>
              {isEditingSalesman && (
                <div className="mb-6 bg-slate-50 border border-slate-200 p-4 rounded-xl">
                  <h3 className="font-bold text-slate-800 mb-4">{salesmanForm.id ? 'Edit' : 'Tambah'} Salesman</h3>
                  <form onSubmit={saveSalesman} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Nama Salesman</label>
                      <input type="text" required value={salesmanForm.name} onChange={e => setSalesmanForm({...salesmanForm, name: e.target.value})} className="w-full mt-1 border rounded-lg p-2" placeholder="Cth: Budi Santoso" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Area / Wilayah</label>
                      <input type="text" required value={salesmanForm.area} onChange={e => setSalesmanForm({...salesmanForm, area: e.target.value})} className="w-full mt-1 border rounded-lg p-2" placeholder="Cth: Jakarta Selatan" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Nomor WhatsApp</label>
                      <input type="text" required value={salesmanForm.phone} onChange={e => setSalesmanForm({...salesmanForm, phone: e.target.value})} className="w-full mt-1 border rounded-lg p-2" placeholder="Cth: 08123456789" />
                    </div>
                    <div className="sm:col-span-3 flex justify-end gap-2 mt-2">
                      <Button type="button" variant="outline" onClick={() => setIsEditingSalesman(false)}>Batal</Button>
                      <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 font-bold">Simpan</Button>
                    </div>
                  </form>
                </div>
              )}

              <div className="overflow-x-auto border rounded-xl">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-slate-600">Nama Salesman</th>
                      <th className="px-4 py-3 font-semibold text-slate-600">Area</th>
                      <th className="px-4 py-3 font-semibold text-slate-600">Nomor WA</th>
                      <th className="px-4 py-3 font-semibold text-slate-600 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {salesmen.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-8 text-slate-400">Belum ada data salesman.</td>
                      </tr>
                    ) : (
                      salesmen.map(sm => (
                        <tr key={sm.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-bold text-slate-700">{sm.name}</td>
                          <td className="px-4 py-3"><span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-xs font-bold">{sm.area}</span></td>
                          <td className="px-4 py-3 text-slate-600">{sm.phone}</td>
                          <td className="px-4 py-3 flex gap-2 justify-end">
                            <Button variant="outline" size="sm" onClick={() => { setSalesmanForm(sm); setIsEditingSalesman(true); }}><Edit className="w-4 h-4" /></Button>
                            <Button variant="outline" size="sm" className="text-rose-600 hover:bg-rose-50" onClick={() => deleteSalesman(sm.id)}><Trash2 className="w-4 h-4" /></Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : activeTab === 'grosir' ? (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>Kelola Toko Grosir</CardTitle>
              <Button onClick={() => { setIsEditingGrosir(true); setGrosirForm({ id: '', customer_name: '', address: '', area: '', maps_link: '' }); }} className="bg-indigo-600 hover:bg-indigo-700 font-bold">
                <Plus className="w-4 h-4 mr-2" /> Tambah Toko Grosir
              </Button>
            </CardHeader>
            <CardContent>
              {isEditingGrosir && (
                <div className="mb-6 bg-slate-50 border border-slate-200 p-4 rounded-xl">
                  <h3 className="font-bold text-slate-800 mb-4">{grosirForm.id ? 'Edit' : 'Tambah'} Toko Grosir</h3>
                  <form onSubmit={saveGrosir} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Nama Toko</label>
                      <input 
                        type="text" 
                        required 
                        list="customer-list"
                        value={grosirForm.customer_name} 
                        onChange={e => setGrosirForm({...grosirForm, customer_name: e.target.value})} 
                        className="w-full mt-1 border rounded-lg p-2" 
                        placeholder="Ketik untuk mencari customer..." 
                      />
                      <datalist id="customer-list">
                        {customerList.map(c => <option key={c} value={c}>{c}</option>)}
                      </datalist>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Daerah / Area</label>
                      <input type="text" required value={grosirForm.area} onChange={e => setGrosirForm({...grosirForm, area: e.target.value})} className="w-full mt-1 border rounded-lg p-2" placeholder="Cth: Makassar" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Alamat Lengkap</label>
                      <input type="text" required value={grosirForm.address} onChange={e => setGrosirForm({...grosirForm, address: e.target.value})} className="w-full mt-1 border rounded-lg p-2" placeholder="Cth: Jl. Rappocini Raya No. 45" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Link Google Maps</label>
                      <input type="text" value={grosirForm.maps_link} onChange={e => setGrosirForm({...grosirForm, maps_link: e.target.value})} className="w-full mt-1 border rounded-lg p-2" placeholder="https://maps.app.goo.gl/..." />
                    </div>
                    <div className="sm:col-span-2 flex justify-end gap-2 mt-2">
                      <Button type="button" variant="outline" onClick={() => setIsEditingGrosir(false)}>Batal</Button>
                      <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 font-bold">Simpan</Button>
                    </div>
                  </form>
                </div>
              )}

              <div className="overflow-x-auto border rounded-xl">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-slate-600">Nama Toko</th>
                      <th className="px-4 py-3 font-semibold text-slate-600">Area</th>
                      <th className="px-4 py-3 font-semibold text-slate-600">Alamat Lengkap</th>
                      <th className="px-4 py-3 font-semibold text-slate-600 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {grosirs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-8 text-slate-400">Belum ada data toko grosir.</td>
                      </tr>
                    ) : (
                      grosirs.map(sm => (
                        <tr key={sm.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-bold text-slate-700">{sm.customer_name}</td>
                          <td className="px-4 py-3 text-slate-600">{sm.area}</td>
                          <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{sm.address}</td>
                          <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                            <Button variant="outline" size="sm" onClick={() => { setGrosirForm(sm); setIsEditingGrosir(true); }}><Edit className="w-4 h-4" /></Button>
                            <Button variant="outline" size="sm" className="text-rose-600 hover:bg-rose-50" onClick={() => deleteGrosir(sm.id)}><Trash2 className="w-4 h-4" /></Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : activeTab === 'warranties' ? (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>Kelola Catatan Garansi</CardTitle>
              <Button onClick={() => { setIsEditingWarranty(true); setWarrantyForm(defaultWarrantyForm); }} className="bg-indigo-600 hover:bg-indigo-700 font-bold">
                <Plus className="w-4 h-4 mr-2" /> Tambah Catatan
              </Button>
            </CardHeader>
            <CardContent>
              {isEditingWarranty && (
                <div className="mb-6 bg-slate-50 border border-slate-200 p-4 rounded-xl">
                  <h3 className="font-bold text-slate-800 mb-4">{warrantyForm.id ? 'Edit' : 'Tambah'} Catatan</h3>
                  <form onSubmit={saveWarranty} className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Judul Catatan (Opsional)</label>
                      <input type="text" value={warrantyForm.title || ''} onChange={e => setWarrantyForm({...warrantyForm, title: e.target.value})} className="w-full mt-1 border rounded-lg p-2" placeholder="Cth: Klaim Garansi Berlaku" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Isi Catatan</label>
                      <textarea required value={warrantyForm.content || ''} onChange={e => setWarrantyForm({...warrantyForm, content: e.target.value})} className="w-full mt-1 border rounded-lg p-2 h-32" placeholder="Gunakan baris baru (enter) untuk memisahkan daftar catatan." />
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsEditingWarranty(false)}>Batal</Button>
                      <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">Simpan Catatan</Button>
                    </div>
                  </form>
                </div>
              )}

              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b text-slate-600 font-medium">
                    <tr>
                      <th className="px-4 py-3">Judul</th>
                      <th className="px-4 py-3">Cuplikan Isi</th>
                      <th className="px-4 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-slate-700">
                    {warranties.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-8 text-center text-slate-500 font-medium bg-slate-50/50">
                          Belum ada catatan garansi.
                        </td>
                      </tr>
                    ) : (
                      warranties.map(w => (
                        <tr key={w.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-bold">{w.title || '-'}</td>
                          <td className="px-4 py-3 max-w-sm truncate text-slate-500">{w.content}</td>
                          <td className="px-4 py-3 flex gap-2 justify-end">
                            <Button variant="outline" size="sm" onClick={() => { setWarrantyForm(w); setIsEditingWarranty(true); }}><Edit className="w-4 h-4" /></Button>
                            <Button variant="outline" size="sm" className="text-rose-600 hover:bg-rose-50" onClick={() => deleteWarranty(w.id)}><Trash2 className="w-4 h-4" /></Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : activeTab === 'hero' ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Kelola Banner & Keunggulan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-700 mb-3 uppercase">Judul & Deskripsi</h3>
                  <div className="grid grid-cols-1 gap-4 bg-slate-50 p-4 border rounded-xl">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Judul Utama</label>
                      <input 
                        type="text" 
                        value={heroSettings.title}
                        onChange={(e) => setHeroSettings({...heroSettings, title: e.target.value})}
                        className="w-full mt-1 border rounded-lg p-2"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Teks Sorotan (Gradient)</label>
                      <input 
                        type="text" 
                        value={heroSettings.highlight}
                        onChange={(e) => setHeroSettings({...heroSettings, highlight: e.target.value})}
                        className="w-full mt-1 border rounded-lg p-2"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Deskripsi Banner</label>
                      <textarea 
                        rows={3}
                        value={heroSettings.desc}
                        onChange={(e) => setHeroSettings({...heroSettings, desc: e.target.value})}
                        className="w-full mt-1 border rounded-lg p-2"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-700 mb-3 uppercase flex items-center justify-between">
                    Fitur Keunggulan
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 font-bold"
                      onClick={() => {
                        const newFeatures = [...heroSettings.features, { id: Date.now().toString(), icon: 'Star', color: 'indigo', title: 'Fitur Baru', desc: 'Deskripsi fitur baru.' }];
                        setHeroSettings({...heroSettings, features: newFeatures});
                      }}
                    >
                      <Plus className="w-4 h-4 mr-1" /> Tambah Fitur
                    </Button>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {heroSettings.features.map((feature, idx) => (
                      <div key={feature.id} className="bg-slate-50 p-4 border rounded-xl space-y-3 relative group">
                        <div className="font-bold text-indigo-700 text-sm border-b pb-2 flex justify-between items-center">
                          Fitur {idx + 1}
                          <button
                            onClick={() => {
                              const newFeatures = heroSettings.features.filter((f) => f.id !== feature.id);
                              setHeroSettings({...heroSettings, features: newFeatures});
                            }}
                            className="text-rose-500 hover:bg-rose-100 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-500">Judul Fitur</label>
                          <input 
                            type="text" 
                            value={feature.title}
                            onChange={(e) => {
                              const newFeatures = [...heroSettings.features];
                              newFeatures[idx].title = e.target.value;
                              setHeroSettings({...heroSettings, features: newFeatures});
                            }}
                            className="w-full mt-1 border rounded-lg p-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-500">Ikon (Lucide)</label>
                          <input 
                            type="text" 
                            value={feature.icon}
                            onChange={(e) => {
                              const newFeatures = [...heroSettings.features];
                              newFeatures[idx].icon = e.target.value;
                              setHeroSettings({...heroSettings, features: newFeatures});
                            }}
                            placeholder="Cth: Zap, Award, ShieldCheck"
                            className="w-full mt-1 border rounded-lg p-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-500">Warna (Pilihan Tema)</label>
                          <select
                            value={feature.color}
                            onChange={(e) => {
                              const newFeatures = [...heroSettings.features];
                              newFeatures[idx].color = e.target.value;
                              setHeroSettings({...heroSettings, features: newFeatures});
                            }}
                            className="w-full mt-1 border rounded-lg p-2 text-sm bg-white"
                          >
                            <option value="amber">Amber (Kuning)</option>
                            <option value="indigo">Indigo (Biru)</option>
                            <option value="emerald">Emerald (Hijau)</option>
                            <option value="rose">Rose (Merah)</option>
                            <option value="cyan">Cyan (Biru Muda)</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-500">Deskripsi Singkat</label>
                          <textarea 
                            rows={3}
                            value={feature.desc}
                            onChange={(e) => {
                              const newFeatures = [...heroSettings.features];
                              newFeatures[idx].desc = e.target.value;
                              setHeroSettings({...heroSettings, features: newFeatures});
                            }}
                            className="w-full mt-1 border rounded-lg p-2 text-sm"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end border-t pt-4">
                  <Button onClick={() => saveHeroSettingsToDb(heroSettings)} className="bg-indigo-600 hover:bg-indigo-700 font-bold px-8">
                    Simpan Pengaturan
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : activeTab === 'visitors' ? (
        <VisitorsTab />
      ) : null}
    </div>
  );
}
