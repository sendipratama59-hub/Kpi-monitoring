import React from 'react';
import { ReportCard } from './ReportCard';
import { motion } from 'motion/react';
import { Calendar, User, FileText, Info } from 'lucide-react';

interface TargetItem {
  id: string;
  title: string;
  target: number;
  actual: number;
  reward?: number;
  colorTheme?: 'indigo' | 'rose' | 'amber' | 'emerald';
}

interface ReportViewProps {
  customerName: string;
  periodeRange: string;
  targets: TargetItem[];
}

export const ReportView = ({ customerName, periodeRange, targets }: ReportViewProps) => {
  return (
    <div className="w-full bg-white animate-in fade-in duration-700">
      <div className="max-w-[1400px] mx-auto px-0 md:px-4 py-0 md:py-6">
        <div className="flex flex-col lg:flex-row gap-6 lg:items-start p-2 md:p-0">
          
          {/* Header Section / Sidebar */}
          <div className="lg:w-1/4 space-y-4 lg:sticky lg:top-4">
            <div className="space-y-2">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="inline-flex items-center gap-2 px-2 py-1 bg-indigo-600 text-white rounded-md text-[8px] font-black uppercase tracking-widest shadow-sm"
              >
                <FileText className="w-2.5 h-2.5" />
                LAPORAN KPI
              </motion.div>
              
              <motion.h1 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-4xl md:text-5xl font-black text-slate-900 leading-[0.8] tracking-tighter uppercase"
              >
                TARGET<br />
                <span className="text-indigo-600">CUSTOMER</span>
              </motion.h1>
            </div>

            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-4"
            >
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-indigo-600 shrink-0 shadow-sm">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">PELANGGAN</p>
                    <h2 className="text-sm font-black text-slate-900 leading-tight truncate uppercase">{customerName}</h2>
                  </div>
                </div>

                <div className="flex gap-2">
                  <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-600 shrink-0 shadow-sm">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">PERIODE</p>
                    <p className="text-[10px] font-black text-slate-700 leading-tight">{periodeRange}</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200">
                <div className="flex items-start gap-2 p-2 bg-amber-50 rounded-lg border border-amber-100">
                  <Info className="w-3 h-3 text-amber-600 shrink-0" />
                  <p className="text-[8px] font-bold text-amber-900/70 italic leading-snug">
                    Est. reward berdasarkan progres saat ini.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right Content */}
          <div className="lg:w-3/4 space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
               <h3 className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{customerName}</h3>
               <div className="text-[8px] font-black text-indigo-600 uppercase tracking-widest">
                 {periodeRange}
               </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {targets.map((target, idx) => (
                <ReportCard 
                  key={target.id}
                  index={idx}
                  title={target.title}
                  target={target.target}
                  actual={target.actual}
                  reward={target.reward}
                  colorTheme={target.colorTheme}
                />
              ))}
            </div>

            <div className="pt-4 opacity-20 text-[7px] font-black uppercase tracking-widest flex justify-between">
              <span>Ringkasan Performa</span>
              <span>Dibuat: {new Date().toLocaleDateString('id-ID')}</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

ReportView.displayName = 'ReportView';
