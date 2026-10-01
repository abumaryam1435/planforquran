
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({ isOpen, onClose, title, children, size = 'sm' }: ModalProps) {
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg md:max-w-2xl lg:max-w-3xl xl:max-w-4xl',
    xl: 'max-w-xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl',
  };
  const maxWidth = sizeClasses[size];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none"
          >
            <div className={`bg-white dark:bg-[#1A1A1A] w-full ${maxWidth} rounded-[32px] overflow-hidden shadow-2xl pointer-events-auto border border-[#1A2E1A]/5 dark:border-white/5 max-h-[85vh] sm:max-h-[90vh] flex flex-col`}>
              <div className="p-5 sm:p-6 border-b border-gray-50 dark:border-white/5 flex items-center justify-between shrink-0">
                <h3 className="font-bold text-base sm:text-lg text-[#1A2E1A] dark:text-white leading-tight">{title}</h3>
                <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors shrink-0">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <div className="p-5 sm:p-6 overflow-y-auto min-h-0 scrollbar-thin">
                {children}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
