import React from 'react';
import { X, Info, AlertTriangle, DollarSign, Search, Navigation, MapPin } from 'lucide-react';

interface PricingInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PricingInfoModal({ isOpen, onClose }: PricingInfoModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-2 rounded-lg">
              <DollarSign className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Informasi Biaya & Limit API Google Maps</h2>
              <p className="text-xs text-slate-500">Estimasi berdasarkan harga publik Google Maps Platform</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
             <div className="flex gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <div className="text-sm text-amber-800 text-justify">
                   <strong>Penting tentang "Total Biaya":</strong> Aplikasi ini tidak dapat menarik data tagihan <em>real-time</em> secara langsung dari Google Cloud karena memerlukan akses ke Billing API yang sangat kompleks (serta tidak aman ditaruh di sisi klien). Namun setiap bulan <strong>Google memberikan kredit gratis sebesar $200 (sekitar Rp 3.200.000)</strong> per akun penagihan. Jika Anda melewati penggunaan batas ini, tagihan akan mulai dibebankan ke akun Anda.
                </div>
             </div>
          </div>

          <h3 className="text-md font-bold text-slate-800 mb-4">API yang Digunakan Dalam Fitur Ini</h3>
          
          <div className="space-y-4">
             {/* Text Search */}
             <div className="border border-slate-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                   <h4 className="font-bold text-slate-800 flex items-center gap-2">
                      <Search className="w-4 h-4 text-blue-500"/> Places API New (Text Search)
                   </h4>
                   <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded">Pencarian Toko</span>
                </div>
                <p className="text-sm text-slate-600 mb-2 border-b border-slate-100 pb-2">
                   Digunakan saat Anda melakukan Pencarian Masal (Ketik Keyword -{'>'} Cari). 1 request dihitung setiap kali mencari (bukan per toko yang muncul, melainkan per panggil/halaman).
                </p>
                <div className="text-xs text-slate-500 grid gap-1">
                   <div className="flex justify-between"><span>Estimasi Biaya per 1000 request:</span> <span className="font-mono text-slate-700">~$32.00 (Rp 512.000)</span></div>
                   <div className="flex justify-between"><span>Batas Gratis / Bulan ($200):</span> <span className="font-mono text-slate-700">~6.250 request</span></div>
                </div>
             </div>

             {/* Distance Matrix */}
             <div className="border border-slate-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                   <h4 className="font-bold text-slate-800 flex items-center gap-2">
                      <Navigation className="w-4 h-4 text-emerald-500"/> Routes API (Compute Route Matrix)
                   </h4>
                   <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded">Jarak Akurat (Jalan)</span>
                </div>
                <p className="text-sm text-slate-600 mb-2 border-b border-slate-100 pb-2">
                   Digunakan semata-mata untuk menghitung jarak "Berkendara" dari asal ke tujuan. Dihitung per "Elemen" (1 Origin ditarik garis ke 1 Destinasi). Aksi klik "Muatkan Jarak Google Maps Akurat" akan mengkonsumsi kuota ini.
                </p>
                <div className="text-xs text-slate-500 grid gap-1 border-b border-slate-100 pb-2 mb-2">
                   <div className="flex justify-between font-bold text-slate-700"><span>Paket Essentials (Rute Dasar)</span></div>
                   <div className="flex justify-between"><span>Biaya per 1000 elemen:</span> <span className="font-mono text-slate-700">~$5.00 (Rp 80.000)</span></div>
                   <div className="flex justify-between"><span>Batas Gratis / Bulan ($200) max:</span> <span className="font-mono text-slate-700">10.000 elemen gratis</span></div>
                </div>
                <div className="text-xs text-slate-500 grid gap-1">
                   <div className="flex justify-between font-bold text-slate-700"><span>Paket Enterprise (Rute dg Traffic dll)</span></div>
                   <div className="flex justify-between"><span>Biaya per 1000 elemen:</span> <span className="font-mono text-slate-700">~$10.00 (Rp 160.000)</span></div>
                   <div className="flex justify-between"><span>Batas Gratis / Bulan ($200) max:</span> <span className="font-mono text-slate-700">1.000 elemen gratis</span></div>
                </div>
             </div>
             
             {/* Place Details */}
             <div className="border border-slate-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                   <h4 className="font-bold text-slate-800 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-rose-500"/> Places API (Details / By ID)
                   </h4>
                   <span className="text-xs font-bold bg-rose-100 text-rose-700 px-2 py-1 rounded">Ekstrak Link</span>
                </div>
                <p className="text-sm text-slate-600 mb-2 border-b border-slate-100 pb-2">
                   Digunakan ketika Anda memasukkan Link Google Maps secara manual. Akan membaca Detail toko berdasarkan Place ID.
                </p>
                <div className="text-xs text-slate-500 grid gap-1">
                   <div className="flex justify-between"><span>Estimasi Biaya per 1000 request:</span> <span className="font-mono text-slate-700">~$17.00 (Rp 272.000)</span></div>
                   <div className="flex justify-between"><span>Batas Gratis / Bulan ($200):</span> <span className="font-mono text-slate-700">~11.764 request</span></div>
                </div>
             </div>
          </div>
          
          <div className="mt-6 p-4 bg-slate-50 rounded-lg text-sm text-slate-600">
             <p className="mb-2"><strong>Tips Menghindari Tagihan Bengkak:</strong></p>
             <ul className="list-disc pl-5 space-y-1">
                <li>Tetapkan <strong>Quota Limits per Day</strong> di console Google Cloud (https://console.cloud.google.com/apis/api/routes.googleapis.com/quotas) agar API berhenti otomatis sebelum melewati batas gratis harian.</li>
                <li>Pada <strong>Pencarian Masal</strong>, pastikan menggunakan kata kuci secukupnya.</li>
                <li>Untuk Jarak, andalkan sistem bawaan jarak Garis Lurus (Gratis) atau Server OSRM (Gratis). Jangan terlalu sering me-refresh <em>Muatkan Jarak Akurat menggunakan Google Maps</em> jika jumlah list tokonya sangat banyak (misal ratusan). 100 toko = 100 elemen API.</li>
             </ul>
          </div>
        </div>
        
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
           <button 
             onClick={onClose}
             className="px-6 py-2 bg-slate-800 text-white rounded-md text-sm font-bold hover:bg-slate-900 transition-colors"
           >
              Saya Mengerti
           </button>
        </div>
      </div>
    </div>
  );
}
