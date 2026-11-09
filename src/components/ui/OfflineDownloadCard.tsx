import React, { useState, useEffect } from 'react';
import {
  Download,
  Wifi,
  Headphones,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Pause,
  Play,
  Square,
  Trash2,
  HardDrive,
  RefreshCw,
  Loader2,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RECITERS_LIST,
  TOTAL_MUSHAF_PAGES,
  TOTAL_MUSHAF_AYAHS,
  DetailedDownloadProgress,
  subscribeToDetailedDownload,
  getDownloadState,
  getOfflineStorageStats,
  startDetailedDownload,
  pauseDetailedDownload,
  resumeDetailedDownload,
  cancelDetailedDownload,
  clearAllOfflineStorage
} from '../../utils/offlineDownloadManager';

interface OfflineDownloadCardProps {
  onReciterChange?: (qariId: string) => void;
  compact?: boolean;
}

export const OfflineDownloadCard: React.FC<OfflineDownloadCardProps> = ({
  onReciterChange,
  compact = false
}) => {
  const [downloadProgress, setDownloadProgress] = useState<DetailedDownloadProgress>(getDownloadState());
  const [selectedQari, setSelectedQari] = useState<string>(() => {
    return localStorage.getItem('quran_qari') || 'Minshawy_Murattal_128kbps';
  });
  const [wifiOnly, setWifiOnly] = useState<boolean>(() => {
    return localStorage.getItem('offline_download_wifi_only') === 'true';
  });
  const [storageStats, setStorageStats] = useState<{
    cachedPages: number;
    cachedAudios: number;
    storageMB: number;
    isPagesComplete: boolean;
    isAudioComplete: boolean;
    isFullyOfflineReady: boolean;
  }>({
    cachedPages: 0,
    cachedAudios: 0,
    storageMB: 0,
    isPagesComplete: false,
    isAudioComplete: false,
    isFullyOfflineReady: false
  });
  const [isRefreshingStats, setIsRefreshingStats] = useState<boolean>(false);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);

  useEffect(() => {
    const unsub = subscribeToDetailedDownload((state) => {
      setDownloadProgress(state);
      // Auto-refresh stats when download completes or pauses
      if (!state.isDownloading) {
        refreshStats();
      }
    });
    refreshStats();
    return () => unsub();
  }, []);

  const refreshStats = async () => {
    setIsRefreshingStats(true);
    const stats = await getOfflineStorageStats();
    setStorageStats(stats);
    setIsRefreshingStats(false);
  };

  const handleQariChange = (qariId: string) => {
    setSelectedQari(qariId);
    localStorage.setItem('quran_qari', qariId);
    if (onReciterChange) onReciterChange(qariId);
  };

  const handleWifiToggle = (checked: boolean) => {
    setWifiOnly(checked);
    localStorage.setItem('offline_download_wifi_only', checked ? 'true' : 'false');
  };

  const handleStart = (mode: 'pages' | 'audio' | 'both') => {
    startDetailedDownload({
      mode,
      qari: selectedQari,
      wifiOnly
    });
  };

  const handleClear = async () => {
    await clearAllOfflineStorage();
    setShowClearConfirm(false);
    await refreshStats();
  };

  const pagesPercent = Math.min(100, Math.round((storageStats.cachedPages / TOTAL_MUSHAF_PAGES) * 100));
  const audioPercent = Math.min(100, Math.round((storageStats.cachedAudios / TOTAL_MUSHAF_AYAHS) * 100));

  return (
    <div className="bg-white dark:bg-[#1A1A1A] rounded-[32px] border border-[#1A2E1A]/10 dark:border-white/10 shadow-sm overflow-hidden font-rtl text-right">
      {/* Header */}
      <div className="p-5 border-b border-gray-100 dark:border-white/5 bg-gradient-to-l from-emerald-500/10 via-transparent to-amber-500/5 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-600 dark:bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
            <Download className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-base sm:text-lg text-[#1A2E1A] dark:text-white flex items-center gap-2">
              <span>التنزيل والعمل بدون إنترنت</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                Offline Mode
              </span>
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              تنزيل صفحات المصحف والتلاوات الصوتية ليعمل التطبيق كاملاً محلياً
            </p>
          </div>
        </div>

        <button
          onClick={refreshStats}
          disabled={isRefreshingStats || downloadProgress.isDownloading}
          className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 dark:text-gray-400 transition-colors disabled:opacity-50 cursor-pointer"
          title="تحديث حالة الذاكرة"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshingStats ? 'animate-spin text-emerald-600' : ''}`} />
        </button>
      </div>

      <div className="p-5 space-y-5">
        {/* Offline Readiness Banner */}
        <div className={`p-4 rounded-2xl border transition-all ${
          storageStats.isFullyOfflineReady
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200'
            : storageStats.isPagesComplete
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-200'
            : 'bg-gray-50 dark:bg-white/5 border-gray-200/60 dark:border-white/10 text-gray-700 dark:text-gray-300'
        }`}>
          <div className="flex items-start gap-3">
            {storageStats.isFullyOfflineReady ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1 text-xs sm:text-sm">
              <div className="font-bold flex items-center gap-2">
                {storageStats.isFullyOfflineReady ? (
                  <span>التطبيق جاهز 100% للعمل كاملاً بدون إنترنت</span>
                ) : storageStats.isPagesComplete ? (
                  <span>صفحات المصحف منزلة بالكامل — يمكنك تنزيل الصوتيات أيضاً للاستماع بدون اتصال</span>
                ) : (
                  <span>قم بتنزيل الصفحات والصوتيات لتشغيل التطبيق بجميع ميزاته بدون إنترنت</span>
                )}
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed font-normal">
                عند اكتمال التنزيل، ستتمكن من إنشاء الخطط وحفظ المهام وعرض صفحات المصحف والاستماع لتلاوة القارئ في أي وقت ومكان دون الحاجة لأي اتصال بالشبكة.
              </p>
            </div>
          </div>
        </div>

        {/* Current Download Status & Progress Bar (Visible while downloading or paused) */}
        <AnimatePresence>
          {(downloadProgress.isDownloading || downloadProgress.isPaused) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {downloadProgress.isDownloading ? (
                    <Loader2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 animate-spin" />
                  ) : (
                    <Pause className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  )}
                  <span className="font-extrabold text-xs sm:text-sm text-emerald-900 dark:text-emerald-200">
                    {downloadProgress.statusMessage}
                  </span>
                </div>
                <span className="font-black text-sm text-emerald-700 dark:text-emerald-400 font-mono">
                  {downloadProgress.percentTotal}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-3 bg-emerald-200/60 dark:bg-emerald-950/50 rounded-full overflow-hidden p-0.5">
                <motion.div
                  className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${downloadProgress.percentTotal}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              {/* Stats Strip */}
              <div className="flex flex-wrap items-center justify-between text-[11px] text-gray-600 dark:text-gray-400 gap-2 pt-1 border-t border-emerald-200/40 dark:border-emerald-800/20">
                {downloadProgress.downloadSpeed && (
                  <div>السرعة: <span className="font-bold text-gray-800 dark:text-gray-200 font-mono">{downloadProgress.downloadSpeed}</span></div>
                )}
                {downloadProgress.estimatedTimeRemaining && (
                  <div>الوقت المتبقي: <span className="font-bold text-gray-800 dark:text-gray-200">{downloadProgress.estimatedTimeRemaining}</span></div>
                )}
                <div>
                  {downloadProgress.mode === 'pages' && `صفحة ${downloadProgress.pagesDownloaded} من ${TOTAL_MUSHAF_PAGES}`}
                  {downloadProgress.mode === 'audio' && `آية ${downloadProgress.audioDownloaded} من ${TOTAL_MUSHAF_AYAHS}`}
                  {downloadProgress.mode === 'both' && `(صفحات: ${downloadProgress.pagesDownloaded}/604 | صوتيات: ${downloadProgress.audioDownloaded}/6236)`}
                </div>
              </div>

              {/* Action Buttons: Pause / Resume / Cancel */}
              <div className="flex items-center gap-2 pt-1">
                {downloadProgress.isDownloading ? (
                  <button
                    onClick={pauseDetailedDownload}
                    className="flex-1 py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    <span>إيقاف مؤقت</span>
                  </button>
                ) : (
                  <button
                    onClick={resumeDetailedDownload}
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>استئناف التنزيل</span>
                  </button>
                )}
                <button
                  onClick={cancelDetailedDownload}
                  className="py-2 px-4 rounded-xl bg-gray-200 hover:bg-gray-300 dark:bg-white/10 dark:hover:bg-white/20 text-gray-700 dark:text-gray-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>إلغاء</span>
                </button>
              </div>

              {downloadProgress.error && (
                <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/30 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{downloadProgress.error}</span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 2-Column Status Cards: Pages & Audio */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Pages Card */}
          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="font-extrabold text-xs sm:text-sm text-gray-900 dark:text-white">
                  صفحات المصحف الشريف
                </span>
              </div>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                storageStats.isPagesComplete
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                  : 'bg-gray-200 text-gray-700 dark:bg-white/10 dark:text-gray-300'
              }`}>
                {storageStats.isPagesComplete ? 'مكتمل' : `${storageStats.cachedPages} / ${TOTAL_MUSHAF_PAGES}`}
              </span>
            </div>

            <div className="w-full h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                style={{ width: `${pagesPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
              <span>نسبة التنزيل: <strong className="text-gray-700 dark:text-gray-200 font-mono">{pagesPercent}%</strong></span>
              <span>الحجم: ~85 ميغابايت</span>
            </div>

            <button
              onClick={() => handleStart('pages')}
              disabled={downloadProgress.isDownloading || storageStats.isPagesComplete}
              className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95 ${
                storageStats.isPagesComplete
                  ? 'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500 cursor-default'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {storageStats.isPagesComplete ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>تم تنزيل جميع الصفحات</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>تنزيل صفحات المصحف (604 صفحة)</span>
                </>
              )}
            </button>
          </div>

          {/* Audio Card */}
          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Headphones className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span className="font-extrabold text-xs sm:text-sm text-gray-900 dark:text-white">
                  التلاوة الصوتية كاملة
                </span>
              </div>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                storageStats.isAudioComplete
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                  : 'bg-gray-200 text-gray-700 dark:bg-white/10 dark:text-gray-300'
              }`}>
                {storageStats.isAudioComplete ? 'مكتمل' : `${storageStats.cachedAudios} / ${TOTAL_MUSHAF_AYAHS}`}
              </span>
            </div>

            <div className="w-full h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-600 rounded-full transition-all duration-500"
                style={{ width: `${audioPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
              <span>نسبة التنزيل: <strong className="text-gray-700 dark:text-gray-200 font-mono">{audioPercent}%</strong></span>
              <span>الحجم: ~420 ميغابايت</span>
            </div>

            <button
              onClick={() => handleStart('audio')}
              disabled={downloadProgress.isDownloading || storageStats.isAudioComplete}
              className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95 ${
                storageStats.isAudioComplete
                  ? 'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500 cursor-default'
                  : 'bg-amber-600 hover:bg-amber-700 text-white'
              }`}
            >
              {storageStats.isAudioComplete ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>تم تنزيل الصوتيات بالكامل</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>تنزيل صوتيات القارئ (6236 آية)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Reciter Selector & Wi-Fi Options */}
        <div className="p-4 rounded-2xl bg-gray-50/70 dark:bg-white/5 border border-gray-100 dark:border-white/5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Reciter Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block">
                القارئ المعتمد للتنزيل الصوتي:
              </label>
              <select
                value={selectedQari}
                onChange={(e) => handleQariChange(e.target.value)}
                disabled={downloadProgress.isDownloading}
                className="w-full text-xs font-bold bg-white dark:bg-[#121212] dark:text-white border border-gray-200 dark:border-white/10 rounded-xl p-2.5 outline-none cursor-pointer focus:border-emerald-500"
              >
                {RECITERS_LIST.map((q) => (
                  <option key={q.id} value={q.id} className="dark:bg-[#1A1A1A]">
                    {q.name}
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 block">
                سيتم تنزيل وحفظ جميع آيات القرآن بصوت هذا القارئ للاستماع دون اتصال
              </span>
            </div>

            {/* Wi-Fi Only Toggle */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block">
                خيار شبكة الاتصال:
              </label>
              <label className="flex items-center gap-3 p-2.5 bg-white dark:bg-[#121212] border border-gray-200 dark:border-white/10 rounded-xl cursor-pointer hover:border-emerald-500 transition-colors">
                <input
                  type="checkbox"
                  checked={wifiOnly}
                  onChange={(e) => handleWifiToggle(e.target.checked)}
                  className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                />
                <div className="flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                    التنزيل عبر شبكة واي فاي فقط (Wi-Fi)
                  </span>
                </div>
              </label>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 block">
                توفير بيانات الهاتف الخلوي والبدء فقط عند الاتصال بشبكة Wi-Fi
              </span>
            </div>
          </div>

          {/* Master "Download Everything" Button */}
          {!storageStats.isFullyOfflineReady && (
            <button
              onClick={() => handleStart('both')}
              disabled={downloadProgress.isDownloading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-emerald-600/20 active:scale-95 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>تنزيل المصحف كاملاً (صفحات + تلاوة القارئ المختار دفعة واحدة)</span>
            </button>
          )}
        </div>

        {/* Storage Management & Freeing Space */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs border-t border-gray-100 dark:border-white/5">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <HardDrive className="w-4 h-4 text-gray-400" />
            <span>المساحة المستهلكة على الجهاز:</span>
            <strong className="text-gray-800 dark:text-gray-200 font-mono">
              {storageStats.storageMB > 0 ? `${storageStats.storageMB} ميغابايت` : 'فارغ'}
            </strong>
          </div>

          {!showClearConfirm ? (
            <button
              onClick={() => setShowClearConfirm(true)}
              disabled={downloadProgress.isDownloading || storageStats.storageMB === 0}
              className="text-xs font-bold text-red-600 dark:text-red-400 hover:underline flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>تفريغ الذاكرة ومسح المحفوظات</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-red-600 dark:text-red-400 font-bold">
                تأكيد حذف الملفات؟
              </span>
              <button
                onClick={handleClear}
                className="py-1 px-2.5 rounded-lg bg-red-600 text-white font-bold text-[11px] hover:bg-red-700 transition-colors cursor-pointer"
              >
                نعم، احذف
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="py-1 px-2.5 rounded-lg bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300 font-bold text-[11px] hover:bg-gray-300 transition-colors cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
