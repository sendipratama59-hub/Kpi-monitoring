import fs from 'fs';

const p = 'src/components/features/SetupDatabase/sql-scripts.ts';
let code = fs.readFileSync(p, 'utf8');

code = code.replace(
/GROUP BY s\.salesman_code\s*\),\s*total_cust_data/g,
"GROUP BY s.salesman_code, s.salesman_name\n    ),\n    total_cust_data"
);

code = code.replace(
/MAX\(s\.salesman_name\) as salesman_name,/g,
"s.salesman_name,"
);

code = code.replace(
/GROUP BY sk2\.salesman_code\s*\)/g,
"GROUP BY sk2.salesman_code, sk2.salesman_name\n    )"
);

code = code.replace(
/sk2\.salesman_code, COUNT/g,
"sk2.salesman_code, sk2.salesman_name, COUNT"
);

// and also in the final SELECT
// wait, the final SELECT does LEFT JOIN total_cust_data tcd ON b.salesman_code = tcd.salesman_code
code = code.replace(
/LEFT JOIN total_cust_data tcd ON b\.salesman_code = tcd\.salesman_code/g,
"LEFT JOIN total_cust_data tcd ON b.salesman_code = tcd.salesman_code AND b.salesman_name = tcd.salesman_name"
);

fs.writeFileSync(p, code);
