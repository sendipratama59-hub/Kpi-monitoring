import React, { useState } from 'react';
import { Card, CardContent } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Loader2, Save } from 'lucide-react';
import { useAlert } from '../../ui/AlertModal';

import { GenieModal } from '../../ui/GenieModal';

interface TargetModalProps {
  isOpen: boolean;
  targetForms: { salesman_name: string; target_value: number }[];
  setTargetForms: React.Dispatch<React.SetStateAction<{ salesman_name: string; target_value: number }[]>>;
  selectedSalesmen: string[];
  setSelectedSalesmen: React.Dispatch<React.SetStateAction<string[]>>;
  isSaving: boolean;
  setIsTargetModalOpen: (val: boolean) => void;
  handleSaveTargets: () => void;
  setModalState: React.Dispatch<React.SetStateAction<any>>;
}

export function TargetModal({
  isOpen,
  targetForms,
  setTargetForms,
  selectedSalesmen,
  setSelectedSalesmen,
  isSaving,
  setIsTargetModalOpen,
  handleSaveTargets,
  setModalState
}: TargetModalProps) {
  const { showAlert } = useAlert();
  
  return (
    <GenieModal
      isOpen={isOpen}
      onClose={() => setIsTargetModalOpen(false)}
      title="Set Target Survey"
      subtitle="Atur target bulanan untuk setiap salesman"
      maxWidth="max-w-4xl"
    >
      <div className="space-y-6">
        <div className="space-y-4">
          {targetForms.length > 0 && (
            <div className="flex items-center gap-2 px-1">
              <input 
                type="checkbox" 
                id="selectAll"
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                checked={selectedSalesmen.length === targetForms.length}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedSalesmen(targetForms.map(t => t.salesman_name));
                  } else {
                    setSelectedSalesmen([]);
                  }
                }}
              />
              <label htmlFor="selectAll" className="text-sm font-medium text-slate-700 select-none cursor-pointer">
                Pilih Semua
              </label>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {targetForms.map((tf, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 border rounded-xl bg-slate-50 transition-all hover:border-indigo-200 group">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                  checked={selectedSalesmen.includes(tf.salesman_name)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedSalesmen(prev => [...prev, tf.salesman_name]);
                    } else {
                      setSelectedSalesmen(prev => prev.filter(name => name !== tf.salesman_name));
                    }
                  }}
                />
                <div className="flex-1 font-bold text-slate-700 cursor-pointer select-none text-sm" onClick={() => {
                    if (selectedSalesmen.includes(tf.salesman_name)) {
                      setSelectedSalesmen(prev => prev.filter(name => name !== tf.salesman_name));
                    } else {
                      setSelectedSalesmen(prev => [...prev, tf.salesman_name]);
                    }
                }}>
                  {tf.salesman_name}
                </div>
                <div className="w-24">
                  <input 
                    type="number" 
                    value={tf.target_value || ''}
                    onChange={(e) => {
                      const newForms = [...targetForms];
                      newForms[idx].target_value = Number(e.target.value);
                      setTargetForms(newForms);
                    }}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-center font-black text-indigo-600 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
                </div>
              </div>
            ))}
            {targetForms.length === 0 && (
              <div className="md:col-span-2 text-center py-8 bg-slate-50 rounded-xl border-2 border-dashed border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-widest">
                Belum ada data sales yang diatur.
              </div>
            )}
          </div>
          
          <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                type="button" 
                onClick={() => {
                  if (selectedSalesmen.length === 0) {
                    return showAlert('Pilih minimal satu sales untuk mengatur target!', 'warning');
                  }
                  setModalState((prev: any) => ({ ...prev, promptTarget: true }));
                }}
                className="rounded-lg border-indigo-200 text-indigo-600 font-bold px-4 hover:bg-indigo-50"
              >
                Set Target Terpilih
              </Button>
              <Button 
                variant="outline" 
                type="button" 
                onClick={() => {
                  if (selectedSalesmen.length === 0) {
                    return showAlert('Pilih minimal satu sales untuk menghapus target!', 'warning');
                  }
                  setModalState((prev: any) => ({ ...prev, confirmDeleteTarget: true }));
                }}
                className="rounded-lg border-rose-100 text-rose-500 font-bold px-4 hover:bg-rose-50"
              >
                Reset Terpilih
              </Button>
            </div>
            
            <div className="flex gap-3 w-full sm:w-auto">
              <Button variant="ghost" type="button" onClick={() => setIsTargetModalOpen(false)} className="flex-1 sm:flex-none font-bold rounded-lg">Batal</Button>
              <Button 
                disabled={isSaving || targetForms.length === 0}
                onClick={handleSaveTargets}
                className="flex-1 sm:flex-none rounded-lg bg-slate-900 hover:bg-slate-700 text-white font-black shadow-lg shadow-slate-200 px-8"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> SIMPAN </>}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </GenieModal>
  );
}
