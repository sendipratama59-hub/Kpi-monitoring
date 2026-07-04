import React, { useState } from "react";
import { format, subMonths, getDaysInMonth, isThisMonth, getDate } from "date-fns";
import { id } from "date-fns/locale";
import { Package } from "lucide-react";
import { useRevenueData } from "./hooks/useRevenueData";
import { RevenueHeader } from "./components/RevenueHeader";
import { RevenueSummary } from "./components/RevenueSummary";
import { BrandCard } from "./components/BrandCard";
import { ProductModal } from "./components/ProductModal";
import { downloadCustomerProducts } from "./utils/pdfExport";

export function RevenueAnalysis() {
  const [periodMonth, setPeriodMonth] = useState(new Date().getMonth() + 1);
  const [periodYear, setPeriodYear] = useState(new Date().getFullYear());
  const userRole = localStorage.getItem("user_role") || "admin";
  const loggedInSalesmanName = localStorage.getItem("salesman_name") || "";

  const [selectedSalesman, setSelectedSalesman] = useState(() => {
    if (userRole === "salesman" && loggedInSalesmanName) {
      return loggedInSalesmanName;
    }
    return "all";
  });
  
  const [expandedBrand, setExpandedBrand] = useState<string | null>(null);
  const [viewProduct, setViewProduct] = useState<any | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  
  const [mode3C, setMode3C] = useState<"omset" | "payment">("omset");
  const [modeLCD, setModeLCD] = useState<"omset" | "payment">("omset");
  const [modeOthers, setModeOthers] = useState<"omset" | "payment">("omset");

  const { loading, salesmen, analysisData, targets } = useRevenueData(periodMonth, periodYear, selectedSalesman);

  const selectedDate = new Date(periodYear, periodMonth - 1, 1);
  const currentMonthName = format(selectedDate, "MMMM", { locale: id });
  const lastMonthName = format(subMonths(selectedDate, 1), "MMMM", { locale: id });
  const twoMonthsAgoName = format(subMonths(selectedDate, 2), "MMMM", { locale: id });
  const formatCurrency = (val: number) => val.toLocaleString("id-ID", { maximumFractionDigits: 0 });

  const brandAnalysis3c = (mode3C === "omset" ? analysisData.brandAnalysis3c_omset : analysisData.brandAnalysis3c_payment) || [];
  const brandAnalysisLcd = (modeLCD === "omset" ? analysisData.brandAnalysisLcd_omset : analysisData.brandAnalysisLcd_payment) || [];
  const brandAnalysisOthers = (modeOthers === "omset" ? analysisData.brandAnalysisOthers_omset : analysisData.brandAnalysisOthers_payment) || [];

  const totalCurrent3C = brandAnalysis3c.reduce((sum, b) => sum + b.omset_current, 0);
  const totalLast3C = brandAnalysis3c.reduce((sum, b) => sum + b.omset_last, 0);

  const totalCurrentLcd = brandAnalysisLcd.reduce((sum, b) => sum + b.omset_current, 0);
  const totalLastLcd = brandAnalysisLcd.reduce((sum, b) => sum + b.omset_last, 0);

  const totalCurrentOthers = brandAnalysisOthers.reduce((sum, b) => sum + b.omset_current, 0);
  const totalLastOthers = brandAnalysisOthers.reduce((sum, b) => sum + b.omset_last, 0);

  let targetPayment3c = 0;
  if (userRole === "salesman" && loggedInSalesmanName) {
     const t = (targets || []).find(
       (t) => (t.salesman_name || "").toLowerCase().trim() === loggedInSalesmanName.toLowerCase().trim()
     );
     if (t) targetPayment3c = Number(t.target_payment_3c_lcd) || 0;
  } else if (selectedSalesman === "all") {
     targetPayment3c = (targets || []).reduce((sum, t) => sum + (Number(t.target_payment_3c_lcd) || 0), 0);
  } else {
     const t = (targets || []).find(
       (t) => (t.salesman_name || "").toLowerCase().trim() === selectedSalesman.toLowerCase().trim()
     );
     if (t) targetPayment3c = Number(t.target_payment_3c_lcd) || 0;
  }
  const totalPaymentCurrent3C = 
    analysisData.brandAnalysis3c_payment.reduce((sum, b) => sum + b.omset_current, 0)
    + analysisData.brandAnalysisLcd_omset.reduce((sum, b) => sum + b.omset_current, 0);
  const payment3cPercent = targetPayment3c > 0 ? (totalPaymentCurrent3C / targetPayment3c) * 100 : 0;

  const daysInMonth = getDaysInMonth(selectedDate);
  const passedDays = isThisMonth(selectedDate) ? getDate(new Date()) : (selectedDate < new Date() ? daysInMonth : 0);
  const targetPerDay = daysInMonth > 0 ? targetPayment3c / daysInMonth : 0;
  const targetToDate = targetPerDay * passedDays;
  const targetGap = totalPaymentCurrent3C - targetToDate;
  
  let targetStatusText = "On Track";
  let targetStatusColor = "text-emerald-500";
  
  if (targetGap > 0) {
    targetStatusText = `Lebih Rp ${formatCurrency(Math.abs(targetGap))}`;
    targetStatusColor = "text-emerald-500";
  } else if (targetGap < 0) {
    targetStatusText = `Tertinggal Rp ${formatCurrency(Math.abs(targetGap))}`;
    targetStatusColor = "text-rose-500";
  }

  const handleDownloadPdf = (c: any, filterType: "all" | "up" | "down") => {
    downloadCustomerProducts(c, filterType, selectedDate, currentMonthName, periodYear, setIsDownloadingPdf);
  };

  return (
    <div className="flex flex-col gap-3 sm:gap-6 pb-20 sm:pb-8 max-w-7xl mx-auto w-full px-2 sm:px-0">
      <RevenueHeader 
        periodMonth={periodMonth}
        periodYear={periodYear}
        selectedSalesman={selectedSalesman}
        salesmen={salesmen}
        setPeriodMonth={setPeriodMonth}
        setPeriodYear={setPeriodYear}
        setSelectedSalesman={setSelectedSalesman}
        currentMonthName={currentMonthName}
        lastMonthName={lastMonthName}
      />

      {loading ? (
        <div className="flex flex-col justify-center items-center h-64 gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-200 border-t-indigo-600"></div>
          <span className="text-sm font-semibold text-slate-500">Memuat data omset...</span>
        </div>
      ) : (
        <div className="flex flex-col gap-6 sm:gap-10">
          {/* SECTION: TARGET PAYMENT 3C + SD LCD */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Package className="w-4 h-4 text-indigo-500" />
              Payment 3C + SD LCD
            </h3>
            <div className="flex justify-between text-xs sm:text-sm mb-1.5">
               <span className="text-slate-500">Pencapaian: <span className="font-bold text-slate-800">Rp {formatCurrency(totalPaymentCurrent3C)}</span></span>
               <span className="text-slate-500">Target: <span className="font-bold text-slate-800">Rp {formatCurrency(targetPayment3c)}</span></span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 mb-2">
               <div className={`h-2.5 rounded-full transition-all duration-500 ${payment3cPercent >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${Math.min(payment3cPercent, 100)}%` }}></div>
            </div>
            <div className="flex justify-between items-center mt-1">
               <span className={`text-xs font-bold ${targetStatusColor}`}>{targetStatusText}</span>
               <span className="text-[10px] sm:text-xs font-bold text-slate-500">{payment3cPercent.toFixed(1)}%</span>
            </div>
          </div>

          {/* SECTION: ANALISA 3C */}
          <div className="flex flex-col gap-3 sm:gap-4">
            <RevenueSummary 
              title="Analisa 3C"
              mode={mode3C}
              setMode={setMode3C}
              lastMonthName={lastMonthName}
              currentMonthName={currentMonthName}
              totalLast={totalLast3C}
              totalCurrent={totalCurrent3C}
              formatCurrency={formatCurrency}
            />
            <div className="flex flex-col gap-3 sm:gap-6 mt-1 sm:mt-2">
              {brandAnalysis3c.map((brand: any, idx: number) => (
                <BrandCard 
                  key={idx}
                  brand={brand}
                  mode={mode3C}
                  isExpanded={expandedBrand === brand.brand_name}
                  onToggle={() => setExpandedBrand(expandedBrand === brand.brand_name ? null : brand.brand_name)}
                  formatCurrency={formatCurrency}
                  twoMonthsAgoName={twoMonthsAgoName}
                  lastMonthName={lastMonthName}
                  currentMonthName={currentMonthName}
                  setViewProduct={setViewProduct}
                  downloadCustomerProducts={handleDownloadPdf}
                  isDownloadingPdf={isDownloadingPdf}
                />
              ))}
            </div>
          </div>

          {/* SECTION: ANALISA LCD */}
          {brandAnalysisLcd.length > 0 && (
            <div className="flex flex-col gap-3 sm:gap-4 pt-6 sm:pt-10 border-t border-dashed border-slate-200">
              <RevenueSummary 
                title="Analisa LCD"
                mode={modeLCD}
                setMode={setModeLCD}
                lastMonthName={lastMonthName}
                currentMonthName={currentMonthName}
                totalLast={totalLastLcd}
                totalCurrent={totalCurrentLcd}
                formatCurrency={formatCurrency}
              />
              <div className="flex flex-col gap-3 sm:gap-6 mt-1 sm:mt-2">
                {brandAnalysisLcd.map((brand: any, idx: number) => (
                  <BrandCard 
                    key={idx}
                    brand={brand}
                    mode={modeLCD}
                    isExpanded={expandedBrand === brand.brand_name}
                    onToggle={() => setExpandedBrand(expandedBrand === brand.brand_name ? null : brand.brand_name)}
                    formatCurrency={formatCurrency}
                    twoMonthsAgoName={twoMonthsAgoName}
                    lastMonthName={lastMonthName}
                    currentMonthName={currentMonthName}
                    setViewProduct={setViewProduct}
                    downloadCustomerProducts={handleDownloadPdf}
                    isDownloadingPdf={isDownloadingPdf}
                  />
                ))}
              </div>
            </div>
          )}

          {/* SECTION: BRAND LAINNYA */}
          {brandAnalysisOthers.length > 0 && (
            <div className="flex flex-col gap-3 sm:gap-4 pt-6 sm:pt-10 border-t border-dashed border-slate-200">
              <RevenueSummary 
                title="Analisa Brand Lainnya"
                mode={modeOthers}
                setMode={setModeOthers}
                lastMonthName={lastMonthName}
                currentMonthName={currentMonthName}
                totalLast={totalLastOthers}
                totalCurrent={totalCurrentOthers}
                formatCurrency={formatCurrency}
              />
              <div className="flex flex-col gap-3 sm:gap-6 mt-1 sm:mt-2">
                {brandAnalysisOthers.map((brand: any, idx: number) => (
                  <BrandCard 
                    key={idx}
                    brand={brand}
                    mode={modeOthers}
                    isExpanded={expandedBrand === brand.brand_name}
                    onToggle={() => setExpandedBrand(expandedBrand === brand.brand_name ? null : brand.brand_name)}
                    formatCurrency={formatCurrency}
                    twoMonthsAgoName={twoMonthsAgoName}
                    lastMonthName={lastMonthName}
                    currentMonthName={currentMonthName}
                    setViewProduct={setViewProduct}
                    downloadCustomerProducts={handleDownloadPdf}
                    isDownloadingPdf={isDownloadingPdf}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <ProductModal 
        viewProduct={viewProduct}
        setViewProduct={setViewProduct}
        twoMonthsAgoName={twoMonthsAgoName}
        lastMonthName={lastMonthName}
        currentMonthName={currentMonthName}
        formatCurrency={formatCurrency}
      />
    </div>
  );
}
