import React from 'react';
import { Salesman } from './types';

interface SalesmanSelectorProps {
  salesmen: Salesman[];
  selectedCode: string;
  onSelect: (code: string) => void;
}

export function SalesmanSelector({ salesmen, selectedCode, onSelect }: SalesmanSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-slate-600">Salesman:</span>
      <select
        value={selectedCode}
        onChange={(e) => onSelect(e.target.value)}
        className="border-slate-300 rounded-md text-sm shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
      >
        <option value="" disabled>Pilih Salesman</option>
        {salesmen.map(s => (
          <option key={s.code} value={s.code}>{s.name}</option>
        ))}
      </select>
    </div>
  );
}
