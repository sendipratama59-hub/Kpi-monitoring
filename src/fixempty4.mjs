import fs from 'fs';

const path = 'src/components/features/MapsAnalyzer/index.tsx';
let data = fs.readFileSync(path, 'utf8');

const targetLines =
"       if (totalItems === 0) {\n" +
"          html = `\\<div class=\"text-center p-10 bg-white rounded-2xl border border-dashed border-slate-300 mt-4\"\\>\n" +
"             \\<div class=\"text-slate-300 text-5xl mb-3\"\\>\\<i class=\"fa-solid fa-folder-open\"\\>\\</i\\>\\</div\\>\n" +
"             \\<p class=\"text-slate-500 font-medium\"\\>Tidak ada data kunjungan ditemukan.\\</p\\>\n" +
"          \\</div\\>\\`;\n" +
"       }";
// Let's just use string functions carefully:
const matchStr = "Tidak ada data kunjungan ditemukan.</p>";
const idx = data.indexOf(matchStr);
if (idx > -1) {
  // Let's find "if (totalItems === 0) {" before it.
  const startIdx = data.lastIndexOf("if (totalItems === 0) {", idx);
  // Let's find "}" after it.
  const endIdx = data.indexOf("}", idx);
  
  if (startIdx > -1 && endIdx > -1) {
    const toReplace = data.substring(startIdx, endIdx + 1);
    
    // Check if it's the right block:
    if (toReplace.includes('Tidak ada data kunjungan ditemukan.')) {
      const replacement = `if (totalItems === 0) {
          if (activeTab === 'sudah') {
            html = \\\`<div class="text-center p-8 bg-blue-50 rounded-2xl border border-dashed border-blue-200 mt-4">
               <div class="text-blue-300 text-4xl mb-3"><i class="fa-solid fa-rotate"></i></div>
               <p class="text-blue-600 font-bold mb-1">Riwayat Kosong</p>
               <p class="text-slate-500 font-medium text-sm">Silahkan klik tombol <b><i class="fa-solid fa-cloud-arrow-down"></i> Sync DB</b> agar data riwayat dari database termuat ke perangkat.</p>
            </div>\\\`;
          } else {
            html = \\\`<div class="text-center p-10 bg-white rounded-2xl border border-dashed border-slate-300 mt-4">
               <div class="text-slate-300 text-5xl mb-3"><i class="fa-solid fa-folder-open"></i></div>
               <p class="text-slate-500 font-medium">Tidak ada data kunjungan ditemukan.</p>
            </div>\\\`;
          }
       }`;
       data = data.replace(toReplace, replacement);
       fs.writeFileSync(path, data);
       console.log('done substring replace');
    }
  }
}

