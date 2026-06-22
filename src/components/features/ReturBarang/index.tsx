import React, { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabase';
import { ReturForm } from './ReturForm';
import { ReturHistory } from './ReturHistory';
import { Loader2, Share2, Package, LogOut, Lock } from 'lucide-react';
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

interface ReturBarangProps {
  isShared?: boolean;
}

interface SalesmanSession {
  salesman_code: string;
  salesman_name: string;
}

export function ReturBarang({ isShared }: ReturBarangProps) {
  const { showAlert } = useAlert();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Salesman session states for shared view
  const [session, setSession] = useState<SalesmanSession | null>(() => {
    if (!isShared) return null;
    const cached = localStorage.getItem('shared_retur_salesman');
    return cached ? JSON.parse(cached) : null;
  });
  const [salesmanCodeInput, setSalesmanCodeInput] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Dynamic Title & Favicon Update
  useEffect(() => {
    const originalTitle = document.title;
    document.title = 'Retur Barang';

    const faviconLink = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    let originalFavicon = '';
    if (faviconLink) {
      originalFavicon = faviconLink.href;
      faviconLink.href = "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📦</text></svg>";
    }

    return () => {
      document.title = 'Survey Data Channel & Target';
      if (faviconLink) {
        faviconLink.href = "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📋</text></svg>";
      }
    };
  }, []);

  useEffect(() => {
    if (!isShared) {
      fetchInitialData();
    } else if (session) {
      fetchInitialData();
    }
  }, [isShared, session]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const fetchAll = async (tableName: string, select: string) => {
        let all: any[] = [];
        let from = 0;
        let to = 999;
        let hasMore = true;
        while (hasMore) {
          const { data, error } = await supabase.from(tableName).select(select).range(from, to).limit(1000);
          if (error) throw error;
          if (data && data.length > 0) {
            all = [...all, ...data];
            if (data.length < 1000) hasMore = false;
            else { from += 1000; to += 1000; }
          } else hasMore = false;
        }
        return all;
      };

      // Fetch customer list based on role
      let rawCustomers: any[] = [];
      if (isShared && session) {
        // Logged-in salesman: fetch their assigned customers only
        let from = 0;
        let to = 999;
        let hasMore = true;
        while (hasMore) {
          const { data, error } = await supabase
            .from('salesman_customer')
            .select('customer_code, customer_name')
            .eq('salesman_code', session.salesman_code)
            .range(from, to)
            .limit(1000);
          if (error) throw error;
          if (data && data.length > 0) {
            rawCustomers = [...rawCustomers, ...data];
            if (data.length < 1000) hasMore = false;
            else { from += 1000; to += 1000; }
          } else hasMore = false;
        }
      } else {
        rawCustomers = await fetchAll('salesman_customer', 'customer_code, customer_name');
      }

      const [prodData, kpiProdData] = await Promise.all([
        fetchAll('database_barang', 'goods_code, goods_name, warna, category'),
        fetchAll('salesman_kpi', 'goods_code, goods_name')
      ]);

      if (rawCustomers) {
        // Deduplicate
        const uniqueCustMap = new Map();
        rawCustomers.forEach(c => {
          if (c.customer_code) uniqueCustMap.set(c.customer_code, c);
        });
        setCustomers(Array.from(uniqueCustMap.values()) as Customer[]);
      }

      const productMap = new Map<string, Product>();
      const categorySet = new Set<string>();

      if (prodData) {
        prodData.forEach(p => {
          if (p.goods_code) {
             productMap.set(p.goods_code, {
               goods_code: p.goods_code,
               goods_name: p.warna ? `${p.goods_name} ${p.warna}` : p.goods_name,
               category: p.category
             });
          }
          if (p.category) categorySet.add(p.category);
        });
      }

      const kpiItems = kpiProdData as any[];
      if (kpiItems) {
        kpiItems.forEach(p => {
          if (p.goods_code && !productMap.has(p.goods_code)) {
            productMap.set(p.goods_code, {
              goods_code: p.goods_code,
              goods_name: p.goods_name
            });
          }
        });
      }

      setProducts(Array.from(productMap.values()));
      setCategories(Array.from(categorySet).sort());
    } catch (err) {
      console.error(err);
      showAlert('Terjadi kesalahan saat memuat data awal.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (enteredCode: string) => {
    const codeToSearch = enteredCode.trim();
    if (!codeToSearch) {
      showAlert('Silakan masukkan Kode Salesman', 'warning');
      return;
    }

    setAuthLoading(true);
    try {
      // 1. Try finding in salesman_customer
      let { data: smCust, error: errCust } = await supabase
        .from('salesman_customer')
        .select('salesman_code, salesman_name')
        .ilike('salesman_code', codeToSearch)
        .limit(1);

      if (errCust) throw errCust;

      let matched: SalesmanSession | null = null;

      if (smCust && smCust.length > 0) {
        matched = {
          salesman_code: smCust[0].salesman_code,
          salesman_name: smCust[0].salesman_name
        };
      } else {
        // 2. Try finding in salesman_kpi
        const { data: smKpi, error: errKpi } = await supabase
          .from('salesman_kpi')
          .select('salesman_code, salesman_name')
          .ilike('salesman_code', codeToSearch)
          .limit(1);

        if (errKpi) throw errKpi;

        if (smKpi && smKpi.length > 0) {
          matched = {
            salesman_code: smKpi[0].salesman_code,
            salesman_name: smKpi[0].salesman_name
          };
        }
      }

      if (matched) {
        setSession(matched);
        localStorage.setItem('shared_retur_salesman', JSON.stringify(matched));
        showAlert(`Selamat datang, ${matched.salesman_name}!`, 'success');
      } else {
        showAlert('Kode Salesman tidak terdaftar dalam database.', 'error', 'Gagal Login');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      showAlert('Gagal melakukan verifikasi database.', 'error');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setSession(null);
    localStorage.removeItem('shared_retur_salesman');
    setCustomers([]);
    showAlert('Anda telah berhasil keluar dari sistem.', 'success');
  };

  const handleSaveReturn = async (formData: any) => {
    setSaving(true);
    try {
      // 1. If manual product, save to database_barang first
      if (formData.isManual) {
        const { error: prodError } = await supabase.from('database_barang').upsert({
          goods_code: formData.goods_code,
          goods_name: formData.goods_name,
          category: formData.category
        }, { onConflict: 'goods_code' });

        if (prodError) console.warn('Product exists or error saving manual product:', prodError);
        
        // Refresh product list internally
        setProducts(prev => {
          if (prev.find(p => p.goods_code === formData.goods_code)) return prev;
          return [...prev, { goods_code: formData.goods_code, goods_name: formData.goods_name }];
        });

        // Add to categories if new
        if (formData.category && !categories.includes(formData.category)) {
          setCategories(prev => [...prev, formData.category].sort());
        }
      }

      // 2. Save to retur_barang
      const { error } = await supabase.from('retur_barang').insert({
        customer_code: formData.customer_code,
        customer_name: formData.customer_name,
        return_date: formData.return_date,
        goods_code: formData.goods_code,
        goods_name: formData.goods_name,
        category: formData.category,
        qty: formData.qty,
        description: formData.description,
        status: 'Pending',
        salesman_code: isShared && session ? session.salesman_code : 'ADMIN'
      });

      if (error) throw error;

      showAlert('Data retur berhasil disimpan!', 'success');
      // Trigger history refresh
      setRefreshKey(prev => prev + 1);
    } catch (err) {
      console.error(err);
      showAlert('Gagal menyimpan data retur', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyLink = () => {
    const url = `https://kpi-monitoring-dashboard-670271053581.asia-southeast1.run.app/?view=retur-barang&shared=true`;
    navigator.clipboard.writeText(url);
    showAlert('Link halaman retur barang telah disalin dan siap dibagikan.', 'success', 'Tersalin!');
  };

  // If in shared mode and salesman is NOT logged in yet, render the beautiful, centered login form
  if (isShared && !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50/50 p-4 font-sans">
        <div className="w-full max-w-md bg-white p-8 rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/40 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-600/20 mb-2">
              <Package className="w-8 h-8 animate-bounce" />
            </div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Halaman Retur Salesman</h2>
            <p className="text-sm text-slate-500">Silakan masukkan kode salesman Anda untuk mengakses sistem pengembalian barang.</p>
          </div>
          
          <form onSubmit={(e) => { e.preventDefault(); handleLogin(salesmanCodeInput); }} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-sans">KODE SALESMAN</label>
              <div className="relative">
                <input 
                  type="text"
                  placeholder="Contoh: S01, S02, dll"
                  value={salesmanCodeInput}
                  onChange={(e) => setSalesmanCodeInput(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 font-sans text-slate-700 font-bold tracking-wider placeholder-slate-300 transition-all uppercase"
                  disabled={authLoading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {authLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Verifikasi & Masuk</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-12 pb-32 p-2">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Retur Barang</h1>
            {isShared && session && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-100 shrink-0">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                {session.salesman_name} ({session.salesman_code})
              </span>
            )}
          </div>
          <p className="text-slate-500 font-medium">Sistem Pengelolaan Pengembalian & Penukaran Barang (Retur)</p>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          {!isShared ? (
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 transition-all font-sans cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>Bagikan Link Halaman</span>
            </button>
          ) : (
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-bold shadow-sm transition-all font-sans cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Keluar Akun</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-slate-100 shadow-xl shadow-slate-200/20">
          <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
          <p className="text-slate-400 font-black text-xs uppercase tracking-widest block font-sans">Memuat database...</p>
        </div>
      ) : (
        <>
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <span className="w-1.5 h-6 bg-indigo-600 rounded-full"></span>
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Blok 1: Input Data</h2>
            </div>
            <ReturForm 
              customers={customers} 
              products={products} 
              categories={categories}
              onSubmit={handleSaveReturn} 
              loading={saving} 
            />
          </section>

          <section className="space-y-6 pt-12 border-t border-slate-100">
            <div className="flex items-center gap-3">
              <span className="w-1.5 h-6 bg-rose-500 rounded-full"></span>
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Blok 2: Riwayat Retur</h2>
            </div>
            <ReturHistory 
              key={refreshKey} 
              categories={categories} 
              isShared={isShared} 
              salesmanCode={isShared && session ? session.salesman_code : undefined}
            />
          </section>
        </>
      )}
    </div>
  );
}
