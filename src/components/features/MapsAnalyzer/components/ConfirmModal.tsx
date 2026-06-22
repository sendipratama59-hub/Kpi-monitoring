import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({ isOpen, title, message, onConfirm, onCancel }: ConfirmModalProps) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm border border-slate-100 animate-in fade-in zoom-in duration-200">
        <h3 className="text-lg font-bold text-slate-800 mb-2">{title}</h3>
        <p className="text-slate-600 text-sm mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
           <button 
             onClick={onCancel}
             className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition-colors text-sm"
           >
             Batal
           </button>
           <button 
             onClick={onConfirm}
             className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors shadow-sm text-sm"
           >
             Ya, Lanjutkan
           </button>
        </div>
      </div>
    </div>
  );
}
