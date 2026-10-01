import { SURAH_METADATAList } from './quranPageMapping';

export interface OfflineAyah {
  s: string; // Surah name (with diacritics e.g. "سُورَةُ ٱلْفَاتِحَةِ")
  n: number; // Verse number in surah
  p: number; // Page number (1-604)
  t: string; // Simple text without diacritics
  u: string; // Uthmani text with diacritics
}

let cachedAllQuranData: OfflineAyah[] | null = null;
let loadPromise: Promise<OfflineAyah[]> | null = null;

// Surah names map to surah numbers
const surahNameToNumberMap: Record<string, number> = {};
SURAH_METADATAList.forEach((meta, idx) => {
  const surahNum = idx + 1;
  const cleanName = meta.name.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '').trim();
  surahNameToNumberMap[cleanName] = surahNum;
  surahNameToNumberMap[meta.name] = surahNum;
});

export async function getOfflineQuranData(): Promise<OfflineAyah[]> {
  if (cachedAllQuranData && cachedAllQuranData.length > 0) {
    return cachedAllQuranData;
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = (async () => {
    try {
      const chunkPromises = Array.from({ length: 6 }, (_, i) => {
        const chunkIndex = i + 1;
        const urls = [
          `/quran-chunk-${chunkIndex}.json`,
          `./quran-chunk-${chunkIndex}.json`,
          `quran-chunk-${chunkIndex}.json`
        ];

        return (async () => {
          for (const url of urls) {
            try {
              const res = await fetch(url);
              if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) {
                  return data as OfflineAyah[];
                }
              }
            } catch (err) {
              // Try next URL fallback
            }
          }
          return [] as OfflineAyah[];
        })();
      });

      const chunks = await Promise.all(chunkPromises);
      const combined = chunks.flat();

      if (combined.length > 0) {
        cachedAllQuranData = combined;
        return combined;
      }
    } catch (err) {
      console.warn('Could not load offline Quran chunks:', err);
    }
    return [];
  })();

  return loadPromise;
}

export function getSurahNumberFromName(surahName: string): number {
  const clean = surahName
    .replace('سُورَةُ ', '')
    .replace('سورة ', '')
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/[أإآاٱ]/g, 'ا')
    .replace(/[ةه]/g, 'ه')
    .replace(/[ىي]/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ء/g, '')
    .trim();

  for (let i = 0; i < SURAH_METADATAList.length; i++) {
    const metaClean = SURAH_METADATAList[i].name
      .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
      .replace(/[أإآاٱ]/g, 'ا')
      .replace(/[ةه]/g, 'ه')
      .replace(/[ىي]/g, 'ي')
      .replace(/ؤ/g, 'و')
      .replace(/ئ/g, 'ي')
      .replace(/ء/g, '')
      .trim();

    if (metaClean === clean || metaClean.includes(clean) || clean.includes(metaClean)) {
      return i + 1;
    }
  }
  return 1;
}

export async function getAyahsForPageOffline(page: number): Promise<{
  numberInSurah: number;
  text: string;
  surah: {
    number: number;
    name: string;
  };
}[]> {
  const allData = await getOfflineQuranData();
  const pageVerses = allData.filter((item) => item.p === page);

  return pageVerses.map((item) => {
    const surahNum = getSurahNumberFromName(item.s);
    const surahMeta = SURAH_METADATAList[surahNum - 1];
    return {
      numberInSurah: item.n,
      text: item.u || item.t,
      surah: {
        number: surahNum,
        name: surahMeta ? surahMeta.name : item.s.replace('سُورَةُ ', '').replace('سورة ', '')
      }
    };
  });
}
