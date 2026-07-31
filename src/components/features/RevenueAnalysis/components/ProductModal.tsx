import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";

interface ProductModalProps {
  viewProduct: any;
  setViewProduct: (v: any) => void;
  twoMonthsAgoName: string;
  lastMonthName: string;
  currentMonthName: string;
  formatCurrency: (v: number) => string;
}

export function ProductModal({
  viewProduct,
  setViewProduct,
  twoMonthsAgoName,
  lastMonthName,
  currentMonthName,
  formatCurrency,
}: ProductModalProps) {
  return (
    <AnimatePresence>
      {viewProduct && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
          {/* Mobile bottom sheet overlay dismissal (click outside) */}
          <div 
            className="absolute inset-0 z-0" 
            onClick={() => setViewProduct(null)} 
          />
          
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className="relative z-10 bg-white w-full h-[85vh] sm:h-auto sm:max-h-[90vh] sm:max-w-4xl flex flex-col rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Mobile drag handle indicator */}
            <div className="w-full flex justify-center pt-2 pb-1 sm:hidden">
              <div className="w-10 h-1 bg-slate-200 rounded-full" />
            </div>

            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="text-sm sm:text-xl font-black text-slate-800 line-clamp-1">
                  {viewProduct.customer_name}
                </h3>
                <p className="text-[10px] sm:text-sm font-semibold text-indigo-600 mt-0.5 sm:mt-1">
                  Detail Produk
                </p>
              </div>
              <button
                onClick={() => setViewProduct(null)}
                className="p-1.5 sm:p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 bg-slate-50 rounded-full transition-colors ml-4 shrink-0"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            <div className="p-0 sm:p-6 overflow-y-auto bg-slate-50/50 flex-1">
              {viewProduct.products && viewProduct.products.length > 0 ? (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden sm:block w-full overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-slate-50/80">
                          <th className="p-4 text-left font-bold text-slate-600 border-b border-slate-200">Nama Produk</th>
                          <th className="p-4 text-right font-bold text-slate-600 border-b border-slate-200">{twoMonthsAgoName}</th>
                          <th className="p-4 text-right font-bold text-slate-600 border-b border-slate-200">{lastMonthName}</th>
                          <th className="p-4 text-right font-bold text-slate-600 border-b border-slate-200">{currentMonthName}</th>
                          <th className="p-4 text-right font-bold text-slate-600 border-b border-slate-200">Selisih</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewProduct.products.map((p: any, idx: number) => {
                          const isDown = p.omset_current < p.omset_last;
                          const diff = p.omset_current - p.omset_last;
                          return (
                            <tr key={idx} className={`transition-colors border-b border-slate-100 last:border-0 ${isDown ? "bg-red-50/30" : "hover:bg-slate-50"}`}>
                              <td className="p-4 text-left font-bold text-slate-700">{p.goods_name}</td>
                              <td className="p-4 text-right text-slate-600 font-medium">Rp {formatCurrency(p.omset_two_months_ago)}</td>
                              <td className="p-4 text-right text-slate-600 font-medium">Rp {formatCurrency(p.omset_last)}</td>
                              <td className="p-4 text-right text-slate-600 font-black">Rp {formatCurrency(p.omset_current)}</td>
                              <td className={`p-4 text-right font-black ${isDown ? "text-red-600" : "text-emerald-600"}`}>
                                {isDown ? "-" : "+"} Rp {formatCurrency(Math.abs(diff))}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* ULTRA-COMPACT MOBILE LIST VIEW */}
                  <div className="sm:hidden flex flex-col divide-y divide-slate-100 pb-10">
                    {viewProduct.products.map((p: any, idx: number) => {
                      const isDown = p.omset_current < p.omset_last;
                      const diff = p.omset_current - p.omset_last;
                      return (
                        <div key={idx} className="p-2.5 relative bg-white flex flex-col gap-1.5">
                          {/* Left Border Indicator */}
                          <div className={`absolute left-0 top-0 bottom-0 w-1 ${isDown ? 'bg-red-500' : diff > 0 ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                          
                          <div className="flex justify-between items-start pl-1.5 gap-2">
                            <h4 className="font-bold text-slate-800 text-[11px] leading-snug">{p.goods_name}</h4>
                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded shrink-0 ${isDown ? "bg-red-50 text-red-600" : diff > 0 ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>
                              {isDown ? "-" : diff > 0 ? "+" : ""} {formatCurrency(Math.abs(diff))}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-3 pl-1.5 text-[10px]">
                            <span className="text-slate-400">{lastMonthName}: <span className="font-semibold text-slate-600">{formatCurrency(p.omset_last)}</span></span>
                            <span className="text-slate-400">{currentMonthName}: <span className="font-bold text-slate-800">{formatCurrency(p.omset_current)}</span></span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400 gap-3">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
                    <X className="w-6 h-6 text-slate-300" />
                  </div>
                  <p className="font-semibold text-xs sm:text-sm">Tidak ada data produk</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
