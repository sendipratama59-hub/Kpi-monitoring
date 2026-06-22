export const buildLcdCatalogListHtml = (SUPABASE_URL: string, SUPABASE_KEY: string) => {
  return `
<!DOCTYPE html>
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
  </style>
</head>
<body class="text-slate-800">
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
            <h1 class="text-lg sm:text-xl font-black text-slate-900 tracking-tight">Pricelist LCD</h1>
            <p class="text-xs sm:text-sm font-semibold text-slate-500 mb-2">Mode Tabel List Saja</p>
          </div>
        </div>
        
        <div class="mt-2 flex items-center justify-between gap-3">
          <div class="relative flex-1">
            <i class="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
            <input 
              type="text" 
              id="searchInput"
              placeholder="Cari Tipe HP (Contoh: A54, Y12)" 
              class="pl-9 pr-4 py-2 border rounded-xl bg-white shadow-sm w-full text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
          </div>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="max-w-4xl mx-auto p-4 md:py-6 pb-32">
       <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div class="overflow-x-auto w-full">
            <table class="w-full text-left border-collapse text-sm">
              <thead>
                <tr class="bg-slate-50 border-b border-slate-200">
                  <th class="py-3 px-4 font-bold text-slate-600">Brand</th>
                  <th class="py-3 px-4 font-bold text-slate-600">Model HP</th>
                  <th class="py-3 px-4 font-bold text-slate-600">Type / Kualitas</th>
                  <th class="py-3 px-4 font-bold text-slate-600 text-right">Harga Satuan</th>
                </tr>
              </thead>
              <tbody id="pList" class="divide-y divide-slate-100">
                 <!-- Rows Rendered Here -->
              </tbody>
            </table>
          </div>
          <div id="noResults" class="hidden py-8 text-center text-slate-500">
             <i class="fa-solid fa-box-open text-3xl mb-2 text-slate-300"></i>
             <p class="text-sm font-bold">Produk tidak ditemukan.</p>
          </div>
       </div>
    </div>

    <!-- Cart Floating Action -->
    <div class="fixed bottom-0 left-0 right-0 p-4 z-40 bg-gradient-to-t from-white via-white to-transparent pb-6 pt-10">
      <div class="max-w-4xl mx-auto flex justify-end">
        <button id="cartBtn" class="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/30 font-bold py-3 px-6 rounded-2xl flex items-center gap-2 transition-transform transform active:scale-95">
          <i class="fa-solid fa-shopping-cart"></i>
          <span>Check Total Modal LCD</span>
          <span id="cartBadge" class="bg-indigo-800 text-xs px-2 py-0.5 rounded-full hidden">0</span>
        </button>
      </div>
    </div>
  </div>

  <script>
    const SUPABASE_URL = '${SUPABASE_URL}';
    const SUPABASE_KEY = '${SUPABASE_KEY}';

    let products = [];
    let promos = [];
    let globalDiscount = '0';
    let filteredProducts = [];
    let cartItems = {};

    function formatNumber(num) {
      if (!num) return '0';
      return parseInt(num).toLocaleString('id-ID');
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

    async function loadData() {
      try {
        const [prodRes, contentRes] = await Promise.all([
          fetch(\`\${SUPABASE_URL}/rest/v1/lcd_catalog_products?select=*\`, {
             headers: { 'apikey': SUPABASE_KEY, 'Authorization': \`Bearer \${SUPABASE_KEY}\` }
          }),
          fetch(\`\${SUPABASE_URL}/rest/v1/lcd_catalog_content?select=*\`, {
             headers: { 'apikey': SUPABASE_KEY, 'Authorization': \`Bearer \${SUPABASE_KEY}\` }
          })
        ]);
        
        products = await prodRes.json();
        const content = await contentRes.json();
        
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
        document.getElementById('loadingMsg').textContent = 'Gagal memuat: ' + err.message;
        document.getElementById('loadingMsg').classList.add('text-rose-500');
        console.error(err);
      }
    }

    function parseDiscountsText(p, customPromos) {
      if (customPromos.length > 0) {
        return customPromos.map(pr => \`\${pr.discountPercentage}% diskon \${pr.discountPercentage}%\`).join(' ');
      }
      const disc = p.custom_discount || globalDiscount;
      const parts = disc.split(/[,\\+]/).map(d => d.trim()).filter(Boolean);
      return parts.map(d => {
        const v = d.split(':').pop();
        return \`\${v}% diskon \${v}%\`;
      }).join(' ');
    }

    function renderList() {
      const tbody = document.getElementById('pList');
      const search = document.getElementById('searchInput').value.toLowerCase().trim();
      const terms = search.split(/\\s+/);

      let html = '';
      let renderedCount = 0;

      for (let p of products) {
        const customPromos = calculatePromos(p);
        const dText = parseDiscountsText(p, customPromos);
        const searchStr = \`\${p.brand_hp || ''} \${p.brand || ''} \${p.model_hp || ''} \${p.type_lcd || ''} \${p.packing || ''} \${dText}\`.toLowerCase();

        let match = true;
        if (terms.length > 0 && terms[0] !== '') {
          for (const term of terms) {
            if (!searchStr.includes(term)) {
               match = false; break;
            }
          }
        }
        
        if (!match) continue;
        renderedCount++;
        
        html += \`
          <tr class="hover:bg-indigo-50/50 transition-colors cursor-pointer" onclick="addToCart('\${p.id}')">
            <td class="py-3 px-4">
              <div class="font-bold text-slate-800">\${p.brand_hp || '-'}</div>
              <div class="text-[10px] text-slate-500">\${p.goods_code || '-'}</div>
            </td>
            <td class="py-3 px-4 font-semibold text-slate-700">\${p.model_hp || '-'}</td>
            <td class="py-3 px-4">
              <span class="font-medium text-slate-700">\${p.brand_lcd || 'VIVAN'}</span>
              <span class="text-slate-400 mx-1">•</span>
             <span class="text-xs text-slate-500">\${p.packing || '-'}</span>
              <div class="text-[10px] sm:text-xs font-bold text-rose-500 flex flex-wrap gap-1 mt-0.5">\`;
              
              if (customPromos.length > 0) {
                 for (const pr of customPromos) {
                   html += \`<span class="bg-rose-100 text-rose-600 px-1.5 rounded">\${pr.name}: \${pr.discountPercentage}%</span>\`;
                 }
              } else {
                 const disc = p.custom_discount || globalDiscount;
                 const parts = disc.split(/[,\\+]/).map(d => d.trim()).filter(Boolean);
                 for (const d of parts) {
                   html += \`<span class="bg-green-100 text-green-700 px-1.5 rounded">\${d}</span>\`;
                 }
              }
              
        html += \`
              </div>
            </td>
            <td class="py-3 px-4 text-right">
              <div class="font-black text-indigo-700">Rp \${formatNumber(p.price)}</div>
            </td>
          </tr>
        \`;
      }
      
      tbody.innerHTML = html;
      
      if (renderedCount === 0) {
         document.getElementById('noResults').classList.remove('hidden');
      } else {
         document.getElementById('noResults').classList.add('hidden');
      }
    }

    document.getElementById('searchInput').addEventListener('input', () => {
      renderList();
    });

    window.addToCart = (id) => {
       if (!cartItems[id]) cartItems[id] = 0;
       cartItems[id]++;
       let count = 0;
       for (const key in cartItems) count += cartItems[key];
       const badge = document.getElementById('cartBadge');
       badge.textContent = count;
       badge.classList.remove('hidden');
       
       // Toast effect
       const toast = document.createElement('div');
       toast.className = 'fixed top-4 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-xl border border-slate-700 z-[200] toast';
       toast.innerHTML = '<i class="fa-solid fa-check text-emerald-400 mr-2"></i>Ditambahkan ke Cart';
       document.body.appendChild(toast);
       setTimeout(() => {
          toast.style.opacity = '0';
          setTimeout(() => document.body.removeChild(toast), 300);
       }, 2000);
    };

    document.getElementById('cartBtn').addEventListener('click', () => {
       let totalQty = 0;
       for(const id in cartItems) totalQty += cartItems[id];
       if (totalQty === 0) return alert('Pilih produk terlebih dahulu.');
       alert('Terdapat ' + totalQty + ' item ditambahkan! (Simulasi check modal form belum full)');
    });

    // Run
    loadData();
  </script>
</body>
</html>
  \`;
};
