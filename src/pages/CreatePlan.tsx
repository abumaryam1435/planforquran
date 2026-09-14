import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { db } from "../db/database";
import { savePlan, pauseActivePlans } from "../db/dbSync";
import { JUZ_PAGES } from "../utils/planGenerator";
import { DailyAmount, QuranPlan, PlanType, FlexibleDayConfig } from "../types";
import {
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Save,
  Calendar as CalendarIcon,
  Info,
  Book,
  FileText,
  Repeat,
  Layers,
  Search,
  Check,
  BookOpen,
  Heart,
  Download,
  Plus,
  Trash2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SURAH_METADATAList } from "../utils/quranPageMapping";

export default function CreatePlan() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEditMode = !!id;

  const isFirstRenderAfterLoad = useRef(true);

  const getFixationLabel = (type: string) => {
    switch (type) {
      case "juz":
        return "الجزء";
      case "hizb":
        return "الحزب";
      case "half_hizb":
        return "نصف الحزب";
      case "quarter_hizb":
        return "ربع الحزب";
      case "two_pages":
        return "الصفحتين";
      case "page":
        return "الصفحة";
      default:
        return "المقدار";
    }
  };

  const [mainPlanType, setMainPlanType] = useState<PlanType>("memorization");
  const [planName, setPlanName] = useState<string>("");

  // Memorization State
  const [planType, setPlanType] = useState<
    "juz" | "seven_castles" | "flexible"
  >("seven_castles");
  const [flexibleDayConfigs, setFlexibleDayConfigs] = useState<
    Record<number, FlexibleDayConfig>
  >(() => {
    const defaults: Record<number, FlexibleDayConfig> = {};
    for (let i = 0; i <= 6; i++) {
      defaults[i] = {
        hasMemorization: true,
        hasFixation: true,
        hasReview: true,
        hasCumulativeReview: false,
        hasOldMemorizationReview: true,
      };
    }
    return defaults;
  });
  const [flexibleDurationMode, setFlexibleDurationMode] = useState<
    "unlimited" | "weeks" | "range"
  >("unlimited");
  const [flexibleDurationWeeks, setFlexibleDurationWeeks] = useState<number>(3);
  const [flexibleEndDate, setFlexibleEndDate] = useState<string>("");
  const [juz, setJuz] = useState<number>(1);
  const [selectedJuzsToMemorize, setSelectedJuzsToMemorize] = useState<
    number[]
  >([]);
  const [startPage, setStartPage] = useState<number>(1);
  const [endPage, setEndPage] = useState<number>(21);
  const [dailyAmount, setDailyAmount] = useState<DailyAmount>(
    DailyAmount.ONE_PAGE,
  );

  // Review State
  const [reviewJuzAmount, setReviewJuzAmount] = useState<number>(3);
  const [reviewAmountType, setReviewAmountType] = useState<"juz" | "pages">(
    "juz",
  );
  const [reviewPageAmount, setReviewPageAmount] = useState<number>(10);
  const [fixationAmountType, setFixationAmountType] = useState<string>("hizb");
  const [fixationRepetitions, setFixationRepetitions] = useState<number>(4);
  const [fixationRepetitionMode, setFixationRepetitionMode] = useState<
    "entire_portion" | "page_by_page"
  >("entire_portion");
  const [includeFixation, setIncludeFixation] = useState<boolean>(true);
  const [includeRecitation, setIncludeRecitation] = useState<boolean>(false);
  const [includeListening, setIncludeListening] = useState<boolean>(false);
  const [firstDayOfWeek, setFirstDayOfWeek] = useState<number>(0);
  const [showPlanSummary, setShowPlanSummary] = useState<boolean>(false);

  // Memorization independent repetitions state
  const [dailyFixationRepetitions, setDailyFixationRepetitions] =
    useState<number>(5);
  const [weeklyReviewRepetitions, setWeeklyReviewRepetitions] =
    useState<number>(3);
  const [cumulativeReviewRepetitions, setCumulativeReviewRepetitions] =
    useState<number>(2);

  const [startDate, setStartDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );

  // Old Memorization State
  const [hasOldMemorization, setHasOldMemorization] = useState<boolean>(false);
  const [oldMemType, setOldMemType] = useState<"range" | "juz" | "surah">("range");
  const [oldMemorizationRanges, setOldMemorizationRanges] = useState<
    { start: number; end: number }[]
  >([{ start: 1, end: 20 }]);
  const [selectedOldJuzs, setSelectedOldJuzs] = useState<number[]>([]);
  const [selectedOldSurahs, setSelectedOldSurahs] = useState<string[]>([]);
  const [surahSearch, setSurahSearch] = useState<string>("");
  const [isSevenCastlesDescending, setIsSevenCastlesDescending] =
    useState<boolean>(false);
  const [sevenCastlesStartMode, setSevenCastlesStartMode] = useState<
    "juz" | "page"
  >("juz");
  const [flexibleStartMode, setFlexibleStartMode] = useState<
    "juz" | "page" | "surah"
  >("page");
  const [juzPlanStartMode, setJuzPlanStartMode] = useState<
    "juz" | "page" | "surah"
  >("juz");
  const [selectedJuzSurahs, setSelectedJuzSurahs] = useState<string[]>([]);
  const [juzSurahSearch, setJuzSurahSearch] = useState<string>("");
  const [oldMemReviewMode, setOldMemReviewMode] = useState<
    "auto" | "custom_days" | "custom_amount"
  >("auto");
  const [oldMemCustomDays, setOldMemCustomDays] = useState<number>(7);
  const [oldMemCustomAmountType, setOldMemCustomAmountType] = useState<
    "pages" | "quarter_hizb" | "juz"
  >("pages");
  const [oldMemCustomAmountValue, setOldMemCustomAmountValue] =
    useState<number>(10);

  // Info panels collapse/expand states
  const [showInfoDailyAmount, setShowInfoDailyAmount] = useState<boolean>(false);
  const [showReviewInfo, setShowReviewInfo] = useState<boolean>(false);

  // Adhkar State
  const [addAdhkar, setAddAdhkar] = useState<boolean>(false);
  const [adhkarList, setAdhkarList] = useState<
    { dhikr: string; count: number }[]
  >([{ dhikr: "", count: 1 }]);

  const getJuzForPage = (page: number): number => {
    for (let j = 1; j <= 30; j++) {
      const range = JUZ_PAGES[j];
      if (range && page >= range.start && page <= range.end) {
        return j;
      }
    }
    return 1;
  };

  // Specific Review State for consolidation plan
  const [isSpecificReview, setIsSpecificReview] = useState<boolean>(false);
  const [reviewRangeMode, setReviewRangeMode] = useState<
    "full" | "specific" | "custom_pages"
  >("full");
  const [reviewStartPage, setReviewStartPage] = useState<number>(1);
  const [reviewEndPage, setReviewEndPage] = useState<number>(604);
  const [specificReviewType, setSpecificReviewType] = useState<"juz" | "surah">(
    "juz",
  );
  const [selectedReviewJuzs, setSelectedReviewJuzs] = useState<number[]>([]);
  const [selectedReviewSurahs, setSelectedReviewSurahs] = useState<string[]>(
    [],
  );
  const [reviewSurahSearch, setReviewSurahSearch] = useState<string>("");
  const [reviewStartJuz, setReviewStartJuz] = useState<number>(1);
  const [reviewTracks, setReviewTracks] = useState<any[]>([]);

  const createNewReviewTrack = () => ({
    id: `track-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    reviewRangeMode: "full" as const,
    reviewStartPage: 1,
    reviewEndPage: 604,
    selectedReviewJuzs: [],
    selectedReviewSurahs: [],
    reviewAmountType: "juz" as const,
    reviewJuzAmount: 2,
    reviewPageAmount: 10,
    startJuz: 1,
    specificReviewType: "juz" as const,
    surahSearch: "",
  });

  const updateTrack = (id: string, updatedFields: Partial<any>) => {
    setReviewTracks(prev => prev.map(t => t.id === id ? { ...t, ...updatedFields } : t));
  };

  const removeTrack = (id: string) => {
    setReviewTracks(prev => prev.filter(t => t.id !== id));
  };

  const addTrack = () => {
    setReviewTracks(prev => [...prev, createNewReviewTrack()]);
  };

  // Specific Fixation State for consolidation plan (المراجعة العميقة والتثبيت)
  const [isSpecificFixation, setIsSpecificFixation] = useState<boolean>(false);
  const [fixationRangeMode, setFixationRangeMode] = useState<
    "full" | "specific" | "custom_pages"
  >("full");
  const [fixationStartPage, setFixationStartPage] = useState<number>(1);
  const [fixationEndPage, setFixationEndPage] = useState<number>(604);
  const [specificFixationType, setSpecificFixationType] = useState<
    "juz" | "surah"
  >("juz");
  const [selectedFixationJuzs, setSelectedFixationJuzs] = useState<number[]>(
    [],
  );
  const [selectedFixationSurahs, setSelectedFixationSurahs] = useState<
    string[]
  >([]);
  const [fixationSurahSearch, setFixationSurahSearch] = useState<string>("");

  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Load existing plan if in edit mode
  useEffect(() => {
    if (isEditMode && id) {
      db.plans.get(Number(id)).then((plan) => {
        if (plan) {
          if (plan.name) {
            setPlanName(plan.name);
          }
          if (plan.planType) {
            setMainPlanType(plan.planType);
          }
          if (plan.isFlexible) {
            setPlanType("flexible");
            if (plan.flexibleDayConfigs) {
              const defaults: Record<number, FlexibleDayConfig> = {};
              for (let i = 0; i <= 6; i++) {
                defaults[i] = {
                  hasMemorization: true,
                  hasFixation: true,
                  hasReview: true,
                  hasCumulativeReview: false,
                  hasOldMemorizationReview: true,
                };
              }
              setFlexibleDayConfigs({
                ...defaults,
                ...plan.flexibleDayConfigs,
              });
            }
            if (plan.selectedJuzsToMemorize) {
              setSelectedJuzsToMemorize(plan.selectedJuzsToMemorize);
              if (plan.selectedJuzsToMemorize.length > 0) {
                setJuz(plan.selectedJuzsToMemorize[0]);
              }
            } else if (plan.juzNumber !== undefined) {
              setSelectedJuzsToMemorize([plan.juzNumber]);
              setJuz(plan.juzNumber);
            }
            if (plan.flexibleDurationMode) {
              setFlexibleDurationMode(plan.flexibleDurationMode);
            }
            if (plan.flexibleDurationWeeks !== undefined) {
              setFlexibleDurationWeeks(plan.flexibleDurationWeeks);
            }
            if (plan.flexibleEndDate) {
              setFlexibleEndDate(
                new Date(plan.flexibleEndDate).toISOString().split("T")[0],
              );
            }
            if (plan.flexibleStartMode) {
              setFlexibleStartMode(
                plan.flexibleStartMode as "juz" | "page" | "surah",
              );
            } else if (
              plan.selectedJuzsToMemorize &&
              plan.selectedJuzsToMemorize.length > 0
            ) {
              // Fallback for older plans: if juzs were selected, it was probably 'juz' mode
              setFlexibleStartMode("juz");
            }
          } else if (plan.isSevenCastles) {
            setPlanType("seven_castles");
            setJuz(plan.juzNumber || 1);
            if (plan.sevenCastlesStartMode) {
              setSevenCastlesStartMode(plan.sevenCastlesStartMode);
            }
          } else if (plan.juzNumber !== undefined) {
            setPlanType("juz");
            setJuz(plan.juzNumber);
            if (plan.juzPlanStartMode) {
              setJuzPlanStartMode(plan.juzPlanStartMode);
            } else if (
              plan.selectedJuzsToMemorize &&
              plan.selectedJuzsToMemorize.length > 0
            ) {
              setJuzPlanStartMode("juz");
            } else if (
              plan.selectedJuzSurahs &&
              plan.selectedJuzSurahs.length > 0
            ) {
              setJuzPlanStartMode("surah");
            } else {
              setJuzPlanStartMode("page");
            }
            if (plan.selectedJuzSurahs) {
              setSelectedJuzSurahs(plan.selectedJuzSurahs);
            }
            if (plan.selectedJuzsToMemorize) {
              setSelectedJuzsToMemorize(plan.selectedJuzsToMemorize);
            } else {
              setSelectedJuzsToMemorize([plan.juzNumber]);
            }
          } else {
            setPlanType("juz");
            setJuzPlanStartMode("page");
          }
          setStartPage(plan.startPage);
          setEndPage(plan.endPage);
          setDailyAmount(plan.dailyAmount);
          if (plan.reviewJuzAmount !== undefined) {
            setReviewJuzAmount(plan.reviewJuzAmount);
          }
          if (plan.reviewAmountType !== undefined) {
            setReviewAmountType(plan.reviewAmountType);
          }
          if (plan.reviewPageAmount !== undefined) {
            setReviewPageAmount(plan.reviewPageAmount);
          }
          if (plan.fixationAmountType !== undefined) {
            setFixationAmountType(plan.fixationAmountType);
          }
          if (plan.fixationRepetitions !== undefined) {
            setFixationRepetitions(plan.fixationRepetitions);
          }
          if (plan.fixationRepetitionMode !== undefined) {
            setFixationRepetitionMode(plan.fixationRepetitionMode);
          }
          if (plan.dailyFixationRepetitions !== undefined) {
            setDailyFixationRepetitions(plan.dailyFixationRepetitions);
          }
          if (plan.weeklyReviewRepetitions !== undefined) {
            setWeeklyReviewRepetitions(plan.weeklyReviewRepetitions);
          }
          if (plan.cumulativeReviewRepetitions !== undefined) {
            setCumulativeReviewRepetitions(plan.cumulativeReviewRepetitions);
          }
          if (plan.includeFixation !== undefined) {
            setIncludeFixation(plan.includeFixation);
          }
          if (plan.includeRecitation !== undefined) {
            setIncludeRecitation(plan.includeRecitation);
          }
          if (plan.includeListening !== undefined) {
            setIncludeListening(plan.includeListening);
          }
          if (plan.firstDayOfWeek !== undefined) {
            setFirstDayOfWeek(plan.firstDayOfWeek);
          }
          if (plan.startDate) {
            setStartDate(new Date(plan.startDate).toISOString().split("T")[0]);
          }
          if (plan.hasOldMemorization !== undefined) {
            setHasOldMemorization(plan.hasOldMemorization);
          }
          if (plan.oldMemorizationReviewMode !== undefined) {
            setOldMemReviewMode(plan.oldMemorizationReviewMode);
          }
          if (plan.oldMemorizationCustomDays !== undefined) {
            setOldMemCustomDays(plan.oldMemorizationCustomDays);
          }
          if (plan.oldMemorizationCustomAmountType !== undefined) {
            setOldMemCustomAmountType(plan.oldMemorizationCustomAmountType);
          }
          if (plan.oldMemorizationCustomAmountValue !== undefined) {
            setOldMemCustomAmountValue(plan.oldMemorizationCustomAmountValue);
          }
          if (plan.addAdhkar !== undefined) {
            setAddAdhkar(plan.addAdhkar);
          }
          if (plan.adhkarList !== undefined && plan.adhkarList.length > 0) {
            setAdhkarList(plan.adhkarList);
          }
          if (plan.isSevenCastlesDescending !== undefined) {
            setIsSevenCastlesDescending(plan.isSevenCastlesDescending);
          }
          if (plan.reviewTracks && plan.reviewTracks.length > 0) {
            const [mainTrack, ...additionalTracks] = plan.reviewTracks;
            if (mainTrack.reviewRangeMode !== undefined) {
              setReviewRangeMode(mainTrack.reviewRangeMode);
              setIsSpecificReview(mainTrack.reviewRangeMode !== "full");
            }
            if (mainTrack.reviewStartPage !== undefined) setReviewStartPage(mainTrack.reviewStartPage);
            if (mainTrack.reviewEndPage !== undefined) setReviewEndPage(mainTrack.reviewEndPage);
            if (mainTrack.selectedReviewJuzs !== undefined) setSelectedReviewJuzs(mainTrack.selectedReviewJuzs);
            if (mainTrack.selectedReviewSurahs !== undefined) setSelectedReviewSurahs(mainTrack.selectedReviewSurahs);
            if (mainTrack.reviewAmountType !== undefined) setReviewAmountType(mainTrack.reviewAmountType);
            if (mainTrack.reviewJuzAmount !== undefined) setReviewJuzAmount(mainTrack.reviewJuzAmount);
            if (mainTrack.reviewPageAmount !== undefined) setReviewPageAmount(mainTrack.reviewPageAmount);
            if (mainTrack.startJuz !== undefined) setReviewStartJuz(mainTrack.startJuz);
            setReviewTracks(additionalTracks);
          } else {
            if (plan.isSpecificReview !== undefined) {
              setIsSpecificReview(plan.isSpecificReview);
            }
            if (plan.reviewRangeMode !== undefined) {
              setReviewRangeMode(plan.reviewRangeMode);
            } else if (plan.isSpecificReview !== undefined) {
              setReviewRangeMode(plan.isSpecificReview ? "specific" : "full");
            }
            if (plan.reviewStartPage !== undefined) {
              setReviewStartPage(plan.reviewStartPage);
            }
            if (plan.reviewEndPage !== undefined) {
              setReviewEndPage(plan.reviewEndPage);
            }
            if (plan.selectedReviewJuzs !== undefined) {
              setSelectedReviewJuzs(plan.selectedReviewJuzs);
            }
            if (plan.selectedReviewSurahs !== undefined) {
              setSelectedReviewSurahs(plan.selectedReviewSurahs);
            }
            if (plan.startJuz !== undefined) {
              setReviewStartJuz(plan.startJuz);
            }
            setReviewTracks([]);
          }
          if (plan.isSpecificFixation !== undefined) {
            setIsSpecificFixation(plan.isSpecificFixation);
          }
          if (plan.fixationRangeMode !== undefined) {
            setFixationRangeMode(plan.fixationRangeMode);
          } else if (plan.isSpecificFixation !== undefined) {
            setFixationRangeMode(plan.isSpecificFixation ? "specific" : "full");
          }
          if (plan.fixationStartPage !== undefined) {
            setFixationStartPage(plan.fixationStartPage);
          }
          if (plan.fixationEndPage !== undefined) {
            setFixationEndPage(plan.fixationEndPage);
          }
          if (plan.selectedFixationJuzs !== undefined) {
            setSelectedFixationJuzs(plan.selectedFixationJuzs);
          }
          if (plan.selectedFixationSurahs !== undefined) {
            setSelectedFixationSurahs(plan.selectedFixationSurahs);
          }

          if (plan.hasOldMemorization) {
            if (plan.oldMemType) {
              setOldMemType(plan.oldMemType);
            }

            if (plan.oldMemorizationRanges && plan.oldMemorizationRanges.length > 0) {
              setOldMemorizationRanges(plan.oldMemorizationRanges);
            } else if (plan.oldMemorizedPages && plan.oldMemorizedPages.length > 0) {
              const sorted = [...new Set(plan.oldMemorizedPages)].sort((a, b) => a - b);
              const derivedRanges: { start: number; end: number }[] = [];
              let curStart = sorted[0];
              let curEnd = sorted[0];
              for (let i = 1; i < sorted.length; i++) {
                if (sorted[i] === curEnd + 1) {
                  curEnd = sorted[i];
                } else {
                  derivedRanges.push({ start: curStart, end: curEnd });
                  curStart = sorted[i];
                  curEnd = sorted[i];
                }
              }
              derivedRanges.push({ start: curStart, end: curEnd });
              setOldMemorizationRanges(derivedRanges);
            }

            if (plan.oldMemorizedPages) {
              const pagesSet = new Set(plan.oldMemorizedPages);
              const juzMatched: number[] = [];

              for (let j = 1; j <= 30; j++) {
                const r = JUZ_PAGES[j];
                if (r) {
                  let allIn = true;
                  for (let p = r.start; p <= r.end; p++) {
                    if (!pagesSet.has(p)) {
                      allIn = false;
                      break;
                    }
                  }
                  if (allIn) {
                    juzMatched.push(j);
                  }
                }
              }
              setSelectedOldJuzs(juzMatched);

              const surahsMatched: string[] = [];
              SURAH_METADATAList.forEach((s) => {
                let allInSurah = true;
                for (let p = s.startPage; p <= s.endPage; p++) {
                  if (!pagesSet.has(p)) {
                    allInSurah = false;
                    break;
                  }
                }
                if (allInSurah) {
                  const alreadyCoveredByJuz = juzMatched.some((j) => {
                    const r = JUZ_PAGES[j];
                    return r && s.startPage >= r.start && s.endPage <= r.end;
                  });
                  if (!alreadyCoveredByJuz) {
                    surahsMatched.push(s.name);
                  }
                }
              });
              setSelectedOldSurahs(surahsMatched);
            }
          }
          setIsLoaded(true);
        }
      });
    } else {
      setIsLoaded(true);
    }
  }, [isEditMode, id]);

  // Reset the initial load flag slightly after load is complete to allow the initial render
  // to run with the fetched values without being overwritten by automatic calculations
  useEffect(() => {
    if (isLoaded) {
      const timer = setTimeout(() => {
        isFirstRenderAfterLoad.current = false;
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isLoaded]);

  const getCombinedOldPages = (): number[] => {
    const pagesSet = new Set<number>();

    if (oldMemType === "range") {
      oldMemorizationRanges.forEach((range) => {
        const start = Math.min(604, Math.max(1, Number(range.start) || 1));
        const end = Math.min(604, Math.max(1, Number(range.end) || 1));
        const minP = Math.min(start, end);
        const maxP = Math.max(start, end);
        for (let p = minP; p <= maxP; p++) {
          pagesSet.add(p);
        }
      });
    } else if (oldMemType === "juz") {
      selectedOldJuzs.forEach((j) => {
        const range = JUZ_PAGES[j];
        if (range) {
          for (let p = range.start; p <= range.end; p++) {
            pagesSet.add(p);
          }
        }
      });
    } else if (oldMemType === "surah") {
      selectedOldSurahs.forEach((name) => {
        const s = SURAH_METADATAList.find((item) => item.name === name);
        if (s) {
          for (let p = s.startPage; p <= s.endPage; p++) {
            pagesSet.add(p);
          }
        }
      });
    }

    return Array.from(pagesSet).sort((a, b) => a - b);
  };

  const toggleJuzToMemorize = (num: number) => {
    setSelectedJuzsToMemorize((prev) => {
      if (prev.includes(num)) {
        // Must keep at least one selected
        const filtered = prev.filter((x) => x !== num);
        return filtered.length > 0 ? filtered : prev;
      } else {
        return [...prev, num].sort((a, b) => a - b);
      }
    });
  };

  const getCombinedReviewPages = (): number[] => {
    if (reviewRangeMode === "custom_pages") {
      const pages: number[] = [];
      const start = Math.min(604, Math.max(1, reviewStartPage));
      const end = Math.min(604, Math.max(1, reviewEndPage));
      const minP = Math.min(start, end);
      const maxP = Math.max(start, end);
      for (let p = minP; p <= maxP; p++) {
        pages.push(p);
      }
      return pages;
    }

    const pagesSet = new Set<number>();

    selectedReviewJuzs.forEach((j) => {
      const range = JUZ_PAGES[j];
      if (range) {
        for (let p = range.start; p <= range.end; p++) {
          pagesSet.add(p);
        }
      }
    });

    selectedReviewSurahs.forEach((name) => {
      const s = SURAH_METADATAList.find((item) => item.name === name);
      if (s) {
        for (let p = s.startPage; p <= s.endPage; p++) {
          pagesSet.add(p);
        }
      }
    });

    return Array.from(pagesSet).sort((a, b) => a - b);
  };

  const getCombinedPagesForTrack = (track: any): number[] => {
    if (track.reviewRangeMode === "custom_pages") {
      const pages: number[] = [];
      const start = Math.min(604, Math.max(1, track.reviewStartPage || 1));
      const end = Math.min(604, Math.max(1, track.reviewEndPage || 604));
      const minP = Math.min(start, end);
      const maxP = Math.max(start, end);
      for (let p = minP; p <= maxP; p++) {
        pages.push(p);
      }
      return pages;
    }

    const pagesSet = new Set<number>();

    (track.selectedReviewJuzs || []).forEach((j: number) => {
      const range = JUZ_PAGES[j];
      if (range) {
        for (let p = range.start; p <= range.end; p++) {
          pagesSet.add(p);
        }
      }
    });

    (track.selectedReviewSurahs || []).forEach((name: string) => {
      const s = SURAH_METADATAList.find((item) => item.name === name);
      if (s) {
        for (let p = s.startPage; p <= s.endPage; p++) {
          pagesSet.add(p);
        }
      }
    });

    return Array.from(pagesSet).sort((a, b) => a - b);
  };

  const toggleReviewJuz = (num: number) => {
    setSelectedReviewJuzs((prev) => {
      if (prev.includes(num)) {
        return prev.filter((x) => x !== num);
      } else {
        return [...prev, num].sort((a, b) => a - b);
      }
    });
  };

  const toggleReviewSurah = (name: string) => {
    setSelectedReviewSurahs((prev) => {
      if (prev.includes(name)) {
        return prev.filter((x) => x !== name);
      } else {
        return [...prev, name];
      }
    });
  };

  const getCombinedFixationPages = (): number[] => {
    if (fixationRangeMode === "custom_pages") {
      const pages: number[] = [];
      const start = Math.min(604, Math.max(1, fixationStartPage));
      const end = Math.min(604, Math.max(1, fixationEndPage));
      const minP = Math.min(start, end);
      const maxP = Math.max(start, end);
      for (let p = minP; p <= maxP; p++) {
        pages.push(p);
      }
      return pages;
    }

    const pagesSet = new Set<number>();

    selectedFixationJuzs.forEach((j) => {
      const range = JUZ_PAGES[j];
      if (range) {
        for (let p = range.start; p <= range.end; p++) {
          pagesSet.add(p);
        }
      }
    });

    selectedFixationSurahs.forEach((name) => {
      const s = SURAH_METADATAList.find((item) => item.name === name);
      if (s) {
        for (let p = s.startPage; p <= s.endPage; p++) {
          pagesSet.add(p);
        }
      }
    });

    return Array.from(pagesSet).sort((a, b) => a - b);
  };

  const toggleFixationJuz = (num: number) => {
    setSelectedFixationJuzs((prev) => {
      if (prev.includes(num)) {
        return prev.filter((x) => x !== num);
      } else {
        return [...prev, num].sort((a, b) => a - b);
      }
    });
  };

  const toggleFixationSurah = (name: string) => {
    setSelectedFixationSurahs((prev) => {
      if (prev.includes(name)) {
        return prev.filter((x) => x !== name);
      } else {
        return [...prev, name];
      }
    });
  };

  const getCombinedMemorizationPages = (): number[] => {
    const pagesSet = new Set<number>();

    if (planType === "juz") {
      if (juzPlanStartMode === "juz") {
        selectedJuzsToMemorize.forEach((j) => {
          const range = JUZ_PAGES[j];
          if (range) {
            for (let p = range.start; p <= range.end; p++) {
              pagesSet.add(p);
            }
          }
        });
      } else if (juzPlanStartMode === "surah") {
        selectedJuzSurahs.forEach((name) => {
          const s = SURAH_METADATAList.find((item) => item.name === name);
          if (s) {
            for (let p = s.startPage; p <= s.endPage; p++) {
              pagesSet.add(p);
            }
          }
        });
      } else if (juzPlanStartMode === "page") {
        const start = Math.min(604, Math.max(1, startPage));
        const end = Math.min(604, Math.max(1, endPage));
        const minP = Math.min(start, end);
        const maxP = Math.max(start, end);
        for (let p = minP; p <= maxP; p++) {
          pagesSet.add(p);
        }
      }
    } else if (planType === "flexible") {
      const start = Math.min(604, Math.max(1, startPage));
      const end = Math.min(604, Math.max(1, endPage));
      const minP = Math.min(start, end);
      const maxP = Math.max(start, end);
      for (let p = minP; p <= maxP; p++) {
        pagesSet.add(p);
      }
    }
    return Array.from(pagesSet).sort((a, b) => a - b);
  };

  const oldPagesCount = getCombinedOldPages().length;

  const DAYS_AR = [
    "الأحد",
    "الإثنين",
    "الثلاثاء",
    "الأربعاء",
    "الخميس",
    "الجمعة",
    "السبت",
  ];

  const getPagesPerDay = (amount: DailyAmount): number => {
    switch (amount) {
      case DailyAmount.QUARTER_PAGE:
        return 0.25;
      case DailyAmount.HALF_PAGE:
        return 0.5;
      case DailyAmount.ONE_PAGE:
        return 1.0;
      case DailyAmount.TWO_PAGES:
        return 2.0;
      case DailyAmount.QUARTER_HIZB:
        return 2.5;
      case DailyAmount.THREE_PAGES:
        return 3.0;
      case DailyAmount.FOUR_PAGES:
        return 4.0;
      case DailyAmount.FIVE_PAGES:
        return 5.0;
      default:
        return 1.0;
    }
  };

  const dailyAmountLabels: Record<DailyAmount, string> = {
    [DailyAmount.QUARTER_PAGE]: "ربع صفحة",
    [DailyAmount.HALF_PAGE]: "نصف صفحة",
    [DailyAmount.ONE_PAGE]: "صفحة واحدة",
    [DailyAmount.TWO_PAGES]: "صفحتان",
    [DailyAmount.QUARTER_HIZB]: "ربع حزب (صفحتان ونصف)",
    [DailyAmount.THREE_PAGES]: "٣ صفحات",
    [DailyAmount.FOUR_PAGES]: "٤ صفحات",
    [DailyAmount.FIVE_PAGES]: "٥ صفحات",
  };

  const getPlanTypeLabel = () => {
    if (mainPlanType === "review") {
      return "خطة مراجعة مستقلة";
    }
    if (planType === "seven_castles") {
      return "خطة القلاع السبع لتثبيت جزء";
    }
    if (planType === "juz") {
      return "خطة حفظ الأجزاء المحددة";
    }
    if (planType === "flexible") {
      return "خطة مرنة (صفحات مخصصة)";
    }
    return "";
  };

  const getNewMemorizationSummary = () => {
    if (mainPlanType !== "memorization") return "لا يوجد (خطة مراجعة فقط)";
    let rangeText = `من صفحة ${startPage} إلى صفحة ${endPage}`;
    const totalPages = Math.abs(endPage - startPage) + 1;
    return `${rangeText} (إجمالي ${totalPages} صفحة)`;
  };

  const getOldMemorizationSummary = () => {
    if (mainPlanType !== "memorization") return "غير محدد (خطة مراجعة مستقلة)";
    if (!hasOldMemorization || oldPagesCount === 0) {
      return "لا يوجد محفوظ قديم تم تحديده في هذه الخطة";
    }
    const partsCount = (oldPagesCount / 20).toFixed(1);
    const reviewModeText =
      oldMemReviewMode === "custom_days"
        ? `مقسمة على ${oldMemCustomDays} يوم مراجعة مخصص`
        : "تلقائي حسب الخطة";
    return `تم تحديد ${oldPagesCount} صفحة للمراجعة (حوالي ${partsCount} جزء) - ${reviewModeText}`;
  };

  const getExpectedDuration = () => {
    if (mainPlanType === "review") {
      const isSpec = reviewRangeMode !== "full";
      const reviewPagesCount = isSpec ? getCombinedReviewPages().length : 604;

      let dailyPages =
        reviewAmountType === "pages"
          ? reviewPageAmount || 10
          : (reviewJuzAmount || 1) * 20;
      let targetPagesCount = reviewPagesCount;
      if (includeFixation && fixationAmountType) {
        const isSpecFix = fixationRangeMode !== "full";
        targetPagesCount = isSpecFix ? getCombinedFixationPages().length : 604;
        switch (fixationAmountType) {
          case "juz":
            dailyPages = 20;
            break;
          case "hizb":
            dailyPages = 10;
            break;
          case "half_hizb":
            dailyPages = 5;
            break;
          case "quarter_hizb":
            dailyPages = 2.5;
            break;
          case "two_pages":
            dailyPages = 2;
            break;
          case "page":
            dailyPages = 1;
            break;
        }
      }

      const daysNeeded = Math.ceil(targetPagesCount / dailyPages);
      const weeksNeeded = Math.ceil(daysNeeded / 7);

      if (includeFixation) {
        return `${daysNeeded} يوماً لختم الخطة وإنهاء التثبيت والتكرار (بمعدل حوالي ${weeksNeeded} أسابيع)`;
      } else {
        return `${daysNeeded} يوماً لختم دورة مراجعة واحدة (بمعدل حوالي ${weeksNeeded} أسابيع)`;
      }
    }

    if (planType === "seven_castles") {
      return "11 أسبوعاً للتثبيت والختم المتقن للقلاع السبع (6 أيام حفظ لكل قلعة)";
    }

    const totalPages = Math.abs(endPage - startPage) + 1;
    const pagesPerDay = getPagesPerDay(dailyAmount);

    if (planType === "flexible") {
      if (flexibleDurationMode === "weeks" && flexibleDurationWeeks) {
        return `${flexibleDurationWeeks} أسبوع (محددة يدوياً حسب التخصيص)`;
      }
      if (flexibleDurationMode === "range" && flexibleEndDate) {
        const diffTime = Math.abs(
          new Date(flexibleEndDate).getTime() - new Date(startDate).getTime(),
        );
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const diffWeeks = Math.ceil(diffDays / 7);
        return `${diffWeeks} أسبوع تقريباً (حتى تاريخ ${new Date(flexibleEndDate).toLocaleDateString("ar-EG")})`;
      }
      // calculate based on active memorization days in config
      const activeMemDays = Object.values(flexibleDayConfigs).filter(
        (d: FlexibleDayConfig) => d.hasMemorization,
      ).length;
      if (activeMemDays > 0) {
        const pagesPerWeek = pagesPerDay * activeMemDays;
        const weeks = Math.ceil(totalPages / pagesPerWeek);
        return `حوالي ${weeks} أسبوع (بناءً على ${activeMemDays} أيام حفظ أسبوعياً)`;
      }
      return "يُرجى تفعيل يوم حفظ واحد على الأقل لحساب المدة!";
    }

    // standard juz plan (5 days memorization per week)
    const pagesPerWeek = pagesPerDay * 5;
    const weeks = Math.ceil(totalPages / pagesPerWeek);
    return `حوالي ${weeks} أسبوع (بمعدل 5 أيام حفظ أسبوعيًا وكل أسبوع يكتمل فيه حفظ مقدار ${pagesPerWeek} صفحة)`;
  };

  const getPlanMechanismExplanation = () => {
    if (mainPlanType === "review") {
      return "هذه الخطة تركز بالكامل على مراجعة وتكرار وتثبيت محفوظك الحالي بشكل مستمر بدون تداخل للحفظ الجديد. ستحصل على مهام يومية لقراءة ومراجعة وتصحيح المقدار المحدد.";
    }
    if (planType === "seven_castles") {
      return "تعتمد التثبيت المكثف عبر تقسيم حفظ الجزء الواحد إلى 7 قلاع متتالية. يتضمن حفظ أجزاء صغيرة ومراجعتها المستمرة على مدار أيام الأسبوع حتى يتم التثبيت والختم المتقن.";
    }
    if (planType === "juz") {
      return "منهجية الحفظ المنهجي تقسم كل أسبوع من الخطة إلى: 5 أيام لحفظ مقدار جديد يومي وتثبيته مباشرة، يليه يوم للمراجعة الأسبوعية، ثم يوم للمراجعة والتثبيت التراكمي والتسميع، وتحتوي الخطة على مراجعة المحفوظ القريب ومراجعة المحفوظ القديم.";
    }
    if (planType === "flexible") {
      return "خطة مخصصة ومرنة تتيح لك اختيار وتفصيل أيام الحفظ الدقيق وأيام التراكمي وتثبيت القريب والبعيد بما يتلاءم مع أسلوب حياتك وجدول أوقاتك اليومي.";
    }
    return "";
  };

  const getDayOfWeek = (dateStr: string): number => {
    if (!dateStr) return -1;
    const [year, month, day] = dateStr.split("-").map(Number);
    const d = new Date(year, month - 1, day);
    return d.getDay();
  };

  const getNearestMatchingDate = (
    baseDateStr: string,
    targetDayOfWeek: number,
  ): string => {
    const [year, month, day] = baseDateStr.split("-").map(Number);
    const d = new Date(year, month - 1, day);
    const currentDayOfWeek = d.getDay();
    let adjustDays = targetDayOfWeek - currentDayOfWeek;
    if (adjustDays > 3) adjustDays -= 7;
    else if (adjustDays < -3) adjustDays += 7;
    d.setDate(d.getDate() + adjustDays);

    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const rDay = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${rDay}`;
  };

  const dateDayOfWeek = getDayOfWeek(startDate);
  const isDateValid = dateDayOfWeek === firstDayOfWeek;

  const isSelectionValid = (() => {
    if (mainPlanType === "memorization" && planType === "juz") {
      if (juzPlanStartMode === "juz") {
        return selectedJuzsToMemorize.length > 0;
      } else if (juzPlanStartMode === "surah") {
        return selectedJuzSurahs.length > 0;
      }
    }
    return true;
  })();

  const canProceed = isDateValid && isSelectionValid;

  // Keep start date aligned to the selected first day of the week when firstDayOfWeek changes
  useEffect(() => {
    if (isEditMode && !isLoaded) return;
    if (isEditMode && isFirstRenderAfterLoad.current) return;
    if (startDate) {
      const adjusted = getNearestMatchingDate(startDate, firstDayOfWeek);
      if (adjusted !== startDate) {
        setStartDate(adjusted);
      }
    }
  }, [firstDayOfWeek, isLoaded, isEditMode]);

  // Update pages when juz or selectedJuzsToMemorize changes
  useEffect(() => {
    if (isEditMode && !isLoaded) return;
    if (isEditMode && isFirstRenderAfterLoad.current) return;
    if (mainPlanType === "memorization") {
      if (
        planType === "seven_castles" &&
        sevenCastlesStartMode === "juz" &&
        JUZ_PAGES[juz]
      ) {
        if (isSevenCastlesDescending) {
          setStartPage(JUZ_PAGES[juz].end);
        } else {
          setStartPage(JUZ_PAGES[juz].start);
        }
      } else if (
        (planType === "juz" || planType === "flexible") &&
        selectedJuzsToMemorize.length > 0
      ) {
        const sorted = [...selectedJuzsToMemorize].sort((a, b) => a - b);
        const firstJuz = sorted[0];
        const lastJuz = sorted[sorted.length - 1];
        if (JUZ_PAGES[firstJuz] && JUZ_PAGES[lastJuz]) {
          setStartPage(JUZ_PAGES[firstJuz].start);
          setEndPage(JUZ_PAGES[lastJuz].end);
        }
      }
    }
  }, [
    juz,
    selectedJuzsToMemorize,
    planType,
    mainPlanType,
    isSevenCastlesDescending,
    sevenCastlesStartMode,
    isLoaded,
    isEditMode,
  ]);

  // Update endPage for seven castles plan based on startPage and dailyAmount
  useEffect(() => {
    if (isEditMode && !isLoaded) return;
    if (isEditMode && isFirstRenderAfterLoad.current) return;
    if (mainPlanType === "memorization" && planType === "seven_castles") {
      let multiplier = 42;
      if (dailyAmount === DailyAmount.QUARTER_PAGE) multiplier = 11;
      if (dailyAmount === DailyAmount.HALF_PAGE) multiplier = 21;
      if (dailyAmount === DailyAmount.TWO_PAGES) multiplier = 84;
      if (dailyAmount === DailyAmount.QUARTER_HIZB) multiplier = 105;
      if (dailyAmount === DailyAmount.THREE_PAGES) multiplier = 126;
      if (dailyAmount === DailyAmount.FOUR_PAGES) multiplier = 168;
      if (dailyAmount === DailyAmount.FIVE_PAGES) multiplier = 210;

      if (isSevenCastlesDescending) {
        const calculatedEnd = startPage - multiplier + 1;
        setEndPage(Math.max(calculatedEnd, 1));
      } else {
        const calculatedEnd = startPage + multiplier - 1;
        setEndPage(Math.min(calculatedEnd, 604));
      }
    }
  }, [
    planType,
    startPage,
    dailyAmount,
    mainPlanType,
    isSevenCastlesDescending,
    isLoaded,
    isEditMode,
  ]);

  const handleSave = async () => {
    if (!isDateValid) return;
    setSaveError(null);

    // Validate that at least one juz or surah is selected when planType is "juz"
    if (mainPlanType === "memorization" && planType === "juz") {
      if (juzPlanStartMode === "juz" && selectedJuzsToMemorize.length === 0) {
        setSaveError("يرجى تحديد جزء واحد على الأقل للحفظ.");
        return;
      }
      if (juzPlanStartMode === "surah" && selectedJuzSurahs.length === 0) {
        setSaveError("يرجى تحديد سورة واحدة على الأقل للحفظ.");
        return;
      }
    }

    setIsSaving(true);
    let planData: any;

    let finalName = planName.trim();
    if (!finalName) {
       const existingPlans = await db.plans.toArray();
       const prefix = mainPlanType === "memorization" ? "خطة حفظ" : "خطة مراجعة";
       
       if (isEditMode && id) {
          const currentPlan = existingPlans.find(p => p.id === Number(id));
          if (currentPlan && currentPlan.name && currentPlan.name.startsWith(prefix)) {
             finalName = currentPlan.name;
          }
       }
       
       if (!finalName) {
           let maxNum = 0;
           existingPlans.forEach(p => {
               if (p.name && p.name.startsWith(prefix)) {
                   const numMatch = p.name.match(/\d+/);
                   if (numMatch) {
                       const num = parseInt(numMatch[0]);
                       if (num > maxNum) maxNum = num;
                   }
               }
           });
           finalName = `${prefix} ${maxNum + 1}`;
       }
    }

    const sharedData = {
      name: finalName,
      addAdhkar,
      adhkarList: addAdhkar
        ? adhkarList.filter((a) => a.dhikr.trim() !== "")
        : undefined,
    };

    if (mainPlanType === "memorization") {
      planData = {
        ...sharedData,
        planType: "memorization",
        juzNumber:
          planType === "juz"
            ? selectedJuzsToMemorize[0] || 1
            : planType === "seven_castles"
              ? sevenCastlesStartMode === "page"
                ? getJuzForPage(Number(startPage))
                : juz
              : undefined,
        selectedJuzsToMemorize:
          planType === "juz" || planType === "flexible"
            ? selectedJuzsToMemorize
            : undefined,
        startPage: Number(startPage),
        endPage: Number(endPage),
        dailyAmount,
        fixationRepetitions,
        fixationRepetitionMode,
        dailyFixationRepetitions,
        weeklyReviewRepetitions,
        cumulativeReviewRepetitions,
        firstDayOfWeek,
        startDate: new Date(startDate).toISOString(),
        hasOldMemorization,
        oldMemorizationReviewMode: hasOldMemorization
          ? oldMemReviewMode
          : "auto",
        oldMemorizationCustomDays:
          hasOldMemorization && oldMemReviewMode === "custom_days"
            ? oldMemCustomDays
            : undefined,
        oldMemorizationCustomAmountType:
          hasOldMemorization && oldMemReviewMode === "custom_amount"
            ? oldMemCustomAmountType
            : undefined,
        oldMemorizationCustomAmountValue:
          hasOldMemorization && oldMemReviewMode === "custom_amount"
            ? oldMemCustomAmountValue
            : undefined,
        oldMemorizedPages: hasOldMemorization ? getCombinedOldPages() : [],
        oldMemType: hasOldMemorization ? oldMemType : undefined,
        oldMemorizationRanges:
          hasOldMemorization && oldMemType === "range"
            ? oldMemorizationRanges
            : undefined,
        oldMemSurahs: hasOldMemorization && oldMemType === "surah" ? selectedOldSurahs : undefined,
        isSevenCastles: planType === "seven_castles",
        isSevenCastlesDescending:
          planType === "seven_castles" ? isSevenCastlesDescending : false,
        sevenCastlesStartMode:
          planType === "seven_castles" ? sevenCastlesStartMode : undefined,
        isFlexible: planType === "flexible",
        flexibleDayConfigs:
          planType === "flexible" ? flexibleDayConfigs : undefined,
        flexibleDurationMode:
          planType === "flexible" ? flexibleDurationMode : undefined,
        flexibleDurationWeeks:
          planType === "flexible" && flexibleDurationMode === "weeks"
            ? Number(flexibleDurationWeeks)
            : undefined,
        flexibleEndDate:
          planType === "flexible" &&
          flexibleDurationMode === "range" &&
          flexibleEndDate
            ? new Date(flexibleEndDate).toISOString()
            : undefined,
        flexibleStartMode:
          planType === "flexible" ? flexibleStartMode : undefined,
        juzPlanStartMode: planType === "juz" ? juzPlanStartMode : undefined,
        selectedJuzSurahs: planType === "juz" ? selectedJuzSurahs : undefined,
        memorizationTargetPages:
          planType === "juz" || planType === "flexible"
            ? getCombinedMemorizationPages()
            : undefined,
      };
    } else {
      const isSpec = reviewRangeMode !== "full";
      const reviewPagesList = isSpec ? getCombinedReviewPages() : [];
      const minPage =
        reviewPagesList.length > 0 ? Math.min(...reviewPagesList) : 2;
      const maxPage =
        reviewPagesList.length > 0 ? Math.max(...reviewPagesList) : 604;

      planData = {
        ...sharedData,
        planType: "review",
        isSpecificReview: isSpec,
        reviewRangeMode,
        reviewStartPage:
          reviewRangeMode === "custom_pages"
            ? Number(reviewStartPage)
            : undefined,
        reviewEndPage:
          reviewRangeMode === "custom_pages"
            ? Number(reviewEndPage)
            : undefined,
        selectedReviewJuzs:
          reviewRangeMode === "specific" ? selectedReviewJuzs : undefined,
        selectedReviewSurahs:
          reviewRangeMode === "specific" ? selectedReviewSurahs : undefined,
        reviewPages: isSpec ? reviewPagesList : undefined,
        isSpecificFixation: fixationRangeMode !== "full",
        fixationRangeMode,
        fixationStartPage:
          fixationRangeMode === "custom_pages"
            ? Number(fixationStartPage)
            : undefined,
        fixationEndPage:
          fixationRangeMode === "custom_pages"
            ? Number(fixationEndPage)
            : undefined,
        selectedFixationJuzs:
          fixationRangeMode === "specific" ? selectedFixationJuzs : undefined,
        selectedFixationSurahs:
          fixationRangeMode === "specific" ? selectedFixationSurahs : undefined,
        fixationPages:
          fixationRangeMode !== "full" ? getCombinedFixationPages() : undefined,
        startPage: minPage,
        endPage: maxPage,
        dailyAmount: DailyAmount.ONE_PAGE, // Not strictly used for review logic, but required by type
        reviewJuzAmount:
          reviewAmountType === "juz" ? reviewJuzAmount : undefined,
        reviewAmountType,
        reviewPageAmount:
          reviewAmountType === "pages" ? Number(reviewPageAmount) : undefined,
        startJuz: reviewRangeMode === "full" ? Number(reviewStartJuz) : undefined,
        reviewTracks: [
          {
            id: 'main',
            reviewRangeMode,
            reviewStartPage: reviewRangeMode === "custom_pages" ? Number(reviewStartPage) : undefined,
            reviewEndPage: reviewRangeMode === "custom_pages" ? Number(reviewEndPage) : undefined,
            selectedReviewJuzs: reviewRangeMode === "specific" ? selectedReviewJuzs : undefined,
            selectedReviewSurahs: reviewRangeMode === "specific" ? selectedReviewSurahs : undefined,
            reviewPages: isSpec ? reviewPagesList : undefined,
            reviewAmountType,
            reviewJuzAmount,
            reviewPageAmount,
            startJuz: reviewRangeMode === "full" ? Number(reviewStartJuz) : undefined,
          },
          ...reviewTracks.map(t => {
            const trackIsSpec = t.reviewRangeMode !== "full";
            const trackPagesList = trackIsSpec ? getCombinedPagesForTrack(t) : [];
            return {
              ...t,
              reviewPages: trackIsSpec ? trackPagesList : undefined,
              selectedReviewJuzs: t.reviewRangeMode === "specific" ? t.selectedReviewJuzs : undefined,
              selectedReviewSurahs: t.reviewRangeMode === "specific" ? t.selectedReviewSurahs : undefined,
              reviewStartPage: t.reviewRangeMode === "custom_pages" ? Number(t.reviewStartPage) : undefined,
              reviewEndPage: t.reviewRangeMode === "custom_pages" ? Number(t.reviewEndPage) : undefined,
              startJuz: t.reviewRangeMode === "full" ? Number(t.startJuz || 1) : undefined,
            };
          })
        ],
        fixationAmountType,
        fixationRepetitions,
        fixationRepetitionMode,
        includeFixation,
        includeRecitation,
        includeListening,
        firstDayOfWeek,
        startDate: new Date(startDate).toISOString(),
      };
    }

    try {
      if (isEditMode && id) {
        await savePlan(
          {
            ...planData,
            updatedAt: new Date().toISOString(),
            status: (planData as any).status || "active", // retain status or default
            createdAt: (planData as any).createdAt || new Date().toISOString(),
          },
          Number(id),
        );
      } else {
        await savePlan({
          ...planData,
          status: "active",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      navigate("/tasks");
    } catch (e: any) {
      console.error("Failed to save plan:", e);
      let errorMsg =
        "فشلت عملية حفظ الخطة ومزامنتها سحابياً. يرجى التحقق من اتصالك بالإنترنت والتحقق من حسابك.";
      if (e instanceof Error && e.message) {
        try {
          const parsed = JSON.parse(e.message);
          if (parsed.error) {
            errorMsg = `فشلت المزامنة: ${parsed.error}`;
          }
        } catch (_) {
          if (
            e.message.includes("permission") ||
            e.message.includes("insufficient")
          ) {
            errorMsg =
              "فشلت المزامنة بسبب صلاحيات الوصول. يرجى التأكد من تسجيل الدخول بشكل صحيح.";
          }
        }
      }
      setSaveError(errorMsg);
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors"
        >
          <ChevronRight className="w-6 h-6 dark:text-white" />
        </button>
        <h2 className="text-2xl font-bold dark:text-white">
          {isEditMode ? "تعديل الخطة الحالية" : "إنشاء خطة جديدة"}
        </h2>
      </div>

      <div className="space-y-6">
        {/* الخطوة الأولى: نوع ومسار الخطة */}
        <div className="bg-white dark:bg-emerald-950/10 p-5 sm:p-6 rounded-[24px] border border-emerald-500/20 border-r-4 border-r-emerald-500 shadow-sm space-y-4 transition-colors">
          <div className="flex items-center gap-3 border-b border-emerald-500/10 pb-3">
            <span className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm">
              ١
            </span>
            <h3 className="font-extrabold text-[#1A2E1A] dark:text-emerald-400 text-base">
              نوع أو مسار الخطة الرئيسي
            </h3>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 dark:text-gray-300 block">
              اسم الخطة (اختياري)
            </label>
            <input
              type="text"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              placeholder="مثال: خطة المراجعة، خطة الطالب أحمد..."
              className="w-full bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#D4AF37]"
            />
          </div>

          <div className="flex p-1 bg-gray-100 dark:bg-black/30 rounded-2xl">
            <button
              onClick={() => setMainPlanType("memorization")}
              type="button"
              className={`flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                mainPlanType === "memorization"
                  ? "bg-white dark:bg-[#2C2C2C] text-[#1A2E1A] dark:text-[#D4AF37] shadow-sm"
                  : "text-gray-400 dark:text-gray-500"
              }`}
            >
              <Book className="w-4 h-4" />
              <span>خطة حفظ</span>
            </button>
            <button
              onClick={() => setMainPlanType("review")}
              type="button"
              className={`flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                mainPlanType === "review"
                  ? "bg-white dark:bg-[#2C2C2C] text-[#1A2E1A] dark:text-[#D4AF37] shadow-sm"
                  : "text-gray-400 dark:text-gray-500"
              }`}
            >
              <Repeat className="w-4 h-4" />
              <span>خطة مراجعة وتثبيت</span>
            </button>
          </div>
        </div>

        {mainPlanType === "memorization" ? (
          <>
            {/* الخطوة الثانية: تفاصيل الخطة ونطاق الحفظ لخطط الحفظ */}
            <div className="bg-white dark:bg-amber-950/10 p-5 sm:p-6 rounded-[24px] border border-amber-500/20 border-r-4 border-r-amber-500 shadow-sm space-y-5 transition-colors">
              <div className="flex items-center gap-3 border-b border-amber-500/10 pb-3">
                <span className="w-8 h-8 rounded-full bg-amber-500 text-black flex items-center justify-center font-bold text-sm">
                  ٢
                </span>
                <h3 className="font-extrabold text-[#1A2E1A] dark:text-amber-400 text-base">
                  تفاصيل الخطة ونطاق المحفوظ
                </h3>
              </div>

              {/* Plan Type Tabs */}
              <div className="flex p-1 bg-gray-50 dark:bg-black/20 rounded-2xl gap-1 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setPlanType("seven_castles")}
                  className={`flex-1 py-3 px-2 rounded-xl text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 transition-all min-w-[max-content] ${
                    planType === "seven_castles"
                      ? "bg-white dark:bg-[#2C2C2C] text-[#1A2E1A] dark:text-[#D4AF37] shadow-sm"
                      : "text-gray-400 dark:text-gray-500"
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">القلاع السبع</span>
                  <span className="sm:hidden">القلاع</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPlanType("juz")}
                  className={`flex-1 py-3 px-2 rounded-xl text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 transition-all min-w-[max-content] ${
                    planType === "juz"
                      ? "bg-white dark:bg-[#2C2C2C] text-[#1A2E1A] dark:text-[#D4AF37] shadow-sm"
                      : "text-gray-400 dark:text-gray-500"
                  }`}
                >
                  <Book className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">خطة أجزاء</span>
                  <span className="sm:hidden">أجزاء</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPlanType("flexible")}
                  className={`flex-1 py-3 px-2 rounded-xl text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 transition-all min-w-[max-content] ${
                    planType === "flexible"
                      ? "bg-white dark:bg-[#2C2C2C] text-[#1A2E1A] dark:text-[#D4AF37] shadow-sm"
                      : "text-gray-400 dark:text-gray-500"
                  }`}
                >
                  <CalendarIcon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">خطة مرنة</span>
                  <span className="sm:hidden">مرنة</span>
                </button>
              </div>

              {/* Seven Castles Plan Selection Mode */}
              {planType === "seven_castles" && (
                <div className="space-y-3 p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
                  <label className="text-sm font-bold block dark:text-white">
                    طريقة تحديد بداية الخطة
                  </label>
                  <div className="flex bg-white dark:bg-[#1A1A1A] p-1 rounded-xl border border-gray-100 dark:border-white/5">
                    <button
                      type="button"
                      onClick={() => setSevenCastlesStartMode("juz")}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                        sevenCastlesStartMode === "juz"
                          ? "bg-[#1A2E1A] dark:bg-[#D4AF37] text-white dark:text-[#1A1A1A] shadow-sm"
                          : "text-gray-400 hover:text-gray-500"
                      }`}
                    >
                      بالأجزاء (جزء البدء)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSevenCastlesStartMode("page")}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                        sevenCastlesStartMode === "page"
                          ? "bg-[#1A2E1A] dark:bg-[#D4AF37] text-white dark:text-[#1A1A1A] shadow-sm"
                          : "text-gray-400 hover:text-gray-500"
                      }`}
                    >
                      بالصفحات (صفحة البدء)
                    </button>
                  </div>
                </div>
              )}

              {/* Flexible Plan Selection Mode */}
              {planType === "flexible" && (
                <div className="space-y-3 p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
                  <label className="text-sm font-bold block dark:text-white">
                    طريقة تحديد المحفوظ الجديد
                  </label>
                  <div className="flex bg-white dark:bg-[#1A1A1A] p-1 rounded-xl border border-gray-100 dark:border-white/5">
                    <button
                      type="button"
                      onClick={() => setFlexibleStartMode("page")}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                        flexibleStartMode === "page"
                          ? "bg-[#1A2E1A] dark:bg-[#D4AF37] text-white dark:text-[#1A1A1A] shadow-sm"
                          : "text-gray-400 hover:text-gray-500"
                      }`}
                    >
                      بالصفحات
                    </button>
                    <button
                      type="button"
                      onClick={() => setFlexibleStartMode("juz")}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                        flexibleStartMode === "juz"
                          ? "bg-[#1A2E1A] dark:bg-[#D4AF37] text-white dark:text-[#1A1A1A] shadow-sm"
                          : "text-gray-400 hover:text-gray-500"
                      }`}
                    >
                      بالأجزاء
                    </button>
                    <button
                      type="button"
                      onClick={() => setFlexibleStartMode("surah")}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                        flexibleStartMode === "surah"
                          ? "bg-[#1A2E1A] dark:bg-[#D4AF37] text-white dark:text-[#1A1A1A] shadow-sm"
                          : "text-gray-400 hover:text-gray-500"
                      }`}
                    >
                      بالسور
                    </button>
                  </div>
                </div>
              )}

              {/* Juz Plan Selection Mode */}
              {planType === "juz" && (
                <div className="space-y-3 p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
                  <label className="text-sm font-bold block dark:text-white">
                    طريقة تحديد المحفوظ الجديد
                  </label>
                  <div className="flex bg-white dark:bg-[#1A1A1A] p-1 rounded-xl border border-gray-100 dark:border-white/5">
                    <button
                      type="button"
                      onClick={() => setJuzPlanStartMode("page")}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                        juzPlanStartMode === "page"
                          ? "bg-[#1A2E1A] dark:bg-[#D4AF37] text-white dark:text-[#1A1A1A] shadow-sm"
                          : "text-gray-400 hover:text-gray-500"
                      }`}
                    >
                      بالصفحات
                    </button>
                    <button
                      type="button"
                      onClick={() => setJuzPlanStartMode("juz")}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                        juzPlanStartMode === "juz"
                          ? "bg-[#1A2E1A] dark:bg-[#D4AF37] text-white dark:text-[#1A1A1A] shadow-sm"
                          : "text-gray-400 hover:text-gray-500"
                      }`}
                    >
                      بالأجزاء
                    </button>
                    <button
                      type="button"
                      onClick={() => setJuzPlanStartMode("surah")}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                        juzPlanStartMode === "surah"
                          ? "bg-[#1A2E1A] dark:bg-[#D4AF37] text-white dark:text-[#1A1A1A] shadow-sm"
                          : "text-gray-400 hover:text-gray-500"
                      }`}
                    >
                      بالسور
                    </button>
                  </div>
                </div>
              )}

              {/* Selection (For Juz) */}
              {((planType === "juz" && juzPlanStartMode === "juz") ||
                (planType === "seven_castles" &&
                  sevenCastlesStartMode === "juz") ||
                (planType === "flexible" && flexibleStartMode === "juz")) && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-bold block dark:text-white">
                      {planType === "seven_castles"
                        ? "اختر جزء البدء"
                        : "اختر الأجزاء للحفظ (يمكن تحديد أكثر من جزء):"}
                    </label>
                    {planType !== "seven_castles" && selectedJuzsToMemorize.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedJuzsToMemorize([])}
                        className="text-red-500 hover:underline text-[10px]"
                      >
                        مسح التحديد
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {Array.from({ length: 30 }, (_, i) => i + 1).map((n) => {
                      const isSelected =
                        planType === "seven_castles"
                          ? juz === n
                          : selectedJuzsToMemorize.includes(n);
                      return (
                        <button
                          type="button"
                          key={n}
                          onClick={() => {
                            if (planType === "seven_castles") {
                              setJuz(n);
                            } else {
                              toggleJuzToMemorize(n);
                            }
                          }}
                          className={`py-2 rounded-xl text-sm font-bold transition-all ${
                            isSelected
                              ? "bg-[#1A2E1A] dark:bg-[#D4AF37] text-white dark:text-[#1A1A1A]"
                              : "bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
                          }`}
                        >
                          {n}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Selection (For Surah - Placeholder in Flexible Mode) */}
              {planType === "flexible" && flexibleStartMode === "surah" && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-bold block dark:text-white">
                      اختر السور
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <p className="text-gray-400">
                      تحديد السور يحتاج قائمة كاملة. حالياً يقتصر على الصفحات في
                      الخطة المرنة.
                    </p>
                  </div>
                </div>
              )}

              {/* Selection (For Surah - General Plan / Juz Plan) */}
              {planType === "juz" && juzPlanStartMode === "surah" && (
                <div className="space-y-3 p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-gray-500 dark:text-gray-400">
                      اختر السور للحفظ المنهجي ({selectedJuzSurahs.length})
                    </span>
                    {selectedJuzSurahs.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedJuzSurahs([])}
                        className="text-red-500 hover:underline text-[10px]"
                      >
                        مسح التحديد
                      </button>
                    )}
                  </div>

                  {/* Search box */}
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="ابحث عن سورة..."
                      value={juzSurahSearch}
                      onChange={(e) => setJuzSurahSearch(e.target.value)}
                      className="w-full bg-white dark:bg-black/20 dark:text-white border-none rounded-xl pr-9 pl-4 py-2 text-xs focus:ring-1 focus:ring-[#D4AF37] transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 max-h-48 overflow-y-auto pr-1 mt-2">
                    {SURAH_METADATAList.filter((s) =>
                      s.name.includes(juzSurahSearch),
                    ).map((s) => {
                      const isSelected = selectedJuzSurahs.includes(s.name);
                      return (
                        <button
                          key={s.name}
                          type="button"
                          onClick={() => {
                            setSelectedJuzSurahs((prev) =>
                              prev.includes(s.name)
                                ? prev.filter((x) => x !== s.name)
                                : [...prev, s.name],
                            );
                          }}
                          className={`py-2 px-1 rounded-xl text-[10px] sm:text-xs font-bold transition-all text-center flex items-center justify-center gap-1 border ${
                            isSelected
                              ? "bg-[#1A2E1A] dark:bg-[#D4AF37] border-transparent text-white dark:text-[#1A1A1A] shadow-sm"
                              : "bg-white dark:bg-white/5 border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
                          }`}
                        >
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 shrink-0" />
                          )}
                          <span className="truncate">{s.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Page Range Input */}
              {((planType === "juz" && juzPlanStartMode === "page") ||
                planType === "seven_castles" ||
                (planType === "flexible" && flexibleStartMode === "page")) && (
                <div
                  className={
                    planType === "seven_castles"
                      ? "grid grid-cols-1 gap-4"
                      : "grid grid-cols-2 gap-4"
                  }
                >
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 dark:text-gray-500">
                      {planType === "seven_castles" &&
                      sevenCastlesStartMode === "juz"
                        ? "من صفحة (تلقائي من الجزء)"
                        : "من صفحة"}
                    </label>
                    <input
                      type="number"
                      onFocus={(e) => e.target.select()}
                      value={startPage}
                      min={1}
                      max={604}
                      disabled={
                        planType === "seven_castles" &&
                        sevenCastlesStartMode === "juz"
                      }
                      onChange={(e) => {
                        const val = Math.min(
                          604,
                          Math.max(1, parseInt(e.target.value) || 1),
                        );
                        setStartPage(val);
                      }}
                      className={`w-full bg-gray-50 dark:bg-white/5 dark:text-white border-none rounded-2xl px-4 py-4 text-sm focus:ring-2 focus:ring-[#D4AF37] transition-all ${
                        planType === "seven_castles" &&
                        sevenCastlesStartMode === "juz"
                          ? "opacity-65 cursor-not-allowed"
                          : ""
                      }`}
                    />
                  </div>
                  {planType !== "seven_castles" && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 dark:text-gray-500">
                        إلى صفحة
                      </label>
                      <input
                        type="number"
                        onFocus={(e) => e.target.select()}
                        value={endPage}
                        min={1}
                        max={604}
                        onChange={(e) =>
                          setEndPage(
                            Math.min(
                              604,
                              Math.max(1, parseInt(e.target.value) || 1),
                            ),
                          )
                        }
                        className="w-full bg-gray-50 dark:bg-white/5 dark:text-white border-none rounded-2xl px-4 py-4 text-sm focus:ring-2 focus:ring-[#D4AF37] transition-all"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Seven Castles Direction Toggle */}
              {planType === "seven_castles" && (
                <div className="space-y-3 p-4 bg-gray-50 dark:bg-white/5 rounded-2xl">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                    <div>
                      <span className="text-sm font-bold block dark:text-white">
                        اتجاه كتابة الخطة
                      </span>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 block">
                        تنازلي للحفظ من نهاية المصحف إلى البداية
                      </span>
                    </div>
                    <div className="flex bg-white dark:bg-[#1A1A1A] p-1 rounded-xl border border-gray-100 dark:border-white/5">
                      <button
                        type="button"
                        onClick={() => setIsSevenCastlesDescending(false)}
                        className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          !isSevenCastlesDescending
                            ? "bg-[#1A2E1A] dark:bg-[#D4AF37] text-white dark:text-[#1A1A1A] shadow-sm"
                            : "text-gray-400 hover:text-gray-500"
                        }`}
                      >
                        تصاعدي (من البداية للنهاية)
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsSevenCastlesDescending(true)}
                        className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          isSevenCastlesDescending
                            ? "bg-[#1A2E1A] dark:bg-[#D4AF37] text-white dark:text-[#1A1A1A] shadow-sm"
                            : "text-gray-400 hover:text-gray-500"
                        }`}
                      >
                        تنازلي (من نهاية المصحف)
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Daily Amount */}
              <div className="space-y-3">
                <label className="text-sm font-bold block dark:text-white">
                  مقدار الحفظ اليومي
                </label>
                <div className="relative">
                  {(() => {
                    const options = [
                      {
                        id: DailyAmount.QUARTER_PAGE,
                        label: "ربع صفحة",
                        desc:
                          planType === "seven_castles"
                            ? "يستغرق الجزء حوالي 20 أسبوعاً"
                            : "يستغرق الجزء حوالي 16 أسبوعاً",
                      },
                      {
                        id: DailyAmount.HALF_PAGE,
                        label: "نصف صفحة",
                        desc:
                          planType === "seven_castles"
                            ? "يستغرق الجزء حوالي 10 أسابيع"
                            : "يستغرق الجزء حوالي 8 أسابيع",
                      },
                      {
                        id: DailyAmount.ONE_PAGE,
                        label: "صفحة واحدة",
                        desc:
                          planType === "seven_castles"
                            ? "يستغرق الجزء حوالي 5 أسابيع"
                            : "يستغرق الجزء حوالي 4 أسابيع",
                      },
                      {
                        id: DailyAmount.TWO_PAGES,
                        label: "صفحتان",
                        desc:
                          planType === "seven_castles"
                            ? "يستغرق الجزء حوالي 3 أسابيع"
                            : "يستغرق الجزء أسبوعين",
                      },
                      {
                        id: DailyAmount.QUARTER_HIZB,
                        label: "ربع حزب",
                        desc:
                          planType === "seven_castles"
                            ? "يستغرق الجزء حوالي أسبوعين ونصف"
                            : "يستغرق الجزء حوالي أسبوع ونصف",
                      },
                      {
                        id: DailyAmount.THREE_PAGES,
                        label: "3 صفحات",
                        desc:
                          planType === "seven_castles"
                            ? "يستغرق الجزء حوالي أسبوعين"
                            : "يستغرق الجزء حوالي أسبوع وثلث",
                      },
                      {
                        id: DailyAmount.FOUR_PAGES,
                        label: "4 صفحات",
                        desc:
                          planType === "seven_castles"
                            ? "يستغرق الجزء حوالي أسبوع وربع"
                            : "يستغرق الجزء أسبوعاً واحداً",
                      },
                      {
                        id: DailyAmount.FIVE_PAGES,
                        label: "5 صفحات",
                        desc:
                          planType === "seven_castles"
                            ? "يستغرق الجزء أسبوعاً واحداً"
                            : "يستغرق الجزء 4 أيام حفظ (أقل من أسبوع)",
                      },
                    ];
                    const selected = options.find(o => o.id === dailyAmount);
                    return (
                      <>
                        <select
                          value={dailyAmount}
                          onChange={(e) => setDailyAmount(e.target.value as DailyAmount)}
                          className="w-full py-2.5 px-3.5 bg-gray-50 dark:bg-[#1A1A1A] border border-amber-500/25 dark:border-white/10 rounded-xl text-xs font-extrabold text-[#1A2E1A] dark:text-[#D4AF37] cursor-pointer focus:ring-2 focus:ring-[#D4AF37]/50 hover:border-amber-500/40 outline-none transition-all shadow-sm"
                        >
                          {options.map((option) => (
                            <option key={option.id} value={option.id} className="dark:bg-[#1C1C1E] font-medium text-xs sm:text-sm">
                              {option.label}
                            </option>
                          ))}
                        </select>
                        {selected && (
                          <div className="mt-1.5 text-xs text-gray-500 dark:text-gray-400 font-medium px-1">
                            {selected.desc}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Info Box (Collapsible) */}
              <div className="bg-blue-50/40 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/20 overflow-hidden transition-all duration-300">
                <button
                  type="button"
                  onClick={() => setShowInfoDailyAmount(!showInfoDailyAmount)}
                  className="w-full p-3.5 flex items-center justify-between hover:bg-blue-50/60 dark:hover:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-bold text-xs"
                >
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-blue-500 shrink-0 select-none" />
                    <span>توضيح تفاصيل نظام خطة الحفظ ({planType === "seven_castles" ? "القلاع السبع" : planType === "flexible" ? "الخطة المرنة" : "خطة الأجزاء"})</span>
                  </div>
                  {showInfoDailyAmount ? (
                    <ChevronUp className="w-4 h-4 text-blue-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-blue-500" />
                  )}
                </button>
                
                <AnimatePresence initial={false}>
                  {showInfoDailyAmount && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-blue-100 dark:border-blue-900/20"
                    >
                      <div className="p-4 text-[11px] text-blue-700 dark:text-blue-400 leading-relaxed text-right w-full space-y-2">
                        {planType === "seven_castles" ? (
                          <div className="space-y-1">
                            <p className="font-bold text-blue-800 dark:text-blue-300">
                              نظام خطة القلاع السبع المتواصلة:
                            </p>
                            <p>
                              • تتكون الخطة من ٧ قلاع (كل قلعة تتكون من ٦ أيام حفظ موزعة
                              بشكل متسلسل ومستمر على أيام الحفظ).
                            </p>
                            <p>
                              • أيام الحفظ الأسبوعية هي: الأول والثاني والرابع والخامس.
                              تكتمل كل قلعة في ٦ أيام حفظ ممتدة عبر الأسابيع وتبدأ
                              القلعة التي تليها مباشرة.
                            </p>
                            <p>
                              • اليوم الأول والثاني: حفظ جديد للمقدار المتسلسل من القلعة
                              النشطة.
                            </p>
                            <p>
                              • اليوم الثالث: تثبيت وتسميع لمحفوظ يومي الحفظ الأول
                              والثاني.
                            </p>
                            <p>
                              • اليوم الرابع والخامس: متابعة الحفظ المتسلسل لإكمال صفحات
                              القلعة والانتقال للقلعة التالية بشكل مستمر ومتناسق.
                            </p>
                            <p>
                              • اليوم السادس: تثبيت وتسميع لمحفوظ يومي الحفظ الرابع
                              والخامس.
                            </p>
                            <p>
                              • مع نهاية كل قلعة، تضاف في الأسابيع التالية مهمة مراجعة
                              القلعة المنتهية موزعة على أيام الأسبوع (القلعة ١ الأحد، ٢
                              الإثنين، ٣ الثلاثاء، ٤ الأربعاء، ٥ الخميس، ٦ الجمعة، ٧
                              السبت).
                            </p>
                            <div className="pt-2 border-t border-blue-100 dark:border-blue-900/20 mt-2 flex justify-end">
                              <a
                                href="/7 Forts Book.pdf"
                                download="7 Forts Book.pdf"
                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-[#1A1A1A] text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-zinc-700 rounded-lg text-[9px] font-bold hover:bg-blue-50 dark:hover:bg-zinc-700 transition-all shadow-sm active:scale-95"
                              >
                                <Download className="w-3.5 h-3.5 text-blue-500" />
                                <span>انقر لتحميل منهج القلاع السبع</span>
                              </a>
                            </div>
                          </div>
                        ) : planType === "flexible" ? (
                          <p>
                            في الخطة المرنة يمكنك تفصيل الأيام التي ترغب في تفعيل مهام
                            الحفظ أو المراجعة التراكمية أو تثبيت القريب فيها بكل حرية.
                          </p>
                        ) : (
                          <div className="space-y-1">
                            <p>
                              تبدأ الخطة الأسبوعية حسب اليوم الأول الذي تحدده. أيام الحفظ هي (اليوم الأول - اليوم الخامس)، واليوم السادس للمراجعة الأسبوعية ، واليوم السابع للمراجعة والتثبيت التراكمي والتسميع، وتحتوي الخطة على مراجعة المحفوظ القريب ومراجعة المحفظ القديم كالتالي:
                            </p>
                            <ul className="list-disc list-inside space-y-1 mt-1 text-gray-500 dark:text-gray-400">
                              <li>اليوم الأول: (استماع + حفظ جديد + تثبيت + تسميع).+ مراجعة القديم غيبا</li>
                              <li>اليوم الثاني: (استماع + حفظ جديد + تثبيت) + مراجعة القريب + تسميع + مراجعة التراكمي غيباً.</li>
                              <li>اليوم الثالث: (استماع + حفظ جديد + تثبيت) + مراجعة القريب + تسميع .+ مراجعة القديم غيبا</li>
                              <li>اليوم الرابع: (استماع + حفظ جديد + تثبيت) + مراجعة القريب + تسميع + مراجعة التراكمي غيباً.</li>
                              <li>اليوم الخامس: (استماع + حفظ جديد + تثبيت) + مراجعة القريب + تسميع .+ مراجعة القديم غيبا</li>
                              <li>اليوم السادس: مراجعة مكررة لمحفوظ الأسبوع الحالي غيبا + مراجعة القديم غيبا</li>
                              <li>اليوم السابع: مراجعة تراكمية مكررة لجميع محفوظ الأسبوع الحالي والأسابيع السابقة + تسميع تراكمي شامل. + مراجعة القديم غيبا</li>
                            </ul>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Flexible Plan Days Settings */}
              {planType === "flexible" && (
                <div className="space-y-6 pt-2 border-t border-gray-100 dark:border-white/5">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-bold text-[#1A2E1A] dark:text-[#D4AF37]">
                        تخصيص أيام الخطة المرنة
                      </h3>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-white/10">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-white/10">
                          <tr>
                            <th className="py-3 px-2 font-bold whitespace-nowrap">
                              اليوم
                            </th>
                            <th className="py-3 px-2 font-bold whitespace-nowrap text-center">
                              حفظ جديد وتثبيت
                            </th>
                            <th className="py-3 px-2 font-bold whitespace-nowrap text-center">
                              تثبيت القريب
                            </th>
                            <th className="py-3 px-2 font-bold whitespace-nowrap text-center">
                              مراجعة المتراكم/القديم
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                          {[
                            { id: 0, label: "الأحد" },
                            { id: 1, label: "الإثنين" },
                            { id: 2, label: "الثلاثاء" },
                            { id: 3, label: "الأربعاء" },
                            { id: 4, label: "الخميس" },
                            { id: 5, label: "الجمعة" },
                            { id: 6, label: "السبت" },
                          ].map((day) => {
                            // Adjust visual day offset base on firstDayOfWeek
                            const d = (day.id + firstDayOfWeek) % 7;
                            const config = flexibleDayConfigs[d] || {
                              hasMemorization: false,
                              hasFixation: false,
                              hasReview: false,
                              hasCumulativeReview: false,
                              hasOldMemorizationReview: false,
                            };
                            return (
                              <tr
                                key={d}
                                className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors"
                              >
                                <td className="py-3 px-2 font-bold text-gray-700 dark:text-gray-200">
                                  {
                                    [
                                      "الأحد",
                                      "الإثنين",
                                      "الثلاثاء",
                                      "الأربعاء",
                                      "الخميس",
                                      "الجمعة",
                                      "السبت",
                                    ][d]
                                  }
                                </td>
                                <td className="py-3 px-2 text-center">
                                  <label className="inline-flex items-center cursor-pointer justify-center">
                                    <input
                                      type="checkbox"
                                      className="sr-only peer"
                                      checked={config.hasMemorization}
                                      onChange={(e) => {
                                        setFlexibleDayConfigs((prev) => ({
                                          ...prev,
                                          [d]: {
                                            ...prev[d],
                                            hasMemorization: e.target.checked,
                                          },
                                        }));
                                      }}
                                    />
                                    <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:bg-[#D4AF37] after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:after:translate-x-5 rtl:peer-checked:after:-translate-x-5 shadow-inner"></div>
                                  </label>
                                </td>
                                <td className="py-3 px-2 text-center">
                                  <label className="inline-flex items-center cursor-pointer justify-center">
                                    <input
                                      type="checkbox"
                                      className="sr-only peer"
                                      checked={
                                        config.hasReview || config.hasFixation
                                      }
                                      onChange={(e) => {
                                        setFlexibleDayConfigs((prev) => ({
                                          ...prev,
                                          [d]: {
                                            ...prev[d],
                                            hasReview: e.target.checked,
                                            hasFixation: e.target.checked,
                                          },
                                        }));
                                      }}
                                    />
                                    <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:bg-[#D4AF37] after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:after:translate-x-5 rtl:peer-checked:after:-translate-x-5 shadow-inner"></div>
                                  </label>
                                </td>
                                <td className="py-3 px-2 text-center">
                                  <label className="inline-flex items-center cursor-pointer justify-center">
                                    <input
                                      type="checkbox"
                                      className="sr-only peer"
                                      checked={
                                        config.hasCumulativeReview ||
                                        config.hasOldMemorizationReview
                                      }
                                      onChange={(e) => {
                                        setFlexibleDayConfigs((prev) => ({
                                          ...prev,
                                          [d]: {
                                            ...prev[d],
                                            hasCumulativeReview:
                                              e.target.checked,
                                            hasOldMemorizationReview:
                                              e.target.checked,
                                          },
                                        }));
                                      }}
                                    />
                                    <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:bg-[#D4AF37] after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:after:translate-x-5 rtl:peer-checked:after:-translate-x-5 shadow-inner"></div>
                                  </label>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Flexible Plan Duration/Mosque Settings */}
                  <div className="space-y-4 p-4 bg-[#D4AF37]/5 dark:bg-[#D4AF37]/2 rounded-2xl border border-[#D4AF37]/10">
                    <div>
                      <h4 className="text-xs font-bold text-[#1A2E1A] dark:text-[#D4AF37] mb-1">
                        مدة أو فترة تفعيل الخطة (مثالي للبرامج والمسابقات
                        المسجدية)
                      </h4>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed">
                        للبرامج المسجدية أو الدورات الصيفية والقرآنية، يمكنك قصر
                        تفعيل مهام هذه الخطة على فترة زمنية محددة أو عدد أسابيع
                        معيّن، لتقف تلقائياً عند انتهائها.
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 bg-gray-100/50 dark:bg-black/20 p-1 rounded-xl">
                      {[
                        { id: "unlimited", label: "مستمر ومفتوح" },
                        { id: "weeks", label: "محدد بالأسابيع" },
                        { id: "range", label: "من .. إلى (تواريخ)" },
                      ].map((mode) => (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() =>
                            setFlexibleDurationMode(mode.id as any)
                          }
                          className={`py-2 rounded-lg text-[10px] font-bold transition-all text-center ${
                            flexibleDurationMode === mode.id
                              ? "bg-white dark:bg-[#2C2C2C] text-[#1A2E1A] dark:text-[#D4AF37] shadow-sm"
                              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                          }`}
                        >
                          {mode.label}
                        </button>
                      ))}
                    </div>

                    {flexibleDurationMode === "weeks" && (
                      <div className="pt-2 flex justify-between items-center gap-4 border-t border-gray-100 dark:border-white/5">
                        <div>
                          <span className="text-xs font-bold block dark:text-white">
                            عدد أسابيع البرنامج
                          </span>
                          <span className="text-[9px] text-gray-400 dark:text-gray-500 block">
                            يقف تفعيل المهام تلقائياً بعد انقضاء هذه الأسابيع
                          </span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              setFlexibleDurationWeeks(
                                Math.max(1, flexibleDurationWeeks - 1),
                              )
                            }
                            className="w-8 h-8 rounded-full bg-white dark:bg-[#2C2C2C] shadow flex items-center justify-center text-[#1A2E1A] dark:text-white active:scale-95 text-xs font-bold border border-gray-100 dark:border-transparent"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={flexibleDurationWeeks}
                            onChange={(e) =>
                              setFlexibleDurationWeeks(
                                Math.max(1, parseInt(e.target.value) || 1),
                              )
                            }
                            onFocus={(e) => e.target.select()}
                            className="text-sm font-bold dark:text-white w-12 text-center bg-transparent border-none p-0 focus:ring-0"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setFlexibleDurationWeeks(
                                flexibleDurationWeeks + 1,
                              )
                            }
                            className="w-8 h-8 rounded-full bg-white dark:bg-[#2C2C2C] shadow flex items-center justify-center text-[#1A2E1A] dark:text-white active:scale-95 text-xs font-bold border border-gray-100 dark:border-transparent"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    )}

                    {flexibleDurationMode === "range" && (
                      <div className="pt-2 space-y-2 border-t border-gray-100 dark:border-white/5">
                        <div>
                          <span className="text-xs font-bold block dark:text-white">
                            تاريخ انتهاء البرنامج
                          </span>
                          <span className="text-[9px] text-gray-400 dark:text-gray-500 block">
                            من{" "}
                            {startDate
                              ? new Date(startDate).toLocaleDateString(
                                  "ar-EG",
                                  {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                  },
                                )
                              : "..."}{" "}
                            إلى التاريخ المحدد أدناه:
                          </span>
                        </div>
                        <div className="relative">
                          <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
                          <input
                            type="date"
                            value={flexibleEndDate}
                            onChange={(e) => setFlexibleEndDate(e.target.value)}
                            className="w-full bg-white dark:bg-[#1A1A1A] dark:text-white border border-gray-100 dark:border-white/10 rounded-xl pr-3 pl-10 py-2.5 text-xs focus:ring-2 focus:ring-[#D4AF37] transition-all"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* الخطوة الثالثة: تكرار المهام وتثبيتها لخطط الحفظ */}
            <div className="bg-white dark:bg-indigo-950/10 p-5 sm:p-6 rounded-[24px] border border-indigo-500/20 border-r-4 border-r-indigo-500 shadow-sm space-y-5 transition-colors">
              <div className="flex items-center gap-3 border-b border-indigo-500/10 pb-3">
                <span className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-sm">
                  ٣
                </span>
                <h3 className="font-extrabold text-[#1A2E1A] dark:text-indigo-400 text-base">
                  تكرار وتثبيت المهام اليومية والأسبوعية
                </h3>
              </div>

              {/* Repetitions Customization Section */}
              <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-white/5">
                <h3 className="text-sm font-bold text-[#1A2E1A] dark:text-[#D4AF37]">
                  تكرار المهام في الخطة
                </h3>

                {/* Daily Fixation Repetition */}
                <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="pl-2">
                      <span className="text-xs font-bold block dark:text-white">
                        {planType === "seven_castles"
                          ? "تكرار التثبيت للحفظ في اليوم الأول والثاني والرابع والخامس"
                          : "تكرار التثبيت للحفظ اليومي"}
                      </span>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 block">
                        {planType === "seven_castles"
                          ? "عدد مرات تكرار قراءة المقدار الجديد لتثبيته في نفس اليوم"
                          : "عدد مرات قراءة المقدار الجديد لتثبيته في نفس اليوم"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setDailyFixationRepetitions(
                            Math.max(1, dailyFixationRepetitions - 1),
                          )
                        }
                        className="w-8 h-8 rounded-full bg-white dark:bg-[#2C2C2C] shadow flex items-center justify-center text-[#1A2E1A] dark:text-white active:scale-95 text-sm font-bold border border-gray-100 dark:border-transparent"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={dailyFixationRepetitions}
                        onChange={(e) =>
                          setDailyFixationRepetitions(
                            Math.max(1, parseInt(e.target.value) || 1),
                          )
                        }
                        onFocus={(e) => e.target.select()}
                        className="text-lg font-bold dark:text-white w-14 text-center bg-transparent border-none p-0 focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setDailyFixationRepetitions(
                            dailyFixationRepetitions + 1,
                          )
                        }
                        className="w-8 h-8 rounded-full bg-white dark:bg-[#2C2C2C] shadow flex items-center justify-center text-[#1A2E1A] dark:text-white active:scale-95 text-sm font-bold border border-gray-100 dark:border-transparent"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Weekly Review Repetition */}
                <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="pl-2">
                      <span className="text-xs font-bold block dark:text-white">
                        {planType === "seven_castles"
                          ? "تكرار المراجعة في اليوم الثالث والسادس"
                          : "تكرار مراجعة الحفظ الأسبوعي"}
                      </span>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 block">
                        {planType === "seven_castles"
                          ? "عدد مرات تكرار مراجعة وتسميع محفوظ الأيام السابقة لتثبيته"
                          : "عدد مرات مراجعة المجموع الأسبوعي"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setWeeklyReviewRepetitions(
                            Math.max(1, weeklyReviewRepetitions - 1),
                          )
                        }
                        className="w-8 h-8 rounded-full bg-white dark:bg-[#2C2C2C] shadow flex items-center justify-center text-[#1A2E1A] dark:text-white active:scale-95 text-sm font-bold border border-gray-100 dark:border-transparent"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={weeklyReviewRepetitions}
                        onChange={(e) =>
                          setWeeklyReviewRepetitions(
                            Math.max(1, parseInt(e.target.value) || 1),
                          )
                        }
                        onFocus={(e) => e.target.select()}
                        className="text-lg font-bold dark:text-white w-14 text-center bg-transparent border-none p-0 focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setWeeklyReviewRepetitions(
                            weeklyReviewRepetitions + 1,
                          )
                        }
                        className="w-8 h-8 rounded-full bg-white dark:bg-[#2C2C2C] shadow flex items-center justify-center text-[#1A2E1A] dark:text-white active:scale-95 text-sm font-bold border border-gray-100 dark:border-transparent"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Cumulative Review Repetition */}
                {planType !== "seven_castles" && (
                  <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="pl-2">
                        <span className="text-xs font-bold block dark:text-white">
                          تكرار المراجعة التراكمية
                        </span>
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 block">
                          عدد مرات قراءة كامل المحفوظ السابق تراكمياً
                        </span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            setCumulativeReviewRepetitions(
                              Math.max(1, cumulativeReviewRepetitions - 1),
                            )
                          }
                          className="w-8 h-8 rounded-full bg-white dark:bg-[#2C2C2C] shadow flex items-center justify-center text-[#1A2E1A] dark:text-white active:scale-95 text-sm font-bold border border-gray-100 dark:border-transparent"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={cumulativeReviewRepetitions}
                          onChange={(e) =>
                            setCumulativeReviewRepetitions(
                              Math.max(1, parseInt(e.target.value) || 1),
                            )
                          }
                          onFocus={(e) => e.target.select()}
                          className="text-lg font-bold dark:text-white w-14 text-center bg-transparent border-none p-0 focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setCumulativeReviewRepetitions(
                              cumulativeReviewRepetitions + 1,
                            )
                          }
                          className="w-8 h-8 rounded-full bg-white dark:bg-[#2C2C2C] shadow flex items-center justify-center text-[#1A2E1A] dark:text-white active:scale-95 text-sm font-bold border border-gray-100 dark:border-transparent"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* الخطوة الرابعة: المحفوظ السابق (مراجعة القديم) لخطط الحفظ */}
            <div className="bg-white dark:bg-rose-950/10 p-5 sm:p-6 rounded-[24px] border border-rose-500/20 border-r-4 border-r-rose-500 shadow-sm space-y-4 transition-colors">
              <div className="flex items-center gap-3 border-b border-rose-500/10 pb-3">
                <span className="w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center font-bold text-sm">
                  ٤
                </span>
                <h3 className="font-extrabold text-[#1A2E1A] dark:text-rose-400 text-base font-rtl">
                  المحفوظ السابق (مراجعة القديم)
                </h3>
              </div>

              {/* Old Memorization Selector Panel */}
              <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-white/5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-[#1A2E1A] dark:text-[#D4AF37]">
                      المحفوظ السابق (مراجعة القديم)
                    </h3>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500">
                      تضمين مراجعة مستمرة لأجزاء أو سور تم حفظها مسبقاً
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasOldMemorization}
                      onChange={(e) => setHasOldMemorization(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 dark:bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1A2E1A] dark:peer-checked:bg-[#D4AF37]"></div>
                  </label>
                </div>

                {hasOldMemorization && (
                  <div className="p-5 bg-amber-50/20 dark:bg-amber-950/5 border border-amber-500/10 dark:border-amber-500/5 rounded-2xl space-y-4">
                    {/* Selector Tabs */}
                    <div className="flex p-1 bg-gray-50 dark:bg-black/20 rounded-xl gap-1">
                      <button
                        type="button"
                        onClick={() => setOldMemType("range")}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          oldMemType === "range"
                            ? "bg-white dark:bg-[#2C2C2C] text-[#1A2E1A] dark:text-[#D4AF37] shadow-sm"
                            : "text-gray-400"
                        }`}
                      >
                        تحديد بالنطاقات (الصفحات)
                      </button>
                      <button
                        type="button"
                        onClick={() => setOldMemType("juz")}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          oldMemType === "juz"
                            ? "bg-white dark:bg-[#2C2C2C] text-[#1A2E1A] dark:text-[#D4AF37] shadow-sm"
                            : "text-gray-400"
                        }`}
                      >
                        تحديد بالأجزاء
                      </button>
                      <button
                        type="button"
                        onClick={() => setOldMemType("surah")}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          oldMemType === "surah"
                            ? "bg-white dark:bg-[#2C2C2C] text-[#1A2E1A] dark:text-[#D4AF37] shadow-sm"
                            : "text-gray-400"
                        }`}
                      >
                        تحديد بالسور
                      </button>
                    </div>

                    {/* Selection widgets */}
                    {oldMemType === "range" ? (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-gray-600 dark:text-gray-300">
                            نطاقات المحفوظ القديم ({oldMemorizationRanges.length}):
                          </span>
                          {oldMemorizationRanges.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                setOldMemorizationRanges([{ start: 1, end: 20 }])
                              }
                              className="text-red-500 hover:underline text-[10px]"
                            >
                              إعادة تعيين النطاقات
                            </button>
                          )}
                        </div>

                        <div className="space-y-2.5">
                          {oldMemorizationRanges.map((range, index) => {
                            const pagesInRange = Math.max(
                              0,
                              Math.abs(range.end - range.start) + 1,
                            );
                            return (
                              <div
                                key={index}
                                className="p-3.5 bg-white dark:bg-black/30 rounded-xl border border-amber-500/20 space-y-2.5 shadow-sm"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-[#1A2E1A] dark:text-[#D4AF37] flex items-center gap-1.5">
                                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-900 dark:text-amber-300 flex items-center justify-center text-[10px] font-bold">
                                      {index + 1}
                                    </span>
                                    النطاق {index + 1}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded-md">
                                      {pagesInRange} صفحة
                                    </span>
                                    {oldMemorizationRanges.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOldMemorizationRanges((prev) =>
                                            prev.filter((_, i) => i !== index),
                                          );
                                        }}
                                        className="text-red-500 hover:text-red-700 dark:hover:text-red-400 p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
                                        title="حذف هذا النطاق"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400">
                                      من صفحة (بداية النطاق):
                                    </label>
                                    <input
                                      type="number"
                                      min={1}
                                      max={604}
                                      value={range.start}
                                      onFocus={(e) => e.target.select()}
                                      onChange={(e) => {
                                        const val = Math.min(
                                          604,
                                          Math.max(
                                            1,
                                            parseInt(e.target.value) || 1,
                                          ),
                                        );
                                        setOldMemorizationRanges((prev) =>
                                          prev.map((r, i) =>
                                            i === index
                                              ? { ...r, start: val }
                                              : r,
                                          ),
                                        );
                                      }}
                                      className="w-full bg-gray-50 dark:bg-white/5 dark:text-white border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-[#D4AF37] outline-none transition-all"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400">
                                      إلى صفحة (نهاية النطاق):
                                    </label>
                                    <input
                                      type="number"
                                      min={1}
                                      max={604}
                                      value={range.end}
                                      onFocus={(e) => e.target.select()}
                                      onChange={(e) => {
                                        const val = Math.min(
                                          604,
                                          Math.max(
                                            1,
                                            parseInt(e.target.value) || 1,
                                          ),
                                        );
                                        setOldMemorizationRanges((prev) =>
                                          prev.map((r, i) =>
                                            i === index
                                              ? { ...r, end: val }
                                              : r,
                                          ),
                                        );
                                      }}
                                      className="w-full bg-gray-50 dark:bg-white/5 dark:text-white border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-[#D4AF37] outline-none transition-all"
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const lastRange =
                              oldMemorizationRanges[
                                oldMemorizationRanges.length - 1
                              ];
                            const nextStart = lastRange
                              ? Math.min(
                                  604,
                                  Math.max(lastRange.start, lastRange.end) + 1,
                                )
                              : 1;
                            const nextEnd = Math.min(604, nextStart + 19);
                            setOldMemorizationRanges((prev) => [
                              ...prev,
                              { start: nextStart, end: nextEnd },
                            ]);
                          }}
                          className="w-full py-2.5 px-4 bg-white dark:bg-white/5 border border-dashed border-[#1A2E1A]/30 dark:border-[#D4AF37]/30 hover:border-[#1A2E1A] dark:hover:border-[#D4AF37] rounded-xl text-xs font-bold text-[#1A2E1A] dark:text-[#D4AF37] flex items-center justify-center gap-2 transition-all hover:bg-gray-50 dark:hover:bg-white/10 active:scale-[0.99]"
                        >
                          <Plus className="w-4 h-4" />
                          <span>+ إضافة نطاق آخر للمحفوظ القديم</span>
                        </button>
                      </div>
                    ) : oldMemType === "juz" ? (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-gray-500 dark:text-gray-400">
                            اختر الأجزاء المحفوظة سابقاً:
                          </span>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedOldJuzs(
                                  Array.from({ length: 30 }, (_, i) => i + 1),
                                )
                              }
                              className="text-[#D4AF37] hover:underline font-bold text-[10px]"
                            >
                              تحديد الكل
                            </button>
                            <span className="text-gray-300">|</span>
                            <button
                              type="button"
                              onClick={() => setSelectedOldJuzs([])}
                              className="text-gray-400 hover:underline text-[10px]"
                            >
                              إلغاء الكل
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-5 gap-2 max-h-48 overflow-y-auto pr-1">
                          {Array.from({ length: 30 }, (_, i) => i + 1).map(
                            (n) => {
                              const isSelected = selectedOldJuzs.includes(n);
                              return (
                                <button
                                  key={n}
                                  type="button"
                                  onClick={() => {
                                    setSelectedOldJuzs((prev) =>
                                      prev.includes(n)
                                        ? prev.filter((x) => x !== n)
                                        : [...prev, n],
                                    );
                                  }}
                                  className={`py-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                                    isSelected
                                      ? "bg-[#1A2E1A] dark:bg-[#D4AF37] text-white dark:text-[#1A1A1A] shadow-sm"
                                      : "bg-gray-50 dark:bg-white/5 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
                                  }`}
                                >
                                  <span>جزء</span>
                                  <span className="text-xs">{n}</span>
                                </button>
                              );
                            },
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* Search box */}
                        <div className="relative">
                          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="text"
                            placeholder="ابحث عن سورة للمراجعة..."
                            value={surahSearch}
                            onChange={(e) => setSurahSearch(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-white/5 dark:text-white border-none rounded-xl pr-9 pl-4 py-2.5 text-xs focus:ring-1 focus:ring-[#D4AF37] transition-all"
                          />
                        </div>

                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-gray-500 dark:text-gray-400">
                            السور المحددة ({selectedOldSurahs.length})
                          </span>
                          {selectedOldSurahs.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setSelectedOldSurahs([])}
                              className="text-red-500 hover:underline text-[10px]"
                            >
                              مسح التحديد
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-3 gap-1.5 max-h-48 overflow-y-auto pr-1">
                          {SURAH_METADATAList.filter((s) =>
                            s.name.includes(surahSearch),
                          ).map((s) => {
                            const isSelected = selectedOldSurahs.includes(
                              s.name,
                            );
                            return (
                              <button
                                key={s.name}
                                type="button"
                                onClick={() => {
                                  setSelectedOldSurahs((prev) =>
                                    prev.includes(s.name)
                                      ? prev.filter((x) => x !== s.name)
                                      : [...prev, s.name],
                                  );
                                }}
                                className={`py-2 px-1 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1 border ${
                                  isSelected
                                    ? "bg-[#1A2E1A] dark:bg-[#D4AF37] border-transparent text-white dark:text-[#1A1A1A] shadow-sm"
                                    : "bg-gray-50/50 dark:bg-white/5 border-transparent text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
                                }`}
                              >
                                {isSelected && (
                                  <Check className="w-3.5 h-3.5 shrink-0" />
                                )}
                                <span className="truncate">{s.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Old Mem Review Mode Selector */}
                    <div className="space-y-3 pt-3 border-t border-amber-500/10">
                      <label className="text-xs font-bold text-amber-900 dark:text-amber-200">
                        مدة ختمة مراجعة المحفوظ القديم
                      </label>
                      <select
                        value={oldMemReviewMode}
                        onChange={(e) =>
                          setOldMemReviewMode(e.target.value as any)
                        }
                        className="w-full py-2.5 px-3.5 bg-white dark:bg-[#1A1A1A] border border-amber-500/25 rounded-xl text-xs font-extrabold text-[#1A2E1A] dark:text-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/50 hover:border-amber-500/40 outline-none transition-all shadow-sm"
                      >
                        <option value="auto">تلقائي (حسب الخطة)</option>
                        <option value="custom_days">تحديد عدد الأيام</option>
                        <option value="custom_amount">تحديد المقدار</option>
                      </select>

                      {oldMemReviewMode === "custom_days" && (
                        <div className="flex items-center gap-3 mt-2 bg-white dark:bg-[#1A1A1A] border border-amber-500/20 rounded-xl p-3">
                          <label className="text-xs text-amber-800 dark:text-amber-300 whitespace-nowrap">
                            عدد الأيام لختم القديم:
                          </label>
                          <input
                            type="number"
                            onFocus={(e) => e.target.select()}
                            min="1"
                            max="365"
                            value={oldMemCustomDays}
                            onChange={(e) =>
                              setOldMemCustomDays(parseInt(e.target.value) || 1)
                            }
                            className="w-full bg-transparent border-none text-left p-0 text-sm font-bold focus:ring-0"
                            dir="ltr"
                          />
                        </div>
                      )}

                      {oldMemReviewMode === "custom_amount" && (
                        <div className="space-y-3 mt-2">
                          <div className="flex items-center bg-white dark:bg-[#1A1A1A] border border-amber-500/20 rounded-xl p-1 gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setOldMemCustomAmountType("pages");
                                setOldMemCustomAmountValue(5);
                              }}
                              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                                oldMemCustomAmountType === "pages"
                                  ? "bg-[#1A2E1A] dark:bg-[#D4AF37] text-white dark:text-[#1A1A1A]"
                                  : "text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5"
                              }`}
                            >
                              عدد الصفحات
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setOldMemCustomAmountType("quarter_hizb");
                                setOldMemCustomAmountValue(2);
                              }}
                              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                                oldMemCustomAmountType === "quarter_hizb"
                                  ? "bg-[#1A2E1A] dark:bg-[#D4AF37] text-white dark:text-[#1A1A1A]"
                                  : "text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5"
                              }`}
                            >
                              ربع حزب
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setOldMemCustomAmountType("juz");
                                setOldMemCustomAmountValue(1);
                              }}
                              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                                oldMemCustomAmountType === "juz"
                                  ? "bg-[#1A2E1A] dark:bg-[#D4AF37] text-white dark:text-[#1A1A1A]"
                                  : "text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5"
                              }`}
                            >
                              جزء
                            </button>
                          </div>
                          <div className="flex items-center gap-3 bg-white dark:bg-[#1A1A1A] border border-amber-500/20 rounded-xl p-3">
                            <label className="text-xs text-amber-800 dark:text-amber-300 whitespace-nowrap">
                              العدد المخصص:
                            </label>
                            <input
                              type="number"
                              onFocus={(e) => e.target.select()}
                              min="1"
                              max="604"
                              value={oldMemCustomAmountValue}
                              onChange={(e) =>
                                setOldMemCustomAmountValue(
                                  parseInt(e.target.value) || 1,
                                )
                              }
                              className="w-full bg-transparent border-none text-left p-0 text-sm font-bold focus:ring-0"
                              dir="ltr"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Summary / Stats of previous revision */}
                    {oldPagesCount > 0 ? (
                      <div className="bg-amber-500/10 dark:bg-amber-500/5 p-4 rounded-xl border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 space-y-2">
                        <div className="flex justify-between font-bold">
                          <span>إجمالي الصفحات المحددة:</span>
                          <span>{oldPagesCount} صفحة</span>
                        </div>
                        <div className="flex justify-between">
                          <span>تقريباً بالأجزاء:</span>
                          <span>{(oldPagesCount / 20).toFixed(1)} جزء</span>
                        </div>
                        <div className="border-t border-amber-500/10 my-2 pt-2 text-[10px] space-y-1.5">
                          <p className="font-bold text-amber-900 dark:text-amber-200">
                            ✦ طريقة مراجعة المحفوظ القديم:
                          </p>
                          {oldMemReviewMode === "custom_days" ? (
                            <p>
                              لقد اخترت مساراً مخصصاً لختم القديم، بحيث ستقسم
                              المراجعة على{" "}
                              <strong>{oldMemCustomDays} يوم</strong> (بمعدل{" "}
                              {Math.ceil(
                                oldPagesCount / Math.max(1, oldMemCustomDays),
                              )}{" "}
                              صفحة يومياً لليوم الفعلي للمراجعة).
                            </p>
                          ) : planType === "seven_castles" ? (
                            <>
                              {oldPagesCount <= 140 ? (
                                <p>
                                  المحفوظ القديم 7 أجزاء (140 صفحة) أو أقل، لذلك
                                  ستقسم المراجعة على <strong>7 أيام</strong>{" "}
                                  (بمعدل {Math.ceil(oldPagesCount / 7)} صفحة
                                  يومياً) لتختم المراجعة كل أسبوع.
                                </p>
                              ) : (
                                <p>
                                  المحفوظ القديم أكثر من 7 أجزاء، لذلك ستقسم
                                  المراجعة على <strong>14 يوماً</strong> (بمعدل{" "}
                                  {Math.ceil(oldPagesCount / 14)} صفحة يومياً)
                                  لتختم المراجعة كل أسبوعين.
                                </p>
                              )}
                            </>
                          ) : (
                            <>
                              {oldPagesCount <= 100 ? (
                                <p>
                                  المحفوظ القديم 5 أجزاء (100 صفحة) أو أقل، لذلك
                                  ستقسم المراجعة على{" "}
                                  <strong>5 أيام فعلية</strong> (بمعدل{" "}
                                  {Math.ceil(oldPagesCount / 5)} صفحة يومياً)
                                  لتختم المراجعة كل أسبوع.
                                </p>
                              ) : (
                                <p>
                                  المحفوظ القديم أكثر من 5 أجزاء، لذلك ستقسم
                                  المراجعة على <strong>10 أيام فعلية</strong>{" "}
                                  (بمعدل {Math.ceil(oldPagesCount / 10)} صفحة
                                  يومياً) لتختم المراجعة كل أسبوعين.
                                </p>
                              )}
                              <p className="border-t border-amber-500/5 pt-1.5 text-[9px] text-[#1A2E1A]/70 dark:text-amber-400/70 leading-relaxed font-medium">
                                💡 <strong>تنبيه تلقائي:</strong> أثناء سير
                                الخطة، كلما أتممت حفظ جزء كامل (20 صفحة جديدة)،
                                سينضم تلقائياً إلى مهمة مراجعة المحفوظ القديم،
                                وسيُعاد تقسيم المراجعة على الأيام بناءً على ذلك
                                (5 أو 10 أيام فعلية) لضمان ربط وتثبيت الحفظ
                                الجديد بالقديم.
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-[10px] text-amber-500 text-center font-bold">
                        يرجى تحديد جزء أو سورة واحدة على الأقل!
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* الخطوة الثانية: تفاصيل الخطة ونطاق المراجعة لخطط المراجعة والتثبيت */}
            <div className="bg-white dark:bg-amber-950/10 p-5 sm:p-6 rounded-[24px] border border-amber-500/20 border-r-4 border-r-amber-500 shadow-sm space-y-5 transition-colors">
              <div className="flex items-center gap-3 border-b border-amber-500/10 pb-3">
                <span className="w-8 h-8 rounded-full bg-amber-500 text-black flex items-center justify-center font-bold text-sm">
                  ٢
                </span>
                <h3 className="font-extrabold text-[#1A2E1A] dark:text-amber-400 text-base font-rtl">
                  تفاصيل الخطة ونطاق المراجعة والتثبيت
                </h3>
              </div>

              {/* Review Plan Options */}
              <div className="space-y-6">
                {/* Review and Consolidation Scope Selector Dashboard */}
                <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-[#1A2E1A] dark:text-[#D4AF37]">
                        نطاق خطة المراجعة والتثبيت
                      </h3>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500">
                        اختر مراجعة المصحف كاملاً، تحديد أجزاء وسور، أو مراجعة
                        نطاق صفحات محددة
                      </p>
                    </div>
                    <div className="flex bg-gray-200/50 dark:bg-black/20 p-1 rounded-xl shrink-0 self-start sm:self-auto gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setReviewRangeMode("full");
                          setIsSpecificReview(false);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          reviewRangeMode === "full"
                            ? "bg-white dark:bg-[#2C2C2C] text-[#1A2E1A] dark:text-[#D4AF37] shadow-sm"
                            : "text-gray-400"
                        }`}
                      >
                        المصحف كاملاً
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setReviewRangeMode("specific");
                          setIsSpecificReview(true);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          reviewRangeMode === "specific"
                            ? "bg-white dark:bg-[#2C2C2C] text-[#1A2E1A] dark:text-[#D4AF37] shadow-sm"
                            : "text-gray-400"
                        }`}
                      >
                        أجزاء وسور
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setReviewRangeMode("custom_pages");
                          setIsSpecificReview(true);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          reviewRangeMode === "custom_pages"
                            ? "bg-white dark:bg-[#2C2C2C] text-[#1A2E1A] dark:text-[#D4AF37] shadow-sm"
                            : "text-gray-400"
                        }`}
                      >
                        نطاق صفحات
                      </button>
                    </div>
                  </div>

                  {reviewRangeMode === "full" && (
                    <div className="pt-3 border-t border-gray-100 dark:border-white/5 space-y-3">
                      <div>
                        <label className="text-xs font-bold text-[#1A2E1A] dark:text-[#D4AF37] block">
                          من أي جزء تكون بداية المراجعة؟
                        </label>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-2">
                          يمكنك اختيار الجزء الذي تبدأ منه المراجعة للـمصحف كاملاً (مثال: البدء من الجزء 16 ثم من 1 إلى 15)
                        </p>
                      </div>
                      <div className="grid grid-cols-10 gap-1">
                        {Array.from({ length: 30 }, (_, i) => i + 1).map((juzNo) => {
                          const isSelected = reviewStartJuz === juzNo;
                          return (
                            <button
                              key={juzNo}
                              type="button"
                              onClick={() => setReviewStartJuz(juzNo)}
                              className={`h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center ${
                                isSelected
                                  ? "bg-[#1A2E1A] dark:bg-[#D4AF37] text-white dark:text-[#1A1A1A] scale-105 shadow"
                                  : "bg-white dark:bg-[#2C2C2C] text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
                              }`}
                            >
                              {juzNo}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {isSpecificReview && (
                    <div className="pt-2 space-y-4 border-t border-gray-200/50 dark:border-white/5">
                      {reviewRangeMode === "custom_pages" ? (
                        <div className="space-y-3">
                          <label className="text-xs font-bold text-gray-400 dark:text-gray-500 block">
                            حدد نطاق الصفحات المطلوب مراجعتها وتثبيتها:
                          </label>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-gray-400 dark:text-gray-500">
                                من صفحة
                              </label>
                              <input
                                type="number"
                                onFocus={(e) => e.target.select()}
                                min={1}
                                max={604}
                                value={reviewStartPage}
                                onChange={(e) => {
                                  const val = Math.min(
                                    604,
                                    Math.max(1, parseInt(e.target.value) || 1),
                                  );
                                  setReviewStartPage(val);
                                }}
                                className="w-full bg-white dark:bg-white/5 dark:text-white border border-gray-100 dark:border-white/5 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#D4AF37] transition-all"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-gray-400 dark:text-gray-500">
                                إلى صفحة
                              </label>
                              <input
                                type="number"
                                onFocus={(e) => e.target.select()}
                                min={1}
                                max={604}
                                value={reviewEndPage}
                                onChange={(e) => {
                                  const val = Math.min(
                                    604,
                                    Math.max(1, parseInt(e.target.value) || 1),
                                  );
                                  setReviewEndPage(val);
                                }}
                                className="w-full bg-white dark:bg-white/5 dark:text-white border border-gray-100 dark:border-white/5 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#D4AF37] transition-all"
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Selector Tabs for review specific items */}
                          <div className="flex p-0.5 bg-gray-200/30 dark:bg-black/10 rounded-lg">
                            <button
                              type="button"
                              onClick={() => setSpecificReviewType("juz")}
                              className={`flex-1 py-1 rounded-md text-xs font-bold transition-all ${
                                specificReviewType === "juz"
                                  ? "bg-white dark:bg-[#2C2C2C] text-[#1A2E1A] dark:text-[#D4AF37] shadow-sm"
                                  : "text-gray-400"
                              }`}
                            >
                              المراجعة بالأجزاء
                            </button>
                            <button
                              type="button"
                              onClick={() => setSpecificReviewType("surah")}
                              className={`flex-1 py-1 rounded-md text-xs font-bold transition-all ${
                                specificReviewType === "surah"
                                  ? "bg-white dark:bg-[#2C2C2C] text-[#1A2E1A] dark:text-[#D4AF37] shadow-sm"
                                  : "text-gray-400"
                              }`}
                            >
                              المراجعة بالسور
                            </button>
                          </div>

                          {/* Selection Widgets */}
                          {specificReviewType === "juz" ? (
                            <div className="space-y-2">
                              <label className="text-[10px] text-gray-400 dark:text-gray-500 font-bold block">
                                اضغط لتحديد الأجزاء المطلوب مراجعتها وتثبيتها:
                              </label>
                              <div className="grid grid-cols-6 gap-1.5">
                                {Array.from(
                                  { length: 30 },
                                  (_, i) => i + 1,
                                ).map((n) => {
                                  const isSelected =
                                    selectedReviewJuzs.includes(n);
                                  return (
                                    <button
                                      key={n}
                                      type="button"
                                      onClick={() => toggleReviewJuz(n)}
                                      className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                                        isSelected
                                          ? "bg-[#1A2E1A] dark:bg-[#D4AF37] text-white dark:text-[#1A1A1A] shadow-sm"
                                          : "bg-white dark:bg-white/5 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
                                      }`}
                                    >
                                      {n}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="relative">
                                <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                <input
                                  type="text"
                                  placeholder="ابحث عن سورة لتثبيتها..."
                                  value={reviewSurahSearch}
                                  onChange={(e) =>
                                    setReviewSurahSearch(e.target.value)
                                  }
                                  className="w-full pl-3 pr-8 py-1.5 rounded-lg bg-white dark:bg-white/5 text-xs border border-gray-100 dark:border-white/5 focus:outline-none focus:border-[#D4AF37]"
                                />
                              </div>
                              <div className="grid grid-cols-3 gap-1.5 max-h-36 overflow-y-auto custom-scrollbar p-1">
                                {SURAH_METADATAList.filter((s) =>
                                  s.name.includes(reviewSurahSearch),
                                ).map((s) => {
                                  const isSelected =
                                    selectedReviewSurahs.includes(s.name);
                                  return (
                                    <button
                                      key={s.name}
                                      type="button"
                                      onClick={() => toggleReviewSurah(s.name)}
                                      className={`py-1 text-[11px] font-bold rounded-lg transition-all text-center border truncate ${
                                        isSelected
                                          ? "bg-[#1A2E1A] border-[#1A2E1A] text-white dark:bg-[#D4AF37] dark:border-[#D4AF37] dark:text-[#1A1A1A]"
                                          : "bg-white dark:bg-white/5 border-gray-50 dark:border-white/5 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10"
                                      }`}
                                    >
                                      {s.name}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {/* Specific Review Pages stats */}
                      {getCombinedReviewPages().length > 0 ? (
                        <div className="bg-amber-500/10 dark:bg-amber-500/5 p-3 rounded-xl border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex justify-between font-bold">
                          <span>إجمالي صفحات التثبيت والمراجعة المحددة:</span>
                          <span>
                            {getCombinedReviewPages().length} صفحة (
                            {(getCombinedReviewPages().length / 20).toFixed(1)}{" "}
                            جزء)
                          </span>
                        </div>
                      ) : (
                        <p className="text-[10px] text-amber-500 dark:text-amber-400 text-center font-bold">
                          يرجى تحديد جزء أو سورة واحدة على الأقل أو نطاق صفحات!
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-bold block dark:text-white">
                    مقدار المراجعة اليومية
                  </label>

                  {/* Selector for Juz vs Pages */}
                  <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-xl w-full max-w-xs gap-1 border border-gray-200 dark:border-white/5 shadow-sm">
                    <button
                      type="button"
                      onClick={() => setReviewAmountType("juz")}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        reviewAmountType === "juz"
                          ? "bg-[#1A2E1A] dark:bg-[#D4AF37] text-white dark:text-[#1A1A1A] shadow-sm"
                          : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                      }`}
                    >
                      تحديد بعدد الأجزاء
                    </button>
                    <button
                      type="button"
                      onClick={() => setReviewAmountType("pages")}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        reviewAmountType === "pages"
                          ? "bg-[#1A2E1A] dark:bg-[#D4AF37] text-white dark:text-[#1A1A1A] shadow-sm"
                          : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                      }`}
                    >
                      تحديد بعدد الصفحات
                    </button>
                  </div>

                  {reviewAmountType === "juz" ? (
                    <div className="space-y-2">
                      <span className="text-xs text-gray-400 dark:text-gray-500 block font-medium">
                        اختر عدد الأجزاء اليومية للمراجعة:
                      </span>
                      <div className="grid grid-cols-6 gap-2">
                        {[1, 2, 3, 4, 5, 6].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setReviewJuzAmount(n)}
                            className={`py-2 rounded-xl text-sm font-bold transition-all ${
                              reviewJuzAmount === n
                                ? "bg-[#1A2E1A] dark:bg-[#D4AF37] text-white dark:text-[#1A1A1A]"
                                : "bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
                            }`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <span className="text-xs text-gray-400 dark:text-gray-500 block font-medium">
                        حدد عدد الصفحات اليومية للمراجعة:
                      </span>
                      <div className="flex items-center gap-3 bg-gray-50 dark:bg-white/5 p-2 rounded-2xl w-fit border border-gray-100 dark:border-white/5 shadow-inner">
                        <button
                          type="button"
                          onClick={() =>
                            setReviewPageAmount(
                              Math.max(1, reviewPageAmount - 1),
                            )
                          }
                          className="w-10 h-10 rounded-full bg-white dark:bg-[#2C2C2C] border border-gray-150 dark:border-none shadow flex items-center justify-center text-[#1A2E1A] dark:text-white active:scale-95 text-lg font-bold"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="1"
                          max="604"
                          value={reviewPageAmount}
                          onChange={(e) =>
                            setReviewPageAmount(
                              Math.min(
                                604,
                                Math.max(1, parseInt(e.target.value) || 1),
                              ),
                            )
                          }
                          onFocus={(e) => e.target.select()}
                          className="text-xl font-bold text-[#1A2E1A] dark:text-white w-14 text-center bg-transparent border-none p-0 focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none font-mono"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setReviewPageAmount(
                              Math.min(604, reviewPageAmount + 1),
                            )
                          }
                          className="w-10 h-10 rounded-full bg-white dark:bg-[#2C2C2C] border border-gray-150 dark:border-none shadow flex items-center justify-center text-[#1A2E1A] dark:text-white active:scale-95 text-lg font-bold"
                        >
                          +
                        </button>
                        <span className="text-xs text-[#1A2E1A] dark:text-gray-300 font-bold px-2">
                          صفحة يومياً
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Additional Review Tracks section */}
                <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-white/5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold dark:text-white">
                        مسارات المراجعة الإضافية
                      </h4>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500">
                        يمكنك إضافة مسارات مراجعة موازية تبدأ من أجزاء أو مواضع أخرى لتسير معاً
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={addTrack}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1A2E1A] dark:bg-[#D4AF37] hover:bg-[#2b4c2b] dark:hover:bg-[#e5be49] text-white dark:text-[#1A1A1A] rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      إضافة مسار جديد
                    </button>
                  </div>

                  {reviewTracks.length > 0 ? (
                    <div className="space-y-4">
                      {reviewTracks.map((track, idx) => (
                        <div
                          key={track.id}
                          className="p-4 rounded-2xl border border-gray-150 dark:border-white/10 bg-white/50 dark:bg-white/5 shadow-sm space-y-4 relative"
                        >
                          {/* Track Title / Delete */}
                          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/5">
                            <span className="text-xs font-extrabold text-[#1A2E1A] dark:text-[#D4AF37]">
                              مسار مراجعة إضافي #{idx + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeTrack(track.id)}
                              className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"
                              title="حذف هذا المسار"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Range selection mode */}
                          <div className="space-y-2">
                            <span className="text-xs text-gray-400 dark:text-gray-500 font-medium block">
                              نطاق مراجعة هذا المسار:
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {[
                                { id: "full", label: "كامل المصحف" },
                                { id: "specific", label: "أجزاء محددة" },
                                { id: "custom_pages", label: "صفحات معينة" },
                              ].map((option) => (
                                <button
                                  key={option.id}
                                  type="button"
                                  onClick={() =>
                                    updateTrack(track.id, {
                                      reviewRangeMode: option.id as any,
                                      selectedReviewJuzs: [],
                                    })
                                  }
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                    track.reviewRangeMode === option.id
                                      ? "bg-[#1A2E1A] dark:bg-[#D4AF37] text-white dark:text-[#1A1A1A] shadow-sm"
                                      : "bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
                                  }`}
                                >
                                  {option.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* If full Quran starting Juz option */}
                          {track.reviewRangeMode === "full" && (
                            <div className="space-y-2 p-3 bg-gray-50 dark:bg-white/5 rounded-2xl">
                              <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 block">
                                بداية المراجعة من أي جزء في هذا المسار؟
                              </span>
                              <div className="grid grid-cols-10 gap-1">
                                {Array.from({ length: 30 }, (_, i) => i + 1).map((juzNo) => {
                                  const isSelected = (track.startJuz || 1) === juzNo;
                                  return (
                                    <button
                                      key={juzNo}
                                      type="button"
                                      onClick={() =>
                                        updateTrack(track.id, {
                                          startJuz: juzNo,
                                        })
                                      }
                                      className={`h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center ${
                                        isSelected
                                          ? "bg-[#1A2E1A] dark:bg-[#D4AF37] text-white dark:text-[#1A1A1A] scale-105 shadow"
                                          : "bg-white dark:bg-[#2C2C2C] text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
                                      }`}
                                    >
                                      {juzNo}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* If custom pages */}
                          {track.reviewRangeMode === "custom_pages" && (
                            <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 dark:bg-white/5 rounded-2xl">
                              <div className="space-y-1">
                                <span className="text-[10px] font-bold text-gray-400 block">
                                  من صفحة
                                </span>
                                <input
                                  type="number"
                                  min="1"
                                  max="604"
                                  value={track.reviewStartPage || 1}
                                  onChange={(e) =>
                                    updateTrack(track.id, {
                                      reviewStartPage: Math.max(
                                        1,
                                        Math.min(604, parseInt(e.target.value) || 1),
                                      ),
                                    })
                                  }
                                  className="w-full bg-white dark:bg-[#2C2C2C] border border-gray-200 dark:border-none p-2 rounded-xl text-sm font-bold dark:text-white"
                                />
                              </div>
                              <div className="space-y-1">
                                <span className="text-[10px] font-bold text-gray-400 block">
                                  إلى صفحة
                                </span>
                                <input
                                  type="number"
                                  min="1"
                                  max="604"
                                  value={track.reviewEndPage || 604}
                                  onChange={(e) =>
                                    updateTrack(track.id, {
                                      reviewEndPage: Math.max(
                                        1,
                                        Math.min(604, parseInt(e.target.value) || 604),
                                      ),
                                    })
                                  }
                                  className="w-full bg-white dark:bg-[#2C2C2C] border border-gray-200 dark:border-none p-2 rounded-xl text-sm font-bold dark:text-white"
                                />
                              </div>
                            </div>
                          )}

                          {/* If specific parts */}
                          {track.reviewRangeMode === "specific" && (
                            <div className="space-y-3">
                              {/* Selector Tabs for review specific items */}
                              <div className="flex p-0.5 bg-gray-200/30 dark:bg-black/10 rounded-lg">
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateTrack(track.id, {
                                      specificReviewType: "juz",
                                    })
                                  }
                                  className={`flex-1 py-1 rounded-md text-xs font-bold transition-all ${
                                    (track.specificReviewType || "juz") === "juz"
                                      ? "bg-white dark:bg-[#2C2C2C] text-[#1A2E1A] dark:text-[#D4AF37] shadow-sm"
                                      : "text-gray-400 hover:text-gray-600"
                                  }`}
                                >
                                  المراجعة بالأجزاء
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateTrack(track.id, {
                                      specificReviewType: "surah",
                                    })
                                  }
                                  className={`flex-1 py-1 rounded-md text-xs font-bold transition-all ${
                                    (track.specificReviewType || "juz") === "surah"
                                      ? "bg-white dark:bg-[#2C2C2C] text-[#1A2E1A] dark:text-[#D4AF37] shadow-sm"
                                      : "text-gray-400 hover:text-gray-600"
                                  }`}
                                >
                                  المراجعة بالسور
                                </button>
                              </div>

                              {(track.specificReviewType || "juz") === "juz" ? (
                                <div className="space-y-2 p-3 bg-gray-50 dark:bg-white/5 rounded-2xl">
                                  <span className="text-[11px] text-gray-400 dark:text-gray-500 font-bold block">
                                    اضغط لتحديد الأجزاء المطلوبة للمراجعة في هذا المسار:
                                  </span>
                                  <div className="grid grid-cols-10 gap-1">
                                    {Array.from({ length: 30 }, (_, i) => i + 1).map((juzNo) => {
                                      const isSelected = track.selectedReviewJuzs?.includes(juzNo);
                                      return (
                                        <button
                                          key={juzNo}
                                          type="button"
                                          onClick={() => {
                                            const currentSelected = track.selectedReviewJuzs || [];
                                            const nextSelected = isSelected
                                              ? currentSelected.filter((j: number) => j !== juzNo)
                                              : [...currentSelected, juzNo];
                                            updateTrack(track.id, {
                                              selectedReviewJuzs: nextSelected,
                                            });
                                          }}
                                          className={`h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center ${
                                            isSelected
                                              ? "bg-[#1A2E1A] dark:bg-[#D4AF37] text-white dark:text-[#1A1A1A] scale-105 shadow"
                                              : "bg-white dark:bg-[#2C2C2C] text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
                                          }`}
                                        >
                                          {juzNo}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-3 p-3 bg-gray-50 dark:bg-white/5 rounded-2xl">
                                  <div className="relative">
                                    <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                    <input
                                      type="text"
                                      placeholder="ابحث عن سورة لتثبيتها..."
                                      value={track.surahSearch || ""}
                                      onChange={(e) =>
                                        updateTrack(track.id, {
                                          surahSearch: e.target.value,
                                        })
                                      }
                                      className="w-full pl-3 pr-8 py-1.5 rounded-lg bg-white dark:bg-white/5 text-xs border border-gray-100 dark:border-white/5 focus:outline-none focus:border-[#D4AF37]"
                                    />
                                  </div>
                                  <div className="grid grid-cols-3 gap-1.5 max-h-36 overflow-y-auto custom-scrollbar p-1">
                                    {SURAH_METADATAList.filter((s) =>
                                      s.name.includes(track.surahSearch || ""),
                                    ).map((s) => {
                                      const isSelected = (track.selectedReviewSurahs || []).includes(s.name);
                                      return (
                                        <button
                                          key={s.name}
                                          type="button"
                                          onClick={() => {
                                            const currentSelected = track.selectedReviewSurahs || [];
                                            const nextSelected = isSelected
                                              ? currentSelected.filter((n: string) => n !== s.name)
                                              : [...currentSelected, s.name];
                                            updateTrack(track.id, {
                                              selectedReviewSurahs: nextSelected,
                                            });
                                          }}
                                          className={`py-1 text-[11px] font-bold rounded-lg transition-all text-center border truncate ${
                                            isSelected
                                              ? "bg-[#1A2E1A] border-[#1A2E1A] text-white dark:bg-[#D4AF37] dark:border-[#D4AF37] dark:text-[#1A1A1A]"
                                              : "bg-white dark:bg-white/5 border-gray-50 dark:border-white/5 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10"
                                          }`}
                                        >
                                          {s.name}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Amount of daily review for this track */}
                          <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-white/5">
                            <span className="text-xs text-gray-400 dark:text-gray-500 font-medium block">
                              مقدار المراجعة اليومية لهذا المسار:
                            </span>

                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  updateTrack(track.id, {
                                    reviewAmountType: "juz",
                                  })
                                }
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                                  track.reviewAmountType === "juz"
                                    ? "bg-gray-800 text-white dark:bg-[#D4AF37] dark:text-[#1A1A1A]"
                                    : "bg-gray-100 dark:bg-white/5 text-gray-400 hover:text-gray-600"
                                }`}
                              >
                                تحديد بعدد الأجزاء
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  updateTrack(track.id, {
                                    reviewAmountType: "pages",
                                  })
                                }
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                                  track.reviewAmountType === "pages"
                                    ? "bg-gray-800 text-white dark:bg-[#D4AF37] dark:text-[#1A1A1A]"
                                    : "bg-gray-100 dark:bg-white/5 text-gray-400 hover:text-gray-600"
                                }`}
                              >
                                تحديد بعدد الصفحات
                              </button>
                            </div>

                            {track.reviewAmountType === "juz" ? (
                              <div className="flex items-center gap-1.5 pt-1">
                                {[1, 2, 3, 4, 5, 6].map((num) => (
                                  <button
                                    key={num}
                                    type="button"
                                    onClick={() =>
                                      updateTrack(track.id, {
                                        reviewJuzAmount: num,
                                      })
                                    }
                                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                                      (track.reviewJuzAmount || 2) === num
                                        ? "bg-[#1A2E1A] dark:bg-[#D4AF37] text-white dark:text-[#1A1A1A]"
                                        : "bg-gray-50 dark:bg-white/5 text-gray-500 hover:bg-gray-100"
                                    }`}
                                  >
                                    {num}
                                  </button>
                                ))}
                                <span className="text-[11px] text-gray-400 dark:text-gray-500 mr-2">
                                  جزء يومياً
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 bg-gray-50 dark:bg-white/5 p-1 rounded-xl w-fit">
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateTrack(track.id, {
                                      reviewPageAmount: Math.max(
                                        1,
                                        (track.reviewPageAmount || 10) - 1,
                                      ),
                                    })
                                  }
                                  className="w-7 h-7 rounded-full bg-white dark:bg-[#2C2C2C] flex items-center justify-center font-bold text-xs shadow-sm active:scale-95 text-gray-800 dark:text-white"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  max="604"
                                  value={track.reviewPageAmount || 10}
                                  onChange={(e) =>
                                    updateTrack(track.id, {
                                      reviewPageAmount: Math.max(
                                        1,
                                        Math.min(604, parseInt(e.target.value) || 10),
                                      ),
                                    })
                                  }
                                  className="w-10 text-center bg-transparent border-none p-0 text-xs font-bold font-mono dark:text-white"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateTrack(track.id, {
                                      reviewPageAmount: Math.min(
                                        604,
                                        (track.reviewPageAmount || 10) + 1,
                                      ),
                                    })
                                  }
                                  className="w-7 h-7 rounded-full bg-white dark:bg-[#2C2C2C] flex items-center justify-center font-bold text-xs shadow-sm active:scale-95 text-gray-800 dark:text-white"
                                >
                                  +
                                </button>
                                <span className="text-[11px] text-gray-400 dark:text-gray-500 px-1">
                                  صفحة يومياً
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 bg-gray-50 dark:bg-white/5 rounded-2xl border border-dashed border-gray-250 dark:border-white/10">
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        لا توجد مسارات مراجعة إضافية مفعّلة حالياً. اضغط على الزر أعلاه لإضافة مسار يبدأ من موضع آخر.
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-bold block dark:text-white">
                    خيارات إضافية
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 p-3 rounded-2xl border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5 cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                      <input
                        type="checkbox"
                        checked={includeFixation}
                        onChange={(e) => setIncludeFixation(e.target.checked)}
                        className="w-5 h-5 rounded border-gray-300 text-[#1A2E1A] dark:text-[#D4AF37] focus:ring-[#D4AF37]"
                      />
                      <span className="text-sm font-bold dark:text-white">
                        تضمين التثبيت والمراجعة العميقة
                      </span>
                    </label>
                    <label className="flex items-center gap-3 p-3 rounded-2xl border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5 cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                      <input
                        type="checkbox"
                        checked={includeRecitation}
                        onChange={(e) => setIncludeRecitation(e.target.checked)}
                        className="w-5 h-5 rounded border-gray-300 text-[#1A2E1A] dark:text-[#D4AF37] focus:ring-[#D4AF37]"
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-bold dark:text-white">
                          مهمة تسميع التثبيت
                        </span>
                        <span className="text-[10px] text-gray-500">
                          إضافة مهمة لتسميع ما تم إنجازه
                        </span>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 p-3 rounded-2xl border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5 cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                      <input
                        type="checkbox"
                        checked={includeListening}
                        onChange={(e) => setIncludeListening(e.target.checked)}
                        className="w-5 h-5 rounded border-gray-300 text-[#1A2E1A] dark:text-[#D4AF37] focus:ring-[#D4AF37]"
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-bold dark:text-white">
                          مهمة استماع التثبيت
                        </span>
                        <span className="text-[10px] text-gray-500">
                          إضافة مهمة استماع لمقدار التثبيت والمراجعة العميقة
                          (اختياري)
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                {includeFixation && (
                  <>
                    <div className="space-y-3">
                      <label className="text-sm font-bold block dark:text-white">
                        مقدار التثبيت والمراجعة العميقة (يومياً)
                      </label>
                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                        {[
                          { id: "juz", label: "جزء" },
                          { id: "hizb", label: "حزب" },
                          { id: "half_hizb", label: "نصف حزب" },
                          { id: "quarter_hizb", label: "ربع حزب" },
                          { id: "two_pages", label: "صفحتين" },
                          { id: "page", label: "صفحة واحدة" },
                        ].map((option) => (
                          <button
                            key={option.id}
                            onClick={() => setFixationAmountType(option.id)}
                            className={`py-3 px-2 rounded-xl text-xs font-bold transition-all border-2 ${
                              fixationAmountType === option.id
                                ? "border-[#D4AF37] bg-[#D4AF37]/5 text-[#1A2E1A] dark:text-[#D4AF37]"
                                : "border-transparent bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400"
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* نطاق المراجعة العميقة والتثبيت */}
                    <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-bold text-[#1A2E1A] dark:text-[#D4AF37]">
                            نطاق المراجعة العميقة والتثبيت
                          </h3>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 font-rtl">
                            اختر نطاقاً مخصصاً للمراجعة العميقة أو اتركه
                            تلقائياً يتبع نطاق المراجعة الرئيسي
                          </p>
                        </div>
                        <div className="flex bg-gray-200/50 dark:bg-black/20 p-1 rounded-xl shrink-0 self-start sm:self-auto gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setFixationRangeMode("full");
                              setIsSpecificFixation(false);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              fixationRangeMode === "full"
                                ? "bg-white dark:bg-[#2C2C2C] text-[#1A2E1A] dark:text-[#D4AF37] shadow-sm"
                                : "text-gray-400"
                            }`}
                          >
                            تلقائي (مع المراجعة)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setFixationRangeMode("specific");
                              setIsSpecificFixation(true);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              fixationRangeMode === "specific"
                                ? "bg-white dark:bg-[#2C2C2C] text-[#1A2E1A] dark:text-[#D4AF37] shadow-sm"
                                : "text-gray-400"
                            }`}
                          >
                            أجزاء وسور
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setFixationRangeMode("custom_pages");
                              setIsSpecificFixation(true);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              fixationRangeMode === "custom_pages"
                                ? "bg-white dark:bg-[#2C2C2C] text-[#1A2E1A] dark:text-[#D4AF37] shadow-sm"
                                : "text-gray-400"
                            }`}
                          >
                            نطاق صفحات
                          </button>
                        </div>
                      </div>

                      {isSpecificFixation && (
                        <div className="pt-2 space-y-4 border-t border-gray-200/50 dark:border-white/5">
                          {fixationRangeMode === "custom_pages" ? (
                            <div className="space-y-3">
                              <label className="text-xs font-bold text-gray-400 dark:text-gray-500 block">
                                حدد نطاق الصفحات المخصصة للمراجعة العميقة:
                              </label>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-gray-400 dark:text-gray-500">
                                    من صفحة
                                  </label>
                                  <input
                                    type="number"
                                    onFocus={(e) => e.target.select()}
                                    min={1}
                                    max={604}
                                    value={fixationStartPage}
                                    onChange={(e) => {
                                      const val = Math.min(
                                        604,
                                        Math.max(
                                          1,
                                          parseInt(e.target.value) || 1,
                                        ),
                                      );
                                      setFixationStartPage(val);
                                    }}
                                    className="w-full bg-white dark:bg-white/5 dark:text-white border border-gray-100 dark:border-white/5 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#D4AF37] transition-all"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-gray-400 dark:text-gray-500">
                                    إلى صفحة
                                  </label>
                                  <input
                                    type="number"
                                    onFocus={(e) => e.target.select()}
                                    min={1}
                                    max={604}
                                    value={fixationEndPage}
                                    onChange={(e) => {
                                      const val = Math.min(
                                        604,
                                        Math.max(
                                          1,
                                          parseInt(e.target.value) || 1,
                                        ),
                                      );
                                      setFixationEndPage(val);
                                    }}
                                    className="w-full bg-white dark:bg-white/5 dark:text-white border border-gray-100 dark:border-white/5 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#D4AF37] transition-all"
                                  />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <>
                              {/* Selector Tabs for fixation specific items */}
                              <div className="flex p-0.5 bg-gray-200/30 dark:bg-black/10 rounded-lg">
                                <button
                                  type="button"
                                  onClick={() => setSpecificFixationType("juz")}
                                  className={`flex-1 py-1 rounded-md text-xs font-bold transition-all ${
                                    specificFixationType === "juz"
                                      ? "bg-white dark:bg-[#2C2C2C] text-[#1A2E1A] dark:text-[#D4AF37] shadow-sm"
                                      : "text-gray-400"
                                  }`}
                                >
                                  المراجعة العميقة بالأجزاء
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSpecificFixationType("surah")
                                  }
                                  className={`flex-1 py-1 rounded-md text-xs font-bold transition-all ${
                                    specificFixationType === "surah"
                                      ? "bg-white dark:bg-[#2C2C2C] text-[#1A2E1A] dark:text-[#D4AF37] shadow-sm"
                                      : "text-gray-400"
                                  }`}
                                >
                                  المراجعة العميقة بالسور
                                </button>
                              </div>

                              {/* Selection Widgets */}
                              {specificFixationType === "juz" ? (
                                <div className="space-y-2">
                                  <label className="text-[10px] text-gray-400 dark:text-gray-500 font-bold block">
                                    اضغط لتحديد الأجزاء المخصصة للمراجعة
                                    العميقة:
                                  </label>
                                  <div className="grid grid-cols-6 gap-1.5 font-mono">
                                    {Array.from(
                                      { length: 30 },
                                      (_, i) => i + 1,
                                    ).map((n) => {
                                      const isSelected =
                                        selectedFixationJuzs.includes(n);
                                      return (
                                        <button
                                          key={n}
                                          type="button"
                                          onClick={() => toggleFixationJuz(n)}
                                          className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                                            isSelected
                                              ? "bg-[#1A2E1A] dark:bg-[#D4AF37] text-white dark:text-[#1A1A1A] shadow-sm"
                                              : "bg-white dark:bg-white/5 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
                                          }`}
                                        >
                                          {n}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  <div className="relative">
                                    <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                    <input
                                      type="text"
                                      placeholder="ابحث عن سورة لتثبيتها..."
                                      value={fixationSurahSearch}
                                      onChange={(e) =>
                                        setFixationSurahSearch(e.target.value)
                                      }
                                      className="w-full pl-3 pr-8 py-1.5 rounded-lg bg-white dark:bg-white/5 text-xs border border-gray-100 dark:border-white/5 focus:outline-none focus:border-[#D4AF37]"
                                    />
                                  </div>
                                  <div className="grid grid-cols-3 gap-1.5 max-h-36 overflow-y-auto custom-scrollbar p-1">
                                    {SURAH_METADATAList.filter((s) =>
                                      s.name.includes(fixationSurahSearch),
                                    ).map((s) => {
                                      const isSelected =
                                        selectedFixationSurahs.includes(s.name);
                                      return (
                                        <button
                                          key={s.name}
                                          type="button"
                                          onClick={() =>
                                            toggleFixationSurah(s.name)
                                          }
                                          className={`py-1 text-[11px] font-bold rounded-lg transition-all text-center border truncate ${
                                            isSelected
                                              ? "bg-[#1A2E1A] border-[#1A2E1A] text-white dark:bg-[#D4AF37] dark:border-[#D4AF37] dark:text-[#1A1A1A]"
                                              : "bg-white dark:bg-white/5 border-gray-50 dark:border-white/5 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10"
                                          }`}
                                        >
                                          {s.name}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </>
                          )}

                          {/* Specific Fixation Pages stats */}
                          {getCombinedFixationPages().length > 0 ? (
                            <div className="bg-[#D4AF37]/10 dark:bg-[#D4AF37]/5 p-3 rounded-xl border border-[#D4AF37]/20 text-xs text-amber-800 dark:text-amber-300 flex justify-between font-bold">
                              <span>
                                إجمالي صفحات المراجعة العميقة المحددة:
                              </span>
                              <span>
                                {getCombinedFixationPages().length} صفحة (
                                {(
                                  getCombinedFixationPages().length / 20
                                ).toFixed(1)}{" "}
                                جزء)
                              </span>
                            </div>
                          ) : (
                            <p className="text-[10px] text-amber-500 dark:text-amber-400 text-center font-bold">
                              يرجى تحديد جزء أو سورة واحدة على الأقل أو نطاق
                              صفحات!
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-bold block dark:text-white">
                        عدد مرات التكرار للتثبيت
                      </label>
                      <div className="flex items-center justify-center gap-4 bg-gray-50 dark:bg-white/5 py-3 rounded-2xl">
                        <button
                          type="button"
                          onClick={() =>
                            setFixationRepetitions(
                              Math.max(1, fixationRepetitions - 1),
                            )
                          }
                          className="w-10 h-10 rounded-full bg-white dark:bg-[#2C2C2C] shadow flex items-center justify-center text-[#1A2E1A] dark:text-white active:scale-95"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={fixationRepetitions}
                          onChange={(e) =>
                            setFixationRepetitions(
                              Math.max(1, parseInt(e.target.value) || 1),
                            )
                          }
                          onFocus={(e) => e.target.select()}
                          className="text-xl font-bold dark:text-white w-14 text-center bg-transparent border-none p-0 focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setFixationRepetitions(fixationRepetitions + 1)
                          }
                          className="w-10 h-10 rounded-full bg-white dark:bg-[#2C2C2C] shadow flex items-center justify-center text-[#1A2E1A] dark:text-white active:scale-95"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-bold block dark:text-white">
                        آلية التكرار لصفحات التثبيت
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            setFixationRepetitionMode("entire_portion")
                          }
                          className={`p-4 rounded-xl text-right flex flex-col gap-1.5 transition-all border-2 ${
                            fixationRepetitionMode === "entire_portion"
                              ? "border-[#D4AF37] bg-[#D4AF37]/5 text-[#1A2E1A] dark:text-[#D4AF37]"
                              : "border-transparent bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400"
                          }`}
                        >
                          <span className="text-sm font-bold">
                            تكرار المقدار كاملاً
                          </span>
                          <span className="text-[10px] text-gray-500 dark:text-gray-400 font-normal leading-relaxed">
                            تثبيت {getFixationLabel(fixationAmountType)} كاملاً{" "}
                            {fixationRepetitions} مرات متتالية.
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setFixationRepetitionMode("page_by_page")
                          }
                          className={`p-4 rounded-xl text-right flex flex-col gap-1.5 transition-all border-2 ${
                            fixationRepetitionMode === "page_by_page"
                              ? "border-[#D4AF37] bg-[#D4AF37]/5 text-[#1A2E1A] dark:text-[#D4AF37]"
                              : "border-transparent bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400"
                          }`}
                        >
                          <span className="text-sm font-bold">
                            تكرار كل صفحة على حدة
                          </span>
                          <span className="text-[10px] text-gray-500 dark:text-gray-400 font-normal leading-relaxed">
                            تثبيت كل صفحة على حدة {fixationRepetitions} مرات
                            للحصول على الحفظ التام لكل صفحة.
                          </span>
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* Info Box (Collapsible) */}
                <div className="bg-[#D4AF37]/5 dark:bg-[#D4AF37]/10 rounded-2xl border border-[#D4AF37]/10 dark:border-[#D4AF37]/20 overflow-hidden transition-all duration-300">
                  <button
                    type="button"
                    onClick={() => setShowReviewInfo(!showReviewInfo)}
                    className="w-full p-3.5 flex items-center justify-between hover:bg-[#D4AF37]/10 text-[#A5882B] dark:text-[#D4AF37] font-bold text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <Info className="w-4 h-4 text-[#D4AF37] shrink-0" />
                      <span>توضيح تفاصيل خطة المراجعة والتثبيت</span>
                    </div>
                    {showReviewInfo ? (
                      <ChevronUp className="w-4 h-4 text-[#D4AF37]" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[#D4AF37]" />
                    )}
                  </button>
                  
                  <AnimatePresence initial={false}>
                    {showReviewInfo && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-[#D4AF37]/10 dark:border-[#D4AF37]/20"
                      >
                        <div className="p-4 text-[11px] text-[#A5882B] dark:text-[#D4AF37] leading-relaxed text-right w-full">
                          في خطة المراجعة ستكون المهام يومية بدون انقطاع، ستقوم بقراءة
                          أجزاء المراجعة المحددة، ثم تقوم بتكرار مقدار التثبيت حسب
                          العدد المختار. تنتهي الخطة بختم القرآن كاملاً في التثبيت.
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </>
        )}

        {/* الخطوة الخامسة: تاريخ البدء وضبط المواعيد */}
        <div className="bg-white dark:bg-sky-950/10 p-5 sm:p-6 rounded-[24px] border border-sky-500/20 border-r-4 border-r-sky-500 shadow-sm space-y-4 transition-colors">
          <div className="flex items-center gap-3 border-b border-sky-500/10 pb-3">
            <span className="w-8 h-8 rounded-full bg-sky-500 text-white flex items-center justify-center font-bold text-sm">
              {mainPlanType === "memorization" ? "٥" : "٣"}
            </span>
            <h3 className="font-extrabold text-[#1A2E1A] dark:text-sky-400 text-base">
              تاريخ وخيارات انطلاق الخطة
            </h3>
          </div>

          {/* First Day of the Week */}
          <div className="space-y-3">
            <label className="text-sm font-bold block dark:text-white">
              اليوم الأول في الأسبوع
            </label>
            <div className="relative">
              <select
                value={firstDayOfWeek}
                onChange={(e) => setFirstDayOfWeek(Number(e.target.value))}
                className="w-full py-2.5 px-3.5 bg-gray-50 dark:bg-[#1A1A1A] border border-[#1A2E1A]/15 dark:border-white/10 rounded-xl text-xs font-extrabold text-[#1A2E1A] dark:text-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/50 hover:border-amber-500/40 outline-none transition-all shadow-sm"
              >
                <option value={0}>الأحد</option>
                <option value={1}>الإثنين</option>
                <option value={2}>الثلاثاء</option>
                <option value={3}>الأربعاء</option>
                <option value={4}>الخميس</option>
                <option value={5}>الجمعة</option>
                <option value={6}>السبت</option>
              </select>
            </div>
          </div>

          {/* Start Date */}
          <div className="space-y-3">
            <label className="text-sm font-bold block dark:text-white">
              تاريخ بداية الخطة
            </label>
            <div className="relative">
              <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500 pointer-events-none" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={`w-full bg-gray-50 dark:bg-white/5 dark:text-white border-none rounded-2xl pr-4 pl-12 py-4 text-sm focus:ring-2 transition-all ${
                  isDateValid
                    ? "focus:ring-[#D4AF37]"
                    : "focus:ring-red-500 ring-2 ring-red-500/50"
                }`}
              />
            </div>
            {!isDateValid && (
              <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-2xl border border-red-100 dark:border-red-950/30 text-xs text-red-600 dark:text-red-400 space-y-2">
                <p className="font-bold">
                  تنبيه: يجب أن تبدأ الخطة في أول يوم من الأسبوع (
                  {DAYS_AR[firstDayOfWeek]})!
                </p>
                <p>
                  التاريخ المحدد يوافق يوم ({DAYS_AR[dateDayOfWeek]}). خطة الحفظ
                  لا يمكن أن تبدأ من وسط الأسبوع.
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setStartDate(
                      getNearestMatchingDate(startDate, firstDayOfWeek),
                    )
                  }
                  className="text-xs text-[#D4AF37] hover:underline font-bold mt-1 inline-flex items-center gap-1 active:scale-95 transition-transform"
                >
                  ✦ اضبط التاريخ تلقائياً إلى أقرب يوم {DAYS_AR[firstDayOfWeek]}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ملخص الخطة وهيكليتها */}
        <div className="bg-[#1A2E1A]/5 dark:bg-[#D4AF37]/5 p-5 sm:p-6 rounded-[24px] border border-[#1A2E1A]/10 dark:border-[#D4AF37]/15 space-y-4">
          <button
            type="button"
            onClick={() => setShowPlanSummary(!showPlanSummary)}
            className="w-full flex items-center justify-between gap-2 border-b border-[#1A2E1A]/10 dark:border-[#D4AF37]/10 pb-3 hover:opacity-80 transition-opacity cursor-pointer text-right"
          >
            <div className="flex items-center gap-2">
              <BookOpen
                className="w-5 h-5 text-[#1A2E1A] dark:text-[#D4AF37]"
                strokeWidth={2.5}
              />
              <h3 className="text-sm font-extrabold text-[#1A2E1A] dark:text-[#D4AF37]">
                📋 ملخص وهيكلية خطتك المخصصة
              </h3>
            </div>
            {showPlanSummary ? (
              <ChevronUp className="w-5 h-5 text-gray-500 dark:text-gray-400 shrink-0" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400 shrink-0" />
            )}
          </button>

          <AnimatePresence initial={false}>
            {showPlanSummary && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="overflow-hidden space-y-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-xs pt-1">
                  <div className="flex justify-between py-1.5 border-b border-gray-150/50 dark:border-white/5">
                    <span className="text-gray-500 dark:text-gray-400 font-medium">
                      نوع الخطة المختار:
                    </span>
                    <span className="font-bold text-[#1A2E1A] dark:text-white">
                      {getPlanTypeLabel()}
                    </span>
                  </div>

                  {mainPlanType === "memorization" && (
                    <>
                      <div className="flex justify-between py-1.5 border-b border-gray-150/50 dark:border-white/5">
                        <span className="text-gray-500 dark:text-gray-400 font-medium">
                          المقرر للحفظ الجديد:
                        </span>
                        <span
                          className="font-bold text-[#1A2E1A] dark:text-white"
                          dir="rtl"
                        >
                          {getNewMemorizationSummary()}
                        </span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-gray-150/50 dark:border-white/5">
                        <span className="text-gray-500 dark:text-gray-400 font-medium">
                          مقدار الحفظ اليومي:
                        </span>
                        <span className="font-bold text-[#1A2E1A] dark:text-white">
                          {dailyAmountLabels[dailyAmount] || dailyAmount}
                        </span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-gray-150/50 dark:border-white/5">
                        <span className="text-gray-500 dark:text-gray-400 font-medium font-rtl">
                          المحفوظ القديم المراجع:
                        </span>
                        <span
                          className="font-bold text-[#1A2E1A] dark:text-white text-left max-w-[200px] truncate"
                          title={getOldMemorizationSummary()}
                        >
                          {hasOldMemorization && oldPagesCount > 0
                            ? `${oldPagesCount} صفحة`
                            : "لا يوجد"}
                        </span>
                      </div>
                    </>
                  )}

                  {mainPlanType === "review" && (
                    <div className="flex justify-between py-1.5 border-b border-gray-150/50 dark:border-white/5">
                      <span className="text-gray-500 dark:text-gray-400 font-medium">
                        محفوظ المراجعة المختار:
                      </span>
                      <span className="font-bold text-[#1A2E1A] dark:text-white">
                        {reviewRangeMode === "full"
                          ? "القرآن الكريم كاملاً"
                          : `${getCombinedReviewPages().length} صفحة`}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between py-1.5 border-b border-gray-150/50 dark:border-white/5">
                    <span className="text-gray-500 dark:text-gray-400 font-medium">
                      اليوم الأول من الأسبوع:
                    </span>
                    <span className="font-bold text-[#1A2E1A] dark:text-white">
                      {DAYS_AR[firstDayOfWeek]}
                    </span>
                  </div>

                  <div className="flex justify-between py-1.5 border-b border-gray-150/50 dark:border-white/5">
                    <span className="text-gray-500 dark:text-gray-400 font-medium">
                      تاريخ البدء:
                    </span>
                    <span
                      className="font-bold text-[#1A2E1A] dark:text-white"
                      dir="ltr"
                    >
                      {startDate}
                    </span>
                  </div>

                  <div className="flex justify-between py-1.5 border-b border-gray-150/50 dark:border-white/5 sm:col-span-2">
                    <span className="text-gray-500 dark:text-gray-400 font-medium">
                      مدة الخطة المتوقعة:
                    </span>
                    <span className="font-bold text-amber-600 dark:text-[#D4AF37]">
                      {getExpectedDuration()}
                    </span>
                  </div>
                </div>

                <div className="bg-[#1A2E1A]/5 dark:bg-white/5 p-3.5 rounded-xl border border-[#1A2E1A]/5 dark:border-white/10 space-y-1.5">
                  <span className="text-[11px] font-extrabold text-[#1A2E1A] dark:text-[#D4AF37] block">
                    💡 آلية سير وتطبيق الخطة:
                  </span>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
                    {getPlanMechanismExplanation()}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {!isSelectionValid && (
          <div className="p-4 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 text-xs rounded-2xl border border-amber-100 dark:border-amber-900/30 text-right leading-relaxed font-rtl">
            ⚠️ يرجى تحديد {juzPlanStartMode === "juz" ? "جزء واحد" : "سورة واحدة"} على الأقل للحفظ قبل حفظ الخطة والبدء.
          </div>
        )}

        {saveError && !showConfirmModal && (
          <div className="p-4 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-xs rounded-2xl border border-red-100 dark:border-red-900/30 text-right leading-relaxed font-rtl">
            ⚠️ {saveError}
          </div>
        )}

        <button
          onClick={() => {
            if (canProceed) {
              setSaveError(null);
              setShowConfirmModal(true);
            }
          }}
          disabled={!canProceed}
          className={`w-full py-5 rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2 transition-all ${
            canProceed
              ? "bg-[#1A2E1A] dark:bg-[#D4AF37] text-white dark:text-[#1A1A1A] hover:scale-[1.01] active:scale-95 shadow-[#1A2E1A]/20 dark:shadow-[#D4AF37]/10 cursor-pointer"
              : "bg-gray-200 dark:bg-white/5 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-60"
          }`}
        >
          <Save className="w-5 h-5" />
          <span>
            {isEditMode ? "حفظ التعديلات والاستمرار" : "حفظ الخطة والبدء"}
          </span>
        </button>

        {/* نافذة تأكيد الخطة المنبثقة */}
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#1E1E1E] w-full max-w-xs p-5 rounded-[24px] border border-[#1A2E1A]/10 dark:border-white/10 shadow-2xl space-y-4 text-center">
              <div className="space-y-1">
                <h3 className="text-sm font-extrabold text-[#1A2E1A] dark:text-white flex items-center justify-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-[#D4AF37]" />
                  <span>تأكيد تفعيل الخطة</span>
                </h3>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">
                  هل أنت مستعد لبدء خطتك الجديدة الممتدة لـ <span className="font-bold text-amber-600 dark:text-[#D4AF37]">{getExpectedDuration()}</span>؟
                </p>
              </div>

              {saveError && (
                <div className="p-2.5 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-[10px] rounded-xl border border-red-100 dark:border-red-900/30 text-right leading-relaxed font-rtl">
                  ⚠️ {saveError}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className={`flex-1 py-2.5 font-bold rounded-xl transition-all text-center text-xs ${
                    isSaving
                      ? "bg-gray-200 dark:bg-white/5 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-50"
                      : "bg-[#1A2E1A] dark:bg-[#D4AF37] text-white dark:text-[#1A1A1A] cursor-pointer hover:scale-[1.01] active:scale-95"
                  }`}
                >
                  {isSaving ? "جاري البدء..." : "نعم، ابدأ الآن"}
                </button>
                <button
                  type="button"
                  onClick={() => !isSaving && setShowConfirmModal(false)}
                  disabled={isSaving}
                  className={`flex-1 py-2.5 font-bold rounded-xl transition-all text-center text-xs ${
                    isSaving
                      ? "bg-gray-100/50 dark:bg-white/5 text-gray-400 dark:text-gray-600 cursor-not-allowed"
                      : "bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 cursor-pointer hover:bg-gray-200 dark:hover:bg-white/10 active:scale-95"
                  }`}
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
