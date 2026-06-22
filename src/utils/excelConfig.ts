import * as XLSX from 'xlsx';

export const COLUMN_MAP = {
  revenue: ['revenue', 'pendapatan', 'total_sales', 'total_penjualan', 'rev', 'nilai', 'sales'],
  region: ['region', 'area', 'cabang', 'wilayah', 'lokasi', 'tempat'],
  transaction_date: ['date', 'tanggal', 'tgl', 'transaction_date', 'waktu', 'periode'],
  units_sold: ['units', 'qty', 'quantity', 'unit_terjual', 'jumlah', 'volume'],
  sales_rep: ['sales_rep', 'rep', 'sales', 'pic', 'penanggung_jawab', 'karyawan']
};

/**
 * Normalizes a string by converting to lowercase, trimming, and replacing spaces/special chars.
 */
function normalizeString(str: string): string {
  return String(str)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_') // Replace multiple underscores with single
    .replace(/(^_|_$)/g, ''); // Trim underscores at start/end
}

/**
 * Finds the canonical column name based on the COLUMN_MAP alias matching.
 */
function getCanonicalColumnName(header: string): string | null {
  const normalizedHeader = normalizeString(header);
  
  for (const [canonicalName, aliases] of Object.entries(COLUMN_MAP)) {
    if (canonicalName === normalizedHeader) return canonicalName;
    
    // Fuzzy match
    for (const alias of aliases) {
      if (normalizedHeader.includes(alias)) {
        return canonicalName;
      }
    }
  }
  return null;
}

/**
 * Parses an Excel file buffer and returns mapped and cleaned JSON data.
 */
export async function parseExcelData(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        
        // Assume first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON (Array of Arrays to get raw headers easily first, or raw objects)
        const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: null });
        
        if (rawJson.length === 0) {
          throw new Error('File Excel kosong atau format tidak sesuai.');
        }

        // Extract headers from the first object
        const rawHeaders = Object.keys(rawJson[0] as object);
        const headerMapping: Record<string, string> = {};
        
        rawHeaders.forEach(header => {
          const canonical = getCanonicalColumnName(header);
          if (canonical) {
            headerMapping[header] = canonical;
          }
        });

        // Map data
        const mappedData = rawJson.map((row: any) => {
          const mappedRow: any = {};
          for (const [rawHeader, rawValue] of Object.entries(row)) {
            const canonical = headerMapping[rawHeader];
            if (canonical) {
               // Basic Data Cleaning based on type
               let cleanedValue = rawValue;
               
               if (canonical === 'revenue' || canonical === 'units_sold') {
                 // Clean number formatting (remove currency symbols, commas if parsed as string)
                 if (typeof rawValue === 'string') {
                   cleanedValue = parseFloat(rawValue.replace(/[^0-9.-]+/g, ''));
                 } else {
                   cleanedValue = Number(rawValue);
                 }
                 if (typeof cleanedValue === 'number' && isNaN(cleanedValue)) cleanedValue = 0;
               }
               
               if (canonical === 'transaction_date') {
                 if (rawValue instanceof Date) {
                   cleanedValue = rawValue.toISOString().split('T')[0];
                 } else if (typeof rawValue === 'number') {
                   // Excel serial date to JS Date
                   const date = new Date(Math.round((rawValue - 25569) * 86400 * 1000));
                   cleanedValue = date.toISOString().split('T')[0];
                 } else {
                   const date = new Date(String(rawValue));
                   if (!isNaN(date.getTime())) {
                     cleanedValue = date.toISOString().split('T')[0];
                   }
                 }
               }
               
               mappedRow[canonical] = cleanedValue;
            }
          }
          return mappedRow;
        });

        // Filter out completely empty mapped rows
        const validData = mappedData.filter(row => Object.keys(row).length > 0);
        
        resolve(validData);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
}
