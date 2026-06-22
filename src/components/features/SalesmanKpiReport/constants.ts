export const METRICS = [
  { id: 'total_revenue', label: '1. Total Omset All Brand', format: 'currency', targetKey: 'target_omset_all_brand' },
  { id: 'omset_lcd', label: '2. Total Omset LCD', format: 'currency', targetKey: 'target_omset_lcd' },
  { id: 'omset_redskull', label: '3. Total Omset Redskull', format: 'currency', targetKey: 'target_omset_redskull' },
  { id: 'omset_3c', label: '4. Total Omset 3C', format: 'currency' },
  { id: 'co_3c', label: '5. Total Customer Order 3C (NOA 3C)', format: 'number', suffix: ' Toko', targetKey: 'target_co_3c' },
  { id: 'hydrogel_pcs', label: '6. Total Order Hydrogel', format: 'number', suffix: ' Pcs', targetKey: 'target_hydrogel_pcs' },
  { id: 'tg_pcs', label: '7. Total Order Tempered Glass', format: 'number', suffix: ' Pcs', targetKey: 'target_tg_pcs' },
  { id: 'new_customers', label: '8. Total New Customer Order (NOO)', format: 'number', suffix: ' Toko', targetKey: 'target_new_customer' },
  { id: 'idle_customers', label: '9. Total Idle Customer Order', format: 'number', suffix: ' Toko', targetKey: 'target_idle_customer' },
  { id: 'co_mesin_vqm', label: '10. Total CO Mesin Hydrogel', format: 'number', suffix: ' Toko', targetKey: 'target_co_mesin_vqm' },
  { id: 'co_tg', label: '11. Total CO Tempered Glass', format: 'number', suffix: ' Toko', targetKey: 'target_co_tg' },
  { id: 'omset_5jt', label: '12. Total Customer Order > 5Jt', format: 'number', suffix: ' Toko', targetKey: 'target_omset_5jt' },
  { id: 'payment_3c', label: '13. Payment 3C', format: 'currency', targetKey: 'target_payment_3c' },
  { id: 'payment_all_brand', label: '14. Payment All Brand', format: 'currency', targetKey: 'target_payment_all_brand' },
  { id: 'payment_3c_lcd', label: '15. Payment 3C + Omset LCD', format: 'currency', targetKey: 'target_payment_3c_lcd' },
  { id: 'program_bulanan_achieved', label: '16. Program Bulanan', format: 'number', suffix: ' Toko', targetKey: 'target_program_bulanan' },
  { id: 'program_spu_achieved', label: '17. Program SPU', format: 'number', suffix: ' Toko', targetKey: 'target_spu' },
  { id: 'visit_customer', label: '18. Visit Customer', format: 'percentage', targetKey: 'target_visit_customer' },
  { id: 'perbaikan_display', label: '19. Perbaikan Display', format: 'number', suffix: ' Toko', targetKey: 'target_perbaikan_display' },
  { id: 'pemasangan_spanduk', label: '20. Pemasangan Spanduk Stiker', format: 'number', suffix: ' Toko', targetKey: 'target_pemasangan_spanduk' },
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
