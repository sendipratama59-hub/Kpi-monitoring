import fs from 'fs';

const p = 'src/components/features/SetupDatabase/sql-scripts.ts';
let code = fs.readFileSync(p, 'utf8');

// program_data
code = code.replace(
/pb\.salesman_code,\s*SUM/g,
"pb.salesman_code,\n            pb.salesman_name,\n            SUM"
);
code = code.replace(
/GROUP BY pb\.salesman_code\s*\),\s*spu_data/g,
"GROUP BY pb.salesman_code, pb.salesman_name\n    ),\n    spu_data"
);

// spu_data
code = code.replace(
/ps\.salesman_code,\s*SUM/g,
"ps.salesman_code,\n            ps.salesman_name,\n            SUM"
);
code = code.replace(
/GROUP BY ps\.salesman_code\s*\),\s*manual_data/g,
"GROUP BY ps.salesman_code, ps.salesman_name\n    ),\n    manual_data"
);

// manual_data
code = code.replace(
/sma\.salesman_code,\s*SUM/g,
"sma.salesman_code,\n            sma.salesman_name,\n            SUM"
);
code = code.replace(
/GROUP BY sma\.salesman_code\s*\),\s*piutang_data/g,
"GROUP BY sma.salesman_code, sma.salesman_name\n    ),\n    piutang_data"
);

// omset_5jt_data
code = code.replace(
/t\.salesman_code,\s*SUM/g,
"t.salesman_code,\n            t.salesman_name,\n            SUM"
);
code = code.replace(
/GROUP BY t\.salesman_code\s*\),\s*base_data/g,
"GROUP BY t.salesman_code, t.salesman_name\n    ),\n    base_data"
);

code = code.replace(
/sk\.salesman_code,\s*COALESCE/g,
"sk.salesman_code,\n                sk.salesman_name,\n                COALESCE"
);
code = code.replace(
/GROUP BY sk\.salesman_code,\s*COALESCE/g,
"GROUP BY sk.salesman_code, sk.salesman_name, COALESCE"
);

fs.writeFileSync(p, code);
