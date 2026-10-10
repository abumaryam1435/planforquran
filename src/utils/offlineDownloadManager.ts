import { SURAH_METADATAList } from './quranPageMapping';

export const RECITERS_LIST = [
  { id: 'Minshawy_Murattal_128kbps', name: 'الشيخ محمد صديق المنشاوي (مرتل)' },
  { id: 'Husary_128kbps', name: 'الشيخ محمود خليل الحصري (مرتل)' },
  { id: 'Abdul_Basit_Murattal_64kbps', name: 'الشيخ عبد الباسط عبد الصمد (مرتل)' },
  { id: 'Ayman_Sowaid_64kbps', name: 'الشيخ الدكتور أيمن سويد' },
  { id: 'Muhammad_Ayyoub_128kbps', name: 'الشيخ محمد أيوب' },
  { id: 'Ghamadi_40kbps', name: 'الشيخ سعد الغامدي' },
  { id: 'MaherAlMuaiqly128kbps', name: 'الشيخ ماهر المعيقلي' },
];

export const TOTAL_MUSHAF_PAGES = 604;
export const TOTAL_MUSHAF_AYAHS = 6236;

export interface DetailedDownloadProgress {
  isDownloading: boolean;
  isPaused: boolean;
  mode: 'idle' | 'pages' | 'audio' | 'both';
  pagesDownloaded: number;
  totalPages: number;
  audioDownloaded: number;
  totalAudio: number;
  currentQari: string;
  currentQariName: string;
  statusMessage: string;
  downloadSpeed: string;
  estimatedTimeRemaining: string;
  error?: string;
  wifiOnly: boolean;
  percentTotal: number;
}

export type DownloadProgressSubscriber = (state: DetailedDownloadProgress) => void;

const IMAGES_CACHE = 'quran-images-v1';
const PAGES_CACHE = 'quran-pages-v1';
const WORDS_CACHE = 'quran-words-v1';
const AUDIO_CACHE = 'quran-audio-v1';

let activeAbortController: AbortController | null = null;
const subscribers = new Set<DownloadProgressSubscriber>();

let globalDownloadState: DetailedDownloadProgress = {
  isDownloading: false,
  isPaused: false,
  mode: 'idle',
  pagesDownloaded: 0,
  totalPages: TOTAL_MUSHAF_PAGES,
  audioDownloaded: 0,
  totalAudio: TOTAL_MUSHAF_AYAHS,
  currentQari: 'Minshawy_Murattal_128kbps',
  currentQariName: 'الشيخ محمد صديق المنشاوي (مرتل)',
  statusMessage: 'جاهز لبدء التنزيل',
  downloadSpeed: '',
  estimatedTimeRemaining: '',
  wifiOnly: false,
  percentTotal: 0
};

function emitUpdate(partial: Partial<DetailedDownloadProgress>) {
  globalDownloadState = { ...globalDownloadState, ...partial };
  subscribers.forEach(cb => {
    try {
      cb(globalDownloadState);
    } catch (e) {
      console.error('Subscriber error:', e);
    }
  });
}

export function subscribeToDetailedDownload(callback: DownloadProgressSubscriber) {
  subscribers.add(callback);
  callback(globalDownloadState);
  return () => {
    subscribers.delete(callback);
  };
}

export function getDownloadState(): DetailedDownloadProgress {
  return globalDownloadState;
}

/**
 * Checks whether the current connection is strictly Wi-Fi or high-speed non-cellular
 */
export function isConnectedToWifi(): boolean {
  if (typeof navigator === 'undefined') return true;
  const nav = navigator as any;
  const conn = nav.connection || nav.mozConnection || nav.webkitConnection;
  if (!conn) return true; // If Network Information API is not supported, assume allowed
  if (conn.type) {
    return conn.type === 'wifi' || conn.type === 'ethernet';
  }
  return true;
}

/**
 * Calculate accurate offline storage statistics
 */
export async function getOfflineStorageStats(): Promise<{
  cachedPages: number;
  cachedAudios: number;
  storageMB: number;
  isPagesComplete: boolean;
  isAudioComplete: boolean;
  isFullyOfflineReady: boolean;
}> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return {
      cachedPages: 0,
      cachedAudios: 0,
      storageMB: 0,
      isPagesComplete: false,
      isAudioComplete: false,
      isFullyOfflineReady: false
    };
  }

  try {
    const imgCache = await caches.open(IMAGES_CACHE);
    const imgKeys = await imgCache.keys();
    
    // Count unique downloaded pages
    const uniquePages = new Set<number>();
    for (const req of imgKeys) {
      const match = req.url.match(/page0*(\d+)\.png/);
      if (match && match[1]) {
        const pageNum = parseInt(match[1], 10);
        if (pageNum >= 1 && pageNum <= TOTAL_MUSHAF_PAGES) {
          uniquePages.add(pageNum);
        }
      }
    }

    const audioCache = await caches.open(AUDIO_CACHE);
    const audioKeys = await audioCache.keys();
    
    const uniqueAyahs = new Set<string>();
    for (const req of audioKeys) {
      const match = req.url.match(/\/(\d{6})\.mp3/);
      if (match && match[1]) {
        uniqueAyahs.add(match[1]);
      }
    }

    let approxMB = 0;
    if (navigator.storage && navigator.storage.estimate) {
      const est = await navigator.storage.estimate();
      if (est.usage) {
        approxMB = Math.round((est.usage / (1024 * 1024)) * 10) / 10;
      }
    }
    if (approxMB === 0) {
      // Approximate fallback: ~140KB per page, ~75KB per ayah audio
      approxMB = Math.round(((uniquePages.size * 0.14) + (audioKeys.length * 0.075)) * 10) / 10;
    }

    const cachedPages = uniquePages.size;
    const cachedAudios = audioKeys.length;
    const isPagesComplete = cachedPages >= TOTAL_MUSHAF_PAGES;
    const isAudioComplete = cachedAudios >= TOTAL_MUSHAF_AYAHS;
    const isFullyOfflineReady = isPagesComplete && isAudioComplete;

    return {
      cachedPages,
      cachedAudios,
      storageMB: approxMB,
      isPagesComplete,
      isAudioComplete,
      isFullyOfflineReady
    };
  } catch (err) {
    console.warn('Error fetching offline stats:', err);
    return {
      cachedPages: 0,
      cachedAudios: 0,
      storageMB: 0,
      isPagesComplete: false,
      isAudioComplete: false,
      isFullyOfflineReady: false
    };
  }
}

/**
 * Clears all offline caches
 */
export async function clearAllOfflineStorage(): Promise<void> {
  if (typeof window === 'undefined' || !('caches' in window)) return;
  try {
    cancelDetailedDownload();
    await caches.delete(IMAGES_CACHE);
    await caches.delete(PAGES_CACHE);
    await caches.delete(WORDS_CACHE);
    await caches.delete(AUDIO_CACHE);
    emitUpdate({
      pagesDownloaded: 0,
      audioDownloaded: 0,
      percentTotal: 0,
      statusMessage: 'تم مسح جميع البيانات بدون إنترنت وتفريغ الذاكرة'
    });
  } catch (err) {
    console.error('Error clearing offline storage:', err);
  }
}

/**
 * Stop/Cancel active download
 */
export function cancelDetailedDownload() {
  if (activeAbortController) {
    activeAbortController.abort();
    activeAbortController = null;
  }
  emitUpdate({
    isDownloading: false,
    isPaused: false,
    mode: 'idle',
    statusMessage: 'تم إلغاء التنزيل'
  });
}

/**
 * Pause download
 */
export function pauseDetailedDownload() {
  if (activeAbortController) {
    activeAbortController.abort();
    activeAbortController = null;
  }
  emitUpdate({
    isDownloading: false,
    isPaused: true,
    statusMessage: 'تم إيقاف التنزيل مؤقتاً'
  });
}

// Keep track of pending state for resume
let savedDownloadOptions: {
  mode: 'pages' | 'audio' | 'both';
  qari: string;
  wifiOnly: boolean;
} | null = null;

export function resumeDetailedDownload() {
  if (savedDownloadOptions) {
    startDetailedDownload(savedDownloadOptions);
  }
}

/**
 * Main Download Engine: Fast, concurrency-controlled, resumable
 */
export async function startDetailedDownload(options: {
  mode: 'pages' | 'audio' | 'both';
  qari?: string;
  wifiOnly?: boolean;
}): Promise<void> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    emitUpdate({
      error: 'المتصفح لا يدعم حفظ البيانات للاستخدام بدون إنترنت (Cache API)',
      statusMessage: 'المتصفح غير مدعوم'
    });
    return;
  }

  const qari = options.qari || localStorage.getItem('quran_qari') || 'Minshawy_Murattal_128kbps';
  const qariMeta = RECITERS_LIST.find(r => r.id === qari) || RECITERS_LIST[0];
  const wifiOnly = options.wifiOnly ?? (localStorage.getItem('offline_download_wifi_only') === 'true');

  savedDownloadOptions = { mode: options.mode, qari, wifiOnly };

  if (wifiOnly && !isConnectedToWifi()) {
    emitUpdate({
      error: 'التنزيل معطّل حالياً لأنك لست متصلاً بشبكة واي فاي (Wi-Fi)',
      statusMessage: 'في انتظار شبكة واي فاي...'
    });
    return;
  }

  // Cancel any running download first
  if (activeAbortController) {
    activeAbortController.abort();
  }

  activeAbortController = new AbortController();
  const signal = activeAbortController.signal;

  emitUpdate({
    isDownloading: true,
    isPaused: false,
    mode: options.mode,
    currentQari: qari,
    currentQariName: qariMeta.name,
    wifiOnly,
    error: undefined,
    statusMessage: 'جاري فحص المحتوى المحفوظ مسبقاً...'
  });

  const startTime = Date.now();
  let totalProcessedItems = 0;

  try {
    const imgCache = await caches.open(IMAGES_CACHE);
    const pageCache = await caches.open(PAGES_CACHE);
    const wordsCache = await caches.open(WORDS_CACHE);
    const audioCache = await caches.open(AUDIO_CACHE);

    // ==========================================
    // Phase 1: Download Quran Pages (604 pages)
    // ==========================================
    if (options.mode === 'pages' || options.mode === 'both') {
      emitUpdate({ statusMessage: 'جاري حصر صفحات المصحف المطلوبة...' });

      const pagesQueue: number[] = [];
      for (let p = 1; p <= TOTAL_MUSHAF_PAGES; p++) {
        pagesQueue.push(p);
      }

      // Check which pages are already cached
      let pagesCount = 0;
      const pagesToFetch: number[] = [];

      for (const p of pagesQueue) {
        const pagePad = p.toString().padStart(3, '0');
        const imgUrl = `https://files.quran.app/hafs/madani/width_1260/page${pagePad}.png`;
        const legacyUrl = `https://android.quran.com/data/width_1260/page${pagePad}.png`;
        const hasImg = (await imgCache.match(imgUrl)) || (await imgCache.match(legacyUrl));
        if (hasImg) {
          pagesCount++;
        } else {
          pagesToFetch.push(p);
        }
      }

      emitUpdate({
        pagesDownloaded: pagesCount,
        percentTotal: Math.round((pagesCount / TOTAL_MUSHAF_PAGES) * 100),
        statusMessage: pagesToFetch.length === 0
          ? 'صفحات المصحف كاملة (604 صفحة) منزلة مسبقاً ومحفوظة بنجاح'
          : `جاري تنزيل الصفحات المتبقية (${pagesToFetch.length} صفحة)...`
      });

      // Concurrent downloader worker pool (5 workers)
      const CONCURRENCY = 5;
      let currentIndex = 0;

      const downloadPageWorker = async () => {
        while (currentIndex < pagesToFetch.length) {
          if (signal.aborted) throw new Error('Aborted');

          if (wifiOnly && !isConnectedToWifi()) {
            throw new Error('Lost WiFi');
          }

          const pageNum = pagesToFetch[currentIndex++];
          const pagePad = pageNum.toString().padStart(3, '0');

          // 1. Download Page Image
          const primaryUrl = `https://files.quran.app/hafs/madani/width_1260/page${pagePad}.png`;
          const secondaryUrl = `https://android.quran.com/data/width_1260/page${pagePad}.png`;
          const tertiaryUrl = `https://android.quran.com/data/width_1024/page${pagePad}.png`;

          try {
            let res = await fetch(primaryUrl, { signal });
            if (!res.ok) res = await fetch(secondaryUrl, { signal });
            if (!res.ok) res = await fetch(tertiaryUrl, { signal });

            if (res.ok) {
              await imgCache.put(primaryUrl, res.clone());
              await imgCache.put(secondaryUrl, res);
            }
          } catch (e: any) {
            if (e.name === 'AbortError') throw e;
          }

          // 2. Download Page JSON Metadata
          const pageApiUrl = `https://api.alquran.cloud/v1/page/${pageNum}/quran-uthmani`;
          try {
            const hasJson = await pageCache.match(pageApiUrl);
            if (!hasJson) {
              const resJson = await fetch(pageApiUrl, { signal });
              if (resJson.ok) {
                await pageCache.put(pageApiUrl, resJson);
              }
            }
          } catch (e: any) {
            if (e.name === 'AbortError') throw e;
          }

          // 3. Download Words Coordinates JSON
          const wordsUrl = `https://api.quran.com/api/v4/verses/by_page/${pageNum}?words=true&word_fields=text_uthmani,line_number&per_page=50`;
          try {
            const hasWords = await wordsCache.match(wordsUrl);
            if (!hasWords) {
              const resWords = await fetch(wordsUrl, { signal });
              if (resWords.ok) {
                await wordsCache.put(wordsUrl, resWords);
              }
            }
          } catch (e: any) {
            if (e.name === 'AbortError') throw e;
          }

          pagesCount++;
          totalProcessedItems++;

          const elapsedSec = Math.max(1, (Date.now() - startTime) / 1000);
          const speed = (totalProcessedItems / elapsedSec).toFixed(1);
          const remainingPages = pagesToFetch.length - currentIndex;
          const estSec = Math.ceil(remainingPages / Math.max(0.5, parseFloat(speed)));
          const estMin = Math.ceil(estSec / 60);

          emitUpdate({
            pagesDownloaded: pagesCount,
            percentTotal: Math.round((pagesCount / TOTAL_MUSHAF_PAGES) * 100),
            downloadSpeed: `${speed} صفحة/ثانية`,
            estimatedTimeRemaining: estMin > 1 ? `متبقي حوالي ${estMin} دقيقة` : `متبقي حوالي دقيقة واحدة`,
            statusMessage: `جاري تنزيل صفحة ${pageNum} من 604...`
          });
        }
      };

      const workers = Array.from({ length: CONCURRENCY }, () => downloadPageWorker());
      await Promise.all(workers);

      emitUpdate({
        pagesDownloaded: TOTAL_MUSHAF_PAGES,
        percentTotal: 100,
        statusMessage: 'تم تنزيل وحفظ صفحات المصحف كاملاً (604 صفحة) بنجاح!'
      });
    }

    // ==========================================
    // Phase 2: Download Audio Recitations (6,236 clips)
    // ==========================================
    if (options.mode === 'audio' || options.mode === 'both') {
      emitUpdate({
        statusMessage: `جاري حصر المقاطع الصوتية لتلاوة ${qariMeta.name}...`
      });

      // Build list of all 6,236 ayahs from SURAH_METADATAList
      const allAyahsList: { surah: number; ayah: number; code: string }[] = [];
      SURAH_METADATAList.forEach((meta, sIdx) => {
        const surahNum = sIdx + 1;
        for (let a = 1; a <= meta.endVerse; a++) {
          const surahPad = surahNum.toString().padStart(3, '0');
          const ayahPad = a.toString().padStart(3, '0');
          allAyahsList.push({
            surah: surahNum,
            ayah: a,
            code: `${surahPad}${ayahPad}`
          });
        }
      });

      // Check how many are already cached
      let audioCount = 0;
      const audioToFetch: typeof allAyahsList = [];

      for (const item of allAyahsList) {
        const audioUrl = `https://everyayah.com/data/${qari}/${item.code}.mp3`;
        const hasAudio = await audioCache.match(audioUrl);
        if (hasAudio) {
          audioCount++;
        } else {
          audioToFetch.push(item);
        }
      }

      emitUpdate({
        audioDownloaded: audioCount,
        percentTotal: Math.round((audioCount / TOTAL_MUSHAF_AYAHS) * 100),
        statusMessage: audioToFetch.length === 0
          ? `التلاوة كاملة بصوت ${qariMeta.name} منزلة مسبقاً (6,236 آية)`
          : `جاري تنزيل تلاوة ${qariMeta.name}: متبقي ${audioToFetch.length} آية...`
      });

      // Concurrent Audio Downloader Worker Pool (6 workers)
      const AUDIO_CONCURRENCY = 6;
      let audioIndex = 0;

      const downloadAudioWorker = async () => {
        while (audioIndex < audioToFetch.length) {
          if (signal.aborted) throw new Error('Aborted');

          if (wifiOnly && !isConnectedToWifi()) {
            throw new Error('Lost WiFi');
          }

          const item = audioToFetch[audioIndex++];
          const audioUrl = `https://everyayah.com/data/${qari}/${item.code}.mp3`;

          try {
            const res = await fetch(audioUrl, { signal });
            if (res.ok) {
              await audioCache.put(audioUrl, res);
            }
          } catch (e: any) {
            if (e.name === 'AbortError') throw e;
          }

          audioCount++;
          totalProcessedItems++;

          const elapsedSec = Math.max(1, (Date.now() - startTime) / 1000);
          const speed = (totalProcessedItems / elapsedSec).toFixed(1);
          const remainingClips = audioToFetch.length - audioIndex;
          const estSec = Math.ceil(remainingClips / Math.max(1, parseFloat(speed)));
          const estMin = Math.ceil(estSec / 60);

          emitUpdate({
            audioDownloaded: audioCount,
            percentTotal: Math.round((audioCount / TOTAL_MUSHAF_AYAHS) * 100),
            downloadSpeed: `${speed} ملف/ثانية`,
            estimatedTimeRemaining: estMin > 1 ? `متبقي حوالي ${estMin} دقيقة` : `متبقي أقل من دقيقة`,
            statusMessage: `تنزيل صوتي: سورة ${SURAH_METADATAList[item.surah - 1]?.name || item.surah} آية ${item.ayah} (${audioCount}/${TOTAL_MUSHAF_AYAHS})...`
          });
        }
      };

      const audioWorkers = Array.from({ length: AUDIO_CONCURRENCY }, () => downloadAudioWorker());
      await Promise.all(audioWorkers);

      emitUpdate({
        audioDownloaded: TOTAL_MUSHAF_AYAHS,
        percentTotal: 100,
        statusMessage: `تم تنزيل جميع المقاطع الصوتية (6,236 آية) بصوت ${qariMeta.name} بنجاح!`
      });
    }

    emitUpdate({
      isDownloading: false,
      isPaused: false,
      statusMessage: 'اكتمل التنزيل بنجاح! التطبيق جاهز تماماً للاستخدام محلياً بدون إنترنت 🎉'
    });

  } catch (err: any) {
    if (err.name === 'AbortError') {
      // Intentionally aborted (pause or cancel)
      return;
    }

    if (err.message === 'Lost WiFi') {
      emitUpdate({
        isDownloading: false,
        isPaused: true,
        error: 'تم إيقاف التنزيل مؤقتاً لانقطاع اتصال الواي فاي',
        statusMessage: 'توقف مؤقت: في انتظار إعادة الاتصال بشبكة واي فاي'
      });
      return;
    }

    console.error('Download error:', err);
    emitUpdate({
      isDownloading: false,
      isPaused: true,
      error: 'تعذر إكمال التنزيل بسبب انقطاع الاتصال بالشبكة. يمكنك الاستئناف لاحقاً.',
      statusMessage: 'حدث خطأ في الاتصال'
    });
  }
}
