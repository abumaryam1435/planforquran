import React from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { OfflineDownloadCard } from './OfflineDownloadCard';

interface OfflineDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  activePlan?: any;
}

export const OfflineDownloadModal: React.FC<OfflineDownloadModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 font-amiri"
        dir="rtl"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl rounded-[32px] bg-white dark:bg-[#1A1A1A] text-gray-900 dark:text-white shadow-2xl border border-emerald-500/20 max-h-[92vh] overflow-y-auto relative"
        >
          {/* Quick Close Button */}
          <button
            onClick={onClose}
            className="absolute top-5 left-5 z-20 p-2 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/20 text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>

          <OfflineDownloadCard />
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
