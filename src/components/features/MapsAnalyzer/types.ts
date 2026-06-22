declare global {
  interface Window {
    google: any;
  }
}

export interface LocationInfo {
  finalUrl: string;
  lat: number | null;
  lng: number | null;
  title: string | null;
  address: string | null;
  district: string | null;
  city: string | null;
  isApproximate?: boolean;
  placeType?: string | null;
  rating?: number | null;
  userRatingCount?: number | null;
}

export interface SavedMapData {
  id: string;
  nama_customer: string;
  kecamatan_kota: string;
  alamat_lengkap: string;
  lat: number | null;
  lng: number | null;
  final_url: string;
  rating?: number | null;
  user_rating_count?: number | null;
  place_type?: string | null;
  created_at: string;
  distance?: number | null;
}
