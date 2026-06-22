import React, { useRef, useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { X, Download, Loader2 } from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import { supabase } from '../../../services/supabase';

interface NotaModalProps {
  data: any;
  onClose: () => void;
}

export const NotaModal: React.FC<NotaModalProps> = ({ data, onClose }) => {
  const notaRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchItems = async () => {
      if (!data?.delivery_no) {
        setLoading(false);
        return;
      }
      try {
        const searchVal = data.delivery_no ? String(data.delivery_no).trim() : '';
        
        let allData: any[] = [];
        let hasMore = true;
        let from = 0;
        const limit = 1000;

        while (hasMore) {
          const { data: kpiData, error } = await supabase
            .from('salesman_kpi')
            .select('goods_code, brand_name, category, goods_name, qty_order, qty, harga_modal, discount, total_amount')
            .eq('delivery_no', searchVal)
            .range(from, from + limit - 1);

          if (error) throw error;

          if (kpiData && kpiData.length > 0) {
            allData = [...allData, ...kpiData];
            from += limit;
            if (kpiData.length < limit) hasMore = false;
          } else {
            hasMore = false;
          }
        }

        setItems(allData);
      } catch (err) {
        console.error('Error fetching items for nota:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, [data?.delivery_no]);

  const handleDownload = async () => {
    if (!notaRef.current) return;
    try {
      // Small delay to ensure all rendering is complete
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const node = notaRef.current;
      
      // html-to-image works best when we explicitly provide dimensions explicitly,
      // especially when there are scroll contexts.
      const dataUrl = await htmlToImage.toPng(node, { 
        pixelRatio: 2, 
        backgroundColor: '#ffffff',
        skipFonts: true, 
        width: node.offsetWidth,
        height: node.scrollHeight,
        style: {
          transform: 'none',
          margin: '0',
          padding: '2rem' // Keep padding matching the p-8 in class list
        }
      });
      const link = document.createElement('a');
      link.download = `Nota_${data.delivery_no || 'Unknown'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to generate image', err);
    }
  };

  if (!data) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#0f172a]/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-[#f8fafc] rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header Actions */}
        <div className="bg-white border-b border-[#e2e8f0] flex items-center justify-between px-6 py-4 z-10 shrink-0">
          <h2 className="text-lg font-black text-[#1e293b]">Delivery Order (Nota)</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-bold transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} 
              Download Image
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#f1f5f9] rounded-full transition-colors text-[#64748b]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Container */}
        <div className="overflow-auto p-4 sm:p-8 flex justify-center w-full min-h-0 relative">
          {loading ? (
            <div className="flex items-center justify-center py-20 w-[850px] bg-white shadow-sm border border-[#e2e8f0]">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
          ) : (
            <div className="pb-10">
              {/* Nota Content - The printable area */}
              <div 
                className="p-8 bg-[#ffffff] shadow-sm border border-[#e2e8f0] shrink-0 block" 
                ref={notaRef}
                style={{ width: '850px' }}
              >
                {/* Header */}
                <div className="flex items-start justify-between border-b border-[#e2e8f0] pb-6 mb-6">
                  <div>
                    <h1 className="text-2xl font-black text-[#0f172a] mb-1">Delivery Order</h1>
                    <p className="text-sm text-[#64748b]">PT. WOOK GLOBAL TECHNOLOGY</p>
                  </div>
                  {/* Pseudo QR Code */}
                  <div className="w-20 h-20 bg-[#f1f5f9] border border-[#e2e8f0] flex items-center justify-center text-[10px] text-[#94a3b8]">
                    [QR]
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-x-12 gap-y-4 text-sm mb-8">
                  <div className="space-y-3">
                    <div className="flex">
                      <span className="w-32 font-bold text-[#475569]">No. Pengiriman</span>
                      <span className="font-medium text-[#0f172a]">: {data.delivery_no || '-'}</span>
                    </div>
                    <div className="flex">
                      <span className="w-32 font-bold text-[#475569]">Bill to</span>
                      <span className="font-medium text-[#0f172a]">: {data.customer_name || '-'}</span>
                    </div>
                    <div className="flex">
                      <span className="w-32 font-bold text-[#475569]">Nama Penerima</span>
                      <span className="font-medium text-[#0f172a]">: {data.customer_name || '-'}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex">
                      <span className="w-32 font-bold text-[#475569]">Tanggal Tempo</span>
                      <span className="font-medium text-[#0f172a]">: {data.due_date !== null && data.due_date !== undefined ? `${data.due_date} Hari` : '-'}</span>
                    </div>
                    <div className="flex">
                      <span className="w-32 font-bold text-[#475569]">Sales</span>
                      <span className="font-medium text-[#0f172a]">: {data.salesman_name || '-'}</span>
                    </div>
                    <div className="flex">
                      <span className="w-32 font-bold text-[#475569]">Nama Toko</span>
                      <span className="font-medium text-[#0f172a]">: {data.customer_code} {data.customer_name}</span>
                    </div>
                  </div>
                </div>

                {/* Summary / Table area */}
                <table className="w-full text-left border-collapse border border-[#1e293b] text-sm mb-6">
                  <thead>
                    <tr className="bg-[#f8fafc] border-b border-[#1e293b]">
                      <th className="px-2 py-2 border-r border-[#1e293b] font-bold text-[#0f172a] w-24">Kode</th>
                      <th className="px-2 py-2 border-r border-[#1e293b] font-bold text-[#0f172a]">Merek</th>
                      <th className="px-2 py-2 border-r border-[#1e293b] font-bold text-[#0f172a]">Kategori</th>
                      <th className="px-2 py-2 border-r border-[#1e293b] font-bold text-[#0f172a]">Spesification</th>
                      <th className="px-2 py-2 border-r border-[#1e293b] text-center font-bold text-[#0f172a] w-16">Qty</th>
                      <th className="px-2 py-2 border-r border-[#1e293b] text-right font-bold text-[#0f172a] w-28">Harga / Pcs</th>
                      <th className="px-2 py-2 border-r border-[#1e293b] text-right font-bold text-[#0f172a] w-28">Jumlah Bruto</th>
                      <th className="px-2 py-2 border-r border-[#1e293b] text-right font-bold text-[#0f172a] w-24">Diskon</th>
                      <th className="px-2 py-2 text-right font-bold text-[#0f172a] w-32">Jumlah (Rp)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length > 0 ? (
                      items.map((item, idx) => {
                        const qty = Number(item.qty) > 0 ? Number(item.qty) : (Number(item.qty_order) || 0);
                        const totalItem = Number(item.total_amount) || 0;
                        const hargaPcs = Number(item.harga_modal) || 0;
                        const jumlahBruto = hargaPcs * qty;
                        
                        let rawDiscountStr = String(item.discount ?? '').replace('%', '').replace(',', '.');
                        let discountVal = Number(rawDiscountStr);
                        
                        // Handle empty/invalid as 100% (meaning no discount, customer pays full price)
                        if (isNaN(discountVal) || rawDiscountStr.trim() === '') {
                          discountVal = 100;
                        } else if (discountVal > 0 && discountVal <= 1) {
                          discountVal *= 100;
                        }

                        // "misal diskonya itu 28% tapi yang tampil di kolom diskon itu 72% bukan 28%"
                        // 72% dari jumlah bruto adalah hasil yang dibayarkan.
                        // "Contoh jumlah bruto 1000000-10% hasilnya 900000 yang di tampilkan pada kolom diskon"
                        const discountDisplayAmount = (jumlahBruto * discountVal) / 100;

                        return (
                          <tr key={idx} className="border-b border-[#e2e8f0] last:border-b-[#1e293b]">
                            <td className="px-2 py-2 border-r border-[#1e293b] text-[#334155] break-words">{item.goods_code || '-'}</td>
                            <td className="px-2 py-2 border-r border-[#1e293b] text-[#334155]">{item.brand_name || '-'}</td>
                            <td className="px-2 py-2 border-r border-[#1e293b] text-[#334155]">{item.category || '-'}</td>
                            <td className="px-2 py-2 border-r border-[#1e293b] text-[#334155]">{item.goods_name || '-'}</td>
                            <td className="px-2 py-2 border-r border-[#1e293b] text-[#0f172a] text-center font-medium">{qty}</td>
                            <td className="px-2 py-2 border-r border-[#1e293b] text-[#0f172a] text-right font-medium">
                              {Math.round(hargaPcs).toLocaleString()}
                            </td>
                            <td className="px-2 py-2 border-r border-[#1e293b] text-[#0f172a] text-right font-medium">
                              {Math.round(jumlahBruto).toLocaleString()}
                            </td>
                            <td className="px-2 py-2 border-r border-[#1e293b] text-[#0f172a] text-right font-medium">
                              {Math.round(discountDisplayAmount).toLocaleString()}
                            </td>
                            <td className="px-2 py-2 text-[#0f172a] text-right font-bold">
                              {totalItem.toLocaleString()}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr className="border-b-[#1e293b]">
                        <td colSpan={9} className="px-4 py-8 text-center text-[#64748b]">
                          Detail barang belum tersedia.
                        </td>
                      </tr>
                    )}
                    {/* Total Row */}
                    <tr className="bg-[#f8fafc]">
                      <td colSpan={8} className="px-4 py-3 border-r border-[#1e293b] text-right font-bold text-[#0f172a]">
                        Total Tagihan
                      </td>
                      <td className="px-2 py-3 text-right font-bold text-[#0f172a]">
                        {items.length > 0
                          ? items.reduce((sum, item) => sum + (Number(item.total_amount) || 0), 0).toLocaleString()
                          : Number(data.total_amount || 0).toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Virtual Accounts & Reminder */}
                <div className="mt-8 pt-6 border-t border-[#e2e8f0]">
                  <p className="font-bold text-[#0f172a] mb-3 text-sm">Mohon ditransfer ke:</p>
                  <div className="pl-4 space-y-2 mb-6">
                    <p className="font-black text-[#0f172a] text-sm">
                      BCA VA 110820{data.customer_code}{' '}
                      <span className="font-medium text-[#475569]">A/N PT.WOOK GLOBAL TECHNOLOGY atau</span>
                    </p>
                    <p className="font-black text-[#0f172a] text-sm">
                      MANDIRI VA 89460{data.customer_code}{' '}
                      <span className="font-medium text-[#475569]">A/N PT.WOOK GLOBAL TECHNOLOGY atau</span>
                    </p>
                    <p className="font-black text-[#0f172a] text-sm">
                      BRI VA 139090{data.customer_code}{' '}
                      <span className="font-medium text-[#475569]">A/N PT.WOOK GLOBAL TECHNOLOGY</span>
                    </p>
                  </div>

                  <div className="text-xs text-[#475569] leading-relaxed border border-[#e2e8f0] bg-[#f8fafc] p-4 rounded-lg">
                    <p className="font-bold text-[#0f172a] mb-2">Reminder:</p>
                    <ol className="list-decimal pl-4 space-y-1 mt-1">
                      <li>Delivery Order ini hanya sebagai referensi bukti pembayaran ke PT.WOOK GLOBAL TECHNOLOGY.</li>
                      <li>PT.WOOK GLOBAL TECHNOLOGY akan menerbitkan Faktur Penjualan untuk pembukuan customer.</li>
                      <li>Setelah customer menerima barang, harap segera melakukan konfirmasi penerimaan pada aplikasi WOOK agar dapat diterbitkan Faktur Penjualan dan Faktur Pajak atas pembelian tersebut.</li>
                      <li className="font-bold text-[#0f172a]">Komplain masalah barang harus dilaporkan dalam waktu 1 hari kerja setelah penerimaan. Jika tidak ada laporan, maka dianggap tidak ada masalah. Bukti pendukung: video saat pembukaan dus/kemasan, foto barang, dan nomor nota/pengiriman.</li>
                    </ol>
                  </div>

                  <div className="flex justify-between mt-12 px-8 text-sm font-bold text-[#475569]">
                    <div className="w-32 text-center border-t border-[#94a3b8] pt-2">Admin</div>
                    <div className="w-32 text-center border-t border-[#94a3b8] pt-2">Pengirim</div>
                    <div className="w-32 text-center border-t border-[#94a3b8] pt-2">Penerima</div>
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


