import React from 'react';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { METRICS, formatCurrency } from './constants';

interface StoreDataListProps {
  isLoading: boolean;
  stores: {
    name: string;
    value: number;
    sortValue: number;
    displayValue?: string;
    extraText?: string;
    customerJoin?: string;
    customerTargets?: number;
    customerAchieve?: number;
    percentAchieved?: number;
    shortage?: number;
    isProgramAchieved?: boolean;
  }[];
  metricConfig: typeof METRICS[0] | undefined;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 25 } as const
  }
};

export function StoreDataList({ isLoading, stores, metricConfig }: StoreDataListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6 text-indigo-500">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span className="text-sm font-medium">Memuat data toko...</span>
      </div>
    );
  }

  if (metricConfig?.id === 'visit_customer') {
    return (
      <p className="text-sm text-slate-400 italic bg-white p-3 rounded border border-slate-100 text-center">
        Metrik ini merupakan persentase keseluruhan salesman, bukan berdasarkan kontribusi per toko.
      </p>
    );
  }

  if (stores.length === 0) {
    return (
      <p className="text-sm text-slate-400 italic bg-white p-3 rounded border border-slate-100 text-center">
        Tidak ada data toko dengan kontribusi KPI ini.
      </p>
    );
  }

  if (metricConfig?.id === 'program_bulanan_achieved' || metricConfig?.id === 'program_spu_achieved') {
    return (
      <div className="overflow-x-auto w-full border border-slate-200 rounded-lg">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 border-b text-slate-600 font-medium">
            <tr>
              <th className="px-4 py-2 w-10 text-center">No</th>
              <th className="px-4 py-2 min-w-[150px]">Nama Toko</th>
              <th className="px-4 py-2 text-right">Target</th>
              <th className="px-4 py-2 text-right">Achieve</th>
              <th className="px-4 py-2 text-right text-red-600">Kekurangan</th>
              <th className="px-4 py-2 text-right">%</th>
              <th className="px-4 py-2 text-center w-24">
                {metricConfig?.id === 'program_spu_achieved' ? 'Reward' : 'Join'}
              </th>
            </tr>
          </thead>
          <motion.tbody 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="divide-y text-slate-700 bg-white"
          >
            {stores.map((store, i) => {
              const formatCurr = (val: number) => {
                if (metricConfig?.id === 'program_spu_achieved') {
                  return val.toLocaleString('id-ID'); // Tidak pakai Rp untuk SPU (SKU)
                }
                return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
              };
              return (
                <motion.tr variants={itemVariants} key={i} className="hover:bg-slate-50">
                  <td className="px-4 py-2 text-center text-slate-500">{i + 1}</td>
                  <td className="px-4 py-2 font-medium">{store.name}</td>
                  <td className="px-4 py-2 text-right font-medium">{formatCurr(store.customerTargets || 0)}</td>
                  <td className="px-4 py-2 text-right text-indigo-600 font-semibold">{formatCurr(store.customerAchieve || 0)}</td>
                  <td className="px-4 py-2 text-right text-red-600 font-medium">
                    {store.shortage && store.shortage > 0 ? formatCurr(store.shortage) : '-'}
                  </td>
                  <td className="px-4 py-2 text-right font-bold">
                    <span className={store.isProgramAchieved ? "text-emerald-600" : "text-amber-600"}>
                      {(store.percentAchieved || 0).toFixed(0)}%
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center">
                    {metricConfig?.id === 'program_spu_achieved' ? (
                      <span className='text-sm font-semibold text-slate-700'>
                        {store.customerJoin && !isNaN(Number(store.customerJoin)) 
                          ? new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(store.customerJoin)) 
                          : store.customerJoin || '-'}
                      </span>
                    ) : store.customerJoin?.toLowerCase() === 'yes' ? (
                      <CheckCircle2 className="w-5 h-5 mx-auto text-emerald-500" />
                    ) : store.customerJoin?.toLowerCase() === 'no' ? (
                      <XCircle className="w-5 h-5 mx-auto text-red-500" />
                    ) : (
                      <span className="text-slate-400 text-xs">-</span>
                    )}
                  </td>
                </motion.tr>
              );
            })}
          </motion.tbody>
        </table>
      </div>
    );
  }

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2"
    >
      {stores.map((store, i) => (
        <motion.div variants={itemVariants} key={i} className="bg-white p-3 border border-slate-200 rounded-md flex flex-col justify-between items-start shadow-sm whitespace-nowrap overflow-hidden hover:border-indigo-300 transition-colors">
          <div className="flex w-full justify-between items-center">
            <span className={`${!store.extraText ? 'text-base font-semibold' : 'text-sm font-medium'} text-slate-700 truncate mr-2`} title={store.name}>{store.name}</span>
            {!(store.value === 1 && metricConfig?.suffix?.includes('Toko') && !store.displayValue) && (
              <span className={`${!store.extraText ? 'text-base' : 'text-sm'} font-bold text-indigo-600 shrink-0`}>
                {store.displayValue
                  ? store.displayValue
                  : (metricConfig?.format === 'currency' 
                  ? formatCurrency(store.value)
                  : `${store.value.toLocaleString('id-ID')}${metricConfig?.suffix || ''}`)
                }
              </span>
            )}
          </div>
          {store.extraText && (
            <span className="text-xs text-slate-500 truncate w-full mt-1" title={store.extraText}>{store.extraText}</span>
          )}
        </motion.div>
      ))}
    </motion.div>
  );
}
