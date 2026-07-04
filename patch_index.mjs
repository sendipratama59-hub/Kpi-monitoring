import fs from 'fs';

const p = 'src/components/features/SalesmanKpiReport/index.tsx';
let code = fs.readFileSync(p, 'utf8');

const targetStr = `      const manualData = await fetchAllWithPagination("salesman_manual_activities", {
        salesman_code: salesmanCode,
        period_month: periodMonth,
        period_year: periodYear,
      });`;

const replacement = targetStr + `

      const smName = summaryData.find((s: any) => s.salesman_code === salesmanCode)?.salesman_name;
      let finalData = data;
      let finalPayments = paymentsData;
      let finalPiutang = piutangData;
      let finalProgram = programData;
      let finalSpu = programSpuData;
      if (smName) {
         finalData = data.filter((d: any) => d.salesman_name === smName);
         finalPayments = paymentsData.filter((d: any) => d.salesman_name === smName);
         finalPiutang = piutangData.filter((d: any) => d.salesman_name === smName);
         finalProgram = programData.filter((d: any) => d.salesman_name === smName);
         finalSpu = programSpuData.filter((d: any) => d.salesman_name === smName);
      }
`;

// wait, the variable names are "data", "paymentsData", etc. I need to make them let variables or assign to a new name.
// let's see how they are used.
// "const mergedData = ["
// I will just change "data || []" to "finalData || []", "paymentsData || []" to "finalPayments || []"
