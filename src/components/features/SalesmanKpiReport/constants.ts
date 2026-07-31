export type MetricDef = {
  id: string;
  label: string;
  format: 'currency' | 'number' | 'percentage';
  targetKey?: string;
  suffix?: string;
};

export const METRICS: MetricDef[] = [
  { id: 'total_revenue', label: 'Total Omset All Brand', format: 'currency', targetKey: 'target_omset_all_brand' },
  { id: 'omset_lcd', label: 'SD LCD', format: 'currency', targetKey: 'target_omset_lcd' },
  { id: 'omset_redskull', label: 'REDSKULL', format: 'currency', targetKey: 'target_omset_redskull' },
  { id: 'omset_3c', label: 'Total Omset 3C', format: 'currency' },
  { id: 'co_3c', label: 'Total CO 3C', format: 'number', targetKey: 'target_co_3c', suffix: ' Toko' },
  { id: 'hydrogel_pcs', label: 'Hydrogel PCS', format: 'number', targetKey: 'target_hydrogel_pcs', suffix: ' Pcs' },
  { id: 'tg_pcs', label: 'TG PCS', format: 'number', targetKey: 'target_tg_pcs', suffix: ' Pcs' },
  { id: 'new_customers', label: 'New Customer', format: 'number', targetKey: 'target_new_customer', suffix: ' Toko' },
  { id: 'idle_customers', label: 'CO IDLE', format: 'number', targetKey: 'target_idle_customer', suffix: ' Toko' },
  { id: 'co_mesin_vqm', label: 'CO MESIN', format: 'number', targetKey: 'target_co_mesin_vqm', suffix: ' Toko' },
  { id: 'co_tg', label: 'CO TG', format: 'number', targetKey: 'target_co_tg', suffix: ' Toko' },
  { id: 'omset_5jt', label: 'CO 5JT', format: 'number', targetKey: 'target_omset_5jt', suffix: ' Toko' },
  { id: 'payment_3c', label: 'Payment 3C', format: 'currency', targetKey: 'target_payment_3c' },
  { id: 'payment_all_brand', label: 'Payment All Brand', format: 'currency', targetKey: 'target_payment_all_brand' },
  { id: 'payment_3c_lcd', label: 'Payment 3C + SD LCD', format: 'currency', targetKey: 'target_payment_3c_lcd' },
  { id: 'program_bulanan_achieved', label: 'Program Bulanan', format: 'number', targetKey: 'target_program_bulanan', suffix: ' Toko' },
  { id: 'program_spu_achieved', label: 'Program SPU', format: 'number', targetKey: 'target_spu', suffix: ' Toko' },
  { id: 'visit_customer', label: 'Visit Customer', format: 'percentage', targetKey: 'target_visit_customer' },
  { id: 'perbaikan_display', label: 'Perbaikan Display', format: 'number', targetKey: 'target_perbaikan_display', suffix: ' Toko' },
  { id: 'pemasangan_spanduk', label: 'Pemasangan Spanduk Stiker', format: 'number', targetKey: 'target_pemasangan_spanduk', suffix: ' Toko' },
];

export const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
};

export const kpiGenieAnimation = {
  hidden: { 
    opacity: 0, 
    rotateX: -70,
  },
  visible: { 
    opacity: 1, 
    rotateX: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut"
    } as any
  },
  exit: { 
    opacity: 0, 
    rotateX: -70,
    transition: {
      duration: 0.3,
      ease: "easeIn"
    } as any
  }
} as const;
