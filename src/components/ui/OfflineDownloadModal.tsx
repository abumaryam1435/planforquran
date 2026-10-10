import React, { useState, useEffect } from 'react';
import {
  Download,
  Pause,
  Play,
  Square,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  Wifi,
  Headphones,
  FileText,
  X,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  downloadPagesAndAudio,
  pauseDownload,
  resumeDownload,
  cancelActiveDownload,
  subscribeToDownload,
  globalDownloadState,
  getCachedPagesCount,
  getCachedAudiosCount,
  clearAllOfflineData,
  DownloadProgress
} from '../../utils/offlineCache';
import { SURAH_METADATAList } from '../../utils/quranPageMapping';

interface OfflineDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  activePlan?: any;
}

export const OfflineDownloadModal: React.FC<OfflineDownloadModalProps> = ({
  isOpen,
  onClose,
  activePlan
}) => {
  const [downloadState, setDownloadState] = useState<DownloadProgress>(globalDownloadState);
  const [cachedPages, setCachedPages] = useState<number>(0);
  const [cachedAudios, setCachedAudios] = useState<number>(0);
  const [downloadScope, setDownloadScope] = useState<'plan' | 'juz' | 'full' | 'surah'>('plan');
  const [selectedJuz, setSelectedJuz] = useState<number>(1);
  const [selectedSurah, setSelectedSurah] = useState<number>(1);
  const [includeAudio, setIncludeAudio] = useState<boolean>(true);
  const [isClearing, setIsClearing] = useState<boolean>(false);

  useEffect(() => {
    const unsub = subscribeToDownload(setDownloadState);
    return () => unsub();
  }, []);

  const refreshCounts = async () => {
    const pages = await getCachedPagesCount();
    const audios = await getCachedAudiosCount();
    setCachedPages(pages);
    setCachedAudios(audios);
  };

  useEffect(() => {
    if (isOpen) {
      refreshCounts();
    }
  }, [isOpen]);

  const handleStartDownload = async () => {
    const pagesToDownload: number[] = [];

    if (downloadScope === 'plan') {
      if (activePlan) {
        if (activePlan.planType === 'custom' && activePlan.customPages) {
          pagesToDownload.push(...activePlan.customPages);
        } else if (activePlan.targetJuz) {
          const juzs = Array.isArray(activePlan.targetJuz) ? activePlan.targetJuz : [activePlan.targetJuz];
          juzs.forEach((j: number) => {
            const start = (j - 1) * 20 + 2;
            const end = j === 1 ? 21 : Math.min(604, j * 20 + 1);
            for (let p = start; p <= end; p++) pagesToDownload.push(p);
          });
        }
      }
      if (pagesToDownload.length === 0) {
        // Fallback to first Juz
        for (let p = 1; p <= 21; p++) pagesToDownload.push(p);
      }
    } else if (downloadScope === 'juz') {
      const start = selectedJuz === 1 ? 1 : (selectedJuz - 1) * 20 + 2;
      const end = selectedJuz === 1 ? 21 : Math.min(604, selectedJuz * 20 + 1);
      for (let p = start; p <= end; p++) pagesToDownload.push(p);
    } else if (downloadScope === 'surah') {
      const meta = SURAH_METADATAList[selectedSurah - 1];
      if (meta) {
        for (let p = meta.startPage; p <= meta.endPage; p++) pagesToDownload.push(p);
      }
    } else if (downloadScope === 'full') {
      for (let p = 1; p <= 604; p++) pagesToDownload.push(p);
    }

    const uniquePages = Array.from(new Set(pagesToDownload)).sort((a, b) => a - b);
    if (uniquePages.length > 0) {
      await downloadPagesAndAudio(uniquePages, includeAudio);
      await refreshCounts();
    }
  };

  const handleClear = async () => {
    if (window.confirm('هل تريد مسح جميع الصفحات والصوتيات المحفوظة بدون إنترنت لتفريغ المساحة؟')) {
      setIsClearing(true);
      await clearAllOfflineData();
      await refreshCounts();
      setIsClearing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 font-amiri" dir="rtl">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#1A1A1A] text-gray-900 dark:text-white p-5 sm:p-6 shadow-2xl border border-amber-200/40 dark:border-amber-900/40 space-y-4 max-h-[92vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black">مركز التحميل للعمل بدون إنترنت</h2>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 font-sans">
                حفظ صفحات المصحف والتلاوات الصوتية في ذاكرة الهاتف
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Offline Cache Stats */}
        <div className="grid grid-cols-2 gap-2 text-xs font-sans">
          <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-white/5 border border-amber-200/30 dark:border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="font-bold">صفحات المصحف:</span>
            </div>
            <span className="font-extrabold text-amber-800 dark:text-amber-300">
              {cachedPages} / 604 ص
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-blue-50/70 dark:bg-white/5 border border-blue-200/30 dark:border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Headphones className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="font-bold">المقاطع الصوتية:</span>
            </div>
            <span className="font-extrabold text-blue-800 dark:text-blue-300">
              {cachedAudios} مقطع
            </span>
          </div>
        </div>

        {/* Scope Selector */}
        <div className="space-y-2 text-right font-sans text-xs">
          <label className="font-bold text-gray-700 dark:text-gray-300 block">
            اختر المحتوى المراد حفظه في الهاتف:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            <button
              onClick={() => setDownloadScope('plan')}
              className={`py-2 px-2.5 rounded-xl font-bold transition-all text-xs cursor-pointer ${
                downloadScope === 'plan'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10'
              }`}
            >
              الخطة المقررة
            </button>
            <button
              onClick={() => setDownloadScope('juz')}
              className={`py-2 px-2.5 rounded-xl font-bold transition-all text-xs cursor-pointer ${
                downloadScope === 'juz'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10'
              }`}
            >
              جزء محدد
            </button>
            <button
              onClick={() => setDownloadScope('surah')}
              className={`py-2 px-2.5 rounded-xl font-bold transition-all text-xs cursor-pointer ${
                downloadScope === 'surah'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10'
              }`}
            >
              سورة محددة
            </button>
            <button
              onClick={() => setDownloadScope('full')}
              className={`py-2 px-2.5 rounded-xl font-bold transition-all text-xs cursor-pointer ${
                downloadScope === 'full'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10'
              }`}
            >
              المصحف كاملاً
            </button>
          </div>
        </div>

        {/* Sub-selectors */}
        {downloadScope === 'juz' && (
          <div className="space-y-1 font-sans text-xs text-right">
            <label className="font-bold text-gray-600 dark:text-gray-400">اختر رقم الجزء:</label>
            <select
              value={selectedJuz}
              onChange={e => setSelectedJuz(Number(e.target.value))}
              className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 font-bold outline-none"
            >
              {Array.from({ length: 30 }, (_, i) => i + 1).map(j => (
                <option key={j} value={j} className="dark:bg-[#222]">
                  الجزء {j}
                </option>
              ))}
            </select>
          </div>
        )}

        {downloadScope === 'surah' && (
          <div className="space-y-1 font-sans text-xs text-right">
            <label className="font-bold text-gray-600 dark:text-gray-400">اختر السورة:</label>
            <select
              value={selectedSurah}
              onChange={e => setSelectedSurah(Number(e.target.value))}
              className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 font-bold outline-none"
            >
              {SURAH_METADATAList.map((s, idx) => (
                <option key={idx + 1} value={idx + 1} className="dark:bg-[#222]">
                  سورة {s.name} ({s.startPage} - {s.endPage})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Audio Include Toggle */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-white/5 font-sans text-xs">
          <div className="flex items-center gap-2">
            <Headphones className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <div className="text-right">
              <span className="font-bold block">تضمين التلاوة الصوتية</span>
              <span className="text-[10px] text-gray-500">حفظ صوتيات الآيات للاستماع دون اتصال</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIncludeAudio(prev => !prev)}
            className={`w-10 h-6 rounded-full p-0.5 flex transition-all duration-300 cursor-pointer ${
              includeAudio ? 'bg-amber-600 justify-end' : 'bg-gray-300 dark:bg-gray-700 justify-start'
            }`}
          >
            <motion.div layout className="w-5 h-5 bg-white rounded-full shadow-sm" />
          </button>
        </div>

        {/* Live Active Progress Bar */}
        {(downloadState.isDownloading || downloadState.isPaused) && (
          <div className="space-y-2 p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/20 border border-amber-300/40 dark:border-amber-700/40 font-sans text-xs">
            <div className="flex items-center justify-between font-bold">
              <span className="text-amber-900 dark:text-amber-200">
                {downloadState.statusText || 'جاري التنزيل...'}
              </span>
              <span>
                {downloadState.totalPages > 0
                  ? `${Math.round(((downloadState.downloadedPagesCount || downloadState.currentPage) / downloadState.totalPages) * 100)}%`
                  : '0%'}
              </span>
            </div>

            <div className="w-full h-2 rounded-full bg-amber-200/50 dark:bg-white/10 overflow-hidden">
              <div
                className="h-full bg-amber-600 rounded-full transition-all duration-300"
                style={{
                  width: `${downloadState.totalPages > 0 ? Math.min(100, ((downloadState.downloadedPagesCount || downloadState.currentPage) / downloadState.totalPages) * 100) : 0}%`
                }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
              <span>الصفحات: {downloadState.downloadedPagesCount} من {downloadState.totalPages}</span>
              {downloadState.downloadSpeedPagesPerSec ? (
                <span>السرعة: ~{downloadState.downloadSpeedPagesPerSec} ص/ث</span>
              ) : null}
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center gap-2 pt-2 font-sans text-xs">
          {downloadState.isDownloading ? (
            <>
              <button
                onClick={() => pauseDownload()}
                className="flex-1 py-2.5 px-3 rounded-xl bg-amber-600 text-white font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
              >
                <Pause className="w-4 h-4" />
                <span>إيقاف مؤقت</span>
              </button>
              <button
                onClick={() => cancelActiveDownload()}
                className="py-2.5 px-3 rounded-xl bg-red-100 dark:bg-red-950/40 text-red-600 font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Square className="w-4 h-4" />
                <span>إلغاء</span>
              </button>
            </>
          ) : downloadState.isPaused ? (
            <>
              <button
                onClick={() => resumeDownload()}
                className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>استئناف التنزيل</span>
              </button>
              <button
                onClick={() => cancelActiveDownload()}
                className="py-2.5 px-3 rounded-xl bg-red-100 dark:bg-red-950/40 text-red-600 font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Square className="w-4 h-4" />
                <span>إلغاء</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleStartDownload}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#1A2E1A] dark:bg-[#D4AF37] text-white dark:text-[#1A1A1A] font-extrabold flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>بدء حفظ المحتوى للعمل بدون إنترنت</span>
              </button>

              {(cachedPages > 0 || cachedAudios > 0) && (
                <button
                  onClick={handleClear}
                  disabled={isClearing}
                  className="p-2.5 rounded-xl bg-red-100 dark:bg-red-950/30 hover:bg-red-200 text-red-600 transition-colors cursor-pointer"
                  title="مسح الذاكرة المحلية"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};
