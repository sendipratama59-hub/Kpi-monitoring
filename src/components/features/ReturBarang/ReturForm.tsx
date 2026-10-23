import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Loader2, Save, MessageSquare, Smartphone, Layers, Package } from 'lucide-react';
import { cn } from '../../../utils/cn';
import { useAlert } from '../../ui/AlertModal';
import { fetchAllLcdRecords, LcdReturItem } from '../../../services/lcdReturService';
import { ReturCustomerSection, Customer } from './ReturCustomerSection';
import { ReturProductSection, Product } from './ReturProductSection';

interface ReturFormProps {
  customers: Customer[];
  products: Product[];
  categories: string[];
  onSubmit: (data: any) => Promise<void>;
  loading: boolean;
}

export function ReturForm({ customers, products, categories, onSubmit, loading }: ReturFormProps) {
  const { showAlert } = useAlert();

  // Mode Selection: 'all' (All Kategori) or 'lcd' (Produk LCD)
  const [returType, setReturType] = useState<'all' | 'lcd'>('all');

  // LCD Database Cache
  const [lcdRecords, setLcdRecords] = useState<LcdReturItem[]>([]);
  const [loadingLcd, setLoadingLcd] = useState(false);

  // Form States
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [qty, setQty] = useState(1);
  const [description, setDescription] = useState('');
  const [noSo, setNoSo] = useState('');
  const [noSd, setNoSd] = useState('');

  // Manual Input State
  const [isManualProduct, setIsManualProduct] = useState(false);
  const [manualGoodsCode, setManualGoodsCode] = useState('');
  const [manualGoodsName, setManualGoodsName] = useState('');
  const [manualCategory, setManualCategory] = useState('');

  // Fetch LCD Database on mount or when switching to LCD mode
  useEffect(() => {
    let isMounted = true;
    const loadLcdData = async () => {
      setLoadingLcd(true);
      try {
        const records = await fetchAllLcdRecords();
        if (isMounted) {
          setLcdRecords(records);
        }
      } catch (err) {
        console.error('Error loading LCD records in ReturForm:', err);
      } finally {
        if (isMounted) {
          setLoadingLcd(false);
        }
      }
    };

    loadLcdData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Compute active customers list (in LCD mode, prioritize customers present in database_lcd)
  const activeCustomers = useMemo(() => {
    if (returType !== 'lcd' || lcdRecords.length === 0) {
      return customers;
    }

    const map = new Map<string, Customer>();
    // First add customers from database_lcd
    lcdRecords.forEach(r => {
      const code = (r.customer_code || '').trim();
      const name = (r.customer_name || '').trim();
      if (code || name) {
        const key = code ? code.toLowerCase() : name.toLowerCase();
        if (!map.has(key)) {
          map.set(key, { customer_code: code, customer_name: name });
        }
      }
    });

    // Then add standard customers
    customers.forEach(c => {
      const key = c.customer_code ? c.customer_code.toLowerCase() : c.customer_name.toLowerCase();
      if (!map.has(key)) {
        map.set(key, c);
      }
    });

    return Array.from(map.values());
  }, [returType, customers, lcdRecords]);

  const handleSelectCustomer = (cust: Customer | null) => {
    setSelectedCustomer(cust);
    // When customer changes in LCD mode, reset product and SO/SD to trigger fresh cascading
    if (returType === 'lcd') {
      setSelectedProduct(null);
      setNoSo('');
      setNoSd('');
    }
  };

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
      category: returType === 'lcd' ? (finalCategory || 'LCD') : finalCategory,
      retur_type: returType,
      no_so: noSo,
      no_sd: noSd
    });

    // Reset fields on success
    setSelectedProduct(null);
    setSelectedCustomer(null);
    setQty(1);
    setDescription('');
    setNoSo('');
    setNoSd('');
    setManualGoodsCode('');
    setManualGoodsName('');
    setManualCategory('');
    setIsManualProduct(false);
  };

  return (
    <div className="space-y-5">
      {/* Category Switcher: All Kategori vs Produk LCD */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center text-white transition-colors shadow-sm",
            returType === 'lcd' ? "bg-cyan-600 shadow-cyan-600/20" : "bg-indigo-600 shadow-indigo-600/20"
          )}>
            {returType === 'lcd' ? <Smartphone className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
          </div>
          <div>
            <div className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <span>Kategori Retur:</span>
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                returType === 'lcd' ? "bg-cyan-100 text-cyan-800" : "bg-indigo-100 text-indigo-800"
              )}>
                {returType === 'lcd' ? 'Produk LCD' : 'All Kategori'}
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-500">
              {returType === 'lcd'
                ? 'Data toko, barang, No SO (Bulan & Tahun), dan No SD difilter secara cascading dari Database LCD'
                : 'Data diambil dari database barang umum & daftar customer reguler'}
            </p>
          </div>
        </div>

        {/* Toggle Switch Buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              setReturType('all');
              setSelectedProduct(null);
              setNoSo('');
              setNoSd('');
            }}
            className={cn(
              "px-3.5 py-2 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5",
              returType === 'all'
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Package className="w-3.5 h-3.5" />
            <span>All Kategori</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setReturType('lcd');
              setSelectedProduct(null);
              setNoSo('');
              setNoSd('');
            }}
            className={cn(
              "px-3.5 py-2 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5",
              returType === 'lcd'
                ? "bg-cyan-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Produk LCD</span>
          </button>
        </div>
      </div>

      {/* Main Form Sections: Customer, Product + No SO/SD, and Keterangan */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Section 1: Customer & Date */}
        <div className="lg:col-span-4">
          <ReturCustomerSection
            customers={activeCustomers}
            selectedCustomer={selectedCustomer}
            onSelectCustomer={handleSelectCustomer}
            returnDate={returnDate}
            onReturnDateChange={setReturnDate}
            isLcdMode={returType === 'lcd'}
          />
        </div>

        {/* Section 2: Detail Produk & Qty (Includes No SO and No SD directly under Cari Barang) */}
        <div className="lg:col-span-5">
          <ReturProductSection
            products={products}
            lcdRecords={lcdRecords}
            selectedCustomer={selectedCustomer}
            selectedProduct={selectedProduct}
            onSelectProduct={setSelectedProduct}
            isLcdMode={returType === 'lcd'}
            noSo={noSo}
            noSd={noSd}
            onNoSoChange={setNoSo}
            onNoSdChange={setNoSd}
            qty={qty}
            onQtyChange={setQty}
            isManualProduct={isManualProduct}
            onToggleManualProduct={setIsManualProduct}
            manualGoodsCode={manualGoodsCode}
            onManualGoodsCodeChange={setManualGoodsCode}
            manualGoodsName={manualGoodsName}
            onManualGoodsNameChange={setManualGoodsName}
            manualCategory={manualCategory}
            onManualCategoryChange={setManualCategory}
            categories={categories}
          />
        </div>

        {/* Section 3: Keterangan & Submit Button */}
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
                  placeholder="Detail alasan atau catatan retur..."
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none h-full"
                />
              </div>

              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full py-6 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl font-black text-sm shadow-lg shadow-slate-200 transition-all active:scale-[0.98] cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                SIMPAN DATA RETUR
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
