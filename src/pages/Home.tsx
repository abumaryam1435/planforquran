
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Trophy, TrendingUp, ArrowRight, PlusCircle, Edit2, Trash2, AlertTriangle, X, Download, Share2, Upload, Clock } from 'lucide-react';
import { deletePlan } from '../db/dbSync';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { getPlanStats } from '../utils/planGenerator';
import { useAuth } from '../context/AuthProvider';
import { useUserData } from '../context/UserDataProvider';
import { ImportPlanModal } from '../components/plan/ImportPlanModal';
import { ExportPlanModal } from '../components/plan/ExportPlanModal';
import { QuranPlan } from '../types';
import { getPlanSummaryText, getPlanTypeArabic } from '../utils/planSharing';

export default function Home() {
  const { user } = useAuth();
  const { loading, activePlan, plans, setSelectedPlanId, progressLogs } = useUserData();
  
  const allLogs = progressLogs;
  
  // All plans created or imported by the user
  const allPlans = plans;

  const navigate = useNavigate();
  const [planToDelete, setPlanToDelete] = useState<number | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [planToExport, setPlanToExport] = useState<QuranPlan | null>(null);

  const isInitialRedirectPending = activePlan && typeof window !== 'undefined' && !sessionStorage.getItem('hasRedirectedOnOpen');

  useEffect(() => {
    if (activePlan) {
      const hasRedirected = sessionStorage.getItem('hasRedirectedOnOpen');
      if (!hasRedirected) {
        sessionStorage.setItem('hasRedirectedOnOpen', 'true');
        navigate('/tasks', { replace: true });
      }
    }
  }, [activePlan, navigate]);

  if (loading || isInitialRedirectPending) {
    return (
      <div className="space-y-6 animate-pulse p-4">
        <div className="h-44 bg-gray-200 dark:bg-white/5 rounded-3xl" />
        <div className="h-32 bg-gray-200 dark:bg-white/5 rounded-2xl" />
      </div>
    );
  }

  const stats = activePlan && allLogs ? getPlanStats(activePlan, allLogs) : null;

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <section className="bg-gradient-to-br from-[#1A2E1A] to-[#2D4F2D] p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-white text-center text-lg md:text-xl font-bold leading-relaxed my-2 font-arabic hyphens-auto">
            «إِنَّ هَٰذَا الْقُرْآنَ يَهْدِي لِلَّتِي هِيَ أَقْوَمُ وَيُبَشِّرُ الْمُؤْمِنِينَ الَّذِينَ يَعْمَلُونَ الصَّالِحَاتِ أَنَّ لَهُمْ أَجْرًا كَبِيرًا»
          </p>

          {activePlan && (
            <Link
              to="/tasks"
              className="mt-4 flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-2xl px-4 py-2.5 border border-white/10 hover:bg-white/15 transition-all text-right group"
              title="الانتقال إلى صفحة المهام"
            >
              <BookOpen className="w-4 h-4 text-[#D4AF37] shrink-0" />
              <span className="text-xs text-white/75 shrink-0">الخطة النشطة:</span>
              <span className="text-xs md:text-sm font-black text-[#D4AF37] break-words flex-1 leading-relaxed">
                {activePlan.name || getPlanSummaryText(activePlan)}
              </span>
            </Link>
          )}
          
          <div className="mt-4 flex gap-4">
            <div className="flex-1 bg-white/10 backdrop-blur-md rounded-2xl p-4">
              <span className="block text-2xl font-bold">{stats?.totalPagesMemorized || 0}</span>
              <span className="text-[10px] text-white/60 uppercase tracking-wider">
                {activePlan?.planType === 'review' ? 'صفحة مثبتة' : 'صفحة محفوظة'}
              </span>
            </div>
            <div className="flex-1 bg-white/10 backdrop-blur-md rounded-2xl p-4">
              <span className="block text-2xl font-bold">{stats?.completedTasksCount || 0}</span>
              <span className="text-[10px] text-white/60 uppercase tracking-wider">مهمة مكتملة</span>
            </div>
          </div>
        </div>
        
        {/* Decorative background element */}
        <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-[#D4AF37]/20 rounded-full blur-3xl" />
      </section>

      {/* All Plans List */}
      <section className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <h3 className="font-bold flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#D4AF37]" />
            خططي القرآنية {allPlans.length > 0 ? `(${allPlans.length})` : ''}
          </h3>
          {allPlans.length > 0 && (
            <Link to="/tasks" className="text-xs text-[#D4AF37] font-medium flex items-center gap-1">
               عرض مهام اليوم <ArrowRight className="w-3 h-3 rotate-180" />
            </Link>
          )}
        </div>

        {allPlans.length > 0 ? (
          <div className="space-y-3">
            {allPlans.map(plan => {
              const planLogs = allLogs.filter(log => log.planId === plan.id);
              const planStats = getPlanStats(plan, planLogs);
              const isSelected = activePlan?.id === plan.id;
              const planDisplayName = plan.name?.trim() || getPlanSummaryText(plan) || getPlanTypeArabic(plan);
              
              return (
                <div 
                  key={plan.id}
                  onClick={() => {
                    setSelectedPlanId(plan.id!);
                    navigate('/tasks');
                  }}
                  className={`cursor-pointer p-5 rounded-2xl border transition-all shadow-sm ${
                    isSelected 
                      ? 'bg-amber-50/80 dark:bg-amber-900/20 border-amber-400 dark:border-amber-600 ring-2 ring-amber-400/20' 
                      : 'bg-white dark:bg-[#1A1A1A] border-[#1A2E1A]/10 dark:border-white/5 hover:border-amber-300/60'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-lg dark:text-white">
                          {planDisplayName}
                        </h4>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPlanId(plan.id!);
                              navigate('/tasks');
                            }}
                            className="p-1.5 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg text-amber-600 dark:text-amber-400 transition-all"
                            title="تأجيل مهام اليوم (زحزحة جدول جميع المهام القادمة يوماً)"
                          >
                            <Clock className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPlanToExport(plan);
                            }}
                            className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg text-emerald-600 dark:text-emerald-400 transition-all"
                            title="تصدير ومشاركة الخطة"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                          <Link 
                            to={`/plans/edit/${plan.id}`} 
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg text-[#D4AF37] hover:text-[#B8860B] dark:hover:text-[#F3E5AB] transition-all"
                            title="تعديل الخطة"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPlanToDelete(plan.id!);
                            }}
                            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-500 hover:text-red-600 dark:hover:text-red-400 transition-all"
                            title="حذف الخطة"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      {plan.planType !== 'review' && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">من صفحة {plan.startPage} إلى {plan.endPage}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isSelected ? (
                        <span className="bg-emerald-600 text-white px-2.5 py-1 rounded-full text-[10px] font-bold shadow-xs">
                          الخطة النشطة
                        </span>
                      ) : (
                        <span className="bg-[#D4AF37]/10 text-[#B8860B] dark:text-[#D4AF37] px-2.5 py-1 rounded-full text-[10px] font-bold">
                          {plan.isSevenCastles ? 'القلاع السبع' : (plan.planType === 'review' ? 'قيد المراجعة' : 'قيد الحفظ')}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-1.5 mt-4">
                    <div className="flex justify-between text-[10px] font-medium text-gray-500 dark:text-gray-400">
                      <span>التقدم الكلي</span>
                      <span className="text-[#D4AF37] font-bold">{planStats.progressPercentage}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${planStats.progressPercentage}%` }}
                        className="h-full bg-[#D4AF37]"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            
            <div className="flex flex-col sm:flex-row gap-2 mt-4">
              <Link 
                to="/plans/new"
                className="border-2 border-dashed border-gray-300 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 flex-1 py-3.5 rounded-xl flex items-center justify-center gap-2 font-bold transition-colors text-xs sm:text-sm"
              >
                <PlusCircle className="w-4 h-4 text-[#D4AF37]" />
                إضافة خطة جديدة
              </Link>
              <button
                type="button"
                onClick={() => setShowImportModal(true)}
                className="border-2 border-dashed border-emerald-300 dark:border-emerald-700/50 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/10 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 flex-1 py-3.5 rounded-xl flex items-center justify-center gap-2 font-bold transition-colors active:scale-[0.99] cursor-pointer text-xs sm:text-sm"
              >
                <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                استيراد خطة جاهزة
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-[#1A1A1A] p-8 rounded-2xl border border-dashed border-gray-200 dark:border-white/10 flex flex-col items-center justify-center text-center space-y-4 transition-colors">
            <div className="w-16 h-16 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center">
              <PlusCircle className="w-8 h-8 text-gray-300 dark:text-gray-600" />
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">لا توجد خطة نشطة حالياً</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">ابدأ رحلتك الإيمانية بإنشاء خطة جديدة أو استيراد خطة جاهزة أعدها معلمك</p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-sm justify-center">
              <Link 
                to="/plans/new"
                className="w-full sm:w-auto flex-1 bg-[#1A2E1A] dark:bg-[#D4AF37] text-white dark:text-[#1A1A1A] px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-[#1A2E1A]/20 dark:shadow-[#D4AF37]/10 active:scale-95 transition-transform flex items-center justify-center gap-2"
              >
                <PlusCircle className="w-4 h-4" />
                إنشاء خطة جديدة
              </Link>
              <button
                type="button"
                onClick={() => setShowImportModal(true)}
                className="w-full sm:w-auto flex-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-700/40 px-5 py-2.5 rounded-xl text-sm font-bold active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                استيراد خطة
              </button>
            </div>

            {/* نبذة عن التطبيق والخطط المتوفرة */}
            <div className="pt-6 border-t border-gray-100 dark:border-white/5 w-full text-right space-y-2">
              <h4 className="text-xs font-bold text-gray-700 dark:text-gray-200">ماذا يقدم لك هذا التطبيق؟</h4>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-relaxed">
                يساعدك التطبيق على تنظيم مسيرتك اليومية مع القرآن الكريم وضمان الحفظ المتين وعدم التفلت من خلال ثلاثة أنواع أساسية للخطط:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="p-3 bg-gray-50 dark:bg-white/[0.02] rounded-xl border border-gray-100/50 dark:border-white/[0.03] text-right">
                  <span className="font-bold text-xs text-[#1A2E1A] dark:text-[#D4AF37] block mb-1">📅 خطط الحفظ المخصصة</span>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-relaxed">
                    حفظ متدرج ومستمر للأجزاء أو السور بورد الحفظ ومقدار المراجعة والربط اليومي المناسب لك.
                  </p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-white/[0.02] rounded-xl border border-gray-100/50 dark:border-white/[0.03] text-right">
                  <span className="font-bold text-xs text-[#1A2E1A] dark:text-[#D4AF37] block mb-1">🏰 منهج القلاع السبع</span>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-relaxed">
                    نظام تراكمي متين ومخصص للربط الشامل، يجمع بين الحفظ الجديد والمقرئ الدائم وتكرار القلاع.
                  </p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-white/[0.02] rounded-xl border border-gray-100/50 dark:border-white/[0.03] text-right">
                  <span className="font-bold text-xs text-[#1A2E1A] dark:text-[#D4AF37] block mb-1">🔄 مراجعة وتثبيت مرن</span>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-relaxed">
                    تثبيت قوي للمحفوظ عبر مراجعة المصحف كاملاً، أو أجزاء محددة، أو تحديد نطاق صفحات مخصص ومراجعته دورياً.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <section className="bg-white dark:bg-[#1A1A1A] p-4 rounded-2xl border border-[#1A2E1A]/5 dark:border-white/5 shadow-sm space-y-3 transition-colors">
          <div className="bg-blue-50 dark:bg-blue-900/20 w-10 h-10 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h4 className="text-xs text-gray-500 dark:text-gray-400">نسبة الالتزام</h4>
            <p className="text-xl font-bold dark:text-white">{stats?.commitmentRate || 0}%</p>
          </div>
        </section>
        
        <section className="bg-white dark:bg-[#1A1A1A] p-4 rounded-2xl border border-[#1A2E1A]/5 dark:border-white/5 shadow-sm space-y-3 transition-colors">
          <div className="bg-orange-50 dark:bg-orange-900/20 w-10 h-10 rounded-xl flex items-center justify-center">
            <Trophy className="w-6 h-6 text-orange-500" />
          </div>
          <div>
            <h4 className="text-xs text-gray-500 dark:text-gray-400">سلسلة الإنجاز</h4>
            <p className="text-xl font-bold dark:text-white">{stats?.streak || 0} يوم</p>
          </div>
        </section>
      </div>


      {/* Quran Access Card */}
      <section className="bg-gradient-to-br from-[#1A2E1A] to-[#2C4A2C] dark:from-[#D4AF37]/20 dark:to-[#D4AF37]/5 p-5 rounded-2xl border border-[#1A2E1A]/10 dark:border-[#D4AF37]/20 shadow-lg relative overflow-hidden transition-all group">
        <div className="absolute -left-6 -top-6 w-32 h-32 bg-white/10 dark:bg-[#D4AF37]/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all" />
        <div className="relative z-10 flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-white dark:text-[#D4AF37] font-bold text-lg flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              المصحف الشريف
            </h3>
            <p className="text-white/70 dark:text-gray-400 text-xs">قراءة، استماع، وبحث متقدم في المصحف</p>
          </div>
          <Link 
            to="/quran"
            className="bg-white/10 hover:bg-white/20 dark:bg-[#D4AF37]/10 dark:hover:bg-[#D4AF37]/20 text-white dark:text-[#D4AF37] p-3 rounded-xl backdrop-blur-sm transition-all"
          >
            <ArrowRight className="w-5 h-5 rotate-180" />
          </Link>
        </div>
      </section>

      <AnimatePresence>
        {planToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setPlanToDelete(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white dark:bg-[#1C1C1E] rounded-[24px] shadow-2xl border border-gray-100 dark:border-white/10 overflow-hidden"
            >
              <div className="p-6 text-center space-y-4">
                <div className="w-16 h-16 bg-red-50 dark:bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-bold text-lg dark:text-white">هل أنت متأكد من حذف هذه الخطة؟</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    سيتم حذف الخطة وجميع سجلات التقدم المرتبطة بها نهائياً. لا يمكن التراجع عن هذا الإجراء.
                  </p>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={async () => {
                      if (planToDelete) {
                        await deletePlan(planToDelete);
                        if (activePlan?.id === planToDelete) {
                          setSelectedPlanId(null);
                        }
                        setPlanToDelete(null);
                      }
                    }}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-colors active:scale-95"
                  >
                    نعم، احذف الخطة
                  </button>
                  <button
                    onClick={() => setPlanToDelete(null)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-white font-bold py-3 rounded-xl transition-colors active:scale-95"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Import Plan Modal */}
      <ImportPlanModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
      />

      {/* Export Plan Modal */}
      <ExportPlanModal
        isOpen={!!planToExport}
        onClose={() => setPlanToExport(null)}
        plan={planToExport}
      />
    </div>
  );
}
