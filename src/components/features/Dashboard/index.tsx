import React, { useEffect, useState } from 'react';
import { Loader2, TrendingUp, CreditCard, GripVertical, Lock, Unlock } from 'lucide-react';
import { motion, Reorder } from 'motion/react';
import { supabase } from '../../../services/supabase';
import { KpiCard } from './KpiCard';
import { DualKpiCard } from './DualKpiCard';

const DEFAULT_SECTIONS = [
  'ALL_BRAND',
  '3C',
  'REDSKULL',
  'LCD',
  'HOME',
  'DLL',
  'KPIS_GRID'
];

const DEFAULT_KPI_CARDS = [
  'coAllBrand',
  'co5Jt',
  'co3C',
  'coHomeLiving',
  'coHomeApp',
  'coDll',
  'hydrogel',
  'tg',
  'newCustomers',
  'idleCustomers',
  'coMesinVqm',
  'coTg'
];

export function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [sections, setSections] = useState<string[]>(() => {
    const saved = localStorage.getItem('dashboard_layout');
    return saved ? JSON.parse(saved) : DEFAULT_SECTIONS;
  });
  const [kpiCardsOrder, setKpiCardsOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('dashboard_kpi_order');
    return saved ? JSON.parse(saved) : DEFAULT_KPI_CARDS;
  });

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const [periodMonth, setPeriodMonth] = useState<number>(currentMonth);
  const [periodYear, setPeriodYear] = useState<number>(currentYear);

  const [kpi, setKpi] = useState({
    omsetTotal: 0,
    paymentTotal: 0,
    payment3C: 0,
    paymentRedskull: 0,
    omset3C: 0,
    omsetLcd: 0,
    omsetRedskull: 0,
    omsetHomeAppliances: 0,
    omsetHomeLiving: 0,
    omsetDll: 0,
    co5Jt: 0,
    co3C: 0,
    coAllBrand: 0,
    coHomeLiving: 0,
    coHomeAppliances: 0,
    coDll: 0,
    hydrogelPcs: 0,
    tgPcs: 0,
    newCustomers: 0,
    idleCustomers: 0,
    coMesinVqm: 0,
    coTg: 0,
    sisaPiutang3C: 0,
    points3CLcd: 0,
    pointsOmsetLcd: 0,
    targets: {} as any,
  });

  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true);
      setError(null);

      try {
        const { data, error: dbError } = await supabase.rpc('get_dashboard_summary', {
           p_month: periodMonth,
           p_year: periodYear
        });
            
        if (dbError) throw dbError;
        
        if (data) {
          const achievement = (Number(data.payment3C) || 0) + (Number(data.omsetLcd) || 0);
          const target = Number(data.targets?.target_payment_3c_lcd) || 
                         ((Number(data.targets?.target_payment_3c) || 0) + (Number(data.targets?.target_omset_lcd) || 550000000));
          
          let points = 0;
          if (target > 0) {
            const percentage = (achievement / target) * 100;
            if (percentage >= 105) points = 60;
            else if (percentage >= 100) points = 50;
            else if (percentage >= 95) points = 45;
            else if (percentage >= 90) points = 40;
            else if (percentage >= 85) points = 0;
            else if (percentage >= 80) points = -20;
            else if (percentage >= 75) points = -30;
            else points = -40;
          }

          let pointsLcd = 0;
          const achievementLcd = Number(data.omsetLcd) || 0;
          const targetLcd = Number(data.targets?.target_omset_lcd) || 550000000;
          if (targetLcd > 0) {
            const percentageLcd = (achievementLcd / targetLcd) * 100;
            if (percentageLcd >= 105) pointsLcd = 25;
            else if (percentageLcd >= 100) pointsLcd = 20;
            else if (percentageLcd >= 95) pointsLcd = 15;
            else if (percentageLcd >= 90) pointsLcd = 10;
            else if (percentageLcd >= 85) pointsLcd = 0;
            else if (percentageLcd >= 80) pointsLcd = -10;
            else if (percentageLcd >= 75) pointsLcd = -15;
            else pointsLcd = -20;
          }

          setKpi({
            omsetTotal: Number(data.omsetTotal) || 0,
            paymentTotal: Number(data.paymentTotal) || 0,
            payment3C: Number(data.payment3C) || 0,
            paymentRedskull: Number(data.paymentRedskull) || 0,
            omset3C: Number(data.omset3C) || 0,
            omsetLcd: Number(data.omsetLcd) || 0,
            omsetRedskull: Number(data.omsetRedskull) || 0,
            omsetHomeAppliances: Number(data.omsetHomeAppliances) || 0,
            omsetHomeLiving: Number(data.omsetHomeLiving) || 0,
            omsetDll: Number(data.omsetDll) || 0,
            co5Jt: Number(data.co5Jt) || 0,
            co3C: Number(data.co3C) || 0,
            coAllBrand: Number(data.coAllBrand) || 0,
            coHomeLiving: Number(data.coHomeLiving) || 0,
            coHomeAppliances: Number(data.coHomeAppliances) || 0,
            coDll: Number(data.coDll) || 0,
            hydrogelPcs: Number(data.hydrogelPcs) || 0,
            tgPcs: Number(data.tgPcs) || 0,
            newCustomers: Number(data.newCustomers) || 0,
            idleCustomers: Number(data.idleCustomers) || 0,
            coMesinVqm: Number(data.coMesinVqm) || 0,
            coTg: Number(data.coTg) || 0,
            sisaPiutang3C: Number(data.sisaPiutang3C) || 0,
            points3CLcd: points,
            pointsOmsetLcd: pointsLcd,
            targets: data.targets || {},
          });
        }
      } catch (err: any) {
        console.error('Error fetching dashboard data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchDashboardData();
  }, [periodMonth, periodYear]);

  const saveLayout = (newLayout: string[]) => {
    setSections(newLayout);
    localStorage.setItem('dashboard_layout', JSON.stringify(newLayout));
  };

  const saveKpiOrder = (newOrder: string[]) => {
    setKpiCardsOrder(newOrder);
    localStorage.setItem('dashboard_kpi_order', JSON.stringify(newOrder));
  };

  const renderKpiCard = (id: string, isDragging: boolean = false) => {
    // Shared wrapper for both grid and list view
    const wrapperClass = isDragging ? "bg-white p-3 rounded-lg border border-indigo-200 flex items-center gap-3 shadow-sm" : "";
    
    let content;
    switch (id) {
      case 'coAllBrand': content = <KpiCard label="CO All Brand" value={kpi.coAllBrand} isCurrency={false} colorClass="bg-white border-slate-200 text-slate-600" />; break;
      case 'co5Jt': content = <KpiCard label="CO > 5Jt" value={kpi.co5Jt} isCurrency={false} colorClass="bg-white border-slate-200 text-slate-600" targetValue={kpi.targets?.target_omset_5jt} />; break;
      case 'co3C': content = <KpiCard label="CO 3C" value={kpi.co3C} isCurrency={false} colorClass="bg-white border-slate-200 text-slate-600" targetValue={kpi.targets?.target_co_3c} />; break;
      case 'coHomeLiving': content = <KpiCard label="CO Home Living" value={kpi.coHomeLiving} isCurrency={false} colorClass="bg-white border-slate-200 text-slate-600" />; break;
      case 'coHomeApp': content = <KpiCard label="CO Home App" value={kpi.coHomeAppliances} isCurrency={false} colorClass="bg-white border-slate-200 text-slate-600" />; break;
      case 'coDll': content = <KpiCard label="CO DLL" value={kpi.coDll} isCurrency={false} colorClass="bg-white border-slate-200 text-slate-600" />; break;
      case 'hydrogel': content = <KpiCard label="Hydrogel" value={kpi.hydrogelPcs} isCurrency={false} colorClass="bg-white border-slate-200 text-slate-600" targetValue={kpi.targets?.target_hydrogel_pcs} suffix="Pcs" />; break;
      case 'tg': content = <KpiCard label="Tempered Glass" value={kpi.tgPcs} isCurrency={false} colorClass="bg-white border-slate-200 text-slate-600" targetValue={kpi.targets?.target_tg_pcs} suffix="Pcs" />; break;
      case 'newCustomers': content = <KpiCard label="New Customers" value={kpi.newCustomers} isCurrency={false} colorClass="bg-white border-slate-200 text-slate-600" targetValue={kpi.targets?.target_new_customer} />; break;
      case 'idleCustomers': content = <KpiCard label="Idle Customers" value={kpi.idleCustomers} isCurrency={false} colorClass="bg-white border-slate-200 text-slate-600" targetValue={kpi.targets?.target_idle_customer} />; break;
      case 'coMesinVqm': content = <KpiCard label="CO Mesin VQM" value={kpi.coMesinVqm} isCurrency={false} colorClass="bg-white border-slate-200 text-slate-600" targetValue={kpi.targets?.target_co_mesin_vqm} />; break;
      case 'coTg': content = <KpiCard label="CO TG" value={kpi.coTg} isCurrency={false} colorClass="bg-white border-slate-200 text-slate-600" targetValue={kpi.targets?.target_co_tg} />; break;
      default: return null;
    }

    if (isDragging) {
      return (
        <div className={wrapperClass}>
          <GripVertical className="w-4 h-4 text-slate-400 shrink-0" />
          <div className="flex-1 font-bold text-xs text-slate-600 uppercase tracking-wide">
            {id.replace(/([A-Z])/g, ' $1').toUpperCase()}
          </div>
          <div className="text-indigo-600 font-bold">{kpi[id as keyof typeof kpi] as any}</div>
        </div>
      );
    }
    return content;
  };

  const renderSection = (id: string) => {
    switch (id) {
      case 'ALL_BRAND':
        return (
          <DualKpiCard 
            key="ALL_BRAND"
            leftMetric={{
              label: "Omset All Brand",
              value: kpi.omsetTotal,
              target: kpi.targets?.target_omset_total,
              icon: TrendingUp,
              colorTheme: 'indigo'
            }}
            rightMetric={{
              label: "Payment All Brand",
              value: kpi.paymentTotal,
              target: kpi.targets?.target_payment_all_brand,
              icon: CreditCard,
              colorTheme: 'violet'
            }}
            showHandle={isEditMode}
          />
        );
      case '3C':
        return (
          <DualKpiCard 
            key="3C"
            leftMetric={{
              label: "Omset 3C",
              value: kpi.omset3C,
              target: undefined,
              icon: TrendingUp,
              colorTheme: 'emerald'
            }}
            rightMetric={{
              label: "Payment 3C",
              value: kpi.payment3C,
              target: kpi.targets?.target_payment_3c,
              icon: CreditCard,
              colorTheme: 'teal',
              subText: (
                <div className="flex flex-col gap-0.5">
                  <div>Sisa Piutang 3C: Rp {new Intl.NumberFormat('id-ID').format(kpi.sisaPiutang3C)}</div>
                  <div>Payment 3C + Piutang 3C + Omset LCD = Rp {new Intl.NumberFormat('id-ID').format(kpi.payment3C + kpi.sisaPiutang3C + kpi.omsetLcd)}</div>
                </div>
              )
            }}
            showHandle={isEditMode}
          />
        );
      case 'REDSKULL':
        return (
          <DualKpiCard 
            key="REDSKULL"
            leftMetric={{
              label: "Omset Redskull",
              value: kpi.omsetRedskull,
              target: kpi.targets?.target_omset_redskull || 300000000,
              icon: TrendingUp,
              colorTheme: 'rose'
            }}
            rightMetric={{
              label: "Payment Redskull",
              value: kpi.paymentRedskull,
              target: undefined,
              icon: CreditCard,
              colorTheme: 'amber'
            }}
            showHandle={isEditMode}
          />
        );
      case 'LCD':
        return (
          <DualKpiCard 
            key="LCD"
            leftMetric={{
              label: "Omset LCD",
              value: kpi.omsetLcd,
              target: kpi.targets?.target_omset_lcd || 550000000,
              icon: TrendingUp,
              colorTheme: 'blue',
              subText: (
                <div className="flex flex-col gap-0.5">
                  <div className={`px-2 py-0.5 rounded inline-block w-fit ${kpi.pointsOmsetLcd >= 10 ? 'bg-emerald-100 text-emerald-700' : kpi.pointsOmsetLcd === 0 ? 'bg-slate-100 text-slate-600' : 'bg-rose-100 text-rose-700'}`}>
                    POIN KPI: {kpi.pointsOmsetLcd > 0 ? `+${kpi.pointsOmsetLcd}` : kpi.pointsOmsetLcd}
                  </div>
                </div>
              )
            }}
            rightMetric={{
              label: "Payment 3C + Omset LCD",
              value: kpi.payment3C + kpi.omsetLcd,
              target: kpi.targets?.target_payment_3c_lcd || ((kpi.targets?.target_payment_3c || 0) + 550000000),
              icon: CreditCard,
              colorTheme: 'slate',
              subText: (
                <div className="flex flex-col gap-0.5">
                  <div className={`px-2 py-0.5 rounded inline-block w-fit ${kpi.points3CLcd >= 40 ? 'bg-emerald-100 text-emerald-700' : kpi.points3CLcd === 0 ? 'bg-slate-100 text-slate-600' : 'bg-rose-100 text-rose-700'}`}>
                    POIN KPI: {kpi.points3CLcd > 0 ? `+${kpi.points3CLcd}` : kpi.points3CLcd}
                  </div>
                </div>
              )
            }}
            showHandle={isEditMode}
          />
        );
      case 'HOME':
        return (
          <DualKpiCard 
            key="HOME"
            leftMetric={{
              label: "Omset Home Living",
              value: kpi.omsetHomeLiving,
              target: undefined,
              icon: TrendingUp,
              colorTheme: 'indigo'
            }}
            rightMetric={{
              label: "Omset Home Appliances",
              value: kpi.omsetHomeAppliances,
              target: undefined,
              icon: TrendingUp,
              colorTheme: 'violet'
            }}
            showHandle={isEditMode}
          />
        );
      case 'DLL':
        return (
          <DualKpiCard 
            key="DLL"
            leftMetric={{
              label: "Omset Lain-lain",
              value: kpi.omsetDll,
              target: undefined,
              icon: TrendingUp,
              colorTheme: 'slate'
            }}
            showHandle={isEditMode}
          />
        );
      case 'KPIS_GRID':
        return (
          <div key="KPIS_GRID" className="space-y-4">
            <div className="flex items-center gap-2">
               {isEditMode && <GripVertical className="w-5 h-5 text-slate-300 cursor-grab active:cursor-grabbing" />}
               <h3 className="text-lg font-bold text-slate-800 border-b pb-2 flex-1">Kinerja Lainnya & Customer Order</h3>
            </div>
            {isEditMode ? (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <Reorder.Group 
                  axis="y" 
                  values={kpiCardsOrder} 
                  onReorder={saveKpiOrder}
                  className="space-y-3"
                >
                  {kpiCardsOrder.map((cardId) => (
                    <Reorder.Item 
                      key={cardId} 
                      value={cardId}
                      className="cursor-grab active:cursor-grabbing"
                    >
                      {renderKpiCard(cardId, true)}
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
                <div className="mt-4 text-center">
                  <p className="text-[10px] text-slate-400 font-medium italic">Seret ke atas/bawah untuk mengatur urutan di dalam grid</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {kpiCardsOrder.map((cardId) => (
                  <React.Fragment key={cardId}>
                    {renderKpiCard(cardId)}
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mb-4" />
        <p>Memuat data Dashboard via RPC Server...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-200 mt-4">
        <h3 className="font-bold">Gagal memuat Dashboard</h3>
        <p className="text-sm">Error: {error}</p>
        <p className="text-xs mt-2 italic">Pastikan Anda telah menjalankan perintah Setup Database untuk membuat function RPC.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Dashboard Overview</h2>
            <button 
              onClick={() => setIsEditMode(!isEditMode)}
              className={`p-1.5 rounded-md transition-colors ${isEditMode ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
              title={isEditMode ? "Selesai Mengatur" : "Atur Posisi KPI"}
            >
              {isEditMode ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-slate-500">Ringkasan performa penjualan dan pencapaian target gabungan</p>
        </div>
        
        <div className="flex gap-3 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Periode Bulan</label>
            <select 
              value={periodMonth}
              onChange={(e) => setPeriodMonth(Number(e.target.value))}
              className="w-full text-sm font-medium border-slate-200 rounded-md focus:border-indigo-500 focus:ring-indigo-500"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('id-ID', { month: 'long' })}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Periode Tahun</label>
            <select 
              value={periodYear}
              onChange={(e) => setPeriodYear(Number(e.target.value))}
              className="w-full text-sm font-medium border-slate-200 rounded-md focus:border-indigo-500 focus:ring-indigo-500"
            >
              {Array.from({ length: 5 }, (_, i) => currentYear - 2 + i).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <Reorder.Group 
        axis="y" 
        values={sections} 
        onReorder={saveLayout}
        className="space-y-6"
      >
        {sections.map((sectionId) => (
          <Reorder.Item 
            key={sectionId} 
            value={sectionId}
            dragListener={isEditMode}
            className="focus:outline-none"
          >
            {renderSection(sectionId)}
          </Reorder.Item>
        ))}
      </Reorder.Group>
    </div>
  );
}
