import React from 'react';
import { Loader2, Users, Search, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { METRICS, formatCurrency, kpiGenieAnimation } from './constants';
import { StoreDataList } from './StoreDataList';
import { getStoresForKpi } from './utils';
import { ManualKpiLogger } from './ManualKpiLogger';

const getRankBadgeProps = (idx: number) => {
  switch (idx) {
    case 0: return { className: 'bg-yellow-100 text-yellow-700 ring-1 ring-yellow-400', icon: <Trophy className="w-4 h-4 ml-1 inline text-yellow-500" /> };
    case 1: return { className: 'bg-slate-200 text-slate-700 ring-1 ring-slate-400', icon: null };
    case 2: return { className: 'bg-amber-100 text-amber-800 ring-1 ring-amber-500', icon: null };
    default: return { className: 'bg-indigo-50 text-indigo-600', icon: null };
  }
};

interface LeaderboardViewProps {
  isLoading: boolean;
  filteredData: any[];
  targets: any[];
  selectedMetric: string;
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  setSelectedMetric: (val: string) => void;
  expandedSalesmanRow: string | null;
  handleExpandSalesman: (code: string) => void;
  isLoadingStoreData: boolean;
  storeDataCache: Record<string, any>;
  periodMonth: number;
  periodYear: number;
  onDataChange: () => void;
}

export function LeaderboardView({
  isLoading,
  filteredData,
  targets,
  selectedMetric,
  searchTerm,
  setSearchTerm,
  setSelectedMetric,
  expandedSalesmanRow,
  handleExpandSalesman,
  isLoadingStoreData,
  storeDataCache,
  periodMonth,
  periodYear,
  onDataChange
}: LeaderboardViewProps) {
  // Close modal with Escape key
  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && expandedSalesmanRow) handleExpandSalesman('');
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [expandedSalesmanRow, handleExpandSalesman]);

  return (
    <>
      <CardHeader className="pb-3 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <CardTitle className="text-lg flex items-center md:w-auto w-full">
          <Trophy className="mr-2 h-5 w-5 text-indigo-500" />
          Peringkat Berdasarkan KPI
        </CardTitle>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative flex-1 sm:w-56">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Cari salesman..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <select 
            className="border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white font-medium text-slate-700 w-full sm:w-auto"
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
          >
            <optgroup label="Metrik Pencapaian Terbaik">
              {METRICS.map((m: any) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </optgroup>
          </select>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-500" />
            <p>Memuat data KPI via RPC Server...</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="text-center p-12 text-slate-500">
            <p>Tidak ada data KPI. Silakan unggah data file Excel/CSV di menu Upload.</p>
            <p className="text-xs mt-2 italic text-slate-400">Pastikan Anda telah menjalankan perintah Setup Database untuk membuat function RPC.</p>
          </div>
        ) : (
          <>
            <div className="space-y-3 p-4 bg-slate-50/50">
            {filteredData.map((sm, idx) => {
              const metricConfig = METRICS.find((m: any) => m.id === selectedMetric);
              const value = sm[selectedMetric] || 0;
              const displayValue = metricConfig?.format === 'currency' 
                ? formatCurrency(value) 
                : metricConfig?.format === 'percentage'
                  ? `${value.toLocaleString('id-ID', { maximumFractionDigits: 2 })}%`
                  : `${value.toLocaleString('id-ID')}${metricConfig?.suffix || ''}`;
              
              const targetRecord = targets.find(t => t.salesman_code === sm.salesman_code);
              const targetValue = targetRecord && metricConfig?.targetKey ? (targetRecord[metricConfig.targetKey] || 0) : 0;
              
              let percentage = 0;
              if (targetValue > 0) {
                percentage = (value / targetValue) * 100;
              }                     
              
              const badgeProps = getRankBadgeProps(idx);
              const isExpanded = expandedSalesmanRow === sm.salesman_code;
              const stores = isExpanded && !isLoadingStoreData ? getStoresForKpi(storeDataCache[sm.salesman_code] || [], selectedMetric) : [];

              return (
                <div key={idx} 
                     className="flex flex-col bg-white border border-slate-200 rounded-lg shadow-sm hover:border-indigo-300 transition-colors group relative overflow-hidden cursor-pointer"
                     onClick={() => handleExpandSalesman(sm.salesman_code)}>
                  <div className="p-4">
                    {targetValue > 0 && percentage >= 100 && (
                      <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none overflow-hidden z-10">
                        <div className="bg-emerald-500 text-white text-[10px] font-bold py-1 w-24 text-center transform rotate-45 absolute top-2 -right-6 shadow-sm">
                          TERCAPAI
                        </div>
                      </div>
                    )}
                    <div className="flex items-start sm:items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-lg flex flex-col items-center justify-center shrink-0 shadow-sm ${badgeProps.className}`}>
                          <span className="font-bold text-sm sm:text-base">#{idx + 1}</span>
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800 text-sm sm:text-base flex items-center pr-12 sm:pr-0" title={sm.salesman_name}>
                            {sm.salesman_name.split(' ')[0]} {badgeProps.icon}
                          </h3>
                          <p className="text-xs text-slate-500 flex items-center mt-0.5">
                            <Users className="w-3 h-3 mr-1 text-slate-400" /> {sm.total_customers} Toko
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end z-10 w-full sm:w-auto mt-0">
                        <p className="text-[10px] uppercase font-semibold text-slate-400 mb-0.5 max-sm:hidden">{metricConfig?.label}</p>
                        <p className="text-base sm:text-xl font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded-md inline-block">{displayValue}</p>
                      </div>
                    </div>
                    
                    {targetValue > 0 ? (
                      <div className="mt-3 pt-3 border-t border-slate-100 w-full">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-[10px] font-medium text-slate-500">
                            Target: <span className="font-semibold text-slate-700">{metricConfig?.format === 'currency' ? formatCurrency(targetValue) : `${targetValue.toLocaleString('id-ID')}${metricConfig?.suffix || ''}`}</span>
                          </span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${percentage >= 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'}`}>
                            {percentage.toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className={`h-1.5 rounded-full ${percentage >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} 
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          ></div>
                        </div>
                          {selectedMetric === 'payment_3c' && (
                            <div className="text-[9px] font-black text-rose-500 mt-2 uppercase text-left flex flex-col gap-0.5 leading-tight">
                              <div>Sisa Piutang 3C: Rp {new Intl.NumberFormat('id-ID').format(Number(sm.sisa_piutang_3c) || 0)}</div>
                              <div>Payment 3C + Piutang 3C = Rp {new Intl.NumberFormat('id-ID').format((Number(sm.payment_3c) || 0) + (Number(sm.sisa_piutang_3c) || 0))}</div>
                            </div>
                          )}
                        {selectedMetric === 'payment_3c_lcd' && (
                          <div className="mt-2 pt-2 border-t border-slate-100 flex flex-col gap-1.5">
                             <div className="flex items-center gap-2">
                               <div className={`px-2 py-1 rounded text-[10px] font-black uppercase ${Number(sm.points_3c_lcd) >= 40 ? 'bg-emerald-100 text-emerald-700' : Number(sm.points_3c_lcd) === 0 ? 'bg-slate-100 text-slate-600' : 'bg-rose-100 text-rose-700'}`}>
                                 POIN KPI: {sm.points_3c_lcd > 0 ? `+${sm.points_3c_lcd}` : sm.points_3c_lcd}
                               </div>
                             </div>
                             <div className="text-[9px] font-black text-rose-500 uppercase text-left flex flex-col gap-0.5 leading-tight">
                                <div>Sisa Piutang 3C: Rp {new Intl.NumberFormat('id-ID').format(Number(sm.sisa_piutang_3c) || 0)}</div>
                                <div>Payment 3C + Piutang 3C + Omset LCD = Rp {new Intl.NumberFormat('id-ID').format((Number(sm.payment_3c_lcd) || 0) + (Number(sm.sisa_piutang_3c) || 0))}</div>
                             </div>
                          </div>
                        )}
                        {selectedMetric === 'omset_lcd' && (
                          <div className="mt-2 pt-2 border-t border-slate-100">
                             <div className="flex items-center gap-2">
                               <div className={`px-2 py-1 rounded text-[10px] font-black uppercase ${Number(sm.points_omset_lcd) >= 10 ? 'bg-emerald-100 text-emerald-700' : Number(sm.points_omset_lcd) === 0 ? 'bg-slate-100 text-slate-600' : 'bg-rose-100 text-rose-700'}`}>
                                 POIN KPI: {sm.points_omset_lcd > 0 ? `+${sm.points_omset_lcd}` : sm.points_omset_lcd}
                               </div>
                             </div>
                          </div>
                        )}
                        {selectedMetric === 'visit_customer' && (
                          <div className="mt-2 pt-2 border-t border-slate-100">
                             <div className="flex items-center gap-2">
                               <div className={`px-2 py-1 rounded text-[10px] font-black uppercase ${Number(sm.points_visit_customer) >= 10 ? 'bg-emerald-100 text-emerald-700' : Number(sm.points_visit_customer) === 0 ? 'bg-slate-100 text-slate-600' : 'bg-rose-100 text-rose-700'}`}>
                                 POIN KPI: {sm.points_visit_customer > 0 ? `+${sm.points_visit_customer}` : sm.points_visit_customer}
                               </div>
                             </div>
                          </div>
                        )}
                        {selectedMetric === 'co_3c' && (
                          <div className="mt-2 pt-2 border-t border-slate-100">
                             <div className="flex items-center gap-2">
                               <div className={`px-2 py-1 rounded text-[10px] font-black uppercase ${Number(sm.points_co_3c) >= 10 ? 'bg-emerald-100 text-emerald-700' : Number(sm.points_co_3c) === 0 ? 'bg-slate-100 text-slate-600' : 'bg-rose-100 text-rose-700'}`}>
                                 POIN KPI: {sm.points_co_3c > 0 ? `+${sm.points_co_3c}` : sm.points_co_3c}
                               </div>
                             </div>
                          </div>
                        )}
                        {selectedMetric === 'omset_5jt' && (
                          <div className="mt-2 pt-2 border-t border-slate-100">
                             <div className="flex items-center gap-2">
                               <div className={`px-2 py-1 rounded text-[10px] font-black uppercase ${Number(sm.points_omset_5jt) >= 10 ? 'bg-emerald-100 text-emerald-700' : Number(sm.points_omset_5jt) === 0 ? 'bg-slate-100 text-slate-600' : 'bg-rose-100 text-rose-700'}`}>
                                 POIN KPI: {sm.points_omset_5jt > 0 ? `+${sm.points_omset_5jt}` : sm.points_omset_5jt}
                               </div>
                             </div>
                          </div>
                        )}
                        {selectedMetric === 'idle_customers' && (
                          <div className="mt-2 pt-2 border-t border-slate-100">
                             <div className="flex items-center gap-2">
                               <div className={`px-2 py-1 rounded text-[10px] font-black uppercase ${Number(sm.points_idle_customers) >= 10 ? 'bg-emerald-100 text-emerald-700' : Number(sm.points_idle_customers) === 0 ? 'bg-slate-100 text-slate-600' : 'bg-rose-100 text-rose-700'}`}>
                                 POIN KPI: {sm.points_idle_customers > 0 ? `+${sm.points_idle_customers}` : sm.points_idle_customers}
                               </div>
                             </div>
                          </div>
                        )}
                        {selectedMetric === 'program_spu_achieved' && (
                          <div className="mt-2 pt-2 border-t border-slate-100">
                             <div className="flex items-center gap-2">
                               <div className={`px-2 py-1 rounded text-[10px] font-black uppercase ${Number(sm.points_program_spu) >= 10 ? 'bg-emerald-100 text-emerald-700' : Number(sm.points_program_spu) === 0 ? 'bg-slate-100 text-slate-600' : 'bg-rose-100 text-rose-700'}`}>
                                 POIN KPI: {sm.points_program_spu > 0 ? `+${sm.points_program_spu}` : sm.points_program_spu}
                               </div>
                             </div>
                          </div>
                        )}
                        {selectedMetric === 'perbaikan_display' && (
                          <div className="mt-2 pt-2 border-t border-slate-100">
                             <div className="flex items-center gap-2">
                               <div className={`px-2 py-1 rounded text-[10px] font-black uppercase ${(Number(sm.points_perbaikan_display) >= 10 || Number(sm.points_leader_perbaikan_display) >= 10) ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                 POIN KPI: {Number(sm.points_perbaikan_display) > 0 ? `+${sm.points_perbaikan_display}` : Number(sm.points_leader_perbaikan_display) > 0 ? `+${sm.points_leader_perbaikan_display} (Team)` : 0}
                               </div>
                             </div>
                          </div>
                        )}
                        {selectedMetric === 'pemasangan_spanduk' && (
                          <div className="mt-2 pt-2 border-t border-slate-100">
                             <div className="flex items-center gap-2">
                               <div className={`px-2 py-1 rounded text-[10px] font-black uppercase ${(Number(sm.points_pemasangan_spanduk) >= 10 || Number(sm.points_leader_pemasangan_spanduk) >= 10) ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                 POIN KPI: {Number(sm.points_pemasangan_spanduk) > 0 ? `+${sm.points_pemasangan_spanduk}` : Number(sm.points_leader_pemasangan_spanduk) > 0 ? `+${sm.points_leader_pemasangan_spanduk} (Team)` : 0}
                               </div>
                             </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mt-3 pt-3 border-t border-slate-100 w-full flex justify-end">
                        <p className="text-[10px] text-slate-400 italic">Target belum diatur</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Modal for Store Details */}
          <AnimatePresence>
            {expandedSalesmanRow && (
              <div 
                className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
                onClick={() => handleExpandSalesman('')}
              >
                <motion.div 
                  variants={kpiGenieAnimation}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col" 
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-4 border-b bg-indigo-50 flex items-center justify-between sticky top-0 z-20">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-indigo-200 shadow-lg">
                        <Trophy className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                          {METRICS.find(m => m.id === selectedMetric)?.label}
                        </h3>
                        <p className="text-[10px] font-bold text-indigo-600">
                          DETAIL TOKO • {filteredData.find(sm => sm.salesman_code === expandedSalesmanRow)?.salesman_name}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleExpandSalesman('')}
                      className="w-8 h-8 rounded-lg bg-white border shadow-sm flex items-center justify-center text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-all font-bold"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                    {['perbaikan_display', 'pemasangan_spanduk'].includes(selectedMetric) && (
                      <ManualKpiLogger 
                        metricId={selectedMetric}
                        salesmanCode={expandedSalesmanRow}
                        periodMonth={periodMonth}
                        periodYear={periodYear}
                        onSave={() => {
                          handleExpandSalesman(expandedSalesmanRow); // Force refresh store data
                          onDataChange(); // Refresh summary
                        }}
                      />
                    )}

                    <div className="mb-4 flex items-center justify-between">
                      <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <Users className="w-3 h-3" /> List Kontribusi Toko
                      </h4>
                      {!isLoadingStoreData && (
                        <span className="bg-indigo-600 text-white text-[10px] font-black px-3 py-1 rounded-lg shadow-sm shadow-indigo-100">
                           {getStoresForKpi(storeDataCache[expandedSalesmanRow] || [], selectedMetric).length} TOKO
                        </span>
                      )}
                    </div>

                    <StoreDataList 
                      isLoading={isLoadingStoreData}
                      stores={getStoresForKpi(storeDataCache[expandedSalesmanRow] || [], selectedMetric)}
                      metricConfig={METRICS.find((m: any) => m.id === selectedMetric)}
                    />
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
          </>
        )}
      </CardContent>
    </>
  );
}
