import { addDays, format, startOfDay, getDay, isAfter, isSameDay, differenceInCalendarDays } from 'date-fns';
import { DailyAmount, Task, TaskType, QuranPlan, ProgressLog, ReviewTrack } from '../types';
import { getSplitPartsForPage, formatVerseDescForTitle } from './pageSplitter';
import { QURAN_QUARTERS } from './quranQuarters';
import { getPageVerseDescription, getVerseRangeForPage, formatVerseDescription, getPageVerseSubset, PageSection, SURAH_METADATAList, parseVerseRangesFromArabicText, parseJuzsFromText, getVerseRangesForJuzs } from './quranPageMapping';

export const parsePlanDate = (dateStr: string | Date | undefined): Date => {
  if (!dateStr) return startOfDay(new Date());
  if (dateStr instanceof Date) return startOfDay(dateStr);
  if (typeof dateStr === 'string') {
    const cleanStr = dateStr.trim();
    if (cleanStr.length >= 10 && cleanStr.includes('-')) {
      const parts = cleanStr.substring(0, 10).split('-').map(Number);
      if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
        return new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
      }
    }
    return startOfDay(new Date(cleanStr));
  }
  return startOfDay(new Date());
};

export const JUZ_PAGES: Record<number, { start: number; end: number }> = {
  1: { start: 1, end: 21 },
  2: { start: 22, end: 41 },
  3: { start: 42, end: 61 },
  4: { start: 62, end: 81 },
  5: { start: 82, end: 101 },
  6: { start: 102, end: 121 },
  7: { start: 121, end: 141 },
  8: { start: 142, end: 161 },
  9: { start: 162, end: 181 },
  10: { start: 182, end: 201 },
  11: { start: 201, end: 221 },
  12: { start: 222, end: 241 },
  13: { start: 242, end: 261 },
  14: { start: 262, end: 281 },
  15: { start: 282, end: 301 },
  16: { start: 302, end: 321 },
  17: { start: 322, end: 341 },
  18: { start: 342, end: 361 },
  19: { start: 362, end: 381 },
  20: { start: 382, end: 401 },
  21: { start: 402, end: 421 },
  22: { start: 422, end: 441 },
  23: { start: 442, end: 461 },
  24: { start: 462, end: 481 },
  25: { start: 482, end: 502 },
  26: { start: 502, end: 521 },
  27: { start: 522, end: 541 },
  28: { start: 542, end: 561 },
  29: { start: 562, end: 581 },
  30: { start: 582, end: 604 },
};

interface VerseRange {
  surah: string;
  start: number;
  end: number;
}

const mergeVerseRanges = (ranges: VerseRange[]): VerseRange[] => {
  if (ranges.length === 0) return [];
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
  return merged;
};

const formatDetailedPages = (pages: number[], fractionMode?: 'half' | 'quarter', currentPos?: number, isCumulative?: boolean, allowedSurahs?: string[], plan?: QuranPlan): string => {
  if (pages.length === 0) return "";
  
  const uniquePages = [...new Set(pages)].sort((a, b) => a - b);
  
  if (fractionMode && currentPos !== undefined) {
    const page = uniquePages[0];
    let section: 'first_half' | 'second_half' | 'first_quarter' | 'second_quarter' | 'third_quarter' | 'fourth_quarter';
    
    if (fractionMode === 'half') {
      section = (currentPos % 1 === 0) ? "first_half" : "second_half";
    } else { // quarter
      const rem = currentPos % 1;
      if (rem === 0.25) section = 'second_quarter';
      else if (rem === 0.5) section = 'third_quarter';
      else if (rem === 0.75) section = 'fourth_quarter';
      else section = 'first_quarter';
    }
    
    return `ص ${page} (${getAdjustedPageVerseDescription(page, plan, uniquePages, section)})`;
  }

  const segments: number[][] = [];
  let currentSegment = [uniquePages[0]];
  for (let i = 1; i < uniquePages.length; i++) {
    if (uniquePages[i] === uniquePages[i - 1] + 1) {
      currentSegment.push(uniquePages[i]);
    } else {
      segments.push(currentSegment);
      currentSegment = [uniquePages[i]];
    }
  }
  segments.push(currentSegment);

  return segments.map(segment => {
    const flatRanges: VerseRange[] = [];
    for (const p of segment) {
      flatRanges.push(...getAdjustedVerseRangeForPage(p, plan, segment));
    }
    
    const filteredRanges = allowedSurahs && allowedSurahs.length > 0 ? flatRanges.filter(r => allowedSurahs.includes(r.surah) || allowedSurahs.includes(r.surah.replace("سورة ", ""))) : flatRanges;
    const merged = mergeVerseRanges(filteredRanges);
    let formattedRanges = "";
    if (isCumulative && merged.length > 0) {
      const first = merged[0];
      const last = merged[merged.length - 1];
      const firstSurah = first.surah.startsWith("سورة") ? first.surah.replace("سورة ", "") : first.surah;
      const lastSurah = last.surah.startsWith("سورة") ? last.surah.replace("سورة ", "") : last.surah;
      if (first.surah === last.surah && first.start === last.start && first.end === last.end) {
        formattedRanges = `${firstSurah}: الآية ${first.start} إلى ${first.end}`;
      } else {
        formattedRanges = `من ${firstSurah}: الآية ${first.start} إلى ${lastSurah}: الآية ${last.end}`;
      }
    } else {
      formattedRanges = formatVerseDescription(merged);
    }
    
    const minPage = segment[0];
    const maxPage = segment[segment.length - 1];
    
    if (minPage === maxPage) {
      return `ص ${minPage} (${formattedRanges})`;
    }
    return `ص ${minPage}-${maxPage} (${formattedRanges})`;
  }).join('، و ');
};

const formatPages = (pages: number[]) => {
  return formatDetailedPages(pages);
};

export interface MemorizationUnit {
  title: string;
  pages: number[];
  verseRanges?: { surah: string; start: number; end: number }[];
  weight: number;
}

interface UnitParsed {
  page: number;
  type: 'quarter' | 'half' | 'full' | 'other';
  index: number; // 1 to 4 for quarter, 1 to 2 for half, 1 for full
  title: string;
}

function parseUnit(u: { title: string; pages: number[] }): UnitParsed {
  const page = u.pages[0] || 0;
  let type: 'quarter' | 'half' | 'full' | 'other' = 'other';
  let index = 1;

  if (u.title.includes("الربع 1")) {
    type = 'quarter';
    index = 1;
  } else if (u.title.includes("الربع 2")) {
    type = 'quarter';
    index = 2;
  } else if (u.title.includes("الربع 3")) {
    type = 'quarter';
    index = 3;
  } else if (u.title.includes("الربع 4")) {
    type = 'quarter';
    index = 4;
  } else if (u.title.includes("النصف 1")) {
    type = 'half';
    index = 1;
  } else if (u.title.includes("النصف 2")) {
    type = 'half';
    index = 2;
  } else if (u.title.includes("ص ") && u.pages.length === 1) {
    type = 'full';
    index = 1;
  }

  return { page, type, index, title: u.title };
}

function getVerseRangesForUnit(u: { title: string; pages: number[] }): VerseRange[] {
  const parsedRanges = parseVerseRangesFromArabicText(u.title);
  if (parsedRanges.length > 0) {
    return parsedRanges;
  }

  const parsedJuzs = parseJuzsFromText(u.title);
  let juzRestrictedRanges: VerseRange[] | null = null;
  if (parsedJuzs.length > 0) {
    juzRestrictedRanges = getVerseRangesForJuzs(parsedJuzs);
  }

  const ranges: VerseRange[] = [];
  for (const p of u.pages) {
    const match = u.title.match(/(سورة\s+[^(]+)\s*\(الآيات\s*(\d+)-(\d+)\)/);
    if (match) {
      ranges.push({
        surah: match[1].trim(),
        start: parseInt(match[2]),
        end: parseInt(match[3])
      });
      continue;
    }
    
    let section: PageSection = "full";
    if (u.title.includes("النصف 1")) section = "first_half";
    else if (u.title.includes("النصف 2")) section = "second_half";
    else if (u.title.includes("الربع 1")) section = "first_quarter";
    else if (u.title.includes("الربع 2")) section = "second_quarter";
    else if (u.title.includes("الربع 3")) section = "third_quarter";
    else if (u.title.includes("الربع 4")) section = "fourth_quarter";
    
    const subsets = getPageVerseSubset(p, section);
    if (juzRestrictedRanges) {
      subsets.forEach(sub => {
        juzRestrictedRanges!.forEach(jr => {
          if (sub.surah === jr.surah) {
            const start = Math.max(sub.start, jr.start);
            const end = Math.min(sub.end, jr.end);
            if (start <= end) {
              ranges.push({ surah: sub.surah, start, end });
            }
          }
        });
      });
    } else {
      ranges.push(...subsets);
    }
  }
  return ranges;
}

export function formatArabicVerseRange(ranges: VerseRange[]): string {
  return formatVerseDescription(ranges);
}

export function formatUnitsTitle(unitsToFormat: { title: string; pages: number[] }[]): string {
  if (unitsToFormat.length === 0) return "";
  
  const parsed = unitsToFormat.map(u => parseUnit(u));
  const allPages = [...new Set(unitsToFormat.flatMap(u => u.pages))].sort((a, b) => a - b);
  const validParsed = parsed.filter(p => p.page > 0);
  
  // Check if any page has 2 or fewer verses (e.g. page 282)
  const hasFewVerses = allPages.some(p => {
    const ranges = getVerseRangeForPage(p);
    let total = 0;
    ranges.forEach(r => {
      total += (r.end - r.start + 1);
    });
    return total <= 2;
  });

  let allQuarters = validParsed.length > 0 && validParsed.every(p => p.type === 'quarter');
  let allHalves = validParsed.length > 0 && validParsed.every(p => p.type === 'half');
  let allFullPages = validParsed.length > 0 && validParsed.every(p => p.type === 'full');

  // If there are sufficient verses, omit Quarter/Half descriptions and treat as full pages
  if (!hasFewVerses && (allQuarters || allHalves)) {
    allQuarters = false;
    allHalves = false;
    allFullPages = true;
  }
  
  const minPage = allPages[0];
  const maxPage = allPages[allPages.length - 1];
  
  let sectionDesc = "";
  
  if (allQuarters) {
    const quarterWords: Record<number, string> = {
      1: "الربع الأول",
      2: "الربع الثاني",
      3: "الربع الثالث",
      4: "الربع الرابع"
    };
    
    if (minPage === maxPage) {
      const idxs = validParsed.map(p => p.index).sort((a, b) => a - b);
      const startQ = idxs[0];
      const endQ = idxs[idxs.length - 1];
      
      if (startQ === endQ) {
        sectionDesc = `ص ${minPage} ${quarterWords[startQ]}`;
      } else {
        sectionDesc = `ص ${minPage} ${quarterWords[startQ]} إلى ${quarterWords[endQ]}`;
      }
    } else {
      const startPageUnits = validParsed.filter(p => p.page === minPage).sort((a, b) => a.index - b.index);
      const endPageUnits = validParsed.filter(p => p.page === maxPage).sort((a, b) => a.index - b.index);
      const startQ = startPageUnits[0]?.index || 1;
      const endQ = endPageUnits[endPageUnits.length - 1]?.index || 4;
      
      const startLabel = ` ${quarterWords[startQ]}`;
      const endLabel = ` ${quarterWords[endQ]}`;
      
      sectionDesc = `من ص ${minPage}${startLabel} إلى ص ${maxPage}${endLabel}`;
    }
  } else if (allHalves) {
    const halfWords: Record<number, string> = {
      1: "النصف الأول",
      2: "النصف الثاني"
    };
    
    if (minPage === maxPage) {
      const idxs = validParsed.map(p => p.index).sort((a, b) => a - b);
      const startH = idxs[0];
      const endH = idxs[idxs.length - 1];
      
      if (startH === endH) {
        sectionDesc = `ص ${minPage} ${halfWords[startH]}`;
      } else {
        sectionDesc = `ص ${minPage} ${halfWords[startH]} إلى ${halfWords[endH]}`;
      }
    } else {
      const startPageUnits = validParsed.filter(p => p.page === minPage).sort((a, b) => a.index - b.index);
      const endPageUnits = validParsed.filter(p => p.page === maxPage).sort((a, b) => a.index - b.index);
      const startH = startPageUnits[0]?.index || 1;
      const endH = endPageUnits[endPageUnits.length - 1]?.index || 2;
      
      const startLabel = ` ${halfWords[startH]}`;
      const endLabel = ` ${halfWords[endH]}`;
      
      sectionDesc = `من ص ${minPage}${startLabel} إلى ص ${maxPage}${endLabel}`;
    }
  } else if (allFullPages) {
    if (minPage === maxPage) {
      sectionDesc = `ص ${minPage}`;
    } else {
      sectionDesc = `ص ${minPage} إلى ${maxPage}`;
    }
  }
  
  const allVerses: VerseRange[] = [];
  for (const u of unitsToFormat) {
    allVerses.push(...getVerseRangesForUnit(u));
  }
  
  const verseRangeText = formatArabicVerseRange(allVerses);
  
  if (sectionDesc) {
    if (verseRangeText) {
      return `${sectionDesc} (${verseRangeText})`;
    }
    return sectionDesc;
  }
  
  if (verseRangeText) {
    return verseRangeText;
  }
  
  return unitsToFormat.map(u => u.title).join(" و ");
}

export function getAdjustedVerseRangeForPage(page: number, plan?: QuranPlan, contextPages?: number[]): VerseRange[] {
  const originalRanges = getVerseRangeForPage(page);
  
  if (page === 121) {
    if (contextPages) {
      const hasJuz7Pages = contextPages.some(p => p > 121 && p <= 141);
      const hasJuz6Pages = contextPages.some(p => p >= 102 && p < 121);
      if (hasJuz7Pages && !hasJuz6Pages) {
        return [{ surah: "المائدة", start: 82, end: 82 }];
      }
      if (hasJuz6Pages && !hasJuz7Pages) {
        return [{ surah: "المائدة", start: 77, end: 81 }];
      }
    }
    if (plan) {
      const isJuz7 = 
        plan.selectedJuzsToMemorize?.includes(7) ||
        plan.selectedReviewJuzs?.includes(7) ||
        plan.selectedFixationJuzs?.includes(7) ||
        (plan.startPage && Number(plan.startPage) >= 121) ||
        (plan.memorizationTargetPages && plan.memorizationTargetPages.some(p => p > 121 && p <= 141));
        
      const isJuz6 = 
        plan.selectedJuzsToMemorize?.includes(6) ||
        plan.selectedReviewJuzs?.includes(6) ||
        plan.selectedFixationJuzs?.includes(6) ||
        (plan.endPage && Number(plan.endPage) <= 121) ||
        (plan.memorizationTargetPages && plan.memorizationTargetPages.some(p => p >= 102 && p < 121));
        
      if (isJuz7 && !isJuz6) {
        return [{ surah: "المائدة", start: 82, end: 82 }];
      }
      if (isJuz6 && !isJuz7) {
        return [{ surah: "المائدة", start: 77, end: 81 }];
      }
    }
  }
  
  if (page === 201) {
    if (contextPages) {
      const hasJuz11Pages = contextPages.some(p => p > 201 && p <= 221);
      const hasJuz10Pages = contextPages.some(p => p >= 182 && p < 201);
      if (hasJuz11Pages && !hasJuz10Pages) {
        return [{ surah: "التوبة", start: 93, end: 93 }];
      }
      if (hasJuz10Pages && !hasJuz11Pages) {
        return [{ surah: "التوبة", start: 87, end: 92 }];
      }
    }
    if (plan) {
      const isJuz11 = 
        plan.selectedJuzsToMemorize?.includes(11) ||
        plan.selectedReviewJuzs?.includes(11) ||
        plan.selectedFixationJuzs?.includes(11) ||
        (plan.startPage && Number(plan.startPage) >= 201) ||
        (plan.memorizationTargetPages && plan.memorizationTargetPages.some(p => p > 201 && p <= 221));
        
      const isJuz10 = 
        plan.selectedJuzsToMemorize?.includes(10) ||
        plan.selectedReviewJuzs?.includes(10) ||
        plan.selectedFixationJuzs?.includes(10) ||
        (plan.endPage && Number(plan.endPage) <= 201) ||
        (plan.memorizationTargetPages && plan.memorizationTargetPages.some(p => p >= 182 && p < 201));
        
      if (isJuz11 && !isJuz10) {
        return [{ surah: "التوبة", start: 93, end: 93 }];
      }
      if (isJuz10 && !isJuz11) {
        return [{ surah: "التوبة", start: 87, end: 92 }];
      }
    }
  }
  
  if (page === 502) {
    if (contextPages) {
      const hasJuz26Pages = contextPages.some(p => p > 502 && p <= 521);
      const hasJuz25Pages = contextPages.some(p => p >= 482 && p < 502);
      if (hasJuz26Pages && !hasJuz25Pages) {
        return [{ surah: "الأحقاف", start: 1, end: 5 }];
      }
      if (hasJuz25Pages && !hasJuz26Pages) {
        return [{ surah: "الجاثية", start: 33, end: 37 }];
      }
    }
    if (plan) {
      const isJuz26 = 
        plan.selectedJuzsToMemorize?.includes(26) ||
        plan.selectedReviewJuzs?.includes(26) ||
        plan.selectedFixationJuzs?.includes(26) ||
        (plan.startPage && Number(plan.startPage) >= 502) ||
        (plan.memorizationTargetPages && plan.memorizationTargetPages.some(p => p > 502 && p <= 521));
        
      const isJuz25 = 
        plan.selectedJuzsToMemorize?.includes(25) ||
        plan.selectedReviewJuzs?.includes(25) ||
        plan.selectedFixationJuzs?.includes(25) ||
        (plan.endPage && Number(plan.endPage) <= 502) ||
        (plan.memorizationTargetPages && plan.memorizationTargetPages.some(p => p >= 482 && p < 502));
        
      if (isJuz26 && !isJuz25) {
        return [{ surah: "الأحقاف", start: 1, end: 5 }];
      }
      if (isJuz25 && !isJuz26) {
        return [{ surah: "الجاثية", start: 33, end: 37 }];
      }
    }
  }
  
  return originalRanges;
}

export function getAdjustedPageVerseDescription(page: number, plan?: QuranPlan, contextPages?: number[], section?: PageSection): string {
  const adjustedRanges = getAdjustedVerseRangeForPage(page, plan, contextPages);
  const subset = getPageVerseSubset(page, section);
  const intersected: VerseRange[] = [];
  subset.forEach(sub => {
    adjustedRanges.forEach(adj => {
      if (sub.surah === adj.surah) {
        const start = Math.max(sub.start, adj.start);
        const end = Math.min(sub.end, adj.end);
        if (start <= end) {
          intersected.push({ surah: sub.surah, start, end });
        }
      }
    });
  });
  
  if (intersected.length === 0) return "نهاية الصفحة";
  return formatVerseDescription(intersected);
}

export function getPageUnits(p: number, pagesPerDay: number, plan?: QuranPlan): MemorizationUnit[] {
  if (p === 1) {
    if (pagesPerDay === 0.25) {
      return [
        { title: "سورة الفاتحة (الآيات 1-3)", pages: [1], weight: 0.25 },
        { title: "سورة الفاتحة (الآيات 4-7)", pages: [1], weight: 0.25 }
      ];
    }
    return [{ title: "ص 1 (الفاتحة)", pages: [1], weight: 0.5 }];
  }

  if (p === 2) {
    if (pagesPerDay === 0.25) {
      return [
        { title: "ص 2 (النصف 1)", pages: [2], weight: 0.25 },
        { title: "ص 2 (النصف 2)", pages: [2], weight: 0.25 }
      ];
    }
    return [{ title: "ص 2 (بداية البقرة)", pages: [2], weight: 0.5 }];
  }

  if (p === 587) {
    if (pagesPerDay === 0.25) {
      return [
        { title: "سورة الانفطار (الآيات 1-10)", pages: [587], weight: 0.25 },
        { title: "سورة الانفطار (الآيات 11-19)", pages: [587], weight: 0.25 },
        { title: "سورة المطففين (الآيات 1-3)", pages: [587], weight: 0.25 },
        { title: "سورة المطففين (الآيات 4-6)", pages: [587], weight: 0.25 }
      ];
    } else {
      return [
        { title: "سورة الانفطار كاملة (الآيات 1-19)", pages: [587], weight: 0.5 },
        { title: "سورة المطففين (الآيات 1-6)", pages: [587], weight: 0.5 }
      ];
    }
  }

  if (p === 590) {
    if (pagesPerDay === 0.25) {
      return [
        { title: "سورة الانشقاق (الآيات 10-18)", pages: [590], weight: 0.25 },
        { title: "سورة الانشقاق (الآيات 19-25)", pages: [590], weight: 0.25 },
        { title: "سورة البروج (الآيات 1-10)", pages: [590], weight: 0.25 },
        { title: "سورة البروج (الآيات 11-22)", pages: [590], weight: 0.25 }
      ];
    } else {
      return [
        { title: "سورة الانشقاق (الآيات 10-25)", pages: [590], weight: 0.5 },
        { title: "سورة البروج كاملة (الآيات 1-22)", pages: [590], weight: 0.5 }
      ];
    }
  }

  if (p === 591) {
    if (pagesPerDay === 0.25) {
      return [
        { title: "سورة الطارق (الآيات 1-8)", pages: [591], weight: 0.25 },
        { title: "سورة الطارق (الآيات 9-17)", pages: [591], weight: 0.25 },
        { title: "سورة الأعلى (الآيات 1-8)", pages: [591], weight: 0.25 },
        { title: "سورة الأعلى (الآيات 9-15)", pages: [591], weight: 0.25 }
      ];
    } else {
      return [
        { title: "سورة الطارق كاملة (الآيات 1-17)", pages: [591], weight: 0.5 },
        { title: "سورة الأعلى (الآيات 1-15)", pages: [591], weight: 0.5 }
      ];
    }
  }

  if (p === 592) {
    if (pagesPerDay === 0.25) {
      return [
        { title: "سورة الأعلى (الآيات 16-19)", pages: [592], weight: 0.25 },
        { title: "سورة الغاشية (الآيات 1-13)", pages: [592], weight: 0.25 },
        { title: "سورة الغاشية (الآيات 14-26)", pages: [592], weight: 0.25 },
        { title: "سورة الفجر (الآيات 1-13)", pages: [592], weight: 0.25 }
      ];
    } else {
      return [
        { title: "سورة الأعلى (الآيات 16-19) وسورة الغاشية (الآيات 1-13)", pages: [592], weight: 0.5 },
        { title: "سورة الغاشية (الآيات 14-26) وسورة الفجر (الآيات 1-13)", pages: [592], weight: 0.5 }
      ];
    }
  }

  if (p === 593) {
    if (pagesPerDay === 0.25) {
      return [
        { title: "سورة الفجر (الآيات 14-22)", pages: [593], weight: 0.25 },
        { title: "سورة الفجر (الآيات 23-30)", pages: [593], weight: 0.25 },
        { title: "سورة البلد (الآيات 1-10)", pages: [593], weight: 0.25 },
        { title: "سورة البلد (الآيات 11-20)", pages: [593], weight: 0.25 }
      ];
    } else {
      return [
        { title: "سورة الفجر (الآيات 14-30)", pages: [593], weight: 0.5 },
        { title: "سورة البلد كاملة (الآيات 1-20)", pages: [593], weight: 0.5 }
      ];
    }
  }

  if (p === 595) {
    if (pagesPerDay === 0.25) {
      return [
        { title: "سورة الشمس (الآيات 1-8)", pages: [595], weight: 0.25 },
        { title: "سورة الشمس (الآيات 9-15)", pages: [595], weight: 0.25 },
        { title: "سورة الليل (الآيات 1-7)", pages: [595], weight: 0.25 },
        { title: "سورة الليل (الآيات 8-14)", pages: [595], weight: 0.25 }
      ];
    } else {
      return [
        { title: "سورة الشمس كاملة (الآيات 1-15)", pages: [595], weight: 0.5 },
        { title: "سورة الليل (الآيات 1-14)", pages: [595], weight: 0.5 }
      ];
    }
  }

  if (p === 596) {
    return [
      { title: "سورة الليل (الآيات 15-21)", pages: [596], weight: 0.25 },
      { title: "سورة الضحى كاملة (الآيات 1-11)", pages: [596], weight: 0.25 },
      { title: "سورة الشرح كاملة (الآيات 1-8)", pages: [596], weight: 0.25 }
    ];
  }

  if (p === 597) {
    if (pagesPerDay === 0.25) {
      return [
        { title: "سورة التين كاملة (الآيات 1-8)", pages: [597], weight: 0.25 },
        { title: "سورة العلق (الآيات 1-8)", pages: [597], weight: 0.25 },
        { title: "سورة العلق (الآيات 9-19)", pages: [597], weight: 0.25 }
      ];
    } else {
      return [
        { title: "سورة التين كاملة (الآيات 1-8)", pages: [597], weight: 0.25 },
        { title: "سورة العلق كاملة (الآيات 1-19)", pages: [597], weight: 0.5 }
      ];
    }
  }

  if (p === 598) {
    return [
      { title: "سورة القدر كاملة (الآيات 1-5)", pages: [598], weight: 0.25 },
      { title: "سورة البينة (الآيات 1-5)", pages: [598], weight: 0.25 }
    ];
  }

  if (p === 599) {
    return [
      { title: "سورة البينة (الآيات 6-8)", pages: [599], weight: 0.25 },
      { title: "سورة الزلزلة كاملة (الآيات 1-8)", pages: [599], weight: 0.25 },
      { title: "سورة العاديات (الآيات 1-6)", pages: [599], weight: 0.25 }
    ];
  }

  if (p === 600) {
    return [
      { title: "سورة العاديات (الآيات 7-11)", pages: [600], weight: 0.25 },
      { title: "سورة القارعة كاملة (الآيات 1-11)", pages: [600], weight: 0.25 },
      { title: "سورة التكاثر كاملة (الآيات 1-8)", pages: [600], weight: 0.25 }
    ];
  }

  if (p === 601) {
    return [
      { title: "سورة العصر كاملة (الآيات 1-3)", pages: [601], weight: 0.25 },
      { title: "سورة الهمزة كاملة (الآيات 1-9)", pages: [601], weight: 0.25 },
      { title: "سورة الفيل كاملة (الآيات 1-5)", pages: [601], weight: 0.25 }
    ];
  }

  if (p === 602) {
    return [
      { title: "سورة قريش كاملة (الآيات 1-4)", pages: [602], weight: 0.25 },
      { title: "سورة الماعون كاملة (الآيات 1-7)", pages: [602], weight: 0.25 },
      { title: "سورة الكوثر كاملة (الآيات 1-3)", pages: [602], weight: 0.25 }
    ];
  }

  if (p === 603) {
    return [
      { title: "سورة الكافرون كاملة (الآيات 1-6)", pages: [603], weight: 0.25 },
      { title: "سورة النصر كاملة (الآيات 1-3)", pages: [603], weight: 0.25 },
      { title: "سورة المسد كاملة (الآيات 1-5)", pages: [603], weight: 0.25 }
    ];
  }

  if (p === 604) {
    return [
      { title: "سورة الإخلاص كاملة (الآيات 1-4)", pages: [604], weight: 0.25 },
      { title: "سورة الفلق كاملة (الآيات 1-5)", pages: [604], weight: 0.25 },
      { title: "سورة الناس كاملة (الآيات 1-6)", pages: [604], weight: 0.25 }
    ];
  }

  if (pagesPerDay === 0.5) {
    return [
      { title: `ص ${p} (النصف 1: ${getAdjustedPageVerseDescription(p, plan, [p], 'first_half')})`, pages: [p], weight: 0.5 },
      { title: `ص ${p} (النصف 2: ${getAdjustedPageVerseDescription(p, plan, [p], 'second_half')})`, pages: [p], weight: 0.5 }
    ];
  } else if (pagesPerDay === 0.25) {
    return [
      { title: `ص ${p} (الربع 1: ${getAdjustedPageVerseDescription(p, plan, [p], 'first_quarter')})`, pages: [p], weight: 0.25 },
      { title: `ص ${p} (الربع 2: ${getAdjustedPageVerseDescription(p, plan, [p], 'second_quarter')})`, pages: [p], weight: 0.25 },
      { title: `ص ${p} (الربع 3: ${getAdjustedPageVerseDescription(p, plan, [p], 'third_quarter')})`, pages: [p], weight: 0.25 },
      { title: `ص ${p} (الربع 4: ${getAdjustedPageVerseDescription(p, plan, [p], 'fourth_quarter')})`, pages: [p], weight: 0.25 }
    ];
  } else {
    return [
      { title: `ص ${p} (${getAdjustedPageVerseDescription(p, plan, [p])})`, pages: [p], weight: 1.0 }
    ];
  }
}


export function getQuartersForJuzs(juzs: number[]): number[] {
  const qs: number[] = [];
  juzs.forEach(j => {
    for (let i = (j-1)*8 + 1; i <= j*8; i++) qs.push(i);
  });
  return qs;
}

export function getMemorizationUnits(pagesToMemorize: number[], pagesPerDay: number, plan?: QuranPlan): MemorizationUnit[] {
  const allUnits: MemorizationUnit[] = [];

  if (pagesPerDay === 2.5) {
    const isDescending = pagesToMemorize.length >= 2 && pagesToMemorize[0] > pagesToMemorize[1];
    const sortedPages = [...pagesToMemorize].sort((a,b) => a-b);
    
    let matchingQuarters = QURAN_QUARTERS.filter(q => {
      for (let p = q.startPage; p <= q.endPage; p++) {
        if (sortedPages.includes(p)) return true;
      }
      return false;
    });
    
    // Exact Juz boundary filtering to prevent accidental previous Juz overlap
    if (plan && plan.planType === 'juz' && plan.selectedJuzsToMemorize && plan.selectedJuzsToMemorize.length > 0) {
      const allowedQuarters = getQuartersForJuzs(plan.selectedJuzsToMemorize);
      matchingQuarters = matchingQuarters.filter(q => allowedQuarters.includes(q.number));
    } else if (plan && plan.planType === 'review' && plan.reviewAmountType !== 'pages' && !plan.isSpecificReview) {
      // If full review plan, allowed quarters can be restricted if needed, but usually it covers everything anyway.
    }

    if (isDescending) matchingQuarters.reverse();

    matchingQuarters.forEach(q => {
      const overlappingPages: number[] = [];
      for (let p = q.startPage; p <= q.endPage; p++) {
        if (sortedPages.includes(p)) {
          overlappingPages.push(p);
        }
      }
      
      if (overlappingPages.length > 0) {
        if (isDescending) overlappingPages.reverse();
        
        const hizbNum = Math.floor((q.number - 1) / 4) + 1;
        const quarterInHizb = ((q.number - 1) % 4) + 1;
        let quarterLabel = "بداية الحزب";
        if (quarterInHizb === 2) quarterLabel = "ربع الحزب";
        if (quarterInHizb === 3) quarterLabel = "نصف الحزب";
        if (quarterInHizb === 4) quarterLabel = "ثلاثة أرباع الحزب";
        
        const nextQ = QURAN_QUARTERS[q.number];
        let endSurahName = "";
        let endAyah = 0;
        
        if (nextQ) {
            if (nextQ.ayah > 1) {
                endSurahName = nextQ.surahName;
                endAyah = nextQ.ayah - 1;
            } else {
                const prevSurahIndex = nextQ.surahNum - 2;
                if (prevSurahIndex >= 0 && prevSurahIndex < SURAH_METADATAList.length) {
                    endSurahName = "سورة " + SURAH_METADATAList[prevSurahIndex].name;
                    endAyah = SURAH_METADATAList[prevSurahIndex].endVerse;
                } else {
                    endSurahName = q.surahName;
                    endAyah = q.ayah;
                }
            }
        } else {
            endSurahName = "سورة الناس";
            endAyah = 6;
        }

        const patternPart = `${q.surahName}: الآية ${q.ayah} إلى ${endSurahName}: الآية ${endAyah}`;
        const title = `الحزب ${hizbNum} (${quarterLabel}) (${patternPart})`;
        
        allUnits.push({
          title,
          pages: overlappingPages,
          weight: 2.5
        });
      }
    });
    return allUnits;
  }

  const sharedPages = [121, 201, 502];
  let i = 0;
  while (i < pagesToMemorize.length) {
    const p = pagesToMemorize[i];
    
    // Check if this page is a shared page AND is the very first page in our plan's target Juz sequence
    let isSharedJuzStart = false;
    let juzNum = 0;
    if (sharedPages.includes(p) && i + 1 < pagesToMemorize.length && pagesToMemorize[i+1] === p + 1) {
       if (plan && plan.planType === 'juz' && plan.selectedJuzsToMemorize && plan.selectedJuzsToMemorize.length > 0) {
          juzNum = plan.selectedJuzsToMemorize[0];
          if (JUZ_PAGES[juzNum] && JUZ_PAGES[juzNum].start === p && i === 0) {
             isSharedJuzStart = true;
          }
       }
    }
    
    if (isSharedJuzStart) {
       const nextP = pagesToMemorize[i+1];
       const nextUnits = getPageUnits(nextP, pagesPerDay);
       
       if (nextUnits.length > 0) {
           nextUnits[0].pages = [p, nextP];
           // Append Juz info without removing the quarter/half info
           nextUnits[0].title = nextUnits[0].title.replace(`ص ${nextP}`, `ص ${p}-${nextP}`) + ` من الجزء ${juzNum}`;
       }
       allUnits.push(...nextUnits);
       i += 2;
    } else {
       allUnits.push(...getPageUnits(p, pagesPerDay));
       i++;
    }
  }
  allUnits.forEach(u => {
    u.verseRanges = getVerseRangesForUnit(u);
  });
  return allUnits;
}

export function getUnitsForMemDay(memDay: number, units: MemorizationUnit[], pagesPerDay: number): MemorizationUnit[] {
  if (memDay < 1) return [];
  const A = pagesPerDay;
  const startWeight = (memDay - 1) * A;
  const endWeight = memDay * A;
  
  let currentWeightAccum = 0;
  const assignedUnits: MemorizationUnit[] = [];
  for (const u of units) {
    const sw = currentWeightAccum;
    currentWeightAccum += u.weight;
    const ew = currentWeightAccum;
    if (sw < endWeight - 0.0001 && ew > startWeight + 0.0001) {
      assignedUnits.push(u);
    }
  }
  return assignedUnits;
}

const generateReviewTaskForTrack = (
  track: ReviewTrack,
  trackIndex: number,
  daysElapsed: number,
  targetDate: Date,
  plan: QuranPlan
): Task | null => {
  const isSpecific = track.reviewRangeMode !== 'full';
  const reviewPages = track.reviewPages || [];

  const reviewAmountType = track.reviewAmountType || 'juz';
  const reviewPageAmount = track.reviewPageAmount || 20;

  const reviewPagesToAssign: number[] = [];
  let reviewTitle = "";
  let juzList: number[] = [];

  if (reviewAmountType === 'pages') {
    const allPagesToReview: number[] = [];
    if (isSpecific) {
      allPagesToReview.push(...reviewPages);
    } else {
      const startJ = track.startJuz || 1;
      const startPageOfJuz = JUZ_PAGES[startJ]?.start || 1;
      const minPage = startJ === 1 ? 2 : startPageOfJuz;
      for (let p = minPage; p <= 604; p++) {
        allPagesToReview.push(p);
      }
      for (let p = 2; p < minPage; p++) {
        allPagesToReview.push(p);
      }
    }

    if (allPagesToReview.length > 0) {
      if (!plan.includeFixation && daysElapsed * reviewPageAmount >= allPagesToReview.length) {
        return null; // track ends when review finishes
      }
      const startIdx = (daysElapsed * reviewPageAmount) % allPagesToReview.length;
      for (let i = 0; i < reviewPageAmount && i < allPagesToReview.length; i++) {
        reviewPagesToAssign.push(allPagesToReview[(startIdx + i) % allPagesToReview.length]);
      }
    }

    if (reviewPagesToAssign.length > 0) {
      const formattedPages = formatDetailedPages(reviewPagesToAssign, undefined, undefined, true, undefined, plan);
      reviewTitle = `مراجعة ${formattedPages}`;
    } else {
      reviewTitle = "مراجعة المحفوظ";
    }
  } else {
    const reviewJuzAmount = track.reviewJuzAmount || 3;

    if (isSpecific) {
      let includedJuzs: number[] = [];
      if (track.selectedReviewJuzs && track.selectedReviewJuzs.length > 0) {
        includedJuzs = [...track.selectedReviewJuzs].sort((a,b) => a-b);
      } else {
        for (let j = 1; j <= 30; j++) {
          const range = JUZ_PAGES[j];
          if (range) {
            let hasOverlap = false;
            for (let p = range.start; p <= range.end; p++) {
              if (reviewPages.includes(p)) {
                hasOverlap = true;
                break;
              }
            }
            if (hasOverlap) {
              includedJuzs.push(j);
            }
          }
        }
      }

      const totalIncludedJuzs = includedJuzs.length;
      if (totalIncludedJuzs > 0) {
        if (!plan.includeFixation && daysElapsed * reviewJuzAmount >= totalIncludedJuzs) {
          return null; // track ends when review finishes
        }
        const startJuzIdx = (daysElapsed * reviewJuzAmount) % totalIncludedJuzs;
        for (let i = 0; i < reviewJuzAmount && i < totalIncludedJuzs; i++) {
          juzList.push(includedJuzs[(startJuzIdx + i) % totalIncludedJuzs]);
        }
      }
    } else {
      if (!plan.includeFixation && daysElapsed * reviewJuzAmount >= 30) {
        return null; // track ends when review finishes
      }
      const startJ = track.startJuz || 1;
      const fullJuzList: number[] = [];
      for (let i = 0; i < 30; i++) {
        fullJuzList.push(((startJ - 1 + i) % 30) + 1);
      }
      const startJuzIdx = (daysElapsed * reviewJuzAmount) % 30; // 0-29
      for (let i = 0; i < reviewJuzAmount; i++) {
        juzList.push(fullJuzList[(startJuzIdx + i) % 30]);
      }
    }

    if (juzList.length > 0) {
      if (juzList.length > 2) {
        const sortedJuzList = [...juzList].sort((a, b) => a - b);
        let isContiguous = true;
        for (let i = 1; i < sortedJuzList.length; i++) {
          if (sortedJuzList[i] !== sortedJuzList[i-1] + 1) {
            isContiguous = false;
            break;
          }
        }
        if (isContiguous) {
          reviewTitle = `مراجعة الجزء ${sortedJuzList[0]} إلى ${sortedJuzList[sortedJuzList.length - 1]}`;
        } else {
          reviewTitle = `مراجعة الأجزاء: ${juzList.join('، ')}`;
        }
      } else {
        reviewTitle = `مراجعة الأجزاء: ${juzList.join('، ')}`;
      }
    } else {
      reviewTitle = "مراجعة المحفوظ";
    }
  }

  if (reviewAmountType !== 'pages') {
    juzList.forEach(juz => {
      const range = JUZ_PAGES[juz];
      if (range) {
        for (let p = range.start; p <= range.end; p++) {
          if (isSpecific) {
            if (reviewPages.includes(p)) {
              reviewPagesToAssign.push(p);
            }
          } else {
            reviewPagesToAssign.push(p);
          }
        }
      }
    });
    
    if (reviewPagesToAssign.length > 0) {
      const juzRanges = getVerseRangesForJuzs(juzList);
      if (juzRanges.length > 0 && (!isSpecific || (track.selectedReviewJuzs && track.selectedReviewJuzs.length > 0))) {
        const minPage = Math.min(...reviewPagesToAssign);
        const maxPage = Math.max(...reviewPagesToAssign);
        const pageStr = minPage === maxPage ? `ص ${minPage}` : `ص ${minPage}-${maxPage}`;
        
        const first = juzRanges[0];
        const last = juzRanges[juzRanges.length - 1];
        const firstSurah = first.surah.replace("سورة ", "");
        const lastSurah = last.surah.replace("سورة ", "");
        const verseDesc = `${firstSurah}: الآية ${first.start} إلى ${lastSurah}: الآية ${last.end}`;
        
        reviewTitle += ` (${pageStr} (${verseDesc}))`;
      } else {
        const formattedPages = formatDetailedPages(reviewPagesToAssign, undefined, undefined, true, undefined, plan);
        reviewTitle += ` (${formattedPages})`;
      }
    }
  }

  return {
    id: trackIndex === 0 ? `rev-${format(targetDate, 'yyyyMMdd')}` : `rev-${format(targetDate, 'yyyyMMdd')}-${track.id || trackIndex}`,
    title: reviewTitle,
    type: TaskType.REVIEW,
    completed: false,
    targetCount: 1,
    currentCount: 0,
    pages: reviewPagesToAssign,
    trackIndex: trackIndex,
  };
};

const getReviewTasksForDate = (date: Date, plan: QuranPlan): Task[] => {
  const startDate = parsePlanDate(plan.startDate);
  const targetDate = startOfDay(date);
  if (targetDate < startDate) return [];

  const daysElapsed = differenceInCalendarDays(targetDate, startDate);

  const getFixationPrefix = (type: string) => {
    switch (type) {
      case 'juz': return 'جزء';
      case 'hizb': return 'حزب';
      case 'half_hizb': return ''; // Prevent duplication with "النصف الأول/الثاني"
      case 'quarter_hizb': return ''; // Prevent duplication with "الربع الأول/الثاني/الثالث/الرابع"
      case 'two_pages': return 'صفحتين';
      case 'page': return 'صفحة';
      default: return 'مقطع';
    }
  };

  const getQuartersPerDay = (type: string) => {
    switch (type) {
      case 'juz': return 8;
      case 'hizb': return 4;
      case 'half_hizb': return 2;
      case 'quarter_hizb': return 1;
      default: return 0; // Use pages instead
    }
  };

  const type = plan.fixationAmountType || 'hizb';
  const quartersPerDay = getQuartersPerDay(type);
  const totalQuranPages = 604;
  
  const fixationPages: number[] = [];
  let detailedQuarterLabel = "";
  let todayQuartersList: number[] = [];
  let todayQuartersToReview: typeof QURAN_QUARTERS = [];
  
  const isSpecific = !!(plan.isSpecificReview && plan.reviewPages && plan.reviewPages.length > 0);
  const reviewPages = isSpecific ? plan.reviewPages! : [];

  const isSpecificFix = !!(plan.isSpecificFixation && plan.fixationPages && plan.fixationPages.length > 0);
  const baseFixationPages = isSpecificFix ? plan.fixationPages! : (isSpecific ? reviewPages : []);
  const useSpecificFixationLogic = isSpecificFix || isSpecific;

  const includeFixation = plan.includeFixation !== false;

  if (includeFixation) {
    if (quartersPerDay > 0) {
      if (useSpecificFixationLogic) {
        const minFixPage = baseFixationPages.length > 0 ? Math.min(...baseFixationPages) : 1;
        let specificQuarters = QURAN_QUARTERS.filter(q => {
          if (q.startPage < minFixPage) return false;
          for (let p = q.startPage; p <= q.endPage; p++) {
            if (baseFixationPages.includes(p)) return true;
          }
          return false;
        });
        const targetJuzs = isSpecificFix ? plan.selectedFixationJuzs : plan.selectedReviewJuzs;
        if (targetJuzs && targetJuzs.length > 0) {
          const allowedQ = getQuartersForJuzs(targetJuzs);
          specificQuarters = specificQuarters.filter(q => allowedQ.includes(q.number));
        }

        const totalQuarters = specificQuarters.length;
        if (totalQuarters > 0) {
          const startQIdx = daysElapsed * quartersPerDay;
          if (startQIdx >= totalQuarters) return []; // Plan ends
          
          const endQIdx = Math.min(startQIdx + quartersPerDay, totalQuarters);
          const quartersToReview = specificQuarters.slice(startQIdx, endQIdx);
          todayQuartersToReview = quartersToReview;
          todayQuartersList = quartersToReview.map(q => q.number);
          
          const firstQuarter = quartersToReview[0];
          const lastQuarter = quartersToReview[quartersToReview.length - 1];
          
          for (let p = firstQuarter.startPage; p <= lastQuarter.endPage; p++) {
            if (baseFixationPages.includes(p) && !fixationPages.includes(p)) {
              fixationPages.push(p);
            }
          }
          
          const qNum = firstQuarter.number;
          if (type === 'hizb') {
             const hizbNum = Math.floor((qNum - 1) / 4) + 1;
             detailedQuarterLabel = ` ${hizbNum}`;
          } else if (type === 'quarter_hizb') {
             const quarterNames = ["الأول", "الثاني", "الثالث", "الرابع"];
             const qName = quarterNames[(qNum - 1) % 4];
             const hizbNum = Math.floor((qNum - 1) / 4) + 1;
             detailedQuarterLabel = ` الربع ${qName} من الحزب ${hizbNum}`;
          } else if (type === 'half_hizb') {
             const halfNames = ["النصف الأول", "النصف الثاني"];
             const hName = halfNames[Math.floor(((qNum - 1) % 4) / 2)];
             const hizbNum = Math.floor((qNum - 1) / 4) + 1;
             detailedQuarterLabel = ` ${hName} من الحزب ${hizbNum}`;
          } else if (type === 'juz') {
             const juzNum = Math.floor((qNum - 1) / 8) + 1;
             detailedQuarterLabel = ` ${juzNum}`;
          }
        }
      } else {
        const totalQuarters = 240;
        const startQIdx = daysElapsed * quartersPerDay;
        if (startQIdx >= totalQuarters) return []; // Plan ends
        
        const endQIdx = Math.min(startQIdx + quartersPerDay, totalQuarters);
        const quartersToReview = QURAN_QUARTERS.slice(startQIdx, endQIdx);
        todayQuartersToReview = quartersToReview;
        todayQuartersList = quartersToReview.map(q => q.number);
        
        // Determine exact pages
        const firstQuarter = quartersToReview[0];
        const lastQuarter = quartersToReview[quartersToReview.length - 1];
        
        for (let p = Math.max(2, firstQuarter.startPage); p <= lastQuarter.endPage && p <= 604; p++) {
          if (!fixationPages.includes(p)) fixationPages.push(p);
        }
        
        const qNum = firstQuarter.number;
        if (type === 'hizb') {
           const hizbNum = Math.floor((qNum - 1) / 4) + 1;
           detailedQuarterLabel = ` ${hizbNum}`;
        } else if (type === 'quarter_hizb') {
           const quarterNames = ["الأول", "الثاني", "الثالث", "الرابع"];
           const qName = quarterNames[(qNum - 1) % 4];
           const hizbNum = Math.floor((qNum - 1) / 4) + 1;
           detailedQuarterLabel = ` الربع ${qName} من الحزب ${hizbNum}`;
        } else if (type === 'half_hizb') {
           const halfNames = ["النصف الأول", "النصف الثاني"];
           const hName = halfNames[Math.floor(((qNum - 1) % 4) / 2)];
           const hizbNum = Math.floor((qNum - 1) / 4) + 1;
           detailedQuarterLabel = ` ${hName} من الحزب ${hizbNum}`;
        } else if (type === 'juz') {
           const juzNum = Math.floor((qNum - 1) / 8) + 1;
           detailedQuarterLabel = ` ${juzNum}`;
        }
      }
    } else {
      // For exact page amounts
      let pagesPerDay = 1;
      if (type === 'two_pages') pagesPerDay = 2;
      
      if (useSpecificFixationLogic) {
        const totalPages = baseFixationPages.length;
        const startIdx = daysElapsed * pagesPerDay;
        if (startIdx >= totalPages) return [];
        
        const endIdx = Math.min(startIdx + pagesPerDay, totalPages);
        for (let i = Math.floor(startIdx); i < Math.ceil(endIdx) && i < totalPages; i++) {
          fixationPages.push(baseFixationPages[i]);
        }
      } else {
        const startIdx = daysElapsed * pagesPerDay;
        const totalPagesForFixation = 603; // page 2 to 604
        if (startIdx >= totalPagesForFixation) return [];
        
        const endIdx = Math.min(startIdx + pagesPerDay, totalPagesForFixation);
        for (let i = Math.floor(startIdx); i < Math.ceil(endIdx) && i < totalPagesForFixation; i++) {
          fixationPages.push(i + 2); // Start from page 2
        }
      }
    }
  }

  const tracksToUse: ReviewTrack[] = plan.reviewTracks && plan.reviewTracks.length > 0
    ? plan.reviewTracks
    : [{
        id: 'main',
        reviewRangeMode: plan.reviewRangeMode || 'full',
        reviewStartPage: plan.reviewStartPage,
        reviewEndPage: plan.reviewEndPage,
        selectedReviewJuzs: plan.selectedReviewJuzs,
        selectedReviewSurahs: plan.selectedReviewSurahs,
        reviewPages: isSpecific ? reviewPages : undefined,
        reviewAmountType: plan.reviewAmountType || 'juz',
        reviewJuzAmount: plan.reviewJuzAmount,
        reviewPageAmount: plan.reviewPageAmount,
        startJuz: plan.startJuz,
      }];

  const tasks: Task[] = [];
  tracksToUse.forEach((track, index) => {
    const task = generateReviewTaskForTrack(track, index, daysElapsed, targetDate, plan);
    if (task) {
      tasks.push(task);
    }
  });

  const fixationPrefix = getFixationPrefix(plan.fixationAmountType || 'hizb');
  
  let fixationDetailedText = "";
  if (quartersPerDay > 0 && fixationPages.length > 0) {
    const quartersToReview = todayQuartersToReview;

    if (quartersToReview.length > 0) {
      const firstQuarter = quartersToReview[0];
      const lastQuarter = quartersToReview[quartersToReview.length - 1];
      const firstQIdx = QURAN_QUARTERS.findIndex(q => q.number === firstQuarter.number);
      const lastQIdx = QURAN_QUARTERS.findIndex(q => q.number === lastQuarter.number);
      
      const startSurah = firstQuarter.surahName.replace("سُورَةُ ", "").replace("سورة ", "");
      const startVerse = firstQuarter.ayah;
      
      const getQuarterEnd = (qIdx: number) => {
        if (qIdx >= 239) {
          return { surahName: "الناس", surahNum: 114, ayah: 6 };
        }
        const nextQ = QURAN_QUARTERS[qIdx + 1];
        const currQ = QURAN_QUARTERS[qIdx];
        if (nextQ.surahNum === currQ.surahNum) {
          return { surahName: currQ.surahName, surahNum: currQ.surahNum, ayah: nextQ.ayah - 1 };
        } else {
          if (nextQ.ayah > 1) {
            return { surahName: nextQ.surahName, surahNum: nextQ.surahNum, ayah: nextQ.ayah - 1 };
          } else {
            const endSurahNum = nextQ.surahNum - 1;
            const endSurahMeta = SURAH_METADATAList[endSurahNum - 1];
            return { 
              surahName: endSurahMeta ? endSurahMeta.name : `سورة ${endSurahNum}`, 
              surahNum: endSurahNum, 
              ayah: endSurahMeta ? endSurahMeta.endVerse : 1 
            };
          }
        }
      };
      
      const endQ = getQuarterEnd(lastQIdx);
      const endSurah = endQ.surahName.replace("سُورَةُ ", "").replace("سورة ", "");
      const endVerse = endQ.ayah;
      
      const minPage = Math.min(...fixationPages);
      const maxPage = Math.max(...fixationPages);
      const pageStr = minPage === maxPage ? `ص ${minPage}` : `ص ${minPage}-${maxPage}`;
      
      const theologicalDesc = `${startSurah}: الآية ${startVerse} إلى ${endSurah}: الآية ${endVerse}`;
        
      fixationDetailedText = `${pageStr} (${theologicalDesc})`;
    } else {
      fixationDetailedText = fixationPages.length > 0 ? formatDetailedPages(fixationPages, undefined, undefined, true, undefined, plan) : "";
    }
  } else {
    fixationDetailedText = fixationPages.length > 0 ? formatDetailedPages(fixationPages, undefined, undefined, true, undefined, plan) : "";
  }

  const fixationTaskTitle = `تثبيت ${fixationPrefix}${detailedQuarterLabel} ${fixationDetailedText}`;

  if (plan.fixationRepetitionMode === 'page_by_page') {
    fixationPages.forEach((page) => {
      const allParts = getSplitPartsForPage(page);
      
      if (allParts.length <= 1) {
        const pageText = formatDetailedPages([page], undefined, undefined, false, undefined, plan);
        if (plan.includeFixation !== false) {
          tasks.push({
            id: `fix-${format(targetDate, 'yyyyMMdd')}-p${page}`,
            title: `تثبيت ${pageText}`,
            type: TaskType.FIXATION,
            completed: false,
            targetCount: plan.fixationRepetitions || 4,
            currentCount: 0,
            pages: [page],
          });
        }
        if (plan.includeRecitation) {
          tasks.push({
            id: `rec-${format(targetDate, 'yyyyMMdd')}-p${page}`,
            title: `تسميع التثبيت صفحة ${page}`,
            type: TaskType.RECITATION,
            completed: false,
            targetCount: 1,
            currentCount: 0,
            pages: [page],
          });
        }
        if (plan.includeListening) {
          tasks.push({
            id: `lis-${format(targetDate, 'yyyyMMdd')}-p${page}`,
            title: `استماع صفحة ${page}`,
            type: TaskType.LISTENING,
            completed: false,
            targetCount: 1,
            currentCount: 0,
            pages: [page],
          });
        }
      } else {
        // Page has splits! Let's only fetch active parts for today
        const activeParts = getSplitPartsForPage(page, todayQuartersList);
        activeParts.forEach((part) => {
          const originalIndex = allParts.findIndex(ap => 
            ap.length === part.length && 
            ap[0].surah === part[0].surah && 
            ap[0].start === part[0].start
          );
          const partIndex = originalIndex >= 0 ? originalIndex : 0;
          const desc = formatVerseDescForTitle(part);
          const titleSuffix = ` (${desc})`;
          
          if (plan.includeFixation !== false) {
            tasks.push({
              id: `fix-${format(targetDate, 'yyyyMMdd')}-p${page}-part${partIndex}`,
              title: `تثبيت صفحة ${page}${titleSuffix}`,
              type: TaskType.FIXATION,
              completed: false,
              targetCount: plan.fixationRepetitions || 4,
              currentCount: 0,
              pages: [page],
            });
          }
          if (plan.includeRecitation) {
            tasks.push({
              id: `rec-${format(targetDate, 'yyyyMMdd')}-p${page}-part${partIndex}`,
              title: `تسميع تثبيت صفحة ${page}${titleSuffix}`,
              type: TaskType.RECITATION,
              completed: false,
              targetCount: 1,
              currentCount: 0,
              pages: [page],
            });
          }
          if (plan.includeListening) {
            tasks.push({
              id: `lis-${format(targetDate, 'yyyyMMdd')}-p${page}-part${partIndex}`,
              title: `استماع صفحة ${page}${titleSuffix}`,
              type: TaskType.LISTENING,
              completed: false,
              targetCount: 1,
              currentCount: 0,
              pages: [page],
            });
          }
        });
      }
    });
  } else {
    if (plan.includeFixation !== false) {
      tasks.push({
        id: `fix-${format(targetDate, 'yyyyMMdd')}`,
        title: fixationTaskTitle,
        type: TaskType.FIXATION,
        completed: false,
        targetCount: plan.fixationRepetitions || 4,
        currentCount: 0,
        pages: fixationPages,
      });
    }

    if (plan.includeRecitation) {
      tasks.push({
        id: `rec-${format(targetDate, 'yyyyMMdd')}`,
        title: `تسميع تثبيت ${fixationPrefix}${detailedQuarterLabel} ${fixationDetailedText}`,
        type: TaskType.RECITATION,
        completed: false,
        targetCount: 1,
        currentCount: 0,
        pages: fixationPages,
      });
    }
    
    if (plan.includeListening) {
      tasks.push({
        id: `lis-${format(targetDate, 'yyyyMMdd')}`,
        title: `استماع تثبيت ${fixationPrefix}${detailedQuarterLabel} ${fixationDetailedText}`,
        type: TaskType.LISTENING,
        completed: false,
        targetCount: 1,
        currentCount: 0,
        pages: fixationPages,
      });
    }
  }

  return tasks;
};

const getFlexibleTasksForDate = (date: Date, plan: QuranPlan, allLogs: ProgressLog[]): Task[] => {
  const startDate = parsePlanDate(plan.startDate);
  const targetDate = startOfDay(date);
  
  if (targetDate < startDate) return [];

  // Determine if there is a duration limit
  let hasDurationLimit = false;
  let lastDayOfPlan: Date | null = null;

  if (plan.flexibleDurationMode === 'weeks' && plan.flexibleDurationWeeks) {
    const totalDays = plan.flexibleDurationWeeks * 7;
    lastDayOfPlan = startOfDay(addDays(startDate, totalDays - 1));
    hasDurationLimit = true;
  } else if (plan.flexibleDurationMode === 'range' && plan.flexibleEndDate) {
    lastDayOfPlan = parsePlanDate(plan.flexibleEndDate);
    hasDurationLimit = true;
  }

  // If there is a limit and targetDate is after the limit, return empty (no tasks)
  if (hasDurationLimit && lastDayOfPlan && isAfter(targetDate, lastDayOfPlan)) {
    return [];
  }

  const startPage = Number(plan.startPage);
  const endPage = Number(plan.endPage);

  let pagesPerDay = 1;
  if (plan.dailyAmount === DailyAmount.QUARTER_PAGE) pagesPerDay = 0.25;
  if (plan.dailyAmount === DailyAmount.HALF_PAGE) pagesPerDay = 0.5;
  if (plan.dailyAmount === DailyAmount.TWO_PAGES) pagesPerDay = 2;
    if (plan.dailyAmount === DailyAmount.QUARTER_HIZB) pagesPerDay = 2.5;
  if (plan.dailyAmount === DailyAmount.THREE_PAGES) pagesPerDay = 3;
  if (plan.dailyAmount === DailyAmount.FOUR_PAGES) pagesPerDay = 4;
  if (plan.dailyAmount === DailyAmount.FIVE_PAGES) pagesPerDay = 5;

  let rawPages: number[] = plan.memorizationTargetPages || [];
  const isDescending = !!plan.isSevenCastlesDescending || (startPage > endPage);
  if (rawPages.length === 0) {
    if (isDescending) {
      for (let p = startPage; p >= endPage; p--) {
        rawPages.push(p);
      }
    } else {
      for (let p = startPage; p <= endPage; p++) {
        rawPages.push(p);
      }
    }
  }
  
  const units = getMemorizationUnits(rawPages, pagesPerDay, plan);

  let currentUnitIndex = 0;
  let currentLogDate = new Date(startDate);
  
  const weekTasksByDay: Record<number, number[]> = {}; 
  const weekUnitsByDay: Record<number, MemorizationUnit[]> = {};
  const allMemorizedUnits: MemorizationUnit[] = [];

  const flexibleDayConfigs = plan.flexibleDayConfigs || {};

  // We need to keep a variable to track if we have finished all memorizing units.
  // Once finished, we don't assign any more new memorization.
  let memorizationFinishedDate: Date | null = null;

  while (!isAfter(currentLogDate, targetDate)) {
    const realD = getDay(currentLogDate);
    const d = (realD - (plan.firstDayOfWeek || 0) + 7) % 7;
    const config = flexibleDayConfigs[realD] || { 
      hasMemorization: true, 
      hasFixation: true, 
      hasReview: true, 
      hasCumulativeReview: true, 
      hasOldMemorizationReview: true 
    };
    
    // New Memorization logic inside the loop
    let pagesTodaySet = new Set<number>();
    let unitsToday: MemorizationUnit[] = [];

    // Only allow new memorization if we haven't reached the end of the duration (if limited)
    const isWithinDuration = !hasDurationLimit || !lastDayOfPlan || !isAfter(currentLogDate, lastDayOfPlan);

    if ([0, 1, 2, 3, 4].includes(d) && isWithinDuration && config.hasMemorization) {
      if (currentUnitIndex < units.length) {
        let accumulatedWeight = 0;
        while (currentUnitIndex < units.length && accumulatedWeight < pagesPerDay) {
          const u = units[currentUnitIndex];
          unitsToday.push(u);
          u.pages.forEach(p => pagesTodaySet.add(p));
          accumulatedWeight += u.weight;
          currentUnitIndex++;
        }
        
        const pagesToday = [...pagesTodaySet].sort((a, b) => (isDescending ? b - a : a - b));
        
        if (pagesToday.length > 0) {
          weekTasksByDay[d] = pagesToday;
          weekUnitsByDay[d] = unitsToday;
          allMemorizedUnits.push(...unitsToday);
        }

        if (currentUnitIndex >= units.length && !memorizationFinishedDate) {
          memorizationFinishedDate = new Date(currentLogDate);
        }
      }
    }

    if (targetDate.getTime() === currentLogDate.getTime()) {
      const tasks: Task[] = [];
      const pagesToday = weekTasksByDay[d] || [];
      const unitsToday = weekUnitsByDay[d] || [];
      const detailedText = unitsToday.length > 0 ? formatUnitsTitle(unitsToday) : "";

      // Gather current week units up to today for exclusion
      const currentWeekUnits: MemorizationUnit[] = [];
      for (let pd = 0; pd < 7; pd++) {
        if (weekUnitsByDay[pd]) {
          currentWeekUnits.push(...weekUnitsByDay[pd]);
        }
      }
      // Past weeks are everything memorized BEFORE this relative week
      const pastWeeksUnits = allMemorizedUnits.filter(u => !currentWeekUnits.includes(u));
      const pastWeeksPages = [...new Set(pastWeeksUnits.flatMap(u => u.pages))].sort((a, b) => (isDescending ? b - a : a - b));

      if (d === 0) {
        // اليوم الأول:( استماع، حفظ جديد ، تثبيت، تسميع)
        if (pagesToday.length > 0) {
          tasks.push({
            id: `lis-${format(targetDate, 'yyyyMMdd')}`,
            title: `استماع: ${detailedText}`,
            type: TaskType.LISTENING,
            completed: false,
            targetCount: 1,
            currentCount: 0,
            pages: pagesToday
          });
          tasks.push({
            id: `mem-${format(targetDate, 'yyyyMMdd')}`,
            title: `حفظ جديد: ${detailedText}`,
            type: TaskType.MEMORIZATION,
            completed: false,
            targetCount: 1,
            currentCount: 0,
            pages: pagesToday
          });
          tasks.push({
            id: `fix-${format(targetDate, 'yyyyMMdd')}`,
            title: `تثبيت ${detailedText}`,
            type: TaskType.FIXATION,
            completed: false,
            targetCount: plan.dailyFixationRepetitions || plan.fixationRepetitions || 5,
            currentCount: 0,
            pages: pagesToday
          });
          tasks.push({
            id: `rec-${format(targetDate, 'yyyyMMdd')}`,
            title: `تسميع ${detailedText}`,
            type: TaskType.RECITATION,
            completed: false,
            targetCount: 1,
            currentCount: 0,
            pages: pagesToday
          });
        }
      } 
      else if (d === 1) {
        // اليوم الثاني : (استماع، حفظ جديد ، تثبيت) + مراجعة لمحفوظ اليوم الأول + تسميع لمحفوظ اليوم السابق من الأسبوع الحالي واليوم الحالي + مراجة التراكمي غيبا
        if (pagesToday.length > 0) {
          tasks.push({
            id: `lis-${format(targetDate, 'yyyyMMdd')}`,
            title: `استماع: ${detailedText}`,
            type: TaskType.LISTENING,
            completed: false,
            targetCount: 1,
            currentCount: 0,
            pages: pagesToday
          });
          tasks.push({
            id: `mem-${format(targetDate, 'yyyyMMdd')}`,
            title: `حفظ جديد: ${detailedText}`,
            type: TaskType.MEMORIZATION,
            completed: false,
            targetCount: 1,
            currentCount: 0,
            pages: pagesToday
          });
          tasks.push({
            id: `fix-${format(targetDate, 'yyyyMMdd')}`,
            title: `تثبيت ${detailedText}`,
            type: TaskType.FIXATION,
            completed: false,
            targetCount: plan.dailyFixationRepetitions || plan.fixationRepetitions || 5,
            currentCount: 0,
            pages: pagesToday
          });
        }

        // مراجعة لمحفوظ اليوم الأول
        const pages0 = weekTasksByDay[0] || [];
        const units0 = weekUnitsByDay[0] || [];
        if (pages0.length > 0) {
          tasks.push({
            id: `rev-d1-${format(targetDate, 'yyyyMMdd')}`,
            title: `مراجعة ${formatUnitsTitle(units0)}`,
            type: TaskType.REVIEW,
            completed: false,
            targetCount: 1,
            currentCount: 0,
            pages: pages0
          });
        }

        // تسميع لمحفوظ اليوم السابق من الأسبوع الحالي واليوم الحالي
        const combinedPages = [...new Set([...pages0, ...pagesToday])].sort((a, b) => (isDescending ? b - a : a - b));
        const combinedUnits = [...units0, ...unitsToday];
        if (combinedPages.length > 0) {
          tasks.push({
            id: `rec-d1d2-${format(targetDate, 'yyyyMMdd')}`,
            title: `تسميع ${formatUnitsTitle(combinedUnits)}`,
            type: TaskType.RECITATION,
            completed: false,
            targetCount: 1,
            currentCount: 0,
            pages: combinedPages
          });
        }

        // مراجعة التراكمي غيباً
        if (pastWeeksPages.length > 0) {
          tasks.push({
            id: `rev-cum-prev-${format(targetDate, 'yyyyMMdd')}`,
            title: `مراجعة التراكمي غيباً (${formatDetailedPages(pastWeeksPages, undefined, undefined, true)})`,
            type: TaskType.CUMULATIVE_REVIEW,
            completed: false,
            targetCount: 1,
            currentCount: 0,
            pages: pastWeeksPages
          });
        }
      } 
      else if (d === 2) {
        // اليوم الثالث:(استماع، حفظ جديد ، تثبيت)+ مراجعة لمحفوظ اليوم الأول والثاني+ تسميع لمحفوظ اليومين السابقين من الأسبوع الحالي واليوم الحالي
        if (pagesToday.length > 0) {
          tasks.push({
            id: `lis-${format(targetDate, 'yyyyMMdd')}`,
            title: `استماع: ${detailedText}`,
            type: TaskType.LISTENING,
            completed: false,
            targetCount: 1,
            currentCount: 0,
            pages: pagesToday
          });
          tasks.push({
            id: `mem-${format(targetDate, 'yyyyMMdd')}`,
            title: `حفظ جديد: ${detailedText}`,
            type: TaskType.MEMORIZATION,
            completed: false,
            targetCount: 1,
            currentCount: 0,
            pages: pagesToday
          });
          tasks.push({
            id: `fix-${format(targetDate, 'yyyyMMdd')}`,
            title: `تثبيت ${detailedText}`,
            type: TaskType.FIXATION,
            completed: false,
            targetCount: plan.dailyFixationRepetitions || plan.fixationRepetitions || 5,
            currentCount: 0,
            pages: pagesToday
          });
        }

        // مراجعة لمحفوظ اليوم الأول والثاني
        const pages0 = weekTasksByDay[0] || [];
        const units0 = weekUnitsByDay[0] || [];
        const pages1 = weekTasksByDay[1] || [];
        const units1 = weekUnitsByDay[1] || [];
        const combinedPages = [...new Set([...pages0, ...pages1])].sort((a, b) => (isDescending ? b - a : a - b));
        const combinedUnits = [...units0, ...units1];
        if (combinedPages.length > 0) {
          tasks.push({
            id: `rev-d1d2-${format(targetDate, 'yyyyMMdd')}`,
            title: `مراجعة ${formatUnitsTitle(combinedUnits)}`,
            type: TaskType.REVIEW,
            completed: false,
            targetCount: 1,
            currentCount: 0,
            pages: combinedPages
          });
        }

        // تسميع لمحفوظ اليومين السابقين من الأسبوع الحالي واليوم الحالي
        const combinedPagesAll = [...new Set([...pages0, ...pages1, ...pagesToday])].sort((a, b) => (isDescending ? b - a : a - b));
        const combinedUnitsAll = [...units0, ...units1, ...unitsToday];
        if (combinedPagesAll.length > 0) {
          tasks.push({
            id: `rec-d1to3-${format(targetDate, 'yyyyMMdd')}`,
            title: `تسميع ${formatUnitsTitle(combinedUnitsAll)}`,
            type: TaskType.RECITATION,
            completed: false,
            targetCount: 1,
            currentCount: 0,
            pages: combinedPagesAll
          });
        }
      } 
      else if (d === 3) {
        // اليوم الرابع: (استماع، حفظ جديد ، تثبيت) + مراجعة لمحفوظ اليوم الأول إلى الثالث + تسميع لمحفوظ الثلاثة الأيام السابقة من الأسبوع الحالي واليوم الحالي + مراجة التراكمي غيبا
        if (pagesToday.length > 0) {
          tasks.push({
            id: `lis-${format(targetDate, 'yyyyMMdd')}`,
            title: `استماع: ${detailedText}`,
            type: TaskType.LISTENING,
            completed: false,
            targetCount: 1,
            currentCount: 0,
            pages: pagesToday
          });
          tasks.push({
            id: `mem-${format(targetDate, 'yyyyMMdd')}`,
            title: `حفظ جديد: ${detailedText}`,
            type: TaskType.MEMORIZATION,
            completed: false,
            targetCount: 1,
            currentCount: 0,
            pages: pagesToday
          });
          tasks.push({
            id: `fix-${format(targetDate, 'yyyyMMdd')}`,
            title: `تثبيت ${detailedText}`,
            type: TaskType.FIXATION,
            completed: false,
            targetCount: plan.dailyFixationRepetitions || plan.fixationRepetitions || 5,
            currentCount: 0,
            pages: pagesToday
          });
        }

        // مراجعة لمحفوظ اليوم الأول إلى الثالث
        const pages0 = weekTasksByDay[0] || [];
        const units0 = weekUnitsByDay[0] || [];
        const pages1 = weekTasksByDay[1] || [];
        const units1 = weekUnitsByDay[1] || [];
        const pages2 = weekTasksByDay[2] || [];
        const units2 = weekUnitsByDay[2] || [];
        const combinedPages = [...new Set([...pages0, ...pages1, ...pages2])].sort((a, b) => (isDescending ? b - a : a - b));
        const combinedUnits = [...units0, ...units1, ...units2];
        if (combinedPages.length > 0) {
          tasks.push({
            id: `rev-d1to3-${format(targetDate, 'yyyyMMdd')}`,
            title: `مراجعة ${formatUnitsTitle(combinedUnits)}`,
            type: TaskType.REVIEW,
            completed: false,
            targetCount: 1,
            currentCount: 0,
            pages: combinedPages
          });
        }

        // تسميع لمحفوظ الثلاثة الأيام السابقة من الأسبوع الحالي واليوم الحالي
        const combinedPagesAll = [...new Set([...pages0, ...pages1, ...pages2, ...pagesToday])].sort((a, b) => (isDescending ? b - a : a - b));
        const combinedUnitsAll = [...units0, ...units1, ...units2, ...unitsToday];
        if (combinedPagesAll.length > 0) {
          tasks.push({
            id: `rec-d1to4-${format(targetDate, 'yyyyMMdd')}`,
            title: `تسميع ${formatUnitsTitle(combinedUnitsAll)}`,
            type: TaskType.RECITATION,
            completed: false,
            targetCount: 1,
            currentCount: 0,
            pages: combinedPagesAll
          });
        }

        // مراجعة التراكمي غيباً
        if (pastWeeksPages.length > 0) {
          tasks.push({
            id: `rev-cum-prev-${format(targetDate, 'yyyyMMdd')}`,
            title: `مراجعة التراكمي غيباً (${formatDetailedPages(pastWeeksPages, undefined, undefined, true)})`,
            type: TaskType.CUMULATIVE_REVIEW,
            completed: false,
            targetCount: 1,
            currentCount: 0,
            pages: pastWeeksPages
          });
        }
      } 
      else if (d === 4) {
        // اليوم الخامس:(استماع، حفظ جديد ، تثبيت)+ مراجعة لمحفوظ اليوم الأول إلى الرابع+ تسميع لمحفوظ الأربعة الأيام السابقة من الأسبوع الحالي واليوم الحالي
        if (pagesToday.length > 0) {
          tasks.push({
            id: `lis-${format(targetDate, 'yyyyMMdd')}`,
            title: `استماع: ${detailedText}`,
            type: TaskType.LISTENING,
            completed: false,
            targetCount: 1,
            currentCount: 0,
            pages: pagesToday
          });
          tasks.push({
            id: `mem-${format(targetDate, 'yyyyMMdd')}`,
            title: `حفظ جديد: ${detailedText}`,
            type: TaskType.MEMORIZATION,
            completed: false,
            targetCount: 1,
            currentCount: 0,
            pages: pagesToday
          });
          tasks.push({
            id: `fix-${format(targetDate, 'yyyyMMdd')}`,
            title: `تثبيت ${detailedText}`,
            type: TaskType.FIXATION,
            completed: false,
            targetCount: plan.dailyFixationRepetitions || plan.fixationRepetitions || 5,
            currentCount: 0,
            pages: pagesToday
          });
        }

        // مراجعة لمحفوظ اليوم الأول إلى الرابع
        const pages0 = weekTasksByDay[0] || [];
        const units0 = weekUnitsByDay[0] || [];
        const pages1 = weekTasksByDay[1] || [];
        const units1 = weekUnitsByDay[1] || [];
        const pages2 = weekTasksByDay[2] || [];
        const units2 = weekUnitsByDay[2] || [];
        const pages3 = weekTasksByDay[3] || [];
        const units3 = weekUnitsByDay[3] || [];
        const combinedPages = [...new Set([...pages0, ...pages1, ...pages2, ...pages3])].sort((a, b) => (isDescending ? b - a : a - b));
        const combinedUnits = [...units0, ...units1, ...units2, ...units3];
        if (combinedPages.length > 0) {
          tasks.push({
            id: `rev-d1to4-${format(targetDate, 'yyyyMMdd')}`,
            title: `مراجعة ${formatUnitsTitle(combinedUnits)}`,
            type: TaskType.REVIEW,
            completed: false,
            targetCount: 1,
            currentCount: 0,
            pages: combinedPages
          });
        }

        // تسميع لمحفوظ الأربعة الأيام السابقة من الأسبوع الحالي واليوم الحالي
        const combinedPagesAll = [...new Set([...pages0, ...pages1, ...pages2, ...pages3, ...pagesToday])].sort((a, b) => (isDescending ? b - a : a - b));
        const combinedUnitsAll = [...units0, ...units1, ...units2, ...units3, ...unitsToday];
        if (combinedPagesAll.length > 0) {
          tasks.push({
            id: `rec-d1to5-${format(targetDate, 'yyyyMMdd')}`,
            title: `تسميع ${formatUnitsTitle(combinedUnitsAll)}`,
            type: TaskType.RECITATION,
            completed: false,
            targetCount: 1,
            currentCount: 0,
            pages: combinedPagesAll
          });
        }
      } 
      else if (d === 5) {
        // اليوم السادس : مراجعة لمحفوظ الأسبوع الحالي (الخمس الأيام السابقة ) مكررة
        const weekUnitsAll = [];
        for (let pd = 0; pd < 5; pd++) {
          if (weekUnitsByDay[pd]) {
            weekUnitsAll.push(...weekUnitsByDay[pd]);
          }
        }
        const weekPages = [...new Set(weekUnitsAll.flatMap(u => u.pages))].sort((a, b) => (isDescending ? b - a : a - b));
        const weekDetailedText = weekUnitsAll.length > 0 ? formatUnitsTitle(weekUnitsAll) : "";
        if (weekPages.length > 0) {
          tasks.push({
            id: `rev-week-${format(targetDate, 'yyyyMMdd')}`,
            title: `مراجعة مكررة: ${weekDetailedText}`,
            type: TaskType.REVIEW,
            completed: false,
            targetCount: plan.weeklyReviewRepetitions || plan.fixationRepetitions || 3,
            currentCount: 0,
            pages: weekPages
          });
        }
      } 
      else if (d === 6) {
        // اليوم السابع:( مراجعة للمحفوظ التراكمي للأسبوع الحالي والأسابيع السابقة مكررة ، تسميع)
        const allPages = [...new Set(allMemorizedUnits.flatMap(u => u.pages))].sort((a, b) => (isDescending ? b - a : a - b));
        const cumDetailedText = allMemorizedUnits.length > 0 ? formatUnitsTitle(allMemorizedUnits) : "";
        if (allPages.length > 0) {
          tasks.push({
            id: `rev-cum-${format(targetDate, 'yyyyMMdd')}`,
            title: `مراجعة مكررة: ${cumDetailedText}`,
            type: TaskType.CUMULATIVE_REVIEW,
            completed: false,
            targetCount: plan.cumulativeReviewRepetitions || plan.fixationRepetitions || 3,
            currentCount: 0,
            pages: allPages
          });
          tasks.push({
            id: `rec-cum-${format(targetDate, 'yyyyMMdd')}`,
            title: `تسميع ${cumDetailedText}`,
            type: TaskType.RECITATION,
            completed: false,
            targetCount: 1,
            currentCount: 0,
            pages: allPages
          });
        }
      }

      return tasks;
    }

    // Clear week context if it's the end of the logical week (e.g. day 6 in the relative week)
    if (d === 6) {
      for(let key in weekTasksByDay) delete weekTasksByDay[key];
      for(let key in weekUnitsByDay) delete weekUnitsByDay[key];
    }

    currentLogDate = addDays(currentLogDate, 1);
    
    // Termination logic:
    if (!hasDurationLimit && currentUnitIndex >= units.length && isAfter(currentLogDate, memorizationFinishedDate || currentLogDate)) {
      break;
    }
    
    if (currentLogDate.getTime() > addDays(targetDate, 1).getTime()) break; // Safety break
  }

  return [];
};

const getActiveCumulativePages = (targetPages: number[], plan: QuranPlan, targetDate: Date): number[] => {
  if (plan.isSevenCastles || plan.planType !== 'memorization') return targetPages;
  const completedInCurrentPlan = getCompletedPagesInPlanBeforeDate(targetDate, plan);
  const count = completedInCurrentPlan.length;
  const numToTransfer = Math.floor(count / 20) * 20;
  if (numToTransfer === 0) return targetPages;
  
  const oldPagesBatch = new Set(completedInCurrentPlan.slice(0, numToTransfer));
  return targetPages.filter(p => !oldPagesBatch.has(p));
};

const getTasksForDateBaseNew = (date: Date, plan: QuranPlan, allLogs: ProgressLog[]): Task[] => {
  if (plan.isFlexible) {
    return getFlexibleTasksForDate(date, plan, allLogs);
  }
  if (plan.isSevenCastles) {
    return getSevenCastlesTasksForDate(date, plan);
  }
  if (plan.planType === 'review') {
    return getReviewTasksForDate(date, plan);
  }

  const startDate = parsePlanDate(plan.startDate);
  const targetDate = startOfDay(date);
  
  if (targetDate < startDate) return [];

  // SAFELY COERCE SYSTEM INPUT STRINGS TO NUMBERS (Crucial to prevent "+" string concatenation creating e.g. "1820" and causing "Al-Baqarah" fallbacks!)
  const startPage = Number(plan.startPage);
  const endPage = Number(plan.endPage);

  const dayOfWeek = getDay(targetDate); // 0 (Sun) to 6 (Sat)
  let pagesPerDay = 1;
  if (plan.dailyAmount === DailyAmount.QUARTER_PAGE) pagesPerDay = 0.25;
  if (plan.dailyAmount === DailyAmount.HALF_PAGE) pagesPerDay = 0.5;
  if (plan.dailyAmount === DailyAmount.TWO_PAGES) pagesPerDay = 2;
    if (plan.dailyAmount === DailyAmount.QUARTER_HIZB) pagesPerDay = 2.5;
  if (plan.dailyAmount === DailyAmount.THREE_PAGES) pagesPerDay = 3;
  if (plan.dailyAmount === DailyAmount.FOUR_PAGES) pagesPerDay = 4;
  if (plan.dailyAmount === DailyAmount.FIVE_PAGES) pagesPerDay = 5;

  // Let's generate units once
  let rawPages: number[] = plan.memorizationTargetPages || [];
  if (rawPages.length === 0) {
    for (let p = startPage; p <= endPage; p++) {
      rawPages.push(p);
    }
  }
  const units = getMemorizationUnits(rawPages, pagesPerDay, plan);

  let currentUnitIndex = 0;
  let currentLogDate = new Date(startDate);
  
  const weekTasksByDay: Record<number, number[]> = {}; // Map of week day to pages assigned
  const weekUnitsByDay: Record<number, MemorizationUnit[]> = {}; // Map of week day to units assigned
  const allMemorizedUnits: MemorizationUnit[] = [];

  // Iterate from startDate to targetDate to find the pages for THIS day
  while (!isAfter(currentLogDate, targetDate)) {
    const realD = getDay(currentLogDate);
    const d = (realD - (plan.firstDayOfWeek || 0) + 7) % 7;
    
    // New Memorization logic (Days 1-5: 0, 1, 2, 3, 4)
    let pagesTodaySet = new Set<number>();
    let unitsToday: MemorizationUnit[] = [];

    if ([0, 1, 2, 3, 4].includes(d)) {
      if (currentUnitIndex < units.length) {
        let accumulatedWeight = 0;
        
        while (currentUnitIndex < units.length && accumulatedWeight < pagesPerDay) {
          const u = units[currentUnitIndex];
          unitsToday.push(u);
          u.pages.forEach(p => pagesTodaySet.add(p));
          accumulatedWeight += u.weight;
          currentUnitIndex++;
        }
        
        const pagesToday = [...pagesTodaySet].sort((a, b) => a - b);
        
        if (pagesToday.length > 0) {
          weekTasksByDay[d] = pagesToday;
          weekUnitsByDay[d] = unitsToday;
          allMemorizedUnits.push(...unitsToday);
        }
      }
    }

    if (targetDate.getTime() === currentLogDate.getTime()) {
      const tasks: Task[] = [];
      const pagesToday = weekTasksByDay[d] || [];
      const unitsToday = weekUnitsByDay[d] || [];
      const detailedText = unitsToday.length > 0 ? formatUnitsTitle(unitsToday) : "";

      // Gather current week units up to today for exclusion
      const currentWeekUnits: MemorizationUnit[] = [];
      for (let pd = 0; pd < 7; pd++) {
        if (weekUnitsByDay[pd]) {
          currentWeekUnits.push(...weekUnitsByDay[pd]);
        }
      }
      // Past weeks are everything memorized BEFORE this relative week
      const pastWeeksUnits = allMemorizedUnits.filter(u => !currentWeekUnits.includes(u));
      const pastWeeksPages = [...new Set(pastWeeksUnits.flatMap(u => u.pages))].sort((a, b) => a - b);

      if (d === 0) {
        // اليوم الأول:( استماع، حفظ جديد ، تثبيت، تسميع)
        if (pagesToday.length > 0) {
          tasks.push({
            id: `lis-${format(targetDate, 'yyyyMMdd')}`,
            title: `استماع: ${detailedText}`,
            type: TaskType.LISTENING,
            completed: false,
            targetCount: 1,
            currentCount: 0,
            pages: pagesToday
          });
          tasks.push({
            id: `mem-${format(targetDate, 'yyyyMMdd')}`,
            title: `حفظ جديد: ${detailedText}`,
            type: TaskType.MEMORIZATION,
            completed: false,
            targetCount: 1,
            currentCount: 0,
            pages: pagesToday
          });
          tasks.push({
            id: `fix-${format(targetDate, 'yyyyMMdd')}`,
            title: `تثبيت ${detailedText}`,
            type: TaskType.FIXATION,
            completed: false,
            targetCount: plan.dailyFixationRepetitions || plan.fixationRepetitions || 5,
            currentCount: 0,
            pages: pagesToday
          });
          tasks.push({
            id: `rec-${format(targetDate, 'yyyyMMdd')}`,
            title: `تسميع ${detailedText}`,
            type: TaskType.RECITATION,
            completed: false,
            targetCount: 1,
            currentCount: 0,
            pages: pagesToday
          });
        }
      } 
      else if (d === 1) {
        // اليوم الثاني : (استماع، حفظ جديد ، تثبيت) + مراجعة لمحفوظ اليوم الأول + تسميع لمحفوظ اليوم السابق من الأسبوع الحالي واليوم الحالي + مراجة التراكمي غيبا
        if (pagesToday.length > 0) {
          tasks.push({
            id: `lis-${format(targetDate, 'yyyyMMdd')}`,
            title: `استماع: ${detailedText}`,
            type: TaskType.LISTENING,
            completed: false,
            targetCount: 1,
            currentCount: 0,
            pages: pagesToday
          });
          tasks.push({
            id: `mem-${format(targetDate, 'yyyyMMdd')}`,
            title: `حفظ جديد: ${detailedText}`,
            type: TaskType.MEMORIZATION,
            completed: false,
            targetCount: 1,
            currentCount: 0,
            pages: pagesToday
          });
          tasks.push({
            id: `fix-${format(targetDate, 'yyyyMMdd')}`,
            title: `تثبيت ${detailedText}`,
            type: TaskType.FIXATION,
            completed: false,
            targetCount: plan.dailyFixationRepetitions || plan.fixationRepetitions || 5,
            currentCount: 0,
            pages: pagesToday
          });
        }

        // مراجعة لمحفوظ اليوم الأول
        const pages0 = weekTasksByDay[0] || [];
        const units0 = weekUnitsByDay[0] || [];
        if (pages0.length > 0) {
          tasks.push({
            id: `rev-d1-${format(targetDate, 'yyyyMMdd')}`,
            title: `مراجعة ${formatUnitsTitle(units0)}`,
            type: TaskType.REVIEW,
            completed: false,
            targetCount: 1,
            currentCount: 0,
            pages: pages0
          });
        }

        // تسميع لمحفوظ اليوم السابق من الأسبوع الحالي واليوم الحالي
        const combinedPages = [...new Set([...pages0, ...pagesToday])].sort((a, b) => a - b);
        const combinedUnits = [...units0, ...unitsToday];
        if (combinedPages.length > 0) {
          tasks.push({
            id: `rec-d1d2-${format(targetDate, 'yyyyMMdd')}`,
            title: `تسميع ${formatUnitsTitle(combinedUnits)}`,
            type: TaskType.RECITATION,
            completed: false,
            targetCount: 1,
            currentCount: 0,
            pages: combinedPages
          });
        }

        // مراجعة التراكمي غيباً
        if (pastWeeksPages.length > 0) {
          tasks.push({
            id: `rev-cum-prev-${format(targetDate, 'yyyyMMdd')}`,
            title: `مراجعة التراكمي غيباً (${formatDetailedPages(pastWeeksPages, undefined, undefined, true)})`,
            type: TaskType.CUMULATIVE_REVIEW,
            completed: false,
            targetCount: 1,
            currentCount: 0,
            pages: pastWeeksPages
          });
        }
      } 
      else if (d === 2) {
        // اليوم الثالث:(استماع، حفظ جديد ، تثبيت)+ مراجعة لمحفوظ اليوم الأول والثاني+ تسميع لمحفوظ اليومين السابقين من الأسبوع الحالي واليوم الحالي
        if (pagesToday.length > 0) {
          tasks.push({
            id: `lis-${format(targetDate, 'yyyyMMdd')}`,
            title: `استماع: ${detailedText}`,
            type: TaskType.LISTENING,
            completed: false,
            targetCount: 1,
            currentCount: 0,
            pages: pagesToday
          });
          tasks.push({
            id: `mem-${format(targetDate, 'yyyyMMdd')}`,
            title: `حفظ جديد: ${detailedText}`,
            type: TaskType.MEMORIZATION,
            completed: false,
            targetCount: 1,
            currentCount: 0,
            pages: pagesToday
          });
          tasks.push({
            id: `fix-${format(targetDate, 'yyyyMMdd')}`,
            title: `تثبيت ${detailedText}`,
            type: TaskType.FIXATION,
            completed: false,
            targetCount: plan.dailyFixationRepetitions || plan.fixationRepetitions || 5,
            currentCount: 0,
            pages: pagesToday
          });
        }

        // مراجعة لمحفوظ اليوم الأول والثاني
        const pages0 = weekTasksByDay[0] || [];
        const units0 = weekUnitsByDay[0] || [];
        const pages1 = weekTasksByDay[1] || [];
        const units1 = weekUnitsByDay[1] || [];
        const combinedPages = [...new Set([...pages0, ...pages1])].sort((a, b) => a - b);
        const combinedUnits = [...units0, ...units1];
        if (combinedPages.length > 0) {
          tasks.push({
            id: `rev-d1d2-${format(targetDate, 'yyyyMMdd')}`,
            title: `مراجعة ${formatUnitsTitle(combinedUnits)}`,
            type: TaskType.REVIEW,
            completed: false,
            targetCount: 1,
            currentCount: 0,
            pages: combinedPages
          });
        }

        // تسميع لمحفوظ اليومين السابقين من الأسبوع الحالي واليوم الحالي
        const combinedPagesAll = [...new Set([...pages0, ...pages1, ...pagesToday])].sort((a, b) => a - b);
        const combinedUnitsAll = [...units0, ...units1, ...unitsToday];
        if (combinedPagesAll.length > 0) {
          tasks.push({
            id: `rec-d1to3-${format(targetDate, 'yyyyMMdd')}`,
            title: `تسميع ${formatUnitsTitle(combinedUnitsAll)}`,
            type: TaskType.RECITATION,
            completed: false,
            targetCount: 1,
            currentCount: 0,
            pages: combinedPagesAll
          });
        }
      } 
      else if (d === 3) {
        // اليوم الرابع: (استماع، حفظ جديد ، تثبيت) + مراجعة لمحفوظ اليوم الأول إلى الثالث + تسميع لمحفوظ الثلاثة الأيام السابقة من الأسبوع الحالي واليوم الحالي + مراجة التراكمي غيبا
        if (pagesToday.length > 0) {
          tasks.push({
            id: `lis-${format(targetDate, 'yyyyMMdd')}`,
            title: `استماع: ${detailedText}`,
            type: TaskType.LISTENING,
            completed: false,
            targetCount: 1,
            currentCount: 0,
            pages: pagesToday
          });
          tasks.push({
            id: `mem-${format(targetDate, 'yyyyMMdd')}`,
            title: `حفظ جديد: ${detailedText}`,
            type: TaskType.MEMORIZATION,
            completed: false,
            targetCount: 1,
            currentCount: 0,
            pages: pagesToday
          });
          tasks.push({
            id: `fix-${format(targetDate, 'yyyyMMdd')}`,
            title: `تثبيت ${detailedText}`,
            type: TaskType.FIXATION,
            completed: false,
            targetCount: plan.dailyFixationRepetitions || plan.fixationRepetitions || 5,
            currentCount: 0,
            pages: pagesToday
          });
        }

        // مراجعة لمحفوظ اليوم الأول إلى الثالث
        const pages0 = weekTasksByDay[0] || [];
        const units0 = weekUnitsByDay[0] || [];
        const pages1 = weekTasksByDay[1] || [];
        const units1 = weekUnitsByDay[1] || [];
        const pages2 = weekTasksByDay[2] || [];
        const units2 = weekUnitsByDay[2] || [];
        const combinedPages = [...new Set([...pages0, ...pages1, ...pages2])].sort((a, b) => a - b);
        const combinedUnits = [...units0, ...units1, ...units2];
        if (combinedPages.length > 0) {
          tasks.push({
            id: `rev-d1to3-${format(targetDate, 'yyyyMMdd')}`,
            title: `مراجعة ${formatUnitsTitle(combinedUnits)}`,
            type: TaskType.REVIEW,
            completed: false,
            targetCount: 1,
            currentCount: 0,
            pages: combinedPages
          });
        }

        // تسميع لمحفوظ الثلاثة الأيام السابقة من الأسبوع الحالي واليوم الحالي
        const combinedPagesAll = [...new Set([...pages0, ...pages1, ...pages2, ...pagesToday])].sort((a, b) => a - b);
        const combinedUnitsAll = [...units0, ...units1, ...units2, ...unitsToday];
        if (combinedPagesAll.length > 0) {
          tasks.push({
            id: `rec-d1to4-${format(targetDate, 'yyyyMMdd')}`,
            title: `تسميع ${formatUnitsTitle(combinedUnitsAll)}`,
            type: TaskType.RECITATION,
            completed: false,
            targetCount: 1,
            currentCount: 0,
            pages: combinedPagesAll
          });
        }

        // مراجعة التراكمي غيباً
        if (pastWeeksPages.length > 0) {
          tasks.push({
            id: `rev-cum-prev-${format(targetDate, 'yyyyMMdd')}`,
            title: `مراجعة التراكمي غيباً (${formatDetailedPages(pastWeeksPages, undefined, undefined, true)})`,
            type: TaskType.CUMULATIVE_REVIEW,
            completed: false,
            targetCount: 1,
            currentCount: 0,
            pages: pastWeeksPages
          });
        }
      } 
      else if (d === 4) {
        // اليوم الخامس:(استماع، حفظ جديد ، تثبيت)+ مراجعة لمحفوظ اليوم الأول إلى الرابع+ تسميع لمحفوظ الأربعة الأيام السابقة من الأسبوع الحالي واليوم الحالي
        if (pagesToday.length > 0) {
          tasks.push({
            id: `lis-${format(targetDate, 'yyyyMMdd')}`,
            title: `استماع: ${detailedText}`,
            type: TaskType.LISTENING,
            completed: false,
            targetCount: 1,
            currentCount: 0,
            pages: pagesToday
          });
          tasks.push({
            id: `mem-${format(targetDate, 'yyyyMMdd')}`,
            title: `حفظ جديد: ${detailedText}`,
            type: TaskType.MEMORIZATION,
            completed: false,
            targetCount: 1,
            currentCount: 0,
            pages: pagesToday
          });
          tasks.push({
            id: `fix-${format(targetDate, 'yyyyMMdd')}`,
            title: `تثبيت ${detailedText}`,
            type: TaskType.FIXATION,
            completed: false,
            targetCount: plan.dailyFixationRepetitions || plan.fixationRepetitions || 5,
            currentCount: 0,
            pages: pagesToday
          });
        }

        // مراجعة لمحفوظ اليوم الأول إلى الرابع
        const pages0 = weekTasksByDay[0] || [];
        const units0 = weekUnitsByDay[0] || [];
        const pages1 = weekTasksByDay[1] || [];
        const units1 = weekUnitsByDay[1] || [];
        const pages2 = weekTasksByDay[2] || [];
        const units2 = weekUnitsByDay[2] || [];
        const pages3 = weekTasksByDay[3] || [];
        const units3 = weekUnitsByDay[3] || [];
        const combinedPages = [...new Set([...pages0, ...pages1, ...pages2, ...pages3])].sort((a, b) => a - b);
        const combinedUnits = [...units0, ...units1, ...units2, ...units3];
        if (combinedPages.length > 0) {
          tasks.push({
            id: `rev-d1to4-${format(targetDate, 'yyyyMMdd')}`,
            title: `مراجعة ${formatUnitsTitle(combinedUnits)}`,
            type: TaskType.REVIEW,
            completed: false,
            targetCount: 1,
            currentCount: 0,
            pages: combinedPages
          });
        }

        // تسميع لمحفوظ الأربعة الأيام السابقة من الأسبوع الحالي واليوم الحالي
        const combinedPagesAll = [...new Set([...pages0, ...pages1, ...pages2, ...pages3, ...pagesToday])].sort((a, b) => a - b);
        const combinedUnitsAll = [...units0, ...units1, ...units2, ...units3, ...unitsToday];
        if (combinedPagesAll.length > 0) {
          tasks.push({
            id: `rec-d1to5-${format(targetDate, 'yyyyMMdd')}`,
            title: `تسميع ${formatUnitsTitle(combinedUnitsAll)}`,
            type: TaskType.RECITATION,
            completed: false,
            targetCount: 1,
            currentCount: 0,
            pages: combinedPagesAll
          });
        }
      } 
      else if (d === 5) {
        // اليوم السادس : مراجعة لمحفوظ الأسبوع الحالي (الخمس الأيام السابقة ) مكررة
        const weekUnitsAll = [];
        for (let pd = 0; pd < 5; pd++) {
          if (weekUnitsByDay[pd]) {
            weekUnitsAll.push(...weekUnitsByDay[pd]);
          }
        }
        const weekPages = [...new Set(weekUnitsAll.flatMap(u => u.pages))].sort((a, b) => a - b);
        const weekDetailedText = weekUnitsAll.length > 0 ? formatUnitsTitle(weekUnitsAll) : "";
        if (weekPages.length > 0) {
          tasks.push({
            id: `rev-week-${format(targetDate, 'yyyyMMdd')}`,
            title: `مراجعة مكررة: ${weekDetailedText}`,
            type: TaskType.REVIEW,
            completed: false,
            targetCount: plan.weeklyReviewRepetitions || plan.fixationRepetitions || 3,
            currentCount: 0,
            pages: weekPages
          });
        }
      } 
      else if (d === 6) {
        // اليوم السابع:( مراجعة للمحفوظ التراكمي للأسبوع الحالي والأسابيع السابقة مكررة ، تسميع)
        const allPages = [...new Set(allMemorizedUnits.flatMap(u => u.pages))].sort((a, b) => a - b);
        const cumDetailedText = allMemorizedUnits.length > 0 ? formatUnitsTitle(allMemorizedUnits) : "";
        if (allPages.length > 0) {
          tasks.push({
            id: `rev-cum-${format(targetDate, 'yyyyMMdd')}`,
            title: `مراجعة مكررة: ${cumDetailedText}`,
            type: TaskType.CUMULATIVE_REVIEW,
            completed: false,
            targetCount: plan.cumulativeReviewRepetitions || plan.fixationRepetitions || 3,
            currentCount: 0,
            pages: allPages
          });
          tasks.push({
            id: `rec-cum-${format(targetDate, 'yyyyMMdd')}`,
            title: `تسميع ${cumDetailedText}`,
            type: TaskType.RECITATION,
            completed: false,
            targetCount: 1,
            currentCount: 0,
            pages: allPages
          });
        }
      }

      return tasks;
    }

    // Clear week context if it's the end of the relative week (d === 6)
    if (d === 6) {
      for(let key in weekTasksByDay) delete weekTasksByDay[key];
      for(let key in weekUnitsByDay) delete weekUnitsByDay[key];
    }

    currentLogDate = addDays(currentLogDate, 1);
    if (currentUnitIndex >= units.length && d === 6) break; // End of Juz
    if (currentLogDate.getTime() > addDays(targetDate, 1).getTime()) break; // Safety break
  }

  return [];
};

const getTasksForDateBase = (date: Date, plan: QuranPlan, allLogs: ProgressLog[]): Task[] => {
  if (plan.isSevenCastles) {
    return getSevenCastlesTasksForDate(date, plan);
  }
  if (plan.planType === 'review') {
    return getReviewTasksForDate(date, plan);
  }

  const startDate = startOfDay(new Date(plan.startDate));
  const targetDate = startOfDay(date);
  
  if (targetDate < startDate) return [];

  // SAFELY COERCE SYSTEM INPUT STRINGS TO NUMBERS (Crucial to prevent "+" string concatenation creating e.g. "1820" and causing "Al-Baqarah" fallbacks!)
  const startPage = Number(plan.startPage);
  const endPage = Number(plan.endPage);

  const dayOfWeek = getDay(targetDate); // 0 (Sun) to 6 (Sat)
  let pagesPerDay = 1;
  if (plan.dailyAmount === DailyAmount.QUARTER_PAGE) pagesPerDay = 0.25;
  if (plan.dailyAmount === DailyAmount.HALF_PAGE) pagesPerDay = 0.5;
  if (plan.dailyAmount === DailyAmount.TWO_PAGES) pagesPerDay = 2;
    if (plan.dailyAmount === DailyAmount.QUARTER_HIZB) pagesPerDay = 2.5;
  if (plan.dailyAmount === DailyAmount.THREE_PAGES) pagesPerDay = 3;
  if (plan.dailyAmount === DailyAmount.FOUR_PAGES) pagesPerDay = 4;
  if (plan.dailyAmount === DailyAmount.FIVE_PAGES) pagesPerDay = 5;

  // Calculate how many pages have been assigned for new memorization up to targetDate
  let currentPos = startPage;
  let weekStartPage = startPage;
  let currentLogDate = new Date(startDate);
  
  const weekTasks: Record<number, number[]> = {}; // Map of week day to pages assigned

  // Iterate from startDate to targetDate to find the pages for THIS day
  while (!isAfter(currentLogDate, targetDate)) {
    const realD = getDay(currentLogDate);
    const d = (realD - (plan.firstDayOfWeek || 0) + 7) % 7;
    
    // New Memorization logic (Sun-Wed: 0, 1, 2, 3)
    if ([0, 1, 2, 3].includes(d)) {
      if (currentPos <= endPage) {
        const pagesToday: number[] = [];
        const realPagesPerDay = pagesPerDay;
        
        for(let i=0; i<Math.ceil(realPagesPerDay); i++) {
          const p = Math.floor(currentPos) + i;
          if (p <= endPage) {
            pagesToday.push(p);
          }
        }
        
        if (pagesToday.length > 0) {
          weekTasks[d] = pagesToday;
          
          if (targetDate.getTime() === currentLogDate.getTime()) {
            const fractionMode = realPagesPerDay === 0.5 ? 'half' : (realPagesPerDay === 0.25 ? 'quarter' : undefined);
            const detailedText = formatDetailedPages(pagesToday, fractionMode, currentPos, false, undefined, plan);

            const tasks: Task[] = [
              {
                id: `lis-${format(targetDate, 'yyyyMMdd')}`,
                title: `استماع: ${detailedText}`,
                type: TaskType.LISTENING,
                completed: false,
                targetCount: 1,
                currentCount: 0,
                pages: pagesToday
              },
              {
                id: `mem-${format(targetDate, 'yyyyMMdd')}`,
                title: `حفظ ${detailedText}`,
                type: TaskType.MEMORIZATION,
                completed: false,
                targetCount: 1,
                currentCount: 0,
                pages: pagesToday
              }
            ];

            if (plan.fixationRepetitionMode === 'page_by_page') {
              pagesToday.forEach((page) => {
                const pageText = formatDetailedPages([page], undefined, undefined, false, undefined, plan);
                tasks.push({
                  id: `fix-${format(targetDate, 'yyyyMMdd')}-p${page}`,
                  title: `تثبيت ${pageText}`,
                  type: TaskType.FIXATION,
                  completed: false,
                  targetCount: plan.dailyFixationRepetitions || plan.fixationRepetitions || 5,
                  currentCount: 0,
                  pages: [page]
                });
              });
            } else {
              tasks.push({
                id: `fix-${format(targetDate, 'yyyyMMdd')}`,
                title: `تثبيت ${detailedText}`,
                type: TaskType.FIXATION,
                completed: false,
                targetCount: plan.dailyFixationRepetitions || plan.fixationRepetitions || 5,
                currentCount: 0,
                pages: pagesToday
              });
            }

            // Add review/recitation for Mon, Tue, Wed
            if (d > 0) {
               let reviewTitle = "";
               let reviewPages: number[] = [];
               
               const prevWeekTasks = [];
               for (let pd = 0; pd < d; pd++) {
                 if (weekTasks[pd]) prevWeekTasks.push(...weekTasks[pd]);
               }
               const uniquePrev = [...new Set(prevWeekTasks)].sort((a,b) => a-b);

               if (fractionMode) {
                 if (d === 1) { // Monday
                   reviewTitle = `مراجعة ${formatDetailedPages(uniquePrev, fractionMode, currentPos - realPagesPerDay, false, undefined, plan)}`;
                 } else if (d === 2) { // Tuesday
                   reviewTitle = `مراجعة ${formatDetailedPages(uniquePrev, undefined, undefined, false, undefined, plan)}`;
                 } else if (d === 3) { // Wednesday
                   const fullPages = uniquePrev.slice(0, -1);
                   const lastPage = uniquePrev[uniquePrev.length - 1];
                   reviewTitle = `مراجعة ${fullPages.length > 0 ? formatDetailedPages(fullPages, undefined, undefined, false, undefined, plan) + " و" : ""}${formatDetailedPages([lastPage], fractionMode, currentPos - realPagesPerDay, false, undefined, plan)}`;
                 }
               } else {
                 reviewTitle = `مراجعة ${formatDetailedPages(uniquePrev, undefined, undefined, false, undefined, plan)}`;
               }
               reviewPages = uniquePrev;

               if (reviewTitle) {
                  tasks.push({
                     id: `rev-${format(targetDate, 'yyyyMMdd')}`,
                     title: reviewTitle,
                     type: TaskType.REVIEW,
                     completed: false,
                     targetCount: 1,
                     currentCount: 0,
                     pages: reviewPages
                  });
               }
                
                const weekPagesAll = Object.values(weekTasks).flat();
                // Special formatting for half-page recitation
                let recTitle = "";
                if (fractionMode) {
                  const uniqueWeekPages = [...new Set(weekPagesAll)].sort((a,b) => a-b);
                  if (d === 0 || d === 2) { 
                    recTitle = `تسميع (${formatDetailedPages(uniqueWeekPages, fractionMode, currentPos, false, undefined, plan)})`;
                  } else { 
                    recTitle = `تسميع (${formatDetailedPages(uniqueWeekPages, undefined, undefined, false, undefined, plan)})`;
                  }
                } else {
                  recTitle = `تسميع (${formatDetailedPages(weekPagesAll, undefined, undefined, false, undefined, plan)})`;
                }
                
                tasks.push({
                   id: `rec-${format(targetDate, 'yyyyMMdd')}`,
                title: recTitle,
                type: TaskType.RECITATION,
                completed: false,
                targetCount: 1,
                currentCount: 0
              });
            } else {
               tasks.push({
                  id: `rec-new-${format(targetDate, 'yyyyMMdd')}`,
                  title: `تسميع ${detailedText}`,
                  type: TaskType.RECITATION,
                  completed: false,
                  targetCount: 1,
                  currentCount: 0
               });
            }
            
            return tasks;
          }
          currentPos += realPagesPerDay;
        }
      }
    }
    
    // Thu: Weekly Review (Day 4)
    if (d === 4) {
      if (targetDate.getTime() === currentLogDate.getTime()) {
        const weekPages = Object.values(weekTasks).flat();
        const weekDetailedText = weekPages.length > 0 ? formatDetailedPages(weekPages, undefined, undefined, false, undefined, plan) : "";

        return [
          {
            id: `rev-week-${format(targetDate, 'yyyyMMdd')}`,
            title: `مراجعة ${weekDetailedText} (${plan.weeklyReviewRepetitions || plan.fixationRepetitions || 3} مرات)`,
            type: TaskType.REVIEW,
            completed: false,
            targetCount: plan.weeklyReviewRepetitions || plan.fixationRepetitions || 3,
            currentCount: 0,
            pages: weekPages
          },
          {
            id: `rec-week-${format(targetDate, 'yyyyMMdd')}`,
            title: `تسميع ${weekDetailedText}`,
            type: TaskType.RECITATION,
            completed: false,
            targetCount: 1,
            currentCount: 0,
            pages: weekPages
          }
        ];
      }
      // Clear week tasks for next week
      for(let key in weekTasks) delete weekTasks[key];
    }

    // Fri: Cumulative Review (Day 5)
    if (d === 5) {
      if (targetDate.getTime() === currentLogDate.getTime()) {
        const lastMemorized = Math.min(Math.floor(currentPos) - 1, endPage);
        const cumulativePages = Array.from({ length: Math.max(0, lastMemorized - startPage + 1) }, (_, i) => startPage + i);
        const cumDetailedText = cumulativePages.length > 0 ? formatDetailedPages(cumulativePages, undefined, undefined, true, undefined, plan) : "";

        return [
          {
            id: `rev-cum-${format(targetDate, 'yyyyMMdd')}`,
            title: `مراجعة تراكمية لـ ${cumDetailedText} (${plan.cumulativeReviewRepetitions || plan.fixationRepetitions || 1} مرات)`,
            type: TaskType.CUMULATIVE_REVIEW,
            completed: false,
            targetCount: plan.cumulativeReviewRepetitions || plan.fixationRepetitions || 1,
            currentCount: 0,
            pages: cumulativePages
          },
          {
            id: `rec-cum-${format(targetDate, 'yyyyMMdd')}`,
            title: `تسميع تراكمي لـ ${cumDetailedText}`,
            type: TaskType.RECITATION,
            completed: false,
            targetCount: 1,
            currentCount: 0,
            pages: cumulativePages
          }
        ];
      }
    }

    // Sat: Cumulative Review (No Recitation) (Day 6)
    if (d === 6) {
      if (targetDate.getTime() === currentLogDate.getTime()) {
        const lastMemorized = Math.min(Math.floor(currentPos) - 1, endPage);
        const cumulativePages = Array.from({ length: Math.max(0, lastMemorized - startPage + 1) }, (_, i) => startPage + i);
        const cumDetailedTextSat = cumulativePages.length > 0 ? formatDetailedPages(cumulativePages, undefined, undefined, true, undefined, plan) : "";

        return [
          {
            id: `rev-cum-sat-${format(targetDate, 'yyyyMMdd')}`,
            title: `مراجعة تراكمية لـ ${cumDetailedTextSat} (${plan.cumulativeReviewRepetitions || plan.fixationRepetitions || 1} مرات)`,
            type: TaskType.CUMULATIVE_REVIEW,
            completed: false,
            targetCount: plan.cumulativeReviewRepetitions || plan.fixationRepetitions || 1,
            currentCount: 0,
            pages: cumulativePages
          }
        ];
      }
    }

    currentLogDate = addDays(currentLogDate, 1);
    if (currentPos >= endPage + 1 && d === 6) break; // End of Juz
    if (currentLogDate.getTime() > addDays(targetDate, 1).getTime()) break; // Safety break
  }

  return [];
};

export const getCompletedPagesInPlanBeforeDate = (date: Date, plan: QuranPlan): number[] => {
  if (plan.planType !== 'memorization' || plan.isSevenCastles) {
    return [];
  }
  const startDate = parsePlanDate(plan.startDate);
  const targetDate = startOfDay(date);
  if (targetDate <= startDate) return [];

  const startPage = Number(plan.startPage);
  const endPage = Number(plan.endPage);

  let pagesPerDay = 1;
  if (plan.dailyAmount === DailyAmount.QUARTER_PAGE) pagesPerDay = 0.25;
  if (plan.dailyAmount === DailyAmount.HALF_PAGE) pagesPerDay = 0.5;
  if (plan.dailyAmount === DailyAmount.TWO_PAGES) pagesPerDay = 2;
    if (plan.dailyAmount === DailyAmount.QUARTER_HIZB) pagesPerDay = 2.5;
  if (plan.dailyAmount === DailyAmount.THREE_PAGES) pagesPerDay = 3;
  if (plan.dailyAmount === DailyAmount.FOUR_PAGES) pagesPerDay = 4;
  if (plan.dailyAmount === DailyAmount.FIVE_PAGES) pagesPerDay = 5;

  const rawPages: number[] = [];
  const isDescending = !!plan.isSevenCastlesDescending || (startPage > endPage);
  if (isDescending) {
    for (let p = startPage; p >= endPage; p--) {
      rawPages.push(p);
    }
  } else {
    for (let p = startPage; p <= endPage; p++) {
      rawPages.push(p);
    }
  }
  const units = getMemorizationUnits(rawPages, pagesPerDay, plan);

  let currentUnitIndex = 0;
  let currentLogDate = new Date(startDate);
  const completedPages: number[] = [];

  while (currentLogDate < targetDate) {
    const realD = getDay(currentLogDate);
    const d = (realD - (plan.firstDayOfWeek || 0) + 7) % 7;

    if ([0, 1, 2, 3, 4].includes(d)) {
      if (currentUnitIndex < units.length) {
        let accumulatedWeight = 0;
        while (currentUnitIndex < units.length && accumulatedWeight < pagesPerDay) {
          const u = units[currentUnitIndex];
          u.pages.forEach(p => {
            if (!completedPages.includes(p)) {
              completedPages.push(p);
            }
          });
          accumulatedWeight += u.weight;
          currentUnitIndex++;
        }
      }
    }
    currentLogDate = addDays(currentLogDate, 1);
    if (currentUnitIndex >= units.length && d === 6) break;
  }

  return completedPages;
};

export const getOldMemorizedReviewTask = (date: Date, plan: QuranPlan): Task | Task[] | null => {
  if (plan.planType !== 'memorization') {
    return null;
  }

  const startDate = parsePlanDate(plan.startDate);
  const targetDate = startOfDay(date);
  if (targetDate < startDate) return null;

  const daysElapsed = differenceInCalendarDays(targetDate, startDate);
  const realD = getDay(targetDate);
  const d = (realD - (plan.firstDayOfWeek || 0) + 7) % 7;

  // New logic for Week 2+ (Days 2 and 4 -> d === 1 and d === 3)
  // Skip this default cumulative bypass if the plan is flexible, because flexible explicitly dictates tasks
  // Skip this for Seven Castles as it requires Old Review on every day including days 2 and 4.
  if (!plan.isFlexible && !plan.isSevenCastles && daysElapsed >= 7 && (d === 1 || d === 3)) {
    const priorWeekEnd = addDays(targetDate, -d);
    // get pages memorized up to the end of last week
    const rawPreviousStr = getCompletedPagesInPlanBeforeDate(priorWeekEnd, plan);
    const previousCumulativePages = getActiveCumulativePages(rawPreviousStr, plan, priorWeekEnd).sort((a, b) => a - b);
    if (previousCumulativePages.length > 0) {
      const detailedText = formatDetailedPages(previousCumulativePages, undefined, undefined, true, plan.oldMemSurahs, plan);
      
      if (plan.fixationRepetitionMode === 'page_by_page') {
        const tasks: Task[] = [];
        previousCumulativePages.forEach((page) => {
          const parts = getSplitPartsForPage(page);
          if (parts.length <= 1) {
            tasks.push({
              id: `old-rev-cum-${format(targetDate, 'yyyyMMdd')}-p${page}`,
              title: `مراجعة ص ${page}`,
              type: TaskType.CUMULATIVE_REVIEW,
              completed: false,
              targetCount: 1,
              currentCount: 0,
              pages: [page]
            });
          } else {
            parts.forEach((part, index) => {
              const desc = formatVerseDescForTitle(part);
              const titleSuffix = ` (${desc})`;
              tasks.push({
                id: `old-rev-cum-${format(targetDate, 'yyyyMMdd')}-p${page}-part${index}`,
                title: `مراجعة ص ${page}${titleSuffix}`,
                type: TaskType.CUMULATIVE_REVIEW,
                completed: false,
                targetCount: 1,
                currentCount: 0,
                pages: [page]
              });
            });
          }
        });
        return tasks;
      }

      return {
        id: `old-rev-cum-${format(targetDate, 'yyyyMMdd')}`,
        title: `مراجعة ${detailedText}`,
        type: TaskType.CUMULATIVE_REVIEW,
        completed: false,
        targetCount: 1,
        currentCount: 0,
        pages: previousCumulativePages
      };
    } else {
      return null;
    }
  }

  // Calculate actual old review indices, skipping intercepted days in week 2+
  let oldReviewDayIndex = 0;
  for (let i = 0; i < daysElapsed; i++) {
    const checkDDate = addDays(startDate, i);
    const checkRealD = getDay(checkDDate);
    const checkD = (checkRealD - (plan.firstDayOfWeek || 0) + 7) % 7;
    
    if (plan.isFlexible && plan.flexibleDayConfigs) {
      if (plan.flexibleDayConfigs[checkRealD]?.hasOldMemorizationReview) {
        oldReviewDayIndex++;
      }
    } else if (plan.isSevenCastles) {
      oldReviewDayIndex++; // Assuming everyday for castles, or we can leave whatever it was. Actually let's just do oldReviewDayIndex++;
    } else {
      if ([0, 2, 4, 5, 6].includes(checkD)) {
        oldReviewDayIndex++;
      }
    }
  }

  // 1. Get initial old memorized pages (if enabled and present)
  const initialOldPages = (plan.hasOldMemorization && plan.oldMemorizedPages) ? plan.oldMemorizedPages : [];

  // 2. Get completed pages from the current plan up to this date
  const completedInCurrentPlan = getCompletedPagesInPlanBeforeDate(date, plan);
  
  // 3. Only transfer completed pages in batches/groups of 20 (1 full Juz)
  // Note: This does not apply to Seven Castles plans as requested
  const numCurrentPagesToAdd = plan.isSevenCastles ? 0 : Math.floor(completedInCurrentPlan.length / 20) * 20;
  const currentPagesToAdd = completedInCurrentPlan.slice(0, numCurrentPagesToAdd);

  // 4. Combine both sets of pages
  const combinedOldPages = [...new Set([...initialOldPages, ...currentPagesToAdd])].sort((a, b) => a - b);

  if (combinedOldPages.length === 0) {
    return null;
  }

  const totalPages = combinedOldPages.length;

  // Determine N: division period
  let N = 5;
  let useQuarters = false;
  let quarterUnits: MemorizationUnit[] = [];

  if (plan.oldMemorizationReviewMode === 'custom_amount' && plan.oldMemorizationCustomAmountType) {
    let pagesPerDay = 10;
    if (plan.oldMemorizationCustomAmountType === 'pages') {
      pagesPerDay = plan.oldMemorizationCustomAmountValue || 5;
    } else if (plan.oldMemorizationCustomAmountType === 'quarter_hizb') {
      useQuarters = true;
      const quartersMultiplier = plan.oldMemorizationCustomAmountValue || 2;
      pagesPerDay = quartersMultiplier * 2.5;
      
      const allQuarters = getMemorizationUnits(combinedOldPages, 2.5, plan);
      
      // Group quarters by multiplier
      quarterUnits = [];
      for (let i = 0; i < allQuarters.length; i += quartersMultiplier) {
        const group = allQuarters.slice(i, i + quartersMultiplier);
        const groupPages = group.flatMap(q => q.pages);
        const groupTitle = group.length > 1 ? `${group[0].title} إلى ${group[group.length - 1].title}` : group[0].title;
        quarterUnits.push({
            title: groupTitle,
            pages: groupPages,
            weight: group.reduce((sum, item) => sum + (item.weight || 1), 0),
        });
      }
      N = Math.max(1, quarterUnits.length);
    } else if (plan.oldMemorizationCustomAmountType === 'juz') {
      pagesPerDay = (plan.oldMemorizationCustomAmountValue || 1) * 20;
    }
    
    if (!useQuarters) {
      N = Math.max(1, Math.ceil(totalPages / pagesPerDay));
    }
  } else if (plan.oldMemorizationReviewMode === 'custom_days' && plan.oldMemorizationCustomDays && plan.oldMemorizationCustomDays > 0) {
    N = plan.oldMemorizationCustomDays;
  } else if (plan.isSevenCastles) {
    if (totalPages > 140) {
      N = 14;
    } else {
      N = 7;
    }
  } else {
    if (totalPages > 100) {
      N = 10;
    } else {
      N = 5;
    }
  }

  const chunkIndex = oldReviewDayIndex % N;
  
  let pagesToday: number[] = [];
  let detailedText = "";

  if (useQuarters && quarterUnits.length > 0) {
    const q = quarterUnits[chunkIndex];
    if (!q) return null;
    pagesToday = q.pages;
    detailedText = q.title;
  } else {
    const baseSize = Math.floor(totalPages / N);
    const remainder = totalPages % N;
    
    let startIdx = 0;
    for (let i = 0; i < chunkIndex; i++) {
      startIdx += baseSize + (i < remainder ? 1 : 0);
    }
    const currentChunkSize = baseSize + (chunkIndex < remainder ? 1 : 0);
    const endIdx = startIdx + currentChunkSize;

    pagesToday = combinedOldPages.slice(startIdx, endIdx);
    detailedText = formatDetailedPages(pagesToday, undefined, undefined, true, plan.oldMemSurahs, plan);
  }

  if (pagesToday.length === 0) return null;

  if (plan.fixationRepetitionMode === 'page_by_page') {
    const tasks: Task[] = [];
    pagesToday.forEach((page) => {
      const parts = getSplitPartsForPage(page);
      if (parts.length <= 1) {
        tasks.push({
          id: `old-rev-${format(targetDate, 'yyyyMMdd')}-p${page}`,
          title: `مراجعة ص ${page}`,
          type: TaskType.REVIEW,
          completed: false,
          targetCount: 1,
          currentCount: 0,
          pages: [page]
        });
      } else {
        parts.forEach((part, index) => {
          const desc = formatVerseDescForTitle(part);
          const titleSuffix = ` (${desc})`;
          tasks.push({
            id: `old-rev-${format(targetDate, 'yyyyMMdd')}-p${page}-part${index}`,
            title: `مراجعة ص ${page}${titleSuffix}`,
            type: TaskType.REVIEW,
            completed: false,
            targetCount: 1,
            currentCount: 0,
            pages: [page]
          });
        });
      }
    });
    return tasks;
  }

  if (!detailedText) {
    detailedText = formatDetailedPages(pagesToday, undefined, undefined, true, plan.oldMemSurahs, plan);
  }

  return {
    id: `old-rev-${format(targetDate, 'yyyyMMdd')}`,
    title: `مراجعة ${detailedText}`,
    type: TaskType.REVIEW,
    completed: false,
    targetCount: 1,
    currentCount: 0,
    pages: pagesToday
  };
};

export const getSevenCastlesPages = (plan: QuranPlan): number[] => {
  let pagesPerDay = 1;
  if (plan.dailyAmount === DailyAmount.QUARTER_PAGE) pagesPerDay = 0.25;
  if (plan.dailyAmount === DailyAmount.HALF_PAGE) pagesPerDay = 0.5;
  if (plan.dailyAmount === DailyAmount.ONE_PAGE) pagesPerDay = 1;
  if (plan.dailyAmount === DailyAmount.TWO_PAGES) pagesPerDay = 2;
    if (plan.dailyAmount === DailyAmount.QUARTER_HIZB) pagesPerDay = 2.5;
  if (plan.dailyAmount === DailyAmount.THREE_PAGES) pagesPerDay = 3;
  if (plan.dailyAmount === DailyAmount.FOUR_PAGES) pagesPerDay = 4;
  if (plan.dailyAmount === DailyAmount.FIVE_PAGES) pagesPerDay = 5;

  const neededWeight = 42 * pagesPerDay;

  const getPageWeight = (p: number, A: number): number => {
    // Replicate getPageUnits logic for total weight of the page
    if (A === 2.5) {
      // 2.5 is quarter hizb mode. But for simplicity, a page is just "1" in terms of quarters?
      // Actually, if we just use the length of getPageUnits... wait, we don't have getPageUnits here.
      // We can just calculate it simply.
    }
    if (p === 1 || p === 2) return 0.5;
    if (p === 598) return 0.25;
    if (p >= 599 && p <= 604) return 0.75;
    return 1.0;
  };

  let startJuz = 1;
  for (let j = 1; j <= 30; j++) {
    const range = JUZ_PAGES[j];
    if (plan.startPage >= range.start && plan.startPage <= range.end) {
      startJuz = j;
      break;
    }
  }

  const searchJuzs: number[] = [];
  if (plan.isSevenCastlesDescending) {
    for (let j = startJuz; j >= 1; j--) {
      searchJuzs.push(j);
    }
    for (let j = startJuz + 1; j <= 30; j++) {
      searchJuzs.push(j);
    }
  } else {
    for (let j = startJuz; j <= 30; j++) {
      searchJuzs.push(j);
    }
    for (let j = startJuz - 1; j >= 1; j--) {
      searchJuzs.push(j);
    }
  }

  const oldPages = plan.oldMemorizedPages || [];
  const targetPages: number[] = [];

  let currentAccumulatedWeight = 0;
  for (let i = 0; i < searchJuzs.length; i++) {
    const j = searchJuzs[i];
    const range = JUZ_PAGES[j];
    if (!range) continue;

    const juzPages: number[] = [];
    if (j === startJuz) {
      if (plan.isSevenCastlesDescending) {
        for (let p = plan.startPage; p >= range.start; p--) {
          juzPages.push(p);
        }
      } else {
        for (let p = plan.startPage; p <= range.end; p++) {
          juzPages.push(p);
        }
      }
    } else {
      if (plan.isSevenCastlesDescending) {
        for (let p = range.end; p >= range.start; p--) {
          juzPages.push(p);
        }
      } else {
        for (let p = range.start; p <= range.end; p++) {
          juzPages.push(p);
        }
      }
    }

    for (const p of juzPages) {
      if (!oldPages.includes(p)) {
        targetPages.push(p);
        currentAccumulatedWeight += getPageWeight(p, pagesPerDay);
        if (currentAccumulatedWeight >= neededWeight - 0.001) {
          break;
        }
      }
    }

    if (currentAccumulatedWeight >= neededWeight - 0.001) {
      break;
    }
  }

  return targetPages;
};

export const getSevenCastlesTasksForDate = (date: Date, plan: QuranPlan): Task[] => {
  const startDate = parsePlanDate(plan.startDate);
  const targetDate = startOfDay(date);
  if (targetDate < startDate) return [];

  const targetPagesToMemorize = getSevenCastlesPages(plan);

  const daysElapsed = differenceInCalendarDays(targetDate, startDate);

  let pagesPerDay = 1;
  if (plan.dailyAmount === DailyAmount.QUARTER_PAGE) pagesPerDay = 0.25;
  if (plan.dailyAmount === DailyAmount.HALF_PAGE) pagesPerDay = 0.5;
  if (plan.dailyAmount === DailyAmount.ONE_PAGE) pagesPerDay = 1;
  if (plan.dailyAmount === DailyAmount.TWO_PAGES) pagesPerDay = 2;
    if (plan.dailyAmount === DailyAmount.QUARTER_HIZB) pagesPerDay = 2.5;
  if (plan.dailyAmount === DailyAmount.THREE_PAGES) pagesPerDay = 3;
  if (plan.dailyAmount === DailyAmount.FOUR_PAGES) pagesPerDay = 4;
  if (plan.dailyAmount === DailyAmount.FIVE_PAGES) pagesPerDay = 5;

  const A = pagesPerDay;

  const units = getMemorizationUnits(targetPagesToMemorize, A, plan);
  
  const neededMemDays = 42; // Seven Castles plan is fixed at 42 memorization days
  const neededWeeks = 11; // 11 weeks total
  const totalPlanDays = neededWeeks * 7;

  if (daysElapsed >= totalPlanDays) return [];

  const week = Math.floor(daysElapsed / 7);
  const realD = getDay(targetDate);
  const d = (realD - (plan.firstDayOfWeek || 0) + 7) % 7; // 0 to 6 index of current week


  const getPagesForMemDay = (memDay: number): number[] => {
    if (memDay > neededMemDays) return [];
    const memUnits = getUnitsForMemDay(memDay, units, A);
    const pages = memUnits.flatMap(u => u.pages);
    return [...new Set(pages)].sort((a,b) => a-b);
  };

  const getPagesDescForMemDay = (memDay: number): string => {
    if (memDay > neededMemDays) return "";
    const memUnits = getUnitsForMemDay(memDay, units, A);
    if (memUnits.length === 0) return "";
    return formatUnitsTitle(memUnits);
  };

  const getCastlePages = (castleNum: number): number[] => {
    if (castleNum < 1 || castleNum > 7) return [];
    const totalWeight = units.reduce((sum, u) => sum + u.weight, 0);
    const castleWeight = totalWeight / 7;
    const startPos = (castleNum - 1) * castleWeight;
    const endPos = startPos + castleWeight;
    
    let currentWeightAccum = 0;
    const castlePagesSet = new Set<number>();
    for (const u of units) {
      const sw = currentWeightAccum;
      currentWeightAccum += u.weight;
      const ew = currentWeightAccum;
      if (sw < endPos - 0.0001 && ew > startPos + 0.0001) {
        u.pages.forEach(p => castlePagesSet.add(p));
      }
    }
    return [...castlePagesSet].sort((a,b) => a-b);
  };

  const getCastleNameAr = (idx: number): string => {
    const names = ['الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة', 'السادسة', 'السابعة'];
    return names[idx] || `${idx + 1}`;
  };

  const memDay1 = week * 4 + 1;
  const memDay2 = week * 4 + 2;
  const memDay3 = week * 4 + 3;
  const memDay4 = week * 4 + 4;

  const Pg1_pages = getPagesForMemDay(memDay1);
  const Pg1_desc = getPagesDescForMemDay(memDay1);

  const Pg2_pages = getPagesForMemDay(memDay2);
  const Pg2_desc = getPagesDescForMemDay(memDay2);

  const Pg3_pages = getPagesForMemDay(memDay3);
  const Pg3_desc = getPagesDescForMemDay(memDay3);

  const Pg4_pages = getPagesForMemDay(memDay4);
  const Pg4_desc = getPagesDescForMemDay(memDay4);

  const Pg12_pages = [...new Set([...Pg1_pages, ...Pg2_pages])].sort((a,b) => a-b);
  const Pg1_units = getUnitsForMemDay(memDay1, units, A);
  const Pg2_units = getUnitsForMemDay(memDay2, units, A);
  const Pg12_units = [...Pg1_units, ...Pg2_units];
  const Pg12_desc = Pg12_units.length > 0 ? formatUnitsTitle(Pg12_units) : "";

  const Pg34_pages = [...new Set([...Pg3_pages, ...Pg4_pages])].sort((a,b) => a-b);
  const Pg3_units = getUnitsForMemDay(memDay3, units, A);
  const Pg4_units = getUnitsForMemDay(memDay4, units, A);
  const Pg34_units = [...Pg3_units, ...Pg4_units];
  const Pg34_desc = Pg34_units.length > 0 ? formatUnitsTitle(Pg34_units) : "";

  const PgAll_pages = [...new Set([...Pg1_pages, ...Pg2_pages, ...Pg3_pages, ...Pg4_pages])].sort((a,b) => a-b);
  const PgAll_units = [...Pg1_units, ...Pg2_units, ...Pg3_units, ...Pg4_units];
  const PgAll_desc = PgAll_units.length > 0 ? formatUnitsTitle(PgAll_units) : "";

  const tasks: Task[] = [];
  const dateStr = format(targetDate, 'yyyyMMdd');

  switch (d) {
    case 0: { // Day 1
      if (Pg1_pages.length > 0) {
        tasks.push({
          id: `sc-lis-1-${dateStr}`,
          title: `استماع: ${Pg1_desc}`,
          type: TaskType.LISTENING,
          completed: false,
          targetCount: 1,
          currentCount: 0,
          pages: Pg1_pages
        });
        tasks.push({
          id: `sc-mem-1-${dateStr}`,
          title: `حفظ جديد: ${Pg1_desc}`,
          type: TaskType.MEMORIZATION,
          completed: false,
          targetCount: 1,
          currentCount: 0,
          pages: Pg1_pages
        });
        tasks.push({
          id: `sc-fix-1-${dateStr}`,
          title: `تثبيت المقدار الجديد: ${Pg1_desc}`,
          type: TaskType.FIXATION,
          completed: false,
          targetCount: plan.dailyFixationRepetitions || 5,
          currentCount: 0,
          pages: Pg1_pages
        });
      }
      break;
    }

    case 1: { // Day 2
      if (Pg2_pages.length > 0) {
        tasks.push({
          id: `sc-lis-2-${dateStr}`,
          title: `استماع: ${Pg2_desc}`,
          type: TaskType.LISTENING,
          completed: false,
          targetCount: 1,
          currentCount: 0,
          pages: Pg2_pages
        });
        tasks.push({
          id: `sc-mem-2-${dateStr}`,
          title: `حفظ جديد: ${Pg2_desc}`,
          type: TaskType.MEMORIZATION,
          completed: false,
          targetCount: 1,
          currentCount: 0,
          pages: Pg2_pages
        });
        tasks.push({
          id: `sc-fix-2-${dateStr}`,
          title: `تثبيت المقدار الجديد: ${Pg2_desc}`,
          type: TaskType.FIXATION,
          completed: false,
          targetCount: plan.dailyFixationRepetitions || 5,
          currentCount: 0,
          pages: Pg2_pages
        });
      }
      break;
    }

    case 2: { // Day 3
      if (Pg12_pages.length > 0) {
        tasks.push({
          id: `sc-fix-12-${dateStr}`,
          title: `تثبيت ${Pg12_desc}`,
          type: TaskType.FIXATION,
          completed: false,
          targetCount: plan.weeklyReviewRepetitions || 3,
          currentCount: 0,
          pages: Pg12_pages
        });
        tasks.push({
          id: `sc-rec-12-${dateStr}`,
          title: `تسميع ${Pg12_desc}`,
          type: TaskType.RECITATION,
          completed: false,
          targetCount: 1,
          currentCount: 0,
          pages: Pg12_pages
        });
      }
      break;
    }

    case 3: { // Day 4
      if (Pg3_pages.length > 0) {
        tasks.push({
          id: `sc-lis-3-${dateStr}`,
          title: `استماع: ${Pg3_desc}`,
          type: TaskType.LISTENING,
          completed: false,
          targetCount: 1,
          currentCount: 0,
          pages: Pg3_pages
        });
        tasks.push({
          id: `sc-mem-3-${dateStr}`,
          title: `حفظ جديد: ${Pg3_desc}`,
          type: TaskType.MEMORIZATION,
          completed: false,
          targetCount: 1,
          currentCount: 0,
          pages: Pg3_pages
        });
        tasks.push({
          id: `sc-fix-3-${dateStr}`,
          title: `تثبيت المقدار الجديد: ${Pg3_desc}`,
          type: TaskType.FIXATION,
          completed: false,
          targetCount: plan.dailyFixationRepetitions || 5,
          currentCount: 0,
          pages: Pg3_pages
        });
      }
      break;
    }

    case 4: { // Day 5
      if (Pg4_pages.length > 0) {
        tasks.push({
          id: `sc-lis-4-${dateStr}`,
          title: `استماع: ${Pg4_desc}`,
          type: TaskType.LISTENING,
          completed: false,
          targetCount: 1,
          currentCount: 0,
          pages: Pg4_pages
        });
        tasks.push({
          id: `sc-mem-4-${dateStr}`,
          title: `حفظ جديد: ${Pg4_desc}`,
          type: TaskType.MEMORIZATION,
          completed: false,
          targetCount: 1,
          currentCount: 0,
          pages: Pg4_pages
        });
        tasks.push({
          id: `sc-fix-4-${dateStr}`,
          title: `تثبيت المقدار الجديد: ${Pg4_desc}`,
          type: TaskType.FIXATION,
          completed: false,
          targetCount: plan.dailyFixationRepetitions || 5,
          currentCount: 0,
          pages: Pg4_pages
        });
      }
      break;
    }

    case 5: { // Day 6
      if (Pg34_pages.length > 0) {
        tasks.push({
          id: `sc-fix-34-${dateStr}`,
          title: `تثبيت ${Pg34_desc}`,
          type: TaskType.FIXATION,
          completed: false,
          targetCount: plan.weeklyReviewRepetitions || 3,
          currentCount: 0,
          pages: Pg34_pages
        });
        tasks.push({
          id: `sc-rec-34-${dateStr}`,
          title: `تسميع ${Pg34_desc}`,
          type: TaskType.RECITATION,
          completed: false,
          targetCount: 1,
          currentCount: 0,
          pages: Pg34_pages
        });
      }
      break;
    }

    case 6: { // Day 7
      if (PgAll_pages.length > 0 && week < neededWeeks - 1) {
        tasks.push({
          id: `sc-rev-week-${dateStr}`,
          title: `مراجعة ${PgAll_desc}`,
          type: TaskType.REVIEW,
          completed: false,
          targetCount: 1,
          currentCount: 0,
          pages: PgAll_pages
        });

        let pagesToRecitate = PgAll_pages;
        let recitationTitle = "";
        
        if (week === 0) {
          recitationTitle = `تسميع ${PgAll_desc}`;
        } else {
          // get pages for previous week
          const prevMemDay1 = (week - 1) * 4 + 1;
          const prevMemDay2 = (week - 1) * 4 + 2;
          const prevMemDay3 = (week - 1) * 4 + 3;
          const prevMemDay4 = (week - 1) * 4 + 4;
          
          const prevPg1_units = getUnitsForMemDay(prevMemDay1, units, A);
          const prevPg2_units = getUnitsForMemDay(prevMemDay2, units, A);
          const prevPg3_units = getUnitsForMemDay(prevMemDay3, units, A);
          const prevPg4_units = getUnitsForMemDay(prevMemDay4, units, A);
          
          const prevUnitsAll = [...prevPg1_units, ...prevPg2_units, ...prevPg3_units, ...prevPg4_units];
          const combinedUnits = [...prevUnitsAll, ...PgAll_units];

          const prevPg1 = getPagesForMemDay(prevMemDay1);
          const prevPg2 = getPagesForMemDay(prevMemDay2);
          const prevPg3 = getPagesForMemDay(prevMemDay3);
          const prevPg4 = getPagesForMemDay(prevMemDay4);
          
          const prevPgAll = [...new Set([...prevPg1, ...prevPg2, ...prevPg3, ...prevPg4])].sort((a,b) => a-b);
          const combinedPageList = [...new Set([...prevPgAll, ...PgAll_pages])].sort((a,b) => a-b);
          pagesToRecitate = combinedPageList;
          recitationTitle = `تسميع ${formatUnitsTitle(combinedUnits)}`;
        }

        tasks.push({
          id: `sc-rec-week-${dateStr}`,
          title: recitationTitle,
          type: TaskType.RECITATION,
          completed: false,
          targetCount: 1,
          currentCount: 0,
          pages: pagesToRecitate
        });
      }
      break;
    }
  }

  const targetK = d + 1; // 1 to 7
  const compWeek = Math.floor((targetK * 6 - 1) / 4);
  if (week > compWeek || (week === 10 && targetK === 7)) {
    const cPages = getCastlePages(targetK);
    const castleUnits = units.filter(u => u.pages.some(p => cPages.includes(p)));
    if (cPages.length > 0) {
      tasks.push({
        id: `sc-castle-rev-${targetK - 1}-${dateStr}`,
        title: `مراجعة القلعة ${getCastleNameAr(targetK - 1)}: ${formatUnitsTitle(castleUnits)}`,
        type: TaskType.REVIEW,
        completed: false,
        targetCount: 1,
        currentCount: 0,
        pages: cPages
      });
    }
  }

  return tasks;
};

export const getTasksForDate = (date: Date, plan: QuranPlan, allLogs: ProgressLog[]): Task[] => {
  const startDate = parsePlanDate(plan.startDate);
  const targetDate = startOfDay(date);
  if (targetDate < startDate) return [];

  const baseTasks = getTasksForDateBaseNew(date, plan, allLogs);

  let shouldAddOldReview = true;
  
  if (!plan.isFlexible && !plan.isSevenCastles && plan.planType !== 'review') {
      const realD = getDay(startOfDay(date));
      const planD = (realD - (plan.firstDayOfWeek || 0) + 7) % 7; 
      // User says: الأيام الأول والثالث والخامس والسادس والسابع
      // This maps to planD 0, 2, 4, 5, 6
      if (![0, 2, 4, 5, 6].includes(planD)) {
        shouldAddOldReview = false;
      }
  }

  if (plan.isFlexible && plan.flexibleDayConfigs) {
    const realD = getDay(startOfDay(date));
    const config = plan.flexibleDayConfigs[realD];
    if (!config || !config.hasOldMemorizationReview) {
      shouldAddOldReview = false;
    }
  }

  // Abort early ONLY if there are no base tasks AND we shouldn't add an old review
  if (baseTasks.length === 0 && !shouldAddOldReview) return [];

  let finalTasks = [...baseTasks];
  if (shouldAddOldReview) {
    const oldReviewTask = getOldMemorizedReviewTask(date, plan);
    if (oldReviewTask) {
      if (Array.isArray(oldReviewTask)) {
        finalTasks.push(...oldReviewTask);
      } else {
        finalTasks.push(oldReviewTask);
      }
    }
  }

  if (plan.addAdhkar && plan.adhkarList && plan.adhkarList.length > 0) {
    const dateStr = format(date, 'yyyyMMdd');
    plan.adhkarList.forEach((a, index) => {
      finalTasks.push({
        id: `dhikr-${dateStr}-${index}`,
        title: a.dhikr,
        type: TaskType.DHIKR,
        completed: false,
        targetCount: a.count || 1,
        dhikr: a.dhikr, // optional property for display if needed
        currentCount: 0,
        pages: []
      });
    });
  }
  
  return finalTasks.map(task => {
    if ((task.type === TaskType.REVIEW || task.title.includes('مراجعة') || task.title.includes('المراجعة')) && !task.title.includes('غيبا')) {
      return { ...task, title: task.title.trim() + ' غيباً' };
    }
    return task;
  });
};

export const getPlanStats = (plan: QuranPlan, allLogs: ProgressLog[]) => {
  let totalTasksCount = 0;
  let completedTasksCount = 0;
  let assignedTasksUntilNow = 0;
  let totalPagesMemorized = 0;
  
  const today = startOfDay(new Date());
  const startDate = parsePlanDate(plan.startDate);
  
  // Track streak
  let currentStreak = 0;
  
  // Parse logs directly - O(L) operation (where L is just the days they opened the app)
  allLogs.forEach(log => {
    completedTasksCount += log.tasks.filter(t => t.completed).length;
    
    const memTaskType = plan.planType === 'review' ? TaskType.FIXATION : TaskType.MEMORIZATION;
    const savedPages = log.tasks
      .filter(t => t.type === memTaskType && t.completed)
      .flatMap(t => t.pages || []);
    totalPagesMemorized += savedPages.length;
  });

  const adhkarTasks = plan.addAdhkar && plan.adhkarList ? plan.adhkarList.length : 0;

  if (plan.isSevenCastles) {
    let pagesPerDay = 1;
    if (plan.dailyAmount === DailyAmount.QUARTER_PAGE) pagesPerDay = 0.25;
    if (plan.dailyAmount === DailyAmount.HALF_PAGE) pagesPerDay = 0.5;
    if (plan.dailyAmount === DailyAmount.ONE_PAGE) pagesPerDay = 1;
    if (plan.dailyAmount === DailyAmount.TWO_PAGES) pagesPerDay = 2;
    if (plan.dailyAmount === DailyAmount.QUARTER_HIZB) pagesPerDay = 2.5;
    if (plan.dailyAmount === DailyAmount.THREE_PAGES) pagesPerDay = 3;
    if (plan.dailyAmount === DailyAmount.FOUR_PAGES) pagesPerDay = 4;
    if (plan.dailyAmount === DailyAmount.FIVE_PAGES) pagesPerDay = 5;

    const A = pagesPerDay;
    const targetPagesToMemorize = getSevenCastlesPages(plan);
    const neededMemDays = Math.ceil(targetPagesToMemorize.length / A);
    const neededWeeks = plan.isSevenCastles ? 11 : Math.ceil(neededMemDays / 4);
    const totalPlanDays = neededWeeks * 7;
    
    // Estimate: 5 days * 3 tasks (mem, fix, rev) + 1 day * 1 task (cum rev) = ~16 tasks per week
    const tasksPerWeek = 16 + adhkarTasks * 7;
    totalTasksCount = neededWeeks * tasksPerWeek;
    
    let daysElapsed = differenceInCalendarDays(today, startDate);
    if (daysElapsed < 0) daysElapsed = 0;
    
    assignedTasksUntilNow = Math.ceil((Math.min(daysElapsed + 1, totalPlanDays) / 7) * tasksPerWeek);

  } else if (plan.planType === 'review') {
    const getFixationPagesCount = (type: string) => {
      switch (type) {
        case 'juz': return 20;
        case 'hizb': return 10;
        case 'half_hizb': return 5;
        case 'quarter_hizb': return 2.5;
        case 'two_pages': return 2;
        case 'page': return 1;
        default: return 10;
      }
    };
    const includeFixation = plan.includeFixation !== false;
    let totalDays = 30;
    if (includeFixation) {
      const pagesPerDay = getFixationPagesCount(plan.fixationAmountType || 'hizb');
      const isSpecificFix = !!(plan.isSpecificFixation && plan.fixationPages && plan.fixationPages.length > 0);
      const isSpecificRev = !!(plan.isSpecificReview && plan.reviewPages && plan.reviewPages.length > 0);
      const baseFixationPagesCount = isSpecificFix ? plan.fixationPages!.length : (isSpecificRev ? plan.reviewPages!.length : 603);
      totalDays = Math.ceil(baseFixationPagesCount / pagesPerDay);
    } else {
      const reviewPagesCount = plan.isSpecificReview && plan.reviewPages && plan.reviewPages.length > 0 
        ? plan.reviewPages.length 
        : 603;
      if (plan.reviewAmountType === 'pages') {
        const reviewPageAmount = plan.reviewPageAmount || 20;
        totalDays = Math.ceil(reviewPagesCount / reviewPageAmount);
      } else {
        const reviewJuzAmount = plan.reviewJuzAmount || 3;
        const totalJuzs = plan.isSpecificReview && plan.reviewPages && plan.reviewPages.length > 0
          ? Math.ceil(reviewPagesCount / 20)
          : 30;
        totalDays = Math.ceil(totalJuzs / reviewJuzAmount);
      }
    }
    const tasksPerDay = (includeFixation ? 2 : 1) + adhkarTasks;
    totalTasksCount = totalDays * tasksPerDay; 
    
    let daysElapsed = differenceInCalendarDays(today, startDate);
    if (daysElapsed < 0) daysElapsed = 0;
    
    assignedTasksUntilNow = Math.min(daysElapsed + 1, totalDays) * tasksPerDay;
  } else {
    // Original Memorization Math (No slow simulation)
    const startPage = Number(plan.startPage);
    const endPage = Number(plan.endPage);

    let pagesPerDay = 1;
    if (plan.dailyAmount === DailyAmount.QUARTER_PAGE) pagesPerDay = 0.25;
    if (plan.dailyAmount === DailyAmount.HALF_PAGE) pagesPerDay = 0.5;
    if (plan.dailyAmount === DailyAmount.TWO_PAGES) pagesPerDay = 2;
    if (plan.dailyAmount === DailyAmount.QUARTER_HIZB) pagesPerDay = 2.5;
    if (plan.dailyAmount === DailyAmount.THREE_PAGES) pagesPerDay = 3;
    if (plan.dailyAmount === DailyAmount.FOUR_PAGES) pagesPerDay = 4;
    if (plan.dailyAmount === DailyAmount.FIVE_PAGES) pagesPerDay = 5;

    let rawPages: number[] = plan.memorizationTargetPages || [];
    if (rawPages.length === 0) {
      const isDescending = !!plan.isSevenCastlesDescending || (startPage > endPage);
      if (isDescending) {
        for (let p = startPage; p >= endPage; p--) {
          rawPages.push(p);
        }
      } else {
        for (let p = startPage; p <= endPage; p++) {
          rawPages.push(p);
        }
      }
    }
    const units = getMemorizationUnits(rawPages, pagesPerDay, plan);
    
    let weeksCount = Math.ceil(units.length / 5);
    let totalPlanDays = weeksCount * 7;
    
    if (plan.isFlexible) {
      if (plan.flexibleDurationMode === 'weeks' && plan.flexibleDurationWeeks) {
        weeksCount = plan.flexibleDurationWeeks;
        totalPlanDays = weeksCount * 7;
      } else if (plan.flexibleDurationMode === 'range' && plan.flexibleEndDate) {
        totalPlanDays = Math.max(1, differenceInCalendarDays(new Date(plan.flexibleEndDate), startDate) + 1);
        weeksCount = Math.ceil(totalPlanDays / 7);
      }
    }
    
    // tasks per week approx: 16 core tasks + adhkar
    const tasksPerWeek = 16 + adhkarTasks * 7;
    totalTasksCount = weeksCount * tasksPerWeek;
    
    let daysElapsed = differenceInCalendarDays(today, startDate);
    if (daysElapsed < 0) daysElapsed = 0;
    
    assignedTasksUntilNow = Math.ceil((Math.min(daysElapsed + 1, totalPlanDays) / 7) * tasksPerWeek);
  }

  // Calculate Streak
  let streakCounter = 0;
  let checkDate = today;
  
  while (true) {
    const dateStr = format(checkDate, 'yyyy-MM-dd');
    const log = allLogs.find(l => l.date === dateStr);
    
    if (log && log.tasks.some(t => t.completed)) {
      streakCounter++;
      checkDate = addDays(checkDate, -1);
    } else {
      if (isSameDay(checkDate, today)) {
        checkDate = addDays(checkDate, -1);
        continue;
      }
      break;
    }
  }
  currentStreak = streakCounter;

  const progressPercentage = totalTasksCount > 0 ? (completedTasksCount / totalTasksCount) * 100 : 0;
  const commitmentRate = assignedTasksUntilNow > 0 ? (completedTasksCount / assignedTasksUntilNow) * 100 : 100;

  return {
    progressPercentage: Math.min(100, Math.round(progressPercentage)),
    commitmentRate: Math.min(100, Math.round(commitmentRate)),
    streak: currentStreak,
    totalPagesMemorized,
    totalTasksCount,
    completedTasksCount
  };
};
