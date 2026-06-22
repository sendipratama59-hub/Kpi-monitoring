const fs = require('fs');

const content = fs.readFileSync('file test.csv', 'utf8');
const lines = content.trim().split('\n');
const headers = lines[0].split(';');

const counts = {};

for (let i = 1; i < lines.length; i++) {
  const cols = lines[i].split(';');
  headers.forEach((h, idx) => {
     if (!counts[h]) counts[h] = {ones: 0, zeros: 0, others: 0};
     if (cols.length > idx) {
        const val = cols[idx].trim();
        if (val === '1') counts[h].ones++;
        else if (val === '0') counts[h].zeros++;
        else counts[h].others++;
     }
  });
}

const withOnes = Object.keys(counts).filter(k => counts[k].ones > 0).map(k => `${k}: ${counts[k].ones}`);
console.log('Columns with 1s:', withOnes);
