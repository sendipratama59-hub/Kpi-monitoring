import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { Search, User, Calendar, X } from 'lucide-react';
import { cn } from '../../../utils/cn';

export interface Customer {
  customer_code: string;
  customer_name: string;
}

interface ReturCustomerSectionProps {
  customers: Customer[];
  selectedCustomer: Customer | null;
  onSelectCustomer: (cust: Customer | null) => void;
  returnDate: string;
  onReturnDateChange: (date: string) => void;
  isLcdMode: boolean;
}

export function ReturCustomerSection({
  customers,
  selectedCustomer,
  onSelectCustomer,
  returnDate,
  onReturnDateChange,
  isLcdMode
}: ReturCustomerSectionProps) {
  const [custSearch, setCustSearch] = useState('');
  const [showCustDropdown, setShowCustDropdown] = useState(false);

  const filteredCustomers = customers.filter(c =>
    (c.customer_name || '').toLowerCase().includes(custSearch.toLowerCase()) ||
    (c.customer_code || '').toLowerCase().includes(custSearch.toLowerCase())
  ).slice(0, 15);

  return (
    <Card className="border-none shadow-xl shadow-slate-200/50 overflow-visible h-full">
      <CardHeader className="border-b border-slate-50 bg-slate-50/30">
        <CardTitle className="text-base flex items-center justify-between text-slate-800">
          <span className="flex items-center">
            <User className="w-4 h-4 mr-2 text-indigo-500" />
            Customer & Tanggal
          </span>
          {isLcdMode && (
            <span className="text-[9px] font-black uppercase tracking-wider text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded-full border border-cyan-100">
              LCD Mode
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5 space-y-4">
        {selectedCustomer && (
          <div className="flex items-center justify-between p-3 bg-indigo-50/80 border border-indigo-100 rounded-xl text-xs">
            <div className="truncate pr-2">
              <div className="font-black text-indigo-950 truncate text-sm">
                {selectedCustomer.customer_name}
              </div>
              <div className="text-[11px] font-bold text-indigo-600 font-mono mt-0.5">
                ID TOKO: {selectedCustomer.customer_code || '-'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onSelectCustomer(null)}
              className="text-indigo-400 hover:text-indigo-700 p-1.5 shrink-0 bg-white/80 rounded-lg transition-colors cursor-pointer"
              title="Ganti Customer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="space-y-2 relative" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-end">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {selectedCustomer ? 'Ganti Toko / Customer' : 'Pilih Toko / Customer'}
            </label>
            <span className="text-[9px] font-bold text-slate-400">
              {customers.length} Toko Tersedia
            </span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Ketik nama atau kode customer..."
              value={custSearch}
              onChange={(e) => {
                setCustSearch(e.target.value);
                setShowCustDropdown(true);
              }}
              onFocus={() => setShowCustDropdown(true)}
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
          </div>

          {showCustDropdown && custSearch && (
            <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-2xl border border-slate-100 py-1 max-h-60 overflow-y-auto">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map(c => (
                  <button
                    key={`${c.customer_code}-${c.customer_name}`}
                    type="button"
                    onClick={() => {
                      onSelectCustomer(c);
                      setShowCustDropdown(false);
                      setCustSearch('');
                    }}
                    className="w-full px-4 py-2 hover:bg-indigo-50/70 text-left flex flex-col transition-colors cursor-pointer border-b border-slate-50 last:border-0"
                  >
                    <span className="text-sm font-bold text-slate-700">{c.customer_name}</span>
                    <span className="text-[10px] font-mono text-slate-400 font-semibold">{c.customer_code}</span>
                  </button>
                ))
              ) : (
                <div className="px-4 py-3 text-xs text-slate-400 italic">Customer tidak ditemukan</div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-2 pt-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Tanggal Retur
          </label>
          <div className="relative">
            <Calendar className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="date"
              value={returnDate}
              onChange={(e) => onReturnDateChange(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
