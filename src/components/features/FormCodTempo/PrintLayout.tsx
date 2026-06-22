import React from 'react';

export function PrintLayout({ formData, history }: { formData: any, history: any[] }) {
  return (
    <div className="hidden print:block font-sans text-xs p-0 text-black bg-white w-full">
      <style type="text/css">
        {`
          @media print {
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        `}
      </style>
      <div className="w-full mx-auto" style={{ maxWidth: '190mm' }}>
        <table className="w-full border-collapse border border-black mb-4 table-fixed" style={{ wordWrap: 'break-word' }}>
          <tbody>
            <tr>
              <td colSpan={7} className="border border-black text-center p-2">
                <div className="font-bold text-lg mb-1">客户付款方式COD/TEMPO 申请表</div>
                <div className="font-bold text-base">Lampiran Pengajuan Sistem Pembayaran COD/Tempo Customer</div>
              </td>
            </tr>
            <tr>
              <td className="border border-black p-1.5 w-[15%] text-[10px] leading-tight">
                本次申请付款方式<br/>
                Pengajuan Sistem<br/>
                Pembayaran
              </td>
              <td colSpan={2} className="border border-black p-1.5 text-center text-red-600 font-bold text-sm">
                {formData.pengajuan_sistem}
              </td>
              <td className="border border-black p-1.5 w-[15%] text-[10px] leading-tight">
                申请额度(Juta)<br/>
                Limit (Juta)
              </td>
              <td className="border border-black p-1.5 text-center w-[12%] text-sm">
                {formData.limit_juta}
              </td>
              <td className="border border-black p-1.5 w-[20%] text-[10px] leading-tight flex-col justify-center">
                账期时间（天）<br/>
                Periode Tempo (Hari)<br/>
                <span className="text-[8px] leading-tight block mt-1">注：申请账期才需填写<br/>Note: hanya perlu diisi saat<br/>pengajuan tempo</span>
              </td>
              <td className="border border-black p-1.5 text-center w-[8%] text-sm">
                {formData.periode_tempo}
              </td>
            </tr>
            
            <tr>
              <td colSpan={7} className="border border-black text-center p-1.5 bg-gray-50">
                <div className="font-bold text-sm">客户其他信息</div>
                <div className="font-bold text-sm">Info Customer Lainnya</div>
              </td>
            </tr>

            <tr>
              <td className="border border-black p-1.5 text-[10px] leading-tight">
                店铺数量<br/>Jumlah Toko
              </td>
              <td colSpan={2} className="border border-black p-1.5 text-center">{formData.jumlah_toko}</td>
              <td className="border border-black p-1.5 text-[10px] leading-tight">
                店铺面积(m2)<br/>Luas Area Toko (m2)
              </td>
              <td colSpan={3} className="border border-black p-1.5 text-center">{formData.luas_area}</td>
            </tr>

            <tr>
              <td className="border border-black p-1.5 text-[10px] leading-tight">
                客户属性<br/>Customer Type
              </td>
              <td colSpan={2} className="border border-black p-1.5 text-center font-bold text-red-600">
                {formData.customer_type}
              </td>
              <td className="border border-black p-1.5 text-[10px] leading-tight">
                店面属性<br/>Status Kepemilikan<br/>Toko
              </td>
              <td colSpan={3} className="border border-black p-1.5 text-center font-bold text-red-600">{formData.status_kepemilikan}</td>
            </tr>

            <tr>
              <td className="border border-black p-1.5 text-[10px] leading-tight">
                主营品类<br/>Produk Utama yang<br/>dijual
              </td>
              <td colSpan={2} className="border border-black p-1.5 text-center">{formData.produk_utama}</td>
              <td className="border border-black p-1.5 text-[10px] leading-tight">
                主营品牌<br/>Brand produk yang<br/>dijual
              </td>
              <td colSpan={3} className="border border-black p-1.5 text-center">{formData.brand_produk}</td>
            </tr>

            <tr>
              <td className="border border-black p-1.5 text-[10px] leading-tight">
                月均规模 (Juta)<br/>Omset rata-rata per<br/>Bulan (Juta)
              </td>
              <td colSpan={2} className="border border-black p-1.5 text-center">{formData.omset_rata_rata}</td>
              <td className="border border-black p-1.5 text-[10px] leading-tight">
                其他<br/>Lain - lain
              </td>
              <td colSpan={3} className="border border-black p-1.5 text-center">{formData.lain_lain}</td>
            </tr>

            <tr>
              <td colSpan={7} className="border border-black text-center p-1.5 bg-gray-50">
                <div className="font-bold text-sm">历史订单/付款情况</div>
                <div className="font-bold text-sm">History Pemesanan & Pembayaran</div>
              </td>
            </tr>

            <tr className="text-[9px] leading-tight bg-gray-50">
              <td className="border border-black p-1 text-center w-[15%]">
                近3个⽉订单/ 近3次订单<br/>
                Pesanan 3 bulan<br/>terakhir/3 kali terakhir
              </td>
              <td className="border border-black p-1 text-center w-[15%]">
                下单品类<br/>Kategori Produk yang<br/>dipesan
              </td>
              <td className="border border-black p-1 text-center w-[12%]">
                下单金额 (Juta)<br/>Nominal Pesanan<br/>(Juta)
              </td>
              <td className="border border-black p-1 text-center w-[20%]">
                SD单号<br/>No SD
              </td>
              <td className="border border-black p-1 text-center w-[13%]">
                付款方式<br/>Sistem Pembayaran<br/>(CBD/COD)
              </td>
              <td className="border border-black p-1 text-center w-[12%]">
                发货时间<br/>Tanggal Pengiriman
              </td>
              <td className="border border-black p-1 text-center w-[13%]">
                付款时间<br/>Tanggal Pembayaran
              </td>
            </tr>

            {history.map((row, index) => {
              // Set the text color to red for specific months to match screenshot exactly
              const isRedRow = ['Januari', 'Feb', 'Maret', 'SD 1', 'SD 2', 'SD 3'].includes(row.month);
              const label = row.month.includes('SD ') ? (
                <>订单{row.month.split(' ')[1]}<br/>{row.month}</>
              ) : row.month === 'Nominal Rata-rata 3 bulan terakhir' ? (
                <>近三个月平均金额<br/>Nominal Rata-rata 3<br/>bulan terakhir</>
              ) : row.month;

              return (
                <tr key={index} className="text-[10px]">
                  <td className={`border border-black p-1.5 text-center ${isRedRow ? 'text-red-600' : ''}`}>
                    {label}
                  </td>
                  <td className="border border-black p-1.5 text-center break-words">{row.category}</td>
                  <td className="border border-black p-1.5 text-center break-words">{row.nominal}</td>
                  <td className="border border-black p-1.5 text-center break-words text-[9px]">{row.no_sd}</td>
                  <td className="border border-black p-1.5 text-center break-words">{row.sistem_pembayaran}</td>
                  <td className="border border-black p-1.5 text-center break-words">{row.tgl_pengiriman}</td>
                  <td className="border border-black p-1.5 text-center break-words">{row.tgl_pembayaran}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={7} className="border border-black p-3 align-top h-24 text-[11px]">
                申请理由（分总）:<br/>
                Alasan Pengajuan (BM wajib isi):<br/>
                <div className="mt-1 whitespace-pre-wrap">{formData.alasan_pengajuan}</div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
