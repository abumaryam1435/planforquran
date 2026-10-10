import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Download, Smartphone, Share, PlusSquare, X, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const PWAInstallButton: React.FC<{ variant?: 'badge' | 'button' | 'banner' }> = ({ variant = 'button' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    if (variant === 'banner') return null;
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>مثبت في الهاتف (يعمل دون إنترنت)</span>
      </div>
    );
  }

  return (
    <>
      {isInstallable && (
        <button
          onClick={install}
          className="flex items-center gap-2 rounded-xl bg-[#1A2E1A] dark:bg-[#D4AF37] hover:bg-opacity-90 px-4 py-2 text-xs font-bold text-white dark:text-[#1A1A1A] shadow-md active:scale-95 transition-all cursor-pointer"
        >
          <Smartphone className="w-4 h-4" />
          <span>تثبيت في الشاشة الرئيسية للهاتف</span>
        </button>
      )}

      {isIOS && !isInstallable && (
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-2 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/20 hover:bg-amber-100 px-3.5 py-2 text-xs font-bold text-amber-900 dark:text-amber-300 transition-all cursor-pointer"
        >
          <Smartphone className="w-4 h-4" />
          <span>تثبيت في الشاشة الرئيسية (iOS)</span>
        </button>
      )}

      {/* iOS Safari Guided Modal */}
      <AnimatePresence>
        {showIOSGuide && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-right font-amiri" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#1E1E1E] p-6 shadow-2xl border border-amber-200/40 dark:border-amber-900/40 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  <h3 className="text-base font-black text-gray-900 dark:text-white">
                    تثبيت التطبيق على الآيفون
                  </h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="rounded-full p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed font-sans">
                لتثبيت تطبيق القرآن الكريم ليعمل بدون إنترنت على جهاز الآيفون أو الآيباد:
              </p>

              <div className="space-y-3 font-sans text-xs">
                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <Share className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold block">1. اضغط زر المشاركة (Share)</span>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400">في أسفل متصفح Safari بالهاتف</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <PlusSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold block">2. اختر «إضافة إلى الشاشة الرئيسية»</span>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400">Add to Home Screen</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold block">3. افتح التطبيق من الشاشة الرئيسية</span>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400">سيعمل كتطبيق أصيل بدون إنترنت</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2.5 rounded-xl bg-amber-600 text-white font-bold text-xs shadow-md font-sans active:scale-95 transition-all"
              >
                فهمت، حسناً
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
