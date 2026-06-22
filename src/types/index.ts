export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  created_at: string;
};

export type UploadLog = {
  id: string;
  user_id: string;
  file_name: string;
  upload_date: string;
  record_count: number;
  status: 'pending' | 'success' | 'error';
  error_message?: string;
};

export type SalesData = {
  id: string;
  upload_id: string;
  transaction_date: string;
  region: string;
  sales_rep?: string;
  revenue: number;
  units_sold: number;
  created_at: string;
};

export type KpiTarget = {
  id: string;
  region: string;
  period: string;
  target_revenue: number;
  target_units?: number;
  created_at: string;
};
