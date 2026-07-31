import { useState, useEffect, useMemo } from "react";
import { supabase } from "../../../../services/supabase";
import { format, startOfMonth, subMonths, isSameMonth, parseISO } from "date-fns";
import { id } from "date-fns/locale";

export function useRevenueData(periodMonth: number, periodYear: number, selectedSalesman: string) {
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);

  const [targets, setTargets] = useState<any[]>([]);

  useEffect(() => {
    fetchOrders();
    fetchTargets();
  }, [periodMonth, periodYear]);

  const fetchTargets = async () => {
    try {
      const { data, error } = await supabase.from("salesman_kpi_targets").select("*");
      if (error) throw error;
      setTargets(data || []);
    } catch (error) {
      console.error("Error fetching targets:", error);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const selectedDate = new Date(periodYear, periodMonth - 1, 1);
      const lastMonthDate = subMonths(selectedDate, 1);
      const twoMonthsAgoDate = subMonths(selectedDate, 2);

      const periods = [
        { m: periodMonth, y: periodYear },
        { m: lastMonthDate.getMonth() + 1, y: lastMonthDate.getFullYear() },
        { m: twoMonthsAgoDate.getMonth() + 1, y: twoMonthsAgoDate.getFullYear() }
      ];

      const userRole = localStorage.getItem("user_role") || "admin";
      const smCode = localStorage.getItem("salesman_code");

      const fetchParallel = async (table: string, selectCols: string) => {
        const periodsFilter = periods.map(p => `and(period_month.eq.${p.m},period_year.eq.${p.y})`).join(',');

        let countQuery = supabase
          .from(table)
          .select("*", { count: "exact", head: true })
          .or(periodsFilter);

        if (userRole === "salesman" && smCode) {
          countQuery = countQuery.eq("salesman_code", smCode);
        }

        const { count, error: countError } = await countQuery;
        if (countError) throw countError;
        if (!count) return [];

        const results: any[] = [];
        for (let i = 0; i < count; i += 1000) {
          let dataQuery = supabase
            .from(table)
            .select(selectCols)
            .or(periodsFilter)
            .range(i, i + 999);

          if (userRole === "salesman" && smCode) {
            dataQuery = dataQuery.eq("salesman_code", smCode);
          }
          
          const { data, error } = await dataQuery;
          if (error) throw error;
          if (data) {
            for (let j = 0; j < data.length; j++) {
               results.push(data[j]);
            }
          }
        }

        return results;
      };

      const [allOrders, allPayments] = await Promise.all([
        fetchParallel(
          "salesman_kpi",
          "customer_name, brand_name, category, order_date, period_month, period_year, total_amount, salesman_name, goods_name, qty, lcd_pcs, hydrogel_pcs, salesman_code"
        ),
        fetchParallel(
          "salesman_payments",
          "customer_name, brand_name, category, payment_date, period_month, period_year, total_amount, salesman_name, salesman_code"
        ),
      ]);

      setOrders(allOrders);
      setPayments(allPayments);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const salesmen = useMemo(() => {
    const names = new Set<string>();
    orders.forEach((o) => {
      if (o.salesman_name) names.add(o.salesman_name);
    });
    payments.forEach((p) => {
      if (p.salesman_name) names.add(p.salesman_name);
    });
    return Array.from(names).sort();
  }, [orders, payments]);

  const analysisData = useMemo(() => {
    if (!orders.length)
      return {
        brandAnalysis3c_omset: [],
        brandAnalysisOthers_omset: [],
        brandAnalysis3c_payment: [],
        brandAnalysisOthers_payment: [],
        brandAnalysisLcd_omset: [],
        brandAnalysisLcd_payment: [],
      };

    const selectedDate = new Date(periodYear, periodMonth - 1, 1);
    const currentMonthDate = startOfMonth(selectedDate);
    const lastMonthDate = startOfMonth(subMonths(selectedDate, 1));
    const twoMonthsAgoDate = startOfMonth(subMonths(selectedDate, 2));

    const trackedBrands = ["VIVAN", "ROBOT", "ACOME ACC", "ACOME IOT", "GAMEN", "LCD XPAS", "LCD VIVAN"];

    const mappedOrders: any[] = [];
    orders.forEach((o) => {
      if (selectedSalesman !== "all" && (o.salesman_name || "").toLowerCase().trim() !== selectedSalesman.toLowerCase().trim()) return;
      const bName = (o.brand_name || "").toLowerCase().trim();
      const cat = (o.category || "").toLowerCase().trim();
      let mappedBrand = bName.toUpperCase();
      if (cat === "vivan lcd team" || cat === "vivan sparepart") mappedBrand = "LCD VIVAN";
      else if (bName === "vivan" && cat === "screen assembly") mappedBrand = "LCD VIVAN";
      else if (bName === "vivan" && cat !== "screen assembly") mappedBrand = "VIVAN";
      else if (bName === "robot") mappedBrand = "ROBOT";
      else if (bName === "acome acc") mappedBrand = "ACOME ACC";
      else if (bName === "acome iot") mappedBrand = "ACOME IOT";
      else if (bName === "gamen") mappedBrand = "GAMEN";
      else if (bName === "xpas") mappedBrand = "LCD XPAS";
      if (mappedBrand) mappedOrders.push({ ...o, mapped_brand: mappedBrand });
    });

    const mappedPayments: any[] = [];
    payments.forEach((p) => {
      if (selectedSalesman !== "all" && (p.salesman_name || "").toLowerCase().trim() !== selectedSalesman.toLowerCase().trim()) return;
      const bName = (p.brand_name || "").toLowerCase().trim();
      const cat = (p.category || "").toLowerCase().trim();
      let mappedBrand = bName.toUpperCase();
      if (cat === "vivan lcd team" || cat === "vivan sparepart") mappedBrand = "LCD VIVAN";
      else if (bName === "vivan" && cat === "screen assembly") mappedBrand = "LCD VIVAN";
      else if (bName === "vivan" && cat !== "screen assembly") mappedBrand = "VIVAN";
      else if (bName === "robot") mappedBrand = "ROBOT";
      else if (bName === "acome acc") mappedBrand = "ACOME ACC";
      else if (bName === "acome iot") mappedBrand = "ACOME IOT";
      else if (bName === "gamen") mappedBrand = "GAMEN";
      else if (bName === "xpas") mappedBrand = "LCD XPAS";
      if (mappedBrand) mappedPayments.push({ ...p, mapped_brand: mappedBrand });
    });

    const buildAnalysis = (mode: "omset" | "payment") => {
      const brandMap = new Map<string, any>();
      trackedBrands.forEach((b) => {
        brandMap.set(b, {
          brand_name: b, omset_current: 0, omset_last: 0, omset_two_months_ago: 0, customers: new Map()
        });
      });

      const targetArray = mode === "omset" ? mappedOrders : mappedPayments;
      
      const currentMonthVal = periodMonth;
      const currentYearVal = periodYear;
      
      const lastMonthVal = lastMonthDate.getMonth() + 1;
      const lastYearVal = lastMonthDate.getFullYear();

      const twoMonthsAgoVal = twoMonthsAgoDate.getMonth() + 1;
      const twoMonthsAgoYearVal = twoMonthsAgoDate.getFullYear();

      targetArray.forEach((o) => {
        const oMonth = Number(o.period_month);
        const oYear = Number(o.period_year);
        
        if (!oMonth || !oYear) return;

        const bName = o.mapped_brand;
        const custName = (o.customer_name || "UNKNOWN").trim();
        const pName = (o.goods_name || "UNKNOWN").trim();
        const amount = Number(o.total_amount) || 0;
        const cat = (o.category || "").toLowerCase();
        let qty = Number(o.qty) || 0;
        if (cat === "front film" && o.hydrogel_pcs != null) qty = Number(o.hydrogel_pcs);
        else if ((cat === "screen assembly" || cat === "lcd") && o.lcd_pcs != null) qty = Number(o.lcd_pcs);

        const isMtd = oMonth === currentMonthVal && oYear === currentYearVal;
        const isLastMonth = oMonth === lastMonthVal && oYear === lastYearVal;
        const isTwoMonthsAgo = oMonth === twoMonthsAgoVal && oYear === twoMonthsAgoYearVal;

        if (!isMtd && !isLastMonth && !isTwoMonthsAgo) return;

        if (!brandMap.has(bName)) {
          brandMap.set(bName, { brand_name: bName, omset_current: 0, omset_last: 0, omset_two_months_ago: 0, customers: new Map() });
        }
        const b = brandMap.get(bName)!;
        if (isMtd) b.omset_current += amount;
        if (isLastMonth) b.omset_last += amount;
        if (isTwoMonthsAgo) b.omset_two_months_ago += amount;

        if (!b.customers.has(custName)) {
          b.customers.set(custName, { customer_name: custName, omset_current: 0, omset_last: 0, omset_two_months_ago: 0, products: new Map() });
        }
        const c = b.customers.get(custName)!;
        if (isMtd) c.omset_current += amount;
        if (isLastMonth) c.omset_last += amount;
        if (isTwoMonthsAgo) c.omset_two_months_ago += amount;

        if (!c.products.has(pName)) {
          c.products.set(pName, { goods_name: pName, omset_current: 0, omset_last: 0, omset_two_months_ago: 0, qty_current: 0, qty_last: 0, qty_two_months_ago: 0 });
        }
        const p = c.products.get(pName)!;
        if (isMtd) { p.omset_current += amount; p.qty_current += qty; }
        if (isLastMonth) { p.omset_last += amount; p.qty_last += qty; }
        if (isTwoMonthsAgo) { p.omset_two_months_ago += amount; p.qty_two_months_ago += qty; }
      });

      const result = Array.from(brandMap.values()).map((b) => {
        let customerDetails = Array.from(b.customers.values())
          .filter((c: any) => c.omset_current !== 0 || c.omset_last !== 0 || c.omset_two_months_ago !== 0)
          .map((c: any) => ({
            ...c,
            diff_amount: c.omset_current - c.omset_last,
            is_down: c.omset_current < c.omset_last,
            products: Array.from(c.products.values())
              .filter((p: any) => p.omset_current !== 0 || p.omset_last !== 0 || p.omset_two_months_ago !== 0)
              .sort((p1: any, p2: any) => p1.omset_current - p1.omset_last - (p2.omset_current - p2.omset_last)),
          }))
          .sort((a, b) => a.diff_amount - b.diff_amount);
        return { ...b, customer_details: customerDetails };
      });

      const brandAnalysis3c = result.filter((b) => ["VIVAN", "ROBOT", "ACOME ACC", "ACOME IOT", "GAMEN"].includes(b.brand_name));
      brandAnalysis3c.sort((a, b) => b.omset_last - b.omset_current - (a.omset_last - a.omset_current));
      
      const brandAnalysisLcd = result.filter((b) => ["LCD XPAS", "LCD VIVAN"].includes(b.brand_name));
      brandAnalysisLcd.sort((a, b) => b.omset_last - b.omset_current - (a.omset_last - a.omset_current));

      const brandAnalysisOthers = result.filter((b) => !trackedBrands.includes(b.brand_name) && (b.omset_current > 0 || b.omset_last > 0));
      brandAnalysisOthers.sort((a, b) => b.omset_last - b.omset_current - (a.omset_last - a.omset_current));

      return { brandAnalysis3c, brandAnalysisLcd, brandAnalysisOthers };
    };

    const omsetResults = buildAnalysis("omset");
    const paymentResults = buildAnalysis("payment");

    return {
      brandAnalysis3c_omset: omsetResults.brandAnalysis3c,
      brandAnalysisOthers_omset: omsetResults.brandAnalysisOthers,
      brandAnalysis3c_payment: paymentResults.brandAnalysis3c,
      brandAnalysisOthers_payment: paymentResults.brandAnalysisOthers,
      brandAnalysisLcd_omset: omsetResults.brandAnalysisLcd,
      brandAnalysisLcd_payment: paymentResults.brandAnalysisLcd,
    };
  }, [orders, periodMonth, periodYear, selectedSalesman]);

  return { loading, salesmen, analysisData, targets };
}
