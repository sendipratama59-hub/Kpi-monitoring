import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { supabase } from '../../../services/supabase';
import { 
  Users, 
  Settings, 
  Printer, 
  Plus, 
  Trash2, 
  RefreshCcw, 
  Search,
  Eye,
  FileText,
  LayoutDashboard,
  Sparkles,
  ChevronRight,
  Download,
  ImageIcon,
  Save,
  CheckCircle2 as CheckIcon
} from 'lucide-react';
import { ReportView } from './ReportView';
import { cn } from '../../../utils/cn';
import { motion, AnimatePresence } from 'motion/react';
import { toPng } from 'html-to-image';
import { useAlert } from '../../ui/AlertModal';

interface Customer {
  customer_code: string;
  customer_name: string;
}

interface TargetItem {
  id: string;
  title: string;
  target: number;
  actual: number;
  reward: number;
  colorTheme: 'indigo' | 'rose' | 'amber' | 'emerald';
  isFromDb?: boolean;
}

export function CustomerTargetReport() {
  const { showAlert } = useAlert();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustCode, setSelectedCustCode] = useState('');
  const [selectedCustName, setSelectedCustName] = useState('');
  const [periode, setPeriode] = useState('');
  const [targets, setTargets] = useState<TargetItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [searchCustomer, setSearchCustomer] = useState('');
  const reportRef = React.useRef<HTMLDivElement>(null);

  // Set default periode
  useEffect(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const formatDate = (date: Date) => {
      return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
    };
    
    setPeriode(`${formatDate(firstDay)} - ${formatDate(lastDay)}`);
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (selectedCustCode) {
      fetchSavedTargets();
    }
  }, [selectedCustCode]);

  const fetchCustomers = async () => {
    setLoading(true);
    let allData: Customer[] = [];
    let from = 0;
    const limit = 1000;
    let hasMore = true;

    try {
      while (hasMore) {
        const { data, error } = await supabase
          .from('salesman_customer')
          .select('customer_code, customer_name')
          .order('customer_name')
          .range(from, from + limit - 1);
        
        if (error) throw error;
        if (data) {
          allData = [...allData, ...data];
          if (data.length < limit) {
            hasMore = false;
          } else {
            from += limit;
          }
        } else {
          hasMore = false;
        }
      }
      
      const unique = Array.from(new Set(allData.map(c => c.customer_code)))
        .map(code => allData.find(c => c.customer_code === code)!);
      setCustomers(unique);
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedTargets = async () => {
    if (!selectedCustCode) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('customer_kpi_targets')
        .select('*')
        .eq('customer_code', selectedCustCode)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        const savedTargets: TargetItem[] = data.map(item => ({
          id: item.id,
          title: item.title,
          target: item.target_value,
          actual: item.actual_value,
          reward: item.reward_projection,
          colorTheme: item.color_theme as any,
          isFromDb: true
        }));
        setTargets(savedTargets);
      } else {
        setTargets([]);
      }
    } catch (err) {
      console.error('Error loading saved targets:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTargets = async () => {
    if (!selectedCustCode) {
      showAlert('Silakan pilih customer terlebih dahulu.', 'warning');
      return;
    }

    setSaveLoading(true);
    try {
      const { error: deleteError } = await supabase
        .from('customer_kpi_targets')
        .delete()
        .eq('customer_code', selectedCustCode);

      if (deleteError) throw deleteError;

      if (targets.length > 0) {
        const toSave = targets.map(t => ({
          customer_code: selectedCustCode,
          title: t.title,
          target_value: t.target,
          actual_value: t.actual,
          reward_projection: t.reward,
          color_theme: t.colorTheme,
          period: periode
        }));

        const { error: insertError } = await supabase
          .from('customer_kpi_targets')
          .insert(toSave);

        if (insertError) throw insertError;
      }

      showAlert('Data target berhasil disimpan ke database!', 'success');
      fetchSavedTargets();
    } catch (err) {
      console.error('Error saving targets:', err);
      showAlert('Gagal menyimpan data ke database.', 'error');
    } finally {
      setSaveLoading(false);
    }
  };

  const addTarget = () => {
    const newTarget: TargetItem = {
      id: Math.random().toString(36).substr(2, 9),
      title: 'Target Baru',
      target: 0,
      actual: 0,
      reward: 0,
      colorTheme: 'indigo'
    };
    setTargets([...targets, newTarget]);
  };

  const removeTarget = (id: string) => {
    setTargets(targets.filter(t => t.id !== id));
  };

  const updateTarget = (id: string, field: keyof TargetItem, value: any) => {
    setTargets(targets.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const fetchActualData = async () => {
    if (!selectedCustCode) return;
    setLoading(true);
    
    try {
      const month = new Date().getMonth() + 1;
      const year = new Date().getFullYear();

      const [bulanan, spu, saved, dynamicApps] = await Promise.all([
        supabase.from('program_bulanan')
          .select('*')
          .eq('customer_code', selectedCustCode)
          .eq('period_month', month)
          .eq('period_year', year),
        supabase.from('program_spu')
          .select('*')
          .eq('customer_code', selectedCustCode)
          .eq('period_month', month)
          .eq('period_year', year),
        supabase.from('customer_kpi_targets')
          .select('*')
          .eq('customer_code', selectedCustCode),
        supabase.from('dynamic_apps').select('*')
      ]);

      // Create a map to merge by title
      const targetMap = new Map<string, TargetItem>();

      // 1. Add saved targets first (manual entries or previously saved overrides)
      if (saved.data) {
        saved.data.forEach((item: any) => {
          targetMap.set(item.title, {
            id: item.id,
            title: item.title,
            target: item.target_value || 0,
            actual: item.actual_value || 0,
            reward: item.reward_projection || 0,
            colorTheme: (item.color_theme as any) || 'indigo',
            isFromDb: true
          });
        });
      }

      // 2. Process Live Bulanan data
      if (bulanan.data) {
        bulanan.data.forEach((item: any) => {
          const title = `TARGET BULANAN (${item.salesman_name || 'BASIC'})`;
          const existing = targetMap.get(title);
          
          if (existing) {
            // Update actual value from live data, keep other saved configs
            targetMap.set(title, {
              ...existing,
              actual: item.customer_achieve || 0
            });
          } else {
            targetMap.set(title, {
              id: Math.random().toString(36).substr(2, 9),
              title,
              target: item.customer_targets || 0,
              actual: item.customer_achieve || 0,
              reward: 0,
              colorTheme: 'indigo'
            });
          }
        });
      }

      // 3. Process Live SPU data
      if (spu.data) {
        spu.data.forEach((item: any) => {
          const title = `TARGET SPU (${item.salesman_name || 'PROGRAM'})`;
          const existing = targetMap.get(title);
          
          if (existing) {
            // Update actual value from live data, keep other saved configs
            targetMap.set(title, {
              ...existing,
              actual: item.customer_achieve || 0
            });
          } else {
            targetMap.set(title, {
              id: Math.random().toString(36).substr(2, 9),
              title,
              target: item.customer_targets || 0,
              actual: item.customer_achieve || 0,
              reward: 0,
              colorTheme: 'rose'
            });
          }
        });
      }

      // 4. Process Dynamic Excel Data
      if (dynamicApps.data && dynamicApps.data.length > 0) {
        for (const app of dynamicApps.data) {
          const cols: string[] = app.config?.columns || [];
          
          // Heuristics for finding relevant columns
          const custCol = cols.find(c => /kode|cust|toko/i.test(c)) || cols[0];
          const targetCol = cols.find(c => /target/i.test(c));
          const actualCol = cols.find(c => /actual|pencapaian|achieve|realisasi|hasil/i.test(c));
          const rewardCol = cols.find(c => /reward|bonus|insentif/i.test(c));
          const titleCol = cols.find(c => /program|title|nama|kpi|kategori/i.test(c));

          if (custCol) {
            // Fetch dynamically using exact match via Supabase JSONB filtering
            // Note: Since excel data might be numbers, we query using ->> which gets it as text and compare it as text.
            const { data: dRows } = await supabase.from('dynamic_data')
              .select('data')
              .eq('app_id', app.id)
              .filter(`data->>${custCol}`, 'eq', selectedCustCode);

            if (dRows) {
              dRows.forEach((row: any) => {
                const rowData = row.data;
                // Construct Title from title column or app name
                const displayTitle = titleCol && rowData[titleCol] ? `${app.name} (${rowData[titleCol]})` : app.name;
                const dynamicTitle = displayTitle.toUpperCase();
                
                const existing = targetMap.get(dynamicTitle);
                
                // Parse values safely
                const tTarget = targetCol ? (parseFloat(rowData[targetCol]) || 0) : 0;
                const tActual = actualCol ? (parseFloat(rowData[actualCol]) || 0) : 0;
                const tReward = rewardCol ? (parseFloat(rowData[rewardCol]) || 0) : 0;

                if (existing) {
                  targetMap.set(dynamicTitle, {
                    ...existing,
                    target: tTarget > 0 ? tTarget : existing.target,
                    actual: tActual > 0 ? tActual : existing.actual,
                    reward: tReward > 0 ? tReward : existing.reward,
                  });
                } else {
                  targetMap.set(dynamicTitle, {
                    id: Math.random().toString(36).substr(2, 9),
                    title: dynamicTitle,
                    target: tTarget,
                    actual: tActual,
                    reward: tReward,
                    colorTheme: 'emerald' // Highlight dynamic data
                  });
                }
              });
            }
          }
        }
      }

      const mergedTargets = Array.from(targetMap.values());

      if (mergedTargets.length > 0) {
        setTargets(mergedTargets);
        if (bulanan.data?.length === 0 && spu.data?.length === 0 && saved.data?.length === 0) {
           showAlert('Tidak ditemukan data apapun untuk customer ini.', 'info');
        }
      } else {
        showAlert('Tidak ditemukan data otomatis maupun manual untuk customer ini.', 'info');
      }
    } catch (err) {
      console.error(err);
      showAlert('Terjadi kesalahan saat sinkronisasi data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadImage = async () => {
    if (!reportRef.current) return;
    
    setLoading(true);
    try {
      const dataUrl = await toPng(reportRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        style: {
          transform: 'scale(1)',
        }
      });
      
      const link = document.createElement('a');
      link.download = `Report-${selectedCustName || 'Customer'}-${new Date().getTime()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error downloading image:', err);
      showAlert('Gagal mendownload gambar. Silakan coba lagi.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.customer_name.toLowerCase().includes(searchCustomer.toLowerCase()) ||
    c.customer_code.toLowerCase().includes(searchCustomer.toLowerCase())
  );

  return (
    <div className={cn("space-y-12 pb-32 transition-all duration-500 w-full p-2")}>
      {/* Header Section */}
      <div className={cn("flex flex-col md:flex-row justify-between items-start md:items-center gap-8 pt-8", showPreview && "px-4 md:px-12 lg:px-20")}>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-indigo-600">
            <Sparkles className="w-5 h-5" />
            <span className="text-xs font-black uppercase tracking-[0.3em]">Smart Reporting</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 uppercase leading-none">
            Analisis <span className="text-indigo-600">Pelanggan</span>
          </h2>
          <p className="text-slate-500 font-medium italic">Pantau pencapaian target dan estimasi reward secara real-time.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            onClick={() => setShowPreview(!showPreview)}
            className={cn(
              "px-8 py-6 rounded-xl font-black uppercase text-xs tracking-widest transition-all",
              showPreview ? "bg-slate-900 text-white hover:bg-slate-800" : "bg-white border-2 border-slate-200 text-slate-600 hover:border-indigo-300"
            )}
          >
            {showPreview ? <LayoutDashboard className="w-5 h-5 mr-3" /> : <Eye className="w-5 h-5 mr-3" />}
            {showPreview ? 'Ubah Data' : 'Pratinjau'}
          </Button>
          {showPreview && (
            <div className="flex items-center gap-3">
              <Button 
                onClick={handleDownloadImage} 
                disabled={loading}
                className="px-8 py-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-emerald-200"
              >
                {loading ? <RefreshCcw className="w-5 h-5 mr-3 animate-spin" /> : <ImageIcon className="w-5 h-5 mr-3" />}
                Simpan Gambar
              </Button>
              <Button onClick={handlePrint} className="px-8 py-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-200">
                <Printer className="w-5 h-5 mr-3" />
                Cetak
              </Button>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!showPreview ? (
          <motion.div 
            key="config"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-10"
          >
            {/* Config Panel */}
            <div className="lg:col-span-4 space-y-8">
              <Card className="rounded-xl border-slate-200 shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50/50 p-8 border-b border-slate-100">
                  <div className="flex items-center gap-3 mb-2">
                    <Users className="w-5 h-5 text-indigo-500" />
                    <CardTitle className="text-xl font-black text-slate-800 uppercase tracking-tight">Identitas</CardTitle>
                  </div>
                  <CardDescription className="text-slate-500 font-medium italic">Pilih customer dan atur periode pelaporan.</CardDescription>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Cari Customer</label>
                      <span className="text-[9px] font-bold text-indigo-500 bg-indigo-50 px-3 py-1 rounded-lg uppercase">
                        {loading && customers.length === 0 ? 'Syncing...' : `${customers.length} Member`}
                      </span>
                    </div>
                    <div className="relative group">
                      <Search className="w-5 h-5 absolute left-4 top-3.5 text-slate-300 group-focus-within:text-indigo-400 transition-colors" />
                      <input 
                        type="text"
                        placeholder="Cari nama atau kode..."
                        value={searchCustomer}
                        onChange={(e) => setSearchCustomer(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all text-sm font-bold text-slate-700"
                      />
                    </div>
                    <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-100 bg-white shadow-inner divide-y divide-slate-50 scrollbar-thin scrollbar-thumb-slate-200">
                      {filteredCustomers.length === 0 ? (
                        <div className="p-10 text-center text-slate-400 italic text-sm">Tidak ditemukan</div>
                      ) : (
                        filteredCustomers.map((c) => (
                          <motion.button
                            whileHover={{ backgroundColor: '#f8fafc' }}
                            key={c.customer_code}
                            onClick={() => {
                              setSelectedCustCode(c.customer_code);
                              setSelectedCustName(c.customer_name);
                              setSearchCustomer(c.customer_name);
                            }}
                            className={cn(
                              "w-full text-left px-5 py-4 transition-all flex items-center justify-between",
                              selectedCustCode === c.customer_code ? "bg-indigo-50/50 border-l-4 border-indigo-500" : ""
                            )}
                          >
                            <div className="space-y-0.5">
                              <div className={cn("text-sm font-black tracking-tight", selectedCustCode === c.customer_code ? "text-indigo-700" : "text-slate-700")}>
                                {c.customer_name}
                              </div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{c.customer_code}</div>
                            </div>
                            {selectedCustCode === c.customer_code && <ChevronRight className="w-4 h-4 text-indigo-500" />}
                          </motion.button>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Periode Laporan</label>
                    <input 
                      type="text"
                      value={periode}
                      onChange={(e) => setPeriode(e.target.value)}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all text-sm font-bold text-slate-700"
                      placeholder="contoh: 1/5/2026 - 31/5/2026"
                    />
                  </div>

                  <div className="pt-4 space-y-3">
                    <Button 
                      className="w-full py-8 bg-[#1e293b] hover:bg-slate-800 text-white rounded-xl font-black uppercase text-xs tracking-[0.2em] shadow-lg transition-transform hover:-translate-y-1 active:translate-y-0"
                      onClick={fetchActualData}
                      disabled={!selectedCustCode || loading}
                    >
                      {loading ? <RefreshCcw className="w-5 h-5 mr-3 animate-spin" /> : <RefreshCcw className="w-5 h-5 mr-3" />}
                      Sync Data Otomatis
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-xl bg-indigo-50 border-indigo-100 p-8 space-y-4">
                <div className="flex items-center gap-3 text-indigo-600">
                  <Save className="w-6 h-6" />
                  <h4 className="text-xl font-black uppercase tracking-tight">Simpan Data</h4>
                </div>
                <p className="text-sm font-medium text-indigo-900/60 leading-relaxed italic">
                  Klik simpan agar input manual target untuk pelanggan ini tersimpan permanen di database.
                </p>
                <Button 
                  onClick={handleSaveTargets}
                  disabled={!selectedCustCode || saveLoading}
                  className="w-full py-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-100"
                >
                  {saveLoading ? <RefreshCcw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  {saveLoading ? 'Menyimpan...' : 'Simpan ke Database'}
                </Button>
              </Card>
            </div>

            {/* Targets List */}
            <div className="lg:col-span-8 space-y-8">
              <Card className="rounded-xl border-slate-200 shadow-sm min-h-[600px]">
                <CardHeader className="p-8 border-b border-slate-100 flex flex-row items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-xl font-black text-slate-800 uppercase tracking-tight">Indikator Terpilih</CardTitle>
                    <CardDescription className="text-slate-500 font-medium italic">Visualisasi metrik pencapaian target customer.</CardDescription>
                  </div>
                  <Button 
                    onClick={addTarget}
                    className="bg-white border-2 border-indigo-100 text-indigo-600 hover:bg-indigo-50 font-black uppercase text-[10px] tracking-widest h-12 px-6 rounded-xl shadow-sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Tambah Manual
                  </Button>
                </CardHeader>
                <CardContent className="p-8">
                  <AnimatePresence mode="popLayout">
                    {targets.length === 0 ? (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-32 text-center"
                      >
                        <div className="w-20 h-20 bg-slate-50 rounded-xl flex items-center justify-center mb-6">
                           <LayoutDashboard className="w-10 h-10 text-slate-200" />
                        </div>
                        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.4em] mb-2">Workspace Kosong</p>
                        <p className="text-slate-300 italic text-sm mb-6">Belum ada target yang dikonfigurasi.</p>
                        <Button 
                          onClick={addTarget}
                          variant="ghost" 
                          className="text-indigo-500 font-black uppercase text-xs tracking-widest hover:bg-indigo-50 rounded-lg"
                        >
                          Mulai Data Baru
                        </Button>
                      </motion.div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {targets.map((item, index) => (
                          <motion.div 
                            key={item.id}
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="p-8 bg-white border border-slate-100 rounded-xl relative group border-2 hover:border-indigo-100 transition-all hover:shadow-[0_15px_30px_-5px_rgba(79,70,229,0.05)]"
                          >
                            <div className="flex flex-col gap-6">
                              <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Indikator</label>
                                  {item.isFromDb && (
                                    <span className="flex items-center gap-1 text-[9px] font-black text-emerald-500 uppercase tracking-widest">
                                      <CheckIcon className="w-3 h-3" /> Dari Database
                                    </span>
                                  )}
                                </div>
                                <input 
                                  type="text"
                                  value={item.title}
                                  onChange={(e) => updateTarget(item.id, 'title', e.target.value)}
                                  className="w-full px-0 py-1 bg-transparent border-0 border-b-2 border-slate-100 focus:ring-0 focus:border-indigo-500 transition-all text-lg font-black text-slate-800 placeholder:text-slate-200"
                                  placeholder="Nama Program/KPI..."
                                />
                              </div>

                              <div className="space-y-6">
                                <div className="space-y-2">
                                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Target</label>
                                  <input 
                                    type="number"
                                    value={item.target}
                                    onChange={(e) => updateTarget(item.id, 'target', parseFloat(e.target.value) || 0)}
                                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-lg text-lg font-black text-slate-700 focus:bg-white focus:border-indigo-200 transition-all"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Aktual</label>
                                  <input 
                                    type="number"
                                    value={item.actual}
                                    onChange={(e) => updateTarget(item.id, 'actual', parseFloat(e.target.value) || 0)}
                                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-lg text-lg font-black text-slate-700 focus:bg-white focus:border-indigo-200 transition-all"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Warna Tema</label>
                                  <select
                                    value={item.colorTheme}
                                    onChange={(e) => updateTarget(item.id, 'colorTheme', e.target.value)}
                                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-lg text-xs font-black text-slate-700 uppercase focus:bg-white focus:border-indigo-200 transition-all"
                                  >
                                    <option value="indigo">Indigo</option>
                                    <option value="rose">Rose</option>
                                    <option value="amber">Amber</option>
                                    <option value="emerald">Emerald</option>
                                  </select>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Proyeksi Reward</label>
                                <div className="relative">
                                  <input 
                                    type="number"
                                    value={item.reward}
                                    onChange={(e) => updateTarget(item.id, 'reward', parseFloat(e.target.value) || 0)}
                                    className="w-full px-4 py-4 bg-indigo-50/30 border border-indigo-100 rounded-lg text-xl font-black text-indigo-600 focus:ring-0"
                                  />
                                </div>
                              </div>
                            </div>

                            <button 
                              onClick={() => removeTarget(item.id)} 
                              className="absolute -top-3 -right-3 w-10 h-10 bg-white border-2 border-slate-100 rounded-lg shadow-xl flex items-center justify-center text-slate-300 hover:text-rose-500 hover:border-rose-100 transition-all opacity-0 group-hover:opacity-100 transform rotate-12 group-hover:rotate-0"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                            
                            <div className="absolute bottom-4 right-6 text-[10px] font-black text-slate-50 pointer-events-none select-none uppercase tracking-[0.2em]">
                               Record #{index + 1}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="preview"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="pb-20 no-print"
          >
            <div className="mb-12 flex justify-center sticky top-8 z-50">
               <motion.div 
                initial={{ y: -20 }}
                animate={{ y: 0 }}
                className="bg-[#1e293b]/90 backdrop-blur-2xl px-10 py-5 rounded-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center gap-8"
               >
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">Mode Intelijen Live</p>
                  </div>
                  <div className="w-px h-6 bg-white/10" />
                  <div className="flex flex-col">
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Fokus Aktif</p>
                    <p className="text-xs font-black text-white uppercase">{selectedCustName || 'Pelanggan Anonim'}</p>
                  </div>
                  <div className="w-px h-6 bg-white/10" />
                  <Button 
                    variant="ghost" 
                    onClick={() => setShowPreview(false)}
                    className="text-white hover:bg-white/10 font-black uppercase text-[10px] tracking-widest"
                  >
                    Ubah Data
                  </Button>
               </motion.div>
            </div>
            
            <div ref={reportRef}>
              <ReportView 
                customerName={selectedCustName || 'NAMA CUSTOMER'}
                periodeRange={periode || '1/5/2026 - 31/5/2026'}
                targets={targets}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Print Styles */}
      <style>{`
        @media print {
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          #root > div {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: none !important;
          }
          /* Ensure text colors are preserved in print */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
}
