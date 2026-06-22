export const buildLcdCatalogListHtml = (SUPABASE_URL: string, SUPABASE_KEY: string) => {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Pricelist LCD</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background-color: #f8fafc; -webkit-tap-highlight-color: transparent; }
    .loader { border: 2px solid #6366f1; border-bottom-color: transparent; border-radius: 50%; display: inline-block; box-sizing: border-box; animation: rotation 1s linear infinite; }
    @keyframes rotation { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    .toast { animation: slideUp 0.3s ease forwards; transform: translateY(100%); opacity: 0; }
    @keyframes slideUp { to { transform: translateY(0); opacity: 1; } }
    mark { background-color: #fde047; color: #1e293b; border-radius: 2px; padding: 0 2px; }
    .export-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .export-table th, .export-table td { border: 1px solid #cbd5e1; padding: 4px 8px; text-align: center; }
    .export-table th { background-color: #f1f5f9; font-weight: bold; }
    .export-table td.text-left { text-align: left; }
    @media print {
      body * { visibility: hidden; }
      #printArea, #printArea * { visibility: visible; }
      #printArea { position: absolute; left: 0; top: 0; width: 100%; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body class="text-slate-800">
  <!-- Print Area -->
  <div id="printArea" class="hidden no-print bg-white p-4"></div>
  
  <!-- Export Modal -->
  <div id="exportModal" class="fixed inset-0 z-[150] bg-slate-900/40 backdrop-blur-sm hidden flex-col items-center justify-center p-4">
    <div class="bg-white w-full max-w-sm rounded-2xl shadow-xl flex flex-col overflow-hidden animate-[slideUp_0.3s]">
      <div class="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
        <h3 class="font-black text-slate-800">Download Pricelist</h3>
        <button id="closeExportModal" class="text-slate-400 hover:text-slate-600"><i class="fa-solid fa-xmark text-lg"></i></button>
      </div>
      <div class="p-5 flex flex-col gap-4">
        <div>
          <label class="block text-xs font-bold text-slate-500 mb-1">Brand LCD</label>
          <select id="exportBrand" class="w-full border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
            <option value="Semua">Semua Brand</option>
            <option value="Vivan">Vivan</option>
            <option value="Xpas">Xpas</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-500 mb-1">Diskon Kita (%)</label>
          <input type="number" id="exportDiscount" class="w-full border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="0">
        </div>
      </div>
      <div class="bg-slate-50 p-4 border-t border-slate-100 flex gap-2">
        <button id="btnExportPrint" class="flex-1 py-2 rounded-xl text-indigo-700 bg-indigo-100 font-bold hover:bg-indigo-200 text-sm">Print</button>
        <button id="btnExportExcel" class="flex-1 py-2 rounded-xl text-white bg-indigo-600 font-bold hover:bg-indigo-700 shadow-lg text-sm">Excel</button>
      </div>
    </div>
  </div>

  <!-- Loading Setup -->
  <div id="loadingOverlay" class="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex flex-col items-center justify-center transition-opacity duration-300">
     <div class="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center gap-3">
        <span class="loader w-10 h-10"></span>
        <p id="loadingMsg" class="text-sm font-bold text-slate-700">Mempersiapkan Data...</p>
     </div>
  </div>

  <div class="bg-slate-50 min-h-screen">
    <!-- Header -->
    <div class="bg-white pt-3 pb-2 px-4 shadow-sm border-b border-slate-200 sticky top-0 z-30">
      <div class="max-w-4xl mx-auto">
        <div class="flex items-start justify-between">
          <div>
            <h1 class="text-lg sm:text-xl font-black text-slate-900 tracking-tight">Pricelist LCD Vivan dan Xpas</h1>
            <p class="text-xs sm:text-sm font-semibold text-slate-500 mb-2">LCD Berkualitas Garansi Lem 1 Tahun</p>
          </div>
          <button id="btnDownloadPricelist" class="no-print bg-amber-500 hover:bg-amber-600 text-white font-bold py-1.5 px-3 rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-sm">
            <i class="fa-solid fa-download"></i>
            <span class="hidden sm:inline">Pricelist</span>
          </button>
        </div>
        
        <div class="mt-2 flex flex-col gap-3">
          <div class="relative w-full">
            <i class="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
            <input 
              type="text" 
              id="searchInput"
              placeholder="Cari model HP..." 
              class="pl-9 pr-4 py-2 border rounded-xl bg-slate-50 border-slate-200 w-full text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
          </div>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="max-w-4xl mx-auto px-2 sm:px-4 py-6 pb-32">
       <div id="statsInfo" class="px-1 py-1 mb-2">
         <span class="text-xs font-black uppercase text-slate-500" id="statsText">Daftar Produk LCD (0)</span>
       </div>
       <div id="pList" class="flex flex-col gap-4">
          <!-- Cards Rendered Here -->
       </div>
       <div id="noResults" class="hidden bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center text-slate-400 font-medium mt-4">
          Tidak ada produk yang sesuai dengan pencarian.
       </div>
       <div id="paginationControls" class="flex flex-wrap justify-center items-center gap-2 mt-6 pb-6"></div>
    </div>
  </div>

  <script>
    const SUPABASE_URL = '${SUPABASE_URL}';
    const SUPABASE_KEY = '${SUPABASE_KEY}';

    let products = [];
    let promos = [];
    let globalDiscount = '10';
    let filteredProducts = [];

    function formatNumber(num) {
      if (!num) return '0';
      return parseInt(num).toLocaleString('id-ID');
    }

    function highlightText(text, terms) {
      if (!text) return '';
      if (!terms || terms.length === 0 || terms[0] === '') return text;
      let highlighted = String(text);
      for (const term of terms) {
        if (!term) continue;
        const escaped = term.replace(/[\\-\\[\\]\\/\\{\\}\\(\\)\\*\\+\\?\\.\\\\\\^\\$\\|]/g, '\\\\$&');
        const regex = new RegExp('(' + escaped + ')', 'gi');
        highlighted = highlighted.replace(regex, '<mark>$1</mark>');
      }
      return highlighted;
    }

    // Function to calculate exact promo array for a product
    function calculatePromos(p) {
      let customPromos = [];
      const hpBrand = p.brand_hp || p.brand || '';
      for (const promo of promos) {
        if (promo.selected_products && promo.selected_products.includes(p.id)) {
          customPromos.push(promo);
          continue;
        }
        if (promo.type === 'brand' && hpBrand.toLowerCase().includes((promo.value || '').toLowerCase())) {
          customPromos.push(promo);
          continue;
        }
        if (promo.type === 'model' && (p.model_hp || '').toLowerCase().includes((promo.value || '').toLowerCase())) {
          customPromos.push(promo);
          continue;
        }
        if (promo.type === 'product' && promo.value === p.id) {
          customPromos.push(promo);
          continue;
        }
      }
      return customPromos;
    }

    function parseDiscountsText(p, customPromos) {
      if (customPromos.length > 0) {
        return customPromos.map(pr => pr.discountPercentage + '% diskon ' + pr.discountPercentage + '%').join(' ');
      }
      const disc = p.custom_discount || globalDiscount;
      const parts = disc.split(/[,+]/).map(d => d.trim()).filter(Boolean);
      return parts.map(d => {
        const v = d.split(':').pop();
        return v + '% diskon ' + v + '%';
      }).join(' ');
    }

    async function loadData() {
      try {
        const [prodRes, contentRes] = await Promise.all([
          fetch(SUPABASE_URL + '/rest/v1/lcd_catalog_products?select=*', {
             headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
          }),
          fetch(SUPABASE_URL + '/rest/v1/lcd_catalog_content?select=*', {
             headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
          })
        ]);
        
        const prodData = await prodRes.json();
        const contentData = await contentRes.json();
        
        products = Array.isArray(prodData) ? prodData : [];
        const content = Array.isArray(contentData) ? contentData : [];
        
        const discConf = content.find(c => c.section_key === 'discount_setting');
        if (discConf) globalDiscount = discConf.content;
        
        const promoConf = content.find(c => c.section_key === 'promo_setting');
        if (promoConf && promoConf.content) promos = JSON.parse(promoConf.content);

        products.sort((a,b) => {
          const brandA = (a.brand_hp || a.brand || '').toLowerCase();
          const brandB = (b.brand_hp || b.brand || '').toLowerCase();
          if (brandA !== brandB) return brandA.localeCompare(brandB);
          return (a.model_hp || '').localeCompare(b.model_hp || '');
        });

        document.getElementById('loadingOverlay').classList.add('opacity-0');
        setTimeout(() => document.getElementById('loadingOverlay').style.display = 'none', 300);
        
        filteredProducts = products;
        renderList();
      } catch (err) {
        let msg = err.message;
        document.getElementById('loadingMsg').textContent = 'Gagal memuat: ' + msg;
        document.getElementById('loadingMsg').classList.add('text-rose-500');
        const loader = document.querySelector('.loader');
        if (loader) loader.style.display = 'none';
        console.error(err);
        
        setTimeout(() => {
           document.getElementById('loadingOverlay').classList.add('opacity-0');
           setTimeout(() => document.getElementById('loadingOverlay').style.display = 'none', 300);
        }, 3000);
      }
    }

    let currentPage = 1;
    const itemsPerPage = 50;

    function renderPagination(totalItems) {
      const controls = document.getElementById('paginationControls');
      const totalPages = Math.ceil(totalItems / itemsPerPage);
      
      if (totalPages <= 1) {
        controls.innerHTML = '';
        return;
      }
      
      let html = '';
      
      // Prev Button
      if (currentPage > 1) {
        html += '<button onclick="changePage(' + (currentPage - 1) + ')" class="px-3 py-1.5 text-sm font-bold bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Prev</button>';
      } else {
        html += '<button disabled class="px-3 py-1.5 text-sm font-bold bg-slate-50 border border-slate-200 text-slate-400 rounded-lg cursor-not-allowed">Prev</button>';
      }
      
      // Info
      html += '<span class="text-sm font-black text-slate-600 px-3 py-1.5 bg-white border border-slate-200 rounded-lg">Hal ' + currentPage + ' / ' + totalPages + '</span>';
      
      // Next Button
      if (currentPage < totalPages) {
        html += '<button onclick="changePage(' + (currentPage + 1) + ')" class="px-3 py-1.5 text-sm font-bold bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Next</button>';
      } else {
        html += '<button disabled class="px-3 py-1.5 text-sm font-bold bg-slate-50 border border-slate-200 text-slate-400 rounded-lg cursor-not-allowed">Next</button>';
      }
      
      controls.innerHTML = html;
    }
    
    window.changePage = function(page) {
      currentPage = page;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      renderList();
    };

    function renderList() {
      const container = document.getElementById('pList');
      const search = document.getElementById('searchInput').value.toLowerCase().trim();
      const terms = search.split(/\s+/);

      let filteredList = [];

      // Filter
      for (let p of products) {
        let match = true;
        if (terms.length > 0 && terms[0] !== '') {
          const customPromos = calculatePromos(p);
          const dText = parseDiscountsText(p, customPromos);
          const searchStr = ((p.goods_code || '') + ' ' + (p.brand_lcd || '') + ' ' + (p.brand_hp || '') + ' ' + (p.brand || '') + ' ' + (p.model_hp || '') + ' ' + (p.type_lcd || '') + ' ' + (p.packing || '') + ' ' + dText).toLowerCase();
          for (const term of terms) {
            if (!searchStr.includes(term)) {
               match = false; break;
            }
          }
        }
        if (match) filteredList.push(p);
      }
      
      renderPagination(filteredList.length);
      document.getElementById('statsText').textContent = 'Daftar Produk LCD (' + filteredList.length + ')';
      
      let html = '';
      
      const startIndex = (currentPage - 1) * itemsPerPage;
      const paginatedList = filteredList.slice(startIndex, startIndex + itemsPerPage);

      for (let p of paginatedList) {
        const customPromos = calculatePromos(p);
        const title = ((p.brand_hp || p.brand || '') + ' ' + (p.model_hp || '')).trim();
        const pBrandLcd = p.brand_lcd || 'Vivan';
        const isVivan = pBrandLcd.toLowerCase() === 'vivan';
        
        const packingStr = String(p.packing || '1');
        const pcsMatch = packingStr.match(/(\d+)\s*pcs/i) || packingStr.match(/(\d+)/);
        const pcsPerKotak = pcsMatch ? parseInt(pcsMatch[1], 10) : 1;
        
        const hargaKotak = p.price || 0;
        const baseHargaPcs = hargaKotak / Math.max(1, pcsPerKotak);

        let stockText = p.stock_info;
        if (stockText === undefined || stockText === null || stockText === '') {
           stockText = p.stock_status === 'Kosong' ? '0' : (p.stock_status || 'Ready');
        }
        let stockClass = 'bg-emerald-100 text-emerald-700';
        if (p.stock_status === 'Kosong' || p.stock === '0' || Number(p.stock) === 0) stockClass = 'bg-rose-100 text-rose-700';
        else if (p.stock_status === 'Indent') stockClass = 'bg-amber-100 text-amber-700';

        const customDiscStr = p.custom_discount || globalDiscount;
        const discLevels = customDiscStr.split(/[,+]/).map(d => d.trim()).filter(Boolean);
        
        let isNoMinOrder = false;

        let discountRowsHtml = discLevels.map((dStr, index) => {
          let minQty = 1;
          let d = 0;
          if (dStr.includes(':')) {
            const parts = dStr.split(':');
            minQty = parseInt(parts[0], 10);
            d = parseFloat(parts[1]);
          } else {
             d = parseFloat(dStr);
             minQty = index === 0 ? 10 : index === 1 ? 50 : index === 2 ? 100 : 200;
          }
          if (isNaN(d) || d <= 0) return '';
          return '<div class="bg-white flex items-stretch">' +
            '<div class="w-1/2 p-2.5 flex flex-col justify-center border-r border-slate-200">' +
              '<span class="text-xs font-bold text-slate-700">' + (minQty <= 1 ? 'Tanpa min. order' : 'Beli Min. ' + minQty + ' Pcs') + '</span>' +
              '<span class="text-xs text-emerald-600 font-bold mt-0.5">Diskon ' + d + '%</span>' +
            '</div>' +
            '<div class="w-1/2 p-2.5 flex flex-col justify-center text-right text-xs">' +
              '<div class="font-black text-slate-800">' + formatNumber(hargaKotak * (1 - (d/100))) + '/kotak</div>' +
              '<div class="font-black text-emerald-600 mt-0.5">' + formatNumber(baseHargaPcs * (1 - (d/100))) + '/pcs</div>' +
            '</div>' +
          '</div>';
        }).join('');

        const customPromosHtml = customPromos.map(pr => {
          const d = pr.discountPercentage || 0;
          return '<div class="bg-amber-100 flex items-stretch">' +
            '<div class="w-1/2 p-2.5 flex flex-col justify-center border-r border-amber-200">' +
              '<span class="text-xs font-bold text-amber-900">Promo: ' + (pr.name || 'Spesial') + '</span>' +
              '<span class="text-xs text-amber-700 font-bold mt-0.5">Diskon ' + d + '%</span>' +
            '</div>' +
            '<div class="w-1/2 p-2.5 flex flex-col justify-center text-right text-xs">' +
              '<div class="font-black text-amber-900">' + formatNumber(hargaKotak * (1 - (d/100))) + '/kotak</div>' +
              '<div class="font-black text-amber-700 mt-0.5">' + formatNumber(baseHargaPcs * (1 - (d/100))) + '/pcs</div>' +
            '</div>' +
          '</div>';
        }).join('');

        let qtyOptionsHtml = '';
        if (customPromos.length > 0) {
           customPromos.forEach(cp => {
               qtyOptionsHtml += '<div class="text-[10px] bg-amber-500 text-white px-2 py-0.5 rounded-md font-bold">' + cp.name + '</div>';
           });
           const isCampur = customPromos.some(cp => cp.type === 'brand');
           if (isCampur) qtyOptionsHtml += '<div class="text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded-md font-bold flex items-center justify-center">Bisa Campur</div>';
           qtyOptionsHtml += '<div class="text-[10px] bg-purple-500 text-white px-2 py-0.5 rounded-md font-bold flex items-center justify-center">1 Ktk = ' + packingStr + '</div>';
           let isNoMinOrder = false;
           customPromos.forEach(cp => {
               if ((cp.name || '').toLowerCase().includes('tanpa minimal order')) isNoMinOrder = true;
           });
        }

        html += '<div class="bg-white border border-slate-200 rounded-xl shadow-sm p-4 sm:p-5 hover:shadow-md transition-shadow">';
        
        // Header
        html += '<div class="font-black text-slate-800 text-base sm:text-lg leading-tight uppercase mb-3 break-words text-center">';
        html += highlightText(title, terms);
        html += '</div>';

        // Attributes
        html += '<div class="flex flex-col gap-1 text-sm font-medium text-slate-600 mb-4">';
        html += '<div class="flex items-center gap-2"><span class="text-slate-400 w-20">Kode</span><span class="text-slate-400">:</span><span class="font-mono font-bold text-slate-800 text-[13px]">' + highlightText(p.goods_code || '-', terms) + '</span></div>';
        html += '<div class="flex items-center gap-2"><span class="text-slate-400 w-20">Brand</span><span class="text-slate-400">:</span><span class="font-black uppercase ' + (isVivan ? 'text-indigo-600' : 'text-emerald-600') + '">' + highlightText(pBrandLcd, terms) + '</span></div>';
        html += '<div class="flex items-center gap-2"><span class="text-slate-400 w-20">Packing</span><span class="text-slate-400">:</span><span class="font-bold">' + highlightText(packingStr, terms) + '</span></div>';
        html += '<div class="flex items-center gap-2"><span class="text-slate-400 w-20">Stok</span><span class="text-slate-400">:</span><span class="text-[10px] px-2 py-0.5 rounded-full font-black uppercase whitespace-nowrap ' + stockClass + '">' + stockText + '</span></div>';
        html += '<div class="flex items-start gap-2"><span class="text-slate-400 w-20 pt-0.5">Hrg Normal</span><span class="text-slate-400 pt-0.5">:</span><div class="flex flex-col gap-0.5"><div class="flex items-center"><span class="font-bold line-through text-slate-400 mr-1">' + formatNumber(Math.round(hargaKotak)) + '</span><span class="text-slate-500 text-xs">/kotak</span></div><div class="flex items-center"><span class="font-bold line-through text-slate-400 mr-1">' + formatNumber(Math.round(baseHargaPcs)) + '</span><span class="text-slate-500 text-xs">/pcs</span></div></div></div>';
        html += '</div>';

        // Prices Table
        html += '<div class="flex flex-col border border-slate-200 rounded-lg overflow-hidden bg-slate-200 gap-px mt-2">';
        html += '<div class="bg-slate-100/90 py-2 px-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Harga Tangga</div>';
        html += '<div class="flex flex-col gap-px bg-slate-200">' + customPromosHtml + discountRowsHtml + '</div>';
        html += '</div>';

        // Footer Info
        html += '<div class="flex flex-col gap-0.5 mt-2">';
        if (!isNoMinOrder) {
           html += '<div class="text-[10px] text-slate-500 italic text-center sm:text-left">* Pembelian bisa campur dengan tipe lain</div>';
        }
        if (pcsPerKotak > 1) {
           html += '<div class="text-[10px] text-slate-500 italic text-center sm:text-left">* Dijual per kotak, tidak dijual per pcs</div>';
        }
        
        html += '</div>'; // end Footer
        
        html += '</div>'; // end Card
      }
      
      container.innerHTML = html;
      
      if (filteredList.length === 0) {
         document.getElementById('noResults').classList.remove('hidden');
      } else {
         document.getElementById('noResults').classList.add('hidden');
      }
    }

    document.getElementById('searchInput').addEventListener('input', () => {
      currentPage = 1;
      renderList();
    });

    const exportModal = document.getElementById('exportModal');
    document.getElementById('btnDownloadPricelist').addEventListener('click', () => {
      exportModal.classList.remove('hidden');
      exportModal.classList.add('flex');
    });
    document.getElementById('closeExportModal').addEventListener('click', () => {
      exportModal.classList.add('hidden');
      exportModal.classList.remove('flex');
    });

    function buildExportTableHtml(exportList) {
      const discountVal = parseFloat(document.getElementById('exportDiscount').value) || 0;
      let html = '<table class="export-table">';
      html += '<thead><tr><th>No</th><th class="text-left">Tipe</th><th>Packing</th><th>Hrg Ktk</th><th>Hrg Pcs</th></tr></thead><tbody>';
      
      let count = 1;
      for (const p of exportList) {
        let discText = '';
        let disc = 0;
        const customPromos = calculatePromos(p);
        if (customPromos.length > 0) {
          disc = customPromos[0].discountPercentage || 0;
          discText = disc + '%';
        } else {
          const customDiscStr = p.custom_discount || globalDiscount;
          const discLevels = customDiscStr.split(/[,+]/).map(d => d.trim()).filter(Boolean);
          if (discLevels.length > 0) {
             const lastD = discLevels[discLevels.length - 1];
             if (lastD.includes(':')) {
                disc = parseFloat(lastD.split(':')[1]);
             } else {
                disc = parseFloat(lastD);
             }
             if (!isNaN(disc)) discText = disc + '%';
          }
        }
        
        if (discountVal > 0) disc = discountVal;
        
        const hpBrand = (p.brand_hp || p.brand || '').trim();
        const hpModel = (p.model_hp || '').trim();
        const namaLcd = (hpBrand + ' ' + hpModel).trim();
        
        const packingStr = String(p.packing || '1');
        const pcsMatch = packingStr.match(/(\\d+)\\s*pcs/i) || packingStr.match(/(\\d+)/);
        const pcsPerKotak = pcsMatch ? parseInt(pcsMatch[1], 10) : 1;
        
        let hargaKotak = p.price || 0;
        if (disc > 0) {
          hargaKotak = hargaKotak * (1 - (disc / 100));
        }
        const baseHargaPcs = hargaKotak / Math.max(1, pcsPerKotak);
        
        html += '<tr>';
        html += '<td>' + count + '</td>';
        html += '<td class="text-left">' + namaLcd + '</td>';
        html += '<td>' + packingStr + '</td>';
        html += '<td>' + Math.round(hargaKotak).toLocaleString('id-ID') + '</td>';
        html += '<td>' + Math.round(baseHargaPcs).toLocaleString('id-ID') + '</td>';
        html += '</tr>';
        count++;
      }
      
      html += '</tbody></table>';
      return html;
    }

    function getExportData() {
      const bFilter = document.getElementById('exportBrand').value.toLowerCase();
      let res = products.filter(p => {
        if (bFilter === 'semua') return true;
        const b = (p.brand_lcd || 'Vivan').toLowerCase();
        return b === bFilter;
      });
      res.sort((a, b) => {
        const brandA = (a.brand_hp || a.brand || '').toLowerCase();
        const brandB = (b.brand_hp || b.brand || '').toLowerCase();
        if (brandA < brandB) return -1;
        if (brandA > brandB) return 1;
        
        const modelA = (a.model_hp || '').toLowerCase();
        const modelB = (b.model_hp || '').toLowerCase();
        if (modelA < modelB) return -1;
        if (modelA > modelB) return 1;
        return 0;
      });
      return res;
    }

    document.getElementById('btnExportPrint').addEventListener('click', () => {
      exportModal.classList.add('hidden');
      exportModal.classList.remove('flex');
      
      const filteredExp = getExportData();
      document.getElementById('printArea').innerHTML = '<div style="text-align:center; font-weight:bold; font-size:16px; margin-bottom:10px;">Pricelist LCD</div>' + buildExportTableHtml(filteredExp);
      
      // Make it visible for print
      document.getElementById('printArea').classList.remove('hidden');
      setTimeout(() => {
        window.print();
        document.getElementById('printArea').classList.add('hidden');
      }, 500);
    });

    document.getElementById('btnExportExcel').addEventListener('click', () => {
      const filteredExp = getExportData();
      const tableHtml = buildExportTableHtml(filteredExp);
      
      const blob = new Blob(['\\ufeff' + tableHtml], { type: 'application/vnd.ms-excel' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Pricelist_LCD.xls';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });

    // Run
    loadData();
  </script>
</body>
</html>`;
};
