import React, { useState, useRef } from 'react';
import { Modal } from '../ui/Modal';
import { Upload, FileText, CheckCircle, AlertCircle, Calendar, Sparkles, BookOpen, Layers, Check, ArrowLeft, ArrowRight, ShieldCheck, Heart } from 'lucide-react';
import { parsePlanJSON, importPlan, ParsePlanResult } from '../../utils/planSharing';
import { useNavigate } from 'react-router-dom';
import { useUserData } from '../../context/UserDataProvider';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

interface ImportPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (planId: number) => void;
}

export function ImportPlanModal({ isOpen, onClose, onSuccess }: ImportPlanModalProps) {
  const navigate = useNavigate();
  const { setSelectedPlanId } = useUserData();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'file' | 'text'>('file');
  const [pastedText, setPastedText] = useState('');
  const [parseResult, setParseResult] = useState<ParsePlanResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [startDateMode, setStartDateMode] = useState<'today' | 'original' | 'custom'>('original');
  const [customStartDate, setCustomStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [customName, setCustomName] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);

  const resetState = () => {
    setPastedText('');
    setParseResult(null);
    setErrorMessage(null);
    setStartDateMode('original');
    setCustomStartDate(format(new Date(), 'yyyy-MM-dd'));
    setCustomName('');
    setIsImporting(false);
    setImportSuccess(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const processInputString = (content: string) => {
    setErrorMessage(null);
    const res = parsePlanJSON(content);
    if (!res.valid) {
      setErrorMessage(res.error || 'الملف أو النص غير صالح');
      setParseResult(null);
    } else {
      setParseResult(res);
      setCustomName(res.planName || '');
      setErrorMessage(null);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      processInputString(content);
    };
    reader.onerror = () => {
      setErrorMessage('حدث خطأ أثناء قراءة الملف من جهازك');
    };
    reader.readAsText(file, 'utf-8');
    // reset input so same file can be selected again
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      processInputString(content);
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleImport = async () => {
    if (!parseResult?.plan) return;

    setIsImporting(true);
    setErrorMessage(null);

    const res = await importPlan(parseResult.plan, {
      startDateMode,
      customStartDate,
      customName,
      pauseOtherPlans: false
    });

    setIsImporting(false);

    if (res.success) {
      setSelectedPlanId(res.planId);
      setImportSuccess(true);
      if (onSuccess) {
        onSuccess(res.planId);
      }
      setTimeout(() => {
        handleClose();
        navigate('/tasks');
      }, 1400);
    } else {
      setErrorMessage(res.error || 'تعذر استيراد الخطة');
    }
  };

  const plan = parseResult?.plan;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="📥 استيراد خطة قرآنية جاهزة"
      size="md"
    >
      <div className="space-y-5 font-rtl text-right">
        {importSuccess ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-8 text-center space-y-4"
          >
            <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle className="w-10 h-10" />
            </div>
            <div className="space-y-1.5">
              <h4 className="text-lg font-black text-[#1A2E1A] dark:text-white">
                تم استيراد الخطة وتفعيلها بنجاح!
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                جاري توجيهك الآن إلى جدول مهامك اليومية...
              </p>
            </div>
          </motion.div>
        ) : !parseResult ? (
          <>
            {/* Header info */}
            <div className="bg-emerald-50/50 dark:bg-emerald-950/10 p-3.5 rounded-2xl border border-emerald-500/10 text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              💡 <strong>للطالب والمعلم:</strong> يمكنك استيراد خطة جاهزة أعدها المعلم بملف (<span className="font-sans font-bold text-emerald-700 dark:text-emerald-400">.qplan</span> أو <span className="font-sans font-bold text-emerald-700 dark:text-emerald-400">.json</span>) أو بنسخ نص الخطة.
              <br />
              <span className="text-emerald-700 dark:text-emerald-400 font-bold block mt-1">
                ✅ ستُضاف الخطة المستوردة كخطة جديدة في حسابك دون حذف أو مسح خطتك الحالية السابقة.
              </span>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100 dark:border-white/5">
              <button
                type="button"
                onClick={() => setActiveTab('file')}
                className={`flex-1 py-2.5 text-center font-bold text-xs sm:text-sm border-b-2 transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'file'
                    ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 font-extrabold'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                <Upload className="w-4 h-4" />
                <span>رفع ملف الخطة</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('text')}
                className={`flex-1 py-2.5 text-center font-bold text-xs sm:text-sm border-b-2 transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'text'
                    ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 font-extrabold'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>لصق نص أو رمز الخطة</span>
              </button>
            </div>

            {activeTab === 'file' ? (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-emerald-300 dark:border-emerald-700/50 hover:border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/5 hover:bg-emerald-50/40 rounded-3xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-3 group"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".qplan,.json,.txt,application/json,text/plain"
                  className="hidden"
                />
                <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Upload className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <span className="text-sm font-bold text-gray-800 dark:text-gray-200 block">
                    انقر لاختيار ملف الخطة أو اسحبه إلى هنا
                  </span>
                  <span className="text-[11px] text-gray-400 dark:text-gray-500 block">
                    يدعم ملفات (<span className="font-sans font-bold">.qplan</span> أو <span className="font-sans font-bold">.json</span>)
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="الصق نص أو رمز الخطة هنا (JSON)..."
                  rows={5}
                  className="w-full text-xs font-mono p-3 bg-gray-50 dark:bg-[#151515] border border-gray-200 dark:border-white/10 rounded-2xl dark:text-white outline-none focus:border-emerald-500 transition-colors resize-none"
                  dir="ltr"
                />
                <button
                  type="button"
                  disabled={!pastedText.trim()}
                  onClick={() => processInputString(pastedText)}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs active:scale-95 transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  فحص وقراءة الخطة
                </button>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-2xl flex items-center gap-2 text-xs text-red-600 dark:text-red-400 font-bold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
          </>
        ) : (
          /* Preview and confirmation state */
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-2">
              <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                تم التحقق من صحة الخطة بنجاح
              </span>
              <button
                type="button"
                onClick={resetState}
                className="text-[11px] font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                اختيار ملف آخر
              </button>
            </div>

            {/* Plan Details Card */}
            <div className="p-4 bg-gradient-to-br from-[#1A2E1A]/5 to-[#D4AF37]/10 dark:from-white/5 dark:to-white/[0.02] border border-[#1A2E1A]/10 dark:border-white/10 rounded-2xl space-y-3">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400">اسم الخطة المستوردة:</label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full text-sm font-black text-[#1A2E1A] dark:text-white bg-white/80 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-1.5 outline-none focus:border-emerald-500"
                    placeholder="اسم الخطة..."
                  />
                </div>
                <div className="bg-[#D4AF37]/15 text-[#B8860B] dark:text-[#D4AF37] text-[10px] font-black px-2.5 py-1 rounded-full shrink-0">
                  {plan?.isSevenCastles ? 'القلاع السبع' : plan?.planType === 'review' ? 'مراجعة وتثبيت' : 'خطة حفظ'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-gray-100 dark:border-white/5">
                <div className="bg-white/60 dark:bg-black/20 p-2 rounded-xl">
                  <span className="text-[10px] text-gray-400 block font-bold">نطاق الصفحات:</span>
                  <span className="font-extrabold text-gray-700 dark:text-gray-200">
                    من صفحة {plan?.startPage} إلى {plan?.endPage} ({Math.abs((plan?.endPage || 604) - (plan?.startPage || 1)) + 1} صفحة)
                  </span>
                </div>
                <div className="bg-white/60 dark:bg-black/20 p-2 rounded-xl">
                  <span className="text-[10px] text-gray-400 block font-bold">نوع البرنامج:</span>
                  <span className="font-extrabold text-gray-700 dark:text-gray-200">
                    {parseResult.summary || 'خطة قرآنية مخصصة'}
                  </span>
                </div>
              </div>

              {plan?.adhkarList && plan.adhkarList.length > 0 && (
                <div className="text-[11px] bg-emerald-50/50 dark:bg-emerald-950/20 p-2 rounded-xl text-emerald-800 dark:text-emerald-300 font-medium flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>تتضمن الخطة {plan.adhkarList.length} أذكار ومهام يومية مرافقة</span>
                </div>
              )}
            </div>

            {/* Start Date Selection */}
            <div className="space-y-2 pt-1">
              <label className="text-xs font-black text-gray-700 dark:text-gray-300 block">
                موعد تفعيل وبدء الخطة عندك:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setStartDateMode('original')}
                  className={`p-3 rounded-2xl border text-right transition-all cursor-pointer ${
                    startDateMode === 'original'
                      ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 font-bold'
                      : 'border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <span className="text-xs font-black block">تاريخ الخطة الأصلي (طبق الأصل)</span>
                  <span className="text-[10px] text-gray-400 block mt-0.5">
                    تاريخ البدء الأصلي: {plan?.startDate || format(new Date(), 'yyyy-MM-dd')}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setStartDateMode('today')}
                  className={`p-3 rounded-2xl border text-right transition-all cursor-pointer ${
                    startDateMode === 'today'
                      ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 font-bold'
                      : 'border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <span className="text-xs font-black block">البدء من اليوم</span>
                  <span className="text-[10px] text-gray-400 block mt-0.5">
                    اليوم: {format(new Date(), 'EEEE d MMMM yyyy', { locale: ar })}
                  </span>
                </button>
              </div>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100 dark:border-white/5">
              <button
                type="button"
                onClick={resetState}
                disabled={isImporting}
                className="py-3 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 text-gray-700 dark:text-gray-300 rounded-2xl font-bold text-xs active:scale-95 transition-all cursor-pointer"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={handleImport}
                disabled={isImporting}
                className="py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-600/20 disabled:opacity-50"
              >
                {isImporting ? (
                  <span>جاري الاستيراد...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>استيراد وتفعيل الخطة الآن</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
