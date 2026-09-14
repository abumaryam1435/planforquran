
export type JuzNumber = number;

export enum DailyAmount {
  QUARTER_PAGE = 'quarter_page',
  HALF_PAGE = 'half_page',
  ONE_PAGE = 'one_page',
  TWO_PAGES = 'two_pages',
  QUARTER_HIZB = 'quarter_hizb',
  THREE_PAGES = 'three_pages',
  FOUR_PAGES = 'four_pages',
  FIVE_PAGES = 'five_pages'
}

export enum TaskType {
  MEMORIZATION = 'memorization',
  FIXATION = 'fixation',
  REVIEW = 'review',
  RECITATION = 'recitation',
  LISTENING = 'listening',
  CUMULATIVE_REVIEW = 'cumulative_review',
  DHIKR = 'dhikr',
  OTHER = 'other'
}

export interface Task {
  id: string;
  title: string;
  type: TaskType;
  completed: boolean;
  targetCount: number;
  currentCount: number;
  pages?: number[]; // [22, 23]
  verseRanges?: { surah: string; start: number; end: number }[];
  dhikr?: string;
  selectedVerses?: { surah: number; ayah: number }[];
  trackIndex?: number;
}

export interface DayPlan {
  date: string; // ISO format
  tasks: Task[];
  isCompleted: boolean;
}

export type PlanType = 'memorization' | 'review' | 'juz' | 'flexible' | 'seven_castles';

export interface FlexibleDayConfig {
  hasMemorization: boolean;
  hasFixation: boolean;
  hasReview: boolean;
  hasCumulativeReview: boolean;
  hasOldMemorizationReview: boolean;
}

export interface ReviewTrack {
  id: string;
  reviewRangeMode: 'full' | 'specific' | 'custom_pages';
  reviewStartPage?: number;
  reviewEndPage?: number;
  selectedReviewJuzs?: number[];
  selectedReviewSurahs?: string[];
  reviewPages?: number[];
  reviewAmountType: 'juz' | 'pages';
  reviewJuzAmount?: number;
  reviewPageAmount?: number;
  startJuz?: number;
  specificReviewType?: 'juz' | 'surah';
}

export interface QuranPlan {
  id?: number;
  name?: string;
  juzNumber?: JuzNumber;
  startPage: number;
  endPage: number;
  dailyAmount: DailyAmount;
  startDate: string;
  status: 'active' | 'paused' | 'completed';
  createdAt: string;
  updatedAt: string;
  planType?: PlanType;
  reviewJuzAmount?: number;
  reviewAmountType?: 'juz' | 'pages';
  reviewPageAmount?: number;
  fixationAmountType?: string; // 'juz', 'hizb', 'half_hizb', 'quarter_hizb', 'two_pages', 'one_page'
  fixationRepetitions?: number;
  dailyFixationRepetitions?: number;
  weeklyReviewRepetitions?: number;
  cumulativeReviewRepetitions?: number;
  includeFixation?: boolean;
  includeRecitation?: boolean;
  includeListening?: boolean;
  fixationRepetitionMode?: 'entire_portion' | 'page_by_page'; // 'entire_portion' (default) or 'page_by_page'
  firstDayOfWeek?: number; // 0 for Sunday, 1 for Monday, etc.
  oldMemorizedPages?: number[];
  hasOldMemorization?: boolean;
  oldMemType?: "range" | "juz" | "surah";
  oldMemorizationRanges?: { start: number; end: number }[];
  oldMemSurahs?: string[];
  oldMemorizationReviewMode?: 'auto' | 'custom_days' | 'custom_amount';
  oldMemorizationCustomDays?: number;
  oldMemorizationCustomAmountType?: 'pages' | 'quarter_hizb' | 'juz';
  oldMemorizationCustomAmountValue?: number;
  isSevenCastles?: boolean;
  isSevenCastlesDescending?: boolean;
  sevenCastlesStartMode?: 'juz' | 'page';
  isFlexible?: boolean;
  addAdhkar?: boolean;
  adhkarList?: { dhikr: string; count: number }[];
  flexibleDayConfigs?: Record<number, FlexibleDayConfig>; // 0 to 6
  flexibleDurationMode?: 'unlimited' | 'weeks' | 'range';
  flexibleDurationWeeks?: number;
  flexibleEndDate?: string;
  flexibleStartMode?: 'juz' | 'page' | 'surah';
  juzPlanStartMode?: 'juz' | 'page' | 'surah';
  selectedJuzSurahs?: string[];
  selectedJuzsToMemorize?: number[];
  memorizationTargetPages?: number[];
  isSpecificReview?: boolean;
  selectedReviewJuzs?: number[];
  selectedReviewSurahs?: string[];
  reviewPages?: number[];
  reviewRangeMode?: 'full' | 'specific' | 'custom_pages';
  reviewStartPage?: number;
  reviewEndPage?: number;
  isSpecificFixation?: boolean;
  fixationRangeMode?: 'full' | 'specific' | 'custom_pages';
  fixationStartPage?: number;
  fixationEndPage?: number;
  selectedFixationJuzs?: number[];
  selectedFixationSurahs?: string[];
  fixationPages?: number[];
  reviewTracks?: ReviewTrack[];
  startJuz?: number;
}

export interface ProgressLog {
  id?: number;
  planId: number;
  date: string;
  tasks: Task[];
  note?: string;
}

export interface Achievement {
  id?: number;
  title: string;
  description: string;
  icon: string;
  dateEarned: string;
  type: 'juz_completed' | 'streak_7' | 'streak_30' | 'pages_50' | 'pages_100';
}
