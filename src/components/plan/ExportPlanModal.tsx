import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Download, Share2, Copy, Check, Sparkles, BookOpen, Layers, ShieldCheck, FileText, MessageCircle } from 'lucide-react';
import { exportPlanToFile, exportPlanToString, exportPlanToCompactString, getPlanSummaryText, getPlanTypeArabic } from '../../utils/planSharing';
import { QuranPlan } from '../../types';

interface ExportPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: QuranPlan | null;
}

export function ExportPlanModal({ isOpen, onClose, plan }: ExportPlanModalProps) {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  if (!plan) return null;

  const planName = plan.name || getPlanTypeArabic(plan);
  const summary = getPlanSummaryText(plan);

  const handleDownload = (format: 'qplan' | 'json') => {
    exportPlanToFile(plan, format);
  };

  const handleCopyCode = async () => {
    try {
      const code = exportPlanToString(plan);
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error('Failed to copy', e);
    }
  };

  const handleWhatsAppShare = () => {
    const code = exportPlanToCompactString(plan);
    const message = `📋 *خطة قرآنية للاستيراد: ${planName}*\n${summary}\n\n*كود الخطة للاستيراد (انسخه كاملاً واستورده مباشرة في التطبيق):*\n${code}`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleNativeShare = async () => {
    try {
      const prettyCode = exportPlanToString(plan);
      const compactCode = exportPlanToCompactString(plan);
      const cleanFileName = `خطة_${planName.replace(/[\s\/\\:*?"<>|]+/g, '_')}.json`;
      const file = new File([prettyCode], cleanFileName, { type: 'application/json' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `خطة قرآنية: ${planName}`,
          text: `📋 *خطة قرآنية: ${planName}*\n${summary}\n\nتجد مرفقاً ملف الخطة (.json) للتفعيل المباشر في التطبيق.`,
          files: [file]
        });
        setShared(true);
        setTimeout(() => setShared(false), 2500);
      } else if (navigator.share) {
        await navigator.share({
          title: `خطة قرآنية: ${planName}`,
          text: `📋 *خطة قرآنية: ${planName}*\n${summary}\n\n*كود الخطة للاستيراد:*\n${compactCode}`,
        });
        setShared(true);
        setTimeout(() => setShared(false), 2500);
      } else {
        handleWhatsAppShare();
      }
    } catch (err) {
      console.log('Share canceled or failed', err);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="📤 تصدير ونشر الخطة القرآنية"
      size="md"
    >
      <div className="space-y-5 font-rtl text-right">
        {/* Helper Note for Teacher */}
        <div className="bg-amber-500/10 dark:bg-amber-950/20 p-3.5 rounded-2xl border border-amber-500/20 text-xs text-amber-900 dark:text-amber-300 leading-relaxed">
          💡 <strong>للمعلم والمشرف:</strong> يمكنك مشاركة ملف الخطة أو كودها عبر الواتساب أو مشاركتها مباشرة. عند استيراد الخطة لدى الطالب ستُضاف كخطة جديدة عنده دون مسح أي خطة سابقة.
        </div>

        {/* Plan Summary Card */}
        <div className="p-4 bg-gradient-to-br from-[#1A2E1A]/5 to-[#D4AF37]/10 dark:from-white/5 dark:to-white/[0.02] border border-[#1A2E1A]/10 dark:border-white/10 rounded-2xl space-y-2">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] text-gray-400 font-bold block">الخطة المراد تصديرها:</span>
              <h4 className="text-sm font-black text-[#1A2E1A] dark:text-white mt-0.5">
                {planName}
              </h4>
            </div>
            <div className="bg-[#D4AF37]/15 text-[#B8860B] dark:text-[#D4AF37] text-[10px] font-black px-2.5 py-1 rounded-full shrink-0">
              {plan.isSevenCastles ? 'القلاع السبع' : plan.planType === 'review' ? 'مراجعة' : 'حفظ'}
            </div>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-300 pt-1">
            {summary}
          </p>
        </div>

        {/* Export Options Grid */}
        <div className="space-y-3">
          <label className="text-xs font-black text-gray-700 dark:text-gray-300 block">
            طرق التصدير والمشاركة:
          </label>

          {/* 1. Direct WhatsApp Sharing */}
          <div className="p-3.5 bg-[#25D366]/10 dark:bg-[#25D366]/15 border border-[#25D366]/30 rounded-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-[#25D366] text-white rounded-xl flex items-center justify-center font-bold shadow-sm">
                <MessageCircle className="w-5 h-5 fill-current" />
              </div>
              <div>
                <span className="text-xs font-black text-gray-900 dark:text-gray-100 block">
                  مشاركة كود الخطة عبر الواتساب
                </span>
                <span className="text-[10px] text-gray-600 dark:text-gray-400 block">
                  يرسل تفاصيل الخطة مع الكود النصي للاستيراد المباشر
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="py-2 px-3.5 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl text-xs font-black transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-md shadow-[#25D366]/20 shrink-0"
            >
              <MessageCircle className="w-4 h-4 fill-current" />
              <span>واتساب</span>
            </button>
          </div>

          {/* 2. Download File (.qplan / .json) */}
          <div className="p-3.5 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-xl flex items-center justify-center">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-black text-gray-800 dark:text-gray-200 block">
                    تنزيل كملف قابل للاستيراد
                  </span>
                  <span className="text-[10px] text-gray-400">
                    ملف قياسي خفيف وسريع الإرسال
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleDownload('qplan')}
                className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>ملف (.qplan)</span>
              </button>
              <button
                type="button"
                onClick={() => handleDownload('json')}
                className="py-2 px-3 bg-gray-100 hover:bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-200 text-xs font-bold rounded-xl active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>ملف (.json)</span>
              </button>
            </div>
          </div>

          {/* 3. Copy Code / Text */}
          <div className="p-3.5 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-xl flex items-center justify-center">
                <Copy className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-black text-gray-800 dark:text-gray-200 block">
                  نسخ رمز الخطة
                </span>
                <span className="text-[10px] text-gray-400">
                  للإرسال المباشر كنص في تطبيقات المراسلة
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCopyCode}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-amber-600 hover:bg-amber-700 text-white'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>تم النسخ!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>نسخ الرمز</span>
                </>
              )}
            </button>
          </div>

          {/* 4. Native Share Sheet (with JSON file attachment or full text) */}
          <div className="p-3.5 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-xl flex items-center justify-center">
                <Share2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-black text-gray-800 dark:text-gray-200 block">
                  مشاركة ملف / كود الخطة
                </span>
                <span className="text-[10px] text-gray-400">
                  مشاركة عبر تطبيقات النظام (إرفاق ملف .json أو كود)
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleNativeShare}
              className="py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{shared ? 'تمت المشاركة' : 'مشاركة'}</span>
            </button>
          </div>
        </div>

        {/* Close button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-xs active:scale-95 transition-all cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </Modal>
  );
}
