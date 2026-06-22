import React, { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabase';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Save, Copy, Check, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useAlert } from '../../ui/AlertModal';

export function ReportLCD() {
  const { showAlert } = useAlert();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lastEntry, setLastEntry] = useState<any>(null);

  const [formData, setFormData] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    cabang: 'Bandung',
    visit_new_customer: '',
    visit_total_new_customer: '',
    order_total_new_customer: '',
    visit_customer_lama: '',
    visit_total_customer_lama: '',
    order_total_customer_lama: '',
    omset_new_customer: '',
    omset_customer_lama: '',
    omset_total: '',
    keterangan_hasil: ''
  });

  useEffect(() => {
    fetchLastEntry();
  }, []);

  const fetchLastEntry = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('report_lcd')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setLastEntry(data);
      }
    } catch (err) {
      console.error('Error fetching last entry', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from('report_lcd').insert([{
        tanggal: formData.tanggal,
        cabang: formData.cabang,
        visit_new_customer: formData.visit_new_customer,
        visit_total_new_customer: formData.visit_total_new_customer,
        order_total_new_customer: formData.order_total_new_customer,
        visit_customer_lama: formData.visit_customer_lama,
        visit_total_customer_lama: formData.visit_total_customer_lama,
        order_total_customer_lama: formData.order_total_customer_lama,
        omset_new_customer: formData.omset_new_customer,
        omset_customer_lama: formData.omset_customer_lama,
        omset_total: formData.omset_total,
        keterangan_hasil: formData.keterangan_hasil
      }]);

      if (error) throw error;
      showAlert('Data berhasil disimpan ke database!', 'success');
      fetchLastEntry();
    } catch (err: any) {
      showAlert(`Gagal menyimpan: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const generateCopyText = () => {
    const dateFormatted = format(new Date(formData.tanggal), 'd MMMM').toLowerCase();
    
    return `tgl: ${dateFormatted}
cabang:${formData.cabang}
data visit customer
new customer: ${formData.visit_new_customer}/${formData.visit_total_new_customer}/${formData.order_total_new_customer} 
customer lama: ${formData.visit_customer_lama}/${formData.visit_total_customer_lama} /${formData.order_total_customer_lama}

OMZET BULAN INI BY SD: ${formData.omset_new_customer}/${formData.omset_customer_lama}/${formData.omset_total}
HASIL: ${formData.keterangan_hasil}`;
  };

  const handleCopy = async () => {
    const text = generateCopyText();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Report LCD</h2>
          <p className="text-slate-500">Buat laporan harian visit customer dan copy ke format WhatsApp.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleCopy} className="bg-emerald-600 hover:bg-emerald-700" variant="default">
            {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
            {copied ? 'Tercopy!' : 'Copy Format Laporan'}
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Simpan ke DB
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="bg-slate-50 border-b border-slate-100 py-4">
             <CardTitle className="text-sm">Form Pengisian Laporan</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-6">
            
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal</label>
                  <input
                    type="date"
                    name="tanggal"
                    value={formData.tanggal}
                    onChange={handleChange}
                    className="w-full text-sm rounded-md border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
                  />
               </div>
               <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cabang</label>
                  <input
                    type="text"
                    name="cabang"
                    value={formData.cabang}
                    onChange={handleChange}
                    className="w-full text-sm rounded-md border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
                  />
               </div>
            </div>

            <div className="border border-slate-200 p-4 rounded-lg bg-slate-50 space-y-4">
               <h3 className="font-bold text-sm text-slate-800 border-b border-slate-200 pb-2">DATA VISIT CUSTOMER</h3>
               
               <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-slate-600 bg-slate-200 px-2 py-1 rounded inline-block">NEW CUSTOMER</h4>
                  <div className="space-y-4 pt-1">
                    <div>
                        <label className="block text-xs text-slate-700 mb-1">Jumlah visit new customer <span className="font-bold">hari ini</span></label>
                        <input
                            type="text"
                            name="visit_new_customer"
                            value={formData.visit_new_customer}
                            onChange={handleChange}
                            placeholder={lastEntry?.visit_new_customer || 'Contoh: 0'}
                            className="w-full text-sm rounded-md border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">*{lastEntry ? `Pengisian terakhir: ${lastEntry.visit_new_customer}` : ''}</p>
                    </div>
                    <div>
                        <label className="block text-xs text-slate-700 mb-1">Total new customer yang <span className="font-bold">sudah dikunjungi bulan ini</span></label>
                        <input
                            type="text"
                            name="visit_total_new_customer"
                            value={formData.visit_total_new_customer}
                            onChange={handleChange}
                            placeholder={lastEntry?.visit_total_new_customer || 'Contoh: 8'}
                            className="w-full text-sm rounded-md border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">*{lastEntry ? `Pengisian terakhir: ${lastEntry.visit_total_new_customer}` : ''}</p>
                    </div>
                    <div>
                        <label className="block text-xs text-slate-700 mb-1">Total new customer yang <span className="font-bold">sudah order bulan ini</span></label>
                        <input
                            type="text"
                            name="order_total_new_customer"
                            value={formData.order_total_new_customer}
                            onChange={handleChange}
                            placeholder={lastEntry?.order_total_new_customer || 'Contoh: -'}
                            className="w-full text-sm rounded-md border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">*{lastEntry ? `Pengisian terakhir: ${lastEntry.order_total_new_customer}` : ''}</p>
                    </div>
                  </div>
               </div>

               <div className="space-y-3 pt-4 border-t border-slate-200">
                  <h4 className="text-xs font-semibold text-slate-600 bg-slate-200 px-2 py-1 rounded inline-block">CUSTOMER LAMA</h4>
                  <div className="space-y-4 pt-1">
                    <div>
                        <label className="block text-xs text-slate-700 mb-1">Jumlah visit customer lama <span className="font-bold">hari ini</span></label>
                        <input
                            type="text"
                            name="visit_customer_lama"
                            value={formData.visit_customer_lama}
                            onChange={handleChange}
                            placeholder={lastEntry?.visit_customer_lama || 'Contoh: 2'}
                            className="w-full text-sm rounded-md border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">*{lastEntry ? `Pengisian terakhir: ${lastEntry.visit_customer_lama}` : ''}</p>
                    </div>
                    <div>
                        <label className="block text-xs text-slate-700 mb-1">Jumlah visit customer lama <span className="font-bold">bulan ini</span></label>
                        <input
                            type="text"
                            name="visit_total_customer_lama"
                            value={formData.visit_total_customer_lama}
                            onChange={handleChange}
                            placeholder={lastEntry?.visit_total_customer_lama || 'Contoh: 11'}
                            className="w-full text-sm rounded-md border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">*{lastEntry ? `Pengisian terakhir: ${lastEntry.visit_total_customer_lama}` : ''}</p>
                    </div>
                    <div>
                        <label className="block text-xs text-slate-700 mb-1">Total customer lama yang <span className="font-bold">sudah order bulan ini</span></label>
                        <input
                            type="text"
                            name="order_total_customer_lama"
                            value={formData.order_total_customer_lama}
                            onChange={handleChange}
                            placeholder={lastEntry?.order_total_customer_lama || 'Contoh: 10'}
                            className="w-full text-sm rounded-md border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">*{lastEntry ? `Pengisian terakhir: ${lastEntry.order_total_customer_lama}` : ''}</p>
                    </div>
                  </div>
               </div>
            </div>

            <div className="border border-slate-200 p-4 rounded-lg bg-emerald-50 space-y-4">
               <h3 className="font-bold text-sm text-slate-800 border-b border-emerald-200 pb-2 text-emerald-800">OMSET BULAN INI BY SD</h3>
               
               <div className="space-y-4">
                  <div>
                      <label className="block text-xs text-slate-700 mb-1">Dari New Customer</label>
                      <input
                          type="text"
                          name="omset_new_customer"
                          value={formData.omset_new_customer}
                          onChange={handleChange}
                          placeholder={lastEntry?.omset_new_customer || 'Contoh: 0'}
                          className="w-full text-sm rounded-md border-emerald-300 focus:border-emerald-500 focus:ring-emerald-500"
                      />
                      <p className="text-[10px] text-emerald-600 mt-1">*{lastEntry ? `Pengisian terakhir: ${lastEntry.omset_new_customer}` : ''}</p>
                  </div>
                  <div>
                      <label className="block text-xs text-slate-700 mb-1">Dari Customer Lama</label>
                      <input
                          type="text"
                          name="omset_customer_lama"
                          value={formData.omset_customer_lama}
                          onChange={handleChange}
                          placeholder={lastEntry?.omset_customer_lama || 'Contoh: 172jt'}
                          className="w-full text-sm rounded-md border-emerald-300 focus:border-emerald-500 focus:ring-emerald-500"
                      />
                      <p className="text-[10px] text-emerald-600 mt-1">*{lastEntry ? `Pengisian terakhir: ${lastEntry.omset_customer_lama}` : ''}</p>
                  </div>
                  <div>
                      <label className="block text-xs text-slate-700 mb-1">Total SD (New + Lama)</label>
                      <input
                          type="text"
                          name="omset_total"
                          value={formData.omset_total}
                          onChange={handleChange}
                          placeholder={lastEntry?.omset_total || 'Contoh: 172jt'}
                          className="w-full text-sm rounded-md border-emerald-300 focus:border-emerald-500 focus:ring-emerald-500"
                      />
                      <p className="text-[10px] text-emerald-600 mt-1">*{lastEntry ? `Pengisian terakhir: ${lastEntry.omset_total}` : ''}</p>
                  </div>
               </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Keterangan Hasil Kunjungan</label>
              <textarea
                name="keterangan_hasil"
                value={formData.keterangan_hasil}
                onChange={handleChange}
                rows={3}
                placeholder={lastEntry?.keterangan_hasil || "Contoh: masih belum bisa ketemu owner grosir customer baru..."}
                className="w-full text-sm rounded-md border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

          </CardContent>
        </Card>

        <div>
          <div className="sticky top-6">
            <Card>
              <CardHeader className="bg-slate-50 border-b border-slate-100 py-4">
                 <CardTitle className="text-sm flex items-center justify-between">
                    <span>Preview Format Copy</span>
                    <Button onClick={handleCopy} size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 border-0 outline-none">
                      {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                      Copy Text
                    </Button>
                 </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                 <pre className="text-[11px] sm:text-xs font-mono text-slate-700 bg-slate-900 text-slate-300 p-4 whitespace-pre-wrap rounded-b-lg border-x border-b max-h-[70vh] overflow-y-auto">
                    {generateCopyText()}
                 </pre>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
