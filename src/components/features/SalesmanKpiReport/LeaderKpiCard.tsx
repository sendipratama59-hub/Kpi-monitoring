import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { formatCurrency } from './constants';

interface LeaderKpiCardProps {
  title: string;
  achievement: number;
  target: number;
  points: number;
  format?: 'currency' | 'number';
  suffix?: string;
  colorTheme?: 'amber' | 'indigo' | 'emerald' | 'sky' | 'fuchsia' | 'orange' | 'cyan' | 'rose';
  extraDetails?: string[];
}

export function LeaderKpiCard({ 
  title, 
  achievement, 
  target, 
  points, 
  format = 'number',
  suffix = '',
  colorTheme = 'amber',
  extraDetails = []
}: LeaderKpiCardProps) {
  const themes = {
    amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-900', icon: 'text-amber-600', val: 'text-amber-700', bar: 'bg-amber-500', subBorder: 'border-amber-100' },
    indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-900', icon: 'text-indigo-600', val: 'text-indigo-700', bar: 'bg-indigo-500', subBorder: 'border-indigo-100' },
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-900', icon: 'text-emerald-600', val: 'text-emerald-700', bar: 'bg-emerald-500', subBorder: 'border-emerald-100' },
    sky: { bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-900', icon: 'text-sky-600', val: 'text-sky-700', bar: 'bg-sky-500', subBorder: 'border-sky-100' },
    fuchsia: { bg: 'bg-fuchsia-50', border: 'border-fuchsia-200', text: 'text-fuchsia-900', icon: 'text-fuchsia-600', val: 'text-fuchsia-700', bar: 'bg-fuchsia-500', subBorder: 'border-fuchsia-100' },
    orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-900', icon: 'text-orange-600', val: 'text-orange-700', bar: 'bg-orange-500', subBorder: 'border-orange-100' },
    cyan: { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-900', icon: 'text-cyan-600', val: 'text-cyan-700', bar: 'bg-cyan-500', subBorder: 'border-cyan-100' },
    rose: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-900', icon: 'text-rose-600', val: 'text-rose-700', bar: 'bg-rose-500', subBorder: 'border-rose-100' },
  };

  const theme = themes[colorTheme] || themes.amber;
  const percentage = target > 0 ? (achievement / target) * 100 : 0;

  const displayAchievement = format === 'currency' ? formatCurrency(achievement) : `${achievement.toLocaleString('id-ID')}${suffix}`;
  const displayTarget = format === 'currency' ? formatCurrency(target) : `${target.toLocaleString('id-ID')}${suffix}`;

  return (
    <div className={`${theme.bg} ${theme.border} border rounded-xl p-4 shadow-sm`}>
      <div className="flex items-center gap-2 mb-4">
        <ShieldCheck className={`w-5 h-5 ${theme.icon}`} />
        <h3 className={`text-sm font-black ${theme.text} uppercase`}>TEAM LEADER KPI: {title}</h3>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* ACHIEVEMENT */}
        <div className={`bg-white p-3 rounded-xl border ${theme.subBorder} shadow-sm flex flex-col justify-center`}>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">ACHIEVEMENT TIM</p>
          <p className={`text-xl font-black ${theme.val}`}>{displayAchievement}</p>
          <p className="text-[10px] font-bold text-slate-400 mt-1 leading-tight">Target Tim: {displayTarget}</p>
          {extraDetails.length > 0 && (
            <div className="mt-2 space-y-0.5 border-t border-slate-50 pt-1">
              {extraDetails.map((detail, idx) => (
                <p key={idx} className="text-[9px] font-bold text-rose-500 uppercase leading-tight">
                  {detail}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* PENCAPAIAN % */}
        <div className={`bg-white p-3 rounded-xl border ${theme.subBorder} shadow-sm flex flex-col justify-center`}>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">PENCAPAIAN %</p>
          <div className="flex items-center gap-3">
            <p className={`text-xl font-black ${theme.val}`}>{percentage.toFixed(1)}%</p>
            <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className={`h-full ${theme.bar}`} 
                style={{ width: `${Math.min(percentage, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* POIN LEADER KPI */}
        <div className={`bg-white p-3 rounded-xl border ${theme.subBorder} shadow-sm flex flex-col justify-center`}>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">POIN LEADER KPI</p>
          <div className={`px-4 py-2 rounded-lg text-lg font-black w-fit ${points > 0 ? 'bg-emerald-50 text-emerald-700' : points < 0 ? 'bg-rose-50 text-rose-700' : 'bg-slate-50 text-slate-600'}`}>
            {points > 0 ? `+${points}` : points} PTS
          </div>
        </div>

        {/* POTENSI BONUS */}
        <div className={`bg-white p-3 rounded-xl border ${theme.subBorder} shadow-sm flex flex-col justify-center`}>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">POTENSI BONUS</p>
          <p className={`text-xl font-black ${points > 0 ? 'text-emerald-700' : points < 0 ? 'text-rose-700' : 'text-slate-600'}`}>
            {points >= 0 ? formatCurrency(points * 10000) : `-${formatCurrency(Math.abs(points * 10000))}`}
          </p>
        </div>
      </div>
    </div>
  );
}
