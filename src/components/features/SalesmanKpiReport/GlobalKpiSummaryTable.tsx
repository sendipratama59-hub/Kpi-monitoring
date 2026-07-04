import React from 'react';
import { METRICS, formatCurrency } from './constants';

interface GlobalKpiSummaryTableProps {
  summaryData: any[];
  targets: any[];
  selectedMetric?: string;
}

export function GlobalKpiSummaryTable({ summaryData, targets, selectedMetric }: GlobalKpiSummaryTableProps) {
  const isSingleSalesman = summaryData.length === 1;
  const isLeaderboardMode = !isSingleSalesman && selectedMetric && selectedMetric !== 'all';
  
  let rows: any[] = [];
  let title = "Total KPI Gabungan (Seluruh Sales)";
  let nameLabel = "KPI";

  if (isLeaderboardMode) {
    const metricConfig = METRICS.find(m => m.id === selectedMetric);
    if (metricConfig) {
      title = `Leaderboard: ${metricConfig.label}`;
      nameLabel = "Salesman";
      rows = summaryData.map((sm, idx) => {
        let target = 0;
        const targetRecord = targets.find(t => t.salesman_code === sm.salesman_code);
        if (targetRecord && metricConfig.targetKey) {
          if (metricConfig.targetKey === 'target_payment_3c_lcd' && !targetRecord[metricConfig.targetKey]) {
            target = (targetRecord['target_payment_3c'] || 0) + (targetRecord['target_omset_lcd'] || 0);
          } else {
            target = targetRecord[metricConfig.targetKey] || 0;
          }
        }
        
        let capai = sm[metricConfig.id] || 0;
        if (metricConfig.format === 'percentage') {
           target = 100;
        }

        const kurang = Math.max(0, target - capai);
        const percentage = target > 0 ? Math.round((capai / target) * 100) : 0;
        
        return {
          id: sm.salesman_code,
          name: sm.salesman_name,
          target,
          capai,
          kurang,
          percentage,
          format: metricConfig.format,
          suffix: metricConfig.suffix || ''
        };
      });
      // Sort by percentage descending, then capai descending
      rows.sort((a, b) => b.percentage - a.percentage || b.capai - a.capai);
      rows = rows.map((r, idx) => ({ ...r, no: idx + 1 }));
    }
  } else {
    if (isSingleSalesman) {
      title = `KPI ${summaryData[0].salesman_name}`;
    }
    rows = METRICS.map((metric, idx) => {
      let capai = 0;
      let target = 0;

      summaryData.forEach(sm => {
        capai += (sm[metric.id] || 0);
      });

      let relevantTargets = targets;
      if (isSingleSalesman) {
        relevantTargets = targets.filter(t => summaryData.some(sm => sm.salesman_code === t.salesman_code));
      }

      relevantTargets.forEach(t => {
        if (metric.targetKey) {
          if (metric.targetKey === 'target_payment_3c_lcd' && !t[metric.targetKey]) {
             target += ((t['target_payment_3c'] || 0) + (t['target_omset_lcd'] || 0));
          } else {
             target += (t[metric.targetKey] || 0);
          }
        }
      });

      if (metric.format === 'percentage') {
        if (summaryData.length > 0) {
          capai = capai / summaryData.length;
        }
        target = 100;
      }

      const kurang = Math.max(0, target - capai);
      const percentage = target > 0 ? Math.round((capai / target) * 100) : 0;

      return {
        id: metric.id,
        name: metric.label,
        target,
        capai,
        kurang,
        percentage,
        format: metric.format,
        suffix: metric.suffix || ''
      };
    });
    
    // Sort by percentage descending, then capai descending
    rows.sort((a, b) => b.percentage - a.percentage || b.capai - a.capai);
  }

  // Filter out rows where target is 0
  rows = rows.filter(r => r.target > 0);

  const formatValue = (val: number, format: string, suffix: string) => {
    if (format === 'currency') return val.toLocaleString('id-ID', { maximumFractionDigits: 0 });
    if (format === 'percentage') return `${val.toLocaleString('id-ID', { maximumFractionDigits: 0 })}%`;
    return `${val.toLocaleString('id-ID', { maximumFractionDigits: 0 })}${suffix}`;
  };

  return (
    <div className="mb-6">
      <div className="mb-2">
        <h3 className="font-bold text-slate-800 text-sm uppercase">{title}</h3>
      </div>
      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse table-auto text-xs">
          <thead>
            <tr>
              <th className="border border-black bg-[#f2f2f2] p-1 text-center font-bold">{nameLabel.toLowerCase()}</th>
              <th className="border border-black bg-[#f2f2f2] p-1 text-center font-bold">target</th>
              <th className="border border-black bg-[#f2f2f2] p-1 text-center font-bold">capai</th>
              <th className="border border-black bg-[#f2f2f2] p-1 text-center font-bold">kurang</th>
              <th className="border border-black bg-[#f2f2f2] p-1 text-center font-bold">%</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="border border-black p-1 text-left">{row.name.toLowerCase()}</td>
                <td className="border border-black p-1 text-center">{formatValue(row.target, row.format, row.suffix)}</td>
                <td className="border border-black p-1 text-center">{formatValue(row.capai, row.format, row.suffix)}</td>
                <td className="border border-black p-1 text-center">{formatValue(row.kurang, row.format, row.suffix)}</td>
                <td className="border border-black p-1 text-center">{Math.min(999, row.percentage)}%</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="border border-black p-4 text-center text-slate-500">
                  Tidak ada data untuk ditampilkan (target = 0).
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
