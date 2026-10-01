const fs = require('fs');
const content = fs.readFileSync('src/utils/planGenerator.ts', 'utf8');

// Find the corrupted line
const searchStr = `          targeexport const getPlanStats = (plan: QuranPlan, allLogs: ProgressLog[]) => {`;
if (!content.includes(searchStr)) {
  console.log("NOT FOUND");
  process.exit(1);
}

const restoreCode = `          targetCount: 1,
          currentCount: 0,
          pages: Pg34_pages
        });
      }
      break;
    }

    case 6: { // Day 7
      if (PgAll_pages.length > 0 && week < neededWeeks - 1) {
        tasks.push({
          id: \`sc-rev-week-\${dateStr}\`,
          title: \`مراجعة \${PgAll_desc}\`,
          type: TaskType.REVIEW,
          completed: false,
          targetCount: 1,
          currentCount: 0,
          pages: PgAll_pages
        });

        let pagesToRecitate = PgAll_pages;
        let recitationTitle = "";
        
        if (week === 0) {
          recitationTitle = \`تسميع \${PgAll_desc}\`;
        } else {
          // get pages for previous week
          const prevMemDay1 = (week - 1) * 4 + 1;
          const prevMemDay2 = (week - 1) * 4 + 2;
          const prevMemDay3 = (week - 1) * 4 + 3;
          const prevMemDay4 = (week - 1) * 4 + 4;
          
          const prevPg1_units = getUnitsForMemDay(prevMemDay1, units, A);
          const prevPg2_units = getUnitsForMemDay(prevMemDay2, units, A);
          const prevPg3_units = getUnitsForMemDay(prevMemDay3, units, A);
          const prevPg4_units = getUnitsForMemDay(prevMemDay4, units, A);
          
          const prevUnitsAll = [...prevPg1_units, ...prevPg2_units, ...prevPg3_units, ...prevPg4_units];
          const combinedUnits = [...prevUnitsAll, ...PgAll_units];

          const prevPg1 = getPagesForMemDay(prevMemDay1);
          const prevPg2 = getPagesForMemDay(prevMemDay2);
          const prevPg3 = getPagesForMemDay(prevMemDay3);
          const prevPg4 = getPagesForMemDay(prevMemDay4);
          
          const prevPgAll = [...new Set([...prevPg1, ...prevPg2, ...prevPg3, ...prevPg4])].sort((a,b) => a-b);
          const combinedPageList = [...new Set([...prevPgAll, ...PgAll_pages])].sort((a,b) => a-b);
          pagesToRecitate = combinedPageList;
          recitationTitle = \`تسميع \${formatUnitsTitle(combinedUnits)}\`;
        }

        tasks.push({
          id: \`sc-rec-week-\${dateStr}\`,
          title: recitationTitle,
          type: TaskType.RECITATION,
          completed: false,
          targetCount: 1,
          currentCount: 0,
          pages: pagesToRecitate
        });
      }
      break;
    }
  }

  const targetK = d + 1; // 1 to 7
  const compWeek = Math.floor((targetK * 6 - 1) / 4);
  if (week > compWeek || (week === 10 && targetK === 7)) {
    const cPages = getCastlePages(targetK);
    const castleUnits = units.filter(u => u.pages.some(p => cPages.includes(p)));
    if (cPages.length > 0) {
      tasks.push({
        id: \`sc-castle-rev-\${targetK - 1}-\${dateStr}\`,
        title: \`مراجعة القلعة \${getCastleNameAr(targetK - 1)}: \${formatUnitsTitle(castleUnits)}\`,
        type: TaskType.REVIEW,
        completed: false,
        targetCount: 1,
        currentCount: 0,
        pages: cPages
      });
    }
  }

  return tasks;
};

export const getTasksForDate = (date: Date, plan: QuranPlan, allLogs: ProgressLog[]): Task[] => {
  const baseTasks = getTasksForDateBaseNew(date, plan, allLogs);

  let shouldAddOldReview = true;
  
  if (!plan.isFlexible && !plan.isSevenCastles && plan.planType !== 'review') {
      const realD = getDay(startOfDay(date));
      const planD = (realD - (plan.firstDayOfWeek || 0) + 7) % 7; 
      // User says: الأيام الأول والثالث والخامس والسادس والسابع
      // This maps to planD 0, 2, 4, 5, 6
      if (![0, 2, 4, 5, 6].includes(planD)) {
        shouldAddOldReview = false;
      }
  }

  if (plan.isFlexible && plan.flexibleDayConfigs) {
    const realD = getDay(startOfDay(date));
    const config = plan.flexibleDayConfigs[realD];
    if (!config || !config.hasOldMemorizationReview) {
      shouldAddOldReview = false;
    }
  }

  // Abort early ONLY if there are no base tasks AND we shouldn't add an old review
  if (baseTasks.length === 0 && !shouldAddOldReview) return [];

  let finalTasks = [...baseTasks];
  if (shouldAddOldReview) {
    const oldReviewTask = getOldMemorizedReviewTask(date, plan);
    if (oldReviewTask) {
      if (Array.isArray(oldReviewTask)) {
        finalTasks.push(...oldReviewTask);
      } else {
        finalTasks.push(oldReviewTask);
      }
    }
  }

  if (plan.addAdhkar && plan.adhkarList && plan.adhkarList.length > 0) {
    const dateStr = format(date, 'yyyyMMdd');
    plan.adhkarList.forEach((a, index) => {
      finalTasks.push({
        id: \`dhikr-\${dateStr}-\${index}\`,
        title: a.dhikr,
        type: TaskType.DHIKR,
        completed: false,
        targetCount: a.count || 1,
        dhikr: a.dhikr, // optional property for display if needed
        currentCount: 0,
        pages: []
      });
    });
  }
  
  return finalTasks.map(task => {
    if ((task.type === TaskType.REVIEW || task.title.includes('مراجعة') || task.title.includes('المراجعة')) && !task.title.includes('غيبا')) {
      return { ...task, title: task.title.trim() + ' غيباً' };
    }
    return task;
  });
};

export const getPlanStats = (plan: QuranPlan, allLogs: ProgressLog[]) => {`;

const newContent = content.replace(searchStr, restoreCode);

// We also need to delete the duplicate unoptimized `else` block that is at the end of the file.
// The new getPlanStats block goes from `export const getPlanStats =` up to the end of the file.
fs.writeFileSync('src/utils/planGenerator.ts', newContent);
console.log("FIXED");
