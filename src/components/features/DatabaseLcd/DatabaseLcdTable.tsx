import React, { useState, useMemo } from 'react';
import { 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Trash2, 
  Download, 
  RefreshCw,
  Hash,
  ShoppingBag,
  Store,
  Calendar,
  FileText,
  AlertCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Button } from '../../ui/Button';
import { ConfirmModal } from '../../ui/ConfirmModal';
import { DatabaseLcdItem } from './types';

interface DatabaseLcdTableProps {
  data: DatabaseLcdItem[];
  loading: boolean;
  onRefresh: () => void;
  onDeleteRow: (id: string) => Promise<void>;
}

export function DatabaseLcdTable({
  data,
  loading,
  onRefresh,
  onDeleteRow
}: DatabaseLcdTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25); // User requested 20-30 rows
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const term = searchTerm.toLowerCase().trim();
    return data.filter(item => 
      (item.kode_barang && item.kode_barang.toLowerCase().includes(term)) ||
      (item.nama_barang && item.nama_barang.toLowerCase().includes(term)) ||
      (item.kode_customer && item.kode_customer.toLowerCase().includes(term)) ||
      (item.nama_customer && item.nama_customer.toLowerCase().includes(term)) ||
      (item.no_so && item.no_so.toLowerCase().includes(term)) ||
      (item.no_sd && item.no_sd.toLowerCase().includes(term)) ||
      (item.tgl_so && item.tgl_so.toLowerCase().includes(term))
    );
  }, [data, searchTerm]);

  // Pagination calculation
  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = useMemo(() => {
    return filteredData.slice(startIndex, startIndex + pageSize);
  }, [filteredData, startIndex, pageSize]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleExportExcel = () => {
    if (filteredData.length === 0) return;
    const exportRows = filteredData.map((item, idx) => ({
      No: idx + 1,
      'Kode Barang': item.kode_barang || '',
      'Nama Barang': item.nama_barang || '',
      'Kode Customer': item.kode_customer || '',
      'Nama Customer': item.nama_customer || '',
      'No SO': item.no_so || '',
      'Tgl SO': item.tgl_so || '',
      'No SD': item.no_sd || ''
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Database_LCD');
    XLSX.writeFile(wb, `database_lcd_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      await onDeleteRow(deletingId);
    } finally {
      setIsDeleting(false);
      setDeletingId(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* Controls: Search, Row Selector, Export, Refresh */}
      <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari No SO, No SD, Toko, atau Kode Barang..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all placeholder:text-slate-400 font-medium"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              ×
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Rows per page selector (default 25 rows per user request) */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-white border border-slate-200 px-2.5 py-1.5 rounded-xl">
            <span className="text-slate-500 font-medium">Tampil:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value={20}>20 baris</option>
              <option value={25}>25 baris</option>
              <option value={30}>30 baris</option>
              <option value={50}>50 baris</option>
              <option value={100}>100 baris</option>
            </select>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            className="text-xs flex items-center gap-1.5 bg-white border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            disabled={filteredData.length === 0}
            className="text-xs flex items-center gap-1.5 bg-white border-slate-200 text-emerald-700 hover:bg-emerald-50 rounded-xl"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export Excel</span>
          </Button>
        </div>
      </div>

      {/* Responsive Table Wrapper */}
      <div className="overflow-x-auto w-full flex-1">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-100/75 text-slate-700 border-b border-slate-200">
            <tr>
              <th className="px-3 py-3 font-bold w-12 text-center text-slate-500">No</th>
              <th className="px-3 py-3 font-bold whitespace-nowrap">
                <span className="flex items-center gap-1">
                  <Hash className="w-3.5 h-3.5 text-indigo-500" />
                  Kode Barang
                </span>
              </th>
              <th className="px-3 py-3 font-bold min-w-[200px]">
                <span className="flex items-center gap-1">
                  <ShoppingBag className="w-3.5 h-3.5 text-indigo-500" />
                  Nama Barang
                </span>
              </th>
              <th className="px-3 py-3 font-bold whitespace-nowrap">
                <span className="flex items-center gap-1">
                  <Store className="w-3.5 h-3.5 text-indigo-500" />
                  ID Toko (Kode Customer)
                </span>
              </th>
              <th className="px-3 py-3 font-bold min-w-[160px]">Nama Toko (Customer)</th>
              <th className="px-3 py-3 font-bold whitespace-nowrap">
                <span className="flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-blue-500" />
                  No SO
                </span>
              </th>
              <th className="px-3 py-3 font-bold whitespace-nowrap">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Tgl SO
                </span>
              </th>
              <th className="px-3 py-3 font-bold whitespace-nowrap">
                <span className="flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-purple-500" />
                  No SD
                </span>
              </th>
              <th className="px-3 py-3 font-bold text-center w-16">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={9} className="px-4 py-16 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
                    <span className="text-xs font-semibold">Memuat data Database LCD...</span>
                  </div>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-16 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <AlertCircle className="w-8 h-8 text-slate-300" />
                    <span className="text-xs font-semibold text-slate-600">
                      {searchTerm ? 'Tidak ada data yang cocok dengan pencarian.' : 'Belum ada data di Database LCD.'}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Upload file Excel di atas untuk menambahkan data.
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((row, index) => {
                const actualIndex = startIndex + index + 1;
                return (
                  <tr key={row.id || index} className="hover:bg-indigo-50/30 transition-colors">
                    <td className="px-3 py-2.5 text-center text-slate-400 font-mono text-[11px]">
                      {actualIndex}
                    </td>
                    <td className="px-3 py-2.5 font-mono font-bold text-indigo-700 whitespace-nowrap">
                      {row.kode_barang || '-'}
                    </td>
                    <td className="px-3 py-2.5 font-medium text-slate-800">
                      {row.nama_barang || '-'}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-slate-600 whitespace-nowrap">
                      <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[11px] font-semibold">
                        {row.kode_customer || '-'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-medium text-slate-800">
                      {row.nama_customer || '-'}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {row.no_so ? (
                        <span className="inline-flex items-center gap-1 font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200/60 px-2 py-0.5 rounded-md text-[11px]">
                          {row.no_so}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-slate-600 text-[11px]">
                      {row.tgl_so || '-'}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {row.no_sd ? (
                        <span className="inline-flex items-center gap-1 font-mono font-bold text-purple-700 bg-purple-50 border border-purple-200/60 px-2 py-0.5 rounded-md text-[11px]">
                          {row.no_sd}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center whitespace-nowrap">
                      {row.id && (
                        <button
                          type="button"
                          onClick={() => setDeletingId(row.id!)}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Hapus baris"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-3 border-t border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="text-slate-500 font-medium">
          Menampilkan <span className="font-bold text-slate-700">{totalItems > 0 ? startIndex + 1 : 0}</span> - <span className="font-bold text-slate-700">{Math.min(startIndex + pageSize, totalItems)}</span> dari <span className="font-bold text-slate-800">{totalItems.toLocaleString('id-ID')}</span> data
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1 || loading}
            className="text-xs h-8 px-2.5 bg-white border-slate-200 rounded-lg"
          >
            <ChevronLeft className="w-3.5 h-3.5 mr-1" />
            Prev
          </Button>

          <span className="text-slate-600 font-semibold px-2">
            Hal {currentPage} / {totalPages}
          </span>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages || loading}
            className="text-xs h-8 px-2.5 bg-white border-slate-200 rounded-lg"
          >
            Next
            <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      </div>

      {/* Confirm Row Deletion Modal */}
      <ConfirmModal
        isOpen={!!deletingId}
        title="Hapus Baris Data LCD"
        message="Apakah Anda yakin ingin menghapus data baris ini dari database LCD?"
        confirmText={isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
        isDestructive={true}
        onConfirm={confirmDelete}
        onClose={() => setDeletingId(null)}
      />
    </div>
  );
}
