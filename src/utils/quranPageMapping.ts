import quranPagesMap from './quran_pages.json';
import { QURAN_QUARTERS } from './quranQuarters';

export interface VerseRange {
  surah: string;
  start: number;
  end: number;
}

export const SURAH_METADATAList = [
  { name: "الفاتحة", startPage: 1, endPage: 1, startVerse: 1, endVerse: 7 },
  { name: "البقرة", startPage: 2, endPage: 49, startVerse: 1, endVerse: 286 },
  { name: "آل عمران", startPage: 50, endPage: 76, startVerse: 1, endVerse: 200 },
  { name: "النساء", startPage: 77, endPage: 106, startVerse: 1, endVerse: 176 },
  { name: "المائدة", startPage: 106, endPage: 127, startVerse: 1, endVerse: 120 },
  { name: "الأنعام", startPage: 128, endPage: 150, startVerse: 1, endVerse: 165 },
  { name: "الأعراف", startPage: 151, endPage: 176, startVerse: 1, endVerse: 206 },
  { name: "الأنفال", startPage: 177, endPage: 186, startVerse: 1, endVerse: 75 },
  { name: "التوبة", startPage: 187, endPage: 207, startVerse: 1, endVerse: 129 },
  { name: "يونس", startPage: 208, endPage: 221, startVerse: 1, endVerse: 109 },
  { name: "هود", startPage: 221, endPage: 235, startVerse: 1, endVerse: 123 },
  { name: "يوسف", startPage: 235, endPage: 248, startVerse: 1, endVerse: 111 },
  { name: "الرعد", startPage: 249, endPage: 255, startVerse: 1, endVerse: 43 },
  { name: "إبراهيم", startPage: 255, endPage: 261, startVerse: 1, endVerse: 52 },
  { name: "الحجر", startPage: 262, endPage: 267, startVerse: 1, endVerse: 99 },
  { name: "النحل", startPage: 267, endPage: 281, startVerse: 1, endVerse: 128 },
  { name: "الإسراء", startPage: 282, endPage: 293, startVerse: 1, endVerse: 111 },
  { name: "الكهف", startPage: 293, endPage: 304, startVerse: 1, endVerse: 110 },
  { name: "مريم", startPage: 305, endPage: 312, startVerse: 1, endVerse: 98 },
  { name: "طه", startPage: 312, endPage: 321, startVerse: 1, endVerse: 135 },
  { name: "الأنبياء", startPage: 322, endPage: 331, startVerse: 1, endVerse: 112 },
  { name: "الحج", startPage: 332, endPage: 341, startVerse: 1, endVerse: 78 },
  { name: "المؤمنون", startPage: 342, endPage: 351, startVerse: 1, endVerse: 118 },
  { name: "النور", startPage: 351, endPage: 359, startVerse: 1, endVerse: 64 },
  { name: "الفرقان", startPage: 359, endPage: 366, startVerse: 1, endVerse: 77 },
  { name: "الشعراء", startPage: 367, endPage: 376, startVerse: 1, endVerse: 227 },
  { name: "النمل", startPage: 377, endPage: 385, startVerse: 1, endVerse: 93 },
  { name: "القصص", startPage: 385, endPage: 396, startVerse: 1, endVerse: 88 },
  { name: "العنكبوت", startPage: 396, endPage: 404, startVerse: 1, endVerse: 69 },
  { name: "الروم", startPage: 404, endPage: 410, startVerse: 1, endVerse: 60 },
  { name: "لقمان", startPage: 411, endPage: 414, startVerse: 1, endVerse: 34 },
  { name: "السجدة", startPage: 415, endPage: 417, startVerse: 1, endVerse: 30 },
  { name: "الأحزاب", startPage: 418, endPage: 427, startVerse: 1, endVerse: 73 },
  { name: "سبأ", startPage: 428, endPage: 434, startVerse: 1, endVerse: 54 },
  { name: "فاطر", startPage: 434, endPage: 440, startVerse: 1, endVerse: 45 },
  { name: "يس", startPage: 440, endPage: 445, startVerse: 1, endVerse: 83 },
  { name: "الصافات", startPage: 446, endPage: 452, startVerse: 1, endVerse: 182 },
  { name: "ص", startPage: 453, endPage: 458, startVerse: 1, endVerse: 88 },
  { name: "الزمر", startPage: 458, endPage: 467, startVerse: 1, endVerse: 75 },
  { name: "غافر", startPage: 467, endPage: 476, startVerse: 1, endVerse: 85 },
  { name: "فصلت", startPage: 477, endPage: 482, startVerse: 1, endVerse: 54 },
  { name: "الشورى", startPage: 483, endPage: 489, startVerse: 1, endVerse: 53 },
  { name: "الزخرف", startPage: 489, endPage: 495, startVerse: 1, endVerse: 89 },
  { name: "الدخان", startPage: 496, endPage: 498, startVerse: 1, endVerse: 59 },
  { name: "الجاثية", startPage: 499, endPage: 502, startVerse: 1, endVerse: 37 },
  { name: "الأحقاف", startPage: 502, endPage: 506, startVerse: 1, endVerse: 35 },
  { name: "محمد", startPage: 507, endPage: 510, startVerse: 1, endVerse: 38 },
  { name: "الفتح", startPage: 511, endPage: 515, startVerse: 1, endVerse: 29 },
  { name: "الحجرات", startPage: 515, endPage: 517, startVerse: 1, endVerse: 18 },
  { name: "ق", startPage: 518, endPage: 520, startVerse: 1, endVerse: 45 },
  { name: "الذاريات", startPage: 520, endPage: 523, startVerse: 1, endVerse: 60 },
  { name: "الطور", startPage: 523, endPage: 525, startVerse: 1, endVerse: 49 },
  { name: "النجم", startPage: 526, endPage: 527, startVerse: 1, endVerse: 62 },
  { name: "القمر", startPage: 528, endPage: 530, startVerse: 1, endVerse: 55 },
  { name: "الرحمن", startPage: 531, endPage: 534, startVerse: 1, endVerse: 78 },
  { name: "الواقعة", startPage: 534, endPage: 537, startVerse: 1, endVerse: 96 },
  { name: "الحديد", startPage: 537, endPage: 541, startVerse: 1, endVerse: 29 },
  { name: "المجادلة", startPage: 542, endPage: 545, startVerse: 1, endVerse: 22 },
  { name: "الحشر", startPage: 545, endPage: 548, startVerse: 1, endVerse: 24 },
  { name: "الممتحنة", startPage: 549, endPage: 551, startVerse: 1, endVerse: 13 },
  { name: "الصف", startPage: 551, endPage: 552, startVerse: 1, endVerse: 14 },
  { name: "الجمعة", startPage: 553, endPage: 554, startVerse: 1, endVerse: 11 },
  { name: "المنافقون", startPage: 554, endPage: 555, startVerse: 1, endVerse: 11 },
  { name: "التغابن", startPage: 556, endPage: 557, startVerse: 1, endVerse: 18 },
  { name: "الطلاق", startPage: 558, endPage: 559, startVerse: 1, endVerse: 12 },
  { name: "التحريم", startPage: 560, endPage: 561, startVerse: 1, endVerse: 12 },
  { name: "الملك", startPage: 562, endPage: 564, startVerse: 1, endVerse: 30 },
  { name: "القلم", startPage: 564, endPage: 566, startVerse: 1, endVerse: 52 },
  { name: "الحاقة", startPage: 566, endPage: 568, startVerse: 1, endVerse: 52 },
  { name: "المعارج", startPage: 568, endPage: 570, startVerse: 1, endVerse: 44 },
  { name: "نوح", startPage: 570, endPage: 571, startVerse: 1, endVerse: 28 },
  { name: "الجن", startPage: 572, endPage: 573, startVerse: 1, endVerse: 28 },
  { name: "المزمل", startPage: 574, endPage: 575, startVerse: 1, endVerse: 20 },
  { name: "المدثر", startPage: 575, endPage: 577, startVerse: 1, endVerse: 56 },
  { name: "القيامة", startPage: 577, endPage: 578, startVerse: 1, endVerse: 40 },
  { name: "الإنسان", startPage: 578, endPage: 580, startVerse: 1, endVerse: 31 },
  { name: "المرسلات", startPage: 580, endPage: 581, startVerse: 1, endVerse: 50 },
  { name: "النبأ", startPage: 582, endPage: 583, startVerse: 1, endVerse: 40 },
  { name: "النازعات", startPage: 583, endPage: 584, startVerse: 1, endVerse: 46 },
  { name: "عبس", startPage: 585, endPage: 585, startVerse: 1, endVerse: 42 },
  { name: "التكوير", startPage: 586, endPage: 586, startVerse: 1, endVerse: 29 },
  { name: "الانفطار", startPage: 587, endPage: 587, startVerse: 1, endVerse: 19 },
  { name: "المطففين", startPage: 587, endPage: 589, startVerse: 1, endVerse: 36 },
  { name: "الانشقاق", startPage: 589, endPage: 590, startVerse: 1, endVerse: 25 },
  { name: "البروج", startPage: 590, endPage: 590, startVerse: 1, endVerse: 22 },
  { name: "الطارق", startPage: 591, endPage: 591, startVerse: 1, endVerse: 17 },
  { name: "الأعلى", startPage: 591, endPage: 592, startVerse: 1, endVerse: 19 },
  { name: "الغاشية", startPage: 592, endPage: 592, startVerse: 1, endVerse: 26 },
  { name: "الفجر", startPage: 593, endPage: 594, startVerse: 1, endVerse: 30 },
  { name: "البلد", startPage: 594, endPage: 594, startVerse: 1, endVerse: 20 },
  { name: "الشمس", startPage: 595, endPage: 595, startVerse: 1, endVerse: 15 },
  { name: "الليل", startPage: 595, endPage: 596, startVerse: 1, endVerse: 21 },
  { name: "الضحى", startPage: 596, endPage: 596, startVerse: 1, endVerse: 11 },
  { name: "الشرح", startPage: 596, endPage: 596, startVerse: 1, endVerse: 8 },
  { name: "التين", startPage: 597, endPage: 597, startVerse: 1, endVerse: 8 },
  { name: "العلق", startPage: 597, endPage: 598, startVerse: 1, endVerse: 19 },
  { name: "القدر", startPage: 598, endPage: 598, startVerse: 1, endVerse: 5 },
  { name: "البينة", startPage: 598, endPage: 599, startVerse: 1, endVerse: 8 },
  { name: "الزلزلة", startPage: 599, endPage: 599, startVerse: 1, endVerse: 8 },
  { name: "العاديات", startPage: 599, endPage: 600, startVerse: 1, endVerse: 11 },
  { name: "القارعة", startPage: 600, endPage: 600, startVerse: 1, endVerse: 11 },
  { name: "التكاثر", startPage: 600, endPage: 600, startVerse: 1, endVerse: 8 },
  { name: "العصر", startPage: 601, endPage: 601, startVerse: 1, endVerse: 3 },
  { name: "الهمزة", startPage: 601, endPage: 601, startVerse: 1, endVerse: 9 },
  { name: "الفيل", startPage: 601, endPage: 601, startVerse: 1, endVerse: 5 },
  { name: "قريش", startPage: 602, endPage: 602, startVerse: 1, endVerse: 4 },
  { name: "الماعون", startPage: 602, endPage: 602, startVerse: 1, endVerse: 7 },
  { name: "الكوثر", startPage: 602, endPage: 602, startVerse: 1, endVerse: 3 },
  { name: "الكافرون", startPage: 603, endPage: 603, startVerse: 1, endVerse: 6 },
  { name: "النصر", startPage: 603, endPage: 603, startVerse: 1, endVerse: 3 },
  { name: "المسد", startPage: 603, endPage: 603, startVerse: 1, endVerse: 5 },
  { name: "الإخلاص", startPage: 604, endPage: 604, startVerse: 1, endVerse: 4 },
  { name: "الفلق", startPage: 604, endPage: 604, startVerse: 1, endVerse: 5 },
  { name: "الناس", startPage: 604, endPage: 604, startVerse: 1, endVerse: 6 }
];

export function getVerseRangeForPage(pageNumber: number): VerseRange[] {
  // Use the generated comprehensive JSON mapping for exact verse locations
  const ranges = (quranPagesMap as Record<string, VerseRange[]>)[String(pageNumber)];
  
  if (ranges && ranges.length > 0) {
    return ranges;
  }

  // Ultimate fallback if nothing else catches
  return [{ surah: "البقرة", start: 1, end: 1 }];
}

export function formatVerseDescription(ranges: VerseRange[]): string {
  if (ranges.length === 0) return "";
  
  // First, merge within the same surah
  const merged: VerseRange[] = [];
  for (const r of ranges) {
    if (merged.length === 0) {
      merged.push({ ...r });
    } else {
      const last = merged[merged.length - 1];
      if (last.surah === r.surah) {
        last.start = Math.min(last.start, r.start);
        last.end = Math.max(last.end, r.end);
      } else {
        merged.push({ ...r });
      }
    }
  }

  // Then group into continuous blocks across surahs
  const groups: VerseRange[][] = [];
  if (merged.length > 0) {
    let currentGroup = [merged[0]];
    for (let i = 1; i < merged.length; i++) {
      const prev = merged[i - 1];
      const curr = merged[i];
      const prevName = prev.surah.startsWith("سورة") ? prev.surah.replace("سورة ", "") : prev.surah;
      const currName = curr.surah.startsWith("سورة") ? curr.surah.replace("سورة ", "") : curr.surah;
      const prevIdx = SURAH_METADATAList.findIndex(s => s.name === prevName);
      const currIdx = SURAH_METADATAList.findIndex(s => s.name === currName);
      
      let isContinuous = false;
      if (prevIdx >= 0 && currIdx === prevIdx + 1) {
        if (prev.end === SURAH_METADATAList[prevIdx].endVerse && curr.start === 1) {
          isContinuous = true;
        }
      }
      
      if (isContinuous) {
        currentGroup.push(curr);
      } else {
        groups.push(currentGroup);
        currentGroup = [curr];
      }
    }
    groups.push(currentGroup);
  }

  return groups.map(g => {
    if (g.length === 1) {
      const r = g[0];
      const surahName = r.surah.startsWith("سورة") ? r.surah.replace("سورة ", "") : r.surah;
      if (r.start === r.end) return `${surahName}: الآية ${r.start}`;
      return `${surahName}: الآية ${r.start} إلى ${r.end}`;
    } else {
      const startRange = g[0];
      const endRange = g[g.length - 1];
      const startName = startRange.surah.startsWith("سورة") ? startRange.surah.replace("سورة ", "") : startRange.surah;
      const endName = endRange.surah.startsWith("سورة") ? endRange.surah.replace("سورة ", "") : endRange.surah;
      return `من ${startName}: الآية ${startRange.start} إلى ${endName}: الآية ${endRange.end}`;
    }
  }).join("، و ");
}

export type PageSection = "full" | "first_half" | "second_half" | "first_quarter" | "second_quarter" | "third_quarter" | "fourth_quarter";

export function getPageVerseSubset(pageNumber: number, section?: PageSection): VerseRange[] {
  const fullRanges = getVerseRangeForPage(pageNumber);
  
  if (!section || section === "full" || fullRanges.length === 0) {
    return fullRanges;
  }

  // Flatten to individual verses to handle splits accurately even across surahs
  const allVerses: {surah: string, v: number}[] = [];
  fullRanges.forEach(r => {
    for(let v = r.start; v <= r.end; v++) {
      allVerses.push({surah: r.surah, v});
    }
  });

  const total = allVerses.length;
  if (total === 0) return [];

  let startIdx = 0;
  let endIdx = total - 1;

  if (section === "first_half") {
    endIdx = Math.floor(total / 2) - 1;
  } else if (section === "second_half") {
    startIdx = Math.floor(total / 2);
  } else if (section.endsWith("_quarter")) {
    const qIdx = ["first_quarter", "second_quarter", "third_quarter", "fourth_quarter"].indexOf(section);
    const qSize = Math.max(1, Math.floor(total / 4));
    startIdx = qIdx * qSize;
    endIdx = (qIdx === 3) ? total - 1 : Math.min(total - 1, startIdx + qSize - 1);
  }

  if (startIdx >= total) return [];

  const subset = allVerses.slice(startIdx, endIdx + 1);
  const subRanges: VerseRange[] = [];
  let currRange: VerseRange | null = null;
  subset.forEach(item => {
    if (!currRange) {
      currRange = {surah: item.surah, start: item.v, end: item.v};
    } else if (currRange.surah === item.surah && item.v === currRange.end + 1) {
      currRange.end = item.v;
    } else {
      subRanges.push(currRange);
      currRange = {surah: item.surah, start: item.v, end: item.v};
    }
  });
  if (currRange) subRanges.push(currRange);

  return subRanges;
}

export function getPageVerseDescription(pageNumber: number, section?: PageSection): string {
  const subsets = getPageVerseSubset(pageNumber, section);
  if (subsets.length === 0) return "نهاية الصفحة";
  return formatVerseDescription(subsets);
}

export function parseVerseRangesFromArabicText(text: string): VerseRange[] {
  const ranges: VerseRange[] = [];
  if (!text) return ranges;
  
  // Normalize text - remove parentheses, normalize spaces
  const normalized = text.replace(/[()]/g, ' ').replace(/\s+/g, ' ');

  const normalizeRegexStr = (name: string) => {
    return name.replace(/[أإآا]/g, '[أإآا]').replace(/[ةه]/g, '[ةه]').replace(" ", "\\s+");
  };

  const surahNamesPattern = SURAH_METADATAList.map(s => normalizeRegexStr(s.name)).join('|');
  const surahPrefixes = `(?:(?:لـ\\s+|من\\s+|من\\s+لـ\\s+)?(?:سورة\\s+)?)?`;

  // 1. Match pattern: "سورة (الاسم): الآية (الرقم) إلى سورة (الاسم2): الآية (الرقم)"
  const pattern1 = new RegExp(`${surahPrefixes}(${surahNamesPattern}):\\s*(?:الآية|الآيات)\\s*(\\d+)\\s*(?:إلى|-)\\s*${surahPrefixes}(${surahNamesPattern}):\\s*(?:الآية|الآيات)\\s*(\\d+)`, 'g');
  
  let match;
  while ((match = pattern1.exec(normalized)) !== null) {
    const surah1 = match[1].trim();
    const start = parseInt(match[2], 10);
    const surah2 = match[3].trim();
    const end = parseInt(match[4], 10);
    
    const foundSurah1 = SURAH_METADATAList.find(s => s.name.replace(/[أإآاةه]/g, '') === surah1.replace(/[أإآاةه]/g, ''));
    const foundSurah2 = SURAH_METADATAList.find(s => s.name.replace(/[أإآاةه]/g, '') === surah2.replace(/[أإآاةه]/g, ''));
    
    if (foundSurah1 && foundSurah2) {
      const idx1 = SURAH_METADATAList.findIndex(s => s.name === foundSurah1.name);
      const idx2 = SURAH_METADATAList.findIndex(s => s.name === foundSurah2.name);
      
      if (idx1 !== -1 && idx2 !== -1 && idx1 <= idx2) {
        if (idx1 === idx2) {
          ranges.push({ surah: foundSurah1.name, start, end });
        } else {
          ranges.push({ surah: foundSurah1.name, start, end: foundSurah1.endVerse });
          for (let i = idx1 + 1; i < idx2; i++) {
             ranges.push({ surah: SURAH_METADATAList[i].name, start: 1, end: SURAH_METADATAList[i].endVerse });
          }
          ranges.push({ surah: foundSurah2.name, start: 1, end });
        }
      }
    }
  }

  // 2. Match pattern: "سورة (الاسم): الآية (الرقم) إلى (الرقم)"
  const pattern2 = new RegExp(`${surahPrefixes}(${surahNamesPattern}):\\s*(?:الآية|الآيات)\\s*(\\d+)\\s*(?:إلى|-)\\s*(\\d+)`, 'g');
  while ((match = pattern2.exec(normalized)) !== null) {
    const surah = match[1].trim();
    const start = parseInt(match[2], 10);
    const end = parseInt(match[3], 10);
    
    const foundSurah = SURAH_METADATAList.find(s => s.name.replace(/[أإآاةه]/g, '') === surah.replace(/[أإآاةه]/g, ''));
    if (foundSurah) {
      if (!ranges.some(r => r.surah === foundSurah.name && r.start === start && r.end === end)) {
        ranges.push({ surah: foundSurah.name, start, end });
      }
    }
  }

  // 3. Match pattern: "سورة (الاسم): الآية (الرقم)"
  const pattern3 = new RegExp(`${surahPrefixes}(${surahNamesPattern}):\\s*(?:الآية|الآيات)\\s*(\\d+)`, 'g');
  while ((match = pattern3.exec(normalized)) !== null) {
    const surah = match[1].trim();
    const verse = parseInt(match[2], 10);
    
    const foundSurah = SURAH_METADATAList.find(s => s.name.replace(/[أإآاةه]/g, '') === surah.replace(/[أإآاةه]/g, ''));
    if (foundSurah) {
      const isCovered = ranges.some(r => r.surah === foundSurah.name && verse >= r.start && verse <= r.end);
      if (!isCovered) {
        ranges.push({ surah: foundSurah.name, start: verse, end: verse });
      }
    }
  }

  // 4. Match pattern without colon: "سورة البلد الآيات 1-10" or "البلد الآيات 1 إلى 10"
  const pattern4 = new RegExp(`${surahPrefixes}(${surahNamesPattern})\\s+(?:الآية|الآيات)\\s*(\\d+)\\s*(?:إلى|-)\\s*(\\d+)`, 'g');
  while ((match = pattern4.exec(normalized)) !== null) {
    const surah = match[1].trim();
    const start = parseInt(match[2], 10);
    const end = parseInt(match[3], 10);
    const foundSurah = SURAH_METADATAList.find(s => s.name.replace(/[أإآاةه]/g, '') === surah.replace(/[أإآاةه]/g, ''));
    if (foundSurah) {
      if (!ranges.some(r => r.surah === foundSurah.name && r.start === start && r.end === end)) {
        ranges.push({ surah: foundSurah.name, start, end });
      }
    }
  }

  // 5. Match pattern without colon single: "سورة البلد الآية 5"
  const pattern5 = new RegExp(`${surahPrefixes}(${surahNamesPattern})\\s+(?:الآية|الآيات)\\s*(\\d+)`, 'g');
  while ((match = pattern5.exec(normalized)) !== null) {
    const surah = match[1].trim();
    const verse = parseInt(match[2], 10);
    const foundSurah = SURAH_METADATAList.find(s => s.name.replace(/[أإآاةه]/g, '') === surah.replace(/[أإآاةه]/g, ''));
    if (foundSurah) {
      const isCovered = ranges.some(r => r.surah === foundSurah.name && verse >= r.start && verse <= r.end);
      if (!isCovered) {
        ranges.push({ surah: foundSurah.name, start: verse, end: verse });
      }
    }
  }

  // 6. Support "سورة البلد كاملة"
  const pattern6 = new RegExp(`${surahPrefixes}(${surahNamesPattern})\\s+كاملة`, 'g');
  while ((match = pattern6.exec(normalized)) !== null) {
    const surah = match[1].trim();
    const foundSurah = SURAH_METADATAList.find(s => s.name.replace(/[أإآاةه]/g, '') === surah.replace(/[أإآاةه]/g, ''));
    if (foundSurah) {
      if (!ranges.some(r => r.surah === foundSurah.name)) {
        ranges.push({ surah: foundSurah.name, start: 1, end: foundSurah.endVerse });
      }
    }
  }

  return ranges;
}

const ARABIC_NUM_MAP: Record<string, number> = {
  "الأول": 1, "الاول": 1, "أول": 1, "اول": 1,
  "الثاني": 2, "الثانى": 2, "ثاني": 2, "ثانى": 2,
  "الثالث": 3, "ثالث": 3,
  "الرابع": 4, "رابع": 4,
  "الخامس": 5, "خامس": 5,
  "السادس": 6, "سادس": 6,
  "السابع": 7, "سابع": 7,
  "الثامن": 8, "ثامن": 8,
  "التاسع": 9, "تاسع": 9,
  "العاشر": 10, "عاشر": 10,
  "الحادي عشر": 11, "الحادى عشر": 11,
  "الثاني عشر": 12, "الثانى عشر": 12,
  "الثالث عشر": 13,
  "الرابع عشر": 14,
  "الخامس عشر": 15,
  "السادس عشر": 16,
  "السابع عشر": 17,
  "الثامن عشر": 18,
  "التاسع عشر": 19,
  "العشرين": 20, "العشرون": 20,
  "الحادي والعشرين": 21, "الحادى والعشرين": 21,
  "الثاني والعشرين": 22, "الثانى والعشرين": 22,
  "الثالث والعشرين": 23,
  "الرابع والعشرين": 24,
  "الخامس والعشرين": 25,
  "السادس والعشرين": 26,
  "السابع والعشرين": 27,
  "الثامن والعشرين": 28,
  "التاسع والعشرين": 29,
  "الثلاثين": 30, "الثلاثون": 30,
  "الحادي والثلاثين": 31, "الحادى والثلاثين": 31,
  "الثاني والثلاثين": 32, "الثانى والثلاثين": 32,
  "الثالث والثلاثين": 33,
  "الرابع والثلاثين": 34,
  "الخامس والثلاثين": 35,
  "السادس والثلاثين": 36,
  "السابع والثلاثين": 37,
  "الثامن والثلاثين": 38,
  "التاسع والثلاثين": 39,
  "الأربعين": 40, "الأربعون": 40,
  "الحادي والأربعين": 41, "الحادى والأربعين": 41,
  "الثاني والأربعين": 42, "الثانى والأربعين": 42,
  "الثالث والأربعين": 43,
  "الرابع والأربعين": 44,
  "الخامس والأربعين": 45,
  "السادس والأربعين": 46,
  "السابع والأربعين": 47,
  "الثامن والأربعين": 48,
  "التاسع والأربعين": 49,
  "الخمسين": 50, "الخمسون": 50,
  "الحادي والخمسين": 51, "الحادى والخمسين": 51,
  "الثاني والخمسين": 52, "الثانى والخمسين": 52,
  "الثالث والخمسين": 53,
  "الرابع والخمسين": 54,
  "الخامس والخمسين": 55,
  "السادس والخمسين": 56,
  "السابع والخمسين": 57,
  "الثامن والخمسين": 58,
  "التاسع والخمسين": 59,
  "الستين": 60, "الستون": 60
};

function parseQuarterAndHizbFromText(text: string): { quarter: number; hizb: number } | null {
  const normalized = text.replace(/[()]/g, ' ').replace(/\s+/g, ' ');

  // 1. Parse Quarter Index
  let quarter = 0;
  if (normalized.includes("الربع الأول") || normalized.includes("الربع الاول") || normalized.includes("الربع 1") || normalized.includes("ربع 1") || normalized.includes("ربع أول") || normalized.includes("ربع اول")) {
    quarter = 1;
  } else if (normalized.includes("الربع الثاني") || normalized.includes("الربع الثانى") || normalized.includes("الربع 2") || normalized.includes("ربع 2") || normalized.includes("ربع ثاني") || normalized.includes("ربع ثانى")) {
    quarter = 2;
  } else if (normalized.includes("الربع الثالث") || normalized.includes("الربع 3") || normalized.includes("ربع 3") || normalized.includes("ربع ثالث")) {
    quarter = 3;
  } else if (normalized.includes("الربع الرابع") || normalized.includes("الربع 4") || normalized.includes("ربع 4") || normalized.includes("ربع رابع")) {
    quarter = 4;
  }

  // 2. Parse Hizb Number
  let hizb = 0;
  const hizbRegex = /الحزب\s+([^\s]+(?:\s+[^\s]+)?)/;
  const match = hizbRegex.exec(normalized);
  if (match) {
    const val = match[1].trim();
    if (/^\d+$/.test(val)) {
      hizb = parseInt(val, 10);
    } else {
      for (const [key, num] of Object.entries(ARABIC_NUM_MAP)) {
        if (val.startsWith(key) || key.startsWith(val)) {
          hizb = num;
          break;
        }
      }
    }
  } else {
    const hizbRegex2 = /حزب\s+(\d+)/;
    const match2 = hizbRegex2.exec(normalized);
    if (match2) {
      hizb = parseInt(match2[1], 10);
    }
  }

  if (quarter > 0 && hizb > 0) {
    return { quarter, hizb };
  }
  return null;
}

export function parseJuzsFromText(text: string): number[] {
  const arabicToEnglishMap: Record<string, string> = {
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
  };
  const normalizeNumbers = (str: string) => {
    return str.replace(/[٠-٩]/g, d => arabicToEnglishMap[d] || d);
  };

  const normalized = normalizeNumbers(text).replace(/[()]/g, ' ').replace(/\s+/g, ' ');
  const parsedJuzs: number[] = [];

  // 1. Check for range of Juzs like "الجزء 11 إلى 12" or "جزء 11-12"
  const juzRangeRegex = /(?:الجزء|جزء)\s*(\d+)\s*(?:إلى|الى|-)\s*(\d+)/i;
  const rangeMatch = juzRangeRegex.exec(normalized);
  if (rangeMatch) {
    const startJuz = parseInt(rangeMatch[1], 10);
    const endJuz = parseInt(rangeMatch[2], 10);
    if (startJuz >= 1 && startJuz <= 30 && endJuz >= startJuz && endJuz <= 30) {
      for (let j = startJuz; j <= endJuz; j++) {
        parsedJuzs.push(j);
      }
    }
    return parsedJuzs;
  }

  // 2. Check for list of Juzs like "الأجزاء: 11، 12" or "أجزاء 11, 12, 13"
  const multiJuzRegex = /(?:الأجزاء|أجزاء)\s*[:\s]*([\d\s،,]+)/i;
  const multiMatch = multiJuzRegex.exec(normalized);
  if (multiMatch) {
    const parts = multiMatch[1].split(/[،,\s]+/);
    parts.forEach(p => {
      const num = parseInt(p, 10);
      if (num >= 1 && num <= 30) {
        parsedJuzs.push(num);
      }
    });
    if (parsedJuzs.length > 0) {
      return parsedJuzs;
    }
  }

  // 3. Check for single numerical Juz e.g. "الجزء 11" or "جزء 11"
  const singleJuzRegex = /(?:الجزء|جزء)\s*(\d+)/i;
  const singleMatch = singleJuzRegex.exec(normalized);
  if (singleMatch) {
    const juzNum = parseInt(singleMatch[1], 10);
    if (juzNum >= 1 && juzNum <= 30) {
      parsedJuzs.push(juzNum);
    }
    return parsedJuzs;
  }

  // 4. Check for single verbal/Arabic written Juz e.g. "الجزء الأول", "الجزء الثاني"
  const verbalJuzRegex = /(?:الجزء|جزء)\s*([^\s]+(?:\s+[^\s]+)?)/;
  const verbalMatch = verbalJuzRegex.exec(normalized);
  if (verbalMatch) {
    const val = verbalMatch[1].trim();
    for (const [key, num] of Object.entries(ARABIC_NUM_MAP)) {
      if (val === key || val.startsWith(key) || key.startsWith(val)) {
        if (num >= 1 && num <= 30) {
          parsedJuzs.push(num);
          return parsedJuzs;
        }
      }
    }
  }

  return parsedJuzs;
}

export function getVerseRangesForQuarter(qNum: number): VerseRange[] {
  const q = QURAN_QUARTERS.find(item => item.number === qNum);
  if (!q) return [];

  const qIndex = q.number - 1;
  const startSurahName = q.surahName.replace("سُورَةُ ", "").replace("سورة ", "");
  const startAyah = q.ayah;
  
  let endSurahName = "";
  let endAyah = 0;
  if (qIndex >= 239) {
    endSurahName = "الناس";
    endAyah = 6;
  } else {
    const nextQ = QURAN_QUARTERS[qIndex + 1];
    if (nextQ.surahNum === q.surahNum) {
      endSurahName = q.surahName.replace("سُورَةُ ", "").replace("سورة ", "");
      endAyah = nextQ.ayah - 1;
    } else {
      if (nextQ.ayah > 1) {
        endSurahName = nextQ.surahName.replace("سُورَةُ ", "").replace("سورة ", "");
        endAyah = nextQ.ayah - 1;
      } else {
        const prevSurahIndex = nextQ.surahNum - 2;
        const prevSurahMeta = SURAH_METADATAList[prevSurahIndex];
        endSurahName = prevSurahMeta ? prevSurahMeta.name : q.surahName.replace("سُورَةُ ", "").replace("سورة ", "");
        endAyah = prevSurahMeta ? prevSurahMeta.endVerse : 1;
      }
    }
  }
  
  const qRanges: VerseRange[] = [];
  const idxStart = SURAH_METADATAList.findIndex(s => s.name === startSurahName || s.name === q.surahName);
  const idxEnd = SURAH_METADATAList.findIndex(s => s.name === endSurahName || s.name === `سورة ${endSurahName}`);
  
  if (idxStart !== -1 && idxEnd !== -1) {
    if (idxStart === idxEnd) {
      qRanges.push({ surah: SURAH_METADATAList[idxStart].name, start: startAyah, end: endAyah });
    } else {
      qRanges.push({ surah: SURAH_METADATAList[idxStart].name, start: startAyah, end: SURAH_METADATAList[idxStart].endVerse });
      for (let i = idxStart + 1; i < idxEnd; i++) {
        qRanges.push({ surah: SURAH_METADATAList[i].name, start: 1, end: SURAH_METADATAList[i].endVerse });
      }
      qRanges.push({ surah: SURAH_METADATAList[idxEnd].name, start: 1, end: endAyah });
    }
  }
  return qRanges;
}

export function getVerseRangesForJuzs(juzs: number[]): VerseRange[] {
  const allRanges: VerseRange[] = [];
  juzs.forEach(j => {
    const startQ = (j - 1) * 8 + 1;
    const endQ = j * 8;
    for (let q = startQ; q <= endQ; q++) {
      allRanges.push(...getVerseRangesForQuarter(q));
    }
  });
  return allRanges;
}

export function getActiveVersesForPageAndTask(pageNumber: number, taskTitle: string): VerseRange[] {
  // 0. High-precision Juz-based matching
  const parsedJuzs = parseJuzsFromText(taskTitle);
  let juzRestrictedRanges: VerseRange[] | null = null;
  if (parsedJuzs.length > 0) {
    const pageRanges = getVerseRangeForPage(pageNumber);
    const juzRanges = getVerseRangesForJuzs(parsedJuzs);
    juzRestrictedRanges = [];
    juzRanges.forEach(jr => {
      pageRanges.forEach(pr => {
        if (jr.surah === pr.surah) {
          const overlapStart = Math.max(jr.start, pr.start);
          const overlapEnd = Math.min(jr.end, pr.end);
          if (overlapStart <= overlapEnd) {
            juzRestrictedRanges.push({ surah: jr.surah, start: overlapStart, end: overlapEnd });
          }
        }
      });
    });
    if (juzRestrictedRanges.length > 0) {
      return juzRestrictedRanges;
    }
  }

  // Try to parse page boundaries from taskTitle
  // e.g., "ص 582-592", "صفحة 582-592", "ص 1-22", or "من ص 582 إلى ص 592"
  let taskStartPage = 0;
  let taskEndPage = 0;

  // Pattern A: "من ص 582 إلى ص 592" or "ص 582 إلى 592" or "ص 582 الى ص 592"
  const rangeArabicMatch = /(?:من\s+)?(?:ص|صفحه|صفحة)\s*(\d+)\s+(?:إلى|الى)\s+(?:ص|صفحه|صفحة)?\s*(\d+)/.exec(taskTitle);
  // Pattern B: "ص 582-592" or "صفحة 582-592"
  const rangeHyphenMatch = /(?:ص|صفحه|صفحة)\s*(\d+)\s*-\s*(\d+)/.exec(taskTitle);
  // Pattern C: "ص 582" or "صفحة 582"
  const singlePageMatch = /(?:ص|صفحه|صفحة)\s*(\d+)/.exec(taskTitle);

  if (rangeArabicMatch) {
    taskStartPage = parseInt(rangeArabicMatch[1], 10);
    taskEndPage = parseInt(rangeArabicMatch[2], 10);
  } else if (rangeHyphenMatch) {
    taskStartPage = parseInt(rangeHyphenMatch[1], 10);
    taskEndPage = parseInt(rangeHyphenMatch[2], 10);
  } else if (singlePageMatch) {
    taskStartPage = parseInt(singlePageMatch[1], 10);
    taskEndPage = taskStartPage;
  }

  if (taskStartPage > 0) {
    // STRICT Page Range Check: If the pageNumber is strictly outside the parsed page range, it cannot be active.
    if (pageNumber < taskStartPage || pageNumber > taskEndPage) {
      return [];
    }
    
    // If the current page is strictly between the start page and end page,
    // then the entire page is included in the assignment, so highlight the full page.
    // BUT only if we do not have specific verse ranges specified in the task title.
    const hasExactVerses = parseVerseRangesFromArabicText(taskTitle).length > 0;
    if (pageNumber > taskStartPage && pageNumber < taskEndPage && !hasExactVerses) {
      return getVerseRangeForPage(pageNumber);
    }
  }

  const pageRanges = getVerseRangeForPage(pageNumber);

  // 1. Try to parse exact verse ranges from taskTitle
  const parsedRanges = parseVerseRangesFromArabicText(taskTitle);
  
  if (parsedRanges.length > 0) {
    // Filter parsed ranges to keep only those relevant to this pageNumber AND overlapping with it
    const relevantOverlaps: VerseRange[] = [];
    
    parsedRanges.forEach(pr => {
      pageRanges.forEach(pg => {
        if (pg.surah === pr.surah) {
          const overlapStart = Math.max(pg.start, pr.start);
          const overlapEnd = Math.min(pg.end, pr.end);
          if (overlapStart <= overlapEnd) {
            relevantOverlaps.push({ surah: pg.surah, start: overlapStart, end: overlapEnd });
          }
        }
      });
    });

    if (relevantOverlaps.length > 0) {
      return relevantOverlaps;
    }
    
    // If we have parsed exact ranges and NONE of them overlap with this page, 
    // it means this page is NOT part of the assignment.
    return [];
  }
  
  // 1.5. High-precision theological division matching (Quarter, Hizb)
  const parsedQuarterHizb = parseQuarterAndHizbFromText(taskTitle);
  if (parsedQuarterHizb) {
    const globalQuarterNum = (parsedQuarterHizb.hizb - 1) * 4 + parsedQuarterHizb.quarter;
    const q = QURAN_QUARTERS.find(item => item.number === globalQuarterNum);
    
    if (q) {
      const qIndex = q.number - 1;
      const startSurahName = q.surahName.replace("سُورَةُ ", "").replace("سورة ", "");
      const startAyah = q.ayah;
      
      let endSurahName = "";
      let endAyah = 0;
      if (qIndex >= 239) {
        endSurahName = "الناس";
        endAyah = 6;
      } else {
        const nextQ = QURAN_QUARTERS[qIndex + 1];
        if (nextQ.surahNum === q.surahNum) {
          endSurahName = q.surahName.replace("سُورَةُ ", "").replace("سورة ", "");
          endAyah = nextQ.ayah - 1;
        } else {
          if (nextQ.ayah > 1) {
            endSurahName = nextQ.surahName.replace("سُورَةُ ", "").replace("سورة ", "");
            endAyah = nextQ.ayah - 1;
          } else {
            const prevSurahIndex = nextQ.surahNum - 2;
            const prevSurahMeta = SURAH_METADATAList[prevSurahIndex];
            endSurahName = prevSurahMeta ? prevSurahMeta.name : q.surahName.replace("سُورَةُ ", "").replace("سورة ", "");
            endAyah = prevSurahMeta ? prevSurahMeta.endVerse : 1;
          }
        }
      }
      
      const qRanges: VerseRange[] = [];
      const idxStart = SURAH_METADATAList.findIndex(s => s.name === startSurahName || s.name === q.surahName);
      const idxEnd = SURAH_METADATAList.findIndex(s => s.name === endSurahName || s.name === `سورة ${endSurahName}`);
      
      if (idxStart !== -1 && idxEnd !== -1) {
        if (idxStart === idxEnd) {
          qRanges.push({ surah: SURAH_METADATAList[idxStart].name, start: startAyah, end: endAyah });
        } else {
          qRanges.push({ surah: SURAH_METADATAList[idxStart].name, start: startAyah, end: SURAH_METADATAList[idxStart].endVerse });
          for (let i = idxStart + 1; i < idxEnd; i++) {
            qRanges.push({ surah: SURAH_METADATAList[i].name, start: 1, end: SURAH_METADATAList[i].endVerse });
          }
          qRanges.push({ surah: SURAH_METADATAList[idxEnd].name, start: 1, end: endAyah });
        }
      }
      
      const combinedRanges: VerseRange[] = [];
      qRanges.forEach(qr => {
        pageRanges.forEach(pr => {
          if (qr.surah === pr.surah) {
            const overlapStart = Math.max(qr.start, pr.start);
            const overlapEnd = Math.min(qr.end, pr.end);
            if (overlapStart <= overlapEnd) {
              combinedRanges.push({ surah: qr.surah, start: overlapStart, end: overlapEnd });
            }
          }
        });
      });
      
      return combinedRanges; // Return empty if no overlap (safely handles pages outside boundaries)
    }
  }
  
  // 2. Try generic verse fallback inside page ranges, if exact surah names weren't detected
  const relevantRanges: VerseRange[] = [];
  const normalizedTitle = taskTitle.replace(/[()]/g, ' ').replace(/\s+/g, ' ');
  const genericRangeRegex = /(?:الآية|الآيات)\s*(\d+)\s*(?:إلى|-)\s*(\d+)/;
  const genericMatch = genericRangeRegex.exec(taskTitle) || genericRangeRegex.exec(normalizedTitle);
  
  if (genericMatch) {
    const start = parseInt(genericMatch[1], 10);
    const end = parseInt(genericMatch[2], 10);
    pageRanges.forEach(pr => {
      // Respect overlap
      const overlapStart = Math.max(pr.start, start);
      const overlapEnd = Math.min(pr.end, end);
      if (overlapStart <= overlapEnd) {
        relevantRanges.push({ surah: pr.surah, start: overlapStart, end: overlapEnd });
      }
    });
  } else {
    const genericSingleRegex = /(?:الآية|الآيات)\s*(\d+)/;
    const genericSingleMatch = genericSingleRegex.exec(taskTitle) || genericSingleRegex.exec(normalizedTitle);
    if (genericSingleMatch) {
      const verse = parseInt(genericSingleMatch[1], 10);
      pageRanges.forEach(pr => {
        if (verse >= pr.start && verse <= pr.end) {
          relevantRanges.push({ surah: pr.surah, start: verse, end: verse });
        }
      });
    }
  }

  if (relevantRanges.length > 0) {
    return relevantRanges;
  }

  // 3. High-precision boundary matching for Quran divisions (Quarter, Hizb, Half-Hizb, Juz)
  if (taskStartPage > 0 && taskEndPage > 0) {
    const isQuranDivisionRelated = taskTitle.includes("ربع") || taskTitle.includes("الحزب") || taskTitle.includes("حزب") || taskTitle.includes("الجزء") || taskTitle.includes("جزء") || taskTitle.includes("قلعة") || taskTitle.includes("Castle");
    
    if (isQuranDivisionRelated) {
      // Find matching quarters that overlap with the task's pages
      let matchingQuarters = QURAN_QUARTERS.filter(q => q.startPage <= taskEndPage && q.endPage >= taskStartPage);
      
      if (matchingQuarters.length > 0) {
        // If current page is a shared boundary page between multiple covered quarters
        const coveringQuarters = matchingQuarters.filter(q => pageNumber >= q.startPage && pageNumber <= q.endPage);
        
        if (coveringQuarters.length > 1) {
          // If we are at the end boundary, prefer the quarter that ends here
          if (pageNumber === taskEndPage) {
            matchingQuarters = matchingQuarters.filter(q => q.endPage === pageNumber);
          }
          // If we are at the start boundary, prefer the quarter that starts here
          else if (pageNumber === taskStartPage) {
            matchingQuarters = matchingQuarters.filter(q => q.startPage === pageNumber);
          }
        } else if (coveringQuarters.length === 1) {
          matchingQuarters = coveringQuarters;
        }
        
        // Extract exact verses for the active quarters on this page
        const combinedRanges: VerseRange[] = [];
        matchingQuarters.forEach(q => {
          const qIndex = q.number - 1;
          const startSurahName = q.surahName.replace("سُورَةُ ", "").replace("سورة ", "");
          const startAyah = q.ayah;
          
          let endSurahName = "";
          let endAyah = 0;
          if (qIndex >= 239) {
            endSurahName = "الناس";
            endAyah = 6;
          } else {
            const nextQ = QURAN_QUARTERS[qIndex + 1];
            if (nextQ.surahNum === q.surahNum) {
              endSurahName = q.surahName.replace("سُورَةُ ", "").replace("سورة ", "");
              endAyah = nextQ.ayah - 1;
            } else {
              if (nextQ.ayah > 1) {
                endSurahName = nextQ.surahName.replace("سُورَةُ ", "").replace("سورة ", "");
                endAyah = nextQ.ayah - 1;
              } else {
                const prevSurahIndex = nextQ.surahNum - 2;
                const prevSurahMeta = SURAH_METADATAList[prevSurahIndex];
                endSurahName = prevSurahMeta ? prevSurahMeta.name : q.surahName.replace("سُورَةُ ", "").replace("سورة ", "");
                endAyah = prevSurahMeta ? prevSurahMeta.endVerse : 1;
              }
            }
          }
          
          const qRanges: VerseRange[] = [];
          const idxStart = SURAH_METADATAList.findIndex(s => s.name === startSurahName || s.name === q.surahName);
          const idxEnd = SURAH_METADATAList.findIndex(s => s.name === endSurahName || s.name === `سورة ${endSurahName}`);
          
          if (idxStart !== -1 && idxEnd !== -1) {
            if (idxStart === idxEnd) {
              qRanges.push({ surah: SURAH_METADATAList[idxStart].name, start: startAyah, end: endAyah });
            } else {
              qRanges.push({ surah: SURAH_METADATAList[idxStart].name, start: startAyah, end: SURAH_METADATAList[idxStart].endVerse });
              for (let i = idxStart + 1; i < idxEnd; i++) {
                qRanges.push({ surah: SURAH_METADATAList[i].name, start: 1, end: SURAH_METADATAList[i].endVerse });
              }
              qRanges.push({ surah: SURAH_METADATAList[idxEnd].name, start: 1, end: endAyah });
            }
          }
          
          qRanges.forEach(qr => {
            pageRanges.forEach(pr => {
              if (qr.surah === pr.surah) {
                const overlapStart = Math.max(qr.start, pr.start);
                const overlapEnd = Math.min(qr.end, pr.end);
                if (overlapStart <= overlapEnd) {
                  combinedRanges.push({ surah: qr.surah, start: overlapStart, end: overlapEnd });
                }
              }
            });
          });
        });
        
        if (combinedRanges.length > 0) {
          return combinedRanges;
        }
      }
    }
  }

  // 4. Section keyword matching supporting multiple/combined portions
  const titleNormalized = taskTitle.replace(/\s+/g, ' ');
  const matchedSections: PageSection[] = [];
  
  const hasQ1 = titleNormalized.includes("الربع الأول") || titleNormalized.includes("الربع 1") || titleNormalized.includes("ربع 1");
  const hasQ2 = titleNormalized.includes("الربع الثاني") || titleNormalized.includes("الربع 2") || titleNormalized.includes("ربع 2");
  const hasQ3 = titleNormalized.includes("الربع الثالث") || titleNormalized.includes("الربع 3") || titleNormalized.includes("ربع 3");
  const hasQ4 = titleNormalized.includes("الربع الرابع") || titleNormalized.includes("الربع 4") || titleNormalized.includes("ربع 4");
  
  const matchedQs: number[] = [];
  if (hasQ1) matchedQs.push(1);
  if (hasQ2) matchedQs.push(2);
  if (hasQ3) matchedQs.push(3);
  if (hasQ4) matchedQs.push(4);
  
  if (matchedQs.length > 0) {
    let qsToInclude = [...matchedQs];
    if (titleNormalized.includes("إلى") || titleNormalized.includes("-")) {
      const minQ = Math.min(...matchedQs);
      const maxQ = Math.max(...matchedQs);
      qsToInclude = [];
      for (let i = minQ; i <= maxQ; i++) {
        qsToInclude.push(i);
      }
    }
    const qNames: PageSection[] = ["first_quarter", "second_quarter", "third_quarter", "fourth_quarter"];
    qsToInclude.forEach(q => {
      matchedSections.push(qNames[q - 1]);
    });
  } else {
    const hasH1 = titleNormalized.includes("النصف الأول") || titleNormalized.includes("النصف 1") || titleNormalized.includes("نصف 1");
    const hasH2 = titleNormalized.includes("النصف الثاني") || titleNormalized.includes("النصف 2") || titleNormalized.includes("نصف 2");
    
    const matchedHs: number[] = [];
    if (hasH1) matchedHs.push(1);
    if (hasH2) matchedHs.push(2);
    
    if (matchedHs.length > 0) {
      let hsToInclude = [...matchedHs];
      if (titleNormalized.includes("إلى") || titleNormalized.includes("-")) {
        const minH = Math.min(...matchedHs);
        const maxH = Math.max(...matchedHs);
        hsToInclude = [];
        for (let i = minH; i <= maxH; i++) {
          hsToInclude.push(i);
        }
      }
      const hNames: PageSection[] = ["first_half", "second_half"];
      hsToInclude.forEach(h => {
        matchedSections.push(hNames[h - 1]);
      });
    }
  }

  // 5. Fallback: match based on the exact verse descriptions of portions on the page
  if (matchedSections.length === 0) {
    const SECTIONS: PageSection[] = [
      "full",
      "first_half", "second_half",
      "first_quarter", "second_quarter", "third_quarter", "fourth_quarter"
    ];
    const sectionMatches = SECTIONS.map(s => {
      return { section: s, desc: getPageVerseDescription(pageNumber, s) };
    }).sort((a, b) => b.desc.length - a.desc.length);

    for (const match of sectionMatches) {
      if (match.desc && titleNormalized.includes(match.desc)) {
        matchedSections.push(match.section);
        break;
      }
    }
  }
  
  // FINAL Fallback logic: If we found no specific sections or ranges, 
  // but the page was supposed to be included (according to taskStartPage), return full page.
  // Otherwise return empty to indicate "No verses selected on this page".
  if (matchedSections.length === 0) {
    if (taskStartPage > 0 && pageNumber >= taskStartPage && pageNumber <= taskEndPage) {
      return getVerseRangeForPage(pageNumber);
    }
    return [];
  }

  // Combine and reconstruct the ranges of all matched sections
  const allMatchedRanges: VerseRange[] = [];
  matchedSections.forEach(sec => {
    allMatchedRanges.push(...getPageVerseSubset(pageNumber, sec));
  });

  const mergedRanges: VerseRange[] = [];
  const allVerses: { surah: string, v: number }[] = [];
  
  allMatchedRanges.forEach(r => {
    for (let v = r.start; v <= r.end; v++) {
      if (!allVerses.some(item => item.surah === r.surah && item.v === v)) {
        allVerses.push({ surah: r.surah, v });
      }
    }
  });

  let currRange: VerseRange | null = null;
  allVerses.forEach(item => {
    if (!currRange) {
      currRange = { surah: item.surah, start: item.v, end: item.v };
    } else if (currRange.surah === item.surah && item.v === currRange.end + 1) {
      currRange.end = item.v;
    } else {
      mergedRanges.push(currRange);
      currRange = { surah: item.surah, start: item.v, end: item.v };
    }
  });
  if (currRange) {
    mergedRanges.push(currRange);
  }

  return mergedRanges;
}


