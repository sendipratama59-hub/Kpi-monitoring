import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { supabase } from '../../../services/supabase';
import { 
  Search, 
  Loader2, 
  Calendar, 
  TrendingUp, 
  Clock, 
  Package, 
  Store, 
  ChevronRight,
  TrendingDown,
  BarChart4,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  Target,
  RefreshCw,
  Lock,
  Unlock,
  GripVertical,
  ChevronDown
} from 'lucide-react';
import { cn } from '../../../utils/cn';
import { format, startOfMonth, subMonths, isSameMonth, parseISO, getDay, startOfDay } from 'date-fns';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { motion, Reorder, AnimatePresence } from 'motion/react';
import { NotaModal } from './NotaModal';

interface Customer {
  customer_code: string;
  customer_name: string;
}

interface OrderRecord {
  order_date: string;
  total_amount: number;
  goods_name: string;
  qty: number;
  hydrogel_pcs?: number;
  lcd_pcs?: number;
  brand_name?: string;
  omset_lcd?: number;
  category?: string;
}

const DAYS_NAME = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

const DEFAULT_LAYOUT = [
  'INFO_MTD',
  'LAST_ORDER',
  'TREND_CHART',
  'COMPARE_PRODUCT',
  'DAY_FREQ',
  'DIAGNOSIS',
  'VISIT_PLAN',
  'PRODUCT_FREQ',
  'PRODUCT_GAP',
  'KPI_CUSTOMER',
  'PAYMENT_LIST',
  'PIUTANG_LIST',
  'ORDER_HISTORY'
];

export function CustomerAnalysis() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCust, setSelectedCust] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCustDropdown, setShowCustDropdown] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const productComparisonRef = useRef<HTMLDivElement>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [layoutOrder, setLayoutOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('customer_analysis_layout');
    if (saved) {
      const parsed = JSON.parse(saved);
      return Array.from(new Set([...parsed, ...DEFAULT_LAYOUT]));
    }
    return DEFAULT_LAYOUT;
  });

  const saveLayout = (newLayout: string[]) => {
    setLayoutOrder(newLayout);
    localStorage.setItem('customer_analysis_layout', JSON.stringify(newLayout));
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      let allCustomers: Customer[] = [];
      let from = 0;
      let hasMore = true;
      
      while (hasMore) {
        const { data, error } = await supabase
          .from('salesman_customer')
          .select('customer_code, customer_name')
          .order('customer_name')
          .range(from, from + 999);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          allCustomers = [...allCustomers, ...data];
          if (data.length < 1000) {
            hasMore = false;
          } else {
            from += 1000;
          }
        } else {
          hasMore = false;
        }
      }
      
      setCustomers(allCustomers);
    } catch (err) {
      console.error(err);
    }
  };

  const [paymentData, setPaymentData] = useState({ 
    orderanLunas: 0, 
    orderanLunas3c: 0,
    orderanLunasLcd: 0,
    orderanLunasDll: 0,
    sisaPiutang: 0,
    sisaPiutang3c: 0,
    sisaPiutangLcd: 0,
    sisaPiutangDll: 0
  });

  const [paymentList, setPaymentList] = useState<any[]>([]);
  const [piutangList, setPiutangList] = useState<any[]>([]);
  const [selectedPiutang, setSelectedPiutang] = useState<any>(null);

  const fetchAllWithPagination = async (table: string, filters: Record<string, any>, operators: Array<{op: string, field: string, val: string}> = [], order?: {field: string, asc: boolean}) => {
    let allData: any[] = [];
    let hasMore = true;
    let from = 0;
    while (hasMore) {
      let query = supabase.from(table).select('*').range(from, from + 999);
      for (const [key, val] of Object.entries(filters)) {
        query = query.eq(key, val);
      }
      for (const {op, field, val} of operators) {
        if (op === 'gte') query = query.gte(field, val);
      }
      if (order) {
        query = query.order(order.field, { ascending: order.asc });
      }
      const { data, error } = await query;
      if (error) {
        console.error(`Error fetching from ${table}:`, error);
        break;
      }
      if (data && data.length > 0) {
        allData = [...allData, ...data];
        if (data.length < 1000) hasMore = false;
        else from += 1000;
      } else {
        hasMore = false;
      }
    }
    return allData;
  };

  const fetchAnalysisData = async (customerCode: string) => {
    setLoading(true);
    try {
      const now = new Date();
      const currentMonth = now.getMonth() + 1; // 1-12
      const currentYear = now.getFullYear();

      // Fetch orders for the last 6 months
      const sixMonthsAgo = format(subMonths(now, 6), 'yyyy-MM-01');
      const data = await fetchAllWithPagination(
        'salesman_kpi',
        { customer_code: customerCode },
        [{ op: 'gte', field: 'order_date', val: sixMonthsAgo }],
        { field: 'order_date', asc: false }
      );

      setOrders(data || []);

      const brandsPayment3c = ['vivan', 'robot', 'acome acc', 'acome iot', 'gamen'];

      // Fetch payments for current month
      const paymentsData = await fetchAllWithPagination(
        'salesman_payments',
        { 
          customer_code: customerCode,
          period_month: currentMonth,
          period_year: currentYear
        },
        [],
        { field: 'due_date', asc: true }
      );

      const aggregateByDeliveryNo = (data: any[]) => {
        const map = new Map<string, any>();
        const result: any[] = [];
        for (const item of data) {
          const key = item.delivery_no;
          if (!key) {
            result.push({ ...item, total_amount: Number(item.total_amount) || 0 });
            continue;
          }
          if (map.has(key)) {
            const existing = map.get(key);
            existing.total_amount += Number(item.total_amount) || 0;
          } else {
            const newItem = { ...item, total_amount: Number(item.total_amount) || 0 };
            map.set(key, newItem);
            result.push(newItem);
          }
        }
        return result;
      };

      setPaymentList(aggregateByDeliveryNo(paymentsData || []));

      let orderanLunas = 0;
      let orderanLunas3c = 0;
      let orderanLunasLcd = 0;
      let orderanLunasDll = 0;
      (paymentsData || []).forEach(item => {
        const amt = Number(item.total_amount) || 0;
        const brand = (item.brand_name || '').toLowerCase();
        const cat = (item.category || '').toLowerCase();
        orderanLunas += amt;

        const validLcdCats = ['vivan lcd team', 'vivan sparepart', 'xpas sparepart', 'xpas lcd 事业部'];
        const isLcd = (brand === 'vivan' || brand === 'xpas') && validLcdCats.includes(cat);

        if (isLcd) {
          orderanLunasLcd += amt;
        } else if (brandsPayment3c.includes(brand)) {
          orderanLunas3c += amt;
        } else {
          orderanLunasDll += amt;
        }
      });

      // Fetch piutang for the customer
      const { data: piutangData, error: piutangError } = await supabase
        .from('piutang_customer')
        .select('delivery_no, total_amount, brand_name, category, due_date, customer_code, customer_name, salesman_name')
        .eq('customer_code', customerCode)
        .order('due_date', { ascending: true });
      
      if (piutangError) throw piutangError;

      setPiutangList(aggregateByDeliveryNo(piutangData || []));

      let sisaPiutang = 0;
      let sisaPiutang3c = 0;
      let sisaPiutangLcd = 0;
      let sisaPiutangDll = 0;
      (piutangData || []).forEach(item => {
        const amt = Number(item.total_amount) || 0;
        const brand = (item.brand_name || '').toLowerCase();
        const cat = (item.category || '').toLowerCase();
        sisaPiutang += amt;
        
        const validLcdCats = ['vivan lcd team', 'vivan sparepart', 'xpas sparepart', 'xpas lcd 事业部'];
        const isLcd = (brand === 'vivan' || brand === 'xpas') && validLcdCats.includes(cat);

        if (isLcd) {
          sisaPiutangLcd += amt;
        } else if (brandsPayment3c.includes(brand)) {
          sisaPiutang3c += amt;
        } else {
          sisaPiutangDll += amt;
        }
      });

      setPaymentData({ 
        orderanLunas, 
        orderanLunas3c, 
        orderanLunasLcd,
        orderanLunasDll, 
        sisaPiutang,
        sisaPiutang3c,
        sisaPiutangLcd,
        sisaPiutangDll
      });

      // KPI Customer Sync
      await syncCustomerKPI(customerCode, currentMonth, currentYear);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const [customerKpi, setCustomerKpi] = useState<any[]>([]);
  const syncCustomerKPI = async (custCode: string, month: number, year: number) => {
    try {
      const [bulanan, spu] = await Promise.all([
        supabase.from('program_bulanan')
          .select('*')
          .eq('customer_code', custCode)
          .eq('period_month', month)
          .eq('period_year', year),
        supabase.from('program_spu')
          .select('*')
          .eq('customer_code', custCode)
          .eq('period_month', month)
          .eq('period_year', year)
      ]);

      const kpis = [];
      if (bulanan.data) {
        bulanan.data.forEach((item: any) => {
          kpis.push({
            title: `TARGET BULANAN (${item.salesman_name || 'BASIC'})`,
            target: item.customer_targets || 0,
            actual: item.customer_achieve || 0,
          });
        });
      }
      if (spu.data) {
        spu.data.forEach((item: any) => {
          kpis.push({
            title: `TARGET SPU (${item.salesman_name || 'PROGRAM'})`,
            target: item.customer_targets || 0,
            actual: item.customer_achieve || 0,
          });
        });
      }
      setCustomerKpi(kpis);
    } catch (e) {
      console.error(e);
    }
  };

  const stats = useMemo(() => {
    if (!orders.length) return null;

    const now = new Date();
    const currentMonth = startOfMonth(now);
    const lastMonth = startOfMonth(subMonths(now, 1));

    let mtdOmset = 0;
    let mtdOmset3c = 0;
    let mtdOmsetLcd = 0;
    let lastMonthOmset = 0;
    const lastOrderDate = orders[0]?.order_date;

    const brand3cList = ['vivan', 'robot', 'acome acc', 'acome iot', 'gamen', 'aula', 'philips', 'dp'];

    orders.forEach(order => {
      if (!order.order_date) return;
      const d = parseISO(order.order_date);
      const isMtd = isSameMonth(d, currentMonth);
      const isLastMonth = isSameMonth(d, lastMonth);
      const amount = Number(order.total_amount) || 0;
      
      if (isMtd) {
        mtdOmset += amount;

        const brandName = (order.brand_name || '').toLowerCase();
        
        // Sum Omset LCD explicitly
        const lcdAmount = Number(order.omset_lcd) || 0;
        mtdOmsetLcd += lcdAmount;

        // Omset 3C 
        if (brand3cList.includes(brandName) && lcdAmount === 0) {
           mtdOmset3c += amount;
        } else if (brand3cList.includes(brandName) && lcdAmount > 0 && amount > lcdAmount) {
           // just in case total_amount has non-LCD portion
           mtdOmset3c += (amount - lcdAmount);
        }
      }
      
      if (isLastMonth) lastMonthOmset += amount;
    });

    const mtdOmsetDll = mtdOmset - mtdOmset3c - mtdOmsetLcd;

    const dayFreq = new Array(7).fill(0);
    const uniqueOrderDates = new Set(orders.map(o => o.order_date));
    uniqueOrderDates.forEach(dateStr => {
      if (!dateStr) return;
      const day = getDay(parseISO(dateStr));
      dayFreq[day]++;
    });

    // Monthly Trend
    const monthlyData: any = {};
    orders.forEach(order => {
      if (!order.order_date) return;
      const monthKey = format(parseISO(order.order_date), 'MMM yyyy');
      if (!monthlyData[monthKey]) monthlyData[monthKey] = 0;
      monthlyData[monthKey] += order.total_amount;
    });

    const trendData = Object.keys(monthlyData).map(key => ({
      name: key,
      value: monthlyData[key]
    })).reverse();

    // Most common day
    let bestDayIdx = 1;
    let max = 0;
    dayFreq.forEach((v, i) => {
      if (v > max && i !== 0) { // skip sunday
        max = v;
        bestDayIdx = i;
      }
    });

    return {
      mtdOmset,
      mtdOmset3c,
      mtdOmsetLcd,
      mtdOmsetDll,
      lastMonthOmset,
      lastOrderDate,
      trendData,
      dayFreqData: dayFreq.map((val, idx) => ({ name: DAYS_NAME[idx], value: val })),
      bestDay: DAYS_NAME[bestDayIdx],
      purchasedProductCodes: Array.from(new Set(orders.map(o => o.goods_name))) // using name for now as we don't have code in kpi select sometimes
    };
  }, [orders]);

  const [dbProducts, setDbProducts] = useState<any[]>([]);
  useEffect(() => {
    const fetchAllProds = async () => {
      const { data } = await supabase.from('database_barang').select('goods_code, goods_name, warna').limit(100);
      setDbProducts(data || []);
    };
    fetchAllProds();
  }, []);

  const gapAnalysis = useMemo(() => {
    if (!stats || !dbProducts.length) return [];
    const purchasedNames = new Set(stats.purchasedProductCodes.map((n: string) => n.toLowerCase()));
    return dbProducts
      .filter(p => !purchasedNames.has((p.warna ? `${p.goods_name} ${p.warna}` : p.goods_name).toLowerCase()))
      .slice(0, 10);
  }, [stats, dbProducts]);

  const [productCompFilter, setProductCompFilter] = useState<'all' | 'up' | 'down'>('all');
  const [selectedProductCompCategories, setSelectedProductCompCategories] = useState<string[]>([]);
  const [showCompCatDropdown, setShowCompCatDropdown] = useState(false);

  const availableProductCompCats = useMemo(() => {
    if (!orders.length) return [];
    return Array.from(new Set(orders.map(o => (o.category || '').toLowerCase()).filter(Boolean))).sort();
  }, [orders]);

  const productComparison = useMemo(() => {
    if (!orders.length) return [];
    
    const now = new Date();
    const currentMonthDate = startOfMonth(now);
    const lastMonthDate = startOfMonth(subMonths(now, 1));
    const twoMonthsAgoDate = startOfMonth(subMonths(now, 2));

    const productMap = new Map<string, {
      goods_name: string,
      category: string,
      qty0: number, omset0: number,
      qty1: number, omset1: number,
      qty2: number, omset2: number,
    }>();

    orders.forEach(order => {
      if (!order.order_date || !order.goods_name) return;
      
      const d = parseISO(order.order_date);
      const isMtd = isSameMonth(d, currentMonthDate);
      const isLastMonth = isSameMonth(d, lastMonthDate);
      const isTwoMonthsAgo = isSameMonth(d, twoMonthsAgoDate);
      
      if (!isMtd && !isLastMonth && !isTwoMonthsAgo) return;

      const name = order.goods_name;
      const qty = Number(order.qty) || 0;
      const amount = Number(order.total_amount) || 0;
      const cat = (order.category || '').toLowerCase();
      
      let finalQty = Number(order.qty) || 0;
      if (cat === 'front film' && order.hydrogel_pcs != null) {
        finalQty = Number(order.hydrogel_pcs);
      } else if ((cat === 'screen assembly' || cat === 'lcd') && order.lcd_pcs != null) {
        finalQty = Number(order.lcd_pcs);
      }

      if (!productMap.has(name)) {
        productMap.set(name, {
          goods_name: name,
          category: cat,
          qty0: 0, omset0: 0,
          qty1: 0, omset1: 0,
          qty2: 0, omset2: 0
        });
      }

      const p = productMap.get(name)!;
      if (isMtd) { p.qty0 += finalQty; p.omset0 += amount; }
      if (isLastMonth) { p.qty1 += finalQty; p.omset1 += amount; }
      if (isTwoMonthsAgo) { p.qty2 += finalQty; p.omset2 += amount; }
    });

    let result = Array.from(productMap.values());
    
    if (selectedProductCompCategories.length > 0) {
      result = result.filter(p => selectedProductCompCategories.includes(p.category));
    }

    if (productCompFilter === 'up') {
      result = result.filter(p => p.omset0 > p.omset1 && p.omset1 > 0);
    } else if (productCompFilter === 'down') {
      result = result.filter(p => p.omset0 < p.omset1 && p.omset1 > 0);
    }

    result.sort((a, b) => {
      // Jika filter aktif, urutkan berdasarkan bulan lalu (omset1)
      if (productCompFilter !== 'all') {
        if (b.omset1 !== a.omset1) return b.omset1 - a.omset1;
        if (b.omset0 !== a.omset0) return b.omset0 - a.omset0;
        return b.omset2 - a.omset2;
      }
      
      // Default: urutkan berdasarkan bulan ini (omset0)
      if (b.omset0 !== a.omset0) return b.omset0 - a.omset0;
      if (b.omset1 !== a.omset1) return b.omset1 - a.omset1;
      return b.omset2 - a.omset2;
    });

    return result;
  }, [orders, productCompFilter, selectedProductCompCategories]);

  const downloadProductComparisonPDF = async () => {
    setIsDownloadingPdf(true);
    try {
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;
      
      const doc = new jsPDF();
      const now = new Date();
      const month0 = format(now, 'MMMM yyyy');
      const month1 = format(subMonths(now, 1), 'MMMM yyyy');
      const month2 = format(subMonths(now, 2), 'MMMM yyyy');

      // Title
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text(`DETAIL PRODUK - ${selectedCust?.toUpperCase() || 'ALL'}`, 14, 15);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Toko: ${selectedCust || 'Semua'}`, 14, 21);
      doc.text(`Periode: ${month0}`, 14, 26);
      
      let filterText = '';
      if (productCompFilter === 'down') filterText = 'TURUN (Decline)';
      else if (productCompFilter === 'up') filterText = 'NAIK (Growth)';
      else filterText = 'Semua Produk';
      
      doc.setTextColor(220, 38, 38);
      doc.text(`Filter: ${filterText}`, 14, 31);
      
      const tableData = productComparison.map((p, index) => {
        let growthStr = '0.0%';
        let growthVal = 0;
        if (p.omset1 > 0) {
          growthVal = ((p.omset0 - p.omset1) / p.omset1) * 100;
          growthStr = `${growthVal > 0 ? '+' : ''}${growthVal.toFixed(1)}%`;
        } else if (p.omset0 > 0) {
          growthVal = 100;
          growthStr = '+100.0%';
        } else if (p.omset0 === 0 && p.omset1 === 0 && p.omset2 > 0) {
          growthStr = '-100.0%';
          growthVal = -100;
        }

        const unit = 'Pcs';

        return [
          index + 1,
          p.goods_name,
          `${p.omset0 > 0 ? p.omset0.toLocaleString('id-ID') : '0'}\n\n${p.qty0} ${unit}`,
          `${p.omset1 > 0 ? p.omset1.toLocaleString('id-ID') : '0'}\n\n${p.qty1} ${unit}`,
          `${p.omset2 > 0 ? p.omset2.toLocaleString('id-ID') : '0'}\n\n${p.qty2} ${unit}`,
          growthStr,
          growthVal
        ];
      });

      autoTable(doc, {
        startY: 36,
        head: [['No', 'Produk', month0, month1, month2, 'Growth']],
        body: tableData.map(row => row.slice(0, 6)),
        theme: 'grid',
        styles: { 
          fontSize: 8, 
          fontStyle: 'normal',
          lineColor: [200, 200, 200],
          lineWidth: 0.1,
          valign: 'middle',
          cellPadding: 3
        },
        headStyles: { 
          fillColor: [16, 124, 95], // Emerald / Teal darker
          fontStyle: 'bold',
          textColor: [255, 255, 255],
          halign: 'center',
          valign: 'middle'
        },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 50, halign: 'left' },
          2: { cellWidth: 35, halign: 'center' },
          3: { cellWidth: 35, halign: 'center' },
          4: { cellWidth: 35, halign: 'center' },
          5: { cellWidth: 20, halign: 'center' }
        },
        didParseCell: (data) => {
          if (data.section === 'body') {
            if (data.column.index === 5) {
              const rowData = tableData[data.row.index];
              const growthVal = rowData[6] as number;
              if (growthVal < 0 || growthVal === -100) {
                data.cell.styles.textColor = [220, 38, 38];
              } else if (growthVal > 0) {
                data.cell.styles.textColor = [22, 163, 74];
              } else {
                data.cell.styles.textColor = [100, 100, 100];
              }
            }
          }
        },
        didDrawCell: (data) => {
          if (data.section === 'body' && (data.column.index >= 2 && data.column.index <= 4)) {
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.1);
            // @ts-ignore
            const yPos = data.cell.y + (data.cell.height / 2);
            // @ts-ignore
            doc.line(data.cell.x + 2, yPos, data.cell.x + data.cell.width - 2, yPos);
          }
        }
      });

      doc.save(`DETAIL_PRODUK_${selectedCust || 'ALL'}_${month0}.pdf`);
    } catch (e) {
      console.error('Error generating PDF', e);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const filteredCustomers = customers.filter(c =>  
    c.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.customer_code.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 10);

  const getSpanClass = (id: string) => {
    switch (id) {
      case 'KPI_CUSTOMER':
      case 'COMPARE_PRODUCT':
      case 'ORDER_HISTORY':
      case 'PAYMENT_LIST':
      case 'PIUTANG_LIST':
        return 'lg:col-span-3';
      case 'TREND_CHART':
      case 'DAY_FREQ':
        return 'lg:col-span-2';
      default:
        return 'lg:col-span-1';
    }
  };

  const renderSection = (id: string, isDragging = false) => {
    const handle = isDragging && (
      <div className="absolute top-4 left-4 z-10 cursor-grab active:cursor-grabbing p-1 bg-white/80 backdrop-blur rounded-md border border-slate-100 shadow-sm">
        <GripVertical className="w-4 h-4 text-slate-400" />
      </div>
    );

    switch (id) {
      case 'INFO_MTD':
        return (
          <div className="relative">
            {handle}
            <Card className="bg-gradient-to-br from-indigo-600 to-indigo-800 text-white border-none shadow-xl shadow-indigo-200">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black opacity-80 uppercase tracking-widest">Omset MTD ({format(new Date(), 'MMMM')})</p>
                    <h3 className="text-2xl font-black">Rp {stats!.mtdOmset.toLocaleString()}</h3>
                  </div>
                  <div className="bg-white/20 p-2 rounded-xl">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                </div>
                
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="bg-emerald-500/30 rounded-lg p-2 flex flex-col justify-center">
                    <span className="text-[9px] uppercase font-bold opacity-80">Payment MTD ({format(new Date(), 'MMM')})</span>
                    <span className="text-sm font-black text-emerald-100">Rp {paymentData.orderanLunas.toLocaleString()}</span>
                  </div>
                  <div className="bg-rose-500/30 rounded-lg p-2 flex flex-col justify-center">
                    <span className="text-[9px] uppercase font-bold opacity-80">Total Piutang</span>
                    <span className="text-sm font-black text-rose-100">Rp {paymentData.sisaPiutang.toLocaleString()}</span>
                  </div>
                  <div className="col-span-2 bg-indigo-500/30 rounded-lg p-2 flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold opacity-80">Payment + Piutang</span>
                    <span className="text-sm font-black text-indigo-100">Rp {(paymentData.orderanLunas + paymentData.sisaPiutang).toLocaleString()}</span>
                  </div>
                </div>

                <hr className="border-white/10 my-4" />

                <div className="space-y-2">
                  <div>
                    <p className="text-[10px] font-black opacity-80 uppercase tracking-widest">Omset 3C</p>
                    <h4 className="text-lg font-black">Rp {stats!.mtdOmset3c.toLocaleString()}</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="bg-white/10 rounded-lg p-2 flex flex-col justify-center">
                      <span className="text-[9px] uppercase font-bold opacity-80">Payment 3C</span>
                      <span className="text-xs font-black text-white">Rp {paymentData.orderanLunas3c.toLocaleString()}</span>
                    </div>
                    <div className="bg-white/10 rounded-lg p-2 flex flex-col justify-center">
                      <span className="text-[9px] uppercase font-bold opacity-80">Piutang 3C</span>
                      <span className="text-xs font-black text-white">Rp {paymentData.sisaPiutang3c.toLocaleString()}</span>
                    </div>
                    <div className="col-span-2 bg-indigo-500/20 rounded-lg p-2 flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold opacity-80">Payment + Piutang 3C</span>
                      <span className="text-xs font-black text-indigo-100">Rp {(paymentData.orderanLunas3c + paymentData.sisaPiutang3c).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <hr className="border-white/10 my-4" />

                <div className="space-y-2">
                  <div>
                    <p className="text-[10px] font-black opacity-80 uppercase tracking-widest">Omset LCD</p>
                    <h4 className="text-lg font-black">Rp {stats!.mtdOmsetLcd.toLocaleString()}</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="bg-white/10 rounded-lg p-2 flex flex-col justify-center">
                      <span className="text-[9px] uppercase font-bold opacity-80">Payment LCD</span>
                      <span className="text-xs font-black text-white">Rp {paymentData.orderanLunasLcd.toLocaleString()}</span>
                    </div>
                    <div className="bg-white/10 rounded-lg p-2 flex flex-col justify-center">
                      <span className="text-[9px] uppercase font-bold opacity-80">Piutang LCD</span>
                      <span className="text-xs font-black text-white">Rp {paymentData.sisaPiutangLcd.toLocaleString()}</span>
                    </div>
                    <div className="col-span-2 bg-indigo-500/20 rounded-lg p-2 flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold opacity-80">Payment + Piutang LCD</span>
                      <span className="text-xs font-black text-indigo-100">Rp {(paymentData.orderanLunasLcd + paymentData.sisaPiutangLcd).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <hr className="border-white/10 my-4" />

                <div className="space-y-2">
                  <div>
                    <p className="text-[10px] font-black opacity-80 uppercase tracking-widest">Omset DLL</p>
                    <h4 className="text-lg font-black">Rp {stats!.mtdOmsetDll.toLocaleString()}</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="bg-white/10 rounded-lg p-2 flex flex-col justify-center">
                      <span className="text-[9px] uppercase font-bold opacity-80">Payment DLL</span>
                      <span className="text-xs font-black text-white">Rp {paymentData.orderanLunasDll.toLocaleString()}</span>
                    </div>
                    <div className="bg-white/10 rounded-lg p-2 flex flex-col justify-center">
                      <span className="text-[9px] uppercase font-bold opacity-80">Piutang DLL</span>
                      <span className="text-xs font-black text-white">Rp {paymentData.sisaPiutangDll.toLocaleString()}</span>
                    </div>
                    <div className="col-span-2 bg-indigo-500/20 rounded-lg p-2 flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold opacity-80">Payment + Piutang DLL</span>
                      <span className="text-xs font-black text-indigo-100">Rp {(paymentData.orderanLunasDll + paymentData.sisaPiutangDll).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2">
                  {stats!.mtdOmset >= stats!.lastMonthOmset ? (
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-rose-400" />
                  )}
                  <span className="text-[10px] font-black">
                    Bulan Lalu: <span className="opacity-80">Rp {stats!.lastMonthOmset.toLocaleString()}</span>
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      case 'LAST_ORDER':
        return (
          <div className="relative">
            {handle}
            <Card className="bg-white border-indigo-50 shadow-xl overflow-hidden relative">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <Calendar className="w-24 h-24 text-indigo-600" />
              </div>
              <CardContent className="p-6 relative">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-emerald-50 p-2 rounded-xl">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Order Terakhir</p>
                        {stats!.lastOrderDate ? (
                      <h4 className="text-sm font-black text-slate-800">{format(parseISO(stats!.lastOrderDate), 'dd MMMM yyyy')}</h4>
                        ) : (
                      <h4 className="text-sm font-black text-slate-800">-</h4>
                        )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="bg-indigo-50 p-2 rounded-xl">
                      <Target className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prediksi Hari Order</p>
                      <h4 className="text-sm font-black text-indigo-600">Setiap Hari {stats!.bestDay}</h4>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      case 'TREND_CHART':
        return (
          <div className="relative">
            {handle}
            <Card className="bg-white shadow-xl border-indigo-50">
              <CardHeader className="border-b border-slate-50 flex flex-row items-center justify-between pb-4">
                <CardTitle className="text-sm font-black flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-500" /> Tren Omset 6 Bulan
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats!.trendData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} 
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} 
                        width={60}
                        tickFormatter={(v) => v >= 1000000 ? `${(v/1000000).toFixed(1)}jt` : v.toLocaleString()}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: '16px', 
                          border: 'none', 
                          boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#4f46e5" 
                        strokeWidth={4} 
                        dot={{ r: 6, fill: '#4f46e5', strokeWidth: 4, stroke: '#fff' }}
                        activeDot={{ r: 8, strokeWidth: 0 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      case 'COMPARE_PRODUCT':
        return (
          <div className="relative">
            {handle}
            <Card className="bg-white shadow-xl border-indigo-50">
              <CardHeader className="border-b border-slate-50 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4">
                <CardTitle className="text-sm font-black flex items-center gap-2">
                  <BarChart4 className="w-4 h-4 text-indigo-500" /> Perbandingan Omset Produk (3 Bulan)
                </CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex bg-slate-100 rounded-lg p-1">
                    <button
                      onClick={() => setProductCompFilter('all')}
                      className={cn("px-3 py-1 rounded-md text-[10px] font-bold transition-all", productCompFilter === 'all' ? "bg-white shadow-sm text-indigo-600" : "text-slate-500 hover:text-slate-700")}
                    >
                      Semua
                    </button>
                    <button
                      onClick={() => setProductCompFilter('up')}
                      className={cn("px-3 py-1 rounded-md text-[10px] font-bold transition-all", productCompFilter === 'up' ? "bg-white shadow-sm text-emerald-600" : "text-slate-500 hover:text-slate-700")}
                    >
                      Naik Bulan Ini
                    </button>
                    <button
                      onClick={() => setProductCompFilter('down')}
                      className={cn("px-3 py-1 rounded-md text-[10px] font-bold transition-all", productCompFilter === 'down' ? "bg-white shadow-sm text-rose-600" : "text-slate-500 hover:text-slate-700")}
                    >
                      Turun Bulan Ini
                    </button>
                  </div>
                  
                  <div className="relative">
                    <button
                      onClick={() => setShowCompCatDropdown(!showCompCatDropdown)}
                      className="px-3 py-1.5 h-8 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-[10px] font-bold text-slate-600 shadow-sm flex items-center justify-between"
                    >
                      Kategori {selectedProductCompCategories.length > 0 ? `(${selectedProductCompCategories.length})` : '(Semua)'}
                      <ChevronDown className="w-3 h-3 ml-2" />
                    </button>
                    {showCompCatDropdown && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowCompCatDropdown(false)} />
                        <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-xl z-50 p-2 max-h-60 overflow-y-auto">
                          {availableProductCompCats.map(cat => {
                            const isChecked = selectedProductCompCategories.includes(cat);
                            return (
                              <label key={cat} className="flex items-center gap-2 p-1.5 hover:bg-slate-50 cursor-pointer text-xs rounded-md">
                                <input
                                  type="checkbox"
                                  className="rounded text-indigo-600 focus:ring-indigo-500"
                                  checked={isChecked}
                                  onChange={() => {
                                    if (isChecked) {
                                      setSelectedProductCompCategories(prev => prev.filter(c => c !== cat));
                                    } else {
                                      setSelectedProductCompCategories(prev => [...prev, cat]);
                                    }
                                  }}
                                />
                                <span className={isChecked ? 'font-bold text-indigo-700' : 'text-slate-600'}>{cat || 'Tidak Ada Kategori'}</span>
                              </label>
                            );
                          })}
                          {availableProductCompCats.length === 0 && (
                            <div className="p-2 text-xs text-slate-400 text-center">Tidak ada kategori</div>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  <Button
                    onClick={downloadProductComparisonPDF}
                    className="h-8 px-3 text-[10px] bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border-none shadow-none font-bold"
                  >
                    <Package className="w-3 h-3 mr-2" /> Download PDF
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto w-full max-h-[400px]">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 sticky top-0 z-10">
                      <tr>
                        <th className="p-3 text-[10px] font-black uppercase text-slate-500 border-b border-slate-100 whitespace-nowrap">Nama Produk</th>
                        <th className="p-3 text-[10px] font-black uppercase text-slate-500 border-b border-slate-100 text-right whitespace-nowrap">{format(new Date(), 'MMMM yyyy')}</th>
                        <th className="p-3 text-[10px] font-black uppercase text-slate-500 border-b border-slate-100 text-right whitespace-nowrap">{format(subMonths(new Date(), 1), 'MMMM yyyy')}</th>
                        <th className="p-3 text-[10px] font-black uppercase text-slate-500 border-b border-slate-100 text-right whitespace-nowrap">{format(subMonths(new Date(), 2), 'MMMM yyyy')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productComparison.map((p, i) => (
                        <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                          <td className="p-3 text-[11px] font-bold text-slate-700 max-w-[200px] truncate" title={p.goods_name}>
                            {p.goods_name}
                          </td>
                          <td className="p-3 text-right">
                            <div className="text-[11px] font-bold text-slate-700">{p.qty0} pcs</div>
                            <div className="text-[10px] font-black text-indigo-600">Rp {p.omset0.toLocaleString('id-ID')}</div>
                          </td>
                          <td className="p-3 text-right">
                            <div className="text-[11px] font-bold text-slate-700">{p.qty1} pcs</div>
                            <div className="text-[10px] font-medium text-slate-500">Rp {p.omset1.toLocaleString('id-ID')}</div>
                          </td>
                          <td className="p-3 text-right">
                            <div className="text-[11px] font-bold text-slate-700">{p.qty2} pcs</div>
                            <div className="text-[10px] font-medium text-slate-500">Rp {p.omset2.toLocaleString('id-ID')}</div>
                          </td>
                        </tr>
                      ))}
                      {productComparison.length === 0 && (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-[11px] font-medium text-slate-400">
                            Tidak ada data produk.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      case 'DAY_FREQ':
        return (
          <div className="relative">
            {handle}
            <Card className="bg-white shadow-xl border-indigo-50">
              <CardHeader className="border-b border-slate-50 pb-4">
                <CardTitle className="text-sm font-black flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-500" /> Frekuensi Order Per Hari
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats!.dayFreqData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} 
                      />
                      <YAxis hide />
                      <Tooltip 
                        cursor={{ fill: 'transparent' }}
                        contentStyle={{ 
                          borderRadius: '16px', 
                          border: 'none', 
                          boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}
                      />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={40}>
                        {stats!.dayFreqData.map((entry: any, index: number) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.name === stats!.bestDay ? '#4f46e5' : '#e2e8f0'} 
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 p-4 bg-indigo-50 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-indigo-500 shrink-0" />
                  <p className="text-[11px] font-bold text-indigo-700 leading-relaxed">
                    Berdasarkan data historis, customer <span className="font-black underline">{selectedCustomerData?.customer_name}</span> paling sering melakukan order pada hari <span className="font-black">{stats!.bestDay}</span>. 
                    Disarankan untuk menjadwalkan kunjungan utama pada hari tersebut.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      case 'DIAGNOSIS':
        return (
          <div className="relative">
            {handle}
            <Card className="bg-white shadow-xl border-indigo-50">
              <CardHeader className="border-b border-slate-50">
                <CardTitle className="text-sm font-black flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-emerald-500" /> Diagnosis Store
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="flex gap-3">
                  {stats!.mtdOmset > 0 ? (
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0 border border-emerald-100">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center shrink-0 border border-rose-100">
                      <AlertCircle className="w-4 h-4 text-rose-500" />
                    </div>
                  )}
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-black text-slate-800 uppercase">Aktifitas Order</p>
                    <p className="text-[10px] font-bold text-slate-400">
                      {stats!.mtdOmset > 0 ? 'Customer melakukan order bulan ini.' : 'Belum ada order masuk di bulan ini!'}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  {stats!.mtdOmset >= stats!.lastMonthOmset ? (
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0 border border-emerald-100">
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0 border border-indigo-100">
                      <TrendingDown className="w-4 h-4 text-indigo-500" />
                    </div>
                  )}
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-black text-slate-800 uppercase">Pertumbuhan</p>
                    <p className="text-[10px] font-bold text-slate-400">
                      {stats!.mtdOmset >= stats!.lastMonthOmset 
                        ? 'Omset meningkat dibanding bulan lalu.' 
                        : 'Omset bulan ini masih di bawah bulan sebelumnya.'}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  {stats!.purchasedProductCodes.length > 5 ? (
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0 border border-emerald-100">
                      <Package className="w-4 h-4 text-emerald-500" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0 border border-amber-100">
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                    </div>
                  )}
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-black text-slate-800 uppercase">Diversitas Produk</p>
                    <p className="text-[10px] font-bold text-slate-400">
                      {stats!.purchasedProductCodes.length > 5 
                        ? 'Variasi produk yang dibeli sudah cukup baik.' 
                        : 'Customer cenderung fokus pada sedikit jenis produk.'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      case 'VISIT_PLAN':
        return (
          <div className="relative">
            {handle}
            <Card className="bg-slate-900 text-white border-none shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-10">
                 <MapPin className="w-20 h-20" />
               </div>
               <CardContent className="p-6 space-y-4 relative">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Rencana Kunjungan Optimal</p>
                    <h3 className="text-xl font-black">Setiap Hari {stats!.bestDay}</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="bg-white/5 p-3 rounded-xl border border-white/10 space-y-1">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3 text-indigo-300" />
                        <span className="text-[9px] font-black text-slate-400 uppercase">Window Waktu</span>
                      </div>
                      <p className="text-[11px] font-bold">Pagi hari sebelum jam 11:00</p>
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold italic">
                      *Berdasarkan jam input order salesman historis.
                    </p>
                  </div>
               </CardContent>
            </Card>
          </div>
        );
      case 'PRODUCT_FREQ':
        return (
          <div className="relative">
            {handle}
            <Card className="bg-white shadow-xl border-indigo-50">
              <CardHeader className="border-b border-slate-50">
                <CardTitle className="text-sm font-black flex items-center gap-2">
                   <Package className="w-4 h-4 text-indigo-500" /> Produk Sering Dibeli
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[200px] overflow-y-auto">
                  {Array.from(new Set(orders.map(o => o.goods_name))).slice(0, 8).map((name, i) => (
                    <div key={i} className="px-4 py-3 flex items-center justify-between border-b border-slate-50 last:border-0 hover:bg-slate-50">
                       <span className="text-[10px] font-bold text-slate-700 truncate max-w-[70%]">{name}</span>
                       <ChevronRight className="w-3 h-3 text-slate-300" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        );
      case 'PRODUCT_GAP':
        return (
          <div className="relative">
            {handle}
            <Card className="bg-white shadow-xl border-indigo-50">
              <CardHeader className="border-b border-slate-50">
                <CardTitle className="text-sm font-black flex items-center gap-2">
                   <Target className="w-4 h-4 text-rose-500" /> Peluang Produk (Gap)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="p-4 space-y-3">
                  <p className="text-[10px] font-bold text-slate-400">Customer ini belum pernah membeli produk populer berikut:</p>
                  <div className="space-y-2">
                    {gapAnalysis.length > 0 ? (
                      gapAnalysis.map((p, i) => (
                        <div key={i} className="flex items-center gap-2">
                           <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                           <span className="text-[10px] font-black text-slate-600 truncate">
                             {p.warna ? `${p.goods_name} ${p.warna}` : p.goods_name}
                           </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-[10px] italic text-slate-400">Data peluang tidak tersedia.</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      case 'KPI_CUSTOMER':
        return (
          <div className="relative">
            {handle}
            <Card className="bg-white shadow-xl border-indigo-50 border-none relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <Target className="w-24 h-24 text-indigo-600" />
              </div>
              <CardHeader className="border-b border-slate-50 flex flex-row items-center justify-between pb-4">
                <CardTitle className="text-base font-black flex items-center gap-2">
                   <Target className="w-5 h-5 text-emerald-500" /> KPI Customer (Bulan Ini)
                </CardTitle>
                <Button 
                   onClick={() => syncCustomerKPI(selectedCust!, new Date().getMonth() + 1, new Date().getFullYear())}
                   variant="ghost" 
                   size="sm" 
                   className="h-8 px-4 text-[10px] font-black uppercase text-indigo-600 hover:bg-indigo-50 border border-indigo-100 rounded-xl"
                 >
                   <RefreshCw className="w-3 h-3 mr-2" /> SYNC
                 </Button>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {customerKpi.length > 0 ? (
                    customerKpi.map((kpi, i) => {
                      const percentage = kpi.target > 0 ? (kpi.actual / kpi.target) * 100 : 0;
                      let displayTitle = kpi.title;
                      if (displayTitle.includes('(') && displayTitle.includes(')')) {
                        const content = displayTitle.substring(displayTitle.indexOf('(') + 1, displayTitle.indexOf(')'));
                        if (content.includes('|')) {
                           const parts = content.split('|');
                           const brandPart = parts[1]?.trim();
                           displayTitle = displayTitle.replace(`(${content})`, brandPart ? `(${brandPart})` : '');
                        } else {
                           displayTitle = displayTitle.split('(')[0].trim();
                        }
                      }

                      return (
                        <div key={i} className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100 space-y-4 hover:shadow-lg transition-all duration-300">
                           <div className="space-y-1">
                              <span className="font-black text-slate-800 text-sm uppercase tracking-tight block">{displayTitle}</span>
                              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 bg-white inline-block px-3 py-1 rounded-full border border-slate-100">
                                <span>Target: <span className="text-slate-900">Rp {kpi.target.toLocaleString('id-ID')}</span></span>
                                <span className="text-slate-300">|</span>
                                <span>Tercapai: <span className="text-emerald-600">Rp {kpi.actual.toLocaleString('id-ID')}</span></span>
                              </div>
                           </div>
                           
                           <div className="space-y-3">
                             <div className="overflow-hidden h-3 text-xs flex rounded-full bg-slate-200/50 shadow-inner p-0.5">
                               <motion.div 
                                 initial={{ width: 0 }}
                                 animate={{ width: `${Math.min(percentage, 100)}%` }}
                                 transition={{ duration: 1, ease: "easeOut" }}
                                 className={cn(
                                   "shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center rounded-full transition-all",
                                   percentage >= 100 ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' : 'bg-gradient-to-r from-indigo-500 to-indigo-700'
                                 )}
                               />
                             </div>
                             <div className="flex items-center justify-between">
                               <span className="text-[10px] font-black text-indigo-600 bg-white px-3 py-1 rounded-full border border-indigo-100 shadow-sm">
                                 {percentage.toFixed(1)}% PROGRESS
                               </span>
                               {kpi.target > kpi.actual ? (
                                 <span className="text-[10px] font-black text-rose-500 flex items-center gap-1 bg-rose-50 px-3 py-1 rounded-full border border-rose-100">
                                   <TrendingDown className="w-3 h-3" /> Kurang: Rp {(kpi.target - kpi.actual).toLocaleString('id-ID')}
                                 </span>
                               ) : (
                                 <span className="text-[10px] font-black text-emerald-600 flex items-center gap-1 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                                   <TrendingUp className="w-3 h-3" /> TARGET TERPENUHI
                                 </span>
                               )}
                             </div>
                           </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="col-span-2 flex flex-col items-center justify-center py-10 text-center space-y-4">
                       <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100">
                          <Target className="w-8 h-8 text-slate-200" />
                       </div>
                       <p className="text-xs italic text-slate-400 font-medium">Belum ada data program bulanan/SPU untuk customer ini.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        );
      case 'PAYMENT_LIST':
        return (
          <div className="relative">
            {handle}
            <Card className="bg-white shadow-xl border-indigo-50">
              <CardHeader className="border-b border-slate-50 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-black text-emerald-600 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" /> Detail Pembayaran Lunas (Bulan Ini)
                </CardTitle>
                <div className="text-[10px] font-black text-slate-400 uppercase px-3 py-1 bg-slate-50 rounded-lg border border-slate-100">
                  {paymentList.length} Transaksi
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto max-h-[500px]">
                  <table className="w-full text-left border-collapse relative">
                    <thead className="sticky top-0 bg-slate-50 shadow-sm z-10">
                      <tr className="border-b border-slate-100">
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50">Delivery No</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50">Due Date</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right bg-slate-50">Total Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {paymentList.map((payment, i) => (
                        <tr key={i} className="hover:bg-slate-50 transition-colors group relative">
                          <td className="px-6 py-4">
                            <button 
                              onClick={() => setSelectedPiutang(payment)}
                              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline text-left"
                            >
                              {payment.delivery_no || '-'}
                            </button>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-xs font-bold text-slate-500">
                              {payment.due_date !== null && payment.due_date !== undefined ? `${payment.due_date} Hari` : '-'}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                             <div className="text-xs font-black text-slate-900 group-hover:text-emerald-600 transition-colors">
                               Rp {(Number(payment.total_amount) || 0).toLocaleString()}
                             </div>
                          </td>
                        </tr>
                      ))}
                      {paymentList.length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-6 py-8 text-center text-xs text-slate-500">Belum ada data pembayaran lunas bulan ini.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      case 'PIUTANG_LIST':
        return (
          <div className="relative">
            {handle}
            <Card className="bg-white shadow-xl border-indigo-50">
              <CardHeader className="border-b border-slate-50 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-black text-rose-600 flex items-center gap-2">
                  <TrendingDown className="w-5 h-5" /> Detail Sisa Piutang
                </CardTitle>
                <div className="text-[10px] font-black text-slate-400 uppercase px-3 py-1 bg-slate-50 rounded-lg border border-slate-100">
                  {piutangList.length} Transaksi
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto max-h-[500px]">
                  <table className="w-full text-left border-collapse relative">
                    <thead className="sticky top-0 bg-slate-50 shadow-sm z-10">
                      <tr className="border-b border-slate-100">
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50">Delivery No</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50">Due Date</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right bg-slate-50">Total Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {piutangList.map((piutang, i) => (
                        <tr key={i} className="hover:bg-slate-50 transition-colors group relative">
                          <td className="px-6 py-4">
                            <button 
                              onClick={() => setSelectedPiutang(piutang)}
                              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline text-left"
                            >
                              {piutang.delivery_no || '-'}
                            </button>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-xs font-bold text-slate-500">
                              {piutang.due_date !== null && piutang.due_date !== undefined ? `${piutang.due_date} Hari` : '-'}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                             <div className="text-xs font-black text-slate-900 group-hover:text-rose-600 transition-colors">
                               Rp {(Number(piutang.total_amount) || 0).toLocaleString()}
                             </div>
                          </td>
                        </tr>
                      ))}
                      {piutangList.length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-6 py-8 text-center text-xs text-slate-500">Belum ada data sisa piutang.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      case 'ORDER_HISTORY':
        return (
          <div className="relative">
            {handle}
            <Card className="bg-white shadow-xl border-indigo-50">
              <CardHeader className="border-b border-slate-50 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-black">Detail Riwayat Order (6 Bulan Terakhir)</CardTitle>
                <div className="text-[10px] font-black text-slate-400 uppercase px-3 py-1 bg-slate-50 rounded-lg border border-slate-100">
                  {orders.length} Transaksi
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100">
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Produk</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Qty</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Total Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {orders.slice(0, 15).map((order, i) => (
                        <tr key={i} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-xs font-bold text-slate-500">
                              {order.order_date ? format(parseISO(order.order_date), 'dd MMM yyyy') : '-'}
                            </div>
                            <div className="text-[9px] font-black text-indigo-600 uppercase">
                              {order.order_date ? DAYS_NAME[getDay(parseISO(order.order_date))] : '-'}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-xs font-black text-slate-800">{order.goods_name}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-xs font-bold text-slate-600">{order.qty} pcs</div>
                          </td>
                          <td className="px-6 py-4 text-right">
                             <div className="text-xs font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                               Rp {order.total_amount.toLocaleString()}
                             </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {orders.length > 15 && (
                  <div className="p-4 text-center border-t border-slate-50">
                    <button className="text-[10px] font-black text-indigo-600 uppercase hover:underline">
                      Lihat Semua Transaksi
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );
      default:
        return null;
    }
  };

  const selectedCustomerData = customers.find(c => c.customer_code === selectedCust);

  return (
    <div className="space-y-6">
      {/* Selector */}
      <Card className="bg-white/70 backdrop-blur-md border-indigo-100 shadow-xl overflow-visible">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 space-y-2 relative">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <Store className="w-3 h-3 text-indigo-500" /> Pilih Customer Untuk Analisa
                <span className="text-[8px] font-bold text-indigo-500 bg-indigo-50 px-1 rounded">({customers.length} Terload)</span>
              </label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Cari toko atau kode customer..."
                  value={searchTerm}
                  onFocus={() => setShowCustDropdown(true)}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-700 ring-1 ring-slate-100 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
              </div>

              {showCustDropdown && searchTerm && (
                <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-2xl border border-slate-100 py-2 max-h-60 overflow-y-auto">
                  {filteredCustomers.length > 0 ? (
                    filteredCustomers.map(c => (
                      <button
                        key={c.customer_code}
                        onClick={() => {
                          setSelectedCust(c.customer_code);
                          setSearchTerm(c.customer_name);
                          setShowCustDropdown(false);
                          fetchAnalysisData(c.customer_code);
                        }}
                        className="w-full px-4 py-3 hover:bg-indigo-50 text-left flex flex-col gap-0.5 border-b border-slate-50 last:border-0"
                      >
                        <span className="text-sm font-black text-slate-800">{c.customer_name}</span>
                        <span className="text-[10px] font-bold text-slate-400">{c.customer_code}</span>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-sm text-slate-400 italic">Customer tidak ditemukan</div>
                  )}
                </div>
              )}
            </div>
            {selectedCust && (
              <Button 
                onClick={() => fetchAnalysisData(selectedCust)}
                className="rounded-xl h-[46px] px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-lg"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                REFRESH ANALISA
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedCust && !loading && stats && (
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
             <div className="bg-indigo-600 w-1.5 h-6 rounded-full" />
             <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Hasil Analisa Toko</h3>
          </div>
          <button 
            onClick={() => setIsEditMode(!isEditMode)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm border",
              isEditMode 
                ? "bg-amber-100 text-amber-700 border-amber-200 animate-pulse" 
                : "bg-white text-slate-500 border-slate-100 hover:bg-slate-50"
            )}
          >
            {isEditMode ? (
              <>
                <Unlock className="w-3 h-4" /> SIMPAN POSISI
              </>
            ) : (
              <>
                <Lock className="w-3 h-4" /> ATUR POSISI
              </>
            )}
          </button>
        </div>
      )}

      {!selectedCust ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <div className="w-20 h-20 bg-indigo-50 rounded-xl flex items-center justify-center">
            <BarChart4 className="w-10 h-10 text-indigo-400 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-800">Siap Menganalisa?</h3>
            <p className="text-sm font-bold text-slate-400 max-w-xs mx-auto">
              Pilih satu customer di atas untuk melihat riwayat order, tren omset, dan rekomendasi hari kunjungan.
            </p>
          </div>
        </div>
      ) : loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
          <p className="mt-4 text-sm font-bold text-slate-500 uppercase tracking-widest animate-pulse">Menghitung Data...</p>
        </div>
      ) : stats ? (
        <div className="space-y-6">
          {isEditMode ? (
            <div className="bg-slate-100/50 p-6 rounded-3xl border-2 border-dashed border-slate-200">
               <div className="text-center mb-6">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Mode Pengaturan Posisi Aktif</p>
                  <p className="text-[10px] font-bold text-slate-400 italic">Seret blok di bawah ini untuk mengubah urutan tampilan</p>
               </div>
               <Reorder.Group 
                 axis="y" 
                 values={layoutOrder} 
                 onReorder={saveLayout}
                 className="space-y-3"
               >
                 {layoutOrder.map((sectionId) => (
                   <Reorder.Item 
                     key={sectionId} 
                     value={sectionId}
                   >
                     <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center gap-4 shadow-sm group">
                        <GripVertical className="w-5 h-5 text-slate-300 group-hover:text-indigo-400 transition-colors" />
                        <div className="flex-1">
                           <p className="text-xs font-black text-slate-700 uppercase tracking-tight">
                              {sectionId.replace('_', ' ')}
                           </p>
                        </div>
                        <div className="w-24 h-8 bg-slate-50 rounded-lg" />
                     </div>
                   </Reorder.Item>
                 ))}
               </Reorder.Group>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {layoutOrder.map((sectionId) => (
                <div key={sectionId} className={getSpanClass(sectionId)}>
                  {renderSection(sectionId)}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <div className="w-20 h-20 bg-rose-50 rounded-xl flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-rose-400" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-800">Data Tidak Ditemukan</h3>
            <p className="text-sm font-bold text-slate-400 max-w-xs mx-auto">
              Sepertinya customer ini belum memiliki data transaksi yang tercatat dalam 6 bulan terakhir.
            </p>
          </div>
        </div>
      )}

      {selectedPiutang && (
        <NotaModal 
          data={selectedPiutang} 
          onClose={() => setSelectedPiutang(null)} 
        />
      )}

    </div>
  );
}
