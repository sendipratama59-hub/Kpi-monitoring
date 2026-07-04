import fs from 'fs';

const p = 'src/components/features/SalesmanKpiReport/MobileSalesmanKpiView.tsx';
let code = fs.readFileSync(p, 'utf8');

// For programs:
const programStr = `        const { data, error } = await supabase
          .from(table)
          .select("*")
          .eq("period_month", periodMonth)
          .eq("period_year", periodYear)
          .eq("salesman_code", trimmedCode);

        if (error) throw error;`;
const programRep = programStr + `

        let filtered = data || [];
        if (salesmanCode && smData?.salesman_name) {
          filtered = filtered.filter((p: any) => !p.salesman_name || p.salesman_name === smData.salesman_name);
        }`;
code = code.replace(programStr, programRep);
code = code.replace("const list = (data || []).map", "const list = filtered.map");

// For manual activities:
// no-op because it doesn't have salesman_name.

// For salesman_kpi:
const kpiStr = `        let { data, error } = await supabase
          .from("salesman_kpi")
          .select("*")
          .eq("period_month", periodMonth)
          .eq("period_year", periodYear)
          .eq("salesman_code", trimmedCode);

        if (error) throw error;

        let filtered = data || [];`;
const kpiRep = `        let { data, error } = await supabase
          .from("salesman_kpi")
          .select("*")
          .eq("period_month", periodMonth)
          .eq("period_year", periodYear)
          .eq("salesman_code", trimmedCode);

        if (error) throw error;

        let filtered = data || [];
        if (salesmanCode && smData?.salesman_name) {
          filtered = filtered.filter((p: any) => !p.salesman_name || p.salesman_name === smData.salesman_name);
        }`;
code = code.replace(kpiStr, kpiRep);

fs.writeFileSync(p, code);
