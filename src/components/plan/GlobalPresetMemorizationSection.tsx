import React from "react";
import { DailyAmount } from "../../types";
import {
  GLOBAL_MEMORIZATION_PRESETS,
  GlobalMemorizationPresetInfo,
} from "../../data/globalMemorizationPresets";
import { SURAH_METADATAList } from "../../utils/quranPageMapping";
import {
  Sparkles,
  BookOpen,
  Award,
  Star,
  Layers,
  Sliders,
  CheckCircle2,
  Trash2,
  Plus,
  Repeat,
  Compass,
} from "lucide-react";

interface GlobalPresetMemorizationSectionProps {
  selectedGlobalPresetId: string;
  onSelectGlobalPreset: (preset: GlobalMemorizationPresetInfo) => void;
  globalPresetCategory: string;
  setGlobalPresetCategory: (category: string) => void;
  globalPresetStartMode: "from_beginning" | "descending_juz30" | "custom_pages";
  setGlobalPresetStartMode: (
    mode: "from_beginning" | "descending_juz30" | "custom_pages",
  ) => void;
  startPage: number;
  setStartPage: (p: number) => void;
  endPage: number;
  setEndPage: (p: number) => void;
  isSevenCastlesDescending: boolean;
  setIsSevenCastlesDescending: (desc: boolean) => void;
  dailyAmount: DailyAmount;
  setDailyAmount: (a: DailyAmount) => void;
  fixationRepetitions: number;
  setFixationRepetitions: (r: number) => void;
  hasOldMemorization: boolean;
  setHasOldMemorization: (has: boolean) => void;
  oldMemType: "range" | "juz" | "surah";
  setOldMemType: (t: "range" | "juz" | "surah") => void;
  selectedOldJuzs: number[];
  toggleOldJuz: (j: number) => void;
  oldMemorizationRanges: { start: number; end: number }[];
  updateRange: (index: number, field: "start" | "end", value: number) => void;
  removeRange: (index: number) => void;
  addRange: () => void;
  selectedOldSurahs: string[];
  toggleOldSurah: (s: string) => void;
}

export const GlobalPresetMemorizationSection: React.FC<
  GlobalPresetMemorizationSectionProps
> = ({
  selectedGlobalPresetId,
  onSelectGlobalPreset,
  globalPresetCategory,
  setGlobalPresetCategory,
  globalPresetStartMode,
  setGlobalPresetStartMode,
  startPage,
  setStartPage,
  endPage,
  setEndPage,
  isSevenCastlesDescending,
  setIsSevenCastlesDescending,
  dailyAmount,
  setDailyAmount,
  fixationRepetitions,
  setFixationRepetitions,
  hasOldMemorization,
  setHasOldMemorization,
  oldMemType,
  setOldMemType,
  selectedOldJuzs,
  toggleOldJuz,
  oldMemorizationRanges,
  updateRange,
  removeRange,
  addRange,
  selectedOldSurahs,
  toggleOldSurah,
}) => {
  const activePreset =
    GLOBAL_MEMORIZATION_PRESETS.find((p) => p.id === selectedGlobalPresetId) ||
    GLOBAL_MEMORIZATION_PRESETS[0];

  return (
    <div className="space-y-6 pt-2">
      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-150 dark:border-white/5">
        <button
          type="button"
          onClick={() => setGlobalPresetCategory("all")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            globalPresetCategory === "all"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
          }`}
        >
          جميع الخطط المعتمدة ({GLOBAL_MEMORIZATION_PRESETS.length})
        </button>
        <button
          type="button"
          onClick={() => setGlobalPresetCategory("popular")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            globalPresetCategory === "popular"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>الأكثر انتشاراً ونجاحاً (٢)</span>
        </button>
        <button
          type="button"
          onClick={() => setGlobalPresetCategory("haramein_associations")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            globalPresetCategory === "haramein_associations"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>مناهج الحرمين والجمعيات (٢)</span>
        </button>
        <button
          type="button"
          onClick={() => setGlobalPresetCategory("traditional_mahadir")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            globalPresetCategory === "traditional_mahadir"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>المناهج التراثية العريقة (٢)</span>
        </button>
        <button
          type="button"
          onClick={() => setGlobalPresetCategory("intensive")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            globalPresetCategory === "intensive"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
          }`}
        >
          <Star className="w-3.5 h-3.5" />
          <span>الخطط المكثفة (١)</span>
        </button>
      </div>

      {/* Preset Cards Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-extrabold text-[#1A2E1A] dark:text-[#D4AF37] block">
            اختر أحد مناهج الحفظ العالمية المعتمدة:
          </label>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
            انقر على أي بطاقة لاختيار المنهج وضبط تفاصيله
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {GLOBAL_MEMORIZATION_PRESETS.filter(
            (p) => globalPresetCategory === "all" || p.category === globalPresetCategory,
          ).map((preset) => {
            const isSelected = selectedGlobalPresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onSelectGlobalPreset(preset)}
                className={`p-4 rounded-2xl border-2 text-right transition-all relative flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? "border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/25 shadow-md ring-2 ring-emerald-500/20"
                    : "border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:border-emerald-300 dark:hover:border-emerald-700/50"
                }`}
              >
                {isSelected && (
                  <span className="absolute top-3 left-3 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                    ✓
                  </span>
                )}
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center gap-1.5 pr-0.5">
                    <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-800 dark:text-amber-300">
                      {preset.tag}
                    </span>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-emerald-600/15 text-emerald-800 dark:text-emerald-300">
                      {preset.badge}
                    </span>
                  </div>
                  <h4 className="text-sm font-black text-[#1A2E1A] dark:text-white leading-snug">
                    {preset.title}
                  </h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                    {preset.shortDesc}
                  </p>

                  {/* 4 Pillars Summary Grid */}
                  <div className="pt-2.5 border-t border-gray-100 dark:border-white/5 grid grid-cols-2 gap-1.5 text-[10px]">
                    <div className="p-1.5 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-500/10">
                      <span className="font-extrabold text-emerald-800 dark:text-emerald-300 block">
                        📖 الحفظ الجديد:
                      </span>
                      <span className="text-gray-600 dark:text-gray-300">
                        {preset.dailyPaceText}
                      </span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-amber-50/80 dark:bg-amber-950/30 border border-amber-500/10">
                      <span className="font-extrabold text-amber-800 dark:text-amber-300 block">
                        🔁 التثبيت:
                      </span>
                      <span className="text-gray-600 dark:text-gray-300">
                        {preset.defaultFixationReps} تكراراً
                      </span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-blue-50/80 dark:bg-blue-950/30 border border-blue-500/10">
                      <span className="font-extrabold text-blue-800 dark:text-blue-300 block">
                        🔄 مراجعة القريب:
                      </span>
                      <span className="text-gray-600 dark:text-gray-300">
                        {preset.nearReviewText}
                      </span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-purple-50/80 dark:bg-purple-950/30 border border-purple-500/10">
                      <span className="font-extrabold text-purple-800 dark:text-purple-300 block">
                        🌐 مراجعة البعيد:
                      </span>
                      <span className="text-gray-600 dark:text-gray-300">
                        {preset.distantReviewText}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Preset Deep Dive Presentation */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/5 via-amber-500/5 to-teal-500/5 border-2 border-emerald-500/30 dark:border-emerald-500/20 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-500/10 pb-3">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-600 text-white">
              {activePreset.tag}
            </span>
            <h3 className="text-base font-black text-[#1A2E1A] dark:text-white pt-1">
              {activePreset.title}
            </h3>
          </div>
          <span className="text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-500/10 px-3 py-1 rounded-xl w-fit">
            {activePreset.badge}
          </span>
        </div>

        <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
          {activePreset.fullDesc}
        </p>

        {/* 4 Pillars Presentation Box */}
        <div className="space-y-2">
          <h4 className="text-xs font-black text-[#1A2E1A] dark:text-emerald-400 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-emerald-600" />
            <span>المهام اليومية الأربعة المعتمدة في هذا المنهج:</span>
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {/* Pillar 1: New Memorization */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-black/20 border border-emerald-500/20 space-y-1 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">
                  ١
                </span>
                <h5 className="text-xs font-black text-emerald-800 dark:text-emerald-300">
                  مهمة الحفظ الجديد والاستماع
                </h5>
              </div>
              <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed pr-7">
                المقدار اليومي: <strong>{activePreset.dailyPaceText}</strong>. يبدأ بالاستماع المتقن للشيخ المقرئ، ثم الحفظ المتأني للآيات مع تدقيق المتشابهات.
              </p>
            </div>

            {/* Pillar 2: Fixation */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-black/20 border border-amber-500/20 space-y-1 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-black flex items-center justify-center text-[10px] font-bold">
                  ٢
                </span>
                <h5 className="text-xs font-black text-amber-800 dark:text-amber-300">
                  مهمة التثبيت والربط اليومي
                </h5>
              </div>
              <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed pr-7">
                <strong>{activePreset.fixationText}</strong>؛ لتأكيد ترسيخ الصفحة وتثبيتها في الذاكرة الدائمة كالفاتحة قبل الانتقال لليوم التالي.
              </p>
            </div>

            {/* Pillar 3: Near Review */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-black/20 border border-blue-500/20 space-y-1 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                  ٣
                </span>
                <h5 className="text-xs font-black text-blue-800 dark:text-blue-300">
                  مهمة مراجعة القريب (الربط الحديث)
                </h5>
              </div>
              <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed pr-7">
                <strong>{activePreset.nearReviewText}</strong>؛ السياج الحامي الذي يمنع تفلت الحفظ الجديد ويصقله تماماً قبل أن يغادر نطاق القريب.
              </p>
            </div>

            {/* Pillar 4: Distant Review */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-black/20 border border-purple-500/20 space-y-1 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px] font-bold">
                  ٤
                </span>
                <h5 className="text-xs font-black text-purple-800 dark:text-purple-300">
                  مهمة مراجعة البعيد (المحفوظ القديم)
                </h5>
              </div>
              <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed pr-7">
                <strong>{activePreset.distantReviewText}</strong>؛ تدوير دوري مستمر لجميع الأجزاء القديمة والسابقة لتبقى حاضرة على اللسان كالفاتحة.
              </p>
            </div>
          </div>
        </div>

        {/* Methodology Tip */}
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2 text-[11px] text-amber-900 dark:text-amber-300">
          <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong>السر المنهجي للخطة:</strong> {activePreset.methodologyTip}
          </div>
        </div>
      </div>

      {/* Plan Customization Controls */}
      <div className="p-5 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-150 dark:border-white/5 space-y-5">
        <h4 className="text-xs font-black text-[#1A2E1A] dark:text-white flex items-center gap-1.5">
          <Sliders className="w-4 h-4 text-emerald-600" />
          <span>تخصيص نطاق الحفظ والمقدار اليومي والمحفوظ السابق:</span>
        </h4>

        {/* 1. Start Mode Options */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block">
            من أين تريد بدء الحفظ الجديد؟
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                setGlobalPresetStartMode("from_beginning");
                setStartPage(1);
                setEndPage(604);
                setIsSevenCastlesDescending(false);
              }}
              className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
                globalPresetStartMode === "from_beginning"
                  ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 font-bold shadow-sm ring-1 ring-emerald-500/30"
                  : "border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-white/5"
              }`}
            >
              <span className="text-xs block font-black">من بداية المصحف</span>
              <span className="text-[10px] text-gray-500 block">
                سورة البقرة (ص 1) ⬅️ سورة الناس (ص 604)
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setGlobalPresetStartMode("descending_juz30");
                setStartPage(604);
                setEndPage(1);
                setIsSevenCastlesDescending(true);
              }}
              className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
                globalPresetStartMode === "descending_juz30"
                  ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 font-bold shadow-sm ring-1 ring-emerald-500/30"
                  : "border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-white/5"
              }`}
            >
              <span className="text-xs block font-black">من جزء عمّ تنازلياً</span>
              <span className="text-[10px] text-gray-500 block">
                سورة الناس (ص 604) ⬅️ سورة البقرة (ص 1)
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setGlobalPresetStartMode("custom_pages");
              }}
              className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
                globalPresetStartMode === "custom_pages"
                  ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 font-bold shadow-sm ring-1 ring-emerald-500/30"
                  : "border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-white/5"
              }`}
            >
              <span className="text-xs block font-black">تحديد نطاق مخصص</span>
              <span className="text-[10px] text-gray-500 block">
                تحديد صفحة البدء والانتهاء يدوياً
              </span>
            </button>
          </div>

          {/* Custom Page Range Inputs */}
          {globalPresetStartMode === "custom_pages" && (
            <div className="pt-2 flex items-center gap-3 bg-white dark:bg-black/20 p-3 rounded-xl border border-gray-200 dark:border-white/10">
              <div className="flex-1 space-y-1">
                <label className="text-[11px] font-bold text-gray-600 dark:text-gray-400 block">
                  صفحة البدء:
                </label>
                <input
                  type="number"
                  min={1}
                  max={604}
                  value={startPage}
                  onChange={(e) => setStartPage(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-bold bg-white dark:bg-[#1A1A1A]"
                />
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-[11px] font-bold text-gray-600 dark:text-gray-400 block">
                  صفحة الانتهاء:
                </label>
                <input
                  type="number"
                  min={1}
                  max={604}
                  value={endPage}
                  onChange={(e) => setEndPage(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-bold bg-white dark:bg-[#1A1A1A]"
                />
              </div>
            </div>
          )}
        </div>

        {/* 2. Daily Pace & Repetitions Fine-Tuning */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-gray-200 dark:border-white/10">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block">
              مقدار الحفظ اليومي:
            </label>
            <div className="flex bg-white dark:bg-[#1A1A1A] p-1 rounded-xl border border-gray-200 dark:border-white/10 gap-1">
              {[
                { id: DailyAmount.HALF_PAGE, label: "نصف صفحة" },
                { id: DailyAmount.ONE_PAGE, label: "صفحة واحدة" },
                { id: DailyAmount.TWO_PAGES, label: "صفحتان" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setDailyAmount(opt.id)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    dailyAmount === opt.id
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block">
              تكرارات التثبيت للحفظ الجديد:
            </label>
            <div className="flex bg-white dark:bg-[#1A1A1A] p-1 rounded-xl border border-gray-200 dark:border-white/10 gap-1">
              {[20, 25, 30, 40, 50].map((reps) => (
                <button
                  key={reps}
                  type="button"
                  onClick={() => setFixationRepetitions(reps)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    fixationRepetitions === reps
                      ? "bg-amber-500 text-black shadow-sm"
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
                  }`}
                >
                  {reps}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 3. Prior Memorization for Distant Review */}
        <div className="pt-3 border-t border-gray-200 dark:border-white/10 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-black text-gray-800 dark:text-white block">
                هل لديك محفوظ سابق تود إدراجه فوراً في مسار مراجعة البعيد؟
              </span>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 block">
                لتفعيل سرد المحفوظ القديم يومياً بالتوازي مع الحفظ الجديد من اليوم الأول
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setHasOldMemorization(!hasOldMemorization);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                hasOldMemorization
                  ? "bg-emerald-600 text-white shadow-md"
                  : "bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-400"
              }`}
            >
              {hasOldMemorization ? "نعم، لدي محفوظ سابق" : "لا، أبدأ من الصفر"}
            </button>
          </div>

          {hasOldMemorization ? (
            <div className="p-4 rounded-xl bg-white dark:bg-black/20 border border-emerald-500/20 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  طريقة تحديد المحفوظ القديم:
                </span>
                <div className="flex bg-gray-100 dark:bg-white/5 p-0.5 rounded-lg text-xs">
                  <button
                    type="button"
                    onClick={() => setOldMemType("juz")}
                    className={`px-3 py-1 rounded-md text-[11px] font-bold ${
                      oldMemType === "juz"
                        ? "bg-white dark:bg-emerald-600 text-emerald-800 dark:text-white shadow-sm"
                        : "text-gray-500"
                    }`}
                  >
                    بالأجزاء
                  </button>
                  <button
                    type="button"
                    onClick={() => setOldMemType("range")}
                    className={`px-3 py-1 rounded-md text-[11px] font-bold ${
                      oldMemType === "range"
                        ? "bg-white dark:bg-emerald-600 text-emerald-800 dark:text-white shadow-sm"
                        : "text-gray-500"
                    }`}
                  >
                    بنطاق الصفحات
                  </button>
                  <button
                    type="button"
                    onClick={() => setOldMemType("surah")}
                    className={`px-3 py-1 rounded-md text-[11px] font-bold ${
                      oldMemType === "surah"
                        ? "bg-white dark:bg-emerald-600 text-emerald-800 dark:text-white shadow-sm"
                        : "text-gray-500"
                    }`}
                  >
                    بالسور
                  </button>
                </div>
              </div>

              {oldMemType === "juz" && (
                <div className="grid grid-cols-6 sm:grid-cols-10 gap-1.5 pt-1">
                  {Array.from({ length: 30 }, (_, i) => i + 1).map((jNum) => {
                    const isSelected = selectedOldJuzs.includes(jNum);
                    return (
                      <button
                        key={jNum}
                        type="button"
                        onClick={() => toggleOldJuz(jNum)}
                        className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                          isSelected
                            ? "bg-emerald-600 text-white shadow-sm"
                            : "bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-100"
                        }`}
                      >
                        جزء {jNum}
                      </button>
                    );
                  })}
                </div>
              )}

              {oldMemType === "range" && (
                <div className="space-y-2">
                  {oldMemorizationRanges.map((range, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-500">نطاق {idx + 1}:</span>
                      <input
                        type="number"
                        min={1}
                        max={604}
                        value={range.start}
                        onChange={(e) => updateRange(idx, "start", Number(e.target.value))}
                        className="w-20 px-2 py-1 text-xs rounded border border-gray-200 dark:border-white/10"
                        placeholder="من"
                      />
                      <span className="text-xs">إلى</span>
                      <input
                        type="number"
                        min={1}
                        max={604}
                        value={range.end}
                        onChange={(e) => updateRange(idx, "end", Number(e.target.value))}
                        className="w-20 px-2 py-1 text-xs rounded border border-gray-200 dark:border-white/10"
                        placeholder="إلى"
                      />
                      {oldMemorizationRanges.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRange(idx)}
                          className="text-red-500 hover:text-red-700 text-xs p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addRange}
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> إضافة نطاق آخر
                  </button>
                </div>
              )}

              {oldMemType === "surah" && (
                <div className="max-h-40 overflow-y-auto p-2 bg-gray-50 dark:bg-white/5 rounded-xl grid grid-cols-2 sm:grid-cols-3 gap-1">
                  {SURAH_METADATAList.map((s, idx) => {
                    const isSelected = selectedOldSurahs.includes(s.name);
                    return (
                      <button
                        key={s.name}
                        type="button"
                        onClick={() => toggleOldSurah(s.name)}
                        className={`px-2 py-1 text-xs font-bold rounded-lg text-right truncate ${
                          isSelected
                            ? "bg-emerald-600 text-white"
                            : "text-gray-700 dark:text-gray-300 hover:bg-gray-100"
                        }`}
                      >
                        {idx + 1}. {s.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-900 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                ممتاز! ستبدأ مراجعة البعيد تلقائياً بالتدوير الدوري بمجرد أن يتجاوز حفظك الجديد نطاق مراجعة القريب ({activePreset.nearReviewPagesCount} صفحة).
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
