export const buildSimplePricelistHtml = (
  SUPABASE_URL: string,
  SUPABASE_KEY: string,
  discount: number,
  applyCustomPromo: boolean = true
) => {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pricelist LCD - Diskon ${discount}%</title>
  <style>
    body { font-family: sans-serif; margin: 10px; font-size: 12px; padding-bottom: 70px; }
    h2 { text-align: center; font-size: 16px; margin: 10px 0; }
    .search-container { text-align: center; margin-bottom: 15px; padding: 0 10px; }
    #searchInput { padding: 8px 12px; width: 100%; max-width: 400px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px; box-sizing: border-box; }
    .table-container { width: 100%; overflow-x: hidden; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #000; padding: 4px; text-align: center; font-size: 12px; }
    th { background-color: #f2f2f2; font-weight: bold; }
    .text-left { text-align: left; }
    #loading { text-align: center; margin-top: 50px; font-weight: bold; }
    
    .highlight { background-color: #fef08a; padding: 0 2px; border-radius: 2px; font-weight: bold; }
    
    .bg-emerald-100 { background-color: #d1fae5 !important; }
    .bg-rose-100 { background-color: #ffe4e6 !important; }
    
    .order-input { width: 100%; max-width: 50px; padding: 4px; text-align: center; border: 1px solid #ccc; border-radius: 4px; font-size: 12px; }
    .order-input:disabled { background-color: #f1f5f9; color: #94a3b8; cursor: not-allowed; border-color: #e2e8f0; }
    
    .bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-top: 1px solid #ddd; padding: 10px 15px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 -2px 10px rgba(0,0,0,0.05); z-index: 100; }
    .bottom-info { display: flex; flex-direction: column; gap: 2px; }
    .bottom-info .title { font-size: 11px; color: #666; }
    .bottom-info .val { font-size: 14px; font-weight: bold; color: #000; }
    .order-btn { background: #25D366; color: #fff; border: none; padding: 10px 16px; border-radius: 8px; font-weight: bold; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 6px; text-decoration: none; }
    
    @media (max-width: 600px) {
      body { margin: 2px; padding-bottom: 70px; }
      th, td { padding: 2px; font-size: 8px; word-break: break-word; }
      h2 { font-size: 12px; margin: 5px 0; }
      #searchInput { font-size: 11px; padding: 6px 8px; }
      table { table-layout: fixed; }
      th:nth-child(1) { width: 28%; }
      th:nth-child(2) { width: 18%; }
      th:nth-child(3) { width: 18%; }
      th:nth-child(4) { width: 13%; }
      th:nth-child(5) { width: 9%; }
      th:nth-child(6) { width: 14%; }
      .order-input { font-size: 10px; max-width: 35px; padding: 2px; }
      .bottom-info .val { font-size: 12px; }
      .order-btn { padding: 8px 12px; font-size: 11px; }
    }
  </style>
</head>
<body>
  <h2>PRICELIST LCD - DISKON ${discount}%</h2>
  
  <div class="search-container">
    <input type="text" id="searchInput" placeholder="Cari... (misal: xpas, 10, a5s, a60, a53)" />
  </div>

  <div id="loading">Memuat data...</div>
  <div class="table-container">
    <table id="dataTable" style="display:none;">
      <thead>
        <tr>
          <th class="text-left">NAMA LCD</th>
          <th>PACKING</th>
          <th>HARGA / KOTAK</th>
          <th>HARGA / PCS</th>
          <th>STOK</th>
          <th>PESAN</th>
        </tr>
      </thead>
      <tbody id="tableBody"></tbody>
    </table>
  </div>
  
  <div class="bottom-bar">
    <div class="bottom-info">
      <span class="title">Total Pesanan:</span>
      <span class="val"><span id="totalPrice">Rp 0</span> (<span id="totalItems">0</span> Kotak)</span>
    </div>
    <button class="order-btn" onclick="sendOrder()">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
      Kirim WA
    </button>
  </div>

  <script>
    const SUPABASE_URL = '${SUPABASE_URL}';
    const SUPABASE_KEY = '${SUPABASE_KEY}';
    const DISCOUNT = ${discount};
    const APPLY_CUSTOM_PROMO = ${applyCustomPromo};

    let allProducts = [];
    let cart = {};
    let promos = [];
    let currentSearchTerms = [];

    function highlightText(text, terms) {
      if (!text) return '';
      if (!terms || terms.length === 0) return text;
      const validTerms = terms
        .map(function(t) { return String(t || '').trim(); })
        .filter(function(t) { return t.length > 0; })
        .sort(function(a, b) { return b.length - a.length; });
      if (validTerms.length === 0) return text;
      const specChars = ['.', '*', '+', '?', '^', '$', '{', '}', '(', ')', '|', '[', ']', '/', '\\\\', '-'];
      const escapedTerms = validTerms.map(function(s) {
        return s.split('').map(function(c) {
          return specChars.indexOf(c) !== -1 ? '\\\\' + c : c;
        }).join('');
      });
      try {
        const regex = new RegExp('(' + escapedTerms.join('|') + ')', 'gi');
        return text.replace(regex, '<mark class="highlight">$1</mark>');
      } catch (err) {
        return text;
      }
    }

    function parseSearchQuery(query) {
      const raw = (query || '').trim().toLowerCase();
      if (!raw) {
        return { isMulti: false, terms: [], globalFilters: {}, modelQueries: [] };
      }

      const hasDelimiter = raw.indexOf(',') !== -1 || raw.indexOf(';') !== -1 || raw.indexOf(String.fromCharCode(10)) !== -1;
      if (!hasDelimiter) {
        const words = raw.split(/\s+/).filter(Boolean);
        return {
          isMulti: false,
          terms: words,
          globalFilters: {},
          modelQueries: []
        };
      }

      const cleanRaw = raw.split(String.fromCharCode(10)).join(',').split(';').join(',');
      const rawSegments = cleanRaw.split(',').map(function(s) { return s.trim(); }).filter(Boolean);
      const LCD_BRANDS = ['xpas', 'vivan', 'meetoo', 'og', 'lf', 'hx', 'brader', 'crown', 'incell', 'oled', 'shine', 'super', 'diamond'];
      const HP_BRANDS = ['oppo', 'vivo', 'samsung', 'xiaomi', 'redmi', 'realme', 'iphone', 'infinix', 'tecno', 'itel', 'huawei', 'asus', 'nokia', 'lenovo', 'sony', 'poco'];

      let globalBrandLcd = null;
      let globalPacking = null;
      let globalBrandHp = null;
      const modelQueries = [];
      const highlightTerms = [];

      rawSegments.forEach(function(seg) {
        const isPureDigits = /^[0-9]+$/.test(seg);
        const packMatch = seg.match(/^([0-9]+)\s*(pcs|pc|kotak|pack)?$/i) || seg.match(/^(isi|pack|kotak)\s*([0-9]+)/i);
        if (isPureDigits || packMatch) {
          const num = isPureDigits ? seg : (packMatch[1] && /^[0-9]+$/.test(packMatch[1]) ? packMatch[1] : (packMatch[2] && /^[0-9]+$/.test(packMatch[2]) ? packMatch[2] : seg.replace(/[^0-9]/g, '')));
          if (num) {
            globalPacking = num;
            highlightTerms.push(seg);
            highlightTerms.push(num);
            highlightTerms.push(num + ' pcs');
            highlightTerms.push(num + ' pcs / kotak');
            return;
          }
        }

        if (LCD_BRANDS.indexOf(seg) !== -1) {
          globalBrandLcd = seg;
          highlightTerms.push(seg);
          return;
        }

        if (HP_BRANDS.indexOf(seg) !== -1) {
          globalBrandHp = seg;
          highlightTerms.push(seg);
          return;
        }

        const subWords = seg.split(/\s+/).filter(Boolean);
        const hasLcdBrand = subWords.some(function(w) { return LCD_BRANDS.indexOf(w) !== -1; });
        const hasPackNum = subWords.some(function(w) { return /^[0-9]+$/.test(w); });
        if (subWords.length === 2 && hasLcdBrand && hasPackNum) {
          subWords.forEach(function(w) {
            if (LCD_BRANDS.indexOf(w) !== -1) {
              globalBrandLcd = w;
              highlightTerms.push(w);
            }
            if (/^[0-9]+$/.test(w)) {
              globalPacking = w;
              highlightTerms.push(w);
            }
          });
          return;
        }

        modelQueries.push(seg);
        highlightTerms.push(seg);
        subWords.forEach(function(w) { highlightTerms.push(w); });
      });

      return {
        isMulti: true,
        terms: Array.from(new Set(highlightTerms)),
        globalFilters: {
          brandLcd: globalBrandLcd,
          packing: globalPacking,
          brandHp: globalBrandHp
        },
        modelQueries: modelQueries
      };
    }

    function calculatePromos(p) {
      let customPromos = [];
      const hpBrand = String(p.brand_hp || p.brand || '').toLowerCase();
      for (const promo of promos) {
        const active = promo.activeFor || [10, 12, 15, 18];
        if (!active.includes(DISCOUNT)) {
          continue;
        }

        if (promo.selected_products && Array.isArray(promo.selected_products) && promo.selected_products.includes(p.id)) {
          customPromos.push(promo);
          continue;
        }
        if (promo.type === 'brand' && hpBrand.includes(String(promo.value || '').toLowerCase())) {
          customPromos.push(promo);
          continue;
        }
        if (promo.type === 'model' && String(p.model_hp || '').toLowerCase().includes(String(promo.value || '').toLowerCase())) {
          customPromos.push(promo);
          continue;
        }
      }
      return customPromos;
    }

    async function fetchData() {
      try {
        let allData = [];
        let from = 0;
        let limit = 1000;
        let hasMore = true;
        
        while (hasMore) {
          const url = SUPABASE_URL + '/rest/v1/lcd_catalog_products?select=*&limit=' + limit + '&offset=' + from;
          const res = await fetch(url, {
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': 'Bearer ' + SUPABASE_KEY,
              'Prefer': 'count=exact'
            }
          });
          
          if (!res.ok) throw new Error('Failed to fetch data');
          
          const data = await res.json();
          if (data && data.length > 0) {
             allData = allData.concat(data);
             from += limit;
             if (data.length < limit) hasMore = false;
          } else {
             hasMore = false;
          }
        }
        
        try {
           const contentRes = await fetch(SUPABASE_URL + '/rest/v1/lcd_catalog_content?select=*', {
               headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
           });
           if (contentRes.ok) {
               const contentData = await contentRes.json();
               const content = Array.isArray(contentData) ? contentData : [];
               const promoConf = content.find(c => c.section_key === 'promo_setting');
               if (promoConf && promoConf.content) promos = JSON.parse(promoConf.content);
           }
        } catch (e) {
           console.error('Failed to load promos', e);
        }

        let data = allData;
        
        // Custom Sort logic
        data.sort((a, b) => {
          const getPcs = (p) => {
             const packingStr = String(p.packing || '1');
             const match = packingStr.match(/(\\d+)\\s*pcs/i) || packingStr.match(/(\\d+)/);
             return match ? parseInt(match[1], 10) : 1;
          };
          
          const pcsA = getPcs(a);
          const pcsB = getPcs(b);
          
          if (pcsA !== pcsB) {
             return pcsA - pcsB; // 3pcs then 10pcs
          }
          
          const brandLcdA = (a.brand_lcd || 'Vivan').toLowerCase();
          const brandLcdB = (b.brand_lcd || 'Vivan').toLowerCase();
          
          if (brandLcdA === 'xpas' && brandLcdB !== 'xpas') return -1;
          if (brandLcdA !== 'xpas' && brandLcdB === 'xpas') return 1;
          if (brandLcdA < brandLcdB) return -1;
          if (brandLcdA > brandLcdB) return 1;

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

        allProducts = data;
        renderTable(allProducts);
      } catch (err) {
        console.error(err);
        document.getElementById('loading').innerText = 'Gagal memuat data.';
      }
    }

    function renderTable(products) {
      const tbody = document.getElementById('tableBody');
      let html = '';
      
      products.forEach(p => {
        const hpBrand = (p.brand_hp || p.brand || '').trim();
        const hpModel = (p.model_hp || '').trim();
        const namaLcd = ((p.brand_lcd || 'Vivan').toUpperCase() + ' ' + hpBrand + ' ' + hpModel).trim();
        
        const packingStr = String(p.packing || '1');
        const pcsMatch = packingStr.match(/(\\d+)\\s*pcs/i) || packingStr.match(/(\\d+)/);
        const pcsPerKotak = pcsMatch ? parseInt(pcsMatch[1], 10) : 1;
        
        let packDisplay = packingStr.toUpperCase();
        if (!packDisplay.includes('KOTAK')) {
           packDisplay += ' / KOTAK';
        }

        let hargaKotak = p.price || 0;
        let baseHargaPcs = hargaKotak / Math.max(1, pcsPerKotak);
        
        let appliedDiscount = DISCOUNT;
        
        if (APPLY_CUSTOM_PROMO) {
          const customPrm = calculatePromos(p);
          if (customPrm.length > 0) {
            appliedDiscount = customPrm[0].discountPercentage || 0;
          } else if (p.custom_discount && !isNaN(parseFloat(p.custom_discount))) {
            appliedDiscount = parseFloat(p.custom_discount);
          }
        }
          
        if (appliedDiscount > 0) {
          hargaKotak = hargaKotak * (1 - (appliedDiscount / 100));
          baseHargaPcs = baseHargaPcs * (1 - (appliedDiscount / 100));
        }
        
        let stockText = p.stock_info;
        if (stockText === undefined || stockText === null || stockText === '') {
           stockText = p.stock_status === 'Kosong' ? '0' : (p.stock_status || 'Ready');
        }
        
        let isKosong = false;
        if (p.stock_status === 'Kosong' || p.stock === '0' || Number(p.stock) === 0) {
            stockText = '0';
            isKosong = true;
        }
        
        const currentQty = cart[p.id] || '';
        let rowClass = currentQty > 0 ? 'class="bg-emerald-100"' : '';
        if (isKosong) {
            rowClass = 'class="bg-rose-100"';
        }

        const displayNamaLcd = highlightText(namaLcd.toUpperCase(), currentSearchTerms);
        const displayPack = highlightText(packDisplay, currentSearchTerms);

        html += '<tr ' + rowClass + '>';
        html += '<td class="text-left">' + displayNamaLcd + '</td>';
        html += '<td>' + displayPack + '</td>';
        html += '<td>' + Math.round(hargaKotak).toLocaleString('id-ID') + '</td>';
        html += '<td>' + Math.round(baseHargaPcs).toLocaleString('id-ID') + '</td>';
        html += '<td>' + stockText + '</td>';
        html += '<td><input type="number" min="0" class="order-input" data-id="' + p.id + '" value="' + currentQty + '" placeholder="0" ' + (isKosong ? 'disabled' : '') + ' /></td>';
        html += '</tr>';
      });
      
      if (products.length === 0) {
         html = '<tr><td colspan="6" style="text-align: center; padding: 20px;">Tidak ada produk yang sesuai.</td></tr>';
      }
      
      tbody.innerHTML = html;
      document.getElementById('loading').style.display = 'none';
      document.getElementById('dataTable').style.display = 'table';
    }
    
    function updateBottomBar() {
      let totalItems = 0;
      let totalPrice = 0;
      
      Object.keys(cart).forEach(id => {
         const qty = cart[id];
         const p = allProducts.find(x => String(x.id) === id);
         if (p) {
            let hargaKotak = p.price || 0;
            
            let appliedDiscount = DISCOUNT;
            if (APPLY_CUSTOM_PROMO) {
              const customPrm = calculatePromos(p);
              if (customPrm.length > 0) {
                appliedDiscount = customPrm[0].discountPercentage || 0;
              } else if (p.custom_discount && !isNaN(parseFloat(p.custom_discount))) {
                appliedDiscount = parseFloat(p.custom_discount);
              }
            }
            
            if (appliedDiscount > 0) hargaKotak = hargaKotak * (1 - (appliedDiscount / 100));
            totalItems += qty;
            totalPrice += (qty * hargaKotak);
         }
      });
      
      document.getElementById('totalItems').innerText = totalItems;
      document.getElementById('totalPrice').innerText = 'Rp ' + Math.round(totalPrice).toLocaleString('id-ID');
    }
    
    function sendOrder() {
      if (Object.keys(cart).length === 0) {
         alert('Belum ada produk yang dipesan. Silakan isi jumlah KOTAK pada kolom PESAN.');
         return;
      }
      
      let message = 'Halo Admin, saya ingin memesan LCD:\\n\\n';
      let totalPrice = 0;
      let totalItems = 0;
      
      Object.keys(cart).forEach(id => {
         const qty = cart[id];
         const p = allProducts.find(x => String(x.id) === id);
         if (p) {
            let hargaKotak = p.price || 0;
            
            let appliedDiscount = DISCOUNT;
            if (APPLY_CUSTOM_PROMO) {
              const customPrm = calculatePromos(p);
              if (customPrm.length > 0) {
                appliedDiscount = customPrm[0].discountPercentage || 0;
              } else if (p.custom_discount && !isNaN(parseFloat(p.custom_discount))) {
                appliedDiscount = parseFloat(p.custom_discount);
              }
            }
            
            if (appliedDiscount > 0) hargaKotak = hargaKotak * (1 - (appliedDiscount / 100));
            
            const hpBrand = (p.brand_hp || p.brand || '').trim();
            const hpModel = (p.model_hp || '').trim();
            const namaLcd = ((p.brand_lcd || 'Vivan').toUpperCase() + ' ' + hpBrand + ' ' + hpModel).trim();
            
            const subtotal = qty * hargaKotak;
            message += '- ' + namaLcd + ' (' + qty + ' Kotak) - Rp ' + Math.round(subtotal).toLocaleString('id-ID') + '\\n';
            
            totalPrice += subtotal;
            totalItems += qty;
         }
      });
      
      message += '\\nTotal: Rp ' + Math.round(totalPrice).toLocaleString('id-ID') + ' (' + totalItems + ' Kotak)';
      
      const waUrl = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(message);
      window.open(waUrl, '_blank');
    }

    document.getElementById('tableBody').addEventListener('input', (e) => {
      if (e.target.classList.contains('order-input')) {
         const id = e.target.getAttribute('data-id');
         const val = parseInt(e.target.value, 10);
         const tr = e.target.closest('tr');
         if (val > 0) {
            cart[id] = val;
            if (tr) tr.classList.add('bg-emerald-100');
         } else {
            delete cart[id];
            if (tr) tr.classList.remove('bg-emerald-100');
         }
         updateBottomBar();
      }
    });

    document.getElementById('searchInput').addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase().trim();
      const parsed = parseSearchQuery(term);
      currentSearchTerms = parsed.terms;
      
      if (!parsed.isMulti) {
        if (parsed.terms.length === 0) {
          renderTable(allProducts);
          return;
        }
        const filtered = allProducts.filter(p => {
          const hpBrand = (p.brand_hp || p.brand || '').toLowerCase().trim();
          const hpModel = (p.model_hp || '').toLowerCase().trim();
          const brandLcd = (p.brand_lcd || 'Vivan').toLowerCase().trim();
          const packingStr = String(p.packing || '1').toLowerCase().trim();
          const numMatch = packingStr.match(/[0-9]+/);
          const pcsPerKotak = numMatch ? numMatch[0] : '1';
          
          const searchStr = (brandLcd + ' ' + hpBrand + ' ' + hpModel + ' ' + packingStr + ' ' + pcsPerKotak + 'pcs ' + pcsPerKotak).toLowerCase();
          return parsed.terms.every(t => searchStr.includes(t));
        });
        renderTable(filtered);
        return;
      }

      // Multi criteria mode:
      // Step 1: Filter candidates based on global filters (brandLcd, packing, brandHp)
      const candidates = allProducts.filter(p => {
        const hpBrand = (p.brand_hp || p.brand || '').toLowerCase().trim();
        const brandLcd = (p.brand_lcd || 'Vivan').toLowerCase().trim();
        const packingStr = String(p.packing || '1').toLowerCase().trim();
        const numMatch = packingStr.match(/[0-9]+/);
        const pcsPerKotak = numMatch ? numMatch[0] : '1';

        if (parsed.globalFilters.brandLcd) {
          if (!brandLcd.includes(parsed.globalFilters.brandLcd)) return false;
        }
        if (parsed.globalFilters.brandHp) {
          if (!hpBrand.includes(parsed.globalFilters.brandHp)) return false;
        }
        if (parsed.globalFilters.packing) {
          const targetPack = parsed.globalFilters.packing;
          if (pcsPerKotak !== targetPack && !packingStr.includes(targetPack)) return false;
        }
        return true;
      });

      // If no specific model was typed (e.g. only 'xpas, 10')
      if (parsed.modelQueries.length === 0) {
        renderTable(candidates);
        return;
      }

      // Step 2: Order sequentially based on the typed modelQueries order!
      const orderedResult = [];
      const addedIds = {};

      parsed.modelQueries.forEach(mq => {
        const words = mq.split(/\s+/).filter(Boolean);
        if (words.length === 0) return;

        candidates.forEach(p => {
          if (addedIds[p.id]) return;
          const hpBrand = (p.brand_hp || p.brand || '').toLowerCase().trim();
          const hpModel = (p.model_hp || '').toLowerCase().trim();
          const brandLcd = (p.brand_lcd || 'Vivan').toLowerCase().trim();
          const packingStr = String(p.packing || '1').toLowerCase().trim();
          const searchStr = (brandLcd + ' ' + hpBrand + ' ' + hpModel + ' ' + packingStr).toLowerCase();

          const matches = words.every(w => searchStr.includes(w));
          if (matches) {
            orderedResult.push(p);
            addedIds[p.id] = true;
          }
        });
      });

      renderTable(orderedResult);
    });

    fetchData();
  </script>
</body>
</html>`;
};

