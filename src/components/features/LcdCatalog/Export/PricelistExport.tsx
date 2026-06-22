import React, { forwardRef } from 'react';
import { Package, MonitorSmartphone } from 'lucide-react';

interface LcdProduct {
  id: string;
  brand: string;
  brand_hp: string;
  brand_lcd: string;
  model_hp: string;
  type_lcd: string;
  packing: string;
  price: number;
  stock_status: string;
  stock?: string;
  warranty_months: number;
  goods_code?: string;
  custom_discount?: string;
}

interface ExportProps {
  products: LcdProduct[];
  filteredBrandLcd: string;
  filteredPromoName: string;
  globalDiscount: string;
  customDiscount: number;
  salesman?: any;
  terms?: string;
}

export const PricelistExport = forwardRef<HTMLDivElement, ExportProps>(({ products, filteredBrandLcd, filteredPromoName, globalDiscount, customDiscount, salesman, terms }, ref) => {
  const CHUNK_SIZE = 40;
  const chunks: LcdProduct[][] = [];
  if (products.length === 0) {
    chunks.push([]);
  } else {
    for (let i = 0; i < products.length; i += CHUNK_SIZE) {
      chunks.push(products.slice(i, i + CHUNK_SIZE));
    }
  }

  return (
    <div className="absolute top-[-9999px] left-[-9999px] overflow-visible" style={{ zIndex: -1000 }}>
      <div ref={ref} className="flex flex-col gap-16">
        {chunks.map((chunkProducts, pageIndex) => (
          <div key={pageIndex} data-export-page="true" className="bg-white w-[1200px] p-8 font-sans grayscale">
            {/* Header */}
            {pageIndex === 0 && (
              <div className="bg-slate-900 rounded-2xl p-8 mb-8 text-white shadow-xl flex justify-between items-center">
                <div>
                  <h1 className="text-4xl font-black mb-2 tracking-tight">Katalog LCD {filteredBrandLcd !== 'All' ? filteredBrandLcd : 'Premium'}</h1>
                  <p className="text-slate-300 font-medium">Brosur dan Pricelist Resmi - Kualitas Terbaik, Garansi Terjamin.</p>
                  {(filteredPromoName !== 'All' || customDiscount > 0) && (
                    <div className="mt-4 flex gap-2">
                      {filteredPromoName !== 'All' && (
                        <div className="bg-slate-800 text-white border border-slate-600 px-4 py-1.5 rounded-full inline-flex items-center gap-2 text-sm font-bold uppercase tracking-widest">
                          PROMO KHUSUS: {filteredPromoName}
                        </div>
                      )}
                      {customDiscount > 0 && (
                        <div className="bg-slate-800 text-white border border-slate-600 px-4 py-1.5 rounded-full inline-flex items-center gap-2 text-sm font-bold uppercase tracking-widest">
                          Diskon Tambahan: {customDiscount}%
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="text-right flex flex-col items-end justify-center">
                  {salesman && (
                     <div className="text-right">
                        <div className="text-4xl font-black text-white tracking-tight">Salesman : {salesman.name}</div>
                        <div className="text-lg text-indigo-200 mt-2">
                          Kontak : {(() => {
                            let p = salesman.phone.replace(/^\+?62/, '0');
                            if (!p.startsWith('0')) p = '0' + p;
                            return p;
                          })()}
                        </div>
                     </div>
                  )}
                </div>
              </div>
            )}

            {/* Content Table */}
            <div className={`bg-white border-black overflow-hidden ${pageIndex === 0 ? 'mt-4' : 'mt-0'}`}>
              <table className="w-full text-left border-collapse border border-black text-black">
                <thead>
                  <tr className="bg-slate-100 text-black">
                    <th className="px-6 py-4 font-black uppercase text-xs tracking-wider border border-black text-left">Nama LCD</th>
                    <th className="px-6 py-4 font-black uppercase text-xs tracking-wider text-center border border-black">Harga Sebelum Diskon</th>
                    <th className="px-6 py-4 font-black uppercase text-xs tracking-wider text-center border border-black">Harga Setelah Diskon</th>
                  </tr>
                </thead>
                <tbody>
                  {chunkProducts.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-slate-400 font-medium text-lg border border-black">
                        Tidak ada produk dalam filter ini.
                      </td>
                    </tr>
                  ) : (
                    chunkProducts.map((p, i) => {
                      const packingStr = p.packing || p.type_lcd || '1';
                      const pcsMatch = packingStr.match(/(\d+)\s*pcs/i) || packingStr.match(/(\d+)/);
                      const pcsPerKotak = pcsMatch ? parseInt(pcsMatch[1], 10) : 1;
                      const hargaKotak = p.price || 0;
                      const baseHargaPcs = hargaKotak / Math.max(1, pcsPerKotak);
                      
                      const finalHargaPcs = baseHargaPcs * (1 - (customDiscount / 100));
                      const finalHargaKotak = hargaKotak * (1 - (customDiscount / 100));
                      
                      return (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-6 py-4 border border-black text-left">
                            <div className="font-bold text-slate-800 text-3xl uppercase whitespace-normal break-words leading-tight max-w-[550px]">{p.brand_hp || p.brand} {p.model_hp}</div>
                            <div className="text-xl text-slate-500 font-semibold mt-3">
                              <span className="text-indigo-600 font-bold uppercase">{p.brand_lcd || 'Vivan'}</span>
                              <span className="mx-2 text-slate-300">|</span>
                              <span className="text-slate-600">Packing: {packingStr}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center align-middle border border-black">
                             <div className="flex flex-col items-center justify-center">
                                <span className="font-bold text-slate-600 text-2xl">
                                  {Math.round(baseHargaPcs).toLocaleString('id-ID')}/pcs
                                </span>
                                <span className="text-slate-500 text-xl mt-2">
                                  {Math.round(hargaKotak).toLocaleString('id-ID')}/kotak
                                </span>
                             </div>
                          </td>
                          <td className="px-6 py-4 text-center align-middle border border-black">
                             <div className="flex flex-col items-center justify-center">
                                <span className="font-black text-rose-600 text-3xl">
                                  {Math.round(finalHargaPcs).toLocaleString('id-ID')}/pcs
                                </span>
                                <span className="font-bold text-rose-800 text-xl mt-2">
                                  {Math.round(finalHargaKotak).toLocaleString('id-ID')}/kotak
                                </span>
                             </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Footer */}
            <div className="mt-8 flex justify-between items-center text-slate-400 text-xs font-medium">
              <div className="space-y-1">
                <p>* Harga dan stok dapat berubah sewaktu-waktu. Syarat dan Ketentuan berlaku.</p>
                {terms && (
                  <p className="text-slate-500 italic">* Syarat & Ketentuan Tambahan: {terms}</p>
                )}
              </div>
              <div className="font-bold">
                Halaman {pageIndex + 1} dari {chunks.length}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

PricelistExport.displayName = 'PricelistExport';
