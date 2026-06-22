import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../services/supabase';
import { Card } from '../../ui/Card';
import { LeaderboardView } from './LeaderboardView';
import { calculateKpiPoints, calculateOmsetLcdPoints, calculateVisitPoints, calculateCo3cPoints, calculateCommonKpiPoints, calculateDisplaySpandukPoints, calculateLeaderKpiPoints, calculateLeaderOmsetLcdPoints, calculateLeaderVisitPoints, calculateLeaderCo3cPoints, calculateLeaderCommonMetricPoints, calculateLeaderSpuPoints, calculateLeaderNewCustomerPoints, calculateLeaderDisplaySpandukPoints } from './utils';

export function SalesmanKpiReport() {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const [periodMonth, setPeriodMonth] = useState<number>(currentMonth);
  const [periodYear, setPeriodYear] = useState<number>(currentYear);

  const [summaryData, setSummaryData] = useState<any[]>([]);
  const [targets, setTargets] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [eligibility, setEligibility] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMetric, setSelectedMetric] = useState('total_revenue');
  const [expandedSalesmanRow, setExpandedSalesmanRow] = useState<string | null>(null);
  const [expandedKpiCard, setExpandedKpiCard] = useState<string | null>(null);
  
  const [storeDataCache, setStoreDataCache] = useState<Record<string, any>>({});
  const [isLoadingStoreData, setIsLoadingStoreData] = useState(false);

  useEffect(() => {
    fetchSummaryData();
  }, [periodMonth, periodYear]);

  const fetchSummaryData = async () => {
    setIsLoading(true);
    setExpandedSalesmanRow(null);
    setStoreDataCache({});
    try {
      const { data: summaryResult, error } = await supabase.rpc('get_salesman_kpi_summary', {
        p_month: periodMonth,
        p_year: periodYear
      });

      if (error) throw error;
      
      const { data: targetData } = await supabase.from('salesman_kpi_targets').select('*');
      if (targetData) setTargets(targetData);

      const { data: teamsData } = await supabase.from('kpi_teams').select('*');
      if (teamsData) setTeams(teamsData);

      const { data: membersData } = await supabase.from('kpi_team_members').select('*');
      if (membersData) setTeamMembers(membersData);

      const { data: eligibilityData } = await supabase.from('kpi_salesman_configs').select('*');
      if (eligibilityData) setEligibility(eligibilityData);

      const { data: visitData } = await supabase.from('visit_customer')
        .select('*')
        .eq('period_month', periodMonth)
        .eq('period_year', periodYear);
      
      // Pre-calculate team achievements and targets for leaders
      const teamAggregates = (teamsData || []).map(team => {
        const members = (membersData || []).filter(m => m.team_id === team.id);
        
        // Ensure leader is included in team members for aggregation if they aren't already there
        const memberCodes = members.map(m => m.salesman_code);
        if (team.leader_code && !memberCodes.includes(team.leader_code)) {
          memberCodes.push(team.leader_code);
        }

        let totalAchievement = 0;
        let totalTarget = 0;
        let totalPayment3c = 0;
        let totalPiutang3c = 0;
        let totalLcdAchievement = 0;
        let totalLcdTarget = 0;
        let totalVisitPercentage = 0;
        let membersWithVisitData = 0;
        let totalCo3cAchievement = 0;
        let totalCo3cTarget = 0;
        let total5jtAchievement = 0;
        let total5jtTarget = 0;
        let totalIdleAchievement = 0;
        let totalIdleTarget = 0;
        let totalSpuAchievement = 0;
        let totalSpuTarget = 0;
        let totalNewCustomerAchievement = 0;
        let totalNewCustomerTarget = 0;
        let totalDisplayAchievement = 0;
        let totalDisplayTarget = 0;
        let totalSpandukAchievement = 0;
        let totalSpandukTarget = 0;

        memberCodes.forEach(salesmanCode => {
          const smRecord = (summaryResult || []).find(sr => sr.salesman_code === salesmanCode);
          const targetRecord = (targetData || []).find(td => td.salesman_code === salesmanCode);
          
          const visitRecord = (visitData || []).find((v: any) => v.salesman_code === salesmanCode);
          if (visitRecord) {
            let pct = Number(visitRecord.percentage) || 0;
            if (pct > 0 && pct <= 1) pct *= 100;
            totalVisitPercentage += pct;
            membersWithVisitData++;
          }

          if (smRecord) {
            totalAchievement += (Number(smRecord.payment_3c) || 0) + (Number(smRecord.omset_lcd) || 0);
            totalPayment3c += Number(smRecord.payment_3c) || 0;
            totalPiutang3c += Number(smRecord.sisa_piutang_3c) || 0;
            totalLcdAchievement += Number(smRecord.omset_lcd) || 0;
            totalCo3cAchievement += Number(smRecord.co_3c) || 0;
            total5jtAchievement += Number(smRecord.omset_5jt) || 0;
            totalIdleAchievement += Number(smRecord.idle_customers) || 0;
            totalSpuAchievement += Number(smRecord.program_spu_achieved) || 0;
            totalNewCustomerAchievement += Number(smRecord.new_customers) || 0;
            totalDisplayAchievement += Number(smRecord.perbaikan_display) || 0;
            totalSpandukAchievement += Number(smRecord.pemasangan_spanduk) || 0;
          }
          
          if (targetRecord) {
            const smTarget3c = Number(targetRecord.target_payment_3c) || 0;
            const smTargetLcd = Number(targetRecord.target_omset_lcd) || 0;
            const smTargetCo3c = Number(targetRecord.target_co_3c) || 0;
            const smTarget5jt = Number(targetRecord.target_omset_5jt) || 0;
            const smTargetIdle = Number(targetRecord.target_idle_customer) || 0;
            const smTargetSpu = Number(targetRecord.target_spu) || 0;
            const smTargetNewCustomer = Number(targetRecord.target_new_customer) || 0;
            const smTargetDisplay = Number(targetRecord.target_perbaikan_display) || 0;
            const smTargetSpanduk = Number(targetRecord.target_pemasangan_spanduk) || 0;
            
            totalTarget += smTarget3c + smTargetLcd;
            totalLcdTarget += smTargetLcd;
            totalCo3cTarget += smTargetCo3c;
            total5jtTarget += smTarget5jt;
            totalIdleTarget += smTargetIdle;
            totalSpuTarget += smTargetSpu;
            totalNewCustomerTarget += smTargetNewCustomer;
            totalDisplayTarget += smTargetDisplay;
            totalSpandukTarget += smTargetSpanduk;
          }
        });

        return {
          leader_code: team.leader_code,
          team_achievement: totalAchievement,
          team_target: totalTarget,
          team_payment_3c: totalPayment3c,
          team_piutang_3c: totalPiutang3c,
          team_lcd_achievement: totalLcdAchievement,
          team_lcd_target: totalLcdTarget,
          team_co3c_achievement: totalCo3cAchievement,
          team_co3c_target: totalCo3cTarget,
          team_5jt_achievement: total5jtAchievement,
          team_5jt_target: total5jtTarget,
          team_idle_achievement: totalIdleAchievement,
          team_idle_target: totalIdleTarget,
          team_spu_achievement: totalSpuAchievement,
          team_spu_target: totalSpuTarget,
          team_new_customer_achievement: totalNewCustomerAchievement,
          team_new_customer_target: totalNewCustomerTarget,
          team_display_achievement: totalDisplayAchievement,
          team_display_target: totalDisplayTarget,
          team_spanduk_achievement: totalSpandukAchievement,
          team_spanduk_target: totalSpandukTarget,
          team_visit_percentage: membersWithVisitData > 0 ? totalVisitPercentage / membersWithVisitData : 0,
          team_name: team.team_name
        };
      });

      const computedSummary = (summaryResult || []).map((sm: any) => {
        // Find if salesman is leader
        const teamLeaderInfo = teamAggregates.find(ta => ta.leader_code === sm.salesman_code);
        // Find if salesman is eligible for points. Default to true if not specified.
        const salesmanConfig = (eligibilityData || []).find((c: any) => c.salesman_code === sm.salesman_code);
        const isEligible = salesmanConfig ? salesmanConfig.is_eligible : true;

        const visitCust = visitData?.find((v: any) => v.salesman_code === sm.salesman_code);
        let visitPercentage = visitCust ? Number(visitCust.percentage) : 0;
        // Correct decimal percentage from excel (e.g. 0.545 -> 54.5)
        if (visitPercentage > 0 && visitPercentage <= 1) {
          visitPercentage = visitPercentage * 100;
        }

        const salesmanTarget = (targetData || []).find((t: any) => t.salesman_code === sm.salesman_code);
        const achievement = (Number(sm.payment_3c) || 0) + (Number(sm.omset_lcd) || 0);
        const target = Number(salesmanTarget?.target_payment_3c_lcd) || 
                       ((Number(salesmanTarget?.target_payment_3c) || 0) + (Number(salesmanTarget?.target_omset_lcd) || 0));
        
        const achievementLcd = Number(sm.omset_lcd) || 0;
        const targetLcd = Number(salesmanTarget?.target_omset_lcd) || 0;

        const achievementCo3c = Number(sm.co_3c) || 0;
        const targetCo3c = Number(salesmanTarget?.target_co_3c) || 0;
        
        const achievement5jt = Number(sm.omset_5jt) || 0;
        const target5jt = Number(salesmanTarget?.target_omset_5jt) || 0;

        const achievementIdle = Number(sm.idle_customers) || 0;
        const targetIdle = Number(salesmanTarget?.target_idle_customer) || 0;

        const achievementSpu = Number(sm.program_spu_achieved) || 0;
        const targetSpu = Number(salesmanTarget?.target_spu) || 0;

        const achievementDisplay = Number(sm.perbaikan_display) || 0;
        const targetDisplay = Number(salesmanTarget?.target_perbaikan_display) || 0;

        const achievementSpanduk = Number(sm.pemasangan_spanduk) || 0;
        const targetSpanduk = Number(salesmanTarget?.target_pemasangan_spanduk) || 0;

        return {
          ...sm,
          is_eligible: isEligible,
          payment_3c_lcd: achievement,
          points_3c_lcd: (isEligible && !teamLeaderInfo) ? calculateKpiPoints(achievement, target) : 0,
          points_omset_lcd: (isEligible && !teamLeaderInfo) ? calculateOmsetLcdPoints(achievementLcd, targetLcd) : 0,
          points_visit_customer: (isEligible && !teamLeaderInfo) ? calculateVisitPoints(visitPercentage) : 0,
          points_co_3c: (isEligible && !teamLeaderInfo) ? calculateCo3cPoints(achievementCo3c, targetCo3c) : 0,
          points_omset_5jt: (isEligible && !teamLeaderInfo) ? calculateCommonKpiPoints(achievement5jt, target5jt) : 0,
          points_idle_customers: (isEligible && !teamLeaderInfo) ? calculateCommonKpiPoints(achievementIdle, targetIdle) : 0,
          points_program_spu: (isEligible && !teamLeaderInfo) ? calculateCommonKpiPoints(achievementSpu, targetSpu) : 0,
          points_perbaikan_display: (isEligible && !teamLeaderInfo) ? calculateDisplaySpandukPoints(achievementDisplay, targetDisplay) : 0,
          points_pemasangan_spanduk: (isEligible && !teamLeaderInfo) ? calculateDisplaySpandukPoints(achievementSpanduk, targetSpanduk) : 0,
          points_leader_kpi: (isEligible && teamLeaderInfo) ? calculateLeaderKpiPoints(teamLeaderInfo.team_achievement, teamLeaderInfo.team_target) : 0,
          points_leader_omset_lcd: (isEligible && teamLeaderInfo) ? calculateLeaderOmsetLcdPoints(teamLeaderInfo.team_lcd_achievement, teamLeaderInfo.team_lcd_target) : 0,
          points_leader_visit: (isEligible && teamLeaderInfo) ? calculateLeaderVisitPoints(teamLeaderInfo.team_visit_percentage) : 0,
          points_leader_co3c: (isEligible && teamLeaderInfo) ? calculateLeaderCo3cPoints(teamLeaderInfo.team_co3c_achievement, teamLeaderInfo.team_co3c_target) : 0,
          points_leader_5jt: (isEligible && teamLeaderInfo) ? calculateLeaderCommonMetricPoints(teamLeaderInfo.team_5jt_achievement, teamLeaderInfo.team_5jt_target) : 0,
          points_leader_idle: (isEligible && teamLeaderInfo) ? calculateLeaderCommonMetricPoints(teamLeaderInfo.team_idle_achievement, teamLeaderInfo.team_idle_target) : 0,
          points_leader_spu: (isEligible && teamLeaderInfo) ? calculateLeaderSpuPoints(teamLeaderInfo.team_spu_achievement, teamLeaderInfo.team_spu_target) : 0,
          points_leader_new_customer: (isEligible && teamLeaderInfo) ? calculateLeaderNewCustomerPoints(teamLeaderInfo.team_new_customer_achievement, teamLeaderInfo.team_new_customer_target) : 0,
          points_leader_perbaikan_display: (isEligible && teamLeaderInfo) ? calculateLeaderDisplaySpandukPoints(teamLeaderInfo.team_display_achievement, teamLeaderInfo.team_display_target) : 0,
          points_leader_pemasangan_spanduk: (isEligible && teamLeaderInfo) ? calculateLeaderDisplaySpandukPoints(teamLeaderInfo.team_spanduk_achievement, teamLeaderInfo.team_spanduk_target) : 0,
          team_achievement: teamLeaderInfo?.team_achievement || 0,
          team_target: teamLeaderInfo?.team_target || 0,
          team_payment_3c: teamLeaderInfo?.team_payment_3c || 0,
          team_piutang_3c: teamLeaderInfo?.team_piutang_3c || 0,
          team_lcd_achievement: teamLeaderInfo?.team_lcd_achievement || 0,
          team_lcd_target: teamLeaderInfo?.team_lcd_target || 0,
          team_visit_percentage: teamLeaderInfo?.team_visit_percentage || 0,
          team_co3c_achievement: teamLeaderInfo?.team_co3c_achievement || 0,
          team_co3c_target: teamLeaderInfo?.team_co3c_target || 0,
          team_5jt_achievement: teamLeaderInfo?.team_5jt_achievement || 0,
          team_5jt_target: teamLeaderInfo?.team_5jt_target || 0,
          team_idle_achievement: teamLeaderInfo?.team_idle_achievement || 0,
          team_idle_target: teamLeaderInfo?.team_idle_target || 0,
          team_spu_achievement: teamLeaderInfo?.team_spu_achievement || 0,
          team_spu_target: teamLeaderInfo?.team_spu_target || 0,
          team_new_customer_achievement: teamLeaderInfo?.team_new_customer_achievement || 0,
          team_new_customer_target: teamLeaderInfo?.team_new_customer_target || 0,
          team_display_achievement: teamLeaderInfo?.team_display_achievement || 0,
          team_display_target: teamLeaderInfo?.team_display_target || 0,
          team_spanduk_achievement: teamLeaderInfo?.team_spanduk_achievement || 0,
          team_spanduk_target: teamLeaderInfo?.team_spanduk_target || 0,
          visit_customer: visitPercentage
        };
      });
      setSummaryData(computedSummary);
    } catch (error) {
      console.error('Error fetching KPI summary:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllWithPagination = async (table: string, filters: Record<string, any>) => {
    let allData: any[] = [];
    let hasMore = true;
    let from = 0;
    while (hasMore) {
      let query = supabase.from(table).select('*').range(from, from + 999);
      for (const [key, val] of Object.entries(filters)) {
        query = query.eq(key, val);
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

  const loadStoreData = async (salesmanCode: string) => {
    if (storeDataCache[salesmanCode] || !salesmanCode) return;
    
    setIsLoadingStoreData(true);
    try {
      const data = await fetchAllWithPagination('salesman_kpi', {
        salesman_code: salesmanCode,
        period_month: periodMonth,
        period_year: periodYear
      });

      const paymentsData = await fetchAllWithPagination('salesman_payments', {
        salesman_code: salesmanCode,
        period_month: periodMonth,
        period_year: periodYear
      });

      const programData = await fetchAllWithPagination('program_bulanan', {
        salesman_code: salesmanCode,
        period_month: periodMonth,
        period_year: periodYear
      });

      const spuData = await fetchAllWithPagination('program_spu', {
        salesman_code: salesmanCode,
        period_month: periodMonth,
        period_year: periodYear
      });
      
      const piutangData = await fetchAllWithPagination('piutang_customer', {
        salesman_code: salesmanCode
      });
      
      const manualData = await fetchAllWithPagination('salesman_manual_activities', {
        salesman_code: salesmanCode,
        period_month: periodMonth,
        period_year: periodYear
      });
 
      const mergedData = [
          ...(data || []).map(d => ({ ...d, is_paid: false, payment_amount: 0, from_program: false, from_spu: false, from_manual: false })),
          ...(paymentsData || []).map(p => ({ 
               customer_name: p.customer_name,
               customer_code: p.customer_code,
               brand_name: p.brand_name,
               category: p.category,
               total_amount: 0,
               omset_lcd: 0,
               omset_redskull: 0,
               hydrogel_pcs: 0,
               tg_pcs: 0,
               new_customer: 0,
               idle_customer: 0,
               co_mesin_vqm: 0,
               co_tg: 0,
               omset_5jt: 0,
               goods_name: '',
               is_paid: true, 
               payment_amount: p.total_amount,
               due_date: p.due_date,
               delivery_no: p.delivery_no,
               salesman_name: p.salesman_name,
               from_program: false,
               from_spu: false,
               from_manual: false
          })),
          ...(programData || []).map(p => ({
               customer_name: p.customer_name,
               customer_code: p.customer_code,
               total_amount: 0,
               omset_lcd: 0,
               omset_redskull: 0,
               hydrogel_pcs: 0,
               tg_pcs: 0,
               new_customer: 0,
               idle_customer: 0,
               co_mesin_vqm: 0,
               co_tg: 0,
               omset_5jt: 0,
               goods_name: '',
               is_paid: false,
               payment_amount: 0,
               from_program: true,
               from_spu: false,
               from_manual: false,
               customer_targets: p.customer_targets,
               customer_achieve: p.customer_achieve,
               customer_join: p.customer_join
          })),
          ...(spuData || []).map(p => ({
               customer_name: p.customer_name,
               customer_code: p.customer_code,
               total_amount: 0,
               omset_lcd: 0,
               omset_redskull: 0,
               hydrogel_pcs: 0,
               tg_pcs: 0,
               new_customer: 0,
               idle_customer: 0,
               co_mesin_vqm: 0,
               co_tg: 0,
               omset_5jt: 0,
               goods_name: '',
               is_paid: false,
               payment_amount: 0,
               from_program: false,
               from_spu: true,
               from_manual: false,
               customer_targets: p.customer_targets,
               customer_achieve: p.customer_achieve,
               customer_join: p.customer_join,
               customer_reward: p.customer_reward
          })),
          ...(manualData || []).map(m => ({
               customer_name: m.customer_name,
               customer_code: m.customer_code,
               total_amount: 0,
               omset_lcd: 0,
               omset_redskull: 0,
               hydrogel_pcs: 0,
               tg_pcs: 0,
               new_customer: 0,
               idle_customer: 0,
               co_mesin_vqm: 0,
               co_tg: 0,
               omset_5jt: 0,
               goods_name: '',
               is_paid: false,
               payment_amount: 0,
               from_program: false,
               from_spu: false,
               from_manual: true,
               from_piutang: false,
               activity_type: m.activity_type,
               sub_activity_type: m.sub_activity_type
          })),
          ...(piutangData || []).map(p => ({
               customer_name: p.customer_name,
               customer_code: p.customer_code,
               brand_name: p.brand_name,
               category: p.category,
               total_amount: p.total_amount,
               omset_lcd: 0,
               omset_redskull: 0,
               hydrogel_pcs: 0,
               tg_pcs: 0,
               new_customer: 0,
               idle_customer: 0,
               co_mesin_vqm: 0,
               co_tg: 0,
               omset_5jt: 0,
               goods_name: '',
               is_paid: false,
               payment_amount: 0,
               due_date: p.due_date,
               delivery_no: p.delivery_no,
               salesman_name: p.salesman_name,
               from_program: false,
               from_spu: false,
               from_manual: false,
               from_piutang: true
          }))
      ];

      setStoreDataCache(prev => ({ ...prev, [salesmanCode]: mergedData }));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingStoreData(false);
    }
  };

  const handleExpandSalesman = (salesmanCode: string) => {
    if (expandedSalesmanRow === salesmanCode) {
      setExpandedSalesmanRow(null);
    } else {
      setExpandedSalesmanRow(salesmanCode);
      loadStoreData(salesmanCode);
    }
  };

  const handleExpandKpiCard = (metricId: string, salesmanCode: string) => {
    if (expandedKpiCard === metricId) {
      setExpandedKpiCard(null);
    } else {
      setExpandedKpiCard(metricId);
      loadStoreData(salesmanCode);
    }
  };

  const sortedData = useMemo(() => {
    return [...summaryData].sort((a, b) => {
      const valA = Number(a[selectedMetric]) || 0;
      const valB = Number(b[selectedMetric]) || 0;
      return valB - valA;
    });
  }, [summaryData, selectedMetric]);

  const filteredData = sortedData.filter(item => 
    item.salesman_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center sm:items-end gap-4 text-center sm:text-left">
        <div className="w-full sm:w-auto">
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">Salesman KPI</h2>
          <p className="text-sm text-slate-500">Peringkat dan Detail pencapaian salesman berdasarkan Key Performance Indicator.</p>
        </div>
        
        <div className="flex flex-col gap-3 w-full sm:w-auto items-center sm:items-end">
            <div className="flex gap-3 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Periode Bulan</label>
                <select 
                  value={periodMonth}
                  onChange={(e) => setPeriodMonth(Number(e.target.value))}
                  className="w-full text-sm font-medium border-slate-200 rounded-md focus:border-indigo-500 focus:ring-indigo-500"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('id-ID', { month: 'long' })}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Periode Tahun</label>
                <select 
                  value={periodYear}
                  onChange={(e) => setPeriodYear(Number(e.target.value))}
                  className="w-full text-sm font-medium border-slate-200 rounded-md focus:border-indigo-500 focus:ring-indigo-500"
                >
                  {Array.from({ length: 5 }, (_, i) => currentYear - 2 + i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

        </div>
      </div>

      <Card>
          <LeaderboardView 
            isLoading={isLoading}
            filteredData={filteredData}
            targets={targets}
            selectedMetric={selectedMetric}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            setSelectedMetric={setSelectedMetric}
            expandedSalesmanRow={expandedSalesmanRow}
            handleExpandSalesman={handleExpandSalesman}
            isLoadingStoreData={isLoadingStoreData}
            storeDataCache={storeDataCache}
            periodMonth={periodMonth}
            periodYear={periodYear}
            onDataChange={fetchSummaryData}
          />
      </Card>
    </div>
  );
}
