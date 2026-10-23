import { supabase } from './supabase';

export interface LcdReturItem {
  id?: string;
  customer_code: string;
  customer_name: string;
  goods_code: string; // Type / Kode Barang
  goods_name: string; // Nama Barang
  no_so: string;      // No Sales Order
  no_sd: string;      // No Surat Jalan / Delivery
  tgl_so?: string | null;
  brand?: string;
  category?: string;
  date?: string;
}

export interface LcdSoSdOption {
  no_so: string;
  no_sd: string;
  tgl_so?: string | null;
  month_year: string; // e.g. "Oktober 2024"
  raw_item?: LcdReturItem;
}

// Fallback sample data to allow immediate testing if table is empty
export const FALLBACK_LCD_RECORDS: LcdReturItem[] = [
  {
    id: 'demo-1',
    customer_code: 'CUST-BDG-001',
    customer_name: 'BERKAH CELL BANDUNG',
    goods_code: 'LC-SAM-A50',
    goods_name: 'LCD SAMSUNG A50 / A50S / A30S OLED HITAM',
    no_so: 'SO-2026-0412',
    tgl_so: '2026-04-12',
    no_sd: 'SD-2026-0889',
    brand: 'Samsung',
    category: 'LCD'
  },
  {
    id: 'demo-2',
    customer_code: 'CUST-BDG-014',
    customer_name: 'CENTRAL PHONE ITC',
    goods_code: 'LC-OPP-A5S',
    goods_name: 'LCD OPPO A5S / A7 / A12 / REALME 3 OG CROWN',
    no_so: 'SO-2026-0415',
    tgl_so: '2026-04-15',
    no_sd: 'SD-2026-0895',
    brand: 'Oppo',
    category: 'LCD'
  },
  {
    id: 'demo-3',
    customer_code: 'CUST-BDG-022',
    customer_name: 'GLOBAL FLASH CELL',
    goods_code: 'LC-IPH-11',
    goods_name: 'LCD IPHONE 11 INCEL / ZY HITAM',
    no_so: 'SO-2026-0420',
    tgl_so: '2026-04-20',
    no_sd: 'SD-2026-0902',
    brand: 'iPhone',
    category: 'LCD'
  },
  {
    id: 'demo-4',
    customer_code: 'CUST-BDG-035',
    customer_name: 'SINAR JAYA TELEKOMUNIKASI',
    goods_code: 'LC-XIA-RN8',
    goods_name: 'LCD XIAOMI REDMI NOTE 8 MEETOO HITAM',
    no_so: 'SO-2026-0428',
    tgl_so: '2026-04-28',
    no_sd: 'SD-2026-0914',
    brand: 'Xiaomi',
    category: 'LCD'
  },
  {
    id: 'demo-5',
    customer_code: 'CUST-BDG-048',
    customer_name: 'METRO KOMPUNIKA',
    goods_code: 'LC-VIV-Y12',
    goods_name: 'LCD VIVO Y12 / Y15 / Y17 CROWN HITAM',
    no_so: 'SO-2026-0433',
    tgl_so: '2026-04-33',
    no_sd: 'SD-2026-0925',
    brand: 'Vivo',
    category: 'LCD'
  }
];

const INDONESIAN_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

/**
 * Format date string into Indonesian Month and Year (e.g. "Oktober 2024")
 */
export function formatMonthYearId(dateStr?: string | null): string {
  if (!dateStr) return '';
  const clean = String(dateStr).trim();
  if (!clean) return '';

  try {
    // 1. Check DD/MM/YYYY or DD-MM-YYYY
    const dmyMatch = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dmyMatch) {
      const monthIdx = parseInt(dmyMatch[2], 10) - 1;
      const year = dmyMatch[3];
      if (monthIdx >= 0 && monthIdx < 12) {
        return `${INDONESIAN_MONTHS[monthIdx]} ${year}`;
      }
    }

    // 2. Check YYYY-MM-DD or YYYY/MM/DD
    const ymdMatch = clean.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    if (ymdMatch) {
      const year = ymdMatch[1];
      const monthIdx = parseInt(ymdMatch[2], 10) - 1;
      if (monthIdx >= 0 && monthIdx < 12) {
        return `${INDONESIAN_MONTHS[monthIdx]} ${year}`;
      }
    }

    // 3. Fallback to standard Date object
    const d = new Date(clean);
    if (!isNaN(d.getTime())) {
      return `${INDONESIAN_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    }
  } catch (err) {
    // ignore
  }

  return clean;
}

/**
 * Fetch all records from database_lcd with pagination loop (.range)
 */
export async function fetchAllLcdRecords(): Promise<LcdReturItem[]> {
  try {
    let allData: LcdReturItem[] = [];
    let from = 0;
    let to = 999;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('database_lcd')
        .select('*')
        .range(from, to)
        .limit(1000);

      if (error) {
        console.warn('Error fetching database_lcd chunk:', error);
        break;
      }

      if (data && data.length > 0) {
        const mapped = data.map((item: any) => ({
          id: item.id,
          customer_code: item.kode_customer || item.customer_code || item.id_toko || '',
          customer_name: item.nama_customer || item.customer_name || item.nama_toko || '',
          goods_code: item.kode_barang || item.goods_code || item.type || '',
          goods_name: item.nama_barang || item.goods_name || '',
          no_so: item.no_so || '',
          tgl_so: item.tgl_so || item.date || item.tanggal || null,
          no_sd: item.no_sd || item.no_surat_jalan || '',
          brand: item.brand || item.merk || 'LCD',
          category: 'LCD',
          date: item.tgl_so || item.date || item.tanggal || ''
        }));
        allData = [...allData, ...mapped];

        if (data.length < 1000) {
          hasMore = false;
        } else {
          from += 1000;
          to += 1000;
        }
      } else {
        hasMore = false;
      }
    }

    if (allData.length > 0) {
      return allData;
    }
  } catch (err) {
    console.warn('Could not query database_lcd table directly:', err);
  }

  // Return fallback demo items if database table has 0 items
  return FALLBACK_LCD_RECORDS;
}

/**
 * Searches the LCD Database by No SO, No SD, or general keyword.
 */
export async function searchLcdDatabase(params: {
  no_so?: string;
  no_sd?: string;
  keyword?: string;
}): Promise<LcdReturItem[]> {
  const soTerm = params.no_so?.trim().toLowerCase() || '';
  const sdTerm = params.no_sd?.trim().toLowerCase() || '';
  const keyTerm = params.keyword?.trim().toLowerCase() || '';

  try {
    let query = supabase.from('database_lcd').select('*');

    if (soTerm) {
      query = query.ilike('no_so', `%${soTerm}%`);
    }
    if (sdTerm) {
      query = query.ilike('no_sd', `%${sdTerm}%`);
    }
    if (keyTerm) {
      query = query.or(`nama_customer.ilike.%${keyTerm}%,kode_customer.ilike.%${keyTerm}%,nama_barang.ilike.%${keyTerm}%,kode_barang.ilike.%${keyTerm}%,no_so.ilike.%${keyTerm}%,no_sd.ilike.%${keyTerm}%`);
    }

    const { data, error } = await query.order('created_at', { ascending: false }).limit(50);

    if (!error && data && data.length > 0) {
      return data.map((item: any) => ({
        id: item.id,
        customer_code: item.kode_customer || item.customer_code || item.id_toko || '',
        customer_name: item.nama_customer || item.customer_name || item.nama_toko || '',
        goods_code: item.kode_barang || item.goods_code || item.type || '',
        goods_name: item.nama_barang || item.goods_name || '',
        no_so: item.no_so || '',
        tgl_so: item.tgl_so || item.date || item.tanggal || null,
        no_sd: item.no_sd || item.no_surat_jalan || '',
        brand: item.brand || item.merk || 'LCD',
        category: 'LCD',
        date: item.tgl_so || item.date || item.tanggal || ''
      }));
    }
  } catch (err) {
    console.warn('Could not query database_lcd table directly:', err);
  }

  return FALLBACK_LCD_RECORDS.filter(item => {
    const matchSO = !soTerm || item.no_so.toLowerCase().includes(soTerm);
    const matchSD = !sdTerm || item.no_sd.toLowerCase().includes(sdTerm);
    const matchKey = !keyTerm || 
      item.customer_name.toLowerCase().includes(keyTerm) ||
      item.customer_code.toLowerCase().includes(keyTerm) ||
      item.goods_name.toLowerCase().includes(keyTerm) ||
      item.goods_code.toLowerCase().includes(keyTerm) ||
      item.no_so.toLowerCase().includes(keyTerm) ||
      item.no_sd.toLowerCase().includes(keyTerm);

    return matchSO && matchSD && matchKey;
  });
}
