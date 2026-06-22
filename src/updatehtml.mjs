import fs from 'fs';

const path = 'src/components/features/MapsAnalyzer/index.tsx';
let data = fs.readFileSync(path, 'utf8');

// 1. Add Login UI to HTML
const targetStrBody = `<body class="bg-slate-100 text-slate-800 pb-24">`;
const loginUi = `<body class="bg-slate-100 text-slate-800 pb-24">

  <!-- Salesman Login Screen -->
  <div id="loginScreen" class="fixed inset-0 bg-slate-100 z-[9999] flex flex-col items-center justify-center p-6 transition-opacity duration-300">
    <div class="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm transform transition-transform">
      <div class="text-center mb-6">
        <div class="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl"><i class="fa-solid fa-user-tie"></i></div>
        <h2 class="text-xl font-black text-slate-800">Login Salesman</h2>
        <p class="text-sm text-slate-500 mt-1">Masukkan kode salesman Anda</p>
      </div>
      <input type="text" id="salesmanCodeInput" class="w-full border border-slate-200 rounded-xl px-4 py-3 mb-4 focus:ring-2 focus:ring-indigo-500 outline-none text-center font-bold" placeholder="Contoh: SL001" autocomplete="off" />
      <button id="loginBtn" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-indigo-500/30 flex justify-center items-center gap-2">
        <i class="fa-solid fa-right-to-bracket"></i> Masuk
      </button>
    </div>
  </div>`;
data = data.replace(targetStrBody, loginUi);

// 2. Add Login Logic to Script
const targetStrScriptStart = `    let appData = \${JSON.stringify(initialData)};`;
const loginLogic = `    let appData = \${JSON.stringify(initialData)};
    let activeSalesman = null;

    // Login Logic
    document.addEventListener('DOMContentLoaded', () => {
       const savedSalesman = localStorage.getItem('mapsAnalyzerSalesman');
       if (savedSalesman) {
          activeSalesman = JSON.parse(savedSalesman);
          document.getElementById('loginScreen').style.display = 'none';
       }
    });

    document.getElementById('loginBtn').addEventListener('click', async () => {
       const code = document.getElementById('salesmanCodeInput').value.trim();
       if (!code) {
          return Swal.fire('Error', 'Kode Salesman wajib diisi!', 'warning');
       }
       
       const btn = document.getElementById('loginBtn');
       btn.disabled = true;
       btn.innerHTML = '<span class="loader w-5 h-5 border-2 text-white mr-2"></span> Memeriksa...';

       try {
          const res = await fetch(\`\${SUPABASE_URL}/rest/v1/salesman_customer?salesman_code=eq.\${encodeURIComponent(code)}&select=salesman_code,nama_salesman&limit=1\`, {
             headers: { 'apikey': SUPABASE_KEY, 'Authorization': \`Bearer \${SUPABASE_KEY}\` }
          });
          const fetchedData = await res.json();
          if (fetchedData && fetchedData.length > 0) {
             activeSalesman = { code: fetchedData[0].salesman_code, name: fetchedData[0].nama_salesman };
             localStorage.setItem('mapsAnalyzerSalesman', JSON.stringify(activeSalesman));
             document.getElementById('loginScreen').style.opacity = '0';
             setTimeout(() => document.getElementById('loginScreen').style.display = 'none', 300);
          } else {
             Swal.fire('Tidak Tersedia', 'Kode Salesman tidak ditemukan.', 'error');
          }
       } catch (err) {
          Swal.fire('Error', 'Gagal memverifikasi salesman', 'error');
       } finally {
          btn.disabled = false;
          btn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Masuk';
       }
    });`;
data = data.replace(targetStrScriptStart, loginLogic);

// 3. Edit vs Survey Button
const targetStrCardBtn = `          const surveyBtnClass = item.is_surveyed ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/30';
          const surveyBtnIcon = item.is_surveyed ? '<i class="fa-solid fa-pen-to-square"></i> Edit' : '<i class="fa-solid fa-clipboard-check"></i> Survey';`;

const newStrCardBtn = `          const showEdit = activeTab === 'sudah' && item.is_surveyed;
          const surveyBtnClass = showEdit ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/30';
          const surveyBtnIcon = showEdit ? '<i class="fa-solid fa-pen-to-square"></i> Edit' : '<i class="fa-solid fa-clipboard-check"></i> Survey';
          const isEditMode = showEdit;`;

data = data.replace(targetStrCardBtn, newStrCardBtn);

const targetBtnHtml = `                  <button onclick="openSurvey('\${item.id}')" class="flex-1 text-white shadow-md py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 \${surveyBtnClass}">`;
const newBtnHtml = `                  <button onclick="openSurvey('\${item.id}', \${isEditMode})" class="flex-1 text-white shadow-md py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 \${surveyBtnClass}">`;
data = data.replaceAll(targetBtnHtml, newBtnHtml);

// 4. Update openSurvey signature and behavior
const targetOpenSurveyFn = `    window.openSurvey = async function(id) {`;
const newOpenSurveyFn = `    window.openSurvey = async function(id, isEdit = false) {`;
data = data.replace(targetOpenSurveyFn, newOpenSurveyFn);

const targetIsSurveyedCond = `       if (item.is_surveyed) {`;
const newIsSurveyedCond = `       if (isEdit && item.is_surveyed) {`;
data = data.replace(targetIsSurveyedCond, newIsSurveyedCond);

// 5. Update payload saving
const targetPayload = `       const payload = {
           nama_toko: nama_toko,`;
const newPayload = `       const payload = {
           salesman_code: activeSalesman?.code || '',
           nama_salesman: activeSalesman?.name || '',
           nama_toko: nama_toko,`;
data = data.replace(targetPayload, newPayload);

// 6. Update Sync empty message
const targetEmptyCards = `       if (totalItems === 0) {
          html = \`<div class="text-center p-10 bg-white rounded-2xl border border-dashed border-slate-300 mt-4">
             <div class="text-slate-300 text-5xl mb-3"><i class="fa-solid fa-folder-open"></i></div>
             <p class="text-slate-500 font-medium">Tidak ada data kunjungan ditemukan.</p>
          </div>\`;`;

const newEmptyCards = `       if (totalItems === 0) {
          if (activeTab === 'sudah') {
            html = \`<div class="text-center p-8 bg-blue-50 rounded-2xl border border-dashed border-blue-200 mt-4">
               <div class="text-blue-300 text-4xl mb-3"><i class="fa-solid fa-rotate"></i></div>
               <p class="text-blue-600 font-bold mb-1">Riwayat Kosong</p>
               <p class="text-slate-500 font-medium text-sm">Silahkan klik tombol <b><i class="fa-solid fa-rotate-right"></i> Sync DB</b> agar data riwayat muncul.</p>
            </div>\`;
          } else {
            html = \`<div class="text-center p-10 bg-white rounded-2xl border border-dashed border-slate-300 mt-4">
               <div class="text-slate-300 text-5xl mb-3"><i class="fa-solid fa-folder-open"></i></div>
               <p class="text-slate-500 font-medium">Tidak ada data kunjungan ditemukan.</p>
            </div>\`;
          }
`;
data = data.replace(targetEmptyCards, newEmptyCards);

// 7. Add salesman name to card
const targetSurveyHistoryHtml = `          let surveyHistoryHtml = '';
          if (activeTab === 'sudah' && item.is_surveyed) {
              const ls = item.latest_survey;`;

const newSurveyHistoryHtml = `          let surveyHistoryHtml = '';
          if (activeTab === 'sudah' && item.is_surveyed) {
              const ls = item.latest_survey;
              const surveyorLabel = ls && ls.nama_salesman ? \`<div class="mt-2 text-xs bg-slate-100 text-slate-600 py-1.5 px-2 rounded-lg border border-slate-200"><i class="fa-solid fa-user-check text-emerald-500 mr-1"></i> Disurvey oleh: <b>\${ls.nama_salesman}</b></div>\` : '';`;

data = data.replace(targetSurveyHistoryHtml, newSurveyHistoryHtml);

const targetAppendHistory = `                  <div class="bg-slate-50 rounded-lg p-3 border border-slate-100 text-xs text-slate-600 space-y-1 mb-3">
                     <div class="flex justify-between border-b pb-1">`;
                     
const newAppendHistory = `                  <div class="bg-slate-50 rounded-lg p-3 border border-slate-100 text-xs text-slate-600 space-y-1 mb-3">
                     \${surveyorLabel}
                     <div class="flex justify-between border-b pb-1 mt-2">`;
data = data.replace(targetAppendHistory, newAppendHistory);


fs.writeFileSync(path, data);
console.log('done!');
