export const getStoresForKpi = (salesmanData: any[], kpiId: string) => {
  const storesMap = new Map<string, any>();
  
  salesmanData.forEach((row: any) => {
    const storeName = row.customer_name || row.customer_code || 'Unknown Store';
    if (!storesMap.has(storeName)) {
      storesMap.set(storeName, {
        name: storeName,
        total_revenue: 0,
        omset_lcd: 0,
        omset_redskull: 0,
        omset_3c: 0,
        payment_3c: 0,
        payment_all_brand: 0,
        omset_5jt_brands: 0,
        hydrogel_pcs: 0,
        tg_pcs: 0,
        is_co_3c: false,
        is_new_customer: false,
        is_idle_customer: false,
        is_co_mesin_vqm: false,
        is_co_tg: false,
        is_omset_5jt: false,
        goods_mesin: new Set<string>(),
        goods_tg: new Set<string>(),
        is_program_bulanan_achieved: false,
        customer_targets: 0,
        customer_achieve: 0,
        customer_join: '',
        is_program_spu_achieved: false,
        customer_targets_spu: 0,
        customer_achieve_spu: 0,
        customer_join_spu: '',
        customer_reward_spu: '',
        is_perbaikan_display: false,
        is_pemasangan_spanduk: false,
        spanduk_stiker_type: '',
        due_date: null as number | null,
      });
    }
    
    const st = storesMap.get(storeName)!;

    if (row.due_date && !st.due_date) {
      st.due_date = row.due_date;
    }

    if (row.from_manual) {
      if (row.activity_type === 'perbaikan_display') {
        st.is_perbaikan_display = true;
      } else if (row.activity_type === 'pemasangan_spanduk_stiker') {
        st.is_pemasangan_spanduk = true;
        st.spanduk_stiker_type = row.sub_activity_type;
      }
      return;
    }

    if (row.from_program) {
       st.customer_targets = Number(row.customer_targets) || 0;
       st.customer_achieve = Number(row.customer_achieve) || 0;
       st.customer_join = row.customer_join || '';
       if (st.customer_achieve >= st.customer_targets && st.customer_targets > 0) {
           st.is_program_bulanan_achieved = true;
       }
       return;
    }

    if (row.from_spu) {
       st.customer_targets_spu = Number(row.customer_targets) || 0;
       st.customer_achieve_spu = Number(row.customer_achieve) || 0;
       st.customer_join_spu = row.customer_join || '';
       st.customer_reward_spu = row.customer_reward || '';
       if (st.customer_achieve_spu >= st.customer_targets_spu && st.customer_targets_spu > 0) {
           st.is_program_spu_achieved = true;
       }
       return;
    }
    
    const brand = (row.brand_name || '').toLowerCase();
    const category = (row.category || '').toLowerCase();
    
    // Brand Lists per user request
    // 1. Payment 3C (Vivan, Robot, Acome ACC, Acome IOT, Gamen)
    const brandsPayment3C = ['vivan', 'robot', 'acome acc', 'acome iot', 'gamen'];
    
    // 2. Customer Order > 5jt, 3C, Idle, NOO (Vivan, Robot, Acome ACC, Acome IOT, Gamen, Aula, Philips, DP)
    const brandsGeneral = ['vivan', 'robot', 'acome acc', 'acome iot', 'gamen', 'aula', 'philips', 'dp'];
    
    const validLcdCats = ['vivan lcd team', 'vivan sparepart', 'xpas sparepart', 'xpas lcd 事业部'];
    const isLcdTeamCategory = (brand === 'vivan' || brand === 'xpas') && validLcdCats.includes(category);
    const isLcdOmset = (brand === 'xpas' || brand === 'vivan') && category === 'screen assembly';
        
    st.total_revenue += Number(row.total_amount) || 0;
    
    if (isLcdOmset) {
       st.omset_lcd += Number(row.total_amount) || 0;
    }
    
    st.omset_redskull += Number(row.omset_redskull) || 0;
    st.hydrogel_pcs += Number(row.hydrogel_pcs) || 0;
    st.tg_pcs += Number(row.tg_pcs) || 0;
    
    // Apply filters based on request
    if (row.is_paid) {
       st.payment_all_brand += Number(row.payment_amount) || 0;
    }
    
    // 1. Payment 3C: Brand check + LCD exclusion + Lunas check
    if (brandsPayment3C.includes(brand) && !isLcdTeamCategory && row.is_paid) {
       st.payment_3c += Number(row.payment_amount) || 0;
    }
    
    // 2. Customer Order 3C (using brandsGeneral + LCD exclusion)
    if (brandsGeneral.includes(brand) && !isLcdTeamCategory) {
       st.omset_3c += Number(row.total_amount) || 0;
       if (Number(row.total_amount) > 0) st.is_co_3c = true;
    }
    
    // 2. Customer Order > 5jt brands (using brandsGeneral + LCD exclusion)
    if (brandsGeneral.includes(brand) && !isLcdTeamCategory) {
       st.omset_5jt_brands += Number(row.total_amount) || 0;
    }
    
    // 2. New & Idle Customer: Only count if associated with those 8 brands
    if (brandsGeneral.includes(brand) && !isLcdTeamCategory) {
       if ((Number(row.new_customer) || 0) > 0) st.is_new_customer = true;
       if ((Number(row.idle_customer) || 0) > 0) st.is_idle_customer = true;
    }
    
    if ((Number(row.co_mesin_vqm) || 0) > 0) st.is_co_mesin_vqm = true;
    if ((Number(row.co_tg) || 0) > 0) st.is_co_tg = true;
    if ((Number(row.omset_5jt) || 0) > 0) st.is_omset_5jt = true;
    
    if (row.goods_name) {
        if ((Number(row.co_mesin_vqm) || 0) > 0) st.goods_mesin.add(row.goods_name);
        if ((Number(row.co_tg) || 0) > 0) st.goods_tg.add(row.goods_name);
    }
  });

  const formatCurr = (val: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
  const results: {
    name: string, 
    value: number, 
    sortValue: number, 
    displayValue?: string, 
    extraText?: string, 
    customerJoin?: string,
    customerTargets?: number,
    customerAchieve?: number,
    percentAchieved?: number,
    shortage?: number,
    isProgramAchieved?: boolean,
    dueDate?: number | null
  }[] = [];
  
  storesMap.forEach((st, storeName) => {
    let isIncluded = false;
    let value = 0;
    let sortValue = 0;
    let displayValue: string | undefined = undefined;
    let extraText = '';
    
    switch (kpiId) {
      case 'total_revenue': 
         if (st.total_revenue > 0) { isIncluded = true; value = st.total_revenue; sortValue = value; }
         break;
      case 'omset_lcd': 
         if (st.omset_lcd > 0) { isIncluded = true; value = st.omset_lcd; sortValue = value; }
         break;
      case 'omset_redskull': 
         if (st.omset_redskull > 0) { isIncluded = true; value = st.omset_redskull; sortValue = value; }
         break;
      case 'omset_3c': 
         if (st.omset_3c > 0) { isIncluded = true; value = st.omset_3c; sortValue = value; }
         break;
       case 'payment_3c': 
         if (st.payment_3c > 0) { 
           isIncluded = true; 
           value = st.payment_3c; 
           sortValue = value; 
           if (st.due_date) extraText = `T.O.P: ${st.due_date} Hari`;
         }
         break;
       case 'payment_all_brand': 
         if (st.payment_all_brand > 0) { 
           isIncluded = true; 
           value = st.payment_all_brand; 
           sortValue = value; 
           if (st.due_date) extraText = `T.O.P: ${st.due_date} Hari`;
         }
         break;
       case 'payment_3c_lcd': 
         if (st.payment_3c > 0 || st.omset_lcd > 0) { 
           isIncluded = true; 
           value = st.payment_3c + st.omset_lcd; 
           sortValue = value; 
           if (st.due_date) extraText = `T.O.P: ${st.due_date} Hari`;
         }
         break;
      case 'hydrogel_pcs': 
         if (st.hydrogel_pcs > 0) { isIncluded = true; value = st.hydrogel_pcs; sortValue = value; }
         break;
      case 'tg_pcs': 
         if (st.tg_pcs > 0) { isIncluded = true; value = st.tg_pcs; sortValue = value; }
         break;
      case 'co_3c': 
         if (st.is_co_3c) { 
           isIncluded = true; 
           value = 1; 
           sortValue = st.omset_3c;
           displayValue = formatCurr(st.omset_3c);
         }
         break;
      case 'new_customers': 
         if (st.is_new_customer) { 
           isIncluded = true; 
           value = 1; 
           sortValue = st.total_revenue;
           displayValue = formatCurr(st.total_revenue);
         }
         break;
      case 'idle_customers': 
         if (st.is_idle_customer) { 
           isIncluded = true; 
           value = 1; 
           sortValue = st.total_revenue;
           displayValue = formatCurr(st.total_revenue);
         }
         break;
      case 'co_mesin_vqm': 
         if (st.is_co_mesin_vqm) { 
           isIncluded = true; 
           value = 1; 
           sortValue = 1;
           const goods = Array.from(st.goods_mesin).join(', ');
           extraText = goods ? `Produk: ${goods}` : ''; 
         }
         break;
      case 'co_tg': 
         if (st.is_co_tg) { 
           isIncluded = true; 
           value = 1; 
           sortValue = st.tg_pcs;
           const goods = Array.from(st.goods_tg).join(', ');
           extraText = goods ? `Produk: ${goods} (${st.tg_pcs} Pcs)` : `(${st.tg_pcs} Pcs)`; 
         }
         break;
      case 'omset_5jt': 
         if (st.omset_5jt_brands >= 5000000) { 
           isIncluded = true; 
           value = 1; 
           sortValue = st.omset_5jt_brands;
           displayValue = formatCurr(st.omset_5jt_brands);
         }
         break;
      case 'program_bulanan_achieved':
         if (st.customer_targets > 0) {
           isIncluded = true;
           value = 1;
           const percent = (st.customer_achieve / st.customer_targets) * 100 || 0;
           sortValue = (st.is_program_bulanan_achieved ? 10000000 : 0) + percent;
         }
         break;
      case 'program_spu_achieved':
         if (st.customer_targets_spu > 0) {
           isIncluded = true;
           value = 1;
           const percent = (st.customer_achieve_spu / st.customer_targets_spu) * 100 || 0;
           sortValue = (st.is_program_spu_achieved ? 10000000 : 0) + percent;
         }
         break;
      case 'perbaikan_display':
         if (st.is_perbaikan_display) {
           isIncluded = true;
           value = 1;
           sortValue = 1;
         }
         break;
      case 'pemasangan_spanduk':
         if (st.is_pemasangan_spanduk) {
           isIncluded = true;
           value = 1;
           sortValue = 1;
           extraText = st.spanduk_stiker_type ? `Tipe: ${st.spanduk_stiker_type}` : '';
         }
         break;
    }
    
    if (isIncluded) {
       const isSpu = kpiId === 'program_spu_achieved';
       const cTargets = isSpu ? st.customer_targets_spu : st.customer_targets;
       const cAchieve = isSpu ? st.customer_achieve_spu : st.customer_achieve;
       const cJoin = isSpu ? st.customer_reward_spu : st.customer_join;
       const isProgramAch = isSpu ? st.is_program_spu_achieved : st.is_program_bulanan_achieved;

       results.push({ 
           name: storeName, 
           value, 
           sortValue, 
           displayValue, 
           extraText, 
           customerJoin: cJoin,
           customerTargets: cTargets,
           customerAchieve: cAchieve,
           percentAchieved: cTargets ? (cAchieve / cTargets) * 100 : 0,
           shortage: Math.max(0, cTargets - cAchieve),
           isProgramAchieved: isProgramAch
       });
    }
  });

  return results.sort((a, b) => b.sortValue - a.sortValue);
};

export const calculateKpiPoints = (achievement: number, target: number) => {
  if (!target || target <= 0) return 0;
  const percentage = (achievement / target) * 100;
  
  if (percentage >= 105) return 60;
  if (percentage >= 100) return 50;
  if (percentage >= 95) return 45;
  if (percentage >= 90) return 40;
  if (percentage >= 85) return 0;
  if (percentage >= 80) return -20;
  if (percentage >= 75) return -30;
  return -40;
};

export const calculateOmsetLcdPoints = (achievement: number, target: number) => {
  if (!target || target <= 0) return 0;
  const percentage = (achievement / target) * 100;
  
  if (percentage >= 105) return 25;
  if (percentage >= 100) return 20;
  if (percentage >= 95) return 15;
  if (percentage >= 90) return 10;
  if (percentage >= 85) return 0;
  if (percentage >= 80) return -10;
  if (percentage >= 75) return -15;
  return -20;
};

export const calculateVisitPoints = (percentage: number) => {
  if (percentage >= 100) return 25;
  if (percentage >= 95) return 20;
  if (percentage >= 92) return 15;
  if (percentage >= 90) return 10;
  if (percentage < 85) return -20;
  if (percentage < 87.5) return -15;
  return -10;
};

export const calculateCo3cPoints = (achievement: number, target: number) => {
  const diff = achievement - target;
  
  if (diff >= 3) return 25;
  if (diff >= 2) return 20;
  if (diff >= 1) return 15;
  if (diff >= 0) return 10;
  if (diff <= -6) return -20;
  if (diff <= -4) return -15;
  if (diff <= -2) return -10;
  return 0;
};

export const calculateCommonKpiPoints = (achievement: number, target: number) => {
  const diff = achievement - target;
  
  if (diff >= 3) return 25;
  if (diff >= 2) return 20;
  if (diff >= 1) return 15;
  if (diff >= 0) return 10;
  if (diff <= -3) return -20;
  if (diff <= -2) return -15;
  if (diff <= -1) return -10;
  return 0;
};

export const calculateDisplaySpandukPoints = (achievement: number, target: number) => {
  if (target > 0 && achievement >= target) {
    return 10;
  }
  return 0;
};

export const calculateLeaderKpiPoints = (achievement: number, target: number) => {
  if (!target || target <= 0) return 0;
  const percentage = (achievement / target) * 100;
  
  if (percentage >= 105) return 60;
  if (percentage >= 100) return 50;
  if (percentage >= 95) return 40;
  if (percentage >= 90) return 35;
  if (percentage >= 85) return 0;
  if (percentage >= 80) return -20;
  if (percentage >= 75) return -30;
  return -40;
};

export const calculateLeaderOmsetLcdPoints = (achievement: number, target: number) => {
  if (!target || target <= 0) return 0;
  const percentage = (achievement / target) * 100;
  
  if (percentage >= 105) return 25;
  if (percentage >= 100) return 20;
  if (percentage >= 95) return 15;
  if (percentage >= 90) return 10;
  if (percentage >= 85) return 0;
  if (percentage >= 80) return -10;
  if (percentage >= 75) return -15;
  return -20;
};

export const calculateLeaderVisitPoints = (percentage: number) => {
  if (percentage >= 100) return 25;
  if (percentage >= 95) return 20;
  if (percentage >= 92) return 15;
  if (percentage >= 90) return 10;
  if (percentage < 85) return -20;
  if (percentage < 87.5) return -15;
  return -10;
};

export const calculateLeaderCo3cPoints = (achievement: number, target: number) => {
  const diff = achievement - target;
  
  if (diff >= 3) return 25;
  if (diff >= 2) return 20;
  if (diff >= 1) return 15;
  if (diff === 0) return 10;
  if (diff <= -6) return -20;
  if (diff <= -4) return -15;
  if (diff <= -2) return -10;
  return 0;
};

export const calculateLeaderCommonMetricPoints = (achievement: number, target: number) => {
  const diff = achievement - target;
  
  // Reward
  if (diff >= 6) return 25;
  if (diff >= 4) return 20;
  if (diff >= 2) return 15;
  if (diff >= 0) return 10;
  
  // Punishment
  if (diff <= -6) return -20;
  if (diff <= -4) return -15;
  if (diff <= -2) return -10;
  
  return 0;
};

export const calculateLeaderSpuPoints = (achievement: number, target: number) => {
  const diff = achievement - target;
  
  // Reward
  if (diff >= 6) return 25;
  if (diff >= 4) return 20;
  if (diff >= 2) return 15;
  if (diff >= 0) return 10;
  
  // Punishment
  if (diff <= -3) return -20;
  if (diff <= -2) return -15;
  if (diff <= -1) return -10;
  
  return 0;
};

export const calculateLeaderNewCustomerPoints = (achievement: number, target: number) => {
  const diff = achievement - target;
  
  if (diff >= 6) return 20;
  if (diff >= 4) return 15;
  if (diff >= 2) return 10;
  if (diff === 0) return 5;
  if (diff <= -3) return -15;
  if (diff <= -2) return -10;
  if (diff <= -1) return -5;
  return 0;
};

export const calculateLeaderDisplaySpandukPoints = (achievement: number, target: number) => {
  if (target > 0 && achievement >= target) {
    return 10;
  }
  return 0;
};

export const calculateBrandCommissions = (salesmanData: any[]) => {
  const brandConfigs: Record<string, { rate: number, label: string }> = {
    'vivan': { rate: 0.012, label: 'Vivan (1.2%)' },
    'robot': { rate: 0.008, label: 'Robot (0.8%)' },
    'xpas': { rate: 0.008, label: 'Xpas (0.8%)' },
    'acome acc': { rate: 0.01, label: 'Acome Acc (1%)' },
    'acome iot': { rate: 0.01, label: 'Acome IoT (1%)' },
    'gamen': { rate: 0.01, label: 'Gamen (1%)' },
  };

  const results: Record<string, { omset: number, commission: number, label: string }> = {};
  
  Object.entries(brandConfigs).forEach(([brand, config]) => {
    results[brand] = { omset: 0, commission: 0, label: config.label };
  });

  salesmanData.forEach((row: any) => {
    // Only count from actual sales (salesman_kpi), ignore program metadata
    if (row.from_program || row.from_spu || row.from_manual) return;
    
    // Only count results from fully paid transactions (lunas)
    if (!row.is_paid) return;
    
    const brand = (row.brand_name || '').toLowerCase();
    // For paid records, we use payment_amount (or fallback to total_amount)
    const omset = Number(row.payment_amount) || Number(row.total_amount) || 0;
    
    if (results[brand]) {
      results[brand].omset += omset;
      
      let commissionRate = brandConfigs[brand].rate;
      const dueDate = Number(row.due_date) || 0;
      
      if (dueDate >= 8) {
        commissionRate = 0;
      } else if (dueDate >= 4 && dueDate <= 7) {
        commissionRate *= 0.5;
      }
      
      results[brand].commission += omset * commissionRate;
    }
  });

  // Calculate commissions
  return Object.entries(results).map(([id, data]) => ({
    id,
    label: data.label,
    omset: data.omset,
    commission: data.commission
  })).filter(item => item.omset > 0);
};
