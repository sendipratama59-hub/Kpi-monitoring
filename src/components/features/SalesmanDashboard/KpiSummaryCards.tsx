import React from 'react';
import { Card, CardContent } from '../../ui/Card';
import { Target, TrendingUp, AlertCircle } from 'lucide-react';
import { KpiSummary } from './types';

interface KpiSummaryCardsProps {
  summary: KpiSummary | null;
}

export function KpiSummaryCards({ summary }: KpiSummaryCardsProps) {
  const currentRevenue = summary?.total_revenue || 0;
  const targetRevenue = summary?.target_revenue || 0;
  const targetGap = Math.max(0, targetRevenue - currentRevenue);

  const getPercentage = (achieved: number, target: number) => {
    if (!target || target === 0) return 0;
    const pct = (achieved / target) * 100;
    return Math.min(100, Math.round(pct));
  };
  const percentage = getPercentage(currentRevenue, targetRevenue);

  const formatRupiah = (val: number | null | undefined) => {
    if (!val) return "Rp 0";
    if (val >= 1000000) {
      return "Rp " + (val / 1000000).toLocaleString("id-ID", { maximumFractionDigits: 1 }) + " Jt";
    }
    return "Rp " + val.toLocaleString("id-ID");
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white border-none shadow-md">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-indigo-100">
              Target Omset Bulan Ini
            </h3>
            <div className="p-2 bg-indigo-400/30 rounded-lg">
              <Target className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="text-3xl font-bold mb-1">{formatRupiah(targetRevenue)}</div>
          <p className="text-sm text-indigo-200">
            {targetRevenue === 0 ? "Target belum diatur" : `Bulan: ${new Date().toLocaleString('id-ID', { month: 'long' })}`}
          </p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-none shadow-md">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-emerald-100">
              Pencapaian Saat Ini
            </h3>
            <div className="p-2 bg-emerald-400/30 rounded-lg">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="text-3xl font-bold mb-1">{formatRupiah(currentRevenue)}</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-emerald-700/50 rounded-full h-2 overflow-hidden">
              <div
                className="bg-white h-full rounded-full transition-all duration-500"
                style={{ width: `${percentage}%` }}
              ></div>
            </div>
            <span className="text-sm font-bold text-emerald-100">{percentage}%</span>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white border-none shadow-md">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-amber-100">Kekurangan Target</h3>
            <div className="p-2 bg-amber-400/30 rounded-lg">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="text-3xl font-bold mb-1">{formatRupiah(targetGap)}</div>
          <p className="text-sm text-amber-100">
            {targetGap === 0 ? (targetRevenue === 0 ? "-" : "Target tercapai!") : "Tetap semangat!"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
