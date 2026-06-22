import React from 'react';
import { METRICS, formatCurrency } from './constants';

export function MetricsGrid({ detailedSalesmanData, targets, expandedKpiCard, handleExpandKpiCard }: any) {
  if (!detailedSalesmanData) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-6">
      {([...METRICS].sort((a, b) => {
        const targetRecord = targets.find((t: any) => t.salesman_code === detailedSalesmanData?.salesman_code);
        const targetA = targetRecord ? (Number(targetRecord[a.targetKey]) || 0) : 0;
        const targetB = targetRecord ? (Number(targetRecord[b.targetKey]) || 0) : 0;
        const valueA = Number(detailedSalesmanData?.[a.id]) || 0;
        const valueB = Number(detailedSalesmanData?.[b.id]) || 0;
        
        const hasTargetA = targetA > 0;
        const hasTargetB = targetB > 0;
        
        if (hasTargetA && !hasTargetB) return -1;
        if (!hasTargetA && hasTargetB) return 1;
        
        if (hasTargetA && hasTargetB) {
          const pctA = (valueA / targetA) * 100;
          const pctB = (valueB / targetB) * 100;
          return pctB - pctA;
        }
        return 0;
      })).map((metric: any) => {
        const value = detailedSalesmanData[metric.id] || 0;
        const targetRecord = targets.find((t: any) => t.salesman_code === detailedSalesmanData.salesman_code);
        const targetValue = targetRecord ? (targetRecord[metric.targetKey] || 0) : 0;
        
        let percentage = 0;
        if (targetValue > 0) {
          percentage = (value / targetValue) * 100;
        }

        const displayValue = metric.format === 'currency' 
          ? formatCurrency(value) 
          : metric.format === 'percentage'
            ? `${value.toLocaleString('id-ID', { maximumFractionDigits: 2 })}%`
            : `${value.toLocaleString('id-ID')}${metric.suffix || ''}`;
          
        const displayTarget = metric.format === 'currency' 
          ? formatCurrency(targetValue) 
          : metric.format === 'percentage'
            ? `${targetValue.toLocaleString('id-ID', { maximumFractionDigits: 2 })}%`
            : `${targetValue.toLocaleString('id-ID')}${metric.suffix || ''}`;

        const isExpanded = expandedKpiCard === metric.id;
        
        return (
          <div key={metric.id} className="flex flex-col">
            <div onClick={() => handleExpandKpiCard(metric.id, detailedSalesmanData.salesman_code)} className={`bg-white border rounded-lg p-4 shadow-sm hover:border-indigo-300 transition-colors relative overflow-hidden cursor-pointer h-full flex flex-col ${isExpanded ? 'border-indigo-300 ring-1 ring-indigo-200 shadow-md' : ''}`}>
              {targetValue > 0 && percentage >= 100 && (
                <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none overflow-hidden z-10">
                  <div className="bg-emerald-500 text-white text-[10px] font-bold py-1 w-24 text-center transform rotate-45 absolute top-2 -right-6 shadow-sm">
                    TERCAPAI
                  </div>
                </div>
              )}
              <p className="text-xs uppercase font-bold text-slate-500 mb-1 leading-tight">{metric.label}</p>
              
              <div className="mt-2 mb-3">
                <p className="text-xl font-bold text-indigo-700">{displayValue}</p>
                {targetValue > 0 && (
                  <p className="text-xs text-slate-400 mt-1">Target: <span className="font-medium text-slate-600">{displayTarget}</span></p>
                )}
              </div>
              
              {targetValue > 0 ? (
                <div className="mt-auto pt-2 border-t border-slate-100">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-medium text-slate-500">Pencapaian Target</span>
                    <span className={`text-xs font-bold ${percentage >= 100 ? 'text-emerald-600' : 'text-indigo-600'}`}>
                      {percentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className={`h-1.5 rounded-full ${percentage >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} 
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    ></div>
                  </div>
                  
                  {/* Point details for various metrics */}
                  <div className="mt-2 pt-2 border-t border-slate-100 flex flex-col gap-2">
                     <div className="flex items-center gap-2">
                       <div className={`px-2 py-1 rounded text-[10px] font-black uppercase ${Number(detailedSalesmanData['points_' + metric.id]) >= 10 ? 'bg-emerald-100 text-emerald-700' : Number(detailedSalesmanData['points_' + metric.id]) === 0 ? 'bg-slate-100 text-slate-600' : 'bg-rose-100 text-rose-700'}`}>
                         POIN KPI: {detailedSalesmanData['points_' + metric.id] > 0 ? `+${detailedSalesmanData['points_' + metric.id]}` : (detailedSalesmanData['points_' + metric.id] || 0)}
                       </div>
                     </div>
                     {metric.id === 'payment_3c_lcd' && (
                       <div className="text-[9px] font-black text-rose-500 uppercase text-left flex flex-col gap-0.5 leading-tight">
                          <div>Sisa Piutang 3C: Rp {new Intl.NumberFormat('id-ID').format(Number(detailedSalesmanData.sisa_piutang_3c) || 0)}</div>
                          <div>Payment 3C + Piutang 3C + Omset LCD = Rp {new Intl.NumberFormat('id-ID').format((Number(detailedSalesmanData.payment_3c_lcd) || 0) + (Number(detailedSalesmanData.sisa_piutang_3c) || 0))}</div>
                       </div>
                     )}
                  </div>

                </div>
              ) : (
                <div className="mt-auto pt-2 border-t border-slate-100 flex justify-end">
                  <span className="text-[10px] italic text-slate-400">Target belum diatur</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
