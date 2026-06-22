import React from 'react';
import { Card, CardContent } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Loader2, Save, Plus, X, MapPin, ImageIcon, Camera, Package, RefreshCw } from 'lucide-react';
import { SurveyData, InfoItem } from './types';
import { supabase } from '../../../services/supabase';
import { CameraCapture } from '../../ui/CameraCapture';
import { useAlert } from '../../ui/AlertModal';

import { GenieModal } from '../../ui/GenieModal';

interface SurveyFormProps {
  isOpen: boolean;
  isEditing: boolean;
  formData: Partial<SurveyData>;
  salesmen: { id: string; salesman_name: string }[];
  isSaving: boolean;
  isShared?: boolean;
  lcdItems: InfoItem[];
  batraiItems: InfoItem[];
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  handleCreateOrUpdate: (e: React.FormEvent) => void;
  closeForm: () => void;
  handleGetLocation: () => void;
  handlePhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleLcdItemChange: (index: number, field: keyof InfoItem, value: string) => void;
  addLcdItem: () => void;
  removeLcdItem: (index: number) => void;
  handleBatraiItemChange: (index: number, field: keyof InfoItem, value: string) => void;
  addBatraiItem: () => void;
  removeBatraiItem: (index: number) => void;
  setFormData: React.Dispatch<React.SetStateAction<Partial<SurveyData>>>;
  gettingLocation: boolean;
  accuracy: number | null;
}

export function SurveyForm({
  isOpen, isEditing, formData, salesmen, isSaving, isShared, lcdItems, batraiItems,
  gettingLocation, accuracy,
  handleChange, handleCreateOrUpdate, closeForm, handleGetLocation,
  handlePhotoUpload, handleLcdItemChange, addLcdItem, removeLcdItem,
  handleBatraiItemChange, addBatraiItem, removeBatraiItem, setFormData
}: SurveyFormProps) {
  const { showAlert } = useAlert();
  const [formFields, setFormFields] = React.useState<any[]>([]);
  const [isCameraOpen, setIsCameraOpen] = React.useState(false);

  React.useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data } = await supabase
        .from('form_configs')
        .select('fields_config')
        .eq('form_id', 'survey_channel')
        .single();
      
      if (data && data.fields_config) {
        setFormFields(data.fields_config);
      }
    } catch (err) {
      console.error('Error fetching survey config:', err);
    }
  };

  const getFieldConfig = (name: string, fallbackLabel: string, fallbackPlaceholder: string, isRequired: boolean, defaultOptions: string[] = []) => {
    const field = formFields.find(f => f.name === name);
    if (!field) return { label: fallbackLabel, placeholder: fallbackPlaceholder, required: isRequired, options: defaultOptions };
    return {
      label: field.label || fallbackLabel,
      placeholder: field.placeholder || fallbackPlaceholder,
      required: field.required,
      options: field.options?.length ? field.options : defaultOptions
    };
  };

  const isFormValid = !!(
    formData.cabang &&
    formData.kecamatan &&
    formData.nama_toko &&
    formData.salesman_name &&
    formData.alamat_toko &&
    formData.pengambil_keputusan &&
    formData.no_telepon &&
    (!getFieldConfig('status_regist', '', '', true).required || formData.status_regist) &&
    (!getFieldConfig('butuh_support', '', '', true).required || formData.butuh_support) &&
    (!getFieldConfig('ada_stok_lcd_batrai', '', '', true).required || formData.ada_stok_lcd_batrai) &&
    (formData.total_omset_lcd !== undefined && String(formData.total_omset_lcd) !== '') &&
    !!formData.order_lcd_dari &&
    (formData.total_omset_batrai !== undefined && String(formData.total_omset_batrai) !== '') &&
    !!formData.order_batrai_dari &&
    lcdItems.every(i => !!i.brand?.trim() && i.harga !== undefined && String(i.harga).trim() !== '') &&
    batraiItems.every(i => !!i.brand?.trim() && i.harga !== undefined && String(i.harga).trim() !== '') &&
    formData.latitude &&
    formData.longitude &&
    formData.foto_toko
  );

  const excludeNames = [
    'total_omset_lcd', 'order_lcd_dari', 'lcd_brand', 'lcd_harga', 
    'total_omset_batrai', 'order_batrai_dari', 'batrai_brand', 'batrai_harga', 
    'status_regist', 'butuh_support', 'ada_stok_lcd_batrai', 'alamat_toko'
  ];
  const mainFields = formFields.filter(f => !excludeNames.includes(f.name));

  return (
    <GenieModal
      isOpen={isOpen}
      onClose={closeForm}
      title={isEditing ? 'Edit Survey Channel' : 'Tambah Survey Channel'}
      subtitle={isEditing ? formData.nama_toko : 'Silakan lengkapi data survey toko'}
      maxWidth="max-w-4xl"
    >
      <form onSubmit={(e) => {
        e.preventDefault();
        if (!isFormValid) {
            showAlert('Harap lengkapi semua data wajib (LCD & Baterai) terlebih dahulu pada form di atas.', 'warning');
            return;
        }
        handleCreateOrUpdate(e);
      }} className="space-y-6">
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">Informasi Dasar</h3>
            
            {formFields.length > 0 ? (
              <div className="flex flex-wrap -mx-2">
                {mainFields.sort((a, b) => a.order - b.order).map(field => {
                  let val: any = '';
                  if (formData.hasOwnProperty(field.name) && formData[field.name as keyof SurveyData] !== undefined && formData[field.name as keyof SurveyData] !== null) {
                    val = formData[field.name as keyof SurveyData];
                  } else if (formData.extra_data && formData.extra_data[field.name] !== undefined && formData.extra_data[field.name] !== null) {
                    val = formData.extra_data[field.name];
                  }
                  
                  const sharedClasses = "w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none";
                  const labelRow = (
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">
                      {field.label} <span className="text-rose-500">*</span>
                    </label>
                  );

                  let inputElement;

                  if (field.name === 'salesman_name') {
                    inputElement = (
                      <select required={field.required} name="salesman_name" value={val} onChange={handleChange} className={sharedClasses}>
                        <option value="" disabled>{field.placeholder || 'Pilih...'}</option>
                        {salesmen.map((s) => (
                          <option key={s.id} value={s.salesman_name}>{s.salesman_name}</option>
                        ))}
                      </select>
                    );
                  } else if (field.type === 'textarea') {
                    inputElement = <textarea required={field.required} name={field.name} value={val} onChange={handleChange} placeholder={field.placeholder} className={`${sharedClasses} resize-none`} rows={2} />;
                  } else if (field.type === 'select' && field.options) {
                    inputElement = (
                      <select required={field.required} name={field.name} value={val} onChange={handleChange} className={sharedClasses}>
                        <option value="" disabled>{field.placeholder || 'Pilih...'}</option>
                        {field.options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    );
                  } else {
                    inputElement = <input required={field.required} type={field.type} name={field.name} value={val} onChange={handleChange} placeholder={field.placeholder} className={sharedClasses} />;
                  }

                  return (
                    <div key={field.id} className={`px-2 mb-4 ${field.width === 'half' ? 'w-full sm:w-1/2' : 'w-full'}`}>
                      {labelRow}
                      {inputElement}
                    </div>
                  );
                })}
              </div>
            ) : (
              // Fallback to original layout
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Cabang <span className="text-rose-500">*</span></label>
                    <input required name="cabang" value={formData.cabang || ''} onChange={handleChange} placeholder="Bandung" className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Kecamatan <span className="text-rose-500">*</span></label>
                    <input required name="kecamatan" value={formData.kecamatan || ''} onChange={handleChange} placeholder="Sukajadi" className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Nama Toko <span className="text-rose-500">*</span></label>
                  <input required name="nama_toko" value={formData.nama_toko || ''} onChange={handleChange} placeholder="Toko Sukses" className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Nama Sales <span className="text-rose-500">*</span></label>
                    <select required name="salesman_name" value={formData.salesman_name || ''} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none">
                      <option value="" disabled>Pilih Sales</option>
                      {salesmen.map((s) => (
                        <option key={s.id} value={s.salesman_name}>{s.salesman_name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">CP <span className="text-rose-500">*</span></label>
                    <input required name="pengambil_keputusan" value={formData.pengambil_keputusan || ''} onChange={handleChange} placeholder="Budi" className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">No Telepon <span className="text-rose-500">*</span></label>
                    <input required name="no_telepon" value={formData.no_telepon || ''} onChange={handleChange} placeholder="081xxx" className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none" />
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mb-2">Lokasi & Foto</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 mt-2 space-y-3">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-[10px] sm:text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1">
                    <MapPin className="w-4 h-4 text-indigo-500" /> Koordinat GPS <span className="text-rose-500">*</span>
                  </h3>
                  <Button type="button" onClick={handleGetLocation} size="sm" variant="outline" className="bg-white border-slate-300 text-slate-700 hover:bg-slate-100" disabled={gettingLocation}>
                    {gettingLocation ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
                    Refresh
                  </Button>
                </div>

                {accuracy !== null && (
                  <div className={`p-2 rounded text-xs text-center border font-medium ${accuracy <= 30 ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                    Akurasi: {Math.round(accuracy)} meter {accuracy > 30 ? '(Kurang Akurat)' : '(Akurat)'}
                  </div>
                )}

                {formData.alamat_toko ? (
                  <div className="text-sm text-slate-600 border p-3 rounded-lg bg-white shadow-inner">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="block font-semibold">Alamat Terdeteksi:</span>
                      {formData.latitude && formData.longitude && (
                         <span className="text-[10px] text-slate-400 font-mono">({formData.latitude}, {formData.longitude})</span>
                      )}
                    </div>
                    {formData.alamat_toko}
                  </div>
                ) : (
                  <div className="text-sm text-slate-500 italic p-3 text-center border border-dashed rounded-lg bg-white">
                    {gettingLocation ? 'Mencari lokasi...' : 'Lokasi belum ditemukan'}
                  </div>
                )}
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1"><Camera className="w-3 h-3 text-rose-500" /> Foto Toko <span className="text-rose-500">*</span></label>
                <div className="flex flex-col gap-2">
                  {!formData.foto_toko ? (
                    <Button 
                      type="button" 
                      onClick={() => setIsCameraOpen(true)} 
                      variant="outline"
                      className="w-full h-32 border-dashed border-2 border-slate-200 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-slate-50 hover:border-indigo-300 transition-all group"
                    >
                      <div className="w-10 h-10 bg-slate-100 group-hover:bg-indigo-100 rounded-lg flex items-center justify-center transition-colors">
                        <Camera className="w-5 h-5 text-slate-400 group-hover:text-indigo-600" />
                      </div>
                      <span className="text-xs font-black text-slate-400 group-hover:text-indigo-600 uppercase tracking-widest">Buka Kamera</span>
                    </Button>
                  ) : (
                    <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-slate-100 bg-slate-50 shadow-sm ring-1 ring-slate-100">
                      <img src={formData.foto_toko} alt="Foto Toko" className="object-cover w-full h-full" />
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, foto_toko: '' }))}
                        className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm text-rose-500 rounded-full p-2 hover:bg-rose-500 hover:text-white transition-all shadow-lg active:scale-90"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  
                  {isCameraOpen && (
                    <div className="fixed inset-0 z-[10000]">
                      <CameraCapture 
                        onCapture={(img) => {
                          setFormData(prev => ({ ...prev, foto_toko: img }));
                          setIsCameraOpen(false);
                        }}
                        onClose={() => setIsCameraOpen(false)}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6 pt-6 border-t border-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* LCD Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                  <Package className="w-4 h-4 text-indigo-500" /> Informasi Produk LCD
                </h3>
                <Button type="button" variant="outline" size="sm" onClick={addLcdItem} className="h-8 rounded-lg text-[10px] font-black uppercase tracking-tight flex items-center gap-1 border-indigo-100 text-indigo-600 hover:bg-indigo-50">
                  <Plus className="w-3 h-3" /> Tambah Brand
                </Button>
              </div>
              <div className="flex flex-wrap -mx-1.5">
                {(() => {
                  const conf = getFieldConfig('total_omset_lcd', 'Est. Omset LCD', '0', true);
                  const confWidth = formFields.find(f => f.name === 'total_omset_lcd')?.width === 'full' ? 'w-full' : 'w-full sm:w-1/2';
                  return (
                    <div className={`px-1.5 mb-3 ${confWidth}`}>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">{conf.label} <span className="text-rose-500">*</span></label>
                      <input required={true} type="number" name="total_omset_lcd" value={formData.total_omset_lcd || ''} onChange={handleChange} placeholder={conf.placeholder} className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm font-black text-indigo-600 outline-none" />
                    </div>
                  )
                })()}
                {(() => {
                  const conf = getFieldConfig('order_lcd_dari', 'Order Dari', 'Pihak lain?', true);
                  const confWidth = formFields.find(f => f.name === 'order_lcd_dari')?.width === 'full' ? 'w-full' : 'w-full sm:w-1/2';
                  return (
                    <div className={`px-1.5 mb-3 ${confWidth}`}>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">{conf.label} <span className="text-rose-500">*</span></label>
                      <input required={true} name="order_lcd_dari" value={formData.order_lcd_dari || ''} onChange={handleChange} placeholder={conf.placeholder} className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-700 outline-none" />
                    </div>
                  )
                })()}
              </div>
              <div className="space-y-3">
                {lcdItems.map((item, index) => (
                  <div key={`lcd-${index}`} className="relative p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 flex flex-wrap -mx-1.5 group animate-in slide-in-from-left-2">
                    {(() => {
                      const conf = getFieldConfig('lcd_brand', 'Brand', 'Meetoo, OG, dll', true);
                      const confWidth = formFields.find(f => f.name === 'lcd_brand')?.width === 'full' ? 'w-full' : 'w-full sm:w-1/2';
                      return (
                        <div className={`px-1.5 mb-3 ${confWidth}`}>
                          <label className="text-[9px] font-black uppercase text-indigo-400 tracking-wider mb-1 block">{conf.label} <span className="text-rose-500">*</span></label>
                          <input required={true} value={item.brand} onChange={(e) => handleLcdItemChange(index, 'brand', e.target.value)} placeholder={conf.placeholder} className="w-full px-2 py-1.5 bg-white border border-indigo-100 rounded text-xs font-bold text-indigo-900 outline-none" />
                        </div>
                      );
                    })()}
                    {(() => {
                      const conf = getFieldConfig('lcd_harga', 'Harga (Y20/C11)', '0', true);
                      const confWidth = formFields.find(f => f.name === 'lcd_harga')?.width === 'full' ? 'w-full' : 'w-full sm:w-1/2';
                      return (
                        <div className={`px-1.5 mb-3 ${confWidth}`}>
                          <label className="text-[9px] font-black uppercase text-indigo-400 tracking-wider mb-1 block">{conf.label} <span className="text-rose-500">*</span></label>
                          <input required={true} type="number" value={item.harga} onChange={(e) => handleLcdItemChange(index, 'harga', e.target.value)} placeholder={conf.placeholder} className="w-full px-2 py-1.5 bg-white border border-indigo-100 rounded text-xs font-bold text-indigo-900 outline-none" />
                        </div>
                      );
                    })()}
                    {lcdItems.length > 1 && (
                      <button type="button" onClick={() => removeLcdItem(index)} className="absolute -top-2 -right-2 bg-rose-500 text-white p-1 rounded-full hover:bg-rose-600 shadow-md transition-all active:scale-90"><X className="w-3 h-3" /></button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Battery Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                  <Package className="w-4 h-4 text-emerald-500" /> Informasi Produk Baterai
                </h3>
                <Button type="button" variant="outline" size="sm" onClick={addBatraiItem} className="h-8 rounded-lg text-[10px] font-black uppercase tracking-tight flex items-center gap-1 border-emerald-100 text-emerald-600 hover:bg-emerald-50">
                  <Plus className="w-3 h-3" /> Tambah Brand
                </Button>
              </div>
              <div className="flex flex-wrap -mx-1.5">
                {(() => {
                  const conf = getFieldConfig('total_omset_batrai', 'Est. Omset Baterai', '0', true);
                  const confWidth = formFields.find(f => f.name === 'total_omset_batrai')?.width === 'full' ? 'w-full' : 'w-full sm:w-1/2';
                  return (
                    <div className={`px-1.5 mb-3 ${confWidth}`}>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">{conf.label} <span className="text-rose-500">*</span></label>
                      <input required={true} type="number" name="total_omset_batrai" value={formData.total_omset_batrai || ''} onChange={handleChange} placeholder={conf.placeholder} className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm font-black text-emerald-600 outline-none" />
                    </div>
                  );
                })()}
                {(() => {
                  const conf = getFieldConfig('order_batrai_dari', 'Order Dari', 'Pihak lain?', true);
                  const confWidth = formFields.find(f => f.name === 'order_batrai_dari')?.width === 'full' ? 'w-full' : 'w-full sm:w-1/2';
                  return (
                    <div className={`px-1.5 mb-3 ${confWidth}`}>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">{conf.label} <span className="text-rose-500">*</span></label>
                      <input required={true} name="order_batrai_dari" value={formData.order_batrai_dari || ''} onChange={handleChange} placeholder={conf.placeholder} className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-700 outline-none" />
                    </div>
                  );
                })()}
              </div>
              <div className="space-y-3">
                {batraiItems.map((item, index) => (
                  <div key={`batrai-${index}`} className="relative p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 flex flex-wrap -mx-1.5 group animate-in slide-in-from-right-2">
                    {(() => {
                      const conf = getFieldConfig('batrai_brand', 'Brand', 'Brader, dll', true);
                      const confWidth = formFields.find(f => f.name === 'batrai_brand')?.width === 'full' ? 'w-full' : 'w-full sm:w-1/2';
                      return (
                        <div className={`px-1.5 mb-3 ${confWidth}`}>
                          <label className="text-[9px] font-black uppercase text-emerald-400 tracking-wider mb-1 block">{conf.label} <span className="text-rose-500">*</span></label>
                          <input required={true} value={item.brand} onChange={(e) => handleBatraiItemChange(index, 'brand', e.target.value)} placeholder={conf.placeholder} className="w-full px-2 py-1.5 bg-white border border-emerald-100 rounded text-xs font-bold text-emerald-900 outline-none" />
                        </div>
                      );
                    })()}
                    {(() => {
                      const conf = getFieldConfig('batrai_harga', 'Harga', '0', true);
                      const confWidth = formFields.find(f => f.name === 'batrai_harga')?.width === 'full' ? 'w-full' : 'w-full sm:w-1/2';
                      return (
                        <div className={`px-1.5 mb-3 ${confWidth}`}>
                          <label className="text-[9px] font-black uppercase text-emerald-400 tracking-wider mb-1 block">{conf.label} <span className="text-rose-500">*</span></label>
                          <input required={true} type="number" value={item.harga} onChange={(e) => handleBatraiItemChange(index, 'harga', e.target.value)} placeholder={conf.placeholder} className="w-full px-2 py-1.5 bg-white border border-emerald-100 rounded text-xs font-bold text-emerald-900 outline-none" />
                        </div>
                      );
                    })()}
                    {batraiItems.length > 1 && (
                      <button type="button" onClick={() => removeBatraiItem(index)} className="absolute -top-2 -right-2 bg-rose-500 text-white p-1 rounded-full hover:bg-rose-600 shadow-md transition-all active:scale-90"><X className="w-3 h-3" /></button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap -mx-1.5 pt-4 border-t border-slate-100">
            {(() => {
              const conf = getFieldConfig('status_regist', 'Status Regist', 'Pilih Status...', true, ['Sudah Regist', 'Belum Regist']);
              const confWidth = formFields.find(f => f.name === 'status_regist')?.width === 'full' ? 'w-full' : 'w-full sm:w-1/3';
              return (
                <div className={`px-1.5 mb-3 ${confWidth}`}>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">{conf.label} <span className="text-rose-500">*</span></label>
                  <select required={conf.required} name="status_regist" value={formData.status_regist || ''} onChange={handleChange} className="w-full px-4 py-2.5 bg-white border-2 border-slate-100 rounded-xl text-sm font-bold text-slate-700 focus:border-indigo-500 outline-none">
                    <option value="" disabled>{conf.placeholder}</option>
                    {conf.options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              );
            })()}
            {(() => {
              const conf = getFieldConfig('butuh_support', 'Support', 'Support yang dibutuhkan...', true);
              const confWidth = formFields.find(f => f.name === 'butuh_support')?.width === 'full' ? 'w-full' : 'w-full sm:w-1/3';
              return (
                <div className={`px-1.5 mb-3 ${confWidth}`}>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">{conf.label} <span className="text-rose-500">*</span></label>
                  <input required={conf.required} name="butuh_support" value={formData.butuh_support || ''} onChange={handleChange} placeholder={conf.placeholder} className="w-full px-4 py-2.5 bg-white border-2 border-slate-100 rounded-xl text-sm font-bold text-slate-700 focus:border-indigo-500 outline-none" />
                </div>
              );
            })()}
            {(() => {
              const conf = getFieldConfig('ada_stok_lcd_batrai', 'Ketersediaan Stok', 'Pilih...', true, ['Stok LCD Saja', 'Stok Batrai Saja', 'Ada Keduanya', 'Tidak Ada Keduanya']);
              const confWidth = formFields.find(f => f.name === 'ada_stok_lcd_batrai')?.width === 'full' ? 'w-full' : 'w-full sm:w-1/3';
              return (
                <div className={`px-1.5 mb-3 ${confWidth}`}>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">{conf.label} <span className="text-rose-500">*</span></label>
                  <select required={conf.required} name="ada_stok_lcd_batrai" value={formData.ada_stok_lcd_batrai || ''} onChange={handleChange} className="w-full px-4 py-2.5 bg-white border-2 border-slate-100 rounded-xl text-sm font-bold text-slate-700 focus:border-indigo-500 outline-none">
                    <option value="" disabled>{conf.placeholder}</option>
                    {conf.options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              );
            })()}
          </div>
        </div>

        <div className="pt-8 flex gap-3">
          <Button variant="ghost" type="button" onClick={closeForm} className="flex-1 font-bold rounded-xl text-slate-500 active:scale-95 transition-all">Batal</Button>
          <Button 
            className={`flex-[2] rounded-xl font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 ${isFormValid ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100' : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'}`} 
            type="submit" 
            disabled={isSaving || !isFormValid}
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> SIMPAN DATA SURVEY </>}
          </Button>
        </div>
      </form>
    </GenieModal>
  );
}
