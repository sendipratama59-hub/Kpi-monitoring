import fs from 'fs';

const p = 'src/components/features/SalesmanKpiReport/index.tsx';
let code = fs.readFileSync(p, 'utf8');

// I will just replace the exact block where I put finalData etc.

const target = `      const smName = summaryResult?.find((s: any) => s.salesman_code === salesmanCode)?.salesman_name;
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
      }`;

const replacement = `      const smName = summaryResult?.find((s: any) => s.salesman_code === salesmanCode)?.salesman_name;
      let finalData = data;
      let finalPayments = paymentsData;
      let finalPiutang = piutangData;
      let finalProgram = programData;
      let finalSpu = programSpuData;
      let finalManual = manualData;
      if (smName) {
         finalData = (data || []).filter((d: any) => !d.salesman_name || d.salesman_name === smName);
         finalPayments = (paymentsData || []).filter((d: any) => !d.salesman_name || d.salesman_name === smName);
         finalPiutang = (piutangData || []).filter((d: any) => !d.salesman_name || d.salesman_name === smName);
         finalProgram = (programData || []).filter((d: any) => !d.salesman_name || d.salesman_name === smName);
         finalSpu = (programSpuData || []).filter((d: any) => !d.salesman_name || d.salesman_name === smName);
         // manual data doesn't have salesman_name
         finalManual = manualData || [];
      }`;

code = code.replace(target, replacement);
fs.writeFileSync(p, code);
