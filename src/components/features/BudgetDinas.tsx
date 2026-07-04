import React, { useState } from 'react';
import { Printer } from 'lucide-react';

interface BudgetItem {
  no: number;
  nama: string;
  level: string;
  jmlOrang: string;
  jmlHari: string;
  jenisBudget: string;
  standarBudget: string;
  totalBudget: string;
}

export function BudgetDinas() {
  const [dept, setDept] = useState('Bandung');
  const [tglPengajuan, setTglPengajuan] = useState('');
  const [tglDinas, setTglDinas] = useState('');
  
  const [items, setItems] = useState<BudgetItem[]>(
    Array.from({ length: 6 }, (_, i) => ({
      no: i + 1,
      nama: i === 0 ? 'Sendi' : '',
      level: i === 0 ? 'Sales' : '',
      jmlOrang: i === 0 ? '1' : '',
      jmlHari: i === 0 ? '3' : '',
      jenisBudget: i === 0 ? '交通 Transport' : i === 1 ? '膳食 Uang Makan' : i === 2 ? '住宿 Uang Hotel' : '',
      standarBudget: i === 0 ? '200.000' : i === 1 ? '180.000' : i === 2 ? '450.000' : '',
      totalBudget: ''
    }))
  );

  const [dibuatNama, setDibuatNama] = useState('Sendi');
  const [dibuatJabatan, setDibuatJabatan] = useState('Sales');
  
  const [disetujuiNama, setDisetujuiNama] = useState('Clark刘字');
  const [disetujuiJabatan, setDisetujuiJabatan] = useState('BM');
  
  const [diperiksaNama, setDiperiksaNama] = useState('Mariana');
  const [diperiksaJabatan, setDiperiksaJabatan] = useState('Finance');

  const [grandTotal, setGrandTotal] = useState('830.000');

  const updateItem = (index: number, field: keyof BudgetItem, value: string) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    setItems(newItems);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col items-center bg-slate-50 min-h-screen pb-24 print:pb-0 print:bg-white">
      <div className="w-full p-4 flex justify-end print:hidden">
        <button 
          onClick={handlePrint}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm font-medium"
        >
          <Printer className="w-4 h-4" /> Cetak Form
        </button>
      </div>

      <div className="w-full overflow-x-auto print:overflow-visible flex justify-center">
        {/* Printable Area - A4 Width Approx (800px) */}
        <div className="min-w-[800px] w-[800px] bg-white text-black p-8 font-sans print:p-0 print:shadow-none shadow-sm border border-slate-200">
          
          <table className="w-full border-collapse border-2 border-black text-sm">
            <tbody>
              {/* Header Row */}
              <tr>
                <td colSpan={8} className="border border-black p-3 relative h-16">
                  {/* Fake Logo */}
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1 font-black text-red-500 text-3xl tracking-tighter">
                    wook<span className="text-red-500 rounded-full w-2 h-2 inline-block"></span>
                  </div>
                  <div className="text-center w-full font-bold text-lg">
                    出差费用预算申请表 Form Pengajuan Budget Dinas
                  </div>
                </td>
              </tr>
              
              {/* Row 2: Dept and Dates */}
              <tr className="text-center font-bold">
                <td colSpan={2} className="border border-black p-2 bg-gray-50">
                  申请部门 Dept
                </td>
                <td className="border border-black p-0">
                  <input 
                    type="text" 
                    className="w-full h-full p-2 text-center outline-none bg-transparent"
                    value={dept}
                    onChange={(e) => setDept(e.target.value)}
                  />
                </td>
                <td className="border border-black p-2 bg-gray-50 text-xs">
                  申请日期<br/>tgl Pengajuan
                </td>
                <td colSpan={2} className="border border-black p-0">
                  <input 
                    type="text" 
                    className="w-full h-full p-2 text-center outline-none bg-transparent"
                    value={tglPengajuan}
                    onChange={(e) => setTglPengajuan(e.target.value)}
                  />
                </td>
                <td className="border border-black p-2 bg-gray-50 text-xs">
                  出差日期<br/>Tgl Dinas
                </td>
                <td className="border border-black p-0">
                  <input 
                    type="text" 
                    className="w-full h-full p-2 text-center outline-none bg-transparent"
                    value={tglDinas}
                    onChange={(e) => setTglDinas(e.target.value)}
                  />
                </td>
              </tr>

              {/* Row 3: Table Headers */}
              <tr className="text-center font-bold bg-gray-50 text-xs">
                <td className="border border-black p-2 w-[40px]">No</td>
                <td className="border border-black p-2 w-[120px]">姓名 Nama</td>
                <td className="border border-black p-2 w-[100px]">职级 Level</td>
                <td className="border border-black p-2 w-[60px]">人数<br/>jml orang</td>
                <td className="border border-black p-2 w-[60px]">日数<br/>jml Hari</td>
                <td className="border border-black p-2 w-[160px]">预算分类<br/>Jenis Budget</td>
                <td className="border border-black p-2 w-[120px]">费用标准<br/>Standar Budget</td>
                <td className="border border-black p-2 w-[140px]">总额<br/>Total Budget</td>
              </tr>

              {/* Data Rows */}
              {items.map((item, index) => (
                <tr key={index} className="text-center h-8">
                  <td className="border border-black p-0">
                    <input type="text" className="w-full h-full p-1 text-center outline-none bg-transparent" value={item.no} onChange={(e) => updateItem(index, 'no', e.target.value)} />
                  </td>
                  <td className="border border-black p-0">
                    <input type="text" className="w-full h-full p-1 text-center outline-none bg-transparent" value={item.nama} onChange={(e) => updateItem(index, 'nama', e.target.value)} />
                  </td>
                  <td className="border border-black p-0">
                    <input type="text" className="w-full h-full p-1 text-center outline-none bg-transparent" value={item.level} onChange={(e) => updateItem(index, 'level', e.target.value)} />
                  </td>
                  <td className="border border-black p-0">
                    <input type="text" className="w-full h-full p-1 text-center outline-none bg-transparent" value={item.jmlOrang} onChange={(e) => updateItem(index, 'jmlOrang', e.target.value)} />
                  </td>
                  <td className="border border-black p-0">
                    <input type="text" className="w-full h-full p-1 text-center outline-none bg-transparent" value={item.jmlHari} onChange={(e) => updateItem(index, 'jmlHari', e.target.value)} />
                  </td>
                  <td className="border border-black p-0">
                    <input type="text" className="w-full h-full p-1 text-center outline-none bg-transparent" value={item.jenisBudget} onChange={(e) => updateItem(index, 'jenisBudget', e.target.value)} />
                  </td>
                  <td className="border border-black p-0">
                    <input type="text" className="w-full h-full p-1 text-center outline-none bg-transparent" value={item.standarBudget} onChange={(e) => updateItem(index, 'standarBudget', e.target.value)} />
                  </td>
                  <td className="border border-black p-0">
                    <input type="text" className="w-full h-full p-1 text-center outline-none bg-transparent" value={item.totalBudget} onChange={(e) => updateItem(index, 'totalBudget', e.target.value)} />
                  </td>
                </tr>
              ))}

              {/* Total Row */}
              <tr>
                <td colSpan={7} className="border border-black p-2 text-center font-bold">
                  Total
                </td>
                <td className="border border-black p-0">
                  <div className="flex items-center h-full">
                    <span className="pl-2 font-bold">Rp</span>
                    <input 
                      type="text" 
                      className="w-full h-full p-1 text-right outline-none bg-transparent font-bold pr-2"
                      value={grandTotal}
                      onChange={(e) => setGrandTotal(e.target.value)}
                    />
                  </div>
                </td>
              </tr>

              {/* Signatures Row */}
              <tr className="align-top h-32">
                <td colSpan={3} className="border border-black p-2 relative">
                  <div className="font-bold text-xs mb-8">申请人 Dibuat oleh :</div>
                  <div className="absolute bottom-2 left-2 right-2 flex flex-col gap-1 text-xs font-bold">
                    <div className="flex">
                      <span className="w-12">Nama</span>
                      <span>:</span>
                      <input type="text" className="flex-1 outline-none bg-transparent ml-1" value={dibuatNama} onChange={(e) => setDibuatNama(e.target.value)} />
                    </div>
                    <div className="flex">
                      <span className="w-12">Jabatan</span>
                      <span>:</span>
                      <input type="text" className="flex-1 outline-none bg-transparent ml-1" value={dibuatJabatan} onChange={(e) => setDibuatJabatan(e.target.value)} />
                    </div>
                  </div>
                </td>
                <td colSpan={3} className="border border-black p-2 relative">
                  <div className="font-bold text-xs mb-8">审批人 Disetujui :</div>
                  <div className="absolute bottom-2 left-2 right-2 flex flex-col gap-1 text-xs font-bold">
                    <div className="flex">
                      <span className="w-12">Nama</span>
                      <span>:</span>
                      <input type="text" className="flex-1 outline-none bg-transparent ml-1" value={disetujuiNama} onChange={(e) => setDisetujuiNama(e.target.value)} />
                    </div>
                    <div className="flex">
                      <span className="w-12">Jabatan</span>
                      <span>:</span>
                      <input type="text" className="flex-1 outline-none bg-transparent ml-1" value={disetujuiJabatan} onChange={(e) => setDisetujuiJabatan(e.target.value)} />
                    </div>
                  </div>
                </td>
                <td colSpan={2} className="border border-black p-2 relative">
                  <div className="font-bold text-xs mb-8">Diperiksa</div>
                  <div className="absolute bottom-2 left-2 right-2 flex flex-col gap-1 text-xs font-bold">
                    <div className="flex">
                      <span className="w-12">Nama</span>
                      <span>:</span>
                      <input type="text" className="flex-1 outline-none bg-transparent ml-1" value={diperiksaNama} onChange={(e) => setDiperiksaNama(e.target.value)} />
                    </div>
                    <div className="flex">
                      <span className="w-12">Jabatan</span>
                      <span>:</span>
                      <input type="text" className="flex-1 outline-none bg-transparent ml-1" value={diperiksaJabatan} onChange={(e) => setDiperiksaJabatan(e.target.value)} />
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

        </div>
      </div>
      
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:visible, .print\\:visible * {
            visibility: visible;
          }
          .min-w-\\[800px\\] {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            visibility: visible;
          }
          .min-w-\\[800px\\] * {
            visibility: visible;
          }
          .print\\:hidden {
            display: none !important;
          }
          @page {
            size: landscape;
            margin: 10mm;
          }
        }
      `}</style>
    </div>
  );
}
