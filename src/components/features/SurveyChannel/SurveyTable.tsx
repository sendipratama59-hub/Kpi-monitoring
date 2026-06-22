import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { ClipboardList, Search, Loader2, MapPin, ImageIcon, Edit, Trash2, X, XCircle, CheckCircle } from 'lucide-react';
import { SurveyData } from './types';
import { supabase } from '../../../services/supabase';

interface SurveyTableProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  loading: boolean;
  isShared: boolean;
  filteredSurveys: SurveyData[];
  openForm: (survey?: SurveyData) => void;
  setModalState: React.Dispatch<React.SetStateAction<any>>;
  handleReject: (id: string, currentStatus?: string) => Promise<void>;
}

export function SurveyTable({
  searchTerm,
  setSearchTerm,
  loading,
  isShared,
  filteredSurveys,
  openForm,
  setModalState,
  handleReject
}: SurveyTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [loadingPhotoId, setLoadingPhotoId] = useState<string | null>(null);
  const itemsPerPage = 50;

  const totalPages = Math.ceil(filteredSurveys.length / itemsPerPage);
  const paginatedData = filteredSurveys.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const prevPage = () => setCurrentPage(p => Math.max(1, p - 1));
  const nextPage = () => setCurrentPage(p => Math.min(totalPages, p + 1));

  const fetchAndShowPhoto = async (id: string) => {
    setLoadingPhotoId(id);
    try {
      const { data, error } = await supabase.from('survey_channel').select('foto_toko').eq('id', id).single();
      if (data?.foto_toko) {
        setSelectedPhoto(data.foto_toko);
      } else {
        alert('Foto toko tidak ditemukan');
      }
    } catch (e) {
      console.error(e);
      alert('Gagal memuat foto');
    } finally {
      setLoadingPhotoId(null);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3 border-b">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle className="text-lg flex items-center w-full sm:w-auto">
            <ClipboardList className="mr-2 h-5 w-5 text-indigo-500" />
            Data Survey
          </CardTitle>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Cari toko atau sales..." 
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-3">Toko / Alamat</th>
                <th className="px-4 py-3">Area</th>
                <th className="px-4 py-3">Sales / PIC</th>
                <th className="px-4 py-3">Omset LCD</th>
                <th className="px-4 py-3">Omset Batrai</th>
                <th className="px-4 py-3">Foto & Lokasi</th>
                <th className="px-4 py-3">Stok</th>
                <th className="px-4 py-3">Status</th>
                {!isShared && <th className="px-4 py-3 text-right">Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={isShared ? 8 : 9} className="px-4 py-8 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Memuat data...
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={isShared ? 8 : 9} className="px-4 py-8 text-center text-slate-500">
                    Belum ada data survey atau tidak ditemukan.
                  </td>
                </tr>
              ) : (
                paginatedData.map((survey) => (
                  <tr key={survey.id} className={`border-b hover:bg-slate-50 ${survey.status_validation === 'Rejected' ? 'bg-red-50/50' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-2">
                        <div>
                          <div className="font-medium text-slate-900 flex items-center gap-2">
                            {survey.nama_toko}
                            <button onClick={() => openForm(survey)} className="text-indigo-600 hover:text-indigo-800" title="Edit/Lengkapi Data">
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            {survey.status_validation === 'Rejected' && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-700 uppercase tracking-widest">Tidak Valid</span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 truncate max-w-[200px] whitespace-normal line-clamp-2">{survey.alamat_toko}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-900">{survey.cabang}</div>
                      <div className="text-xs text-slate-500">{survey.kecamatan}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-900">{survey.salesman_name}</div>
                      <div className="text-xs text-slate-500">{survey.no_telepon}</div>
                    </td>
                    <td className="px-4 py-3">Rp {survey.total_omset_lcd?.toLocaleString('id-ID')}</td>
                    <td className="px-4 py-3">Rp {survey.total_omset_batrai?.toLocaleString('id-ID')}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 items-center">
                        <button 
                          onClick={() => fetchAndShowPhoto(survey.id)} 
                          disabled={loadingPhotoId === survey.id}
                          className="text-indigo-600 hover:text-indigo-800 disabled:opacity-50" 
                          title="Lihat Foto"
                        >
                          {loadingPhotoId === survey.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <ImageIcon className="w-4 h-4" />
                          )}
                        </button>
                        {survey.latitude && survey.longitude ? (
                          <a href={`https://www.google.com/maps?q=${survey.latitude},${survey.longitude}`} target="_blank" rel="noreferrer" className="text-indigo-600 hover:text-indigo-800">
                            <span title="Lihat Lokasi"><MapPin className="w-4 h-4" /></span>
                          </a>
                        ) : (
                          <span title="Tidak ada lokasi"><MapPin className="w-4 h-4 text-slate-300" /></span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {survey.ada_stok_lcd_batrai ? (
                        <span className={`px-2 py-1 rounded-full text-[10px] font-medium ${
                          survey.ada_stok_lcd_batrai === 'Ada Keduanya' ? 'bg-emerald-50 text-emerald-700' :
                          survey.ada_stok_lcd_batrai.includes('Saja') ? 'bg-amber-50 text-amber-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {survey.ada_stok_lcd_batrai}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-medium ${survey.status_regist ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-700'}`}>
                        {survey.status_regist || 'Belum Regist'}
                      </span>
                    </td>
                    {!isShared && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => handleReject(survey.id, survey.status_validation)} 
                            className={`p-1 ${survey.status_validation === 'Rejected' ? 'text-emerald-500 hover:text-emerald-700' : 'text-orange-500 hover:text-orange-700'}`}
                          >
                            <span title={survey.status_validation === 'Rejected' ? 'Tandai Valid' : 'Tolak Survey (Tidak Valid)'}>
                              {survey.status_validation === 'Rejected' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                            </span>
                          </button>
                          <button onClick={() => openForm(survey)} className="text-indigo-600 hover:text-indigo-800 p-1">
                            <span title="Edit"><Edit className="w-4 h-4" /></span>
                          </button>
                          <button onClick={() => setModalState((prev: any) => ({ ...prev, confirmDeleteId: survey.id }))} className="text-red-500 hover:text-red-700 p-1">
                            <span title="Hapus"><Trash2 className="w-4 h-4" /></span>
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t bg-slate-50 rounded-b-lg">
          <div className="text-sm text-slate-500">
            Menampilkan {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredSurveys.length)} dari {filteredSurveys.length} data
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={prevPage} disabled={currentPage === 1}>Sebelumnya</Button>
            <Button variant="outline" size="sm" onClick={nextPage} disabled={currentPage === totalPages}>Selanjutnya</Button>
          </div>
        </div>
      )}

      {selectedPhoto && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedPhoto(null)}>
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col pt-12 items-center" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-0 right-0 p-2 text-white/70 hover:text-white bg-black/50 hover:bg-black rounded-full transition-all"
            >
              <X className="w-6 h-6" />
            </button>
            <img 
              src={selectedPhoto} 
              alt="Foto Toko" 
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" 
            />
          </div>
        </div>
      )}
    </Card>
  );
}
