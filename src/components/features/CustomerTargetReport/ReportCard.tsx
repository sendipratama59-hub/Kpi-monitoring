import React from 'react';
import { Target, CheckCircle2, AlertCircle, TrendingUp, ArrowUpRight, Award, ChevronRight } from 'lucide-react';
import { Button } from '../../ui/Button';
import { cn } from '../../../utils/cn';
import { motion } from 'motion/react';

interface ReportCardProps {
  title: string;
  target: number;
  actual: number;
  reward?: number;
  status?: 'BELUM TERCAPAI' | 'MASIH JAUH' | 'SEDIKIT LAGI' | 'TERCAPAI';
  colorTheme?: 'indigo' | 'rose' | 'amber' | 'emerald';
  index?: number;
}

export function ReportCard({ 
  title, 
  target, 
  actual, 
  reward = 0, 
  status,
  colorTheme = 'indigo',
  index = 0
}: ReportCardProps) {
  const percentage = Math.min(Math.round((actual / target) * 100), 100);
  const isCompleted = actual >= target;
  const remaining = Math.max(target - actual, 0);
  
  const themes = {
    indigo: {
      primary: '#6366f1',
      secondary: '#4f46e5',
      light: '#eef2ff',
      border: 'border-indigo-100',
      text: 'text-indigo-600',
      bg: 'bg-indigo-500',
      gradient: 'from-indigo-400 via-indigo-500 to-indigo-600'
    },
    rose: {
      primary: '#f43f5e',
      secondary: '#e11d48',
      light: '#fff1f2',
      border: 'border-rose-100',
      text: 'text-rose-600',
      bg: 'bg-rose-500',
      gradient: 'from-rose-400 via-rose-500 to-rose-600'
    },
    amber: {
      primary: '#f59e0b',
      secondary: '#d97706',
      light: '#fffbeb',
      border: 'border-amber-100',
      text: 'text-amber-600',
      bg: 'bg-amber-500',
      gradient: 'from-amber-400 via-amber-500 to-amber-600'
    },
    emerald: {
      primary: '#10b981',
      secondary: '#059669',
      light: '#ecfdf5',
      border: 'border-emerald-100',
      text: 'text-emerald-600',
      bg: 'bg-emerald-500',
      gradient: 'from-emerald-400 via-emerald-500 to-emerald-600'
    }
  };

  const currentTheme = themes[colorTheme];

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('id-ID').format(num);
  };

  const statusInfo = {
    'TERCAPAI': { icon: <CheckCircle2 className="w-4 h-4" />, color: 'bg-emerald-500', text: 'text-emerald-600' },
    'SEDIKIT LAGI': { icon: <TrendingUp className="w-4 h-4" />, color: 'bg-indigo-500', text: 'text-indigo-600' },
    'BELUM TERCAPAI': { icon: <AlertCircle className="w-4 h-4" />, color: 'bg-amber-500', text: 'text-amber-600' },
    'MASIH JAUH': { icon: <AlertCircle className="w-4 h-4" />, color: 'bg-rose-500', text: 'text-rose-600' }
  };

  const getStatus = (): keyof typeof statusInfo => {
    if (status) return status;
    if (percentage >= 100) return 'TERCAPAI';
    if (percentage >= 80) return 'SEDIKIT LAGI';
    if (percentage >= 40) return 'BELUM TERCAPAI';
    return 'MASIH JAUH';
  };

  const derivedStatus = getStatus();

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className="w-full bg-slate-50/50 border border-slate-200 overflow-hidden md:rounded-xl transition-all duration-300"
    >
      <div className="flex flex-col p-3 md:p-4 space-y-3">
        {/* Header Compact */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm",
              currentTheme.bg
            )}>
              <Target className="w-4 h-4" />
            </div>
            <h3 className="font-black text-slate-900 uppercase tracking-tight text-sm md:text-base leading-tight">
              {title}
            </h3>
          </div>
          <div className={cn(
            "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest text-white shadow-sm shrink-0",
            statusInfo[derivedStatus].color
          )}>
            {derivedStatus}
          </div>
        </div>

        {/* Stats Row: Side by Side */}
        <div className="grid grid-cols-2 gap-2 md:gap-3">
          <div className="bg-white rounded-lg p-2 md:p-3 border border-slate-100 shadow-sm">
             <p className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">TARGET</p>
             <div className="flex items-baseline gap-1">
               <span className="text-base md:text-lg font-black text-slate-900 tabular-nums">
                 {formatNumber(target)}
               </span>
             </div>
          </div>
          <div className="bg-white rounded-lg p-2 md:p-3 border border-slate-100 shadow-sm">
             <p className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">AKTUAL</p>
             <div className="flex items-baseline gap-1">
               <span className={cn("text-base md:text-lg font-black tabular-nums", currentTheme.text)}>
                 {formatNumber(actual)}
               </span>
             </div>
          </div>
        </div>

        {/* Progress Section: Full Width */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center px-0.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-widest">PROGRES</span>
            </div>
          </div>
          <div className="relative h-6 md:h-7 bg-slate-100 rounded-xl overflow-hidden shadow-inner p-1">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className={cn(
                "h-full rounded-[10px] relative flex items-center justify-center transition-all shadow-sm",
                "bg-gradient-to-r",
                currentTheme.gradient
              )}
            >
              <span className="text-[10px] md:text-xs font-black text-white drop-shadow-md z-10 tabular-nums">
                {percentage}%
              </span>
              <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] opacity-20" />
            </motion.div>
          </div>
        </div>

        {/* Bottom Projection & Reward */}
        <div className="bg-white rounded-lg p-2 md:p-3 flex items-center justify-around gap-2 text-center border border-slate-200">
           <div className="flex-1">
              <p className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">KEKURANGAN</p>
              <p className="text-sm md:text-base font-black text-slate-900 leading-none">
                {formatNumber(remaining)}
              </p>
           </div>
           <div className="w-px h-4 bg-slate-200" />
           <div className="flex-1">
              <p className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">EST. REWARD</p>
              <p className="text-sm md:text-base font-black text-slate-900 leading-none">
                {formatNumber(reward)}
              </p>
           </div>
        </div>
      </div>
    </motion.div>
  );
}
