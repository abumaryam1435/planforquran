import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  FileText,
  Volume2,
  Image as ImageIcon,
  Video,
  Copy,
  Download,
  Share2,
  Check,
  Loader2,
  Play,
  Pause,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { generateAyahCardCanvas } from '../../utils/generateAyahCardCanvas';
import { RECITERS_LIST } from '../../utils/offlineDownloadManager';
import { getVersesRangeText } from '../../utils/offlineQuranData';

export interface AyahShareTarget {
  surah: number;
  surahName: string;
  startAyah: number;
  endAyah: number;
  page?: number;
}

interface AyahShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: AyahShareTarget | null;
}

type ShareType = 'text' | 'audio' | 'image' | 'video';
type CardTheme = 'emerald' | 'royal_dark' | 'cream_gold';

export const AyahShareModal: React.FC<AyahShareModalProps> = ({ isOpen, onClose, target }) => {
  const [activeType, setActiveType] = useState<ShareType>('text');
  const [verseText, setVerseText] = useState<string>('');
  const [isLoadingText, setIsLoadingText] = useState<boolean>(true);

  // Card theme
  const [cardTheme, setCardTheme] = useState<CardTheme>('emerald');

  // Qari selection
  const [selectedQari, setSelectedQari] = useState<string>(() => {
    return localStorage.getItem('quran_qari') || 'Minshawy_Murattal_128kbps';
  });

  // Preview & generated states
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationProgress, setGenerationProgress] = useState<string>('');
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string | null>(null);
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);

  // Audio playback state
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Success message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const isSingleAyah = target ? target.startAyah === target.endAyah : true;
  const ayahLabel = target
    ? isSingleAyah
      ? `الآية ${target.startAyah}`
      : `الآيات ${target.startAyah} - ${target.endAyah}`
    : '';

  const qariName = RECITERS_LIST.find((q) => q.id === selectedQari)?.name || 'الشيخ محمد صديق المنشاوي';

  // Load verse text when target changes
  useEffect(() => {
    if (!isOpen || !target) return;
    setIsLoadingText(true);
    getVersesRangeText(target.surah, target.startAyah, target.endAyah)
      .then((t) => {
        setVerseText(t || '');
      })
      .catch((err) => {
        console.error('Failed to get verse text:', err);
      })
      .finally(() => {
        setIsLoadingText(false);
      });

    // Reset preview URLs
    setPreviewImageUrl(null);
    setPreviewAudioUrl(null);
    setPreviewVideoUrl(null);
    setIsPlayingAudio(false);
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }
  }, [isOpen, target]);

  // Generate Image preview when Image tab is active or theme changes
  useEffect(() => {
    if (!isOpen || !target || !verseText || activeType !== 'image') return;
    let isCancelled = false;

    generateAyahCardCanvas({
      surahName: target.surahName,
      surahNumber: target.surah,
      ayahLabel,
      versesText: verseText,
      theme: cardTheme,
      width: 1080,
      height: 1080
    }).then((canvas) => {
      if (isCancelled) return;
      canvas.toBlob((blob) => {
        if (!blob || isCancelled) return;
        const url = URL.createObjectURL(blob);
        setPreviewImageUrl(url);
      }, 'image/png');
    });

    return () => {
      isCancelled = true;
    };
  }, [isOpen, target, verseText, activeType, cardTheme, ayahLabel]);

  // Pre-fetch single or sequence audio when audio/video tab is chosen
  const fetchCombinedAudioBlob = async (): Promise<{ blob: Blob; url: string; duration: number }> => {
    if (!target) throw new Error('No target');

    const urls: string[] = [];
    for (let a = target.startAyah; a <= target.endAyah; a++) {
      const sPad = String(target.surah).padStart(3, '0');
      const aPad = String(a).padStart(3, '0');
      urls.push(`https://everyayah.com/data/${selectedQari}/${sPad}${aPad}.mp3`);
    }

    setGenerationProgress(`جاري تنزيل ملفات الصوت (${urls.length})...`);

    // Fetch all audio chunks
    const audioBlobs: Blob[] = [];
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      let res: Response | null = null;
      if ('caches' in window) {
        try {
          const cache = await caches.open('quran-audio-v1');
          res = (await cache.match(url)) || null;
        } catch (e) {}
      }
      if (!res) {
        res = await fetch(url);
      }
      if (!res.ok) throw new Error(`تعذر تحميل الصوت للآية ${target.startAyah + i}`);
      const b = await res.blob();
      audioBlobs.push(b);
    }

    // Merge audio chunks (concatenated MP3 streams)
    const combinedBlob = new Blob(audioBlobs, { type: 'audio/mp3' });
    const audioUrl = URL.createObjectURL(combinedBlob);

    // Calculate exact duration
    const duration = await new Promise<number>((resolve) => {
      const tempAudio = new Audio(audioUrl);
      tempAudio.onloadedmetadata = () => {
        resolve(tempAudio.duration || 5);
      };
      tempAudio.onerror = () => resolve(5);
    });

    return { blob: combinedBlob, url: audioUrl, duration };
  };

  // 1. Text Share Handler
  const formattedText = `قال تعالى:\n﴿ ${verseText || ''} ﴾\n[سورة ${target?.surahName} : ${ayahLabel}]`;

  const handleCopyText = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(formattedText);
        showToast('تم نسخ نص الآية بنجاح 📋');
      } else {
        showToast('تعذر النسخ التلقائي');
      }
    } catch (e) {
      showToast('تعذر النسخ');
    }
  };

  const handleShareText = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `سورة ${target?.surahName} (${ayahLabel})`,
          text: formattedText
        });
        showToast('تم فتح نافذة المشاركة بنجاح');
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          handleCopyText();
        }
      }
    } else {
      handleCopyText();
    }
  };

  // 2. Audio Share Handler
  const handleDownloadAudio = async () => {
    if (!target) return;
    try {
      setIsGenerating(true);
      const { blob } = await fetchCombinedAudioBlob();
      const filename = `Quran_${target.surahName}_Ayah_${target.startAyah}${target.startAyah !== target.endAyah ? '-' + target.endAyah : ''}.mp3`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('تم تنزيل المقطع الصوتي 🎧');
    } catch (err: any) {
      console.error(err);
      showToast('تعذر تنزيل الصوت. يرجى التحقق من الاتصال بالإنترنت.');
    } finally {
      setIsGenerating(false);
      setGenerationProgress('');
    }
  };

  const handleShareAudio = async () => {
    if (!target) return;
    try {
      setIsGenerating(true);
      const { blob } = await fetchCombinedAudioBlob();
      const filename = `Quran_${target.surahName}_${target.startAyah}.mp3`;
      const file = new File([blob], filename, { type: 'audio/mp3' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `تلاوة: سورة ${target.surahName} (${ayahLabel})`,
          text: `تلاوة ${ayahLabel} من سورة ${target.surahName} بصوت ${qariName}`,
          files: [file]
        });
        showToast('تمت مشاركة الملف الصوتي');
      } else {
        handleDownloadAudio();
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error(err);
        handleDownloadAudio();
      }
    } finally {
      setIsGenerating(false);
      setGenerationProgress('');
    }
  };

  // 3. Image Share Handler
  const handleDownloadImage = async () => {
    if (!target) return;
    try {
      setIsGenerating(true);
      setGenerationProgress('جاري تصميم صورة الآية بطراز إسلامي راقٍ...');
      const canvas = await generateAyahCardCanvas({
        surahName: target.surahName,
        surahNumber: target.surah,
        ayahLabel,
        versesText: verseText,
        theme: cardTheme,
        width: 1200,
        height: 1200
      });

      canvas.toBlob((blob) => {
        if (!blob) return;
        const filename = `Quran_Card_${target.surahName}_${target.startAyah}.png`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('تم حفظ صورة الآية 🖼️');
      }, 'image/png');
    } catch (err) {
      console.error(err);
      showToast('تعذر استخراج الصورة');
    } finally {
      setIsGenerating(false);
      setGenerationProgress('');
    }
  };

  const handleShareImage = async () => {
    if (!target) return;
    try {
      setIsGenerating(true);
      setGenerationProgress('جاري تجهيز صورة الآية للمشاركة...');
      const canvas = await generateAyahCardCanvas({
        surahName: target.surahName,
        surahNumber: target.surah,
        ayahLabel,
        versesText: verseText,
        theme: cardTheme,
        width: 1200,
        height: 1200
      });

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const filename = `Quran_Card_${target.surahName}_${target.startAyah}.png`;
        const file = new File([blob], filename, { type: 'image/png' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              title: `سورة ${target.surahName} (${ayahLabel})`,
              text: `﴿ ${verseText} ﴾\n[سورة ${target.surahName}: ${ayahLabel}]`,
              files: [file]
            });
            showToast('تمت مشاركة الصورة بنجاح');
          } catch (e: any) {
            if (e.name !== 'AbortError') {
              handleDownloadImage();
            }
          }
        } else {
          handleDownloadImage();
        }
      }, 'image/png');
    } catch (err) {
      console.error(err);
      handleDownloadImage();
    } finally {
      setIsGenerating(false);
      setGenerationProgress('');
    }
  };

  // 4. Video Share Handler (Combining Image Card + Audio)
  const handleGenerateVideo = async (action: 'download' | 'share' = 'download') => {
    if (!target) return;
    try {
      setIsGenerating(true);
      setGenerationProgress('1/3: جاري تحميل الصوت للمقرئ المختار...');

      const { blob: audioBlob, duration } = await fetchCombinedAudioBlob();

      setGenerationProgress('2/3: جاري رسم بطاقة الآية وتهيئة محرك الفيديو...');
      const canvas = await generateAyahCardCanvas({
        surahName: target.surahName,
        surahNumber: target.surah,
        ayahLabel,
        versesText: verseText,
        qariName,
        theme: cardTheme,
        width: 1080,
        height: 1080
      });

      // Check MediaRecorder support
      if (typeof window.MediaRecorder === 'undefined') {
        throw new Error('متصفحك لا يدعم تسجيل الفيديو التلقائي (MediaRecorder). يمكنك مشاركة الصورة والصوت بشكل منفصل.');
      }

      setGenerationProgress('3/3: جاري دمج الصوت مع الصورة وإنشاء مقطع الفيديو...');

      // Prepare audio element connected to Web Audio context
      const audioUrl = URL.createObjectURL(audioBlob);
      const audioEl = new Audio(audioUrl);
      audioEl.crossOrigin = 'anonymous';

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioCtx.createMediaElementSource(audioEl);
      const dest = audioCtx.createMediaStreamDestination();
      source.connect(dest);
      // Optional: don't connect to audioCtx.destination to keep it silent during recording

      // Canvas stream at 30 fps
      const canvasStream = canvas.captureStream(30);

      // Combine video and audio tracks
      const combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...dest.stream.getAudioTracks()
      ]);

      // Choose mime type
      let mimeType = 'video/webm;codecs=vp9,opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/mp4';
        }
      }

      const recorder = new MediaRecorder(combinedStream, {
        mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : undefined,
        videoBitsPerSecond: 2500000
      });

      const videoChunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          videoChunks.push(e.data);
        }
      };

      const videoPromise = new Promise<Blob>((resolve, reject) => {
        recorder.onstop = () => {
          const finalVideoBlob = new Blob(videoChunks, { type: recorder.mimeType || 'video/webm' });
          resolve(finalVideoBlob);
        };
        recorder.onerror = (e) => reject(e);
      });

      recorder.start(100);
      await audioEl.play();

      // Keep re-drawing canvas subtly or pulsing while audio plays to ensure steady frames
      const ctx = canvas.getContext('2d');
      let animFrameId: number;
      const startTime = Date.now();

      const pulseLoop = () => {
        if (audioEl.ended || audioEl.paused) return;
        // Keep frame active
        if (ctx) {
          const elapsed = (Date.now() - startTime) / 1000;
          // Subtlest breathing corner point
          ctx.save();
          ctx.fillStyle = '#D4AF37';
          ctx.globalAlpha = 0.5 + Math.sin(elapsed * 2) * 0.4;
          ctx.beginPath();
          ctx.arc(64, 64, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        animFrameId = requestAnimationFrame(pulseLoop);
      };
      animFrameId = requestAnimationFrame(pulseLoop);

      // Wait until audio finishes
      await new Promise<void>((resolve) => {
        audioEl.onended = () => resolve();
        // Fallback safety timeout in case onended doesn't fire
        setTimeout(() => resolve(), (duration + 1.5) * 1000);
      });

      cancelAnimationFrame(animFrameId);
      audioEl.pause();
      if (audioCtx.state !== 'closed') {
        try {
          await audioCtx.close();
        } catch (e) {}
      }

      recorder.stop();
      combinedStream.getTracks().forEach((track) => track.stop());

      const finalVideoBlob = await videoPromise;
      URL.revokeObjectURL(audioUrl);

      const isMp4 = recorder.mimeType.includes('mp4');
      const ext = isMp4 ? 'mp4' : 'webm';
      const filename = `Quran_${target.surahName}_Ayah_${target.startAyah}.${ext}`;

      if (action === 'share') {
        const file = new File([finalVideoBlob], filename, { type: finalVideoBlob.type });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              title: `فيديو آيات من سورة ${target.surahName}`,
              text: `تلاوة ${ayahLabel} من سورة ${target.surahName} بصوت ${qariName}`,
              files: [file]
            });
            showToast('تمت مشاركة الفيديو بنجاح 🎥');
          } catch (e: any) {
            if (e.name !== 'AbortError') {
              downloadBlob(finalVideoBlob, filename);
            }
          }
        } else {
          downloadBlob(finalVideoBlob, filename);
        }
      } else {
        downloadBlob(finalVideoBlob, filename);
      }
    } catch (err: any) {
      console.error('Video generation error:', err);
      showToast(err.message || 'حدث خطأ أثناء إنتاج الفيديو');
    } finally {
      setIsGenerating(false);
      setGenerationProgress('');
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('تم حفظ مقطع الفيديو بنجاح 🎥');
  };

  if (!isOpen || !target) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[250] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          className="relative w-full max-w-lg bg-[#FAF8F5] dark:bg-[#161B16] rounded-3xl shadow-2xl border border-amber-600/30 overflow-hidden flex flex-col my-auto"
          dir="rtl"
        >
          {/* Header */}
          <div className="px-5 py-4 bg-gradient-to-r from-[#1A2E1A] via-[#213A21] to-[#1A2E1A] text-white flex items-center justify-between border-b border-amber-500/20">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
                <Share2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base sm:text-lg flex items-center gap-1.5 font-sans">
                  <span>مشاركة الآيات</span>
                  <span className="text-amber-300 text-xs px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/30">
                    ٤ صيغ مختلفة
                  </span>
                </h3>
                <p className="text-xs text-emerald-200/80 font-sans">
                  سورة {target.surahName} • {ayahLabel}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 4 Tabs Selector */}
          <div className="p-3 bg-white/70 dark:bg-white/5 border-b border-gray-200 dark:border-white/10 grid grid-cols-4 gap-1.5">
            <button
              onClick={() => setActiveType('text')}
              className={`py-2 px-1 rounded-xl text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1 transition-all cursor-pointer ${
                activeType === 'text'
                  ? 'bg-emerald-800 text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <FileText className="w-4 h-4 text-amber-400" />
              <span>1. نص</span>
            </button>

            <button
              onClick={() => setActiveType('audio')}
              className={`py-2 px-1 rounded-xl text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1 transition-all cursor-pointer ${
                activeType === 'audio'
                  ? 'bg-emerald-800 text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <Volume2 className="w-4 h-4 text-amber-400" />
              <span>2. صوت</span>
            </button>

            <button
              onClick={() => setActiveType('image')}
              className={`py-2 px-1 rounded-xl text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1 transition-all cursor-pointer ${
                activeType === 'image'
                  ? 'bg-emerald-800 text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <ImageIcon className="w-4 h-4 text-amber-400" />
              <span>3. صورة</span>
            </button>

            <button
              onClick={() => setActiveType('video')}
              className={`py-2 px-1 rounded-xl text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1 transition-all cursor-pointer ${
                activeType === 'video'
                  ? 'bg-emerald-800 text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <Video className="w-4 h-4 text-amber-400" />
              <span>4. فيديو</span>
            </button>
          </div>

          {/* Content Body */}
          <div className="p-4 sm:p-5 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Loading Text state */}
            {isLoadingText && (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-emerald-800 dark:text-emerald-400">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                <span className="text-xs font-bold">جاري جلب نص الآيات الكريمة...</span>
              </div>
            )}

            {/* TAB 1: TEXT */}
            {!isLoadingText && activeType === 'text' && (
              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 shadow-inner">
                  <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 block mb-2">
                    نص الآية المنسق مع العزو:
                  </span>
                  <p className="font-amiri text-lg sm:text-xl text-gray-800 dark:text-gray-100 leading-loose text-center">
                    ﴿ {verseText} ﴾
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-left mt-3 font-sans border-t border-gray-100 dark:border-white/5 pt-2">
                    [سورة {target.surahName} : {ayahLabel}]
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleCopyText}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 text-gray-800 dark:text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <Copy className="w-4 h-4 text-amber-500" />
                    <span>نسخ النص فقط</span>
                  </button>

                  <button
                    onClick={handleShareText}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>مشاركة النص</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: AUDIO */}
            {!isLoadingText && activeType === 'audio' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">اختيار المقرئ للتلاوة:</span>
                    <span className="text-[11px] text-amber-600 dark:text-amber-400 font-bold">صوت نقي عالي الجودة</span>
                  </div>

                  <select
                    value={selectedQari}
                    onChange={(e) => setSelectedQari(e.target.value)}
                    className="w-full text-xs sm:text-sm bg-gray-50 dark:bg-neutral-800 dark:text-white border border-gray-200 dark:border-white/10 rounded-xl p-2.5 outline-none font-bold cursor-pointer"
                  >
                    {RECITERS_LIST.map((q) => (
                      <option key={q.id} value={q.id} className="dark:bg-neutral-900">
                        {q.name}
                      </option>
                    ))}
                  </select>

                  <div className="pt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-white/5">
                    <span>عدد الآيات في المقطع:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {target.endAyah - target.startAyah + 1} آية
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleDownloadAudio}
                    disabled={isGenerating}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 text-gray-800 dark:text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
                  >
                    <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>تنزيل المقطع الصوتي</span>
                  </button>

                  <button
                    onClick={handleShareAudio}
                    disabled={isGenerating}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md transition-colors disabled:opacity-50"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>مشاركة الملف الصوتي</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: IMAGE */}
            {!isLoadingText && activeType === 'image' && (
              <div className="space-y-4">
                {/* Theme Selector */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300">نمط بطاقة الآية:</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setCardTheme('emerald')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        cardTheme === 'emerald'
                          ? 'bg-emerald-900 text-amber-300 border-amber-400 ring-2 ring-emerald-500/40'
                          : 'bg-emerald-950/40 text-gray-400 border-transparent'
                      }`}
                    >
                      زمردي وذهبي
                    </button>
                    <button
                      onClick={() => setCardTheme('royal_dark')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        cardTheme === 'royal_dark'
                          ? 'bg-slate-900 text-amber-300 border-amber-400 ring-2 ring-slate-500/40'
                          : 'bg-slate-900/40 text-gray-400 border-transparent'
                      }`}
                    >
                      كحلي ملكي
                    </button>
                    <button
                      onClick={() => setCardTheme('cream_gold')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        cardTheme === 'cream_gold'
                          ? 'bg-[#FDFBF7] text-[#8F7728] border-[#8F7728] ring-2 ring-amber-300/40'
                          : 'bg-amber-100/30 text-gray-500 border-transparent'
                      }`}
                    >
                      ورقي فاخر
                    </button>
                  </div>
                </div>

                {/* Preview Thumbnail */}
                <div className="relative aspect-square max-w-[280px] mx-auto rounded-2xl overflow-hidden shadow-xl border border-amber-500/30 flex items-center justify-center bg-black/10">
                  {previewImageUrl ? (
                    <img src={previewImageUrl} alt="Quran Card Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-gray-400 text-xs">
                      <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                      <span>جاري توليد المعاينة...</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleDownloadImage}
                    disabled={isGenerating}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 text-gray-800 dark:text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
                  >
                    <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>حفظ الصورة (HD)</span>
                  </button>

                  <button
                    onClick={handleShareImage}
                    disabled={isGenerating}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md transition-colors disabled:opacity-50"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>مشاركة الصورة</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 4: VIDEO (IMAGE + AUDIO MERGED) */}
            {!isLoadingText && activeType === 'video' && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                  <Sparkles className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="text-xs leading-relaxed">
                    <p className="font-bold">دمج الصورة والصوت معاً في مقطع فيديو مرئي 🎬</p>
                    <p className="opacity-80 mt-0.5">
                      يتم توليد فيديو بدقة عالية مدمج فيه بطاقة الآية المزخرفة مع التلاوة المرتلة للمقرئ المختار، مناسب للمشاركة في حالات الواتساب وإنستغرام وفيسبوك.
                    </p>
                  </div>
                </div>

                {/* Settings for video: Qari & Theme */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div className="space-y-1">
                    <label className="font-bold text-gray-700 dark:text-gray-300">المقرئ المختار:</label>
                    <select
                      value={selectedQari}
                      onChange={(e) => setSelectedQari(e.target.value)}
                      className="w-full bg-white dark:bg-neutral-800 dark:text-white border border-gray-200 dark:border-white/10 rounded-xl p-2 outline-none font-bold cursor-pointer"
                    >
                      {RECITERS_LIST.map((q) => (
                        <option key={q.id} value={q.id} className="dark:bg-neutral-900">
                          {q.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-gray-700 dark:text-gray-300">خلفية الفيديو:</label>
                    <select
                      value={cardTheme}
                      onChange={(e) => setCardTheme(e.target.value as CardTheme)}
                      className="w-full bg-white dark:bg-neutral-800 dark:text-white border border-gray-200 dark:border-white/10 rounded-xl p-2 outline-none font-bold cursor-pointer"
                    >
                      <option value="emerald">زمردي إسلامي مع ذهبي</option>
                      <option value="royal_dark">كحلي ملكي فاخر</option>
                      <option value="cream_gold">ورقي عتيق ذهبي</option>
                    </select>
                  </div>
                </div>

                {/* Video Generation Progress Indicator */}
                {isGenerating && (
                  <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
                    <Loader2 className="w-5 h-5 text-amber-500 animate-spin shrink-0" />
                    <div className="text-xs">
                      <span className="font-bold text-emerald-800 dark:text-emerald-300 block">
                        جاري إنتاج الفيديو...
                      </span>
                      <span className="text-gray-600 dark:text-gray-400">{generationProgress}</span>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => handleGenerateVideo('download')}
                    disabled={isGenerating}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 text-gray-800 dark:text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
                  >
                    <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>تنزيل الفيديو</span>
                  </button>

                  <button
                    onClick={() => handleGenerateVideo('share')}
                    disabled={isGenerating}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md transition-colors disabled:opacity-50"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>مشاركة الفيديو مباشرة</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Toast Notification */}
          <AnimatePresence>
            {toastMessage && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-4 left-4 right-4 z-20 py-2.5 px-4 rounded-xl bg-emerald-900/95 text-white text-xs font-bold shadow-xl border border-emerald-400/30 flex items-center justify-center gap-2 backdrop-blur-sm"
              >
                <Check className="w-4 h-4 text-amber-400" />
                <span>{toastMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
