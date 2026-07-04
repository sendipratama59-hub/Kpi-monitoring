import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, TrendingDown, TrendingUp, Minus, Package, Eye, Download, AlertCircle, FileText, ArrowUp, ArrowDown } from "lucide-react";
import { Card, CardContent } from "../../../ui/Card";

interface BrandCardProps {
  brand: any;
  mode: "omset" | "payment";
  isExpanded: boolean;
  onToggle: () => void;
  formatCurrency: (v: number) => string;
  twoMonthsAgoName: string;
  lastMonthName: string;
  currentMonthName: string;
  setViewProduct: (v: any) => void;
  downloadCustomerProducts: (c: any, filterType: "all"|"up"|"down") => void;
  isDownloadingPdf: boolean;
}

export function BrandCard({
  brand,
  mode,
  isExpanded,
  onToggle,
  formatCurrency,
  twoMonthsAgoName,
  lastMonthName,
  currentMonthName,
  setViewProduct,
  downloadCustomerProducts,
  isDownloadingPdf,
}: BrandCardProps) {
  const [downloadMenuId, setDownloadMenuId] = useState<string | null>(null);

  const isDown = brand.omset_current < brand.omset_last;
  const isUp = brand.omset_current > brand.omset_last;
  const diff = Math.abs(brand.omset_current - brand.omset_last);

  return (
    <Card className={`border-slate-100 shadow-sm overflow-hidden transition-all duration-300 rounded-xl ${isExpanded ? 'ring-1 ring-indigo-200' : ''}`}>
      <div
        onClick={onToggle}
        className={`p-2.5 sm:p-5 flex justify-between items-center gap-3 cursor-pointer transition-colors relative overflow-hidden ${
          isDown ? "bg-red-50/50 hover:bg-red-50/80" : isUp ? "bg-emerald-50/50 hover:bg-emerald-50/80" : "bg-slate-50/50 hover:bg-slate-50/80"
        }`}
      >
        <div className="flex items-center gap-2 sm:gap-4 flex-1">
          <div className={`p-1.5 sm:p-3 rounded-lg shrink-0 ${
            isDown ? "bg-red-100 text-red-600" : isUp ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-500"
          }`}>
            <Package className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
          <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between w-full">
            <h3 className="text-xs sm:text-lg font-black text-slate-800 uppercase tracking-tight">
              {brand.brand_name}
            </h3>
            <div className="text-[10px] sm:text-sm font-semibold text-slate-500 flex items-center gap-1 sm:gap-3 mt-0.5 sm:mt-0">
              <span className="truncate max-w-[80px] sm:max-w-none">{formatCurrency(brand.omset_last)}</span>
              <span className="text-slate-300">→</span>
              <span className="text-slate-800 font-bold truncate max-w-[80px] sm:max-w-none">{formatCurrency(brand.omset_current)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isDown ? (
            <div className="flex items-center gap-1 text-red-600 bg-red-100/50 px-2 sm:px-4 py-1 sm:py-2 rounded-lg font-bold text-[10px] sm:text-sm">
              <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>{formatCurrency(diff)}</span>
            </div>
          ) : isUp ? (
            <div className="flex items-center gap-1 text-emerald-600 bg-emerald-100/50 px-2 sm:px-4 py-1 sm:py-2 rounded-lg font-bold text-[10px] sm:text-sm">
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>{formatCurrency(diff)}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-slate-600 bg-slate-100/80 px-2 sm:px-4 py-1 sm:py-2 rounded-lg font-bold text-[10px] sm:text-sm">
              <Minus className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>{brand.omset_current === 0 ? "Rp 0" : "Tetap"}</span>
            </div>
          )}
          
          <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.3 }}>
            <div className="p-1 sm:p-2 bg-white rounded-md shadow-sm border border-slate-100 text-slate-400">
              <ChevronDown className="w-3 h-3 sm:w-5 sm:h-5" />
            </div>
          </motion.div>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <CardContent className="p-0 border-t border-slate-100 bg-slate-50/20">
              {brand.customer_details.length > 0 ? (
                <>
                  {/* DESKTOP TABLE VIEW */}
                  <div className="hidden sm:block w-full overflow-x-auto p-4">
                    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr className="bg-slate-50/80 border-b border-slate-200">
                            <th className="p-4 text-left font-bold text-slate-600">Nama Customer</th>
                            <th className="p-4 text-right font-bold text-slate-600">{twoMonthsAgoName}</th>
                            <th className="p-4 text-right font-bold text-slate-600">{lastMonthName}</th>
                            <th className="p-4 text-right font-bold text-slate-600">{currentMonthName}</th>
                            <th className="p-4 text-right font-bold text-slate-600">Selisih</th>
                            {mode === "omset" && <th className="p-4 text-center font-bold text-slate-600">Aksi</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {brand.customer_details.map((c: any, cIdx: number) => (
                            <tr key={cIdx} className={`transition-colors border-b border-slate-100 last:border-0 hover:bg-slate-50 ${c.diff_amount < 0 ? "hover:bg-red-50/30" : c.diff_amount > 0 ? "hover:bg-emerald-50/30" : ""}`}>
                              <td className="p-4 text-left font-bold text-slate-800">{c.customer_name}</td>
                              <td className="p-4 text-right text-slate-500 font-medium">Rp {formatCurrency(c.omset_two_months_ago)}</td>
                              <td className="p-4 text-right text-slate-600 font-medium">Rp {formatCurrency(c.omset_last)}</td>
                              <td className="p-4 text-right text-slate-800 font-black">Rp {formatCurrency(c.omset_current)}</td>
                              <td className={`p-4 text-right font-black ${c.diff_amount < 0 ? "text-red-600" : c.diff_amount > 0 ? "text-emerald-600" : "text-slate-400"}`}>
                                {c.diff_amount < 0 ? "-" : c.diff_amount > 0 ? "+" : ""} Rp {formatCurrency(Math.abs(c.diff_amount))}
                              </td>
                              {mode === "omset" && (
                                <td className="p-4 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <button onClick={(e) => { e.stopPropagation(); setViewProduct(c); }} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors">
                                      <Eye className="w-4 h-4" />
                                    </button>
                                    <div className="relative">
                                      <button onClick={(e) => { e.stopPropagation(); setDownloadMenuId(downloadMenuId === c.customer_name ? null : c.customer_name); }} disabled={isDownloadingPdf} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors disabled:opacity-50">
                                        <Download className="w-4 h-4" />
                                      </button>
                                      {downloadMenuId === c.customer_name && (
                                        <>
                                          <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setDownloadMenuId(null); }} />
                                          <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-slate-100 rounded-xl shadow-xl z-50 py-1 overflow-hidden">
                                            <button onClick={() => { downloadCustomerProducts(c, "all"); setDownloadMenuId(null); }} className="w-full text-left px-4 py-3 text-xs font-semibold hover:bg-slate-50 text-slate-700 flex items-center gap-2"><FileText className="w-3.5 h-3.5" /> Semua Data</button>
                                            <button onClick={() => { downloadCustomerProducts(c, "up"); setDownloadMenuId(null); }} className="w-full text-left px-4 py-3 text-xs font-bold hover:bg-emerald-50 text-emerald-600 flex items-center gap-2"><ArrowUp className="w-3.5 h-3.5" /> Selisih Naik</button>
                                            <button onClick={() => { downloadCustomerProducts(c, "down"); setDownloadMenuId(null); }} className="w-full text-left px-4 py-3 text-xs font-bold hover:bg-red-50 text-red-600 flex items-center gap-2"><ArrowDown className="w-3.5 h-3.5" /> Selisih Turun</button>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* ULTRA-COMPACT MOBILE LIST VIEW */}
                  <div className="sm:hidden flex flex-col divide-y divide-slate-100">
                    {brand.customer_details.map((c: any, cIdx: number) => (
                      <div key={cIdx} className="p-2.5 flex flex-col gap-1.5 relative bg-white">
                        {/* Status Indicator Bar */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${c.diff_amount < 0 ? 'bg-red-500' : c.diff_amount > 0 ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                        
                        <div className="flex justify-between items-center pl-2">
                          <h4 className="font-bold text-slate-800 text-xs leading-tight truncate mr-2">{c.customer_name}</h4>
                          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded shrink-0 ${c.diff_amount < 0 ? 'bg-red-50 text-red-600' : c.diff_amount > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                            {c.diff_amount < 0 ? "-" : c.diff_amount > 0 ? "+" : ""} {formatCurrency(Math.abs(c.diff_amount))}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center pl-2 text-[10px]">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-slate-400">{lastMonthName}: <span className="font-semibold text-slate-600">{formatCurrency(c.omset_last)}</span></span>
                            <span className="text-slate-400">{currentMonthName}: <span className="font-bold text-slate-800">{formatCurrency(c.omset_current)}</span></span>
                          </div>
                          
                          {mode === "omset" && (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button 
                                onClick={() => setViewProduct(c)} 
                                className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-md transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              
                              <div className="relative">
                                <button 
                                  onClick={() => setDownloadMenuId(downloadMenuId === c.customer_name ? null : c.customer_name)}
                                  disabled={isDownloadingPdf}
                                  className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-md transition-colors disabled:opacity-50"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                                
                                {downloadMenuId === c.customer_name && (
                                  <>
                                    <div className="fixed inset-0 z-40" onClick={() => setDownloadMenuId(null)} />
                                    <div className="absolute bottom-full right-0 mb-1 w-40 bg-white border border-slate-100 rounded-lg shadow-xl z-50 py-1 overflow-hidden origin-bottom-right">
                                      <button onClick={() => { downloadCustomerProducts(c, "all"); setDownloadMenuId(null); }} className="w-full text-left px-3 py-2 text-xs font-semibold hover:bg-slate-50 text-slate-700 flex items-center gap-2 border-b border-slate-50"><FileText className="w-3 h-3" /> Semua Data</button>
                                      <button onClick={() => { downloadCustomerProducts(c, "up"); setDownloadMenuId(null); }} className="w-full text-left px-3 py-2 text-xs font-bold hover:bg-emerald-50 text-emerald-600 flex items-center gap-2 border-b border-slate-50"><ArrowUp className="w-3 h-3" /> Selisih Naik</button>
                                      <button onClick={() => { downloadCustomerProducts(c, "down"); setDownloadMenuId(null); }} className="w-full text-left px-3 py-2 text-xs font-bold hover:bg-red-50 text-red-600 flex items-center gap-2"><ArrowDown className="w-3 h-3" /> Selisih Turun</button>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="p-4 sm:p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                  <AlertCircle className="w-6 h-6 sm:w-8 sm:h-8 text-slate-300" />
                  <p className="font-medium text-xs sm:text-sm">Tidak ada perubahan omset</p>
                </div>
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
