import fs from 'fs';

const p = 'src/components/features/SetupDatabase/sql-scripts.ts';
let code = fs.readFileSync(p, 'utf8');

// Replace payment_data group by
code = code.replace(
/sp\.salesman_code,\s*SUM\(CASE WHEN TRIM\(LOWER\(sp\.brand_name\)\) IN/g,
"sp.salesman_code,\n            sp.salesman_name,\n            SUM(CASE WHEN TRIM(LOWER(sp.brand_name)) IN"
);

code = code.replace(
/GROUP BY sp\.salesman_code\s*\),\s*program_data AS/g,
"GROUP BY sp.salesman_code, sp.salesman_name\n    ),\n    program_data AS"
);

// Replace piutang_data group by
code = code.replace(
/pc\.salesman_code,\s*SUM\(CASE WHEN LOWER\(pc\.brand_name\)/g,
"pc.salesman_code,\n            pc.salesman_name,\n            SUM(CASE WHEN LOWER(pc.brand_name)"
);

code = code.replace(
/WHERE pc\.period_month = p_month AND pc\.period_year = p_year\s*GROUP BY pc\.salesman_code\s*\),\s*omset_5jt_data/g,
"WHERE pc.period_month = p_month AND pc.period_year = p_year\n        GROUP BY pc.salesman_code, pc.salesman_name\n    ),\n    omset_5jt_data"
);

// Replace JOINs
code = code.replace(
/LEFT JOIN payment_data pd ON b\.salesman_code = pd\.salesman_code/g,
"LEFT JOIN payment_data pd ON b.salesman_code = pd.salesman_code AND b.salesman_name = pd.salesman_name"
);

code = code.replace(
/LEFT JOIN piutang_data piutang ON b\.salesman_code = piutang\.salesman_code/g,
"LEFT JOIN piutang_data piutang ON b.salesman_code = piutang.salesman_code AND b.salesman_name = piutang.salesman_name"
);

fs.writeFileSync(p, code);
