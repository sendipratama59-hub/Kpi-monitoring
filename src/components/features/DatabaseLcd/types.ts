export interface DatabaseLcdItem {
  id?: string;
  kode_barang: string;
  nama_barang: string;
  kode_customer: string;
  nama_customer: string;
  no_so: string;
  tgl_so?: string | null;
  no_sd: string;
  created_at?: string;
  updated_at?: string;
}

export interface DatabaseLcdStats {
  total: number;
  uniqueCustomers: number;
  uniqueSo: number;
  uniqueProducts: number;
}
