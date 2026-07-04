import fs from 'fs';

const p = 'src/components/features/SetupDatabase/sql-scripts.ts';
let code = fs.readFileSync(p, 'utf8');

code = code.replace(
/LEFT JOIN program_data prg ON b\.salesman_code = prg\.salesman_code/g,
"LEFT JOIN program_data prg ON b.salesman_code = prg.salesman_code AND b.salesman_name = prg.salesman_name"
);

code = code.replace(
/LEFT JOIN spu_data spu ON b\.salesman_code = spu\.salesman_code/g,
"LEFT JOIN spu_data spu ON b.salesman_code = spu.salesman_code AND b.salesman_name = spu.salesman_name"
);

code = code.replace(
/LEFT JOIN manual_data md ON b\.salesman_code = md\.salesman_code/g,
"LEFT JOIN manual_data md ON b.salesman_code = md.salesman_code AND b.salesman_name = md.salesman_name"
);

code = code.replace(
/LEFT JOIN omset_5jt_data o5 ON b\.salesman_code = o5\.salesman_code/g,
"LEFT JOIN omset_5jt_data o5 ON b.salesman_code = o5.salesman_code AND b.salesman_name = o5.salesman_name"
);

code = code.replace(
/LEFT JOIN total_cust_data tot ON b\.salesman_code = tot\.salesman_code/g,
"LEFT JOIN total_cust_data tot ON b.salesman_code = tot.salesman_code AND b.salesman_name = tot.salesman_name"
);

fs.writeFileSync(p, code);
