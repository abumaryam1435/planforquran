import { QuranPlan } from '../types';
import { savePlan, pauseActivePlans } from '../db/dbSync';
import { format } from 'date-fns';
import { JUZ_PAGES, parsePlanDate } from './planGenerator';

export interface ExportedQuranPlanPackage {
  format: 'quran_plan_package';
  version: number;
  appName: string;
  exportedAt: string;
  metadata: {
    planName: string;
    planType: string;
    planTypeArabic: string;
    summary: string;
    startPage: number;
    endPage: number;
    totalPages: number;
  };
  plan: Omit<QuranPlan, 'id'>;
}

export function getPlanTypeArabic(plan: Partial<QuranPlan>): string {
  if (plan.isSevenCastles) return 'منظومة القلاع السبع';
  if (plan.planType === 'review') return 'خطة مراجعة وتثبيت';
  if (plan.planType === 'flexible') return 'خطة حفظ مرنة';
  if (plan.planType === 'juz') {
    return plan.juzNumber ? `خطة حفظ الجزء ${plan.juzNumber}` : 'خطة حفظ الأجزاء';
  }
  return 'خطة حفظ القرآن الكريم';
}

export function getPlanSummaryText(plan: Partial<QuranPlan>): string {
  const typeAr = getPlanTypeArabic(plan);
  const startP = plan.startPage || 1;
  const endP = plan.endPage || 604;
  const totalP = Math.abs(endP - startP) + 1;

  if (plan.isSevenCastles) {
    return `${typeAr} (تثبيت تراكمي شامل - ٧٧ يوماً)`;
  }
  if (plan.planType === 'review') {
    if (plan.isSpecificReview && plan.selectedReviewSurahs?.length) {
      return `${typeAr} (السور: ${plan.selectedReviewSurahs.slice(0, 3).join('، ')}${plan.selectedReviewSurahs.length > 3 ? '...' : ''})`;
    }
    if (plan.isSpecificReview && plan.selectedReviewJuzs?.length) {
      return `${typeAr} (الأجزاء: ${plan.selectedReviewJuzs.sort((a, b) => a - b).join('، ')})`;
    }
    return `${typeAr} (${totalP} صفحة)`;
  }
  return `${typeAr} (من ص ${Math.min(startP, endP)} إلى ص ${Math.max(startP, endP)} - ${totalP} صفحة)`;
}

export function generatePlanExportPackage(plan: QuranPlan): ExportedQuranPlanPackage {
  // Clean clone without internal database primary key
  const { id, ...cleanPlan } = plan;

  const planName = cleanPlan.name || getPlanTypeArabic(cleanPlan);
  const startP = cleanPlan.startPage || 1;
  const endP = cleanPlan.endPage || 604;
  const totalP = Math.abs(endP - startP) + 1;

  return {
    format: 'quran_plan_package',
    version: 1,
    appName: 'خطة حفظ القرآن',
    exportedAt: new Date().toISOString(),
    metadata: {
      planName,
      planType: cleanPlan.planType || 'memorization',
      planTypeArabic: getPlanTypeArabic(cleanPlan),
      summary: getPlanSummaryText(cleanPlan),
      startPage: startP,
      endPage: endP,
      totalPages: totalP
    },
    plan: {
      ...cleanPlan,
      status: 'active'
    }
  };
}

export function exportPlanToFile(plan: QuranPlan, fileFormat: 'qplan' | 'json' = 'qplan'): { fileName: string; jsonString: string } {
  const pkg = generatePlanExportPackage(plan);
  const jsonString = JSON.stringify(pkg, null, 2);

  const rawName = plan.name || getPlanTypeArabic(plan);
  const cleanName = rawName.replace(/[\s\/\\:*?"<>|]+/g, '_');
  const dateStr = format(new Date(), 'yyyy-MM-dd');
  const fileName = `خطة_${cleanName}_${dateStr}.${fileFormat}`;

  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return { fileName, jsonString };
}

export function exportPlanToString(plan: QuranPlan, pretty = true): string {
  const pkg = generatePlanExportPackage(plan);
  return JSON.stringify(pkg, null, pretty ? 2 : undefined);
}

export function exportPlanToCompactString(plan: QuranPlan): string {
  return exportPlanToString(plan, false);
}

export interface ParsePlanResult {
  valid: boolean;
  error?: string;
  package?: ExportedQuranPlanPackage;
  plan?: Omit<QuranPlan, 'id'>;
  summary?: string;
  planName?: string;
}

export function parsePlanJSON(input: string): ParsePlanResult {
  try {
    const trimmed = input.trim();
    if (!trimmed) {
      return { valid: false, error: 'النص المدخل فارغ' };
    }

    let parsed: any;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      // Try parsing if wrapped or base64 encoded
      try {
        const decoded = atob(trimmed);
        parsed = JSON.parse(decoded);
      } catch {
        return { valid: false, error: 'صيغة الملف أو النص غير صالحة (ليس بصيغة JSON معتمدة)' };
      }
    }

    let rawPlan: any = null;
    let pkg: ExportedQuranPlanPackage | undefined = undefined;

    if (parsed.format === 'quran_plan_package' && parsed.plan) {
      pkg = parsed;
      rawPlan = parsed.plan;
    } else if (parsed.startPage !== undefined || parsed.dailyAmount !== undefined || parsed.isSevenCastles !== undefined || parsed.planType !== undefined) {
      // Direct raw QuranPlan object
      rawPlan = parsed;
    } else {
      return { valid: false, error: 'الملف لا يحتوي على بيانات خطة قرآنية صحيحة' };
    }

    if (!rawPlan || typeof rawPlan !== 'object') {
      return { valid: false, error: 'بيانات الخطة غير صالحة' };
    }

    // Ensure required structure & sanitize
    const cleanPlan: Omit<QuranPlan, 'id'> = {
      ...rawPlan,
      startPage: Number(rawPlan.startPage) || 1,
      endPage: Number(rawPlan.endPage) || 604,
      dailyAmount: rawPlan.dailyAmount || 'one_page',
      startDate: rawPlan.startDate || format(new Date(), 'yyyy-MM-dd'),
      status: 'active',
      createdAt: rawPlan.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      name: rawPlan.name || pkg?.metadata?.planName || getPlanTypeArabic(rawPlan)
    };

    delete (cleanPlan as any).id;

    const planName = cleanPlan.name || getPlanTypeArabic(cleanPlan);
    const summary = pkg?.metadata?.summary || getPlanSummaryText(cleanPlan);

    return {
      valid: true,
      package: pkg,
      plan: cleanPlan,
      summary,
      planName
    };
  } catch (err: any) {
    return {
      valid: false,
      error: `حدث خطأ أثناء قراءة الخطة: ${err?.message || 'خطأ غير معروف'}`
    };
  }
}

export interface ImportOptions {
  startDateMode?: 'today' | 'original' | 'custom';
  customStartDate?: string;
  customName?: string;
  pauseOtherPlans?: boolean;
}

export async function importPlan(
  planToImport: Omit<QuranPlan, 'id'>,
  options: ImportOptions = {}
): Promise<{ success: boolean; planId: number; error?: string }> {
  try {
    const {
      startDateMode = 'original',
      customStartDate,
      customName,
      pauseOtherPlans = false
    } = options;

    let targetStartDate = planToImport.startDate || format(new Date(), 'yyyy-MM-dd');
    let firstDayOfWeek = planToImport.firstDayOfWeek !== undefined ? planToImport.firstDayOfWeek : 0;

    if (startDateMode === 'original' && planToImport.startDate) {
      targetStartDate = planToImport.startDate;
      firstDayOfWeek = planToImport.firstDayOfWeek !== undefined ? planToImport.firstDayOfWeek : parsePlanDate(targetStartDate).getDay();
    } else if (startDateMode === 'today') {
      targetStartDate = format(new Date(), 'yyyy-MM-dd');
      firstDayOfWeek = parsePlanDate(targetStartDate).getDay();
    } else if (startDateMode === 'custom' && customStartDate) {
      targetStartDate = customStartDate;
      firstDayOfWeek = parsePlanDate(targetStartDate).getDay();
    }

    if (pauseOtherPlans) {
      await pauseActivePlans();
    }

    const finalPlan: Omit<QuranPlan, 'id'> = {
      ...planToImport,
      startDate: targetStartDate,
      firstDayOfWeek: firstDayOfWeek,
      status: 'active',
      name: customName?.trim() || planToImport.name || getPlanTypeArabic(planToImport),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const newPlanId = await savePlan(finalPlan);

    // Save as active plan in localStorage
    localStorage.setItem('selectedPlanId', newPlanId.toString());

    return {
      success: true,
      planId: newPlanId
    };
  } catch (err: any) {
    console.error('Failed to import plan:', err);
    return {
      success: false,
      planId: 0,
      error: err?.message || 'فشل استيراد الخطة'
    };
  }
}
