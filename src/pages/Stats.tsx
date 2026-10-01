import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Book, CheckCircle, Flame, Target, ChevronRight, ChevronLeft, CheckCircle2, Calendar as CalendarIcon, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getPlanStats } from '../utils/planGenerator';
import { useAuth } from '../context/AuthProvider';
import { useUserData } from '../context/UserDataProvider';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday } from 'date-fns';
import { ar } from 'date-fns/locale';

type TabType = 'stats' | 'calendar';

export default function Stats() {
  const { user } = useAuth();
  const { activePlan } = useUserData();
  const [activeTab, setActiveTab] = useState<TabType>('stats');
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const allLogs = useLiveQuery(() => 
    activePlan ? db.progress.where('planId').equals(activePlan.id!).toArray() : []
  , [activePlan, user?.uid]);

  const allLogsRaw = useLiveQuery(() => db.progress.toArray(), [user?.uid]);

  // --- Stats Logic ---
  const planStats = activePlan && allLogs ? getPlanStats(activePlan, allLogs) : null;

  const progressData = allLogs?.slice(-7).map(log => ({
    name: log.date.split('-').slice(1).join('/'),
    completed: log.tasks.filter(t => t.completed).length,
    total: log.tasks.length,
    rate: log.tasks.length > 0 ? (log.tasks.filter(t => t.completed).length / log.tasks.length) * 100 : 0
  })) || [];

  const statsCards = [
    { label: 'الصفحات المحفوظة', value: planStats?.totalPagesMemorized || 0, icon: Book, color: 'text-green-500', bg: 'bg-green-50' },
    { label: 'الأيام المكتملة', value: allLogs?.filter(l => l.tasks.every(t => t.completed)).length || 0, icon: CheckCircle, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'أعلى سلسلة', value: `${planStats?.streak || 0} يوم`, icon: Flame, color: 'text-orange-500', bg: 'bg-orange-50' },
    { label: 'نسبة الإنجاز الكلي', value: `${planStats?.progressPercentage || 0}%`, icon: Target, color: 'text-amber-800', bg: 'bg-amber-50' },
  ];

  // --- Calendar Logic ---
  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const getLogForDate = (date: Date) => {
    return allLogsRaw?.find(log => isSameDay(new Date(log.date), date));
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold dark:text-white flex items-center gap-2">
           <BarChart3 className="w-6 h-6 text-[#D4AF37]" />
           التقدم
        </h2>
      </div>

      <div className="flex p-1 bg-gray-100 dark:bg-white/5 rounded-xl border border-[#1A2E1A]/5 dark:border-white/5">
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex-1 py-2 flex items-center justify-center gap-2 text-sm font-bold rounded-lg transition-all ${
            activeTab === 'stats'
              ? 'bg-white dark:bg-[#1A1A1A] text-[#1A2E1A] dark:text-[#D4AF37] shadow-sm'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          الإحصائيات
        </button>
        <button
          onClick={() => setActiveTab('calendar')}
          className={`flex-1 py-2 flex items-center justify-center gap-2 text-sm font-bold rounded-lg transition-all ${
            activeTab === 'calendar'
              ? 'bg-white dark:bg-[#1A1A1A] text-[#1A2E1A] dark:text-[#D4AF37] shadow-sm'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          <CalendarIcon className="w-4 h-4" />
          التقويم
        </button>
      </div>

      <AnimatePresence mode="wait">
         {activeTab === 'stats' ? (
            <motion.div
               key="stats"
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -10 }}
               transition={{ duration: 0.2 }}
               className="space-y-6"
            >
              <div className="grid grid-cols-2 gap-4">
                {statsCards.map((stat, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-white dark:bg-[#1A1A1A] p-4 rounded-3xl border border-[#1A2E1A]/5 dark:border-white/5 shadow-sm space-y-3"
                  >
                    <div className={`${stat.bg} dark:bg-opacity-10 w-10 h-10 rounded-xl flex items-center justify-center`}>
                      <stat.icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">{stat.label}</p>
                      <p className="text-xl font-bold dark:text-white">{stat.value}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <section className="bg-white dark:bg-[#1A1A1A] p-6 rounded-3xl border border-[#1A2E1A]/5 dark:border-white/5 shadow-sm space-y-6">
                <h3 className="font-bold text-sm text-gray-400 uppercase">تقدم الحفظ (آخر 7 أيام)</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={progressData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" strokeOpacity={0.2} />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fill: '#9ca3af' }}
                      />
                      <YAxis hide />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', backgroundColor: 'var(--tw-colors-gray-900)' }}
                        labelStyle={{ fontSize: '10px', fontWeight: 'bold' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="rate" 
                        stroke="#D4AF37" 
                        strokeWidth={4} 
                        dot={{ fill: '#D4AF37', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="bg-[#1A2E1A] dark:bg-zinc-900 text-white p-6 rounded-3xl shadow-xl space-y-6 overflow-hidden relative">
                 <div className="relative z-10 space-y-4">
                    <h3 className="font-bold">الإنجازات المفتوحة</h3>
                    <div className="grid grid-cols-4 gap-3">
                       {[1, 2, 3, 4].map(i => (
                          <div key={i} className="flex flex-col items-center gap-2">
                             <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center border border-white/20">
                                <Flame className="w-6 h-6 text-[#D4AF37]" />
                             </div>
                             <span className="text-[8px] font-bold text-white/60">بطل 7 أيام</span>
                          </div>
                       ))}
                    </div>
                 </div>
                 <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/10 rounded-full blur-3xl -mr-16 -mt-16" />
              </section>
            </motion.div>
         ) : (
            <motion.div
               key="calendar"
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -10 }}
               transition={{ duration: 0.2 }}
               className="space-y-6"
            >
              <div className="bg-white dark:bg-[#1A1A1A] p-4 rounded-3xl border border-[#1A2E1A]/5 dark:border-white/5 shadow-sm">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100 dark:border-white/5">
                  <div className="flex items-center gap-2 bg-gray-50 dark:bg-white/5 px-3 py-1.5 rounded-full border border-gray-200 dark:border-white/10">
                     <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full transition-colors">
                        <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-300" />
                     </button>
                     <span className="text-sm font-bold min-w-[100px] text-center dark:text-white">
                       {format(currentMonth, 'MMMM yyyy', { locale: ar })}
                     </span>
                     <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full transition-colors">
                        <ChevronLeft className="w-5 h-5 text-gray-400 dark:text-gray-300" />
                     </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 mb-4">
                  {['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'].map(day => (
                    <div key={day} className="text-center text-[10px] font-bold text-gray-400 dark:text-gray-500 py-2">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-y-4">
                  {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, i) => (
                     <div key={`empty-${i}`} />
                  ))}
                  
                  {days.map((day, i) => {
                    const log = getLogForDate(day);
                    const isCompleted = log?.tasks.every(t => t.completed) && log.tasks.length > 0;
                    const partiallyCompleted = log?.tasks.some(t => t.completed) && !isCompleted;
                    
                    return (
                      <div key={day?.toString() || i.toString()} className="flex flex-col items-center gap-1">
                        <div 
                          className={`
                            relative w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all
                            ${!isSameMonth(day, currentMonth) ? 'text-gray-200 dark:text-zinc-700' : 'text-gray-700 dark:text-zinc-300'}
                            ${isToday(day) ? 'bg-[#1A2E1A] dark:bg-[#D4AF37] text-white dark:text-[#1A1A1A] shadow-lg' : 'bg-transparent'}
                          `}
                        >
                          {day.getDate()}
                          {isCompleted && (
                            <CheckCircle2 className="absolute -top-1 -right-1 w-4 h-4 text-[#D4AF37] dark:text-[#1A2E1A] fill-white dark:fill-[#D4AF37]" />
                          )}
                          {partiallyCompleted && (
                            <div className="absolute -bottom-1 w-1.5 h-1.5 bg-orange-400 rounded-full" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Legend */}
              <div className="flex justify-center gap-6 text-[10px] font-bold text-gray-400 dark:text-gray-500 px-4">
                 <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 bg-[#D4AF37] rounded-full" />
                    <span>يوم مكتمل</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 bg-orange-400 rounded-full" />
                    <span>يوم متعثر</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 bg-[#1A2E1A] dark:bg-[#D4AF37] rounded-full" />
                    <span>اليوم</span>
                 </div>
              </div>

              {activePlan && (
                <section className="bg-[#1A2E1A] dark:bg-zinc-900 text-white p-6 rounded-3xl shadow-xl space-y-4">
                   <h3 className="font-bold">مراجعات اليوم</h3>
                   <div className="space-y-3">
                      {getLogForDate(new Date())?.tasks.filter(t => t.type === 'review' || t.type === 'cumulative_review').map(task => (
                         <div key={task.id} className="bg-white/10 dark:bg-white/5 p-3 rounded-2xl flex items-center justify-between border border-white/10">
                            <span className="text-xs font-medium">{task.title}</span>
                            <CheckCircle2 className={task.completed ? "text-[#D4AF37]" : "text-white/20"} />
                         </div>
                      )) || (
                         <p className="text-xs text-white/50 text-center py-4">لا توجد مراجعات محددة لليوم</p>                      )}
                   </div>
                </section>
              )}
            </motion.div>
         )}
      </AnimatePresence>
    </div>
  );
}
