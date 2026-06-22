import React from 'react';

interface MapsSyncStatusProps {
  syncState: {
    total: number;
    current: number;
    logs: string[];
    isPaused: boolean;
    shouldStop: boolean;
    active: boolean;
  };
  setSyncState: React.Dispatch<React.SetStateAction<any>>;
}

export function MapsSyncStatus({ syncState, setSyncState }: MapsSyncStatusProps) {
  if (!syncState.active) return null;

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-4 shadow-inner relative overflow-hidden">
        <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-bold text-slate-800">Proses Perbaikan Data (Geocoding)</h4>
            <div className="flex gap-2">
                <button 
                  onClick={() => setSyncState((prev: any) => ({ ...prev, isPaused: !prev.isPaused }))}
                  className={`px-3 py-1 text-[10px] font-bold rounded-full transition-colors ${syncState.isPaused ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-700'}`}
                >
                  {syncState.isPaused ? 'Lanjutkan Laju' : 'Jeda Sejenak'}
                </button>
                <button 
                  onClick={() => setSyncState((prev: any) => ({ ...prev, shouldStop: true }))}
                  className="px-3 py-1 bg-red-100 text-red-700 text-[10px] font-bold rounded-full transition-colors"
                >
                  Berhenti
                </button>
            </div>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2.5 mb-2 overflow-hidden shadow-inner">
            <div className="bg-teal-500 h-2.5 rounded-full transition-all duration-300" style={{ width: `${syncState.total > 0 ? (syncState.current / syncState.total) * 100 : 0}%` }}></div>
        </div>
        <div className="flex justify-between text-[11px] text-slate-500 font-bold mb-4">
            <span>{syncState.current} dari {syncState.total} toko diproses</span>
            <span>{syncState.total > 0 ? Math.round((syncState.current / syncState.total) * 100) : 0}% Selesai</span>
        </div>
        
        <div className="bg-slate-900 rounded-md border border-slate-700 p-3 h-32 overflow-y-auto w-full font-mono text-[10px] leading-relaxed">
            <ul className="space-y-1">
                {syncState.logs.length === 0 ? (
                   <li className="text-slate-400 animate-pulse">Menyiapkan koneksi Geocoding...</li>
                ) : (
                   syncState.logs.map((log, i) => (
                      <li key={i} className={`${log.includes('[Error]') ? 'text-rose-400 font-bold' : log.includes('[Sukses]') ? 'text-teal-400 font-bold' : 'text-slate-400'}`}>
                         {log}
                      </li>
                   ))
                )}
            </ul>
        </div>
    </div>
  );
}
