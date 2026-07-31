import React, { useState, useEffect } from "react";
import { ReportCard } from "./ReportCard";
import { motion } from "motion/react";
import { Calendar, User, FileText, Info, Clock, AlertTriangle } from "lucide-react";
import { cn } from "../../../utils/cn";

interface TargetItem {
  id: string;
  title: string;
  target: number;
  actual: number;
  reward?: number;
  keterangan?: string;
  colorTheme?: "indigo" | "rose" | "amber" | "emerald";
}

interface ReportViewProps {
  customerName: string;
  periodeRange: string;
  targets: TargetItem[];
}

export const ReportView = ({
  customerName,
  periodeRange,
  targets,
}: ReportViewProps) => {
  // Helper to parse period and calculate progress info
  const getPeriodInfo = (rangeStr: string) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    let daysRemaining = Math.max(1, totalDaysInMonth - now.getDate() + 1);
    let totalDays = totalDaysInMonth;
    let daysPassed = now.getDate();

    try {
      const parts = rangeStr.split("-");
      if (parts.length === 2) {
        const startPart = parts[0].trim();
        const endPart = parts[1].trim();
        
        const parseDate = (dStr: string) => {
           const dParts = dStr.split("/");
           if (dParts.length === 3) {
               return new Date(parseInt(dParts[2]), parseInt(dParts[1]) - 1, parseInt(dParts[0]));
           }
           return null;
        }

        const startDate = parseDate(startPart);
        const endDate = parseDate(endPart);
        
        if (startDate && endDate) {
          startDate.setHours(0,0,0,0);
          endDate.setHours(23,59,59,999);
          const today = new Date();
          today.setHours(0,0,0,0);

          totalDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
          
          daysPassed = Math.max(0, Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
          if (daysPassed > totalDays) daysPassed = totalDays;
          
          daysRemaining = Math.max(1, Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
        }
      }
    } catch (err) {
      console.warn("Failed to parse period dates, fallback to current month:", err);
    }
    
    return { daysRemaining, totalDays, daysPassed };
  };

  const initialInfo = getPeriodInfo(periodeRange);
  const [periodInfo, setPeriodInfo] = useState(initialInfo);

  // Sync when period range changes
  useEffect(() => {
    setPeriodInfo(getPeriodInfo(periodeRange));
  }, [periodeRange]);

  // Filter valid targets (with a target > 0)
  const validTargets = targets.filter((t) => t.target > 0);

  // Find target with maximum value (target basic terbesar)
  const defaultTarget = validTargets.reduce(
    (max, curr) => (curr.target > max.target ? curr : max),
    validTargets[0] || null
  );

  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);

  // Auto-select largest target when targets load
  useEffect(() => {
    if (defaultTarget && !selectedTargetId) {
      setSelectedTargetId(defaultTarget.id);
    }
  }, [defaultTarget]);

  const activeTarget = validTargets.find((t) => t.id === selectedTargetId) || defaultTarget;

  // Format currency helper
  const formatIDRCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Math calculations
  const targetVal = activeTarget ? activeTarget.target : 0;
  const actualVal = activeTarget ? activeTarget.actual : 0;
  
  const targetHariIni = periodInfo.totalDays > 0 ? Math.round((targetVal / periodInfo.totalDays) * periodInfo.daysPassed) : 0;
  const kekurangan = Math.max(targetHariIni - actualVal, 0);

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
                TARGET
                <br />
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
                    <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                      PELANGGAN
                    </p>
                    <h2 className="text-sm font-black text-slate-900 leading-tight truncate uppercase">
                      {customerName}
                    </h2>
                  </div>
                </div>

                <div className="flex gap-2">
                  <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-600 shrink-0 shadow-sm">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                      PERIODE
                    </p>
                    <p className="text-[10px] font-black text-slate-700 leading-tight">
                      {periodeRange}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200">
                <div className="flex items-start gap-2 p-2 bg-amber-50 rounded-lg border border-amber-100">
                  <Info className="w-3 h-3 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[8px] font-bold text-amber-900/70 italic leading-snug">
                    Est. reward berdasarkan progres saat ini.
                  </p>
                </div>
              </div>
            </motion.div>


          </div>

          {/* Right Content */}
          <div className="lg:w-3/4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm md:text-base font-black text-slate-500 uppercase tracking-widest">
                {customerName}
              </h3>
              <div className="text-sm md:text-base font-black text-indigo-600 uppercase tracking-widest">
                {periodeRange}
              </div>
            </div>

            <div className="flex flex-col items-center justify-center py-2">
              {validTargets.length > 1 && (
                <div className="flex flex-wrap items-center justify-center gap-1 mb-4">
                  <span className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">
                    Target:
                  </span>
                  {validTargets.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedTargetId(t.id)}
                      className={cn(
                        "px-2.5 py-1.5 rounded-md text-[10px] md:text-xs font-black uppercase tracking-tight transition-all border shrink-0",
                        activeTarget?.id === t.id
                          ? "bg-indigo-600 border-indigo-600 text-white"
                          : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                      )}
                    >
                      {t.title.replace("TARGET ", "")}
                    </button>
                  ))}
                </div>
              )}

              {activeTarget && targetVal > 0 ? (
                <div className="flex flex-col items-center mb-2">
                  <p className="text-xs md:text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">
                    ORDER IDEAL SAMPAI HARI INI
                  </p>
                  <p className="text-2xl font-black text-indigo-600 tabular-nums leading-none tracking-tight mb-2">
                    {formatIDRCurrency(targetHariIni)}
                  </p>
                  {kekurangan > 0 ? (
                    <div className="bg-rose-50 border border-rose-100 rounded-md px-3 py-1.5 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      <span className="text-xs font-bold text-rose-800">
                        Kekurangan order: {formatIDRCurrency(kekurangan)}
                      </span>
                    </div>
                  ) : (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-md px-3 py-1.5 flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <span className="text-xs font-bold text-emerald-800">
                        Progres on track!
                      </span>
                    </div>
                  )}
                </div>
              ) : null}
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
                  keterangan={target.keterangan}
                  colorTheme={target.colorTheme}
                />
              ))}
            </div>

            <div className="pt-4 opacity-20 text-[7px] font-black uppercase tracking-widest flex justify-between">
              <span>Ringkasan Performa</span>
              <span>Dibuat: {new Date().toLocaleDateString("id-ID")}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

ReportView.displayName = "ReportView";
