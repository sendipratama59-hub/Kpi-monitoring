import React from "react";
import { TrendingDown, TrendingUp, Minus, Wallet, CreditCard } from "lucide-react";

interface RevenueSummaryProps {
  mode: "omset" | "payment";
  setMode: (val: "omset" | "payment") => void;
  lastMonthName: string;
  currentMonthName: string;
  totalLast: number;
  totalCurrent: number;
  formatCurrency: (val: number) => string;
  title?: string;
}

export function RevenueSummary({
  mode,
  setMode,
  lastMonthName,
  currentMonthName,
  totalLast,
  totalCurrent,
  formatCurrency,
  title
}: RevenueSummaryProps) {
  const diff = totalCurrent - totalLast;
  const isUp = diff > 0;
  const isDown = diff < 0;

  return (
    <div className="flex flex-col gap-2 w-full pt-2">
      <div className="flex items-center justify-between gap-2 px-1">
        {title && <h3 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight">{title}</h3>}
        <div className={`flex bg-slate-100 p-0.5 rounded-lg ${!title ? 'mx-auto' : ''}`}>
          <button
            onClick={() => setMode("omset")}
            className={`flex items-center justify-center gap-1.5 px-3 py-1 text-[11px] sm:text-xs font-bold rounded-md transition-all ${
              mode === "omset" 
                ? "bg-white text-indigo-700 shadow-sm" 
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Wallet className="w-3 h-3" />
            Omset
          </button>
          <button
            onClick={() => setMode("payment")}
            className={`flex items-center justify-center gap-1.5 px-3 py-1 text-[11px] sm:text-xs font-bold rounded-md transition-all ${
              mode === "payment" 
                ? "bg-white text-indigo-700 shadow-sm" 
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <CreditCard className="w-3 h-3" />
            Payment
          </button>
        </div>
      </div>

      <div className="w-full flex items-center gap-1.5 sm:gap-3">
        <div className="flex-1 bg-white border border-slate-100 p-2 sm:px-4 sm:py-3 rounded-xl shadow-sm flex flex-col items-center sm:items-start justify-center text-center sm:text-left">
          <span className="text-[9px] sm:text-xs font-bold text-slate-400 mb-0.5 uppercase tracking-wider">{lastMonthName}</span>
          <span className="text-xs sm:text-base font-black text-slate-800 truncate w-full">
            {formatCurrency(totalLast)}
          </span>
        </div>
        
        <div className="flex-1 bg-white border border-slate-100 p-2 sm:px-4 sm:py-3 rounded-xl shadow-sm flex flex-col items-center sm:items-start justify-center text-center sm:text-left">
          <span className="text-[9px] sm:text-xs font-bold text-slate-400 mb-0.5 uppercase tracking-wider">{currentMonthName}</span>
          <span className="text-xs sm:text-base font-black text-slate-800 truncate w-full">
            {formatCurrency(totalCurrent)}
          </span>
        </div>

        <div
          className={`flex-1 p-2 sm:px-4 sm:py-3 rounded-xl shadow-sm flex flex-col items-center justify-center border text-center ${
            isDown 
              ? "bg-red-50 text-red-600 border-red-100" 
              : isUp 
                ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                : "bg-slate-50 text-slate-600 border-slate-200"
          }`}
        >
          <div className="flex items-center gap-1 text-[9px] sm:text-xs font-bold uppercase tracking-wider mb-0.5">
            {isDown ? <TrendingDown className="w-3 h-3" /> : isUp ? <TrendingUp className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
            <span>{isDown ? "Turun" : isUp ? "Naik" : "Tetap"}</span>
          </div>
          <span className="text-xs sm:text-base font-black truncate w-full">
            {formatCurrency(Math.abs(diff))}
          </span>
        </div>
      </div>
    </div>
  );
}
