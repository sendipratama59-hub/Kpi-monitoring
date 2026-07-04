import fs from 'fs';

let file = 'src/components/features/SalesmanKpiReport/MobileSalesmanKpiView.tsx';
let content = fs.readFileSync(file, 'utf8');
let target = `        if (metric.id === "payment_3c" || metric.id === "payment_3c_lcd") {
          filtered = filtered.filter(p => {
            const bName = (p.brand_name || "").toLowerCase().trim();
            const cat = (p.category || "").toLowerCase().trim();
            const isLcdTeamCategory = (bName === 'vivan' || bName === 'xpas') && validLcdCats.includes(cat);
            const isLcdOmset = (bName === 'xpas' || bName === 'vivan') && cat === 'screen assembly';
            return brandsPayment3C.includes(bName) && !isLcdTeamCategory && !isLcdOmset;
          });
        }`;
let replacement = `        if (metric.id === "payment_3c" || metric.id === "payment_3c_lcd") {
          filtered = filtered.filter(p => {
            const bName = (p.brand_name || "").toLowerCase().trim();
            const cat = (p.category || "").toLowerCase().trim();
            const isLcdTeamCategory = (bName === 'vivan' || bName === 'xpas') && validLcdCats.includes(cat);
            return brandsPayment3C.includes(bName) && !isLcdTeamCategory;
          });
        }`;
if (content.includes(target)) content = content.replace(target, replacement);
fs.writeFileSync(file, content);

file = 'src/components/features/SalesmanKpiReport/SalesmanTables.tsx';
content = fs.readFileSync(file, 'utf8');
target = `  // Filter for Payment 3C (is_paid === true and from_manual/from_program/etc are false)
  const rawPayment3C = storeData.filter(item => {
    if (!item.is_paid || item.from_program || item.from_spu || item.from_manual || item.from_piutang) return false;
    const bName = (item.brand_name || "").toLowerCase().trim();
    const cat = (item.category || "").toLowerCase().trim();
    const isLcdTeamCategory = (bName === 'vivan' || bName === 'xpas') && validLcdCats.includes(cat);
    const isLcdOmset = (bName === 'xpas' || bName === 'vivan') && cat === 'screen assembly';
    return brandsPayment3C.includes(bName) && !isLcdTeamCategory && !isLcdOmset;
  });
  const payment3C = groupDataByDeliveryNo(rawPayment3C, 'payment_amount');
  
  // Filter for Piutang 3C (from_piutang === true)
  const rawPiutang3C = storeData.filter(item => {
    if (!item.from_piutang) return false;
    const bName = (item.brand_name || "").toLowerCase().trim();
    const cat = (item.category || "").toLowerCase().trim();
    const isLcdTeamCategory = (bName === 'vivan' || bName === 'xpas') && validLcdCats.includes(cat);
    const isLcdOmset = (bName === 'xpas' || bName === 'vivan') && cat === 'screen assembly';
    return brandsPayment3C.includes(bName) && !isLcdTeamCategory && !isLcdOmset;
  });`;
replacement = `  // Filter for Payment 3C (is_paid === true and from_manual/from_program/etc are false)
  const rawPayment3C = storeData.filter(item => {
    if (!item.is_paid || item.from_program || item.from_spu || item.from_manual || item.from_piutang) return false;
    const bName = (item.brand_name || "").toLowerCase().trim();
    const cat = (item.category || "").toLowerCase().trim();
    const isLcdTeamCategory = (bName === 'vivan' || bName === 'xpas') && validLcdCats.includes(cat);
    return brandsPayment3C.includes(bName) && !isLcdTeamCategory;
  });
  const payment3C = groupDataByDeliveryNo(rawPayment3C, 'payment_amount');
  
  // Filter for Piutang 3C (from_piutang === true)
  const rawPiutang3C = storeData.filter(item => {
    if (!item.from_piutang) return false;
    const bName = (item.brand_name || "").toLowerCase().trim();
    const cat = (item.category || "").toLowerCase().trim();
    const isLcdTeamCategory = (bName === 'vivan' || bName === 'xpas') && validLcdCats.includes(cat);
    return brandsPayment3C.includes(bName) && !isLcdTeamCategory;
  });`;
if (content.includes(target)) content = content.replace(target, replacement);
fs.writeFileSync(file, content);

file = 'src/components/features/SalesmanKpiReport/utils.ts';
content = fs.readFileSync(file, 'utf8');
target = `    // 1. Payment 3C: Brand check + LCD exclusion + Lunas check
    if (brandsPayment3C.includes(brand) && !isLcdTeamCategory && !isLcdOmset && row.is_paid) {
       st.payment_3c += Number(row.payment_amount) || 0;
    }
    
    // 2. Customer Order 3C (using brandsGeneral + LCD exclusion)
    if (brandsGeneral.includes(brand) && !isLcdTeamCategory && !isLcdOmset) {
       st.omset_3c += Number(row.total_amount) || 0;
       if (Number(row.total_amount) > 0) st.is_co_3c = true;
    }
    
    // 2. Customer Order > 5jt brands (using brandsGeneral + LCD exclusion)
    if (brandsGeneral.includes(brand) && !isLcdTeamCategory && !isLcdOmset) {
       st.omset_5jt_brands += Number(row.total_amount) || 0;
    }
    
    // 2. New & Idle Customer: Only count if associated with those 8 brands
    if (brandsGeneral.includes(brand) && !isLcdTeamCategory && !isLcdOmset) {`;
replacement = `    // 1. Payment 3C: Brand check + LCD exclusion + Lunas check
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
    if (brandsGeneral.includes(brand) && !isLcdTeamCategory) {`;
if (content.includes(target)) content = content.replace(target, replacement);
fs.writeFileSync(file, content);
