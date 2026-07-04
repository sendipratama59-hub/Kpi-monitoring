import React from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { BarChart3 } from "lucide-react";

interface RevenueHeaderProps {
  periodMonth: number;
  periodYear: number;
  selectedSalesman: string;
  salesmen: string[];
  setPeriodMonth: (m: number) => void;
  setPeriodYear: (y: number) => void;
  setSelectedSalesman: (s: string) => void;
  currentMonthName: string;
  lastMonthName: string;
}

export function RevenueHeader({
  periodMonth,
  periodYear,
  selectedSalesman,
  salesmen,
  setPeriodMonth,
  setPeriodYear,
  setSelectedSalesman,
  currentMonthName,
  lastMonthName,
}: RevenueHeaderProps) {
  return (
    <div className="flex flex-col gap-2 w-full bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-slate-100">
      <div className="flex justify-between items-center w-full">
        <h2 className="text-sm sm:text-base font-black tracking-tight text-slate-800 flex items-center gap-1.5">
          <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600">
            <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          Analisa Omset
        </h2>
        <p className="text-[10px] sm:text-sm text-slate-500">
          <span className="hidden sm:inline">Perbandingan </span>{lastMonthName} - {currentMonthName}
        </p>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-3 w-full">
        <select
          value={periodMonth}
          onChange={(e) => setPeriodMonth(Number(e.target.value))}
          className="flex-1 min-w-[80px] p-1.5 sm:p-2 border border-slate-200 rounded-lg text-xs sm:text-sm bg-slate-50 focus:bg-white focus:ring-1 focus:ring-indigo-100 outline-none font-medium text-slate-700"
        >
          {Array.from({ length: 12 }).map((_, i) => (
            <option key={i + 1} value={i + 1}>
              {format(new Date(2024, i, 1), "MMM", { locale: id })}
            </option>
          ))}
        </select>

        <select
          value={periodYear}
          onChange={(e) => setPeriodYear(Number(e.target.value))}
          className="w-20 sm:min-w-[100px] p-1.5 sm:p-2 border border-slate-200 rounded-lg text-xs sm:text-sm bg-slate-50 focus:bg-white focus:ring-1 focus:ring-indigo-100 outline-none font-medium text-slate-700"
        >
          {[2024, 2025, 2026, 2027].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        {localStorage.getItem("user_role") !== "salesman" && (
          <select
            value={selectedSalesman}
            onChange={(e) => setSelectedSalesman(e.target.value)}
            className="flex-1 min-w-[100px] p-1.5 sm:p-2 border border-slate-200 rounded-lg text-xs sm:text-sm bg-slate-50 focus:bg-white focus:ring-1 focus:ring-indigo-100 outline-none font-medium text-slate-700 truncate"
          >
            <option value="all">Semua Salesman</option>
            {salesmen.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}
