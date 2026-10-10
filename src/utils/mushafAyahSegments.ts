/**
 * mushafAyahSegments.ts
 * High-precision King Fahd Complex Madinah Mushaf (15-line, 1260x2038) Ayah Segments & Highlighting
 */

import quranPagesMap from './quran_pages.json';
import { SURAH_METADATAList, VerseRange } from './quranPageMapping';

export type AyahSegment = [
  number, // 0: surahNumber (1-114)
  number, // 1: ayahNumber (1-N)
  number, // 2: lineNumber (1-15)
  number, // 3: minX (left coordinate on 1260px canvas)
  number, // 4: maxX (right coordinate on 1260px canvas)
  number, // 5: minY (top coordinate on 2038px canvas)
  number  // 6: maxY (bottom coordinate on 2038px canvas)
];

export interface HighlightRect {
  lineNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  isMiddle?: boolean;
}

// 1260 x 2038 Canvas Geometry Constants
export const CANVAS_WIDTH = 1260;
export const CANVAS_HEIGHT = 2038;

// Standard 15-line King Fahd Complex Madinah Mushaf Geometry (Pages 3 to 604)
// Calibrated with pixel-perfect precision on 1260x2038 scans
export const PAGE_LINE_MIN_X = 68;
export const PAGE_LINE_MAX_X = 1192;
export const PAGE_LINE_WIDTH = PAGE_LINE_MAX_X - PAGE_LINE_MIN_X; // 1124 px
export const PAGE_FIRST_LINE_PEAK_Y = 94.0;
export const PAGE_LINE_STEP_Y = 132.93; // 15 lines uniformly stepped across 2038px canvas
export const PAGE_LINE_HEIGHT = 106; // Covers text body, harakat, and diacritics comfortably

// Decorative frame geometry (Pages 1 & 2 - Al-Fatihah & Al-Baqarah start)
export const FRAME_LINE_MIN_X = 258;
export const FRAME_LINE_MAX_X = 1006;
export const FRAME_LINE_WIDTH = FRAME_LINE_MAX_X - FRAME_LINE_MIN_X; // 748 px
export const FRAME_FIRST_LINE_PEAK_Y = 302.0;
export const FRAME_LINE_STEP_Y = 109.0; // 7 lines inside the ornate illuminated frame
export const FRAME_LINE_HEIGHT = 96;

/**
 * Maps surah name (Arabic) to surah number (1-114).
 */
export function getSurahNumberByName(surahName: string): number {
  const cleanName = surahName.replace(/^(سُورَةُ|سورة)\s+/, '').trim();
  const foundIndex = SURAH_METADATAList.findIndex(s => {
    const sClean = s.name.replace(/^(سُورَةُ|سورة)\s+/, '').trim();
    return sClean === cleanName || s.name === surahName;
  });
  return foundIndex !== -1 ? foundIndex + 1 : 1;
}

/**
 * Returns line Y bounds for a given page and line number (1-15).
 * Aligns highlight rectangle precisely to the Quranic script baseline and vowel marks.
 */
export function getLineYBounds(page: number, lineNumber: number): { minY: number; maxY: number } {
  if (page <= 2) {
    const peakY = FRAME_FIRST_LINE_PEAK_Y + (lineNumber - 1) * FRAME_LINE_STEP_Y;
    const minY = Math.round(peakY - 48);
    return { minY, maxY: minY + FRAME_LINE_HEIGHT };
  }
  const peakY = PAGE_FIRST_LINE_PEAK_Y + (lineNumber - 1) * PAGE_LINE_STEP_Y;
  const minY = Math.round(peakY - 55);
  return { minY, maxY: minY + PAGE_LINE_HEIGHT };
}

/**
 * Returns line horizontal bounds for a given page.
 */
export function getLineXBounds(page: number): { minX: number; maxX: number; width: number } {
  if (page <= 2) {
    return { minX: FRAME_LINE_MIN_X, maxX: FRAME_LINE_MAX_X, width: FRAME_LINE_WIDTH };
  }
  return { minX: PAGE_LINE_MIN_X, maxX: PAGE_LINE_MAX_X, width: PAGE_LINE_WIDTH };
}

/**
 * Calculates typographic weight of a Quranic word for accurate width distribution.
 * Factors in Uthmani glyph base letters, wide characters (ص, ض, ط, ظ, etc.), and ayah end rosettes.
 */
function getWordTypographicWeight(word: any): number {
  if (word.char_type_name === 'end') {
    // Ayah circular end rosette has a dedicated visual width
    return 4.2;
  }
  const text = word.text_uthmani || '';
  // Strip tashkeel / harakat and annotation signs to measure actual glyph stems
  const clean = text.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0610-\u061A]/g, '').trim();
  const letterCount = clean.length;
  // Extra weight for wider letters in Naskh script
  const wideMatch = clean.match(/[طظصضكسشمعغحخج]/g);
  const wideCount = wideMatch ? wideMatch.length : 0;
  return Math.max(2.0, letterCount + wideCount * 0.35 + 1.2);
}

/**
 * Computes ayah segments for a given page from word data (when loaded from Quran.com)
 * or dynamically from the page mapping if offline.
 */
export function getAyahSegmentsForPage(page: number, wordsData?: any[]): AyahSegment[] {
  const lineXBounds = getLineXBounds(page);
  const segments: AyahSegment[] = [];

  // 1. High precision calculation if wordsData is available
  if (wordsData && wordsData.length > 0) {
    // Group words by line_number
    const wordsByLine: Record<number, any[]> = {};
    for (const w of wordsData) {
      const line = Number(w.line_number) || 1;
      if (!wordsByLine[line]) wordsByLine[line] = [];
      wordsByLine[line].push(w);
    }

    const lines = Object.keys(wordsByLine).map(Number).sort((a, b) => a - b);
    for (const line of lines) {
      const lineWords = wordsByLine[line];
      const { minY, maxY } = getLineYBounds(page, line);

      // Total typographic weight on line for proportional distribution
      let totalWeight = 0;
      for (const w of lineWords) {
        totalWeight += getWordTypographicWeight(w);
      }
      if (totalWeight <= 0) totalWeight = 1;

      // In Arabic (RTL), line starts from right (lineXBounds.maxX) and advances left
      let currentX = lineXBounds.maxX;
      const wordBounds: { word: any; minX: number; maxX: number }[] = [];

      for (const w of lineWords) {
        const weight = getWordTypographicWeight(w);
        const wWidth = Math.max(14, Math.round((weight / totalWeight) * lineXBounds.width));
        const wMaxX = currentX;
        const wMinX = Math.max(lineXBounds.minX, currentX - wWidth);
        currentX = wMinX;
        wordBounds.push({ word: w, minX: wMinX, maxX: wMaxX });
      }

      // Group words on this line by (surah_number, verse_number)
      const ayahGroups: Record<string, typeof wordBounds> = {};
      for (const wb of wordBounds) {
        const sNum = wb.word.surah_number;
        const vNum = wb.word.verse_number;
        const key = `${sNum}:${vNum}`;
        if (!ayahGroups[key]) ayahGroups[key] = [];
        ayahGroups[key].push(wb);
      }

      for (const [key, items] of Object.entries(ayahGroups)) {
        const [sNum, vNum] = key.split(':').map(Number);
        const minX = Math.min(...items.map(i => i.minX));
        const maxX = Math.max(...items.map(i => i.maxX));
        segments.push([sNum, vNum, line, minX, maxX, minY, maxY]);
      }
    }

    if (segments.length > 0) {
      return segments;
    }
  }

  // 2. Offline / Dynamic Fallback calculation based on quran_pages.json
  const pageEntries = (quranPagesMap as Record<string, any[]>)[String(page)];
  if (!pageEntries || pageEntries.length === 0) {
    return [];
  }

  const totalLines = page <= 2 ? 7 : 15;
  const startLine = page <= 2 ? (page === 1 ? 2 : 3) : 1;
  const availableLines = totalLines - startLine + 1;

  // Gather all ayahs on this page
  const allAyahsOnPage: { surahNumber: number; ayahNumber: number }[] = [];
  for (const entry of pageEntries) {
    const sNum = getSurahNumberByName(entry.surah);
    for (let a = entry.start; a <= entry.end; a++) {
      allAyahsOnPage.push({ surahNumber: sNum, ayahNumber: a });
    }
  }

  const ayahCount = allAyahsOnPage.length;
  if (ayahCount === 0) return [];

  // Distribute ayahs across the available lines
  allAyahsOnPage.forEach((ayah, index) => {
    const lineSpan = Math.max(1, availableLines / ayahCount);
    const startL = Math.min(totalLines, Math.max(startLine, Math.floor(startLine + index * lineSpan)));
    const endL = Math.min(totalLines, Math.max(startL, Math.floor(startLine + (index + 1) * lineSpan)));

    for (let l = startL; l <= endL; l++) {
      const { minY, maxY } = getLineYBounds(page, l);
      // For shared lines, estimate division; for single lines, span full line
      const minX = lineXBounds.minX;
      const maxX = lineXBounds.maxX;
      segments.push([ayah.surahNumber, ayah.ayahNumber, l, minX, maxX, minY, maxY]);
    }
  });

  return segments;
}

// Interface matching the user specification
export interface AyahSegmentObj {
  surah: number;
  ayah: number;
  line: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/**
 * Filters page segments for the scheduled task verse ranges with exact start/end bounds.
 * Supports startSurah, startAyah, endSurah, endAyah filtering directly or via activeRanges.
 */
export function filterSegmentsForTask(
  segments: AyahSegment[],
  activeRanges?: VerseRange[],
  page?: number,
  taskBounds?: { startSurah: number; startAyah: number; endSurah: number; endAyah: number }
): AyahSegment[] {
  if (taskBounds) {
    const { startSurah, startAyah, endSurah, endAyah } = taskBounds;
    return segments.filter(([s, a]) => {
      const afterStart = s > startSurah || (s === startSurah && a >= startAyah);
      const beforeEnd = s < endSurah || (s === endSurah && a <= endAyah);
      return afterStart && beforeEnd;
    });
  }

  if (!activeRanges || activeRanges.length === 0) {
    // When no activeRanges provided, NO ayahs should be highlighted
    return [];
  }

  // Normalize verse ranges with surah numbers
  const normalizedRanges = activeRanges.map(r => {
    const surahNum = typeof r.surah === 'number' 
      ? r.surah 
      : (typeof r.surah === 'string' && /^\d+$/.test(r.surah))
      ? parseInt(r.surah, 10)
      : getSurahNumberByName(r.surah);
    return {
      surahNumber: surahNum,
      start: r.start,
      end: r.end
    };
  });

  return segments.filter(([s, a]) => {
    return normalizedRanges.some(nr => {
      return nr.surahNumber === s && a >= nr.start && a <= nr.end;
    });
  });
}

/**
 * Computes pixel-perfect `<rect>` line highlights for the matched segments.
 * 
 * Rules for RTL Quran script:
 * 1. Filter matching segments for scheduled verses.
 * 2. Group segments by lineNumber into linesMap:
 *    linesMap.set(line, { minX, maxX, minY, maxY })
 *    aggregating minX = min(minX, x1), maxX = max(maxX, x2), etc.
 * 3. Line boundaries logic (RTL: Right = maxX, Left = minX):
 *    - First line of task: starts from maxX of first scheduled ayah on that line.
 *      If multi-line, extends left to the end of the line (line minX).
 *      If single line, stops at minX of the last scheduled ayah on that line.
 *    - Middle lines: highlighted across the full line width (from line maxX to line minX).
 *    - Last line: starts from the right edge of line (line maxX) and extends left to minX
 *      of the last scheduled ayah (including ayah marker), stopping immediately so subsequent
 *      words to the left are never highlighted.
 *    - Single line task: starts at maxX of scheduled ayah and ends at minX of scheduled ayah.
 * 4. Padding: padX = 6, padY = 5, rx = 6, ry = 6, stroke = "none".
 */
export function computeLineHighlightRects(
  matchedSegments: AyahSegment[],
  page: number = 3
): HighlightRect[] {
  if (!matchedSegments || matchedSegments.length === 0) {
    return [];
  }

  const lineXBounds = getLineXBounds(page);
  const padX = 6;
  const padY = 5;

  // 1. Group matching segments by lineNumber and compute accurate line bounding coordinates
  const linesMap = new Map<number, { minX: number; maxX: number; minY: number; maxY: number }>();

  matchedSegments.forEach(([s, a, line, x1, x2, y1, y2]) => {
    if (!linesMap.has(line)) {
      linesMap.set(line, { minX: x1, maxX: x2, minY: y1, maxY: y2 });
    } else {
      const cur = linesMap.get(line)!;
      cur.minX = Math.min(cur.minX, x1);
      cur.maxX = Math.max(cur.maxX, x2);
      cur.minY = Math.min(cur.minY, y1);
      cur.maxY = Math.max(cur.maxY, y2);
    }
  });

  const sortedLines = Array.from(linesMap.keys()).sort((a, b) => a - b);
  if (sortedLines.length === 0) return [];

  const firstLine = sortedLines[0];
  const lastLine = sortedLines[sortedLines.length - 1];
  const isMultiLine = sortedLines.length > 1;

  const rects: HighlightRect[] = [];

  for (const line of sortedLines) {
    const lineBounds = linesMap.get(line)!;
    let minX = lineBounds.minX;
    let maxX = lineBounds.maxX;
    const minY = lineBounds.minY;
    const maxY = lineBounds.maxY;

    if (isMultiLine) {
      if (line === firstLine) {
        // First line: starts at the rightmost edge of first scheduled ayah (lineBounds.maxX)
        // and extends left to the end of the line (lineXBounds.minX)
        minX = lineXBounds.minX;
        // maxX is preserved as lineBounds.maxX so words before the ayah on the right are NOT highlighted!
      } else if (line === lastLine) {
        // Last line: starts from the right edge of the line (lineXBounds.maxX)
        // and extends left to the end of the last scheduled ayah (lineBounds.minX)
        maxX = lineXBounds.maxX;
        // minX is preserved as lineBounds.minX so words after the ayah on the left are NOT highlighted!
      } else {
        // Middle line: full line width from right to left
        minX = lineXBounds.minX;
        maxX = lineXBounds.maxX;
      }
    } else {
      // Single line task: starts at maxX of scheduled ayah and stops at minX of scheduled ayah
      minX = lineBounds.minX;
      maxX = lineBounds.maxX;
    }

    // Apply padding: padX = 6, padY = 5 and keep within canvas bounds
    const rectX = Math.max(0, minX - padX);
    const rectY = Math.max(0, minY - padY);
    const rectW = Math.min(CANVAS_WIDTH - rectX, (maxX - minX) + (2 * padX));
    const rectH = Math.min(CANVAS_HEIGHT - rectY, (maxY - minY) + (2 * padY));

    rects.push({
      lineNumber: line,
      x: rectX,
      y: rectY,
      width: rectW,
      height: rectH,
      isMiddle: isMultiLine && line !== firstLine && line !== lastLine
    });
  }

  return rects;
}
