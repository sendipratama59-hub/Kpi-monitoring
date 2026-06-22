export const buildLcdCompareHtml = (SUPABASE_URL: string, SUPABASE_KEY: string) => {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>Perbandingan Harga LCD</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background-color: #f8fafc; }
    .loader { border: 2px solid #fff; border-bottom-color: transparent; border-radius: 50%; display: inline-block; box-sizing: border-box; animation: rotation 1s linear infinite; }
    @keyframes rotation { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  </style>
</head>
<body class="text-slate-800 pb-10">

  <!-- Fixed Top Header -->
  <div class="sticky top-0 z-40 bg-indigo-600 shadow-lg px-4 py-4 text-white">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl shrink-0">
        <i class="fa-solid fa-scale-balanced"></i>
      </div>
      <div>
        <h1 class="text-xl font-black leading-tight tracking-tight shadow-sm">Perbandingan Harga LCD</h1>
        <p class="text-indigo-200 text-xs mt-0.5">Pantau harga kompetitor</p>
      </div>
    </div>
  </div>

  <div class="bg-white border-b sticky top-[72px] z-30 shadow-sm px-4 py-3">
    <div class="relative mb-3">
      <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"></i>
      <input type="text" id="searchInput" class="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="Cari nama LCD...">
    </div>
    <div class="flex gap-2 items-center">
      <div class="flex-1 relative">
         <label class="block text-[10px] uppercase font-bold text-slate-500 mb-1">Diskon Kita (%)</label>
         <input type="number" id="discountInput" value="0" class="w-full pl-3 pr-3 py-1.5 border border-slate-300 rounded-lg text-sm font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none">
      </div>
      <div class="flex-1 mt-4">
        <label class="flex items-center gap-2 text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg cursor-pointer">
          <input type="checkbox" id="competitorToggle" class="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500">
          <span class="whitespace-nowrap">Hanya +Kompetitor</span>
        </label>
      </div>
    </div>
  </div>

  <div id="loading" class="flex flex-col items-center justify-center p-12 text-indigo-600">
     <div class="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3"></div>
     <p class="text-sm font-bold animate-pulse">Mengambil data...</p>
  </div>

  <div class="p-4" id="listContainer">
    <!-- List renders here -->
  </div>

  <div id="pagination" class="px-4 pb-4 hidden flex justify-between items-center">
     <button id="prevBtn" class="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm font-bold shadow-sm disabled:opacity-50">Prev</button>
     <span id="pageInfo" class="text-sm font-bold text-slate-500">Hal 1/1</span>
     <button id="nextBtn" class="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm font-bold shadow-sm disabled:opacity-50">Next</button>
  </div>

  <script>
    const SUPABASE_URL = '${SUPABASE_URL}';
    const SUPABASE_KEY = '${SUPABASE_KEY}';

    let allProducts = [];
    let filteredProducts = [];
    let currentPage = 1;
    const itemsPerPage = 50;

    const listContainer = document.getElementById('listContainer');
    const searchInput = document.getElementById('searchInput');
    const discountInput = document.getElementById('discountInput');
    const competitorToggle = document.getElementById('competitorToggle');
    const loadingEl = document.getElementById('loading');
    const paginationEl = document.getElementById('pagination');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const pageInfo = document.getElementById('pageInfo');

    async function fetchData() {
       try {
          const res = await fetch(SUPABASE_URL + '/rest/v1/lcd_catalog_products?select=id,goods_code,brand_lcd,brand_hp,model_hp,packing,price,competitors&order=brand_hp,model_hp', {
             headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
          });
          allProducts = await res.json();
          filterAndRender();
       } catch (err) {
          listContainer.innerHTML = '<div class="text-center p-8 text-rose-500 font-bold">Gagal memuat data. Periksa koneksi internet.</div>';
       } finally {
          loadingEl.style.display = 'none';
       }
    }

    function calculatePcsPrice(price, packing) {
       const p = String(packing || '1');
       const match = p.match(/(\\d+)\\s*pcs/i) || p.match(/(\\d+)/);
       const pcs = match ? parseInt(match[1]) : 1;
       return (price || 0) / Math.max(1, pcs);
    }

    function formatRp(num) {
       return new Intl.NumberFormat('id-ID').format(Math.round(num));
    }

    function highlightText(text, search) {
       if (!search) return text;
       const searchTerms = search.toLowerCase().split(' ').filter(Boolean);
       if (searchTerms.length === 0) return text;
       
       const pattern = searchTerms.map(t => t.replace(/[-/\\\\^$*+?.()|[\\]{}]/g, '\\\\$&')).join('|');
       const regex = new RegExp(\`(\${pattern})\`, 'gi');
       
       return String(text).replace(regex, '<mark class="bg-yellow-300 text-slate-800 rounded-sm px-0.5">$1</mark>');
    }

    function filterAndRender() {
       const search = searchInput.value.toLowerCase();
       const onlyCompetitors = competitorToggle.checked;
       
       filteredProducts = allProducts.filter(p => {
          const text = \`\${p.goods_code||''} \${p.brand_lcd||''} \${p.brand_hp||''} \${p.model_hp||''} \${p.packing||''}\`.toLowerCase();
          
          if (search) {
             const searchTerms = search.split(' ').filter(Boolean);
             const match = searchTerms.every(term => text.includes(term));
             if (!match) return false;
          }
          if (onlyCompetitors && (!p.competitors || p.competitors.length === 0)) return false;
          return true;
       });

       // sorting identical to react version
       if (search) {
          filteredProducts.sort((a, b) => {
             let sa = 0, sb = 0;
             const af = \`\${a.brand_hp||''} \${a.model_hp||''}\`.trim().toLowerCase();
             const bf = \`\${b.brand_hp||''} \${b.model_hp||''}\`.trim().toLowerCase();
             if (af.startsWith(search)) sa += 100;
             if (bf.startsWith(search)) sb += 100;
             if (\` \${af}\`.includes(\` \${search}\`)) sa += 50;
             if (\` \${bf}\`.includes(\` \${search}\`)) sb += 50;
             const am = (a.model_hp||'').toLowerCase();
             const bm = (b.model_hp||'').toLowerCase();
             if (am === search) sa += 75;
             if (bm === search) sb += 75;
             return sb - sa;
          });
       }

       currentPage = 1;
       renderList();
    }

    function renderList() {
       const discountPct = parseFloat(discountInput.value) || 0;
       const search = searchInput.value;
       
       const totalItems = filteredProducts.length;
       const totalPages = Math.ceil(totalItems / itemsPerPage);
       
       if (currentPage > totalPages) currentPage = totalPages;
       if (currentPage < 1) currentPage = 1;
       
       const start = (currentPage - 1) * itemsPerPage;
       const paginated = filteredProducts.slice(start, start + itemsPerPage);

       if (totalItems === 0) {
          listContainer.innerHTML = '<div class="text-center p-8 bg-white rounded-xl border border-dashed border-slate-300 text-slate-500 font-medium">Tidak ada LCD ditemukan.</div>';
          paginationEl.classList.add('hidden');
          return;
       }

       let html = '<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">';
       paginated.forEach(p => {
          const isVivan = (p.brand_lcd || '').toLowerCase() === 'vivan';
          const cardClass = isVivan ? 'border-indigo-100' : 'border-emerald-100';
          const headerBg = isVivan ? 'bg-indigo-50/50' : 'bg-emerald-50/50';
          const badgeClass = isVivan ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200';
          
          const basePrice = calculatePcsPrice(p.price, p.packing);
          const netPrice = basePrice - (basePrice * (discountPct / 100));

          let compsHtml = '';
          if (p.competitors && p.competitors.length > 0) {
             compsHtml = p.competitors.map(c => {
                const diff = c.price - netPrice;
                const isCheaper = netPrice < c.price;
                const isExp = netPrice > c.price;
                
                let diffHtml = '';
                if (isCheaper) diffHtml = \`<div class="flex justify-between bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-1 rounded w-full"><span class="text-[10px] font-bold uppercase">Kita Lebih Murah</span><span class="text-xs font-black">+\${formatRp(diff)}</span></div>\`;
                else if (isExp) diffHtml = \`<div class="flex justify-between bg-rose-50 text-rose-700 border border-rose-100 px-2 py-1 rounded w-full"><span class="text-[10px] font-bold uppercase">Kita Lebih Mahal</span><span class="text-xs font-black">\${formatRp(diff)}</span></div>\`;
                else diffHtml = \`<div class="bg-slate-100 text-slate-500 border border-slate-200 px-2 py-1 rounded w-full text-center text-[10px] font-bold uppercase">Harga Sama</div>\`;
                
                return \`
                  <div class="bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm flex flex-col gap-1.5 mb-2">
                     <div class="flex justify-between items-start">
                        <span class="text-xs font-bold text-slate-700">\${c.name}</span>
                        <span class="text-sm font-black text-slate-800">Rp \${formatRp(c.price)}</span>
                     </div>
                     \${diffHtml}
                  </div>\`;
             }).join('');
          } else {
             compsHtml = '<div class="text-center py-4 text-[11px] font-bold uppercase text-slate-400 bg-white border border-dashed border-slate-200 rounded-lg">Belum ada kompetitor</div>';
          }

          html += \`
            <div class="bg-white border \${cardClass} rounded-xl overflow-hidden shadow-sm flex flex-col">
              <div class="px-4 py-3 border-b border-slate-100 \${headerBg}">
                <div class="font-bold text-slate-800 text-sm uppercase leading-tight">
                  \${highlightText((p.brand_hp||'') + ' ' + (p.model_hp||''), search)}
                </div>
                <div class="flex flex-wrap items-center gap-1.5 mt-1.5">
                  <span class="font-mono text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 uppercase">\${highlightText(p.goods_code || '-', search)}</span>
                  <span class="text-[10px] font-black px-2 py-0.5 rounded border uppercase \${badgeClass}">\${highlightText(p.brand_lcd || 'Vivan', search)}</span>
                  <span class="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 uppercase">\${highlightText(p.packing, search)}</span>
                </div>
                <div class="flex justify-between items-end mt-3 pt-2 border-t border-slate-200/50">
                  <div class="flex flex-col">
                    <span class="text-[9px] font-bold text-slate-500 uppercase">Harga Normal</span>
                    <span class="text-xs font-bold text-slate-400 line-through">Rp \${formatRp(basePrice)}</span>
                  </div>
                  <div class="flex flex-col text-right">
                    <span class="text-[9px] font-bold text-indigo-500 uppercase">Harga Diskon</span>
                    <span class="text-base font-black text-indigo-600 leading-none">Rp \${formatRp(netPrice)}</span>
                  </div>
                </div>
              </div>
              <div class="p-3 bg-slate-50/50 flex flex-col flex-1">
                <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Kompetitor</div>
                \${compsHtml}
              </div>
            </div>
          \`;
       });
       html += '</div>';
       listContainer.innerHTML = html;

       if (totalPages > 1) {
          paginationEl.classList.remove('hidden');
          pageInfo.innerText = \`Hal \${currentPage} / \${totalPages}\`;
          prevBtn.disabled = currentPage === 1;
          nextBtn.disabled = currentPage === totalPages;
       } else {
          paginationEl.classList.add('hidden');
       }
    }

    searchInput.addEventListener('input', () => { filterAndRender(); });
    discountInput.addEventListener('input', () => { filterAndRender(); });
    competitorToggle.addEventListener('change', () => { filterAndRender(); });
    
    prevBtn.addEventListener('click', () => {
       if (currentPage > 1) { currentPage--; window.scrollTo(0,0); renderList(); }
    });
    nextBtn.addEventListener('click', () => {
       const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
       if (currentPage < totalPages) { currentPage++; window.scrollTo(0,0); renderList(); }
    });

    fetchData();
  </script>
</body>
</html>`;
};
