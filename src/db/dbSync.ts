import { db as dexieDb } from './database';
import { auth } from '../firebase';
import { FirestoreRepository } from '../services/FirestoreRepository';
import { QuranPlan, ProgressLog, Achievement } from '../types';

/**
 * Gets a clean new ID for a table, handling auto-increment safely across in-memory or on-disk storage.
 */
const getNextId = async (tableName: 'plans' | 'progress' | 'achievements'): Promise<number> => {
  try {
    const table = dexieDb[tableName] as any;
    const allRecords = await table.toArray();
    if (!allRecords || allRecords.length === 0) return 1;
    const maxId = allRecords.reduce((max: number, item: any) => {
      const numId = typeof item.id === 'number' ? item.id : parseInt(item.id, 10);
      return !isNaN(numId) && numId > max ? numId : max;
    }, 0);
    return maxId + 1;
  } catch (e) {
    console.error(`Error calculating next ID for ${tableName}:`, e);
    return Date.now();
  }
};

/**
 * Save or update a Quran Plan.
 */
export const savePlan = async (plan: Omit<QuranPlan, 'id'>, id?: number): Promise<number> => {
  const userId = auth.currentUser?.uid;
  let resolvedId = id;

  if (!resolvedId) {
    resolvedId = await getNextId('plans');
  }

  const currentPlan: QuranPlan & { id: number } = {
    ...plan,
    id: resolvedId,
    createdAt: plan.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // 1. Commit to current active db (either guest IndexedDB or guest in-memory)
  await dexieDb.plans.put(currentPlan);

  // 2. If user is logged in, commit directly to Cloud Firestore
  if (userId) {
    try {
      // Fire and forget to not block UI if offline and Firebase hangs
      FirestoreRepository.savePlan(userId, currentPlan).catch(e => {
        console.error('Error syncing plan save to Firestore:', e);
      });
    } catch (e) {
      console.error('Error initiating sync plan save to Firestore:', e);
    }
  }

  return resolvedId;
};

/**
 * Pause all currently active plans.
 */
export const pauseActivePlans = async (): Promise<void> => {
  const userId = auth.currentUser?.uid;
  const activePlans = await dexieDb.plans.where('status').equals('active').toArray();

  for (const plan of activePlans) {
    if (plan.id) {
      const updatedPlan: QuranPlan = {
        ...plan,
        status: 'paused',
        updatedAt: new Date().toISOString()
      };

      await dexieDb.plans.put(updatedPlan);

      if (userId) {
        try {
          await FirestoreRepository.savePlan(userId, updatedPlan as QuranPlan & { id: number });
        } catch (e) {
          console.error(`Error syncing paused plan ${plan.id} to Firestore:`, e);
        }
      }
    }
  }
};

/**
 * Save or update progress logs.
 */
export const saveProgress = async (progress: Omit<ProgressLog, 'id'>, id?: number): Promise<number> => {
  const userId = auth.currentUser?.uid;
  let resolvedId = id;

  if (!resolvedId) {
    resolvedId = await getNextId('progress');
  }

  const currentProgress: ProgressLog & { id: number } = {
    ...progress,
    id: resolvedId
  };

  // 1. Commit to currently active db (either guest IndexedDB or active in-memory)
  await dexieDb.progress.put(currentProgress);

  // 2. If user is logged in, sync directly to Cloud Firestore
  if (userId) {
    try {
      FirestoreRepository.saveProgress(userId, currentProgress).catch(e => {
        console.error('Error syncing progress save to Firestore:', e);
      });
    } catch (e) {
      console.error('Error initiating sync progress save to Firestore:', e);
    }
  }

  return resolvedId;
};

/**
 * Delete a specific plan and its associated progress logs.
 */
export const deletePlan = async (planId: number): Promise<void> => {
  const userId = auth.currentUser?.uid;

  // 1. Delete progress and plans in standard active db (guest IndexedDB or dynamic in-memory)
  await dexieDb.plans.delete(planId);
  await dexieDb.progress.where('planId').equals(planId).delete();

  // 2. If user is logged in, trigger Firestore purge
  if (userId) {
    try {
      FirestoreRepository.deletePlan(userId, planId).catch(e => {
        console.error('Error syncing plan deletion to Firestore:', e);
      });
    } catch (e) {
      console.error('Error initiating sync plan deletion to Firestore:', e);
    }
  }
};

/**
 * Clear all current user/guest data.
 */
export const clearAllData = async (): Promise<void> => {
  const userId = auth.currentUser?.uid;

  // 1. Reset current active database (either guest disk database or dynamic in-memory)
  await dexieDb.plans.clear();
  await dexieDb.progress.clear();
  await dexieDb.achievements.clear();

  // 2. If user is logged in, perform Firestore documents deletion
  if (userId) {
    try {
      await FirestoreRepository.clearAllUserData(userId);
    } catch (e) {
      console.error('Error syncing clear all user data to Firestore:', e);
    }
  }
};
