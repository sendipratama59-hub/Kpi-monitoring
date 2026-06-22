import fs from 'fs';

const path = 'src/components/features/MapsAnalyzer/index.tsx';
let data = fs.readFileSync(path, 'utf8');

// 2. Fix empty state to show "Sync DB"
const targetEmpty = `       if (totalItems === 0) {
          html = \\\`<div class="text-center p-10 bg-white rounded-2xl border border-dashed border-slate-300 mt-4">
             <div class="text-slate-300 text-5xl mb-3"><i class="fa-solid fa-folder-open"></i></div>
             <p class="text-slate-500 font-medium">Tidak ada data kunjungan ditemukan.</p>
          </div>\\\`;
       }`;

// Using Regex since backticks can be tricky.
data = data.replace(
/if \(totalItems === 0\) \{\s*html = `(.*?)Tidak ada data kunjungan ditemukan\.(.*?)`;\s*\}/s,
`if (totalItems === 0) {
          if (activeTab === 'sudah') {
            html = \`<div class="text-center p-8 bg-blue-50 rounded-2xl border border-dashed border-blue-200 mt-4">
               <div class="text-blue-300 text-4xl mb-3"><i class="fa-solid fa-rotate"></i></div>
               <p class="text-blue-600 font-bold mb-1">Riwayat Kosong</p>
               <p class="text-slate-500 font-medium text-sm">Silahkan klik tombol <b><i class="fa-solid fa-cloud-arrow-down"></i> Sync DB</b> agar data riwayat dari database termuat ke perangkat.</p>
            </div>\`;
          } else {
            html = \`<div class="text-center p-10 bg-white rounded-2xl border border-dashed border-slate-300 mt-4">
               <div class="text-slate-300 text-5xl mb-3"><i class="fa-solid fa-folder-open"></i></div>
               <p class="text-slate-500 font-medium">Tidak ada data kunjungan ditemukan.</p>
            </div>\`;
          }
       }`
);

// 3. Show salesman name and 4. Edit mode
data = data.replace(
/const statusText = item.is_surveyed \? '<i class="fa-solid fa-check"><\/i> Sudah' : '<i class="fa-regular fa-clock"><\/i> Belum';\s*const statusClass = item.is_surveyed \? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-amber-100 text-amber-700 border-amber-200';\s*const surveyBtnClass = item.is_surveyed \? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500\/30' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500\/30';\s*const surveyBtnIcon = item.is_surveyed \? '<i class="fa-solid fa-pen-to-square"><\/i> Edit' : '<i class="fa-solid fa-clipboard-check"><\/i> Survey';/,
`const statusText = item.is_surveyed ? '<i class="fa-solid fa-check"></i> Sudah' : '<i class="fa-regular fa-clock"></i> Belum';
          const statusClass = item.is_surveyed ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-amber-100 text-amber-700 border-amber-200';
          
          const showEdit = activeTab === 'sudah' && item.is_surveyed;
          const surveyBtnClass = showEdit ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/30';
          const surveyBtnIcon = showEdit ? '<i class="fa-solid fa-pen-to-square"></i> Edit' : '<i class="fa-solid fa-clipboard-check"></i> Survey';`
);

data = data.replace(
/<button onclick="openSurvey\('\\$\{item.id\}'\)" class="flex-1 text-white shadow-md py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 \\$\{surveyBtnClass\}"\>/,
`<button onclick="openSurvey('\${item.id}', \${showEdit})" class="flex-1 text-white shadow-md py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 \${surveyBtnClass}">`
);


// 4b. Fix openSurvey Definition
/*
    window.openSurvey = async function(id) {
       const item = appData.find(d => d.id === id);
       if (!item) return;
       currentSurveyId = null;
*/
data = data.replace(
/window\.openSurvey = async function\(id\) \{/,
`window.openSurvey = async function(id, isEdit = false) {`
);

// 4c. Fix is_surveyed check
/*
       
       if (item.is_surveyed) {
*/
data = data.replace(
/if \(item\.is_surveyed\) \{/,
`if (isEdit && item.is_surveyed) {`
);

// We already fixed `ls && ls.nama_salesman` with fixsyntax3.mjs, but let's verify if `surveyHistoryHtml` has the salesman appended.
// I'll re-inject it safely in JS using regex.

/*
        let surveyHistoryHtml = '';
        if (activeTab === 'sudah' && item.is_surveyed) {
            const ls = item.latest_survey;
            const surveyorLabel = ls && ls.nama_salesman ? \`<div class="mt-2 text-xs bg-slate-100 text-slate-600 py-1.5 px-2 rounded-lg border border-slate-200"><i class="fa-solid fa-user-check text-emerald-500 mr-1"></i> Disurvey oleh: <b>\${ls.nama_salesman}</b></div>\` : '';
            if (ls) {
               surveyHistoryHtml = \`
                 <div class="bg-slate-50 rounded-lg p-3 border border-slate-100 text-xs text-slate-600 space-y-1 mb-3">
                   \${surveyorLabel}
*/
data = data.replace(
/<div class="bg-slate-50 rounded-lg p-3 border border-slate-100 text-xs text-slate-600 space-y-1 mb-3">\s*<div class="flex justify-between border-b pb-1">/g,
`<div class="bg-slate-50 rounded-lg p-3 border border-slate-100 text-xs text-slate-600 space-y-1 mb-3">
                   \${surveyorLabel}
                   <div class="flex justify-between border-b pb-1 mt-2">`
);

fs.writeFileSync(path, data);
console.log('done fixes');
