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
    <input type="text" id="searchInput" placeholder="Cari tipe, brand, atau packing..." />
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
      if (terms.length === 0 || (terms.length === 1 && terms[0] === '')) return text;
      // Filter empty terms and escape regex special chars
      const validTerms = terms.filter(t => t).map(t => t.replace(/[-\\/\\\\^$*+?.()|[\\]{}]/g, '\\\\$&'));
      if (validTerms.length === 0) return text;
      const regex = new RegExp('(' + validTerms.join('|') + ')', 'gi');
      return text.replace(regex, '<mark class="highlight">$1</mark>');
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
      currentSearchTerms = term.split(/\\s+/);
      
      const filtered = allProducts.filter(p => {
        const hpBrand = (p.brand_hp || p.brand || '').toLowerCase();
        const hpModel = (p.model_hp || '').toLowerCase();
        const brandLcd = (p.brand_lcd || 'Vivan').toLowerCase();
        const packingStr = String(p.packing || '1').toLowerCase();
        
        const searchStr = brandLcd + ' ' + hpBrand + ' ' + hpModel + ' ' + packingStr;
        
        return currentSearchTerms.every(t => searchStr.includes(t));
      });
      
      renderTable(filtered);
    });

    fetchData();
  </script>
</body>
</html>`;
};
