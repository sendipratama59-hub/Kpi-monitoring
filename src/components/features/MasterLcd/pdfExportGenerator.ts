import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MasterLcdItem, DiscountRule } from './types';
import { applyDiscountsToItems } from './discountUtils';

export type SplitPackingMode = 'auto_threshold' | 'always_split' | 'max_rows' | 'single_page';

export interface PdfExportConfig {
  brandLcd: 'XPAS' | 'VIVAN' | 'ALL' | 'FILTERED';
  discountOption: string; // rule id, 'NONE', 'ACTIVE', 'CURRENT'
  discountRules: DiscountRule[];
  splitPackingMode: SplitPackingMode;
  maxRowsPerPage: number; // default 50
  selectedBrands: string[]; // list of brand_hp to include
  customTitlePrefix?: string; // optional prefix
  fileName?: string;
  orientation?: 'portrait' | 'landscape';
  fontSize?: number; // default 10.5
  includeStock?: boolean; // toggle to include STOK column
}

export interface BrandPageGroup {
  brandHp: string;
  packingLabel?: string; // e.g. "ISI 10" or "ISI 3" (optional)
  items: MasterLcdItem[];
}

/**
 * Groups items into pages according to the user's split packing rules.
 * Matches the reference PDF where large brands like SAMSUNG & REDMI are split
 * into separate pages for ISI 10 and ISI 3, while smaller brands remain on 1 page.
 */
export function buildBrandPageGroups(
  items: MasterLcdItem[],
  selectedBrands: string[],
  splitMode: SplitPackingMode,
  maxRowsPerPage: number = 50
): BrandPageGroup[] {
  // 1. Filter by selected brand_hp
  const brandFiltered = items.filter(item => {
    const hp = (item.brand_hp || '').trim().toUpperCase();
    return selectedBrands.includes(hp);
  });

  // 2. Group by brand_hp
  const byBrandMap = new Map<string, MasterLcdItem[]>();
  brandFiltered.forEach(item => {
    const hp = (item.brand_hp || '').trim().toUpperCase() || 'LAINNYA';
    if (!byBrandMap.has(hp)) {
      byBrandMap.set(hp, []);
    }
    byBrandMap.get(hp)!.push(item);
  });

  // Preserve popular brand order matching the sample PDF
  const preferredOrder = [
    'OPPO',
    'REALME',
    'VIVO',
    'INFINIX',
    'REDMI',
    'XIAOMI',
    'SAMSUNG',
    'IPHONE',
    'TECNO',
    'ITEL',
    'HUAWEI',
    'ZTE',
    'POCO'
  ];

  const sortedBrandKeys = Array.from(byBrandMap.keys()).sort((a, b) => {
    const idxA = preferredOrder.indexOf(a);
    const idxB = preferredOrder.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });

  const pageGroups: BrandPageGroup[] = [];

  for (const brand of sortedBrandKeys) {
    const brandItems = byBrandMap.get(brand) || [];
    if (brandItems.length === 0) continue;

    // Separate items by packing: 10 vs 3 (or other)
    const pack10 = brandItems.filter(i => Number(i.packing) === 10);
    const pack3 = brandItems.filter(i => Number(i.packing) === 3);
    const packOthers = brandItems.filter(i => Number(i.packing) !== 10 && Number(i.packing) !== 3);

    // Sort items within each packing group by kode_lcd ascending
    const sortWithinGroup = (list: MasterLcdItem[]) => {
      return [...list].sort((a, b) => {
        const kodeA = String(a.kode_lcd || '');
        const kodeB = String(b.kode_lcd || '');
        return kodeA.localeCompare(kodeB, undefined, { numeric: true, sensitivity: 'base' });
      });
    };

    const sortedPack10 = sortWithinGroup(pack10);
    const sortedPack3 = sortWithinGroup(pack3);
    const sortedPackOthers = sortWithinGroup(packOthers);

    // Standard combined list: Isi 10 first, then Isi 3, then others
    const combinedAll = [...sortedPack10, ...sortedPack3, ...sortedPackOthers];

    if (splitMode === 'single_page') {
      // Force all items for this brand into 1 page
      pageGroups.push({
        brandHp: brand,
        items: combinedAll
      });
      continue;
    }

    if (splitMode === 'always_split') {
      // Always create separate pages for Isi 10 and Isi 3
      if (sortedPack10.length > 0) {
        chunkArray(sortedPack10, maxRowsPerPage).forEach(chunk => {
          pageGroups.push({ brandHp: brand, packingLabel: 'ISI 10', items: chunk });
        });
      }
      if (sortedPack3.length > 0) {
        chunkArray(sortedPack3, maxRowsPerPage).forEach(chunk => {
          pageGroups.push({ brandHp: brand, packingLabel: 'ISI 3', items: chunk });
        });
      }
      if (sortedPackOthers.length > 0) {
        chunkArray(sortedPackOthers, maxRowsPerPage).forEach(chunk => {
          pageGroups.push({ brandHp: brand, packingLabel: 'LAINNYA', items: chunk });
        });
      }
      continue;
    }

    if (splitMode === 'auto_threshold') {
      // AUTO MODE (Matching user's reference PDF):
      // If brand items fit within maxRowsPerPage (e.g. <= 30), keep them on 1 page! (Like OPPO, REALME, VIVO, INFINIX, ZTE)
      // If total items exceed maxRowsPerPage, split into separate pages for Isi 10 and Isi 3! (Like REDMI and SAMSUNG)
      if (combinedAll.length <= maxRowsPerPage) {
        pageGroups.push({
          brandHp: brand,
          items: combinedAll
        });
      } else {
        // Exceeds 1 page: Split Isi 10 and Isi 3 into separate pages with the same Brand Header
        if (sortedPack10.length > 0) {
          chunkArray(sortedPack10, maxRowsPerPage).forEach(chunk => {
            pageGroups.push({ brandHp: brand, packingLabel: 'ISI 10', items: chunk });
          });
        }
        if (sortedPack3.length > 0) {
          chunkArray(sortedPack3, maxRowsPerPage).forEach(chunk => {
            pageGroups.push({ brandHp: brand, packingLabel: 'ISI 3', items: chunk });
          });
        }
        if (sortedPackOthers.length > 0) {
          chunkArray(sortedPackOthers, maxRowsPerPage).forEach(chunk => {
            pageGroups.push({ brandHp: brand, packingLabel: 'LAINNYA', items: chunk });
          });
        }
      }
      continue;
    }

    // Default max_rows mode: chunk combined items strictly by maxRowsPerPage
    chunkArray(combinedAll, maxRowsPerPage).forEach(chunk => {
      pageGroups.push({ brandHp: brand, items: chunk });
    });
  }

  return pageGroups;
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/**
 * Sanitizes strings for PDF rendering using standard fonts (WinAnsiEncoding).
 * Replaces fullwidth characters like '（' and '）' with standard '(' and ')',
 * converts smart quotes/brackets to ASCII, and strips unsupported non-ASCII characters
 * that would otherwise render as 'ÿ' or mojibake.
 */
export function sanitizePdfText(str: any): string {
  if (str === null || str === undefined) return '';
  let text = String(str);

  // 1. Replace non-breaking space (0xA0) and other unicode spaces
  text = text.replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ');

  // 2. Convert Fullwidth ASCII characters (U+FF01 - U+FF5E) to halfwidth ASCII (0x21 - 0x7E)
  // This automatically converts:
  // '（' (U+FF08) -> '(' (0x28)
  // '）' (U+FF09) -> ')' (0x29)
  // '［' (U+FF3B) -> '['
  // '］' (U+FF3D) -> ']'
  // '＋' (U+FF0B) -> '+'
  // '／' (U+FF0F) -> '/'
  text = text.replace(/[\uFF01-\uFF5E]/g, (ch) => {
    return String.fromCharCode(ch.charCodeAt(0) - 0xFEE0);
  });

  // 3. Convert CJK brackets and smart quotes to standard ASCII
  text = text
    .replace(/[【〔〈「『]/g, '[')
    .replace(/[】〕〉」』]/g, ']')
    .replace(/[《]/g, '<<')
    .replace(/[》]/g, '>>')
    .replace(/[“”„‟]/g, '"')
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[–—―]/g, '-')
    .replace(/…/g, '...');

  // 4. Remove any remaining non-ASCII characters that trigger 'ÿ' in jsPDF standard fonts
  text = text.replace(/[^\x20-\x7E]/g, '');

  return text;
}

/**
 * Generates and downloads the A4 PDF matching the user's reference document
 */
export function generateMasterLcdPdf(
  rawItems: MasterLcdItem[],
  config: PdfExportConfig
) {
  const {
    brandLcd,
    discountOption,
    discountRules,
    splitPackingMode,
    maxRowsPerPage = 50,
    selectedBrands,
    fileName,
    orientation = 'portrait',
    fontSize = 10.5,
    includeStock = false
  } = config;

  // 1. Filter by Brand LCD (unless ALL or FILTERED where rows are already chosen by user)
  let itemsToExport = rawItems.filter(item => {
    if (brandLcd === 'ALL' || brandLcd === 'FILTERED') return true;
    const b = String(item.brand_ || item.brand_lcd || '').toUpperCase();
    if (brandLcd === 'XPAS') return b.includes('XPAS') || b.includes('X-PAS') || b === 'XP';
    if (brandLcd === 'VIVAN') return b.includes('VIVAN');
    return true;
  });

  // Ensure base prices are clean
  const cleanBaseItems = itemsToExport.map(i => ({
    ...i,
    harga_pcs: i.original_harga_pcs !== undefined ? i.original_harga_pcs : i.harga_pcs,
    harga_box: i.original_harga_box !== undefined ? i.original_harga_box : i.harga_box,
  }));

  // 2. Apply chosen discount
  let processedItems = cleanBaseItems;
  if (discountOption === 'CURRENT') {
    // Keep already discounted prices from live table/filter
    processedItems = itemsToExport;
  } else if (discountOption === 'NONE') {
    processedItems = cleanBaseItems;
  } else if (discountOption === 'ACTIVE') {
    processedItems = applyDiscountsToItems(cleanBaseItems, discountRules.filter(r => r.isActive));
  } else {
    // Specific rule ID selected
    const chosenRule = discountRules.find(r => r.id === discountOption);
    if (chosenRule) {
      processedItems = applyDiscountsToItems(cleanBaseItems, [chosenRule]);
    } else {
      processedItems = cleanBaseItems;
    }
  }

  // 3. Build Page Groups based on the split packing settings
  const pageGroups = buildBrandPageGroups(
    processedItems,
    selectedBrands,
    splitPackingMode,
    maxRowsPerPage
  );

  if (pageGroups.length === 0) {
    throw new Error('Tidak ada data produk yang cocok untuk diekspor ke PDF.');
  }

  // 4. Create jsPDF document: A4 (Portrait default matching Screenshot 1, or Landscape)
  const isLandscape = orientation === 'landscape';
  const doc = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  const pageWidth = isLandscape ? 297 : 210;
  const pageHeight = isLandscape ? 210 : 297;
  const marginX = isLandscape ? 8 : 6;
  const tableWidth = pageWidth - marginX * 2; // 281mm in landscape, 198mm in portrait

  // Format number with Indonesian dot: 1.000.000
  const formatRp = (num: number) => {
    return Math.round(num || 0).toLocaleString('id-ID');
  };

  // Column styles: wide enough so headers NEVER wrap
  const colStyles = isLandscape
    ? (includeStock
        ? {
            0: { halign: 'center' as const, cellWidth: 28 }, // KODE LCD
            1: { halign: 'center' as const, cellWidth: 28 }, // BRAND HP
            2: { halign: 'left' as const, cellWidth: 125 },   // MODEL HP
            3: { halign: 'center' as const, cellWidth: 20 }, // ISI/BOX
            4: { halign: 'center' as const, cellWidth: 30 }, // HARGA/BOX (CENTERED)
            5: { halign: 'center' as const, cellWidth: 30 }, // HARGA/PCS (CENTERED)
            6: { halign: 'center' as const, cellWidth: 20 }  // STOK (CENTERED)
          }
        : {
            0: { halign: 'center' as const, cellWidth: 28 }, // KODE LCD
            1: { halign: 'center' as const, cellWidth: 28 }, // BRAND HP
            2: { halign: 'left' as const, cellWidth: 145 },   // MODEL HP
            3: { halign: 'center' as const, cellWidth: 20 }, // ISI/BOX
            4: { halign: 'center' as const, cellWidth: 30 }, // HARGA/BOX (CENTERED)
            5: { halign: 'center' as const, cellWidth: 30 }  // HARGA/PCS (CENTERED)
          })
    : (includeStock
        ? {
            0: { halign: 'center' as const, cellWidth: 26 }, // KODE LCD
            1: { halign: 'center' as const, cellWidth: 24 }, // BRAND HP
            2: { halign: 'left' as const, cellWidth: 58 },   // MODEL HP
            3: { halign: 'center' as const, cellWidth: 18 }, // ISI/BOX
            4: { halign: 'center' as const, cellWidth: 27 }, // HARGA/BOX (CENTERED)
            5: { halign: 'center' as const, cellWidth: 27 }, // HARGA/PCS (CENTERED)
            6: { halign: 'center' as const, cellWidth: 18 }  // STOK (CENTERED)
          }
        : {
            0: { halign: 'center' as const, cellWidth: 26 }, // KODE LCD
            1: { halign: 'center' as const, cellWidth: 24 }, // BRAND HP
            2: { halign: 'left' as const, cellWidth: 76 },   // MODEL HP
            3: { halign: 'center' as const, cellWidth: 18 }, // ISI/BOX
            4: { halign: 'center' as const, cellWidth: 27 }, // HARGA/BOX (CENTERED)
            5: { halign: 'center' as const, cellWidth: 27 }  // HARGA/PCS (CENTERED)
          });

  pageGroups.forEach((group, index) => {
    if (index > 0) {
      doc.addPage();
    }

    // Top Title: Large bold centered brand name e.g. "OPPO", "REDMI", "SAMSUNG"
    const titleText = sanitizePdfText(group.brandHp);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(isLandscape ? 32 : 36);
    doc.setTextColor(0, 0, 0);

    // Draw centered title
    const titleY = isLandscape ? 18 : 20;
    doc.text(titleText, pageWidth / 2, titleY, { align: 'center' });

    // Build Table Body Rows with sanitized characters
    const tableBody = group.items.map(item => {
      const row = [
        sanitizePdfText(item.kode_lcd || ''),
        sanitizePdfText(item.brand_hp || ''),
        sanitizePdfText(item.model_lcd || ''),
        sanitizePdfText(item.packing || '10'),
        formatRp(item.harga_box),
        formatRp(item.harga_pcs)
      ];
      if (includeStock) {
        row.push(String(item.stock ?? 0));
      }
      return row;
    });

    const headRow = ['KODE LCD', 'BRAND HP', 'MODEL HP', 'ISI/BOX', 'HARGA/BOX', 'HARGA/PCS'];
    if (includeStock) {
      headRow.push('STOK');
    }

    // Render Table using autoTable with 10.5px font and overflow: hidden (strict single line, no wrapping)
    autoTable(doc, {
      startY: isLandscape ? 24 : 28,
      head: [headRow],
      body: tableBody,
      theme: 'grid',
      margin: { left: marginX, right: marginX, bottom: 8 },
      tableWidth: tableWidth,
      styles: {
        font: 'helvetica',
        fontSize: fontSize,
        textColor: [0, 0, 0],
        lineColor: [0, 0, 0],
        lineWidth: 0.15,
        cellPadding: 1.0,
        valign: 'middle',
        overflow: 'hidden' // Strictly prevent wrapping or overflowing
      },
      headStyles: {
        fillColor: [255, 192, 0], // Golden yellow #FFC000
        textColor: [0, 0, 0],
        fontSize: fontSize,
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle',
        lineWidth: 0.15,
        lineColor: [0, 0, 0],
        overflow: 'hidden' // Prevent header wrapping
      },
      bodyStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        overflow: 'hidden' // Strictly prevent row wrapping
      },
      columnStyles: colStyles
    });
  });

  // 5. Generate and download file
  const todayStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const brandSuffix = brandLcd === 'ALL' ? 'VIVAN_XPAS' : brandLcd;
  const defaultName = `Pricelist_${brandSuffix}_A4_${todayStr}.pdf`;
  const finalFileName = fileName && fileName.trim().length > 0
    ? (fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`)
    : defaultName;

  doc.save(finalFileName);
}
