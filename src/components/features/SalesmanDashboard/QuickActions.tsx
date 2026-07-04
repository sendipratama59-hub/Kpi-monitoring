import React from 'react';
import { TrendingUp, CheckCircle, MapPin, AlertCircle } from 'lucide-react';

export function QuickActions() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
      <button className="flex flex-col items-center justify-center p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-indigo-500 hover:shadow-md transition-all group">
        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
          <TrendingUp className="w-6 h-6" />
        </div>
        <span className="font-bold text-slate-700 text-sm">Input Order Baru</span>
      </button>
      <button className="flex flex-col items-center justify-center p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-indigo-500 hover:shadow-md transition-all group">
        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
          <CheckCircle className="w-6 h-6" />
        </div>
        <span className="font-bold text-slate-700 text-sm">Lapor Kunjungan</span>
      </button>
      <button className="flex flex-col items-center justify-center p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-indigo-500 hover:shadow-md transition-all group">
        <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
          <MapPin className="w-6 h-6" />
        </div>
        <span className="font-bold text-slate-700 text-sm">Absen di Toko</span>
      </button>
      <button className="flex flex-col items-center justify-center p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-indigo-500 hover:shadow-md transition-all group">
        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
          <AlertCircle className="w-6 h-6" />
        </div>
        <span className="font-bold text-slate-700 text-sm">Bantuan Kendala</span>
      </button>
    </div>
  );
}
