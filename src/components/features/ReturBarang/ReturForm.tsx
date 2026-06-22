import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Search, Loader2, Save, Package, User, Calendar, MessageSquare, Plus, Hash } from 'lucide-react';
import { cn } from '../../../utils/cn';
import { useAlert } from '../../ui/AlertModal';

interface Customer {
  customer_code: string;
  customer_name: string;
}

interface Product {
  goods_code: string;
  goods_name: string;
  category?: string;
}

interface ReturFormProps {
  customers: Customer[];
  products: Product[];
  categories: string[];
  onSubmit: (data: any) => Promise<void>;
  loading: boolean;
}

export function ReturForm({ customers, products, categories, onSubmit, loading }: ReturFormProps) {
  const { showAlert } = useAlert();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [qty, setQty] = useState(1);
  const [description, setDescription] = useState('');

  // Search States
  const [custSearch, setCustSearch] = useState('');
  const [prodSearch, setProdSearch] = useState('');
  const [showCustDropdown, setShowCustDropdown] = useState(false);
  const [showProdDropdown, setShowProdDropdown] = useState(false);

  // Manual Input State
  const [isManualProduct, setIsManualProduct] = useState(false);
  const [manualGoodsCode, setManualGoodsCode] = useState('');
  const [manualGoodsName, setManualGoodsName] = useState('');
  const [manualCategory, setManualCategory] = useState('');
  const [showCatDropdown, setShowCatDropdown] = useState(false);

  const filteredCategories = categories.filter(cat => 
    cat.toLowerCase().includes(manualCategory.toLowerCase())
  );

  const handleSubmit = async () => {
    if (!selectedCustomer) {
      showAlert('Pilih customer terlebih dahulu', 'warning');
      return;
    }

    let finalGoodsCode = '';
    let finalGoodsName = '';
    let finalCategory = '';

    if (isManualProduct) {
      if (!manualGoodsCode || !manualGoodsName) {
        showAlert('Lengkapi kode dan nama produk manual', 'warning');
        return;
      }
      finalGoodsCode = manualGoodsCode;
      finalGoodsName = manualGoodsName;
      finalCategory = manualCategory;
    } else {
      if (!selectedProduct) {
        showAlert('Pilih produk terlebih dahulu', 'warning');
        return;
      }
      finalGoodsCode = selectedProduct.goods_code;
      finalGoodsName = selectedProduct.goods_name;
      finalCategory = selectedProduct.category || '';
    }

    await onSubmit({
      customer_code: selectedCustomer.customer_code,
      customer_name: selectedCustomer.customer_name,
      return_date: returnDate,
      goods_code: finalGoodsCode,
      goods_name: finalGoodsName,
      qty,
      description,
      isManual: isManualProduct,
      category: finalCategory
    });

    // Reset some fields on success
    setSelectedProduct(null);
    setQty(1);
    setDescription('');
    setManualGoodsCode('');
    setManualGoodsName('');
    setManualCategory('');
    setIsManualProduct(false);
  };

  const filteredCustomers = customers.filter(c => 
    c.customer_name.toLowerCase().includes(custSearch.toLowerCase()) ||
    c.customer_code.toLowerCase().includes(custSearch.toLowerCase())
  ).slice(0, 10);

  const filteredProducts = products.filter(p => 
    p.goods_name.toLowerCase().includes(prodSearch.toLowerCase()) ||
    p.goods_code.toLowerCase().includes(prodSearch.toLowerCase())
  ).slice(0, 10);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" onClick={() => {
      setShowCustDropdown(false);
      setShowProdDropdown(false);
      setShowCatDropdown(false);
    }}>
      {/* Customer & Date Section */}
      <div className="lg:col-span-4">
        <Card className="border-none shadow-xl shadow-slate-200/50 overflow-visible h-full">
          <CardHeader className="border-b border-slate-50 bg-slate-50/30">
            <CardTitle className="text-base flex items-center text-slate-800">
              <User className="w-4 h-4 mr-2 text-indigo-500" />
              Customer & Tanggal
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-5">
            <div className="space-y-2 relative" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-end">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cari Customer</label>
                <span className="text-[9px] font-bold text-slate-300">Database: {customers.length}</span>
              </div>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Nama atau Kode Customer..."
                  value={selectedCustomer ? selectedCustomer.customer_name : custSearch}
                  onChange={(e) => {
                    setCustSearch(e.target.value);
                    if (selectedCustomer) setSelectedCustomer(null);
                    setShowCustDropdown(true);
                  }}
                  onFocus={() => setShowCustDropdown(true)}
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
              </div>

              {showCustDropdown && custSearch && !selectedCustomer && (
                <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-2xl border border-slate-100 py-1 max-h-60 overflow-y-auto">
                  {filteredCustomers.length > 0 ? (
                    filteredCustomers.map(c => (
                      <button
                        key={c.customer_code}
                        onClick={() => {
                          setSelectedCustomer(c);
                          setShowCustDropdown(false);
                          setCustSearch('');
                        }}
                        className="w-full px-4 py-2 hover:bg-slate-50 text-left flex flex-col"
                      >
                        <span className="text-sm font-bold text-slate-700">{c.customer_name}</span>
                        <span className="text-[10px] font-medium text-slate-400">{c.customer_code}</span>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-xs text-slate-400 italic">Customer tidak ditemukan</div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal Retur</label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Product Section */}
      <div className="lg:col-span-5">
        <Card className="border-none shadow-xl shadow-slate-200/50 overflow-visible h-full">
          <CardHeader className="border-b border-slate-50 bg-slate-50/30">
            <CardTitle className="text-base flex items-center text-slate-800">
              <Package className="w-4 h-4 mr-2 text-rose-500" />
              Detail Produk & Qty
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {!isManualProduct ? (
              <div className="space-y-3">
                <div className="space-y-2 relative" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-between items-end">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      Cari Barang 
                      <span className="text-[8px] font-bold text-indigo-500 bg-indigo-50 px-1 rounded">({products.length} Terload)</span>
                    </label>
                  </div>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text"
                      placeholder="Nama atau Kode Barang..."
                      value={selectedProduct ? selectedProduct.goods_name : prodSearch}
                      onChange={(e) => {
                        setProdSearch(e.target.value);
                        if (selectedProduct) setSelectedProduct(null);
                        setShowProdDropdown(true);
                      }}
                      onFocus={() => setShowProdDropdown(true)}
                      className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    />
                  </div>

                  {showProdDropdown && prodSearch && !selectedProduct && (
                    <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-2xl border border-slate-100 py-1 max-h-60 overflow-y-auto">
                      {filteredProducts.length > 0 ? (
                        filteredProducts.map(p => (
                          <button
                            key={p.goods_code}
                            onClick={() => {
                              setSelectedProduct(p);
                              setShowProdDropdown(false);
                              setProdSearch('');
                            }}
                            className="w-full px-4 py-2 hover:bg-slate-50 text-left flex flex-col"
                          >
                            <span className="text-sm font-bold text-slate-700">{p.goods_name}</span>
                            <span className="text-[10px] font-medium text-slate-400">{p.goods_code}</span>
                          </button>
                        ))
                      ) : (
                        <button 
                          onClick={() => setIsManualProduct(true)}
                          className="w-full px-4 py-3 hover:bg-indigo-50 text-indigo-600 text-left flex items-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          <span className="text-sm font-black italic">Input Manual Baru?</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setIsManualProduct(true)}
                    className="text-indigo-600 font-black italic text-[10px] h-auto p-0 hover:bg-transparent"
                  >
                    + Input Manual
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded-full">Manual</span>
                  <button 
                    onClick={() => setIsManualProduct(false)}
                    className="text-slate-400 text-[10px] font-bold hover:text-slate-600"
                  >
                    Batal
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Kode</label>
                    <input 
                      type="text"
                      placeholder="Kode..."
                      value={manualGoodsCode}
                      onChange={(e) => setManualGoodsCode(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border-none rounded-lg text-xs font-bold text-slate-700 focus:ring-1 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nama Barang</label>
                    <input 
                      type="text"
                      placeholder="Nama..."
                      value={manualGoodsName}
                      onChange={(e) => setManualGoodsName(e.target.value)}
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
                        setManualCategory(e.target.value);
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
                              onClick={() => {
                                setManualCategory(cat);
                                setShowCatDropdown(false);
                              }}
                              className="w-full px-3 py-1.5 hover:bg-slate-50 text-left text-[11px] font-bold text-slate-600"
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
              </div>
            )}

            <div className="space-y-2 pt-2 border-t border-slate-50">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                <Hash className="w-3 h-3 mr-1" />
                Quantity (QTY)
              </label>
              <input 
                type="number"
                min="1"
                value={qty}
                onChange={(e) => setQty(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-lg font-black text-indigo-600 focus:ring-2 focus:ring-indigo-500/20 transition-all"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Description & Save */}
      <div className="lg:col-span-3">
        <Card className="border-none shadow-xl shadow-slate-200/50 h-full">
          <CardHeader className="border-b border-slate-50 bg-slate-50/30">
            <CardTitle className="text-base flex items-center text-slate-800">
              <MessageSquare className="w-4 h-4 mr-2 text-indigo-400" />
              Keterangan
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 flex flex-col h-[calc(100%-60px)]">
            <div className="flex-1 space-y-2 mb-4">
              <textarea 
                placeholder="Detail alasan retur..."
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none h-full"
              />
            </div>

            <Button 
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-6 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl font-black text-sm shadow-lg shadow-slate-200 transition-all active:scale-[0.98]"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              SIMPAN DATA
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
