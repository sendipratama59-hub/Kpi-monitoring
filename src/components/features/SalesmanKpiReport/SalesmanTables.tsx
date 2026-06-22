import React, { useState } from 'react';
import { formatCurrency } from './constants';
import { AnimatePresence, motion } from 'motion/react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { NotaModal } from '../CustomerAnalysis/NotaModal';

interface SalesmanTablesProps {
  storeData: any[];
}

export function SalesmanTables({ storeData }: SalesmanTablesProps) {
  const [selectedNota, setSelectedNota] = useState<any | null>(null);

  const groupDataByDeliveryNo = (data: any[], amountField: string) => {
    const grouped: Record<string, any> = {};
    let noIndex = 0;
    
    data.forEach(item => {
      const key = item.delivery_no || `empty-${noIndex++}`;
      if (!grouped[key]) {
        grouped[key] = { ...item };
      } else {
        grouped[key][amountField] = (Number(grouped[key][amountField]) || 0) + (Number(item[amountField]) || 0);
      }
    });
    return Object.values(grouped);
  };

  // Filter for Payment 3C (is_paid === true and from_manual/from_program/etc are false)
  const rawPayment3C = storeData.filter(item => item.is_paid && !item.from_program && !item.from_spu && !item.from_manual && !item.from_piutang);
  const payment3C = groupDataByDeliveryNo(rawPayment3C, 'payment_amount');
  
  // Filter for Piutang 3C (from_piutang === true)
  const rawPiutang3C = storeData.filter(item => item.from_piutang);
  const piutang3C = groupDataByDeliveryNo(rawPiutang3C, 'total_amount');
  
  // Omset LCD (is_paid === false, from_program === false, from_spu === false, and omset_lcd > 0)
  // Or just accumulate from storeData where omset_lcd > 0.
  const totalOmsetLcd = storeData.reduce((sum, item) => sum + (Number(item.omset_lcd) || 0), 0);
  
  const totalPayment = rawPayment3C.reduce((sum, item) => sum + (Number(item.payment_amount) || 0), 0);
  const totalPiutang = rawPiutang3C.reduce((sum, item) => sum + (Number(item.total_amount) || 0), 0);
  
  const grandTotal = totalPayment + totalPiutang + totalOmsetLcd;

  return (
    <div className="space-y-8 mt-6">
      <div className="bg-white shadow-xl border border-indigo-50 rounded-xl overflow-hidden">
        <div className="border-b border-slate-50 flex flex-row items-center justify-between p-4">
          <h3 className="text-sm font-black text-emerald-600 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" /> PAYMENT 3C
          </h3>
          <div className="text-[10px] font-black text-slate-400 uppercase px-3 py-1 bg-slate-50 rounded-lg border border-slate-100">
            {payment3C.length} Transaksi
          </div>
        </div>
        <div className="w-full">
          <table className="w-full text-left border-collapse border border-slate-300 table-fixed">
            <thead className="sticky top-0 bg-slate-50 shadow-sm z-10 text-slate-800">
              <tr className="border-b border-slate-300">
                <th className="px-2 sm:px-4 py-3 text-[10px] font-black uppercase tracking-widest bg-slate-50 border border-slate-300 w-1/4">No SD (Nota)</th>
                <th className="px-2 sm:px-4 py-3 text-[10px] font-black uppercase tracking-widest bg-slate-50 border border-slate-300 w-2/5">Customer</th>
                <th className="px-2 sm:px-4 py-3 text-[10px] font-black uppercase tracking-widest bg-slate-50 text-right border border-slate-300 w-1/4">Amount</th>
                <th className="px-2 sm:px-4 py-3 text-[10px] font-black uppercase tracking-widest bg-slate-50 text-center border border-slate-300 w-[15%]">Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {payment3C.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-xs text-slate-500 border border-slate-300">Data kosong</td>
                </tr>
              ) : payment3C.map((item, idx) => {
                const dueNum = Number(item.due_date);
                const isOverdue = !isNaN(dueNum) && dueNum > 7;
                const dueDisplay = item.due_date !== null && item.due_date !== undefined ? `${item.due_date}` : '-';
                return (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-2 sm:px-4 py-3 border border-slate-300">
                       <button 
                         onClick={() => setSelectedNota({ ...item, type: 'Payment 3C', total_amount: item.payment_amount })}
                         className="text-[10px] sm:text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline text-left break-all"
                       >
                         {item.delivery_no || '-'}
                       </button>
                    </td>
                    <td className="px-2 sm:px-4 py-3 border border-slate-300">
                      <div className="text-[10px] sm:text-xs font-bold text-slate-700 whitespace-normal line-clamp-2">
                        {item.customer_code} - {item.customer_name}
                      </div>
                    </td>
                    <td className="px-2 sm:px-4 py-3 text-right border border-slate-300">
                       <div className="text-[10px] sm:text-xs font-black text-slate-900 group-hover:text-emerald-600 transition-colors">
                         {formatCurrency(item.payment_amount)}
                       </div>
                    </td>
                    <td className="px-2 sm:px-4 py-3 text-center border border-slate-300">
                       <div className="flex flex-col items-center justify-center">
                         <span className={`text-[10px] sm:text-xs font-bold ${isOverdue ? 'text-rose-600' : 'text-slate-700'}`}>{dueDisplay}</span>
                         {isOverdue && <span className="text-[8px] font-black tracking-tighter text-rose-500 uppercase mt-0.5">Overdue</span>}
                       </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white shadow-xl border border-indigo-50 rounded-xl overflow-hidden">
        <div className="border-b border-slate-50 flex flex-row items-center justify-between p-4">
          <h3 className="text-sm font-black text-rose-600 flex items-center gap-2">
            <TrendingDown className="w-5 h-5" /> PIUTANG 3C
          </h3>
          <div className="text-[10px] font-black text-slate-400 uppercase px-3 py-1 bg-slate-50 rounded-lg border border-slate-100">
            {piutang3C.length} Transaksi
          </div>
        </div>
        <div className="w-full">
          <table className="w-full text-left border-collapse border border-slate-300 table-fixed">
            <thead className="sticky top-0 bg-slate-50 shadow-sm z-10 text-slate-800">
              <tr className="border-b border-slate-300">
                <th className="px-2 sm:px-4 py-3 text-[10px] font-black uppercase tracking-widest bg-slate-50 border border-slate-300 w-1/4">No SD (Nota)</th>
                <th className="px-2 sm:px-4 py-3 text-[10px] font-black uppercase tracking-widest bg-slate-50 border border-slate-300 w-2/5">Customer</th>
                <th className="px-2 sm:px-4 py-3 text-[10px] font-black uppercase tracking-widest bg-slate-50 text-right border border-slate-300 w-1/4">Amount</th>
                <th className="px-2 sm:px-4 py-3 text-[10px] font-black uppercase tracking-widest bg-slate-50 text-center border border-slate-300 w-[15%]">Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {piutang3C.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-xs text-slate-500 border border-slate-300">Data kosong</td>
                </tr>
              ) : piutang3C.map((item, idx) => {
                const dueNum = Number(item.due_date);
                const isWarning = !isNaN(dueNum) && dueNum >= 5 && dueNum <= 7;
                const isOverdue = !isNaN(dueNum) && dueNum > 7;
                const dueDisplay = item.due_date !== null && item.due_date !== undefined ? `${item.due_date}` : '-';
                return (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-2 sm:px-4 py-3 border border-slate-300">
                       <button 
                         onClick={() => setSelectedNota({ type: 'Piutang 3C', ...item })}
                         className="text-[10px] sm:text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline text-left break-all"
                       >
                         {item.delivery_no || '-'}
                       </button>
                    </td>
                    <td className="px-2 sm:px-4 py-3 border border-slate-300">
                      <div className="text-[10px] sm:text-xs font-bold text-slate-700 whitespace-normal line-clamp-2">
                        {item.customer_code} - {item.customer_name}
                      </div>
                    </td>
                    <td className="px-2 sm:px-4 py-3 text-right border border-slate-300">
                       <div className="text-[10px] sm:text-xs font-black text-slate-900 group-hover:text-emerald-600 transition-colors">
                         {formatCurrency(item.total_amount)}
                       </div>
                    </td>
                    <td className="px-2 sm:px-4 py-3 text-center border border-slate-300">
                       <div className="flex flex-col items-center justify-center">
                         <span className={`text-[10px] sm:text-xs font-bold ${isOverdue ? 'text-rose-600' : isWarning ? 'text-amber-600' : 'text-slate-700'}`}>{dueDisplay}</span>
                         {isWarning && <span className="text-[8px] font-black tracking-tighter text-amber-500 uppercase mt-0.5">Akan Overdue</span>}
                         {isOverdue && <span className="text-[8px] font-black tracking-tighter text-rose-500 uppercase mt-0.5">Overdue</span>}
                       </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
        <h4 className="text-sm font-bold text-indigo-900 mb-2 whitespace-nowrap overflow-x-auto w-full text-center sm:text-left">Total Payment 3C + Piutang 3C + Omset LCD = <span className="text-xl font-black text-indigo-700 ml-2">{formatCurrency(grandTotal)}</span></h4>
        <div className="flex flex-wrap gap-4 text-xs font-medium text-indigo-700 justify-center sm:text-left">
           <span>Payment 3C: {formatCurrency(totalPayment)}</span>
           <span>Piutang 3C: {formatCurrency(totalPiutang)}</span>
           <span>Omset LCD: {formatCurrency(totalOmsetLcd)}</span>
        </div>
      </div>
      
      {selectedNota && (
        <NotaModal 
          data={selectedNota} 
          onClose={() => setSelectedNota(null)} 
        />
      )}
    </div>
  );
}
