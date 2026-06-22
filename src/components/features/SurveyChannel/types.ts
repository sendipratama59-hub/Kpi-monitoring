export interface InfoItem {
  brand: string;
  harga: string;
}

export interface SurveyData {
  id: string;
  cabang: string;
  kecamatan: string;
  nama_toko: string;
  salesman_name: string;
  alamat_toko: string;
  pengambil_keputusan: string;
  no_telepon: string;
  total_omset_lcd: number;
  data_lcd: string;
  order_lcd_dari: string;
  total_omset_batrai: number;
  data_batrai: string;
  order_batrai_dari: string;
  status_regist: string;
  butuh_support: string;
  ada_stok_lcd_batrai: string;
  foto_toko?: string;
  latitude?: string;
  longitude?: string;
  extra_data?: Record<string, any>;
  status_validation?: string;
  created_at: string;
}
