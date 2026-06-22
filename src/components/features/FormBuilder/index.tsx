import React, { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabase';
import { Button } from '../../ui/Button';
import { Card, CardContent } from '../../ui/Card';
import { Plus, X, GripVertical, Save, LayoutTemplate, Type, Hash, List, MapPin, Camera } from 'lucide-react';
import { useAlert } from '../../ui/AlertModal';

interface BaseFieldConfig {
  id: string;
  name: string; // the database column mapping or generic name
  label: string;
  placeholder: string;
  type: string;
  required: boolean;
  width: 'full' | 'half';
  options?: string[]; // for select type
  order: number;
}

export function FormBuilder() {
  const [fields, setFields] = useState<BaseFieldConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { showAlert } = useAlert();

  useEffect(() => {
    fetchConfig();
  }, []);

  const seedDefaultFieldsData = (): BaseFieldConfig[] => {
    return [
      { id: crypto.randomUUID(), name: 'cabang', label: 'Cabang', placeholder: 'Bandung', type: 'text', required: true, width: 'half', order: 0 },
      { id: crypto.randomUUID(), name: 'kecamatan', label: 'Kecamatan', placeholder: 'Kecamatan', type: 'text', required: true, width: 'half', order: 1 },
      { id: crypto.randomUUID(), name: 'nama_toko', label: 'Nama Toko', placeholder: 'Toko Sukses', type: 'text', required: true, width: 'full', order: 2 },
      { id: crypto.randomUUID(), name: 'salesman_name', label: 'Nama Sales', placeholder: 'Pilih Sales', type: 'select', required: true, width: 'full', order: 3 },
      { id: crypto.randomUUID(), name: 'alamat_toko', label: 'Alamat Toko', placeholder: 'Jln Raya No 1', type: 'textarea', required: true, width: 'full', order: 4 },
      { id: crypto.randomUUID(), name: 'pengambil_keputusan', label: 'CP / Pengambil Keputusan', placeholder: 'Budi', type: 'text', required: true, width: 'half', order: 5 },
      { id: crypto.randomUUID(), name: 'no_telepon', label: 'No Telepon', placeholder: '08123...', type: 'text', required: true, width: 'half', order: 6 },
      { id: crypto.randomUUID(), name: 'total_omset_lcd', label: 'Est. Omset LCD', placeholder: '0', type: 'number', required: false, width: 'half', order: 7 },
      { id: crypto.randomUUID(), name: 'order_lcd_dari', label: 'Order LCD Dari', placeholder: 'Pihak lain?', type: 'text', required: false, width: 'half', order: 8 },
      { id: crypto.randomUUID(), name: 'lcd_brand', label: 'Brand LCD', placeholder: 'Meetoo, OG, dll', type: 'text', required: false, width: 'half', order: 9 },
      { id: crypto.randomUUID(), name: 'lcd_harga', label: 'Harga LCD (Y20/C11)', placeholder: '0', type: 'number', required: false, width: 'half', order: 10 },
      { id: crypto.randomUUID(), name: 'total_omset_batrai', label: 'Est. Omset Baterai', placeholder: '0', type: 'number', required: false, width: 'half', order: 11 },
      { id: crypto.randomUUID(), name: 'order_batrai_dari', label: 'Order Baterai Dari', placeholder: 'Pihak lain?', type: 'text', required: false, width: 'half', order: 12 },
      { id: crypto.randomUUID(), name: 'batrai_brand', label: 'Brand Baterai', placeholder: 'Brader, dll', type: 'text', required: false, width: 'half', order: 13 },
      { id: crypto.randomUUID(), name: 'batrai_harga', label: 'Harga Baterai', placeholder: '0', type: 'number', required: false, width: 'half', order: 14 },
      { id: crypto.randomUUID(), name: 'status_regist', label: 'Status Regist', placeholder: 'Pilih Status...', type: 'select', required: true, width: 'half', options: ['Sudah Regist', 'Belum Regist'], order: 15 },
      { id: crypto.randomUUID(), name: 'butuh_support', label: 'Support', placeholder: 'Support yang dibutuhkan...', type: 'text', required: true, width: 'half', order: 16 },
      { id: crypto.randomUUID(), name: 'ada_stok_lcd_batrai', label: 'Ketersediaan Stok', placeholder: 'Pilih...', type: 'select', required: true, width: 'full', options: ['Stok LCD Saja', 'Stok Batrai Saja', 'Ada Keduanya', 'Tidak Ada Keduanya'], order: 17 },
    ];
  };

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('form_configs')
        .select('fields_config')
        .eq('form_id', 'survey_channel')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      let currentFields = [];
      if (data && data.fields_config) {
        currentFields = data.fields_config;
      }
      
      // Auto-merge missing default fields so user doesn't have to manually 'Load Default'
      const defaultFields = seedDefaultFieldsData();
      const existingNames = new Set(currentFields.map((f: any) => f.name));
      const missingFields = defaultFields.filter(f => !existingNames.has(f.name));
      
      if (missingFields.length > 0) {
        currentFields = [...currentFields, ...missingFields];
        // Automatically save the merged config back to database for safety
        await supabase
          .from('form_configs')
          .upsert({ form_id: 'survey_channel', fields_config: currentFields }, { onConflict: 'form_id' });
      }
      
      setFields(currentFields);
    } catch (err: any) {
      console.error(err);
      showAlert('Gagal mengambil konfigurasi form: ' + err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Upsert
      const { error } = await supabase
        .from('form_configs')
        .upsert({ form_id: 'survey_channel', fields_config: fields }, { onConflict: 'form_id' });
      if (error) throw error;
      showAlert('Konfigurasi form berhasil disimpan!', 'success');
    } catch (err: any) {
      console.error(err);
      showAlert('Gagal menyimpan: ' + err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const addField = () => {
    const newField: BaseFieldConfig = {
      id: crypto.randomUUID(),
      name: `field_${Date.now()}`,
      label: 'New Field',
      placeholder: '',
      type: 'text',
      required: false,
      width: 'full',
      order: fields.length
    };
    setFields([...fields, newField]);
  };

  const removeField = (id: string) => {
    setFields(fields.filter(f => f.id !== id));
  };

  const updateField = (id: string, updates: Partial<BaseFieldConfig>) => {
    setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const seedDefaultFields = () => {
    setFields(seedDefaultFieldsData());
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
            <LayoutTemplate className="w-6 h-6 text-indigo-500" />
            Dynamic Form Builder
          </h1>
          <p className="text-slate-500 mt-1">Konfigurasi tata letak dan field untuk Survey Channel.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button onClick={seedDefaultFields} variant="outline" className="flex-1 sm:flex-none font-bold text-slate-600 border-slate-200">
            <LayoutTemplate className="w-4 h-4 mr-2" /> Load Default
          </Button>
          <Button onClick={addField} variant="outline" className="flex-1 sm:flex-none font-bold text-indigo-600 border-indigo-200">
            <Plus className="w-4 h-4 mr-2" /> Tambah Field
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="flex-1 sm:flex-none font-bold bg-indigo-600 hover:bg-indigo-700 text-white">
            <Save className="w-4 h-4 mr-2" /> {isSaving ? 'Menyimpan...' : 'Simpan Form'}
          </Button>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-sm text-amber-800">
          <strong>Perhatian:</strong> Karena Survey Channel menggunakan database tertentu, 
          jika Anda membuat field baru (selain yang sudah ada di sistem dasar) maka data tersebut belum tentu dapat disimpan unless dimapping (tahap pengembangan selanjutnya).
          Namun Anda bisa mengedit Label, Placeholder, Tipe Input, Role (Required), dan Lebar form (Full / Half) untuk field yang sudah ada.
        </p>
      </div>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {fields.map((field, idx) => (
            <Card key={field.id} className="relative overflow-visible shadow-sm border-slate-200">
              <CardContent className="p-4 sm:p-6">
                <button 
                  onClick={() => removeField(field.id)}
                  className="absolute -top-3 -right-3 z-10 w-8 h-8 bg-white border border-slate-200 rounded-full flex items-center justify-center text-rose-500 hover:bg-rose-50 hover:border-rose-200 transition-all shadow-sm"
                >
                  <X className="w-4 h-4" />
                </button>
                
                <div className="flex flex-col sm:flex-row gap-6">
                  <div className="hidden sm:flex items-center justify-center text-slate-300 cursor-grab active:cursor-grabbing">
                    <GripVertical className="w-6 h-6" />
                  </div>
                  
                  <div className="flex-1 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Database Field Name</label>
                        <input 
                          value={field.name}
                          onChange={(e) => updateField(field.id, { name: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 font-mono"
                          placeholder="e.g. nama_toko"
                        />
                      </div>
                      
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Tipe Input</label>
                        <select 
                          value={field.type}
                          onChange={(e) => updateField(field.id, { type: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700"
                        >
                          <option value="text">Text / String</option>
                          <option value="number">Numeric</option>
                          <option value="textarea">Multi-line Text</option>
                          <option value="select">Dropdown (Select)</option>
                          <option value="gps">GPS Location</option>
                          <option value="image">Image Upload</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Lebar</label>
                        <select 
                          value={field.width}
                          onChange={(e) => updateField(field.id, { width: e.target.value as 'full' | 'half' })}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700"
                        >
                          <option value="full">1 Baris Penuh (Full)</option>
                          <option value="half">1/2 Baris (Setengah)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Label Tampilan</label>
                        <input 
                          value={field.label}
                          onChange={(e) => updateField(field.id, { label: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-900"
                          placeholder="e.g. Nama Toko"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Placeholder / Bantuan</label>
                        <input 
                          value={field.placeholder}
                          onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600"
                          placeholder="e.g. Masukkan nama toko..."
                        />
                      </div>
                    </div>
                    
                    {field.type === 'select' && (
                      <div className="space-y-1.5 border-t border-slate-100 pt-3">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Pilihan Dropdown (pisahkan dengan koma)</label>
                        <input 
                          value={field.options?.join(', ') || ''}
                          onChange={(e) => updateField(field.id, { options: e.target.value.split(',').map(s => s.trim()) })}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700"
                          placeholder="Ya, Tidak, Mungkin"
                        />
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 pt-2">
                       <label className="flex items-center gap-2 cursor-pointer">
                         <input 
                           type="checkbox" 
                           checked={field.required}
                           onChange={(e) => updateField(field.id, { required: e.target.checked })}
                           className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                         />
                         <span className="text-sm font-medium text-slate-700">Wajib Diisi (Required)</span>
                       </label>
                    </div>

                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {fields.length === 0 && (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
              <LayoutTemplate className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-700">Belum ada field</h3>
              <p className="text-slate-500 mt-1">Klik "Tambah Field" untuk mulai membuat form.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
