import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { Edit2 } from 'lucide-react';
import { GenieModal } from './GenieModal';

interface PromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (value: string) => void;
  title: string;
  message: string;
  initialValue?: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'text' | 'number';
}

export function PromptModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  initialValue = '',
  confirmText = 'Simpan',
  cancelText = 'Batal',
  type = 'text'
}: PromptModalProps) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (isOpen) {
      setValue(initialValue);
    }
  }, [isOpen, initialValue]);

  return (
    <GenieModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="max-w-md"
    >
      <div className="space-y-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg shrink-0 bg-blue-50 text-blue-600">
            <Edit2 className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-500 leading-relaxed mb-4">
              {message}
            </p>
            <input
              type={type}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border-none rounded-lg text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all placeholder:text-slate-300"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && value.trim()) {
                  onConfirm(value);
                  onClose();
                }
              }}
            />
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} type="button" className="text-slate-500 font-bold rounded-lg">
            {cancelText}
          </Button>
          <Button 
            onClick={() => {
              if (value.trim() !== '') {
                onConfirm(value);
                onClose();
              }
            }}
            disabled={value.trim() === ''}
            type="button"
            className="px-8 rounded-lg font-black bg-slate-900 hover:bg-slate-700 text-white shadow-lg"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </GenieModal>
  );
}
