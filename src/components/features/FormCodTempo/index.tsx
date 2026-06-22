import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { supabase } from '../../../services/supabase';
import { useAlert } from '../../ui/AlertModal';
import { Save, Printer, FileText, ChevronLeft, ChevronRight, Search, ChevronDown } from 'lucide-react';
import { PrintLayout } from './PrintLayout';

interface HistoryRow {
  month: string;
  category: string;
  nominal: string;
  no_sd: string;
  sistem_pembayaran: string;
  tgl_pengiriman: string;
  tgl_pembayaran: string;
}

export default function FormCodTempo() {
  const { showAlert } = useAlert();
  const [loading, setLoading] = useState(false);
  
  // Data from DB
  const [customers, setCustomers] = useState<string[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  // Custom Dropdown State
  const [custSearch, setCustSearch] = useState('');
  const [showCustDropdown, setShowCustDropdown] = useState(false);
  const [custPage, setCustPage] = useState(1);
  const CUST_PER_PAGE = 50;

  // Custom SD Dropdown State
  const [activeSdDropdown, setActiveSdDropdown] = useState<number | null>(null);
  const [sdSearch, setSdSearch] = useState('');
  const [sdPage, setSdPage] = useState(1);
  const SD_PER_PAGE = 20;

  const [formData, setFormData] = useState({
    pengajuan_sistem: 'COD',
    limit_juta: '',
    periode_tempo: '',
    jumlah_toko: '',
    luas_area: '',
    customer_type: 'Reseller',
    status_kepemilikan: 'Milik Sendiri',
    produk_utama: '',
    brand_produk: '',
    omset_rata_rata: '',
    lain_lain: '', // this will store selected customer name
    alasan_pengajuan: ''
  });

  const [history, setHistory] = useState<HistoryRow[]>([
    { month: 'Januari', category: '', nominal: '', no_sd: '', sistem_pembayaran: '', tgl_pengiriman: '', tgl_pembayaran: '' },
    { month: 'Feb', category: '', nominal: '', no_sd: '', sistem_pembayaran: '', tgl_pengiriman: '', tgl_pembayaran: '' },
    { month: 'Maret', category: '', nominal: '', no_sd: '', sistem_pembayaran: '', tgl_pengiriman: '', tgl_pembayaran: '' },
    { month: 'Nominal Rata-rata 3 bulan terakhir', category: '', nominal: '', no_sd: '', sistem_pembayaran: '', tgl_pengiriman: '', tgl_pembayaran: '' },
    { month: 'SD 1', category: '', nominal: '', no_sd: '', sistem_pembayaran: '', tgl_pengiriman: '', tgl_pembayaran: '' },
    { month: 'SD 2', category: '', nominal: '', no_sd: '', sistem_pembayaran: '', tgl_pengiriman: '', tgl_pembayaran: '' },
    { month: 'SD 3', category: '', nominal: '', no_sd: '', sistem_pembayaran: '', tgl_pengiriman: '', tgl_pembayaran: '' },
  ]);

  useEffect(() => {
    document.title = "Form COD/Tempo";
    let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.getElementsByTagName('head')[0].appendChild(link);
    }
    link.href = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📝</text></svg>';
    fetchCustomersAndDeliveries();
  }, []);

  const fetchCustomersAndDeliveries = async () => {
    setDataLoading(true);
    try {
      // Fetch all customers securely paginated
      let allCustomers: any[] = [];
      let hasMore = true;
      let from = 0;
      let limit = 1000;
      
      while (hasMore) {
        const { data, error } = await supabase
          .from('salesman_customer')
          .select('customer_name')
          .range(from, from + limit - 1);
        if (error) {
          hasMore = false;
        } else {
          allCustomers = [...allCustomers, ...data];
          if (data.length < limit) hasMore = false;
          else from += limit;
        }
      }
      setCustomers(Array.from(new Set(allCustomers.map(c => c.customer_name))).filter(Boolean).sort());

      // Fetch all deliveries securely paginated
      let allDeliveries: any[] = [];
      hasMore = true;
      from = 0;
      while (hasMore) {
        const { data, error } = await supabase
          .from('salesman_kpi')
          .select('delivery_no, category, total_amount, order_date, customer_name, brand_name, payment_date')
          .not('delivery_no', 'is', null)
          .range(from, from + limit - 1);
        if (error) {
          hasMore = false;
        } else {
          allDeliveries = [...allDeliveries, ...data];
          if (data.length < limit) hasMore = false;
          else from += limit;
        }
      }

      function determineBrandCategory(brandName?: string) {
        if (!brandName) return 'NEW CATEGORY';
        const b = brandName.toLowerCase();
        if (['vivan', 'robot', 'acome', 'gamen', 'aula', 'philips', 'redskull', 'acome acc', 'acome iot', 'xpas'].includes(b)) {
          return '3C';
        }
        if (['bonbox', 'panova', 'disney', 'no brand', 'air du sud'].includes(b)) {
          return 'HOMELIVING';
        }
        if (b === 'samono') {
          return 'HOME APPLIANCES';
        }
        return 'NEW CATEGORY';
      }

      const uniqueDeliveries = allDeliveries.reduce((acc: any, curr: any) => {
        const amount = parseFloat(curr.total_amount) || 0;
        const bCategory = determineBrandCategory(curr.brand_name);

        if (!acc[curr.delivery_no]) {
          acc[curr.delivery_no] = { 
            ...curr, 
            total_amount: amount,
            category_amounts: { [bCategory]: amount }
          };
        } else {
          acc[curr.delivery_no].total_amount += amount;
          if (!acc[curr.delivery_no].category_amounts[bCategory]) {
            acc[curr.delivery_no].category_amounts[bCategory] = 0;
          }
          acc[curr.delivery_no].category_amounts[bCategory] += amount;
        }
        return acc;
      }, {});

      const deliveriesArray = Object.values(uniqueDeliveries).map((d: any) => {
        const dominantCategory = Object.keys(d.category_amounts).reduce((a, b) => 
          d.category_amounts[a] > d.category_amounts[b] ? a : b
        );
        return { ...d, dominant_category: dominantCategory };
      });

      setDeliveries(deliveriesArray);

    } catch (e) {
      console.error(e);
    } finally {
      setDataLoading(false);
    }
  };

  const handleDeliverySelect = (index: number, deliveryNo: string) => {
    const selected = deliveries.find(d => d.delivery_no === deliveryNo);
    const newHistory = [...history];
    if (selected) {
      newHistory[index].no_sd = selected.delivery_no;
      newHistory[index].category = selected.dominant_category || '';
      newHistory[index].nominal = selected.total_amount ? (parseFloat(selected.total_amount) / 1000000).toFixed(2) : '';
      newHistory[index].tgl_pengiriman = selected.order_date ? new Date(selected.order_date).toISOString().split('T')[0] : '';
      newHistory[index].tgl_pembayaran = selected.payment_date ? new Date(selected.payment_date).toISOString().split('T')[0] : '';
    } else {
      newHistory[index].no_sd = deliveryNo; // allow manual mapping if not found
    }
    setHistory(newHistory);
  };

  const handleChange = (e: any) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleHistoryChange = (index: number, field: string, value: string) => {
    const newHistory = [...history];
    newHistory[index] = { ...newHistory[index], [field]: value };
    setHistory(newHistory);
  };

  const selectCustomer = (cust: string) => {
    setFormData(prev => ({ ...prev, lain_lain: cust }));
    setShowCustDropdown(false);
    // Reset history no_sd entries if customer changes
    const newHistory = history.map(h => ({
      ...h,
      no_sd: '',
      category: '',
      nominal: '',
      tgl_pengiriman: ''
    }));
    setHistory(newHistory);
  };

  const formatRupiah = (number: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
  };

  // Derived state for dropdown
  const filteredCustomers = customers.filter(c => c.toLowerCase().includes(custSearch.toLowerCase()));
  const totalCustPages = Math.ceil(filteredCustomers.length / CUST_PER_PAGE);
  const currentCustSet = filteredCustomers.slice((custPage - 1) * CUST_PER_PAGE, custPage * CUST_PER_PAGE);

  // Deliveries filtered by selected customer
  const filteredDeliveries = deliveries.filter(d => !formData.lain_lain || d.customer_name === formData.lain_lain);

  const filteredSdList = filteredDeliveries.filter(d => 
    d.delivery_no.toLowerCase().includes(sdSearch.toLowerCase())
  );
  const totalSdPages = Math.ceil(filteredSdList.length / SD_PER_PAGE);
  const currentSdSet = filteredSdList.slice((sdPage - 1) * SD_PER_PAGE, sdPage * SD_PER_PAGE);

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.from('form_cod_tempo').insert([{
        pengajuan_sistem: formData.pengajuan_sistem,
        limit_juta: formData.limit_juta ? parseFloat(formData.limit_juta) : 0,
        periode_tempo: formData.periode_tempo ? parseInt(formData.periode_tempo) : 0,
        jumlah_toko: formData.jumlah_toko ? parseInt(formData.jumlah_toko) : 0,
        luas_area: formData.luas_area,
        customer_type: formData.customer_type,
        status_kepemilikan: formData.status_kepemilikan,
        produk_utama: formData.produk_utama,
        brand_produk: formData.brand_produk,
        omset_rata_rata: formData.omset_rata_rata ? parseFloat(formData.omset_rata_rata) : 0,
        lain_lain: formData.lain_lain,
        history_pesanan: history,
        alasan_pengajuan: formData.alasan_pengajuan,
      }]);

      if (error) throw error;
      showAlert('Berhasil menyimpan data', 'success');
    } catch (e: any) {
      showAlert(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <div className="p-2 mb-20 w-full print:hidden">
        <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
          <h2 className="text-2xl font-bold flex items-center justify-center gap-2 text-center w-full sm:w-auto">
            <FileText className="w-6 h-6 text-indigo-600" />
            Form COD/Tempo
          </h2>
          <div className="flex gap-2 w-full sm:w-auto justify-center sm:justify-end">
            <Button onClick={handleSave} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700">
              <Save className="w-4 h-4 mr-2" /> Simpan
            </Button>
            <Button onClick={handlePrint} variant="outline">
              <Printer className="w-4 h-4 mr-2" /> Cetak
            </Button>
          </div>
        </div>

        <Card className="mb-6 overflow-visible">
          <CardHeader>
            <CardTitle>Data Pengajuan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-bold mb-1">Pengajuan Sistem</label>
                <select name="pengajuan_sistem" value={formData.pengajuan_sistem} onChange={handleChange} className="w-full p-2 border rounded">
                  <option value="COD">COD</option>
                  <option value="TEMPO">TEMPO</option>
                  <option value="COD/TEMPO">COD & TEMPO</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Limit (Juta)</label>
                <input type="number" name="limit_juta" value={formData.limit_juta} onChange={handleChange} className="w-full p-2 border rounded" placeholder="Contoh: 15" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Periode Tempo (Hari)</label>
                <input type="number" name="periode_tempo" value={formData.periode_tempo} onChange={handleChange} className="w-full p-2 border rounded" placeholder="Contoh: 14" disabled={formData.pengajuan_sistem === 'COD'} />
              </div>
            </div>
            
            <h3 className="font-bold border-b pb-2 pt-4">Info Customer Lainnya</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-bold mb-1">Jumlah Toko</label>
                <input type="number" name="jumlah_toko" value={formData.jumlah_toko} onChange={handleChange} className="w-full p-2 border rounded" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Luas Area (m2)</label>
                <input type="text" name="luas_area" value={formData.luas_area} onChange={handleChange} className="w-full p-2 border rounded" />
              </div>
              <div className="relative">
                <label className="block text-sm font-bold mb-1">Customer / Lain-lain</label>
                <div 
                  className="w-full p-2 border rounded bg-white flex justify-between items-center cursor-pointer"
                  onClick={() => setShowCustDropdown(!showCustDropdown)}
                >
                  <span className="truncate">{formData.lain_lain || '-- Pilih Customer --'}</span>
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                </div>
                
                {showCustDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowCustDropdown(false)}></div>
                    <div className="absolute z-50 mt-1 w-full bg-white border rounded-lg shadow-lg flex flex-col max-h-[300px]">
                    <div className="p-2 border-b sticky top-0 bg-white rounded-t-lg">
                      <div className="relative">
                        <Search className="w-4 h-4 absolute left-2 top-2 text-slate-400" />
                        <input 
                          type="text" 
                          placeholder="Cari customer..." 
                          className="w-full pl-8 pr-2 py-1.5 border rounded text-sm"
                          value={custSearch}
                          onChange={(e) => {
                            setCustSearch(e.target.value);
                            setCustPage(1);
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div className="text-xs text-slate-500 mt-1.5 px-1 flex justify-between">
                        <span>{dataLoading ? 'Loading...' : `Total: ${filteredCustomers.length} customer`}</span>
                      </div>
                    </div>
                    
                    <div className="overflow-y-auto flex-1 p-1">
                      {currentCustSet.length === 0 ? (
                        <div className="text-center p-3 text-sm text-slate-500">Tidak ada data</div>
                      ) : (
                        currentCustSet.map(c => (
                          <div 
                            key={c} 
                            className="p-2 text-sm hover:bg-slate-100 cursor-pointer rounded truncate"
                            onClick={() => selectCustomer(c)}
                          >
                            {c}
                          </div>
                        ))
                      )}
                    </div>

                    {totalCustPages > 1 && (
                      <div className="p-2 border-t sticky bottom-0 bg-slate-50 rounded-b-lg flex justify-between items-center text-sm">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => { e.stopPropagation(); setCustPage(Math.max(1, custPage - 1)); }}
                          disabled={custPage === 1}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <span className="text-slate-600 text-xs">
                          Hal {custPage} / {totalCustPages}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost" 
                          onClick={(e) => { e.stopPropagation(); setCustPage(Math.min(totalCustPages, custPage + 1)); }}
                          disabled={custPage === totalCustPages}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  </>
                )}
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Customer Type</label>
                <select name="customer_type" value={formData.customer_type} onChange={handleChange} className="w-full p-2 border rounded">
                  <option value="Reseller">Reseller</option>
                  <option value="Distributor">Distributor</option>
                  <option value="Reseller & Distributor">Reseller & Distributor</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Status Kepemilikan</label>
                <select name="status_kepemilikan" value={formData.status_kepemilikan} onChange={handleChange} className="w-full p-2 border rounded">
                  <option value="Milik Sendiri">Milik Sendiri</option>
                  <option value="Sewa">Sewa</option>
                </select>
              </div>
              <div className="col-span-1 md:col-span-1"></div>
              <div>
                <label className="block text-sm font-bold mb-1">Produk Utama</label>
                <input type="text" name="produk_utama" value={formData.produk_utama} onChange={handleChange} className="w-full p-2 border rounded" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Brand Produk</label>
                <input type="text" name="brand_produk" value={formData.brand_produk} onChange={handleChange} className="w-full p-2 border rounded" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Omset rata-rata (Juta)</label>
                <input type="number" name="omset_rata_rata" value={formData.omset_rata_rata} onChange={handleChange} className="w-full p-2 border rounded" />
              </div>
            </div>
            
            <h3 className="font-bold border-b pb-2 pt-4">History Pemesanan & Pembayaran</h3>
            <div className="overflow-x-auto w-full pb-4">
              <table className="w-full text-sm border-collapse border border-slate-200">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="border p-2 min-w-[150px]">Periode/Bulan</th>
                    <th className="border p-2 min-w-[150px]">Kategori Produk</th>
                    <th className="border p-2 min-w-[120px]">Nominal (Juta)</th>
                    <th className="border p-2 min-w-[200px]">No SD</th>
                    <th className="border p-2 min-w-[150px]">Sistem Pembayaran</th>
                    <th className="border p-2 min-w-[150px]">Tgl Pengiriman</th>
                    <th className="border p-2 min-w-[150px]">Tgl Pembayaran</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((row, index) => (
                    <tr key={index}>
                      <td className="border p-2 font-medium">{row.month}</td>
                      <td className="border p-2">
                         <input type="text" value={row.category} onChange={e => handleHistoryChange(index, 'category', e.target.value)} className="w-full p-1" />
                      </td>
                      <td className="border p-2">
                         <input type="text" value={row.nominal} onChange={e => handleHistoryChange(index, 'nominal', e.target.value)} className="w-full p-1" />
                      </td>
                      <td className="border p-2 relative">
                         <div 
                           className="w-full p-1 border rounded bg-white flex justify-between items-center cursor-pointer min-w-[200px]"
                           onClick={(e) => {
                             if (activeSdDropdown === index) {
                               setActiveSdDropdown(null);
                             } else {
                               setActiveSdDropdown(index);
                               setSdSearch('');
                               setSdPage(1);
                             }
                           }}
                         >
                           <span className="truncate max-w-[200px] text-xs">
                             {row.no_sd ? (
                               (() => {
                                 const f = deliveries.find(d => d.delivery_no === row.no_sd);
                                 return f ? `${f.delivery_no} | ${formatRupiah(Number(f.total_amount) || 0)}` : row.no_sd;
                               })()
                             ) : 'Pilih No SD'}
                           </span>
                           <ChevronDown className="w-4 h-4 text-slate-500" />
                         </div>
                         
                         {activeSdDropdown === index && (
                           <>
                             <div className="fixed inset-0 z-40" onClick={() => setActiveSdDropdown(null)}></div>
                             <div className="absolute z-50 mt-1 w-[300px] bg-white border rounded-lg shadow-lg flex flex-col max-h-[300px] left-0">
                             <div className="p-2 border-b sticky top-0 bg-white rounded-t-lg">
                               <div className="relative">
                                 <Search className="w-4 h-4 absolute left-2 top-2 text-slate-400" />
                                 <input 
                                   type="text" 
                                   placeholder="Cari No SD..." 
                                   className="w-full pl-8 pr-2 py-1.5 border rounded text-xs"
                                   value={sdSearch}
                                   onChange={(e) => {
                                     setSdSearch(e.target.value);
                                     setSdPage(1);
                                   }}
                                   onClick={(e) => e.stopPropagation()}
                                 />
                               </div>
                               <div className="text-[10px] text-slate-500 mt-1 flex justify-between">
                                 <span>{dataLoading ? 'Loading...' : `Total: ${filteredSdList.length} No SD`}</span>
                                 <span 
                                   className="text-blue-600 cursor-pointer" 
                                   onClick={(e) => { 
                                     e.stopPropagation(); 
                                     handleDeliverySelect(index, ''); 
                                     setActiveSdDropdown(null); 
                                   }}
                                 >Clear</span>
                               </div>
                             </div>
                             
                             <div className="overflow-y-auto flex-1 p-1">
                               {currentSdSet.length === 0 ? (
                                 <div className="text-center p-3 text-xs text-slate-500">Tidak ada data</div>
                               ) : (
                                 currentSdSet.map(d => (
                                   <div 
                                     key={d.delivery_no} 
                                     className="p-2 text-xs hover:bg-slate-100 cursor-pointer rounded border-b"
                                     onClick={() => {
                                       handleDeliverySelect(index, d.delivery_no);
                                       setActiveSdDropdown(null);
                                     }}
                                   >
                                     <div className="font-semibold">{d.delivery_no}</div>
                                     <div className="text-slate-500">{formatRupiah(Number(d.total_amount) || 0)}</div>
                                   </div>
                                 ))
                               )}
                             </div>

                             {totalSdPages > 1 && (
                               <div className="p-2 border-t sticky bottom-0 bg-slate-50 rounded-b-lg flex justify-between items-center text-xs">
                                 <Button
                                   size="sm"
                                   variant="ghost"
                                   onClick={(e) => { e.stopPropagation(); setSdPage(Math.max(1, sdPage - 1)); }}
                                   disabled={sdPage === 1}
                                 >
                                   <ChevronLeft className="w-4 h-4" />
                                 </Button>
                                 <span className="text-slate-600">
                                   Hal {sdPage} / {totalSdPages}
                                 </span>
                                 <Button
                                   size="sm"
                                   variant="ghost" 
                                   onClick={(e) => { e.stopPropagation(); setSdPage(Math.min(totalSdPages, sdPage + 1)); }}
                                   disabled={sdPage === totalSdPages}
                                 >
                                   <ChevronRight className="w-4 h-4" />
                                 </Button>
                               </div>
                             )}
                           </div>
                           </>
                         )}
                      </td>
                      <td className="border p-2">
                         <select value={row.sistem_pembayaran} onChange={e => handleHistoryChange(index, 'sistem_pembayaran', e.target.value)} className="w-full p-1 border rounded">
                           <option value="">Pilih</option>
                           <option value="COD">COD</option>
                           <option value="CBD">CBD</option>
                         </select>
                      </td>
                      <td className="border p-2">
                         <input type="date" value={row.tgl_pengiriman} onChange={e => handleHistoryChange(index, 'tgl_pengiriman', e.target.value)} className="w-full p-1" />
                      </td>
                      <td className="border p-2">
                         <input type="date" value={row.tgl_pembayaran} onChange={e => handleHistoryChange(index, 'tgl_pembayaran', e.target.value)} className="w-full p-1" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 className="font-bold border-b pb-2 pt-4">Alasan Pengajuan (BM wajib isi)</h3>
            <textarea 
              name="alasan_pengajuan" 
              value={formData.alasan_pengajuan} 
              onChange={handleChange} 
              className="w-full p-3 border rounded-lg" 
              rows={4}
            />

          </CardContent>
        </Card>
      </div>
      <PrintLayout formData={formData} history={history} />
    </>
  );
}
