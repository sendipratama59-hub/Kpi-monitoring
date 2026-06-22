import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

interface GenieModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: string;
  speed?: 'normal' | 'slow';
}

const professionalAnimation = {
  hidden: { 
    opacity: 0, 
    scale: 0.95,
    y: 15,
    filter: 'blur(8px)',
  },
  visible: (speed: 'normal' | 'slow') => ({ 
    opacity: 1, 
    scale: 1, 
    y: 0,
    filter: 'blur(0px)',
    transition: {
      duration: speed === 'slow' ? 0.7 : 0.5,
      ease: [0.16, 1, 0.3, 1] // sleek ease-out
    }
  }),
  exit: (speed: 'normal' | 'slow') => ({ 
    opacity: 0, 
    scale: 0.97,
    y: -10,
    filter: 'blur(6px)',
    transition: {
      duration: speed === 'slow' ? 0.5 : 0.3,
      ease: [0.4, 0, 1, 1] // smooth ease-in
    }
  })
};

export function GenieModal({ isOpen, onClose, title, subtitle, children, maxWidth = "max-w-2xl", speed = 'normal' }: GenieModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: speed === 'slow' ? 0.5 : 0.2 }}
            onClick={onClose}
            className="genie-modal fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[9990]"
          />
          
          {/* Modal Container */}
          <div className="genie-modal fixed inset-0 flex items-center justify-center p-4 z-[9991] pointer-events-none">
            <motion.div
              custom={speed}
              variants={professionalAnimation as any}
              initial="hidden"
              animate="visible"
              exit="exit"
              className={`w-full ${maxWidth} bg-white rounded-xl shadow-2xl shadow-slate-900/20 pointer-events-auto overflow-hidden flex flex-col max-h-[90vh]`}
            >
              {/* Header */}
              <div className="px-6 py-4 flex items-center justify-between border-b border-slate-50">
                <div>
                  {title && <h2 className="text-xl font-black text-slate-800 tracking-tight leading-none">{title}</h2>}
                  {subtitle && <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1.5">{subtitle}</p>}
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-slate-100 transition-colors group"
                >
                  <X className="w-5 h-5 text-slate-400 group-hover:text-slate-600" />
                </button>
              </div>

              {/* Content (Scrollable) */}
              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                {children}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
