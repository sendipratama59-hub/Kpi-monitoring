import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, TrendingDown, TrendingUp, Minus, Activity, Target, Users, Search, X, ArrowLeft, Loader2, CheckCircle2, XCircle, Trophy } from "lucide-react";
import { METRICS, formatCurrency } from "./constants";
import { supabase } from "../../../services/supabase";

export function MobileSalesmanKpiView({
  summaryData,
  prevSummaryData,
  targets,
  isLoading,
  fetchError,
  periodMonth,
  periodYear,
  setPeriodMonth,
  setPeriodYear,
  onRefresh,
}: any) {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const salesmanCode = localStorage.getItem("salesman_code") || "Salesman";
  
  // Find current salesman data
  const smData = summaryData?.find((s: any) => s.salesman_code === salesmanCode);
  const smTarget = targets?.find((t: any) => t.salesman_code === salesmanCode);
  const prevSmData = prevSummaryData?.find((s: any) => s.salesman_code === salesmanCode);

  // Points calculation helper variables
  const isEligible = smData?.is_eligible !== false;
  const isLeader = !!smData?.team_name && (
    Number(smData?.points_leader_kpi) !== 0 || 
    Number(smData?.points_leader_omset_lcd) !== 0 ||
    Number(smData?.points_leader_visit) !== 0 ||
    Number(smData?.points_leader_co3c) !== 0 ||
    Number(smData?.points_leader_5jt) !== 0 ||
    Number(smData?.points_leader_idle) !== 0 ||
    Number(smData?.points_leader_spu) !== 0 ||
    Number(smData?.points_leader_new_customer) !== 0 ||
    Number(smData?.points_leader_perbaikan_display) !== 0 ||
    Number(smData?.points_leader_pemasangan_spanduk) !== 0
  );

  const pointsList = isLeader ? [
    { label: "Payment 3C + SD LCD (Tim)", key: "points_leader_kpi" },
    { label: "SD LCD (Tim)", key: "points_leader_omset_lcd" },
    { label: "Visit Customer (Tim)", key: "points_leader_visit" },
    { label: "Total CO 3C (Tim)", key: "points_leader_co3c" },
    { label: "CO 5JT (Tim)", key: "points_leader_5jt" },
    { label: "CO IDLE (Tim)", key: "points_leader_idle" },
    { label: "Program SPU (Tim)", key: "points_leader_spu" },
    { label: "New Customer (Tim)", key: "points_leader_new_customer" },
    { label: "Perbaikan Display (Tim)", key: "points_leader_perbaikan_display" },
    { label: "Pemasangan Spanduk (Tim)", key: "points_leader_pemasangan_spanduk" },
  ] : [
    { label: "Payment 3C + SD LCD", key: "points_3c_lcd" },
    { label: "SD LCD", key: "points_omset_lcd" },
    { label: "Visit Customer", key: "points_visit_customer" },
    { label: "Total CO 3C", key: "points_co_3c" },
    { label: "CO 5JT", key: "points_omset_5jt" },
    { label: "CO IDLE", key: "points_idle_customers" },
    { label: "Program SPU", key: "points_program_spu" },
    { label: "Perbaikan Display", key: "points_perbaikan_display" },
    { label: "Pemasangan Spanduk", key: "points_pemasangan_spanduk" },
  ];

  const totalKpiPoints = isEligible ? pointsList.reduce((acc, item) => {
    return acc + (Number(smData?.[item.key]) || 0);
  }, 0) : 0;

  const [expandedMetricId, setExpandedMetricId] = useState<string | null>(null);
  const [showPointsBreakdown, setShowPointsBreakdown] = useState(false);

  // Detail customer and products states
  const [selectedMetricForDetail, setSelectedMetricForDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [customerDetails, setCustomerDetails] = useState<any[]>([]);
  const [searchCustomer, setSearchCustomer] = useState("");
  const [selectedCustomerForDetail, setSelectedCustomerForDetail] = useState<any | null>(null);

  const [showAddManualActivity, setShowAddManualActivity] = useState(false);
  const [manualActivityForm, setManualActivityForm] = useState({
    customerCode: "",
    customerName: "",
    subActivityType: ""
  });
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);

  // Customer suggestions states
  const [allSalesmanCustomers, setAllSalesmanCustomers] = useState<any[]>([]);
  const [isLoadingCusts, setIsLoadingCusts] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  React.useEffect(() => {
    if (showAddManualActivity && salesmanCode) {
      const loadAllCustomers = async () => {
        setIsLoadingCusts(true);
        try {
          let allData: any[] = [];
          const isSpecialSalesman = salesmanCode.trim() === "81457";
          
          if (isSpecialSalesman) {
            // Fetch ALL customers in database with pagination
            let page = 0;
            const pageSize = 1000;
            let hasMore = true;
            
            while (hasMore) {
              const { data, error } = await supabase
                .from("salesman_customer")
                .select("customer_code, customer_name")
                .range(page * pageSize, (page + 1) * pageSize - 1)
                .order("customer_name", { ascending: true });
                
              if (error) throw error;
              if (data && data.length > 0) {
                allData = [...allData, ...data];
                if (data.length < pageSize) {
                  hasMore = false;
                } else {
                  page++;
                }
              } else {
                hasMore = false;
              }
            }
          } else {
            // Standard fetch for single salesman
            let page = 0;
            const pageSize = 1000;
            let hasMore = true;
            
            while (hasMore) {
              const { data, error } = await supabase
                .from("salesman_customer")
                .select("customer_code, customer_name")
                .eq("salesman_code", salesmanCode.trim())
                .range(page * pageSize, (page + 1) * pageSize - 1)
                .order("customer_name", { ascending: true });
                
              if (error) throw error;
              if (data && data.length > 0) {
                allData = [...allData, ...data];
                if (data.length < pageSize) {
                  hasMore = false;
                } else {
                  page++;
                }
              } else {
                hasMore = false;
              }
            }
          }
          
          // Deduplicate store list by name/code to make lists cleaner
          const uniqueMap = new Map();
          allData.forEach(item => {
            const key = `${item.customer_code || ''}-${item.customer_name || ''}`;
            if (!uniqueMap.has(key)) {
              uniqueMap.set(key, item);
            }
          });
          
          setAllSalesmanCustomers(Array.from(uniqueMap.values()));
        } catch (err) {
          console.error("Error loading salesman customers:", err);
        } finally {
          setIsLoadingCusts(false);
        }
      };
      loadAllCustomers();
    } else {
      setAllSalesmanCustomers([]);
      setShowSuggestions(false);
    }
  }, [showAddManualActivity, salesmanCode]);

  const filteredSuggestions = manualActivityForm.customerName.trim()
    ? allSalesmanCustomers.filter(c =>
        (c.customer_name || "").toLowerCase().includes(manualActivityForm.customerName.toLowerCase()) ||
        (c.customer_code || "").toLowerCase().includes(manualActivityForm.customerName.toLowerCase())
      ).slice(0, 5)
    : [];

  const handleSubmitManualActivity = async () => {
    if (!manualActivityForm.customerName.trim() || !manualActivityForm.subActivityType.trim()) {
      alert("Nama customer dan aktivitas wajib diisi.");
      return;
    }
    
    setIsSubmittingManual(true);
    try {
      const actType = selectedMetricForDetail.id === "perbaikan_display" ? "perbaikan_display" : "pemasangan_spanduk_stiker";
      
      const { error } = await supabase.from("salesman_manual_activities").insert([{
        salesman_code: salesmanCode.trim(),
        customer_code: manualActivityForm.customerCode.trim(),
        customer_name: manualActivityForm.customerName.trim(),
        activity_type: actType,
        sub_activity_type: manualActivityForm.subActivityType.trim(),
        period_month: periodMonth,
        period_year: periodYear
      }]);

      if (error) throw error;
      
      alert("Berhasil menambahkan aktivitas!");
      setShowAddManualActivity(false);
      setManualActivityForm({ customerCode: "", customerName: "", subActivityType: "" });
      
      // Refresh parent state in real-time
      if (onRefresh) {
        await onRefresh();
      }
      
      // Reload details
      loadCustomerDetails(selectedMetricForDetail);
      
    } catch (err: any) {
      alert("Gagal menyimpan aktivitas: " + (err.message || JSON.stringify(err)));
    } finally {
      setIsSubmittingManual(false);
    }
  };

  const loadCustomerDetails = async (metric: any) => {
    setSelectedMetricForDetail(metric);
    setSelectedCustomerForDetail(null);
    setCustomerDetails([]);
    setSearchCustomer("");
    setDetailLoading(true);

    try {
      const trimmedCode = salesmanCode.trim();

      if (metric.id.startsWith("payment")) {
        // Query payments
        let q = supabase
          .from("salesman_payments")
          .select("*")
          .eq("period_month", periodMonth)
          .eq("period_year", periodYear)
          .eq("salesman_code", trimmedCode);
        
        const { data, error } = await q;
        if (error) throw error;

        // Apply custom metric filter
        let filtered = data || [];
        if (salesmanCode && smData?.salesman_name) {
          filtered = filtered.filter((p: any) => p.salesman_name === smData.salesman_name);
        }

        const brandsPayment3C = ['vivan', 'robot', 'acome acc', 'acome iot', 'gamen'];
        const validLcdCats = ['vivan lcd team', 'vivan sparepart', 'xpas sparepart', 'xpas lcd 事业部'];

        if (metric.id === "payment_3c" || metric.id === "payment_3c_lcd") {
          filtered = filtered.filter(p => {
            const bName = (p.brand_name || "").toLowerCase().trim();
            const cat = (p.category || "").toLowerCase().trim();
            const isLcdTeamCategory = (bName === 'vivan' || bName === 'xpas') && validLcdCats.includes(cat);
            return brandsPayment3C.includes(bName) && !isLcdTeamCategory;
          });
        }

        let lcdOmsetData = [];
        if (metric.id === "payment_3c_lcd") {
          const { data: kpiData, error: kpiError } = await supabase
            .from("salesman_kpi")
            .select("*")
            .eq("period_month", periodMonth)
            .eq("period_year", periodYear)
            .eq("salesman_code", trimmedCode);
          
          if (!kpiError && kpiData) {
            lcdOmsetData = kpiData.filter(p => {
              const bName = (p.brand_name || "").toLowerCase().trim();
              const cat = (p.category || "").toLowerCase().trim();
              const isLcdTeamCategory = (bName === 'vivan' || bName === 'xpas') && validLcdCats.includes(cat);
              const isLcdOmset = (bName === 'xpas' || bName === 'vivan') && cat === 'screen assembly';
              return isLcdOmset || isLcdTeamCategory;
            });
          }
        }

        const combinedData = [...filtered, ...lcdOmsetData];

        // Group by customer
        const groupedMap = new Map<string, any>();
        combinedData.forEach(p => {
          const key = p.customer_code || p.customer_name || "unknown";
          if (!groupedMap.has(key)) {
            groupedMap.set(key, {
              customer_code: p.customer_code || "",
              customer_name: p.customer_name || "Tanpa Nama",
              value: 0,
              records: []
            });
          }
          const item = groupedMap.get(key);
          item.value += Number(p.total_amount) || 0;
          item.records.push(p);
        });

        setCustomerDetails(Array.from(groupedMap.values()).sort((a, b) => b.value - a.value));
      } else if (metric.id.startsWith("program")) {
        // Query programs
        const table = metric.id === "program_bulanan_achieved" ? "program_bulanan" : "program_spu";
        const { data, error } = await supabase
          .from(table)
          .select("*")
          .eq("period_month", periodMonth)
          .eq("period_year", periodYear)
          .eq("salesman_code", trimmedCode);
        
        if (error) throw error;

        const list = (data || []).map((p: any) => ({
          customer_code: p.customer_code || "",
          customer_name: p.customer_name || "Tanpa Nama",
          value: Number(p.customer_achieve) || 0,
          target: Number(p.customer_targets) || 0,
          reward: p.customer_reward || "",
          isAchieved: (Number(p.customer_achieve) || 0) >= (Number(p.customer_targets) || 0) && (Number(p.customer_targets) || 0) > 0,
          records: [p]
        })).sort((a, b) => b.value - a.value);

        setCustomerDetails(list);
      } else if (metric.id === "perbaikan_display" || metric.id === "pemasangan_spanduk") {
        // Query manual activities
        const actType = metric.id === "perbaikan_display" ? "perbaikan_display" : "pemasangan_spanduk_stiker";
        const { data, error } = await supabase
          .from("salesman_manual_activities")
          .select("*")
          .eq("period_month", periodMonth)
          .eq("period_year", periodYear)
          .eq("salesman_code", trimmedCode)
          .eq("activity_type", actType);

        if (error) throw error;

        const groupedMap = new Map<string, any>();
        (data || []).forEach(p => {
          const key = p.customer_code || p.customer_name || "unknown";
          if (!groupedMap.has(key)) {
            groupedMap.set(key, {
              customer_code: p.customer_code || "",
              customer_name: p.customer_name || "Tanpa Nama",
              value: 0,
              records: []
            });
          }
          const item = groupedMap.get(key);
          item.value += 1;
          item.records.push(p);
        });

        setCustomerDetails(Array.from(groupedMap.values()).sort((a, b) => b.value - a.value));
      } else {
        // Query salesman_kpi
        let { data, error } = await supabase
          .from("salesman_kpi")
          .select("*")
          .eq("period_month", periodMonth)
          .eq("period_year", periodYear)
          .eq("salesman_code", trimmedCode);

        if (error) throw error;

        let filtered = data || [];
        if (salesmanCode && smData?.salesman_name) {
          filtered = filtered.filter((p: any) => !p.salesman_name || p.salesman_name === smData.salesman_name);
        }

        // Apply filters depending on metric
        const validLcdCats = ['vivan lcd team', 'vivan sparepart', 'xpas sparepart', 'xpas lcd 事业部'];
        const brandsGeneral = ['vivan', 'robot', 'acome acc', 'acome iot', 'gamen', 'aula', 'philips', 'xpas'];

        if (metric.id === "omset_lcd") {
          filtered = filtered.filter(s => {
            const bName = (s.brand_name || "").toLowerCase().trim();
            const cat = (s.category || "").toLowerCase().trim();
            return ['xpas', 'vivan'].includes(bName) && cat === 'screen assembly';
          });
        } else if (metric.id === "omset_redskull") {
          filtered = filtered.filter(s => (Number(s.omset_redskull) || 0) > 0);
        } else if (metric.id === "omset_3c" || metric.id === "co_3c") {
          filtered = filtered.filter(s => {
            const bName = (s.brand_name || "").toLowerCase().trim();
            const cat = (s.category || "").toLowerCase().trim();
            const isLcdTeamCategory = (bName === 'vivan' || bName === 'xpas') && validLcdCats.includes(cat);
            return brandsGeneral.includes(bName) && !isLcdTeamCategory;
          });
        } else if (metric.id === "hydrogel_pcs") {
          filtered = filtered.filter(s => (Number(s.hydrogel_pcs) || 0) > 0);
        } else if (metric.id === "tg_pcs") {
          filtered = filtered.filter(s => (Number(s.tg_pcs) || 0) > 0);
        } else if (metric.id === "new_customers") {
          const newCustKeys = new Set(filtered.filter(s => {
            const bName = (s.brand_name || "").toLowerCase().trim();
            const cat = (s.category || "").toLowerCase().trim();
            const isLcdTeamCategory = (bName === 'vivan' || bName === 'xpas') && validLcdCats.includes(cat);
            return (Number(s.new_customer) || 0) > 0 && brandsGeneral.includes(bName) && !isLcdTeamCategory;
          }).map(s => s.customer_code || s.customer_name || "unknown"));

          filtered = filtered.filter(s => {
            const bName = (s.brand_name || "").toLowerCase().trim();
            const cat = (s.category || "").toLowerCase().trim();
            const isLcdTeamCategory = (bName === 'vivan' || bName === 'xpas') && validLcdCats.includes(cat);
            const key = s.customer_code || s.customer_name || "unknown";
            return newCustKeys.has(key) && brandsGeneral.includes(bName) && !isLcdTeamCategory;
          });
        } else if (metric.id === "idle_customers") {
          const idleCustKeys = new Set(filtered.filter(s => {
            const bName = (s.brand_name || "").toLowerCase().trim();
            const cat = (s.category || "").toLowerCase().trim();
            const isLcdTeamCategory = (bName === 'vivan' || bName === 'xpas') && validLcdCats.includes(cat);
            return (Number(s.idle_customer) || 0) > 0 && brandsGeneral.includes(bName) && !isLcdTeamCategory;
          }).map(s => s.customer_code || s.customer_name || "unknown"));

          filtered = filtered.filter(s => {
            const bName = (s.brand_name || "").toLowerCase().trim();
            const cat = (s.category || "").toLowerCase().trim();
            const isLcdTeamCategory = (bName === 'vivan' || bName === 'xpas') && validLcdCats.includes(cat);
            const key = s.customer_code || s.customer_name || "unknown";
            return idleCustKeys.has(key) && brandsGeneral.includes(bName) && !isLcdTeamCategory;
          });
        } else if (metric.id === "co_mesin_vqm") {
          filtered = filtered.filter(s => (Number(s.co_mesin_vqm) || 0) > 0);
        } else if (metric.id === "co_tg") {
          filtered = filtered.filter(s => (Number(s.co_tg) || 0) > 0);
        } else if (metric.id === "omset_5jt") {
          // Pre-filter to 3C + other brands with LCD exclusion
          filtered = filtered.filter(s => {
            const bName = (s.brand_name || "").toLowerCase().trim();
            const cat = (s.category || "").toLowerCase().trim();
            const isLcdTeamCategory = (bName === 'vivan' || bName === 'xpas') && validLcdCats.includes(cat);
            return brandsGeneral.includes(bName) && !isLcdTeamCategory;
          });
        }

        // Group by customer
        const groupedMap = new Map<string, any>();
        filtered.forEach(s => {
          const key = s.customer_code || s.customer_name || "unknown";
          if (!groupedMap.has(key)) {
            groupedMap.set(key, {
              customer_code: s.customer_code || "",
              customer_name: s.customer_name || "Tanpa Nama",
              value: 0,
              qty: 0,
              records: []
            });
          }
          const item = groupedMap.get(key);
          
          if (metric.id === "hydrogel_pcs") {
            item.value += Number(s.hydrogel_pcs) || 0;
          } else if (metric.id === "tg_pcs") {
            item.value += Number(s.tg_pcs) || 0;
          } else {
            item.value += Number(s.total_amount) || 0;
          }
          item.qty += Number(s.qty) || Number(s.qty_order) || 0;
          item.records.push(s);
        });

        let finalDetails = Array.from(groupedMap.values());

        if (metric.id === "omset_5jt") {
          // Filter to those with >= 5,000,000
          finalDetails = finalDetails.filter(c => c.value >= 5000000);
        }

        finalDetails.sort((a, b) => b.value - a.value);
        setCustomerDetails(finalDetails);
      }
    } catch (err) {
      console.error("Gagal memuat detail kpi customer:", err);
    } finally {
      setDetailLoading(false);
    }
  };

  const getProductBreakdown = (records: any[]) => {
    const prodMap = new Map<string, any>();
    records.forEach(r => {
      const pName = r.goods_name || r.product_name || "Produk Lainnya";
      if (!prodMap.has(pName)) {
        prodMap.set(pName, {
          goods_name: pName,
          qty: 0,
          total_amount: 0
        });
      }
      const item = prodMap.get(pName);
      item.qty += Number(r.qty) || Number(r.qty_order) || 0;
      item.total_amount += Number(r.total_amount) || 0;
    });
    return Array.from(prodMap.values()).sort((a, b) => b.total_amount - a.total_amount);
  };

  const getPaymentBreakdown = (records: any[]) => {
    return records.map(r => ({
      brand_name: r.brand_name || "All Brands",
      category: r.category || "General",
      total_amount: Number(r.total_amount) || 0,
      payment_date: r.payment_date || "-"
    }));
  };

  const getActivityBreakdown = (records: any[]) => {
    return records.map(r => ({
      sub_activity_type: r.sub_activity_type || "Aktivitas",
      created_at: r.created_at ? new Date(r.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "-"
    }));
  };

  const metricsWithTarget = METRICS.filter(m => {
    if (!m.targetKey) return false;
    const targetValue = smTarget ? (Number(smTarget[m.targetKey]) || 0) : 0;
    return targetValue > 0;
  }).sort((a, b) => {
    const valA = smData ? (Number(smData[a.id]) || 0) : 0;
    const targetA = smTarget ? (Number(smTarget[a.targetKey!]) || 0) : 0;
    const percA = targetA > 0 ? (valA / targetA) * 100 : 0;

    const valB = smData ? (Number(smData[b.id]) || 0) : 0;
    const targetB = smTarget ? (Number(smTarget[b.targetKey!]) || 0) : 0;
    const percB = targetB > 0 ? (valB / targetB) * 100 : 0;

    return percB - percA;
  });
  
  const metricsWithoutTarget = METRICS.filter(m => {
    if (!m.targetKey) return true;
    const targetValue = smTarget ? (Number(smTarget[m.targetKey]) || 0) : 0;
    return targetValue <= 0;
  });

  const currentMonthName = new Date(2000, periodMonth - 1).toLocaleString("id-ID", { month: "short" }).toUpperCase();
  const prevMonthName = new Date(2000, (periodMonth - 2 + 12) % 12).toLocaleString("id-ID", { month: "short" }).toUpperCase();

  const renderMetricCard = (metric: any) => {
    const isExpanded = expandedMetricId === metric.id;
    const value = smData ? (Number(smData[metric.id]) || 0) : 0;
    const targetValue = smTarget ? (Number(smTarget[metric.targetKey]) || 0) : 0;
    
    let percentage = 0;
    if (targetValue > 0) {
      percentage = (value / targetValue) * 100;
    }
    
    const diff = value - targetValue;
    const isUp = diff >= 0 && targetValue > 0;
    const isDown = diff < 0 && targetValue > 0;

    const displayValue = metric.format === 'currency' 
      ? formatCurrency(value) 
      : metric.format === 'percentage'
        ? `${value.toLocaleString('id-ID', { maximumFractionDigits: 2 })}%`
        : `${value.toLocaleString('id-ID')}${metric.suffix || ''}`;

    const displayTarget = metric.format === 'currency' 
      ? formatCurrency(targetValue) 
      : metric.format === 'percentage'
        ? `${targetValue.toLocaleString('id-ID', { maximumFractionDigits: 2 })}%`
        : `${targetValue.toLocaleString('id-ID')}${metric.suffix || ''}`;
        
    const displayDiff = metric.format === 'currency' 
      ? formatCurrency(Math.abs(diff)) 
      : metric.format === 'percentage'
        ? `${Math.abs(diff).toLocaleString('id-ID', { maximumFractionDigits: 2 })}%`
        : `${Math.abs(diff).toLocaleString('id-ID')}${metric.suffix || ''}`;

    return (
      <div key={metric.id} className={`border-slate-100 shadow-sm overflow-hidden transition-all duration-300 rounded-xl bg-white mb-3 ${isExpanded ? 'ring-1 ring-indigo-200' : ''}`}>
        <div
          onClick={() => setExpandedMetricId(isExpanded ? null : metric.id)}
          className={`p-3 flex justify-between items-center gap-3 cursor-pointer transition-colors relative overflow-hidden ${
            isDown ? "bg-red-50/30" : isUp ? "bg-emerald-50/30" : "bg-slate-50/50"
          }`}
        >
          <div className="flex items-center gap-3 flex-1">
            <div className="flex-1">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight leading-tight">
                {metric.label}
              </h3>
              <div className="text-[10px] font-semibold text-slate-500 flex items-center gap-1 mt-0.5">
                <span className="truncate max-w-[80px]">{displayTarget}</span>
                <span className="text-slate-300">→</span>
                <span className="text-slate-800 font-bold truncate max-w-[80px]">{displayValue}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isDown ? (
              <div className="flex items-center gap-0.5 text-red-600 bg-red-100/50 px-2 py-1 rounded-lg font-bold text-[10px]">
                <span>-</span>
                <span>{displayDiff}</span>
              </div>
            ) : isUp ? (
              <div className="flex items-center gap-0.5 text-emerald-600 bg-emerald-100/50 px-2 py-1 rounded-lg font-bold text-[10px]">
                <span>+</span>
                <span>{displayDiff}</span>
              </div>
            ) : (
              <div className="flex items-center gap-0.5 text-slate-600 bg-slate-100/80 px-2 py-1 rounded-lg font-bold text-[10px]">
                <Minus className="w-3 h-3" />
                <span>0</span>
              </div>
            )}
            
            <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.3 }}>
              <div className="p-1.5 bg-white rounded-md shadow-sm border border-slate-100 text-slate-400">
                <ChevronDown className="w-4 h-4" />
              </div>
            </motion.div>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              key="expanded"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <div className="p-3 border-t border-slate-100 bg-slate-50/20 text-xs">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-slate-500">Pencapaian:</span>
                  <span className={`font-bold ${percentage >= 100 ? 'text-emerald-600' : 'text-indigo-600'}`}>
                    {percentage.toFixed(1)}%
                  </span>
                </div>
                
                {/* Clickable Progress Bar / Slider */}
                <div 
                  className="w-full bg-slate-200 rounded-full h-4 mb-3 overflow-hidden cursor-pointer hover:bg-slate-300 ring-1 ring-slate-300/50 active:scale-[0.99] transition-all relative"
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    loadCustomerDetails(metric); 
                  }}
                  title="Klik untuk melihat list customer dan omset"
                >
                  <div 
                    className={`h-4 rounded-full transition-all duration-500 ${percentage >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} 
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  ></div>
                  <div className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-slate-700 pointer-events-none mix-blend-difference">
                    KLIK UNTUK ANALISA CUSTOMER
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="bg-white p-2 rounded-lg border border-slate-100">
                    <p className="text-[9px] text-slate-400 uppercase font-semibold mb-0.5">Target</p>
                    <p className="font-bold text-slate-700">{displayTarget}</p>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-100">
                    <p className="text-[9px] text-slate-400 uppercase font-semibold mb-0.5">{isDown ? 'Kekurangan' : 'Kelebihan'}</p>
                    <p className={`font-bold ${isDown ? 'text-red-600' : 'text-emerald-600'}`}>
                      {displayDiff}
                    </p>
                  </div>
                </div>

                {/* Additional Action Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    loadCustomerDetails(metric);
                  }}
                  className="w-full mt-3 flex items-center justify-center gap-1.5 py-2 px-3 bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-200 text-indigo-700 rounded-lg text-[10px] font-black tracking-wider uppercase transition-all border border-indigo-100"
                >
                  <Users className="w-3.5 h-3.5" />
                  Lihat Detail Customer ({percentage.toFixed(1)}%)
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white px-4 py-3 border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-black text-slate-800 tracking-tight uppercase flex items-center gap-2">
            <Target className="w-4 h-4 text-indigo-500" />
            Laporan KPI
          </h2>
          <div className="flex gap-2">
            <select
              value={periodMonth}
              onChange={(e) => setPeriodMonth(Number(e.target.value))}
              className="px-2 py-1 text-xs font-bold border-slate-200 rounded-lg bg-slate-50 focus:border-indigo-500 focus:ring-indigo-500"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {new Date(2000, m - 1).toLocaleString("id-ID", { month: "short" })}
                </option>
              ))}
            </select>
            <select
              value={periodYear}
              onChange={(e) => setPeriodYear(Number(e.target.value))}
              className="px-2 py-1 text-xs font-bold border-slate-200 rounded-lg bg-slate-50 focus:border-indigo-500 focus:ring-indigo-500"
            >
              {Array.from({ length: 5 }, (_, i) => currentYear - 2 + i).map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="p-3 bg-slate-50">
        {isLoading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-slate-200 h-20 rounded-xl w-full"></div>
            ))}
          </div>
        ) : fetchError ? (
          <div className="p-6 text-center text-red-500 bg-red-50 rounded-xl border border-red-100 shadow-sm mt-4">
            <Activity className="w-10 h-10 mx-auto text-red-300 mb-2" />
            <p className="font-medium text-sm">Gagal Memuat Data</p>
            <p className="text-xs text-red-400 mt-1">{fetchError}</p>
          </div>
        ) : !smData ? (
          <div className="p-6 text-center text-slate-500 bg-white rounded-xl border border-slate-100 shadow-sm mt-4">
            <Target className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="font-medium text-sm">Data KPI tidak ditemukan</p>
            <p className="text-xs text-slate-400 mt-1">Belum ada data untuk bulan ini.</p>
          </div>
        ) : (
          <div className="pb-8 space-y-3">
              {/* Rangkuman Poin KPI */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-3">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-yellow-500" />
                      Poin KPI Saya
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-1">
                      {smData?.team_name ? (
                        <span>Tim: <strong className="text-slate-700">{smData.team_name}</strong> • {isLeader ? "Leader" : "Anggota"}</span>
                      ) : (
                        <span>Jabatan: <strong className="text-slate-700">Salesman</strong></span>
                      )}
                    </p>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                    isEligible ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"
                  }`}>
                    Poin {isEligible ? "Aktif" : "Non-Aktif"}
                  </div>
                </div>

                {isEligible ? (
                  <div className="flex items-center gap-4 bg-slate-50/50 rounded-xl p-3 border border-slate-100">
                    <div className="text-center shrink-0">
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">Total Poin</p>
                      <span className={`text-2xl font-black px-3 py-1 rounded-lg inline-block ${
                        totalKpiPoints >= 50 
                          ? "bg-emerald-100 text-emerald-700 shadow-sm shadow-emerald-100/50" 
                          : totalKpiPoints > 0
                            ? "bg-indigo-100 text-indigo-700 shadow-sm shadow-indigo-100/50"
                            : totalKpiPoints === 0
                              ? "bg-slate-100 text-slate-600"
                              : "bg-rose-100 text-rose-700 shadow-sm shadow-rose-100/50"
                      }`}>
                        {totalKpiPoints > 0 ? `+${totalKpiPoints}` : totalKpiPoints}
                      </span>
                    </div>
                    <div className="flex-1 text-xs text-slate-600 leading-tight">
                      {totalKpiPoints >= 50 ? (
                        <span>Kinerja luar biasa! Anda melampaui ekspektasi target tim poin bulan ini. 🔥</span>
                      ) : totalKpiPoints >= 10 ? (
                        <span>Kerja bagus! Terus tingkatkan pencapaian untuk memaksimalkan akumulasi poin. 👍</span>
                      ) : totalKpiPoints === 0 ? (
                        <span>Ketentuan poin aktif, namun belum ada akumulasi poin yang terkumpul. Mulai penuhi target sekarang! 🎯</span>
                      ) : (
                        <span className="text-rose-600 font-medium">Perhatian: Akumulasi poin Anda bernilai minus bulan ini. Segera penuhi target KPI minimal! ⚠️</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-3 text-xs text-amber-800 leading-normal">
                    Status keikutsertaan poin Anda sedang dinonaktifkan oleh administrator. Silakan hubungi admin tim kpi untuk mengaktifkan kembali.
                  </div>
                )}

                {isEligible && (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => setShowPointsBreakdown(!showPointsBreakdown)}
                      className="w-full flex justify-between items-center py-2 px-3 bg-slate-100 hover:bg-slate-200/80 active:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-black tracking-wider uppercase transition-all"
                    >
                      <span>{showPointsBreakdown ? "Sembunyikan Rincian Poin" : "Lihat Rincian Perolehan Poin"}</span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${showPointsBreakdown ? "rotate-180" : ""}`} />
                    </button>

                    <AnimatePresence>
                      {showPointsBreakdown && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden mt-2 border border-slate-100 rounded-xl"
                        >
                          <div className="divide-y divide-slate-100 bg-slate-50/40 text-[11px]">
                            {pointsList.map((pt) => {
                              const pVal = Number(smData?.[pt.key]) || 0;
                              return (
                                <div key={pt.key} className="flex justify-between items-center p-2.5 hover:bg-slate-50 transition-colors">
                                  <span className="text-slate-600 font-medium">{pt.label}</span>
                                  <span className={`font-black px-2 py-0.5 rounded text-[10px] ${
                                    pVal > 0 
                                      ? "bg-emerald-100 text-emerald-700" 
                                      : pVal === 0 
                                        ? "bg-slate-100 text-slate-500" 
                                        : "bg-rose-100 text-rose-700"
                                  }`}>
                                    {pVal > 0 ? `+${pVal}` : pVal}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight pt-2 border-t border-slate-200">Target KPI</h3>
              {metricsWithTarget.map(metric => renderMetricCard(metric))}
          </div>
        )}
      </div>

      {/* KPI Drilldown Bottom Sheet / Sliding Drawer */}
      <AnimatePresence>
        {selectedMetricForDetail && (
          <div className="fixed inset-0 z-[60] flex items-end justify-center">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setSelectedMetricForDetail(null);
                setSelectedCustomerForDetail(null);
              }}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs"
            />

            {/* Bottom Sheet Container */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="relative bg-white w-full rounded-t-3xl h-[85dvh] flex flex-col shadow-2xl overflow-hidden"
            >
              {/* Drag indicator bar */}
              <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto my-3 shrink-0" />

              {/* SHEET HEADER */}
              <div className="px-4 pb-3 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  {selectedCustomerForDetail ? (
                    <button
                      onClick={() => setSelectedCustomerForDetail(null)}
                      className="p-1.5 rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100 active:scale-95 transition-all"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                  ) : (
                    <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                      <Target className="w-4 h-4" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-sm font-black text-slate-900 tracking-tight leading-none uppercase">
                      {selectedCustomerForDetail ? "Detail Transaksi" : "Detail Customer"}
                    </h3>
                    <p className="text-[10px] font-bold text-indigo-600 mt-1 uppercase tracking-wider">
                      {selectedCustomerForDetail ? selectedCustomerForDetail.customer_name : selectedMetricForDetail.label}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedMetricForDetail(null);
                    setSelectedCustomerForDetail(null);
                  }}
                  className="p-1.5 rounded-lg bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* SHEET CONTENT AREA */}
              <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 pb-12">
                {detailLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500">
                    <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                    <p className="text-xs font-semibold">Mengambil data detail...</p>
                  </div>
                ) : !selectedCustomerForDetail ? (
                  /* ================= SCREEN 1: CUSTOMER LIST ================= */
                  <div className="space-y-3">
                    {/* Search Customer Input */}
                    <div className="relative flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={searchCustomer}
                          onChange={(e) => setSearchCustomer(e.target.value)}
                          placeholder="Cari customer berdasarkan nama/kode..."
                          className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none placeholder-slate-400 font-medium"
                        />
                        <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                      </div>
                      
                      {(selectedMetricForDetail?.id === "perbaikan_display" || selectedMetricForDetail?.id === "pemasangan_spanduk") && (
                        <button
                          onClick={() => setShowAddManualActivity(true)}
                          className="px-3 py-2 shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                        >
                          + Tambah
                        </button>
                      )}
                    </div>

                    <div className="space-y-2 pr-1">
                      {customerDetails.filter(c => {
                        const term = searchCustomer.toLowerCase().trim();
                        return (
                          (c.customer_name || "").toLowerCase().includes(term) ||
                          (c.customer_code || "").toLowerCase().includes(term)
                        );
                      }).length === 0 ? (
                        <div className="py-10 text-center text-slate-400 text-xs">
                          Tidak ada data customer yang cocok.
                        </div>
                      ) : (
                        selectedMetricForDetail.id.startsWith("program_") ? (
                          <div className="space-y-3">
                            {customerDetails
                              .filter(c => {
                                const term = searchCustomer.toLowerCase().trim();
                                return (
                                  (c.customer_name || "").toLowerCase().includes(term) ||
                                  (c.customer_code || "").toLowerCase().includes(term)
                                );
                              })
                              .sort((a, b) => {
                                const percentA = a.target > 0 ? (a.value / a.target) * 100 : 0;
                                const percentB = b.target > 0 ? (b.value / b.target) * 100 : 0;
                                return percentB - percentA;
                              })
                              .map((c, i) => {
                                const isSpu = selectedMetricForDetail.id === 'program_spu_achieved';
                                const formatCurr = (val: number) => {
                                  if (isSpu) {
                                    return val.toLocaleString('id-ID'); // Tidak pakai Rp untuk SPU (SKU)
                                  }
                                  // For mobile, shorten large numbers if possible, or use standard format
                                  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
                                };
                                
                                const formatKurang = (val: number) => {
                                  if (isSpu) return val.toLocaleString('id-ID');
                                  // Shorten for "Kekurangan" on mobile: Rp 1.500.000 -> 1,5Jt
                                  if (val >= 1000000) {
                                    return `Rp ${(val / 1000000).toLocaleString('id-ID', {maximumFractionDigits: 1})}Jt`;
                                  } else if (val >= 1000) {
                                    return `Rp ${(val / 1000).toLocaleString('id-ID', {maximumFractionDigits: 0})}Rb`;
                                  }
                                  return formatCurr(val);
                                };

                                const isProgramAchieved = c.isAchieved;
                                const percentAchieved = c.target > 0 ? (c.value / c.target) * 100 : 0;
                                const shortage = c.target > c.value ? c.target - c.value : 0;

                                return (
                                  <div 
                                    key={c.customer_code || c.customer_name} 
                                    className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 flex flex-col gap-3 cursor-pointer"
                                    onClick={() => {
                                      if (c.records && c.records.length > 0) {
                                        setSelectedCustomerForDetail(c);
                                      }
                                    }}
                                  >
                                    <div className="flex justify-between items-start gap-2">
                                      <div className="flex items-start gap-2 flex-1 min-w-0">
                                        <span className="w-5 h-5 rounded flex-shrink-0 bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 mt-0.5">
                                          {i + 1}
                                        </span>
                                        <h4 className="font-bold text-sm text-slate-800 leading-tight break-words">
                                          {c.customer_name}
                                        </h4>
                                      </div>
                                      <div className="flex-shrink-0 text-right">
                                        {isSpu ? (
                                          <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-2 py-1 flex flex-col items-end">
                                            <span className="text-[9px] text-indigo-500 font-bold uppercase tracking-wider">Reward</span>
                                            <span className="text-xs font-bold text-indigo-700">
                                              {c.reward && !isNaN(Number(c.reward)) 
                                                ? new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(c.reward)) 
                                                : c.reward || '-'}
                                            </span>
                                          </div>
                                        ) : (
                                          <div className={`border rounded-lg px-2 py-1 flex flex-col items-center justify-center min-w-[50px] ${isProgramAchieved ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                                            <span className={`text-[9px] font-bold uppercase tracking-wider ${isProgramAchieved ? 'text-emerald-600' : 'text-rose-600'}`}>Join</span>
                                            {isProgramAchieved ? (
                                              <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5" />
                                            ) : (
                                              <XCircle className="w-4 h-4 text-rose-500 mt-0.5" />
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-y-2 gap-x-4 bg-slate-50 p-2.5 rounded-lg">
                                      <div className="flex flex-col">
                                        <span className="text-[10px] text-slate-500 font-medium">Target</span>
                                        <span className="text-[11px] sm:text-xs font-semibold text-slate-700">{formatCurr(c.target || 0)}</span>
                                      </div>
                                      <div className="flex flex-col items-end text-right">
                                        <span className="text-[10px] text-slate-500 font-medium">Achieve</span>
                                        <span className="text-[11px] sm:text-xs font-bold text-indigo-600">{formatCurr(c.value || 0)}</span>
                                      </div>
                                      <div className="flex flex-col">
                                        <span className="text-[10px] text-slate-500 font-medium">Kekurangan</span>
                                        <span className="text-[11px] sm:text-xs font-semibold text-rose-600">
                                          {shortage > 0 ? formatCurr(shortage) : '-'}
                                        </span>
                                      </div>
                                      <div className="flex flex-col items-end text-right">
                                        <span className="text-[10px] text-slate-500 font-medium">Pencapaian</span>
                                        <span className={`text-[11px] sm:text-xs font-bold ${isProgramAchieved ? 'text-emerald-600' : 'text-amber-600'}`}>
                                          {percentAchieved.toFixed(0)}%
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        ) : (
                        customerDetails
                          .filter(c => {
                            const term = searchCustomer.toLowerCase().trim();
                            return (
                              (c.customer_name || "").toLowerCase().includes(term) ||
                              (c.customer_code || "").toLowerCase().includes(term)
                            );
                          })
                          .sort((a, b) => (b.value || 0) - (a.value || 0))
                          .map((c) => (
                            <div
                              key={c.customer_code || c.customer_name}
                              onClick={() => {
                                // Only open details if there are records
                                if (c.records && c.records.length > 0) {
                                  setSelectedCustomerForDetail(c);
                                }
                              }}
                              className="flex items-center justify-between p-3 border border-slate-100 rounded-xl hover:bg-indigo-50/20 cursor-pointer active:scale-[0.99] transition-all bg-white shadow-xs"
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                  <Users className="w-4 h-4" />
                                </div>
                                <div className="text-left min-w-0">
                                  <p className="text-xs font-bold text-slate-800 leading-tight truncate">
                                    {c.customer_name}
                                  </p>
                                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                    {c.customer_code || "Tanpa Kode"}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right shrink-0 pl-2">
                                <p className="text-xs font-black text-slate-900">
                                  {selectedMetricForDetail.format === 'currency'
                                    ? formatCurrency(c.value)
                                    : `${c.value.toLocaleString('id-ID')} ${selectedMetricForDetail.suffix || ''}`}
                                </p>
                                {c.target > 0 && (
                                  <p className="text-[9px] text-indigo-600 font-semibold mt-0.5">
                                    Target: {selectedMetricForDetail.format === 'currency' ? formatCurrency(c.target) : c.target}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))
                        )
                      )}
                    </div>
                  </div>
                ) : (
                  /* ================= SCREEN 2: PRODUCTS TABLE BREAKDOWN ================= */
                  <div className="space-y-4">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between items-center text-xs">
                      <div>
                        <p className="text-[9px] text-slate-400 font-black uppercase">Customer</p>
                        <p className="font-bold text-slate-800">{selectedCustomerForDetail.customer_name}</p>
                        <p className="text-[10px] font-mono text-slate-500 mt-0.5">{selectedCustomerForDetail.customer_code || "-"}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] text-slate-400 font-black uppercase">Total Kontribusi</p>
                        <p className="font-black text-indigo-600 text-sm">
                          {selectedMetricForDetail.format === 'currency'
                            ? formatCurrency(selectedCustomerForDetail.value)
                            : `${selectedCustomerForDetail.value.toLocaleString('id-ID')} ${selectedMetricForDetail.suffix || ''}`}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-wider mb-2">Breakdown Item / Transaksi</h4>
                      
                      {selectedMetricForDetail.id.startsWith("payment") ? (
                        /* Payments breakdown table */
                        <div className="overflow-x-auto w-full border border-slate-100 rounded-xl bg-white shadow-xs">
                          <table className="min-w-full divide-y divide-slate-100">
                            <thead className="bg-slate-50">
                              <tr>
                                <th className="px-3 py-2 text-left text-[9px] font-black text-slate-400 uppercase tracking-wider">Brand</th>
                                <th className="px-3 py-2 text-left text-[9px] font-black text-slate-400 uppercase tracking-wider">Kategori</th>
                                <th className="px-3 py-2 text-right text-[9px] font-black text-slate-400 uppercase tracking-wider">Nominal</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {getPaymentBreakdown(selectedCustomerForDetail.records).map((pay: any, idx: number) => (
                                <tr key={idx} className="hover:bg-slate-50/50">
                                  <td className="px-3 py-2 text-xs text-slate-800 font-bold uppercase">{pay.brand_name}</td>
                                  <td className="px-3 py-2 text-xs text-slate-600">{pay.category}</td>
                                  <td className="px-3 py-2 text-xs text-slate-900 text-right font-black">{formatCurrency(pay.total_amount)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : selectedMetricForDetail.id === "perbaikan_display" || selectedMetricForDetail.id === "pemasangan_spanduk" ? (
                        /* Manual Activities breakdown table */
                        <div className="overflow-x-auto w-full border border-slate-100 rounded-xl bg-white shadow-xs">
                          <table className="min-w-full divide-y divide-slate-100">
                            <thead className="bg-slate-50">
                              <tr>
                                <th className="px-3 py-2 text-left text-[9px] font-black text-slate-400 uppercase tracking-wider">Aktivitas</th>
                                <th className="px-3 py-2 text-right text-[9px] font-black text-slate-400 uppercase tracking-wider">Tanggal</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {getActivityBreakdown(selectedCustomerForDetail.records).map((act: any, idx: number) => (
                                <tr key={idx} className="hover:bg-slate-50/50">
                                  <td className="px-3 py-2 text-xs text-slate-800 font-bold">{act.sub_activity_type}</td>
                                  <td className="px-3 py-2 text-xs text-slate-600 text-right font-medium">{act.created_at}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        /* Regular KPI Salesman Products breakdown table */
                        <div className="overflow-x-auto w-full border border-slate-100 rounded-xl bg-white shadow-xs">
                          <table className="min-w-full divide-y divide-slate-100">
                            <thead className="bg-slate-50">
                              <tr>
                                <th className="px-3 py-2 text-left text-[9px] font-black text-slate-400 uppercase tracking-wider">Nama Produk</th>
                                <th className="px-3 py-2 text-right text-[9px] font-black text-slate-400 uppercase tracking-wider">Qty</th>
                                <th className="px-3 py-2 text-right text-[9px] font-black text-slate-400 uppercase tracking-wider">Omset</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {getProductBreakdown(selectedCustomerForDetail.records).map((prod: any, idx: number) => (
                                <tr key={idx} className="hover:bg-slate-50/50">
                                  <td className="px-3 py-2 text-xs text-slate-800 font-semibold leading-tight">{prod.goods_name}</td>
                                  <td className="px-3 py-2 text-xs text-slate-600 text-right font-mono font-bold">{prod.qty.toLocaleString('id-ID')}</td>
                                  <td className="px-3 py-2 text-xs text-slate-900 text-right font-black">{formatCurrency(prod.total_amount)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => setSelectedCustomerForDetail(null)}
                      className="w-full mt-2 py-2 px-4 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 transition-all active:scale-[0.99]"
                    >
                      Kembali ke Daftar Customer
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Manual Activity Modal */}
      <AnimatePresence>
        {showAddManualActivity && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddManualActivity(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="relative bg-white w-full max-w-sm rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h3 className="font-bold text-slate-800 text-sm">
                  Tambah Customer Manual
                </h3>
                <button
                  onClick={() => setShowAddManualActivity(false)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 space-y-3">
                <div className="relative">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Nama Customer *
                  </label>
                  <input
                    type="text"
                    value={manualActivityForm.customerName}
                    onChange={(e) => {
                      setManualActivityForm({ ...manualActivityForm, customerName: e.target.value });
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="Ketik nama customer / toko..."
                  />
                  {showSuggestions && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setShowSuggestions(false)} 
                      />
                      <div className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg divide-y divide-slate-100">
                        {isLoadingCusts ? (
                          <div className="p-3 text-xs text-slate-500 text-center flex items-center justify-center gap-2">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                            Memuat daftar customer...
                          </div>
                        ) : filteredSuggestions.length > 0 ? (
                          filteredSuggestions.map((c, idx) => (
                            <div
                              key={idx}
                              onClick={() => {
                                setManualActivityForm({
                                  ...manualActivityForm,
                                  customerName: c.customer_name || "",
                                  customerCode: c.customer_code || ""
                                });
                                setShowSuggestions(false);
                              }}
                              className="px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 cursor-pointer flex flex-col text-left transition-all"
                            >
                              <span className="font-bold text-slate-800">{c.customer_name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{c.customer_code || "Tanpa Kode"}</span>
                            </div>
                          ))
                        ) : manualActivityForm.customerName.trim() ? (
                          <div className="p-3 text-xs text-slate-500 text-center">
                            Tidak ditemukan. Gunakan nama yang diketik.
                          </div>
                        ) : allSalesmanCustomers.length > 0 ? (
                          allSalesmanCustomers.slice(0, 5).map((c, idx) => (
                            <div
                              key={idx}
                              onClick={() => {
                                setManualActivityForm({
                                  ...manualActivityForm,
                                  customerName: c.customer_name || "",
                                  customerCode: c.customer_code || ""
                                });
                                setShowSuggestions(false);
                              }}
                              className="px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 cursor-pointer flex flex-col text-left transition-all"
                            >
                              <span className="font-bold text-slate-800">{c.customer_name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{c.customer_code || "Tanpa Kode"}</span>
                            </div>
                          ))
                        ) : (
                          <div className="p-3 text-xs text-slate-500 text-center">
                            Tidak ada daftar customer untuk salesman ini.
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Kode Customer (Opsional)
                  </label>
                  <input
                    type="text"
                    value={manualActivityForm.customerCode}
                    onChange={(e) => setManualActivityForm({ ...manualActivityForm, customerCode: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="Kode customer"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Keterangan / Aktivitas *
                  </label>
                  <textarea
                    rows={2}
                    value={manualActivityForm.subActivityType}
                    onChange={(e) => setManualActivityForm({ ...manualActivityForm, subActivityType: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder={selectedMetricForDetail?.id === "perbaikan_display" ? "Cth: Ganti lampu etalase" : "Cth: Pasang 2 spanduk"}
                  />
                </div>
              </div>
              <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
                <button
                  onClick={() => setShowAddManualActivity(false)}
                  className="px-3 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  onClick={handleSubmitManualActivity}
                  disabled={isSubmittingManual}
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-2 disabled:opacity-70"
                >
                  {isSubmittingManual ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    "Simpan"
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
