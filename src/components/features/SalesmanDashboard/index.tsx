import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "../../../services/supabase";

import { KpiSummaryCards } from "./KpiSummaryCards";
import { ActionPlan } from "./ActionPlan";
import { QuickActions } from "./QuickActions";
import { SalesmanSelector } from "./SalesmanSelector";
import { Salesman, KpiSummary, Piutang, UnvisitedCustomer } from "./types";

export function SalesmanDashboard() {
  const [salesmen, setSalesmen] = useState<Salesman[]>([]);
  const [selectedCode, setSelectedCode] = useState("");
  
  const [kpiSummary, setKpiSummary] = useState<KpiSummary | null>(null);
  const [piutangList, setPiutangList] = useState<Piutang[]>([]);
  const [unvisitedCustomers, setUnvisitedCustomers] = useState<UnvisitedCustomer[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [periodMonth, setPeriodMonth] = useState(new Date().getMonth() + 1);
  const [periodYear, setPeriodYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchSalesmen();
  }, []);

  useEffect(() => {
    if (selectedCode) {
      fetchDashboardData(selectedCode);
    } else {
      setKpiSummary(null);
      setPiutangList([]);
      setUnvisitedCustomers([]);
    }
  }, [selectedCode, periodMonth, periodYear]);

  const fetchSalesmen = async () => {
    try {
      const { data, error } = await supabase.rpc("get_salesman_kpi_summary", {
        p_month: periodMonth,
        p_year: periodYear,
      });
      
      if (data && !error) {
        const unique = Array.from(
          new Map(
            data
              .filter((item: any) => item.salesman_code && item.salesman_name)
              .map((item: any) => [item.salesman_code, { code: item.salesman_code, name: item.salesman_name }])
          ).values()
        ) as Salesman[];
        unique.sort((a, b) => a.name.localeCompare(b.name));
        setSalesmen(unique);
        if (unique.length > 0 && !selectedCode) {
          setSelectedCode(unique[0].code);
        }
      }
    } catch (err) {
      console.error("Error fetching salesmen:", err);
    }
  };

  const fetchDashboardData = async (code: string) => {
    setIsLoading(true);
    try {
      // 1. Fetch KPI Summary for all (since RPC returns all) and filter
      const { data: summaryResult } = await supabase.rpc("get_salesman_kpi_summary", {
        p_month: periodMonth,
        p_year: periodYear,
      });

      const salesmanKpi = (summaryResult || []).find((s: any) => s.salesman_code === code);

      // Fetch targets
      let targetOmset = 0;
      const { data: targets } = await supabase
        .from("salesman_kpi_targets")
        .select("target_revenue")
        .eq("salesman_code", code)
        .eq("period_month", periodMonth)
        .eq("period_year", periodYear)
        .single();
      
      if (targets) {
        targetOmset = targets.target_revenue || 0;
      }

      setKpiSummary({
        ...(salesmanKpi || {
          salesman_code: code,
          salesman_name: salesmen.find(s => s.code === code)?.name || "Unknown",
          total_revenue: 0
        }),
        target_revenue: targetOmset,
      });

      // 2. Fetch Follow Up Tagihan (Piutang)
      const { data: piutang } = await supabase
        .from("piutang_customer")
        .select("*")
        .eq("salesman_code", code)
        .order("total_amount", { ascending: false })
        .limit(10); // get top 10 biggest piutang
      
      setPiutangList(piutang || []);

      // 3. Fetch Unvisited Customers
      // Get all assigned customers
      const { data: assigned } = await supabase
        .from("salesman_customer")
        .select("customer_code, customer_name")
        .eq("salesman_code", code);
      
      // Get customers with transactions this month
      const { data: transactions } = await supabase
        .from("salesman_kpi")
        .select("customer_code, customer_name")
        .eq("salesman_code", code)
        .eq("period_month", periodMonth)
        .eq("period_year", periodYear)
        .gt("total_amount", 0);
      
      if (assigned) {
        const transactedCodes = new Set((transactions || []).map(t => t.customer_code || t.customer_name));
        const unvisited = assigned.filter(a => !transactedCodes.has(a.customer_code || a.customer_name));
        
        // Remove duplicates just in case
        const uniqueUnvisited = Array.from(
          new Map(
            unvisited.map(u => [u.customer_code || u.customer_name, u])
          ).values()
        );
        
        setUnvisitedCustomers(uniqueUnvisited.slice(0, 10)); // just show 10 for UI performance
      } else {
        setUnvisitedCustomers([]);
      }

    } catch (err) {
      console.error("Error fetching dashboard data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Dashboard Sales</h2>
          <p className="text-slate-500">Ringkasan target dan tugas harian Anda.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="flex gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
            <select 
              value={periodMonth}
              onChange={(e) => setPeriodMonth(Number(e.target.value))}
              className="text-sm font-medium border-slate-200 rounded-md focus:border-indigo-500 focus:ring-indigo-500"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('id-ID', { month: 'short' })}</option>
              ))}
            </select>
            <select
              value={periodYear}
              onChange={(e) => setPeriodYear(Number(e.target.value))}
              className="text-sm font-medium border-slate-200 rounded-md focus:border-indigo-500 focus:ring-indigo-500"
            >
              {[periodYear - 1, periodYear, periodYear + 1].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          
          <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm flex items-center">
            <SalesmanSelector 
              salesmen={salesmen} 
              selectedCode={selectedCode} 
              onSelect={setSelectedCode} 
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
      ) : (
        <>
          <KpiSummaryCards summary={kpiSummary} />
          
          <ActionPlan 
            unvisitedCustomers={unvisitedCustomers} 
            piutangList={piutangList} 
          />
        </>
      )}

      <QuickActions />
    </div>
  );
}
