import { getSevenCastlesTasksForDate, getTasksForDate } from './src/utils/planGenerator.ts';
import { DailyAmount } from './src/types/index.ts';
import { addDays, startOfDay } from 'date-fns';

const plan: any = {
  id: 'test',
  planType: 'memorization',
  isSevenCastles: true,
  startPage: 1,
  endPage: 42,
  dailyAmount: DailyAmount.ONE_PAGE, 
  startDate: startOfDay(new Date()).toISOString(),
  hasOldMemorization: true,
  oldMemorizedPages: [1,2,3,4,5] // test old mem
};

const d0 = new Date(plan.startDate);
const day71 = addDays(d0, 70); // Week 11 Day 1
const day72 = addDays(d0, 71); // Week 11 Day 2

console.log("Day 71:", getSevenCastlesTasksForDate(day71, plan).map(t => t.title));
console.log("Day 72:", getSevenCastlesTasksForDate(day72, plan).map(t => t.title));
console.log("Day 2 (Old review check):", getTasksForDate(addDays(d0, 1), plan).map(t => t.title).filter(t => t.includes('تراكمي')));
