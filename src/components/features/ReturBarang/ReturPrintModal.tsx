import React, { useState } from 'react';
import { Button } from '../../ui/Button';
import { Printer, X, Check } from 'lucide-react';
import { cn } from '../../../utils/cn';
import { format } from 'date-fns';
import { printBandung, printCompact } from './returPrintTemplates';

export interface ReturRecordForPrint {
  id: string;
  customer_code: string;
  customer_name: string;
  return_date: string;
  goods_code: string;
  goods_name: string;
  qty: number;
  description?: string;
  category?: string;
  retur_type?: string;
  no_so?: string;
  no_sd?: string;
}

interface ReturPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: ReturRecordForPrint[];
}

export function ReturPrintModal({ isOpen, onClose, records }: ReturPrintModalProps) {
  const [selectedDesign, setSelectedDesign] = useState<'compact' | 'bandung'>('bandung');
  const [copiesPerItem, setCopiesPerItem] = useState<number>(1);

  if (!isOpen || records.length === 0) return null;

  const sampleRecord = records[0];

  const handleExecutePrint = () => {
    if (selectedDesign === 'bandung') {
      printBandung(records, copiesPerItem);
    } else {
      printCompact(records, copiesPerItem);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800">Pilih Desain Cetak Retur</h3>
              <p className="text-xs font-semibold text-slate-500">
                {records.length} data retur dipilih untuk dicetak
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Design 2: Bandung Format (Recommended) */}
            <div 
              onClick={() => setSelectedDesign('bandung')}
              className={cn(
                "relative cursor-pointer rounded-2xl border-2 p-4 transition-all duration-200 flex flex-col justify-between hover:shadow-md",
                selectedDesign === 'bandung'
                  ? "border-indigo-600 bg-indigo-50/20 ring-4 ring-indigo-500/10 shadow-sm"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              )}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-indigo-100 text-indigo-700 rounded-md text-[10px] font-black uppercase tracking-wider mb-1">
                      Desain 2 (Format Bandung)
                    </div>
                    <h4 className="font-black text-slate-800 text-sm">Format Tabel Bandung 3×8</h4>
                  </div>
                  <div className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center text-white transition-all",
                    selectedDesign === 'bandung' ? "bg-indigo-600" : "border-2 border-slate-300"
                  )}>
                    {selectedDesign === 'bandung' && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Tabel border hitam rapi dengan header <strong>BANDUNG</strong>, kolom TYPE, NO SO, NO SD, & keterangan KERUSAKAN tanpa teks ter-wrap (24 label/lembar A4).
                </p>

                {/* Miniature Realistic Mockup */}
                <div className="pt-2">
                  <div className="border border-black bg-white text-[9px] font-sans rounded-none shadow-sm overflow-hidden">
                    <div className="border-b border-black text-center py-0.5 font-black tracking-wider bg-slate-50 text-[10px] whitespace-nowrap">
                      BANDUNG
                    </div>
                    <div className="grid grid-cols-10 border-b border-black">
                      <div className="col-span-3 border-r border-black font-bold p-1 bg-slate-50/50 whitespace-nowrap text-[7.5px] uppercase">NAMA TOKO</div>
                      <div className="col-span-7 p-1 font-bold truncate text-[8px] tracking-tight" title={`${sampleRecord.customer_name} (${sampleRecord.customer_code || '-'})`}>
                        {sampleRecord.customer_name} {sampleRecord.customer_code && <span className="font-normal text-slate-500 text-[7px]">({sampleRecord.customer_code})</span>}
                      </div>
                    </div>
                    <div className="grid grid-cols-10 border-b border-black">
                      <div className="col-span-3 border-r border-black font-bold p-1 bg-slate-50/50 whitespace-nowrap text-[7.5px] uppercase">NO SO</div>
                      <div className="col-span-7 p-1 font-mono font-bold text-[8px] truncate">
                        {sampleRecord.no_so || '-'}
                      </div>
                    </div>
                    <div className="grid grid-cols-10 border-b border-black">
                      <div className="col-span-3 border-r border-black font-bold p-1 bg-slate-50/50 whitespace-nowrap text-[7.5px] uppercase">NO SD (LCD/Bt)</div>
                      <div className="col-span-7 p-1 font-mono font-bold text-[8px] truncate">
                        {sampleRecord.no_sd || '-'}
                      </div>
                    </div>
                    <div className="grid grid-cols-10 border-b border-black">
                      <div className="col-span-3 border-r border-black font-bold p-1 bg-slate-50/50 whitespace-nowrap text-[7.5px] uppercase">TYPE</div>
                      <div className="col-span-7 p-1 font-black text-indigo-700 font-mono text-[8px] truncate">
                        {sampleRecord.goods_code || '-'}
                      </div>
                    </div>
                    <div className="grid grid-cols-10">
                      <div className="col-span-3 border-r border-black font-bold p-1 bg-slate-50/50 whitespace-nowrap text-[7.5px] uppercase">KERUSAKAN</div>
                      <div className="col-span-7 p-1 font-bold text-slate-800 text-[8px] tracking-tight truncate" title={sampleRecord.description || '-'}>
                        {sampleRecord.description || '-'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-500">
                <span>Layout: 3 × 8 per A4</span>
                <span className="text-indigo-600 font-black">24 kartu / lembar</span>
              </div>
            </div>

            {/* Design 1: Compact Label (Existing) */}
            <div 
              onClick={() => setSelectedDesign('compact')}
              className={cn(
                "relative cursor-pointer rounded-2xl border-2 p-4 transition-all duration-200 flex flex-col justify-between hover:shadow-md",
                selectedDesign === 'compact'
                  ? "border-indigo-600 bg-indigo-50/20 ring-4 ring-indigo-500/10 shadow-sm"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              )}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-black uppercase tracking-wider mb-1">
                      Desain 1 (Stiker Kompak)
                    </div>
                    <h4 className="font-black text-slate-800 text-sm">Label Stiker Kompak 3×8</h4>
                  </div>
                  <div className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center text-white transition-all",
                    selectedDesign === 'compact' ? "bg-indigo-600" : "border-2 border-slate-300"
                  )}>
                    {selectedDesign === 'compact' && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Format label stiker kecil berisi nama toko, ID toko, tanggal, nama barang lengkap, QTY, kode barang, & catatan kerusakan.
                </p>

                {/* Miniature Realistic Mockup */}
                <div className="pt-2">
                  <div className="border border-slate-900 rounded p-2 bg-white text-[9px] font-sans space-y-1 shadow-sm">
                    <div className="flex justify-between items-start border-b border-slate-200 pb-1">
                      <div className="truncate max-w-[130px]">
                        <div className="font-extrabold text-[9px] uppercase truncate">{sampleRecord.customer_name}</div>
                        <div className="text-[7.5px] text-slate-500 font-semibold truncate">ID: {sampleRecord.customer_code}</div>
                      </div>
                      <div className="text-[8px] font-bold text-slate-600 whitespace-nowrap">
                        {sampleRecord.return_date ? format(new Date(sampleRecord.return_date), 'dd/MM/yy') : '-'}
                      </div>
                    </div>
                    <div className="text-[8.5px] font-semibold truncate text-slate-800">
                      {sampleRecord.goods_name}
                    </div>
                    <div className="flex justify-between items-baseline pt-0.5 border-t border-slate-100 text-[8px]">
                      <div>QTY: <span className="font-black text-[9.5px]">{sampleRecord.qty}</span></div>
                      <div className="font-mono font-bold text-slate-700 text-[8px] truncate">{sampleRecord.goods_code}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-500">
                <span>Layout: 3 × 8 per A4</span>
                <span className="text-slate-700 font-black">24 stiker / lembar</span>
              </div>
            </div>
          </div>

          {/* Copies Setting */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Jumlah Salinan Cetak Tiap Item
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {records.length === 1 
                  ? "Cetak beberapa salinan untuk 1 barang ini pada satu lembar A4 (3×8 = 24 label)"
                  : `Setiap dari ${records.length} item akan dicetak sebanyak salinan ini`}
              </p>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[1, 2, 4, 8, 12, 24].map(qty => (
                <button
                  key={qty}
                  type="button"
                  onClick={() => setCopiesPerItem(qty)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer",
                    copiesPerItem === qty
                      ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
                      : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                  )}
                >
                  {qty === 24 ? '24 (1 Lembar Penuh)' : `${qty}x`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <Button
            variant="outline"
            onClick={onClose}
            className="rounded-xl font-bold h-11 px-5 border-slate-200 text-slate-600 hover:bg-slate-100"
          >
            Batal
          </Button>
          <Button
            onClick={handleExecutePrint}
            className="rounded-xl font-black h-11 px-6 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20 flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Sekarang ({selectedDesign === 'bandung' ? 'Format Bandung' : 'Stiker Kompak'})</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
