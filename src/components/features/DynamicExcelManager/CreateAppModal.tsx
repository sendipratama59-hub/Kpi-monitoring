import React, { useState, useRef } from 'react';
import { Button } from '../../ui/Button';
import { UploadCloud, CheckCircle2, Loader2, FileSpreadsheet, XCircle, Calendar } from 'lucide-react';
import { supabase } from '../../../services/supabase';
import { useAlert } from '../../ui/AlertModal';
import * as XLSX from 'xlsx';
import { GenieModal } from '../../ui/GenieModal';

interface CreateAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const MONTHS = [
  { value: 1, label: 'Januari' }, { value: 2, label: 'Februari' },
  { value: 3, label: 'Maret' }, { value: 4, label: 'April' },
  { value: 5, label: 'Mei' }, { value: 6, label: 'Juni' },
  { value: 7, label: 'Juli' }, { value: 8, label: 'Agustus' },
  { value: 9, label: 'September' }, { value: 10, label: 'Oktober' },
  { value: 11, label: 'November' }, { value: 12, label: 'Desember' }
];

export function CreateAppModal({ isOpen, onClose, onSuccess }: CreateAppModalProps) {
  const { showAlert } = useAlert();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });
  
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const [periodMonth, setPeriodMonth] = useState(currentMonth);
  const [periodYear, setPeriodYear] = useState(currentYear);
  
  const [excelData, setExcelData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');

  const resetForm = () => {
    setFormData({ name: '', description: '' });
    setPeriodMonth(new Date().getMonth() + 1);
    setPeriodYear(new Date().getFullYear());
    setExcelData([]);
    setColumns([]);
    setFileName('');
  };

  const handleClose = () => {
    if (!loading) {
      resetForm();
      onClose();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    
    // Default app name from file name if empty
    if (!formData.name) {
      const suggestedName = file.name.split('.')[0].replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      setFormData(prev => ({ ...prev, name: suggestedName }));
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { defval: '' });
        
        if (data.length > 0) {
          const cols = Object.keys(data[0]);
          setColumns(cols);
          setExcelData(data);
        } else {
          showAlert('File Excel kosong atau format tidak sesuai.', 'error');
          setExcelData([]);
          setColumns([]);
        }
      } catch (err) {
        console.error("Error parsing excel:", err);
        showAlert('Gagal membaca file Excel. Pastikan format file benar (.xlsx atau .xls).', 'error');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return showAlert('Nama tabel wajib diisi', 'error');
    if (excelData.length === 0 || columns.length === 0) return showAlert('Harap upload file excel yang valid', 'error');

    setLoading(true);
    try {
      // 1. Create the Dynamic App
      const { data: newApp, error: appError } = await supabase
        .from('dynamic_apps')
        .insert([{
          name: formData.name.trim(),
          description: formData.description.trim(),
          config: { columns, periodMonth, periodYear }
        }])
        .select()
        .single();

      if (appError) {
        // If table doesn't exist, they need to run DB Setup
        if (appError.code === '42P01') {
          throw new Error('Tabel sistem belum dibuat. Silahkan pergi ke menu "DB Setup" dan klik "Execute Query Now" terlebih dahulu.');
        }
        throw appError;
      }

      // 2. Insert data in chunks to handle larger files
      const chunkSize = 500;
      for (let i = 0; i < excelData.length; i += chunkSize) {
        const chunk = excelData.slice(i, i + chunkSize);
        const insertData = chunk.map(row => ({
          app_id: newApp.id,
          data: row
        }));
        
        const { error: dataError } = await supabase
          .from('dynamic_data')
          .insert(insertData);
          
        if (dataError) throw dataError;
      }

      showAlert('Tabel berhasil dibuat dan data berhasil di-import!', 'success');
      onSuccess();
      resetForm();
    } catch (err: any) {
      console.error('Error saving dynamic app:', err);
      showAlert(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GenieModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Buat Tabel Excel Custom"
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">
                Nama Tabel <span className="text-rose-500">*</span>
              </label>
              <input
                required
                type="text"
                placeholder="Misal: Data Penjualan Q1"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
                disabled={loading}
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">
                Deskripsi (Opsional)
              </label>
              <textarea
                rows={2}
                placeholder="Keterangan singkat tentang data ini..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                disabled={loading}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1 mb-1.5">
                  <Calendar className="w-3 h-3" /> Bulan Periode
                </label>
                <select
                  value={periodMonth}
                  onChange={(e) => setPeriodMonth(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none"
                  disabled={loading}
                >
                  {MONTHS.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1 mb-1.5">
                  <Calendar className="w-3 h-3" /> Tahun Periode
                </label>
                <select
                  value={periodYear}
                  onChange={(e) => setPeriodYear(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none"
                  disabled={loading}
                >
                  {Array.from({ length: 5 }, (_, i) => currentYear - 2 + i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">
              Source File Excel <span className="text-rose-500">*</span>
            </label>
            <div 
              onClick={() => !loading && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center h-[164px] transition-colors ${
                excelData.length > 0 
                  ? 'border-emerald-300 bg-emerald-50 cursor-pointer' 
                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer'
              } ${loading ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept=".xlsx, .xls" 
                className="hidden" 
              />
              
              {excelData.length > 0 ? (
                <>
                  <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-2">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-emerald-700 mb-1">{fileName}</p>
                  <p className="text-[10px] text-emerald-600 font-medium">
                    {columns.length} Kolom | {excelData.length} Baris
                  </p>
                  <p className="text-[9px] text-emerald-500 mt-2 underline">Klik ganti file</p>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 bg-indigo-100 text-indigo-500 rounded-full flex items-center justify-center mb-2">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-700 mb-1">Upload File Excel</p>
                  <p className="text-[10px] text-slate-500 font-medium">Format .xls / .xlsx didukung</p>
                </>
              )}
            </div>
          </div>
        </div>

        {excelData.length > 0 && (
          <div className="bg-white border rounded-xl overflow-hidden p-3 shadow-sm">
            <h4 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1">
              <FileSpreadsheet className="w-4 h-4 text-indigo-500" /> Preview Struktur Kolom
            </h4>
            <div className="flex flex-wrap gap-2">
              {columns.map((col, idx) => (
                <span key={idx} className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-[10px] font-bold">
                  {col}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t mt-6">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={loading} className="text-slate-500">
            Batal
          </Button>
          <Button 
            type="submit" 
            disabled={loading || excelData.length === 0} 
            className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[120px]"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan & Buat Tabel'}
          </Button>
        </div>
      </form>
    </GenieModal>
  );
}
