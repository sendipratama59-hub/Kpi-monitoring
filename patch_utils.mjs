import fs from 'fs';
const file = 'src/components/features/SalesmanKpiReport/utils.ts';
let content = fs.readFileSync(file, 'utf8');

const target = `    // 1. Payment 3C: Brand check + LCD exclusion + Lunas check
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

const replacement = `    // 1. Payment 3C: Brand check + LCD exclusion + Lunas check
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

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
