import { getPageVerseDescription, getPageVerseSubset, PageSection, VerseRange, getActiveVersesForPageAndTask, parseVerseRangesFromArabicText } from './quranPageMapping';
import { getAyahsForPageOffline } from './offlineQuranData';

export interface AyahInfo {
  numberInSurah: number;
  text: string;
  surah: {
    number: number;
    name: string;
  };
}

export function isAyahActive(ayah: AyahInfo, activeSubsets: VerseRange[], hasStrictRestrictions?: boolean): boolean {
  if (activeSubsets.length === 0) return true;
  
  const normalizeForMatch = (str: string) => {
    return str
      .replace(/[\u0617-\u061A\u064B-\u065F\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED\u0670]/g, '') // remove harakat
      .replace(/\u0640/g, '') // remove tatweel (ـ)
      .replace(/[أإآاٱ]/g, 'ا')
      .replace(/[ةه]/g, 'ه')
      .replace(/[ىي]/g, 'ي')
      .replace(/ؤ/g, 'و')
      .replace(/ئ/g, 'ي')
      .replace(/ء/g, '')
      .replace("سورة", "")
      .trim();
  };

  const surahNameNormalized = normalizeForMatch(ayah.surah.name.replace("سُورَةُ ", "").replace("سورة ", ""));

  for (const sub of activeSubsets) {
    const subSurahNormalized = normalizeForMatch(sub.surah.replace("سُورَةُ ", "").replace("سورة ", ""));
    
    if (surahNameNormalized.includes(subSurahNormalized) || 
        subSurahNormalized.includes(surahNameNormalized)) {
        if (ayah.numberInSurah >= sub.start && ayah.numberInSurah <= sub.end) {
            return true;
        }
    }
  }
  return false;
}

export async function fetchActiveAyahsForTask(pages: number[], taskTitle: string): Promise<AyahInfo[]> {
  let allActive: AyahInfo[] = [];

  const hasStrictRestrictions = 
    parseVerseRangesFromArabicText(taskTitle).length > 0 ||
    taskTitle.includes("ربع") || 
    taskTitle.includes("نصف") || 
    taskTitle.includes("الربع") || 
    taskTitle.includes("النصف");

  for (const page of pages) {
    const activeSubsets = getActiveVersesForPageAndTask(page, taskTitle);
    let pageAyahs: AyahInfo[] = [];

    try {
      const pageUrl = `https://api.alquran.cloud/v1/page/${page}/quran-uthmani`;
      let data: any = null;

      if ('caches' in window) {
        try {
          const pageCache = await caches.open('quran-pages-v1');
          const cachedRes = await pageCache.match(pageUrl);
          if (cachedRes) {
            data = await cachedRes.json();
          }
        } catch (cErr) {
          console.warn("Cache match error in ayahFetcher:", cErr);
        }
      }

      if (!data && typeof navigator !== 'undefined' && navigator.onLine) {
        try {
          const response = await fetch(pageUrl);
          if (response.ok) {
            data = await response.json();
            if (data && data.code === 200 && 'caches' in window) {
              const pageCache = await caches.open('quran-pages-v1');
              await pageCache.put(pageUrl, new Response(JSON.stringify(data)));
            }
          }
        } catch (fetchErr) {
          console.warn("Online fetch error in ayahFetcher:", fetchErr);
        }
      }

      if (data && data.code === 200 && data.data && data.data.ayahs) {
        pageAyahs = data.data.ayahs;
      } else {
        // Instant full offline fallback from bundled Quran data!
        pageAyahs = await getAyahsForPageOffline(page);
      }
    } catch(e) {
      console.warn('Falling back to offline Quran data for page', page, e);
      pageAyahs = await getAyahsForPageOffline(page);
    }

    if (pageAyahs && pageAyahs.length > 0) {
      allActive = allActive.concat(pageAyahs.filter(a => isAyahActive(a, activeSubsets, hasStrictRestrictions)));
    }
  }
  return allActive;
}
