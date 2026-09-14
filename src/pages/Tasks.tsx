
import React, { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { saveProgress, savePlan } from '../db/dbSync';
import { getTasksForDate, parsePlanDate } from '../utils/planGenerator';
import { Task, ProgressLog, TaskType } from '../types';
import { useAudio } from '../context/AudioContext';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, RotateCcw, ChevronLeft, ChevronRight, Calendar, Info, Play, Pause, Loader2, Volume2, BookOpen, Sparkles, Heart, X, Eye, EyeOff, Square, Clock } from 'lucide-react';
import { format, addDays, subDays, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, addMonths, subMonths, isToday } from 'date-fns';
import { ar } from 'date-fns/locale';
import { clsx } from 'clsx';
import { QuranViewer } from '../components/ui/QuranViewer';
import { AyahInfo, fetchActiveAyahsForTask } from '../utils/ayahFetcher';
import { getAudioSrc } from '../utils/offlineCache';
import { useAuth } from '../context/AuthProvider';
import { usePreferences } from '../context/PreferencesContext';
import { useUserData } from '../context/UserDataProvider';
import { useCounterRotation } from '../hooks/useCounterRotation';
import { getHijriDate } from '../utils/dateHelpers';

const getTaskColorType = (task: any, activePlan?: any): string => {
  if (task.type === 'dhikr') return 'dhikr';
  if (task.type === 'memorization') return 'memorization';
  if (task.type === 'fixation') return 'fixation';
  if (task.type === 'listening') return 'listening';

  // Seven Castles plan
  if (activePlan?.isSevenCastles) {
    if (task.id.startsWith('old-rev') || task.title.includes('القديم')) {
      return 'old_review'; // مراجعة القديم
    }
    if (task.id.startsWith('sc-castle-rev') || task.title.includes('القلعة')) {
      return 'castle_review'; // مراجعة القلعة
    }
    if (task.id.startsWith('sc-rev-week') || task.id.startsWith('sc-rec-week') || task.title.includes('مراجعة')) {
      return 'castle_other_review';
    }
  }

  // Review Plan (خطط المراجعة والتثبيت)
  if (activePlan?.planType === 'review') {
    if (task.id.startsWith('rev-')) {
      const parts = task.id.split('-');
      if (parts.length === 2) {
        return 'basic_review'; // Basic review
      } else if (parts.length > 2) {
        const idx = task.trackIndex ?? (parseInt(parts[2]) || 1);
        const mod = Math.abs(idx) % 5;
        if (mod === 1) return 'additional_review_green';
        if (mod === 2) return 'additional_review_blue';
        if (mod === 3) return 'additional_review_brown';
        if (mod === 4) return 'additional_review_teal';
        return 'additional_review_orange';
      }
    }
    if (task.title.includes('إضافي') || task.title.includes('الإضافية')) {
      const idx = task.trackIndex ?? 1;
      const mod = Math.abs(idx) % 5;
      if (mod === 1) return 'additional_review_green';
      if (mod === 2) return 'additional_review_blue';
      if (mod === 3) return 'additional_review_brown';
      if (mod === 4) return 'additional_review_teal';
      return 'additional_review_orange';
    }
    return 'basic_review';
  }

  // Memorization / Parts Plan (خطة الأجزاء)
  if (task.id.startsWith('old-rev') || task.title.includes('القديم')) {
    return 'old_review'; // مراجعة القديم
  }
  
  if (task.id.startsWith('rev-week') || task.id.startsWith('rec-week') || task.id.startsWith('week-rev')) {
    return 'weekly_review'; // مراجعة الحفظ الأسبوع
  }
  
  if (task.id.startsWith('rev-cum') || task.id.startsWith('rec-cum') || task.id.startsWith('cum-rev') || task.title.includes('تراكمي') || task.title.includes('تراكمية')) {
    return 'cumulative_review'; // مراجعة التراكمي
  }

  if (task.type === 'cumulative_review') {
    return 'cumulative_review';
  }
  if (task.type === 'review') {
    return 'weekly_review';
  }

  return 'default';
};

const getTaskBorderStyles = (task: any, completed: boolean, activePlan?: any) => {
  const colorType = getTaskColorType(task, activePlan);
  if (completed) {
    switch (colorType) {
      case 'memorization':
        return 'bg-emerald-500/5 dark:bg-emerald-500/5 border-emerald-500/25 text-emerald-600 dark:text-emerald-400/80 hover:bg-emerald-500/10';
      case 'fixation':
        return 'bg-amber-500/5 dark:bg-amber-500/5 border-amber-500/25 text-amber-600 dark:text-amber-400/80 hover:bg-amber-500/10';
      case 'weekly_review':
        return 'bg-blue-500/5 dark:bg-blue-500/5 border-blue-500/25 text-blue-600 dark:text-blue-400/80 hover:bg-blue-500/10';
      case 'cumulative_review':
        return 'bg-teal-500/5 dark:bg-teal-500/5 border-teal-500/25 text-teal-600 dark:text-teal-400/80 hover:bg-teal-500/10';
      case 'old_review':
        return 'bg-amber-900/5 dark:bg-amber-900/10 border-amber-800/25 text-amber-900 dark:text-amber-300/80 hover:bg-amber-900/10';
      case 'castle_review':
        return 'bg-rose-500/5 dark:bg-rose-500/5 border-rose-500/25 text-rose-600 dark:text-rose-400/80 hover:bg-rose-500/10';
      case 'castle_other_review':
        return 'bg-indigo-500/5 dark:bg-indigo-500/5 border-indigo-500/25 text-indigo-600 dark:text-indigo-400/80 hover:bg-indigo-500/10';
      case 'basic_review':
        return 'bg-sky-500/5 dark:bg-sky-500/5 border-sky-500/25 text-sky-600 dark:text-sky-400/80 hover:bg-sky-500/10';
      case 'additional_review_green':
        return 'bg-emerald-600/5 dark:bg-emerald-600/10 border-emerald-600/25 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-600/10';
      case 'additional_review_blue':
        return 'bg-blue-600/5 dark:bg-blue-600/10 border-blue-600/25 text-blue-700 dark:text-blue-400 hover:bg-blue-600/10';
      case 'additional_review_brown':
        return 'bg-amber-900/5 dark:bg-amber-900/10 border-amber-800/25 text-amber-900 dark:text-amber-300 hover:bg-amber-900/10';
      case 'additional_review_teal':
        return 'bg-teal-600/5 dark:bg-teal-600/10 border-teal-600/25 text-teal-700 dark:text-teal-400 hover:bg-teal-600/10';
      case 'additional_review_orange':
        return 'bg-orange-600/5 dark:bg-orange-600/10 border-orange-600/25 text-orange-700 dark:text-orange-400 hover:bg-orange-600/10';
      case 'additional_review':
        return 'bg-emerald-600/5 dark:bg-emerald-600/10 border-emerald-600/25 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-600/10';
      case 'listening':
        return 'bg-yellow-500/5 dark:bg-yellow-500/5 border-yellow-500/25 text-yellow-600 dark:text-yellow-400/80 hover:bg-yellow-500/10';
      case 'dhikr':
        return 'bg-emerald-500/5 dark:bg-emerald-500/5 border-emerald-500/25 text-emerald-700 dark:text-emerald-450 hover:bg-emerald-500/10';
      default:
        return 'bg-amber-900/5 dark:bg-amber-900/10 border-amber-800/25 text-amber-900 dark:text-amber-300/80 hover:bg-amber-900/10';
    }
  } else {
    switch (colorType) {
      case 'memorization':
        return 'bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500 text-emerald-800 dark:text-emerald-300 dark:border-emerald-500/90 shadow-[0_3px_10px_-3px_rgba(16,185,129,0.3)] hover:bg-emerald-500/10 dark:hover:bg-emerald-500/15 active:scale-95';
      case 'fixation':
        return 'bg-amber-500/5 dark:bg-amber-500/10 border-amber-500 text-amber-850 dark:text-amber-300 dark:border-amber-500/90 shadow-[0_3px_10px_-3px_rgba(245,158,11,0.3)] hover:bg-amber-500/10 dark:hover:bg-amber-500/15 active:scale-95';
      case 'weekly_review':
        return 'bg-blue-500/5 dark:bg-blue-500/10 border-blue-500 text-blue-800 dark:text-blue-300 dark:border-blue-500/90 shadow-[0_3px_10px_-3px_rgba(59,130,246,0.3)] hover:bg-blue-500/10 dark:hover:bg-blue-500/15 active:scale-95';
      case 'cumulative_review':
        return 'bg-teal-500/5 dark:bg-teal-500/10 border-teal-500 text-teal-800 dark:text-teal-300 dark:border-teal-500/90 shadow-[0_3px_10px_-3px_rgba(20,184,166,0.3)] hover:bg-teal-500/10 dark:hover:bg-teal-500/15 active:scale-95';
      case 'old_review':
        return 'bg-amber-900/5 dark:bg-amber-900/10 border-amber-800 text-amber-950 dark:text-amber-200 dark:border-amber-700/90 shadow-[0_3px_10px_-3px_rgba(146,64,14,0.3)] hover:bg-amber-900/10 dark:hover:bg-amber-900/15 active:scale-95';
      case 'castle_review':
        return 'bg-rose-500/5 dark:bg-rose-500/10 border-rose-500 text-rose-850 dark:text-rose-300 dark:border-rose-500/90 shadow-[0_3px_10px_-3px_rgba(244,63,94,0.3)] hover:bg-rose-500/10 dark:hover:bg-rose-500/15 active:scale-95';
      case 'castle_other_review':
        return 'bg-indigo-500/5 dark:bg-indigo-500/10 border-indigo-500 text-indigo-850 dark:text-indigo-300 dark:border-indigo-500/90 shadow-[0_3px_10px_-3px_rgba(99,102,241,0.3)] hover:bg-indigo-500/10 dark:hover:bg-indigo-500/15 active:scale-95';
      case 'basic_review':
        return 'bg-sky-500/5 dark:bg-sky-500/10 border-sky-500 text-sky-850 dark:text-sky-300 dark:border-sky-500/90 shadow-[0_3px_10px_-3px_rgba(14,165,233,0.3)] hover:bg-sky-500/10 dark:hover:bg-sky-500/15 active:scale-95';
      case 'additional_review_green':
        return 'bg-emerald-600/5 dark:bg-emerald-600/10 border-emerald-600 text-emerald-950 dark:text-emerald-200 dark:border-emerald-500 shadow-[0_3px_10px_-3px_rgba(5,150,105,0.3)] hover:bg-emerald-600/10 dark:hover:bg-emerald-600/15 active:scale-95';
      case 'additional_review_blue':
        return 'bg-blue-600/5 dark:bg-blue-600/10 border-blue-600 text-blue-950 dark:text-blue-200 dark:border-blue-500 shadow-[0_3px_10px_-3px_rgba(37,99,235,0.3)] hover:bg-blue-600/10 dark:hover:bg-blue-600/15 active:scale-95';
      case 'additional_review_brown':
        return 'bg-amber-900/5 dark:bg-amber-900/10 border-amber-800 text-amber-950 dark:text-amber-200 dark:border-amber-700 shadow-[0_3px_10px_-3px_rgba(146,64,14,0.3)] hover:bg-amber-900/10 dark:hover:bg-amber-900/15 active:scale-95';
      case 'additional_review_teal':
        return 'bg-teal-600/5 dark:bg-teal-600/10 border-teal-600 text-teal-950 dark:text-teal-200 dark:border-teal-500 shadow-[0_3px_10px_-3px_rgba(13,148,136,0.3)] hover:bg-teal-600/10 dark:hover:bg-teal-600/15 active:scale-95';
      case 'additional_review_orange':
        return 'bg-orange-600/5 dark:bg-orange-600/10 border-orange-600 text-orange-950 dark:text-orange-200 dark:border-orange-500 shadow-[0_3px_10px_-3px_rgba(234,88,12,0.3)] hover:bg-orange-600/10 dark:hover:bg-orange-600/15 active:scale-95';
      case 'additional_review':
        return 'bg-emerald-600/5 dark:bg-emerald-600/10 border-emerald-600 text-emerald-950 dark:text-emerald-200 dark:border-emerald-500 shadow-[0_3px_10px_-3px_rgba(5,150,105,0.3)] hover:bg-emerald-600/10 dark:hover:bg-emerald-600/15 active:scale-95';
      case 'listening':
        return 'bg-yellow-500/5 dark:bg-yellow-500/10 border-yellow-500 text-yellow-800 dark:text-yellow-300 dark:border-yellow-500/90 shadow-[0_3px_10px_-3px_rgba(234,179,8,0.3)] hover:bg-yellow-500/10 dark:hover:bg-yellow-500/15 active:scale-95';
      case 'dhikr':
        return 'bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-600 text-emerald-800 dark:text-emerald-350 dark:border-emerald-650 shadow-[0_3px_10px_-3px_rgba(16,185,129,0.3)] hover:bg-emerald-500/10 dark:hover:bg-emerald-500/15 active:scale-95';
      default:
        return 'bg-amber-900/5 dark:bg-amber-900/10 border-amber-800 text-amber-950 dark:text-amber-200 dark:border-amber-700/90 shadow-[0_3px_10px_-3px_rgba(146,64,14,0.3)] hover:bg-amber-900/10 dark:hover:bg-amber-900/15 active:scale-95';
    }
  }
};

const getAyahEstimatedDuration = (ayah: AyahInfo, qari: string, speedStr: string) => {
  const wordCount = ayah.text ? ayah.text.trim().split(/\s+/).length : 6;
  
  // Base seconds per word for each reciter
  let baseSecondsPerWord = 1.6; // Default/Minshawy
  if (qari === 'Husary_128kbps') baseSecondsPerWord = 1.8;
  else if (qari === 'Abdul_Basit_Murattal_64kbps') baseSecondsPerWord = 1.7;
  else if (qari === 'Ayman_Sowaid_64kbps') baseSecondsPerWord = 1.9;
  else if (qari === 'Muhammad_Ayyoub_128kbps') baseSecondsPerWord = 1.45;
  else if (qari === 'Ghamadi_40kbps') baseSecondsPerWord = 1.3;
  else if (qari === 'MaherAlMuaiqly128kbps') baseSecondsPerWord = 1.15;

  const speed = parseFloat(speedStr) || 1.0;
  return Math.max(2.5, (wordCount * baseSecondsPerWord) / speed);
};

const getPlayedAndTotalDuration = (
  activeAyahs: AyahInfo[],
  playingAyahIndex: number,
  audioProgress: number,
  currentQari: string,
  currentSpeed: string
) => {
  if (!activeAyahs || activeAyahs.length === 0) return { played: 0, total: 0 };
  
  let total = 0;
  let played = 0;
  
  activeAyahs.forEach((ayah, index) => {
    const dur = getAyahEstimatedDuration(ayah, currentQari, currentSpeed);
    total += dur;
    
    if (index < playingAyahIndex) {
      played += dur;
    } else if (index === playingAyahIndex) {
      played += (audioProgress / 100) * dur;
    }
  });
  
  return { played, total };
};

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const getQariFriendlyName = (qariId: string) => {
  switch (qariId) {
    case 'Minshawy_Murattal_128kbps': return 'المنشاوي';
    case 'Husary_128kbps': return 'الحصري';
    case 'Abdul_Basit_Murattal_64kbps': return 'عبد الباسط';
    case 'Ayman_Sowaid_64kbps': return 'أيمن سويد';
    case 'Muhammad_Ayyoub_128kbps': return 'محمد أيوب';
    case 'Ghamadi_40kbps': return 'الغامدي';
    case 'MaherAlMuaiqly128kbps': return 'المعيقلي';
    default: return 'القارئ';
  }
};

export default function Tasks() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const lastTodayRef = useRef(new Date());
  const selectedDateRef = useRef(selectedDate);

  // Keep selectedDateRef in sync with selectedDate
  useEffect(() => {
    selectedDateRef.current = selectedDate;
  }, [selectedDate]);

  // Reset selectedDate to today when PWA becomes visible or active, ONLY if they were already viewing the current day before the transition/focus
  useEffect(() => {
    const handleVisibilityAndFocus = () => {
      if (document.visibilityState === 'visible') {
        const now = new Date();
        const wasViewingToday = isSameDay(selectedDateRef.current, lastTodayRef.current);
        
        lastTodayRef.current = now;
        
        if (wasViewingToday) {
          setSelectedDate(now);
        }
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityAndFocus);
    window.addEventListener('focus', handleVisibilityAndFocus);

    // Also a timer that runs every 30 seconds to support midnight transition if the app stays open
    const interval = setInterval(() => {
      const now = new Date();
      const wasViewingToday = isSameDay(selectedDateRef.current, lastTodayRef.current);
      
      lastTodayRef.current = now;
      
      if (wasViewingToday) {
        setSelectedDate(now);
      }
    }, 30000);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityAndFocus);
      window.removeEventListener('focus', handleVisibilityAndFocus);
      clearInterval(interval);
    };
  }, []);

  const { loading, activePlan } = useUserData();
  
  // Get all logs for this plan
  const allLogs = useLiveQuery(() => {
    const planIdToUse = activePlan ? activePlan.id! : 0;
    return db.progress.where('planId').equals(planIdToUse).toArray();
  }, [activePlan, user?.uid]);

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [calendarViewMode, setCalendarViewMode] = useState<'month' | 'weeks'>('month');

  const planDates = React.useMemo(() => {
    if (!activePlan) return [];
    const dates: Date[] = [];
    let currentDate = parsePlanDate(activePlan.startDate);
    let iterations = 0;
    const maxSafety = 1000;
    let juzFinished = false;

    if (activePlan.planType === 'review') {
      while (iterations < maxSafety) {
        const tasks = getTasksForDate(currentDate, activePlan, []);
        if (tasks.length === 0) break;
        dates.push(new Date(currentDate));
        currentDate = addDays(currentDate, 1);
        iterations++;
      }
    } else if (activePlan.isSevenCastles) {
      for (let day = 0; day < 77; day++) {
        dates.push(new Date(currentDate));
        currentDate = addDays(currentDate, 1);
      }
    } else {
      while (iterations < maxSafety) {
        const tasks = getTasksForDate(currentDate, activePlan, []);
        const d = currentDate.getDay(); // 0 (Sun) to 6 (Sat)
        
        if (d === (activePlan.firstDayOfWeek || 0) && juzFinished) {
            break;
        }

        if (tasks.length === 0) {
            break;
        }

        dates.push(new Date(currentDate));
          
        const memTask = tasks.find(t => t.type === 'memorization');
        if (memTask && memTask.pages) {
          const isDescending = !!activePlan.isSevenCastlesDescending || activePlan.startPage > activePlan.endPage;
          const reachedEnd = isDescending
            ? Math.min(...memTask.pages) <= activePlan.endPage
            : Math.max(...memTask.pages) >= activePlan.endPage;
          if (reachedEnd) {
              juzFinished = true;
          }
        }
        currentDate = addDays(currentDate, 1);
        iterations++;
      }
    }
    return dates;
  }, [activePlan]);

  const planWeeks = React.useMemo(() => {
    const weeks: Date[][] = [];
    for (let i = 0; i < planDates.length; i += 7) {
      weeks.push(planDates.slice(i, i + 7));
    }
    return weeks;
  }, [planDates]);

  // Keep calendarMonth in sync with selectedDate when opening
  useEffect(() => {
    if (isCalendarOpen) {
      setCalendarMonth(selectedDate);
    }
  }, [isCalendarOpen]);

  const [currentTasks, setCurrentTasks] = useState<Task[]>([]);
  const [activeTasbihTask, setActiveTasbihTask] = useState<Task | null>(null);

  const triggerVibration = () => {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(15);
      } catch (e) {}
    }
  };

  const { preferences } = usePreferences();

  const getDhikrId = (title: string): string => {
    let hash = 0;
    for (let i = 0; i < title.length; i++) {
      hash = (hash << 5) - hash + title.charCodeAt(i);
      hash |= 0;
    }
    return `global-dhikr-${Math.abs(hash).toString(36)}`;
  };

  const getGlobalAdhkarTasksForDate = (date: Date): Task[] => {
    if (!preferences.globalAdhkarEnabled) return [];

    try {
      return preferences.globalAdhkarList
        .filter(item => item.dhikr && item.dhikr.trim() !== "")
        .map((item) => ({
          id: getDhikrId(item.dhikr.trim()),
          title: item.dhikr.trim(),
          type: TaskType.DHIKR,
          pages: [],
          completed: false,
          targetCount: item.count || 1,
          currentCount: 0
        }));
    } catch (e) {
      console.error("Failed to parse global adhkar list:", e);
      return [];
    }
  };

  const handleTasbihTap = async () => {
    if (!activeTasbihTask || !isEditable) return;
    if (activeTasbihTask.completed) return;

    const newCount = activeTasbihTask.currentCount + 1;
    const isCompleted = newCount >= activeTasbihTask.targetCount;
    
    // Trigger vibration immediately to avoid any lag feeling from state updates
    if (!isCompleted) {
      triggerVibration();
    } else {
      // Different vibration for completion
      if ('vibrate' in navigator) {
        try { navigator.vibrate([30, 50, 30]); } catch (e) {}
      }
    }

    const updatedTask = {
      ...activeTasbihTask,
      currentCount: newCount,
      completed: isCompleted
    };

    setActiveTasbihTask(updatedTask);

    const updatedTasks = currentTasks.map(t => t.id === activeTasbihTask.id ? updatedTask : t);
    setCurrentTasks(updatedTasks);

    // Fire and forget saveLog
    saveLog(updatedTasks).catch(e => console.error("Tasbih save error:", e));
  };

  const handleResetTasbih = async () => {
    if (!activeTasbihTask || !isEditable) return;

    const updatedTask = {
      ...activeTasbihTask,
      currentCount: 0,
      completed: false
    };

    setActiveTasbihTask(updatedTask);

    const updatedTasks = currentTasks.map(t => t.id === activeTasbihTask.id ? updatedTask : t);
    setCurrentTasks(updatedTasks);
    saveLog(updatedTasks).catch(e => console.error("Tasbih reset save error:", e));
  };
  
  // Audio State
  const { playingTaskId, isPlaying, isLoadingAudio, audioProgress, activeAyahs, playingAyahIndex, currentQari, currentSpeed, playPages, stopAudio, updatePlaybackSettings, nextAyah, prevAyah, restartFromBeginning, togglePlay } = useAudio();

  const safeAyahIndex = activeAyahs.length > 0 ? Math.min(playingAyahIndex, activeAyahs.length - 1) : 0;
  const currentAyahSeq = activeAyahs.length > 0 ? Math.min(playingAyahIndex + 1, activeAyahs.length) : 0;

  // Viewer State
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerContext, setViewerContext] = useState<{pages: number[], title: string} | null>(null);
  const [showOverallProgress, setShowOverallProgress] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('show_overall_progress') !== 'false';
    }
    return true;
  });

  const counterRotationStyle = useCounterRotation(!!activeTasbihTask);

  const openViewer = (e: React.MouseEvent, pages: number[], title: string) => {
     e.stopPropagation();
     if (!pages || pages.length === 0) return;
     setViewerContext({ pages, title });
     setViewerOpen(true);
  };

  useEffect(() => {
    const generatedTasks = activePlan 
      ? getTasksForDate(selectedDate, activePlan, allLogs || []) 
      : [];
    
    const globalTasks = getGlobalAdhkarTasksForDate(selectedDate);
    const existingLog = allLogs?.find(log => isSameDay(new Date(log.date), selectedDate));
    
    // Build a set of ALL previously completed MEMORIZATION pages across ALL time for this plan
    const historicallyCompletedMemPages = new Set<number>();
    if (activePlan && allLogs) {
      allLogs.forEach(log => {
        if (log.planId === activePlan.id) {
          log.tasks.forEach(task => {
            if (task.type === TaskType.MEMORIZATION && task.completed && task.pages) {
              task.pages.forEach(p => historicallyCompletedMemPages.add(p));
            }
          });
        }
      });
    }

    // Always use generatedTasks for the dynamic Quran plan
    let reconciledQuranTasks = generatedTasks.filter(t => t.type !== TaskType.DHIKR).map(generatedTask => {
      // 1. If it's a memorization task, check against global historically completed pages
      if (generatedTask.type === TaskType.MEMORIZATION && generatedTask.pages && generatedTask.pages.length > 0) {
        const allPagesCompleted = generatedTask.pages.every(p => historicallyCompletedMemPages.has(p));
        if (allPagesCompleted) {
          return { ...generatedTask, completed: true, currentCount: generatedTask.targetCount };
        }
      }

      // 2. For all task types, check if it was completed on THIS EXACT DAY (existingLog) 
      // by looking for an exact ID match or an overlapping task of the same type.
      if (existingLog) {
        const matchingSavedTask = existingLog.tasks.find(savedTask => 
          savedTask.id === generatedTask.id ||
          (savedTask.type === generatedTask.type && 
          savedTask.pages && generatedTask.pages &&
          savedTask.pages.some(p => generatedTask.pages!.includes(p)))
        );
        if (matchingSavedTask) {
          return { 
            ...generatedTask, 
            completed: matchingSavedTask.completed, 
            currentCount: matchingSavedTask.completed ? generatedTask.targetCount : (matchingSavedTask.currentCount || 0)
          };
        }
      }
      return generatedTask;
    });

    let combinedTasks: Task[] = [];
    if (existingLog) {
      const savedTasks = existingLog.tasks;
      const savedDhikrTasks = savedTasks.filter(t => t.type === TaskType.DHIKR);
      
      // Reconcile: Strictly match the Global Adhkar list for ordering, inclusion, and target changes
      // but preserve the 'currentCount' and 'completed' state of the matching day.
      const reconciledDhikrTasks = globalTasks.map(gTask => {
        const saved = savedDhikrTasks.find(t => t.id === gTask.id);
        if (saved) {
          const newCompleted = saved.currentCount >= gTask.targetCount;
          return { 
            ...gTask, 
            currentCount: Math.min(saved.currentCount, gTask.targetCount),
            completed: newCompleted 
          };
        }
        return gTask;
      });
      
      combinedTasks = [...reconciledQuranTasks, ...reconciledDhikrTasks];
    } else {
      // Combine Quran plan tasks with dynamic active global adhkar
      combinedTasks = [...reconciledQuranTasks, ...globalTasks];
    }

    // Normalize IDs and absolutely guarantee uniqueness

    const uniqueTasks: Task[] = [];
    const seenIds = new Set<string>();
    combinedTasks.forEach(task => {
      let finalId = task.id;
      if (task.type === TaskType.DHIKR) {
        finalId = getDhikrId(task.title);
      }
      if (!seenIds.has(finalId)) {
        seenIds.add(finalId);
        uniqueTasks.push({ ...task, id: finalId });
      }
    });

    setCurrentTasks(uniqueTasks);
  }, [
    selectedDate, 
    activePlan, 
    allLogs, 
    preferences.globalAdhkarEnabled, 
    preferences.globalAdhkarList
  ]);

  const isToday = isSameDay(selectedDate, new Date());
  const isYesterday = isSameDay(selectedDate, subDays(new Date(), 1));
  const isEditable = isToday || isYesterday;

  const [showPostponeModal, setShowPostponeModal] = useState(false);
  const [isPostponing, setIsPostponing] = useState(false);
  const [postponeSuccessMsg, setPostponeSuccessMsg] = useState<string | null>(null);

  const selectedDateLog = allLogs?.find(log => isSameDay(new Date(log.date), selectedDate));
  const isPostponedDay = selectedDateLog?.note?.includes('تم تأجيل مهام اليوم') || false;

  const handlePostponeTodayTasks = async () => {
    if (!activePlan) return;
    setIsPostponing(true);

    try {
      const oldStartDate = new Date(activePlan.startDate);
      const newStartDateStr = format(addDays(oldStartDate, 1), 'yyyy-MM-dd');

      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const existingLog = await db.progress
        .where('[planId+date]')
        .equals([activePlan.id!, dateStr])
        .first();

      await saveProgress({
        ...(existingLog || {}),
        planId: activePlan.id!,
        date: dateStr,
        tasks: [],
        note: 'تم تأجيل مهام اليوم إلى الغد'
      }, existingLog?.id);

      const updatedPlan = {
        ...activePlan,
        startDate: newStartDateStr,
        updatedAt: new Date().toISOString()
      };
      await savePlan(updatedPlan, activePlan.id!);

      setShowPostponeModal(false);
      setPostponeSuccessMsg("تمت زحزحة مهام اليوم وجميع الأيام التالية يوماً واحداً إلى الأمام بنجاح!");
      setTimeout(() => setPostponeSuccessMsg(null), 4000);
    } catch (e) {
      console.error("Error postponing tasks:", e);
    } finally {
      setIsPostponing(false);
    }
  };

  const handleUndoPostponeToday = async () => {
    if (!activePlan) return;
    setIsPostponing(true);

    try {
      const oldStartDate = new Date(activePlan.startDate);
      const revertedStartDateStr = format(subDays(oldStartDate, 1), 'yyyy-MM-dd');

      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const existingLog = await db.progress
        .where('[planId+date]')
        .equals([activePlan.id!, dateStr])
        .first();

      if (existingLog) {
        await db.progress.delete(existingLog.id!);
      }

      const updatedPlan = {
        ...activePlan,
        startDate: revertedStartDateStr,
        updatedAt: new Date().toISOString()
      };
      await savePlan(updatedPlan, activePlan.id!);

      setPostponeSuccessMsg("تم إلغاء التأجيل وإعادة الجدول الأصلي.");
      setTimeout(() => setPostponeSuccessMsg(null), 4000);
    } catch (e) {
      console.error("Error undoing postpone:", e);
    } finally {
      setIsPostponing(false);
    }
  };

  const forceToggleCompletion = async (taskId: string) => {
    if (!isEditable) return;

    const updatedTasks = currentTasks.map(t => {
      if (t.id === taskId) {
        const newCompleted = !t.completed;
        return { 
          ...t, 
          completed: newCompleted, 
          currentCount: newCompleted ? t.targetCount : 0 
        };
      }
      return t;
    });

    setCurrentTasks(updatedTasks);
    saveLog(updatedTasks).catch(e => console.error("Force toggle error:", e));
  };

  const toggleTask = async (taskId: string) => {
    if (!isEditable) return;

    const updatedTasks = currentTasks.map(t => {
      if (t.id === taskId) {
        // If already completed, clicking the body should do nothing 
        // as per user request to only use the circle for uncompleting.
        if (t.completed) return t;
        
        const newCount = t.currentCount < t.targetCount ? t.currentCount + 1 : t.currentCount;
        return { ...t, currentCount: newCount, completed: newCount >= t.targetCount };
      }
      return t;
    });

    setCurrentTasks(updatedTasks);
    saveLog(updatedTasks).catch(e => console.error("Toggle error:", e));
  };

  const saveLog = async (tasks: Task[]) => {
    const planIdToUse = activePlan ? activePlan.id! : 0;
    
    const existingLog = await db.progress
      .where('[planId+date]')
      .equals([planIdToUse, format(selectedDate, 'yyyy-MM-dd')])
      .first();

    if (existingLog) {
      await saveProgress({ ...existingLog, tasks }, existingLog.id);
    } else {
      await saveProgress({
        planId: planIdToUse,
        date: format(selectedDate, 'yyyy-MM-dd'),
        tasks
      });
    }
    
    if (activePlan) {
      // Check if juz is completed
      const totalPagesSaved = (allLogs?.reduce((acc, log) => {
         const saved = log.tasks.filter(t => (t.type === 'memorization' || t.type === 'fixation') && t.completed).flatMap(t => t.pages || []);
         return acc + saved.length;
      }, 0) || 0);

      if (totalPagesSaved >= (activePlan.endPage - activePlan.startPage + 1)) {
          // Complete juz achievement or status
      }
    }
  };

  const hasGlobalAdhkar = preferences.globalAdhkarEnabled && 
    preferences.globalAdhkarList.some(item => item.dhikr && item.dhikr.trim() !== "");

  if (loading) {
    return (
      <div className="space-y-4 p-4 animate-pulse">
        <div className="h-28 bg-gray-100 dark:bg-white/5 rounded-3xl" />
        <div className="h-16 bg-gray-100 dark:bg-white/5 rounded-2xl" />
        <div className="h-36 bg-gray-100 dark:bg-white/5 rounded-3xl" />
      </div>
    );
  }

  if (!activePlan && !hasGlobalAdhkar) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <div className="bg-gray-100 dark:bg-white/5 p-6 rounded-[24px] mb-4">
          <Calendar className="w-12 h-12 text-gray-400 dark:text-gray-500" />
        </div>
        <h3 className="text-xl font-bold mb-2 dark:text-white">لا توجد خطة نشطة أو أذكار مفعّلة</h3>
        <p className="text-gray-500 dark:text-gray-400 mb-6 font-rtl text-sm leading-relaxed">يجب عليك إنشاء خطة فك شفرات الحفظ أو تفعيل الأذكار والمهام اليومية من صفحة الإعدادات.</p>
      </div>
    );
  }

  const completionRate = currentTasks.length > 0 
    ? (currentTasks.filter(t => t.completed).length / currentTasks.length) * 100 
    : 0;

  const getCleanGroupLabel = (title: string): string => {
    let clean = title;
    
    // Dynamically split and remove action word prefix if it exists before any colon
    if (clean.includes(':')) {
      const parts = clean.split(':');
      const prefix = parts[0];
      // Only remove if the colon is NOT part of a verse description inside parentheses or if the prefix contains the action word explicitly at the very start
      const actionWords = ['حفظ', 'تثبيت', 'مراجعة', 'تسميع', 'استماع', 'القلعة'];
      if (!prefix.includes('(') && actionWords.some(w => prefix.includes(w))) {
        clean = parts.slice(1).join(':').trim();
      }
    }

    // Remove action prefixes and variations
    clean = clean.replace(/^(?:تسميع تثبيت|تسميع التثبيت|استماع تثبيت|استماع التثبيت|تسميع تراكمي لـ|تسميع تراكمي|تسميع|تثبيت|حفظ الجديد|حفظ جديد|حفظ|استماع|مراجعة تراكمية لـ|مراجعة تراكمية|مراجعة)\s+/g, '');
    
    // Remove trailing " غيباً"
    clean = clean.replace(/ غيباً$/g, '');

    // Remove trailing repetition descriptions like " (3 مرات)" or " (5 مرات)" or " (1 مرات)"
    clean = clean.replace(/\s*\(\d+\s*مرات\)/g, '');
    
    return clean.trim();
  };

  const groupedTasks: { key: string, label: string, pages: number[] | undefined, tasks: Task[] }[] = [];
  currentTasks.forEach(task => {
    const partMatch = task.id.match(/-part\d+/);
    const partSuffix = partMatch ? partMatch[0] : "";
    const initialLabel = getCleanGroupLabel(task.title);
    const key = task.pages && task.pages.length > 0 
      ? 'group-' + task.pages.join(',') + '-' + initialLabel + partSuffix 
      : `task-${task.id}`;
      
    let group = groupedTasks.find(g => g.key === key);
    if (!group) {
       group = { key, label: initialLabel, pages: task.pages, tasks: [] };
       groupedTasks.push(group);
    }
    group.tasks.push(task);
  });

  if (activePlan?.planType === 'review') {
    groupedTasks.sort((a, b) => {
      const aTask = a.tasks[0];
      const bTask = b.tasks[0];

      const getGroupWeight = (task: Task) => {
        if (task.type === TaskType.REVIEW) {
          const idx = task.trackIndex ?? 0;
          return idx;
        }
        if (task.type === TaskType.FIXATION || task.type === TaskType.RECITATION || task.type === TaskType.LISTENING) {
          return 1000;
        }
        if (task.type === TaskType.DHIKR) {
          return 2000;
        }
        return 3000;
      };

      return getGroupWeight(aTask) - getGroupWeight(bTask);
    });
  }

  return (
    <div className="space-y-4">
      {/* Date Navigation */}
      <div className="flex items-center justify-between bg-white/95 dark:bg-[#1A1A1A]/95 backdrop-blur-md px-2 py-2 rounded-2xl border border-[#1A2E1A]/5 dark:border-white/5 shadow-sm transition-colors">
        <button onClick={() => setSelectedDate(subDays(selectedDate, 1))} className="p-2 hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl transition-colors">
          <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
        </button>
        <div 
          onClick={() => setIsCalendarOpen(true)} 
          className="text-center cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-950/20 px-5 py-1.5 rounded-xl border border-transparent hover:border-emerald-200/50 dark:hover:border-emerald-900/30 transition-all select-none active:scale-95 duration-100 flex flex-col items-center justify-center gap-0.5"
          title="عرض تقويم الخطة والتنقل بين الأيام"
        >
          <div className="text-sm font-bold text-[#1A2E1A] dark:text-white flex items-center gap-1.5 justify-center">
            <Calendar className="w-3.5 h-3.5 text-[#D4AF37]" />
            {format(selectedDate, 'EEEE', { locale: ar })}
          </div>
          <div className="text-[10px] text-amber-600 dark:text-[#D4AF37] font-bold">
            {getHijriDate(selectedDate)}
          </div>
          <div className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
            {format(selectedDate, 'd MMMM yyyy', { locale: ar })}
          </div>
        </div>
        <button onClick={() => setSelectedDate(addDays(selectedDate, 1))} className="p-2 hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl transition-colors">
          <ChevronLeft className="w-5 h-5 text-gray-400 dark:text-gray-500" />
        </button>
      </div>

      {/* Postpone Toast Notification */}
      <AnimatePresence>
        {postponeSuccessMsg && (
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="bg-emerald-600 text-white p-3.5 rounded-2xl text-xs font-bold shadow-lg flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{postponeSuccessMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Postponed Day Banner */}
      {isPostponedDay && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 p-4 rounded-2xl flex flex-col gap-2.5 shadow-xs"
        >
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
            <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div className="font-bold text-sm">تم تأجيل مهام هذا اليوم إلى الغد</div>
          </div>
          <p className="text-xs text-amber-700/90 dark:text-amber-400/90 leading-relaxed font-sans">
            تمت زحزحة جدول جميع الأيام القادمة يوماً واحداً إلى الأمام بنجاح دون الحاجة لتعديل الخطة. مهام هذا اليوم ستظهر في الغد.
          </p>
          <div className="pt-1">
            <button
              onClick={handleUndoPostponeToday}
              disabled={isPostponing}
              className="px-3.5 py-2 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/40 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>إلغاء التأجيل (استرجاع جدول اليوم الأصلي)</span>
            </button>
          </div>
        </motion.div>
      )}

      {/* Compensation Day or Read-only Alert (Below Date Navigation) */}
      {isYesterday && !isPostponedDay && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/25 p-3 rounded-2xl flex items-center justify-center gap-2"
        >
          <Info className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-bold text-amber-700 dark:text-amber-400">يوم تعويض: يمكنك تسجيل وتعديل مهام الأمس الفائتة لتعويضها.</span>
        </motion.div>
      )}
      {!isEditable && !isPostponedDay && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 p-3 rounded-2xl flex items-center justify-center gap-2"
        >
          <Info className="w-4 h-4 text-blue-500" />
          <span className="text-xs font-bold text-blue-600 dark:text-blue-400">عرض للاطلاع فقط (لا يمكن التعديل إلا لمهام اليوم وأمس)</span>
        </motion.div>
      )}

      {/* Tasks List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-bold text-gray-400 dark:text-gray-600 uppercase tracking-wider">المهام ({currentTasks.length})</h3>
          {isEditable && activePlan && !isPostponedDay && (
            <button
              onClick={() => setShowPostponeModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-bold rounded-xl border border-amber-500/20 transition-all active:scale-95 cursor-pointer shadow-2xs"
              title="زحزحة مهام اليوم وجميع الأيام التالية يوماً واحداً إلى الأمام"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>تأجيل مهام اليوم</span>
            </button>
          )}
        </div>
        <AnimatePresence mode="popLayout" initial={false}>
          {groupedTasks.length > 0 ? (
            groupedTasks.map((group) => {
              const isSingleTask = group.tasks.length === 1;
              const listeningTask = group.tasks.find(t => t.type === TaskType.LISTENING);
              const audioTargetTask = listeningTask;
              const isGroupPlaying = group.tasks.some(t => playingTaskId === t.id) || (group.pages && group.pages.length > 0 && playingTaskId === `viewer-playing-${group.pages.join(',')}`);
              
              if (isSingleTask) {
                const task = group.tasks[0];
                const isTaskPlaying = playingTaskId === task.id || (task.pages && task.pages.length > 0 && playingTaskId === `viewer-playing-${task.pages.join(',')}`);
                return (
                  <motion.div
                    key={group.key}
                    layout="position"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex flex-col gap-1.5"
                  >
                     <div 
                       onClick={() => { if (isEditable) toggleTask(task.id); }}
                       className={clsx(
                          "flex items-center gap-3 px-3 py-2 rounded-2xl border-2 transition-all duration-300 select-none",
                          isEditable ? "cursor-pointer hover:scale-[1.01] active:scale-95" : "cursor-default opacity-50",
                          getTaskBorderStyles(task, task.completed, activePlan)
                       )}
                     >
                        <div 
                          onClick={(e) => { e.stopPropagation(); if (isEditable) forceToggleCompletion(task.id); }}
                          className="shrink-0 flex flex-col items-center justify-center cursor-pointer p-1 -m-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"
                        >
                           {task.completed ? (
                              <CheckCircle2 className="w-5 h-5 text-current" />
                           ) : (
                              <div className="relative flex items-center justify-center w-5 h-5">
                                  <Circle className="w-5 h-5 text-current opacity-60" />
                                  {task.targetCount > 1 && (
                                      <span className="absolute text-[8px] font-bold text-current">
                                        {task.currentCount}
                                      </span>
                                  )}
                              </div>
                           )}
                        </div>
                        
                        <div className="flex-1 min-w-0 flex items-center gap-2">
                           <h4 className={clsx("text-xs font-bold dark:text-white leading-tight break-words whitespace-pre-wrap", task.completed && "line-through text-gray-400 dark:text-gray-600")}>
                              {task.title}
                           </h4>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                            {task.type === 'dhikr' && task.targetCount > 1 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveTasbihTask(task);
                                }}
                                className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/55 text-emerald-850 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-900/50 text-[10px] font-bold rounded-xl transition-all active:scale-95 flex items-center gap-1 cursor-pointer shrink-0"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <span>مسبحة</span>
                              </button>
                            )}
                            {task.targetCount > 1 && (
                              <span className={clsx(
                                 "text-[10px] font-mono font-bold px-2 py-0.5 rounded-full shrink-0",
                                 task.completed 
                                    ? "text-emerald-700 bg-emerald-100/70 dark:bg-emerald-950/40 dark:text-emerald-300" 
                                    : "text-amber-700 bg-amber-100/70 dark:bg-amber-950/40 dark:text-amber-300"
                              )}>
                                 {task.currentCount}/{task.targetCount}
                              </span>
                            )}
                            {task.type === TaskType.LISTENING && group.pages && group.pages.length > 0 && (
                              <button 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  const willStartPlaying = !(isTaskPlaying && isPlaying);
                                  playPages(e, task); 
                                  if (willStartPlaying) openViewer(e, task.pages || group.pages || [], task.title);
                                }}
                                className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors flex items-center justify-center"
                              >
                                {isTaskPlaying && isLoadingAudio ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : isTaskPlaying && isPlaying ? (
                                    <Pause className="w-3.5 h-3.5 fill-current" />
                                ) : (
                                    <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                                )}
                              </button>
                            )}
                            {group.pages && group.pages.length > 0 && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); openViewer(e, group.pages!, task.title); }}
                                className={clsx(
                                  "p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all flex items-center justify-center gap-1 text-[11px] font-bold font-sans",
                                  (task.type === 'review' || task.type === 'fixation')
                                    ? "px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/50 dark:border-emerald-900/40 shadow-sm"
                                    : "bg-emerald-50 dark:bg-emerald-900/20"
                                )}
                                title="عرض آيات المهمة من المصحف"
                              >
                                <BookOpen className="w-3.5 h-3.5" />
                              </button>
                            )}
                        </div>
                     </div>
                     
                     {/* Audio Progress */}
                     <AnimatePresence initial={false}>
                       {isTaskPlaying && (
                         <motion.div
                           initial={{ height: 0, opacity: 0 }}
                           animate={{ height: "auto", opacity: 1 }}
                           exit={{ height: 0, opacity: 0 }}
                           transition={{ duration: 0.25, ease: "easeInOut" }}
                           className="overflow-hidden w-full"
                         >
                           {showOverallProgress ? (
                              <div className="w-full flex flex-col gap-2 bg-amber-50/90 dark:bg-amber-950/20 p-2.5 rounded-xl border border-amber-100 dark:border-amber-900/30 mt-2 select-none shadow-sm">
                                {/* Header row with Ayah info and the toggle hide button */}
                                <div className="flex items-center justify-between gap-2">
                                  <div className="text-[10px] font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                                    <Volume2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-500 animate-pulse" />
                                    <span>الآية {currentAyahSeq} من {activeAyahs.length} <span className="text-[9px] font-normal opacity-70">(رقم {activeAyahs[safeAyahIndex]?.numberInSurah})</span></span>
                                    <span className="text-[8px] text-gray-400 dark:text-gray-500 font-normal">({getQariFriendlyName(currentQari)} • {currentSpeed}x)</span>
                                  </div>
                                  
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowOverallProgress(false);
                                      localStorage.setItem('show_overall_progress', 'false');
                                    }}
                                    className="p-1 rounded hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-600 dark:text-amber-400 transition-colors cursor-pointer flex items-center gap-1 text-[9px] font-bold"
                                    title="إخفاء تفاصيل لوحة التحكم"
                                  >
                                    <EyeOff className="w-3.5 h-3.5" />
                                    
                                  </button>
                                </div>

                                {/* Only ONE elegant progress bar */}
                                {activeAyahs.length > 0 && (() => {
                                  const { played, total } = getPlayedAndTotalDuration(activeAyahs, playingAyahIndex, audioProgress, currentQari, currentSpeed);
                                  const overallProgress = total > 0 ? (played / total) * 100 : 0;
                                  return (
                                    <div className="flex flex-col gap-1">
                                      <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-bold text-teal-600 dark:text-teal-400 font-mono">{formatDuration(played)}</span>
                                        <div className="flex-1 h-1.5 bg-teal-100 dark:bg-teal-950/40 rounded-full overflow-hidden relative">
                                           <motion.div 
                                             className="absolute top-0 bottom-0 right-0 bg-teal-600 dark:bg-teal-500 rounded-full"
                                             style={{ width: `${overallProgress}%` }}
                                           />
                                        </div>
                                        <span className="text-[9px] font-bold text-gray-500 dark:text-gray-400 font-mono">{formatDuration(total)}</span>
                                      </div>
                                    </div>
                                  );
                                })()}

                                {/* Compact Action Controls & Settings */}
                                <div className="flex items-center justify-between gap-2 border-t border-amber-200/20 dark:border-amber-900/10 pt-2 mt-1">
                                  {/* Navigation buttons */}
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); prevAyah(); }}
                                      disabled={playingAyahIndex === 0}
                                      className="p-1 rounded-lg bg-amber-150/65 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/40 disabled:opacity-40 transition-colors"
                                      title="الآية السابقة"
                                    >
                                      <ChevronRight className="w-4 h-4" />
                                    </button>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                                      className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-100 transition-colors"
                                      title={isPlaying ? "إيقاف مؤقت" : "تشغيل"}
                                    >
                                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                    </button>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); stopAudio(); }}
                                      className="p-1 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-400 transition-colors"
                                      title="إيقاف تماماً"
                                    >
                                      <Square className="w-3.5 h-3.5" />
                                    </button>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); restartFromBeginning(); }}
                                      className="px-2 py-1 rounded-lg bg-amber-150/65 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/40 text-[9px] font-bold flex items-center gap-1 transition-colors"
                                      title="الرجوع من البداية"
                                    >
                                      <RotateCcw className="w-3 h-3" />
                                      <span>إعادة</span>
                                    </button>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); nextAyah(); }}
                                      disabled={playingAyahIndex >= activeAyahs.length - 1}
                                      className="p-1 rounded-lg bg-amber-150/65 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/40 disabled:opacity-40 transition-colors"
                                      title="الآية التالية"
                                    >
                                      <ChevronLeft className="w-4 h-4" />
                                    </button>
                                  </div>

                                  {/* Dropdowns */}
                                  <div className="flex items-center gap-1.5 flex-1 justify-end">
                                     <select 
                                       value={currentQari}
                                       onChange={(e) => updatePlaybackSettings(e.target.value, undefined)}
                                       className="text-[9px] font-bold bg-white dark:bg-[#151515] border border-amber-200/60 dark:border-amber-900/30 rounded-lg px-2 py-1 outline-none text-gray-700 dark:text-gray-300 cursor-pointer max-w-[100px]"
                                     >
                                        <option value="Minshawy_Murattal_128kbps">المنشاوي</option>
                                        <option value="Husary_128kbps">الحصري</option>
                                        <option value="Abdul_Basit_Murattal_64kbps">عبد الباسط</option>
                                        <option value="Ayman_Sowaid_64kbps">أيمن سويد</option>
                                        <option value="Muhammad_Ayyoub_128kbps">محمد أيوب</option>
                                        <option value="Ghamadi_40kbps">الغامدي</option>
                                        <option value="MaherAlMuaiqly128kbps">المعيقلي</option>
                                     </select>
                                     <select
                                       value={currentSpeed}
                                       onChange={(e) => updatePlaybackSettings(undefined, e.target.value)}
                                       className="w-12 text-[9px] font-bold text-center bg-white dark:bg-[#151515] border border-amber-200/60 dark:border-amber-900/30 rounded-lg px-1 py-1 outline-none text-gray-700 dark:text-gray-300 cursor-pointer"
                                     >
                                       {["1.0", "1.2", "1.4", "1.5", "1.6", "1.8", "2.0"].map((speed) => (
                                         <option key={speed} value={speed}>
                                           {speed}x
                                         </option>
                                       ))}
                                     </select>
                                  </div>
                                </div>
                              </div>
                           ) : (
                              <div className="w-full flex items-center justify-between gap-2 bg-amber-50/60 dark:bg-amber-950/10 px-2 py-1.5 rounded-lg border border-amber-100/50 dark:border-amber-900/20 mt-2 select-none">
                                {/* Pulsing indicator & Mini status */}
                                <div className="flex items-center gap-1.5 text-[9px] font-bold text-amber-700 dark:text-amber-400">
                                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping" />
                                  <span>الآية {activeAyahs[safeAyahIndex]?.numberInSurah} ({currentAyahSeq}/{activeAyahs.length}) • {getQariFriendlyName(currentQari)}</span>
                                </div>

                                {/* Slim single progress bar in center */}
                                {activeAyahs.length > 0 && (() => {
                                  const { played, total } = getPlayedAndTotalDuration(activeAyahs, playingAyahIndex, audioProgress, currentQari, currentSpeed);
                                  const overallProgress = total > 0 ? (played / total) * 100 : 0;
                                  return (
                                    <div className="flex-1 max-w-[40%] flex items-center gap-1">
                                      <div className="flex-1 h-1 bg-teal-100/80 dark:bg-teal-950/30 rounded-full overflow-hidden relative">
                                         <motion.div 
                                           className="absolute top-0 bottom-0 right-0 bg-teal-600 dark:bg-teal-500 rounded-full"
                                           style={{ width: `${overallProgress}%` }}
                                         />
                                      </div>
                                      <span className="text-[8px] font-bold text-teal-600 dark:text-teal-400 font-mono shrink-0">
                                        {formatDuration(played)}/{formatDuration(total)}
                                      </span>
                                    </div>
                                  );
                                })()}

                                {/* Compact controls inside collapsed mode too! */}
                                <div className="flex items-center gap-1 shrink-0">
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); prevAyah(); }}
                                    disabled={playingAyahIndex === 0}
                                    className="p-1 rounded hover:bg-amber-100 dark:hover:bg-amber-900/20 disabled:opacity-30 text-amber-700 dark:text-amber-400"
                                    title="الآية السابقة"
                                  >
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  </button>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                                    className="p-1 rounded bg-amber-100/60 dark:bg-amber-900/30 text-amber-900 dark:text-amber-100 transition-colors"
                                    title={isPlaying ? "إيقاف مؤقت" : "تشغيل"}
                                  >
                                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                                  </button>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); stopAudio(); }}
                                    className="p-1 rounded hover:bg-amber-200 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-400 transition-colors"
                                    title="إيقاف تماماً"
                                  >
                                    <Square className="w-3 h-3" />
                                  </button>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); nextAyah(); }}
                                    disabled={playingAyahIndex >= activeAyahs.length - 1}
                                    className="p-1 rounded hover:bg-amber-100 dark:hover:bg-amber-900/20 disabled:opacity-30 text-amber-700 dark:text-amber-400"
                                    title="الآية التالية"
                                  >
                                    <ChevronLeft className="w-3.5 h-3.5" />
                                  </button>
                                  
                                  <div className="h-3 w-[1px] bg-amber-200/50 dark:bg-amber-800/30 mx-0.5" />

                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowOverallProgress(true);
                                      localStorage.setItem('show_overall_progress', 'true');
                                    }}
                                    className="p-1 rounded hover:bg-amber-100 dark:hover:bg-amber-900/30 text-teal-600 dark:text-teal-400 flex items-center gap-1 text-[9px] font-bold cursor-pointer transition-colors"
                                    title="إظهار لوحة التحكم"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    
                                  </button>
                                </div>
                              </div>
                           )}
                         </motion.div>
                       )}
                     </AnimatePresence>
                  </motion.div>
                );
              }

              return (
                <motion.div
                  key={group.key}
                  layout="position"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={clsx(
                    "bg-white dark:bg-[#1A1A1A] px-3 pt-3 pb-3 rounded-3xl border border-[#1A2E1A]/5 dark:border-white/5 shadow-sm transition-colors",
                    group.tasks.every(t => t.completed) && "opacity-70 bg-[#1A2E1A]/5 dark:bg-[#D4AF37]/5 border-transparent"
                  )}
                >
                  {/* Group Header */}
                  <div className="flex items-center justify-between px-1 mb-2">
                     <h4 className={clsx("text-sm font-bold dark:text-white leading-tight whitespace-pre-wrap", group.tasks.every(t => t.completed) && "line-through text-gray-400 dark:text-gray-600")}>
                        {group.label}
                     </h4>
                     <div className="flex items-center gap-1.5 shrink-0">
                       {audioTargetTask && group.pages && group.pages.length > 0 && (
                         <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            const willStartPlaying = !(playingTaskId === audioTargetTask.id && isPlaying);
                            playPages(e, audioTargetTask); 
                            if (willStartPlaying) openViewer(e, audioTargetTask.pages || group.pages || [], audioTargetTask.title);
                          }}
                           className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors flex items-center justify-center"
                         >
                           {playingTaskId === audioTargetTask.id && isLoadingAudio ? (
                               <Loader2 className="w-4 h-4 animate-spin" />
                           ) : playingTaskId === audioTargetTask.id && isPlaying ? (
                               <Pause className="w-4 h-4 fill-current" />
                           ) : (
                               <Play className="w-4 h-4 fill-current ml-0.5" />
                           )}
                         </button>
                       )}
                       {group.pages && group.pages.length > 0 && (
                         <button 
                           onClick={(e) => openViewer(e, group.pages!, group.label)}
                           className={clsx(
                             "p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all flex items-center justify-center gap-1 text-[11px] font-bold font-sans",
                             group.tasks.some(t => t.type === 'review' || t.type === 'fixation')
                               ? "px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/50 dark:border-emerald-900/40 shadow-sm"
                               : "bg-emerald-50 dark:bg-emerald-900/20"
                           )}
                           title="عرض آيات المهمة من المصحف"
                         >
                           <BookOpen className="w-4 h-4" />
                           
                         </button>
                       )}
                     </div>
                  </div>

                  {/* Sub-tasks in a single line (Horizontal Compact items) */}
                  <div className="flex flex-row items-stretch gap-2 overflow-x-auto pb-1 scrollbar-hide">
                     {[...group.tasks].sort((a, b) => {
                       if (a.type === b.type) {
                         if (a.type === 'review') {
                           return (a.trackIndex ?? 0) - (b.trackIndex ?? 0);
                         }
                         return 0;
                       }
                       const getOrder = (type: string) => {
                         const isReviewPlan = activePlan?.planType === 'review';
                         if (isReviewPlan) {
                           if (type === 'listening') return 1;
                           if (type === 'fixation') return 2;
                           if (type === 'review') return 3;
                           if (type === 'cumulative_review') return 4;
                           if (type === 'recitation') return 5;
                           return 6;
                         } else {
                           if (type === 'listening') return 1;
                           if (type === 'memorization') return 2;
                           if (type === 'fixation') return 3;
                           if (type === 'review') return 4;
                           if (type === 'cumulative_review') return 5;
                           if (type === 'recitation') return 6;
                           return 7;
                         }
                       };
                       return getOrder(a.type) - getOrder(b.type);
                     }).map(task => (
                       <div 
                          key={task.id}
                          onClick={() => { if (isEditable) toggleTask(task.id); }}
                          className={clsx(
                             "relative flex flex-col items-center justify-center gap-1 min-w-[3.5rem] py-1.5 px-2 rounded-xl border-2 transition-all duration-300 select-none flex-1",
                             isEditable ? "cursor-pointer hover:scale-[1.02] active:scale-95" : "cursor-default opacity-50",
                             getTaskBorderStyles(task, task.completed, activePlan)
                          )}
                       >
                          <div 
                            onClick={(e) => { e.stopPropagation(); if (isEditable) forceToggleCompletion(task.id); }}
                            className="relative flex items-center justify-center cursor-pointer p-1 -m-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors flex-shrink-0"
                          >
                           {task.completed ? (
                                <CheckCircle2 className="w-5 h-5 text-current shrink-0" />
                           ) : (
                                <div className="relative flex items-center justify-center w-5 h-5 shrink-0">
                                    <Circle className="w-5 h-5 text-current opacity-60" />
                                    {task.targetCount > 1 && (
                                        <span className="absolute text-[7px] font-bold text-current">
                                          {task.currentCount}
                                        </span>
                                    )}
                                </div>
                           )}
                          </div>
                          
                          <span className={clsx(
                              "text-[10px] font-bold text-center whitespace-nowrap text-current",
                              task.completed && "opacity-70 line-through"
                          )}>
                             {task.type === 'memorization' ? 'حفظ' : 
                             task.type === 'fixation' ? 'تثبيت' :
                             task.type === 'review' ? 'مراجعة' : 
                             task.type === 'cumulative_review' ? 'تراكمي' : 
                             task.type === 'listening' ? 'استماع' : 'تسميع'}
                          </span>

                          {task.targetCount > 1 && (
                            <span className="text-[9px] font-mono font-extrabold text-current/90 mt-[-2px] tracking-tighter bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded-md">
                              {task.currentCount}/{task.targetCount}
                            </span>
                          )}

                                           {/* Audio Progress (show globally under the row if a task is playing) */}
                        </div>
                     ))}
                  </div>

                  <AnimatePresence initial={false}>
                    {isGroupPlaying && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="overflow-hidden w-full"
                      >
                        {showOverallProgress ? (
                           <div className="w-full mt-3 flex flex-col gap-2 bg-amber-50/90 dark:bg-amber-950/20 p-2.5 rounded-xl border border-amber-100 dark:border-amber-900/30 select-none shadow-sm">
                             {/* Header row with Ayah info and the toggle hide button */}
                             <div className="flex items-center justify-between gap-2">
                               <div className="text-[10px] font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                                 <Volume2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-500 animate-pulse" />
                                 <span>{activeAyahs[safeAyahIndex]?.surah.name}: الآية {activeAyahs[safeAyahIndex]?.numberInSurah} ({currentAyahSeq} من {activeAyahs.length})</span>
                                 <span className="text-[8px] text-gray-400 dark:text-gray-500 font-normal">({getQariFriendlyName(currentQari)} • {currentSpeed}x)</span>
                               </div>
                               
                               <div className="flex items-center gap-1">
                                 <button 
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     setShowOverallProgress(false);
                                     localStorage.setItem('show_overall_progress', 'false');
                                   }}
                                   className="p-1 rounded hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-600 dark:text-amber-400 transition-colors cursor-pointer flex items-center gap-1 text-[9px] font-bold"
                                   title="إخفاء تفاصيل لوحة التحكم"
                                 >
                                   <EyeOff className="w-3.5 h-3.5" />
                                 </button>
                                 <button 
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     stopAudio();
                                   }}
                                   className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 dark:text-red-400 transition-colors cursor-pointer flex items-center gap-1 text-[9px] font-bold"
                                   title="إغلاق الصوت وإخفاء اللوحة"
                                 >
                                   <X className="w-3.5 h-3.5" />
                                 </button>
                               </div>
                             </div>

                             {/* Only ONE elegant progress bar */}
                             {activeAyahs.length > 0 && (() => {
                               const { played, total } = getPlayedAndTotalDuration(activeAyahs, playingAyahIndex, audioProgress, currentQari, currentSpeed);
                               const overallProgress = total > 0 ? (played / total) * 100 : 0;
                               return (
                                 <div className="flex flex-col gap-1">
                                   <div className="flex items-center gap-2">
                                     <span className="text-[9px] font-bold text-teal-600 dark:text-teal-400 font-mono">{formatDuration(played)}</span>
                                     <div className="flex-1 h-1.5 bg-teal-100 dark:bg-teal-950/40 rounded-full overflow-hidden relative">
                                        <motion.div 
                                          className="absolute top-0 bottom-0 right-0 bg-teal-600 dark:bg-teal-500 rounded-full"
                                          style={{ width: `${overallProgress}%` }}
                                        />
                                     </div>
                                     <span className="text-[9px] font-bold text-gray-500 dark:text-gray-400 font-mono">{formatDuration(total)}</span>
                                   </div>
                                 </div>
                               );
                             })()}

                             {/* Compact Action Controls & Settings */}
                             <div className="flex items-center justify-between gap-2 border-t border-amber-200/20 dark:border-amber-900/10 pt-2 mt-1">
                               {/* Navigation buttons */}
                               <div className="flex items-center gap-1 shrink-0">
                                 <button 
                                   onClick={(e) => { e.stopPropagation(); prevAyah(); }}
                                   disabled={playingAyahIndex === 0}
                                   className="p-1 rounded-lg bg-amber-150/65 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/40 disabled:opacity-40 transition-colors"
                                   title="الآية السابقة"
                                 >
                                   <ChevronRight className="w-4 h-4" />
                                 </button>
                                 <button 
                                   onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                                   className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-100 transition-colors"
                                   title={isPlaying ? "إيقاف مؤقت" : "تشغيل"}
                                 >
                                   {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                 </button>
                                 <button 
                                   onClick={(e) => { e.stopPropagation(); stopAudio(); }}
                                   className="p-1 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-400 transition-colors"
                                   title="إيقاف تماماً"
                                 >
                                   <Square className="w-3.5 h-3.5" />
                                 </button>
                                 <button 
                                   onClick={(e) => { e.stopPropagation(); restartFromBeginning(); }}
                                   className="px-2 py-1 rounded-lg bg-amber-150/65 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/40 text-[9px] font-bold flex items-center gap-1 transition-colors"
                                   title="الرجوع من البداية"
                                 >
                                   <RotateCcw className="w-3 h-3" />
                                   <span>إعادة</span>
                                 </button>
                                 <button 
                                   onClick={(e) => { e.stopPropagation(); nextAyah(); }}
                                   disabled={playingAyahIndex >= activeAyahs.length - 1}
                                   className="p-1 rounded-lg bg-amber-150/65 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/40 disabled:opacity-40 transition-colors"
                                   title="الآية التالية"
                                 >
                                   <ChevronLeft className="w-4 h-4" />
                                 </button>
                               </div>

                               {/* Dropdowns */}
                               <div className="flex items-center gap-1.5 flex-1 justify-end">
                                  <select 
                                    value={currentQari}
                                    onChange={(e) => updatePlaybackSettings(e.target.value, undefined)}
                                    className="text-[9px] font-bold bg-white dark:bg-[#151515] border border-amber-200/60 dark:border-amber-900/30 rounded-lg px-2 py-1 outline-none text-gray-700 dark:text-gray-300 cursor-pointer max-w-[100px]"
                                  >
                                     <option value="Minshawy_Murattal_128kbps">المنشاوي</option>
                                     <option value="Husary_128kbps">الحصري</option>
                                     <option value="Abdul_Basit_Murattal_64kbps">عبد الباسط</option>
                                     <option value="Ayman_Sowaid_64kbps">أيمن سويد</option>
                                     <option value="Muhammad_Ayyoub_128kbps">محمد أيوب</option>
                                     <option value="Ghamadi_40kbps">الغامدي</option>
                                     <option value="MaherAlMuaiqly128kbps">المعيقلي</option>
                                  </select>
                                  <select
                                    value={currentSpeed}
                                    onChange={(e) => updatePlaybackSettings(undefined, e.target.value)}
                                    className="w-12 text-[9px] font-bold text-center bg-white dark:bg-[#151515] border border-amber-200/60 dark:border-amber-900/30 rounded-lg px-1 py-1 outline-none text-gray-700 dark:text-gray-300 cursor-pointer"
                                  >
                                    {["1.0", "1.2", "1.4", "1.5", "1.6", "1.8", "2.0"].map((speed) => (
                                      <option key={speed} value={speed}>
                                        {speed}x
                                      </option>
                                    ))}
                                  </select>
                               </div>
                             </div>
                           </div>
                        ) : (
                           <div className="w-full mt-3 flex items-center justify-between gap-2 bg-amber-50/60 dark:bg-amber-950/10 px-2 py-1.5 rounded-lg border border-amber-100/50 dark:border-amber-900/20 select-none">
                             {/* Pulsing indicator & Mini status */}
                             <div className="flex items-center gap-1.5 text-[9px] font-bold text-amber-700 dark:text-amber-400">
                               <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping" />
                               <span>{activeAyahs[safeAyahIndex]?.surah.name}: الآية {activeAyahs[safeAyahIndex]?.numberInSurah} ({currentAyahSeq} من {activeAyahs.length}) • {getQariFriendlyName(currentQari)}</span>
                             </div>

                             {/* Slim single progress bar in center */}
                             {activeAyahs.length > 0 && (() => {
                               const { played, total } = getPlayedAndTotalDuration(activeAyahs, playingAyahIndex, audioProgress, currentQari, currentSpeed);
                               const overallProgress = total > 0 ? (played / total) * 100 : 0;
                               return (
                                 <div className="flex-1 max-w-[40%] flex items-center gap-1">
                                   <div className="flex-1 h-1 bg-teal-100/80 dark:bg-teal-950/30 rounded-full overflow-hidden relative">
                                      <motion.div 
                                        className="absolute top-0 bottom-0 right-0 bg-teal-600 dark:bg-teal-500 rounded-full"
                                        style={{ width: `${overallProgress}%` }}
                                      />
                                   </div>
                                   <span className="text-[8px] font-bold text-teal-600 dark:text-teal-400 font-mono shrink-0">
                                     {formatDuration(played)}/{formatDuration(total)}
                                   </span>
                                 </div>
                               );
                             })()}

                             {/* Compact controls inside collapsed mode too! */}
                             <div className="flex items-center gap-1 shrink-0">
                               <button 
                                 onClick={(e) => { e.stopPropagation(); prevAyah(); }}
                                 disabled={playingAyahIndex === 0}
                                 className="p-1 rounded hover:bg-amber-150/65 dark:hover:bg-amber-900/20 disabled:opacity-30 text-amber-700 dark:text-amber-400"
                                 title="الآية السابقة"
                               >
                                 <ChevronRight className="w-3.5 h-3.5" />
                               </button>
                               <button 
                                 onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                                 className="p-1 rounded bg-amber-100/60 dark:bg-amber-900/30 text-amber-900 dark:text-amber-100 transition-colors"
                                 title={isPlaying ? "إيقاف مؤقت" : "تشغيل"}
                               >
                                 {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                               </button>
                               <button 
                                 onClick={(e) => { e.stopPropagation(); stopAudio(); }}
                                 className="p-1 rounded hover:bg-amber-200 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-400 transition-colors"
                                 title="إيقاف تماماً"
                               >
                                 <Square className="w-3 h-3" />
                               </button>
                               <button 
                                 onClick={(e) => { e.stopPropagation(); nextAyah(); }}
                                 disabled={playingAyahIndex >= activeAyahs.length - 1}
                                 className="p-1 rounded hover:bg-amber-150/65 dark:hover:bg-amber-900/20 disabled:opacity-30 text-amber-700 dark:text-amber-400"
                                 title="الآية التالية"
                               >
                                 <ChevronLeft className="w-3.5 h-3.5" />
                               </button>
                               
                               <div className="h-3 w-[1px] bg-amber-200/50 dark:bg-amber-800/30 mx-0.5" />

                               <button 
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   setShowOverallProgress(true);
                                   localStorage.setItem('show_overall_progress', 'true');
                                 }}
                                 className="p-1 rounded hover:bg-amber-100 dark:hover:bg-amber-900/30 text-teal-600 dark:text-teal-400 flex items-center gap-1 text-[9px] font-bold cursor-pointer transition-colors"
                                 title="إظهار لوحة التحكم"
                               >
                                 <Eye className="w-3.5 h-3.5" />
                               </button>
                               <button 
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   stopAudio();
                                 }}
                                 className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 dark:text-red-400 transition-colors cursor-pointer flex items-center gap-1 text-[9px] font-bold"
                                 title="إغلاق الصوت وإخفاء اللوحة"
                               >
                                 <X className="w-3.5 h-3.5" />
                               </button>
                             </div>
                           </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })
          ) : (
            <div className="bg-gray-50/50 dark:bg-white/5 p-12 rounded-3xl border-2 border-dashed border-gray-100 dark:border-white/5 flex flex-col items-center justify-center text-center transition-colors">
               <p className="text-gray-400 dark:text-gray-600 text-sm italic font-medium">هذا اليوم مخصص للراحة أو الاستعداد للأسبوع القادم</p>
            </div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Quran Viewer Modal */}
      <AnimatePresence>
        {viewerOpen && viewerContext && (
          <QuranViewer 
            isOpen={viewerOpen} 
            onClose={() => setViewerOpen(false)} 
            pages={viewerContext.pages} 
            taskTitle={viewerContext.title} 
          />
        )}
      </AnimatePresence>

      {/* Calendar Navigation Modal */}
      <AnimatePresence>
        {isCalendarOpen && activePlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCalendarOpen(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />

            {/* Content Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md bg-white dark:bg-[#1A1A1A] rounded-3xl border border-[#1A2E1A]/10 dark:border-white/10 shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]"
              dir="rtl"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-white/5">
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-[#D4AF37]" />
                    تقويم الخطة اليومي
                  </h3>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                    اختر أي يوم من أيام الخطة للاطلاع على مهامه
                  </p>
                </div>
                <button 
                  onClick={() => setIsCalendarOpen(false)}
                  className="p-1 px-2.5 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-full text-xs font-bold transition-colors"
                >
                  إغلاق
                </button>
              </div>

              {/* Tabs for Views */}
              <div className="flex bg-gray-50 dark:bg-[#151515] p-1 mx-5 mt-4 rounded-xl border border-gray-100 dark:border-white/5">
                <button
                  onClick={() => setCalendarViewMode('month')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    calendarViewMode === 'month'
                      ? 'bg-white dark:bg-[#252525] text-emerald-800 dark:text-[#D4AF37] shadow-sm'
                      : 'text-gray-450 hover:text-gray-650'
                  }`}
                >
                  التقويم الشهري
                </button>
                <button
                  onClick={() => setCalendarViewMode('weeks')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    calendarViewMode === 'weeks'
                      ? 'bg-white dark:bg-[#252525] text-emerald-800 dark:text-[#D4AF37] shadow-sm'
                      : 'text-gray-450 hover:text-gray-650'
                  }`}
                >
                  عرض الأسابيع ({planWeeks.length})
                </button>
              </div>

              {/* View Content */}
              <div className="p-5 overflow-y-auto flex-1">
                {calendarViewMode === 'month' ? (
                  <div className="space-y-4">
                    {/* Month Picker Row */}
                    <div className="flex items-center justify-between bg-gray-50/50 dark:bg-white/5 px-3 py-1.5 rounded-2xl border border-gray-100 dark:border-white/5">
                      <button 
                        onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))} 
                        className="p-1 hover:bg-gray-150 dark:hover:bg-white/10 rounded-full transition-colors"
                      >
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </button>
                      <span className="text-xs font-bold text-gray-800 dark:text-white">
                        {format(calendarMonth, 'MMMM yyyy', { locale: ar })}
                      </span>
                      <button 
                        onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))} 
                        className="p-1 hover:bg-gray-150 dark:hover:bg-white/10 rounded-full transition-colors"
                      >
                        <ChevronLeft className="w-5 h-5 text-gray-400" />
                      </button>
                    </div>

                    {/* Weekdays names */}
                    <div className="grid grid-cols-7 text-center mb-1">
                      {['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'].map(day => (
                        <div key={day} className="text-[10px] font-bold text-gray-400 dark:text-gray-605">
                          {day}
                        </div>
                      ))}
                    </div>

                    {/* Month Days Grid */}
                    <div className="grid grid-cols-7 gap-1.5">
                      {/* Empty elements before start of month */}
                      {Array.from({ length: startOfMonth(calendarMonth).getDay() }).map((_, i) => (
                        <div key={`empty-${i}`} />
                      ))}

                      {/* Map days of month */}
                      {eachDayOfInterval({
                        start: startOfMonth(calendarMonth),
                        end: endOfMonth(calendarMonth),
                      }).map(day => {
                        const dayStr = format(day, 'yyyy-MM-dd');
                        const isPlanDay = planDates.some(pd => format(pd, 'yyyy-MM-dd') === dayStr);
                        const log = allLogs?.find(l => l.date === dayStr);
                        const isTodayCell = isSameDay(day, new Date());
                        const isSelectedCell = isSameDay(day, selectedDate);
                        const isCompleted = log && log.tasks.length > 0 && log.tasks.every(t => t.completed);
                        const partiallyCompleted = log && log.tasks.some(t => t.completed) && !isCompleted;

                        const planIndex = planDates.findIndex(pd => isSameDay(pd, day));

                        return (
                          <div key={day?.toString() || Math.random().toString()} className="flex flex-col items-center">
                            <button
                              disabled={!isPlanDay}
                              onClick={() => {
                                setSelectedDate(day);
                                setIsCalendarOpen(false);
                              }}
                              className={`
                                relative w-10 h-10 rounded-2xl flex flex-col items-center justify-center text-xs font-bold transition-all select-none
                                ${!isSameMonth(day, calendarMonth) ? 'opacity-20' : 'opacity-100'}
                                ${isSelectedCell 
                                  ? 'bg-[#1A2E1A] dark:bg-[#D4AF37] text-white dark:text-[#1A1A1A] shadow-lg scale-105 z-10' 
                                  : isPlanDay
                                    ? isCompleted
                                      ? 'bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/50 text-[#1A2E1A] dark:text-[#D4AF37]'
                                      : partiallyCompleted
                                        ? 'bg-orange-50 dark:bg-orange-950/25 border border-orange-200/50 dark:border-orange-900/40 text-orange-800 dark:text-orange-300'
                                        : 'bg-white dark:bg-[#222] border border-gray-100 dark:border-white/5 text-gray-750 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a2a2a]'
                                    : 'text-gray-200 dark:text-gray-800 cursor-default pointer-events-none'
                                }
                                ${isTodayCell && !isSelectedCell ? 'ring-2 ring-emerald-400 ring-offset-1 dark:ring-offset-[#1A1A1A]' : ''}
                              `}
                            >
                              <span className="leading-none">{day.getDate()}</span>
                              {isPlanDay && (
                                <span className="text-[7px] text-gray-400 dark:text-gray-500 scale-90 font-mono">
                                  ي{planIndex + 1}
                                </span>
                              )}
                              
                              {/* Completeness dots */}
                              {isPlanDay && (
                                <div className="absolute bottom-1 flex items-center gap-0.5 justify-center">
                                  {isCompleted && <div className="w-1 h-1 bg-emerald-500 dark:bg-[#D4AF37] rounded-full" />}
                                  {partiallyCompleted && <div className="w-1 h-1 bg-orange-400 rounded-full" />}
                                  {!log && <div className="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />}
                                </div>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto px-1 scrollbar-hide">
                    {planWeeks.map((week, wIndex) => {
                      const wNum = wIndex + 1;
                      const weekStart = week[0];
                      const weekEnd = week[week.length - 1];
                      const weekRangeStr = weekStart && weekEnd 
                        ? `${format(weekStart, 'd MMMM', { locale: ar })} - ${format(weekEnd, 'd MMMM yyyy', { locale: ar })}` 
                        : '';

                      return (
                        <div key={wIndex} className="bg-gray-50/50 dark:bg-white/5 p-3 rounded-2xl border border-gray-100 dark:border-white/5 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#1A2E1A] dark:text-[#D4AF37]">
                              الأسبوع {wNum}
                            </span>
                            <span className="text-[10px] text-gray-450 dark:text-gray-500 font-sans">
                              {weekRangeStr}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-7 gap-1">
                            {week.map(day => {
                              const dayStr = format(day, 'yyyy-MM-dd');
                              const log = allLogs?.find(l => l.date === dayStr);
                              const isCompleted = log && log.tasks.length > 0 && log.tasks.every(t => t.completed);
                              const partiallyCompleted = log && log.tasks.some(t => t.completed) && !isCompleted;
                              const isSelectedCell = isSameDay(day, selectedDate);
                              const isTodayCell = isSameDay(day, new Date());
                              const pIndex = planDates.findIndex(pd => isSameDay(pd, day));

                              return (
                                <button
                                  key={day?.toString() || Math.random().toString()}
                                  onClick={() => {
                                    setSelectedDate(day);
                                    setIsCalendarOpen(false);
                                  }}
                                  className={`
                                    flex flex-col items-center justify-center py-2 rounded-xl border aspect-square transition-all text-center relative select-none
                                    ${isSelectedCell
                                      ? 'bg-[#1A2E1A] dark:bg-[#D4AF37] text-white dark:text-[#1A1A1A] border-transparent shadow-md scale-105'
                                      : isCompleted
                                        ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200/50 text-emerald-800 dark:text-[#D4AF37]'
                                        : partiallyCompleted
                                          ? 'bg-orange-50 dark:bg-orange-950/20 border-orange-200/50 text-orange-850'
                                          : 'bg-white dark:bg-[#1A1A1A] border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300'
                                    }
                                    ${isTodayCell && !isSelectedCell ? 'ring-1 ring-emerald-400' : ''}
                                  `}
                                >
                                  <span className="text-[8px] text-gray-400 dark:text-gray-500 block leading-none mb-1">
                                    {format(day, 'EEEEEE', { locale: ar })}
                                  </span>
                                  <span className="text-xs font-bold leading-none">
                                    {day.getDate()}
                                  </span>
                                  <span className="text-[8px] text-gray-400 dark:text-gray-500 block leading-none scale-90 font-mono mt-0.5">
                                    {pIndex !== -1 ? `ي${pIndex + 1}` : ''}
                                  </span>
                                  {isCompleted && (
                                    <span className="absolute top-1 right-1 w-1 h-1 bg-emerald-500 rounded-full" />
                                  )}
                                  {partiallyCompleted && (
                                    <span className="absolute top-1 right-1 w-1 h-1 bg-orange-400 rounded-full" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Bottom Actions & Legend */}
              <div className="p-4 border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-[#151515] flex flex-col gap-3">
                {/* Legend */}
                <div className="flex justify-center gap-4 text-[9px] font-bold text-gray-400 dark:text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-emerald-500 dark:bg-[#D4AF37] rounded-full" />
                    <span>يوم مكتمل</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-orange-400 rounded-full" />
                    <span>يوم متعثر</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-gray-300 dark:bg-gray-650 rounded-full" />
                    <span>يوم متبقي</span>
                  </div>
                </div>

                {/* Quick Shortcuts */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedDate(new Date());
                      setIsCalendarOpen(false);
                    }}
                    className="flex-1 py-2 text-xs font-bold text-center bg-[#1A2E1A] dark:bg-white/5 hover:bg-[#1A2E1A]/95 dark:hover:bg-white/10 text-white hover:text-white rounded-xl transition-all shadow-sm"
                  >
                    انتقال إلى اليوم (اليوم الحالي)
                  </button>
                  <button
                    onClick={() => {
                      if (planDates.length > 0) {
                        setSelectedDate(planDates[0]);
                        setIsCalendarOpen(false);
                      }
                    }}
                    className="py-2 px-3 text-xs font-bold text-center bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 rounded-xl transition-all"
                  >
                    بداية الخطة
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Tasbeeh / Dhikr Counter Modal */}
      <AnimatePresence>
        {activeTasbihTask && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-[#FDFBF7] dark:bg-[#121212] overflow-hidden"
              dir="rtl"
            >
              <div 
                style={counterRotationStyle || { position: 'absolute', inset: 0, width: '100%', height: '100%' }}
                className="flex flex-col justify-between"
              >
              {/* Header Area */}
              <div className="flex items-center justify-between p-4 bg-white/60 dark:bg-black/20 backdrop-blur-md border-b border-gray-100 dark:border-white/5 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span className="text-sm font-bold text-gray-800 dark:text-gray-200 font-rtl">مسبحة الأذكار اليومية</span>
                </div>
                
                <button
                  onClick={() => setActiveTasbihTask(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 font-bold text-xs rounded-xl transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>خروج (مواصلة لاحقاً)</span>
                </button>
              </div>

              {/* Upper Half: Dhikr text displays beautifully here */}
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none overflow-y-auto">
                <motion.div
                  key={activeTasbihTask.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="max-w-xl mx-auto space-y-4"
                >
                  <p className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#1A2E1A] dark:text-white leading-relaxed font-rtl whitespace-pre-wrap select-text selection:bg-emerald-100 dark:selection:bg-emerald-950/40 px-4">
                    {activeTasbihTask.title}
                  </p>
                </motion.div>
              </div>

              {/* Lower Half: Large tapping circle area */}
              <div className="bg-white/40 dark:bg-black/10 border-t border-gray-100 dark:border-white/5 p-6 pb-28 sm:p-8 sm:pb-12 shrink-0 flex flex-col items-center justify-center gap-6">
                <motion.div
                  whileTap={{ scale: 0.94 }}
                  onPointerDown={(e) => {
                    // Only respond to primary pointers (left click, main touch) to avoid right click interference
                    if (e.button === 0) handleTasbihTap();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleTasbihTap();
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className={clsx(
                    "w-52 h-52 sm:w-64 sm:h-64 rounded-full flex flex-col items-center justify-center transition-all shadow-[0_20px_50px_-20px_rgba(16,185,129,0.3)] dark:shadow-[0_20px_50px_-20px_rgba(16,185,129,0.15)] border-4 cursor-pointer focus:outline-none select-none touch-manipulation",
                    activeTasbihTask.completed
                      ? "bg-emerald-600 border-emerald-400 text-white shadow-[0_20px_50px_-20px_rgba(16,185,129,0.3)]"
                      : "bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/20 dark:to-emerald-900/30 border-emerald-500 text-emerald-850 dark:text-emerald-350 hover:border-emerald-600"
                  )}
                >
                  {activeTasbihTask.completed ? (
                    <motion.div 
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      className="text-center space-y-2"
                    >
                      <CheckCircle2 className="w-16 h-16 mx-auto text-white animate-bounce" />
                      <span className="text-lg font-extrabold block font-rtl text-white">تم بحمد الله!</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleResetTasbih();
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                        className="mt-2 text-[10px] font-bold text-emerald-100 underline hover:text-white"
                      >
                        إعادة البدء
                      </button>
                    </motion.div>
                  ) : (
                    <div className="text-center space-y-1">
                      <span className="text-6xl font-mono font-black tracking-tighter block relative select-none">
                        {activeTasbihTask.currentCount}
                      </span>
                      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 block uppercase tracking-widest leading-none font-rtl mt-2">
                         الهدف: {activeTasbihTask.targetCount} (المتبقي: {activeTasbihTask.targetCount - activeTasbihTask.currentCount})
                      </span>
                      <span className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 font-bold block mt-4 font-rtl animate-pulse">
                        انقر هنا للتسبيح
                      </span>
                    </div>
                  )}
                </motion.div>

                <div className="h-10 flex items-center justify-center shrink-0">
                  <button
                    onClick={handleResetTasbih}
                    disabled={activeTasbihTask.completed || activeTasbihTask.currentCount === 0}
                    className={clsx(
                      "px-3.5 py-1.5 bg-gray-50 hover:bg-gray-100 dark:bg-white/5 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 text-xs font-bold rounded-xl transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer duration-300",
                      (!activeTasbihTask.completed && activeTasbihTask.currentCount > 0)
                        ? "opacity-100 scale-100 pointer-events-auto"
                        : "opacity-0 scale-95 pointer-events-none"
                    )}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>تصفير العداد</span>
                  </button>
                </div>
              </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Postpone Confirmation Modal */}
      <AnimatePresence>
        {showPostponeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#1A1A1A] border border-[#1A2E1A]/10 dark:border-white/10 p-6 rounded-3xl max-w-sm w-full space-y-4 shadow-xl"
            >
              <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-2xl">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg dark:text-white">تأجيل مهام اليوم</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">زحزحة جميع المهام القادمة يوماً واحداً</p>
                </div>
              </div>

              <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-300 font-sans">
                هل ترغب في تأجيل مهام اليوم إلى الغد؟ 
                سوف يتم زحزحة جدول جميع الأيام التالية يوماً واحداً إلى الأمام (مهام اليوم تنتقل للغد، ومهام الغد لليوم الذي بعده...) دون حاجة للتعديل المباشر على الخطة.
              </p>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={handlePostponeTodayTasks}
                  disabled={isPostponing}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                >
                  {isPostponing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Clock className="w-4 h-4" />
                      <span>تأكيد التأجيل (زحزحة)</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowPostponeModal(false)}
                  disabled={isPostponing}
                  className="px-4 py-2.5 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 font-bold rounded-xl text-xs hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
