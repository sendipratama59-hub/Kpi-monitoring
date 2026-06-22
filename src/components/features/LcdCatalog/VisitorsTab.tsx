import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/Card';
import { supabase } from '../../../services/supabase';
import { Users, Clock, MonitorSmartphone, MousePointerClick } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

interface Visitor {
  visitor_id: string;
  first_visit: string;
  last_active: string;
  visit_count: number;
  device_info: string;
  last_path: string;
}

export function VisitorsTab() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeNow, setActiveNow] = useState(0);
  
  useEffect(() => {
    fetchVisitors();
    const interval = setInterval(fetchVisitors, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchVisitors = async () => {
    try {
      const { data, error } = await supabase
        .from('lcd_catalog_visitors')
        .select('*')
        .order('last_active', { ascending: false });
        
      if (!error && data) {
        setVisitors(data as Visitor[]);
        
        // Calculate active now (last 5 minutes)
        const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).getTime();
        const active = data.filter(v => new Date(v.last_active).getTime() > fiveMinsAgo);
        setActiveNow(active.length);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  const getDeviceName = (userAgent: string) => {
    if (!userAgent) return 'Unknown';
    if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) return 'Mobile';
    if (userAgent.includes('Tablet') || userAgent.includes('iPad')) return 'Tablet';
    return 'Desktop';
  };
  
  const formatUrlPath = (path: string) => {
    if (!path) return 'Halaman Utama';
    const params = new URLSearchParams(path);
    const mode = params.get('mode');
    return mode ? `Mode: ${mode}` : 'Direct Link';
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-indigo-100 shadow-sm border-t-4 border-t-emerald-500">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-600">
                <Users className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-500 mb-1">Total Kunjungan Unik (Pernah Melihat)</p>
                <div className="text-3xl font-black text-slate-800">{visitors.length} 
                  <span className="text-sm font-normal text-slate-400 ml-2">Perangkat</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-indigo-100 shadow-sm border-t-4 border-t-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-4 flex relative rounded-2xl bg-blue-50 text-blue-600">
                <span className="absolute top-2 right-2 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                </span>
                <Clock className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-500 mb-1">Sedang Melihat (Real-Time)</p>
                <div className="text-3xl font-black text-blue-700">{activeNow}
                  <span className="text-sm font-normal text-slate-400 ml-2">Device Aktif (5 Mnt Terakhir)</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card className="border-indigo-100 shadow-sm">
        <CardHeader className="bg-indigo-50/50 border-b border-indigo-100 flex flex-row items-center justify-between pb-3 relative overflow-hidden">
           <CardTitle className="text-indigo-800 text-lg font-black flex items-center gap-2">
             <MousePointerClick className="w-5 h-5" /> 
             Riwayat Pengunjung
           </CardTitle>
           <button 
             onClick={fetchVisitors} 
             className="text-xs font-bold bg-white border border-indigo-200 px-3 py-1.5 rounded-lg shadow-sm hover:bg-indigo-50 text-indigo-700 transition"
           >
             Refresh Data
           </button>
        </CardHeader>
        <div className="overflow-x-auto w-full">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-indigo-50 text-indigo-800 border-b border-indigo-100">
              <tr>
                <th className="px-4 py-3">ID Visitor (Anonim)</th>
                <th className="px-4 py-3">Terakhir Dilihat</th>
                <th className="px-4 py-3">Device</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-500">Memuat data...</td>
                </tr>
              ) : visitors.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-500 italic">Belum ada pengunjung.</td>
                </tr>
              ) : (
                visitors.map((v) => {
                  const isActive = new Date(v.last_active).getTime() > Date.now() - 5 * 60 * 1000;
                  return (
                    <tr key={v.visitor_id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs text-slate-500">{v.visitor_id.substring(0, 8)}...</div>
                        <div className="text-[10px] text-slate-400 mt-1 max-w-[200px] truncate" title={v.device_info}>{formatUrlPath(v.last_path)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-700">
                          {formatDistanceToNow(new Date(v.last_active), { addSuffix: true })}
                        </div>
                        <div className="text-xs text-slate-400">
                          {format(new Date(v.last_active), 'dd MMM yyyy, HH:mm')}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-slate-600 bg-slate-100 px-2 py-1 rounded-lg w-max text-xs font-medium border border-slate-200">
                          <MonitorSmartphone className="w-3.5 h-3.5" />
                          {getDeviceName(v.device_info)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {isActive ? (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-bold flex items-center w-max gap-1">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                            </span>
                            Sedang Melihat
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-bold">
                            Offline
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
