import React, { useState, useEffect } from 'react';
import { Loader2, Users, Search, Target, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../../services/supabase';
import { CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { METRICS, formatCurrency, kpiGenieAnimation } from './constants';
import { StoreDataList } from './StoreDataList';
import { getStoresForKpi, calculateBrandCommissions } from './utils';
import { ManualKpiLogger } from './ManualKpiLogger';
import { LeaderKpiCard } from './LeaderKpiCard';

import { SalesmanTables } from './SalesmanTables';
import { MetricsGrid } from './MetricsGrid';

interface DetailSalesmanViewProps {
  isLoading: boolean;
  summaryData: any[];
  detailedSalesmanData: any;
  targets: any[];
  teams: any[];
  teamMembers: any[];
  selectedSalesman: string;
  setSelectedSalesman: (val: string) => void;
  expandedKpiCard: string | null;
  handleExpandKpiCard: (metricId: string, salesmanCode: string) => void;
  isLoadingStoreData: boolean;
  storeDataCache: Record<string, any>;
  periodMonth: number;
  periodYear: number;
  onDataChange: () => void;
}

export function DetailSalesmanView({
  isLoading,
  summaryData,
  detailedSalesmanData,
  targets,
  teams,
  teamMembers,
  selectedSalesman,
  setSelectedSalesman,
  expandedKpiCard,
  handleExpandKpiCard,
  isLoadingStoreData,
  storeDataCache,
  periodMonth,
  periodYear,
  onDataChange
}: DetailSalesmanViewProps) {
  const currentTeam = teams.find(t => teamMembers.some(m => m.team_id === t.id && m.salesman_code === detailedSalesmanData?.salesman_code));
  const isLeader = teams.find(t => t.leader_code === detailedSalesmanData?.salesman_code);
  const [activeTab, setActiveTab] = useState<'rapor' | 'penghasilan'>('rapor');
  const [selectedNota, setSelectedNota] = useState<string | null>(null);

  return (
    <>
      <CardHeader className="pb-3 border-b flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <CardTitle className="text-lg flex items-center">
          <Users className="mr-2 h-5 w-5 text-indigo-500" />
          Rapor Detail Salesman
        </CardTitle>
        <select 
          className="border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white font-medium text-slate-700 w-full sm:w-64"
          value={selectedSalesman || (summaryData[0]?.salesman_code || '')}
          onChange={(e) => setSelectedSalesman(e.target.value)}
        >
          {summaryData.map((sm, idx) => (
            <option key={idx} value={sm.salesman_code}>{sm.salesman_name}</option>
          ))}
        </select>
      </CardHeader>
      <CardContent className="p-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-500" />
            <p>Memuat dan memproses data KPI via RPC Server...</p>
          </div>
        ) : !detailedSalesmanData ? (
          <div className="text-center p-12 text-slate-500">
            <p>Tidak ada data KPI. Silakan unggah data file Excel/CSV di menu Upload.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 flex items-center gap-4 p-4 bg-indigo-50 rounded-lg border border-indigo-100 flex-col sm:flex-row text-center sm:text-left justify-center">
                <div className="h-16 w-16 bg-white ring-1 ring-indigo-200 rounded-2xl flex items-center justify-center shadow-sm">
                  <Users className="w-8 h-8 text-indigo-600" />
                </div>
                <div className="flex flex-col items-center sm:items-start">
                  <h2 className="text-2xl font-bold text-slate-800">{detailedSalesmanData.salesman_name}</h2>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-1">
                    <p className="text-slate-600 font-medium text-xs sm:text-sm">{detailedSalesmanData.total_customers} Toko (NOA)</p>
                    {isLeader && (
                      <span className="bg-amber-100 text-amber-700 text-[9px] font-black px-2 py-0.5 rounded-full border border-amber-200 uppercase">Team Leader</span>
                    )}
                    {currentTeam && (
                      <span className="bg-indigo-100 text-indigo-700 text-[9px] font-black px-2 py-0.5 rounded-full border border-indigo-200 uppercase">Tim: {currentTeam.team_name}</span>
                    )}
                    {detailedSalesmanData.is_eligible === false && (
                      <span className="bg-rose-100 text-rose-700 text-[9px] font-black px-2 py-0.5 rounded-full border border-rose-200 uppercase">Tidak Ikut Sistem Poin</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex border-b border-slate-200">
              <button 
                onClick={() => setActiveTab('rapor')} 
                className={`px-4 py-3 font-semibold text-sm transition-colors ${activeTab === 'rapor' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Rapor Salesman
              </button>
              <button 
                onClick={() => setActiveTab('penghasilan')} 
                className={`px-4 py-3 font-semibold text-sm transition-colors ${activeTab === 'penghasilan' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Penghasilan
              </button>
            </div>

            {activeTab === 'penghasilan' && (
              <div className="space-y-6">
                {detailedSalesmanData && (
                  <div className="flex items-center gap-4 p-4 bg-emerald-50 rounded-lg border border-emerald-100 flex-col sm:flex-row justify-center sm:justify-start text-center sm:text-left">
                    <div className="h-16 w-16 bg-white ring-1 ring-emerald-200 rounded-2xl flex items-center justify-center shadow-sm">
                      <Target className="w-8 h-8 text-emerald-600" />
                    </div>
                    <div className="flex flex-col items-center sm:items-start">
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider mb-0.5">Total Poin KPI & Bonus</p>
                      <div className="flex items-baseline justify-center sm:justify-start gap-2">
                      <span className="text-2xl font-black text-emerald-700">
                        {(() => {
                           const pts = (Number(detailedSalesmanData.points_3c_lcd) || 0) +
                                       (Number(detailedSalesmanData.points_omset_lcd) || 0) +
                                       (Number(detailedSalesmanData.points_visit_customer) || 0) +
                                       (Number(detailedSalesmanData.points_co_3c) || 0) +
                                       (Number(detailedSalesmanData.points_omset_5jt) || 0) +
                                       (Number(detailedSalesmanData.points_idle_customers) || 0) +
                                       (Number(detailedSalesmanData.points_program_spu) || 0) +
                                       (Number(detailedSalesmanData.points_perbaikan_display) || 0) +
                                       (Number(detailedSalesmanData.points_pemasangan_spanduk) || 0) +
                                       (Number(detailedSalesmanData.points_leader_kpi) || 0) +
                                       (Number(detailedSalesmanData.points_leader_omset_lcd) || 0) +
                                       (Number(detailedSalesmanData.points_leader_visit) || 0) +
                                       (Number(detailedSalesmanData.points_leader_co3c) || 0) +
                                        (Number(detailedSalesmanData.points_leader_5jt) || 0) +
                                        (Number(detailedSalesmanData.points_leader_idle) || 0) +
                                        (Number(detailedSalesmanData.points_leader_spu) || 0) +
                                        (Number(detailedSalesmanData.points_leader_new_customer) || 0) +
                                        (Number(detailedSalesmanData.points_leader_perbaikan_display) || 0) +
                                        (Number(detailedSalesmanData.points_leader_pemasangan_spanduk) || 0);
                           return pts > 0 ? `+${pts}` : pts;
                        })()} pts
                      </span>
                      <span className="text-sm font-bold text-emerald-600/80">
                        Rp {new Intl.NumberFormat('id-ID').format((
                          (Number(detailedSalesmanData.points_3c_lcd) || 0) +
                          (Number(detailedSalesmanData.points_omset_lcd) || 0) +
                          (Number(detailedSalesmanData.points_visit_customer) || 0) +
                          (Number(detailedSalesmanData.points_co_3c) || 0) +
                          (Number(detailedSalesmanData.points_omset_5jt) || 0) +
                          (Number(detailedSalesmanData.points_idle_customers) || 0) +
                          (Number(detailedSalesmanData.points_program_spu) || 0) +
                          (Number(detailedSalesmanData.points_perbaikan_display) || 0) +
                          (Number(detailedSalesmanData.points_pemasangan_spanduk) || 0) +
                          (Number(detailedSalesmanData.points_leader_kpi) || 0) +
                          (Number(detailedSalesmanData.points_leader_omset_lcd) || 0) +
                          (Number(detailedSalesmanData.points_leader_visit) || 0) +
                          (Number(detailedSalesmanData.points_leader_co3c) || 0) +
                          (Number(detailedSalesmanData.points_leader_5jt) || 0) +
                          (Number(detailedSalesmanData.points_leader_idle) || 0) +
                          (Number(detailedSalesmanData.points_leader_spu) || 0) +
                          (Number(detailedSalesmanData.points_leader_new_customer) || 0) +
                          (Number(detailedSalesmanData.points_leader_perbaikan_display) || 0) +
                          (Number(detailedSalesmanData.points_leader_pemasangan_spanduk) || 0)
                        ) * 10000)}
                      </span>
                    </div>
                    <p className="text-[9px] text-emerald-500 font-medium italic">* 1 poin = Rp 10.000</p>
                  </div>
                </div>
              )}

             {/* Brand Commission Section */}
             {selectedSalesman && (
               <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                 <div className="bg-slate-50 border-b px-4 py-3 flex items-center justify-between">
                   <div className="flex items-center gap-2">
                     <ShieldCheck className="w-5 h-5 text-indigo-600" />
                     <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Komisi Penjualan per Brand</h3>
                   </div>
                   {isLoadingStoreData && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
                 </div>
                 <div className="p-4">
                   {(() => {
                     const salesmanData = storeDataCache[selectedSalesman] || [];
                     const brandCommissions = calculateBrandCommissions(salesmanData);
                     
                     if (brandCommissions.length === 0) {
                       return (
                         <div className="text-center py-8 text-slate-400 italic text-xs">
                           {isLoadingStoreData ? 'Menghitung komisi...' : 'Tidak ada data penjualan brand untuk periode ini.'}
                         </div>
                       );
                     }

                     const totalCommission = brandCommissions.reduce((sum, item) => sum + item.commission, 0);

                     return (
                       <div className="space-y-4">
                         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                           {brandCommissions.map((brand) => (
                             <div key={brand.id} className="bg-slate-50 rounded-lg p-3 border border-slate-100 flex flex-col justify-between">
                               <div>
                                 <p className="text-[10px] font-black text-slate-500 uppercase leading-none mb-1">{brand.label}</p>
                                 <p className="text-sm font-bold text-slate-700">{formatCurrency(brand.omset)}</p>
                               </div>
                               <div className="mt-2 pt-2 border-t border-slate-200/60 flex justify-between items-baseline">
                                 <span className="text-[9px] font-bold text-slate-400 uppercase">Komisi:</span>
                                 <span className="text-xs font-black text-emerald-600">{formatCurrency(brand.commission)}</span>
                               </div>
                             </div>
                           ))}
                         </div>
                         <div className="flex justify-end pt-2">
                           <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-2">
                             <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider mr-3">Estimasi Total Komisi Brand:</span>
                             <span className="text-lg font-black text-emerald-700">{formatCurrency(totalCommission)}</span>
                           </div>
                         </div>
                       </div>
                     );
                   })()}
                 </div>
               </div>
             )}
            </div>
            )}
            
            {activeTab === 'rapor' && (
              <div className="space-y-6">
            
            {isLeader && (
              <div className="space-y-4">
                {/* Leader Section: 3C + LCD */}
                <LeaderKpiCard 
                  title={`${detailedSalesmanData.salesman_name} (Payment 3C + Omset LCD)`}
                  achievement={detailedSalesmanData.team_achievement || 0}
                  target={detailedSalesmanData.team_target || 0}
                  points={detailedSalesmanData.points_leader_kpi || 0}
                  format="currency"
                  colorTheme="amber"
                  extraDetails={[
                    `SISA PIUTANG 3C: ${formatCurrency(detailedSalesmanData.team_piutang_3c || 0)}`,
                    `PAYM. 3C + PIUT. 3C + OMSET LCD: ${formatCurrency((detailedSalesmanData.team_achievement || 0) + (detailedSalesmanData.team_piutang_3c || 0))}`
                  ]}
                />

                {/* Leader Section: Omset LCD Only */}
                <LeaderKpiCard 
                  title={`${detailedSalesmanData.salesman_name} (Omset LCD Only)`}
                  achievement={detailedSalesmanData.team_lcd_achievement || 0}
                  target={detailedSalesmanData.team_lcd_target || 0}
                  points={detailedSalesmanData.points_leader_omset_lcd || 0}
                  format="currency"
                  colorTheme="indigo"
                />

                {/* Leader Section: Visit Customer */}
                <LeaderKpiCard 
                  title={`${detailedSalesmanData.salesman_name} (Visit Customer)`}
                  achievement={detailedSalesmanData.team_visit_percentage || 0}
                  target={100}
                  points={detailedSalesmanData.points_leader_visit || 0}
                  suffix="%"
                  colorTheme="emerald"
                />

                {/* Leader Section: CO 3C */}
                <LeaderKpiCard 
                  title={`${detailedSalesmanData.salesman_name} (Customer Order 3C)`}
                  achievement={detailedSalesmanData.team_co3c_achievement || 0}
                  target={detailedSalesmanData.team_co3c_target || 0}
                  points={detailedSalesmanData.points_leader_co3c || 0}
                  suffix=" Toko"
                  colorTheme="sky"
                />

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {/* CO > 5Jt */}
                  <LeaderKpiCard 
                    title="CO > 5jt"
                    achievement={detailedSalesmanData.team_5jt_achievement || 0}
                    target={detailedSalesmanData.team_5jt_target || 0}
                    points={detailedSalesmanData.points_leader_5jt || 0}
                    suffix=" Toko"
                    colorTheme="fuchsia"
                  />

                  {/* Idle Customers */}
                  <LeaderKpiCard 
                    title="Idle Store"
                    achievement={detailedSalesmanData.team_idle_achievement || 0}
                    target={detailedSalesmanData.team_idle_target || 0}
                    points={detailedSalesmanData.points_leader_idle || 0}
                    suffix=" Toko"
                    colorTheme="orange"
                  />

                  {/* New Customer Order */}
                  <LeaderKpiCard 
                    title="New Cust. Order"
                    achievement={detailedSalesmanData.team_new_customer_achievement || 0}
                    target={detailedSalesmanData.team_new_customer_target || 0}
                    points={detailedSalesmanData.points_leader_new_customer || 0}
                    suffix=" Toko"
                    colorTheme="cyan"
                  />

                  {/* Program SPU */}
                  <LeaderKpiCard 
                    title="Program SPU"
                    achievement={detailedSalesmanData.team_spu_achievement || 0}
                    target={detailedSalesmanData.team_spu_target || 0}
                    points={detailedSalesmanData.points_leader_spu || 0}
                    suffix=" Toko"
                    colorTheme="rose"
                  />

                  {/* Perbaikan Display */}
                  <LeaderKpiCard 
                    title="Team Perbaikan Display"
                    achievement={detailedSalesmanData.team_display_achievement || 0}
                    target={detailedSalesmanData.team_display_target || 0}
                    points={detailedSalesmanData.points_leader_perbaikan_display || 0}
                    suffix=" Toko"
                    colorTheme="cyan"
                  />

                  {/* Pemasangan Spanduk */}
                  <LeaderKpiCard 
                    title="Team Pasang Spanduk"
                    achievement={detailedSalesmanData.team_spanduk_achievement || 0}
                    target={detailedSalesmanData.team_spanduk_target || 0}
                    points={detailedSalesmanData.points_leader_pemasangan_spanduk || 0}
                    suffix=" Toko"
                    colorTheme="amber"
                  />
                </div>
              </div>
            )}
            
            <MetricsGrid 
              detailedSalesmanData={detailedSalesmanData} 
              targets={targets} 
              expandedKpiCard={expandedKpiCard} 
              handleExpandKpiCard={handleExpandKpiCard} 
            />

            <SalesmanTables storeData={storeDataCache[selectedSalesman] || []} />
            
            </div>
            )}
            
            {/* Modal for Store Details */}
            <AnimatePresence>
              {expandedKpiCard && (
                <div 
                  className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
                  onClick={() => handleExpandKpiCard('', detailedSalesmanData.salesman_code)}
                  style={{ perspective: '1300px' }}
                >
                  <motion.div 
                    variants={kpiGenieAnimation as any}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    style={{ transformStyle: 'preserve-3d' }}
                    className="bg-white rounded-xl shadow-2xl w-full max-w-[98vw] max-h-[98vh] flex flex-col" 
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="p-4 border-b bg-indigo-50 flex items-center justify-between sticky top-0 z-20">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-indigo-200 shadow-lg">
                          <Search className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                            {METRICS.find(m => m.id === expandedKpiCard)?.label}
                          </h3>
                          <p className="text-[10px] font-bold text-indigo-600">
                            DETAIL TOKO • {detailedSalesmanData.salesman_name}
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleExpandKpiCard('', detailedSalesmanData.salesman_code)}
                        className="w-8 h-8 rounded-lg bg-white border shadow-sm flex items-center justify-center text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-all font-bold"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                      {['perbaikan_display', 'pemasangan_spanduk'].includes(expandedKpiCard) && (
                        <ManualKpiLogger 
                          metricId={expandedKpiCard}
                          salesmanCode={detailedSalesmanData.salesman_code}
                          periodMonth={periodMonth}
                          periodYear={periodYear}
                          onSave={() => {
                            handleExpandKpiCard(expandedKpiCard, detailedSalesmanData.salesman_code); // Force refresh store data
                            onDataChange(); // Refresh summary
                          }}
                        />
                      )}

                      <div className="mb-4 flex items-center justify-between">
                        <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                          <Users className="w-3 h-3" /> List Kontribusi Toko
                        </h4>
                        {!isLoadingStoreData && (
                          <span className="bg-indigo-600 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-sm shadow-indigo-100">
                             {getStoresForKpi(storeDataCache[detailedSalesmanData.salesman_code] || [], expandedKpiCard).length} TOKO
                          </span>
                        )}
                      </div>

                      <StoreDataList 
                        isLoading={isLoadingStoreData}
                        stores={getStoresForKpi(storeDataCache[detailedSalesmanData.salesman_code] || [], expandedKpiCard)}
                        metricConfig={METRICS.find(m => m.id === expandedKpiCard)}
                      />
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </>
  );
}
