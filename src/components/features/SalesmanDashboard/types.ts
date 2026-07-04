export interface Salesman {
  code: string;
  name: string;
}

export interface KpiSummary {
  salesman_code: string;
  salesman_name: string;
  total_revenue: number;
  target_revenue: number;
  omset_lcd?: number;
  omset_redskull?: number;
  omset_3c?: number;
}

export interface Piutang {
  id?: string;
  delivery_no: string;
  customer_code: string;
  customer_name: string;
  total_amount: number;
  created_at?: string;
}

export interface UnvisitedCustomer {
  customer_code: string;
  customer_name: string;
}
