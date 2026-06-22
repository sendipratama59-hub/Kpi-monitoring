import React, { useRef, useState } from 'react';
import { Download, FileImage, FileText, Loader2, Target, Users, ShieldCheck, Trophy } from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import { jsPDF } from 'jspdf';
import { METRICS, formatCurrency } from '../SalesmanKpiReport/constants';
import { calculateBrandCommissions } from '../SalesmanKpiReport/utils';

interface DownloadKpiReportProps {
  salesmanData: any;
  targets: any[];
  storeData: any[];
  periodMonth: number;
  periodYear: number;
}

export function DownloadKpiReport({ salesmanData, targets, storeData, periodMonth, periodYear }: DownloadKpiReportProps) {
  const [isDownloadingImage, setIsDownloadingImage] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const calculateTotalPoints = () => {
    if (!salesmanData) return 0;
    return (Number(salesmanData.points_3c_lcd) || 0) +
      (Number(salesmanData.points_omset_lcd) || 0) +
      (Number(salesmanData.points_visit_customer) || 0) +
      (Number(salesmanData.points_co_3c) || 0) +
      (Number(salesmanData.points_omset_5jt) || 0) +
      (Number(salesmanData.points_idle_customers) || 0) +
      (Number(salesmanData.points_program_spu) || 0) +
      (Number(salesmanData.points_perbaikan_display) || 0) +
      (Number(salesmanData.points_pemasangan_spanduk) || 0) +
      (Number(salesmanData.points_leader_kpi) || 0) +
      (Number(salesmanData.points_leader_omset_lcd) || 0) +
      (Number(salesmanData.points_leader_visit) || 0) +
      (Number(salesmanData.points_leader_co3c) || 0) +
      (Number(salesmanData.points_leader_5jt) || 0) +
      (Number(salesmanData.points_leader_idle) || 0) +
      (Number(salesmanData.points_leader_spu) || 0) +
      (Number(salesmanData.points_leader_new_customer) || 0) +
      (Number(salesmanData.points_leader_perbaikan_display) || 0) +
      (Number(salesmanData.points_leader_pemasangan_spanduk) || 0);
  };

  const handleDownloadImage = async () => {
    if (!reportRef.current) return;
    setIsDownloadingImage(true);
    try {
      const element = reportRef.current;
      element.style.display = 'block';
      const dataUrl = await htmlToImage.toPng(element, { pixelRatio: 3, cacheBust: true });
      element.style.display = 'none';

      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `KPI_Report_${salesmanData.salesman_name}_${periodMonth}_${periodYear}.png`;
      link.click();
    } catch (error) {
      console.error(error);
      if (reportRef.current) reportRef.current.style.display = 'none';
    } finally {
      setIsDownloadingImage(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!reportRef.current) return;
    setIsDownloadingPdf(true);
    try {
      const element = reportRef.current;
      element.style.display = 'block';
      const dataUrl = await htmlToImage.toPng(element, { pixelRatio: 3, cacheBust: true });
      element.style.display = 'none';

      const img = new window.Image();
      img.src = dataUrl;
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      const pdf = new jsPDF({
        orientation: img.width > img.height ? 'l' : 'p',
        unit: 'px',
        format: [img.width, img.height]
      });
      
      pdf.addImage(dataUrl, 'PNG', 0, 0, img.width, img.height);
      pdf.save(`KPI_Report_${salesmanData.salesman_name}_${periodMonth}_${periodYear}.pdf`);
    } catch (error) {
      console.error(error);
      if (reportRef.current) reportRef.current.style.display = 'none';
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  if (!salesmanData) return null;

  const totalPoints = calculateTotalPoints();
  const rewardRupiah = totalPoints * 10000;
  const brandCommissions = calculateBrandCommissions(storeData || []);
  const totalCommission = brandCommissions.reduce((sum, item) => sum + item.commission, 0);

  const monthName = new Date(0, periodMonth - 1).toLocaleString('id-ID', { month: 'long' });

  const sortedMetrics = [...METRICS].sort((a, b) => {
    let targetA = a.targetKey ? getTargetValue(salesmanData.salesman_code, a.targetKey) : 0;
    if (a.id === 'visit_customer') targetA = 100;
    if (a.id === 'payment_3c_lcd') {
       const tP3C = getTargetValue(salesmanData.salesman_code, 'target_payment_3c');
       const tLcd = getTargetValue(salesmanData.salesman_code, 'target_omset_lcd');
       targetA = tP3C + tLcd;
    }

    let targetB = b.targetKey ? getTargetValue(salesmanData.salesman_code, b.targetKey) : 0;
    if (b.id === 'visit_customer') targetB = 100;
    if (b.id === 'payment_3c_lcd') {
       const tP3C = getTargetValue(salesmanData.salesman_code, 'target_payment_3c');
       const tLcd = getTargetValue(salesmanData.salesman_code, 'target_omset_lcd');
       targetB = tP3C + tLcd;
    }

    const valueA = Number(salesmanData[a.id]) || 0;
    const valueB = Number(salesmanData[b.id]) || 0;

    const hasTargetA = targetA > 0;
    const hasTargetB = targetB > 0;

    if (hasTargetA && !hasTargetB) return -1;
    if (!hasTargetA && hasTargetB) return 1;

    if (hasTargetA && hasTargetB) {
      const pctA = (valueA / targetA) * 100;
      const pctB = (valueB / targetB) * 100;
      return pctB - pctA;
    }
    return 0;
  });

  function getTargetValue(salesmanCode: string, targetKey: string) {
    const target = targets.find(t => t.salesman_code === salesmanCode);
    return target ? Number(target[targetKey]) || 0 : 0;
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 w-full">
        <button
          onClick={handleDownloadImage}
          disabled={isDownloadingImage || isDownloadingPdf}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors"
        >
          {isDownloadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileImage className="w-4 h-4" />}
          Download Gambar
        </button>
        <button
          onClick={handleDownloadPdf}
          disabled={isDownloadingImage || isDownloadingPdf}
          className="flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors"
        >
          {isDownloadingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
          Download PDF
        </button>
      </div>

      {/* Hidden Render Template for html2canvas */}
      <div style={{ position: 'absolute', top: -9999, left: -9999, zIndex: -100 }}>
        <div 
          ref={reportRef} 
          style={{ display: 'none', width: '800px', backgroundColor: '#ffffff', padding: '40px', color: '#1e293b', fontFamily: 'sans-serif' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #e2e8f0', paddingBottom: '20px', marginBottom: '30px' }}>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 800, margin: 0, color: '#0f172a' }}>LAPORAN KPI SALESMAN</h1>
              <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px', fontWeight: 600 }}>PERIODE: {monthName.toUpperCase()} {periodYear}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#3b82f6' }}>{salesmanData.salesman_name}</h2>
              <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', fontWeight: 600 }}>KODE: {salesmanData.salesman_code}</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
            {/* Box Reward */}
            <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #10b981', borderRadius: '12px', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <Target style={{ color: '#059669', width: '20px', height: '20px' }} />
                <h3 style={{ fontSize: '12px', fontWeight: 800, color: '#059669', margin: 0, textTransform: 'uppercase' }}>Total Reward Poin KPI</h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                <span style={{ fontSize: '32px', fontWeight: 900, color: '#047857' }}>{totalPoints} <span style={{ fontSize: '14px' }}>pts</span></span>
              </div>
              <div style={{ marginTop: '5px', fontSize: '18px', fontWeight: 800, color: '#059669' }}>
                = {formatCurrency(rewardRupiah)}
              </div>
            </div>

            {/* Box Komisi */}
            <div style={{ backgroundColor: '#e0e7ff', border: '1px solid #6366f1', borderRadius: '12px', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <ShieldCheck style={{ color: '#4f46e5', width: '20px', height: '20px' }} />
                <h3 style={{ fontSize: '12px', fontWeight: 800, color: '#4f46e5', margin: 0, textTransform: 'uppercase' }}>Total Komisi Penjualan</h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                <span style={{ fontSize: '32px', fontWeight: 900, color: '#3730a3' }}>{formatCurrency(totalCommission)}</span>
              </div>
              <div style={{ marginTop: '5px', fontSize: '12px', fontWeight: 600, color: '#4f46e5' }}>
                Dari Total Penjualan Brand Fokus
              </div>
            </div>
          </div>

          <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#334155', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '16px' }}>RINCIAN PENCAPAIAN KPI</h3>
          
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px', border: '1px solid #000' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #000' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 800, color: '#475569', width: '35%', border: '1px solid #000' }}>INDIKATOR KPI</th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: 800, color: '#475569', border: '1px solid #000' }}>TARGET</th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: 800, color: '#475569', border: '1px solid #000' }}>CAPAI</th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: 800, color: '#475569', border: '1px solid #000' }}>GAP</th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: 800, color: '#475569', border: '1px solid #000' }}>%</th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: 800, color: '#475569', border: '1px solid #000' }}>POIN</th>
              </tr>
            </thead>
            <tbody>
              {sortedMetrics.filter(m => {
                let checkTarget = m.targetKey ? getTargetValue(salesmanData.salesman_code, m.targetKey) : 0;
                if (m.id === 'visit_customer') checkTarget = 100;
                if (m.id === 'payment_3c_lcd') {
                   const tP3C = getTargetValue(salesmanData.salesman_code, 'target_payment_3c');
                   const tLcd = getTargetValue(salesmanData.salesman_code, 'target_omset_lcd');
                   checkTarget = tP3C + tLcd;
                }
                return checkTarget > 0;
              }).map((m, idx) => {
                const achieve = Number(salesmanData[m.id]) || 0;
                let target = m.targetKey ? getTargetValue(salesmanData.salesman_code, m.targetKey) : 0;
                if (m.id === 'visit_customer') target = 100;
                
                // For payment_3c_lcd special combined handling
                if (m.id === 'payment_3c_lcd') {
                   const tP3C = getTargetValue(salesmanData.salesman_code, 'target_payment_3c');
                   const tLcd = getTargetValue(salesmanData.salesman_code, 'target_omset_lcd');
                   target = tP3C + tLcd;
                }

                const gap = target - achieve;
                const percentage = target > 0 ? (achieve / target) * 100 : (achieve > 0 ? 100 : 0);
                
                const poinKey = `points_${m.id === 'payment_3c_lcd' ? '3c_lcd' : m.id}`;
                const poin = Number(salesmanData[poinKey]) || 0;

                const displayValue = m.format === 'currency' ? formatCurrency(achieve) : m.format === 'percentage' ? `${achieve.toFixed(1)}%` : `${achieve.toLocaleString('id-ID')}${m.suffix || ''}`;
                const displayTarget = m.format === 'currency' ? formatCurrency(target) : m.format === 'percentage' ? `${target.toFixed(1)}%` : `${target.toLocaleString('id-ID')}${m.suffix || ''}`;
                const displayGap = gap <= 0 ? '-' : (m.format === 'currency' ? formatCurrency(gap) : m.format === 'percentage' ? `${gap.toFixed(1)}%` : `${gap.toLocaleString('id-ID')}${m.suffix || ''}`);

                return (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 12px', fontSize: '12px', fontWeight: 600, color: '#1e293b', border: '1px solid #000' }}>{idx + 1}. {m.label.replace(/^\d+\.\s*/, '')}</td>
                    <td style={{ padding: '10px 12px', fontSize: '12px', color: '#64748b', textAlign: 'center', border: '1px solid #000' }}>{displayTarget}</td>
                    <td style={{ padding: '10px 12px', fontSize: '13px', fontWeight: 800, color: '#0f172a', textAlign: 'center', border: '1px solid #000' }}>{displayValue}</td>
                    <td style={{ padding: '10px 12px', fontSize: '12px', fontWeight: 600, color: gap <= 0 ? '#10b981' : '#ef4444', textAlign: 'center', border: '1px solid #000' }}>{displayGap}</td>
                    <td style={{ padding: '10px 12px', fontSize: '12px', fontWeight: 700, color: percentage >= 100 ? '#10b981' : '#64748b', textAlign: 'center', border: '1px solid #000' }}>
                      {percentage.toFixed(1)}%
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: '13px', fontWeight: 800, color: poin > 0 ? '#10b981' : '#64748b', textAlign: 'center', border: '1px solid #000' }}>
                      {poin > 0 ? `+${poin}` : poin}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {brandCommissions.length > 0 && (
            <>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#334155', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '16px' }}>RINCIAN KOMISI PENJUALAN BRAND</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px', border: '1px solid #000' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #000' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 800, color: '#475569', border: '1px solid #000' }}>BRAND FOKUS</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: 800, color: '#475569', border: '1px solid #000' }}>TOTAL OMSET</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: 800, color: '#475569', border: '1px solid #000' }}>KOMISI RUPIAH</th>
                  </tr>
                </thead>
                <tbody>
                  {brandCommissions.map((brand, bIdx) => (
                    <tr key={bIdx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 12px', fontSize: '12px', fontWeight: 700, color: '#1e293b', textTransform: 'uppercase', border: '1px solid #000' }}>{brand.label}</td>
                      <td style={{ padding: '10px 12px', fontSize: '13px', color: '#475569', textAlign: 'center', border: '1px solid #000' }}>{formatCurrency(brand.omset)}</td>
                      <td style={{ padding: '10px 12px', fontSize: '13px', fontWeight: 800, color: '#4f46e5', textAlign: 'center', border: '1px solid #000' }}>{formatCurrency(brand.commission)}</td>
                    </tr>
                  ))}
                  <tr style={{ backgroundColor: '#e0e7ff', borderTop: '2px solid #818cf8' }}>
                    <td colSpan={2} style={{ padding: '12px', fontSize: '14px', fontWeight: 800, color: '#3730a3', textAlign: 'center', border: '1px solid #000' }}>TOTAL KOMISI</td>
                    <td style={{ padding: '12px', fontSize: '14px', fontWeight: 900, color: '#3730a3', textAlign: 'center', border: '1px solid #000' }}>{formatCurrency(totalCommission)}</td>
                  </tr>
                </tbody>
              </table>
            </>
          )}

          <div style={{ marginTop: '40px', backgroundColor: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px dashed #cbd5e1', textAlign: 'center' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 10px 0' }}>TOTAL TAKE HOME PAY TAMBAHAN</h2>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px' }}>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '12px', color: '#64748b', margin: 0, fontWeight: 700 }}>REWARD KPI</p>
                <p style={{ fontSize: '18px', color: '#059669', margin: 0, fontWeight: 800 }}>{formatCurrency(rewardRupiah)}</p>
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#94a3b8' }}>+</div>
              <div style={{ textAlign: 'left' }}>
                <p style={{ fontSize: '12px', color: '#64748b', margin: 0, fontWeight: 700 }}>KOMISI PENJUALAN</p>
                <p style={{ fontSize: '18px', color: '#4f46e5', margin: 0, fontWeight: 800 }}>{formatCurrency(totalCommission)}</p>
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#94a3b8' }}>=</div>
              <div style={{ textAlign: 'left' }}>
                <p style={{ fontSize: '12px', color: '#64748b', margin: 0, fontWeight: 800 }}>TOTAL (DILUAR GAJI)</p>
                <p style={{ fontSize: '24px', color: '#f59e0b', margin: 0, fontWeight: 900 }}>{formatCurrency(rewardRupiah + totalCommission)}</p>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '10px', color: '#94a3b8' }}>
            <p>Digenerate secara otomatis oleh sistem KPI Salesman pada {new Date().toLocaleString('id-ID')}</p>
          </div>
        </div>
      </div>
    </>
  );
}
