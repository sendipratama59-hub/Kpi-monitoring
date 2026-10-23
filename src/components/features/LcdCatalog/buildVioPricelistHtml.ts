export const buildVioPricelistHtml = (
  SUPABASE_URL: string,
  SUPABASE_KEY: string
) => {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LIST LCD VIVAN DAN XPAS</title>
  <style>
    body { font-family: sans-serif; margin: 10px; font-size: 12px; padding-bottom: 20px; }
    h2 { text-align: center; font-size: 16px; margin: 10px 0; }
    .search-container { text-align: center; margin-bottom: 15px; padding: 0 10px; }
    #searchInput { padding: 8px 12px; width: 100%; max-width: 400px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px; box-sizing: border-box; }
    .table-container { width: 100%; overflow-x: hidden; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #000; padding: 6px; text-align: center; font-size: 12px; }
    th { background-color: #f2f2f2; font-weight: bold; }
    .text-left { text-align: left; }
    #loading { text-align: center; margin-top: 50px; font-weight: bold; }
    
    .highlight { background-color: #fef08a; padding: 0 2px; border-radius: 2px; font-weight: bold; }
    
    @media (max-width: 600px) {
      body { margin: 2px; }
      th, td { padding: 4px; font-size: 10px; word-break: break-word; }
      h2 { font-size: 14px; margin: 8px 0; }
      #searchInput { font-size: 12px; padding: 6px 8px; }
      table { table-layout: fixed; }
      th:nth-child(1) { width: 70%; }
      th:nth-child(2) { width: 30%; }
    }
  </style>
</head>
<body>
  <h2>LIST LCD VIVAN DAN XPAS</h2>
  
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
        </tr>
      </thead>
      <tbody id="tableBody"></tbody>
    </table>
  </div>

  <script>
    const SUPABASE_URL = '${SUPABASE_URL}';
    const SUPABASE_KEY = '${SUPABASE_KEY}';

    let allProducts = [];
    let currentSearchTerms = [];

    async function fetchData() {
      try {
        let allData = [];
        let page = 0;
        let hasMore = true;
        
        while (hasMore) {
          const res = await fetch(SUPABASE_URL + '/rest/v1/lcd_catalog_products?select=*&limit=1000&offset=' + (page * 1000), {
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': 'Bearer ' + SUPABASE_KEY
            }
          });
          
          if (!res.ok) throw new Error('Network error');
          const data = await res.json();
          allData = allData.concat(data);
          
          if (data.length === 1000) {
            page++;
          } else {
            hasMore = false;
          }
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

    function renderTable(products) {
      const tbody = document.getElementById('tableBody');
      let html = '';
      
      products.forEach(p => {
        const hpBrand = (p.brand_hp || p.brand || '').trim();
        const hpModel = (p.model_hp || '').trim();
        const namaLcd = ((p.brand_lcd || 'Vivan').toUpperCase() + ' ' + hpBrand + ' ' + hpModel).trim();
        
        const packingStr = String(p.packing || '1');
        
        let packDisplay = packingStr.toUpperCase();
        if (!packDisplay.includes('KOTAK')) {
           packDisplay += ' / KOTAK';
        }

        const displayNamaLcd = highlightText(namaLcd, currentSearchTerms);
        const displayPack = highlightText(packDisplay, currentSearchTerms);

        html += '<tr>';
        html += '<td class="text-left">' + displayNamaLcd + '</td>';
        html += '<td>' + displayPack + '</td>';
        html += '</tr>';
      });
      
      if (products.length === 0) {
         html = '<tr><td colspan="2" style="text-align: center; padding: 20px;">Tidak ada produk yang sesuai.</td></tr>';
      }
      
      tbody.innerHTML = html;
      document.getElementById('loading').style.display = 'none';
      document.getElementById('dataTable').style.display = 'table';
    }
    
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
