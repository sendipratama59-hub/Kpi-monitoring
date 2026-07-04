import fs from 'fs';
let content = fs.readFileSync('src/components/features/RevenueAnalysis/index.tsx', 'utf8');
let lines = content.split('\n');
console.log(JSON.stringify(lines.slice(646, 654)));
console.log(JSON.stringify(lines.slice(827, 836)));
