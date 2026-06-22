
    const SUPABASE_URL = 'XXX';
    const SUPABASE_KEY = 'YYY';

    let products = [];
    let promos = [];
    let globalDiscount = '10';
    let filteredProducts = [];

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
        let msg = err.message;
        document.getElementById('loadingMsg').textContent = 'Gagal memuat: ' + msg;
        document.getElementById('loadingMsg').classList.add('text-rose-500');
        const loader = document.querySelector('.loader');
        if (loader) loader.style.display = 'none';
        console.error(err);
      }
    }

    function renderList() {
      const container = document.getElementById('pList');
      const search = document.getElementById('searchInput').value.toLowerCase().trim();
      const terms = search.split(/s+/);

      let html = '';
      let renderedCount = 0;

      for (let p of products) {
        const customPromos = calculatePromos(p);
        const dText = parseDiscountsText(p, customPromos);
        const searchStr = ((p.goods_code || '') + ' ' + (p.brand_lcd || '') + ' ' + (p.brand_hp || '') + ' ' + (p.brand || '') + ' ' + (p.model_hp || '') + ' ' + (p.type_lcd || '') + ' ' + (p.packing || '') + ' ' + dText).toLowerCase();

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
        
        const title = ((p.brand_hp || p.brand || '') + ' ' + (p.model_hp || '')).trim();
        const pBrandLcd = p.brand_lcd || 'Vivan';
        const isVivan = pBrandLcd.toLowerCase() === 'vivan';
        
        const packingStr = String(p.packing || '1');
        const pcsMatch = packingStr.match(/(d+)/);
        const pcsPerKotak = pcsMatch ? parseInt(pcsMatch[1], 10) : 1;
        const hargaKotak = p.price || 0;
        const baseHargaPcs = hargaKotak / Math.max(1, pcsPerKotak);

        let stockText = p.stock;
        if (stockText === undefined || stockText === null || stockText === '') {
           stockText = p.stock_status === 'Kosong' ? '0' : (p.stock_status || 'Ready');
        }
        let stockClass = 'bg-emerald-100 text-emerald-700';
        if (p.stock_status === 'Kosong' || p.stock === '0' || Number(p.stock) === 0) stockClass = 'bg-rose-100 text-rose-700';
        else if (p.stock_status === 'Indent') stockClass = 'bg-amber-100 text-amber-700';

        // Calculate discount rows
        const discountStrToUse = p.custom_discount || globalDiscount;
        const discountParts = discountStrToUse.split(/[,+]/).map(d => d.trim()).filter(Boolean);
        const discountRowsHtml = discountParts.map((token, index) => {
          const parts = token.split(':');
          let minQty, d;
          if (parts.length === 2) {
             minQty = parseInt(parts[0], 10);
             d = parseFloat(parts[1]);
          } else {
             d = parseFloat(parts[0]);
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

        let isNoMinOrder = false;
        for (const cp of customPromos) {
           if ((cp.name || '').toLowerCase().includes('tanpa minimal order')) isNoMinOrder = true;
        }

        html += '<div class="bg-white border border-slate-200 rounded-xl shadow-sm p-4 sm:p-5 hover:shadow-md transition-shadow">';
        
        // Title
        html += '<div class="font-black text-slate-800 text-base sm:text-lg leading-tight uppercase mb-3 break-words text-center">';
        html += title;
        html += '</div>';

        // Attributes
        html += '<div class="flex flex-col gap-1 text-sm font-medium text-slate-600 mb-4">';
        html += '<div class="flex items-center gap-2"><span class="text-slate-400 w-20">Kode</span><span class="text-slate-400">:</span><span class="font-mono font-bold text-slate-800 text-[13px]">' + (p.goods_code || '-') + '</span> <i class="fa-regular fa-copy text-slate-300 ml-1 cursor-pointer" onclick="navigator.clipboard.writeText(&quot;' + (p.goods_code || '') + '&quot;)"></i></div>';
        html += '<div class="flex items-center gap-2"><span class="text-slate-400 w-20">Brand</span><span class="text-slate-400">:</span><span class="font-black uppercase ' + (isVivan ? 'text-indigo-600' : 'text-emerald-600') + '">' + pBrandLcd + '</span></div>';
        html += '<div class="flex items-center gap-2"><span class="text-slate-400 w-20">Packing</span><span class="text-slate-400">:</span><span class="font-bold">' + packingStr + '</span></div>';
        html += '<div class="flex items-center gap-2"><span class="text-slate-400 w-20">Stok</span><span class="text-slate-400">:</span><span class="text-[10px] px-2 py-0.5 rounded-full font-black uppercase whitespace-nowrap ' + stockClass + '">' + stockText + '</span></div>';
        html += '<div class="flex items-start gap-2"><span class="text-slate-400 w-20 pt-0.5">Hrg Normal</span><span class="text-slate-400 pt-0.5">:</span><div class="flex flex-col gap-0.5"><div class="flex items-center"><span class="font-bold line-through text-slate-400 mr-1">' + formatNumber(Math.round(hargaKotak)) + '</span><span class="text-slate-500 text-xs">/kotak</span></div><div class="flex items-center"><span class="font-bold line-through text-slate-400 mr-1">' + formatNumber(Math.round(baseHargaPcs)) + '</span><span class="text-slate-500 text-xs">/pcs</span></div></div></div>';
        html += '</div>';

        // Harga Tangga
        html += '<div class="flex flex-col border border-slate-200 rounded-lg overflow-hidden bg-slate-200 gap-px mt-2">';
        html += '<div class="bg-slate-100/90 py-2 px-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Harga Tangga</div>';
        html += '<div class="flex flex-col gap-px bg-slate-200">' + customPromosHtml + discountRowsHtml + '</div>';
        html += '</div>';

        // Footer Card
        html += '<div class="flex flex-col gap-0.5 mt-2">';
        if (!isNoMinOrder) {
           html += '<div class="text-[10px] text-slate-500 italic text-center sm:text-left">* Pembelian bisa campur dengan tipe lain</div>';
        }
        if (pcsPerKotak === 3 || pcsPerKotak === 10) {
           html += '<div class="text-[10px] text-slate-500 italic text-center sm:text-left">* Dijual per kotak, tidak dijual per pcs</div>';
        }

        html += '</div>'; // end Footer

        html += '</div>'; // end Card
      }
      
      container.innerHTML = html;
      document.getElementById('statsText').textContent = 'Daftar Produk LCD (' + renderedCount + ')';
      
      if (renderedCount === 0) {
         document.getElementById('noResults').classList.remove('hidden');
      } else {
         document.getElementById('noResults').classList.add('hidden');
      }
    }

    document.getElementById('searchInput').addEventListener('input', () => {
      renderList();
    });

    // Run
    loadData();
  