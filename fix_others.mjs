import fs from 'fs';

const p = 'src/components/features/SetupDatabase/sql-scripts.ts';
let code = fs.readFileSync(p, 'utf8');

code = code.replace(
/pb\.salesman_code,\n\s*COUNT/g,
"pb.salesman_code,\n            pb.salesman_name,\n            COUNT"
);

code = code.replace(
/ps\.salesman_code,\n\s*COUNT/g,
"ps.salesman_code,\n            ps.salesman_name,\n            COUNT"
);

// omset_5jt_data
code = code.replace(
/t\.salesman_code,\n\s*COUNT/g,
"t.salesman_code,\n            t.salesman_name,\n            COUNT"
);

// piutang_data
// wait, piutang_data was:
// SELECT pc.salesman_code, pc.salesman_name, SUM...
// Let's check piutang_data
