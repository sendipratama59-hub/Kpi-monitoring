import fs from 'fs';

const p = 'src/components/features/SetupDatabase/sql-scripts.ts';
let code = fs.readFileSync(p, 'utf8');

code = code.replace(
/sma\.salesman_code,\n\s*sma\.salesman_name,\n\s*SUM/g,
"sma.salesman_code,\n            SUM"
);

code = code.replace(
/GROUP BY sma\.salesman_code, sma\.salesman_name\n\s*\),\n\s*piutang_data/g,
"GROUP BY sma.salesman_code\n    ),\n    piutang_data"
);

code = code.replace(
/LEFT JOIN manual_data md ON b\.salesman_code = md\.salesman_code AND b\.salesman_name = md\.salesman_name/g,
"LEFT JOIN manual_data md ON b.salesman_code = md.salesman_code"
);

fs.writeFileSync(p, code);
