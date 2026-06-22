const fs = require('fs');

const content = fs.readFileSync('file test.csv', 'utf8');
const lines = content.trim().split('\n');
const headers = lines[0].split(';');

const coTgIdx = headers.indexOf('co_tg');

let ones = 0;
let others = {};

for (let i = 1; i < lines.length; i++) {
  const cols = lines[i].split(';');
  if (cols.length > coTgIdx) {
    const val = cols[coTgIdx].trim();
    if (val === '1') ones++;
    else {
      others[val] = (others[val] || 0) + 1;
    }
  }
}

console.log('co_tg counts:', { ones, others });
