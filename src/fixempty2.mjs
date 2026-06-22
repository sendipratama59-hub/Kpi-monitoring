import fs from 'fs';

const path = 'src/components/features/MapsAnalyzer/index.tsx';
let data = fs.readFileSync(path, 'utf8');

data = data.replace(
/if\s*\(totalItems === 0\)\s*\{\s*html = `.*?Tidak ada data kunjungan ditemukan.*?`;\s*\}/g,
`if (totalItems === 0) {
          if (activeTab === 'sudah') {
            html = \`\\<div class="text-center p-8 bg-blue-50 rounded-2xl border border-dashed border-blue-200 mt-4"\\>
               \\<div class="text-blue-300 text-4xl mb-3"\\>\\<i class="fa-solid fa-rotate"\\>\\</i\\>\\</div\\>
               \\<p class="text-blue-600 font-bold mb-1"\\>Riwayat Kosong\\</p\\>
               \\<p class="text-slate-500 font-medium text-sm"\\>Silahkan klik tombol \\<b\\>\\<i class="fa-solid fa-cloud-arrow-down"\\>\\</i\\> Sync DB\\</b\\> agar data riwayat termuat.\\</p\\>
            \\</div\\>\`;
          } else {
            html = \`\\<div class="text-center p-10 bg-white rounded-2xl border border-dashed border-slate-300 mt-4"\\>
               \\<div class="text-slate-300 text-5xl mb-3"\\>\\<i class="fa-solid fa-folder-open"\\>\\</i\\>\\</div\\>
               \\<p class="text-slate-500 font-medium"\\>Tidak ada data kunjungan ditemukan.\\</p\\>
            \\</div\\>\`;
          }
       }`
);

fs.writeFileSync(path, data);
console.log('done regex empty fix');
