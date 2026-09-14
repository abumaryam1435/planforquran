import { AyahInfo } from './ayahFetcher';

const PAGES_CACHE = 'quran-pages-v1';
const IMAGES_CACHE = 'quran-images-v1';
const AUDIO_CACHE = 'quran-audio-v1';
const WORDS_CACHE = 'quran-words-v1';

let activeDownloadController: AbortController | null = null;

export interface DownloadProgress {
  currentPage: number;
  totalPages: number;
  currentAyah: number;
  totalAyahs: number;
  statusText: string;
  isDownloading: boolean;
  isPaused: boolean;
  downloadedPagesCount: number;
  remainingPagesCount: number;
  downloadedAyahsCount: number;
  totalAyahsInBatch: number;
  downloadSpeedPagesPerSec?: number;
  estimatedSecondsRemaining?: number;
  error?: string;
  totalCachedPagesInBrowser?: number;
  totalCachedAudiosInBrowser?: number;
}

export type DownloadListener = (progress: DownloadProgress) => void;
const listeners = new Set<DownloadListener>();

export let globalDownloadState: DownloadProgress = {
  currentPage: 0,
  totalPages: 0,
  currentAyah: 0,
  totalAyahs: 0,
  statusText: '',
  isDownloading: false,
  isPaused: false,
  downloadedPagesCount: 0,
  remainingPagesCount: 0,
  downloadedAyahsCount: 0,
  totalAyahsInBatch: 0,
};

// Queue state for pause/resume
let currentPagesQueue: number[] = [];
let currentIncludeAudio: boolean = true;
let currentBatchIndex: number = 0;
let isPausedState = false;
let downloadedPagesInBatch = 0;
let downloadedAyahsInBatch = 0;
let totalAyahsInBatch = 0;
let downloadStartTime = 0;

function emitProgress(progress: DownloadProgress) {
  globalDownloadState = progress;
  listeners.forEach((l) => l(progress));
}

export function subscribeToDownload(listener: DownloadListener) {
  listeners.add(listener);
  listener(globalDownloadState);
  return () => listeners.delete(listener);
}

export function pauseDownload() {
  if (activeDownloadController) {
    isPausedState = true;
    activeDownloadController.abort();
    activeDownloadController = null;
    emitProgress({
      ...globalDownloadState,
      isDownloading: false,
      isPaused: true,
      statusText: 'تم إيقاف التنزيل مؤقتاً',
    });
  }
}

export function resumeDownload() {
  if (isPausedState && currentPagesQueue.length > 0) {
    isPausedState = false;
    downloadPagesAndAudio(currentPagesQueue, currentIncludeAudio, undefined, currentBatchIndex, true);
  }
}

// Automatically pause/resume on network status change
if (typeof window !== 'undefined') {
  window.addEventListener('offline', () => {
    if (globalDownloadState.isDownloading) {
      pauseDownload();
    }
  });
  
  window.addEventListener('online', () => {
    if (globalDownloadState.isPaused) {
      resumeDownload();
    }
  });
}

export function cancelActiveDownload() {
  if (activeDownloadController) {
    activeDownloadController.abort();
    activeDownloadController = null;
  }
  isPausedState = false;
  currentPagesQueue = [];
  currentBatchIndex = 0;
  downloadedPagesInBatch = 0;
  downloadedAyahsInBatch = 0;
  totalAyahsInBatch = 0;

  emitProgress({
    currentPage: 0,
    totalPages: 0,
    currentAyah: 0,
    totalAyahs: 0,
    statusText: 'تم إلغاء التنزيل',
    isDownloading: false,
    isPaused: false,
    downloadedPagesCount: 0,
    remainingPagesCount: 0,
    downloadedAyahsCount: 0,
    totalAyahsInBatch: 0,
  });
}

export async function getCachedPagesCount(): Promise<number> {
  if (!('caches' in window)) return 0;
  try {
    const cache = await caches.open(PAGES_CACHE);
    const keys = await cache.keys();
    const imgCache = await caches.open(IMAGES_CACHE);
    const imgKeys = await imgCache.keys();
    return Math.max(keys.length, imgKeys.length);
  } catch {
    return 0;
  }
}

export async function getCachedAudiosCount(): Promise<number> {
  if (!('caches' in window)) return 0;
  try {
    const cache = await caches.open(AUDIO_CACHE);
    const keys = await cache.keys();
    return keys.length;
  } catch {
    return 0;
  }
}

export async function clearAllOfflineData(): Promise<void> {
  if (!('caches' in window)) return;
  try {
    await caches.delete(PAGES_CACHE);
    await caches.delete(IMAGES_CACHE);
    await caches.delete(AUDIO_CACHE);
    await caches.delete(WORDS_CACHE);
  } catch (e) {
    console.error('Failed to clear offline caches', e);
  }
}

export async function getUncachedPages(checkAudio: boolean): Promise<number[]> {
  const uncached: number[] = [];
  if (!('caches' in window)) return uncached;
  const pageCache = await caches.open(PAGES_CACHE);
  const imageCache = await caches.open(IMAGES_CACHE);
  const wordsCache = await caches.open(WORDS_CACHE);
  const audioCache = checkAudio ? await caches.open(AUDIO_CACHE) : null;
  
  for (let i = 1; i <= 604; i++) {
    let isFullyCached = true;
    
    // Check page JSON
    const pageUrl = `https://api.alquran.cloud/v1/page/${i}/quran-uthmani`;
    const cachedPageRes = await pageCache.match(pageUrl);
    if (!cachedPageRes) {
      isFullyCached = false;
    } else if (checkAudio && audioCache) {
      // Check audio if page json is cached
      try {
        // Clone the response before reading so we don't consume it
        const clonedRes = cachedPageRes.clone();
        const pageData = await clonedRes.json();
        if (pageData && pageData.data && pageData.data.ayahs) {
          const ayahs: AyahInfo[] = pageData.data.ayahs;
          let qari = localStorage.getItem('quran_qari') || 'Minshawy_Murattal_128kbps';
          if (qari === 'Maher_Alwan_64kbps') {
             qari = 'Muhammad_Ayyoub_128kbps';
          }
          for (const ayah of ayahs) {
            const audioUrl = `https://everyayah.com/data/${qari}/${String(ayah.surah.number).padStart(3, '0')}${String(ayah.numberInSurah).padStart(3, '0')}.mp3`;
            const cachedAudio = await audioCache.match(audioUrl);
            if (!cachedAudio) {
              isFullyCached = false;
              break;
            }
          }
        }
      } catch (e) {
        isFullyCached = false;
      }
    }

    if (isFullyCached) {
        // Check image
        const pagePad = i.toString().padStart(3, '0');
        const imageUrl = `https://android.quran.com/data/width_1260/page${pagePad}.png`;
        const cachedImg = await imageCache.match(imageUrl);
        if (!cachedImg) {
            isFullyCached = false;
        }
    }

    if (isFullyCached) {
      // Check words JSON
      const wordsUrl = `https://api.quran.com/api/v4/verses/by_page/${i}?words=true&word_fields=text_uthmani,line_number&per_page=50`;
      const cachedWords = await wordsCache.match(wordsUrl);
      if (!cachedWords) {
        isFullyCached = false;
      }
    }

    if (!isFullyCached) {
      uncached.push(i);
    }
  }
  return uncached;
}


/**
 * Returns the URL for the Quran page image.
 * Caching is handled automatically by the Service Worker.
 */
export async function getPageImageSrc(page: number, fallbackStep: number = 0): Promise<string> {
  const pagePad = page.toString().padStart(3, '0');
  let defaultUrl = `https://android.quran.com/data/width_1260/page${pagePad}.png`;
  if (fallbackStep === 1) defaultUrl = `https://android.quran.com/data/width_1024/page${pagePad}.png`;
  if (fallbackStep === 2) defaultUrl = `https://android.quran.com/data/width_512/page${pagePad}.png`;
  return defaultUrl;
}

/**
 * Returns the URL for the audio.
 * Caching is handled automatically by the Service Worker.
 */
export async function getAudioSrc(surah: number, ayah: number): Promise<string> {
  let qari = typeof window !== 'undefined' ? localStorage.getItem('quran_qari') || 'Minshawy_Murattal_128kbps' : 'Minshawy_Murattal_128kbps';
  if (qari === 'Maher_Alwan_64kbps') {
    qari = 'Muhammad_Ayyoub_128kbps';
  }
  const defaultUrl = `https://everyayah.com/data/${qari}/${String(surah).padStart(3, '0')}${String(ayah).padStart(3, '0')}.mp3`;
  return defaultUrl;
}

/**
 * Returns the URL for the Quran page image.
 */
export async function downloadPagesAndAudio(
  pages: number[],
  downloadAudio: boolean,
  onProgress?: (progress: DownloadProgress) => void,
  startIndex: number = 0,
  isResume: boolean = false
): Promise<void> {
  const reportProgress = (progress: DownloadProgress) => {
    emitProgress(progress);
    if (onProgress) onProgress(progress);
  };

  if (!('caches' in window)) {
    reportProgress({
      currentPage: 0,
      totalPages: pages.length,
      currentAyah: 0,
      totalAyahs: 0,
      statusText: 'المتصفح لا يدعم تخزين البيانات غير المتصلة بالإنترنت',
      isDownloading: false,
      isPaused: false,
      downloadedPagesCount: 0,
      remainingPagesCount: pages.length,
      downloadedAyahsCount: 0,
      totalAyahsInBatch: 0,
      error: 'المتصفح لا يدعم التخزين المؤقت للبيانات',
    });
    return;
  }

  if (!isResume) {
    cancelActiveDownload();
    currentPagesQueue = pages;
    currentIncludeAudio = downloadAudio;
    downloadedPagesInBatch = 0;
    downloadedAyahsInBatch = 0;
    totalAyahsInBatch = 0;
    downloadStartTime = Date.now();
  }

  activeDownloadController = new AbortController();
  const signal = activeDownloadController.signal;
  isPausedState = false;

  const pageCache = await caches.open(PAGES_CACHE);
  const imageCache = await caches.open(IMAGES_CACHE);
  const audioCache = await caches.open(AUDIO_CACHE);

  let pagesProcessed = startIndex;

  reportProgress({
    currentPage: pagesProcessed,
    totalPages: pages.length,
    currentAyah: 0,
    totalAyahs: 0,
    statusText: startIndex > 0 ? 'استئناف التنزيل...' : 'جاري بدء التنزيل...',
    isDownloading: true,
    isPaused: false,
    downloadedPagesCount: pagesProcessed,
    remainingPagesCount: pages.length - pagesProcessed,
    downloadedAyahsCount: downloadedAyahsInBatch,
    totalAyahsInBatch: totalAyahsInBatch,
  });

  try {
    for (let i = startIndex; i < pages.length; i++) {
      if (signal.aborted) throw new Error('Aborted');

      currentBatchIndex = i;
      const page = pages[i];

      const elapsedSec = Math.max(1, (Date.now() - downloadStartTime) / 1000);
      const sessionProcessed = isResume ? pagesProcessed : (pagesProcessed - startIndex);
      const speedPagesPerSec = parseFloat((sessionProcessed / elapsedSec).toFixed(1));
      const remainingPages = pages.length - pagesProcessed;
      const estSecRemaining = speedPagesPerSec > 0 ? Math.ceil(remainingPages / speedPagesPerSec) : 0;

      reportProgress({
        currentPage: pagesProcessed + 1,
        totalPages: pages.length,
        currentAyah: 0,
        totalAyahs: 0,
        statusText: `جاري تنزيل (صفحة ${page}) ... ${pagesProcessed + 1} من ${pages.length}`,
        isDownloading: true,
        isPaused: false,
        downloadedPagesCount: pagesProcessed,
        remainingPagesCount: remainingPages,
        downloadedAyahsCount: downloadedAyahsInBatch,
        totalAyahsInBatch: totalAyahsInBatch,
        downloadSpeedPagesPerSec: speedPagesPerSec,
        estimatedSecondsRemaining: estSecRemaining,
      });

      // 1. Download Page Image (High Res)
      const pagePad = page.toString().padStart(3, '0');
      const imageUrl = `https://android.quran.com/data/width_1260/page${pagePad}.png`;
      const cachedImage = await imageCache.match(imageUrl);
      if (!cachedImage) {
        try {
          const imgRes = await fetch(imageUrl, { mode: 'no-cors', signal });
          if (imgRes.type === 'opaque' || imgRes.ok) {
            await imageCache.put(imageUrl, imgRes);
          }
        } catch (err: any) {
          if (err.name === 'AbortError') throw err;
          console.warn(`Could not download image for page ${page}`, err);
        }
      }

      // 2. Download Page JSON Metadata
      const pageUrl = `https://api.alquran.cloud/v1/page/${page}/quran-uthmani`;
      let pageData: any = null;

      const cachedPage = await pageCache.match(pageUrl);
      if (cachedPage) {
        pageData = await cachedPage.json();
      } else {
        const response = await fetch(pageUrl, { signal });
        if (!response.ok) throw new Error(`Failed to fetch page ${page}`);
        const data = await response.json();
        if (data.code === 200) {
          pageData = data;
          await pageCache.put(pageUrl, new Response(JSON.stringify(data)));
        } else {
          throw new Error(`Invalid page API response for ${page}`);
        }
      }

      // 2.5 Download Words JSON Metadata
      const wordsUrl = `https://api.quran.com/api/v4/verses/by_page/${page}?words=true&word_fields=text_uthmani,line_number&per_page=50`;
      const wordsCache = await caches.open(WORDS_CACHE);
      const cachedWords = await wordsCache.match(wordsUrl);
      if (!cachedWords) {
        try {
          const response = await fetch(wordsUrl, { signal });
          if (response.ok) {
            const data = await response.json();
            await wordsCache.put(wordsUrl, new Response(JSON.stringify(data)));
          }
        } catch (err: any) {
          if (err.name === 'AbortError') throw err;
          console.warn(`Could not download words for page ${page}`, err);
        }
      }

      // 3. Download Audio Clips if enabled
      if (downloadAudio && pageData && pageData.data && pageData.data.ayahs) {
        const ayahs: AyahInfo[] = pageData.data.ayahs;
        let ayahCount = 0;
        totalAyahsInBatch += ayahs.length;

        for (const ayah of ayahs) {
          if (signal.aborted) throw new Error('Aborted');

          ayahCount++;
          downloadedAyahsInBatch++;

          const currentElapsed = Math.max(1, (Date.now() - downloadStartTime) / 1000);
          const currentSessionProcessed = isResume ? pagesProcessed : (pagesProcessed - startIndex);
          const currentSpeed = parseFloat((currentSessionProcessed / currentElapsed).toFixed(1));
          const currentRemaining = pages.length - pagesProcessed;
          const currentEstSec = currentSpeed > 0 ? Math.ceil(currentRemaining / currentSpeed) : 0;

          reportProgress({
            currentPage: pagesProcessed + 1,
            totalPages: pages.length,
            currentAyah: ayahCount,
            totalAyahs: ayahs.length,
            statusText: `جاري تنزيل صوتيات صفحة ${page}: آية ${ayahCount} من ${ayahs.length}...`,
            isDownloading: true,
            isPaused: false,
            downloadedPagesCount: pagesProcessed,
            remainingPagesCount: currentRemaining,
            downloadedAyahsCount: downloadedAyahsInBatch,
            totalAyahsInBatch: totalAyahsInBatch,
            downloadSpeedPagesPerSec: currentSpeed,
            estimatedSecondsRemaining: currentEstSec,
          });

          let qari = typeof window !== 'undefined' ? localStorage.getItem('quran_qari') || 'Minshawy_Murattal_128kbps' : 'Minshawy_Murattal_128kbps';
          if (qari === 'Maher_Alwan_64kbps') {
            qari = 'Muhammad_Ayyoub_128kbps';
          }
          const audioUrl = `https://everyayah.com/data/${qari}/${String(ayah.surah.number).padStart(3, '0')}${String(ayah.numberInSurah).padStart(3, '0')}.mp3`;

          const cachedAudio = await audioCache.match(audioUrl);
          if (!cachedAudio) {
            try {
              const audioRes = await fetch(audioUrl, { signal });
              if (audioRes.ok) {
                await audioCache.put(audioUrl, audioRes);
              }
            } catch (err: any) {
              if (err.name === 'AbortError') throw err;
              console.warn(`Could not download audio for surah ${ayah.surah.number} ayah ${ayah.numberInSurah}`, err);
            }
          }
        }
      }

      pagesProcessed++;
      downloadedPagesInBatch = pagesProcessed;
    }

    reportProgress({
      currentPage: pages.length,
      totalPages: pages.length,
      currentAyah: 0,
      totalAyahs: 0,
      statusText: 'تم التنزيل بنجاح واكتمل حفظ المحتوى!',
      isDownloading: false,
      isPaused: false,
      downloadedPagesCount: pages.length,
      remainingPagesCount: 0,
      downloadedAyahsCount: downloadedAyahsInBatch,
      totalAyahsInBatch: totalAyahsInBatch,
    });

    currentPagesQueue = [];
    currentBatchIndex = 0;
  } catch (error: any) {
    if (error.message === 'Aborted' || error.name === 'AbortError') {
      if (isPausedState) {
        reportProgress({
          currentPage: pagesProcessed,
          totalPages: pages.length,
          currentAyah: 0,
          totalAyahs: 0,
          statusText: 'تم إيقاف التنزيل مؤقتاً',
          isDownloading: false,
          isPaused: true,
          downloadedPagesCount: pagesProcessed,
          remainingPagesCount: pages.length - pagesProcessed,
          downloadedAyahsCount: downloadedAyahsInBatch,
          totalAyahsInBatch: totalAyahsInBatch,
        });
      } else {
        reportProgress({
          currentPage: pagesProcessed,
          totalPages: pages.length,
          currentAyah: 0,
          totalAyahs: 0,
          statusText: 'تم إلغاء التنزيل',
          isDownloading: false,
          isPaused: false,
          downloadedPagesCount: pagesProcessed,
          remainingPagesCount: pages.length - pagesProcessed,
          downloadedAyahsCount: downloadedAyahsInBatch,
          totalAyahsInBatch: totalAyahsInBatch,
        });
      }
    } else {
      console.error(error);
      reportProgress({
        currentPage: pagesProcessed,
        totalPages: pages.length,
        currentAyah: 0,
        totalAyahs: 0,
        statusText: `حدث خطأ أثناء التنزيل: ${error.message || error}`,
        isDownloading: false,
        isPaused: false,
        downloadedPagesCount: pagesProcessed,
        remainingPagesCount: pages.length - pagesProcessed,
        downloadedAyahsCount: downloadedAyahsInBatch,
        totalAyahsInBatch: totalAyahsInBatch,
        error: error.message || String(error),
      });
    }
  } finally {
    activeDownloadController = null;
  }
}

