import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Loader2,
  ChevronDown,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  Square,
  Volume2,
  Share2,
  Copy,
  Check,
  Plus,
  Minus
} from 'lucide-react';
import {
  VerseRange,
  getActiveVersesForPageAndTask,
  getVerseRangeForPage,
  SURAH_METADATAList
} from '../../utils/quranPageMapping';
import { getVersesRangeText } from '../../utils/offlineQuranData';
import { AyahShareModal, AyahShareTarget } from './AyahShareModal';
import { unlockOrientation } from '../../utils/orientation';
import { useAudio } from '../../context/AudioContext';
import { JUZ_PAGES } from '../../utils/planGenerator';
import { QURAN_QUARTERS } from '../../utils/quranQuarters';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  getAyahSegmentsForPage,
  filterSegmentsForTask,
  computeLineHighlightRects,
  AyahSegment,
  getSurahNumberByName,
  FRAME_FIRST_LINE_PEAK_Y,
  PAGE_FIRST_LINE_PEAK_Y,
  FRAME_LINE_STEP_Y,
  PAGE_LINE_STEP_Y
} from '../../utils/mushafAyahSegments';

// In-memory cache for Quran.com words
const memoryWordsCache: Record<number, any[]> = {};

interface QuranViewerProps {
  isOpen: boolean;
  onClose: () => void;
  pages: number[];
  taskTitle: string;
  verseRanges?: VerseRange[];
  customSequenceMode?: boolean;
  ayahRepeat?: number;
  sequenceRepeat?: number;
  isFreeReading?: boolean;
}

/**
 * Helper to compute Juz and Hizb text for a given page
 */
function getJuzAndHizbOfPage(page: number | undefined): { juz: number; hizbText: string } {
  if (!page) return { juz: 1, hizbText: 'الحزب 1' };

  let juz = 1;
  for (let j = 1; j <= 30; j++) {
    const pInfo = JUZ_PAGES[j];
    if (pInfo && page >= pInfo.start && page <= pInfo.end) {
      juz = j;
      break;
    }
  }

  let hizbText = `الجزء ${juz}`;
  const quarter = QURAN_QUARTERS.find(q => page >= q.startPage && page <= q.endPage);
  if (quarter) {
    const qNum = quarter.number;
    const hizb = Math.ceil(qNum / 4);
    const quarterIdx = (qNum - 1) % 4;

    if (quarterIdx === 0) {
      hizbText = `الحزب ${hizb}`;
    } else if (quarterIdx === 1) {
      hizbText = `¼ الحزب ${hizb}`;
    } else if (quarterIdx === 2) {
      hizbText = `½ الحزب ${hizb}`;
    } else if (quarterIdx === 3) {
      hizbText = `¾ الحزب ${hizb}`;
    }
  }

  return { juz, hizbText };
}

/**
 * Fallback image URL cascade
 */
export const getPageImageUrl = (page: number | undefined, fallbackStep: number = 0) => {
  if (page === undefined || page === null || isNaN(page)) return '';
  const pagePad = page.toString().padStart(3, '0');
  if (fallbackStep === 0) {
    return `https://files.quran.app/hafs/madani/width_1260/page${pagePad}.png`;
  } else if (fallbackStep === 1) {
    return `https://android.quran.com/data/width_1260/page${pagePad}.png`;
  } else if (fallbackStep === 2) {
    return `https://android.quran.com/data/width_1024/page${pagePad}.png`;
  } else if (fallbackStep === 3) {
    return `https://everyayah.com/data/quranpages_png/${pagePad}.png`;
  } else if (fallbackStep === 4) {
    return `https://static.quran.com/images/pages/page${pagePad}.png`;
  } else {
    return `https://files.quran.app/hafs/madani/width_1024/page${pagePad}.png`;
  }
};

interface QuranPageCardProps {
  pageNumber: number;
  boxWidth: number;
  boxHeight: number;
  isFreeReading?: boolean;
  isWholeQuran?: boolean;
  taskTitle: string;
  activeSubsets: VerseRange[];
  selectedRange: {
    surah: number;
    surahName: string;
    startAyah: number;
    endAyah: number;
  } | null;
  playingAyahSegments: AyahSegment[];
  quranWords: any[] | null;
  registerContainerRef: (node: HTMLDivElement | null) => void;
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerCancel: (e: React.PointerEvent<HTMLDivElement>) => void;
  onClick: (e: React.MouseEvent<HTMLDivElement>) => void;
}

const QuranPageCard: React.FC<QuranPageCardProps> = ({
  pageNumber,
  boxWidth,
  boxHeight,
  isFreeReading,
  isWholeQuran,
  taskTitle,
  activeSubsets,
  selectedRange,
  playingAyahSegments,
  quranWords,
  registerContainerRef,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onClick
}) => {
  const [fallbackStep, setFallbackStep] = useState(0);
  const [imgSrc, setImgSrc] = useState<string>(() => getPageImageUrl(pageNumber, 0));

  useEffect(() => {
    let active = true;
    let blobUrl: string | null = null;

    const resolveImage = async () => {
      if ('caches' in window) {
        try {
          const cache = await caches.open('quran-images-v1');
          const pagePad = pageNumber.toString().padStart(3, '0');
          const candidates = [
            `https://files.quran.app/hafs/madani/width_1260/page${pagePad}.png`,
            `https://android.quran.com/data/width_1260/page${pagePad}.png`,
            `https://android.quran.com/data/width_1024/page${pagePad}.png`,
            `https://everyayah.com/data/quranpages_png/${pagePad}.png`,
            `https://static.quran.com/images/pages/page${pagePad}.png`,
            `https://files.quran.app/hafs/madani/width_1024/page${pagePad}.png`
          ];

          for (const cand of candidates) {
            const cachedRes = await cache.match(cand);
            if (cachedRes) {
              const blob = await cachedRes.blob();
              if (blob && blob.size > 0 && active) {
                blobUrl = URL.createObjectURL(blob);
                setImgSrc(blobUrl);
                return;
              }
            }
          }
        } catch (e) {
          console.warn('Image cache check error:', e);
        }
      }

      if (active) {
        const directUrl = getPageImageUrl(pageNumber, fallbackStep);
        setImgSrc(directUrl);

        if (navigator.onLine && 'caches' in window && directUrl) {
          fetch(directUrl)
            .then(async res => {
              if (res.ok) {
                const cache = await caches.open('quran-images-v1');
                await cache.put(directUrl, res.clone());
              }
            })
            .catch(() => {});
        }
      }
    };

    resolveImage();

    return () => {
      active = false;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [pageNumber, fallbackStep]);

  const handleImageError = () => {
    if (fallbackStep < 5) {
      setFallbackStep(prev => prev + 1);
    }
  };

  const pageSegments = useMemo(() => {
    return getAyahSegmentsForPage(pageNumber, quranWords || undefined);
  }, [pageNumber, quranWords]);

  // If isFreeReading, full Quran, browsing, or no active subsets, task highlighting is COMPLETELY DISABLED
  const matchedTaskSegments = useMemo(() => {
    const isBrowsingQuran = isFreeReading || 
      isWholeQuran ||
      !taskTitle ||
      taskTitle === 'المصحف كاملاً' || 
      taskTitle.includes('المصحف') || 
      taskTitle.includes('كامل') || 
      taskTitle.startsWith('سورة ') || 
      taskTitle.startsWith('الجزء ') || 
      taskTitle.startsWith('الحزب ') || 
      taskTitle.includes('استماع') || 
      taskTitle.includes('تصفح') ||
      taskTitle.includes('قراءة');

    if (isBrowsingQuran || !activeSubsets || activeSubsets.length === 0) {
      return [];
    }
    return filterSegmentsForTask(pageSegments, activeSubsets, pageNumber);
  }, [pageSegments, activeSubsets, pageNumber, isFreeReading, isWholeQuran, taskTitle]);

  const highlightRects = useMemo(() => {
    if (matchedTaskSegments.length === 0) {
      return [];
    }
    return computeLineHighlightRects(matchedTaskSegments, pageNumber);
  }, [matchedTaskSegments, pageNumber]);

  const selectedSegments = useMemo(() => {
    if (!selectedRange) return [];
    return pageSegments.filter(([s, a]) => {
      return s === selectedRange.surah && a >= selectedRange.startAyah && a <= selectedRange.endAyah;
    });
  }, [pageSegments, selectedRange]);

  const selectedHighlightRects = useMemo(() => {
    if (selectedSegments.length === 0) return [];
    return computeLineHighlightRects(selectedSegments, pageNumber);
  }, [selectedSegments, pageNumber]);

  const playingAyahRects = useMemo(() => {
    if (!playingAyahSegments || playingAyahSegments.length === 0) return [];
    return computeLineHighlightRects(playingAyahSegments, pageNumber);
  }, [playingAyahSegments, pageNumber]);

  return (
    <div
      ref={registerContainerRef}
      data-quran-page-card="true"
      data-page-number={pageNumber}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onClick={onClick}
      onContextMenu={e => e.preventDefault()}
      draggable={false}
      style={{
        width: `${boxWidth}px`,
        height: `${boxHeight}px`,
        aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}`,
        touchAction: 'none',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none'
      }}
      className="relative bg-[#FFFDF9] dark:bg-[#1C1C1E] rounded-xl sm:rounded-2xl border-2 sm:border-4 border-double border-amber-950/20 dark:border-amber-500/20 shadow-2xl overflow-hidden flex items-center justify-center select-none"
    >
      {imgSrc ? (
        <img
          src={imgSrc}
          alt={`مصحف المدينة النبوية - صفحة ${pageNumber}`}
          className="w-full h-full object-fill select-none dark:invert dark:hue-rotate-180 transition-all duration-300 pointer-events-none"
          onError={handleImageError}
          loading="eager"
          referrerPolicy="no-referrer"
        />
      ) : null}

      <svg
        viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full pointer-events-none z-20"
      >
        <defs>
          <linearGradient id="taskHighlightGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.28" />
            <stop offset="35%" stopColor="#fbbf24" stopOpacity="0.25" />
            <stop offset="65%" stopColor="#fbbf24" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.28" />
          </linearGradient>

          <linearGradient id="playingAyahGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.32" />
            <stop offset="50%" stopColor="#34d399" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.32" />
          </linearGradient>

          <linearGradient id="selectedAyahGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0284c7" stopOpacity="0.35" />
            <stop offset="35%" stopColor="#38bdf8" stopOpacity="0.30" />
            <stop offset="65%" stopColor="#38bdf8" stopOpacity="0.30" />
            <stop offset="100%" stopColor="#0284c7" stopOpacity="0.35" />
          </linearGradient>
        </defs>

        {/* Scheduled Task Line Highlight Rectangles */}
        {highlightRects.map((rect, idx) => (
          <rect
            key={`task-hl-${rect.lineNumber}-${idx}`}
            x={rect.x}
            y={rect.y}
            width={rect.width}
            height={rect.height}
            rx="6"
            ry="6"
            stroke="none"
            fill="url(#taskHighlightGrad)"
            style={{ mixBlendMode: 'multiply' }}
          />
        ))}

        {/* Selected Ayah / Range Line Highlight Rectangles */}
        {selectedHighlightRects.map((rect, idx) => (
          <rect
            key={`sel-hl-${rect.lineNumber}-${idx}`}
            x={rect.x}
            y={rect.y}
            width={rect.width}
            height={rect.height}
            rx="6"
            ry="6"
            stroke="none"
            fill="url(#selectedAyahGrad)"
            style={{ mixBlendMode: 'multiply' }}
          />
        ))}

        {/* Currently Recited Ayah Line Highlight Rectangles */}
        {playingAyahRects.map((rect, idx) => (
          <rect
            key={`play-hl-${rect.lineNumber}-${idx}`}
            x={rect.x}
            y={rect.y}
            width={rect.width}
            height={rect.height}
            rx="6"
            ry="6"
            stroke="none"
            fill="url(#playingAyahGrad)"
            style={{ mixBlendMode: 'multiply' }}
          />
        ))}
      </svg>
    </div>
  );
};

export function QuranViewer({
  isOpen,
  onClose,
  pages,
  taskTitle,
  verseRanges,
  customSequenceMode,
  ayahRepeat,
  sequenceRepeat,
  isFreeReading = false
}: QuranViewerProps) {
  const {
    activeAyahs,
    playingAyahIndex,
    isPlaying,
    togglePlay,
    nextAyah,
    prevAyah,
    updatePlaybackSettings,
    currentSpeed,
    currentQari,
    audioProgress,
    playingTaskId,
    restartFromBeginning,
    stopAudio,
    playPages,
    playCustomSequence
  } = useAudio();

  const [effectivePageIndex, setEffectivePageIndex] = useState(0);
  const [effectivePages, setEffectivePages] = useState<number[]>(pages);
  const [areControlsVisible, setAreControlsVisible] = useState(false);
  const [headerHeight, setHeaderHeight] = useState<number>(92);
  const headerRef = useRef<HTMLDivElement>(null);

  const [loadingText, setLoadingText] = useState(false);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const measurementRef = useRef<HTMLDivElement>(null);

  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [isLandscape, setIsLandscape] = useState(false);

  // Sync pages when opened or changed
  useEffect(() => {
    if (pages && pages.length > 0) {
      setEffectivePages(pages);
      setEffectivePageIndex(0);
    }
  }, [pages, isOpen]);

  // Handle header height dynamically
  useEffect(() => {
    if (headerRef.current) {
      setHeaderHeight(headerRef.current.offsetHeight);
    }
  }, [areControlsVisible]);

  // Window resize & orientation detection
  useEffect(() => {
    const updateSize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setContainerSize({ width: w, height: h });
      setIsLandscape(w > h);
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    window.addEventListener('orientationchange', updateSize);

    return () => {
      window.removeEventListener('resize', updateSize);
      window.removeEventListener('orientationchange', updateSize);
    };
  }, []);

  // Screen Wake Lock while reading
  useEffect(() => {
    if (!isOpen) return;

    let wakeLock: any = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err) {
        console.warn('Screen Wake Lock error:', err);
      }
    };

    requestWakeLock();
    unlockOrientation();

    return () => {
      if (wakeLock) {
        wakeLock.release().catch(() => {});
      }
    };
  }, [isOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (isDropdownOpen && dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  const currentPage = effectivePages[effectivePageIndex];
  const { hizbText: currentHizbText } = getJuzAndHizbOfPage(currentPage);

  // Preload adjacent pages for instant zero-latency page turns
  useEffect(() => {
    if (!currentPage) return;
    const preloadList = [currentPage + 1, currentPage - 1, currentPage + 2];
    preloadList.forEach(p => {
      if (p >= 1 && p <= 604) {
        const url = getPageImageUrl(p, 0);
        const img = new Image();
        img.src = url;
      }
    });
  }, [currentPage]);

  const isWholeQuran = useMemo(() => {
    return !!(
      isFreeReading || 
      (effectivePages && effectivePages.length >= 500) ||
      taskTitle === 'المصحف كاملاً' || 
      taskTitle.includes('المصحف') || 
      taskTitle.includes('كامل')
    );
  }, [isFreeReading, effectivePages, taskTitle]);

  // Compute Active Verse Subsets for current page (clean unhighlighted if isFreeReading or taskTitle is full quran)
  const activeSubsets: VerseRange[] = useMemo(() => {
    const isBrowsingQuran = isWholeQuran || 
      isFreeReading || 
      !taskTitle ||
      taskTitle === 'المصحف كاملاً' || 
      taskTitle.includes('المصحف') || 
      taskTitle.includes('كامل') || 
      taskTitle.startsWith('سورة ') || 
      taskTitle.startsWith('الجزء ') || 
      taskTitle.startsWith('الحزب ') || 
      taskTitle.includes('استماع') || 
      taskTitle.includes('تصفح') ||
      taskTitle.includes('قراءة');
    if (isBrowsingQuran) return [];
    if (!currentPage) return [];

    if (verseRanges && verseRanges.length > 0) {
      const pageRanges = getVerseRangeForPage(currentPage);
      const subsets: VerseRange[] = [];
      verseRanges.forEach(vr => {
        pageRanges.forEach(pr => {
          if (vr.surah === pr.surah) {
            const start = Math.max(vr.start, pr.start);
            const end = Math.min(vr.end, pr.end);
            if (start <= end) {
              subsets.push({ surah: vr.surah, start, end });
            }
          }
        });
      });
      return subsets;
    }

    return getActiveVersesForPageAndTask(currentPage, taskTitle);
  }, [currentPage, verseRanges, taskTitle, isFreeReading]);

  const [quranWords, setQuranWords] = useState<any[] | null>(null);

  // Fetch words from Quran.com to refine line coordinates and word bounds
  useEffect(() => {
    if (!currentPage || !isOpen) return;

    let isMounted = true;
    const fetchPageWords = async () => {
      if (memoryWordsCache[currentPage]) {
        if (isMounted) {
          setQuranWords(memoryWordsCache[currentPage]);
          setLoadingText(false);
        }
        return;
      }

      setQuranWords(null);
      setLoadingText(true);
      try {
        const wordsUrl = `https://api.quran.com/api/v4/verses/by_page/${currentPage}?words=true&word_fields=text_uthmani,line_number&per_page=50`;
        let wordsData: any = null;

        if ('caches' in window) {
          try {
            const cache = await caches.open('quran-words-v1');
            const cachedRes = await cache.match(wordsUrl);
            if (cachedRes) {
              wordsData = await cachedRes.json();
            }
          } catch (cacheErr) {
            console.warn('Words cache read error:', cacheErr);
          }
        }

        if (!wordsData) {
          const response = await fetch(wordsUrl);
          if (response.ok) {
            wordsData = await response.json();
            if (wordsData && 'caches' in window) {
              try {
                const cache = await caches.open('quran-words-v1');
                await cache.put(wordsUrl, new Response(JSON.stringify(wordsData)));
              } catch (cacheStoreErr) {
                console.warn('Words cache store error:', cacheStoreErr);
              }
            }
          }
        }

        if (isMounted && wordsData && wordsData.verses) {
          const wordsList: any[] = [];
          for (const verse of wordsData.verses) {
            const [surahNum, verseNum] = verse.verse_key.split(':').map(Number);
            if (verse.words) {
              for (const w of verse.words) {
                wordsList.push({
                  id: w.id,
                  position: w.position,
                  text_uthmani: w.text_uthmani,
                  char_type_name: w.char_type_name,
                  line_number: w.line_number,
                  verse_key: verse.verse_key,
                  verse_number: verseNum,
                  surah_number: surahNum
                });
              }
            }
          }
          if (wordsList.length > 0) {
            setQuranWords(wordsList);
            memoryWordsCache[currentPage] = wordsList;
          }
        }
      } catch (err) {
        console.warn('Could not fetch word boundaries, using mathematical layout:', err);
      } finally {
        if (isMounted) setLoadingText(false);
      }
    };

    fetchPageWords();
    return () => {
      isMounted = false;
    };
  }, [currentPage, isOpen]);

  // Compute Ayah Segments and Line Highlight Rectangles
  const pageSegments = useMemo(() => {
    return getAyahSegmentsForPage(currentPage, quranWords || undefined);
  }, [currentPage, quranWords]);

  // Playing Ayah segments (when recitation is active)
  const playingAyahSegments = useMemo(() => {
    const currentPlaying = activeAyahs[playingAyahIndex];
    if (!currentPlaying) return [];
    return pageSegments.filter(
      ([sNum, aNum]) => sNum === currentPlaying.surah.number && aNum === currentPlaying.numberInSurah
    );
  }, [pageSegments, activeAyahs, playingAyahIndex]);

  // -------------------------------------------------------------------------
  // Long-Press & Continuous Touch: Ayah / Range Selection
  // -------------------------------------------------------------------------
  const [selectedRange, setSelectedRange] = useState<{
    surah: number;
    surahName: string;
    startAyah: number;
    endAyah: number;
  } | null>(null);

  const [shareModalTarget, setShareModalTarget] = useState<AyahShareTarget | null>(null);

  const pageContainerRef = useRef<HTMLDivElement | null>(null);
  const pressedCardRef = useRef<HTMLElement | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pointerStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const wasLongPressTriggeredRef = useRef<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const registerPageContainer = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      pageContainerRef.current = node;
    } else if (pageContainerRef.current && !pageContainerRef.current.isConnected) {
      pageContainerRef.current = null;
    }
  }, []);

  const cancelLongPress = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedRange(null);
    cancelLongPress();
    pointerStartPosRef.current = null;
    pressedCardRef.current = null;
    wasLongPressTriggeredRef.current = false;
    touchStartRef.current = null;
    mouseStartRef.current = null;
    isSwipingRef.current = false;
    setIsDragging(false);
    setDragOffset(0);
  }, [cancelLongPress]);

  // Clear selection on page turn
  useEffect(() => {
    clearSelection();
  }, [currentPage, clearSelection]);

  const findAyahAtCoordinates = useCallback(
    (svgX: number, svgY: number, targetPage?: number): { surah: number; ayah: number } | null => {
      const activePage = targetPage || currentPage;
      const currentSegments = (pageSegments && pageSegments.length > 0)
        ? pageSegments
        : getAyahSegmentsForPage(activePage, quranWords || undefined);

      // 1. Check loaded pageSegments (high precision word/ayah bounds)
      if (currentSegments && currentSegments.length > 0) {
        // Direct segment match with generous bounding box (+24px vertically, +20px horizontally)
        for (const seg of currentSegments) {
          const [s, a, , x1, x2, y1, y2] = seg;
          if (svgY >= y1 - 24 && svgY <= y2 + 24 && svgX >= Math.min(x1, x2) - 20 && svgX <= Math.max(x1, x2) + 20) {
            return { surah: s, ayah: a };
          }
        }

        // Proximity line match
        let closestLine = -1;
        let minLineDist = Infinity;
        for (const seg of currentSegments) {
          const [, , line, , , y1, y2] = seg;
          const lineCenterY = (y1 + y2) / 2;
          const distY = Math.abs(svgY - lineCenterY);
          if (distY < minLineDist) {
            minLineDist = distY;
            closestLine = line;
          }
        }

        if (closestLine !== -1 && minLineDist < 120) {
          const lineSegs = currentSegments.filter(s => s[2] === closestLine);
          if (lineSegs.length > 0) {
            // Check if within x-bounds of any segment on this line
            for (const seg of lineSegs) {
              const [, , , x1, x2] = seg;
              const minX = Math.min(x1, x2);
              const maxX = Math.max(x1, x2);
              if (svgX >= minX - 15 && svgX <= maxX + 15) {
                return { surah: seg[0], ayah: seg[1] };
              }
            }
            // If between or near segments on this line, find closest by X
            let bestSeg = lineSegs[0];
            let bestDistX = Infinity;
            for (const seg of lineSegs) {
              const [, , , x1, x2] = seg;
              const minX = Math.min(x1, x2);
              const maxX = Math.max(x1, x2);
              const distX = svgX < minX ? minX - svgX : svgX > maxX ? svgX - maxX : 0;
              if (distX < bestDistX) {
                bestDistX = distX;
                bestSeg = seg;
              }
            }
            if (bestSeg) {
              return { surah: bestSeg[0], ayah: bestSeg[1] };
            }
          }
        }
      }

      // 2. Direct Geometric Line-to-Ayah Mapping Fallback
      // Guaranteed to resolve an ayah on the current page even if words API failed or offline
      const pageRanges = getVerseRangeForPage(activePage);
      if (pageRanges && pageRanges.length > 0) {
        // Collect all verses on this page in reading order
        const allVerses: { surah: number; ayah: number }[] = [];
        for (const r of pageRanges) {
          const sNum = typeof r.surah === 'number'
            ? r.surah
            : (typeof r.surah === 'string' && /^\d+$/.test(r.surah))
            ? parseInt(r.surah, 10)
            : getSurahNumberByName(r.surah);
          for (let v = r.start; v <= r.end; v++) {
            allVerses.push({ surah: sNum, ayah: v });
          }
        }

        if (allVerses.length > 0) {
          // If only 1 ayah on page (e.g. Ayat Al-Kursi or long ayah)
          if (allVerses.length === 1) {
            return allVerses[0];
          }

          // Compute normalized line position (1 to 15, or 1 to 7 for pages 1-2)
          const totalLines = activePage <= 2 ? 7 : 15;
          const firstPeakY = activePage <= 2 ? FRAME_FIRST_LINE_PEAK_Y : PAGE_FIRST_LINE_PEAK_Y;
          const stepY = activePage <= 2 ? FRAME_LINE_STEP_Y : PAGE_LINE_STEP_Y;

          // Estimate line index based on Y coordinate
          let estimatedLine = Math.round((svgY - firstPeakY) / stepY) + 1;
          estimatedLine = Math.max(1, Math.min(totalLines, estimatedLine));

          // Map line to verse index proportionally
          const lineFraction = (estimatedLine - 0.5) / totalLines;
          const verseIndex = Math.min(allVerses.length - 1, Math.max(0, Math.floor(lineFraction * allVerses.length)));
          return allVerses[verseIndex];
        }
      }

      return null;
    },
    [pageSegments, currentPage, quranWords]
  );

  const triggerSelectionAt = (clientX: number, clientY: number, targetEl?: HTMLElement | null) => {
    // Robust active card element resolution:
    // 1. Target element passed directly from the pointer event
    let cardEl: HTMLElement | null = null;
    if (targetEl && targetEl.isConnected) {
      const r = targetEl.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) cardEl = targetEl;
    }
    // 2. Active ref card element if still connected to DOM
    if (!cardEl && pageContainerRef.current && pageContainerRef.current.isConnected) {
      const r = pageContainerRef.current.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) cardEl = pageContainerRef.current;
    }
    // 3. Last pressed card element fallback
    if (!cardEl && pressedCardRef.current && pressedCardRef.current.isConnected) {
      const r = pressedCardRef.current.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) cardEl = pressedCardRef.current;
    }
    // 4. Query current active Quran page card in DOM
    if (!cardEl) {
      const cards = document.querySelectorAll<HTMLDivElement>('[data-quran-page-card="true"]');
      for (let i = cards.length - 1; i >= 0; i--) {
        const c = cards[i];
        if (c.isConnected) {
          const r = c.getBoundingClientRect();
          if (r.width > 0 && r.height > 0) {
            cardEl = c;
            pageContainerRef.current = c;
            break;
          }
        }
      }
    }

    if (!cardEl) return;
    const rect = cardEl.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const svgX = ((clientX - rect.left) / rect.width) * CANVAS_WIDTH;
    const svgY = ((clientY - rect.top) / rect.height) * CANVAS_HEIGHT;

    const targetPage = Number(cardEl.getAttribute('data-page-number')) || currentPage;
    const hit = findAyahAtCoordinates(svgX, svgY, targetPage);
    if (!hit) return;

    try {
      if (navigator.vibrate) navigator.vibrate(50);
    } catch {}

    const meta = SURAH_METADATAList[hit.surah - 1];
    const surahName = meta ? meta.name : `سورة ${hit.surah}`;

    // Always select the targeted ayah cleanly and freshly on long-press
    setSelectedRange({
      surah: hit.surah,
      surahName,
      startAyah: hit.ayah,
      endAyah: hit.ayah
    });
  };

  const startLongPress = (clientX: number, clientY: number, targetEl?: HTMLElement | null) => {
    pointerStartPosRef.current = { x: clientX, y: clientY };
    pressedCardRef.current = targetEl || null;
    wasLongPressTriggeredRef.current = false;
    cancelLongPress();

    // 350ms snappy response window for responsive touch
    longPressTimerRef.current = setTimeout(() => {
      wasLongPressTriggeredRef.current = true;
      triggerSelectionAt(clientX, clientY, pressedCardRef.current);
      // Auto-reset wasLongPressTriggeredRef after 400ms to keep click pipeline pristine
      setTimeout(() => {
        wasLongPressTriggeredRef.current = false;
      }, 400);
    }, 350);
  };

  const handlePagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const currentCard = e.currentTarget;
    if (currentCard) {
      pageContainerRef.current = currentCard;
    }
    startLongPress(e.clientX, e.clientY, currentCard);
  };

  const handlePagePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerStartPosRef.current) return;
    const dist = Math.hypot(
      e.clientX - pointerStartPosRef.current.x,
      e.clientY - pointerStartPosRef.current.y
    );
    // Allow natural finger jitter up to 26px without cancelling the selection hold
    if (dist > 26) {
      cancelLongPress();
    }
  };

  const handlePagePointerUp = () => {
    cancelLongPress();
    pointerStartPosRef.current = null;
  };

  const handlePagePointerCancel = () => {
    if (!wasLongPressTriggeredRef.current) {
      cancelLongPress();
    }
    pointerStartPosRef.current = null;
  };

  const handlePageClick = (e: React.MouseEvent) => {
    if (wasLongPressTriggeredRef.current) {
      e.stopPropagation();
      wasLongPressTriggeredRef.current = false;
      return;
    }

    // If selection toolbar is active and user taps the page, dismiss the selection cleanly
    if (selectedRange) {
      e.stopPropagation();
      clearSelection();
      return;
    }
  };

  const handlePlaySelectedRange = async () => {
    if (!selectedRange) return;
    await playCustomSequence(
      [{ surah: selectedRange.surah, start: selectedRange.startAyah, end: selectedRange.endAyah }],
      ayahRepeat || 1,
      sequenceRepeat || 1
    );
  };

  const handleShareSelectedRange = () => {
    if (!selectedRange) return;
    setShareModalTarget({
      surah: selectedRange.surah,
      surahName: selectedRange.surahName,
      startAyah: selectedRange.startAyah,
      endAyah: selectedRange.endAyah,
      page: currentPage
    });
  };

  // Page Swiping gesture & Navigation
  const [swipeDirection, setSwipeDirection] = useState(0);
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const lastNavTimeRef = useRef<number>(0);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const mouseStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const isSwipingRef = useRef<boolean>(false);

  const goToNextPage = useCallback(() => {
    const now = Date.now();
    if (now - lastNavTimeRef.current < 250) return;
    lastNavTimeRef.current = now;
    if (effectivePageIndex < effectivePages.length - 1) {
      setSwipeDirection(1);
      setEffectivePageIndex(p => p + 1);
    }
  }, [effectivePageIndex, effectivePages.length]);

  const goToPrevPage = useCallback(() => {
    const now = Date.now();
    if (now - lastNavTimeRef.current < 250) return;
    lastNavTimeRef.current = now;
    if (effectivePageIndex > 0) {
      setSwipeDirection(-1);
      setEffectivePageIndex(p => p - 1);
    }
  }, [effectivePageIndex]);

  // Gestures for Touch Screens (Mobile) & Mouse:
  // طلب المستخدم الصريح: "عند التمرير باللمس من اليسار إلى اليمين يجب أن تظهر الصفحة التالية، والعكس صحيح"
  // التمرير من اليسار إلى اليمين (deltaX > 0) -> الانتقال للصفحة التالية
  // التمرير من اليمين إلى اليسار (deltaX < 0) -> الرجوع للصفحة السابقة
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now()
      };
      isSwipingRef.current = false;
      setIsDragging(false);
      setDragOffset(0);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current || e.touches.length !== 1) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - touchStartRef.current.x;
    const deltaY = currentY - touchStartRef.current.y;
    const dist = Math.hypot(deltaX, deltaY);

    // Only initiate swipe drag when horizontal distance clearly exceeds micro-movement jitter (18px)
    if (dist > 18 && Math.abs(deltaX) > 16 && Math.abs(deltaX) > Math.abs(deltaY) * 1.1) {
      isSwipingRef.current = true;
      setIsDragging(true);
      // Interactive translation bounded to 160px for natural spring feel
      const maxOffset = 160;
      const clampedOffset = Math.max(-maxOffset, Math.min(maxOffset, deltaX));
      setDragOffset(clampedOffset);
      cancelLongPress();
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    cancelLongPress();
    setIsDragging(false);
    setDragOffset(0);

    if (!touchStartRef.current || e.changedTouches.length === 0) return;
    const start = touchStartRef.current;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const deltaX = endX - start.x;
    const deltaY = endY - start.y;
    const deltaTime = Date.now() - start.time;
    touchStartRef.current = null;

    if (wasLongPressTriggeredRef.current) {
      wasLongPressTriggeredRef.current = false;
      return;
    }

    // Threshold of 35px or quick flick (< 400ms with 25px)
    const isQuickFlick = deltaTime < 400 && Math.abs(deltaX) > 25;
    const isStandardSwipe = Math.abs(deltaX) > 35 && deltaTime < 750;

    if ((isStandardSwipe || isQuickFlick) && Math.abs(deltaX) > Math.abs(deltaY) * 0.8) {
      // تمرير من اليسار إلى اليمين (deltaX > 0): إظهار الصفحة التالية
      if (deltaX > 0) {
        goToNextPage();
      }
      // تمرير من اليمين إلى اليسار (deltaX < 0): إظهار الصفحة السابقة
      else if (deltaX < 0) {
        goToPrevPage();
      }
    }
  };

  // Mouse gestures for Desktop:
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    mouseStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: Date.now()
    };
    isSwipingRef.current = false;
    setIsDragging(false);
    setDragOffset(0);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!mouseStartRef.current) return;
    const deltaX = e.clientX - mouseStartRef.current.x;
    const deltaY = e.clientY - mouseStartRef.current.y;
    const dist = Math.hypot(deltaX, deltaY);

    if (dist > 10 && Math.abs(deltaX) > Math.abs(deltaY) * 0.8) {
      isSwipingRef.current = true;
      setIsDragging(true);
      const maxOffset = 160;
      setDragOffset(Math.max(-maxOffset, Math.min(maxOffset, deltaX)));
      cancelLongPress();
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    cancelLongPress();
    setIsDragging(false);
    setDragOffset(0);

    if (!mouseStartRef.current) return;
    const start = mouseStartRef.current;
    const deltaX = e.clientX - start.x;
    const deltaY = e.clientY - start.y;
    const deltaTime = Date.now() - start.time;
    mouseStartRef.current = null;

    if (wasLongPressTriggeredRef.current) {
      wasLongPressTriggeredRef.current = false;
      return;
    }

    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 0.8 && deltaTime < 700) {
      // سحب من اليسار إلى اليمين: الصفحة التالية
      if (deltaX > 0) {
        goToNextPage();
      } else if (deltaX < 0) {
        // سحب من اليمين إلى اليسار: الصفحة السابقة
        goToPrevPage();
      }
    }
  };

  // Keyboard navigation support
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === 'ArrowRight') {
        goToNextPage();
      } else if (e.key === 'ArrowLeft') {
        goToPrevPage();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, goToNextPage, goToPrevPage]);

  // مؤثرات حركة تقليب الصفحات الواقعية المتناغمة مع اتجاه التمرير:
  // - عند الانتقال للصفحة التالية (swipeDirection = 1 / التمرير من اليسار إلى اليمين):
  //   الصفحة القديمة تتحرك لليمين (x: > 0) لتكشف عن الصفحة التالية القادمة من اليسار (x: < 0) كما في التمرير الواقعي.
  // - عند الرجوع للصفحة السابقة (swipeDirection = -1 / التمرير من اليمين إلى اليسار):
  //   الصفحة القديمة تتحرك لليسار (x: < 0) وتأتي الصفحة السابقة من اليمين (x: > 0).
  const pageVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? '-100%' : '100%',
      opacity: 0.85,
      scale: 0.98,
      boxShadow: direction > 0 ? '15px 0 30px rgba(0,0,0,0.18)' : '-15px 0 30px rgba(0,0,0,0.18)'
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      boxShadow: '0 0 0 rgba(0,0,0,0)'
    },
    exit: (direction: number) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0.85,
      scale: 0.98,
      boxShadow: direction > 0 ? '15px 0 30px rgba(0,0,0,0.18)' : '-15px 0 30px rgba(0,0,0,0.18)'
    })
  };

  // Dimensions based on King Fahd Complex aspect ratio (1260 / 2038)
  const mushafAspectRatio = CANVAS_WIDTH / CANVAS_HEIGHT; // ~0.61825
  const paddingX = containerSize.width < 500 ? 12 : 36;
  const paddingY = containerSize.height < 700 ? 64 : 100;

  const maxW = Math.max(100, containerSize.width - (isLandscape ? 0 : paddingX));
  const maxH = Math.max(150, containerSize.height - paddingY);

  let boxHeight = maxH;
  let boxWidth = boxHeight * mushafAspectRatio;

  if (!isLandscape && boxWidth > maxW) {
    boxWidth = maxW;
    boxHeight = boxWidth / mushafAspectRatio;
  }

  if (isLandscape && boxHeight > maxH) {
    boxHeight = maxH;
    boxWidth = maxH * mushafAspectRatio;
  }

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="fixed inset-0 z-[100] bg-[#FDFBF7] dark:bg-[#121212] font-amiri overflow-hidden"
      dir="rtl"
    >
      {/* Reading Viewport */}
      <div
        ref={measurementRef}
        onClick={(e) => {
          if (wasLongPressTriggeredRef.current) {
            wasLongPressTriggeredRef.current = false;
            return;
          }
          if (isSwipingRef.current) {
            isSwipingRef.current = false;
            return;
          }
          // If selection toolbar is active, a tap outside cleanly dismisses it
          if (selectedRange) {
            clearSelection();
            return;
          }
          const clickX = e.clientX;
          const windowW = window.innerWidth;
          // Right 20% of screen -> Next page
          if (clickX > windowW * 0.80) {
            goToNextPage();
            return;
          }
          // Left 20% of screen -> Previous page
          if (clickX < windowW * 0.20) {
            goToPrevPage();
            return;
          }
          // Center -> Toggle Controls
          setAreControlsVisible(prev => !prev);
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="absolute inset-0 overflow-hidden flex flex-col items-center justify-center select-none cursor-pointer touch-none overscroll-none"
      >
        <AnimatePresence initial={false} custom={swipeDirection}>
          <motion.div
            key={effectivePageIndex}
            ref={scrollContainerRef}
            custom={swipeDirection}
            variants={pageVariants}
            initial="enter"
            animate="center"
            exit="exit"
            style={{
              x: dragOffset
            }}
            transition={{
              x: { type: 'spring', stiffness: 280, damping: 28, mass: 0.8 },
              opacity: { duration: 0.22, ease: 'easeInOut' },
              scale: { duration: 0.22, ease: 'easeOut' },
              boxShadow: { duration: 0.22 }
            }}
            className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden"
          >
            <QuranPageCard
              pageNumber={effectivePages[effectivePageIndex] || currentPage}
              boxWidth={boxWidth}
              boxHeight={boxHeight}
              isFreeReading={isFreeReading}
              isWholeQuran={isWholeQuran}
              taskTitle={taskTitle}
              activeSubsets={activeSubsets}
              selectedRange={selectedRange}
              playingAyahSegments={playingAyahSegments}
              quranWords={quranWords}
              registerContainerRef={registerPageContainer}
              onPointerDown={handlePagePointerDown}
              onPointerMove={handlePagePointerMove}
              onPointerUp={handlePagePointerUp}
              onPointerCancel={handlePagePointerCancel}
              onClick={handlePageClick}
            />

            {/* Subtle Loading Spinner Overlay while downloading image or data */}
            {loadingText && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#FDFBF7]/15 dark:bg-[#121212]/15 pointer-events-none z-30">
                <Loader2 className="w-8 h-8 text-amber-600 dark:text-amber-500 animate-spin" />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Floating Quick Close Button when controls are hidden */}
      <AnimatePresence>
        {!areControlsVisible && (
          <>
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={e => {
                e.stopPropagation();
                onClose();
              }}
              className="absolute top-4 left-4 z-50 p-2.5 rounded-full bg-[#FDFBF7]/85 dark:bg-[#121211]/85 backdrop-blur-md shadow-md border border-amber-200/20 dark:border-amber-900/20 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all text-gray-500 dark:text-gray-400"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </motion.button>

            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-4 right-4 z-50 px-3.5 py-1.5 rounded-full bg-[#FDFBF7]/85 dark:bg-[#121211]/85 backdrop-blur-md shadow-md border border-amber-200/20 dark:border-amber-900/20 text-xs sm:text-sm font-bold text-amber-900 dark:text-amber-500 flex items-center gap-2"
            >
              <span>صفحة {currentPage}</span>
              <span className="text-[11px] text-amber-800/70 dark:text-amber-400/70 font-medium">
                • {currentHizbText}
              </span>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Top Header Overlay Bar */}
      <AnimatePresence>
        {areControlsVisible && (
          <motion.div
            ref={headerRef}
            initial={{ opacity: 0, y: -80 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -80 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute top-0 left-0 right-0 z-50 px-4 py-3 border-b border-gray-100 dark:border-white/10 flex flex-col justify-between bg-[#FDFBF7]/95 dark:bg-[#121211]/95 backdrop-blur-md shadow-lg"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <button
                onClick={e => {
                  e.stopPropagation();
                  onClose();
                }}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-gray-500 dark:text-gray-400"
                title="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex flex-col items-center">
                <span className="text-sm font-bold text-amber-900 dark:text-amber-500 flex items-center gap-1.5">
                  <span>صفحة {currentPage}</span>
                  <span className="text-xs text-amber-800/60 dark:text-amber-400/60 font-medium">
                    ({currentHizbText})
                  </span>
                </span>
                {taskTitle && (
                  <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-[200px] sm:max-w-md font-sans">
                    {taskTitle}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {!navigator.onLine && (
                  <span className="text-[10px] px-2 py-0.5 rounded-lg font-bold bg-emerald-600/15 text-emerald-800 dark:text-emerald-300 font-sans">
                    وضع محلي 📴
                  </span>
                )}
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/15 text-amber-900 dark:text-amber-300 font-sans">
                  مصحف المدينة
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Footer Audio & Page Controls Overlay */}
      <AnimatePresence>
        {areControlsVisible && effectivePages.length >= 1 && (
          <motion.div
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 80 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute bottom-0 left-0 right-0 z-50 px-3 py-2 border-t border-gray-100 dark:border-white/10 flex flex-col justify-between bg-[#FDFBF7]/95 dark:bg-[#121211]/95 backdrop-blur-md shadow-lg"
            style={{ height: `${headerHeight}px` }}
            onClick={e => e.stopPropagation()}
          >
            {effectivePages.length > 0 && (
              <div className="flex flex-col gap-0.5 w-full">
                <div className="w-full h-1 bg-gray-200 dark:bg-white/10 rounded-full">
                  <div className="h-full bg-amber-600 rounded-full" style={{ width: `${audioProgress}%` }} />
                </div>
                <div className="flex items-center justify-between w-full px-1">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      prevAyah();
                    }}
                    className="p-1 rounded-full hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-800 dark:text-amber-200"
                    title="الآية السابقة"
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={async e => {
                      e.stopPropagation();
                      const currentTaskId = customSequenceMode
                        ? 'custom-sequence'
                        : `viewer-playing-${effectivePages.join(',')}-${taskTitle || ''}`;
                      if (playingTaskId !== currentTaskId || activeAyahs.length === 0) {
                        if (customSequenceMode && verseRanges && verseRanges.length > 0) {
                          const ranges = verseRanges.map(vr => ({
                            surah: Number(vr.surah),
                            start: vr.start,
                            end: vr.end
                          }));
                          await playCustomSequence(ranges, ayahRepeat || 1, sequenceRepeat || 1);
                        } else {
                          const dummyTask = {
                            id: currentTaskId,
                            title: taskTitle || 'صفحات القراءة',
                            type: 'listening' as any,
                            pages: effectivePages,
                            completed: false,
                            targetCount: 1,
                            currentCount: 0,
                            verseRanges: verseRanges
                          };
                          await playPages(e, dummyTask);
                        }
                      } else {
                        togglePlay();
                      }
                    }}
                    className="p-1.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-100 cursor-pointer"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={e => {
                      e.stopPropagation();
                      stopAudio();
                    }}
                    className="p-1 rounded-full hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-800 dark:text-amber-200"
                    title="إيقاف تماماً"
                  >
                    <Square className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={e => {
                      e.stopPropagation();
                      nextAyah();
                    }}
                    className="p-1 rounded-full hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-800 dark:text-amber-200"
                    title="الآية التالية"
                  >
                    <SkipBack className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={e => {
                      e.stopPropagation();
                      const speeds = ['1.0', '1.2', '1.4', '1.5', '1.6', '1.8', '2.0'];
                      const currentIndex = speeds.indexOf(currentSpeed);
                      const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
                      updatePlaybackSettings(undefined, nextSpeed);
                    }}
                    className="text-[10px] font-bold font-sans text-amber-800 dark:text-amber-200 px-1.5 py-0.5 rounded hover:bg-amber-100 dark:hover:bg-amber-900/30"
                  >
                    {currentSpeed}x
                  </button>

                  <button
                    onClick={e => {
                      e.stopPropagation();
                      restartFromBeginning();
                    }}
                    className="p-1 rounded-full hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-800 dark:text-amber-200"
                    title="الرجوع من البداية"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>

                  <select
                    value={currentQari}
                    onClick={e => e.stopPropagation()}
                    onChange={e => updatePlaybackSettings(e.target.value, undefined)}
                    className="text-[9px] font-bold bg-transparent border-none text-amber-800 dark:text-amber-200 outline-none cursor-pointer pr-1"
                  >
                    <option value="Minshawy_Murattal_128kbps">المنشاوي</option>
                    <option value="Husary_128kbps">الحصري</option>
                    <option value="Abdul_Basit_Murattal_64kbps">عبد الباسط</option>
                    <option value="Ayman_Sowaid_64kbps">أيمن سويد</option>
                    <option value="Muhammad_Ayyoub_128kbps">محمد أيوب</option>
                    <option value="Ghamadi_40kbps">الغامدي</option>
                    <option value="MaherAlMuaiqly128kbps">المعيقلي</option>
                  </select>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between w-full">
              <button
                disabled={effectivePageIndex === 0}
                onClick={e => {
                  e.stopPropagation();
                  setSwipeDirection(-1);
                  setEffectivePageIndex(p => p - 1);
                }}
                className="px-2.5 py-1 flex items-center gap-1 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-500 disabled:opacity-40 text-[10px] font-bold font-sans cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
                <span>السابق</span>
              </button>

              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    setIsDropdownOpen(!isDropdownOpen);
                  }}
                  className="text-xs font-bold text-gray-700 dark:text-gray-200 hover:text-amber-600 dark:hover:text-amber-500 transition-colors cursor-pointer px-3 py-1 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/10 font-sans flex items-center gap-1 border border-gray-100 dark:border-white/5"
                  title="اختر الصفحة"
                >
                  <span dir="ltr" className="inline-block">
                    {effectivePageIndex + 1} / {effectivePages.length}
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      isDropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                <AnimatePresence>
                  {isDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 12, scale: 0.95 }}
                      animate={{ opacity: 1, y: -12, scale: 1 }}
                      exit={{ opacity: 0, y: 12, scale: 0.95 }}
                      className="absolute bottom-full left-1/2 -translate-x-1/2 z-[101] min-w-[130px] max-h-[280px] overflow-y-auto bg-white dark:bg-[#222] border border-gray-100 dark:border-white/10 rounded-2xl shadow-2xl p-1.5 flex flex-col gap-0.5"
                      style={{ boxShadow: '0 -10px 40px -10px rgba(0,0,0,0.3)' }}
                    >
                      {effectivePages.map((pageNum, idx) => (
                        <button
                          key={pageNum}
                          onClick={e => {
                            e.stopPropagation();
                            setEffectivePageIndex(idx);
                            setIsDropdownOpen(false);
                          }}
                          className={`w-full py-1.5 px-3 rounded-xl text-xs font-bold transition-all text-right font-sans flex items-center justify-between ${
                            effectivePageIndex === idx
                              ? 'bg-amber-600 text-white shadow-sm'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                          }`}
                        >
                          <span>صفحة {pageNum}</span>
                          <span className="text-[10px] opacity-75 font-mono">#{idx + 1}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button
                disabled={effectivePageIndex === effectivePages.length - 1}
                onClick={e => {
                  e.stopPropagation();
                  setSwipeDirection(1);
                  setEffectivePageIndex(p => p + 1);
                }}
                className="px-2.5 py-1 flex items-center gap-1 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-500 disabled:opacity-40 text-[10px] font-bold font-sans cursor-pointer"
              >
                <span>التالي</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Selection Toolbar for Selected Ayah / Range */}
      <AnimatePresence>
        {selectedRange && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            className="absolute bottom-5 left-3 right-3 sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-md z-[120] p-3 rounded-2xl bg-[#172417]/95 dark:bg-[#1C1C1E]/95 text-white backdrop-blur-md shadow-2xl border border-amber-500/40 flex flex-col gap-2.5"
            onClick={e => e.stopPropagation()}
            onPointerDown={e => e.stopPropagation()}
            onTouchStart={e => e.stopPropagation()}
            onTouchMove={e => e.stopPropagation()}
            onTouchEnd={e => e.stopPropagation()}
            onMouseDown={e => e.stopPropagation()}
            onMouseUp={e => e.stopPropagation()}
          >
            {/* Header info & Range Adjuster */}
            <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 text-xs font-bold font-sans">
                  سورة {selectedRange.surahName}
                </span>
                <span className="text-xs font-bold text-white/95 font-sans">
                  {selectedRange.startAyah === selectedRange.endAyah
                    ? `آية ${selectedRange.startAyah}`
                    : `الآيات ${selectedRange.startAyah} - ${selectedRange.endAyah}`}
                </span>
              </div>

              {/* Range adjust steppers */}
              <div className="flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-lg text-xs font-sans">
                <span className="text-[10px] text-amber-300 font-medium">النطاق:</span>
                <button
                  onClick={() => {
                    setSelectedRange(p => {
                      if (!p) return null;
                      const sMeta = SURAH_METADATAList[p.surah - 1];
                      const maxV = sMeta ? sMeta.endVerse : 286;
                      return { ...p, endAyah: Math.min(maxV, p.endAyah + 1) };
                    });
                  }}
                  className="p-1 hover:bg-white/20 rounded text-amber-300 cursor-pointer"
                  title="إضافة آية تالية للنطاق"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button
                  disabled={selectedRange.startAyah === selectedRange.endAyah}
                  onClick={() => {
                    setSelectedRange(p => {
                      if (!p || p.endAyah <= p.startAyah) return p;
                      return { ...p, endAyah: p.endAyah - 1 };
                    });
                  }}
                  className="p-1 hover:bg-white/20 rounded text-amber-300 disabled:opacity-30 cursor-pointer"
                  title="إنقاص آية من النطاق"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                onClick={e => {
                  e.stopPropagation();
                  clearSelection();
                }}
                className="p-1 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
                title="إلغاء التحديد"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Action buttons row */}
            <div className="flex items-center justify-between gap-2 pt-0.5">
              <button
                onClick={handlePlaySelectedRange}
                className="flex-1 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer font-sans"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>استماع للآيات</span>
              </button>

              <button
                onClick={handleShareSelectedRange}
                className="flex-1 py-2 px-3 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 border border-white/20 shadow-md active:scale-95 transition-all cursor-pointer font-sans"
              >
                <Share2 className="w-4 h-4" />
                <span>مشاركة الآيات</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] px-4 py-2.5 bg-emerald-900/95 text-white rounded-xl shadow-2xl border border-emerald-500/40 font-bold text-xs sm:text-sm flex items-center gap-2 backdrop-blur-md"
          >
            <Check className="w-4 h-4 text-emerald-300" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4-Way Verses Share Modal: Text, Audio, Image, Video */}
      <AyahShareModal
        isOpen={!!shareModalTarget}
        onClose={() => {
          setShareModalTarget(null);
          clearSelection();
        }}
        target={shareModalTarget}
      />
    </motion.div>
  );
}
