export interface MasterLcdItem {
  id?: string;
  kode_lcd: string;
  brand_hp: string;
  status_lcd?: string;
  oled_soft_oled?: string;
  iphone_new?: string;
  batrai_iphone?: string;
  nama_lcd: string;
  model_lcd: string;
  packing: number;
  harga_box: number;
  harga_pcs: number;
  stock: number;
  brand_: string; // 'VIVAN', 'XPAS', etc.
  brand_lcd?: string;
  raw_data?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
  // Computed discount fields
  original_harga_box?: number;
  original_harga_pcs?: number;
  applied_discount_text?: string;
  discount_amount_pcs?: number;
}

export type DiscountType = 'percentage' | 'nominal_pcs' | 'nominal_box';

export interface DiscountRule {
  id: string;
  name?: string;
  targetBrandHp: string; // 'ALL' or specific e.g. 'IPHONE', 'SAMSUNG'
  targetStatusLcd: string; // 'ALL' or specific e.g. 'nonupgrade', 'upgrade'
  targetOled: string; // 'ALL' or specific e.g. 'OLED', 'Soft OLED'
  targetBrandLcd: string; // 'ALL', 'VIVAN', 'XPAS'
  discountType: DiscountType; // 'percentage' | 'nominal_pcs' | 'nominal_box'
  discountValue: number; // e.g. 5 (%) or 10000 (Rp)
  isActive: boolean;
}

export interface ColumnDefinition {
  key: string;
  label: string;
  defaultVisible: boolean;
  align?: 'left' | 'center' | 'right';
  format?: 'text' | 'number' | 'currency' | 'badge';
  width?: string;
}

export const DEFAULT_COLUMNS: ColumnDefinition[] = [
  { key: 'kode_lcd', label: 'Kode LCD', defaultVisible: true, align: 'left', format: 'text', width: 'w-28' },
  { key: 'brand_hp', label: 'Brand HP', defaultVisible: true, align: 'center', format: 'badge', width: 'w-24' },
  { key: 'status_lcd', label: 'Status LCD', defaultVisible: false, align: 'center', format: 'text', width: 'w-28' },
  { key: 'oled_soft_oled', label: 'OLED / Soft OLED', defaultVisible: false, align: 'center', format: 'text', width: 'w-32' },
  { key: 'iphone_new', label: 'iPhone New', defaultVisible: false, align: 'center', format: 'text', width: 'w-28' },
  { key: 'batrai_iphone', label: 'Batrai iPhone', defaultVisible: false, align: 'center', format: 'text', width: 'w-28' },
  { key: 'nama_lcd', label: 'Nama LCD', defaultVisible: true, align: 'left', format: 'text', width: 'w-72' },
  { key: 'model_lcd', label: 'Model LCD', defaultVisible: true, align: 'left', format: 'text', width: 'w-48' },
  { key: 'packing', label: 'Packing', defaultVisible: true, align: 'center', format: 'number', width: 'w-20' },
  { key: 'harga_box', label: 'Harga Box', defaultVisible: true, align: 'right', format: 'currency', width: 'w-32' },
  { key: 'harga_pcs', label: 'Harga Pcs', defaultVisible: true, align: 'right', format: 'currency', width: 'w-32' },
  { key: 'applied_discount_text', label: 'Diskon', defaultVisible: false, align: 'center', format: 'badge', width: 'w-24' },
  { key: 'stock', label: 'Stock', defaultVisible: true, align: 'center', format: 'number', width: 'w-20' },
  { key: 'brand_', label: 'Brand LCD', defaultVisible: true, align: 'center', format: 'badge', width: 'w-24' },
];

export interface MasterLcdStats {
  totalItems: number;
  vivanCount: number;
  xpasCount: number;
  otherCount: number;
  totalStock: number;
  totalBrandsHp: number;
}

export type { MasterLcdTemplate, MasterLcdTemplateConfig } from './templateService';
