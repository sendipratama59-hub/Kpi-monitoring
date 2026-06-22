import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Plus, Database, ChevronRight, FileSpreadsheet, Trash2 } from 'lucide-react';
import { useAlert } from '../../ui/AlertModal';
import { supabase } from '../../../services/supabase';
import { CreateAppModal } from './CreateAppModal';
import { DynamicTableViewer } from './DynamicTableViewer';

export interface DynamicApp {
  id: string;
  name: string;
  description: string;
  config: { columns: string[], periodMonth?: number, periodYear?: number };
  created_at: string;
}

const getMonthName = (month?: number) => {
  if (!month) return '';
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  return months[month - 1] || '';
};

export default function DynamicExcelManager() {
  const [apps, setApps] = useState<DynamicApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<DynamicApp | null>(null);
  const { showAlert } = useAlert();

  useEffect(() => {
    fetchApps();
  }, []);

  const fetchApps = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('dynamic_apps').select('*').order('created_at', { ascending: false });
      if (error) {
        // Table might not exist yet if user hasn't run setup
        if (error.code !== '42P01') throw error;
      }
      setApps(data || []);
    } catch (err: any) {
      console.error('Error fetching dynamic apps:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteApp = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (!window.confirm(`Yakin ingin menghapus tabel "${name}" beserta seluruh isinya?`)) return;
    
    try {
      const { error } = await supabase.from('dynamic_apps').delete().eq('id', id);
      if (error) throw error;
      showAlert('Tabel berhasil dihapus', 'success');
      if (selectedApp?.id === id) setSelectedApp(null);
      fetchApps();
    } catch (err: any) {
      showAlert(err.message, 'error');
    }
  };

  if (selectedApp) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
          <button onClick={() => setSelectedApp(null)} className="hover:text-indigo-600 transition-colors">Dynamic Excel Manager</button>
          <ChevronRight className="w-4 h-4" />
          <span className="font-bold text-slate-800">{selectedApp.name}</span>
        </div>
        <DynamicTableViewer app={selectedApp} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Database className="w-6 h-6 text-indigo-500" />
            Dynamic Excel Manager
          </h2>
          <p className="text-sm text-slate-500 mt-1">Buat custom database tabel dari file excel anda dengan mudah</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" /> Buat Tabel Baru
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : apps.length === 0 ? (
        <Card className="border-dashed border-2 border-slate-200 bg-slate-50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="p-4 bg-indigo-100 rounded-full text-indigo-500 mb-4">
              <FileSpreadsheet className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-700 mb-2">Belum Ada Tabel Custom</h3>
            <p className="text-sm text-slate-500 text-center max-w-sm mb-6">
              Anda belum membuat custom database. Klik tombol di atas untuk membuat tabel baru dari file excel Anda.
            </p>
            <Button onClick={() => setIsCreateOpen(true)} variant="outline" className="text-indigo-600 border-indigo-200 hover:bg-indigo-50">
              Mulai Buat Tabel
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {apps.map(app => (
            <Card 
              key={app.id} 
              className="hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group"
              onClick={() => setSelectedApp(app)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Database className="w-5 h-5" />
                  </div>
                  <button 
                    onClick={(e) => handleDeleteApp(e, app.id, app.name)}
                    className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                    title="Hapus tabel"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <h3 className="font-bold text-slate-800 text-lg mb-1 truncate">{app.name}</h3>
                <p className="text-xs text-slate-500 mb-4 line-clamp-2 min-h-[32px]">{app.description || 'Tidak ada deskripsi'}</p>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-400 border-t border-slate-100 pt-4">
                  <div className="flex flex-col gap-1">
                    <span>{app.config.columns?.length || 0} Kolom</span>
                    {app.config.periodMonth && app.config.periodYear && (
                      <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-1 w-max">Periode: {getMonthName(app.config.periodMonth)} {app.config.periodYear}</span>
                    )}
                  </div>
                  <span className="flex items-center text-indigo-600 group-hover:underline">
                    Buka Data <ChevronRight className="w-3 h-3 ml-1" />
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateAppModal 
        isOpen={isCreateOpen} 
        onClose={() => setIsCreateOpen(false)} 
        onSuccess={() => {
          setIsCreateOpen(false);
          fetchApps();
        }}
      />
    </div>
  );
}
