import { 
  doc, 
  setDoc, 
  deleteDoc, 
  getDocs, 
  collection, 
  query, 
  where, 
  writeBatch, 
  serverTimestamp, 
  getDoc,
  DocumentReference
} from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { QuranPlan, ProgressLog, Achievement } from '../types';

export class FirestoreRepository {
  /**
   * Safe check for currently active user UID.
   */
  private static requireUserId(userId?: string): string {
    if (!userId) {
      throw new Error(JSON.stringify({
        error: "Unauthenticated write or read attempted on Firestore path",
        authInfo: null,
        operationType: OperationType.WRITE,
        path: null
      }));
    }
    return userId;
  }

  /**
   * Recursively sanitizes data by removing any properties with undefined values.
   * This is crucial to prevent Firestore from throwing "Unsupported field value: undefined" errors.
   */
  private static sanitizeData<T>(obj: T): T {
    if (obj === null || obj === undefined) {
      return null as unknown as T;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeData(item)) as unknown as T;
    }

    if (typeof obj === 'object') {
      const sanitized: any = {};
      for (const key of Object.keys(obj)) {
        const val = (obj as any)[key];
        if (val !== undefined) {
          sanitized[key] = this.sanitizeData(val);
        }
      }
      return sanitized as T;
    }

    return obj;
  }

  /**
   * Save or update a User Profile Document
   */
  static async saveProfile(userId: string, data: { email: string | null; displayName: string | null }): Promise<void> {
    const path = `users/${userId}`;
    try {
      const userRef = doc(db, 'users', userId);
      const payload = this.sanitizeData({
        uid: userId,
        email: data.email,
        displayName: data.displayName,
        createdAt: serverTimestamp(), // If updating, use merge so it keeps the first one if preferred, or standard
        updatedAt: serverTimestamp()
      });
      await setDoc(userRef, payload, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  /**
   * Save a memorization plan to Firestore
   */
  static async savePlan(userId: string, plan: QuranPlan & { id: number }): Promise<void> {
    const safeUserId = this.requireUserId(userId);
    const path = `users/${safeUserId}/plans/${plan.id}`;
    try {
      const planRef = doc(db, path);
      // Ensure we merge dates or set them properly
      const payload = this.sanitizeData({
        ...plan,
        userId: safeUserId,
        createdAt: plan.createdAt ? plan.createdAt : serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      await setDoc(planRef, payload, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  /**
   * Delete a plan and all its associated progress logs inside a batch
   */
  static async deletePlan(userId: string, planId: number): Promise<void> {
    const safeUserId = this.requireUserId(userId);
    const planPath = `users/${safeUserId}/plans/${planId}`;
    try {
      const batch = writeBatch(db);
      
      // Delete the plan
      const planRef = doc(db, planPath);
      batch.delete(planRef);

      // Query and delete all progress documents for this plan
      const progressPath = `users/${safeUserId}/progress`;
      const progressQuery = query(collection(db, progressPath), where('planId', '==', planId));
      const progressSnap = await getDocs(progressQuery);
      
      progressSnap.forEach(snap => {
        batch.delete(snap.ref);
      });

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, planPath);
    }
  }

  /**
   * Save a daily tasks progress log to Firestore
   */
  static async saveProgress(userId: string, progress: ProgressLog & { id: number }): Promise<void> {
    const safeUserId = this.requireUserId(userId);
    const path = `users/${safeUserId}/progress/${progress.id}`;
    try {
      const progressRef = doc(db, path);
      const payload = this.sanitizeData({
        ...progress,
        userId: safeUserId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      await setDoc(progressRef, payload, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  /**
   * Save achievement to Firestore
   */
  static async saveAchievement(userId: string, achievement: Achievement & { id: number }): Promise<void> {
    const safeUserId = this.requireUserId(userId);
    const path = `users/${safeUserId}/achievements/${achievement.id}`;
    try {
      const achRef = doc(db, path);
      const payload = this.sanitizeData({
        ...achievement,
        userId: safeUserId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      await setDoc(achRef, payload, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  /**
   * Clear all user data from Firestore
   */
  static async clearAllUserData(userId: string): Promise<void> {
    const safeUserId = this.requireUserId(userId);
    const baseRootPath = `users/${safeUserId}`;
    try {
      const batch = writeBatch(db);
      
      // Plans
      const plansRef = collection(db, `${baseRootPath}/plans`);
      const plansSnap = await getDocs(plansRef);
      plansSnap.forEach(d => batch.delete(d.ref));

      // Progress
      const progressRef = collection(db, `${baseRootPath}/progress`);
      const progressSnap = await getDocs(progressRef);
      progressSnap.forEach(d => batch.delete(d.ref));

      // Achievements
      const achRef = collection(db, `${baseRootPath}/achievements`);
      const achSnap = await getDocs(achRef);
      achSnap.forEach(d => batch.delete(d.ref));

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, baseRootPath);
    }
  }
}
