import { format } from 'date-fns';
import { ReturRecordForPrint, getShortNamaBarang } from './ReturPrintModal';

function escapeHtml(str?: string | number | null): string {
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Print Desain Format Bandung:
 * - A4 Portrait with 3 columns x 8 rows = 24 labels per sheet
 * - Shows field "Keterangan" in the "KERUSAKAN" row
 * - No wrapped text (white-space: nowrap with ellipsis overflow)
 */
export function printBandung(records: ReturRecordForPrint[], copiesPerItem: number) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  // Expand records by copiesPerItem
  const expandedRecords: ReturRecordForPrint[] = [];
  records.forEach(r => {
    for (let i = 0; i < copiesPerItem; i++) {
      expandedRecords.push(r);
    }
  });

  // 24 labels per A4 page (3 columns x 8 rows)
  const CHUNK_SIZE = 24;
  const chunks: ReturRecordForPrint[][] = [];
  for (let i = 0; i < expandedRecords.length; i += CHUNK_SIZE) {
    chunks.push(expandedRecords.slice(i, i + CHUNK_SIZE));
  }

  const pagesHtml = chunks.map(chunk => {
    const cardsHtml = chunk.map(record => {
      const rawStoreName = record.customer_name || '-';
      const rawStoreCode = record.customer_code ? `(${record.customer_code})` : '';
      const fullStoreLength = (rawStoreName + (rawStoreCode ? ' ' + rawStoreCode : '')).trim().length;

      // Harmonized default font size (7.2pt matching TYPE) with natural, comfortable spacing
      let storeStyle = 'font-size: 7.2pt;';
      if (fullStoreLength > 38) {
        storeStyle = 'font-size: 5.8pt;';
      } else if (fullStoreLength > 30) {
        storeStyle = 'font-size: 6.4pt;';
      }

      // Dynamic auto-scale for kerusakan if long
      const rawKerusakan = record.description || '-';
      let damageStyle = 'font-size: 7.2pt;';
      if (rawKerusakan.length > 38) {
        damageStyle = 'font-size: 5.8pt;';
      } else if (rawKerusakan.length > 30) {
        damageStyle = 'font-size: 6.4pt;';
      }

      const storeName = escapeHtml(rawStoreName);
      const storeCode = record.customer_code ? `<span class="id-toko">(${escapeHtml(record.customer_code)})</span>` : '';
      const noSo = escapeHtml(record.no_so || '-');
      const noSd = escapeHtml(record.no_sd || '-');
      const rawGoodsCode = record.goods_code || '-';
      const goodsCode = escapeHtml(rawGoodsCode);
      const kerusakan = escapeHtml(rawKerusakan);

      // Extract short nama_barang without brand (max 10 chars) per user request: [Kode] - [Nama Barang 10 char]
      const shortItemName = getShortNamaBarang(record);
      const typeDisplay = shortItemName && rawGoodsCode !== '-'
        ? `${goodsCode} - ${escapeHtml(shortItemName)}`
        : goodsCode;

      // Dynamic auto-scale for TYPE row
      let typeStyle = 'font-size: 7.2pt;';
      const typeLength = (rawGoodsCode + (shortItemName ? ' - ' + shortItemName : '')).length;
      if (typeLength > 24) {
        typeStyle = 'font-size: 6.2pt;';
      } else if (typeLength > 19) {
        typeStyle = 'font-size: 6.7pt;';
      }

      return `
        <div class="bandung-card">
          <div class="bandung-box">
            <div class="th-header">BANDUNG</div>
            <div class="bandung-row">
              <div class="td-label">NAMA TOKO</div>
              <div class="td-value font-store" style="${storeStyle}" title="${storeName} ${rawStoreCode}">
                <span class="store-text">${storeName}</span> ${storeCode}
              </div>
            </div>
            <div class="bandung-row">
              <div class="td-label">NO SO</div>
              <div class="td-value font-code-sm" title="${noSo}">${noSo}</div>
            </div>
            <div class="bandung-row">
              <div class="td-label">NO SD (LCD/BT)</div>
              <div class="td-value font-code-sm" title="${noSd}">${noSd}</div>
            </div>
            <div class="bandung-row">
              <div class="td-label">TYPE</div>
              <div class="td-value font-code" style="${typeStyle}" title="${escapeHtml(record.goods_code || '')} - ${escapeHtml(record.goods_name || '')}">${typeDisplay}</div>
            </div>
            <div class="bandung-row last-row">
              <div class="td-label">KERUSAKAN</div>
              <div class="td-value font-damage" style="${damageStyle}" title="${kerusakan}">${kerusakan}</div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    return `<div class="page">${cardsHtml}</div>`;
  }).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Format Retur Bandung (3x8)</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Roboto+Condensed:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@600;700;800&display=swap" rel="stylesheet">
        <style>
          @page {
            size: A4 portrait;
            margin: 4mm 4.5mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          html, body {
            margin: 0;
            padding: 0;
            background-color: #fff;
            color: #000;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            -webkit-font-smoothing: antialiased;
          }
          .page {
            width: 201mm;
            height: 288mm;
            max-height: 288mm;
            display: grid;
            grid-template-columns: repeat(3, 65.5mm);
            grid-template-rows: repeat(8, 34.5mm);
            gap: 1.2mm 1.5mm;
            page-break-after: always;
            break-after: page;
            box-sizing: border-box;
            overflow: hidden;
            margin: 0 auto;
            align-content: start;
            justify-content: start;
          }
          .page:last-child {
            page-break-after: auto;
            break-after: auto;
          }
          .bandung-card {
            width: 65.5mm;
            height: 34.5mm;
            max-width: 65.5mm;
            max-height: 34.5mm;
            page-break-inside: avoid;
            break-inside: avoid;
            border: 0.5px dashed #cbd5e1;
            padding: 0.6mm;
            background: #fff;
            display: flex;
            flex-direction: column;
            justify-content: center;
            box-sizing: border-box;
            overflow: hidden;
          }
          .bandung-box {
            width: 100%;
            height: 100%;
            border: 1.5px solid #000;
            display: flex;
            flex-direction: column;
            box-sizing: border-box;
            background: #fff;
            overflow: hidden;
          }
          .th-header {
            text-align: center;
            font-size: 8.5pt;
            font-weight: 900;
            letter-spacing: 2px;
            color: #000;
            background-color: #f8fafc;
            border-bottom: 1.5px solid #000;
            height: 16%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-sizing: border-box;
            white-space: nowrap;
          }
          .bandung-row {
            display: flex;
            flex-direction: row;
            height: 21%;
            border-bottom: 1px solid #000;
            box-sizing: border-box;
            overflow: hidden;
          }
          .bandung-row.last-row {
            border-bottom: none;
          }
          .td-label {
            width: 30% !important;
            min-width: 30% !important;
            max-width: 30% !important;
            border-right: 1.5px solid #000;
            font-weight: 800;
            font-size: 6.5pt;
            text-transform: uppercase;
            color: #0f172a;
            background-color: #f8fafc;
            letter-spacing: 0;
            padding: 0 4px;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            align-items: center;
            white-space: nowrap;
            overflow: hidden;
            box-sizing: border-box;
          }
          .td-value {
            width: 70% !important;
            min-width: 70% !important;
            max-width: 70% !important;
            font-size: 7.2pt;
            color: #000;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            letter-spacing: 0;
            padding: 0 4px;
            display: flex;
            align-items: center;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            box-sizing: border-box;
          }
          .font-store {
            font-weight: 700;
            font-size: 7.2pt;
            letter-spacing: 0;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }
          .store-text {
            font-weight: 700;
            color: #000;
          }
          .id-toko {
            font-weight: 600;
            font-size: 6.8pt;
            color: #334155;
            margin-left: 3px;
          }
          .font-code {
            font-weight: 900;
            font-size: 7.2pt;
            letter-spacing: 0.2px;
            color: #3730a3;
            font-family: 'JetBrains Mono', monospace;
          }
          .font-code-sm {
            font-weight: 700;
            font-size: 7.2pt;
            letter-spacing: 0.1px;
            color: #000;
            font-family: 'JetBrains Mono', monospace;
          }
          .font-damage {
            font-weight: 700;
            font-size: 7.2pt;
            color: #0f172a;
            text-transform: uppercase;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            letter-spacing: 0;
          }
          @media print {
            .no-print { display: none !important; }
            .page { margin: 0; }
            .bandung-card { border: 0.5px dashed #94a3b8; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="padding: 10px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: center; gap: 10px;">
          <button onclick="window.print()" style="padding: 8px 20px; background: #4f46e5; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">Cetak Sekarang</button>
          <button onclick="window.close()" style="padding: 8px 20px; background: #e2e8f0; color: #475569; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">Tutup</button>
        </div>
        ${pagesHtml}
        <script>
          function triggerPrint() {
            if (document.fonts && document.fonts.ready) {
              document.fonts.ready.then(function() {
                setTimeout(function() { window.print(); }, 250);
              });
            } else {
              setTimeout(function() { window.print(); }, 500);
            }
          }
          if (document.readyState === 'complete') {
            triggerPrint();
          } else {
            window.addEventListener('load', triggerPrint);
          }
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

/**
 * Print Desain Stiker Kompak:
 * - A4 Portrait with 3 columns x 8 rows = 24 labels per sheet
 * - Clean compact sticker layout
 * - No wrapped text
 */
export function printCompact(records: ReturRecordForPrint[], copiesPerItem: number) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const expandedRecords: ReturRecordForPrint[] = [];
  records.forEach(r => {
    for (let i = 0; i < copiesPerItem; i++) {
      expandedRecords.push(r);
    }
  });

  const CHUNK_SIZE = 24;
  const chunks: ReturRecordForPrint[][] = [];
  for (let i = 0; i < expandedRecords.length; i += CHUNK_SIZE) {
    chunks.push(expandedRecords.slice(i, i + CHUNK_SIZE));
  }

  const pagesHtml = chunks.map(chunk => {
    const labelsHtml = chunk.map(record => {
      const customerName = escapeHtml(record.customer_name || '-');
      const customerCode = escapeHtml(record.customer_code || '-');
      const returnDate = record.return_date ? format(new Date(record.return_date), 'dd/MM/yy') : '-';
      const goodsName = escapeHtml(record.goods_name || '-');
      const goodsCode = escapeHtml(record.goods_code || '-');
      const desc = escapeHtml(record.description || '-');

      return `
        <div class="label">
          <div class="label-inner">
            <div class="header">
              <div class="title-box">
                <div class="title" title="${customerName}">${customerName}</div>
                <div class="subtitle">ID: ${customerCode}</div>
              </div>
              <div class="date">${returnDate}</div>
            </div>
            
            <div class="prod-info">
              <div class="name-box">
                <div class="name" title="${goodsName}">${goodsName}</div>
              </div>
              <div class="meta">
                <div class="qty-box">
                  <span class="qty-label">QTY</span>
                  <span class="qty-value">${record.qty}</span>
                </div>
                <div class="code-box">
                  <span class="code-label">CODE</span>
                  <span class="code-value">${goodsCode}</span>
                </div>
              </div>
            </div>

            <div class="footer">
              <div class="desc" title="${desc}">${desc}</div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    return `<div class="page">${labelsHtml}</div>`;
  }).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Label Retur Kompak (3x8)</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;600;700&display=swap" rel="stylesheet">
        <style>
          @page {
            size: A4 portrait;
            margin: 4mm 4.5mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body {
            margin: 0;
            padding: 0;
            font-family: 'Inter', ui-sans-serif, system-ui, sans-serif;
            background-color: #fff;
            color: #000;
          }
          .page {
            width: 201mm;
            height: 288mm;
            max-height: 288mm;
            display: grid;
            grid-template-columns: repeat(3, 65.5mm);
            grid-template-rows: repeat(8, 34.5mm);
            gap: 1.2mm 1.5mm;
            page-break-after: always;
            break-after: page;
            box-sizing: border-box;
            overflow: hidden;
            margin: 0 auto;
            align-content: start;
            justify-content: start;
          }
          .page:last-child {
            page-break-after: auto;
            break-after: auto;
          }
          .label {
            width: 65.5mm;
            height: 34.5mm;
            border: 0.5px solid #ddd;
            box-sizing: border-box;
            overflow: hidden;
            position: relative;
            padding: 1mm;
          }
          .label-inner {
            border: 1.2px solid #000;
            border-radius: 4px;
            height: 100%;
            width: 100%;
            padding: 1.5mm 2mm;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            background-color: #fff;
            overflow: hidden;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 1px solid #eaeaea;
            padding-bottom: 0.8mm;
            margin-bottom: 0.8mm;
          }
          .title-box { display: flex; flex-direction: column; gap: 1px; flex: 1; min-width: 0; padding-right: 1.5mm; }
          .title { font-size: 7.5pt; font-weight: 800; letter-spacing: -0.01em; color: #000; text-transform: uppercase; line-height: 1.1; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; }
          .subtitle { font-size: 5.8pt; font-weight: 600; color: #555; line-height: 1; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; }
          .date { font-size: 6.2pt; font-weight: 800; color: #000; white-space: nowrap !important; line-height: 1; }
          
          .prod-info { margin-bottom: 0; display: flex; flex-direction: column; }
          .name-box { margin-bottom: 0.8mm; }
          .name { font-size: 7.2pt; font-weight: 700; line-height: 1.1; color: #000; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; }
          
          .meta { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 1px solid #eaeaea; padding-bottom: 0.8mm; margin-bottom: 0.8mm; }
          
          .qty-box { display: flex; align-items: baseline; gap: 2px; }
          .qty-label { font-size: 5pt; font-weight: 800; color: #666; text-transform: uppercase; line-height: 1; }
          .qty-value { font-size: 9pt; font-weight: 900; color: #000; line-height: 1; }
          
          .code-box { display: flex; align-items: baseline; gap: 3px; max-width: 60%; }
          .code-label { font-size: 5pt; font-weight: 700; color: #888; text-transform: uppercase; line-height: 1; }
          .code-value { font-size: 7pt; font-weight: 700; color: #222; font-family: 'JetBrains Mono', monospace; line-height: 1; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; }

          .footer {
            display: flex;
            align-items: center;
            justify-content: flex-start;
            overflow: hidden;
          }
          .desc { font-size: 7pt; font-weight: 700; line-height: 1.1; color: #000; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; text-transform: uppercase; }

          @media print {
            .no-print { display: none !important; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="padding: 10px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: center; gap: 10px;">
          <button onclick="window.print()" style="padding: 8px 20px; background: #4f46e5; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">Cetak Sekarang</button>
          <button onclick="window.close()" style="padding: 8px 20px; background: #e2e8f0; color: #475569; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">Tutup</button>
        </div>
        ${pagesHtml}
        <script>
          window.addEventListener('load', function() {
            setTimeout(function() {
              window.print();
            }, 600);
          });
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
