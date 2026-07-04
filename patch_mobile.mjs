import fs from 'fs';
const file = 'src/components/features/SalesmanKpiReport/MobileSalesmanKpiView.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `        // Apply custom metric filter
        let filtered = data || [];
        if (metric.id === "payment_3c") {
          filtered = filtered.filter(p => {
            const bName = (p.brand_name || "").toLowerCase().trim();
            const cat = (p.category || "").toLowerCase().trim();
            const is3CBrand = ['vivan', 'robot', 'acome acc', 'acome iot', 'gamen', 'aula', 'dp', 'philips'].includes(bName);
            const isLcdVivan = bName === 'vivan' && (cat.includes('vivan lcd team') || cat.includes('vivan sparepart'));
            const isLcdXpas = bName === 'xpas' && (cat.includes('xpas sparepart') || cat.includes('xpas lcd'));
            return is3CBrand && !isLcdVivan && !isLcdXpas;
          });
        }

        // Group by customer
        const groupedMap = new Map<string, any>();
        filtered.forEach(p => {`;

const replacement = `        // Apply custom metric filter
        let filtered = data || [];
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
        combinedData.forEach(p => {`;

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
