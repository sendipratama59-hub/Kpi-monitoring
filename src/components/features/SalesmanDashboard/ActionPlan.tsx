import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { Calendar, MapPin, Phone } from 'lucide-react';
import { Piutang, UnvisitedCustomer } from './types';

interface ActionPlanProps {
  unvisitedCustomers: UnvisitedCustomer[];
  piutangList: Piutang[];
}

export function ActionPlan({ unvisitedCustomers, piutangList }: ActionPlanProps) {
  const formatRupiahFull = (val: number | null | undefined) => {
    if (!val) return "Rp 0";
    return "Rp " + val.toLocaleString("id-ID");
  };

  return (
    <>
      <h3 className="text-lg font-bold text-slate-800 mt-8 mb-4 flex items-center gap-2">
        <Calendar className="w-5 h-5 text-indigo-600" />
        Tugas & Fokus Hari Ini
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-indigo-100 shadow-sm">
          <CardHeader className="bg-indigo-50/50 border-b border-indigo-100 pb-3">
            <CardTitle className="text-base text-indigo-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-indigo-600" />
              Kunjungan Prioritas (Belum Order Bulan Ini)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
              {unvisitedCustomers.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">
                  Semua toko sudah order atau tidak ada data toko.
                </div>
              ) : (
                unvisitedCustomers.map((store, i) => (
                  <div
                    key={i}
                    className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div>
                      <h4 className="font-bold text-slate-800">{store.customer_name}</h4>
                      <p className="text-xs text-slate-500">ID: {store.customer_code || '-'}</p>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <button className="text-xs text-indigo-600 font-medium hover:underline bg-indigo-50 px-3 py-1 rounded">
                        Buat Rute / Kunjungi
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            {unvisitedCustomers.length > 0 && (
              <div className="p-3 bg-slate-50 text-center border-t border-slate-100">
                <button className="text-sm text-indigo-600 font-bold hover:underline">
                  Tampilkan lebih banyak...
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-rose-100 shadow-sm">
          <CardHeader className="bg-rose-50/50 border-b border-rose-100 pb-3">
            <CardTitle className="text-base text-rose-900 flex items-center gap-2">
              <Phone className="w-4 h-4 text-rose-600" />
              Follow Up Tagihan Terbesar
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
              {piutangList.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">
                  Tidak ada data tagihan.
                </div>
              ) : (
                piutangList.map((piutang, i) => (
                  <div
                    key={i}
                    className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div>
                      <h4 className="font-bold text-slate-800">{piutang.customer_name}</h4>
                      <p className="text-xs font-medium text-rose-600">
                        Faktur: {piutang.delivery_no || '-'}
                      </p>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <span className="text-sm font-bold text-slate-700">
                        {formatRupiahFull(piutang.total_amount)}
                      </span>
                      <button className="mt-2 text-xs bg-rose-100 text-rose-700 px-3 py-1 rounded font-bold hover:bg-rose-200">
                        Hubungi
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
