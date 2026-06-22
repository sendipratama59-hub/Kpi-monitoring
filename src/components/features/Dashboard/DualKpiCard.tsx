import React from 'react';
import { LucideIcon, GripVertical } from 'lucide-react';

interface MetricData {
  label: string;
  value: number;
  target?: number;
  icon: LucideIcon;
  colorTheme: 'indigo' | 'violet' | 'emerald' | 'teal' | 'rose' | 'amber' | 'blue' | 'slate';
  subText?: React.ReactNode;
}

interface DualKpiCardProps {
  leftMetric: MetricData;
  rightMetric?: MetricData;
  className?: string;
  showHandle?: boolean;
}

const THEMES = {
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', progress: 'bg-indigo-600', subBg: '' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-600', progress: 'bg-violet-600', subBg: 'bg-slate-50/50' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', progress: 'bg-emerald-600', subBg: '' },
  teal: { bg: 'bg-teal-50', text: 'text-teal-600', progress: 'bg-teal-600', subBg: 'bg-slate-50/50' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-600', progress: 'bg-rose-600', subBg: '' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600', progress: 'bg-amber-600', subBg: 'bg-slate-50/50' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-600', progress: 'bg-blue-600', subBg: '' },
  slate: { bg: 'bg-slate-50', text: 'text-slate-600', progress: 'bg-slate-600', subBg: 'bg-slate-50/50' },
};

export function DualKpiCard({ leftMetric, rightMetric, className = "", showHandle = false }: DualKpiCardProps) {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 }).format(val);
  };

  const calculateProgress = (val: number, target?: number) => {
    if (!target || target === 0) return 0;
    return Math.min(100, Math.round((val / target) * 100));
  };

  const renderMetric = (metric: MetricData, isRight: boolean) => {
    const theme = THEMES[metric.colorTheme];
    const progress = calculateProgress(metric.value, metric.target);
    const Icon = metric.icon;

    return (
      <div className={`flex-1 p-6 space-y-4 ${isRight ? theme.subBg : ''}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 ${theme.bg} rounded-lg ${theme.text}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{metric.label}</p>
              <h3 className="text-2xl font-black text-slate-900">Rp {formatCurrency(metric.value)}</h3>
            </div>
          </div>
          {progress >= 100 && (
            <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded-md uppercase">Goal Hit!</span>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-end text-xs">
            <span className="text-slate-500 font-medium text-[10px] uppercase">
              {metric.target ? `Pencapaian Target: Rp ${formatCurrency(metric.target)}` : 'No Target Set'}
            </span>
            {metric.target && (
              <span className={`font-bold text-sm ${progress >= 100 ? 'text-emerald-600' : theme.text}`}>
                {progress}%
              </span>
            )}
          </div>
          <div className="w-full bg-slate-100 rounded-lg h-3 overflow-hidden">
            <div 
              className={`h-full rounded-lg transition-all duration-1000 ease-out shadow-sm ${progress >= 100 ? 'bg-emerald-500' : theme.progress}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          {metric.subText && (
            <div className={`text-[9px] font-black uppercase mt-1.5 text-left leading-relaxed ${metric.label.includes('3C') ? 'text-rose-500' : 'text-slate-400'}`}>
              {metric.subText}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`bg-white rounded-xl border ${showHandle ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-slate-200'} shadow-sm overflow-hidden flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-100 relative ${className}`}>
      {showHandle && (
        <div className="absolute top-1/2 -left-3 -translate-y-1/2 bg-white border border-slate-200 rounded-md p-1 shadow-sm text-slate-400 z-10 hidden md:block">
          <GripVertical className="w-4 h-4" />
        </div>
      )}
      {renderMetric(leftMetric, false)}
      {rightMetric ? renderMetric(rightMetric, true) : null}
    </div>
  );
}
