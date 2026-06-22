import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { supabase } from '../../../services/supabase';
import { useAlert } from '../../ui/AlertModal';
import { MapPin, Camera, RefreshCw, Smartphone, Loader2, Save, Image as ImageIcon, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function SurveyLcd({ initialData, onClose }: { initialData?: any, onClose?: () => void } = {}) {
  const { showAlert } = useAlert();
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [formData, setFormData] = useState({
    nama_toko: initialData?.nama_toko || '',
    no_telp: initialData?.no_telp || '',
    brand_lcd: initialData?.brand_lcd || '',
    qty_lcd: initialData?.qty_lcd || '',
    omset_lcd: initialData?.omset_lcd || '',
    order_lcd_dari: initialData?.order_lcd_dari || '',
    brand_baterai: initialData?.brand_baterai || '',
    qty_baterai: initialData?.qty_baterai || '',
    omset_baterai: initialData?.omset_baterai || '',
    order_baterai_dari: initialData?.order_baterai_dari || '',
    latitude: initialData?.latitude?.toString() || '',
    longitude: initialData?.longitude?.toString() || '',
    alamat_asli: initialData?.alamat_asli || '',
  });

  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(initialData?.foto_toko || null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      let allData: any[] = [];
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase.from('survey_lcd')
          .select('*')
          .order('created_at', { ascending: false })
          .range(page * 1000, (page + 1) * 1000 - 1);
        if (error) throw error;
        if (!data || data.length === 0) {
          hasMore = false;
        } else {
          allData = [...allData, ...data];
          if (data.length < 1000) hasMore = false;
          else page++;
        }
      }

      if (allData.length === 0) {
        showAlert('Tidak ada data survey LCD untuk diunduh.', 'info');
        return;
      }
      
      const mappedData = allData.map(item => ({
        'Tanggal': item.created_at ? new Date(item.created_at).toLocaleString('id-ID') : '',
        'Nama Toko': item.nama_toko,
        'No Telepon': item.no_telp,
        'Brand LCD': item.brand_lcd,
        'Qty LCD': item.qty_lcd,
        'Omset LCD': item.omset_lcd,
        'Order LCD Dari': item.order_lcd_dari,
        'Brand Baterai': item.brand_baterai,
        'Qty Baterai': item.qty_baterai,
        'Omset Baterai': item.omset_baterai,
        'Order Baterai Dari': item.order_baterai_dari,
        'Alamat Terdeteksi': item.alamat_asli,
        'Latitude': item.latitude,
        'Longitude': item.longitude
      }));

      const worksheet = XLSX.utils.json_to_sheet(mappedData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Data Survey LCD");
      XLSX.writeFile(workbook, "Data_Survey_LCD.xlsx");
    } catch (err: any) {
      console.error(err);
      showAlert(`Gagal mengunduh data: ${err.message}`, 'error');
    } finally {
      setDownloading(false);
    }
  };

  const loadContacts = async () => {
    if ('contacts' in navigator && 'ContactsManager' in window) {
      if (window.self !== window.top) {
        showAlert('Browser membatasi akses kontak di dalam mode preview (iframe). Silakan buka aplikasi di tab baru (publish) untuk menggunakan fitur ini.', 'warning');
        return;
      }
      
      try {
        const props = ['name', 'tel'];
        const opts = { multiple: false };
        const contacts = await (navigator as any).contacts.select(props, opts);
        if (contacts && contacts.length > 0) {
          const firstContact = contacts[0];
          const phoneNumber = firstContact.tel && firstContact.tel.length > 0 ? firstContact.tel[0] : '';
          setFormData(prev => ({ ...prev, no_telp: phoneNumber }));
          // Optional: You could fill nama_toko if appropriate, but let's just do tel
        }
      } catch (ex) {
        console.error('Error fetching contacts:', ex);
        showAlert('Tidak dapat mengakses kontak.', 'warning');
      }
    } else {
      showAlert('Browser Anda tidak mendukung fitur pilih kontak.', 'info');
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      showAlert('Geolocation tidak didukung oleh browser Anda.', 'error');
      return;
    }

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

        // Reverse GeoCoding using Nominatim
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          if (res.ok) {
            const data = await res.json();
            setFormData(prev => ({ ...prev, alamat_asli: data.display_name }));
            
            if (locAccuracy > 30) {
              showAlert(`Lokasi ditemukan namun akurasi kurang baik (${Math.round(locAccuracy)}m). Coba refresh koordinat jika Anda berada di luar ruangan.`, 'warning');
            }
          }
        } catch (err) {
          console.error('Error reverse geocoding:', err);
        }
        setGettingLocation(false);
      },
      (error) => {
        console.error(error);
        showAlert('Gagal mendapatkan lokasi GPS.', 'error');
        setGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  useEffect(() => {
    document.title = "Survey LCD";
    let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.getElementsByTagName('head')[0].appendChild(link);
    }
    link.href = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📱</text></svg>';
    if (!initialData?.latitude) {
        handleGetLocation(); // Auto get location on load if no initial data
    }
  }, []);

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const elem = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          const MAX_DIM = 800;
          if (width > height) {
            if (width > MAX_DIM) {
              height *= MAX_DIM / width;
              width = MAX_DIM;
            }
          } else {
            if (height > MAX_DIM) {
              width *= MAX_DIM / height;
              height = MAX_DIM;
            }
          }
          
          elem.width = width;
          elem.height = height;
          const ctx = elem.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          let quality = 0.8;
          let dataUrl = elem.toDataURL('image/jpeg', quality);
          
          while (Math.round((dataUrl.length * 3) / 4) / 1024 > 100 && quality > 0.1) {
            quality -= 0.1;
            dataUrl = elem.toDataURL('image/jpeg', quality);
          }
          
          resolve(dataUrl);
        };
      };
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Compress image to aim for ~100kb max
    const compressedBase64 = await compressImage(file);
    setPhotoPreview(compressedBase64);
  };

  const openCamera = () => cameraInputRef.current?.click();
  const openGalery = () => fileInputRef.current?.click();

  const handleSave = async () => {
    if (!formData.nama_toko || !formData.latitude || (!photoPreview && !initialData?.id)) {
      showAlert('Pastikan nama toko, lokasi GPS, dan foto sudah terisi!', 'warning');
      return;
    }
    
    setLoading(true);
    try {
      let error;
      const payload = {
        ...formData,
      };
      // only update foto_toko if changed/new
      if (photoPreview) {
        payload.foto_toko = photoPreview;
      }

      if (initialData?.id) {
        const { error: updateError } = await supabase.from('survey_lcd').update(payload).eq('id', initialData.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase.from('survey_lcd').insert([payload]);
        error = insertError;
      }
      
      if (error) throw error;
      
      showAlert(initialData?.id ? 'Data survey berhasil diperbarui!' : 'Data survey berhasil disimpan!', 'success');
      // Reset form
      setFormData({
        nama_toko: '',
        no_telp: '',
        brand_lcd: '',
        qty_lcd: '',
        omset_lcd: '',
        order_lcd_dari: '',
        brand_baterai: '',
        qty_baterai: '',
        omset_baterai: '',
        order_baterai_dari: '',
        latitude: '',
        longitude: '',
        alamat_asli: '',
      });
      setPhotoPreview(null);
      setAccuracy(null);
      handleGetLocation(); // refreshing location for next survey
      
      if (onClose) {
        onClose();
      }
    } catch (err: any) {
      console.error(err);
      showAlert(`Gagal menyimpan data: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-2 mb-20 w-full mx-auto">
      <Card>
        <CardHeader className="bg-indigo-600 text-white rounded-t-xl flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <MapPin className="w-6 h-6" />
            Survey LCD & Baterai
          </CardTitle>
          <Button 
            onClick={handleDownload} 
            disabled={downloading}
            variant="outline" 
            size="sm"
            className="bg-white/10 hover:bg-white/20 text-white border-white/20"
          >
            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            Download Data
          </Button>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nama Toko *</label>
              <input
                type="text"
                name="nama_toko"
                value={formData.nama_toko}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="Masukkan nama toko"
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">No Telepon</label>
              <div className="flex gap-2">
                <input
                  type="tel"
                  name="no_telp"
                  value={formData.no_telp}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="0812xxx"
                />
                <Button type="button" onClick={loadContacts} title="Pilih dari kontak" variant="outline">
                  <Smartphone className="w-5 h-5" />
                </Button>
              </div>
            </div>
            
            <div className="p-4 bg-blue-50/50 rounded-xl space-y-4 border border-blue-100">
              <h3 className="font-bold text-blue-800">Data LCD</h3>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Brand LCD di Toko</label>
                <input type="text" name="brand_lcd" value={formData.brand_lcd} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" placeholder="Contoh: Vivan, OG, Meeloo" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Qty per Bulan</label>
                  <input type="number" name="qty_lcd" value={formData.qty_lcd} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" placeholder="100" />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Est Omset (Rp)</label>
                  <input type="number" name="omset_lcd" value={formData.omset_lcd} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" placeholder="5000000" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Order Dari Mana?</label>
                <input type="text" name="order_lcd_dari" value={formData.order_lcd_dari} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" placeholder="Sales distributor, Tokopedia, dll" />
              </div>
            </div>

            <div className="p-4 bg-emerald-50/50 rounded-xl space-y-4 border border-emerald-100">
              <h3 className="font-bold text-emerald-800">Data Baterai</h3>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Brand Baterai di Toko</label>
                <input type="text" name="brand_baterai" value={formData.brand_baterai} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" placeholder="Contoh: Vivan, Brader" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Qty per Bulan</label>
                  <input type="number" name="qty_baterai" value={formData.qty_baterai} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" placeholder="50" />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Est Omset (Rp)</label>
                  <input type="number" name="omset_baterai" value={formData.omset_baterai} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" placeholder="3000000" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Order Dari Mana?</label>
                <input type="text" name="order_baterai_dari" value={formData.order_baterai_dari} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" />
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> Koordinat GPS
                </h3>
                <Button type="button" onClick={handleGetLocation} size="sm" variant="outline" disabled={gettingLocation}>
                  {gettingLocation ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
                  Refresh
                </Button>
              </div>

              {accuracy !== null && (
                <div className={`p-2 rounded text-xs text-center border font-medium ${accuracy <= 30 ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                  Akurasi: {Math.round(accuracy)} meter {accuracy > 30 ? '(Kurang Akurat)' : '(Akurat)'}
                </div>
              )}

              {formData.alamat_asli ? (
                <div className="text-sm text-slate-600 border p-3 rounded-lg bg-white shadow-inner">
                  <span className="block font-semibold mb-1">Alamat Terdeteksi:</span>
                  {formData.alamat_asli}
                </div>
              ) : (
                <div className="text-sm text-slate-500 italic p-3 text-center border border-dashed rounded-lg">
                  {gettingLocation ? 'Mencari lokasi...' : 'Lokasi belum ditemukan'}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700">Foto Toko *</label>
              
              <div className="flex gap-2 mb-2">
                <Button type="button" onClick={openCamera} className="w-full flex items-center justify-center gap-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200" variant="outline">
                  <Camera className="w-4 h-4" /> Kamera
                </Button>
                <Button type="button" onClick={openGalery} className="w-full flex items-center justify-center gap-2" variant="outline">
                  <ImageIcon className="w-4 h-4" /> Galeri
                </Button>
              </div>

              <input 
                type="file" 
                accept="image/*" 
                capture="environment" 
                ref={cameraInputRef} 
                className="hidden" 
                onChange={handleFileChange} 
              />
              <input 
                type="file" 
                accept="image/*" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleFileChange} 
              />
              
              {photoPreview && (
                <div className="relative rounded-lg overflow-hidden border">
                  <img src={photoPreview} alt="Preview" className="w-full h-auto max-h-64 object-cover" />
                  <Button type="button" size="sm" variant="destructive" className="absolute top-2 right-2" onClick={() => setPhotoPreview(null)}>
                    Hapus
                  </Button>
                </div>
              )}
            </div>
            
          </div>
          
          <Button 
            onClick={handleSave} 
            disabled={loading} 
            className="w-full h-12 text-lg font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"
          >
            {loading ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Sedang Menyimpan...</>
            ) : (
              <><Save className="w-5 h-5 mr-2" /> Simpan Survey</>
            )}
          </Button>

        </CardContent>
      </Card>
    </div>
  );
}
