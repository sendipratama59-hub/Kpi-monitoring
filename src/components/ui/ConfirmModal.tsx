import React from 'react';
import { Button } from './Button';
import { AlertTriangle } from 'lucide-react';
import { GenieModal } from './GenieModal';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Ya',
  cancelText = 'Batal',
  isDestructive = false
}: ConfirmModalProps) {
  return (
    <GenieModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="max-w-md"
    >
      <div className="space-y-6">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-lg shrink-0 ${isDestructive ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'}`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-500 leading-relaxed">
              {message}
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} type="button" className="text-slate-500 font-bold rounded-lg">
            {cancelText}
          </Button>
          <Button 
            onClick={() => {
              onConfirm();
              onClose();
            }}
            type="button"
            className={`px-8 rounded-lg font-black shadow-lg ${isDestructive ? "bg-red-600 hover:bg-red-700 text-white" : "bg-slate-900 hover:bg-slate-700 text-white"}`}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </GenieModal>
  );
}
