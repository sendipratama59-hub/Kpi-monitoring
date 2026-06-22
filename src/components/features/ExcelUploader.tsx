import React, { useState, useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Database, 
  Calendar, 
  Layers, 
  Check, 
  ChevronRight, 
  X,
  ArrowRight,
  Info,
  Table as TableIcon,
  Trash2
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import * as XLSX from 'xlsx';
import { useAlert } from '../ui/AlertModal';
import { motion, AnimatePresence } from 'motion/react';

export function ExcelUploader() {
  const { showAlert } = useAlert();
  const [activeTab, setActiveTab] = useState<'upload' | 'delete'>('upload');
  const [uploadType, setUploadType] = useState<'kpi' | 'payment' | 'program_bulanan' | 'program_spu' | 'piutang_customer' | 'visit_customer'>('kpi');
  const [dataPreview, setDataPreview] = useState<any[]>([]);
  const [allMappedData, setAllMappedData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [isFileParsed, setIsFileParsed] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replaceExisting, setReplaceExisting] = useState(true);
  
  // Steps: 1: Configure, 2: Upload, 3: Review
  const [currentStep, setCurrentStep] = useState(1);
  
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const [periodMonth, setPeriodMonth] = useState<number>(currentMonth);
  const [periodYear, setPeriodYear] = useState<number>(currentYear);

  // States for Deletion Tab
  const [deleteType, setDeleteType] = useState<'kpi' | 'payment' | 'program_bulanan' | 'program_spu' | 'piutang_customer' | 'visit_customer'>('kpi');
  const [deleteMonths, setDeleteMonths] = useState<number[]>([currentMonth]);
  const [deleteYear, setDeleteYear] = useState<number>(currentYear);
  const [isDeleting, setIsDeleting] = useState(false);

  const uploadTypeLabels = {
    kpi: 'Data Penjualan (Salesman KPI)',
    payment: 'Data Pembayaran (Payment)',
    program_bulanan: 'Data Program Bulanan',
    program_spu: 'Data Program SPU',
    piutang_customer: 'Data Piutang Customer',
    visit_customer: 'Data Visit Customer'
  };

  const parseFileDynamically = async (file: File): Promise<{headers: string[], data: any[]}> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
          
          let firstSheetName = workbook.SheetNames[0];
          let worksheet = workbook.Sheets[firstSheetName];
          
          // Using sheet_to_json to get raw header to value mapping
          // Using raw to avoid some conversion issues? Excel uses commas/semicolons depending on local.
          const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: null });
          
          if (rawJson.length === 0) {
            
            // If the CSV was parsed as a single column because of semicolon delimited:
            // we could attempt to parse the string manually using PapaParse, but let's try standard XLSX first.
            throw new Error('File kosong atau format tidak sesuai.');
          }

          const rawHeaders = Object.keys(rawJson[0] as object);

          // Handle semicolon delimiter if XLSX didn't split it (e.g. single column header with semicolons)
          if (rawHeaders.length === 1 && rawHeaders[0].includes(';')) {
            // It's a semicolon separated CSV parsed poorly by XLSX
            const papaParsedData = [];
            const rows = XLSX.utils.sheet_to_csv(worksheet).split('\n');
            if (rows.length > 0) {
              const actualHeaders = rows[0].split(';');
              for (let i = 1; i < rows.length; i++) {
                if (!rows[i].trim()) continue;
                const values = rows[i].split(';');
                let rowObj: any = {};
                actualHeaders.forEach((h, index) => {
                  rowObj[h.trim()] = values[index] !== undefined ? values[index].trim() : null;
                });
                papaParsedData.push(rowObj);
              }
              resolve({ headers: actualHeaders.map(h => h.trim()), data: papaParsedData });
              return;
            }
          }

          resolve({ headers: rawHeaders, data: rawJson });
        } catch (err) {
          reject(err);
        }
      };

      reader.onerror = (error) => reject(error);
      reader.readAsBinaryString(file);
    });
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    setError(null);
    setIsFileParsed(false);
    setDataPreview([]);

    const file = acceptedFiles[0];
    try {
      const { headers, data } = await parseFileDynamically(file);
      setCurrentFile(file);
      setHeaders(headers);
      setAllMappedData(data);
      setDataPreview(data.slice(0, 10)); // show top 10 for preview
      setIsFileParsed(true);
      setCurrentStep(3); // Move to review step
    } catch (err: any) {
      setError(err.message || 'Gagal memproses file Excel.');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv']
    },
    maxFiles: 1
  });

  const handleUploadToDatabase = async () => {
    if (allMappedData.length === 0) return;
    setIsUploading(true);
    setError(null);
    
    try {
      const batchId = `BATCH-${new Date().getTime()}`;
      
      if (uploadType === 'kpi') {
        if (replaceExisting) {
          const { error: deleteError } = await supabase.from('salesman_kpi')
            .delete()
            .eq('period_month', periodMonth)
            .eq('period_year', periodYear);
          if (deleteError) throw new Error(`Gagal menghapus data lama: ${deleteError.message}`);
        }

        const kpiDataToInsert = allMappedData.map(row => {
          return {
            upload_batch: batchId,
            period_month: periodMonth,
            period_year: periodYear,
            order_no: row.order_no || row['order_no;order_date'] || null, // handle messy keys
            order_date: row.order_date ? new Date(row.order_date) : null,
            order_status: row.order_status,
            customer_code: row.customer_code,
            city: row.city,
            customer_name: row.customer_name,
            salesman_code: row.salesman_code,
            salesman_name: row.salesman_name,
            goods_code: row.goods_code,
            goods_name: row.goods_name,
            qty_order: parseInt(row.qty_order) || 0,
            qty: parseInt(row.qty) || 0,
            harga_modal: typeof row.harga_modal === 'number' ? row.harga_modal : parseFloat((row.harga_modal || '').toString().replace(/,/g, '')) || 0,
            total_amount: typeof row.total_amount === 'number' ? row.total_amount : parseFloat((row.total_amount || '').toString().replace(/,/g, '')) || 0,
            brand_name: row.brand_name,
            category: row.category,
            team: row.team,
            delivery_no: row.delivery_no,
            hydrogel_pcs: parseFloat(row.hydrogel_pcs) || 0,
            tg_pcs: parseFloat(row.tg_pcs) || 0,
            omset_lcd: parseFloat(row.omset_lcd) || 0,
            omset_redskull: parseFloat(row.omset_redskull) || 0,
            omset_pb: parseFloat(row.omset_pb) || 0,
            omset_co: parseFloat(row.omset_co) || 0,
            omset_home_appliances: parseFloat(row.omset_HomeAppliances) || 0,
            omset_homeliving: parseFloat(row.omset_Homeliving) || 0,
            omset_dll: parseFloat(row.omset_dll) || 0,
            new_customer: parseFloat(row.new_customer) || 0,
            idle_customer: parseFloat(row.idle_customer) || 0,
            co_mesin_vqm: parseFloat(row.co_mesin_vqm) || parseFloat(row.co_mesin) || 0,
            co_tg: parseFloat(row.co_tg) || 0,
            omset_5jt: parseFloat(row.omset_5jt) || 0,
            discount: parseFloat(row.discount) || 0,
            lcd_pcs: parseFloat(row.lcd_pcs) || 0,
          }
        });
        
        // Send to supabase in chunks of 500
        const chunkSize = 500;
        for (let i = 0; i < kpiDataToInsert.length; i += chunkSize) {
          const chunk = kpiDataToInsert.slice(i, i + chunkSize);
          const { error: kpiError } = await supabase.from('salesman_kpi').insert(chunk);
          if (kpiError) throw new Error(`Chunk Error: ${kpiError.message}`);
        }
        
        showAlert(`✅ ${kpiDataToInsert.length} baris data berhasil disimpan ke database (salesman_kpi)!`, 'success');
      } else if (uploadType === 'payment') {
        // Upload Payment Data
        if (replaceExisting) {
          const { error: deleteError } = await supabase.from('salesman_payments')
            .delete()
            .eq('period_month', periodMonth)
            .eq('period_year', periodYear);
          if (deleteError) throw new Error(`Gagal menghapus data lama: ${deleteError.message}`);
          
          // Reset payment status on KPI before doing the updates
          await supabase.from('salesman_kpi')
            .update({ is_paid: false, payment_amount: 0 })
            .eq('period_month', periodMonth)
            .eq('period_year', periodYear);
        }

        const paymentDataToInsert = allMappedData.map(row => {
          return {
            upload_batch: batchId,
            period_month: periodMonth,
            period_year: periodYear,
            delivery_no: row.delivery_no,
            salesman_code: row.salesman_code,
            salesman_name: row.salesman_name,
            customer_code: row.customer_code,
            customer_name: row.customer_name,
            brand_name: row.brand_name,
            category: row.category,
            total_amount: typeof row.total_amount === 'number' ? row.total_amount : parseFloat((row.total_amount || '').toString().replace(/,/g, '')) || 0,
            due_date: row.due_date ? parseInt(row.due_date) || 0 : 0,
            payment_date: row.payment_date ? new Date(row.payment_date) : null,
          };
        });

        const chunkSize = 500;
        for (let i = 0; i < paymentDataToInsert.length; i += chunkSize) {
          const chunk = paymentDataToInsert.slice(i, i + chunkSize);
          const { error: paymentError } = await supabase.from('salesman_payments').insert(chunk);
          if (paymentError) throw new Error(`Chunk Error: ${paymentError.message}`);
        }

        // Call RPC to sync payment data accurately and quickly
        const { error: syncError } = await supabase.rpc('sync_payment_data', {
          p_month: periodMonth,
          p_year: periodYear
        });
        
        if (syncError) throw new Error(`Sync Error: ${syncError.message}`);

        showAlert(`✅ ${paymentDataToInsert.length} baris data payment berhasil disimpan! Status payment pada data KPI telah diupdate.`, 'success');
      } else if (uploadType === 'program_bulanan') {
        if (replaceExisting) {
          const { error: deleteError } = await supabase.from('program_bulanan')
            .delete()
            .eq('period_month', periodMonth)
            .eq('period_year', periodYear);
          if (deleteError) throw new Error(`Gagal menghapus data lama: ${deleteError.message}`);
        }

        const programDataToInsert = allMappedData.map(row => {
          return {
            upload_batch: batchId,
            period_month: periodMonth,
            period_year: periodYear,
            salesman_code: row.salesman_code,
            salesman_name: row.salesman_name,
            customer_code: row.customer_code,
            customer_name: row.customer_name,
            customer_targets: parseFloat(row.customer_targets) || 0,
            customer_achieve: parseFloat(row.customer_achieve) || 0,
            customer_join: row.customer_join,
          };
        });

        const chunkSize = 500;
        for (let i = 0; i < programDataToInsert.length; i += chunkSize) {
          const chunk = programDataToInsert.slice(i, i + chunkSize);
          const { error: programError } = await supabase.from('program_bulanan').insert(chunk);
          if (programError) throw new Error(`Chunk Error: ${programError.message}`);
        }

        showAlert(`✅ ${programDataToInsert.length} baris data program bulanan berhasil disimpan!`, 'success');
      } else if (uploadType === 'program_spu') {
        if (replaceExisting) {
          const { error: deleteError } = await supabase.from('program_spu')
            .delete()
            .eq('period_month', periodMonth)
            .eq('period_year', periodYear);
          if (deleteError) throw new Error(`Gagal menghapus data lama: ${deleteError.message}`);
        }

        const spuDataToInsert = allMappedData.map(row => {
          return {
            upload_batch: batchId,
            period_month: periodMonth,
            period_year: periodYear,
            salesman_code: row.salesman_code,
            salesman_name: row.salesman_name,
            customer_code: row.customer_code,
            customer_name: row.customer_name,
            customer_targets: parseFloat(row.customer_targets) || 0,
            customer_achieve: parseFloat(row.customer_achieve) || 0,
            customer_join: row.customer_join,
            customer_reward: row.customer_reward,
          };
        });

        const chunkSize = 500;
        for (let i = 0; i < spuDataToInsert.length; i += chunkSize) {
          const chunk = spuDataToInsert.slice(i, i + chunkSize);
          const { error: spuError } = await supabase.from('program_spu').insert(chunk);
          if (spuError) throw new Error(`Chunk Error: ${spuError.message}`);
        }

        showAlert(`✅ ${spuDataToInsert.length} baris data program SPU berhasil disimpan!`, 'success');
      } else if (uploadType === 'piutang_customer') {
        if (replaceExisting) {
          const { error: deleteError } = await supabase.from('piutang_customer')
            .delete()
            .eq('period_month', periodMonth)
            .eq('period_year', periodYear);
          if (deleteError) throw new Error(`Gagal menghapus data lama: ${deleteError.message}`);
        }

        const piutangDataToInsert = allMappedData.map(row => {
          return {
            upload_batch: batchId,
            period_month: periodMonth,
            period_year: periodYear,
            delivery_no: row.delivery_no,
            customer_code: row.customer_code,
            customer_name: row.customer_name,
            salesman_code: row.salesman_code,
            salesman_name: row.salesman_name,
            brand_name: row.brand_name,
            category: row.category,
            total_amount: typeof row.total_amount === 'number' ? row.total_amount : parseFloat((row.total_amount || '').toString().replace(/,/g, '')) || 0,
            due_date: row.due_date ? parseInt(row.due_date) || 0 : 0,
          };
        });

        const chunkSize = 500;
        for (let i = 0; i < piutangDataToInsert.length; i += chunkSize) {
          const chunk = piutangDataToInsert.slice(i, i + chunkSize);
          const { error: piutangError } = await supabase.from('piutang_customer').insert(chunk);
          if (piutangError) throw new Error(`Chunk Error: ${piutangError.message}`);
        }

        showAlert(`✅ ${piutangDataToInsert.length} baris data piutang customer berhasil disimpan!`, 'success');
      } else if (uploadType === 'visit_customer') {
        if (replaceExisting) {
          const { error: deleteError } = await supabase.from('visit_customer')
            .delete()
            .eq('period_month', periodMonth)
            .eq('period_year', periodYear);
          if (deleteError) throw new Error(`Gagal menghapus data lama: ${deleteError.message}`);
        }

        const visitDataToInsert = allMappedData.map(row => {
          return {
            upload_batch: batchId,
            period_month: periodMonth,
            period_year: periodYear,
            salesman_code: row.salesman_code,
            salesman_name: row.salesman_name,
            total_customer: typeof row.total_customer === 'number' ? row.total_customer : parseFloat((row.total_customer || '').toString().replace(/,/g, '')) || 0,
            total_visit: typeof row.total_visit === 'number' ? row.total_visit : parseFloat((row.total_visit || '').toString().replace(/,/g, '')) || 0,
            percentage: typeof row.percentage === 'number' ? row.percentage : parseFloat((row.percentage || '').toString().replace(/,/g, '')) || 0,
            reward_punishment: typeof row.reward_punishment === 'number' ? row.reward_punishment : parseFloat((row.reward_punishment || '').toString().replace(/,/g, '')) || 0,
          };
        });

        const chunkSize = 500;
        for (let i = 0; i < visitDataToInsert.length; i += chunkSize) {
          const chunk = visitDataToInsert.slice(i, i + chunkSize);
          const { error: visitError } = await supabase.from('visit_customer').insert(chunk);
          if (visitError) throw new Error(`Chunk Error: ${visitError.message}`);
        }

        showAlert(`✅ ${visitDataToInsert.length} baris data visit customer berhasil disimpan!`, 'success');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Terjadi kesalahan saat upload ke DB.');
    } finally {
      setIsUploading(false);
    }
  };

  const resetUpload = () => {
    setDataPreview([]);
    setAllMappedData([]);
    setHeaders([]);
    setCurrentFile(null);
    setIsFileParsed(false);
    setError(null);
    setCurrentStep(1);
  };

  const handleDeleteData = async () => {
    if (deleteMonths.length === 0) {
      showAlert('Pilih minimal satu bulan untuk dihapus!', 'warning');
      return;
    }
    
    setIsDeleting(true);
    setError(null);
    
    try {
      let tableName = '';
      if (deleteType === 'kpi') tableName = 'salesman_kpi';
      if (deleteType === 'payment') tableName = 'salesman_payments';
      if (deleteType === 'program_bulanan') tableName = 'program_bulanan';
      if (deleteType === 'program_spu') tableName = 'program_spu';
      if (deleteType === 'piutang_customer') tableName = 'piutang_customer';
      if (deleteType === 'visit_customer') tableName = 'visit_customer';

      const { error } = await supabase.from(tableName)
        .delete()
        .in('period_month', deleteMonths)
        .eq('period_year', deleteYear);
      
      if (error) throw error;
      
      if (deleteType === 'payment') {
          // Reset payment status on KPI
          await supabase.from('salesman_kpi')
            .update({ is_paid: false, payment_amount: 0 })
            .in('period_month', deleteMonths)
            .eq('period_year', deleteYear);
      }
      
      showAlert(`✅ Data ${uploadTypeLabels[deleteType]} untuk ${deleteMonths.length} bulan di tahun ${deleteYear} berhasil dihapus.`, 'success');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Terjadi kesalahan saat menghapus data.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-black tracking-tighter text-slate-900 flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl shadow-xl shadow-indigo-200">
            <UploadCloud className="w-8 h-8 text-white" />
          </div>
          Import Data Center
        </h1>
        <p className="text-slate-500 font-medium max-w-2xl text-lg">
          Upload and synchronize your business intelligence data with precision.
        </p>
      </div>

      <div className="flex gap-4 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('upload')}
          className={`pb-4 px-2 text-sm font-bold tracking-wide transition-colors border-b-2 ${
            activeTab === 'upload' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <UploadCloud className="w-4 h-4 inline-block mr-2 -mt-0.5" />
          Upload Data
        </button>
        <button
          onClick={() => setActiveTab('delete')}
          className={`pb-4 px-2 text-sm font-bold tracking-wide transition-colors border-b-2 ${
            activeTab === 'delete' 
              ? 'border-rose-600 text-rose-600' 
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Trash2 className="w-4 h-4 inline-block mr-2 -mt-0.5" />
          Hapus Data
        </button>
      </div>

      {activeTab === 'delete' && (
        <motion.div
           key="delete-tab"
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           className="space-y-8"
        >
          <Card className="border-none shadow-[0_20px_50px_rgba(0,0,0,0.05)] overflow-hidden rounded-[32px] bg-white border border-white">
            <div className="h-1.5 bg-gradient-to-r from-rose-500 to-red-500 w-full" />
            <CardHeader className="pt-10 px-10">
              <CardTitle className="text-2xl font-black text-slate-800 tracking-tight">Hapus Data Berdasarkan Periode</CardTitle>
              <CardDescription className="text-base">Pilih database dan periode bulan/tahun yang ingin dihapus dari sistem.</CardDescription>
            </CardHeader>
            <CardContent className="px-10 pb-10 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Database className="w-3.5 h-3.5" /> Database Target
                    </label>
                    <div className="relative group">
                      <select 
                        value={deleteType}
                        onChange={(e) => setDeleteType(e.target.value as any)}
                        className="w-full h-14 bg-slate-50 border-2 border-transparent rounded-2xl px-5 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-rose-500/10 focus:bg-white focus:border-rose-500/20 transition-all cursor-pointer appearance-none shadow-sm"
                      >
                        {Object.entries(uploadTypeLabels).map(([val, label]) => (
                          <option key={val} value={val}>{label}</option>
                        ))}
                      </select>
                      <ChevronRight className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-hover:text-rose-500 transition-colors pointer-events-none rotate-90" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5" /> Pilih Tahun
                      </label>
                      <div className="relative group">
                        <select 
                          value={deleteYear}
                          onChange={(e) => setDeleteYear(Number(e.target.value))}
                          className="w-full h-14 bg-slate-50 border-2 border-transparent rounded-2xl px-5 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-rose-500/10 focus:bg-white focus:border-rose-500/20 transition-all cursor-pointer appearance-none shadow-sm"
                        >
                          {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map(y => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                        <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none rotate-90" />
                      </div>
                    </div>
                  </div>

                  <div className="col-span-1 md:col-span-2 space-y-3">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5" /> Pilih Bulan (Pilih lebih dari satu)
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
                          const isSelected = deleteMonths.includes(m);
                          return (
                            <button
                              key={m}
                              onClick={() => {
                                if (isSelected) {
                                  setDeleteMonths(deleteMonths.filter(x => x !== m));
                                } else {
                                  setDeleteMonths([...deleteMonths, m]);
                                }
                              }}
                              className={`h-10 text-xs font-bold rounded-xl border-2 transition-all ${
                                isSelected 
                                  ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-sm' 
                                  : 'bg-white border-slate-100 text-slate-500 hover:border-rose-200'
                              }`}
                            >
                              {new Date(0, m - 1).toLocaleString('id-ID', { month: 'short' })}
                            </button>
                          );
                        })}
                      </div>
                    </div>
              </div>

              <div className="pt-6 border-t border-slate-100 flex justify-end">
                <Button 
                  onClick={handleDeleteData}
                  disabled={isDeleting || (deleteMonths.length === 0)}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold h-12 px-8 rounded-xl shadow-lg shadow-rose-200"
                >
                  {isDeleting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Trash2 className="w-5 h-5 mr-2" />}
                  Hapus Data Sekarang
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {activeTab === 'upload' && currentStep === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <div className="relative py-4">
              <div className="absolute top-1/2 left-0 w-full h-[1px] bg-slate-100 -translate-y-1/2 -z-10" />
              <div className="flex justify-between items-center max-w-3xl mx-auto">
                {[
                  { id: 1, label: 'Settings', icon: Layers },
                  { id: 2, label: 'Upload', icon: FileSpreadsheet },
                  { id: 3, label: 'Sync', icon: CheckCircle2 }
                ].map((step) => {
                  const Icon = step.icon;
                  const isActive = currentStep === step.id;
                  const isCompleted = currentStep > step.id;
                  
                  return (
                    <div key={step.id} className="flex flex-col items-center gap-3 bg-slate-50/50 px-6 py-2 rounded-2xl relative">
                      <div 
                        className={`
                          w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 relative z-10
                          ${isActive ? 'bg-indigo-600 text-white shadow-[0_10px_30px_rgba(79,70,229,0.4)] scale-110' : ''}
                          ${isCompleted ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' : ''}
                          ${!isActive && !isCompleted ? 'bg-white border-2 border-slate-100 text-slate-300' : ''}
                        `}
                      >
                        {isCompleted ? <Check className="w-7 h-7" /> : <Icon className="w-6 h-6" />}
                      </div>
                      <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-indigo-600' : isCompleted ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <Card className="border-none shadow-[0_20px_50px_rgba(0,0,0,0.05)] overflow-hidden rounded-[32px] bg-white/80 backdrop-blur-xl border border-white">
              <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500 w-full animate-gradient-x" />
              <CardHeader className="pt-10 px-10">
                <CardTitle className="text-2xl font-black text-slate-800 tracking-tight">1. Configure Upload</CardTitle>
                <CardDescription className="text-base">Choose the data module and reporting period.</CardDescription>
              </CardHeader>
              <CardContent className="p-10 space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                  <div className="space-y-4">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5" /> Module Selection
                    </label>
                    <div className="relative group">
                      <select 
                        value={uploadType}
                        onChange={(e) => setUploadType(e.target.value as any)}
                        className="w-full h-14 bg-slate-50 border-2 border-transparent rounded-2xl px-5 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-500/20 transition-all cursor-pointer appearance-none shadow-sm"
                      >
                        {Object.entries(uploadTypeLabels).map(([val, label]) => (
                          <option key={val} value={val}>{label}</option>
                        ))}
                      </select>
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-indigo-500 transition-colors">
                        <ChevronRight className="w-5 h-5 rotate-90" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5" /> Target Month
                    </label>
                    <div className="relative group">
                      <select 
                        value={periodMonth}
                        onChange={(e) => setPeriodMonth(Number(e.target.value))}
                        className="w-full h-14 bg-slate-50 border-2 border-transparent rounded-2xl px-5 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-500/20 transition-all cursor-pointer appearance-none shadow-sm"
                      >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                          <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('id-ID', { month: 'long' })}</option>
                        ))}
                      </select>
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-indigo-500 transition-colors">
                        <ChevronRight className="w-5 h-5 rotate-90" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5" /> Target Year
                    </label>
                    <div className="relative group">
                      <select 
                        value={periodYear}
                        onChange={(e) => setPeriodYear(Number(e.target.value))}
                        className="w-full h-14 bg-slate-50 border-2 border-transparent rounded-2xl px-5 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-500/20 transition-all cursor-pointer appearance-none shadow-sm"
                      >
                        {Array.from({ length: 5 }, (_, i) => currentYear - 2 + i).map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-indigo-500 transition-colors">
                        <ChevronRight className="w-5 h-5 rotate-90" />
                      </div>
                    </div>
                  </div>
                </div>

                <div 
                  onClick={() => setReplaceExisting(!replaceExisting)}
                  className={`
                    p-8 rounded-[24px] border-2 transition-all duration-300 cursor-pointer flex items-center gap-8 group relative overflow-hidden
                    ${replaceExisting ? 'border-amber-200 bg-gradient-to-br from-amber-50/50 to-white' : 'border-slate-100 bg-white hover:border-indigo-200'}
                  `}
                >
                  {replaceExisting && <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -mr-16 -mt-16 blur-3xl" />}
                  <div className={`
                    w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-sm
                    ${replaceExisting ? 'bg-amber-100 text-amber-600 rotate-0 shadow-amber-200/50' : 'bg-slate-50 text-slate-300 rotate-12 group-hover:rotate-0 group-hover:bg-indigo-50 group-hover:text-indigo-600'}
                  `}>
                    <Check className={`w-8 h-8 transition-all duration-500 ${replaceExisting ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`} />
                    {!replaceExisting && <div className="absolute w-7 h-7 border-2 border-slate-200 rounded-xl" />}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 uppercase tracking-tight text-lg">Clear Existing Batch</h4>
                    <p className="text-sm text-slate-500 mt-1.5 font-medium leading-relaxed">
                      Delete all data for <span className="text-indigo-600 font-bold">{new Date(0, periodMonth-1).toLocaleString('id-ID', { month: 'long' })} {periodYear}</span> before importing. Prevents duplicate records.
                    </p>
                  </div>
                </div>

                <div className="pt-6 flex justify-end">
                  <Button 
                    onClick={() => setCurrentStep(2)}
                    className="h-16 px-12 bg-indigo-600 hover:bg-slate-900 text-white font-black uppercase tracking-widest rounded-3xl shadow-2xl shadow-indigo-200 transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-4"
                  >
                    Proceed to Upload <ArrowRight className="w-5 h-5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {activeTab === 'upload' && currentStep === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <div className="flex justify-between items-end">
              <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                  <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200">
                    <FileSpreadsheet className="w-6 h-6 text-white" />
                  </div>
                  Upload File
                </h1>
                <p className="text-slate-500 font-medium">Modul: <span className="text-indigo-600 font-bold">{uploadTypeLabels[uploadType]}</span></p>
              </div>
              <Button variant="ghost" onClick={() => setCurrentStep(1)} className="text-slate-400 font-bold hover:text-indigo-600">
                Ganti Konfigurasi
              </Button>
            </div>

            <div 
              {...getRootProps()} 
              className={`
                group relative border-2 border-dashed rounded-[32px] p-16 text-center transition-all duration-500 cursor-pointer overflow-hidden
                ${isDragActive ? 'border-indigo-500 bg-indigo-50/50 scale-[0.99] ring-8 ring-indigo-500/10' : 'border-slate-200 bg-slate-50/30 hover:border-indigo-400 hover:bg-white'}
              `}
            >
              <input {...getInputProps()} />
              
              <div className="relative z-10 flex flex-col items-center justify-center space-y-6">
                <div className={`
                  w-24 h-24 rounded-3xl flex items-center justify-center transition-all duration-500
                  ${isDragActive ? 'bg-indigo-600 text-white rotate-12 scale-110 shadow-2xl shadow-indigo-300' : 'bg-white text-indigo-600 shadow-xl shadow-slate-100 group-hover:scale-110 group-hover:-rotate-3'}
                `}>
                  <UploadCloud className="w-10 h-10" />
                </div>
                
                <div className="max-w-xs mx-auto">
                  <p className="text-lg font-black text-slate-800 leading-tight">
                    {isDragActive ? 'Lepaskan file di sini...' : 'Tarik data Anda ke area ini'}
                  </p>
                  <p className="text-sm text-slate-500 mt-2 font-medium">
                    Atau klik untuk menjelajah file dari komputer Anda (.xlsx, .xls, .csv)
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 flex items-start gap-4 text-rose-600 bg-rose-50 p-6 rounded-2xl border border-rose-100"
              >
                <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center flex-shrink-0 text-rose-600">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-black text-sm uppercase tracking-tight">Ups, terjadi kesalahan</h4>
                  <p className="text-xs text-rose-700/80 mt-1 leading-relaxed">{error}</p>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {activeTab === 'upload' && currentStep === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="space-y-6"
          >
            <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-[28px] flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200 flex-shrink-0">
                  <Check className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-emerald-900 uppercase tracking-tight">File Siap Diproses!</h3>
                  <div className="flex flex-wrap items-center gap-3 mt-1.5">
                    <span className="bg-white/60 px-3 py-1 rounded-lg text-emerald-700 text-xs font-bold border border-emerald-200">
                      {currentFile?.name}
                    </span>
                    <span className="bg-emerald-600 px-3 py-1 rounded-lg text-white text-[10px] font-black uppercase tracking-widest">
                      {allMappedData.length.toLocaleString('id-ID')} Baris Ditemukan
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={resetUpload} 
                  disabled={isUploading}
                  className="h-12 border-emerald-200 text-emerald-700 hover:bg-emerald-100 font-bold rounded-xl"
                >
                  <X className="w-4 h-4 mr-2" /> Batalkan
                </Button>
                <Button 
                  onClick={handleUploadToDatabase} 
                  disabled={isUploading}
                  className="h-12 px-8 bg-slate-900 text-white hover:bg-black font-black uppercase tracking-wider rounded-xl shadow-xl shadow-slate-200"
                >
                  {isUploading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sedang Mengirim...</>
                  ) : (
                    <><Database className="w-4 h-4 mr-2" /> Sync Sekarang</>
                  )}
                </Button>
              </div>
            </div>

            <Card className="border-none shadow-xl shadow-slate-200/60 overflow-hidden">
               <div className="h-1 bg-indigo-600 w-full" />
               <CardHeader className="pt-8 px-8 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                       <TableIcon className="w-5 h-5 text-indigo-500" /> Pratinjau 10 Baris Pertama
                    </CardTitle>
                    <CardDescription>Periksa mapping kolom secara visual sebelum melakukan sinkronisasi permanen.</CardDescription>
                  </div>
               </CardHeader>
               <CardContent className="p-0">
                  <div className="overflow-x-auto w-full no-scrollbar">
                    <table className="w-max min-w-full text-left border-collapse">
                      <thead className="bg-slate-50/80 border-y border-slate-100">
                        <tr>
                          {headers.map((h, i) => (
                            <th key={i} className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 bg-white">
                        {dataPreview.map((row, idx) => (
                          <tr key={idx} className="hover:bg-indigo-50/30 transition-colors group">
                            {headers.map((h, i) => (
                              <td key={i} className="px-6 py-4 text-xs font-medium text-slate-600 truncate max-w-[200px]" title={String(row[h])}>
                                {row[h] !== null && row[h] !== undefined ? String(row[h]) : <span className="opacity-20">-</span>}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="p-8 flex justify-center bg-slate-50/50">
                    <div className="text-[11px] font-bold text-slate-400 italic">
                      Hanya menampilkan 10 dari {allMappedData.length.toLocaleString('id-ID')} total baris untuk performa browser yang optimal.
                    </div>
                  </div>
               </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
