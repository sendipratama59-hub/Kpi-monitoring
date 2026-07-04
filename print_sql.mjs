import fs from 'fs';
const sql = fs.readFileSync('src/components/features/SetupDatabase/sql-scripts.ts', 'utf8');
const match = sql.split('`');
if (match.length > 2) {
    console.log(match[1].substring(0, 100));
}
