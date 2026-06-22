import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../services/supabase';
import { ConfirmModal } from '../../ui/ConfirmModal';
import { PromptModal } from '../../ui/PromptModal';
import * as XLSX from 'xlsx';
import { toPng } from 'html-to-image';
import imageCompression from 'browser-image-compression';
import { SurveyData, InfoItem } from './types';
import { useAlert } from '../../ui/AlertModal';

// Child components
import { SurveyHeader } from './SurveyHeader';
import { TargetTable } from './TargetTable';
import { SurveyTable } from './SurveyTable';
import { TargetModal } from './TargetModal';
import { SurveyForm } from './SurveyForm';
import { InstructionsModal } from './InstructionsModal';
import { buildSurveyChannelHtml } from './buildSurveyChannelHtml';
import { Download } from 'lucide-react';

export default function SurveyChannel() {
  const { showAlert } = useAlert();
  const [surveys, setSurveys] = useState<SurveyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  
  // Location states
  const [gettingLocation, setGettingLocation] = useState(false);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  
  // Form State
  const [formData, setFormData] = useState<Partial<SurveyData>>({
    cabang: 'Bandung', kecamatan: '', nama_toko: '', salesman_name: '', alamat_toko: '',
    pengambil_keputusan: '', no_telepon: '', total_omset_lcd: 0, data_lcd: '',
    order_lcd_dari: '', total_omset_batrai: 0, data_batrai: '', order_batrai_dari: '',
    status_regist: '', butuh_support: '', ada_stok_lcd_batrai: '', foto_toko: '',
    latitude: '', longitude: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Sales & Target State
  const [salesmen, setSalesmen] = useState<{ id: string; salesman_name: string }[]>([]);
  const [salesTargets, setSalesTargets] = useState<{ salesman_name: string; target_value: number }[]>([]);
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [targetForms, setTargetForms] = useState<{ salesman_name: string; target_value: number }[]>([]);
  const [selectedSalesmen, setSelectedSalesmen] = useState<string[]>([]);
  const targetTableRef = useRef<HTMLDivElement>(null);
  
  const [modalState, setModalState] = useState<{
    confirmDeleteId: string | null;
    confirmDeleteTarget: boolean;
    promptTarget: boolean;
  }>({
    confirmDeleteId: null,
    confirmDeleteTarget: false,
    promptTarget: false
  });

  // Dynamic lists
  const [lcdItems, setLcdItems] = useState<InfoItem[]>([{ brand: '', harga: '' }]);
  const [batraiItems, setBatraiItems] = useState<InfoItem[]>([{ brand: '', harga: '' }]);

  const urlParams = new URLSearchParams(window.location.search);
  const isShared = urlParams.get('shared') === 'true';

  useEffect(() => {
    fetchSurveys();
    fetchSalesmen();
    fetchTargets();
  }, []);

  const fetchTargets = async () => {
    try {
      const { data, error } = await supabase.from('sales_survey_targets').select('salesman_name, target_value');
      if (data) setSalesTargets(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSalesmen = async () => {
    try {
      const { data, error } = await supabase
        .from('salesman_customer')
        .select('salesman_name');
      if (data) {
        const uniqueSalesmen = Array.from(new Set(data.filter(s => s.salesman_name).map(s => s.salesman_name)))
          .map((name, index) => ({ id: String(index), salesman_name: name }));
        setSalesmen(uniqueSalesmen);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSurveys = async () => {
    setLoading(true);
    try {
      let allRecords: SurveyData[] = [];
      let from = 0;
      const limit = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('survey_channel')
          .select('id, created_at, nama_toko, kecamatan, cabang, salesman_name, alamat_toko, pengambil_keputusan, no_telepon, total_omset_lcd, data_lcd, order_lcd_dari, total_omset_batrai, data_batrai, order_batrai_dari, latitude, longitude, status_regist, status_validation, butuh_support, ada_stok_lcd_batrai, extra_data')
          .range(from, from + limit - 1)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Fetch error or table not found:', error);
          break;
        }

        if (data && data.length > 0) {
          allRecords = [...allRecords, ...data];
          from += limit;
          if (data.length < limit) {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }
      setSurveys(allRecords);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const baseColumns = [
        'id', 'cabang', 'kecamatan', 'nama_toko', 'salesman_name', 'alamat_toko', 
        'pengambil_keputusan', 'no_telepon', 'total_omset_lcd', 'data_lcd', 'order_lcd_dari',
        'total_omset_batrai', 'data_batrai', 'order_batrai_dari', 'status_regist', 
        'butuh_support', 'ada_stok_lcd_batrai', 'foto_toko', 'latitude', 'longitude', 'extra_data', 'created_at'
      ];
      
      const extraData: any = { ...(formData.extra_data || {}) };
      const safeDataToSave: any = {
        data_lcd: JSON.stringify(lcdItems),
        data_batrai: JSON.stringify(batraiItems)
      };

      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'data_lcd' || key === 'data_batrai') return; // Skip so we don't overwrite the stringified JSON
        if (baseColumns.includes(key)) {
          safeDataToSave[key] = value;
        } else {
          extraData[key] = value;
        }
      });
      
      safeDataToSave.extra_data = extraData;

      if (isEditing && formData.id) {
        const { error } = await supabase
          .from('survey_channel')
          .update(safeDataToSave)
          .eq('id', formData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('survey_channel')
          .insert([safeDataToSave]);
        if (error) throw error;
      }
      
      await fetchSurveys();
      closeForm();
    } catch (err) {
      console.error('Error saving:', err);
      showAlert('Gagal menyimpan data.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('survey_channel')
        .delete()
        .eq('id', id);
      if (error) throw error;
      await fetchSurveys();
    } catch (err) {
      console.error('Error deleting:', err);
      showAlert('Gagal menghapus data.', 'error');
    }
  };

  const handleReject = async (id: string, currentStatus?: string) => {
    try {
      const newStatus = currentStatus === 'Rejected' ? 'Valid' : 'Rejected';
      const { error } = await supabase
        .from('survey_channel')
        .update({ status_validation: newStatus })
        .eq('id', id);
      if (error) throw error;
      await fetchSurveys();
      showAlert(newStatus === 'Rejected' ? 'Data survey telah direject (Tidak Valid).' : 'Data survey divalidasi kembali.', 'success');
    } catch (err) {
      console.error('Error rejecting:', err);
      showAlert('Gagal mengubah status validasi data.', 'error');
    }
  };

  const openForm = async (survey?: SurveyData) => {
    if (survey) {
      setAccuracy(null);
      setFormData({ ...survey, ...(survey.extra_data || {}) });
      setIsEditing(true);

      try {
        const parsedLcd = JSON.parse(survey.data_lcd || '[]');
        setLcdItems(Array.isArray(parsedLcd) && parsedLcd.length > 0 ? parsedLcd : [{ brand: survey.data_lcd || '', harga: '' }]);
      } catch {
        setLcdItems([{ brand: survey.data_lcd || '', harga: '' }]);
      }

      try {
        const parsedBatrai = JSON.parse(survey.data_batrai || '[]');
        setBatraiItems(Array.isArray(parsedBatrai) && parsedBatrai.length > 0 ? parsedBatrai : [{ brand: survey.data_batrai || '', harga: '' }]);
      } catch {
        setBatraiItems([{ brand: survey.data_batrai || '', harga: '' }]);
      }
      setIsFormOpen(true);

      // Async load foto_toko
      try {
        const { data } = await supabase.from('survey_channel').select('foto_toko').eq('id', survey.id).single();
        if (data?.foto_toko) {
          setFormData(prev => ({ ...prev, foto_toko: data.foto_toko }));
        }
      } catch (err) {}

    } else {
      setIsInstructionsOpen(true);
    }
  };

  const handleContinueToAdd = () => {
    setIsInstructionsOpen(false);
    setFormData({
      cabang: 'Bandung', kecamatan: '', nama_toko: '', salesman_name: '', alamat_toko: '',
      pengambil_keputusan: '', no_telepon: '', total_omset_lcd: 0, data_lcd: '',
      order_lcd_dari: '', total_omset_batrai: 0, data_batrai: '', order_batrai_dari: '',
      status_regist: 'Belum Regist', butuh_support: ''
    });
    setAccuracy(null);
    setIsEditing(false);
    setLcdItems([{ brand: '', harga: '' }]);
    setBatraiItems([{ brand: '', harga: '' }]);
    setIsFormOpen(true);
    
    // Auto get location
    setTimeout(() => {
      handleGetLocation();
    }, 500);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setFormData({ cabang: 'Bandung' });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name.includes('omset') ? Number(value) : value }));
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      setGettingLocation(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude, accuracy: locAccuracy } = position.coords;
          setAccuracy(locAccuracy);
          setFormData(prev => ({
            ...prev,
            latitude: latitude.toString(),
            longitude: longitude.toString()
          }));

          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
            if (res.ok) {
              const data = await res.json();
              setFormData(prev => ({ ...prev, alamat_toko: data.display_name || 'Alamat tidak ditemukan' }));
              
              if (locAccuracy > 30) {
                showAlert(`Lokasi ditemukan namun akurasi kurang baik (${Math.round(locAccuracy)}m). Coba refresh koordinat jika Anda berada di luar ruangan.`, 'warning');
              }
            } else {
              setFormData(prev => ({ ...prev, alamat_toko: 'Gagal mendeteksi alamat (Server Error)' }));
            }
          } catch (err) {
            console.error('Error reverse geocoding:', err);
            setFormData(prev => ({ ...prev, alamat_toko: 'Gagal mendeteksi alamat (Network Error)' }));
          }
          setGettingLocation(false);
        },
        (error) => {
          console.error("Error getting location: ", error);
          showAlert('Gagal mendapatkan lokasi. Pastikan izin lokasi diaktifkan.', 'warning');
          setGettingLocation(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      showAlert('Geolocation tidak didukung oleh browser ini.', 'error');
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const options = { maxSizeMB: 0.1, maxWidthOrHeight: 800, useWebWorker: true }; // Kompresi kuat (max ~100KB) agar hemat Supabase Storage
      try {
        const compressedFile = await imageCompression(file, options);
        const reader = new FileReader();
        reader.readAsDataURL(compressedFile);
        reader.onloadend = () => {
          setFormData(prev => ({ ...prev, foto_toko: reader.result as string }));
        };
      } catch (error) {
        console.error("Error compressing image", error);
        showAlert('Gagal memproses foto.', 'error');
      }
    }
  };

  const handleLcdItemChange = (index: number, field: keyof InfoItem, value: string) => {
    setLcdItems(prev => {
      const newItems = [...prev];
      newItems[index][field] = value;
      return newItems;
    });
  };

  const addLcdItem = () => setLcdItems(prev => [...prev, { brand: '', harga: '' }]);
  const removeLcdItem = (index: number) => setLcdItems(prev => prev.filter((_, i) => i !== index));

  const handleBatraiItemChange = (index: number, field: keyof InfoItem, value: string) => {
    setBatraiItems(prev => {
      const newItems = [...prev];
      newItems[index][field] = value;
      return newItems;
    });
  };

  const addBatraiItem = () => setBatraiItems(prev => [...prev, { brand: '', harga: '' }]);
  const removeBatraiItem = (index: number) => setBatraiItems(prev => prev.filter((_, i) => i !== index));

  const handleDownloadTargetImage = async () => {
    if (!targetTableRef.current) return;
    try {
      const targetElement = targetTableRef.current;
      const table = targetElement.querySelector('table');
      let optimalWidth = targetElement.offsetWidth;
      
      if (table) {
        optimalWidth = Math.max(targetElement.offsetWidth, table.scrollWidth);
      }

      const dataUrl = await toPng(targetElement, { 
        cacheBust: true, 
        backgroundColor: '#ffffff',
        width: optimalWidth,
        style: { width: `${optimalWidth}px` },
        // @ts-ignore - html-to-image types may mischaracterize onclone
        onclone: (clonedDocument) => {
          const overflowDivs = clonedDocument.querySelectorAll('.overflow-x-auto');
          overflowDivs.forEach(div => {
            (div as HTMLElement).style.overflow = 'visible';
            (div as HTMLElement).style.width = `${optimalWidth}px`;
          });
        }
      });
      
      const link = document.createElement("a");
      link.download = "Target_Survey_Channel.png";
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("Error generating image", error);
      showAlert('Gagal mendownload gambar!', 'error');
    }
  };

  const handleDownloadExcel = async () => {
    if (surveys.length === 0) return showAlert('Tidak ada data survey untuk didownload', 'warning');

    let formFields: any[] = [];
    try {
      const { data } = await supabase.from('form_configs').select('fields_config').eq('form_id', 'survey_channel').single();
      if (data && data.fields_config) {
        formFields = data.fields_config;
      }
    } catch {}

    const mappedData = surveys.map(s => {
      let dataLcdStr = s.data_lcd;
      let dataBatraiStr = s.data_batrai;
      
      try {
        const parsedLcd = JSON.parse(s.data_lcd);
        dataLcdStr = Array.isArray(parsedLcd) ? parsedLcd.map((i: any) => `${i.brand} (${i.harga})`).join(', ') : s.data_lcd;
      } catch (e) {}
      
      try {
        const parsedBatrai = JSON.parse(s.data_batrai);
        dataBatraiStr = Array.isArray(parsedBatrai) ? parsedBatrai.map((i: any) => `${i.brand} (${i.harga})`).join(', ') : s.data_batrai;
      } catch (e) {}

      const baseRow: any = {
        'Cabang': s.cabang,
        'Kecamatan': s.kecamatan,
        'Nama Toko': s.nama_toko,
        'Nama Sales': s.salesman_name,
        'Alamat Toko': s.alamat_toko,
        'Pengambil Keputusan': s.pengambil_keputusan,
        'No Telepon': s.no_telepon,
        'Total Omset LCD': s.total_omset_lcd,
        'Data LCD': dataLcdStr,
        'Order LCD Dari': s.order_lcd_dari,
        'Total Omset Batrai': s.total_omset_batrai,
        'Data Batrai': dataBatraiStr,
        'Order Batrai Dari': s.order_batrai_dari,
        'Status Regist': s.status_regist,
        'Butuh Support': s.butuh_support,
        'Ada Stok LCD & Batrai': s.ada_stok_lcd_batrai,
        'Koordinat GPS': s.latitude && s.longitude ? `${s.latitude}, ${s.longitude}` : '-',
        'Foto Toko': s.foto_toko ? 'Ada Foto' : 'Tidak Ada',
        'Status Validasi': s.status_validation || 'Valid',
        'Tanggal Input': new Date(s.created_at).toLocaleDateString()
      };

      if (s.extra_data) {
        Object.entries(s.extra_data).forEach(([key, val]) => {
          const fieldConfig = formFields.find(f => f.name === key);
          const label = fieldConfig ? fieldConfig.label : key;
          baseRow[label] = val;
        });
      }
      return baseRow;
    });

    const worksheet = XLSX.utils.json_to_sheet(mappedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data Survey");
    XLSX.writeFile(workbook, "Data_Survey_Channel.xlsx");
  };

  const handleDownloadHtml = async () => {
    let formFields: any[] = [];
    try {
      const { data } = await supabase.from('form_configs').select('fields_config').eq('form_id', 'survey_channel').single();
      if (data && data.fields_config) formFields = data.fields_config;
    } catch(e) {}
    
    const html = buildSurveyChannelHtml(Object(import.meta.env).VITE_SUPABASE_URL || '', Object(import.meta.env).VITE_SUPABASE_ANON_KEY || '', formFields);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Survey_Channel_App.html';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePreviewHtml = async () => {
    let formFields: any[] = [];
    try {
      const { data } = await supabase.from('form_configs').select('fields_config').eq('form_id', 'survey_channel').single();
      if (data && data.fields_config) formFields = data.fields_config;
    } catch(e) {}
    
    const html = buildSurveyChannelHtml(Object(import.meta.env).VITE_SUPABASE_URL || '', Object(import.meta.env).VITE_SUPABASE_ANON_KEY || '', formFields);
    setPreviewHtml(html);
  };

  const handleShare = () => {
    const url = new URL(window.location.origin + window.location.pathname);
    if (url.hostname.startsWith('ais-dev-')) {
      url.hostname = url.hostname.replace('ais-dev-', 'ais-pre-');
    }
    url.searchParams.set('view', 'survey');
    url.searchParams.set('shared', 'true');
    navigator.clipboard.writeText(url.toString()).then(() => {
      showAlert('Link berhasil disalin! Anda bisa membagikannya.', 'success');
    }).catch(err => {
      console.error('Failed to copy link: ', err);
      showAlert('Gagal menyalin link.', 'error');
    });
  };

  const filteredSurveys = surveys.filter(s => 
    s.nama_toko?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.cabang?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.salesman_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const targetData = salesmen.map(sales => {
    const dbTarget = salesTargets.find(t => t.salesman_name === sales.salesman_name)?.target_value || 0;
    const actual = surveys.filter(s => s.salesman_name === sales.salesman_name && s.status_validation !== 'Rejected').length;
    const kurang = Math.max(0, dbTarget - actual);
    const achieve = dbTarget > 0 ? ((actual / dbTarget) * 100).toFixed(1) : '0.0';
    
    let reward = 0;
    if (dbTarget > 0) {
      if (actual < dbTarget) {
        reward = -80000;
      } else if (actual === dbTarget) {
        reward = actual * 10000;
      } else {
        reward = (dbTarget * 10000) + ((actual - dbTarget) * 20000);
      }
    }

    return {
      salesman_name: sales.salesman_name,
      target: dbTarget,
      actual,
      kurang,
      achieve,
      reward
    };
  }).filter(data => data.actual > 0 || data.target > 0).sort((a, b) => b.actual - a.actual);

  const openTargetModal = () => {
    setTargetForms(salesmen.map(s => ({
      salesman_name: s.salesman_name,
      target_value: salesTargets.find(t => t.salesman_name === s.salesman_name)?.target_value || 0
    })));
    setSelectedSalesmen([]);
    setIsTargetModalOpen(true);
  };

  const handleSaveTargets = async () => {
    setIsSaving(true);
    try {
      const validForms = targetForms.filter(t => t.target_value > 0);
      const zeroForms = targetForms.filter(t => t.target_value === 0);
      if (zeroForms.length > 0) {
        const namesToRemove = zeroForms.map(tf => tf.salesman_name);
        const chunkSize = 50;
        for (let i = 0; i < namesToRemove.length; i += chunkSize) {
          const chunk = namesToRemove.slice(i, i + chunkSize);
          const { error: deleteError } = await supabase
            .from('sales_survey_targets')
            .delete()
            .in('salesman_name', chunk);
          if (deleteError) throw deleteError;
        }
      }

      if (validForms.length > 0) {
        const { error } = await supabase.from('sales_survey_targets').upsert(
          validForms,
          { onConflict: 'salesman_name' }
        );
        if (error) throw error;
      }
      await fetchTargets();
      setIsTargetModalOpen(false);
    } catch (err: any) {
      console.error(err);
      showAlert('Gagal menyimpan target: ' + err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isTargetModalOpen) {
    return (
      <div className="space-y-6">
        <TargetModal
          isOpen={isTargetModalOpen}
          targetForms={targetForms}
          setTargetForms={setTargetForms}
          selectedSalesmen={selectedSalesmen}
          setSelectedSalesmen={setSelectedSalesmen}
          isSaving={isSaving}
          setIsTargetModalOpen={setIsTargetModalOpen}
          handleSaveTargets={handleSaveTargets}
          setModalState={setModalState}
        />
        <ConfirmModal
          isOpen={modalState.confirmDeleteTarget}
          onClose={() => setModalState(prev => ({ ...prev, confirmDeleteTarget: false }))}
          onConfirm={() => {
            setTargetForms(targetForms.map(tf => 
              selectedSalesmen.includes(tf.salesman_name) ? { ...tf, target_value: 0 } : tf
            ));
          }}
          title="Hapus Target Terpilih"
          message={`Yakin ingin menghapus target untuk ${selectedSalesmen.length} sales yang dipilih menjadi 0?`}
          isDestructive={true}
          confirmText="Hapus Target"
        />
        <PromptModal
          isOpen={modalState.promptTarget}
          onClose={() => setModalState(prev => ({ ...prev, promptTarget: false }))}
          onConfirm={(val) => {
            if (val && !isNaN(Number(val))) {
              setTargetForms(targetForms.map(tf => 
                selectedSalesmen.includes(tf.salesman_name) ? { ...tf, target_value: Number(val) } : tf
              ));
            }
          }}
          title="Set Target Terpilih"
          message={`Masukkan nilai target untuk ${selectedSalesmen.length} sales yang dipilih:`}
          type="number"
          confirmText="Terapkan"
        />
      </div>
    );
  }

  if (isFormOpen) {
    return (
      <SurveyForm
        isOpen={isFormOpen}
        isEditing={isEditing}
        isShared={isShared}
        formData={formData}
        salesmen={salesmen}
        isSaving={isSaving}
        lcdItems={lcdItems}
        batraiItems={batraiItems}
        gettingLocation={gettingLocation}
        accuracy={accuracy}
        handleChange={handleChange}
        handleCreateOrUpdate={handleCreateOrUpdate}
        closeForm={closeForm}
        handleGetLocation={handleGetLocation}
        handlePhotoUpload={handlePhotoUpload}
        handleLcdItemChange={handleLcdItemChange}
        addLcdItem={addLcdItem}
        removeLcdItem={removeLcdItem}
        handleBatraiItemChange={handleBatraiItemChange}
        addBatraiItem={addBatraiItem}
        removeBatraiItem={removeBatraiItem}
        setFormData={setFormData}
      />
    );
  }

  return (
    <div className="space-y-6">
      <SurveyHeader 
        handleShare={handleShare}
        handleDownloadExcel={handleDownloadExcel}
        handleDownloadHtml={handleDownloadHtml}
        handlePreviewHtml={handlePreviewHtml}
        openForm={openForm}
      />

      <TargetTable 
        targetTableRef={targetTableRef}
        isShared={isShared}
        targetData={targetData}
        handleDownloadTargetImage={handleDownloadTargetImage}
        openTargetModal={openTargetModal}
      />

      <SurveyTable 
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        loading={loading}
        isShared={isShared}
        filteredSurveys={filteredSurveys}
        openForm={openForm}
        setModalState={setModalState}
        handleReject={handleReject}
      />

      <ConfirmModal
        isOpen={!!modalState.confirmDeleteId}
        onClose={() => setModalState(prev => ({ ...prev, confirmDeleteId: null }))}
        onConfirm={() => {
          if (modalState.confirmDeleteId) {
            handleDelete(modalState.confirmDeleteId);
          }
        }}
        title="Hapus Data Survey"
        message="Yakin ingin menghapus data ini? Tindakan ini tidak dapat dibatalkan."
        isDestructive={true}
        confirmText="Hapus"
      />
      
      <InstructionsModal 
        isOpen={isInstructionsOpen} 
        onClose={() => setIsInstructionsOpen(false)} 
        onContinue={handleContinueToAdd} 
      />

      {previewHtml && (
         <div className="fixed inset-0 z-[100] bg-slate-900/90 flex flex-col items-center justify-center p-2 sm:p-6 overflow-hidden">
            <div className="w-full max-w-7xl h-full flex flex-col bg-slate-100 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-slate-800">
               <div className="bg-slate-800 text-white p-3 flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-3">
                     <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                        <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                        <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                     </div>
                     <span className="text-sm font-semibold opacity-80" title="Preview Survey App">Preview App</span>
                  </div>
               </div>
               <div className="flex-1 w-full bg-white relative">
                  <iframe 
                     srcDoc={previewHtml} 
                     className="absolute inset-0 w-full h-full border-0"
                     title="Preview Survey App"
                     sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                  />
               </div>
               <div className="p-4 bg-white border-t border-slate-100 flex gap-3">
                  <button onClick={() => setPreviewHtml(null)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl transition-colors text-sm">
                     Tutup
                  </button>
                  <button onClick={() => { handleDownloadHtml(); setPreviewHtml(null); }} className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl transition-colors shadow-md shadow-indigo-500/30 text-sm flex items-center justify-center gap-2">
                     <Download className="w-4 h-4" />
                     Download App
                  </button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
}
