import React, { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';
import { AyahInfo, fetchActiveAyahsForTask } from '../utils/ayahFetcher';
import { SURAH_METADATAList } from '../utils/quranPageMapping';
import { getAudioSrc } from '../utils/offlineCache';
import { Task } from '../types';
import { WifiOff, X } from 'lucide-react';

interface AudioContextType {
  playingTaskId: string | null;
  isPlaying: boolean;
  isLoadingAudio: boolean;
  audioProgress: number;
  activeAyahs: AyahInfo[];
  playingAyahIndex: number;
  currentQari: string;
  currentSpeed: string;
  networkErrorNotification: string | null;
  setNetworkErrorNotification: (msg: string | null) => void;
  playPages: (e: React.MouseEvent<HTMLButtonElement | HTMLDivElement> | null, task: Task, startAyahInfo?: {surah: number, numberInSurah: number}) => Promise<void>;
  playSingleAyah: (e: React.MouseEvent<HTMLButtonElement | HTMLDivElement> | null, ayah: AyahInfo) => Promise<void>;
  playCustomSequence: (ranges: {surah: number, start: number, end: number}[], ayahRepeat: number, sequenceRepeat: number) => Promise<void>;
  stopAudio: () => void;
  togglePlay: () => void;
  updatePlaybackSettings: (qari?: string, speed?: string) => void;
  nextAyah: () => void;
  prevAyah: () => void;
  restartFromBeginning: () => void;
  ayahRepeatCount: number;
  sequenceRepeatCount: number;
  currentAyahRepeat: number;
  currentSequenceRepeat: number;
  setAyahRepeatCount: (count: number) => void;
  setSequenceRepeatCount: (count: number) => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const AudioProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [playingTaskId, setPlayingTaskId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [playingAyahIndex, setPlayingAyahIndex] = useState(0);
  const [activeAyahs, setActiveAyahs] = useState<AyahInfo[]>([]);
  const [currentQari, setCurrentQari] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('quran_qari') || 'Minshawy_Murattal_128kbps' : 'Minshawy_Murattal_128kbps');
  const [currentSpeed, setCurrentSpeed] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('quran_speed') || '1.0' : '1.0');
  const [networkErrorNotification, setNetworkErrorNotification] = useState<string | null>(null);
  const [ayahRepeatCount, setAyahRepeatCount] = useState(1);
  const [sequenceRepeatCount, setSequenceRepeatCount] = useState(1);
  const [currentAyahRepeat, setCurrentAyahRepeat] = useState(1);
  const [currentSequenceRepeat, setCurrentSequenceRepeat] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wakeLockRef = useRef<any>(null);
  const activeAyahRequestIdRef = useRef<number>(0);

  useEffect(() => {
    const requestWakeLock = async () => {
      if (isPlaying && 'wakeLock' in navigator) {
        try {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        } catch (err) {
          console.warn('Screen Wake Lock request failed:', err);
        }
      }
    };
    const releaseWakeLock = async () => {
      if (wakeLockRef.current) {
        try {
          await wakeLockRef.current.release();
          wakeLockRef.current = null;
        } catch (err) {
          console.warn('Screen Wake Lock release failed:', err);
        }
      }
    };
    if (isPlaying) requestWakeLock();
    else releaseWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isPlaying) requestWakeLock();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      releaseWakeLock();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isPlaying]);

  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  }, [isPlaying]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const prog = (audioRef.current.currentTime / audioRef.current.duration) * 100;
      setAudioProgress(isNaN(prog) ? 0 : prog);
    }
  };

  const handleAudioEnded = () => {
    if (audioRef.current?.src && audioRef.current.src.startsWith('data:audio/wav')) {
      return; // Ignore ended event for silent audio
    }
    
    if (currentAyahRepeat < ayahRepeatCount) {
      setCurrentAyahRepeat(prev => prev + 1);
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
      return;
    }

    setCurrentAyahRepeat(1);
    
    if (playingAyahIndex < activeAyahs.length - 1) {
      setPlayingAyahIndex(prev => prev + 1);
    } else {
      if (currentSequenceRepeat < sequenceRepeatCount) {
        setCurrentSequenceRepeat(prev => prev + 1);
        setPlayingAyahIndex(0);
      } else {
        setIsPlaying(false);
        setPlayingTaskId(null);
        setActiveAyahs([]);
        setPlayingAyahIndex(0);
      }
    }
  };

  useEffect(() => {
    if (activeAyahs.length > 0 && playingAyahIndex < activeAyahs.length) {
       loadAndPlayAudio(activeAyahs[playingAyahIndex]);
    } else if (activeAyahs.length > 0 && playingAyahIndex >= activeAyahs.length) {
       if (audioRef.current) {
         audioRef.current.pause();
       }
       setIsPlaying(false);
       setPlayingTaskId(null);
       setActiveAyahs([]);
       setPlayingAyahIndex(0);
    }
  }, [playingAyahIndex, activeAyahs]);

  const loadAndPlayAudio = async (ayah: AyahInfo) => {
    const thisRequestId = ++activeAyahRequestIdRef.current;
    setIsLoadingAudio(true);
    setAudioProgress(0);

    const audioUrl = await getAudioSrc(ayah.surah.number, ayah.numberInSurah);
    // If another ayah was requested while we were fetching the audio URL, cancel this outdated request
    if (thisRequestId !== activeAyahRequestIdRef.current) return;

    const audio = audioRef.current;
    if (!audio) return;

    if (audio.src && audio.src.startsWith('blob:')) {
      try { URL.revokeObjectURL(audio.src); } catch (err) {}
    }

    // Check if cached in browser
    let isAudioCached = false;
    if ('caches' in window) {
      try {
        const audioCache = await caches.open('quran-audio-v1');
        const cachedRes = await audioCache.match(audioUrl);
        if (cachedRes) {
          isAudioCached = true;
        }
      } catch (err) {}
    }

    if (thisRequestId !== activeAyahRequestIdRef.current) return;

    if (!isAudioCached && !navigator.onLine) {
      setNetworkErrorNotification("تنبيه: لا يوجد اتصال بالإنترنت والمقطع الصوتي غير منزّل مسبقاً. يرجى الاتصال بالشبكة لتشغيل الصوت، أو تنزيل المقرئ من صفحة الإعدادات للاستماع لاحقاً بدون إنترنت.");
      setIsLoadingAudio(false);
      setIsPlaying(false);
      setPlayingTaskId(null);
      return;
    }

    // Re-attach fallback error handler that might have been cleared
    audio.onerror = async () => {
      if (thisRequestId !== activeAyahRequestIdRef.current) return;
      if (!navigator.onLine) {
        setNetworkErrorNotification("تنبيه: تعذر تشغيل الصوت بسبب انقطاع الاتصال بالشبكة. يرجى الاتصال بالإنترنت أو تنزيل المقرئ مسبقاً من الإعدادات.");
        setIsLoadingAudio(false);
        setIsPlaying(false);
        setPlayingTaskId(null);
        return;
      }
      const currentQari = localStorage.getItem('quran_qari') || 'Minshawy_Murattal_128kbps';
      if (currentQari !== 'Minshawy_Murattal_128kbps' && audioRef.current) {
        audioRef.current.onerror = null;
        const fallbackUrl = `https://everyayah.com/data/Minshawy_Murattal_128kbps/${String(ayah.surah.number).padStart(3, '0')}${String(ayah.numberInSurah).padStart(3, '0')}.mp3`;
        audioRef.current.src = fallbackUrl;
        audioRef.current.load();
        const fallbackSpeed = parseFloat(localStorage.getItem('quran_speed') || '1.0');
        audioRef.current.playbackRate = fallbackSpeed;
        audioRef.current.play().then(() => {
          if (thisRequestId === activeAyahRequestIdRef.current) setIsPlaying(true);
        }).catch(() => {
          if (thisRequestId === activeAyahRequestIdRef.current) handleAudioEnded();
        });
      } else {
        handleAudioEnded();
      }
    };

    if (audio.src !== audioUrl) {
      audio.src = audioUrl;
      audio.load();
    }
    
    const speed = parseFloat(localStorage.getItem('quran_speed') || '1.0');
    audio.playbackRate = speed;
    
    audio.play().then(() => {
      if (thisRequestId !== activeAyahRequestIdRef.current) return;
      setIsPlaying(true);
      if (audioRef.current) audioRef.current.playbackRate = speed;

      if ('mediaSession' in navigator) {
        try {
          navigator.mediaSession.playbackState = 'playing';
          navigator.mediaSession.metadata = new MediaMetadata({
            title: `آية ${ayah.numberInSurah} - سورة ${ayah.surah.name}`,
            artist: localStorage.getItem('quran_qari') === 'Minshawy_Murattal_128kbps' ? 'المنشاوي (مرتل)' : 'المقرئ الحالي',
            album: 'استماع آيات الورد اليومي',
            artwork: [{ src: '/app_icon_v6.png', sizes: '512x512', type: 'image/png' }]
          });

          navigator.mediaSession.setActionHandler('play', () => {
            if (audioRef.current) audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
          });
          navigator.mediaSession.setActionHandler('pause', () => {
            if (audioRef.current) {
              audioRef.current.pause();
              setIsPlaying(false);
            }
          });
          navigator.mediaSession.setActionHandler('nexttrack', nextAyah);
          navigator.mediaSession.setActionHandler('previoustrack', prevAyah);
        } catch (err) {}
      }
    }).catch(e => {
      if (thisRequestId !== activeAyahRequestIdRef.current) return;
      if (!navigator.onLine) {
        setNetworkErrorNotification("تنبيه: تعذر تشغيل الصوت بسبب انقطاع الشبكة. يرجى الاتصال بالإنترنت أو تنزيل المقرئ من الإعدادات.");
        setIsLoadingAudio(false);
        setIsPlaying(false);
        setPlayingTaskId(null);
        return;
      }
      // Don't auto-skip if the browser blocked playback (NotAllowedError)
      if (e.name !== 'NotAllowedError') {
         handleAudioEnded();
      } else {
         setIsLoadingAudio(false);
         setIsPlaying(false);
      }
    });
  };

  const playSingleAyah = async (e: React.MouseEvent<HTMLButtonElement | HTMLDivElement> | null, ayah: AyahInfo) => {
    if (e) e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;
    
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    }
    
    const SILENT_AUDIO_URI = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAAA';
    audio.src = SILENT_AUDIO_URI;
    try {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {});
      }
    } catch (err) {}
    
    setPlayingTaskId(`single-ayah-${ayah.surah.number}-${ayah.numberInSurah}`);
    setIsLoadingAudio(true);
    setPlayingAyahIndex(0);
    setActiveAyahs([ayah]);
    setAyahRepeatCount(1);
    setSequenceRepeatCount(1);
    setCurrentAyahRepeat(1);
    setCurrentSequenceRepeat(1);
  };

  const playCustomSequence = async (ranges: {surah: number, start: number, end: number}[], ayahRepeat: number, sequenceRepeat: number) => {
    if (audioRef.current && isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
    
    const SILENT_AUDIO_URI = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAAA';
    if (audioRef.current) {
        audioRef.current.src = SILENT_AUDIO_URI;
        audioRef.current.play().catch(() => {});
    }

    setPlayingTaskId('custom-sequence');
    setIsLoadingAudio(true);
    
    setAyahRepeatCount(ayahRepeat);
    setSequenceRepeatCount(sequenceRepeat);
    setCurrentAyahRepeat(1);
    setCurrentSequenceRepeat(1);

    const pages = new Set<number>();
    for (const r of ranges) {
      const meta = SURAH_METADATAList[r.surah - 1];
      if (meta) {
        for(let p = meta.startPage; p <= meta.endPage; p++) {
          pages.add(p);
        }
      }
    }
    
    const ayahs = await fetchActiveAyahsForTask(Array.from(pages), "");
    
    const finalAyahs = ayahs.filter(a => {
        return ranges.some(r => r.surah === a.surah.number && a.numberInSurah >= r.start && a.numberInSurah <= r.end);
    });

    if (finalAyahs.length > 0) {
      setPlayingAyahIndex(0);
      setActiveAyahs(finalAyahs);
    } else {
      setIsLoadingAudio(false);
      setPlayingTaskId(null);
    }
  };

  const playPages = async (e: React.MouseEvent<HTMLButtonElement | HTMLDivElement> | null, task: Task, startAyahInfo?: {surah: number, numberInSurah: number}) => {
    if (e) e.stopPropagation();
    if (!task.pages || task.pages.length === 0) return;
    
    const audio = audioRef.current;
    if (!audio) return;

    if (playingTaskId === task.id) {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        const speed = parseFloat(localStorage.getItem('quran_speed') || '1.0');
        audio.playbackRate = speed;
        audio.play().then(() => setIsPlaying(true)).catch(err => console.error(err));
      }
      return;
    }

    const SILENT_AUDIO_URI = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAAA';
    audio.src = SILENT_AUDIO_URI;
    try {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {});
      }
    } catch (err) {}
    
    setPlayingTaskId(task.id);
    setIsLoadingAudio(true);
    const ayahs = await fetchActiveAyahsForTask(task.pages, task.title);
    const t = task as any;
    let finalAyahs = ayahs;
    if (t.selectedVerses && t.selectedVerses.length > 0) {
      finalAyahs = ayahs.filter(a => 
        t.selectedVerses.some((v: any) => v.surah === a.surah.number && v.ayah === a.numberInSurah)
      );
    } else if (t.verseRanges && t.verseRanges.length > 0) {
      finalAyahs = ayahs.filter(a => {
        return t.verseRanges.some((vr: any) => {
          const normalizeSurahName = (name: string) => {
            if (!name) return "";
            return name.replace("سُورَةُ ", "").replace("سورة ", "")
                       .replace(/[ً-ٟۖ-ۜ۟-۪ۨ-ۭ]/g, '')
                       .replace(/\u0670/g, 'ا')
                       .replace(/[أإآاٱ]/g, 'ا')
                       .replace(/[ةه]/g, 'ه')
                       .replace(/[ىي]/g, 'ي')
                       .replace(/ؤ/g, 'و')
                       .replace(/ئ/g, 'ي')
                       .replace(/ء/g, '').replace(/\uFEFF/g, '').trim();
          };
          const vrSurahStr = String(vr.surah);
          const isNumber = !isNaN(Number(vrSurahStr));
          if (isNumber) {
            return Number(vrSurahStr) === a.surah.number && a.numberInSurah >= vr.start && a.numberInSurah <= vr.end;
          } else {
            const vrSurahNorm = normalizeSurahName(vrSurahStr);
            const aSurahNorm = normalizeSurahName(a.surah.name);
            return (vrSurahNorm === aSurahNorm || vrSurahStr === String(a.surah.number)) && a.numberInSurah >= vr.start && a.numberInSurah <= vr.end;
          }
        });
      });
    }
    if (finalAyahs.length > 0) {
      let startIndex = 0;
      if (startAyahInfo) {
        const foundIdx = finalAyahs.findIndex(a => a.surah.number === startAyahInfo.surah && a.numberInSurah === startAyahInfo.numberInSurah);
        if (foundIdx !== -1) startIndex = foundIdx;
      }
      setPlayingAyahIndex(startIndex);
      setActiveAyahs(finalAyahs);
    } else {
      setIsLoadingAudio(false);
      setPlayingTaskId(null);
    }
  };

  const nextAyah = () => {
    setPlayingAyahIndex(prev => {
      if (activeAyahs.length === 0) return prev;
      if (prev < activeAyahs.length - 1) {
        return prev + 1;
      }
      return activeAyahs.length;
    });
  };

  const prevAyah = () => {
    setPlayingAyahIndex(prev => {
      if (activeAyahs.length === 0) return 0;
      return Math.max(0, prev - 1);
    });
  };

  const restartFromBeginning = () => {
    if (activeAyahs.length > 0) {
      if (playingAyahIndex === 0) {
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
        }
      } else {
        setPlayingAyahIndex(0);
      }
    }
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
      }
    }
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
    setPlayingTaskId(null);
    setActiveAyahs([]);
    setPlayingAyahIndex(0);
    setCurrentAyahRepeat(1);
    setCurrentSequenceRepeat(1);
  };

  const updatePlaybackSettings = (qari?: string, speedStr?: string) => {
    if (qari) {
      localStorage.setItem('quran_qari', qari);
      setCurrentQari(qari);
      if (playingTaskId && activeAyahs.length > 0) {
         loadAndPlayAudio(activeAyahs[playingAyahIndex]);
      }
    }
    if (speedStr) {
      localStorage.setItem('quran_speed', speedStr);
      setCurrentSpeed(speedStr);
      const speed = parseFloat(speedStr);
      if (audioRef.current) {
        audioRef.current.playbackRate = speed;
      }
    }
  };

  return (
    <AudioContext.Provider value={{ playingTaskId, isPlaying, isLoadingAudio, audioProgress, activeAyahs, playingAyahIndex, currentQari, currentSpeed, networkErrorNotification, setNetworkErrorNotification, playPages, playSingleAyah, playCustomSequence, stopAudio, togglePlay, updatePlaybackSettings, nextAyah, prevAyah, restartFromBeginning, ayahRepeatCount, sequenceRepeatCount, currentAyahRepeat, currentSequenceRepeat, setAyahRepeatCount, setSequenceRepeatCount }}>
      {children}
      {networkErrorNotification && (
        <div className="fixed bottom-20 left-4 right-4 z-[9999] max-w-md mx-auto bg-red-950/95 dark:bg-red-950/95 text-white p-4 rounded-2xl shadow-2xl border border-red-500/50 backdrop-blur-md flex items-start gap-3 animate-in fade-in slide-in-from-bottom-4">
          <WifiOff className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-right text-xs leading-relaxed">
            <span className="font-black block mb-1 text-red-200">انقطاع الاتصال بالشبكة</span>
            <span className="text-gray-200 block text-[11px]">{networkErrorNotification}</span>
            <div className="mt-3 flex items-center justify-end gap-2">
              <a 
                href="/settings" 
                onClick={() => setNetworkErrorNotification(null)} 
                className="text-[11px] bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-xl font-bold transition-all"
              >
                تنزيل المقرئ من الإعدادات
              </a>
              <button 
                onClick={() => setNetworkErrorNotification(null)} 
                className="text-[11px] bg-white/10 hover:bg-white/20 text-gray-300 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
      <audio 
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleAudioEnded}
        onCanPlay={() => {
          setIsLoadingAudio(false);
          if (audioRef.current) {
             audioRef.current.playbackRate = parseFloat(currentSpeed);
          }
        }}
        onError={async () => {
          const qari = localStorage.getItem('quran_qari') || 'Minshawy_Murattal_128kbps';
          if (qari !== 'Minshawy_Murattal_128kbps' && audioRef.current && activeAyahs[playingAyahIndex]) {
            audioRef.current.onerror = null; // Prevent infinite loop
            const ayah = activeAyahs[playingAyahIndex];
            const fallbackUrl = `https://everyayah.com/data/Minshawy_Murattal_128kbps/${String(ayah.surah.number).padStart(3, '0')}${String(ayah.numberInSurah).padStart(3, '0')}.mp3`;
            audioRef.current.src = fallbackUrl;
            audioRef.current.load();
            audioRef.current.playbackRate = parseFloat(localStorage.getItem('quran_speed') || '1.0');
            audioRef.current.play().then(() => setIsPlaying(true)).catch(() => handleAudioEnded());
          } else {
            handleAudioEnded();
          }
        }}
        className="hidden" 
        playsInline
      />
    </AudioContext.Provider>
  );
};

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) throw new Error('useAudio must be used within an AudioProvider');
  return context;
};
