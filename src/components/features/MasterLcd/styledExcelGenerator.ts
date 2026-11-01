import * as XLSX from 'xlsx-js-style';
import { MasterLcdItem, ColumnDefinition } from './types';

export interface ExportSortConfig {
  primaryColumn: string;
  primaryAsc: boolean;
  secondaryColumn?: string;
  secondaryAsc?: boolean;
}

export interface SheetExportOptions {
  title?: string;
  sheetName: string;
  items: MasterLcdItem[];
  activeColumns: ColumnDefinition[];
  sortConfig: ExportSortConfig;
  useGoldenStyle?: boolean;
}

/**
 * Sorts items based on primary and secondary criteria
 */
export function sortItemsForExport(
  itemsList: MasterLcdItem[],
  sortConfig: ExportSortConfig
): MasterLcdItem[] {
  const { primaryColumn, primaryAsc, secondaryColumn, secondaryAsc = true } = sortConfig;

  return [...itemsList].sort((a, b) => {
    let valA = (a as any)[primaryColumn];
    let valB = (b as any)[primaryColumn];
    if (valA === undefined || valA === null) valA = '';
    if (valB === undefined || valB === null) valB = '';

    let res = 0;
    if (typeof valA === 'number' && typeof valB === 'number') {
      res = valA - valB;
    } else {
      res = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
    }
    if (!primaryAsc) res = -res;

    // Secondary sort if primary values are equal
    if (res === 0 && secondaryColumn && secondaryColumn !== 'NONE') {
      let sA = (a as any)[secondaryColumn];
      let sB = (b as any)[secondaryColumn];
      if (sA === undefined || sA === null) sA = '';
      if (sB === undefined || sB === null) sB = '';
      if (typeof sA === 'number' && typeof sB === 'number') {
        res = sA - sB;
      } else {
        res = String(sA).localeCompare(String(sB), undefined, { numeric: true, sensitivity: 'base' });
      }
      if (!secondaryAsc) res = -res;
    }

    return res;
  });
}

/**
 * Formats header labels matching the user's reference image
 */
export function getStyledHeaderLabel(col: ColumnDefinition): string {
  if (col.key === 'packing') return 'ISI/BOX';
  if (col.key === 'harga_box') return 'HARGA/BOX';
  if (col.key === 'harga_pcs') return 'HARGA/PCS';
  if (col.key === 'kode_lcd') return 'KODE LCD';
  if (col.key === 'brand_hp') return 'BRAND HP';
  if (col.key === 'model_lcd') return 'MODEL HP';
  if (col.key === 'nama_lcd') return 'NAMA LCD';
  if (col.key === 'stock') return 'STOK';
  if (col.key === 'brand_' || col.key === 'brand_lcd') return 'BRAND LCD';
  return col.label.toUpperCase();
}

/**
 * Creates a styled Excel worksheet matching the golden-header reference design
 */
export function createStyledWorksheet(options: SheetExportOptions) {
  const { title, items, activeColumns, sortConfig, useGoldenStyle = true } = options;

  // 1. Sort the items
  const sortedItems = sortItemsForExport(items, sortConfig);

  // 2. Build 2D array of data (AOA)
  const sheetData: any[][] = [];
  let headerRowIndex = 0;

  const hasTitle = Boolean(title && title.trim());
  if (hasTitle) {
    const titleRow = new Array(activeColumns.length).fill('');
    titleRow[0] = title!.trim();
    sheetData.push(titleRow);
    sheetData.push([]); // Empty spacing row
    headerRowIndex = 2;
  }

  // Header row
  const headerLabels = activeColumns.map(getStyledHeaderLabel);
  sheetData.push(headerLabels);

  // Data rows
  sortedItems.forEach(item => {
    const row = activeColumns.map(col => {
      let val = (item as any)[col.key];
      if (val === undefined || val === null) val = '';
      if (col.format === 'number' || col.format === 'currency') {
        if (typeof val === 'number') return val;
        const parsed = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
        return isNaN(parsed) ? 0 : parsed;
      }
      if (typeof val === 'string') {
        val = val
          .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
          .replace(/[\uFF01-\uFF5E]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
          .replace(/[【〔〈「『]/g, '[')
          .replace(/[】〕〉」』]/g, ']')
          .replace(/[“”„‟]/g, '"')
          .replace(/[‘’‚‛]/g, "'");
      }
      return val;
    });
    sheetData.push(row);
  });

  // 3. Convert to worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

  // 4. Merges for Title
  if (hasTitle && activeColumns.length > 1) {
    worksheet['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: activeColumns.length - 1 } }
    ];
  }

  // 5. Styles definition
  const thinBorder = {
    top: { style: 'thin', color: { rgb: '000000' } },
    bottom: { style: 'thin', color: { rgb: '000000' } },
    left: { style: 'thin', color: { rgb: '000000' } },
    right: { style: 'thin', color: { rgb: '000000' } }
  };

  // Title Style (Row 0)
  if (hasTitle) {
    const titleCellRef = XLSX.utils.encode_cell({ r: 0, c: 0 });
    if (worksheet[titleCellRef]) {
      worksheet[titleCellRef].s = {
        font: { name: 'Calibri', sz: 18, bold: true, color: { rgb: '000000' } },
        alignment: { horizontal: 'center', vertical: 'center' }
      };
    }
  }

  // Header Row Style (Golden yellow #FFC000)
  for (let c = 0; c < activeColumns.length; c++) {
    const cellRef = XLSX.utils.encode_cell({ r: headerRowIndex, c });
    if (worksheet[cellRef]) {
      worksheet[cellRef].s = {
        fill: useGoldenStyle ? { fgColor: { rgb: 'FFC000' } } : { fgColor: { rgb: 'E2E8F0' } },
        font: { name: 'Calibri', sz: 10.5, bold: true, color: { rgb: '000000' } },
        border: thinBorder,
        alignment: { horizontal: 'center', vertical: 'center', wrapText: false }
      };
    }
  }

  // Data Rows Style (10.5pt Calibri, wrapText: false)
  const dataStartRow = headerRowIndex + 1;
  for (let r = dataStartRow; r < sheetData.length; r++) {
    for (let c = 0; c < activeColumns.length; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      const cell = worksheet[cellRef];
      if (!cell) continue;

      const col = activeColumns[c];
      const isCurrency = col.format === 'currency' || col.key.includes('harga');
      const isNumber = col.format === 'number' || col.key === 'packing' || col.key === 'stock';

      let horizAlign: 'left' | 'center' | 'right' = 'left';
      if (
        col.align === 'center' || 
        col.key === 'kode_lcd' || 
        col.key === 'brand_hp' || 
        col.key === 'packing' || 
        col.key === 'stock' ||
        col.key === 'brand_' ||
        col.key === 'brand_lcd' ||
        col.key === 'status_lcd' ||
        col.key === 'harga_box' ||
        col.key === 'harga_pcs' ||
        col.key.includes('harga')
      ) {
        horizAlign = 'center';
      } else if (col.align === 'right') {
        horizAlign = 'right';
      }

      cell.s = {
        font: { name: 'Calibri', sz: 10.5, color: { rgb: '000000' } },
        border: thinBorder,
        alignment: { horizontal: horizAlign, vertical: 'center', wrapText: false }
      };

      // Number formatting with thousands dot e.g. 1.155.380
      if (isCurrency || (isNumber && typeof cell.v === 'number')) {
        cell.t = 'n';
        cell.z = '#,##0';
      }
    }
  }

  // 6. Enable Excel native AutoFilter dropdown on the header row
  worksheet['!autofilter'] = {
    ref: XLSX.utils.encode_range({
      s: { r: headerRowIndex, c: 0 },
      e: { r: Math.max(headerRowIndex, sheetData.length - 1), c: activeColumns.length - 1 }
    })
  };

  // 7. Row heights for 10.5pt font (clean single line rows)
  const rowHeights = [];
  if (hasTitle) {
    rowHeights.push({ hpt: 32 }); // Title
    rowHeights.push({ hpt: 10 }); // Spacing
  }
  rowHeights.push({ hpt: 26 }); // Header
  for (let i = 0; i < sortedItems.length; i++) {
    rowHeights.push({ hpt: 20 }); // Data row
  }
  worksheet['!rows'] = rowHeights;

  // 8. Column widths ensuring no text is squeezed or wrapped
  worksheet['!cols'] = activeColumns.map((col, idx) => {
    let maxLen = headerLabels[idx].length;
    sortedItems.forEach(item => {
      let v = String((item as any)[col.key] || '');
      if (col.format === 'currency' || col.key.includes('harga')) {
        const num = Number((item as any)[col.key] || 0);
        v = Math.round(num).toLocaleString('id-ID');
      }
      if (v.length > maxLen) maxLen = v.length;
    });

    if (col.key === 'model_lcd' || col.key === 'nama_lcd') {
      return { wch: Math.max(50, maxLen + 5) };
    }
    if (col.key.includes('harga')) {
      return { wch: Math.max(18, maxLen + 4) };
    }
    return { wch: Math.max(15, maxLen + 3) };
  });

  return worksheet;
}
