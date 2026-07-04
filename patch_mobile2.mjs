import fs from 'fs';
const file = 'src/components/features/SalesmanKpiReport/MobileSalesmanKpiView.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `        if (metric.id === "payment_3c" || metric.id === "payment_3c_lcd") {
          filtered = filtered.filter(p => {
            const bName = (p.brand_name || "").toLowerCase().trim();
            const cat = (p.category || "").toLowerCase().trim();
            const isLcdTeamCategory = (bName === 'vivan' || bName === 'xpas') && validLcdCats.includes(cat);
            return brandsPayment3C.includes(bName) && !isLcdTeamCategory;
          });
        }`;

const replacement = `        if (metric.id === "payment_3c" || metric.id === "payment_3c_lcd") {
          filtered = filtered.filter(p => {
            const bName = (p.brand_name || "").toLowerCase().trim();
            const cat = (p.category || "").toLowerCase().trim();
            const isLcdTeamCategory = (bName === 'vivan' || bName === 'xpas') && validLcdCats.includes(cat);
            const isLcdOmset = (bName === 'xpas' || bName === 'vivan') && cat === 'screen assembly';
            return brandsPayment3C.includes(bName) && !isLcdTeamCategory && !isLcdOmset;
          });
        }`;

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
