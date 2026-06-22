import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { supabase } from '../../../services/supabase';
import { 
  Users, 
  Search, 
  MapPin, 
  Clock, 
  Target, 
  TrendingDown, 
  Calendar,
  AlertCircle,
  Stethoscope,
  Filter,
  Loader2,
  ChevronRight,
  TrendingUp,
  Award,
  Package,
  X
} from 'lucide-react';
import { parseISO, getDay, isSameMonth, subMonths, format, startOfMonth } from 'date-fns';
import { NotaModal } from '../CustomerAnalysis/NotaModal';

interface RecommendationReason {
  text: string;
  type: 'general' | 'program_bulanan' | 'program_spu' | 'dynamic_target' | 'piutang_overdue' | 'product_recommendation';
  target?: number;
  achieve?: number;
  overdues?: any[];
  products?: any[];
}

interface VisitRecommendation {
  customer_code: string;
  customer_name: string;
  salesman_name: string;
  reasons: RecommendationReason[];
  priorityScore: number;
  lastOrderDate: string | null;
  mtdOmset: number;
  lastMonthOmset: number;
  recommendedDay: string;
}

const DAYS_NAME = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export function VisitPlanning() {
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<VisitRecommendation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [salesmanList, setSalesmanList] = useState<string[]>([]);
  const [selectedSalesman, setSelectedSalesman] = useState<string>('all');
  const [totalCustomers, setTotalCustomers] = useState<number>(0);
  const [selectedPiutang, setSelectedPiutang] = useState<any>(null);
  const [selectedProductsModal, setSelectedProductsModal] = useState<{ isOpen: boolean, products: any[], customerInfo: string }>({ isOpen: false, products: [], customerInfo: '' });

  useEffect(() => {
    // Generate initial plan
    generatePlan();
  }, []);

  const generatePlan = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const currentMonth = startOfMonth(now);
      const lastMonth = startOfMonth(subMonths(now, 1));
      const todayIdx = getDay(now);

      // Fetch cust mapped to salesman
      let hasMore = true;
      let from = 0;
      let allCust: any[] = [];
      while(hasMore) {
        const { data } = await supabase.from('salesman_customer').select('customer_code, customer_name, salesman_name').range(from, from + 999);
        if(data && data.length > 0) {
          allCust = [...allCust, ...data];
          if(data.length < 1000) hasMore = false;
          else from += 1000;
        } else {
          hasMore = false;
        }
      }
      setTotalCustomers(allCust.length);

      // Unique salesman list
      const uniqueSalesmen = Array.from(new Set(allCust.map(c => c.salesman_name).filter(Boolean)));
      setSalesmanList(uniqueSalesmen as string[]);

      // Fetch recent KPI data (last 3 months for better repeat tracking)
      const threeMonthsAgoStr = format(startOfMonth(subMonths(now, 3)), 'yyyy-MM-01');
      hasMore = true;
      from = 0;
      let allKpi: any[] = [];
      while(hasMore) {
        const { data } = await supabase
          .from('salesman_kpi')
          .select('customer_code, customer_name, order_date, total_amount, salesman_name, category, goods_name, qty, delivery_no')
          .gte('order_date', threeMonthsAgoStr)
          .range(from, from + 999);
        if(data && data.length > 0) {
          allKpi = [...allKpi, ...data];
          if(data.length < 1000) hasMore = false;
          else from += 1000;
        } else {
          hasMore = false;
        }
      }

      // Map data by customer_code
      const custStats: Record<string, any> = {};
      const currentMonthDeliverySet = new Set<string>();

      allKpi.forEach(kpi => {
         const code = kpi.customer_code;
         if(!code) return;
         if(!custStats[code]) {
           custStats[code] = {
             customer_name: kpi.customer_name,
             salesman_name: kpi.salesman_name,
             orders: [],
             products: {},
             mtdOmset: 0,
             lastMonthOmset: 0,
             dayFreq: new Array(7).fill(0)
           };
         }
         
         if (!kpi.order_date) return;
         const d = parseISO(kpi.order_date);
         custStats[code].orders.push(d);
         const day = getDay(d);
         if(isSameMonth(d, currentMonth)) {
             custStats[code].mtdOmset += (kpi.total_amount || 0);
             if (kpi.delivery_no) {
                 currentMonthDeliverySet.add(String(kpi.delivery_no).trim().toUpperCase());
             }
         }
         if(isSameMonth(d, lastMonth)) custStats[code].lastMonthOmset += (kpi.total_amount || 0);
         custStats[code].dayFreq[day]++;
         
         if (kpi.goods_name) {
           const pName = kpi.goods_name;
           if (!custStats[code].products[pName]) {
             custStats[code].products[pName] = { lastOrder: d, count: 0, category: kpi.category || '', totalQty: 0, totalOmset: 0 };
           }
           if (d > custStats[code].products[pName].lastOrder) {
             custStats[code].products[pName].lastOrder = d;
           }
           custStats[code].products[pName].count++;
           custStats[code].products[pName].totalQty += (Number(kpi.qty) || 0);
           custStats[code].products[pName].totalOmset += (Number(kpi.total_amount) || 0);
         }
      });

      // Let's also fetch Program Bulanan to see who has gaps
      const { data: programData } = await supabase
         .from('program_bulanan')
         .select('customer_code, customer_targets, customer_achieve')
         .eq('period_month', parseInt(format(now, 'MM')))
         .eq('period_year', parseInt(format(now, 'yyyy')));

      const programMap: Record<string, any> = {};
      programData?.forEach(p => {
        if(p.customer_code) programMap[p.customer_code] = p;
      });

      // Let's also fetch Program SPU to see who has gaps
      const { data: programSpuData } = await supabase
         .from('program_spu')
         .select('customer_code, customer_targets, customer_achieve')
         .eq('period_month', parseInt(format(now, 'MM')))
         .eq('period_year', parseInt(format(now, 'yyyy')));

      const programSpuMap: Record<string, any> = {};
      programSpuData?.forEach(p => {
        if(p.customer_code) programSpuMap[p.customer_code] = p;
      });

      // Let's also fetch Dynamic Excel Manager tables
      const { data: dynamicAppsData } = await supabase
        .from('dynamic_apps')
        .select('id, name, config');
        
      // Let's also fetch Piutang to recommend overdue prevention
      let piutangOverdueData: any[] = [];
      let pHasMore = true;
      let pFrom = 0;
      while (pHasMore) {
        const { data } = await supabase
          .from('piutang_customer')
          .select('customer_code, customer_name, due_date, delivery_no, total_amount, salesman_name')
          .gte('due_date', 5)
          .lte('due_date', 7)
          .range(pFrom, pFrom + 999);
        if (data && data.length > 0) {
          piutangOverdueData = [...piutangOverdueData, ...data];
          if (data.length < 1000) pHasMore = false;
          else pFrom += 1000;
        } else {
          pHasMore = false;
        }
      }

      const piutangMap: Record<string, any[]> = {};
      piutangOverdueData.forEach(p => {
        if(p.customer_code && p.due_date != null && p.delivery_no) {
           // ONLY include if this delivery_no is from the CURRENT month's KPI data
           if (!currentMonthDeliverySet.has(String(p.delivery_no).trim().toUpperCase())) return;

           if (!piutangMap[p.customer_code]) piutangMap[p.customer_code] = [];
           
           const existing = piutangMap[p.customer_code].find((item: any) => item.delivery_no === p.delivery_no && item.delivery_no);
           if (existing) {
             existing.total_amount = (Number(existing.total_amount) || 0) + (Number(p.total_amount) || 0);
           } else {
             piutangMap[p.customer_code].push({ ...p, total_amount: Number(p.total_amount) || 0 });
           }
        }
      });
        
      const currentMonthInt = parseInt(format(now, 'MM'));
      const currentYearInt = parseInt(format(now, 'yyyy'));
      
      const relevantDynamicApps = (dynamicAppsData || []).filter(app => {
        if (app.config?.periodMonth && app.config?.periodYear) {
          return app.config.periodMonth === currentMonthInt && app.config.periodYear === currentYearInt;
        }
        return true; 
      });

      const dynamicSources: { [k: string]: any[] } = {};
      for (const app of relevantDynamicApps) {
        let hasMoreData = true;
        let dFrom = 0;
        let appRows: any[] = [];
        while (hasMoreData) {
          const { data: dData } = await supabase
            .from('dynamic_data')
            .select('data')
            .eq('app_id', app.id)
            .range(dFrom, dFrom + 999);
            
          if (dData && dData.length > 0) {
            appRows = [...appRows, ...dData.map(d => d.data)];
            if (dData.length < 1000) hasMoreData = false;
            else dFrom += 1000;
          } else {
            hasMoreData = false;
          }
        }
        dynamicSources[app.name] = appRows;
      }

      const getPossibleKey = (obj: any, matches: string[]) => {
        if (!obj) return undefined;
        const keys = Object.keys(obj);
        return keys.find(k => matches.some(m => k.toLowerCase().replace(/[^a-z0-9]/g, '').includes(m.toLowerCase().replace(/[^a-z0-9]/g, ''))));
      };
      
      const custMatches = ['customercode', 'kodecustomer', 'idcustomer', 'kdtoko', 'kodetoko', 'noac', 'accountnumber', 'kode', 'customer', 'toko'];
      const targetMatches = ['target', 'goal', 'kuota', 'quota'];
      const achieveMatches = ['achieve', 'pencapaian', 'aktual', 'actual', 'sales', 'realisasi', 'realization', 'hasil'];

       const recs: VisitRecommendation[] = [];

      // Combine with allCust to ensure even those who haven't bought are considered.
      allCust.forEach(c => {
         if(!c.customer_code) return;
         const stat = custStats[c.customer_code];
         let priority = 0;
         let reasons: RecommendationReason[] = [];
         let bestDayIdx = 1;
         
         // Check Dynamic Excel Data for this customer
         Object.keys(dynamicSources).forEach(appName => {
            const rows = dynamicSources[appName];
            if(!rows.length) return;
            const firstRow = rows[0];
            const custKey = getPossibleKey(firstRow, custMatches);
            if (!custKey) return; 
            
            const targetKey = getPossibleKey(firstRow, targetMatches);
            const achieveKey = getPossibleKey(firstRow, achieveMatches);
            
            const row = rows.find(r => String(r[custKey]).trim().toLowerCase() === String(c.customer_code).trim().toLowerCase());
            if (row) {
               let t = targetKey ? parseFloat(String(row[targetKey]).replace(/[^\d.-]/g, '')) : 0;
               let a = achieveKey ? parseFloat(String(row[achieveKey]).replace(/[^\d.-]/g, '')) : 0;
               
               if (isNaN(t)) t = 0;
               if (isNaN(a)) a = 0;
               
               if (targetKey && achieveKey) {
                  if (t > 0 && a < t) {
                     priority += 4;
                     reasons.push({ type: 'dynamic_target', text: `Target: ${appName}`, target: t, achieve: a });
                  }
               } else if (targetKey) {
                  if (t > 0) {
                     priority += 3;
                     reasons.push({ type: 'general', text: `Sisa Target ${appName}: ${t.toLocaleString()}` });
                  }
               } else {
                  priority += 3;
                  reasons.push({ type: 'general', text: `Termasuk dalam Program: ${appName}` });
               }
            }
         });

         if(stat) {
           let max = 0;
           stat.dayFreq.forEach((v: number, i: number) => {
             if(v > max && i !== 0) { // skip sunday
               max = v;
               bestDayIdx = i;
             }
           });

           if(bestDayIdx === todayIdx) {
              priority += 3;
              reasons.push({ type: 'general', text: `Histori Sering Order di Hari ${DAYS_NAME[todayIdx]}` });
           }

           if(stat.lastMonthOmset > 0 && stat.mtdOmset === 0 && now.getDate() > 7) {
              priority += 4;
              reasons.push({ type: 'general', text: 'Bulan Lalu Aktif, MTD Masih Kosong (Potensi Order)' });
           } else if(stat.lastMonthOmset > 0 && stat.mtdOmset < stat.lastMonthOmset * 0.5 && now.getDate() > 15) {
              priority += 2;
              reasons.push({ type: 'general', text: 'Omset MTD Drop > 50% dari Bulan Lalu' });
           }

           // Check Program Bulanan target
           const prog = programMap[c.customer_code];
           
           // Check Piutang
           if (piutangMap[c.customer_code] && piutangMap[c.customer_code].length > 0) {
              // Filter to get only overdues between 5 and 7
              const targetedOverdues = piutangMap[c.customer_code].filter(p => (p.due_date || 0) >= 5 && (p.due_date || 0) <= 7);
              
              if (targetedOverdues.length > 0) {
                 const maxDue = Math.max(...targetedOverdues.map(p => p.due_date || 0));
                 priority += 4;
                 reasons.push({ 
                   type: 'piutang_overdue', 
                   text: `Terdapat ${targetedOverdues.length} Nota Hampir Overdue (Maks Umur ${maxDue} Hari)`,
                   overdues: targetedOverdues
                 });
              }
           }
           if(prog && prog.customer_targets > 0 && prog.customer_achieve < prog.customer_targets) {
              priority += 5;
              reasons.push({
                type: 'program_bulanan',
                text: 'Kejar Target Program Bulanan',
                target: prog.customer_targets,
                achieve: prog.customer_achieve
              });
           }

           // Check Program SPU target
           const progSpu = programSpuMap[c.customer_code];
           if(progSpu && progSpu.customer_targets > 0 && progSpu.customer_achieve < progSpu.customer_targets) {
              priority += 4;
              reasons.push({
                type: 'program_spu',
                text: 'Kejar Target Program SPU',
                target: progSpu.customer_targets,
                achieve: progSpu.customer_achieve
              });
           }

           // Check for product restock opportunities
           if (stat.products) {
              const prodItems = Object.entries(stat.products).map(([name, data]: [string, any]) => ({ name, ...data }));
              const frequentProds = prodItems.filter((p: any) => p.count >= 2); // Ordered at least twice
              
              frequentProds.sort((a, b) => b.count - a.count);
              
              const suggestions = [];
              const recommendedProductsList = [];
              
              for (const p of frequentProds) {
                 const daysSinceLast = Math.floor((now.getTime() - p.lastOrder.getTime()) / (1000 * 3600 * 24));
                 if (daysSinceLast >= 14 && daysSinceLast <= 90) {
                     suggestions.push(`${p.name} (${daysSinceLast} hr)`);
                     recommendedProductsList.push({
                        ...p,
                        daysSinceLast
                     });
                 }
              }
              
              if (suggestions.length > 0) {
                  priority += 2;
                  reasons.push({ 
                      type: 'product_recommendation', 
                      text: `Potensi Repeat Order: ${suggestions.slice(0, 3).join(', ')}${suggestions.length > 3 ? ` dan ${suggestions.length - 3} lainnya` : ''}`,
                      products: recommendedProductsList 
                  });
              }
           }

           if(priority > 0) {
             const sortedOrders = stat.orders.sort((a: any, b: any) => b.getTime() - a.getTime());
             recs.push({
               customer_code: c.customer_code,
               customer_name: c.customer_name || stat.customer_name,
               salesman_name: c.salesman_name || stat.salesman_name,
               reasons,
               priorityScore: priority,
               lastOrderDate: sortedOrders.length > 0 ? format(sortedOrders[0], 'yyyy-MM-dd') : null,
               mtdOmset: stat.mtdOmset,
               lastMonthOmset: stat.lastMonthOmset,
               recommendedDay: DAYS_NAME[bestDayIdx]
             });
           }
         } else {
           // Idle customer
           priority += 1;
           reasons.push({ type: 'general', text: 'Customer Idle (> 2 Bulan tidak order)' });
           recs.push({
             customer_code: c.customer_code,
             customer_name: c.customer_name,
             salesman_name: c.salesman_name,
             reasons,
             priorityScore: priority,
             lastOrderDate: null,
             mtdOmset: 0,
             lastMonthOmset: 0,
             recommendedDay: 'Senin'
           });
         }
      });

      // Sort by priorityDESC
      recs.sort((a, b) => b.priorityScore - a.priorityScore);
      setRecommendations(recs);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecs = recommendations.filter(r => {
    if(selectedSalesman !== 'all' && r.salesman_name !== selectedSalesman) return false;
    if(searchTerm) {
       const term = searchTerm.toLowerCase();
       return r.customer_name.toLowerCase().includes(term) || r.customer_code.toLowerCase().includes(term);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <Card className="bg-white/70 backdrop-blur-md border-indigo-100 shadow-xl">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-1 flex-1">
              <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-indigo-500" /> Executive Visit Plan
                {totalCustomers > 0 && (
                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                    {totalCustomers} Customer Terload
                  </span>
                )}
              </h2>
              <p className="text-sm font-bold text-slate-500">
                Rekomendasi kunjungan prioritas hari ini berdasarkan analisis AI terhadap habit dan target customer.
              </p>
            </div>
            <Button 
               onClick={generatePlan}
               className="bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-lg h-12 px-6"
            >
              {loading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Clock className="w-5 h-5 mr-2" />}
              GENERATE PLAN HARI INI
            </Button>
          </div>
          
          <div className="mt-6 flex flex-col sm:flex-row gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
             <div className="flex-1 relative">
               <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
               <input 
                 type="text"
                 placeholder="Cari Customer..."
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 ring-1 ring-slate-100 focus:ring-2 focus:ring-indigo-500/20 transition-all"
               />
             </div>
             <div className="flex-1 relative">
               <Filter className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
               <select 
                 value={selectedSalesman}
                 onChange={(e) => setSelectedSalesman(e.target.value)}
                 className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 ring-1 ring-slate-100 focus:ring-2 focus:ring-indigo-500/20 transition-all appearance-none"
               >
                 <option value="all">Semua Salesman</option>
                 {salesmanList.map(s => (
                   <option key={s} value={s}>{s}</option>
                 ))}
               </select>
             </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
          <p className="mt-4 text-sm font-bold text-slate-500 animate-pulse tracking-widest uppercase">Menganalisa Data KPI & Customer...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecs.slice(0, 30).map((rec, i) => (
             <Card key={i} className="bg-white border-slate-100 shadow-xl overflow-hidden hover:shadow-2xl transition-shadow group flex flex-col">
               <div className={'h-2 w-full ' + (
                 rec.priorityScore >= 5 ? 'bg-rose-500' :
                 rec.priorityScore >= 3 ? 'bg-amber-500' : 'bg-indigo-500'
               )} />
               <CardContent className="p-6 flex-1 flex flex-col">
                 <div className="flex justify-between items-start mb-4">
                   <div className="space-y-1">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{rec.customer_code}</p>
                     <h3 className="text-sm font-black text-slate-800 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                       {rec.customer_name}
                     </h3>
                     <div className="flex items-center gap-1.5 pt-1">
                       <Users className="w-3 h-3 text-slate-400" />
                       <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                         {rec.salesman_name || 'Unassigned'}
                       </span>
                     </div>
                   </div>
                   <div className={'shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-black text-lg shadow-inner ' + (
                     rec.priorityScore >= 5 ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                     rec.priorityScore >= 3 ? 'bg-amber-50 text-amber-600 border border-amber-100' : 
                     'bg-indigo-50 text-indigo-600 border border-indigo-100'
                   )}>
                     P{rec.priorityScore}
                   </div>
                 </div>

                 <div className="space-y-4 flex-1">
                   <p className="text-xs font-black text-slate-800 border-b border-slate-100 pb-2">Pemicu Rekomendasi:</p>
                   <ul className="space-y-3">
                     {[...rec.reasons].sort((a, b) => {
                       const getOrder = (type: string) => {
                         if (type === 'piutang_overdue') return 1;
                         if (type === 'dynamic_target') return 2;
                         if (type === 'program_bulanan') return 3;
                         if (type === 'program_spu') return 4;
                         return 5;
                       };
                       return getOrder(a.type) - getOrder(b.type);
                     }).map((reason, idx) => {
                       if (reason.type === 'program_bulanan' || reason.type === 'program_spu' || reason.type === 'dynamic_target') {
                          const isBulanan = reason.type === 'program_bulanan' || reason.type === 'dynamic_target';
                         const progress = Math.min(100, (reason.achieve! / reason.target!) * 100);
                         const remaining = Math.max(0, reason.target! - reason.achieve!);

                         return (
                           <li key={idx} className="bg-slate-50/80 rounded-2xl p-3 border border-slate-100">
                             <div className="flex items-center gap-2 mb-3">
                               <Award className="w-4 h-4 text-indigo-500 shrink-0" />
                               <span className="text-[11px] font-black text-indigo-600 uppercase tracking-tight">{reason.text}</span>
                             </div>
                             <div className="space-y-2">
                               <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 px-1">
                                 <span>Target: <span className="text-slate-800">{isBulanan ? `Rp ${reason.target?.toLocaleString()}` : reason.target?.toLocaleString()}</span></span>
                                 <span>Tercapai: <span className="text-emerald-600 font-black">{isBulanan ? `Rp ${reason.achieve?.toLocaleString()}` : reason.achieve?.toLocaleString()}</span></span>
                                </div>

                               <div className="space-y-1">
                                 <div className="w-full h-2.5 bg-slate-200/60 rounded-full overflow-hidden shadow-inner flex">
                                   <div 
                                     className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full transition-all duration-1000" 
                                     style={{ width: `${progress}%` }}
                                   />
                                 </div>
                                 <div className="flex justify-between items-center px-1">
                                   <span className="text-[10px] font-black text-rose-500 uppercase tracking-tighter">
                                     Kurang: {isBulanan ? `Rp ${remaining.toLocaleString()}` : remaining.toLocaleString()}
                                   </span>
                                   <span className={`text-[10px] font-black ${progress >= 100 ? 'text-emerald-500' : 'text-indigo-600'}`}>
                                     {progress.toFixed(1)}%
                                   </span>
                                 </div>
                               </div>
                             </div>
                           </li>
                         );
                       }

                       if (reason.type === 'piutang_overdue' && reason.overdues) {
                          return (
                            <li key={idx} className="bg-rose-50 rounded-2xl p-3 border border-rose-100/60">
                              <div className="flex items-center gap-2 mb-3">
                                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 animate-pulse" />
                                <span className="text-[11px] font-black text-rose-600 uppercase tracking-tight">{reason.text}</span>
                              </div>
                              <div className="space-y-2">
                                {reason.overdues.map((ov, oi) => (
                                  <div key={oi} className="bg-white p-2.5 rounded-xl border border-rose-100 flex flex-col gap-1 transition-colors hover:bg-rose-50/50 hover:shadow-sm">
                                    <div className="flex justify-between items-center">
                                      <button 
                                        onClick={() => setSelectedPiutang(ov)}
                                        className="text-[11px] font-black text-rose-600 hover:text-indigo-600 hover:underline transition-colors text-left break-all flex-1"
                                        title="Lihat Nota"
                                      >
                                        #{ov.delivery_no || 'Tanpa No. Nota'}
                                      </button>
                                      <span className="shrink-0 ml-2 text-[9px] font-black text-rose-500 bg-rose-100 px-2 py-1 rounded-md">
                                        DUE {ov.due_date} HR
                                      </span>
                                    </div>
                                    <div className="text-xs font-black text-slate-800">
                                      Rp {Number(ov.total_amount || 0).toLocaleString()}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </li>
                          );
                       }

                       if (reason.type === 'product_recommendation') {
                          return (
                            <li 
                              key={idx} 
                              className="flex items-start gap-2.5 p-2.5 rounded-xl border bg-indigo-50/50 border-indigo-100 hover:bg-indigo-100/50 cursor-pointer transition-colors"
                              onClick={() => setSelectedProductsModal({ isOpen: true, products: reason.products || [], customerInfo: `${rec.customer_code} - ${rec.customer_name}` })}
                            >
                              <Package className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <span className="text-xs font-bold leading-tight pt-0.5 text-indigo-700 block">{reason.text}</span>
                                <span className="text-[10px] text-indigo-500 font-medium underline mt-1 inline-block">Lihat Detail Rekomendasi</span>
                              </div>
                            </li>
                          );
                       }

                       return (
                         <li key={idx} className={`flex items-start gap-2.5 p-2.5 rounded-xl border bg-slate-50/50 border-slate-100`}>
                           {reason.text.includes('Omset') || reason.text.includes('Kosong') ? (
                             <TrendingDown className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                           ) : reason.text.includes('Idle') ? (
                             <AlertCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                           ) : (
                             <Target className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                           )}
                           <span className={`text-xs font-bold leading-tight pt-0.5 text-slate-600`}>{reason.text}</span>
                         </li>
                       );
                     })}
                   </ul>
                 </div>

                 <div className="mt-6 pt-4 border-t border-slate-50 grid grid-cols-2 gap-4">
                   <div>
                     <p className="text-[9px] font-black text-slate-400 uppercase">Omset MTD</p>
                     <p className="text-xs font-black text-slate-800">Rp {(rec.mtdOmset || 0).toLocaleString()}</p>
                   </div>
                   <div>
                     <p className="text-[9px] font-black text-slate-400 uppercase">Bulan Lalu</p>
                     <p className="text-xs font-black text-slate-800">Rp {(rec.lastMonthOmset || 0).toLocaleString()}</p>
                   </div>
                 </div>
               </CardContent>
             </Card>
          ))}

          {filteredRecs.length === 0 && (
             <div className="col-span-full py-20 text-center space-y-4">
               <div className="w-20 h-20 bg-indigo-50 rounded-full mx-auto flex items-center justify-center">
                 <Calendar className="w-10 h-10 text-indigo-400" />
               </div>
               <h3 className="text-xl font-black text-slate-800">Tidak Ada Kunjungan Mendesak</h3>
               <p className="text-sm font-bold text-slate-400">
                 Semua target customer terpantau aman dan pada jalurnya. Gunakan pencarian untuk customer spesifik.
               </p>
             </div>
          )}
        </div>
      )}

      {selectedPiutang && (
        <NotaModal 
          data={selectedPiutang} 
          onClose={() => setSelectedPiutang(null)} 
        />
      )}

      {selectedProductsModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-10">
              <div>
                <h3 className="font-black text-slate-800 text-lg">Detail Rekomendasi Produk</h3>
                <p className="text-xs text-slate-500 font-medium">{selectedProductsModal.customerInfo}</p>
              </div>
              <button 
                onClick={() => setSelectedProductsModal({ isOpen: false, products: [], customerInfo: '' })}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors"
               >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto w-full">
              <div className="overflow-x-auto w-full border border-slate-200 rounded-xl">
                 <table className="w-full text-left border-collapse whitespace-nowrap">
                   <thead>
                     <tr className="bg-slate-50/80 border-b border-slate-200">
                       <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider w-10 text-center">No</th>
                       <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Nama Produk</th>
                       <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right">TGL Order Trkhir</th>
                       <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right">Potensi Jeda</th>
                       <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right">Freq Order</th>
                       <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right">Total Qty</th>
                       <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right">Total Omset</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100 bg-white">
                     {selectedProductsModal.products.map((p, index) => (
                       <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                         <td className="px-4 py-3 text-xs text-slate-500 text-center">{index + 1}</td>
                         <td className="px-4 py-3 text-xs font-bold text-slate-700">{p.name}</td>
                         <td className="px-4 py-3 text-xs text-slate-600 font-medium text-right">{format(p.lastOrder, 'dd MMM yyyy')}</td>
                         <td className="px-4 py-3 text-xs font-bold text-rose-500 text-right">{p.daysSinceLast} Hari</td>
                         <td className="px-4 py-3 text-xs font-bold text-slate-700 text-right">{p.count}x</td>
                         <td className="px-4 py-3 text-xs font-bold text-indigo-600 text-right">{p.totalQty}</td>
                         <td className="px-4 py-3 text-xs font-bold text-emerald-600 text-right">Rp {p.totalOmset.toLocaleString()}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 text-right">
              <Button onClick={() => setSelectedProductsModal({ isOpen: false, products: [], customerInfo: '' })} variant="outline">
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
