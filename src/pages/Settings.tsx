import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/database";
import { clearAllData, deletePlan } from "../db/dbSync";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { patchColorsForHtml2Canvas } from "../utils/html2canvasUtils";
import {
  Download,
  Trash2,
  Database,
  Sun,
  Moon,
  ShieldCheck,
  Share2,
  FileText,
  Loader2,
  Upload,
  AlertTriangle,
  Sliders,
  WifiOff,
  Wifi,
  FileSpreadsheet,
  Play,
  Pause,
  Square,
  HardDrive,
  Check,
  RefreshCw,
  Heart,
  Plus,
  Info,
  Sparkles,
  ChevronUp,
  ChevronDown,
  Calendar,
  Headphones,
  BookOpen,
  Printer,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { startOfDay, isAfter } from "date-fns";
import {
  getCachedPagesCount,
  getCachedAudiosCount,
  clearAllOfflineData,
  downloadPagesAndAudio,
  cancelActiveDownload,
  pauseDownload,
  resumeDownload,
  DownloadProgress,
  subscribeToDownload,
  globalDownloadState
} from "../utils/offlineCache";
import { motion, AnimatePresence } from "framer-motion";
import { getTasksForDate, JUZ_PAGES } from "../utils/planGenerator";
import { SURAH_METADATAList } from "../utils/quranPageMapping";
import { format, addDays, differenceInCalendarDays } from "date-fns";
import { ar } from "date-fns/locale";
import { useTheme } from "../context/ThemeContext";
import { usePreferences } from "../context/PreferencesContext";
import { Modal } from "../components/ui/Modal";
import { Link } from "react-router-dom";
import { useUserData } from "../context/UserDataProvider";
import { ImportPlanModal } from "../components/plan/ImportPlanModal";
import { ExportPlanModal } from "../components/plan/ExportPlanModal";
import {
  getHijriDate,
  getBaseHijriYearMonth,
  getHijriMonthNameAr,
} from "../utils/dateHelpers";

const CASTLES_THEMES = [
  {
    name: "القلعة الأولى",
    color: "#059669", // Emerald
    bgColor: "#edfdf6",
    textColor: "#064e3b",
    borderColor: "#059669",
    bannerBg: "#dbfdec",
  },
  {
    name: "القلعة الثانية",
    color: "#0284c7", // Ocean sky blue
    bgColor: "#f0f9ff",
    textColor: "#0c4a6e",
    borderColor: "#0284c7",
    bannerBg: "#e0f2fe",
  },
  {
    name: "القلعة الثالثة",
    color: "#d97706", // Amber gold
    bgColor: "#fffbeb",
    textColor: "#78350f",
    borderColor: "#d97706",
    bannerBg: "#fef3c7",
  },
  {
    name: "القلعة الرابعة",
    color: "#7c3aed", // Purple
    bgColor: "#faf5ff",
    textColor: "#4c1d95",
    borderColor: "#7c3aed",
    bannerBg: "#f3e8ff",
  },
  {
    name: "القلعة الخامسة",
    color: "#e11d48", // Rose crimson
    bgColor: "#fff1f2",
    textColor: "#881337",
    borderColor: "#e11d48",
    bannerBg: "#ffe4e6",
  },
  {
    name: "القلعة السادسة",
    color: "#0d9488", // Teal
    bgColor: "#f0fdfa",
    textColor: "#115e59",
    borderColor: "#0d9488",
    bannerBg: "#ccfbf1",
  },
  {
    name: "القلعة السابعة",
    color: "#4f46e5", // Indigo violet
    bgColor: "#f5f3ff",
    textColor: "#1e1b4b",
    borderColor: "#4f46e5",
    bannerBg: "#e0e7ff",
  },
];

function parseCustomTask(
  title: string,
): { action: string; portion: string } | null {
  const isOldReview =
    title.includes("القديم") || title.includes("المحفوظ القديم");
  const isCastleRev = title.includes("القلعة") || title.includes("قلعة");
  const isCumulative =
    title.includes("المقرر التراكمي") ||
    title.includes("المراجعة العميقة") ||
    title.includes("تراكمي");

  if (isOldReview || isCastleRev || isCumulative) {
    return null; // Keep as is
  }

  let action = "";
  let portion = "";

  // Check for colon first
  if (title.includes(":")) {
    const idx = title.indexOf(":");
    const prefix = title.substring(0, idx).trim();
    const remainder = title.substring(idx + 1).trim();

    if (prefix.includes("استماع") || prefix.includes("سمع")) {
      action = "🔲 استماع";
      portion = remainder;
    } else if (prefix.includes("حفظ")) {
      action = "🔲 حفظ";
      portion = remainder;
    } else if (prefix.includes("تثبيت")) {
      action = "🔲 تثبيت";
      portion = remainder;
    } else if (prefix.includes("تسميع")) {
      action = "🔲 تسميع";
      portion = remainder;
    } else if (prefix.includes("مراجعة")) {
      action = "🔲 مراجعة";
      portion = remainder;
    } else {
      portion = remainder;
      if (title.includes("استماع")) action = "🔲 استماع";
      else if (title.includes("حفظ")) action = "🔲 حفظ";
      else if (title.includes("تثبيت")) action = "🔲 تثبيت";
      else if (title.includes("تسميع")) action = "🔲 تسميع";
      else if (title.includes("مراجعة")) action = "🔲 مراجعة";
      else return null;
    }
  } else {
    // No colon
    if (title.startsWith("استماع")) {
      action = "🔲 استماع";
      portion = title
        .replace(/^استماع\s*(للقرآن|للجديد|المقدار الجديد|المقدار)?\s*/, "")
        .trim();
    } else if (title.startsWith("حفظ")) {
      action = "🔲 حفظ";
      portion = title
        .replace(/^حفظ\s*(الجديد|المقدار الجديد|المقدار)?\s*/, "")
        .trim();
    } else if (title.startsWith("تثبيت")) {
      action = "🔲 تثبيت";
      portion = title
        .replace(/^تثبيت\s*(المقدار الجديد|الجديد|المقدار)?\s*/, "")
        .trim();
    } else if (title.startsWith("تسميع")) {
      action = "🔲 تسميع";
      portion = title
        .replace(/^تسميع\s*(للجديد|المقدار الجديد|المقدار)?\s*/, "")
        .trim();
    } else if (title.startsWith("مراجعة")) {
      action = "🔲 مراجعة";
      portion = title
        .replace(
          /^مراجعة\s*(محفوظ الأسبوع الحالي|محفوظ الأسبوع|المقدار الجديد|الجديد|المقدار)?\s*/,
          "",
        )
        .trim();
    } else {
      return null;
    }
  }

  // Clean common redundant prefixes
  portion = portion.replace(/^صفحة\s+/, "ص ");
  portion = portion.replace(/^من صفحة\s+/, "من ص ");

  return { action, portion };
}

function getTaskColor(type: string): string {
  switch (type) {
    case "memorization":
      return "#059669";
    case "listening":
      return "#0284c7";
    case "fixation":
      return "#b45309";
    case "review":
      return "#be123c";
    case "cumulative_review":
      return "#0f766e";
    case "recitation":
      return "#4338ca";
    default:
      return "#4338ca";
  }
}

export default function Settings() {
  const { activePlan } = useUserData();
  const [selectedQari, setSelectedQari] = useState(() => {
    const stored = localStorage.getItem("quran_qari");
    if (stored === "Maher_Alwan_64kbps") {
      localStorage.setItem("quran_qari", "Muhammad_Ayyoub_128kbps");
      return "Muhammad_Ayyoub_128kbps";
    }
    return stored || "Minshawy_Murattal_128kbps";
  });
  const [playbackSpeed, setPlaybackSpeed] = useState(() => {
    return localStorage.getItem("quran_speed") || "1.0";
  });

  const handleQariChange = (qari: string) => {
    setSelectedQari(qari);
    localStorage.setItem("quran_qari", qari);
  };

  const handleSpeedChange = (speed: string) => {
    setPlaybackSpeed(speed);
    localStorage.setItem("quran_speed", speed);
  };

  const [isExportingClassic, setIsExportingClassic] = useState(false);
  const [exportProgressClassic, setExportProgressClassic] = useState("");
  const [isExportingCastle, setIsExportingCastle] = useState(false);
  const [exportProgressCastle, setExportProgressCastle] = useState("");
  const [isExportingBooklet, setIsExportingBooklet] = useState(false);
  const [exportProgressBooklet, setExportProgressBooklet] = useState("");
  const [isPrintingClassic, setIsPrintingClassic] = useState(false);
  const [isPrintingCastle, setIsPrintingCastle] = useState(false);
  const [isPrintingBooklet, setIsPrintingBooklet] = useState(false);
  const [shareModalConfig, setShareModalConfig] = useState<{
    isOpen: boolean;
    fileName: string;
    pdf: any;
  } | null>(null);
  const [showBookletModal, setShowBookletModal] = useState(false);
  const [showImportPlanModal, setShowImportPlanModal] = useState(false);
  const [showExportPlanModal, setShowExportPlanModal] = useState(false);

  // Booklet settings
  const [bookletPaperSize, setBookletPaperSize] = useState<"a4_to_a5" | "a3_to_a4" | "letter" | "legal">("a4_to_a5");
  const [bookletGutter, setBookletGutter] = useState<number>(10); // in mm
  const [bookletOuterMargin, setBookletOuterMargin] = useState<number>(5); // in mm
  const [bookletActiveTab, setBookletActiveTab] = useState<"settings" | "instructions">("settings");
  const [bookletLayoutPattern, setBookletLayoutPattern] = useState<"classic" | "castle">("classic");

  const getBookletPageCount = () => {
    if (!activePlan) return { original: 0, padded: 0, total: 0, sheets: 0 };
    const fullData = generateFullPlan();
    const chunks: any[][] = [];
    let currentWeek: any[] = [];
    const endOfWeekDay = ((activePlan.firstDayOfWeek || 0) + 6) % 7;

    fullData.forEach((day: any) => {
      currentWeek.push(day);
      const dateObj = new Date(day.date);
      if (dateObj.getDay() === endOfWeekDay) {
        chunks.push(currentWeek);
        currentWeek = [];
      }
    });
    if (currentWeek.length > 0) {
      chunks.push(currentWeek);
    }
    const original = 1 + chunks.length; // Cover + weeks
    const remainder = original % 4;
    const padded = remainder === 0 ? 0 : 4 - remainder;
    const total = original + padded;
    const sheets = total / 4;
    return { original, padded, total, sheets };
  };
  const [isClearing, setIsClearing] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [showDeletePlanModal, setShowDeletePlanModal] = useState(false);
  const [showDeleteAllAdhkarModal, setShowDeleteAllAdhkarModal] =
    useState(false);
  const [dhikrToDeleteIndex, setDhikrToDeleteIndex] = useState<number | null>(
    null,
  );
  const [isDeletingPlan, setIsDeletingPlan] = useState(false);
  const { themeMode, setThemeMode, isDarkMode, toggleTheme } = useTheme();

  const baseYearMonth = getBaseHijriYearMonth(new Date());
  const currentHijriYear = baseYearMonth.year;
  const [currentYearView, setCurrentYearView] =
    useState<number>(currentHijriYear);
  const [selectedMonthToAdjust, setSelectedMonthToAdjust] = useState<number>(
    baseYearMonth.month,
  );
  const [offsets, setOffsets] = useState<Record<string, number>>(() => {
    try {
      const stored = localStorage.getItem("hijriOffsets");
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const handleUpdateOffset = (year: number, month: number, value: number) => {
    const updated = { ...offsets };
    const key = `${year}-${month}`;
    if (value === 0) {
      delete updated[key];
    } else {
      updated[key] = value;
    }
    setOffsets(updated);
    localStorage.setItem("hijriOffsets", JSON.stringify(updated));
  };

  const { preferences, updatePreferences } = usePreferences();
  const globalAdhkarEnabled = preferences.globalAdhkarEnabled;
  const globalAdhkarList = preferences.globalAdhkarList;

  const handleToggleGlobalAdhkar = async (enabled: boolean) => {
    await updatePreferences({ globalAdhkarEnabled: enabled });
  };

  const handleUpdateAdhkarList = async (
    newList: { dhikr: string; count: number }[],
  ) => {
    await updatePreferences({ globalAdhkarList: newList });
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newList = [...globalAdhkarList];
    const temp = newList[index];
    newList[index] = newList[index - 1];
    newList[index - 1] = temp;
    handleUpdateAdhkarList(newList);
  };

  const handleMoveDown = (index: number) => {
    if (index === globalAdhkarList.length - 1) return;
    const newList = [...globalAdhkarList];
    const temp = newList[index];
    newList[index] = newList[index + 1];
    newList[index + 1] = temp;
    handleUpdateAdhkarList(newList);
  };

  // Offline caching / downloading states
  const [cachedPagesCount, setCachedPagesCount] = useState(0);
  const [cachedAudiosCount, setCachedAudiosCount] = useState(0);
  const [downloadOption, setDownloadOption] = useState<
    "plan" | "juz" | "custom"
  >("plan");
  const [selectedJuz, setSelectedJuz] = useState(30);
  const [customStartPage, setCustomStartPage] = useState(1);
  const [customEndPage, setCustomEndPage] = useState(604);
  const [includeAudio, setIncludeAudio] = useState(true);
  const [downloadState, setDownloadState] = useState<DownloadProgress>(globalDownloadState);

  useEffect(() => {
    return subscribeToDownload((state) => {
      setDownloadState(state);
      if (state.currentPage === state.totalPages && !state.isDownloading && state.totalPages > 0) {
        updateCacheCounts();
      }
    });
  }, []);

  const updateCacheCounts = async () => {
    const pCount = await getCachedPagesCount();
    const aCount = await getCachedAudiosCount();
    setCachedPagesCount(pCount);
    setCachedAudiosCount(aCount);
  };

  useEffect(() => {
    updateCacheCounts();
  }, []);

  useEffect(() => {
    const importPreviousAdhkar = async () => {
      const alreadyImported =
        localStorage.getItem("global_adhkar_imported_from_plan") === "true";
      if (alreadyImported) return;

      if (activePlan?.adhkarList && activePlan.adhkarList.length > 0) {
        handleUpdateAdhkarList(activePlan.adhkarList);
        localStorage.setItem("global_adhkar_imported_from_plan", "true");
        handleToggleGlobalAdhkar(true);
        return;
      }

      try {
        const allPlans = await db.plans.toArray();
        const planWithAdhkar = allPlans.find(
          (p) => p.adhkarList && p.adhkarList.length > 0,
        );
        if (
          planWithAdhkar?.adhkarList &&
          planWithAdhkar.adhkarList.length > 0
        ) {
          handleUpdateAdhkarList(planWithAdhkar.adhkarList);
          localStorage.setItem("global_adhkar_imported_from_plan", "true");
          handleToggleGlobalAdhkar(true);
        }
      } catch (err) {
        console.error("Error importing previous adhkar:", err);
      }
    };

    importPreviousAdhkar();
  }, [activePlan]);

  const handleStartDownload = async () => {
    const pagesToDownload: number[] = [];

    if (downloadOption === "plan") {
      if (!activePlan) {
        // alert removed
        return;
      }
      const start = Math.min(activePlan.startPage, activePlan.endPage);
      const end = Math.max(activePlan.startPage, activePlan.endPage);
      for (let p = start; p <= end; p++) {
        pagesToDownload.push(p);
      }
    } else if (downloadOption === "juz") {
      const JUZ_PAGES: Record<number, { start: number; end: number }> = {
        1: { start: 2, end: 21 },
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
      const range = JUZ_PAGES[selectedJuz];
      if (range) {
        for (let p = range.start; p <= range.end; p++) {
          pagesToDownload.push(p);
        }
      }
    } else if (downloadOption === "quran") {
      for (let p = 1; p <= 604; p++) {
        pagesToDownload.push(p);
      }
    } else {
      const start = Math.max(2, Math.min(customStartPage, customEndPage));
      const end = Math.min(604, Math.max(customStartPage, customEndPage));
      for (let p = start; p <= end; p++) {
        pagesToDownload.push(p);
      }
    }

    if (pagesToDownload.length === 0) {
      // alert removed
      return;
    }

    const { getUncachedPages } = await import('../utils/offlineCache');
    const uncached = await getUncachedPages(includeAudio);
    
    // Filter to only what needs to be downloaded
    const finalPages = pagesToDownload.filter(p => uncached.includes(p));

    if (finalPages.length === 0) {
      alert("هذا المحتوى متاح حالياً بالكامل للاستخدام بدون إنترنت.");
      return;
    }

    await downloadPagesAndAudio(finalPages, includeAudio);
  };

  const handleClearOffline = async () => {
    if (
      confirm(
        "هل أنت متأكد من رغبتك في حذف جميع المحتويات المنزلة للاستخدام بدون إنترنت؟",
      )
    ) {
      await clearAllOfflineData();
      await updateCacheCounts();
    }
  };

  const generateFullPlan = () => {
    if (!activePlan) return [];

    const planTasks = [];
    let currentDate = new Date(activePlan.startDate);
    let iterations = 0;
    const maxSafety = 1000;
    let juzFinished = false;

    if (activePlan.planType === "review") {
      while (iterations < maxSafety) {
        const tasks = getTasksForDate(currentDate, activePlan, []);

        if (tasks.length === 0) {
          break;
        }

        planTasks.push({
          date: new Date(currentDate),
          tasks: tasks,
        });

        currentDate = addDays(currentDate, 1);
        iterations++;
      }
    } else if (activePlan.isSevenCastles) {
      // The Seven Castles plan consists of exactly 42 memorization days
      // distributed across 11 weeks (77 days). Loop exactly 77 days.
      for (let day = 0; day < 77; day++) {
        const tasks = getTasksForDate(currentDate, activePlan, []);
        planTasks.push({
          date: new Date(currentDate),
          tasks: tasks,
        });
        currentDate = addDays(currentDate, 1);
      }
    } else {
      const targetEndPage =
        activePlan.memorizationTargetPages &&
        activePlan.memorizationTargetPages.length > 0
          ? !!activePlan.isSevenCastlesDescending ||
            activePlan.startPage > activePlan.endPage
            ? Math.min(...activePlan.memorizationTargetPages)
            : Math.max(...activePlan.memorizationTargetPages)
          : Number(activePlan.endPage);

      const isDescending =
        !!activePlan.isSevenCastlesDescending ||
        activePlan.startPage > activePlan.endPage;

      while (iterations < maxSafety) {
        const tasks = getTasksForDate(currentDate, activePlan, []);
        const d = currentDate.getDay(); // 0 (Sun) to 6 (Sat)

        if (
          d === (activePlan.firstDayOfWeek || 0) &&
          juzFinished &&
          !activePlan.isFlexible
        ) {
          break;
        }

        // Only break if layout is empty AND we actually finished the entire plan
        if (tasks.length === 0 && !activePlan.isFlexible && juzFinished) {
          break;
        }

        // Check duration limit for flexible plans
        if (activePlan.isFlexible) {
          const startDate = startOfDay(new Date(activePlan.startDate));
          const targetDate = startOfDay(currentDate);

          if (
            activePlan.flexibleDurationMode === "weeks" &&
            activePlan.flexibleDurationWeeks
          ) {
            const totalDays = activePlan.flexibleDurationWeeks * 7;
            const lastDayOfPlan = addDays(startDate, totalDays - 1);
            if (isAfter(targetDate, lastDayOfPlan)) break;
          } else if (
            activePlan.flexibleDurationMode === "range" &&
            activePlan.flexibleEndDate
          ) {
            const lastDayOfPlan = startOfDay(
              new Date(activePlan.flexibleEndDate),
            );
            if (isAfter(targetDate, lastDayOfPlan)) break;
          }
        }

        planTasks.push({
          date: new Date(currentDate),
          tasks: tasks,
        });

        const memTask = tasks.find((t) => t.type === "memorization");
        if (memTask && memTask.pages && memTask.pages.length > 0) {
          const reachedEnd = isDescending
            ? Math.min(...memTask.pages) <= targetEndPage
            : Math.max(...memTask.pages) >= targetEndPage;
          if (reachedEnd) {
            juzFinished = true;
          }
        }

        currentDate = addDays(currentDate, 1);
        iterations++;
      }
    }

    return planTasks;
  };

  const exportPDF = async (
    isCastleTowerStyle: boolean = false,
    action: "download" | "print" | "share" | boolean = "download"
  ) => {
    if (!activePlan) return;

    const mode: "download" | "print" | "share" =
      typeof action === "boolean" ? (action ? "print" : "download") : action;

    const setIsExporting = isCastleTowerStyle
      ? setIsExportingCastle
      : setIsExportingClassic;
    const setExportProgress = isCastleTowerStyle
      ? setExportProgressCastle
      : setExportProgressClassic;
    const setIsPrinting = isCastleTowerStyle
      ? setIsPrintingCastle
      : setIsPrintingClassic;

    setIsExporting(true);
    if (mode === "print") {
      setIsPrinting(true);
    }
    setExportProgress("جاري تحضير خطة الحفظ لمستند PDF...");

    // Allow React state updates to render in the browser immediately to provide instant visual feedback
    await new Promise((resolve) => setTimeout(resolve, 100));

    const getCastleIndexFromTaskTitle = (title: string): number | null => {
      if (title.includes("القلعة الأولى") || title.includes("القلعة 1"))
        return 0;
      if (title.includes("القلعة الثانية") || title.includes("القلعة 2"))
        return 1;
      if (title.includes("القلعة الثالثة") || title.includes("القلعة 3"))
        return 2;
      if (title.includes("القلعة الرابعة") || title.includes("القلعة 4"))
        return 3;
      if (title.includes("القلعة الخامسة") || title.includes("القلعة 5"))
        return 4;
      if (title.includes("القلعة السادسة") || title.includes("القلعة 6"))
        return 5;
      if (title.includes("القلعة السابعة") || title.includes("القلعة 7"))
        return 6;
      return null;
    };

    const getArabicDayName = (date: Date): string => {
      const days = [
        "الأحد",
        "الإثنين",
        "الثلاثاء",
        "الأربعاء",
        "الخميس",
        "الجمعة",
        "السبت",
      ];
      return days[date.getDay()];
    };

    const getCastleIdxForDate = (date: Date) => {
      const planStart = new Date(activePlan.startDate);
      planStart.setHours(0, 0, 0, 0);
      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);

      const daysDiff = differenceInCalendarDays(targetDate, planStart);
      if (daysDiff < 0) return 0;

      const weekIdx = Math.floor(daysDiff / 7);
      const d_week =
        (targetDate.getDay() - (activePlan.firstDayOfWeek || 0) + 7) % 7;

      let memDay = 1;
      if (d_week === 0) {
        memDay = weekIdx * 4 + 1;
      } else if (d_week === 1) {
        memDay = weekIdx * 4 + 2;
      } else if (d_week === 2) {
        memDay = weekIdx * 4 + 1; // Align with Day 1 & 2
      } else if (d_week === 3) {
        memDay = weekIdx * 4 + 3;
      } else if (d_week === 4) {
        memDay = weekIdx * 4 + 4;
      } else if (d_week === 5) {
        memDay = weekIdx * 4 + 3; // Align with Day 3 & 4
      } else if (d_week === 6) {
        memDay = weekIdx * 4 + 4; // Align with Day 4
      }

      const castleIdx = Math.floor((memDay - 1) / 6);
      return Math.min(Math.max(castleIdx, 0), 6);
    };

    try {
      const fullData = generateFullPlan();
      const chunks: any[][] = [];
      let currentWeek: any[] = [];

      const endOfWeekDay = ((activePlan.firstDayOfWeek || 0) + 6) % 7;

      // Group by weeks ending on the day before firstDayOfWeek
      fullData.forEach((day: any) => {
        currentWeek.push(day);
        if (day.date.getDay() === endOfWeekDay) {
          chunks.push(currentWeek);
          currentWeek = [];
        }
      });

      if (currentWeek.length > 0) {
        chunks.push(currentWeek);
      }

      const pdf = isCastleTowerStyle
        ? new jsPDF("l", "mm", "a4")
        : new jsPDF("p", "mm", "a4");

      const tempContainer = document.createElement("div");
      tempContainer.style.position = "fixed";
      tempContainer.style.left = "0";
      tempContainer.style.top = "0";
      tempContainer.style.width = isCastleTowerStyle ? "1123px" : "794px";
      tempContainer.style.height = "auto";
      tempContainer.style.overflow = "visible";
      tempContainer.style.zIndex = "-9999";
      tempContainer.style.pointerEvents = "none";
      tempContainer.dir = "rtl";
      document.body.appendChild(tempContainer);

      // Add dynamic styles to force the Cairo font and normal letter-spacing for perfect Arabic rendering
      const tempStyle = document.createElement("style");
      tempStyle.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');
        * {
          font-family: 'Cairo', sans-serif !important;
          letter-spacing: normal !important;
          word-spacing: normal !important;
          -webkit-font-smoothing: antialiased !important;
          -moz-osx-font-smoothing: grayscale !important;
          text-rendering: optimizeLegibility !important;
        }
      `;
      tempContainer.appendChild(tempStyle);

      // Await all typography loading to guarantee connected Arabic letters inside canvas export
      try {
        if ("fonts" in document) {
          await document.fonts.ready;
        }
      } catch (fontErr) {
        console.warn("Failed waiting for page fonts to load", fontErr);
      }

      // Concurrently create and mount all separate page containers onto the DOM first
      const pageElements: HTMLDivElement[] = [];

      // --- CREATE COVER PAGE ---
      const getJuzForPage = (p: number): number => {
        for (let j = 1; j <= 30; j++) {
          const range = JUZ_PAGES[j];
          if (range && p >= range.start && p <= range.end) {
            return j;
          }
        }
        return 1;
      };

      const getJuzsFromPages = (pages: number[]): number[] => {
        if (!pages || pages.length === 0) return [];
        const juzs = new Set<number>();
        pages.forEach(p => {
          const juz = getJuzForPage(p);
          juzs.add(juz);
        });
        return Array.from(juzs).sort((a, b) => a - b);
      };

      let planTypeName = "خطة حفظ القرآن الكريم";
      if (activePlan.isSevenCastles) {
        planTypeName = "خطة القلاع السبع للتمكين";
      } else if (activePlan.planType === "review") {
        planTypeName = "خطة مراجعة وتثبيت";
      } else if (activePlan.planType === "juz") {
        planTypeName = "خطة حفظ الأجزاء";
      } else if (activePlan.planType === "flexible") {
        planTypeName = "خطة الحفظ المرنة";
      }

      const startJuzNum = activePlan.juzNumber || getJuzForPage(activePlan.startPage || 1);
      const newMemText = activePlan.planType === 'review' ? 'لا يوجد (خطة مراجعة فقط)' : `يبدأ من جزء ${startJuzNum}`;

      let oldMemText = "لا يوجد";
      if (activePlan.planType === 'review') {
        if (activePlan.isSpecificReview) {
          if (activePlan.selectedReviewSurahs && activePlan.selectedReviewSurahs.length > 0) {
            oldMemText = `السور: ${activePlan.selectedReviewSurahs.join('، ')}`;
          } else if (activePlan.selectedReviewJuzs && activePlan.selectedReviewJuzs.length > 0) {
            oldMemText = `الأجزاء: ${activePlan.selectedReviewJuzs.sort((a, b) => a - b).join('، ')}`;
          } else {
            oldMemText = "مراجعة مخصصة";
          }
        } else {
          oldMemText = "كامل القرآن الكريم";
        }
      } else if (activePlan.hasOldMemorization && activePlan.oldMemorizedPages && activePlan.oldMemorizedPages.length > 0) {
        if (activePlan.oldMemType === 'surah' && activePlan.oldMemSurahs && activePlan.oldMemSurahs.length > 0) {
          oldMemText = `السور: ${activePlan.oldMemSurahs.join('، ')}`;
        } else {
          const juzs = getJuzsFromPages(activePlan.oldMemorizedPages);
          oldMemText = `الأجزاء: ${juzs.join('، ')}`;
        }
      }

      const planWeeks = chunks.length;
      const formatWeeksArabic = (weeks: number): string => {
        if (weeks === 1) return "أسبوع واحد";
        if (weeks === 2) return "أسبوعان";
        if (weeks >= 3 && weeks <= 10) return `${weeks} أسابيع`;
        return `${weeks} أسبوعاً`;
      };
      const durationText = formatWeeksArabic(planWeeks);

      const startDateStr = format(new Date(fullData[0].date), "yyyy/MM/dd");
      const endDateStr = format(new Date(fullData[fullData.length - 1].date), "yyyy/MM/dd");
      const startHijriStr = getHijriDate(new Date(fullData[0].date));
      const endHijriStr = getHijriDate(new Date(fullData[fullData.length - 1].date));

      const coverEl = document.createElement("div");
      coverEl.style.width = isCastleTowerStyle ? "1123px" : "794px";
      coverEl.style.boxSizing = "border-box";
      coverEl.style.marginBottom = "30px";

      if (isCastleTowerStyle) {
        coverEl.innerHTML = `
          <div style="padding: 60px 80px; background: #FFFDF9; width: 1123px; min-height: 794px; box-sizing: border-box; font-family: 'Cairo', sans-serif; display: flex; flex-direction: column; justify-content: space-between; direction: rtl; position: relative; border: 12px double #1A2E1A; text-align: center;">
            <div style="font-size: 24px; color: #D4AF37; margin-bottom: 10px;">❖ ═══════════ ❖ ═══════════ ❖</div>
            
            <div style="flex-grow: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 30px;">
              <div style="display: flex; justify-content: center; align-items: center; width: 100px; height: 100px; background: #ffffff; border-radius: 20px; border: 2px solid #1A2E1A20; overflow: visible; padding: 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
                <img src="/app_icon_v6.png" style="width: 100%; height: 100%; object-fit: contain; border-radius: 12px;" alt="شعار التطبيق" />
              </div>

              <div>
                <h1 style="font-size: 38px; font-weight: 900; color: #1A2E1A; margin: 0; line-height: 1.3;">${planTypeName}</h1>
                <p style="font-size: 18px; color: #D4AF37; font-weight: bold; margin-top: 10px; margin-bottom: 0;">برنامج التمكين المتكامل لحفظ القرآن الكريم وتثبيته</p>
              </div>

              <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; width: 80%; max-width: 800px; margin-top: 10px; background: #ffffff; border: 2px solid #1A2E1A15; padding: 30px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.02);">
                <div style="display: flex; align-items: center; gap: 12px; text-align: right; border-bottom: 1px dashed #1A2E1A20; padding-bottom: 15px;">
                  <span style="font-size: 24px;">🌱</span>
                  <div>
                    <div style="font-size: 13px; color: #666; font-weight: bold;">الحفظ الجديد</div>
                    <div style="font-size: 16px; color: #1A2E1A; font-weight: 800; margin-top: 3px;">${newMemText}</div>
                  </div>
                </div>

                <div style="display: flex; align-items: center; gap: 12px; text-align: right; border-bottom: 1px dashed #1A2E1A20; padding-bottom: 15px;">
                  <span style="font-size: 24px;">📖</span>
                  <div>
                    <div style="font-size: 13px; color: #666; font-weight: bold;">الحفظ القديم / المراجعة</div>
                    <div style="font-size: 16px; color: #1A2E1A; font-weight: 800; margin-top: 3px; max-width: 320px; overflow: visible; text-overflow: ellipsis; white-space: nowrap;" title="${oldMemText}">${oldMemText}</div>
                  </div>
                </div>

                <div style="display: flex; align-items: center; gap: 12px; text-align: right; padding-top: 5px;">
                  <span style="font-size: 24px;">⏳</span>
                  <div>
                    <div style="font-size: 13px; color: #666; font-weight: bold;">مدة الخطة</div>
                    <div style="font-size: 16px; color: #1A2E1A; font-weight: 800; margin-top: 3px;">${durationText}</div>
                  </div>
                </div>

                <div style="display: flex; align-items: center; gap: 12px; text-align: right; padding-top: 5px;">
                  <span style="font-size: 24px;">📅</span>
                  <div>
                    <div style="font-size: 13px; color: #666; font-weight: bold;">الفترة الزمنية</div>
                    <div style="font-size: 14px; color: #1A2E1A; font-weight: 800; margin-top: 3px; line-height: 1.4;">
                      البداية: ${startHijriStr} (${startDateStr} م)<br/>
                      النهاية: ${endHijriStr} (${endDateStr} م)
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div style="margin-top: 20px;">
              <div style="font-size: 24px; color: #D4AF37; margin-bottom: 10px;">❖ ═══════════ ❖ ═══════════ ❖</div>
              <p style="font-size: 12px; color: #888; margin: 0;">تم استخراج هذه الخطة بواسطة "خطة الحفظ الذكية" - ${new Date().toLocaleDateString("ar-EG")}</p>
            </div>
          </div>
        `;
      } else {
        coverEl.innerHTML = `
          <div style="padding: 80px 60px; background: #FDFBF7; width: 794px; min-height: 1123px; box-sizing: border-box; font-family: 'Cairo', sans-serif; display: flex; flex-direction: column; justify-content: space-between; direction: rtl; position: relative; border: 4px solid #1A2E1A; text-align: center;">
            <div style="position: absolute; top: 15px; bottom: 15px; left: 15px; right: 15px; border: 1px solid #D4AF37; pointer-events: none;"></div>
            <div style="font-size: 22px; color: #D4AF37; margin-top: 20px; margin-bottom: 10px;">❖ ══════════ ❖ ══════════ ❖</div>
            
            <div style="flex-grow: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 40px; margin-top: 20px; margin-bottom: 20px;">
              <div style="display: flex; justify-content: center; align-items: center; width: 100px; height: 100px; background: #ffffff; border-radius: 20px; border: 2px solid #1A2E1A20; overflow: visible; padding: 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
                <img src="/app_icon_v6.png" style="width: 100%; height: 100%; object-fit: contain; border-radius: 12px;" alt="شعار التطبيق" />
              </div>

              <div>
                <h1 style="font-size: 34px; font-weight: 900; color: #1A2E1A; margin: 0; line-height: 1.4;">${planTypeName}</h1>
                <p style="font-size: 16px; color: #D4AF37; font-weight: bold; margin-top: 12px; margin-bottom: 0; letter-spacing: 0.5px;">البرنامج المنهجي المنظم لتلاوة وحفظ القرآن الكريم</p>
              </div>

              <div style="display: flex; flex-direction: column; gap: 18px; width: 85%; margin-top: 10px; background: #ffffff; border: 1.5px solid #1A2E1A15; padding: 35px 25px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.01);">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px dashed #E5E7EB; padding-bottom: 12px;">
                  <span style="font-size: 15px; color: #555; font-weight: bold;">❖ نوع البرنامج المنهجي:</span>
                  <span style="font-size: 16px; color: #1A2E1A; font-weight: 800;">${planTypeName}</span>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px dashed #E5E7EB; padding-bottom: 12px;">
                  <span style="font-size: 15px; color: #555; font-weight: bold;">🌱 مقرر الحفظ الجديد:</span>
                  <span style="font-size: 16px; color: #1A2E1A; font-weight: 800;">${newMemText}</span>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1.5px dashed #E5E7EB; padding-bottom: 12px;">
                  <span style="font-size: 15px; color: #555; font-weight: bold; white-space: nowrap; margin-left: 15px;">📖 مقرر الحفظ القديم / المراجعة:</span>
                  <span style="font-size: 15px; color: #1A2E1A; font-weight: 800; text-align: left; max-width: 250px; line-height: 1.4; overflow-wrap: break-word;">${oldMemText}</span>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px dashed #E5E7EB; padding-bottom: 12px;">
                  <span style="font-size: 15px; color: #555; font-weight: bold;">⏳ مدة البرنامج المنهجي:</span>
                  <span style="font-size: 16px; color: #1A2E1A; font-weight: 800;">${durationText}</span>
                </div>

                <div style="display: flex; flex-direction: column; gap: 8px; align-items: flex-start; padding-top: 5px; text-align: right;">
                  <span style="font-size: 15px; color: #555; font-weight: bold; margin-bottom: 4px;">📅 الفترة الزمنية المخصصة:</span>
                  <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; font-size: 14.5px; color: #1A2E1A; font-weight: 800; padding-right: 15px;">
                    <span>• تاريخ البدء: ${startHijriStr}</span>
                    <span style="font-size: 12px; color: #b45309;">(${startDateStr} م)</span>
                  </div>
                  <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; font-size: 14.5px; color: #1A2E1A; font-weight: 800; padding-right: 15px; margin-top: 2px;">
                    <span>• تاريخ الانتهاء: ${endHijriStr}</span>
                    <span style="font-size: 12px; color: #b45309;">(${endDateStr} م)</span>
                  </div>
                </div>
              </div>
            </div>

            <div style="margin-bottom: 20px;">
              <div style="font-size: 22px; color: #D4AF37; margin-bottom: 10px;">❖ ══════════ ❖ ══════════ ❖</div>
              <p style="font-size: 12.5px; color: #777; margin: 0; font-weight: 500;">تم استخراج هذه الخطة بواسطة "خطة الحفظ الذكية" - ${new Date().toLocaleDateString("ar-EG")}</p>
            </div>
          </div>
        `;
      }

      tempContainer.appendChild(coverEl);
      pageElements.push(coverEl);

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const pageEl = document.createElement("div");
        pageEl.style.width = isCastleTowerStyle ? "1123px" : "794px";
        pageEl.style.boxSizing = "border-box";
        pageEl.style.marginBottom = "30px";

        if (isCastleTowerStyle) {
          const overallCastleIdx = getCastleIdxForDate(chunk[0].date);
          const castleTheme = CASTLES_THEMES[overallCastleIdx];

          const weekStartCastleIdx = getCastleIdxForDate(chunk[0].date);
          const weekEndCastleIdx = getCastleIdxForDate(
            chunk[chunk.length - 1].date,
          );
          let castleBannerLabel = CASTLES_THEMES[weekStartCastleIdx].name;
          if (weekStartCastleIdx !== weekEndCastleIdx) {
            castleBannerLabel = `${CASTLES_THEMES[weekStartCastleIdx].name} و ${CASTLES_THEMES[weekEndCastleIdx].name}`;
          }

          pageEl.innerHTML = `
            <div style="padding: 25px 35px; background: #FFFDF9; width: 1123px; min-height: 794px; box-sizing: border-box; font-family: 'Cairo', sans-serif; display: flex; flex-direction: column; justify-content: space-between; direction: rtl; position: relative; border: 8px double ${castleTheme.color};">
              <div style="display: flex; justify-content: space-between; align-items: center; height: 75px; border-bottom: 2px solid ${castleTheme.color}; padding-bottom: 10px;">
                <div style="display: flex; align-items: center; gap: 15px;">
                  <!-- Castle Icon -->
                  <svg style="width: 45px; height: 45px; fill: ${castleTheme.color};" viewBox="0 0 24 24">
                     <path d="M2,22V10l3-3v3h2V6l3-3v3h4V3l3 3v3h2V7l3 3v12H2 M20,20v-8h-2v3h-2v-3h-4v4h-2v-4H6v3H4v-3H2v8H20z" />
                  </svg>
                  <div style="text-align: right;">
                    <h1 style="font-size: 23px; font-weight: 900; color: ${castleTheme.textColor}; margin: 0; font-family: 'Cairo', sans-serif; line-height: 1.2;">منظومة القلاع السبع لحفظ القرآن وتثبيته</h1>
                    <div style="font-size: 12px; font-weight: bold; color: ${castleTheme.color}; margin-top: 1px; font-family: 'Cairo', sans-serif;">أسلوب التمكين بالبناء التراكمي المتقن</div>
                  </div>
                </div>
                <div style="text-align: left; display: flex; flex-direction: column; align-items: flex-end; gap: 3px;">
                  <div style="background: ${castleTheme.bannerBg}; border: 1px solid ${castleTheme.color}; color: ${castleTheme.textColor}; font-weight: 800; font-size: 13px; padding: 5px 14px; border-radius: 30px; font-family: 'Cairo', sans-serif;">
                     ${castleBannerLabel} | الأسبوع رقم ${i + 1}
                  </div>
                  <div style="font-size: 11px; color: #777; font-weight: 700; font-family: 'Cairo', sans-serif; margin-left: 5px;">
                     صفحة برنامج التمكين المتكامل
                  </div>
                </div>
              </div>

              <!-- Columns Wrapper of 7 Days -->
              <div style="display: flex; gap: 12px; justify-content: space-between; align-items: stretch; width: 100%; margin-top: 15px; flex-grow: 1; height: 580px; box-sizing: border-box;">
                ${chunk
                  .map((day) => {
                    const dayName = getArabicDayName(day.date);
                    const dayDateStr = format(day.date, "yyyy/MM/dd");
                    const hijriDateStr = getHijriDate(day.date);

                    const dayCastleIdx = getCastleIdxForDate(day.date);
                    const dayCastleTheme = CASTLES_THEMES[dayCastleIdx];

                    return `
                    <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: flex-end; position: relative; height: 100%; box-sizing: border-box;">
                      <!-- Triangle Tower Roof -->
                      <div style="width: 100%; height: 32px; position: relative; display: block; overflow: visible; margin-bottom: -1px; z-index: 2;">
                        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style="width: 100%; height: 100%; display: block;">
                          <polygon points="50,0 0,100 100,100" fill="${dayCastleTheme.color}" />
                        </svg>
                      </div>
                      
                      <!-- Rectangular Tower Body -->
                      <div style="flex-grow: 1; border: 3px solid ${dayCastleTheme.color}; background: #FFFFFF; border-radius: 0 0 16px 16px; padding: 12px 7px; display: flex; flex-direction: column; justify-content: space-between; text-align: center; box-shadow: 0 4px 10px rgba(0,0,0,0.03); z-index: 1; min-height: 480px; box-sizing: border-box;">
                        
                        <!-- List of Tasks (Aligned Horizontally) -->
                        <div style="display: flex; flex-direction: column; gap: 6px; flex-grow: 1; justify-content: flex-start; overflow: visible;">
                          ${(() => {
                            const d_week =
                              (day.date.getDay() -
                                (activePlan.firstDayOfWeek || 0) +
                                7) %
                              7;
                            const slots = [null, null, null, null, null] as (
                              any | null
                            )[];

                            if (day.tasks && day.tasks.length > 0) {
                              day.tasks.forEach((t: any) => {
                                const title = t.title || "";
                                const type = t.type || "";

                                const isListening = title.includes("استماع");
                                const isMemorization = title.includes("حفظ");
                                const isFixation = title.includes("تثبيت");
                                const isOldReview =
                                  title.includes("المحفوظ القديم") ||
                                  title.includes("القديم");
                                const isCastleRev =
                                  getCastleIndexFromTaskTitle(title) !== null ||
                                  title.includes("القلعة");
                                const isRecitation = title.includes("تسميع");
                                const isReviewWeek =
                                  title.includes("مراجعة محفوظ الأسبوع") ||
                                  (type === "review" &&
                                    !isCastleRev &&
                                    !isOldReview);

                                if (
                                  d_week === 0 ||
                                  d_week === 1 ||
                                  d_week === 3 ||
                                  d_week === 4
                                ) {
                                  if (isListening) slots[0] = t;
                                  else if (isMemorization) slots[1] = t;
                                  else if (isFixation) slots[2] = t;
                                  else if (isOldReview) slots[3] = t;
                                  else if (isCastleRev) slots[4] = t;
                                } else if (d_week === 2 || d_week === 5) {
                                  if (isFixation) slots[0] = t;
                                  else if (isRecitation) slots[1] = t;
                                  else if (isOldReview) slots[3] = t;
                                  else if (isCastleRev) slots[4] = t;
                                } else if (d_week === 6) {
                                  if (isReviewWeek) slots[0] = t;
                                  else if (isRecitation) slots[1] = t;
                                  else if (isOldReview) slots[3] = t;
                                  else if (isCastleRev) slots[4] = t;
                                }
                              });

                              // Safeguard fallback: place any task that wasn't matched into the first empty slot
                              day.tasks.forEach((t) => {
                                const alreadyAssigned = slots.some(
                                  (s) => s && s.id === t.id,
                                );
                                if (!alreadyAssigned) {
                                  const emptyIdx = slots.indexOf(null);
                                  if (emptyIdx !== -1) {
                                    slots[emptyIdx] = t;
                                  }
                                }
                              });
                            }

                            // Render the 5 slots
                            if (!day.tasks || day.tasks.length === 0) {
                              // Day of rest
                              return `
                              <div style="flex: 1; border: 1px dashed rgba(0,0,0,0.02); border-radius: 8px; box-sizing: border-box; background: transparent;"></div>
                              <div style="flex: 1; padding: 4px 6px; border-radius: 8px; font-size: 9px; font-weight: bold; background: #94a3b812; border: 1px dashed #94a3b830; text-align: center; color: #64748b; line-height: 1.4; font-family: 'Cairo', sans-serif; display: flex; flex-direction: column; justify-content: center; box-sizing: border-box; min-height: 90px;">
                                 <div style="font-size: 13px; margin-bottom: 2px;">🌸</div>
                                 <div>يوم مراجعة حرة</div>
                              </div>
                              <div style="flex: 1; border: 1px dashed rgba(0,0,0,0.02); border-radius: 8px; box-sizing: border-box; background: transparent; min-height: 90px;"></div>
                              <div style="flex: 1; border: 1px dashed rgba(0,0,0,0.02); border-radius: 8px; box-sizing: border-box; background: transparent; min-height: 90px;"></div>
                              <div style="flex: 1; border: 1px dashed rgba(0,0,0,0.02); border-radius: 8px; box-sizing: border-box; background: transparent; min-height: 90px;"></div>
                            `;
                            }

                            // Group logic for New Memorization & Consolidation
                            const isThreeGroup =
                              d_week === 0 ||
                              d_week === 1 ||
                              d_week === 3 ||
                              d_week === 4;
                            const groupedSlots = isThreeGroup
                              ? [slots[0], slots[1], slots[2]]
                              : [slots[0], slots[1]];
                            const hasGroupedTasks = groupedSlots.some(
                              (t) => t !== null,
                            );

                            let groupedHTML = "";
                            if (hasGroupedTasks) {
                              let sharedPortion = "";
                              groupedSlots.forEach((t) => {
                                if (t && !sharedPortion) {
                                  const parsed = parseCustomTask(t.title);
                                  if (parsed) {
                                    sharedPortion = parsed.portion;
                                  }
                                }
                              });
                              if (!sharedPortion) {
                                const activeT = groupedSlots.find(
                                  (t) => t !== null,
                                );
                                if (activeT) {
                                  sharedPortion = activeT.title
                                    .replace(
                                      /^(استماع|حفظ|تثبيت|تسميع|مراجعة|تثبيت المقدار الجديد|حفظ جديد)[:\s]*/,
                                      "",
                                    )
                                    .trim();
                                }
                              }

                              const actionBars = groupedSlots
                                .map((t) => {
                                  if (!t) return "";
                                  const isCastleRev =
                                    getCastleIndexFromTaskTitle(t.title);
                                  let taskColor = getTaskColor(t.type);
                                  if (isCastleRev !== null) {
                                    taskColor =
                                      CASTLES_THEMES[isCastleRev].color;
                                  }
                                  const parsed = parseCustomTask(t.title);
                                  const actionText = parsed
                                    ? parsed.action
                                    : t.title;

                                  return `
                                  <div style="padding: 3px 6px; border-radius: 5px; font-size: 8.8px; font-weight: bold; background: ${taskColor}12; border: 1.2px solid ${taskColor}25; color: ${taskColor}; text-align: right; line-height: 1.25; display: flex; align-items: center; justify-content: space-between; flex: 1; min-height: 20px; box-sizing: border-box;">
                                    <span style="font-size: 8.8px; font-weight: 850; white-space: nowrap;">${actionText}</span>
                                    ${t.targetCount > 1 ? `<span style="font-size: 7px; opacity: 0.85; font-family: 'Cairo', sans-serif;">تكرار: ${t.targetCount}x</span>` : ""}
                                  </div>
                                `;
                                })
                                .filter(Boolean)
                                .join("");

                              const flexCount = isThreeGroup ? 3 : 2;
                              groupedHTML = `
                                <div style="flex: ${flexCount}; padding: 5px; border-radius: 8px; border: 1.5px dashed ${dayCastleTheme.color}35; background: ${dayCastleTheme.color}04; display: flex; flex-direction: column; justify-content: flex-start; gap: 4px; box-sizing: border-box; overflow: visible;">
                                   <!-- Shared Portion / Assigned Verses -->
                                   <div style="font-size: 8.2px; font-weight: 800; color: #1e293b; background: #ffffff; border: 1.2px solid ${dayCastleTheme.color}25; padding: 2px 4px; border-radius: 4px; text-align: center; overflow-wrap: break-word; word-break: break-word; line-height: 1.2; font-family: 'Cairo', sans-serif; display: flex; align-items: center; justify-content: center; min-height: 24px;">
                                     ${sharedPortion || "المقرر اليومي"}
                                   </div>
                                   <!-- Action Bars Container -->
                                   <div style="display: flex; flex-direction: column; gap: 3.5px; flex-grow: 1; justify-content: flex-start;">
                                     ${actionBars}
                                   </div>
                                </div>
                              `;
                            } else {
                              const flexCount = isThreeGroup ? 3 : 2;
                              groupedHTML = `<div style="flex: ${flexCount}; border: 1px dashed rgba(0,0,0,0.02); border-radius: 8px; box-sizing: border-box; background: transparent;"></div>`;
                            }

                            const emptySlot2HTML = !isThreeGroup
                              ? `<div style="flex: 1; border: 1px dashed rgba(0,0,0,0.02); border-radius: 8px; box-sizing: border-box; background: transparent;"></div>`
                              : "";

                            // Helper helper to render slot 3 & slot 4
                            const renderSingleSlot = (t: any) => {
                              if (!t) {
                                return `<div style="flex: 1; border: 1px dashed rgba(0,0,0,0.02); border-radius: 8px; box-sizing: border-box; background: transparent;"></div>`;
                              }

                              const isCastleRev = getCastleIndexFromTaskTitle(
                                t.title,
                              );
                              let taskColor = getTaskColor(t.type);
                              if (isCastleRev !== null) {
                                taskColor = CASTLES_THEMES[isCastleRev].color;
                              }

                              const customParsed = parseCustomTask(t.title);
                              if (customParsed) {
                                return `
                                  <div style="flex: 1; padding: 4px 6px; border-radius: 8px; font-size: 9px; font-weight: bold; background: ${taskColor}12; border: 1px solid ${taskColor}25; text-align: right; color: ${taskColor}; line-height: 1.35; font-family: 'Cairo', sans-serif; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box;">
                                     <!-- Portion -->
                                     <div style="font-size: 8.2px; font-weight: 800; color: #1e293b; background: #ffffff; border: 1.2px solid ${taskColor}20; padding: 2px 4px; border-radius: 4px; margin-bottom: 2px; white-space: normal; line-height: 1.15; text-align: center; overflow-wrap: break-word; word-break: break-word;">
                                       ${customParsed.portion}
                                     </div>
                                     <!-- Action -->
                                     <div style="display: flex; align-items: center; gap: 3px; margin-top: auto; border-top: 1px dashed ${taskColor}20; padding-top: 1.5px;">
                                       <span style="font-size: 9px; font-weight: 850; color: ${taskColor}; white-space: nowrap;">${customParsed.action}</span>
                                     </div>
                                     ${t.targetCount > 1 ? `<div style="opacity: 0.85; font-size: 7px; margin-top: 1px; text-align: left;">تكرار: ${t.targetCount}x</div>` : ""}
                                  </div>
                                `;
                              }

                              return `
                                <div style="flex: 1; padding: 4px 6px; border-radius: 8px; font-size: 9px; font-weight: bold; background: ${taskColor}12; border: 1px solid ${taskColor}25; text-align: right; color: ${taskColor}; line-height: 1.3; font-family: 'Cairo', sans-serif; display: flex; flex-direction: column; justify-content: flex-start; box-sizing: border-box;">
                                   <div style="display: flex; align-items: flex-start; gap: 3px;">
                                     <span style="font-weight: normal; font-size: 10px; margin-top: -1.5px; flex-shrink: 0;">☐</span>
                                     <span style="width: 100%; white-space: normal; line-height: 1.22; overflow-wrap: break-word; word-break: break-word; font-size: 8.5px;">${t.title}</span>
                                   </div>
                                   ${t.targetCount > 1 ? `<div style="opacity: 0.85; font-size: 7px; margin-top: auto; padding-top: 1px; text-align: left;">تكرار: ${t.targetCount}x</div>` : ""}
                                </div>
                              `;
                            };

                            return (
                              groupedHTML +
                              emptySlot2HTML +
                              renderSingleSlot(slots[3]) +
                              renderSingleSlot(slots[4])
                            );
                          })()}
                        </div>

                        <!-- Date at Bottom (Base of Column) -->
                        <div style="margin-top: auto; padding-top: 8px; border-top: 2px dashed ${dayCastleTheme.color}25; text-align: center;">
                           <div style="font-size: 14px; font-weight: 900; color: ${dayCastleTheme.textColor}; font-family: 'Cairo', sans-serif;">${dayName}</div>
                           <div style="font-size: 9px; color: #D4AF37; font-weight: bold; margin-top: 2px; font-family: 'Cairo', sans-serif;">${hijriDateStr}</div>
                           <div style="font-size: 9px; color: #888; font-weight: bold; margin-top: 1px; font-family: 'Cairo', sans-serif;">${dayDateStr}</div>
                        </div>
                        
                      </div>
                    </div>
                  `;
                  })
                  .join("")}
              </div>

              <!-- Page Footer -->
              <div style="margin-top: 15px; padding-top: 8px; border-top: 1px dashed #E5E7EB; display: flex; justify-content: space-between; align-items: center; width: 100%; font-size: 11px; color: #9CA3AF; font-weight: bold; height: 20px;">
                <div style="font-family: 'Cairo', sans-serif;">
                  برنامج القلاع السبع للتمكين | صفحة ${i + 1} من ${chunks.length}
                </div>
                <div style="font-family: 'Cairo', sans-serif;">
                  تم استخراج هذه الخطة التراكمية بواسطة "خطة الحفظ الذكية" - ${new Date().toLocaleDateString("ar-EG")}
                </div>
              </div>
            </div>
          `;
        } else {
          // Standard style
          const titleText = activePlan.isSevenCastles
            ? "خطة القلاع السبع لحفظ القرآن الكريم"
            : activePlan.planType === "review"
              ? "خطة مراجعة القرآن الكريم"
              : "خطة حفظ القرآن الكريم";
          const subtitleText = activePlan.isSevenCastles
            ? `خطة القلاع السبع - أسبوع ${i + 1}`
            : activePlan.planType === "review"
              ? `خطة مراجعة - أسبوع ${i + 1}`
              : `${activePlan.juzNumber ? `الجزء رقم ${activePlan.juzNumber}` : "خطة مخصصة"} - أسبوع ${i + 1}`;

          pageEl.innerHTML = `
            <div style="padding: 24px; background: #FDFBF7; min-height: 1123px; width: 794px; box-sizing: border-box; font-family: 'Cairo', sans-serif; display: flex; flex-direction: column; overflow: visible;">
              <div style="text-align: center; margin-bottom: 15px; border-bottom: 2px solid #1A2E1A; padding-bottom: 8px;">
                <h1 style="font-size: 22px; color: #1A2E1A; margin: 0; font-family: 'Cairo', sans-serif;">${titleText}</h1>
                <p style="font-size: 14px; color: #D4AF37; margin: 4px 0; font-family: 'Cairo', sans-serif;">${subtitleText}</p>
              </div>
              
              <table style="width: 100%; border-collapse: collapse; font-size: 13px; flex-grow: 1; border: 2px solid #1A2E1A;">
                <thead>
                  <tr style="background: #1A2E1A; color: white;">
                    <th style="padding: 8px 12px; border: 2px solid #1A2E1A; text-align: right; width: 25%;">اليوم والتاريخ</th>
                    <th style="padding: 8px 12px; border: 2px solid #1A2E1A; text-align: right;">المهام المطلوبة</th>
                  </tr>
                </thead>
                <tbody>
                  ${chunk
                    .map((day, idx) => {
                      const dayName = getArabicDayName(day.date);
                      const dayDateStr = format(day.date, "yyyy/MM/dd");
                      const hijriDateStr = getHijriDate(day.date);
                      return `
                      <tr style="background: ${idx % 2 === 0 ? "white" : "#f9f9f9"}">
                        <td style="padding: 8px 12px; border: 2px solid #1A2E1A;">
                          <div style="font-weight: bold; font-family: 'Cairo', sans-serif; font-size: 13.5px;">${dayName}</div>
                          <div style="font-size: 10.5px; color: #b45309; font-weight: bold; margin-top: 2px; font-family: 'Cairo', sans-serif;">${hijriDateStr}</div>
                          <div style="font-size: 11px; color: #666; font-family: 'Cairo', sans-serif;">${dayDateStr}</div>
                        </td>
                        <td style="padding: 8px 12px; border: 2px solid #1A2E1A;">
                          <ul style="padding-right: 0; margin: 0; font-family: 'Cairo', sans-serif; list-style: none;">
                            ${(() => {
                              if (!day.tasks || day.tasks.length === 0) {
                                return `<li style="color: #666; font-family: 'Cairo', sans-serif; font-weight: bold; font-size: 13px;">يوم راحة</li>`;
                              }

                              const getCleanGroupLabel = (
                                title: string,
                              ): string => {
                                let clean = title;

                                // Dynamically split and remove action word prefix if it exists before any colon
                                if (clean.includes(":")) {
                                  const parts = clean.split(":");
                                  const prefix = parts[0];
                                  const actionWords = [
                                    "حفظ",
                                    "تثبيت",
                                    "مراجعة",
                                    "تسميع",
                                    "استماع",
                                    "القلعة",
                                  ];
                                  if (
                                    !prefix.includes("(") &&
                                    actionWords.some((w) => prefix.includes(w))
                                  ) {
                                    clean = parts.slice(1).join(":").trim();
                                  }
                                }

                                // Remove prefix patterns
                                clean = clean.replace(
                                  /^(?:تسميع تثبيت|تسميع التثبيت|استماع تثبيت|استماع التثبيت|تسميع تراكمي لـ|تسميع تراكمي|تسميع|تثبيت|حفظ الجديد|حفظ جديد|حفظ|استماع|مراجعة تراكمية لـ|مراجعة تراكمية|مراجعة)\s+/g,
                                  "",
                                );

                                // Remove trailing " غيباً"
                                clean = clean.replace(/ غيباً$/g, "");

                                // Remove trailing repetition descriptions like " (3 مرات)" or " (5 مرات)" or " (1 مرات)"
                                clean = clean.replace(/\s*\(\d+\s*مرات\)/g, "");

                                return clean.trim();
                              };

                              const getTaskColor = (type: string) => {
                                switch (type) {
                                  case "memorization":
                                    return "#059669"; // emerald-600
                                  case "listening":
                                    return "#0284c7"; // sky-600
                                  case "fixation":
                                    return "#b45309"; // amber-700
                                  case "review":
                                    return "#be123c"; // rose-700
                                  case "cumulative_review":
                                    return "#0f766e"; // teal-700
                                  case "recitation":
                                    return "#4338ca"; // indigo-700
                                  default:
                                    return "#333333";
                                }
                              };

                              // Group tasks that have same pages and exact same clean portion label (verses)
                              const dayGroups: {
                                key: string;
                                label: string;
                                tasks: any[];
                              }[] = [];
                              day.tasks.forEach((t: any) => {
                                const cleanLabel = getCleanGroupLabel(t.title);
                                const partMatch = t.id
                                  ? t.id.toString().match(/-part\d+/)
                                  : null;
                                const partSuffix = partMatch
                                  ? partMatch[0]
                                  : "";

                                const key =
                                  t.pages && t.pages.length > 0
                                    ? 'group-' + t.pages.join(',') + '-' + cleanLabel + partSuffix
                                    : `task-${t.id || cleanLabel}`;

                                let group = dayGroups.find(
                                  (g) => g.key === key,
                                );
                                if (!group) {
                                  group = { key, label: cleanLabel, tasks: [] };
                                  dayGroups.push(group);
                                }
                                group.tasks.push(t);
                              });

                              return dayGroups
                                .map((group, groupIdx) => {
                                  if (group.tasks.length === 1) {
                                    // Render normally as a single task if no merging happened
                                    const t = group.tasks[0];
                                    const isCastleRev =
                                      getCastleIndexFromTaskTitle(t.title);
                                    const color =
                                      isCastleRev !== null
                                        ? CASTLES_THEMES[isCastleRev].color
                                        : getTaskColor(t.type);
                                    const repeatText =
                                      t.targetCount > 1
                                        ? ` (تكرار: ${t.targetCount}x)`
                                        : "";

                                    return `
                                    <li style="padding-bottom: 4px; margin-bottom: 4px; font-family: 'Cairo', sans-serif; font-weight: bold; font-size: 13.5px; line-height: 1.35; display: block; color: ${color}; ${groupIdx !== dayGroups.length - 1 ? "border-bottom: 1px dashed #ccc;" : ""}">
                                      <span style="font-size: 16px; margin-left: 6px; font-weight: normal; vertical-align: middle;">☐</span>
                                      <span style="vertical-align: middle;">${t.title}${repeatText}</span>
                                    </li>
                                  `;
                                  } else {
                                    // Merged tasks! Render group label and checkboxes below it
                                    const firstTask = group.tasks[0];
                                    const isCastleRev =
                                      getCastleIndexFromTaskTitle(
                                        firstTask.title,
                                      );
                                    const groupColor =
                                      isCastleRev !== null
                                        ? CASTLES_THEMES[isCastleRev].color
                                        : "#1A2E1A"; // Primary dark green for group text

                                    return `
                                    <li style="padding-bottom: 6px; margin-bottom: 6px; font-family: 'Cairo', sans-serif; display: block; ${groupIdx !== dayGroups.length - 1 ? "border-bottom: 1px dashed #ccc;" : ""}">
                                      <!-- Group Label: the Quranic verses / target -->
                                      <div style="font-weight: 800; font-size: 14px; color: ${groupColor}; margin-bottom: 4px; display: flex; align-items: center; gap: 4px;">
                                        <span>📖</span>
                                        <span>المقرر: ${group.label}</span>
                                      </div>
                                      <!-- Sub-tasks Checkboxes -->
                                      <div style="display: flex; flex-direction: row; flex-wrap: wrap; gap: 12px; margin-right: 10px; align-items: center;">
                                        ${group.tasks
                                          .map((t: any) => {
                                            const itemCastleRev =
                                              getCastleIndexFromTaskTitle(
                                                t.title,
                                              );
                                            const tColor =
                                              itemCastleRev !== null
                                                ? CASTLES_THEMES[itemCastleRev]
                                                    .color
                                                : getTaskColor(t.type);
                                            const taskName =
                                              t.type === "memorization"
                                                ? "حفظ"
                                                : t.type === "fixation"
                                                  ? "تثبيت"
                                                  : t.type === "review"
                                                    ? "مراجعة"
                                                    : t.type ===
                                                        "cumulative_review"
                                                      ? "تراكمي"
                                                      : t.type === "listening"
                                                        ? "استماع"
                                                        : "تسميع";
                                            const repeatText =
                                              t.targetCount > 1
                                                ? ` (${t.targetCount}x)`
                                                : "";
                                            return `
                                            <span style="font-size: 12.5px; font-weight: bold; color: ${tColor}; display: flex; align-items: center; gap: 4px;">
                                              <span style="font-size: 16px; font-weight: normal; color: #777; vertical-align: middle;">☐</span>
                                              <span style="vertical-align: middle;">${taskName}${repeatText}</span>
                                            </span>
                                          `;
                                          })
                                          .join("")}
                                      </div>
                                    </li>
                                  `;
                                  }
                                })
                                .join("");
                            })()}
                          </ul>
                        </td>
                      </tr>
                    `;
                    })
                    .join("")}
                </tbody>
              </table>
              
              <div style="margin-top: auto; padding-top: 15px; text-align: center; font-size: 11px; color: #999; font-family: 'Cairo', sans-serif;">
                صفحة ${i + 1} من ${chunks.length} | تم استخراج هذه الخطة بواسطة "خطة الحفظ الذكية" - ${new Date().toLocaleDateString("ar-EG")}
              </div>
            </div>
          `;
        }

        tempContainer.appendChild(pageEl);
        pageElements.push(pageEl);

      }

      // Generate Clean Arabic Filename
      const minPage = Math.min(activePlan.startPage, activePlan.endPage);
      const maxPage = Math.max(activePlan.startPage, activePlan.endPage);

      let descriptionStr = "";
      if (activePlan.isSevenCastles) {
        descriptionStr = "منظومة_القلاع_السبع";
      } else if (activePlan.planType === "review") {
        if (activePlan.isSpecificReview) {
          if (
            activePlan.selectedReviewSurahs &&
            activePlan.selectedReviewSurahs.length > 0
          ) {
            descriptionStr = `مراجعة_سورة_${activePlan.selectedReviewSurahs.join("_و_")}`;
          } else if (
            activePlan.selectedReviewJuzs &&
            activePlan.selectedReviewJuzs.length > 0
          ) {
            descriptionStr = `مراجعة_الأجزاء_${activePlan.selectedReviewJuzs.sort((a, b) => a - b).join("_و_")}`;
          } else {
            descriptionStr = "مراجعة_حفظ_مخصص";
          }
        } else {
          descriptionStr = "مراجعة_القرآن_الكريم";
        }
      } else {
        if (
          activePlan.juzPlanStartMode === "surah" &&
          activePlan.selectedJuzSurahs &&
          activePlan.selectedJuzSurahs.length > 0
        ) {
          descriptionStr = `حفظ_سورة_${activePlan.selectedJuzSurahs.join("_و_")}`;
        } else if (activePlan.juzNumber) {
          descriptionStr = `حفظ_الجزء_${activePlan.juzNumber}`;
        } else if (
          activePlan.selectedJuzsToMemorize &&
          activePlan.selectedJuzsToMemorize.length > 0
        ) {
          descriptionStr = `حفظ_الأجزاء_${activePlan.selectedJuzsToMemorize.sort((a, b) => a - b).join("_و_")}`;
        } else {
          const overlapping = SURAH_METADATAList.filter(
            (s) => s.startPage <= maxPage && s.endPage >= minPage
          );
          if (overlapping.length > 0 && overlapping.length <= 3) {
            descriptionStr = `حفظ_سورة_${overlapping.map((s) => s.name).join("_و_")}`;
          } else if (overlapping.length > 3) {
            descriptionStr = `حفظ_من_سورة_${overlapping[0].name}_إلى_${overlapping[overlapping.length - 1].name}`;
          } else {
            descriptionStr = `حفظ_الصفحات_${minPage}_إلى_${maxPage}`;
          }
        }
      }

      const dailyAmountMap: Record<string, string> = {
        quarter_page: "ربع_صفحة",
        half_page: "نصف_صفحة",
        one_page: "صفحة_واحدة",
        two_pages: "صفحتان",
        quarter_hizb: "ربع_حزب",
        three_pages: "3_صفحات",
        four_pages: "4_صفحات",
        five_pages: "5_صفحات",
      };

      const amountSuffix =
        activePlan.planType === "review"
          ? activePlan.reviewAmountType === "pages"
            ? `_بمقدار_${activePlan.reviewPageAmount}_صفحات_يوميا`
            : activePlan.reviewJuzAmount
              ? `_بمقدار_${activePlan.reviewJuzAmount}_أجزاء_يوميا`
              : ""
          : activePlan.dailyAmount
            ? `_بمقدار_${dailyAmountMap[activePlan.dailyAmount] || ""}_يوميا`
            : "";

      const stylePrefix = isCastleTowerStyle ? "أبراج_" : "";
      const sanitizeForFilename = (str: string): string => {
        return str
          .replace(/\s+/g, "_")
          .replace(/[^()0-9a-zA-Z\u0600-\u06FF\-_]/g, "");
      };

      const rawFileName = stylePrefix + descriptionStr + amountSuffix;
      const fileName = `${sanitizeForFilename(rawFileName)}.pdf`;

      // MODE: PRINT
      if (mode === "print") {
        setExportProgress("جاري فتح نافذة الطباعة المباشرة...");

        const printHtml = `
          <!DOCTYPE html>
          <html dir="rtl">
          <head>
            <meta charset="utf-8" />
            <title>${planTypeName || 'خطة الحفظ والمراجعة'}</title>
            <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
            <style>
              @media print {
                @page {
                  size: A4 ${isCastleTowerStyle ? 'landscape' : 'portrait'};
                  margin: 0;
                }
                .print-toolbar {
                  display: none !important;
                }
                html, body {
                  margin: 0 !important;
                  padding: 0 !important;
                  background-color: white !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                .print-page {
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                  page-break-after: always;
                  break-after: page;
                  width: ${isCastleTowerStyle ? '296mm' : '209mm'} !important;
                  height: ${isCastleTowerStyle ? '209mm' : '296mm'} !important;
                  box-sizing: border-box !important;
                  overflow: hidden !important;
                  position: relative !important;
                  display: flex !important;
                  flex-direction: column !important;
                  justify-content: flex-start !important;
                  margin: 0 auto !important;
                  padding: 0 !important;
                  border: none !important;
                }
                .print-page:last-of-type {
                  page-break-after: auto !important;
                  break-after: auto !important;
                }
                .print-page > div {
                  width: 100% !important;
                  box-sizing: border-box !important;
                }
                tr, td, th {
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                }
                table {
                  page-break-inside: auto !important;
                }
                * {
                  font-family: 'Cairo', sans-serif !important;
                  letter-spacing: normal !important;
                  word-spacing: normal !important;
                  -webkit-font-smoothing: antialiased !important;
                  text-rendering: optimizeLegibility !important;
                }
              }
              @media screen {
                body {
                  padding-top: 110px !important;
                  background-color: #f3f4f6;
                }
                .print-toolbar {
                  position: fixed;
                  top: 0;
                  left: 0;
                  right: 0;
                  background: #1A2E1A;
                  color: #ffffff;
                  padding: 10px 20px;
                  box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                  z-index: 99999;
                  border-bottom: 2px solid #D4AF37;
                  direction: rtl;
                  font-family: 'Cairo', sans-serif;
                }
                .toolbar-inner {
                  max-width: 1100px;
                  margin: 0 auto;
                  display: flex;
                  align-items: center;
                  justify-content: space-between;
                  gap: 12px;
                  flex-wrap: wrap;
                }
                .toolbar-title {
                  font-size: 14px;
                  font-weight: 800;
                  color: #F7E7A9;
                  margin: 0;
                }
                .toolbar-subtitle {
                  font-size: 11px;
                  color: #e5e7eb;
                  margin: 2px 0 0 0;
                }
                .toolbar-actions {
                  display: flex;
                  align-items: center;
                  gap: 8px;
                }
                .btn-tb {
                  display: inline-flex;
                  align-items: center;
                  gap: 6px;
                  padding: 7px 14px;
                  border-radius: 8px;
                  font-size: 12px;
                  font-weight: 700;
                  cursor: pointer;
                  border: none;
                  font-family: 'Cairo', sans-serif;
                  transition: all 0.15s ease;
                }
                .btn-print-action {
                  background: #D4AF37;
                  color: #1A2E1A;
                }
                .btn-print-action:hover {
                  background: #e6c555;
                }
                .btn-download-action {
                  background: rgba(255,255,255,0.15);
                  color: #ffffff;
                  border: 1px solid rgba(255,255,255,0.3);
                }
                .btn-download-action:hover {
                  background: rgba(255,255,255,0.25);
                }
                .btn-close-action {
                  background: transparent;
                  color: #d1d5db;
                }
                .btn-close-action:hover {
                  color: #ffffff;
                  background: rgba(255,255,255,0.1);
                }
                .toolbar-hint {
                  max-width: 1100px;
                  margin: 6px auto 0 auto;
                  padding: 4px 10px;
                  background: rgba(212, 175, 55, 0.12);
                  border-radius: 6px;
                  font-size: 10.5px;
                  color: #F7E7A9;
                  border: 1px dashed rgba(212, 175, 55, 0.35);
                }
              }
              body {
                font-family: 'Cairo', sans-serif;
                margin: 0;
                padding: 0;
                display: flex;
                flex-direction: column;
                align-items: center;
              }
              .print-page {
                width: ${isCastleTowerStyle ? '1123px' : '794px'};
                height: ${isCastleTowerStyle ? '794px' : '1123px'};
                box-sizing: border-box;
                background: white;
                box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
                position: relative;
                margin-bottom: 20px;
              }
              * {
                font-family: 'Cairo', sans-serif !important;
              }
            </style>
          </head>
          <body>
            <div class="print-toolbar">
              <div class="toolbar-inner">
                <div>
                  <div class="toolbar-title">🖨️ ${planTypeName || 'خطة الحفظ والمراجعة'}</div>
                  <div class="toolbar-subtitle">جاهز للطباعة أو التنزيل بتنسيق PDF عالي الدقة</div>
                </div>
                <div class="toolbar-actions">
                  <button onclick="window.print()" class="btn-tb btn-print-action">
                    🖨️ طباعة الآن (Ctrl + P)
                  </button>
                  <button onclick="window.print()" class="btn-tb btn-download-action" title="لحفظ PDF: اختر Save as PDF من نافذة الطباعة">
                    📥 تنزيل بتنسيق PDF
                  </button>
                  <button onclick="window.close()" class="btn-tb btn-close-action">
                    ✕ إغلاق
                  </button>
                </div>
              </div>
              <div class="toolbar-hint">
                💡 <strong>تلميح:</strong> لحفظ الملف على جهازك كـ PDF، اختر <strong>(حفظ بتنسيق PDF / Save as PDF)</strong> من قائمة الطابعات وتأكد من تفعيل خيار <strong>(رسومات الخلفية / Background graphics)</strong>.
              </div>
            </div>
            <div class="print-container">
              ${pageElements.map((el) => `<div class="print-page">${el.innerHTML}</div>`).join("")}
            </div>
            <script>
              window.onload = function() {
                const pages = document.querySelectorAll('.print-page, .booklet-scaled-page');
                pages.forEach(function(page) {
                  const contentDiv = page.firstElementChild;
                  if (contentDiv) {
                    const contentHeight = contentDiv.scrollHeight;
                    const isLandscape = page.offsetWidth > page.offsetHeight;
                    const targetHeight = isLandscape ? 794 : 1123;
                    if (contentHeight > targetHeight) {
                      const scale = targetHeight / contentHeight;
                      contentDiv.style.zoom = scale;
                    }
                  }
                });

                const images = document.getElementsByTagName("img");
                const promises = Array.from(images).map(function(img) {
                  if (img.complete) return Promise.resolve();
                  return new Promise(function(resolve) {
                    img.onload = function() { resolve(null); };
                    img.onerror = function() { resolve(null); };
                  });
                });
                Promise.all(promises).then(function() {
                  setTimeout(function() {
                    window.focus();
                    window.print();
                  }, 500);
                });
              };
            </script>
          </body>
          </html>
        `;

        let openedSuccessfully = false;
        try {
          const printWindow = window.open("", "_blank");
          if (printWindow) {
            printWindow.document.open();
            printWindow.document.write(printHtml);
            printWindow.document.close();
            openedSuccessfully = true;
          }
        } catch (e) {
          console.warn("window.open print failed, switching to iframe fallback", e);
        }

        if (!openedSuccessfully) {
          // Fallback: Invisible iframe printing
          const iframe = document.createElement("iframe");
          iframe.style.position = "fixed";
          iframe.style.right = "0";
          iframe.style.bottom = "0";
          iframe.style.width = "0";
          iframe.style.height = "0";
          iframe.style.border = "none";
          document.body.appendChild(iframe);
          if (iframe.contentDocument) {
            iframe.contentDocument.open();
            iframe.contentDocument.write(printHtml);
            iframe.contentDocument.close();
            iframe.onload = () => {
              setTimeout(() => {
                iframe.contentWindow?.focus();
                iframe.contentWindow?.print();
                setTimeout(() => {
                  if (document.body.contains(iframe)) {
                    document.body.removeChild(iframe);
                  }
                }, 2000);
              }, 500);
            };
          }
        }

        if (document.body.contains(tempContainer)) {
          document.body.removeChild(tempContainer);
        }
        setIsExporting(false);
        setIsPrinting(false);
        setExportProgress("");
        return;
      }

      // MODE: DOWNLOAD or SHARE
      for (let i = 0; i < pageElements.length; i++) {
        const progressMessage =
          i === 0
            ? `جاري معالجة صفحة الغلاف الفاخرة بدقة عالية... (إجمالي ${pageElements.length} صفحات)`
            : `جاري معالجة الأسبوع ${i} من أصل ${pageElements.length - 1}... (إجمالي ${pageElements.length} صفحات)`;
        setExportProgress(progressMessage);

        const pageEl = pageElements[i];
        const restoreColors = patchColorsForHtml2Canvas(pageEl);
        let canvas;
        try {
          canvas = await html2canvas(pageEl, {
            scale: 3,
            useCORS: true,
            backgroundColor: isCastleTowerStyle ? "#FFFDF9" : "#FDFBF7",
            logging: false,
          });
        } finally {
          restoreColors();
        }

        const imgData = canvas.toDataURL("image/png");

        if (i > 0) {
          if (isCastleTowerStyle) {
            pdf.addPage("a4", "l");
          } else {
            pdf.addPage("a4", "p");
          }
        }

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");

        canvas.width = 0;
        canvas.height = 0;
      }

      if (mode === "download") {
        setExportProgress("جاري تنزيل الملف مباشرة على جهازك...");
        pdf.save(fileName);
        setExportProgress("تم تنزيل ملف الـ PDF بنجاح!");
        setTimeout(() => setExportProgress(""), 2000);
      } else if (mode === "share") {
        setExportProgress("جاري تحضير ملف الـ PDF للمشاركة...");
        const blob = pdf.output("blob");
        const file = new File([blob], fileName, { type: "application/pdf" });
        if (navigator.share) {
          try {
            await navigator.share({
              files: [file],
              title: "خطة حفظ القرآن الكريم",
              text: "تفضل ملف خطة حفظ القرآن الكريم الخاصة بي",
            });
          } catch (shareError: any) {
            console.warn("Share failed or was cancelled", shareError);
            if (shareError && shareError.name === "AbortError") {
              // User cancelled
            } else {
              setShareModalConfig({ isOpen: true, fileName, pdf });
            }
          }
        } else {
          setShareModalConfig({ isOpen: true, fileName, pdf });
        }
      }

      if (document.body.contains(tempContainer)) {
        document.body.removeChild(tempContainer);
      }
    } catch (error) {
      console.error("Export failed", error);
      console.error("حدث خطأ أثناء التصدير.");
    } finally {
      setIsExporting(false);
      setIsPrinting(false);
      if (mode !== "download") {
        setExportProgress("");
      }
    }
  };

  const exportBookletPDF = async (
    isCastleTowerStyle: boolean = false,
    action: "download" | "print" | "share" | boolean = "download"
  ) => {
    if (!activePlan) return;

    const mode: "download" | "print" | "share" =
      typeof action === "boolean" ? (action ? "print" : "download") : action;

    setIsExportingBooklet(true);
    if (mode === "print") {
      setIsPrintingBooklet(true);
    }
    setExportProgressBooklet("جاري تحضير صفحات التقرير الأصلي...");

    // Allow React state updates to render in the browser immediately to provide instant visual feedback
    await new Promise((resolve) => setTimeout(resolve, 100));

    const getCastleIndexFromTaskTitle = (title: string): number | null => {
      if (title.includes("القلعة الأولى") || title.includes("القلعة 1")) return 0;
      if (title.includes("القلعة الثانية") || title.includes("القلعة 2")) return 1;
      if (title.includes("القلعة الثالثة") || title.includes("القلعة 3")) return 2;
      if (title.includes("القلعة الرابعة") || title.includes("القلعة 4")) return 3;
      if (title.includes("القلعة الخامسة") || title.includes("القلعة 5")) return 4;
      if (title.includes("القلعة السادسة") || title.includes("القلعة 6")) return 5;
      if (title.includes("القلعة السابعة") || title.includes("القلعة 7")) return 6;
      return null;
    };

    const getArabicDayName = (date: Date): string => {
      const days = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
      return days[date.getDay()];
    };

    const getCastleIdxForDate = (date: Date) => {
      const planStart = new Date(activePlan.startDate);
      planStart.setHours(0, 0, 0, 0);
      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);

      const daysDiff = differenceInCalendarDays(targetDate, planStart);
      if (daysDiff < 0) return 0;

      const weekIdx = Math.floor(daysDiff / 7);
      const d_week = (targetDate.getDay() - (activePlan.firstDayOfWeek || 0) + 7) % 7;

      let memDay = 1;
      if (d_week === 0) {
        memDay = weekIdx * 4 + 1;
      } else if (d_week === 1) {
        memDay = weekIdx * 4 + 2;
      } else if (d_week === 2) {
        memDay = weekIdx * 4 + 1;
      } else if (d_week === 3) {
        memDay = weekIdx * 4 + 3;
      } else if (d_week === 4) {
        memDay = weekIdx * 4 + 4;
      } else if (d_week === 5) {
        memDay = weekIdx * 4 + 3;
      } else if (d_week === 6) {
        memDay = weekIdx * 4 + 4;
      }

      const castleIdx = Math.floor((memDay - 1) / 6);
      return Math.min(Math.max(castleIdx, 0), 6);
    };

    const getJuzForPage = (p: number): number => {
      for (let j = 1; j <= 30; j++) {
        const range = JUZ_PAGES[j];
        if (range && p >= range.start && p <= range.end) {
          return j;
        }
      }
      return 1;
    };

    const getJuzsFromPages = (pages: number[]): number[] => {
      if (!pages || pages.length === 0) return [];
      const juzs = new Set<number>();
      pages.forEach(p => {
        const juz = getJuzForPage(p);
        juzs.add(juz);
      });
      return Array.from(juzs).sort((a, b) => a - b);
    };

    const getTaskColorLocal = (type: string) => {
      switch (type) {
        case "memorization":
          return "#059669";
        case "listening":
          return "#0284c7";
        case "fixation":
          return "#b45309";
        case "review":
          return "#be123c";
        case "cumulative_review":
          return "#0f766e";
        case "recitation":
          return "#4338ca";
        default:
          return "#333333";
      }
    };

    const getCleanGroupLabel = (title: string): string => {
      let clean = title;
      if (clean.includes(":")) {
        const parts = clean.split(":");
        const prefix = parts[0];
        const actionWords = ["حفظ", "تثبيت", "مراجعة", "تسميع", "استماع", "القلعة"];
        if (!prefix.includes("(") && actionWords.some((w) => prefix.includes(w))) {
          clean = parts.slice(1).join(":").trim();
        }
      }
      clean = clean.replace(
        /^(?:تسميع تثبيت|تسميع التثبيت|استماع تثبيت|استماع التثبيت|تسميع تراكمي لـ|تسميع تراكمي|تسميع|تثبيت|حفظ الجديد|حفظ جديد|حفظ|استماع|مراجعة تراكمية لـ|مراجعة تراكمية|مراجعة)\s+/g,
        "",
      );
      clean = clean.replace(/ غيباً$/g, "");
      clean = clean.replace(/\s*\(\d+\s*مرات\)/g, "");
      return clean.trim();
    };

    const tempContainer = document.createElement("div");
    tempContainer.style.position = "fixed";
    tempContainer.style.left = "0";
    tempContainer.style.top = "0";
    tempContainer.style.width = isCastleTowerStyle ? "1123px" : "794px";
    tempContainer.style.height = "auto";
    tempContainer.style.overflow = "visible";
    tempContainer.style.zIndex = "-9999";
    tempContainer.style.pointerEvents = "none";
    tempContainer.dir = "rtl";
    document.body.appendChild(tempContainer);

    const tempStyle = document.createElement("style");
    tempStyle.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');
      * {
        font-family: 'Cairo', sans-serif !important;
        letter-spacing: normal !important;
        word-spacing: normal !important;
        -webkit-font-smoothing: antialiased !important;
        -moz-osx-font-smoothing: grayscale !important;
        text-rendering: optimizeLegibility !important;
      }
    `;
    tempContainer.appendChild(tempStyle);

    try {
      if ("fonts" in document) {
        await document.fonts.ready;
      }
    } catch (fontErr) {
      console.warn("Failed waiting for fonts to load", fontErr);
    }

    try {
      const fullData = generateFullPlan();
      const chunks: any[][] = [];
      let currentWeek: any[] = [];
      const endOfWeekDay = ((activePlan.firstDayOfWeek || 0) + 6) % 7;

      fullData.forEach((day: any) => {
        currentWeek.push(day);
        if (day.date.getDay() === endOfWeekDay) {
          chunks.push(currentWeek);
          currentWeek = [];
        }
      });
      if (currentWeek.length > 0) {
        chunks.push(currentWeek);
      }

      const pageElements: HTMLDivElement[] = [];

      // Render cover page
      let planTypeName = "خطة حفظ القرآن الكريم";
      if (activePlan.isSevenCastles) {
        planTypeName = "خطة القلاع السبع للتمكين";
      } else if (activePlan.planType === "review") {
        planTypeName = "خطة مراجعة وتثبيت";
      } else if (activePlan.planType === "juz") {
        planTypeName = "خطة حفظ الأجزاء";
      } else if (activePlan.planType === "flexible") {
        planTypeName = "خطة الحفظ المرنة";
      }

      const startJuzNum = activePlan.juzNumber || getJuzForPage(activePlan.startPage || 1);
      const newMemText = activePlan.planType === 'review' ? 'لا يوجد (خطة مراجعة فقط)' : `يبدأ من جزء ${startJuzNum}`;

      let oldMemText = "لا يوجد";
      if (activePlan.planType === 'review') {
        if (activePlan.isSpecificReview) {
          if (activePlan.selectedReviewSurahs && activePlan.selectedReviewSurahs.length > 0) {
            oldMemText = `السور: ${activePlan.selectedReviewSurahs.join('، ')}`;
          } else if (activePlan.selectedReviewJuzs && activePlan.selectedReviewJuzs.length > 0) {
            oldMemText = `الأجزاء: ${activePlan.selectedReviewJuzs.sort((a, b) => a - b).join('، ')}`;
          } else {
            oldMemText = "مراجعة مخصصة";
          }
        } else {
          oldMemText = "كامل القرآن الكريم";
        }
      } else if (activePlan.hasOldMemorization && activePlan.oldMemorizedPages && activePlan.oldMemorizedPages.length > 0) {
        if (activePlan.oldMemType === 'surah' && activePlan.oldMemSurahs && activePlan.oldMemSurahs.length > 0) {
          oldMemText = `السور: ${activePlan.oldMemSurahs.join('، ')}`;
        } else {
          const juzs = getJuzsFromPages(activePlan.oldMemorizedPages);
          oldMemText = `الأجزاء: ${juzs.join('، ')}`;
        }
      }

      const planWeeks = chunks.length;
      const formatWeeksArabic = (weeks: number): string => {
        if (weeks === 1) return "أسبوع واحد";
        if (weeks === 2) return "أسبوعان";
        if (weeks >= 3 && weeks <= 10) return `${weeks} أسابيع`;
        return `${weeks} أسبوعاً`;
      };
      const durationText = formatWeeksArabic(planWeeks);

      const startDateStr = format(new Date(fullData[0].date), "yyyy/MM/dd");
      const endDateStr = format(new Date(fullData[fullData.length - 1].date), "yyyy/MM/dd");
      const startHijriStr = getHijriDate(new Date(fullData[0].date));
      const endHijriStr = getHijriDate(new Date(fullData[fullData.length - 1].date));

      const coverEl = document.createElement("div");
      coverEl.style.width = isCastleTowerStyle ? "1123px" : "794px";
      coverEl.style.boxSizing = "border-box";
      coverEl.style.marginBottom = "30px";

      if (isCastleTowerStyle) {
        coverEl.innerHTML = `
          <div style="padding: 60px 80px; background: #FFFDF9; width: 1123px; min-height: 794px; box-sizing: border-box; font-family: 'Cairo', sans-serif; display: flex; flex-direction: column; justify-content: space-between; direction: rtl; position: relative; border: 12px double #1A2E1A; text-align: center;">
            <div style="font-size: 24px; color: #D4AF37; margin-bottom: 10px;">❖ ═══════════ ❖ ═══════════ ❖</div>
            <div style="flex-grow: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 30px;">
              <div style="display: flex; justify-content: center; align-items: center; width: 100px; height: 100px; background: #ffffff; border-radius: 20px; border: 2px solid #1A2E1A20; overflow: visible; padding: 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
                <img src="/app_icon_v6.png" style="width: 100%; height: 100%; object-fit: contain; border-radius: 12px;" alt="شعار التطبيق" />
              </div>
              <div>
                <h1 style="font-size: 38px; font-weight: 900; color: #1A2E1A; margin: 0; line-height: 1.3;">${planTypeName}</h1>
                <p style="font-size: 18px; color: #D4AF37; font-weight: bold; margin-top: 10px; margin-bottom: 0;">برنامج التمكين المتكامل لحفظ القرآن الكريم وتثبيته</p>
              </div>
              <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; width: 80%; max-width: 800px; margin-top: 10px; background: #ffffff; border: 2px solid #1A2E1A15; padding: 30px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.02);">
                <div style="display: flex; align-items: center; gap: 12px; text-align: right; border-bottom: 1px dashed #1A2E1A20; padding-bottom: 15px;">
                  <span style="font-size: 24px;">🌱</span>
                  <div>
                    <div style="font-size: 13px; color: #666; font-weight: bold;">الحفظ الجديد</div>
                    <div style="font-size: 16px; color: #1A2E1A; font-weight: 800; margin-top: 3px;">${newMemText}</div>
                  </div>
                </div>
                <div style="display: flex; align-items: center; gap: 12px; text-align: right; border-bottom: 1px dashed #1A2E1A20; padding-bottom: 15px;">
                  <span style="font-size: 24px;">📖</span>
                  <div>
                    <div style="font-size: 13px; color: #666; font-weight: bold;">الحفظ القديم / المراجعة</div>
                    <div style="font-size: 16px; color: #1A2E1A; font-weight: 800; margin-top: 3px; max-width: 320px; overflow: visible; text-overflow: ellipsis; white-space: nowrap;" title="${oldMemText}">${oldMemText}</div>
                  </div>
                </div>
                <div style="display: flex; align-items: center; gap: 12px; text-align: right; padding-top: 5px;">
                  <span style="font-size: 24px;">⏳</span>
                  <div>
                    <div style="font-size: 13px; color: #666; font-weight: bold;">مدة الخطة</div>
                    <div style="font-size: 16px; color: #1A2E1A; font-weight: 800; margin-top: 3px;">${durationText}</div>
                  </div>
                </div>
                <div style="display: flex; align-items: center; gap: 12px; text-align: right; padding-top: 5px;">
                  <span style="font-size: 24px;">📅</span>
                  <div>
                    <div style="font-size: 13px; color: #666; font-weight: bold;">الفترة الزمنية</div>
                    <div style="font-size: 14px; color: #1A2E1A; font-weight: 800; margin-top: 3px; line-height: 1.4;">
                      البداية: ${startHijriStr} (${startDateStr} م)<br/>
                      النهاية: ${endHijriStr} (${endDateStr} م)
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div style="margin-top: 20px;">
              <div style="font-size: 24px; color: #D4AF37; margin-bottom: 10px;">❖ ═══════════ ❖ ═══════════ ❖</div>
              <p style="font-size: 12px; color: #888; margin: 0;">تم استخراج هذه الخطة بواسطة "خطة الحفظ الذكية" - ${new Date().toLocaleDateString("ar-EG")}</p>
            </div>
          </div>
        `;
      } else {
        coverEl.innerHTML = `
          <div style="padding: 80px 60px; background: #FDFBF7; width: 794px; min-height: 1123px; box-sizing: border-box; font-family: 'Cairo', sans-serif; display: flex; flex-direction: column; justify-content: space-between; direction: rtl; position: relative; border: 4px solid #1A2E1A; text-align: center;">
            <div style="position: absolute; top: 15px; bottom: 15px; left: 15px; right: 15px; border: 1px solid #D4AF37; pointer-events: none;"></div>
            <div style="font-size: 22px; color: #D4AF37; margin-top: 20px; margin-bottom: 10px;">❖ ══════════ ❖ ══════════ ❖</div>
            <div style="flex-grow: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 40px; margin-top: 20px; margin-bottom: 20px;">
              <div style="display: flex; justify-content: center; align-items: center; width: 100px; height: 100px; background: #ffffff; border-radius: 20px; border: 2px solid #1A2E1A20; overflow: visible; padding: 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
                <img src="/app_icon_v6.png" style="width: 100%; height: 100%; object-fit: contain; border-radius: 12px;" alt="شعار التطبيق" />
              </div>
              <div>
                <h1 style="font-size: 34px; font-weight: 900; color: #1A2E1A; margin: 0; line-height: 1.4;">${planTypeName}</h1>
                <p style="font-size: 16px; color: #D4AF37; font-weight: bold; margin-top: 12px; margin-bottom: 0; letter-spacing: 0.5px;">البرنامج المنهجي المنظم لتلاوة وحفظ القرآن الكريم</p>
              </div>
              <div style="display: flex; flex-direction: column; gap: 18px; width: 85%; margin-top: 10px; background: #ffffff; border: 1.5px solid #1A2E1A15; padding: 35px 25px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.01);">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px dashed #E5E7EB; padding-bottom: 12px;">
                  <span style="font-size: 15px; color: #555; font-weight: bold;">❖ نوع البرنامج المنهجي:</span>
                  <span style="font-size: 16px; color: #1A2E1A; font-weight: 800;">${planTypeName}</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px dashed #E5E7EB; padding-bottom: 12px;">
                  <span style="font-size: 15px; color: #555; font-weight: bold;">🌱 مقرر الحفظ الجديد:</span>
                  <span style="font-size: 16px; color: #1A2E1A; font-weight: 800;">${newMemText}</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1.5px dashed #E5E7EB; padding-bottom: 12px;">
                  <span style="font-size: 15px; color: #555; font-weight: bold; white-space: nowrap; margin-left: 15px;">📖 مقرر الحفظ القديم / المراجعة:</span>
                  <span style="font-size: 15px; color: #1A2E1A; font-weight: 800; text-align: left; max-width: 250px; line-height: 1.4; overflow-wrap: break-word;">${oldMemText}</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px dashed #E5E7EB; padding-bottom: 12px;">
                  <span style="font-size: 15px; color: #555; font-weight: bold;">⏳ مدة البرنامج المنهجي:</span>
                  <span style="font-size: 16px; color: #1A2E1A; font-weight: 800;">${durationText}</span>
                </div>
                <div style="display: flex; flex-direction: column; gap: 8px; align-items: flex-start; padding-top: 5px; text-align: right;">
                  <span style="font-size: 15px; color: #555; font-weight: bold; margin-bottom: 4px;">📅 الفترة الزمنية المخصصة:</span>
                  <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; font-size: 14.5px; color: #1A2E1A; font-weight: 800; padding-right: 15px;">
                    <span>• تاريخ البدء: ${startHijriStr}</span>
                    <span style="font-size: 12px; color: #b45309;">(${startDateStr} م)</span>
                  </div>
                  <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; font-size: 14.5px; color: #1A2E1A; font-weight: 800; padding-right: 15px; margin-top: 2px;">
                    <span>• تاريخ الانتهاء: ${endHijriStr}</span>
                    <span style="font-size: 12px; color: #b45309;">(${endDateStr} م)</span>
                  </div>
                </div>
              </div>
            </div>
            <div style="margin-bottom: 20px;">
              <div style="font-size: 22px; color: #D4AF37; margin-bottom: 10px;">❖ ══════════ ❖ ══════════ ❖</div>
              <p style="font-size: 12.5px; color: #777; margin: 0; font-weight: 500;">تم استخراج هذه الخطة بواسطة "خطة الحفظ الذكية" - ${new Date().toLocaleDateString("ar-EG")}</p>
            </div>
          </div>
        `;
      }

      tempContainer.appendChild(coverEl);
      pageElements.push(coverEl);

      // Render week pages
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const pageEl = document.createElement("div");
        pageEl.style.width = isCastleTowerStyle ? "1123px" : "794px";
        pageEl.style.boxSizing = "border-box";
        pageEl.style.marginBottom = "30px";

        if (isCastleTowerStyle) {
          const overallCastleIdx = getCastleIdxForDate(chunk[0].date);
          const castleTheme = CASTLES_THEMES[overallCastleIdx];
          const weekStartCastleIdx = getCastleIdxForDate(chunk[0].date);
          const weekEndCastleIdx = getCastleIdxForDate(chunk[chunk.length - 1].date);
          let castleBannerLabel = CASTLES_THEMES[weekStartCastleIdx].name;
          if (weekStartCastleIdx !== weekEndCastleIdx) {
            castleBannerLabel = `${CASTLES_THEMES[weekStartCastleIdx].name} و ${CASTLES_THEMES[weekEndCastleIdx].name}`;
          }

          pageEl.innerHTML = `
            <div style="padding: 25px 35px; background: #FFFDF9; width: 1123px; min-height: 794px; box-sizing: border-box; font-family: 'Cairo', sans-serif; display: flex; flex-direction: column; justify-content: space-between; direction: rtl; position: relative; border: 8px double ${castleTheme.color};">
              <div style="display: flex; justify-content: space-between; align-items: center; height: 75px; border-bottom: 2px solid ${castleTheme.color}; padding-bottom: 10px;">
                <div style="display: flex; align-items: center; gap: 15px;">
                  <svg style="width: 45px; height: 45px; fill: ${castleTheme.color};" viewBox="0 0 24 24">
                     <path d="M2,22V10l3-3v3h2V6l3-3v3h4V3l3 3v3h2V7l3 3v12H2 M20,20v-8h-2v3h-2v-3h-4v4h-2v-4H6v3H4v-3H2v8H20z" />
                  </svg>
                  <div style="text-align: right;">
                    <h1 style="font-size: 23px; font-weight: 900; color: ${castleTheme.textColor}; margin: 0; font-family: 'Cairo', sans-serif; line-height: 1.2;">منظومة القلاع السبع لحفظ القرآن وتثبيته</h1>
                    <div style="font-size: 12px; font-weight: bold; color: ${castleTheme.color}; margin-top: 1px; font-family: 'Cairo', sans-serif;">أسلوب التمكين بالبناء التراكمي المتقن</div>
                  </div>
                </div>
                <div style="text-align: left; display: flex; flex-direction: column; align-items: flex-end; gap: 3px;">
                  <div style="background: ${castleTheme.bannerBg}; border: 1px solid ${castleTheme.color}; color: ${castleTheme.textColor}; font-weight: 800; font-size: 13px; padding: 5px 14px; border-radius: 30px; font-family: 'Cairo', sans-serif;">
                     ${castleBannerLabel} | الأسبوع رقم ${i + 1}
                  </div>
                  <div style="font-size: 11px; color: #777; font-weight: 700; font-family: 'Cairo', sans-serif; margin-left: 5px;">
                     صفحة برنامج التمكين المتكامل
                  </div>
                </div>
              </div>
              <div style="display: flex; gap: 12px; justify-content: space-between; align-items: stretch; width: 100%; margin-top: 15px; flex-grow: 1; height: 580px; box-sizing: border-box;">
                ${chunk
                  .map((day) => {
                    const dayName = getArabicDayName(day.date);
                    const dayDateStr = format(day.date, "yyyy/MM/dd");
                    const hijriDateStr = getHijriDate(day.date);
                    const dayCastleIdx = getCastleIdxForDate(day.date);
                    const dayCastleTheme = CASTLES_THEMES[dayCastleIdx];

                    return `
                    <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: flex-end; position: relative; height: 100%; box-sizing: border-box;">
                      <div style="width: 100%; height: 32px; position: relative; display: block; overflow: visible; margin-bottom: -1px; z-index: 2;">
                        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style="width: 100%; height: 100%; display: block;">
                          <polygon points="50,0 0,100 100,100" fill="${dayCastleTheme.color}" />
                        </svg>
                      </div>
                      <div style="flex-grow: 1; border: 3px solid ${dayCastleTheme.color}; background: #FFFFFF; border-radius: 0 0 16px 16px; padding: 12px 7px; display: flex; flex-direction: column; justify-content: space-between; text-align: center; box-shadow: 0 4px 10px rgba(0,0,0,0.03); z-index: 1; min-height: 480px; box-sizing: border-box;">
                        <div style="display: flex; flex-direction: column; gap: 6px; flex-grow: 1; justify-content: flex-start; overflow: visible;">
                          ${(() => {
                            const d_week = (day.date.getDay() - (activePlan.firstDayOfWeek || 0) + 7) % 7;
                            const slots = [null, null, null, null, null] as (any | null)[];

                            if (day.tasks && day.tasks.length > 0) {
                              day.tasks.forEach((t: any) => {
                                const title = t.title || "";
                                const type = t.type || "";
                                const isListening = title.includes("استماع");
                                const isMemorization = title.includes("حفظ");
                                const isFixation = title.includes("تثبيت");
                                const isOldReview = title.includes("المحفوظ القديم") || title.includes("القديم");
                                const isCastleRev = getCastleIndexFromTaskTitle(title) !== null || title.includes("القلعة");
                                const isRecitation = title.includes("تسميع");
                                const isReviewWeek = title.includes("مراجعة محفوظ الأسبوع") || (type === "review" && !isCastleRev && !isOldReview);

                                if (d_week === 0 || d_week === 1 || d_week === 3 || d_week === 4) {
                                  if (isListening) slots[0] = t;
                                  else if (isMemorization) slots[1] = t;
                                  else if (isFixation) slots[2] = t;
                                  else if (isOldReview) slots[3] = t;
                                  else if (isCastleRev) slots[4] = t;
                                } else if (d_week === 2 || d_week === 5) {
                                  if (isFixation) slots[0] = t;
                                  else if (isRecitation) slots[1] = t;
                                  else if (isOldReview) slots[3] = t;
                                  else if (isCastleRev) slots[4] = t;
                                } else if (d_week === 6) {
                                  if (isReviewWeek) slots[0] = t;
                                  else if (isRecitation) slots[1] = t;
                                  else if (isOldReview) slots[3] = t;
                                  else if (isCastleRev) slots[4] = t;
                                }
                              });

                              day.tasks.forEach((t) => {
                                const alreadyAssigned = slots.some((s) => s && s.id === t.id);
                                if (!alreadyAssigned) {
                                  const emptyIdx = slots.indexOf(null);
                                  if (emptyIdx !== -1) {
                                    slots[emptyIdx] = t;
                                  }
                                }
                              });
                            }

                            if (!day.tasks || day.tasks.length === 0) {
                              return `
                              <div style="flex: 1; border: 1px dashed rgba(0,0,0,0.02); border-radius: 8px; box-sizing: border-box; background: transparent;"></div>
                              <div style="flex: 1; padding: 4px 6px; border-radius: 8px; font-size: 9px; font-weight: bold; background: #94a3b812; border: 1px dashed #94a3b830; text-align: center; color: #64748b; line-height: 1.4; font-family: 'Cairo', sans-serif; display: flex; flex-direction: column; justify-content: center; box-sizing: border-box; min-height: 90px;">
                                 <div style="font-size: 13px; margin-bottom: 2px;">🌸</div>
                                 <div>يوم مراجعة حرة</div>
                              </div>
                              <div style="flex: 1; border: 1px dashed rgba(0,0,0,0.02); border-radius: 8px; box-sizing: border-box; background: transparent; min-height: 90px;"></div>
                              <div style="flex: 1; border: 1px dashed rgba(0,0,0,0.02); border-radius: 8px; box-sizing: border-box; background: transparent; min-height: 90px;"></div>
                              <div style="flex: 1; border: 1px dashed rgba(0,0,0,0.02); border-radius: 8px; box-sizing: border-box; background: transparent; min-height: 90px;"></div>
                            `;
                            }

                            const isThreeGroup = d_week === 0 || d_week === 1 || d_week === 3 || d_week === 4;
                            const groupedSlots = isThreeGroup ? [slots[0], slots[1], slots[2]] : [slots[0], slots[1]];
                            const hasGroupedTasks = groupedSlots.some((t) => t !== null);

                            let groupedHTML = "";
                            if (hasGroupedTasks) {
                              let sharedPortion = "";
                              groupedSlots.forEach((t) => {
                                if (t && !sharedPortion) {
                                  const parsed = parseCustomTask(t.title);
                                  if (parsed) sharedPortion = parsed.portion;
                                }
                              });
                              if (!sharedPortion) {
                                const activeT = groupedSlots.find((t) => t !== null);
                                if (activeT) {
                                  sharedPortion = activeT.title.replace(/^(استماع|حفظ|تثبيت|تسميع|مراجعة|تثبيت المقدار الجديد|حفظ جديد)[:\s]*/, "").trim();
                                }
                              }

                              const actionBars = groupedSlots
                                .map((t) => {
                                  if (!t) return "";
                                  const isCastleRev = getCastleIndexFromTaskTitle(t.title);
                                  let taskColor = getTaskColorLocal(t.type);
                                  if (isCastleRev !== null) taskColor = CASTLES_THEMES[isCastleRev].color;
                                  const parsed = parseCustomTask(t.title);
                                  const actionText = parsed ? parsed.action : t.title;

                                  return `
                                  <div style="padding: 3px 6px; border-radius: 5px; font-size: 8.8px; font-weight: bold; background: ${taskColor}12; border: 1.2px solid ${taskColor}25; color: ${taskColor}; text-align: right; line-height: 1.25; display: flex; align-items: center; justify-content: space-between; flex: 1; min-height: 20px; box-sizing: border-box;">
                                    <span style="font-size: 8.8px; font-weight: 850; white-space: nowrap;">${actionText}</span>
                                    ${t.targetCount > 1 ? `<span style="font-size: 7px; opacity: 0.85; font-family: 'Cairo', sans-serif;">تكرار: ${t.targetCount}x</span>` : ""}
                                  </div>
                                `;
                                })
                                .filter(Boolean)
                                .join("");

                              const flexCount = isThreeGroup ? 3 : 2;
                              groupedHTML = `
                                <div style="flex: ${flexCount}; padding: 5px; border-radius: 8px; border: 1.5px dashed ${dayCastleTheme.color}35; background: ${dayCastleTheme.color}04; display: flex; flex-direction: column; justify-content: flex-start; gap: 4px; box-sizing: border-box; overflow: visible;">
                                   <div style="font-size: 8.2px; font-weight: 800; color: #1e293b; background: #ffffff; border: 1.2px solid ${dayCastleTheme.color}25; padding: 2px 4px; border-radius: 4px; text-align: center; overflow-wrap: break-word; word-break: break-word; line-height: 1.2; font-family: 'Cairo', sans-serif; display: flex; align-items: center; justify-content: center; min-height: 24px;">
                                     ${sharedPortion || "المقرر اليومي"}
                                   </div>
                                   <div style="display: flex; flex-direction: column; gap: 3.5px; flex-grow: 1; justify-content: flex-start;">
                                     ${actionBars}
                                   </div>
                                </div>
                              `;
                            } else {
                              const flexCount = isThreeGroup ? 3 : 2;
                              groupedHTML = `<div style="flex: ${flexCount}; border: 1px dashed rgba(0,0,0,0.02); border-radius: 8px; box-sizing: border-box; background: transparent;"></div>`;
                            }

                            const emptySlot2HTML = !isThreeGroup ? `<div style="flex: 1; border: 1px dashed rgba(0,0,0,0.02); border-radius: 8px; box-sizing: border-box; background: transparent;"></div>` : "";

                            const renderSingleSlot = (t: any) => {
                              if (!t) return `<div style="flex: 1; border: 1px dashed rgba(0,0,0,0.02); border-radius: 8px; box-sizing: border-box; background: transparent;"></div>`;
                              const isCastleRev = getCastleIndexFromTaskTitle(t.title);
                              let taskColor = getTaskColorLocal(t.type);
                              if (isCastleRev !== null) taskColor = CASTLES_THEMES[isCastleRev].color;
                              const customParsed = parseCustomTask(t.title);

                              if (customParsed) {
                                return `
                                  <div style="flex: 1; padding: 4px 6px; border-radius: 8px; font-size: 9px; font-weight: bold; background: ${taskColor}12; border: 1px solid ${taskColor}25; text-align: right; color: ${taskColor}; line-height: 1.35; font-family: 'Cairo', sans-serif; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box;">
                                     <div style="font-size: 8.2px; font-weight: 800; color: #1e293b; background: #ffffff; border: 1.2px solid ${taskColor}20; padding: 2px 4px; border-radius: 4px; margin-bottom: 2px; white-space: normal; line-height: 1.15; text-align: center; overflow-wrap: break-word; word-break: break-word;">
                                       ${customParsed.portion}
                                      </div>
                                     <div style="display: flex; align-items: center; gap: 3px; margin-top: auto; border-top: 1px dashed ${taskColor}20; padding-top: 1.5px;">
                                       <span style="font-size: 9px; font-weight: 850; color: ${taskColor}; white-space: nowrap;">${customParsed.action}</span>
                                     </div>
                                     ${t.targetCount > 1 ? `<div style="opacity: 0.85; font-size: 7px; margin-top: 1px; text-align: left;">تكرار: ${t.targetCount}x</div>` : ""}
                                  </div>
                                `;
                              }

                              return `
                                <div style="flex: 1; padding: 4px 6px; border-radius: 8px; font-size: 9px; font-weight: bold; background: ${taskColor}12; border: 1px solid ${taskColor}25; text-align: right; color: ${taskColor}; line-height: 1.3; font-family: 'Cairo', sans-serif; display: flex; flex-direction: column; justify-content: flex-start; box-sizing: border-box;">
                                   <div style="display: flex; align-items: flex-start; gap: 3px;">
                                     <span style="font-weight: normal; font-size: 10px; margin-top: -1.5px; flex-shrink: 0;">☐</span>
                                     <span style="width: 100%; white-space: normal; line-height: 1.22; overflow-wrap: break-word; word-break: break-word; font-size: 8.5px;">${t.title}</span>
                                   </div>
                                   ${t.targetCount > 1 ? `<div style="opacity: 0.85; font-size: 7px; margin-top: auto; padding-top: 1px; text-align: left;">تكرار: ${t.targetCount}x</div>` : ""}
                                </div>
                              `;
                            };

                            return groupedHTML + emptySlot2HTML + renderSingleSlot(slots[3]) + renderSingleSlot(slots[4]);
                          })()}
                        </div>
                        <div style="margin-top: auto; padding-top: 8px; border-top: 2px dashed ${dayCastleTheme.color}25; text-align: center;">
                           <div style="font-size: 14px; font-weight: 900; color: ${dayCastleTheme.textColor}; font-family: 'Cairo', sans-serif;">${dayName}</div>
                           <div style="font-size: 9px; color: #D4AF37; font-weight: bold; margin-top: 2px; font-family: 'Cairo', sans-serif;">${hijriDateStr}</div>
                           <div style="font-size: 9px; color: #888; font-weight: bold; margin-top: 1px; font-family: 'Cairo', sans-serif;">${dayDateStr}</div>
                        </div>
                      </div>
                    </div>
                  `;
                  })
                  .join("")}
              </div>
              <div style="margin-top: 15px; padding-top: 8px; border-top: 1px dashed #E5E7EB; display: flex; justify-content: space-between; align-items: center; width: 100%; font-size: 11px; color: #9CA3AF; font-weight: bold; height: 20px;">
                <div style="font-family: 'Cairo', sans-serif;">
                  برنامج القلاع السبع للتمكين | صفحة ${i + 1} من ${chunks.length}
                </div>
                <div style="font-family: 'Cairo', sans-serif;">
                  تم استخراج هذه الخطة التراكمية بواسطة "خطة الحفظ الذكية" - ${new Date().toLocaleDateString("ar-EG")}
                </div>
              </div>
            </div>
          `;
        } else {
          const titleText = activePlan.isSevenCastles
            ? "خطة القلاع السبع لحفظ القرآن الكريم"
            : activePlan.planType === "review"
              ? "خطة مراجعة القرآن الكريم"
              : "خطة حفظ القرآن الكريم";
          const subtitleText = activePlan.isSevenCastles
            ? `خطة القلاع السبع - أسبوع ${i + 1}`
            : activePlan.planType === "review"
              ? `خطة مراجعة - أسبوع ${i + 1}`
              : `${activePlan.juzNumber ? `الجزء رقم ${activePlan.juzNumber}` : "خطة مخصصة"} - أسبوع ${i + 1}`;

          pageEl.innerHTML = `
            <div style="padding: 24px; background: #FDFBF7; min-height: 1123px; width: 794px; box-sizing: border-box; font-family: 'Cairo', sans-serif; display: flex; flex-direction: column; overflow: visible;">
              <div style="text-align: center; margin-bottom: 15px; border-bottom: 2px solid #1A2E1A; padding-bottom: 8px;">
                <h1 style="font-size: 22px; color: #1A2E1A; margin: 0; font-family: 'Cairo', sans-serif;">${titleText}</h1>
                <p style="font-size: 14px; color: #D4AF37; margin: 4px 0; font-family: 'Cairo', sans-serif;">${subtitleText}</p>
              </div>
              <table style="width: 100%; border-collapse: collapse; font-size: 13px; flex-grow: 1; border: 2px solid #1A2E1A;">
                <thead>
                  <tr style="background: #1A2E1A; color: white;">
                    <th style="padding: 8px 12px; border: 2px solid #1A2E1A; text-align: right; width: 25%;">اليوم والتاريخ</th>
                    <th style="padding: 8px 12px; border: 2px solid #1A2E1A; text-align: right;">المهام المطلوبة</th>
                  </tr>
                </thead>
                <tbody>
                  ${chunk
                    .map((day, idx) => {
                      const dayName = getArabicDayName(day.date);
                      const dayDateStr = format(day.date, "yyyy/MM/dd");
                      const hijriDateStr = getHijriDate(day.date);
                      return `
                      <tr style="background: ${idx % 2 === 0 ? "white" : "#f9f9f9"}">
                        <td style="padding: 8px 12px; border: 2px solid #1A2E1A;">
                          <div style="font-weight: bold; font-size: 13.5px; font-family: 'Cairo', sans-serif;">${dayName}</div>
                          <div style="font-size: 10.5px; color: #b45309; font-weight: bold; margin-top: 2px; font-family: 'Cairo', sans-serif;">${hijriDateStr}</div>
                          <div style="font-size: 11px; color: #666; font-family: 'Cairo', sans-serif;">${dayDateStr}</div>
                        </td>
                        <td style="padding: 8px 12px; border: 2px solid #1A2E1A;">
                          <ul style="padding-right: 0; margin: 0; font-family: 'Cairo', sans-serif; list-style: none;">
                            ${(() => {
                              if (!day.tasks || day.tasks.length === 0) {
                                return `<li style="color: #666; font-family: 'Cairo', sans-serif; font-weight: bold; font-size: 13px;">يوم راحة</li>`;
                              }

                              const dayGroups: { key: string; label: string; tasks: any[]; }[] = [];
                              day.tasks.forEach((t: any) => {
                                const cleanLabel = getCleanGroupLabel(t.title);
                                const partMatch = t.id ? t.id.toString().match(/-part\d+/) : null;
                                const partSuffix = partMatch ? partMatch[0] : "";
                                const key = t.pages && t.pages.length > 0
                                  ? 'group-' + t.pages.join(',') + '-' + cleanLabel + partSuffix
                                  : `task-${t.id || cleanLabel}`;

                                let group = dayGroups.find((g) => g.key === key);
                                if (!group) {
                                  group = { key, label: cleanLabel, tasks: [] };
                                  dayGroups.push(group);
                                }
                                group.tasks.push(t);
                              });

                              return dayGroups
                                .map((group, groupIdx) => {
                                  if (group.tasks.length === 1) {
                                    const t = group.tasks[0];
                                    const isCastleRev = getCastleIndexFromTaskTitle(t.title);
                                    const color = isCastleRev !== null ? CASTLES_THEMES[isCastleRev].color : getTaskColorLocal(t.type);
                                    const repeatText = t.targetCount > 1 ? ` (تكرار: ${t.targetCount}x)` : "";

                                    return `
                                    <li style="padding-bottom: 4px; margin-bottom: 4px; font-family: 'Cairo', sans-serif; font-weight: bold; font-size: 13.5px; line-height: 1.35; display: block; color: ${color}; ${groupIdx !== dayGroups.length - 1 ? "border-bottom: 1px dashed #ccc;" : ""}">
                                      <span style="font-size: 16px; margin-left: 6px; font-weight: normal; vertical-align: middle;">☐</span>
                                      <span style="vertical-align: middle;">${t.title}${repeatText}</span>
                                    </li>
                                  `;
                                  } else {
                                    const firstTask = group.tasks[0];
                                    const isCastleRev = getCastleIndexFromTaskTitle(firstTask.title);
                                    const groupColor = isCastleRev !== null ? CASTLES_THEMES[isCastleRev].color : "#1A2E1A";

                                    return `
                                    <li style="padding-bottom: 6px; margin-bottom: 6px; font-family: 'Cairo', sans-serif; display: block; ${groupIdx !== dayGroups.length - 1 ? "border-bottom: 1px dashed #ccc;" : ""}">
                                      <div style="font-weight: 800; font-size: 14px; color: ${groupColor}; margin-bottom: 4px; display: flex; align-items: center; gap: 4px;">
                                        <span>📖</span>
                                        <span>المقرر: ${group.label}</span>
                                      </div>
                                      <div style="display: flex; flex-direction: row; flex-wrap: wrap; gap: 12px; margin-right: 10px; align-items: center;">
                                        ${group.tasks
                                          .map((t: any) => {
                                            const itemCastleRev = getCastleIndexFromTaskTitle(t.title);
                                            const tColor = itemCastleRev !== null ? CASTLES_THEMES[itemCastleRev].color : getTaskColorLocal(t.type);
                                            const taskName = t.type === "memorization" ? "حفظ" : t.type === "fixation" ? "تثبيت" : t.type === "review" ? "مراجعة" : t.type === "cumulative_review" ? "تراكمي" : t.type === "listening" ? "استماع" : "تسميع";
                                            const repeatText = t.targetCount > 1 ? ` (${t.targetCount}x)` : "";
                                            return `
                                            <span style="font-size: 12.5px; font-weight: bold; color: ${tColor}; display: flex; align-items: center; gap: 4px;">
                                              <span style="font-size: 16px; font-weight: normal; color: #777; vertical-align: middle;">☐</span>
                                              <span style="vertical-align: middle;">${taskName}${repeatText}</span>
                                            </span>
                                          `;
                                          })
                                          .join("")}
                                      </div>
                                    </li>
                                  `;
                                  }
                                })
                                .join("");
                            })()}
                          </ul>
                        </td>
                      </tr>
                    `;
                    })
                    .join("")}
                </tbody>
              </table>
              <div style="margin-top: auto; padding-top: 15px; text-align: center; font-size: 11px; color: #999; font-family: 'Cairo', sans-serif;">
                صفحة ${i + 1} من ${chunks.length} | تم استخراج هذه الخطة بواسطة "خطة الحفظ الذكية" - ${new Date().toLocaleDateString("ar-EG")}
              </div>
            </div>
          `;
        }

        tempContainer.appendChild(pageEl);
        pageElements.push(pageEl);
      }

      // Capture pages
      const capturedImages: string[] = [];
      for (let i = 0; i < pageElements.length; i++) {
        const progressMessage = i === 0
          ? `جاري معالجة صفحة الغلاف الرئيسية... (إجمالي ${pageElements.length} صفحات)`
          : `جاري معالجة الأسبوع ${i} من أصل ${pageElements.length - 1}... (إجمالي ${pageElements.length} صفحات)`;
        setExportProgressBooklet(progressMessage);

        const pageEl = pageElements[i];
        
        // --- Apply scaling wrapper for PDF export ---
        const innerDiv = pageEl.firstElementChild as HTMLElement;
        let originalParent = null;
        let wrapper = null;
        if (innerDiv) {
          const contentHeight = innerDiv.scrollHeight;
          const targetHeight = isCastleTowerStyle ? 794 : 1123;
          const targetWidth = isCastleTowerStyle ? 1123 : 794;
          if (contentHeight > targetHeight) {
            const scale = targetHeight / contentHeight;
            wrapper = document.createElement("div");
            wrapper.style.width = `${targetWidth}px`;
            wrapper.style.height = `${targetHeight}px`;
            wrapper.style.overflow = "hidden";
            wrapper.style.display = "flex";
            wrapper.style.justifyContent = "center";
            
            innerDiv.style.transform = `scale(${scale})`;
            innerDiv.style.transformOrigin = "top center";
            innerDiv.style.height = `${contentHeight}px`;
            innerDiv.style.width = `${targetWidth}px`;
            innerDiv.style.maxHeight = "none";
            innerDiv.style.flexShrink = "0";
            
            originalParent = innerDiv.parentNode;
            originalParent.replaceChild(wrapper, innerDiv);
            wrapper.appendChild(innerDiv);
          }
        }
        // --------------------------------------------

        const restoreColors = patchColorsForHtml2Canvas(pageEl);
        let canvas;
        try {
          canvas = await html2canvas(pageEl, {
            scale: 3,
            useCORS: true,
            backgroundColor: isCastleTowerStyle ? "#FFFDF9" : "#FDFBF7",
            logging: false,
          });
        } finally {
          restoreColors();
        }

        // --- Undo scaling wrapper ---
        if (wrapper && innerDiv && originalParent) {
           wrapper.removeChild(innerDiv);
           originalParent.replaceChild(innerDiv, wrapper);
           innerDiv.style.transform = "";
           innerDiv.style.transformOrigin = "";
           innerDiv.style.height = "";
           innerDiv.style.width = "";
           innerDiv.style.maxHeight = "";
           innerDiv.style.flexShrink = "";
        }
        // ----------------------------
        
        const imgData = canvas.toDataURL("image/png");
        capturedImages.push(imgData);

        canvas.width = 0;
        canvas.height = 0;
      }

      // Booklet imposition
      setExportProgressBooklet("جاري تطبيق نظام الفرز والترتيب الاحترافي للكتيب (Booklet Imposition)...");

      const originalCount = capturedImages.length;
      const remainder = originalCount % 4;
      const padCount = remainder === 0 ? 0 : 4 - remainder;
      const paddedImages = [...capturedImages];
      for (let i = 0; i < padCount; i++) {
        paddedImages.push("");
      }

      const N = paddedImages.length;
      const S = N / 4;

      const rotatedPaddedImages = [...paddedImages];
      if (isCastleTowerStyle) {
        setExportProgressBooklet("جاري تدوير الصفحات...");
        const rotateImage180 = (src: string): Promise<string> => {
          return new Promise((resolve) => {
            if (!src) return resolve(src);
            const img = new Image();
            img.onload = () => {
              const c = document.createElement("canvas");
              c.width = img.width;
              c.height = img.height;
              const ctx = c.getContext("2d");
              if (ctx) {
                ctx.translate(img.width / 2, img.height / 2);
                ctx.rotate(Math.PI);
                ctx.drawImage(img, -img.width / 2, -img.height / 2);
                resolve(c.toDataURL("image/png", 0.7));
              } else {
                resolve(src);
              }
            };
            img.onerror = () => resolve(src);
            img.src = src;
          });
        };
        for (let s = 0; s < S; s++) {
          const frontRightIdx = N - 1 - 2 * s;
          const backRightIdx = 2 * s + 1;
          const backLeftIdx = N - 2 - 2 * s;
          if (rotatedPaddedImages[frontRightIdx]) rotatedPaddedImages[frontRightIdx] = await rotateImage180(rotatedPaddedImages[frontRightIdx]);
          if (rotatedPaddedImages[backRightIdx]) rotatedPaddedImages[backRightIdx] = await rotateImage180(rotatedPaddedImages[backRightIdx]);
          if (rotatedPaddedImages[backLeftIdx]) rotatedPaddedImages[backLeftIdx] = await rotateImage180(rotatedPaddedImages[backLeftIdx]);
        }
      }

      let jsPdfPaper = "a4";
      if (bookletPaperSize === "a3_to_a4") jsPdfPaper = "a3";
      else if (bookletPaperSize === "letter") jsPdfPaper = "letter";
      else if (bookletPaperSize === "legal") jsPdfPaper = "legal";



      const pdfOrientation = isCastleTowerStyle ? "p" : "l";
      const pdf = new jsPDF(pdfOrientation, "mm", jsPdfPaper);

      const W = pdf.internal.pageSize.getWidth();
      const H = pdf.internal.pageSize.getHeight();
      const g = bookletGutter;
      const outerMargin = bookletOuterMargin;

      let slotW, slotH, leftX, rightX, topY, bottomY;
      
      if (isCastleTowerStyle) {
        const halfH = H / 2;
        slotW = W - 2 * outerMargin;
        slotH = halfH - outerMargin - g / 2;
        topY = outerMargin;
        bottomY = halfH + g / 2;
        leftX = outerMargin; // not really left/right, just full width
        rightX = outerMargin;
      } else {
        const halfW = W / 2;
        slotW = halfW - outerMargin - g / 2;
        slotH = H - 2 * outerMargin;
        leftX = outerMargin;
        rightX = halfW + g / 2;
        topY = outerMargin;
        bottomY = outerMargin;
      }

      for (let s = 0; s < S; s++) {
        // FRONT SIDE
        if (s > 0) {
          pdf.addPage(jsPdfPaper, pdfOrientation);
        }
        
        const frontLeftIdx = 2 * s; 
        if (paddedImages[frontLeftIdx]) {
          pdf.addImage(
            paddedImages[frontLeftIdx],
            "PNG",
            isCastleTowerStyle ? leftX : leftX,
            isCastleTowerStyle ? bottomY : topY, // Castle: Bottom half
            slotW,
            slotH,
            undefined,
            "FAST"
          );
        }

        const frontRightIdx = N - 1 - 2 * s;
        if (paddedImages[frontRightIdx]) {
          pdf.addImage(
            isCastleTowerStyle && rotatedPaddedImages[frontRightIdx] ? rotatedPaddedImages[frontRightIdx] : paddedImages[frontRightIdx],
            "PNG",
            isCastleTowerStyle ? leftX : rightX, 
            isCastleTowerStyle ? topY : topY, // Castle: Top half
            slotW,
            slotH,
            undefined,
            "FAST"
          );
        }

        pdf.addPage(jsPdfPaper, pdfOrientation);

        const backRightIdx = 2 * s + 1; 
        if (paddedImages[backRightIdx]) {
          pdf.addImage(
            isCastleTowerStyle && rotatedPaddedImages[backRightIdx] ? rotatedPaddedImages[backRightIdx] : paddedImages[backRightIdx],
            "PNG",
            isCastleTowerStyle ? leftX : rightX, 
            isCastleTowerStyle ? bottomY : topY, // Castle: Bottom half
            slotW,
            slotH,
            undefined,
            "FAST"
          );
        }
        
        const backLeftIdx = N - 2 - 2 * s; 
        if (paddedImages[backLeftIdx]) {
          pdf.addImage(
            isCastleTowerStyle && rotatedPaddedImages[backLeftIdx] ? rotatedPaddedImages[backLeftIdx] : paddedImages[backLeftIdx],
            "PNG",
            isCastleTowerStyle ? leftX : leftX, 
            isCastleTowerStyle ? topY : topY, // Castle: Top half
            slotW,
            slotH,
            undefined,
            "FAST"
          );
        }
      }

      setExportProgressBooklet("جاري تحضير ملف الكتيب للمشاركة...");

      const minPage = Math.min(activePlan.startPage, activePlan.endPage);
      const maxPage = Math.max(activePlan.startPage, activePlan.endPage);

      let descriptionStr = "";
      if (activePlan.isSevenCastles) {
        descriptionStr = "منظومة_القلاع_السبع";
      } else if (activePlan.planType === "juz") {
        descriptionStr = `خطة_حفظ_الجزء_${activePlan.juzNumber}`;
      } else if ((activePlan.planType as any) === "surah") {
        descriptionStr = `خطة_حفظ_سور`;
      } else if (activePlan.planType === "review") {
        descriptionStr = "خطة_المراجعة_والتثبيت";
      } else {
        descriptionStr = "خطة_الحفظ_المخصصة";
      }

      const amountSuffix = activePlan.planType !== "review" ? `_من_صفحة_${minPage}_إلى_${maxPage}` : "";
      const sizeSuffix = `_كُتيب_${bookletPaperSize.toUpperCase()}`;
      const sanitizeForFilename = (str: string): string => {
        return str
          .replace(/\s+/g, "_")
          .replace(/[^()0-9a-zA-Z\u0600-\u06FF\-_]/g, "");
      };

      const rawFileName = "كتيب_" + descriptionStr + amountSuffix + sizeSuffix;
      const fileName = `${sanitizeForFilename(rawFileName)}.pdf`;

      if (mode === "download") {
        setExportProgressBooklet("جاري تنزيل ملف الكتيب مباشرة على جهازك...");
        pdf.save(fileName);
        setExportProgressBooklet("تم تنزيل الكتيب بنجاح!");
        setTimeout(() => setExportProgressBooklet(""), 2000);
      } else if (mode === "print") {
        setExportProgressBooklet("جاري فتح نافذة الطباعة مباشرة...");
        pdf.autoPrint();
        const blobUrl = pdf.output("bloburl");
        
        let printWindowOpened = false;
        try {
          const printWindow = window.open(blobUrl.toString(), "_blank");
          if (printWindow) {
            printWindowOpened = true;
          }
        } catch (e) {
          console.warn("window.open for booklet PDF failed", e);
        }

        if (!printWindowOpened) {
          const iframe = document.createElement("iframe");
          iframe.style.position = "fixed";
          iframe.style.right = "0";
          iframe.style.bottom = "0";
          iframe.style.width = "0";
          iframe.style.height = "0";
          iframe.style.border = "none";
          iframe.src = blobUrl.toString();
          document.body.appendChild(iframe);
          iframe.onload = () => {
            setTimeout(() => {
              iframe.contentWindow?.focus();
              iframe.contentWindow?.print();
              setTimeout(() => {
                if (document.body.contains(iframe)) {
                  document.body.removeChild(iframe);
                }
              }, 2000);
            }, 500);
          };
        }
      } else {
        const blob = pdf.output("blob");
        const file = new File([blob], fileName, { type: "application/pdf" });
        if (navigator.share) {
          try {
            await navigator.share({
              files: [file],
              title: "كتيب خطة حفظ القرآن الكريم",
              text: "تفضل ملف كتيب خطة حفظ القرآن الكريم الخاصة بي",
            });
          } catch (shareError: any) {
            console.warn("Share failed or was cancelled", shareError);
            if (shareError && shareError.name === "AbortError") {
              // User cancelled or action was not allowed, do not force download
            } else {
              setShareModalConfig({ isOpen: true, fileName, pdf });
            }
          }
        } else {
          setShareModalConfig({ isOpen: true, fileName, pdf });
        }
      }

    } catch (err) {
      console.error("Booklet export failed", err);
    } finally {
      setIsExportingBooklet(false);
      setIsPrintingBooklet(false);
      if (mode !== "download") {
        setExportProgressBooklet("");
      }
      setShowBookletModal(false);
      if (document.body.contains(tempContainer)) {
        document.body.removeChild(tempContainer);
      }
    }
  };

  const exportBackup = async () => {
    const plans = await db.plans.toArray();
    const progress = await db.progress.toArray();
    const achievements = await db.achievements.toArray();

    const data = {
      plans,
      progress,
      achievements,
      exportDate: new Date().toISOString(),
      version: "1.0.0",
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `quran-backup-${format(new Date(), "yyyy-MM-dd")}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClearData = async () => {
    setIsClearing(true);
    try {
      await clearAllData();
      window.location.href = "/";
    } catch (error) {
      console.error("Failed to clear data", error);
      setIsClearing(false);
    }
  };

  const handleDeleteActivePlan = async () => {
    if (!activePlan || !activePlan.id) return;
    setIsDeletingPlan(true);
    try {
      // Preserve Adhkar if they are in the plan but not already enabled/populated in global preferences
      if (activePlan.adhkarList && activePlan.adhkarList.length > 0) {
        // If global adhkar are not enabled or the list is just the default/empty, migrate them
        const isDefaultList = globalAdhkarList.length === 3 && 
                             globalAdhkarList[0].dhikr === 'سبحان الله وبحمده' &&
                             globalAdhkarList[1].dhikr === 'أستغفر الله العظيم وأتوب إليه';
        const isEmptyList = globalAdhkarList.length === 0 || (globalAdhkarList.length === 1 && !globalAdhkarList[0].dhikr);

        if (!globalAdhkarEnabled || isDefaultList || isEmptyList) {
          await updatePreferences({ 
            globalAdhkarList: activePlan.adhkarList,
            globalAdhkarEnabled: true
          });
        }
      }

      await deletePlan(activePlan.id);
      setShowDeletePlanModal(false);
      window.location.href = "/";
    } catch (error) {
      console.error("Failed to delete plan", error);
    } finally {
      setIsDeletingPlan(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold dark:text-white">الإعدادات</h2>

      <div className="space-y-4">
        {/* Theme Settings */}
        <section className="bg-white dark:bg-orange-950/10 rounded-[32px] border border-[#1A2E1A]/5 dark:border-orange-500/20 border-r-4 border-r-orange-500 shadow-sm overflow-hidden transition-all duration-300">
          <div className="p-4 border-b border-gray-50 dark:border-orange-500/10 flex items-center gap-3">
            <div className="bg-orange-50 dark:bg-orange-950/40 p-2 rounded-xl">
              <Sun className="w-5 h-5 text-orange-500" />
            </div>
            <h3 className="font-bold text-sm dark:text-orange-300">المظهر</h3>
          </div>
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isDarkMode ? (
                <Moon className="w-5 h-5 text-[#D4AF37]" />
              ) : (
                <Sun className="w-5 h-5 text-gray-400" />
              )}
              <span className="text-sm font-medium dark:text-gray-300">
                الوضع الليلي
              </span>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className={`w-14 h-7 rounded-full p-1 flex transition-all duration-300 shadow-inner cursor-pointer ${
                isDarkMode
                  ? "bg-[#D4AF37] justify-end"
                  : "bg-gray-200 justify-start"
              }`}
            >
              <motion.div
                layout
                transition={{ type: "spring", stiffness: 600, damping: 30 }}
                className="w-5 h-5 bg-white rounded-full shadow-lg border border-black/5"
              />
            </button>
          </div>

          {/* Theme Mode Selector */}
          <div className="p-4 pt-0 border-t border-gray-50/50 dark:border-orange-500/10 space-y-3 font-rtl">
            <label className="text-xs text-gray-400 dark:text-gray-500 block font-bold">
              طريقة التبديل للوضع الليلي:
            </label>
            <div className="flex p-0.5 bg-gray-100 dark:bg-black/30 rounded-xl border border-gray-100 dark:border-white/5">
              <button
                type="button"
                onClick={() => setThemeMode("auto")}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  themeMode === "auto"
                    ? "bg-white dark:bg-[#2C2C2C] text-orange-600 dark:text-[#D4AF37] shadow-sm font-extrabold"
                    : "text-gray-400 dark:text-gray-500"
                }`}
              >
                <span>تلقائي (الافتراضي - حسب الهاتف)</span>
              </button>
              <button
                type="button"
                onClick={() => setThemeMode("manual")}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  themeMode === "manual"
                    ? "bg-white dark:bg-[#2C2C2C] text-orange-600 dark:text-[#D4AF37] shadow-sm font-extrabold"
                    : "text-gray-400 dark:text-gray-500"
                }`}
              >
                <span>يدوي (تثبيت المظهر)</span>
              </button>
            </div>
            {themeMode === "auto" ? (
              <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center font-medium mt-1">
                * يتم تشغيل أو إيقاف الوضع الليلي تلقائياً تبعاً لإعدادات مظهر
                جهازك الحالي.
              </p>
            ) : (
              <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center font-medium mt-1">
                * تتيح لك الطريقة اليدوية تثبيت المظهر الحالي بغض النظر عن مظهر
                جهازك.
              </p>
            )}
          </div>
        </section>

        {/* Audio (Qari & Playback Rate) Settings */}
        <section className="bg-white dark:bg-sky-950/10 rounded-[32px] border border-[#1A2E1A]/5 dark:border-sky-500/20 border-r-4 border-r-sky-500 shadow-sm overflow-hidden transition-all duration-300">
          <div className="p-4 border-b border-gray-50 dark:border-sky-500/10 flex items-center gap-3">
            <div className="bg-blue-50 dark:bg-blue-950/40 p-2 rounded-xl">
              <Headphones className="w-5 h-5 text-blue-500" />
            </div>
            <h3 className="font-bold text-sm dark:text-sky-300">
              إعدادات الصوت والمقرئ
            </h3>
          </div>
          <div className="p-4 space-y-4">
            {/* Choosing Qari */}
            <div className="space-y-2 text-right">
              <label className="text-xs text-gray-400 dark:text-gray-500 block font-bold">
                المقرئ المفضل:
              </label>
              <select
                value={selectedQari}
                onChange={(e) => handleQariChange(e.target.value)}
                className="w-full text-xs bg-gray-50 dark:bg-white/5 dark:text-white border border-gray-100 dark:border-white/5 rounded-xl p-2.5 outline-none font-bold cursor-pointer"
              >
                <option
                  value="Minshawy_Murattal_128kbps"
                  className="dark:bg-[#1A1A1A]"
                >
                  الشيخ محمد صديق المنشاوي (مرتل)
                </option>
                <option value="Husary_128kbps" className="dark:bg-[#1A1A1A]">
                  الشيخ محمود خليل الحصري (مرتل)
                </option>
                <option
                  value="Abdul_Basit_Murattal_64kbps"
                  className="dark:bg-[#1A1A1A]"
                >
                  الشيخ عبد الباسط عبد الصمد (مرتل)
                </option>
                <option
                  value="Ayman_Sowaid_64kbps"
                  className="dark:bg-[#1A1A1A]"
                >
                  الشيخ الدكتور أيمن سويد
                </option>
                <option
                  value="Muhammad_Ayyoub_128kbps"
                  className="dark:bg-[#1A1A1A]"
                >
                  الشيخ محمد أيوب
                </option>
                <option value="Ghamadi_40kbps" className="dark:bg-[#1A1A1A]">
                  الشيخ سعد الغامدي
                </option>
                <option
                  value="MaherAlMuaiqly128kbps"
                  className="dark:bg-[#1A1A1A]"
                >
                  الشيخ ماهر المعيقلي
                </option>
              </select>
            </div>

            {/* Playback Speed */}
            <div className="space-y-2 text-right">
              <label className="text-xs text-gray-400 dark:text-gray-500 block font-bold">
                سرعة التشغيل:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {["1.0", "1.5", "2.0"].map((speed) => (
                  <button
                    key={speed}
                    type="button"
                    onClick={() => handleSpeedChange(speed)}
                    className={`px-2 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      playbackSpeed === speed
                        ? "bg-[#1A2E1A] text-white border-transparent"
                        : "bg-gray-50 dark:bg-white/5 text-gray-500 border-gray-100 dark:border-white/5 hover:bg-gray-100"
                    }`}
                  >
                    {speed === "1.0"
                      ? "طبيعي"
                      : speed === "2.0"
                        ? "2x"
                        : `${speed}x`}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="1.0"
                  max="2.0"
                  step="0.1"
                  value={playbackSpeed}
                  onChange={(e) => handleSpeedChange(e.target.value)}
                  className="flex-1 accent-[#1A2E1A] dark:accent-[#D4AF37] cursor-pointer"
                />
                <span className="text-xs font-bold font-mono dark:text-white w-10 text-center">
                  {playbackSpeed}x
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Global Adhkar Settings Card */}
        <section className="bg-white dark:bg-emerald-950/10 rounded-[32px] border border-[#1A2E1A]/5 dark:border-emerald-500/20 border-r-4 border-r-emerald-700 shadow-sm overflow-hidden transition-all duration-300">
          <div className="p-4 border-b border-gray-50 dark:border-emerald-500/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-xl">
                <Heart className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="text-right">
                <h3 className="font-bold text-sm dark:text-emerald-300">
                  الأذكار والمهام اليومية العامة
                </h3>
                <p className="text-[10px] text-gray-400 dark:text-gray-500">
                  تفعيل وظهور الأذكار والمهام اليومية المرافقة للصفحات والورد
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleToggleGlobalAdhkar(!globalAdhkarEnabled)}
              className={`w-14 h-7 rounded-full p-1 flex transition-all duration-300 shadow-inner cursor-pointer ${
                globalAdhkarEnabled
                  ? "bg-emerald-700 justify-end"
                  : "bg-gray-200 dark:bg-neutral-800 justify-start"
              }`}
            >
              <motion.div
                layout
                transition={{ type: "spring", stiffness: 600, damping: 30 }}
                className="w-5 h-5 bg-white rounded-full shadow-lg border border-black/5"
              />
            </button>
          </div>

          <AnimatePresence initial={false}>
            {globalAdhkarEnabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="p-4 space-y-4 bg-gray-50/30 dark:bg-black/10"
              >
                <div className="text-xs text-gray-500 dark:text-gray-400 bg-emerald-50/50 dark:bg-emerald-950/10 p-3 rounded-2xl border border-emerald-500/10 font-medium leading-relaxed font-rtl">
                  💡 تظهر هذه الأذكار كمهام يومية في صفحة المهام. يمكنك إضافتها،
                  تعديلها، أو ضبط تكرارات التسبيح الخاصة بكل ذكر حتى وإن لم تكن
                  هنالك خطة نشطة!
                </div>

                <div className="space-y-3">
                  {globalAdhkarList.map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col gap-3 p-3 bg-white dark:bg-[#151515] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm"
                    >
                      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                        <div className="flex-1">
                          <textarea
                            placeholder="اكتب الذكر أو المهمة اليومية المخصصة هنا..."
                            value={item.dhikr}
                            rows={1}
                            onInput={(e) => {
                              const target = e.target as HTMLTextAreaElement;
                              target.style.height = "auto";
                              target.style.height = `${target.scrollHeight}px`;
                            }}
                            onChange={(e) => {
                              const newList = [...globalAdhkarList];
                              newList[index].dhikr = e.target.value;
                              handleUpdateAdhkarList(newList);
                            }}
                            className="w-full bg-gray-50 dark:bg-black/20 dark:text-white border border-gray-100 dark:border-white/10 rounded-xl px-3 py-2 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-700 outline-none transition-all placeholder-gray-400 dark:placeholder-gray-600 resize-none overflow-hidden min-h-[38px] leading-relaxed"
                          />
                        </div>

                        <div className="flex items-center gap-2 justify-between sm:justify-end shrink-0">
                          <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-black/20 px-2.5 py-1.5 rounded-xl border border-gray-100 dark:border-white/5">
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold whitespace-nowrap">
                              العدد:
                            </span>
                            <input
                              type="number"
                              min="1"
                              value={item.count}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => {
                                const newList = [...globalAdhkarList];
                                newList[index].count = Math.max(
                                  1,
                                  parseInt(e.target.value) || 1,
                                );
                                handleUpdateAdhkarList(newList);
                              }}
                              className="w-12 bg-transparent dark:text-white border-none p-0 text-xs sm:text-sm font-extrabold text-center focus:ring-0 outline-none"
                              dir="ltr"
                            />
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={index === 0}
                              onClick={() => handleMoveUp(index)}
                              className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/15 rounded-lg transition-all disabled:opacity-20 disabled:pointer-events-none cursor-pointer"
                              title="ترتيب للأعلى"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              disabled={index === globalAdhkarList.length - 1}
                              onClick={() => handleMoveDown(index)}
                              className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/15 rounded-lg transition-all disabled:opacity-20 disabled:pointer-events-none cursor-pointer"
                              title="ترتيب للأسفل"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDhikrToDeleteIndex(index)}
                              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/10 rounded-lg transition-all cursor-pointer font-bold leading-none align-middle"
                              title="حذف"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateAdhkarList([
                        ...globalAdhkarList,
                        { dhikr: "", count: 1 },
                      ])
                    }
                    className="w-full py-2.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/10 dark:hover:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-dashed border-emerald-200 dark:border-emerald-900/50 rounded-2xl text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة ذكر أو مهمة عامة أخرى</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowDeleteAllAdhkarModal(true)}
                    className="w-full py-2.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/10 dark:hover:bg-red-950/20 text-red-700 dark:text-red-400 border border-dashed border-red-200 dark:border-red-900/50 rounded-2xl text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer font-rtl"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف جميع الأذكار</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Plan Settings */}
        {activePlan && (
          <section className="bg-white dark:bg-amber-950/10 rounded-[32px] border border-[#1A2E1A]/5 dark:border-amber-500/20 border-r-4 border-r-[#D4AF37] shadow-sm overflow-hidden transition-all duration-300">
            <div className="p-4 border-b border-gray-50 dark:border-amber-500/10 flex items-center gap-3">
              <div className="bg-amber-50 dark:bg-amber-950/40 p-2 rounded-xl">
                <Sliders className="w-5 h-5 text-amber-500" />
              </div>
              <h3 className="font-bold text-sm dark:text-amber-300">
                إعدادات الخطة النشطة
              </h3>
            </div>
            <div className="p-4 flex items-center justify-between">
              <div className="pl-2">
                <span className="text-sm font-bold block dark:text-white">
                  تعديل الخطة الحالية
                </span>
                <span className="text-[10px] text-gray-400 dark:text-gray-500 block">
                  تغيير مقدار الحفظ اليومي، أيام الحفظ أو الأوراد السابقة
                </span>
              </div>
              <Link
                to={`/plans/edit/${activePlan.id}`}
                className="px-4 py-2 bg-[#1A2E1A] dark:bg-[#D4AF37] hover:bg-opacity-90 text-white dark:text-[#1A1A1A] font-bold text-xs rounded-xl transition-all active:scale-95 shrink-0"
              >
                تعديل الخطة
              </Link>
            </div>
            <div className="p-4 border-t border-gray-50 dark:border-white/5 flex items-center justify-between">
              <div className="pl-2">
                <span className="text-sm font-bold block text-emerald-600 dark:text-emerald-400">
                  تصدير ومشاركة الخطة للطلاب
                </span>
                <span className="text-[10px] text-gray-400 dark:text-gray-500 block">
                  تنزيل ملف الخطة (.qplan) أو نسخ رمزها لمشاركتها لتتفعل عند أي طالب يستوردها
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowExportPlanModal(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all active:scale-95 shrink-0 flex items-center gap-1.5 cursor-pointer shadow-sm shadow-emerald-600/20"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>تصدير الخطة</span>
              </button>
            </div>
            <div className="p-4 border-t border-gray-50 dark:border-white/5 flex items-center justify-between">
              <div className="pl-2">
                <span className="text-sm font-bold block text-red-500">
                  حذف الخطة الحالية
                </span>
                <span className="text-[10px] text-gray-400 dark:text-gray-500 block">
                  سيتم حذف الخطة الحالية وجميع سجلات التقدم الخاصة بها نهائياً
                </span>
              </div>
              <button
                onClick={() => setShowDeletePlanModal(true)}
                className="px-4 py-2 bg-red-100 dark:bg-red-900/25 hover:bg-opacity-90 text-red-600 dark:text-red-400 font-bold text-xs rounded-xl transition-all active:scale-95 shrink-0"
              >
                حذف الخطة
              </button>
            </div>
          </section>
        )}

        {/* Offline Settings Card */}
        <section className="bg-white dark:bg-teal-950/10 rounded-[32px] border border-[#1A2E1A]/5 dark:border-teal-500/20 border-r-4 border-r-teal-500 shadow-sm overflow-hidden transition-all duration-300">
          <div className="p-4 border-b border-gray-50 dark:border-teal-500/10 flex items-center gap-3">
            <div className="bg-teal-50 dark:bg-teal-950/40 p-2 rounded-xl">
              <WifiOff className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm dark:text-teal-300">
                التنزيل والاستخدام بدون إنترنت (تنزيل اختياري)
              </h3>
              <p className="text-[10px] text-gray-400 dark:text-gray-500">
                حمل نصوص الآيات والمقاطع الصوتية مسبقاً لتتمكن من استخدام
                التطبيق بدون اتصال بالإنترنت
              </p>
            </div>
          </div>

          <div className="p-4 space-y-4">
            {/* Current States */}
            <div className="grid grid-cols-2 gap-3 bg-[#FDFBF7] dark:bg-[#1E1E1E] p-3 rounded-2xl border border-amber-500/10">
              <div className="text-center space-y-1 text-[#1A2E1A] dark:text-white">
                <span className="text-[10px] text-gray-400 dark:text-gray-500 block font-bold">
                  الصفحات المحفوظة
                </span>
                <span className="text-sm font-bold text-teal-600 dark:text-teal-400">
                  {cachedPagesCount} / 604
                </span>
              </div>
              <div className="text-center space-y-1 border-r border-gray-100 dark:border-white/5 text-[#1A2E1A] dark:text-white">
                <span className="text-[10px] text-gray-400 dark:text-gray-500 block font-bold">
                  المقاطع الصوتية
                </span>
                <span className="text-sm font-bold text-teal-600 dark:text-teal-400">
                  {cachedAudiosCount} مقطوعة
                </span>
              </div>
            </div>

            {/* Options Choices */}
            <div className="space-y-2">
              <span className="text-xs font-bold dark:text-gray-300 block">
                نطاق المحتوى المراد تنزيله:
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={() => setDownloadOption("plan")}
                  disabled={!activePlan}
                  className={`px-2 py-2 text-[11px] font-bold rounded-xl border transition-all cursor-pointer ${
                    downloadOption === "plan"
                      ? "bg-[#1A2E1A] text-white border-transparent shadow-sm"
                      : "bg-gray-50 dark:bg-white/5 text-gray-500 border-gray-100 dark:border-white/5 hover:bg-gray-100"
                  } disabled:opacity-50`}
                >
                  الخطة النشطة
                </button>
                <button
                  type="button"
                  onClick={() => setDownloadOption("juz")}
                  className={`px-2 py-2 text-[11px] font-bold rounded-xl border transition-all cursor-pointer ${
                    downloadOption === "juz"
                      ? "bg-[#1A2E1A] text-white border-transparent shadow-sm"
                      : "bg-gray-50 dark:bg-white/5 text-gray-500 border-gray-100 dark:border-white/5 hover:bg-gray-100"
                  }`}
                >
                  جزء محدد
                </button>
                <button
                  type="button"
                  onClick={() => setDownloadOption("quran")}
                  className={`px-2 py-2 text-[11px] font-bold rounded-xl border transition-all cursor-pointer ${
                    downloadOption === "quran"
                      ? "bg-[#1A2E1A] text-white border-transparent shadow-sm"
                      : "bg-gray-50 dark:bg-white/5 text-gray-500 border-gray-100 dark:border-white/5 hover:bg-gray-100"
                  }`}
                >
                  المصحف كاملاً
                </button>
                <button
                  type="button"
                  onClick={() => setDownloadOption("custom")}
                  className={`px-2 py-2 text-[11px] font-bold rounded-xl border transition-all cursor-pointer ${
                    downloadOption === "custom"
                      ? "bg-[#1A2E1A] text-white border-transparent shadow-sm"
                      : "bg-gray-50 dark:bg-white/5 text-gray-500 border-gray-100 dark:border-white/5 hover:bg-gray-100"
                  }`}
                >
                  نطاق مخصص
                </button>
              </div>
            </div>

            {/* Contextual Input Fields */}
            {downloadOption === "plan" && (
              <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-white/5 p-3 rounded-xl border border-dashed border-[#1A2E1A]/10 text-right">
                {activePlan ? (
                  <span>
                    سيتم تنزيل صفحات الخطة النشطة من ص{" "}
                    <strong>
                      {Math.min(activePlan.startPage, activePlan.endPage)}
                    </strong>{" "}
                    إلى ص{" "}
                    <strong>
                      {Math.max(activePlan.startPage, activePlan.endPage)}
                    </strong>{" "}
                    ({Math.abs(activePlan.endPage - activePlan.startPage) + 1}{" "}
                    صفحة).
                  </span>
                ) : (
                  <span className="text-red-500 font-bold">
                    لا توجد خطة نشطة حالياً. يرجى اختيار جزء أو نطاق مخصص.
                  </span>
                )}
              </div>
            )}

            {downloadOption === "juz" && (
              <div className="space-y-1 text-right">
                <label className="text-xs text-gray-400 dark:text-gray-500 block font-bold">
                  اختر الجزء من القرآن:
                </label>
                <select
                  value={selectedJuz}
                  onChange={(e) => setSelectedJuz(Number(e.target.value))}
                  className="w-full text-xs bg-gray-50 dark:bg-white/5 dark:text-white border border-gray-100 dark:border-white/5 rounded-xl p-2.5 outline-none font-bold cursor-pointer"
                >
                  {Array.from({ length: 30 }, (_, i) => i + 1).map((j) => (
                    <option key={j} value={j} className="dark:bg-[#1A1A1A]">
                      الجزء {j}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {downloadOption === "custom" && (
              <div className="grid grid-cols-2 gap-2 text-right font-bold">
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 dark:text-gray-500 block">
                    من صفحة:
                  </label>
                  <input
                    type="number"
                    onFocus={(e) => e.target.select()}
                    min={2}
                    max={604}
                    value={customStartPage}
                    onChange={(e) =>
                      setCustomStartPage(
                        Math.min(604, Math.max(2, Number(e.target.value))),
                      )
                    }
                    className="w-full text-xs bg-gray-50 dark:bg-white/5 dark:text-white border border-gray-100 dark:border-white/5 rounded-xl p-2 font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 dark:text-gray-500 block">
                    إلى صفحة:
                  </label>
                  <input
                    type="number"
                    onFocus={(e) => e.target.select()}
                    min={2}
                    max={604}
                    value={customEndPage}
                    onChange={(e) =>
                      setCustomEndPage(
                        Math.min(604, Math.max(2, Number(e.target.value))),
                      )
                    }
                    className="w-full text-xs bg-gray-50 dark:bg-white/5 dark:text-white border border-gray-100 dark:border-white/5 rounded-xl p-2 font-bold"
                  />
                </div>
              </div>
            )}

            {/* Selection Prefs */}
            <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-2xl space-y-3 text-right">
              <span className="text-xs font-bold block dark:text-gray-300 border-b border-gray-100 dark:border-white/5 pb-1.5">
                خيارات ومكونات التنزيل:
              </span>

              {/* Pages Texts */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-teal-50 dark:bg-teal-950/30 p-1.5 rounded-lg">
                    <FileText className="w-3.5 h-3.5 text-teal-600" />
                  </div>
                  <span className="text-xs dark:text-gray-300">
                    نصوص الآيات والصفحات المقروءة
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-teal-600 font-bold">
                  <Check className="w-4 h-4" />
                  مؤكد تلقائياً
                </div>
              </div>

              {/* Audio Recitation Checkbox */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <div className="bg-orange-50 dark:bg-orange-950/30 p-1.5 rounded-lg">
                    <Headphones className="w-3.5 h-3.5 text-orange-500" />
                  </div>
                  <div className="text-right">
                    <span className="text-xs dark:text-gray-300 block font-bold">
                      تنزيل المقاطع الصوتية ({
                        selectedQari === 'Minshawy_Murattal_128kbps' ? 'تلاوة الشيخ المنشاوي' :
                        selectedQari === 'Husary_128kbps' ? 'تلاوة الشيخ الحصري' :
                        selectedQari === 'Abdul_Basit_Murattal_64kbps' ? 'تلاوة الشيخ عبد الباسط' :
                        selectedQari === 'Ayman_Sowaid_64kbps' ? 'تلاوة الدكتور أيمن سويد' :
                        selectedQari === 'Muhammad_Ayyoub_128kbps' ? 'تلاوة الشيخ محمد أيوب' :
                        selectedQari === 'Ghamadi_40kbps' ? 'تلاوة الشيخ سعد الغامدي' :
                        selectedQari === 'MaherAlMuaiqly128kbps' ? 'تلاوة الشيخ ماهر المعيقلي' :
                        'تلاوة المقرئ المختار'
                      })
                    </span>
                    <span className="text-[9px] text-gray-400 dark:text-gray-500 block font-normal">
                      اختياري - لتسميع واستماع الآيات بلا إنترنت
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIncludeAudio((prev) => !prev)}
                  className={`w-10 h-5.5 rounded-full p-0.5 flex transition-all duration-300 cursor-pointer ${
                    includeAudio
                      ? "bg-[#1A2E1A] dark:bg-[#D4AF37] justify-end"
                      : "bg-gray-200 dark:bg-[#333333] justify-start"
                  }`}
                >
                  <motion.div
                    layout
                    className="w-4.5 h-4.5 bg-white rounded-full shadow"
                  />
                </button>
              </div>

              {/* Auto Download Checkboxes */}
              <div className="flex flex-col gap-3 pt-2 mt-1 border-t border-gray-100 dark:border-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="bg-blue-50 dark:bg-blue-950/30 p-1.5 rounded-lg">
                      <Wifi className="w-3.5 h-3.5 text-blue-500" />
                    </div>
                    <div className="text-right">
                      <span className="text-xs dark:text-gray-300 block font-bold">
                        التنزيل التلقائي للمهام والصفحات (في الخلفية)
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => updatePreferences({ autoDownloadEnabled: !(preferences.autoDownloadEnabled ?? true) })}
                    className={`w-10 h-5.5 rounded-full p-0.5 flex transition-all duration-300 cursor-pointer ${
                      (preferences.autoDownloadEnabled ?? true)
                        ? "bg-[#1A2E1A] dark:bg-[#D4AF37] justify-end"
                        : "bg-gray-200 dark:bg-[#333333] justify-start"
                    }`}
                  >
                    <motion.div
                      layout
                      className="w-4.5 h-4.5 bg-white rounded-full shadow"
                    />
                  </button>
                </div>

                <AnimatePresence>
                  {(preferences.autoDownloadEnabled ?? true) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex flex-col gap-3 pr-2 border-r-2 border-gray-100 dark:border-white/5 mr-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-right">
                          <span className="text-[11px] dark:text-gray-300 block font-bold">
                            تنزيل فقط عند توفر شبكة Wi-Fi
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => updatePreferences({ autoDownloadWifiOnly: !(preferences.autoDownloadWifiOnly ?? true) })}
                          className={`w-8 h-4.5 rounded-full p-0.5 flex transition-all duration-300 cursor-pointer ${
                            (preferences.autoDownloadWifiOnly ?? true)
                              ? "bg-[#1A2E1A] dark:bg-[#D4AF37] justify-end"
                              : "bg-gray-200 dark:bg-[#333333] justify-start"
                          }`}
                        >
                          <motion.div
                            layout
                            className="w-3.5 h-3.5 bg-white rounded-full shadow"
                          />
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-right">
                          <span className="text-[11px] dark:text-gray-300 block font-bold">
                            تضمين المقاطع الصوتية في التنزيل
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => updatePreferences({ autoDownloadAudio: !(preferences.autoDownloadAudio ?? false) })}
                          className={`w-8 h-4.5 rounded-full p-0.5 flex transition-all duration-300 cursor-pointer ${
                            (preferences.autoDownloadAudio ?? false)
                              ? "bg-[#1A2E1A] dark:bg-[#D4AF37] justify-end"
                              : "bg-gray-200 dark:bg-[#333333] justify-start"
                          }`}
                        >
                          <motion.div
                            layout
                            className="w-3.5 h-3.5 bg-white rounded-full shadow"
                          />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Interactive High-Tech Download Center */}
            <div className="space-y-3 pt-1">
              {/* Live Active Progress Card */}
              {(downloadState.isDownloading || downloadState.isPaused || downloadState.currentPage > 0) && (
                <div className={`p-4 rounded-2xl border transition-all duration-300 space-y-3 text-right shadow-sm ${
                  downloadState.isDownloading
                    ? "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-500/20"
                    : downloadState.isPaused
                    ? "bg-amber-50/60 dark:bg-amber-950/20 border-amber-500/20"
                    : "bg-gray-50/80 dark:bg-white/5 border-gray-200/50 dark:border-white/10"
                }`}>
                  {/* Header Status Bar */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {downloadState.isDownloading && (
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                        </span>
                      )}
                      {downloadState.isPaused && (
                        <span className="inline-flex rounded-full h-2.5 w-2.5 bg-amber-500 animate-pulse"></span>
                      )}
                      <span className={`text-xs font-black ${
                        downloadState.isDownloading
                          ? "text-emerald-800 dark:text-emerald-300"
                          : downloadState.isPaused
                          ? "text-amber-800 dark:text-amber-300"
                          : "text-gray-700 dark:text-gray-300"
                      }`}>
                        {downloadState.statusText || 'جاهز للتنزيل'}
                      </span>
                    </div>

                    {/* Progress Percentage */}
                    <div className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-white/90 dark:bg-black/40 border border-gray-200/50 dark:border-white/10 text-gray-800 dark:text-gray-200">
                      {downloadState.totalPages > 0
                        ? `${Math.round(((downloadState.downloadedPagesCount || downloadState.currentPage) / downloadState.totalPages) * 100)}%`
                        : "0%"}
                    </div>
                  </div>

                  {/* Modern Gradient Progress Bar */}
                  <div className="w-full h-2.5 bg-gray-200/80 dark:bg-white/10 rounded-full overflow-hidden p-0.5 shadow-inner">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        downloadState.isDownloading
                          ? "bg-gradient-to-r from-emerald-500 to-teal-400 animate-pulse"
                          : downloadState.isPaused
                          ? "bg-gradient-to-r from-amber-500 to-yellow-400"
                          : "bg-emerald-600"
                      }`}
                      style={{
                        width: `${downloadState.totalPages > 0 ? Math.min(100, ((downloadState.downloadedPagesCount || downloadState.currentPage) / downloadState.totalPages) * 100) : 0}%`,
                      }}
                    />
                  </div>

                  {/* Grid Statistics Counters */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] font-bold">
                    {/* Card 1: Downloaded Pages */}
                    <div className="bg-white/90 dark:bg-black/20 p-2.5 rounded-xl border border-gray-100 dark:border-white/5 flex flex-col">
                      <span className="text-gray-400 dark:text-gray-500 text-[10px]">الصفحات المنزلة</span>
                      <span className="text-emerald-700 dark:text-emerald-400 text-xs font-black">
                        {downloadState.downloadedPagesCount || downloadState.currentPage} من {downloadState.totalPages}
                      </span>
                      <span className="text-[9px] text-gray-400">
                        المتبقي: {Math.max(0, downloadState.remainingPagesCount ?? (downloadState.totalPages - (downloadState.downloadedPagesCount || downloadState.currentPage)))} صفحة
                      </span>
                    </div>

                    {/* Card 2: Downloaded Ayahs / Audios */}
                    <div className="bg-white/90 dark:bg-black/20 p-2.5 rounded-xl border border-gray-100 dark:border-white/5 flex flex-col">
                      <span className="text-gray-400 dark:text-gray-500 text-[10px]">الآيات والصوتيات</span>
                      <span className="text-blue-700 dark:text-blue-400 text-xs font-black">
                        {downloadState.downloadedAyahsCount || 0} آية
                      </span>
                      <span className="text-[9px] text-gray-400">
                        إجمالي الدفعة: {downloadState.totalAyahsInBatch || 0}
                      </span>
                    </div>

                    {/* Card 3: Speed */}
                    <div className="bg-white/90 dark:bg-black/20 p-2.5 rounded-xl border border-gray-100 dark:border-white/5 flex flex-col">
                      <span className="text-gray-400 dark:text-gray-500 text-[10px]">سرعة التنزيل</span>
                      <span className="text-amber-700 dark:text-amber-400 text-xs font-black">
                        {downloadState.isDownloading ? `~${downloadState.downloadSpeedPagesPerSec || 0.8} ص/ث` : 'متوقف'}
                      </span>
                      <span className="text-[9px] text-gray-400">معالجة شبكية</span>
                    </div>

                    {/* Card 4: Estimated Time Remaining */}
                    <div className="bg-white/90 dark:bg-black/20 p-2.5 rounded-xl border border-gray-100 dark:border-white/5 flex flex-col">
                      <span className="text-gray-400 dark:text-gray-500 text-[10px]">الوقت المتبقي</span>
                      <span className="text-teal-700 dark:text-teal-400 text-xs font-black">
                        {downloadState.isDownloading && downloadState.estimatedSecondsRemaining !== undefined
                          ? `${downloadState.estimatedSecondsRemaining} ثانية`
                          : downloadState.isPaused
                          ? 'موقوف مؤقتاً'
                          : 'مكتمل'}
                      </span>
                      <span className="text-[9px] text-gray-400">تقدير ديناميكي</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Overall Cache Summary Stats Bar */}
              <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-2xl border border-gray-100 dark:border-white/5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-[#D4AF37]" />
                  <span className="font-bold text-gray-700 dark:text-gray-300">
                    محفوظات الذاكرة المحلية:
                  </span>
                </div>
                <div className="flex items-center gap-2 font-extrabold text-[11px]">
                  <span className="text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-1 rounded-lg">
                    📖 {cachedPagesCount} / 604 ص
                  </span>
                  <span className="text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 px-2 py-1 rounded-lg">
                    🎧 {cachedAudiosCount} صوتيات
                  </span>
                </div>
              </div>

              {/* Interactive Control Action Bar (Pause / Resume / Start / Cancel / Delete) */}
              <div className="flex flex-wrap gap-2 pt-1">
                {/* Case A: Currently Downloading -> Show Pause + Cancel */}
                {downloadState.isDownloading && (
                  <>
                    <button
                      onClick={() => pauseDownload()}
                      className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-2xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Pause className="w-4 h-4" />
                      <span>إيقاف مؤقت</span>
                    </button>
                    <button
                      onClick={() => cancelActiveDownload()}
                      className="px-4 py-3 bg-red-100 dark:bg-red-500/10 hover:bg-red-200 text-red-600 font-bold text-xs rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Square className="w-4 h-4" />
                      <span>إلغاء</span>
                    </button>
                  </>
                )}

                {/* Case B: Currently Paused -> Show Resume + Cancel */}
                {downloadState.isPaused && (
                  <>
                    <button
                      onClick={() => resumeDownload()}
                      className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-2xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer animate-pulse"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      <span>استئناف التنزيل</span>
                    </button>
                    <button
                      onClick={() => cancelActiveDownload()}
                      className="px-4 py-3 bg-red-100 dark:bg-red-500/10 hover:bg-red-200 text-red-600 font-bold text-xs rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Square className="w-4 h-4" />
                      <span>إلغاء</span>
                    </button>
                  </>
                )}

                {/* Case C: Idle -> Show Start Download */}
                {!downloadState.isDownloading && !downloadState.isPaused && (
                  <button
                    onClick={handleStartDownload}
                    disabled={downloadOption === "plan" && !activePlan}
                    className="flex-1 py-3 bg-[#1A2E1A] dark:bg-[#D4AF37] disabled:opacity-50 hover:bg-opacity-90 text-white dark:text-[#1A1A1A] font-extrabold text-xs rounded-2xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>{(cachedPagesCount > 0 || cachedAudiosCount > 0) ? "تنزيل المحتوى المتبقي" : "بدء تنزيل المحتوى مسبقاً"}</span>
                  </button>
                )}

                {/* Delete Downloads Button */}
                {(cachedPagesCount > 0 || cachedAudiosCount > 0) && !downloadState.isDownloading && (
                  <button
                    onClick={handleClearOffline}
                    className="px-3.5 bg-red-100 dark:bg-red-500/10 hover:bg-red-200 text-red-600 rounded-2xl transition-all active:scale-95 flex items-center justify-center cursor-pointer"
                    title="مسح جميع التنزيلات"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Data Management */}
        <section className="bg-white dark:bg-purple-950/10 rounded-[32px] border border-[#1A2E1A]/5 dark:border-purple-500/20 border-r-4 border-r-purple-500 shadow-sm overflow-hidden transition-all duration-300">
          <div className="p-4 border-b border-gray-50 dark:border-purple-500/10 flex items-center gap-3">
            <div className="bg-gold-50 dark:bg-[#D4AF37]/10 p-2 rounded-xl">
              <Database className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <h3 className="font-bold text-sm dark:text-purple-300">
              إدارة البيانات والطباعة
            </h3>
          </div>
          <div className="p-0 divide-y divide-gray-100 dark:divide-white/5">
            {/* 1. Classic Full Plan */}
            <div className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="bg-gray-50 dark:bg-white/5 p-2 rounded-xl mt-0.5">
                  <FileText className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </div>
                <div className="text-right flex-1">
                  <span className="text-xs sm:text-sm font-bold block dark:text-white">
                    تصدير الخطة الكاملة (الملف العادي)
                  </span>
                  {isExportingClassic && exportProgressClassic ? (
                    <span className="text-xs font-semibold block text-[#D4AF37] dark:text-[#EED269] mt-0.5 animate-pulse">
                      {exportProgressClassic}
                    </span>
                  ) : (
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 text-right block mt-0.5 leading-normal">
                      تحميل جدول المهام اليومية لكامل الخطة بجودة عالية وسرعة فائقة
                    </span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:mr-10">
                <button
                  onClick={() => exportPDF(false, "download")}
                  disabled={isExportingClassic || !activePlan}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs active:scale-95 transition-all cursor-pointer disabled:opacity-50 shadow-sm"
                  title="تنزيل مباشر لملف الـ PDF بجودة عالية"
                >
                  {isExportingClassic && !isPrintingClassic ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  <span>تنزيل PDF</span>
                </button>
                <button
                  onClick={() => exportPDF(false, "print")}
                  disabled={isExportingClassic || !activePlan}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs active:scale-95 transition-all cursor-pointer disabled:opacity-50 shadow-sm"
                  title="فتح نافذة الطباعة المباشرة مع خيارات الحفظ"
                >
                  {isPrintingClassic ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                  ) : (
                    <Printer className="w-3.5 h-3.5" />
                  )}
                  <span>طباعة ومعاينة</span>
                </button>
                <button
                  onClick={() => exportPDF(false, "share")}
                  disabled={isExportingClassic || !activePlan}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10 rounded-xl font-bold text-xs active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                  title="مشاركة الخطة"
                >
                  <Share2 className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>مشاركة</span>
                </button>
              </div>
            </div>

            {/* 2. Castle Towers style (Abraj) */}
            {activePlan?.isSevenCastles && (
              <div className="p-4 space-y-3 bg-emerald-50/10 dark:bg-emerald-950/5">
                <div className="flex items-start gap-3">
                  <div className="bg-emerald-50 dark:bg-emerald-500/10 p-2 rounded-xl mt-0.5">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="text-right flex-1">
                    <span className="text-xs sm:text-sm font-bold block text-emerald-700 dark:text-emerald-400">
                      الأبراج (منظومة القلاع السبع الحصينة)
                    </span>
                    {isExportingCastle && exportProgressCastle ? (
                      <span className="text-xs font-semibold block text-[#D4AF37] mt-0.5 animate-pulse">
                        {exportProgressCastle}
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 text-right block mt-0.5 leading-normal">
                        تصميم مبتكر يعرض المهام أفقياً كأبراج قلعة حصينة ذات نقوش وألوان مخصصة لكل يوم من أيام الأسبوع السبعة بشكل متناسق
                      </span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:mr-10">
                  <button
                    onClick={() => exportPDF(true, "download")}
                    disabled={isExportingCastle || !activePlan}
                    className="flex items-center justify-center gap-2 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs active:scale-95 transition-all cursor-pointer disabled:opacity-50 shadow-sm"
                    title="تنزيل مباشر لملف الـ PDF بتصميم الأبراج"
                  >
                    {isExportingCastle && !isPrintingCastle ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    <span>تنزيل PDF</span>
                  </button>
                  <button
                    onClick={() => exportPDF(true, "print")}
                    disabled={isExportingCastle || !activePlan}
                    className="flex items-center justify-center gap-2 py-2.5 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs active:scale-95 transition-all cursor-pointer disabled:opacity-50 shadow-sm"
                    title="فتح نافذة الطباعة المباشرة للأبراج"
                  >
                    {isPrintingCastle ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                    ) : (
                      <Printer className="w-3.5 h-3.5" />
                    )}
                    <span>طباعة ومعاينة</span>
                  </button>
                  <button
                    onClick={() => exportPDF(true, "share")}
                    disabled={isExportingCastle || !activePlan}
                    className="flex items-center justify-center gap-2 py-2.5 px-3 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10 rounded-xl font-bold text-xs active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Share2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>مشاركة</span>
                  </button>
                </div>
              </div>
            )}

            {/* 3. Booklet Option */}
            <button
              onClick={() => {
                setBookletLayoutPattern("classic");
                setBookletActiveTab("settings");
                setShowBookletModal(true);
              }}
              disabled={isExportingBooklet || !activePlan}
              className="w-full p-4 flex items-center justify-between hover:bg-amber-50/50 dark:hover:bg-amber-950/10 transition-colors border-b border-gray-50 dark:border-white/5 disabled:opacity-50 cursor-pointer"
            >
              <div className="flex items-center gap-3">
                {isExportingBooklet ? (
                  <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
                ) : (
                  <BookOpen className="w-5 h-5 text-amber-500" />
                )}
                <div className="text-right">
                  <span className="text-xs sm:text-sm font-bold block text-amber-800 dark:text-amber-400">
                    تصدير كتيب احترافي للطباعة (📖 كُتيب PDF)
                  </span>
                  {isExportingBooklet && exportProgressBooklet ? (
                    <span className="text-xs font-semibold block text-amber-600 dark:text-amber-400 mt-0.5 animate-pulse">
                      {exportProgressBooklet}
                    </span>
                  ) : (
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 text-right block mt-0.5 leading-normal">
                      توليد ملف كُتيب جاهز للطباعة والتدبيس من المنتصف بنظام Booklet Imposition
                    </span>
                  )}
                </div>
              </div>
              <Sliders className="w-4 h-4 text-amber-500" />
            </button>

            {/* Plan Sharing & Distribution */}
            <div className="p-4 space-y-3 bg-emerald-50/20 dark:bg-emerald-950/10">
              <div className="flex items-start gap-3">
                <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-xl mt-0.5">
                  <Share2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="text-right flex-1">
                  <span className="text-xs sm:text-sm font-bold block text-emerald-800 dark:text-emerald-300">
                    مشاركة ونشر واستيراد الخطط (توزيع للطلاب)
                  </span>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 text-right block mt-0.5 leading-normal">
                    تصدير الخطة كملف (.qplan) أو رمز نصي لمشاركتها مع الطلاب لتعمل مباشرة على أجهزتهم، أو استيراد خطة من المعلم
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:mr-10">
                <button
                  type="button"
                  onClick={() => setShowExportPlanModal(true)}
                  disabled={!activePlan}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs active:scale-95 transition-all cursor-pointer disabled:opacity-50 shadow-sm"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>تصدير الخطة النشطة للنشر</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowImportPlanModal(true)}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 text-emerald-700 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-700/50 rounded-xl font-bold text-xs active:scale-95 transition-all cursor-pointer shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>استيراد وتفعيل خطة جديدة</span>
                </button>
              </div>
            </div>

            {/* 4. Clear Data Option */}
            <button
              onClick={() => setShowClearModal(true)}
              className="w-full p-4 flex items-center justify-between hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-red-500 group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Trash2 className="w-5 h-5 group-hover:shake" />
                <span className="text-sm font-extrabold">
                  مسح جميع البيانات
                </span>
              </div>
            </button>
          </div>
        </section>

        {/* Hijri Calendar Adjustments */}
        <section className="bg-white dark:bg-amber-950/10 rounded-[32px] border border-[#1A2E1A]/5 dark:border-amber-500/20 border-r-4 border-r-amber-600 shadow-sm overflow-hidden transition-all duration-300 font-rtl">
          <div className="p-4 border-b border-[#1A2E1A]/5 dark:border-amber-500/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-amber-50 dark:bg-amber-950/40 p-2 rounded-xl">
                <Calendar className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="font-bold text-sm dark:text-amber-300">
                ضبط التقويم الهجري
              </h3>
            </div>
            {/* Year Switcher */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-black/30 p-1 rounded-lg border border-gray-100 dark:border-white/5 shrink-0">
              <button
                type="button"
                onClick={() => setCurrentYearView((prev) => prev - 1)}
                className="p-1 text-gray-500 hover:text-amber-600 rounded cursor-pointer"
                title="السنة السابقة"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-black text-amber-700 dark:text-[#D4AF37] px-1">
                {currentYearView} هـ
              </span>
              <button
                type="button"
                onClick={() => setCurrentYearView((prev) => prev + 1)}
                className="p-1 text-gray-500 hover:text-amber-600 rounded cursor-pointer"
                title="السنة التالية"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="p-4 space-y-3.5">
            <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-relaxed font-semibold">
              اختر الشهر الهجري لتعديل تاريخه بزيادة أو نقصان يوم أو يومين، ليظل
              محفوظاً وثابتاً لذلك الشهر من تلك السنة.
            </p>

            {/* Dropdown controls in a beautiful inline grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Month Dropdown */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500">
                  الشهر المراد تعديله:
                </label>
                <select
                  value={selectedMonthToAdjust}
                  onChange={(e) =>
                    setSelectedMonthToAdjust(parseInt(e.target.value, 10))
                  }
                  className="w-full text-xs font-bold p-2.5 bg-gray-50 dark:bg-[#1A1A1A] border border-gray-100 dark:border-white/5 rounded-xl text-gray-800 dark:text-gray-200 cursor-pointer focus:ring-1 focus:ring-amber-500 outline-none"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((mNum) => {
                    const mName = getHijriMonthNameAr(mNum);
                    const isC =
                      baseYearMonth.year === currentYearView &&
                      baseYearMonth.month === mNum;
                    const offset = offsets[`${currentYearView}-${mNum}`] || 0;
                    return (
                      <option
                        key={mNum}
                        value={mNum}
                        className="dark:bg-[#1C1C1E]"
                      >
                        {mNum} - {mName} {isC ? " (الشهر الحالي)" : ""}{" "}
                        {offset !== 0
                          ? ` (*عدل ${offset > 0 ? `+${offset}` : offset})`
                          : ""}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Offset Adjuster Dropdown */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500">
                  تعديل الأيام لهذا الشهر:
                </label>
                <select
                  value={
                    offsets[`${currentYearView}-${selectedMonthToAdjust}`] || 0
                  }
                  onChange={(e) =>
                    handleUpdateOffset(
                      currentYearView,
                      selectedMonthToAdjust,
                      parseInt(e.target.value, 10),
                    )
                  }
                  className={`w-full text-xs font-bold p-2.5 bg-gray-50 dark:bg-[#1A1A1A] border rounded-xl cursor-pointer focus:ring-1 focus:ring-amber-500 outline-none ${
                    (offsets[`${currentYearView}-${selectedMonthToAdjust}`] ||
                      0) !== 0
                      ? "border-amber-500/40 text-amber-600 dark:text-[#D4AF37] font-black bg-amber-500/5"
                      : "border-gray-100 dark:border-white/5 text-gray-600 dark:text-gray-400"
                  }`}
                >
                  <option value={0} className="dark:bg-[#1C1C1E]">
                    طبيعي (أم القرى - ٠)
                  </option>
                  <option value={1} className="dark:bg-[#1C1C1E]">
                    تأخير بيوم (+١)
                  </option>
                  <option value={2} className="dark:bg-[#1C1C1E]">
                    تأخير بيومين (+٢)
                  </option>
                  <option value={-1} className="dark:bg-[#1C1C1E]">
                    تقديم بيوم (-١)
                  </option>
                  <option value={-2} className="dark:bg-[#1C1C1E]">
                    تقديم بيومين (-٢)
                  </option>
                </select>
              </div>
            </div>

            {/* Current Real-time Hijri View */}
            <div className="bg-amber-500/5 p-3 rounded-2xl border border-amber-500/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-right">
              <div>
                <span className="text-[10px] text-gray-400 dark:text-gray-500 block font-bold">
                  التاريخ الهجري المعدل الحالي:
                </span>
                <span className="text-sm font-black text-amber-700 dark:text-[#D4AF37]">
                  {getHijriDate(new Date())}
                </span>
              </div>
              <div className="border-t sm:border-t-0 sm:border-r border-amber-500/10 pt-2 sm:pt-0 sm:pr-4 w-full sm:w-auto">
                <span className="text-[10px] text-gray-400 dark:text-gray-500 block font-bold">
                  الميلادي المقابل:
                </span>
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  {format(new Date(), "EEEE، d MMMM yyyy", { locale: ar })}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* About App */}
        <section className="bg-white dark:bg-[#1A1A1A] rounded-[32px] border border-[#1A2E1A]/5 dark:border-white/5 shadow-sm p-6 text-center space-y-4 transition-colors">
          <div className="w-16 h-16 bg-[#FDFBF7] dark:bg-[#1A1A1A] rounded-[32px] mx-auto flex items-center justify-center border border-[#1A2E1A]/5 dark:border-white/10 shadow-inner">
            <ShieldCheck className="w-10 h-10 text-[#1A2E1A] dark:text-[#D4AF37]" />
          </div>
          <div>
            <h4 className="font-bold text-lg dark:text-white">
              تطبيق خطة الحفظ
            </h4>
            <p className="text-xs text-gray-400 dark:text-gray-500 max-w-[200px] mx-auto">
              تطبيق إسلامي يساعدك على تنظيم وقتك لحفظ كتاب الله ومراجعته بذكاء
            </p>
          </div>
          <div className="text-[10px] font-bold text-gray-300 dark:text-gray-600 tracking-widest uppercase">
            الإصدار 1.0.0
          </div>
        </section>
      </div>

      {/* Booklet Export Config & Live Preview Modal */}
      <Modal
        isOpen={showBookletModal}
        onClose={() => {
          if (!isExportingBooklet) {
            setShowBookletModal(false);
          }
        }}
        title="إعداد وتجهيز كُتيب الطباعة الاحترافي (Booklet)"
        size="lg"
      >
        <div className="space-y-6 font-rtl">
          {/* Tabs Navigation */}
          <div className="flex border-b border-gray-100 dark:border-white/5 mb-2">
            <button
              type="button"
              onClick={() => setBookletActiveTab("settings")}
              className={`flex-1 py-3 text-center font-bold text-xs sm:text-sm transition-all border-b-2 flex items-center justify-center gap-2 cursor-pointer ${
                bookletActiveTab === "settings"
                  ? "border-amber-500 text-amber-700 dark:text-amber-400 font-extrabold"
                  : "border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              }`}
            >
              <Sliders className="w-4 h-4 text-amber-500" />
              <span>خيارات وتنسيق الطباعة</span>
            </button>
            <button
              type="button"
              onClick={() => setBookletActiveTab("instructions")}
              className={`flex-1 py-3 text-center font-bold text-xs sm:text-sm transition-all border-b-2 flex items-center justify-center gap-2 cursor-pointer ${
                bookletActiveTab === "instructions"
                  ? "border-amber-500 text-amber-700 dark:text-amber-400 font-extrabold"
                  : "border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              }`}
            >
              <BookOpen className="w-4 h-4 text-amber-500" />
              <span>تعليمات للطباعة 🖨️</span>
            </button>
          </div>

          {bookletActiveTab === "settings" ? (
            <>
              {/* Header Description */}
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 flex gap-3 items-start">
                <span className="text-2xl mt-0.5">📖</span>
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-amber-800 dark:text-amber-400">
                    ما هو نظام Booklet Imposition؟
                  </h4>
                  <p className="text-xs text-amber-900/70 dark:text-gray-400 leading-relaxed">
                    هو أسلوب فرز وترتيب صفائح الورق المتبع في المطابع ودور النشر (مثل Adobe InDesign)، بحيث يتم توزيع الصفحات على وجهي الورق بطريقة غير متتالية. بعد الطباعة على الوجهين وطوي الأوراق من المنتصف وتدبيسها، تترتب الصفحات تلقائياً لتشكل كتاباً صحيحاً يُقرأ بشكل طبيعي من اليمين إلى اليسار.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Settings Column */}
                <div className="lg:col-span-7 space-y-5">
                  <h4 className="font-extrabold text-[#1A2E1A] dark:text-white border-b border-gray-100 dark:border-white/5 pb-2 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-amber-600" />
                    خيارات التنسيق والطباعة
                  </h4>

                  {/* Paper Size Grid */}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-500 dark:text-gray-400 block">
                      حجم ورق الطباعة (المقاس والطي)
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setBookletPaperSize("a4_to_a5")}
                        className={`p-3 rounded-2xl border text-right transition-all cursor-pointer ${
                          bookletPaperSize === "a4_to_a5"
                            ? "border-amber-500 bg-amber-500/5 text-amber-800 dark:text-amber-400"
                            : "border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5"
                        }`}
                      >
                        <span className="font-bold text-xs block">ورق A4 (طوي إلى A5)</span>
                        <span className="text-[10px] text-gray-400 mt-0.5 block leading-normal">
                          المقاس الافتراضي والأسهل للطباعة المنزلية والمكتبية
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setBookletPaperSize("a3_to_a4")}
                        className={`p-3 rounded-2xl border text-right transition-all cursor-pointer ${
                          bookletPaperSize === "a3_to_a4"
                            ? "border-amber-500 bg-amber-500/5 text-amber-800 dark:text-amber-400"
                            : "border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5"
                        }`}
                      >
                        <span className="font-bold text-xs block">ورق A3 (طوي إلى A4)</span>
                        <span className="text-[10px] text-gray-400 mt-0.5 block leading-normal">
                          للحصول على كتاب كبير الحجم عبر طابعات A3 العريضة
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setBookletPaperSize("letter")}
                        className={`p-3 rounded-2xl border text-right transition-all cursor-pointer ${
                          bookletPaperSize === "letter"
                            ? "border-amber-500 bg-amber-500/5 text-amber-800 dark:text-amber-400"
                            : "border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5"
                        }`}
                      >
                        <span className="font-bold text-xs block">ورق Letter (رسائل)</span>
                        <span className="text-[10px] text-gray-400 mt-0.5 block leading-normal">
                          متوافق مع طابعات ومقاسات أمريكا الشمالية القياسية
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setBookletPaperSize("legal")}
                        className={`p-3 rounded-2xl border text-right transition-all cursor-pointer ${
                          bookletPaperSize === "legal"
                            ? "border-amber-500 bg-amber-500/5 text-amber-800 dark:text-amber-400"
                            : "border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5"
                        }`}
                      >
                        <span className="font-bold text-xs block">ورق Legal (قانوني)</span>
                        <span className="text-[10px] text-gray-400 mt-0.5 block leading-normal">
                          مقاس مستطيل مميز يمنحك كُتيّباً ممدداً وعريضاً
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Sliders for Gutter and Outer Margins */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs font-black text-gray-500 dark:text-gray-400">
                        <span>الهامش الأوسط (Gutter)</span>
                        <span className="text-amber-600 dark:text-amber-400">{bookletGutter} مم</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="30"
                        step="1"
                        value={bookletGutter}
                        onChange={(e) => setBookletGutter(Number(e.target.value))}
                        className="w-full accent-amber-600 cursor-ew-resize h-1 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none"
                      />
                      <span className="text-[9px] text-gray-400 block leading-tight">
                        الهامش الداخلي الفاصل بين الصفحتين للتدبيس والثني
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs font-black text-gray-500 dark:text-gray-400">
                        <span>الهامش الخارجي للمحيط</span>
                        <span className="text-amber-600 dark:text-amber-400">{bookletOuterMargin} مم</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="20"
                        step="1"
                        value={bookletOuterMargin}
                        onChange={(e) => setBookletOuterMargin(Number(e.target.value))}
                        className="w-full accent-amber-600 cursor-ew-resize h-1 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none"
                      />
                      <span className="text-[9px] text-gray-400 block leading-tight">
                        الهامش الخارجي المحيط بأطراف الصفحة لحمايتها من القص
                      </span>
                    </div>
                  </div>

                  {/* Design Layout Style for Seven Castles */}
                  {activePlan?.isSevenCastles && (
                    <div className="space-y-2 pt-1">
                      <label className="text-xs font-black text-gray-500 dark:text-gray-400 block">
                        نمط التصميم لكتيب القلاع السبع
                      </label>
                      <div className="grid grid-cols-1 gap-3">
                        <button
                          type="button"
                          onClick={() => setBookletLayoutPattern("classic")}
                          className="w-full p-2.5 rounded-2xl border text-right transition-all cursor-pointer border-amber-500 bg-amber-500/5 text-amber-800 dark:text-amber-400"
                        >
                          <span className="font-bold text-xs block">الملف العادي</span>
                          <span className="text-[9px] text-gray-400 mt-0.5 block leading-normal">
                            عرض كلاسيكي للمهام
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Preview and Statistics Column */}
                <div className="lg:col-span-5 bg-gray-50/50 dark:bg-black/20 rounded-3xl p-5 border border-gray-100 dark:border-white/5 space-y-4">
                  <h4 className="font-extrabold text-[#1A2E1A] dark:text-white border-b border-gray-100 dark:border-white/5 pb-2 flex items-center gap-2">
                    <Info className="w-4 h-4 text-amber-600" />
                    بيانات وإحصائيات الكُتيب
                  </h4>

                  {(() => {
                    const stats = getBookletPageCount();
                    return (
                      <div className="space-y-2.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-400">عدد الصفحات الأصلية:</span>
                          <span className="font-bold text-gray-700 dark:text-gray-200">{stats.original} صفحة</span>
                        </div>

                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-400">صفحات فارغة مضافة (حشو):</span>
                          <span className="font-bold text-amber-600 dark:text-amber-400">
                            {stats.padded > 0 ? `+ ${stats.padded} صفحة` : "لا يوجد"}
                          </span>
                        </div>

                        <div className="flex justify-between items-center text-xs border-b border-dashed border-gray-200 dark:border-white/5 pb-2">
                          <span className="text-gray-400">إجمالي صفحات الكتيب:</span>
                          <span className="font-extrabold text-amber-800 dark:text-amber-400">{stats.total} صفحة (مضاعف 4)</span>
                        </div>

                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-400">عدد أوراق الطباعة الفعلية:</span>
                          <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{stats.sheets} أوراق مزدوجة الوجه</span>
                        </div>

                        {/* Page Layout Diagram */}
                        <div className="space-y-1.5 pt-2">
                          <label className="text-[10px] font-black text-gray-400 block uppercase tracking-wide font-rtl">
                            مخطط ترتيب الصفحات على الأوراق (Imposition Map)
                          </label>
                          <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 text-[10px] scrollbar-thin">
                            {Array.from({ length: stats.sheets }).map((_, index) => {
                              const sheetNum = index + 1;
                              const frontLeftIdx = stats.total - 1 - 2 * index;
                              const frontRightIdx = 2 * index;
                              const backLeftIdx = 2 * index + 1;
                              const backRightIdx = stats.total - 2 - 2 * index;

                              const getLabel = (idx: number) => {
                                if (idx >= stats.original) return "صفحة فارغة";
                                if (idx === 0) return "صفحة الغلاف";
                                return `الأسبوع ${idx}`;
                              };

                              return (
                                <div key={index} className="bg-white dark:bg-black/30 border border-gray-100 dark:border-white/5 p-2 rounded-xl space-y-1 shadow-sm font-sans text-[9px]">
                                  <div className="flex justify-between font-bold text-amber-700 dark:text-amber-400 border-b border-gray-100 dark:border-white/5 pb-0.5">
                                    <span>الورقة رقم {sheetNum}</span>
                                    <span className="font-rtl text-[8px]">الوجه والظهر</span>
                                  </div>
                                  <div className="flex justify-between text-gray-500 dark:text-gray-400">
                                    <span>الوجه (Front):</span>
                                    <span className="font-extrabold text-gray-700 dark:text-gray-300">
                                      [{getLabel(frontLeftIdx)}] & [{getLabel(frontRightIdx)}]
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-gray-500 dark:text-gray-400">
                                    <span>الظهر (Back):</span>
                                    <span className="font-extrabold text-gray-700 dark:text-gray-300">
                                      [{getLabel(backLeftIdx)}] & [{getLabel(backRightIdx)}]
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </>
          ) : (
            /* Printed Instructions Tab content */
            <div className="bg-amber-500/5 border border-amber-500/10 rounded-3xl p-5 md:p-6 space-y-6">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-amber-500/10 rounded-full border border-amber-500/20 text-amber-600 text-2xl">
                  🖨️
                </div>
                <h3 className="font-extrabold text-base md:text-lg text-amber-800 dark:text-amber-400">
                  دليل إرشادات طباعة وتجميع الكُتيّب (Booklet Guide)
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-normal max-w-xl mx-auto">
                  يرجى اتباع هذه التعليمات بدقة لطباعة الملف المولد بطريقة Booklet الصحيحة للحصول على كتاب رائع ومطوي بشكل سليم.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-amber-950/20 p-4 rounded-2xl border border-gray-100 dark:border-white/5 space-y-2 text-right">
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-black text-xs md:text-sm">
                    <span className="w-5 h-5 rounded-full bg-amber-500/10 flex items-center justify-center text-xs font-sans">١</span>
                    <span>استخدم ورقاً وحجماً ملائماً</span>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed font-semibold">
                    تأكد من مطابقة مقاس الورق الفعلي في الطابعة مع المقاس الذي اخترته في الإعدادات (مثلاً ورق A4 القياسي أو ورق A3 العريض).
                  </p>
                </div>

                <div className="bg-white dark:bg-amber-950/20 p-4 rounded-2xl border border-gray-100 dark:border-white/5 space-y-2 text-right">
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-black text-xs md:text-sm">
                    <span className="w-5 h-5 rounded-full bg-amber-500/10 flex items-center justify-center text-xs font-sans">٢</span>
                    <span>الطباعة على الوجهين (Duplex)</span>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed font-semibold">
                    اختر خيار <strong>الطباعة على الوجهين (Both Sides)</strong>، ثم حدد <strong>التقليب على الحافة القصيرة (Flip on Short Edge)</strong>. هذا ضروري حتى لا تظهر الصفحات مقلوبة رأساً على عقب!
                  </p>
                </div>

                <div className="bg-white dark:bg-amber-950/20 p-4 rounded-2xl border border-gray-100 dark:border-white/5 space-y-2 text-right">
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-black text-xs md:text-sm">
                    <span className="w-5 h-5 rounded-full bg-amber-500/10 flex items-center justify-center text-xs font-sans">٣</span>
                    <span>مقياس الصفحة (Scale 100%)</span>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed font-semibold">
                    اضبط مقياس الحجم في خيارات الطابعة على <strong>الحجم الفعلي (Actual Size)</strong> أو نسبة <strong>100%</strong> وتجنب تمديد الصفحة (Fit/Shrink) لضمان اتساق الهامش الأوسط للتدبيس.
                  </p>
                </div>

                <div className="bg-white dark:bg-amber-950/20 p-4 rounded-2xl border border-gray-100 dark:border-white/5 space-y-2 text-right">
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-black text-xs md:text-sm">
                    <span className="w-5 h-5 rounded-full bg-amber-500/10 flex items-center justify-center text-xs font-sans">٤</span>
                    <span>التجميع، الطي والتدبيس</span>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed font-semibold">
                    بعد الطباعة، رتب الأوراق فوق بعضها كما خرجت تماماً، ثم قم بطيها جميعاً معاً من المنتصف طية واحدة متناسقة، ودبسها من خط الطي (المنتصف) لتشكل كُتيباً رائعاً يُقرأ بشكل طبيعي من اليمين لليسار.
                  </p>
                </div>
              </div>


            </div>
          )}

           {/* Action Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-4 border-t border-gray-100 dark:border-white/5">
            <button
              type="button"
              onClick={() => setShowBookletModal(false)}
              disabled={isExportingBooklet}
              className="px-3 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 rounded-2xl font-bold text-xs sm:text-sm active:scale-95 transition-transform cursor-pointer text-center"
            >
              إلغاء
            </button>
            <button
              type="button"
              disabled={isExportingBooklet || !activePlan}
              onClick={() => exportBookletPDF(bookletLayoutPattern === "castle", "download")}
              className="px-3 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs sm:text-sm active:scale-95 transition-transform flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-sm"
              title="تنزيل مباشر لملف الكتيب PDF بجودة عالية"
            >
              {isExportingBooklet && !isPrintingBooklet ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>تحضير...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>تنزيل PDF</span>
                </>
              )}
            </button>
            <button
              type="button"
              disabled={isExportingBooklet || !activePlan}
              onClick={() => exportBookletPDF(bookletLayoutPattern === "castle", "print")}
              className="px-3 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl font-bold text-xs sm:text-sm active:scale-95 transition-transform flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-sm"
              title="فتح نافذة الطباعة المباشرة للكتيب"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة ومعاينة</span>
            </button>
            <button
              type="button"
              disabled={isExportingBooklet || !activePlan}
              onClick={() => exportBookletPDF(bookletLayoutPattern === "castle", "share")}
              className="px-3 py-3 bg-[#1A2E1A] dark:bg-[#D4AF37] text-white dark:text-[#1A1A1A] hover:bg-opacity-95 rounded-2xl font-bold text-xs sm:text-sm active:scale-95 transition-transform flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>مشاركة</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Share PDF Modal */}
      <Modal
        isOpen={!!shareModalConfig?.isOpen}
        onClose={() => setShareModalConfig(null)}
        title="📥 مشاركة ملف الـ PDF"
      >
        <div className="space-y-5 text-right font-sans">
          <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
            <Share2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          
          <div className="space-y-2 text-center">
            <h4 className="font-bold text-base text-[#1A2E1A] dark:text-white">
              تم تحضير ملف الـ PDF بنجاح!
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed max-w-sm mx-auto">
              بسبب قيود المتصفحات أو نظام التشغيل في بيئة الإطارات (Iframe)، يرجى تحميل الملف إلى جهازك أولاً، ثم إرساله ومشاركته بسهولة إلى أي تطبيق.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            {/* Download Step */}
            <div className="bg-emerald-50/40 dark:bg-emerald-950/10 p-3 rounded-2xl border border-emerald-100/30">
              <span className="block font-bold text-xs text-emerald-800 dark:text-emerald-400 mb-1.5">
                الخطوة الأولى: تحميل الملف لجهازك 👇
              </span>
              <button
                onClick={() => {
                  if (shareModalConfig) {
                    shareModalConfig.pdf.save(shareModalConfig.fileName);
                  }
                }}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>تحميل ملف الـ PDF الآن</span>
              </button>
            </div>

            {/* Application Sharing Step */}
            <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-2xl border border-gray-100 dark:border-white/5">
              <span className="block font-bold text-xs text-gray-500 dark:text-gray-400 mb-2">
                الخطوة الثانية: فتح المحادثة للمشاركة 💬
              </span>
              
              <div className="grid grid-cols-1 gap-2">
                {/* Native OS Share */}
                {navigator.share && (
                  <button
                    onClick={async () => {
                      if (shareModalConfig) {
                        try {
                          const blob = shareModalConfig.pdf.output("blob");
                          const file = new File([blob], shareModalConfig.fileName, { type: "application/pdf" });
                          await navigator.share({
                            files: [file],
                            title: "خطة حفظ القرآن الكريم",
                            text: "تفضل ملف خطة حفظ القرآن الكريم الخاصة بي"
                          });
                        } catch (err) {
                          console.error("Native share failed", err);
                        }
                      }
                    }}
                    className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-opacity-90 text-white rounded-xl font-bold text-[11px] sm:text-xs flex items-center justify-center gap-1.5 transition-all text-center"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>مشاركة عبر الهاتف أو الكمبيوتر</span>
                  </button>
                )}
              </div>
              
              <span className="block text-[10px] text-gray-400 dark:text-gray-500 text-center mt-2 leading-tight">
                * بعد فتح التطبيق واختيار المحادثة، قم بإرفاق ملف الـ PDF الذي قمت بتحميله في الخطوة الأولى.
              </span>
            </div>
          </div>

          <div className="pt-2 flex justify-center">
            <button
              onClick={() => setShareModalConfig(null)}
              className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 rounded-xl font-bold text-xs transition-colors cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>
      </Modal>

      {/* Clear Data Modal */}
      <Modal
        isOpen={showClearModal}
        onClose={() => setShowClearModal(false)}
        title="تأكيد مسح البيانات"
      >
        <div className="space-y-4 text-center">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <div className="space-y-2">
            <h4 className="font-bold text-[#1A2E1A] dark:text-white">
              هل أنت متأكد تماماً؟
            </h4>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              هذا الإجراء سيقوم بحذف جميع الخطط، التقدم، والإنجازات بشكل نهائي
              ولا يمكن التراجع عنه.
              <br />
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                ملاحظة: ستبقى الأذكار وإعدادات التطبيق كما هي ولن يتم حذفها.
              </span>
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => setShowClearModal(false)}
              className="px-4 py-3 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 rounded-2xl font-bold text-sm active:scale-95 transition-transform"
            >
              إلغاء
            </button>
            <button
              onClick={handleClearData}
              disabled={isClearing}
              className="px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-red-500/20 active:scale-95 transition-transform flex items-center justify-center gap-2"
            >
              {isClearing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              <span>نعم، امسح الآن</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Plan Modal */}
      <Modal
        isOpen={showDeletePlanModal}
        onClose={() => setShowDeletePlanModal(false)}
        title="تأكيد حذف الخطة"
      >
        <div className="space-y-4 text-center">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
            <Trash2 className="w-8 h-8 text-red-500" />
          </div>
          <div className="space-y-2">
            <h4 className="font-bold text-[#1A2E1A] dark:text-white">
              هل أنت متأكد من حذف هذه الخطة؟
            </h4>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              هذا الإجراء سيقوم بحذف الخطة القرآنية الحالية وجميع تفاصيل تقدمك
              للمهام المخصصة لها بشكل نهائي. 
              <br />
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                ملاحظة: ستبقى الأذكار والمهام العامة كما هي ولن يتم حذفها.
              </span>
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => setShowDeletePlanModal(false)}
              className="px-4 py-3 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 rounded-2xl font-bold text-sm active:scale-95 transition-transform"
            >
              إلغاء
            </button>
            <button
              onClick={handleDeleteActivePlan}
              disabled={isDeletingPlan}
              className="px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-red-500/20 active:scale-95 transition-transform flex items-center justify-center gap-2"
            >
              {isDeletingPlan ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              <span>تأكيد الحذف</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete All Adhkar Modal */}
      <Modal
        isOpen={showDeleteAllAdhkarModal}
        onClose={() => setShowDeleteAllAdhkarModal(false)}
        title="تأكيد حذف جميع الأذكار"
      >
        <div className="space-y-4 text-center font-rtl">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
            <Trash2 className="w-8 h-8 text-red-500" />
          </div>
          <div className="space-y-2">
            <h4 className="font-bold text-[#1A2E1A] dark:text-white">
              هل أنت متأكد من حذف جميع الأذكار والمهام؟
            </h4>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              سيقوم هذا الإجراء بمسح جميع الأذكار من قائمتك واستبدالها بذكر فارغ
              جديد. لا يمكن التراجع عن هذا العمل.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => setShowDeleteAllAdhkarModal(false)}
              className="px-4 py-3 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 rounded-2xl font-bold text-sm active:scale-95 transition-transform cursor-pointer"
            >
              إلغاء
            </button>
            <button
              onClick={() => {
                handleUpdateAdhkarList([{ dhikr: "", count: 1 }]);
                setShowDeleteAllAdhkarModal(false);
              }}
              className="px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-red-500/20 active:scale-95 transition-transform flex items-center justify-center gap-2 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>تأكيد الحذف</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Dhikr/Task Modal */}
      <Modal
        isOpen={dhikrToDeleteIndex !== null}
        onClose={() => setDhikrToDeleteIndex(null)}
        title="تأكيد حذف الذكر أو المهمة"
      >
        <div className="space-y-4 text-center">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
            <Trash2 className="w-8 h-8 text-red-500" />
          </div>
          <div className="space-y-2">
            <h4 className="font-bold text-[#1A2E1A] dark:text-white">
              هل أنت متأكد من رغبتك في حذف هذا البند؟
            </h4>
            {dhikrToDeleteIndex !== null &&
              globalAdhkarList[dhikrToDeleteIndex] && (
                <p className="text-xs p-3 bg-gray-50 dark:bg-black/20 rounded-xl border border-gray-100 dark:border-white/5 font-medium text-gray-600 dark:text-gray-300 inline-block max-w-full font-rtl break-words">
                  «{" "}
                  {globalAdhkarList[dhikrToDeleteIndex].dhikr ||
                    "ذكر أو مهمة فارغة"}{" "}
                  »
                </p>
              )}
            <p className="text-sm text-gray-400 dark:text-gray-500">
              سيتم إزالة هذا الذكر/المهمة من قائمة الأذكار اليومية العامة بشكل
              نهائي.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => setDhikrToDeleteIndex(null)}
              className="px-4 py-3 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 rounded-2xl font-bold text-sm active:scale-95 transition-transform cursor-pointer"
            >
              إلغاء
            </button>
            <button
              onClick={() => {
                if (dhikrToDeleteIndex !== null) {
                  const newList = [...globalAdhkarList];
                  newList.splice(dhikrToDeleteIndex, 1);
                  if (newList.length === 0) {
                    newList.push({ dhikr: "", count: 1 });
                  }
                  handleUpdateAdhkarList(newList);
                  setDhikrToDeleteIndex(null);
                }
              }}
              className="px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-red-500/20 active:scale-95 transition-transform flex items-center justify-center gap-2 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>تأكيد الحذف</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Import Plan Modal */}
      <ImportPlanModal
        isOpen={showImportPlanModal}
        onClose={() => setShowImportPlanModal(false)}
      />

      {/* Export Plan Modal */}
      <ExportPlanModal
        isOpen={showExportPlanModal}
        onClose={() => setShowExportPlanModal(false)}
        plan={activePlan}
      />
    </div>
  );
}
