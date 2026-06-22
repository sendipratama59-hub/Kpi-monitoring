import React from 'react';

interface KpiCardProps {
  label: string;
  value: number;
  isCurrency: boolean;
  colorClass: string;
  targetValue?: number;
  suffix?: string;
}

export function KpiCard({
  label,
  value,
  isCurrency,
  colorClass,
  targetValue,
  suffix = 'Toko'
}: KpiCardProps) {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 }).format(val);
  };

  const calculateProgress = (val: number, target: number) => {
    if (!target || target === 0) return 0;
    return Math.min(100, Math.round((val / target) * 100));
  };

  const displayValue = isCurrency ? formatCurrency(value) : `${value} ${suffix}`;
  const progress = targetValue ? calculateProgress(value, targetValue) : null;

  return (
    <div className={`p-4 rounded-xl border ${colorClass} shadow-sm hover:shadow-md transition-all relative overflow-hidden group flex flex-col justify-between text-center`}>
      <div className="mb-2">
        <p className="text-[10px] sm:text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">{label}</p>
        <h3 className="text-lg sm:text-xl font-bold text-slate-800 leading-tight">{displayValue}</h3>
      </div>
      {targetValue !== undefined && targetValue > 0 && (
        <div className="mt-2 space-y-1 z-10 relative text-left">
          <div className="flex justify-between text-[10px] font-medium text-slate-600">
            <span>Target: {isCurrency ? formatCurrency(targetValue) : `${targetValue} ${suffix}`}</span>
            <span className={progress && progress >= 100 ? 'text-emerald-600 font-bold' : ''}>{progress}%</span>
          </div>
          <div className="w-full bg-white/50 rounded-full h-1.5 overflow-hidden">
            <div 
              className={`h-1.5 rounded-full transition-all duration-500 ease-out ${progress && progress >= 100 ? 'bg-emerald-500' : 'bg-current opacity-70'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
