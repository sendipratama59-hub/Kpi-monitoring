import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../../ui/Button';
import { Info, CheckCircle2 } from 'lucide-react';
import { GenieModal } from '../../ui/GenieModal';

interface InstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: () => void;
}

export function InstructionsModal({ isOpen, onClose, onContinue }: InstructionsModalProps) {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setHasScrolledToBottom(false);
      
      // Give a small delay for content to render, then check if scrolling is needed
      setTimeout(() => {
        const checkScroll = () => {
          if (scrollRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
            // Allow a tiny margin of error for fractional pixel values
            if (scrollHeight <= clientHeight + 2) {
               setHasScrolledToBottom(true);
            }
          }
        };
        checkScroll();
      }, 300);
    }
  }, [isOpen]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (Math.ceil(scrollTop + clientHeight) >= scrollHeight - 10) {
      setHasScrolledToBottom(true);
    }
  };

  return (
    <GenieModal
      isOpen={isOpen}
      onClose={onClose}
      title="Petunjuk Pengisian Survey"
      maxWidth="max-w-2xl"
    >
      <div className="space-y-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600 shrink-0">
            <Info className="w-8 h-8" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-slate-800 text-lg mb-1">Penting: Harap Dibaca Sebelum Mengisi</h3>
            <p className="text-sm font-medium text-slate-500 mb-4">
              Scroll ke bawah untuk membaca seluruh petunjuk sebelum melanjutkan proses input data.
            </p>
          </div>
        </div>

        <div 
          ref={scrollRef}
          onScroll={handleScroll}
          className="bg-slate-50 rounded-xl border border-slate-200 p-6 max-h-[50vh] overflow-y-auto space-y-6"
        >
          {/* LCD Info */}
          <div>
            <h4 className="font-black text-indigo-700 text-base mb-3 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
              Informasi LCD
            </h4>
            <div className="space-y-4 text-sm text-slate-700 pl-4 border-l border-indigo-100">
              <div>
                <p className="font-bold text-slate-800 mb-1">Total Omset LCD</p>
                <p className="mb-2">Untuk mengisi total omset LCD bisa ditanyakan ke owner/kepala toko dalam satu hari biasanya service berapa LCD?</p>
                <div className="bg-white p-3 rounded-lg border border-slate-200 font-mono text-xs">
                  <span className="text-emerald-600 font-bold">Sebagai contoh:</span><br/>
                  ambil rata-rata 2/hari x 30 = 60pcs x estimasi harga LCD 100.000<br/>
                  <span className="font-bold text-slate-800">Total omset LCD = 6.000.000</span>
                </div>
              </div>
              
              <div className="mt-4">
                <p className="font-bold text-slate-800 mb-1">Harga & Merek LCD Y20</p>
                <p className="mb-2">Untuk mengisi harga LCD Y20 bisa ditanyakan ke owner/kepala toko, kalau LCD Y20 biasanya dapet harga berapa?</p>
                <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-slate-400 font-bold w-16 shrink-0">Contoh :</span>
                    <span className="font-mono bg-slate-100 px-2 py-0.5 rounded font-medium">90000</span>
                  </div>
                  <div>
                    <p className="text-slate-600 font-medium italic mt-2 mb-1">"Merek yang paling sering dipakai?"</p>
                    <div className="flex items-start gap-2">
                      <span className="text-slate-400 font-bold w-16 shrink-0">Contoh :</span>
                      <span className="font-medium">brader/meetoo/og</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full h-px bg-slate-200"></div>

          {/* Baterai Info */}
          <div>
            <h4 className="font-black text-amber-700 text-base mb-3 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500"></div>
              Informasi Baterai
            </h4>
            <div className="space-y-4 text-sm text-slate-700 pl-4 border-l border-amber-100">
              <div>
                <p className="font-bold text-slate-800 mb-1">Total Omset Baterai</p>
                <p className="mb-2">Untuk mengisi total omset baterai bisa ditanyakan ke owner/kepala toko dalam satu hari biasanya service berapa baterai?</p>
                <div className="bg-white p-3 rounded-lg border border-slate-200 font-mono text-xs">
                  <span className="text-emerald-600 font-bold">Sebagai contoh:</span><br/>
                  ambil rata-rata 1/hari x 30 = 30pcs x estimasi harga LCD 100.000<br/>
                  <span className="font-bold text-slate-800">Total omset baterai = 3.000.000</span>
                </div>
              </div>
              
              <div className="mt-4">
                <p className="font-bold text-slate-800 mb-1">Harga Baterai Fastmoving & Merek</p>
                <p className="mb-2">Untuk mengisi harga baterai fastmoving bisa ditanyakan ke owner/kepala toko, kalau baterai yang sering ganti dari HP apa ya biasanya?</p>
                <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-slate-400 font-bold w-16 shrink-0">Contoh :</span>
                    <span className="font-medium">oppo a3s</span>
                  </div>
                  <div>
                    <p className="text-slate-600 font-medium italic mt-2 mb-1">"Merek yang paling sering dipakai?"</p>
                    <div className="flex items-start gap-2">
                      <span className="text-slate-400 font-bold w-16 shrink-0">Contoh :</span>
                      <span className="font-medium">brader/meetoo/og</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-slate-600 font-medium italic mt-2 mb-1">"Dapet harga berapa ya biasanya?"</p>
                    <div className="flex items-start gap-2">
                      <span className="text-slate-400 font-bold w-16 shrink-0">Contoh :</span>
                      <span className="font-mono bg-slate-100 px-2 py-0.5 rounded font-medium">85000</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {!hasScrolledToBottom && (
             <div className="text-center py-4 relative">
                <div className="absolute top-1/2 left-0 w-full h-px bg-slate-200 -z-10"></div>
                <span className="bg-slate-50 px-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Scroll ke Bawah
                </span>
             </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-3 border-t border-slate-100">
          <Button variant="ghost" onClick={onClose} type="button" className="text-slate-500 font-bold rounded-lg w-full sm:w-auto">
            Batal
          </Button>
          <Button 
            onClick={() => {
              if (hasScrolledToBottom) {
                onContinue();
              }
            }}
            disabled={!hasScrolledToBottom}
            type="button"
            className={`px-8 rounded-lg font-black transition-all shadow-lg w-full sm:w-auto ${
              hasScrolledToBottom 
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                : 'bg-slate-200 text-slate-400 cursor-not-allowed border-none'
            }`}
          >
            <CheckCircle2 className={`w-5 h-5 mr-2 ${hasScrolledToBottom ? 'animate-pulse' : ''}`} /> 
            {hasScrolledToBottom ? 'Lanjutkan Isi Data' : 'Scroll ke Bawah Dulu'}
          </Button>
        </div>
      </div>
    </GenieModal>
  );
}
