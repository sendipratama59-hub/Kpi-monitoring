import fs from 'fs';
const file = 'src/components/features/SalesmanKpiReport/SalesmanTables.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `  // Filter for Payment 3C (is_paid === true and from_manual/from_program/etc are false)
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

const replacement = `  // Filter for Payment 3C (is_paid === true and from_manual/from_program/etc are false)
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

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
