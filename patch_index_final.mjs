import fs from 'fs';

const p = 'src/components/features/SalesmanKpiReport/index.tsx';
let code = fs.readFileSync(p, 'utf8');

const targetStr = `      const manualData = await fetchAllWithPagination(
        "salesman_manual_activities",
        {
          salesman_code: salesmanCode,
          period_month: periodMonth,
          period_year: periodYear,
        },
      );`;

const replacement = targetStr + `

      const smName = summaryResult?.find((s: any) => s.salesman_code === salesmanCode)?.salesman_name;
      let finalData = data;
      let finalPayments = paymentsData;
      let finalPiutang = piutangData;
      let finalProgram = programData;
      let finalSpu = programSpuData;
      let finalManual = manualData;
      if (smName) {
         finalData = (data || []).filter((d: any) => d.salesman_name === smName);
         finalPayments = (paymentsData || []).filter((d: any) => d.salesman_name === smName);
         finalPiutang = (piutangData || []).filter((d: any) => d.salesman_name === smName);
         finalProgram = (programData || []).filter((d: any) => d.salesman_name === smName);
         finalSpu = (programSpuData || []).filter((d: any) => d.salesman_name === smName);
         finalManual = (manualData || []).filter((d: any) => d.salesman_name === smName);
      }
`;

code = code.replace(targetStr, replacement);
code = code.replace("...(data || []).map", "...(finalData || []).map");
code = code.replace("...(paymentsData || []).map", "...(finalPayments || []).map");
code = code.replace("...(programData || []).map", "...(finalProgram || []).map");
code = code.replace("...(programSpuData || []).map", "...(finalSpu || []).map");
code = code.replace("...(piutangData || []).map", "...(finalPiutang || []).map");
code = code.replace("...(manualData || []).map", "...(finalManual || []).map");

fs.writeFileSync(p, code);
