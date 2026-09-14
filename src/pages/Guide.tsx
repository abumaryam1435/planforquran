import React from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronRight,
  HelpCircle,
  Book,
  BookOpen,
  Calendar,
  Settings,
  Repeat,
  Layers,
  Clock,
  ShieldCheck,
  Download,
  Trash2,
  CheckCircle2,
  Info,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

const pdfJuzSampleDays = [
  {
    day: "اليوم الأول",
    amount: "البقرة: الآية ١ إلى الآية ٥ (مثال)",
    tasks: ["استماع للمقدار", "حفظ المقدار الجديد", "تثبيت المقدار الجديد"],
  },
  {
    day: "اليوم الثاني",
    amount: "البقرة: الآية ٦ إلى الآية ١٠",
    tasks: ["استماع للمقدار", "حفظ المقدار الجديد", "تثبيت المقدار الجديد"],
  },
  {
    day: "اليوم الثالث",
    amount: "البقرة: الآية ١١ إلى الآية ١٥",
    tasks: ["استماع للمقدار", "حفظ المقدار الجديد", "تثبيت المقدار الجديد"],
  },
  {
    day: "اليوم الرابع",
    amount: "البقرة: الآية ١٦ إلى الآية ٢٠",
    tasks: ["استماع للمقدار", "حفظ المقدار الجديد", "تثبيت المقدار الجديد"],
  },
  {
    day: "اليوم الخامس",
    amount: "البقرة: الآية ٢١ إلى الآية ٢٥",
    tasks: ["استماع للمقدار", "حفظ المقدار الجديد", "تثبيت المقدار الجديد"],
  },
  {
    day: "اليوم السادس",
    amount: "مراجعة الأسبوع: البقرة (١ إلى ٢٥)",
    tasks: [
      "مراجعة شاملة لجميع صفحات المحفوظ الجديد",
      "تسميع متصل لضبط المحفوظ",
    ],
  },
  {
    day: "اليوم السابع",
    amount: "مراجعة تراكمية",
    tasks: [
      "مراجعة عميقة لما تم حفظه في الأسبوع والأسابيع الماضية للجزء",
      "تسميع متصل لربط العمل",
    ],
  },
];

const pdfPagesSampleDays = [
  {
    day: "اليوم الأول",
    amount: "صفحة رقم ٢ (مثال)",
    tasks: [
      "استماع لصفحة ٢",
      "حفظ جديد وتثبيت لصفحة ٢",
      "مراجعة المحفوظ القديم (القسم ١)",
    ],
  },
  {
    day: "اليوم الثاني",
    amount: "صفحة رقم ٣",
    tasks: [
      "استماع لصفحة ٣",
      "حفظ جديد وتثبيت لصفحة ٣",
      "مراجعة المحفوظ القديم (القسم ٢)",
    ],
  },
  {
    day: "اليوم الثالث",
    amount: "صفحة رقم ٤",
    tasks: [
      "استماع لصفحة ٤",
      "حفظ جديد وتثبيت لصفحة ٤",
      "مراجعة المحفوظ القديم (القسم ٣)",
    ],
  },
  {
    day: "اليوم الرابع",
    amount: "صفحة رقم ٥",
    tasks: [
      "استماع لصفحة ٥",
      "حفظ جديد وتثبيت لصفحة ٥",
      "مراجعة المحفوظ القديم (القسم ٤)",
    ],
  },
  {
    day: "اليوم الخامس",
    amount: "صفحة رقم ٦",
    tasks: [
      "استماع لصفحة ٦",
      "حفظ جديد وتثبيت لصفحة ٦",
      "مراجعة المحفوظ القديم (القسم ٥)",
    ],
  },
  {
    day: "اليوم السادس",
    amount: "مراجعة الأسبوع الكلية",
    tasks: ["مراجعة محفوظ الأسبوع الخاصة بالحفظ الجديد وتسميعه"],
  },
  {
    day: "اليوم السابع",
    amount: "تسميع وتثبيت مستمر",
    tasks: ["تسميع ومراجعة ما تم حفظه في الأسبوع والأسابيع الماضية لتثبيته"],
  },
];

const pdfCastlesSampleDays = [
  {
    day: "اليوم الأول",
    amount: "المقدار المتسلسل ١ (مثال: ص ٥٨٢)",
    tasks: ["استماع للمقدار", "حفظ المقدار وتثبيته"],
  },
  {
    day: "اليوم الثاني",
    amount: "المقدار المتسلسل ٢ (مثال: ص ٥٨٣)",
    tasks: ["استماع للمقدار", "حفظ المقدار وتثبيته"],
  },
  {
    day: "اليوم الثالث",
    amount: "تسميع القسم الأول للقلعة",
    tasks: ["ضبط وتسميع محفوظ اليوم الأول والثاني"],
  },
  {
    day: "اليوم الرابع",
    amount: "المقدار المتسلسل ٣ (مثال: ص ٥٨٤)",
    tasks: ["استماع للمقدار", "حفظ المقدار وتثبيته"],
  },
  {
    day: "اليوم الخامس",
    amount: "المقدار المتسلسل ٤ (مثال: ص ٥٨٥)",
    tasks: ["استماع للمقدار", "حفظ المقدار وتثبيته"],
  },
  {
    day: "اليوم السادس",
    amount: "تسميع القسم الثاني للقلعة",
    tasks: ["تثبيت وتسميع محفوظ اليوم الرابع والخامس"],
  },
  {
    day: "اليوم السابع",
    amount: "ختم وتسميع طابق القلعة",
    tasks: [
      "تسميع محفوظ الأسبوع الحالي للقلعة كاملاً",
      "مراجعة القلاع المكتملة السابقة (إن وجد)",
    ],
  },
];

function PdfExampleTable({
  title,
  days,
}: {
  title: string;
  days: Array<{ day: string; amount: string; tasks: string[] }>;
}) {
  return (
    <div className="bg-white/60 dark:bg-[#1A1A1A]/60 border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden mt-4 shadow-sm mb-4">
      <div className="bg-gray-50/80 dark:bg-white/5 px-4 py-2.5 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
        <p className="text-[11px] font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <Download className="w-4 h-4 text-rose-500" />
          مثال تصويري للصفحة الأولى (ملف PDF) - {title}
        </p>
        <span className="text-[9px] text-gray-500 border border-gray-200 dark:border-white/10 px-2 py-0.5 rounded-full bg-white dark:bg-black/20 cursor-default">
          قالب الأسبوع الأول
        </span>
      </div>
      <div className="overflow-x-auto text-[10px] md:text-[11px]">
        <table className="w-full text-right border-collapse bg-white dark:bg-transparent">
          <thead>
            <tr className="bg-gray-50/50 dark:bg-white/5 border-b border-gray-100 dark:border-white/10 text-gray-500 dark:text-gray-400">
              <th className="p-2.5 font-bold border-l border-gray-100 dark:border-white/10 w-[16%] whitespace-nowrap">
                اليوم
              </th>
              <th className="p-2.5 font-bold border-l border-gray-100 dark:border-white/10 w-[38%]">
                المقدار (من - إلى)
              </th>
              <th className="p-2.5 font-bold w-[46%]">المهام المطلوبة</th>
            </tr>
          </thead>
          <tbody>
            {days.map((d, i) => (
              <tr
                key={i}
                className="border-b border-gray-100/50 dark:border-white/5 last:border-0 hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors"
              >
                <td className="p-2.5 border-l border-gray-100 dark:border-white/10 font-bold text-[#D4AF37] dark:text-[#D4AF37] whitespace-nowrap bg-gray-50/20 dark:bg-white/[0.01]">
                  {d.day}
                </td>
                <td
                  className="p-2.5 border-l border-gray-100 dark:border-white/10 text-gray-700 dark:text-gray-300 leading-relaxed font-medium"
                  dangerouslySetInnerHTML={{ __html: d.amount }}
                ></td>
                <td className="p-2.5 text-gray-600 dark:text-gray-400">
                  <div className="flex flex-col gap-1.5 align-middle">
                    {d.tasks.map((task, j) => (
                      <span key={j} className="flex items-start gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-[2px] border border-gray-300 dark:border-gray-500 mt-0.5 shrink-0 bg-white dark:bg-transparent shadow-sm flex-none"></span>
                        <span
                          className="leading-[1.4]"
                          dangerouslySetInnerHTML={{ __html: task }}
                        ></span>
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Guide() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 pb-24 text-right" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors"
        >
          <ChevronRight className="w-6 h-6 dark:text-white" />
        </button>
        <h2 className="text-2xl font-bold dark:text-white flex items-center gap-2">
          <HelpCircle className="w-6 h-6 text-[#D4AF37]" />
          دليل الاستخدام والخطط المنهجية
        </h2>
      </div>

      <div className="space-y-8">
        {/* Intro */}
        <section className="bg-white dark:bg-[#1A1A1A] p-6 rounded-[32px] border border-[#1A2E1A]/5 dark:border-white/5 shadow-sm transition-colors">
          <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
            مرحباً بك في تطبيق{" "}
            <span className="font-bold text-[#1A2E1A] dark:text-[#D4AF37]">
              خطة الحفظ
            </span>
            . هو رفيقك التقني المتكامل لحفظ ومراجعة كتاب الله عز وجل بأساليب
            علمية ومنهجية مبتكرة. تم تصميم التطبيق ليتناسب مع مختلف المستويات؛
            سواء كنت تبدأ حفظ آيات جديدة، أو ترغب في ضبط وتثبيت ما حفظته سابقاً،
            أو تتبع برنامجاً صارماً للمراجعة العميقة.
          </p>
        </section>

        {/* Core Pathways */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#FDFBF7] dark:bg-[#1A1510]/30 p-6 rounded-[32px] border border-[#D4AF37]/20 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
              <Book className="w-6 h-6 text-[#D4AF37]" />
            </div>
            <h3 className="text-lg font-bold text-[#1A2E1A] dark:text-white">
              أولاً: مسار الحفظ الجديد
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              يركز هذا المسار على غرس الآيات الجديدة في الذاكرة عبر الاستماع، ثم
              الحفظ، ثم التثبيت اليومي المكرر، وينقسم إلى ثلاثة خطط فرعية تلبي
              كافة رغبات الحفّاظ.
            </p>
          </div>

          <div className="bg-[#F7FBF8] dark:bg-[#101A12]/30 p-6 rounded-[32px] border border-emerald-500/10 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
              <Layers className="w-6 h-6 text-emerald-500" />
            </div>
            <h3 className="text-lg font-bold text-emerald-900 dark:text-emerald-400">
              ثانياً: مسار المراجعة والضبط المستمر
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              مخصص للحفاظ الذين أتموا حفظ المصحف كاملاً أو أجزاء كبيرة منه،
              ويرغبون في معاهدة القرآن بورد مراجعة سريع جنباً إلى جنب مع ورد
              تثبيت مكرر وعميق لمنع النسيان.
            </p>
          </div>
        </div>

        {/* Detailed Plans Section */}
        <section className="bg-white dark:bg-[#1A1A1A] p-6 rounded-[32px] border border-[#1A2E1A]/5 dark:border-white/5 shadow-sm space-y-6 transition-colors">
          <h3 className="text-xl font-bold text-[#1A2E1A] dark:text-[#D4AF37] flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-white/5">
            <BookOpen className="w-6 h-6" />
            شرح تفصيلي لخطط الحفظ (٣ خطط)
          </h3>

          {/* 1. Juz Plan */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-gold-50 dark:bg-[#D4AF37]/10 flex items-center justify-center font-bold text-[#D4AF37] text-sm">
                ١
              </span>
              <h4 className="font-bold text-base text-[#1A2E1A] dark:text-white">
                خطة حفظ جزء محدد
              </h4>
            </div>
            <div className="mr-10 space-y-2 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              <p>
                تمكّنك من التركيز على جزء واحد كامل من أجزاء القرآن الثلاثين
                (مثل جزء عمّ، جزء تبارك، أو جزء قد سمع... إلخ) بشكل متدرج
                وتصاعدي.
              </p>
              <ul className="list-disc list-inside space-y-1 mr-2 text-xs">
                <li>
                  <strong className="text-gray-800 dark:text-gray-200">
                    مقدار الحفظ اليومي:
                  </strong>{" "}
                  يبدأ من ربع صفحة ويصل إلى ٥ صفحات يومياً ليتناسب مع طاقتك
                  ووقتك.
                </li>
                <li>
                  <strong className="text-gray-800 dark:text-gray-200">
                    النمط الأسبوعي للمهام:
                  </strong>
                </li>
                <li className="list-none mr-4 text-gray-500 dark:text-gray-400">
                  • <b>الأيام الخمسة الأولى (أيام الحفظ والتثبيت):</b> مهام
                  يومية تشمل (الاستماع للمقدار، الحفظ الجديد، والتثبيت المكرر
                  لعدد مرّات محدد).
                  <br />• <b>اليوم السادس:</b> مراجعة أسبوعية شاملة وتسميع لكافة
                  صفحات المحفوظ الجديد للأسبوع لضبطه وتأكيده بشكل كامل.
                  <br />• <b>اليوم السابع:</b> مراجعة تراكمية عميقة لجميع ما تم
                  حفظه في الأسبوع الحالي والأسابيع الماضية (منذ بداية الجزء)،
                  مما يضمن ثبات الصفحات السابقة في الذهن.
                </li>
              </ul>
              <PdfExampleTable title="خطة حفظ جزء" days={pdfJuzSampleDays} />
            </div>
          </div>

          {/* 2. Custom Plan */}
          <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-white/5">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-gold-50 dark:bg-[#D4AF37]/10 flex items-center justify-center font-bold text-[#D4AF37] text-sm">
                ٢
              </span>
              <h4 className="font-bold text-base text-[#1A2E1A] dark:text-white">
                خطة الحفظ المخصصة (بالصفحات)
              </h4>
            </div>
            <div className="mr-10 space-y-2 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              <p>
                تمنحك الحرية المطلقة في تحديد المدى والصفحات التي ترغب في حفظها
                عبر كامل المصحف الشريف.
              </p>
              <ul className="list-disc list-inside space-y-1 mr-2 text-xs">
                <li>
                  <strong className="text-gray-800 dark:text-gray-200">
                    تخصيص كامل:
                  </strong>{" "}
                  تحدد صفحة البدء وصفحة الانتهاء بدقة بالغة (على سبيل المثال:
                  الحفظ من الصفحة ٤٥ وحتى الصفحة ٩٠).
                </li>
                <li>
                  <strong className="text-gray-800 dark:text-gray-200">
                    المرونة والذكاء:
                  </strong>{" "}
                  يقوم التطبيق تلقائياً بقسمة الصفحات وبناء جدول مريح ومنهجي على
                  أسابيع، متضمناً الفواصل والوقفات للمراجعة الدورية والتسميع
                  لترسيخ الذاكرة.
                </li>
              </ul>
              <PdfExampleTable
                title="خطة الحفظ بالصفحات"
                days={pdfPagesSampleDays}
              />
            </div>
          </div>

          {/* 3. Seven Castles */}
          <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-white/5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-gold-50 dark:bg-[#D4AF37]/10 flex items-center justify-center font-bold text-[#D4AF37] text-sm">
                  ٣
                </span>
                <h4 className="font-bold text-base text-[#1A2E1A] dark:text-white">
                  نظام "القلاع السبع" المبتكر للحفظ المتواصل
                </h4>
              </div>
              <a
                href="/7 Forts Book.pdf"
                download="7 Forts Book.pdf"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-900/30 text-rose-600 dark:text-rose-400 border border-rose-200/50 dark:border-rose-900/30 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 sm:mr-auto"
                id="download-7forts-book-btn"
              >
                <Download className="w-4 h-4 text-rose-500" />
                <span>انقر لتحميل منهج القلاع السبع</span>
              </a>
            </div>
            <div className="mr-10 space-y-2 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              <p className="font-medium text-[#D4AF37]">
                هو أحد أقوى الأنظمة العلمية المطبقة في معاهد التحفيظ العالمية
                لربط الحفظ الجديد بالقديم باستمرار دون أدنى تشتت.
              </p>
              <p>
                يقوم النظام على تقسيم المحفوظ الكلي إلى{" "}
                <b>٧ قلاع افتراضية متتالية</b>. تتكون كل قلعة من ٦ أيام حفظ
                ممتدة عبر الأسابيع، ولا تبدأ قلعة جديدة إلا بعد إحكام وثبات
                القلعة السابقة بالكامل.
              </p>

              {/* Direction Paths */}
              <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/5 space-y-3 my-2 text-xs">
                <h5 className="font-bold text-gray-700 dark:text-gray-300">
                  خيارات اتجاه الحفظ ونوع المسار في القلاع السبع:
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3 bg-white dark:bg-[#222] rounded-xl border border-gray-200/50 space-y-1">
                    <span className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                      <ArrowUpRight className="w-4 h-4" />
                      المسار التصاعدي (الاعتادي)
                    </span>
                    <p className="text-gray-500 leading-relaxed text-[11px]">
                      يبدأ الحفظ من السور الطوال صعوداً للناس (مثلاً من أول
                      البقرة متجهاً للأمام).
                    </p>
                  </div>
                  <div className="p-3 bg-white dark:bg-[#222] rounded-xl border border-gray-200/50 space-y-1">
                    <span className="flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400">
                      <ArrowDownRight className="w-4 h-4" />
                      المسار التنازلي التراكمي
                    </span>
                    <p className="text-gray-500 leading-relaxed text-[11px]">
                      يبدأ الحفظ من جزء عم والسور الصغار نزولاً باتجاه السور
                      الأكبر (من الناس إلى البقرة).
                    </p>
                  </div>
                </div>
              </div>

              {/* Weekly Rhythm of Seven Castles */}
              <div className="bg-amber-500/5 dark:bg-amber-500/10 p-5 rounded-3xl border border-[#D4AF37]/20 space-y-3">
                <h5 className="font-bold text-sm text-[#1A2E1A] dark:text-[#D4AF37] flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  الجدول التنظيمي والدورة الأسبوعية للقلاع السبع (٧ أيام):
                </h5>
                <ul className="space-y-4 text-xs text-gray-600 dark:text-gray-300">
                  <li className="space-y-1.5">
                    <div className="font-bold text-[#D4AF37]">
                      اليوم الأول والثاني:
                    </div>
                    <p className="block text-justify leading-relaxed">
                      <b>حفظ جديد</b> للمقدار المتسلسل المحدد والمحسوب من القلعة
                      النشطة وتثبيته في نفس اليوم.
                    </p>
                  </li>
                  <li className="space-y-1.5">
                    <div className="font-bold text-[#D4AF37]">
                      اليوم الثالث:
                    </div>
                    <p className="block text-justify leading-relaxed">
                      <b>ضبط وتسميع محفوظ الأسبوع الحالي</b> (ما تم حفظه وتثبيته
                      في اليومين الأول والثاني لضمان ثباته التام).
                    </p>
                  </li>
                  <li className="space-y-1.5">
                    <div className="font-bold text-[#D4AF37]">
                      اليوم الرابع والخامس:
                    </div>
                    <p className="block text-justify leading-relaxed">
                      <b>استئناف الحفظ المتسلسل</b> بمجموعات جديدة للقلعة وسد
                      الثغرات للانتقال للدفعة التالية بذكاء مستقر.
                    </p>
                  </li>
                  <li className="space-y-1.5">
                    <div className="font-bold text-[#D4AF37]">
                      اليوم السادس:
                    </div>
                    <p className="block text-justify leading-relaxed">
                      <b>تثبيت وتسميع</b> محفوظ يومي الحفظ الرابع والخامس (تسميع
                      محفوظ الأسبوع الحالي للقسم الثاني).
                    </p>
                  </li>
                  <li className="space-y-1.5 hidden">
                    <div className="font-bold text-[#D4AF37]">
                      اليوم السابع:
                    </div>
                    <p className="block text-justify leading-relaxed">
                      <b>مراجعة محفوظ الأسبوع الحالي كاملاً</b> وتسميعه دفعة
                      واحدة لتحويل الذاكرة قصيرة المدى إلى طويلة المدى.
                    </p>
                  </li>
                  <li className="space-y-1.5">
                    <div className="font-bold text-rose-500">
                      دورة مراجعة القلاع المكتملة:
                    </div>
                    <div className="block text-justify leading-relaxed">
                      بمجرد انتهائك من القلعة الأولى واجتيازها، يقوم البرنامج{" "}
                      <b>تلقائياً وبشكل دوري ومستمر</b> بجدولة مراجعة القلاع
                      المنتهية متوزعة على أيام الأسبوع كمهام موازية بدون مجهود
                      إضافي شاق:
                      <span className="text-gray-500 mt-2 block">
                        (القلعة الأولى يوم الأحد • الثانية يوم الإثنين • الثالثة
                        يوم الثلاثاء • الرابعة يوم الأربعاء • الخامسة يوم الخميس
                        • السادسة يوم الجمعة • السابعة يوم السبت).
                      </span>
                    </div>
                  </li>
                </ul>
              </div>
              <PdfExampleTable
                title="خطة القلاع السبع"
                days={pdfCastlesSampleDays}
              />
            </div>
          </div>
        </section>

        {/* Detailed Review Section */}
        <section className="bg-white dark:bg-[#1A1A1A] p-6 rounded-[32px] border border-[#1A2E1A]/5 dark:border-white/5 shadow-sm space-y-4 transition-colors">
          <h3 className="text-xl font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-white/5">
            <Layers className="w-6 h-6" />
            شرح تفصيلي لخطة المراجعة والتثبيت المستمر
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            يهدف هذا البرنامج إلى الصيانة المستمرة والربط الثابت للمصحف كاملاً
            لمن يريد المحافظة على معاهدة ما حفظه من التململ أو الضياع:
          </p>
          <div className="bg-gray-50 dark:bg-white/5 rounded-2xl p-5 space-y-3.5 border border-gray-100 dark:border-white/5 text-sm">
            <ul className="list-disc list-inside space-y-2 text-xs text-gray-600 dark:text-gray-300">
              <li>
                <strong className="text-gray-800 dark:text-gray-200">
                  المراجعة التراكمية السريعة:
                </strong>{" "}
                مقدار يومي تقرؤه بالنظر أو الحدر (حدده بناءً على كمية حفظك، من
                جزء إلى عدة أجزاء يومياً) للمرور الدائم على المصحف وضبط مخارج
                الحروف.
              </li>
              <li>
                <strong className="text-gray-800 dark:text-gray-200">
                  التثبيت والمراجعة العميقة (المقدار الإضافي المكرر):
                </strong>{" "}
                جزء يسير تفرز له وقتاً مستقلاً لتقرؤه بتكرار كثيف وعمق (من حزب،
                أو نصف حزب، ربع حزب، أو حتى صفحتين) لمحو أي التباس أو متشابهات
                في الآيات.
              </li>
              <li>
                <strong className="text-gray-800 dark:text-gray-200">
                  التسميع العميق:
                </strong>{" "}
                إقران التثبيت بتسميع كامل وقوي بدون أخطاء ليصبح السرد ممتعاً
                وثابتاً.
              </li>
            </ul>
          </div>
        </section>

        {/* Essential Daily Tasks */}
        <section className="bg-white dark:bg-[#1A1A1A] p-6 rounded-[32px] border border-[#1A2E1A]/5 dark:border-white/5 shadow-sm space-y-4 transition-colors">
          <h3 className="text-lg font-bold text-[#1A2E1A] dark:text-[#D4AF37] flex items-center gap-2">
            <Repeat className="w-5 h-5" />
            أنواع المهام اليومية المصاحبة لكل خطة
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            ستجد في واجهة المهام اليومية بطاقات ملونة تنظم أورادك كالتالي:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-sky-500/5 dark:bg-sky-500/10 rounded-2xl border border-sky-500/10 space-y-1">
              <span className="font-bold text-sky-700 dark:text-sky-400">
                1. بطاقة الاستماع:
              </span>
              <p className="text-gray-500">
                سماع المقدار الجديد من قارئ متقن قبل الشروع في حفظه بالعين
                واللسان لتفادي اللحن وغش القراءة.
              </p>
            </div>
            <div className="p-4 bg-amber-500/5 dark:bg-amber-500/10 rounded-2xl border border-amber-500/10 space-y-1">
              <span className="font-bold text-amber-700 dark:text-amber-400">
                2. بطاقة الحفظ الجديد:
              </span>
              <p className="text-gray-500">
                حفظ المقدار اليومي ليكون محفوظاً عن ظهر قلب بشكل متقن وصحيح.
              </p>
            </div>
            <div className="p-4 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-2xl border border-emerald-500/10 space-y-1">
              <span className="font-bold text-emerald-700 dark:text-emerald-400">
                3. بطاقة التثبيت والتكرار:
              </span>
              <p className="text-gray-500">
                قراءة وتثبيت المقدار الجديد لعدد المرات التي قمت بتعيينها في
                الإعدادات مسبقاً (العداد المدمج).
              </p>
            </div>
            <div className="p-4 bg-rose-500/5 dark:bg-rose-500/10 rounded-2xl border border-rose-500/10 space-y-1">
              <span className="font-bold text-rose-700 dark:text-rose-400">
                4. بطاقات التسميع والمراجعة:
              </span>
              <p className="text-gray-500">
                مراجعة المحفوظات القديمة والقريبة باستمرار وتسميعها للتأكد من
                ربط الأجزاء ببعضها وعدم تلاشيها.
              </p>
            </div>
          </div>
        </section>

        {/* Technical Features & Utilities */}
        <section className="bg-white dark:bg-[#1A1A1A] p-6 rounded-[32px] border border-[#1A2E1A]/5 dark:border-white/5 shadow-sm space-y-5 transition-colors">
          <h3 className="text-lg font-bold text-[#1A2E1A] dark:text-[#D4AF37] flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 animate-pulse" />
            أدوات تقنية مميزة داخل التطبيق
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            يحتوي التطبيق على عدة أدوات مساعدة ومكملة تمنحك سيطرة كاملة وتجربة
            غامرة:
          </p>
          <div className="space-y-4">
            {/* 1. Counter */}
            <div className="flex gap-3 text-sm">
              <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center font-bold text-[#D4AF37] shrink-0 text-xs">
                أ
              </div>
              <div>
                <strong className="text-gray-800 dark:text-white block">
                  عداد التثبيت والتكرار التفاعلي:
                </strong>
                <span className="text-xs text-gray-500 block leading-relaxed mt-0.5">
                  بدلاً من شطب المهام بضغطة واحدة، يمكنك الاستفادة من العداد
                  الرقمي للنقر في كل مرة تكمل فيها تكراراً واحداً حتى تضمن وصولك
                  للحد المطلوب تماماً.
                </span>
              </div>
            </div>

            {/* 2. Calendar */}
            <div className="flex gap-3 text-sm">
              <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center font-bold text-[#D4AF37] shrink-0 text-xs text-center">
                ب
              </div>
              <div>
                <strong className="text-gray-800 dark:text-white block">
                  تقويم تدارك الفوائت التفاعلي:
                </strong>
                <span className="text-xs text-gray-500 block leading-relaxed mt-0.5">
                  يتيح لك التقويم العودة للأيام السابقة والاطلاع على المهام التي
                  فاتتك وإمكانية إنجازها وتعديلها لتحديث نسبة إنجازك العام دون
                  تصفير مجهوداتك.
                </span>
              </div>
            </div>

            {/* 3. High quality PDF */}
            <div className="flex gap-3 text-sm">
              <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center font-bold text-[#D4AF37] shrink-0 text-xs text-center">
                ج
              </div>
              <div>
                <strong className="text-gray-800 dark:text-white block">
                  تصدير مستندات PDF فائقة الدقة:
                </strong>
                <span className="text-xs text-gray-500 block leading-relaxed mt-0.5">
                  تصميم جداول الخطة المطبوعة بجودة ممتازة لتظهر كأنها محولة
                  مباشرة من ملف وورد، وتستطيع طباعتها ورقياً أو تعليقها في غرفتك
                  لمتابعة ملموسة وجميلة.
                </span>
              </div>
            </div>

            {/* 4. Backup */}
            <div className="flex gap-3 text-sm">
              <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center font-bold text-[#D4AF37] shrink-0 text-xs text-center">
                د
              </div>
              <div>
                <strong className="text-gray-800 dark:text-white block">
                  النسخ الاحتياطي وإدارة البيانات:
                </strong>
                <span className="text-xs text-gray-500 block leading-relaxed mt-0.5">
                  يتم حفظ جميع تقدمك وبياناتك التراكمية بأمان على المتصفح
                  المحلي. كما نوفر ميزة تصدير نسخة احتياطية من الإعدادات
                  لاستيرادها على هاتف آخر أو متصفح جديد بضغطة واحدة.
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Conclusion / Tip card */}
        <div className="bg-[#1A2E1A] text-white p-6 rounded-[32px] border border-white/5 space-y-3 shadow-inner">
          <h4 className="font-bold text-base text-[#D4AF37]">
            نصيحة الحفّاظ المتكررة:
          </h4>
          <p className="text-xs text-green-150 leading-relaxed font-light">
            "قليل دائم خير من كثير منقطع." إن الالتزام بالمهام اليومية الصغيرة،
            وإهمال الحفظ الزائد الذي يضر بجودة المحفوظات السابقة، مع كثرة تكرار
            أوراد المراجعة والتسميع؛ هو الحبل الذهبي الذي يمكنك من معاهدة كتاب
            الله كأعظم إنجاز في حياتك. استعن بالله ولا تعجز، وتابع يومك بامتياز
            ملحوظ!
          </p>
        </div>
      </div>
    </div>
  );
}
