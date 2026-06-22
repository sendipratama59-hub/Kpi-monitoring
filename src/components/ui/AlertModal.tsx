import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X, CheckCircle2, AlertCircle, Info } from 'lucide-react';

import { GenieModal } from './GenieModal';

type AlertType = 'success' | 'error' | 'info' | 'warning';

interface AlertState {
  isOpen: boolean;
  message: string;
  type: AlertType;
  title?: string;
  onConfirm?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
}

interface AlertContextType {
  showAlert: (message: string, type?: AlertType, title?: string) => void;
  showConfirm: (options: { 
    message: string; 
    title?: string; 
    onConfirm: () => void;
    confirmLabel?: string;
    cancelLabel?: string;
    type?: AlertType;
  }) => void;
  hideAlert: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [alert, setAlert] = useState<AlertState>({
    isOpen: false,
    message: '',
    type: 'info'
  });

  const showAlert = useCallback((message: string, type: AlertType = 'info', title?: string) => {
    setAlert({ isOpen: true, message, type, title, onConfirm: undefined });
  }, []);

  const showConfirm = useCallback((options: { 
    message: string; 
    title?: string; 
    onConfirm: () => void;
    confirmLabel?: string;
    cancelLabel?: string;
    type?: AlertType;
  }) => {
    setAlert({ 
      isOpen: true, 
      message: options.message, 
      type: options.type || 'warning', 
      title: options.title || 'Konfirmasi',
      onConfirm: options.onConfirm,
      confirmLabel: options.confirmLabel || 'YA, LANJUTKAN',
      cancelLabel: options.cancelLabel || 'BATAL'
    });
  }, []);

  const hideAlert = useCallback(() => {
    setAlert(prev => ({ ...prev, isOpen: false }));
  }, []);

  const handleConfirm = () => {
    if (alert.onConfirm) {
      alert.onConfirm();
    }
    hideAlert();
  };

  const getTheme = () => {
    switch (alert.type) {
      case 'success':
        return {
          bg: 'bg-emerald-50/50',
          border: 'border-emerald-100',
          text: 'text-emerald-800',
          icon: <CheckCircle2 className="w-6 h-6 text-emerald-500" />,
          btn: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200',
          secondaryBtn: 'text-emerald-600 hover:bg-emerald-100'
        };
      case 'error':
        return {
          bg: 'bg-rose-50/50',
          border: 'border-rose-100',
          text: 'text-rose-800',
          icon: <AlertCircle className="w-6 h-6 text-rose-500" />,
          btn: 'bg-rose-600 hover:bg-rose-700 shadow-rose-200',
          secondaryBtn: 'text-rose-600 hover:bg-rose-100'
        };
      case 'warning':
        return {
          bg: 'bg-amber-50/50',
          border: 'border-amber-100',
          text: 'text-amber-800',
          icon: <AlertCircle className="w-6 h-6 text-amber-500" />,
          btn: 'bg-amber-600 hover:bg-amber-700 shadow-amber-200',
          secondaryBtn: 'text-amber-600 hover:bg-amber-100'
        };
      default:
        return {
          bg: 'bg-indigo-50/50',
          border: 'border-indigo-100',
          text: 'text-indigo-800',
          icon: <Info className="w-6 h-6 text-indigo-500" />,
          btn: 'bg-slate-900 hover:bg-slate-800 shadow-slate-200',
          secondaryBtn: 'text-slate-600 hover:bg-slate-100'
        };
    }
  };

  const theme = getTheme();

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm, hideAlert }}>
      {children}
      <GenieModal
        isOpen={alert.isOpen}
        onClose={hideAlert}
        title={alert.title || (alert.type === 'error' ? 'Oops!' : alert.type === 'success' ? 'Berhasil!' : 'Perhatian')}
        maxWidth="max-w-sm"
      >
        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <div className={`flex-shrink-0 p-3 bg-white rounded-lg shadow-sm border ${theme.border}`}>
              {theme.icon}
            </div>
            <div className="flex-1 min-w-0 pt-1">
              <p className={`text-sm font-bold leading-relaxed ${theme.text}`}>
                {alert.message}
              </p>
            </div>
          </div>
          
          <div className="flex items-center justify-end gap-2 pt-4">
            {alert.onConfirm ? (
              <>
                <button
                  onClick={hideAlert}
                  className={`px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-tight transition-all active:scale-95 ${theme.secondaryBtn}`}
                >
                  {alert.cancelLabel}
                </button>
                <button
                  onClick={handleConfirm}
                  className={`px-6 py-2.5 rounded-lg text-xs font-black text-white uppercase tracking-tight shadow-lg transition-all active:scale-95 ${theme.btn}`}
                >
                  {alert.confirmLabel}
                </button>
              </>
            ) : (
              <button
                onClick={hideAlert}
                className={`w-full py-3 rounded-lg text-sm font-black text-white shadow-xl transition-all active:scale-95 ${theme.btn}`}
              >
                OKE
              </button>
            )}
          </div>
        </div>
      </GenieModal>
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const context = useContext(AlertContext);
  if (context === undefined) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
}
