import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, BookOpen, Image as ImageIcon, Loader2, ChevronDown, Play, Pause, SkipForward, SkipBack, Settings, RotateCcw, Square, Copy, Volume2, Share2, Check, Download, Video, Headphones } from 'lucide-react';
import { VerseRange, getActiveVersesForPageAndTask, SURAH_METADATAList, getVerseRangeForPage } from '../../utils/quranPageMapping';
import { isAyahActive, AyahInfo } from '../../utils/ayahFetcher';
import { getAyahsForPageOffline } from '../../utils/offlineQuranData';
import { unlockOrientation } from '../../utils/orientation';
import { getPageImageSrc } from '../../utils/offlineCache';
import { useAudio } from '../../context/AudioContext';
import html2canvas from 'html2canvas';
import { patchColorsForHtml2Canvas } from '../../utils/html2canvasUtils';
import { JUZ_PAGES } from '../../utils/planGenerator';
import { QURAN_QUARTERS } from '../../utils/quranQuarters';

// Simple in-memory cache for ultra-fast session-level loads
const memoryWordsCache: Record<number, any[]> = {};
const memoryPagesCache: Record<number, AyahInfo[]> = {};

interface QuranViewerProps {
  isOpen: boolean;
  onClose: () => void;
  pages: number[];
  taskTitle: string;
  verseRanges?: VerseRange[];
  customSequenceMode?: boolean;
  ayahRepeat?: number;
  sequenceRepeat?: number;
}

interface SurahGroup {
  name: string;
  number: number;
  ayahs: AyahInfo[];
}

interface LineData {
  lineNumber: number;
  type: 'text' | 'surah_header' | 'bismillah' | 'empty';
  surahNumber?: number;
  surahName?: string;
  words?: any[];
}

const QuranSurahHeader: React.FC<{ surahName: string; maxLineHeight?: number; isCompact?: boolean; isLandscape?: boolean }> = ({ surahName, maxLineHeight, isCompact, isLandscape }) => {
  const targetHeight = maxLineHeight || 36;
  const maxFontLimit = isLandscape ? 40 : 18;
  const fontSize = Math.max(9, Math.min(maxFontLimit, targetHeight * 0.45));
  const innerPadding = Math.max(1, Math.min(12, targetHeight * 0.12));

  return (
    <div 
      style={{ height: `${targetHeight}px` }} 
      className="w-full flex items-center justify-center relative z-10 select-none box-border"
    >
      <div 
        style={{ 
          fontSize: `${fontSize}px`, 
          paddingTop: `${innerPadding}px`, 
          paddingBottom: `${innerPadding}px`,
          maxHeight: '100%'
        }}
        className="w-full max-w-sm md:max-w-md border-2 border-double border-amber-500/30 dark:border-amber-400/20 bg-amber-500/5 dark:bg-amber-400/5 text-center relative rounded-md shadow-sm flex items-center justify-center gap-4"
      >
        <span className="text-amber-500/70 select-none">۞</span>
        <span className="text-amber-900 dark:text-amber-400 font-bold font-amiri leading-none">
          {surahName}
        </span>
        <span className="text-amber-500/70 select-none">۞</span>
      </div>
    </div>
  );
};

const QuranBismillah: React.FC<{ maxLineHeight?: number; isCompact?: boolean; isLandscape?: boolean }> = ({ maxLineHeight, isCompact, isLandscape }) => {
  const targetHeight = maxLineHeight || 36;
  const maxFontLimit = isLandscape ? 44 : 20;
  const fontSize = Math.max(10, Math.min(maxFontLimit, targetHeight * 0.55));

  return (
    <div 
      style={{ height: `${targetHeight}px` }} 
      className="w-full flex items-center justify-center relative z-10 select-none box-border"
    >
      <span 
        style={{ fontSize: `${fontSize}px` }}
        className="text-amber-950 dark:text-amber-200 font-medium font-amiri block text-center leading-none"
      >
        بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
      </span>
    </div>
  );
};

interface QuranLineProps {
  words: any[];
  activeSubsets: VerseRange[];
  maxLineHeight?: number;
  isLandscape?: boolean;
  hasStrictRestrictions?: boolean;
  selectedAyahs: { ayah: any; group: any }[];
  onPointerDown: (e: React.PointerEvent<HTMLSpanElement>, ayah: any, group: any) => void;
  onPointerUp: (e?: React.PointerEvent) => void;
  onPointerMove: () => void;
  ayahs: any[];
}

const QuranLine: React.FC<QuranLineProps> = ({ 
  words, 
  activeSubsets, 
  maxLineHeight, 
  isLandscape, 
  hasStrictRestrictions,
  selectedAyahs,
  onPointerDown,
  onPointerUp,
  onPointerMove,
  ayahs
}) => {
  const { activeAyahs, playingAyahIndex } = useAudio();
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [highlights, setHighlights] = useState<{ left: number; width: number; key: string; isPlaying: boolean; isSelected: boolean }[]>([]);

  const measureHighlights = () => {
    const container = containerRef.current;
    if (!container) return;

    const parentRect = container.getBoundingClientRect();
    const wordElements = container.querySelectorAll('.quran-word[data-active="true"], .quran-word[data-playing="true"]');
    
    // Group active word elements by verse_key
    const groups: Record<string, Element[]> = {};
    wordElements.forEach(el => {
      const key = el.getAttribute('data-verse-key') || 'default';
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(el);
    });

    // Calculate relative left and width for each group
    const newHighlights = Object.entries(groups).map(([key, elements]) => {
      let minLeft = Infinity;
      let maxRight = -Infinity;

      elements.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          if (rect.left < minLeft) minLeft = rect.left;
          if (rect.right > maxRight) maxRight = rect.right;
        }
      });

      if (minLeft === Infinity || maxRight === -Infinity) {
        return null;
      }

      // Add a tiny padding to the highlight box for aesthetics
      const padding = 2; // px
      const left = Math.max(0, minLeft - parentRect.left - padding);
      const width = Math.min(parentRect.width, (maxRight - minLeft) + (padding * 2));

      // Check if this verse is the currently playing one
      const parts = key.split(':');
      const surahNum = parseInt(parts[0], 10);
      const ayahNum = parseInt(parts[1], 10);
      const currentPlayingAyah = activeAyahs[playingAyahIndex];
      const isCurrentlyPlaying = currentPlayingAyah && 
                                 currentPlayingAyah.surah.number === surahNum && 
                                 currentPlayingAyah.numberInSurah === ayahNum;

      // Check if this verse is selected
      const isCurrentlySelected = selectedAyahs.some(a => a.group.number === surahNum && a.ayah.numberInSurah === ayahNum);

      return {
        key,
        left,
        width,
        isPlaying: !!isCurrentlyPlaying,
        isSelected: !!isCurrentlySelected
      };
    }).filter((h): h is { key: string; left: number; width: number; isPlaying: boolean; isSelected: boolean } => h !== null);

    setHighlights(newHighlights);
  };

  useEffect(() => {
    const container = containerRef.current;
    const inner = innerRef.current;
    if (!container || !inner) return;

    const adjustSize = () => {
      // Reset font size and switch to inline-flex to measure unconstrained width
      const baseFontSize = 24;
      inner.style.fontSize = `${baseFontSize}px`;
      inner.style.display = 'inline-flex';
      inner.style.width = 'auto';

      // Read actual computed padding to subtract from the outer width
      const computedStyle = window.getComputedStyle(container);
      const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
      const paddingRight = parseFloat(computedStyle.paddingRight) || 0;
      const parentW = Math.max(0, container.getBoundingClientRect().width - paddingLeft - paddingRight);
      const childW = inner.getBoundingClientRect().width;

      // Re-establish full-width space-between Flexbox layout
      inner.style.display = 'flex';
      inner.style.width = '100%';

      if (parentW > 0 && childW > 0) {
        // Calculate fitting ratio with a very high-precision scaling factor
        const ratio = parentW / childW;
        let targetSize = baseFontSize * ratio * 0.998;
        
        if (maxLineHeight) {
          const safeMaxHeight = Math.max(9, maxLineHeight * 0.60);
          targetSize = Math.min(targetSize, safeMaxHeight);
        }

        inner.style.fontSize = `${Math.max(8, Math.min(isLandscape ? 64 : 24, targetSize))}px`;
      }

      // Trigger measurement after layout has settled
      window.requestAnimationFrame(measureHighlights);
    };

    adjustSize();

    const observer = new ResizeObserver(() => {
      window.requestAnimationFrame(adjustSize);
    });
    observer.observe(container);

    window.addEventListener('resize', adjustSize);
    if (document.fonts) {
      document.fonts.ready.then(adjustSize);
    }

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', adjustSize);
    };
  }, [words, maxLineHeight]);

  // Ensure highlights are remeasured when activeSubsets, playing verse, or selection changes
  useEffect(() => {
    const timer = setTimeout(() => {
      measureHighlights();
    }, 50);
    return () => clearTimeout(timer);
  }, [activeSubsets, words, playingAyahIndex, activeAyahs, selectedAyahs]);

  return (
    <div 
      ref={containerRef}
      style={{ height: maxLineHeight ? `${maxLineHeight}px` : 'auto' }}
      className="w-full overflow-visible px-2 bg-transparent hover:bg-amber-500/5 dark:hover:bg-amber-500/5 transition-colors duration-150 rounded select-none flex items-center relative"
    >
      {/* Absolute continuous background highlights */}
      {highlights.map((h) => (
        <div
          key={h.key}
          style={{
            left: `${h.left}px`,
            width: `${h.width}px`,
          }}
          className={`absolute top-0.5 bottom-0.5 rounded-md pointer-events-none z-0 transition-all duration-200 ${
            h.isPlaying
              ? 'bg-teal-100/90 dark:bg-teal-850/40 shadow-[0_1.5px_5px_rgba(20,184,166,0.4)] border border-teal-300/40 dark:border-teal-700/40'
              : h.isSelected
              ? 'bg-amber-250/90 dark:bg-amber-700/45 border-2 border-amber-500 dark:border-amber-400 shadow-[0_1px_4px_rgba(245,158,11,0.25)]'
              : hasStrictRestrictions
              ? 'bg-[#FCF6E8] dark:bg-amber-600/35 shadow-[0_1.5px_4px_rgba(180,139,48,0.15)]'
              : 'bg-transparent'
          }`}
        />
      ))}

      <div
        ref={innerRef}
        style={{ direction: 'rtl' }}
        className="w-full flex flex-row flex-nowrap justify-between items-center whitespace-nowrap relative z-10"
      >
        {words.map((word, idx) => {
          const surahName = SURAH_METADATAList[word.surah_number - 1]?.name || '';
          const isActive = isAyahActive({
            numberInSurah: word.verse_number,
            text: '',
            surah: { number: word.surah_number, name: surahName }
          }, activeSubsets, hasStrictRestrictions);

          const isEnd = word.char_type_name === 'end';
          
          const isFirstWord = idx === 0;
          const isLastWord = idx === words.length - 1;
          const isOnlyWord = words.length === 1;

          let pStart = '0.12em';
          let pEnd = '0.12em';
          if (isOnlyWord) {
            pStart = '0em';
            pEnd = '0em';
          } else if (isFirstWord) {
            pStart = '0em';
            pEnd = '0.12em';
          } else if (isLastWord) {
            pStart = '0.12em';
            pEnd = '0em';
          }

          const currentPlayingAyah = activeAyahs[playingAyahIndex];
          const isWordPlaying = currentPlayingAyah && 
                                currentPlayingAyah.surah.number === word.surah_number && 
                                currentPlayingAyah.numberInSurah === word.verse_number;

          const matchingAyah = ayahs.find(a => a.surah.number === word.surah_number && a.numberInSurah === word.verse_number);
          const group = { number: word.surah_number, name: surahName };

          return (
            <span
              key={word.id || idx}
              data-active={isActive}
              data-verse-key={word.verse_key}
              data-playing={isWordPlaying ? "true" : "false"}
              style={{
                gap: '0.12em',
                paddingInlineStart: pStart,
                paddingInlineEnd: pEnd,
              }}
              onPointerDown={(e) => {
                 if (matchingAyah) onPointerDown(e, matchingAyah, group);
              }}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
              onPointerCancel={onPointerUp}
              onPointerMove={onPointerUp}
              onContextMenu={(e) => {
                 e.preventDefault();
                 if (matchingAyah) onPointerDown(e, matchingAyah, group);
              }}
              className={`quran-word inline-flex items-center font-amiri transition-colors duration-200 overflow-visible cursor-pointer ${
                isWordPlaying
                  ? 'text-teal-950 dark:text-teal-100 font-extrabold py-0.5 px-0.5'
                  : isActive
                  ? 'text-[#1d1105] dark:text-white font-extrabold py-0.5 px-0.5'
                  : 'text-gray-500/80 dark:text-gray-400/80 hover:text-amber-950 dark:hover:text-amber-100 py-0.5 px-0.5 rounded'
              }`}
            >
              <span>
                {word.text_uthmani.trim().replace(/[0-9٠-٩﴿﴾]/g, '')}
              </span>
              {isEnd && (
                <span className={`inline-flex items-center justify-center w-[1.4em] h-[1.4em] rounded-full border border-current font-mono leading-none flex-shrink-0 align-middle ${
                  word.verse_number > 99 ? 'text-[0.45em]' : 'text-[0.62em]'
                } ${
                  isWordPlaying
                    ? 'border-amber-500 text-amber-950 dark:text-white font-extrabold bg-amber-500/20'
                    : isActive
                    ? 'border-[#B48B30]/70 text-[#1d1105] dark:text-amber-200 font-extrabold bg-amber-500/10'
                    : 'border-gray-300 dark:border-gray-700 text-gray-400 dark:text-gray-500'
                }`}>
                  {word.verse_number}
                </span>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
};

function getJuzAndHizbOfPage(page: number) {
  if (!page || isNaN(page)) return { juz: 1, hizbText: '' };
  
  // Find Juz
  let juz = 1;
  for (let j = 1; j <= 30; j++) {
    const range = JUZ_PAGES[j];
    if (range && page >= range.start && page <= range.end) {
      juz = j;
    }
  }

  // Find Quarter
  const matchingQuarters = QURAN_QUARTERS.filter(q => page >= q.startPage && page <= q.endPage);
  let selectedQuarter = QURAN_QUARTERS[0];
  if (matchingQuarters.length > 0) {
    selectedQuarter = matchingQuarters[matchingQuarters.length - 1];
  }

  const qNum = selectedQuarter.number;
  const hizb = Math.ceil(qNum / 4);
  const quarterIdx = (qNum - 1) % 4; // 0, 1, 2, 3

  let hizbText = "";
  if (page === selectedQuarter.startPage) {
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

  return {
    juz,
    hizbText
  };
}


export function QuranViewer({ isOpen, onClose, pages, taskTitle, verseRanges, customSequenceMode, ayahRepeat, sequenceRepeat }: QuranViewerProps) {
  const { activeAyahs, playingAyahIndex, isPlaying, togglePlay, nextAyah, prevAyah, updatePlaybackSettings, currentSpeed, currentQari, audioProgress, playingTaskId, restartFromBeginning, stopAudio, playPages, playSingleAyah, playCustomSequence } = useAudio();
  const [effectivePageIndex, setEffectivePageIndex] = useState(0);
  const [effectivePages, setEffectivePages] = useState<number[]>(pages);
  const [areControlsVisible, setAreControlsVisible] = useState(false);
  const [headerHeight, setHeaderHeight] = useState<number>(92);
  const headerRef = useRef<HTMLDivElement>(null);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [selectedAyahs, setSelectedAyahs] = useState<{ayah: any, group: any}[]>([]);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const shareContainerRef = useRef<HTMLDivElement>(null);
  
  // Robust states for mobile/PWA sharing
  const [generatedImageSrc, setGeneratedImageSrc] = useState<string | null>(null);
  const [generatedAudioSrc, setGeneratedAudioSrc] = useState<string | null>(null);
  const [generatedVideoSrc, setGeneratedVideoSrc] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };
  
  const handlePointerDown = (e: React.PointerEvent<HTMLSpanElement>, ayah: any, group: any) => {
    if (selectedAyahs.length > 0) {
      const pivot = selectedAyahs[0];
      const pivotIndex = ayahs.findIndex(a => a.numberInSurah === pivot.ayah.numberInSurah && a.surah.number === pivot.group.number);
      const clickedIndex = ayahs.findIndex(a => a.numberInSurah === ayah.numberInSurah && a.surah.number === group.number);

      if (pivotIndex !== -1 && clickedIndex !== -1) {
        if (pivotIndex === clickedIndex) {
          // If clicked the pivot itself, toggle/remove it
          setSelectedAyahs(prev => prev.filter(a => !(a.ayah.numberInSurah === ayah.numberInSurah && a.group.number === group.number)));
        } else {
          // Select range between pivot and clicked
          const start = Math.min(pivotIndex, clickedIndex);
          const end = Math.max(pivotIndex, clickedIndex);
          const rangeAyahs = ayahs.slice(start, end + 1).map(a => ({
            ayah: a,
            group: { number: a.surah.number, name: a.surah.name }
          }));
          setSelectedAyahs(rangeAyahs);
        }
      } else {
        // Fallback: Toggle selection if pivot or clicked not in current page's ayahs
        setSelectedAyahs(prev => {
          const exists = prev.some(a => a.ayah.numberInSurah === ayah.numberInSurah && a.group.number === group.number);
          if (exists) return prev.filter(a => !(a.ayah.numberInSurah === ayah.numberInSurah && a.group.number === group.number));
          return [...prev, { ayah, group }].sort((a, b) => {
             if (a.group.number !== b.group.number) return a.group.number - b.group.number;
             return a.ayah.numberInSurah - b.ayah.numberInSurah;
          });
        });
      }
      return;
    }
    
    const clientX = e.clientX;
    const clientY = e.clientY;
    const timer = setTimeout(() => {
      setSelectedAyahs([{ ayah, group }]);
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50);
      showToast("تم تفعيل وضع تحديد الآيات. انقر الآن لتحديد المزيد.");
    }, 100);
    setLongPressTimer(timer);
  };
  
  const handlePointerUp = (e?: React.PointerEvent) => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handlePointerMove = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };


const getSelectedText = () => {
    return selectedAyahs.map(a => `${a.ayah.text} ﴿${a.ayah.numberInSurah}﴾ [${a.group.name}]`).join(' ');
  };

  const copyAyah = async () => {
    if (selectedAyahs.length === 0) return;
    const text = getSelectedText();
    try {
      await navigator.clipboard.writeText(text);
      showToast("تم نسخ نص الآيات بنجاح!");
      setShareMenuOpen(false);
      setSelectedAyahs([]);
    } catch (err) {
      console.error(err);
      showToast("فضل نسخ النص، يرجى المحاولة يدوياً.");
    }
  };

  const playSelectedAyahs = async () => {
    if (selectedAyahs.length === 0) return;
    if (selectedAyahs.length === 1) {
       await playSingleAyah(null as any, { ...selectedAyahs[0].ayah, surah: { number: selectedAyahs[0].group.number, name: selectedAyahs[0].group.name } });
    } else {
       // Create a custom task with specific ayahs
       const dummyTask = {
         id: `viewer-playing-selection-${Date.now()}`,
         title: "استماع محدد",
         type: 'listening' as any,
         pages: effectivePages,
         completed: false,
         targetCount: 1,
         currentCount: 0,
         selectedVerses: selectedAyahs.map(a => ({ surah: a.group.number, ayah: a.ayah.numberInSurah }))
       };
       const firstSelected = selectedAyahs[0];
       await playPages(null as any, dummyTask, { surah: firstSelected.group.number, numberInSurah: firstSelected.ayah.numberInSurah });
    }
    setShareMenuOpen(false);
    setSelectedAyahs([]);
  };

  const downloadFileWithShareFallback = async (blob: Blob, filename: string, title: string) => {
     try {
         const file = new File([blob], filename, { type: blob.type });
         if (navigator.canShare && navigator.canShare({ files: [file] })) {
             await navigator.share({
                 title,
                 files: [file]
             });
         } else {
             const url = URL.createObjectURL(blob);
             const a = document.createElement('a');
             a.href = url;
             a.download = filename;
             a.click();
         }
     } catch (err: any) {
         const isCanceled = err?.name === 'AbortError' 
           || err?.message?.includes('Share canceled') 
           || err?.message?.includes('share was canceled')
           || (typeof err === 'string' && (err.includes('Share canceled') || err.includes('share was canceled')));
         
         if (isCanceled) {
             console.log('Share canceled by user');
             return;
         }
         console.error('Share/Download failed', err);
         const url = URL.createObjectURL(blob);
         const a = document.createElement('a');
         a.href = url;
         a.download = filename;
         a.click();
     }
  };

  const handleShare = async (url: string, filename: string, title: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      await downloadFileWithShareFallback(blob, filename, title);
    } catch (err) {
      console.error(err);
      showToast("فشلت عملية المشاركة");
    }
  };

  const sanitizeStyles = () => {
    const styleElements = Array.from(document.querySelectorAll('style'));
    const originalContents = new Map<HTMLStyleElement, string>();

    styleElements.forEach((style) => {
      const text = style.textContent || '';
      if (text.includes('oklch') || text.includes('oklab')) {
        originalContents.set(style, text);
        
        let cleaned = '';
        let i = 0;
        while (i < text.length) {
          if (text.startsWith('oklch(', i) || text.startsWith('oklab(', i)) {
            i += 6;
            let parenCount = 1;
            while (i < text.length && parenCount > 0) {
              if (text[i] === '(') parenCount++;
              else if (text[i] === ')') parenCount--;
              i++;
            }
            cleaned += 'rgba(0,0,0,0.1)';
          } else {
            cleaned += text[i];
            i++;
          }
        }
        style.textContent = cleaned;
      }
    });

    return () => {
      originalContents.forEach((text, style) => {
        style.textContent = text;
      });
    };
  };

  const generateImage = async () => {
    if (!shareContainerRef.current || selectedAyahs.length === 0) return;
    setIsGeneratingImage(true);
    let restoreStyles: (() => void) | null = null;
    let restoreColors: (() => void) | null = null;
    try {
      await new Promise(r => setTimeout(r, 120));
      restoreStyles = sanitizeStyles();
      restoreColors = patchColorsForHtml2Canvas(shareContainerRef.current);
      const canvas = await html2canvas(shareContainerRef.current, {
        scale: 2.5,
        backgroundColor: '#ffffff',
        useCORS: true
      });
      const dataUrl = canvas.toDataURL('image/png');
      setGeneratedImageSrc(dataUrl);
      setShareMenuOpen(false);
    } catch (err) {
      console.error('Image generation failed', err);
      showToast("فشل إعداد بطاقة الآية كصورة.");
    } finally {
      if (restoreColors) restoreColors();
      if (restoreStyles) restoreStyles();
      setIsGeneratingImage(false);
    }
  };
  
  const downloadAudio = async () => {
    if (selectedAyahs.length === 0) return;
    setIsGeneratingAudio(true);
    const qari = currentQari || "Minshawy_Murattal_128kbps";
    
    try {
      // Parallel loading of all audio files
      const audioPromises = selectedAyahs.map(async (a) => {
        const surahStr = String(a.group.number).padStart(3, '0');
        const ayahStr = String(a.ayah.numberInSurah).padStart(3, '0');
        const url = `https://everyayah.com/data/${qari}/${surahStr}${ayahStr}.mp3`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Audio fetch failed");
        return await res.blob();
      });
      const audioBlobs = await Promise.all(audioPromises);
      const combinedBlob = new Blob(audioBlobs, { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(combinedBlob);
      setGeneratedAudioSrc(audioUrl);
      setShareMenuOpen(false);
    } catch (e) {
      console.error(e);
      showToast("فشل تحميل الصوت. يرجى التحقق من اتصالك بالإنترنت.");
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const generateVideo = async () => {
     if (!shareContainerRef.current || selectedAyahs.length === 0) return;
     setIsGeneratingVideo(true);
     let restoreStyles: (() => void) | null = null;
     let restoreColors: (() => void) | null = null;
     try {
         const qari = currentQari || "Minshawy_Murattal_128kbps";
         
         restoreStyles = sanitizeStyles();
         restoreColors = patchColorsForHtml2Canvas(shareContainerRef.current);
         
         // Generate the canvas AND fetch all the audio clips in parallel!
         // This significantly reduces the preparation waiting time.
         const [canvas, audioBlobs] = await Promise.all([
           html2canvas(shareContainerRef.current, { 
             scale: 1.5, // 1.5 scale is high quality and takes less time/CPU to process and stream
             backgroundColor: '#ffffff', 
             useCORS: true 
           }),
           Promise.all(selectedAyahs.map(async (a) => {
             const surahStr = String(a.group.number).padStart(3, '0');
             const ayahStr = String(a.ayah.numberInSurah).padStart(3, '0');
             const url = `https://everyayah.com/data/${qari}/${surahStr}${ayahStr}.mp3`;
             const res = await fetch(url);
             if (!res.ok) throw new Error("Audio fetch failed");
             return await res.blob();
           }))
         ]);

         if (restoreColors) { restoreColors(); restoreColors = null; }
         if (restoreStyles) { restoreStyles(); restoreStyles = null; }
         
         const ctx = canvas.getContext('2d');
         const combinedBlob = new Blob(audioBlobs, { type: 'audio/mpeg' });
         const audioUrl = URL.createObjectURL(combinedBlob);
         const audio = new Audio(audioUrl);
         
         const stream = (canvas as any).captureStream ? (canvas as any).captureStream(25) : (canvas as any).mozCaptureStream ? (canvas as any).mozCaptureStream(25) : null;
         if (!stream) {
            throw new Error("Canvas recording not supported");
         }
         
         const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
         const source = audioCtx.createMediaElementSource(audio);
         const dest = audioCtx.createMediaStreamDestination();
         source.connect(dest);
         
         const audioTrack = dest.stream.getAudioTracks()[0];
         if (audioTrack) {
            stream.addTrack(audioTrack);
         }
         
         let mimeType = 'video/webm;codecs=vp9,opus';
         if (typeof MediaRecorder !== 'undefined') {
             if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm;codecs=vp8,opus';
             if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm';
             if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/mp4;codecs=avc1,mp4a';
             if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = '';
         }
         
         const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
         const chunks: Blob[] = [];
         
         recorder.ondataavailable = e => {
            if (e.data.size > 0) chunks.push(e.data);
         };
         
         recorder.onstop = async () => {
            const videoBlob = new Blob(chunks, { type: 'video/webm' });
            const vUrl = URL.createObjectURL(videoBlob);
            setGeneratedVideoSrc(vUrl);
            setIsGeneratingVideo(false);
            setShareMenuOpen(false);
         };
         
         recorder.start();
         audio.play();
         
         const drawLoop = setInterval(() => {
             if (ctx) {
                 const id = ctx.getImageData(0,0,1,1);
                 ctx.putImageData(id, 0,0);
             }
         }, 100);
         
         audio.onended = () => {
             clearInterval(drawLoop);
             recorder.stop();
             try {
                audioCtx.close();
             } catch {}
         };
         
     } catch (err) {
          if (restoreColors) restoreColors();
          if (restoreStyles) restoreStyles();
          console.error('Video generation failed', err);
         showToast("عذراً، توليد الفيديو غير مدعوم على متصفحك حالياً.");
         setIsGeneratingVideo(false);
     }
  };


  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 400,
    height: typeof window !== 'undefined' ? window.innerHeight : 600
  });

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isLandscape = windowSize.width > windowSize.height;
  const containerSize = { width: windowSize.width, height: windowSize.height };

  useEffect(() => {
    if (!isOpen || !headerRef.current) return;

    const updateHeight = () => {
      if (headerRef.current) {
        const height = headerRef.current.getBoundingClientRect().height;
        if (height > 0) {
          setHeaderHeight(height);
        }
      }
    };

    updateHeight();

    const observer = new ResizeObserver(() => {
      updateHeight();
    });
    observer.observe(headerRef.current);

    return () => observer.disconnect();
  }, [isOpen, areControlsVisible, taskTitle, windowSize]);

  useEffect(() => {
    if (isOpen) {
      unlockOrientation();
    }
  }, [isOpen]);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [effectivePageIndex, isLandscape]);

  const [swipeDirection, setSwipeDirection] = useState(0);
  const measurementRef = useRef<HTMLDivElement>(null);

  const paginate = (newDirection: number) => {
    const nextIndex = effectivePageIndex + newDirection;
    if (nextIndex >= 0 && nextIndex < effectivePages.length) {
      setSwipeDirection(newDirection);
      setEffectivePageIndex(nextIndex);
    }
  };

  const handleDragEnd = (e: any, { offset, velocity }: any) => {
    const swipeThreshold = 50;
    if (offset.x > swipeThreshold) {
      // Dragged right -> Go to next page
      paginate(1);
    } else if (offset.x < -swipeThreshold) {
      // Dragged left -> Go to prev page
      paginate(-1);
    }
  };

  const pageVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? "-100%" : "100%",
      opacity: 0.5,
      scale: 0.95,
      boxShadow: "0px 0px 20px rgba(0,0,0,0.2)"
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1,
      boxShadow: "0px 0px 0px rgba(0,0,0,0)"
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? "-100%" : "100%",
      opacity: 0.5,
      scale: 0.95,
      boxShadow: "0px 0px 20px rgba(0,0,0,0.2)"
    })
  };

  useEffect(() => {
    if (isOpen) {
      setAreControlsVisible(false);
      
      // Filter pages to only include those that actually have active verses for this task
      const filtered = pages.filter(p => {
        const active = getActiveVersesForPageAndTask(p, taskTitle);
        return active.length > 0;
      });
      
      // If we found specific pages, use them. Otherwise fallback to the original list
      // to avoid an empty viewer in case of parsing failures.
      setEffectivePages(filtered.length > 0 ? filtered : pages);
      setEffectivePageIndex(0);
    }
  }, [isOpen, pages, taskTitle]);

  useEffect(() => {
    if (!isOpen) return;

    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [isOpen]);

  // 1. Auto-page turning based on the currently playing verse
  useEffect(() => {
    if (isOpen && activeAyahs && activeAyahs.length > 0 && playingAyahIndex < activeAyahs.length) {
      const currentAyah = activeAyahs[playingAyahIndex];
      const targetPageIndex = effectivePages.findIndex(p => {
        const ranges = getVerseRangeForPage(p);
        if (!ranges || ranges.length === 0) return false;
        return isAyahActive(currentAyah, ranges);
      });
      
      if (targetPageIndex !== -1 && targetPageIndex !== effectivePageIndex) {
        setEffectivePageIndex(targetPageIndex);
      }
    }
  }, [isOpen, playingAyahIndex, activeAyahs, effectivePages, effectivePageIndex]);

  // 2. Prevent screen sleep while QuranViewer is open (Screen Wake Lock)
  useEffect(() => {
    let wakeLock: any = null;

    async function requestWakeLock() {
      if ('wakeLock' in navigator) {
        try {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        } catch (err) {
          // Ignore wake lock requests blocked by sandbox/permissions
        }
      }
    }

    function handleVisibilityChange() {
      if (wakeLock !== null && document.visibilityState === 'visible') {
        requestWakeLock();
      }
    }

    if (isOpen) {
      requestWakeLock();
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLock) {
        wakeLock.release().catch(() => {});
      }
    };
  }, [isOpen]);

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const [imageErrorCount, setImageErrorCount] = useState(0);
  const [displayImageSrc, setDisplayImageSrc] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'text' | 'image'>('text');
  const [ayahs, setAyahs] = useState<AyahInfo[]>([]);
  const [loadingText, setLoadingText] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (isDropdownOpen && dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  const handleSelectPage = (index: number) => {
    setEffectivePageIndex(index);
    setIsDropdownOpen(false);
  };

  const currentPage = effectivePages[effectivePageIndex];
  const { juz: currentJuz, hizbText: currentHizbText } = getJuzAndHizbOfPage(currentPage);

  // Update display image source whenever page or error count changes
  useEffect(() => {
    let active = true;
    const updateImage = async () => {
      if (currentPage === undefined) {
        setDisplayImageSrc(null);
        return;
      }
      const src = await getPageImageSrc(currentPage, imageErrorCount);
      if (active) {
        setDisplayImageSrc(src);
      }
    };
    updateImage();
    return () => { active = false; };
  }, [currentPage, imageErrorCount]);

  // Figure out the subset
  let activeSubsets: VerseRange[] = [];
  if (currentPage) {
    if (verseRanges && verseRanges.length > 0) {
       // Only keep verse ranges that overlap with the current page
       const pageRanges = getVerseRangeForPage(currentPage);
       activeSubsets = [];
       verseRanges.forEach(vr => {
          pageRanges.forEach(pr => {
             if (vr.surah === pr.surah) {
                const start = Math.max(vr.start, pr.start);
                const end = Math.min(vr.end, pr.end);
                if (start <= end) {
                   activeSubsets.push({ surah: vr.surah, start, end });
                }
             }
          });
       });
    } else {
       activeSubsets = getActiveVersesForPageAndTask(currentPage, taskTitle);
    }
  }

  const hasStrictRestrictions = !!taskTitle && (
    taskTitle.includes("ربع") || 
    taskTitle.includes("نصف") || 
    taskTitle.includes("الربع") || 
    taskTitle.includes("النصف") || 
    taskTitle.includes("الآية") || 
    taskTitle.includes("الآيات")
  );

  const [quranWords, setQuranWords] = useState<any[] | null>(null);

  // Auto-scrolling in landscape mode to keep the currently playing verse in view
  useEffect(() => {
    if (isOpen && isLandscape && viewMode === 'text' && playingAyahIndex !== undefined && scrollContainerRef.current) {
      // Small timeout to allow the DOM highlighting/updates to apply and render
      const timer = setTimeout(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        // Find the active playing element (either quran-word or a text span)
        const playingElement = container.querySelector('[data-playing="true"]');
        if (playingElement) {
          const containerRect = container.getBoundingClientRect();
          const elemRect = playingElement.getBoundingClientRect();

          // Calculate top position of the playing element relative to container's top
          const relativeTop = elemRect.top - containerRect.top + container.scrollTop;
          
          // Center the playing element in the middle/upper section of the container
          const targetScrollTop = relativeTop - (containerRect.height / 3);

          container.scrollTo({
            top: Math.max(0, targetScrollTop),
            behavior: 'smooth'
          });
        }
      }, 200);

      return () => clearTimeout(timer);
    }
  }, [isOpen, isLandscape, viewMode, playingAyahIndex, effectivePageIndex, quranWords, ayahs]);

  useEffect(() => {
    setImageErrorCount(0);
    setFetchError(null);
  }, [currentPage]);

  // Load page text and words
  useEffect(() => {
    if (!currentPage || !isOpen) return;

    let isMounted = true;
    const fetchPageData = async () => {
      // Fast path: if already in memory cache, load instantly to avoid showing loading text
      if (memoryWordsCache[currentPage] && memoryPagesCache[currentPage]) {
        if (isMounted) {
          setQuranWords(memoryWordsCache[currentPage]);
          setAyahs(memoryPagesCache[currentPage]);
          setLoadingText(false);
          setFetchError(null);
        }
        return;
      }

      setLoadingText(true);
      setFetchError(null);

      let loadedWords: any[] | null = null;
      let loadedAyahs: AyahInfo[] = [];

      const fetchWordsPromise = async () => {
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
              console.warn("Words cache access error", cacheErr);
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
                  console.warn("Could not save words to cache", cacheStoreErr);
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
              loadedWords = wordsList;
              memoryWordsCache[currentPage] = wordsList;
            }
          }
        } catch (err: any) {
          if (navigator.onLine) {
            console.warn("Error loading Quran.com words:", err);
          }
        }
      };

      const fetchAyahsPromise = async () => {
        try {
          const pageUrl = `https://api.alquran.cloud/v1/page/${currentPage}/quran-uthmani`;
          let data: any = null;

          if ('caches' in window) {
            try {
              const pageCache = await caches.open('quran-pages-v1');
              const cachedRes = await pageCache.match(pageUrl);
              if (cachedRes) {
                data = await cachedRes.json();
              }
            } catch (cacheErr) {
              console.warn("Alquran cache access error", cacheErr);
            }
          }

          if (!data) {
            const response = await fetch(pageUrl);
            if (response.ok) {
              data = await response.json();
              if (data && data.code === 200 && 'caches' in window) {
                try {
                  const pageCache = await caches.open('quran-pages-v1');
                  await pageCache.put(pageUrl, new Response(JSON.stringify(data)));
                } catch (cacheStoreErr) {
                  console.warn("Could not write to page cache", cacheStoreErr);
                }
              }
            }
          }

          if (isMounted && data && data.code === 200) {
            loadedAyahs = data.data.ayahs;
            memoryPagesCache[currentPage] = data.data.ayahs;
          }
        } catch (err: any) {
          if (navigator.onLine) {
            console.warn("Error loading Alquran.cloud text:", err);
          }
        }
      };

      // Fetch concurrently
      await Promise.all([fetchWordsPromise(), fetchAyahsPromise()]);

      // Offline fallback: if loadedAyahs is still empty, load from bundled offline chunks
      if (loadedAyahs.length === 0) {
        try {
          const offlineAyahs = await getAyahsForPageOffline(currentPage);
          if (offlineAyahs && offlineAyahs.length > 0) {
            loadedAyahs = offlineAyahs;
            memoryPagesCache[currentPage] = offlineAyahs;
          }
        } catch (e) {
          console.warn("Failed to get ayahs from offline data", e);
        }
      }

      // Offline fallback: if loadedWords is still null, generate word tokens from loadedAyahs
      if (!loadedWords && loadedAyahs && loadedAyahs.length > 0) {
        const syntheticWords: any[] = [];
        for (const ayah of loadedAyahs) {
          const rawTokens = (ayah.text || "").trim().split(/\s+/);
          for (let pos = 0; pos < rawTokens.length; pos++) {
            syntheticWords.push({
              id: `${ayah.surah.number}_${ayah.numberInSurah}_${pos}`,
              position: pos + 1,
              text_uthmani: rawTokens[pos],
              char_type_name: 'word',
              line_number: 1,
              verse_key: `${ayah.surah.number}:${ayah.numberInSurah}`,
              verse_number: ayah.numberInSurah,
              surah_number: ayah.surah.number
            });
          }
        }
        if (syntheticWords.length > 0) {
          loadedWords = syntheticWords;
          memoryWordsCache[currentPage] = syntheticWords;
        }
      }

      if (isMounted) {
        if (loadedWords) {
          setQuranWords(loadedWords);
        }
        if (loadedAyahs.length > 0) {
          setAyahs(loadedAyahs);
        }

        if (!loadedWords && loadedAyahs.length === 0) {
          setFetchError("تعذر تحميل النص القرآني المكتوب. يمكنك الانتقال للمصحف المصور.");
          setViewMode('image');
        }
        setLoadingText(false);
      }
    };

    fetchPageData();
    return () => {
      isMounted = false;
    };
  }, [currentPage, isOpen]);

  // Background prefetching for other pages in the list to make navigation instant
  useEffect(() => {
    if (!isOpen || !effectivePages || effectivePages.length <= 1) return;

    let isMounted = true;
    const prefetchOtherPages = async () => {
      const indicesToPrefetch: number[] = [];
      
      // Prioritize immediately adjacent pages (next and then previous)
      if (effectivePageIndex + 1 < effectivePages.length) {
        indicesToPrefetch.push(effectivePageIndex + 1);
      }
      if (effectivePageIndex - 1 >= 0) {
        indicesToPrefetch.push(effectivePageIndex - 1);
      }
      
      // Add general pages list
      effectivePages.forEach((p, idx) => {
        if (idx !== effectivePageIndex && idx !== effectivePageIndex + 1 && idx !== effectivePageIndex - 1) {
          indicesToPrefetch.push(idx);
        }
      });

      for (const idx of indicesToPrefetch) {
        if (!isMounted) break;
        const pageToPrefetch = effectivePages[idx];
        if (!pageToPrefetch) continue;

        // 1. Prefetch Words
        if (!memoryWordsCache[pageToPrefetch]) {
          try {
            const wordsUrl = `https://api.quran.com/api/v4/verses/by_page/${pageToPrefetch}?words=true&word_fields=text_uthmani,line_number&per_page=50`;
            let wordsData: any = null;

            if ('caches' in window) {
              const cache = await caches.open('quran-words-v1');
              const cachedRes = await cache.match(wordsUrl);
              if (cachedRes) {
                wordsData = await cachedRes.json();
              } else {
                const res = await fetch(wordsUrl);
                if (res.ok) {
                  wordsData = await res.json();
                  await cache.put(wordsUrl, new Response(JSON.stringify(wordsData)));
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
                memoryWordsCache[pageToPrefetch] = wordsList;
              }
            }
          } catch (err) {
            console.debug("Prefetch words error", err);
          }
        }

        // 2. Prefetch Ayahs text
        if (!memoryPagesCache[pageToPrefetch]) {
          try {
            const pageUrl = `https://api.alquran.cloud/v1/page/${pageToPrefetch}/quran-uthmani`;
            let data: any = null;

            if ('caches' in window) {
              const pageCache = await caches.open('quran-pages-v1');
              const cachedRes = await pageCache.match(pageUrl);
              if (cachedRes) {
                data = await cachedRes.json();
              } else {
                const res = await fetch(pageUrl);
                if (res.ok) {
                  data = await res.json();
                  await pageCache.put(pageUrl, new Response(JSON.stringify(data)));
                }
              }
            }

            if (isMounted && data && data.code === 200) {
              memoryPagesCache[pageToPrefetch] = data.data.ayahs;
            }
          } catch (err) {
            console.debug("Prefetch page text error", err);
          }
        }
      }
    };

    // Delay slightly to prioritize current page displaying
    const timer = setTimeout(() => {
      prefetchOtherPages();
    }, 800);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [effectivePages, effectivePageIndex, isOpen]);

  const getImageUrl = (page: number | undefined, fallbackStep: number) => {
    if (page === undefined || page === null || isNaN(page)) return null;
    const pagePad = page.toString().padStart(3, '0');
    if (fallbackStep === 0) {
      return `https://android.quran.com/data/width_1260/page${pagePad}.png`;
    } else if (fallbackStep === 1) {
      return `https://android.quran.com/data/width_1024/page${pagePad}.png`;
    } else {
      return `https://android.quran.com/data/width_512/page${pagePad}.png`;
    }
  };

  const handleImageError = () => {
    if (imageErrorCount < 2) {
      setImageErrorCount(prev => prev + 1);
    }
  };

  if (!isOpen) return null;

  // Group ayahs by Surah
  const surahGroups: SurahGroup[] = [];
  ayahs.forEach(ayah => {
    let group = surahGroups.find(g => g.number === ayah.surah.number);
    if (!group) {
      group = {
        name: ayah.surah.name,
        number: ayah.surah.number,
        ayahs: []
      };
      surahGroups.push(group);
    }
    group.ayahs.push(ayah);
  });

  // Calculate lines from quranWords
  const quranLines: LineData[] = [];
  if (quranWords && quranWords.length > 0) {
    const maxLine = Math.max(...quranWords.map(w => w.line_number), 15);
    for (let i = 0; i < maxLine; i++) {
      quranLines.push({
        lineNumber: i + 1,
        type: 'empty',
        words: []
      });
    }

    for (const w of quranWords) {
      const lineIdx = w.line_number - 1;
      if (quranLines[lineIdx]) {
        quranLines[lineIdx].type = 'text';
        quranLines[lineIdx].words!.push(w);
      }
    }

    const startingSurahs = [...new Set(quranWords.map(w => w.surah_number as number))].filter((sNum): sNum is number =>
      quranWords.some(w => (w.surah_number as number) === sNum && w.verse_number === 1)
    );

    for (const sNum of startingSurahs) {
      const firstWord = quranWords.find(w => (w.surah_number as number) === sNum && w.verse_number === 1);
      if (firstWord) {
        const lineStart = firstWord.line_number as number;
        const hasBismillahBefore = sNum !== 9 && sNum !== 1;
        const surahMeta = SURAH_METADATAList.find(s => s.name === ayahs.find(a => a.surah.number === sNum)?.surah.name) || SURAH_METADATAList[sNum - 1];
        const rawName = surahMeta ? surahMeta.name : (ayahs.find(a => a.surah.number === sNum)?.surah.name || `سورة ${sNum}`);
        const surahName = `سُورَةُ ${rawName}`;

        if (hasBismillahBefore) {
          const bismillahLineIdx = lineStart - 1 - 1;
          if (bismillahLineIdx >= 0 && quranLines[bismillahLineIdx]) {
            quranLines[bismillahLineIdx].type = 'bismillah';
            quranLines[bismillahLineIdx].surahNumber = sNum;
          }

          const headerLineIdx = lineStart - 2 - 1;
          if (headerLineIdx >= 0 && quranLines[headerLineIdx]) {
            quranLines[headerLineIdx].type = 'surah_header';
            quranLines[headerLineIdx].surahNumber = sNum;
            quranLines[headerLineIdx].surahName = surahName;
          }
        } else {
          const headerLineIdx = lineStart - 1 - 1;
          if (headerLineIdx >= 0 && quranLines[headerLineIdx]) {
            quranLines[headerLineIdx].type = 'surah_header';
            quranLines[headerLineIdx].surahNumber = sNum;
            quranLines[headerLineIdx].surahName = surahName;
          }
        }
      }
    }
  }

  const totalLinesCount = quranLines.length || 15;
  
  // Calculate proportional size according to original Mushaf page ratio (1 / 1.55)
  const mushafAspectRatio = 1 / 1.55;
  
  // Use stable, constant padding regardless of buttons visibility to prevent layout shifts and CPU recalculations
  const paddingX = containerSize.width < 500 ? 16 : 48;
  const paddingY = containerSize.height < 700 ? 100 : 130;
  
  const maxW = Math.max(100, containerSize.width - (isLandscape ? 0 : paddingX));
  const maxH = Math.max(150, containerSize.height - paddingY);
  
  let boxWidth = maxW;
  let boxHeight = boxWidth / mushafAspectRatio;
  
  if (!isLandscape && boxHeight > maxH) {
    boxHeight = maxH;
    boxWidth = maxH * mushafAspectRatio;
  }
  
  if (boxWidth > maxW) {
    boxWidth = maxW;
    boxHeight = maxW / mushafAspectRatio;
  }

  // Calculate high-precision available line height budget to completely prevent vertical overflow
  // Align margins of the digital text page nicely with the Medina scanned Mushaf page proportions.
  // In dynamic responsive sizes, we apply narrow 3.5% right/left margins and 4.0% top/bottom margins,
  // matching standard Quran frames and borders perfectly with slightly reduced margins.
  const dynamicPaddingX = boxWidth * 0.035;
  const dynamicPaddingY = boxHeight * 0.040;

  // 1. Vertical padding of the text container itself is 2 * dynamicPaddingY.
  // 2. Vertical gap between elements inside the central flex container:
  //    if boxHeight < 450, gap is 2px. Else, 4px.
  const spacingPerGap = boxHeight < 450 ? 2 : 4;
  const totalGapsHeight = (totalLinesCount - 1) * spacingPerGap;
  
  // 3. Subtract an extra safe margin of 4px for line layout/bounding boxes
  const totalVerticalSpacing = (2 * dynamicPaddingY) + totalGapsHeight + 4;
  
  // Determine exact safe maximum layout height for each of the 15 line slots
  const remainingHeightBudget = Math.max(100, boxHeight - totalVerticalSpacing);
  const maxLineHeight = remainingHeightBudget / totalLinesCount;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="fixed inset-0 z-[100] bg-[#FDFBF7] dark:bg-[#121212] font-amiri overflow-hidden"
      dir="rtl"
    >
        {/* Reading Viewport (Absolute background) */}
        <div 
          ref={measurementRef}
          onClick={() => setAreControlsVisible(prev => !prev)}
          className={`absolute inset-0 overflow-hidden flex flex-col items-center ${isLandscape ? 'justify-start' : 'justify-center'} select-none cursor-pointer`}
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
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 }
              }}
              drag="x"
              dragDirectionLock
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.8}
              onDragEnd={handleDragEnd}
              className={`absolute inset-0 flex flex-col items-center ${
                isLandscape 
                  ? 'overflow-y-auto justify-start pt-4 pb-32 scroll-smooth' 
                  : 'overflow-hidden justify-center'
              }`}
            >
              {viewMode === 'text' ? (
                <div 
                  style={{ 
                    width: `${boxWidth}px`,
                    height: isLandscape ? 'auto' : `${boxHeight}px`,
                    minHeight: isLandscape ? '100%' : 'auto',
                    paddingLeft: `${dynamicPaddingX}px`,
                    paddingRight: `${dynamicPaddingX}px`,
                    paddingTop: `${dynamicPaddingY}px`,
                    paddingBottom: `${dynamicPaddingY}px`
                  }}
                  className={`bg-[#FFFDF9] dark:bg-[#1C1C1E] ${
                    isLandscape ? 'rounded-none border-0' : 'rounded-2xl border-4 border-double border-amber-950/15 dark:border-amber-500/15 shadow-xl'
                  } relative flex flex-col box-border transition-[filter] duration-300 ${isLandscape ? 'justify-start overflow-y-visible' : 'justify-center overflow-hidden'} ${
                    loadingText ? 'opacity-40 blur-[1px]' : 'opacity-100'
                  }`}
                >
              {quranWords && quranWords.length > 0 ? (
                <div 
                  style={{ gap: `${spacingPerGap}px` }}
                  className={`w-full flex-1 flex flex-col py-0.5 relative min-h-0 overflow-visible ${isLandscape ? 'justify-start' : 'justify-center'}`}
                >
                  {quranLines.map((line) => {
                    if (line.type === 'surah_header') {
                      return (
                        <QuranSurahHeader 
                          key={`header-${line.lineNumber}-${line.surahNumber}`} 
                          surahName={line.surahName || ''} 
                          maxLineHeight={maxLineHeight}
                          isCompact={boxHeight < 500}
                          isLandscape={isLandscape}
                        />
                      );
                    } else if (line.type === 'bismillah') {
                      return (
                        <QuranBismillah 
                          key={`bismillah-${line.lineNumber}-${line.surahNumber}`} 
                          maxLineHeight={maxLineHeight}
                          isCompact={boxHeight < 500}
                          isLandscape={isLandscape}
                        />
                      );
                    } else if (line.type === 'empty') {
                      return (
                        <div 
                          key={`empty-${line.lineNumber}`} 
                          style={{ height: `${maxLineHeight}px` }} 
                          className="w-full bg-transparent"
                        />
                      );
                    } else {
                      return (
                        <QuranLine
                          key={`line-${line.lineNumber}`}
                          words={line.words || []}
                          activeSubsets={activeSubsets}
                          maxLineHeight={maxLineHeight}
                          isLandscape={isLandscape}
                          hasStrictRestrictions={hasStrictRestrictions}
                          selectedAyahs={selectedAyahs}
                          onPointerDown={handlePointerDown}
                          onPointerUp={handlePointerUp}
                          onPointerMove={handlePointerMove}
                          ayahs={ayahs}
                        />
                      );
                    }
                  })}
                </div>
              ) : (
                /* Fallback to traditional Surah groups view if words are not ready */
                <div className="w-full h-full overflow-y-auto">
                  {surahGroups.map((group) => (
                    <div key={group.number} className="mb-8 font-amiri">
                      {/* Surah Banner */}
                      <div className="my-6 border-y-2 border-amber-200/30 dark:border-amber-900/15 py-2.5 text-center bg-amber-50/10 dark:bg-amber-900/5 relative rounded-md">
                        <span className="text-amber-900 dark:text-amber-400 font-bold text-lg md:text-xl font-amiri block">
                          {group.name}
                        </span>
                      </div>

                      {/* Verses Paragraph */}
                      <div className="text-right leading-[2.5] md:leading-[3] text-lg md:text-xl space-y-4 px-1 md:px-4 text-justify select-text font-amiri">
                        {group.ayahs.map((ayah) => {
                          const active = isAyahActive(ayah, activeSubsets, hasStrictRestrictions);
                          const currentPlayingAyah = activeAyahs[playingAyahIndex];
                          const isAyahPlaying = currentPlayingAyah && 
                                                currentPlayingAyah.surah.number === group.number && 
                                                currentPlayingAyah.numberInSurah === ayah.numberInSurah;
                          const isSelected = selectedAyahs.some(a => a.ayah.numberInSurah === ayah.numberInSurah && a.group.number === group.number);
                          return (
                            <span
                              key={ayah.numberInSurah}
                              data-playing={isAyahPlaying ? "true" : "false"}
                              onPointerDown={(e) => handlePointerDown(e, ayah, group)}
                              onPointerUp={handlePointerUp}
                              onPointerLeave={handlePointerUp}
                              onPointerCancel={handlePointerUp}
                              onPointerMove={handlePointerMove}
                              onContextMenu={(e) => { e.preventDefault(); handlePointerDown(e as any, ayah, group); }}
                              className={`transition-colors duration-200 inline font-amiri rounded leading-relaxed break-words overflow-visible ${
                                isAyahPlaying
                                  ? 'bg-amber-300 dark:bg-amber-600/60 text-amber-950 dark:text-white font-extrabold shadow-[0_2px_8px_rgba(212,175,55,0.6)] pt-1 pb-1.5 px-1.5 border border-amber-400 dark:border-amber-500/50'
                                  : isSelected
                                  ? 'bg-amber-200 dark:bg-amber-700/60 text-amber-900 dark:text-white font-extrabold border-2 border-amber-500 dark:border-amber-400 shadow-sm pt-1 pb-1.5 px-1.5'
                                  : active && hasStrictRestrictions
                                  ? 'bg-[#FCF6E8] dark:bg-amber-600/35 text-[#1d1105] dark:text-white font-extrabold shadow-[0_1.5px_4px_rgba(180,139,48,0.15)] pt-1 pb-1.5 px-1.5'
                                  : active
                                  ? 'text-[#1d1105] dark:text-white font-extrabold py-1 px-1.5'
                                  : 'text-gray-500/80 dark:text-gray-400/80 hover:text-amber-950 dark:hover:text-amber-100 py-1 px-1.5'
                              }`}
                            >
                              {ayah.text}{" "}
                              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full border mx-1 select-none font-mono ${
                                ayah.numberInSurah > 99 ? 'text-[8.5px]' : 'text-[11px]'
                              } ${
                                isAyahPlaying
                                  ? 'border-amber-500 text-amber-950 dark:text-white font-extrabold bg-amber-500/20'
                                  : active && hasStrictRestrictions
                                  ? 'border-[#B48B30]/70 text-[#1d1105] dark:text-amber-200 font-extrabold bg-amber-500/10'
                                  : active
                                  ? 'border-amber-500/40 text-[#1d1105] dark:text-amber-100 font-extrabold bg-amber-500/5'
                                  : 'border-gray-300 dark:border-gray-700 text-gray-400 dark:text-gray-500'
                              }`}>
                                {ayah.numberInSurah}
                              </span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!loadingText && (!quranWords || quranWords.length === 0) && ayahs.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-gray-500 dark:text-gray-400 font-sans">
                  لا توجد بيانات لهذه الصفحة.
                </div>
              )}
            </div>
          ) : (
            <div 
              style={{ 
                width: `${boxWidth}px`,
                height: isLandscape ? 'auto' : `${boxHeight}px`,
                minHeight: isLandscape ? '100%' : 'auto',
                paddingTop: '8px',
                paddingBottom: '8px'
              }}
              className={`bg-[#FFFDF9] dark:bg-[#1C1C1E] px-2 md:px-3 ${
                isLandscape ? 'rounded-none border-0' : 'rounded-2xl border-4 border-double border-amber-950/15 dark:border-amber-500/15 shadow-xl'
              } relative flex flex-col transition-[opacity,filter] duration-300 ${isLandscape ? 'justify-start overflow-y-visible' : 'justify-center overflow-hidden'} ${
                loadingText ? 'opacity-40 blur-[1px]' : 'opacity-100'
              }`}
            >
              {displayImageSrc ? (
                  <img
                    src={displayImageSrc}
                    alt={`صفحة المصحف رقم ${currentPage}`}
                    style={{ width: '100%', height: isLandscape ? 'auto' : '100%' }}
                    className="object-contain mx-auto rounded-lg select-none mix-blend-multiply dark:mix-blend-normal dark:invert dark:hue-rotate-180 transition-all duration-300"
                    onError={handleImageError}
                    loading="eager"
                    referrerPolicy="no-referrer"
                  />
              ) : null}
            </div>
          )}

          {/* Loading spinner overlay directly in the viewport */}
          {loadingText && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#FDFBF7]/15 dark:bg-[#121212]/15 pointer-events-none z-20">
              <Loader2 className="w-8 h-8 text-amber-600 dark:text-amber-500 animate-spin" />
            </div>
          )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Floating Close Button when controls are hidden */}
        <AnimatePresence>
          {!areControlsVisible && (
            <>
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                className="absolute top-4 left-4 z-50 p-2 rounded-full bg-[#FDFBF7]/80 dark:bg-[#121211]/80 backdrop-blur-md shadow-md border border-amber-200/20 dark:border-amber-900/20 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all text-gray-500 dark:text-gray-400"
                title="إغلاق"
              >
                <X className="w-5 h-5" />
              </motion.button>

              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-4 right-4 z-50 px-3 py-1.5 rounded-full bg-[#FDFBF7]/80 dark:bg-[#121211]/80 backdrop-blur-md shadow-md border border-amber-200/20 dark:border-amber-900/20 text-sm font-bold text-amber-900 dark:text-amber-500 flex items-center gap-1.5"
              >
                <span>صفحة {currentPage}</span>
                <span className="text-xs text-amber-800/60 dark:text-amber-400/60 font-medium">
                  (الجزء {currentJuz}{currentHizbText ? ` • ${currentHizbText}` : ''})
                </span>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Top Controls Overlay (Combined Header and Mode Switcher) */}
        <AnimatePresence>
          {areControlsVisible && (
            <motion.div
              ref={headerRef}
              initial={{ opacity: 0, y: -160 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -160 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="absolute top-0 left-0 right-0 z-50 flex flex-col border-b border-amber-200/30 dark:border-amber-900/30 bg-[#FDFBF7]/95 dark:bg-[#121211]/95 backdrop-blur-md shadow-md"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-2 pb-1">
                <div className="flex flex-col text-right max-w-[75%] flex-1">
                  <h2 className="text-base font-bold text-amber-900 dark:text-amber-500 flex flex-wrap items-center gap-1.5">
                    <span>صفحة {currentPage}</span>
                    <span className="text-xs text-amber-800/60 dark:text-amber-400/60 font-medium">
                      (الجزء {currentJuz}{currentHizbText ? ` • ${currentHizbText}` : ''})
                    </span>
                  </h2>
                  <span className="text-xs text-gray-600 dark:text-gray-300 font-sans mt-0.5 break-words line-clamp-2">
                    {taskTitle}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); onClose(); }}
                    className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5"
                  >
                    <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Mode Switcher */}
              <div className="flex justify-center p-1 bg-amber-50/10 dark:bg-black/10 border-t border-amber-200/10">
                <div className="flex gap-1 bg-amber-100/30 dark:bg-amber-950/20 p-0 rounded-xl">
                  <button
                    onClick={(e) => { e.stopPropagation(); setViewMode('text'); }}
                    disabled={!!fetchError}
                    className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold font-sans transition-all flex items-center gap-0.5 ${
                      viewMode === 'text'
                        ? 'bg-[#1A2E1A] text-white dark:bg-[#D4AF37] dark:text-[#1A2E1A] shadow'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-50'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    رقمي
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setViewMode('image'); }}
                    className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold font-sans transition-all flex items-center gap-0.5 ${
                      viewMode === 'image'
                        ? 'bg-[#1A2E1A] text-white dark:bg-[#D4AF37] dark:text-[#1A2E1A] shadow'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    مصور
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer Overlay */}
        <AnimatePresence>
          {areControlsVisible && effectivePages.length >= 1 && (
            <motion.div
              initial={{ opacity: 0, y: 80 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 80 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="absolute bottom-0 left-0 right-0 z-50 px-3 py-2 border-t border-gray-100 dark:border-white/10 flex flex-col justify-between bg-[#FDFBF7]/95 dark:bg-[#121211]/95 backdrop-blur-md shadow-lg"
              style={{ height: `${headerHeight}px` }}
              onClick={(e) => e.stopPropagation()}
            >
              {effectivePages.length > 0 && (
                <div className="flex flex-col gap-0.5 w-full">
                  <div className="w-full h-1 bg-gray-200 dark:bg-white/10 rounded-full">
                    <div className="h-full bg-amber-600 rounded-full" style={{ width: `${audioProgress}%` }} />
                  </div>
                  <div className="flex items-center justify-between w-full px-1">
                    <button onClick={(e) => { e.stopPropagation(); prevAyah(); }} className="p-1 rounded-full hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-800 dark:text-amber-200"><SkipForward className="w-3.5 h-3.5"/></button>
                    <button 
                      onClick={async (e) => { 
                        e.stopPropagation(); 
                        const currentTaskId = customSequenceMode ? 'custom-sequence' : `viewer-playing-${effectivePages.join(',')}-${taskTitle || ""}`;
                        if (playingTaskId !== currentTaskId || activeAyahs.length === 0) {
                          if (customSequenceMode && verseRanges && verseRanges.length > 0) {
                            const ranges = verseRanges.map(vr => ({surah: Number(vr.surah), start: vr.start, end: vr.end}));
                            await playCustomSequence(ranges, ayahRepeat || 1, sequenceRepeat || 1);
                          } else {
                            const dummyTask = {
                              id: currentTaskId,
                              title: taskTitle || "صفحات القراءة",
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
                      className="p-1.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-100"
                    >
                      {isPlaying ? <Pause className="w-4 h-4"/> : <Play className="w-4 h-4"/>}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); stopAudio(); }} className="p-1 rounded-full hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-800 dark:text-amber-200" title="إيقاف تماماً"><Square className="w-3.5 h-3.5"/></button>
                    <button onClick={(e) => { e.stopPropagation(); nextAyah(); }} className="p-1 rounded-full hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-800 dark:text-amber-200"><SkipBack className="w-3.5 h-3.5"/></button>
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        const speeds = ["1.0", "1.2", "1.4", "1.5", "1.6", "1.8", "2.0"];
                        const currentIndex = speeds.indexOf(currentSpeed);
                        const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
                        updatePlaybackSettings(undefined, nextSpeed); 
                      }} 
                      className="text-[10px] font-bold font-sans text-amber-800 dark:text-amber-200 px-1.5 py-0.5 rounded hover:bg-amber-100 dark:hover:bg-amber-900/30"
                    >
                      {currentSpeed}x
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); restartFromBeginning(); }}
                      className="p-1 rounded-full hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-800 dark:text-amber-200"
                      title="الرجوع من البداية"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <select 
                      value={currentQari}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => updatePlaybackSettings(e.target.value, undefined)}
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
                  onClick={(e) => { e.stopPropagation(); setEffectivePageIndex(p => p - 1); }}
                  className="px-2 py-1 flex items-center gap-1 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-500 disabled:opacity-50 text-[10px] font-bold font-sans"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                  <span>السابق</span>
                </button>
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={(e) => { e.stopPropagation(); setIsDropdownOpen(!isDropdownOpen); }}
                    className="text-xs font-bold text-gray-700 dark:text-gray-200 hover:text-amber-600 dark:hover:text-amber-500 transition-colors cursor-pointer px-3 py-1 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/10 font-sans flex items-center gap-1 border border-gray-100 dark:border-white/5"
                    title="اختر الصفحة"
                  >
                    <span dir="ltr" className="inline-block">{effectivePageIndex + 1} / {effectivePages.length}</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
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
                            onClick={() => handleSelectPage(idx)}
                            className={`w-full text-right px-3 py-2 rounded-xl text-[11px] font-bold font-sans transition-all flex items-center justify-between ${
                              idx === effectivePageIndex 
                                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20' 
                                : 'text-gray-600 dark:text-gray-300 hover:bg-amber-50 dark:hover:bg-white/5 hover:text-amber-600 dark:hover:text-amber-400'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              {idx === effectivePageIndex && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                              <span>صفحة {pageNum}</span>
                            </span>
                            <span className={`text-[10px] ${idx === effectivePageIndex ? 'text-white/70' : 'text-gray-400 opacity-50'}`}>#{idx + 1}</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <button
                  disabled={effectivePageIndex === effectivePages.length - 1}
                  onClick={(e) => { e.stopPropagation(); setEffectivePageIndex(p => p + 1); }}
                  className="px-2 py-1 flex items-center gap-1 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-500 disabled:opacity-50 text-[10px] font-bold font-sans"
                >
                  <span>التالي</span>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Floating Action Bar for Multi-selection */}
        <AnimatePresence>
          {selectedAyahs.length > 0 && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] bg-white dark:bg-gray-800 shadow-2xl rounded-full px-4 py-3 flex items-center gap-4 border border-gray-200 dark:border-gray-700"
            >
              <button 
                onClick={() => setSelectedAyahs([])} 
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
                title="إلغاء التحديد"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex items-center justify-center bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 font-bold w-8 h-8 rounded-full text-sm">
                {selectedAyahs.length}
              </div>
              
              <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1"></div>
              
              <button 
                onClick={playSelectedAyahs}
                className="flex items-center gap-2 px-3 py-2 rounded-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm transition-colors shadow-lg shadow-amber-600/30"
              >
                <Play className="w-4 h-4" />
                <span>استماع</span>
              </button>
              
              <button 
                onClick={() => setShareMenuOpen(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 font-bold text-sm transition-colors"
              >
                <Share2 className="w-4 h-4" />
                <span>مشاركة</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Share Dialog */}
        <AnimatePresence>
          {shareMenuOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[210] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
              onClick={() => setShareMenuOpen(false)}
            >
              <motion.div 
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-xl text-gray-800 dark:text-white flex items-center gap-2">
                    <Share2 className="w-5 h-5 text-amber-500" />
                    خيارات المشاركة
                  </h3>
                  <button onClick={() => setShareMenuOpen(false)} className="text-gray-500 hover:text-gray-800 dark:hover:text-white bg-gray-100 dark:bg-gray-700 p-1.5 rounded-full">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                {/* Hidden Container for Image Generation */}
                <div className="absolute top-0 left-0 -z-10 opacity-0 pointer-events-none">
                    <div ref={shareContainerRef} className="bg-[#FCF6E8] p-8 w-[600px] text-center font-amiri rounded-xl border-4 border-amber-900/10">
                        <div className="mb-4 text-amber-600/80">
                            <BookOpen className="w-8 h-8 mx-auto opacity-50" />
                        </div>
                        {selectedAyahs.map((a, idx) => (
                           <div key={idx} className="mb-4">
                               <p className="text-2xl leading-[2.5] text-[#1d1105]">{a.ayah.text} ﴿{a.ayah.numberInSurah}﴾</p>
                               {idx === selectedAyahs.length - 1 && (
                                   <p className="mt-5 text-lg text-[#1d1105] font-sans font-extrabold border-t border-amber-900/15 pt-4">
                                       سورة {a.group.name}
                                   </p>
                               )}
                           </div>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={copyAyah}
                    className="flex flex-col items-center justify-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:border-amber-300 dark:hover:border-amber-700 transition-colors group"
                  >
                    <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Copy className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="font-bold text-gray-700 dark:text-gray-200">نص</span>
                  </button>
                  
                  <button 
                    onClick={generateImage}
                    disabled={isGeneratingImage}
                    className="flex flex-col items-center justify-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:border-amber-300 dark:hover:border-amber-700 transition-colors group disabled:opacity-60"
                  >
                    <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                      {isGeneratingImage ? <Loader2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 animate-spin" /> : <ImageIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />}
                    </div>
                    <span className="font-bold text-gray-700 dark:text-gray-200">{isGeneratingImage ? 'جاري التحضير...' : 'صورة'}</span>
                  </button>

                  <button 
                    onClick={downloadAudio}
                    disabled={isGeneratingAudio}
                    className="flex flex-col items-center justify-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:border-amber-300 dark:hover:border-amber-700 transition-colors group disabled:opacity-60"
                  >
                    <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                      {isGeneratingAudio ? <Loader2 className="w-6 h-6 text-amber-800 dark:text-amber-400 animate-spin" /> : <Headphones className="w-6 h-6 text-amber-800 dark:text-amber-400" />}
                    </div>
                    <span className="font-bold text-gray-700 dark:text-gray-200">{isGeneratingAudio ? 'جاري التحضير...' : 'صوت'}</span>
                  </button>

                  <button 
                    onClick={generateVideo}
                    disabled={isGeneratingVideo}
                    className="flex flex-col items-center justify-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:border-amber-300 dark:hover:border-amber-700 transition-colors group disabled:opacity-60"
                  >
                    <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                      {isGeneratingVideo ? <Loader2 className="w-6 h-6 text-rose-600 dark:text-rose-400 animate-spin" /> : <Video className="w-6 h-6 text-rose-600 dark:text-rose-400" />}
                    </div>
                    <span className="font-bold text-gray-700 dark:text-gray-200">{isGeneratingVideo ? 'جاري التحضير...' : 'فيديو'}</span>
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Image Preview Overlay */}
        <AnimatePresence>
          {generatedImageSrc && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[220] flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
              onClick={() => setGeneratedImageSrc(null)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-lg flex flex-col gap-4 shadow-2xl border border-gray-150 dark:border-gray-800"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-800">
                  <h4 className="font-bold text-lg text-gray-800 dark:text-white">معاينة بطاقة الآية</h4>
                  <button 
                    onClick={() => setGeneratedImageSrc(null)}
                    className="p-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-800 dark:hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="overflow-y-auto max-h-[50vh] rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-black p-4 flex justify-center">
                  <img 
                    src={generatedImageSrc} 
                    alt="Quran Verse Card" 
                    className="max-w-full h-auto rounded-lg shadow-md"
                  />
                </div>

                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 p-3 rounded-xl text-amber-850 dark:text-amber-200 text-xs font-bold text-center leading-relaxed">
                  💡 اضغط مطولاً على الصورة أعلاه لحفظها في ألبوم الصور أو مشاركتها مباشرة عبر تطبيقات الهاتف.
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch(generatedImageSrc);
                        const blob = await res.blob();
                        if (typeof ClipboardItem !== 'undefined') {
                          await navigator.clipboard.write([
                            new ClipboardItem({ [blob.type]: blob })
                          ]);
                          showToast("تم نسخ الصورة إلى حافظة جهازك!");
                        } else {
                          showToast("النسخ غير مدعوم، يرجى حفظ الصورة بالضغط المطول.");
                        }
                      } catch {
                        showToast("يرجى حفظ الصورة بالضغط المطول.");
                      }
                    }}
                    className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition-colors text-sm"
                  >
                    نسخ الصورة
                  </button>
                  <button
                    onClick={() => handleShare(generatedImageSrc, `quran_ayah_${Date.now()}.png`, "مشاركة بطاقة الآية")}
                    className="flex-1 py-3 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-800 dark:text-white text-center font-bold rounded-xl transition-colors text-sm"
                  >
                    مشاركة
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Audio Preview Overlay */}
        <AnimatePresence>
          {generatedAudioSrc && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[220] flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
              onClick={() => setGeneratedAudioSrc(null)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md flex flex-col gap-4 shadow-2xl border border-gray-150 dark:border-gray-800"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-800">
                  <h4 className="font-bold text-lg text-gray-800 dark:text-white">الاستماع للمقطع الصوتي</h4>
                  <button 
                    onClick={() => setGeneratedAudioSrc(null)}
                    className="p-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-800 dark:hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="p-6 bg-amber-50/50 dark:bg-amber-950/10 rounded-xl border border-amber-100 dark:border-amber-950 flex flex-col items-center gap-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                     <Headphones className="w-8 h-8 animate-pulse" />
                  </div>
                  <div>
                    <h5 className="font-bold text-gray-800 dark:text-gray-100">استماع الآيات المحددة</h5>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      سورة {selectedAyahs[0]?.group.name} - الآيات {selectedAyahs.map(a => a.ayah.numberInSurah).join(', ')}
                    </p>
                  </div>
                  <audio controls className="w-full mt-2" src={generatedAudioSrc} autoPlay />
                </div>

                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 p-3 rounded-xl text-amber-850 dark:text-amber-200 text-xs font-bold text-center leading-relaxed">
                  💡 يمكنك تشغيل المقطع الصوتي مباشرة أو مشاركته كملف MP3 عبر زر المشاركة أدناه.
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => handleShare(generatedAudioSrc, `quran_listening_${Date.now()}.mp3`, "مشاركة الاستماع")}
                    className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-center transition-colors text-sm"
                  >
                    مشاركة الاستماع
                  </button>
                  <button
                    onClick={() => setGeneratedAudioSrc(null)}
                    className="flex-1 py-3 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-800 dark:text-white font-bold rounded-xl transition-colors text-sm"
                  >
                    إغلاق
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Video Preview Overlay */}
        <AnimatePresence>
          {generatedVideoSrc && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[220] flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
              onClick={() => setGeneratedVideoSrc(null)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-lg flex flex-col gap-4 shadow-2xl border border-gray-150 dark:border-gray-800"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-800">
                  <h4 className="font-bold text-lg text-gray-800 dark:text-white">معاينة الفيديو</h4>
                  <button 
                    onClick={() => setGeneratedVideoSrc(null)}
                    className="p-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-800 dark:hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-black flex justify-center">
                  <video 
                    src={generatedVideoSrc} 
                    controls 
                    className="max-w-full max-h-[45vh] rounded-lg"
                    autoPlay
                  />
                </div>

                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 p-3 rounded-xl text-amber-850 dark:text-amber-200 text-xs font-bold text-center leading-relaxed">
                  💡 تم دمج بطاقة الآيات مع تلاوتها بنجاح! يمكنك تشغيل الفيديو ومشاركته مباشرة بجودة ممتازة في حساباتك.
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => handleShare(generatedVideoSrc, `quran_video_${Date.now()}.webm`, "مشاركة الفيديو")}
                    className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-center transition-colors text-sm"
                  >
                    مشاركة الفيديو
                  </button>
                  <button
                    onClick={() => setGeneratedVideoSrc(null)}
                    className="flex-1 py-3 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-800 dark:text-white font-bold rounded-xl transition-colors text-sm"
                  >
                    إغلاق
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Toast Notification */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className="fixed top-4 left-1/2 -translate-x-1/2 z-[300] bg-gray-900/95 text-white px-5 py-3 rounded-full shadow-2xl text-xs md:text-sm font-bold flex items-center gap-2 border border-white/10 backdrop-blur"
            >
              <span>{toastMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
  );
}
