import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db as firestoreDb } from '../firebase';
import { db as dexieDb } from '../db/database';
import { useAuth } from './AuthProvider';
import { QuranPlan, ProgressLog, Achievement } from '../types';

interface RealtimeSyncContextType {
  syncing: boolean;
  onInitialSyncComplete: (() => void) | null;
}

const RealtimeSyncContext = createContext<RealtimeSyncContextType>({
  syncing: false,
  onInitialSyncComplete: null,
});

export const useRealtimeSync = () => useContext(RealtimeSyncContext);

export const RealtimeSyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!user) {
      setSyncing(false);
      return;
    }

    setSyncing(true);
    let plansReady = false;
    let progressReady = false;
    let achievementsReady = false;

    // Timeout to allow offline usage if Firebase cannot be reached quickly
    const timeoutId = setTimeout(() => {
      setSyncing(false);
    }, 3000);

    const checkInitialSync = () => {
      if (plansReady && progressReady && achievementsReady) {
        clearTimeout(timeoutId);
        setSyncing(false);
      }
    };

    const unsubscribes: (() => void)[] = [];

    // Sync Plans Collection
    const plansRef = collection(firestoreDb, `users/${user.uid}/plans`);
    const unsubPlans = onSnapshot(query(plansRef), async (snapshot) => {
      try {
        if (!plansReady) {
          // First snapshot: strict remote overwrite to clean up stale local data from other devices
          const remoteIds = new Set<number>();
          const plansToPut: QuranPlan[] = [];
          
          snapshot.docs.forEach(doc => {
            const id = Number(doc.id);
            remoteIds.add(id);
            plansToPut.push({ ...(doc.data() as QuranPlan), id });
          });
          
          // Get all current local IDs
          const localIds = await dexieDb.plans.toCollection().primaryKeys();
          const idsToDelete = localIds.filter(id => !remoteIds.has(id as number));
          
          if (plansToPut.length > 0) await dexieDb.plans.bulkPut(plansToPut);
          if (idsToDelete.length > 0) await dexieDb.plans.bulkDelete(idsToDelete as number[]);
        } else {
          // Subsequent incremental updates
          const plansToPut: QuranPlan[] = [];
          const idsToDelete: number[] = [];

          snapshot.docChanges().forEach((change) => {
            const id = Number(change.doc.id);
            if (change.type === 'added' || change.type === 'modified') {
              plansToPut.push({ ...(change.doc.data() as QuranPlan), id });
            } else if (change.type === 'removed') {
              idsToDelete.push(id);
            }
          });

          if (plansToPut.length > 0) await dexieDb.plans.bulkPut(plansToPut);
          if (idsToDelete.length > 0) await dexieDb.plans.bulkDelete(idsToDelete);
        }
      } catch (error) {
        console.error('Realtime Sync plans processing error:', error);
      } finally {
        if (!plansReady) {
          plansReady = true;
          checkInitialSync();
        }
      }
    }, (error) => {
      console.error('Firestore Plans subscription error:', error);
      if (!plansReady) {
        plansReady = true;
        checkInitialSync();
      }
    });
    unsubscribes.push(unsubPlans);

    // Sync Progress Collection
    const progressRef = collection(firestoreDb, `users/${user.uid}/progress`);
    const unsubProgress = onSnapshot(query(progressRef), async (snapshot) => {
      try {
        if (!progressReady) {
          const remoteIds = new Set<number>();
          const progressToPut: ProgressLog[] = [];
          
          snapshot.docs.forEach(doc => {
            const id = Number(doc.id);
            remoteIds.add(id);
            progressToPut.push({ ...(doc.data() as ProgressLog), id });
          });
          
          const localIds = await dexieDb.progress.toCollection().primaryKeys();
          const idsToDelete = localIds.filter(id => !remoteIds.has(id as number));
          
          if (progressToPut.length > 0) await dexieDb.progress.bulkPut(progressToPut);
          if (idsToDelete.length > 0) await dexieDb.progress.bulkDelete(idsToDelete as number[]);
        } else {
          const progressToPut: ProgressLog[] = [];
          const idsToDelete: number[] = [];

          snapshot.docChanges().forEach((change) => {
            const id = Number(change.doc.id);
            if (change.type === 'added' || change.type === 'modified') {
              progressToPut.push({ ...(change.doc.data() as ProgressLog), id });
            } else if (change.type === 'removed') {
              idsToDelete.push(id);
            }
          });

          if (progressToPut.length > 0) await dexieDb.progress.bulkPut(progressToPut);
          if (idsToDelete.length > 0) await dexieDb.progress.bulkDelete(idsToDelete);
        }
      } catch (error) {
        console.error('Realtime Sync progress processing error:', error);
      } finally {
        if (!progressReady) {
          progressReady = true;
          checkInitialSync();
        }
      }
    }, (error) => {
      console.error('Firestore Progress subscription error:', error);
      if (!progressReady) {
        progressReady = true;
        checkInitialSync();
      }
    });
    unsubscribes.push(unsubProgress);

    // Sync Achievements Collection
    const achievementsRef = collection(firestoreDb, `users/${user.uid}/achievements`);
    const unsubAchievements = onSnapshot(query(achievementsRef), async (snapshot) => {
      try {
        if (!achievementsReady) {
          const remoteIds = new Set<number>();
          const achToPut: Achievement[] = [];
          
          snapshot.docs.forEach(doc => {
            const id = Number(doc.id);
            remoteIds.add(id);
            achToPut.push({ ...(doc.data() as Achievement), id });
          });
          
          const localIds = await dexieDb.achievements.toCollection().primaryKeys();
          const idsToDelete = localIds.filter(id => !remoteIds.has(id as number));
          
          if (achToPut.length > 0) await dexieDb.achievements.bulkPut(achToPut);
          if (idsToDelete.length > 0) await dexieDb.achievements.bulkDelete(idsToDelete as number[]);
        } else {
          const achToPut: Achievement[] = [];
          const idsToDelete: number[] = [];

          snapshot.docChanges().forEach((change) => {
            const id = Number(change.doc.id);
            if (change.type === 'added' || change.type === 'modified') {
              achToPut.push({ ...(change.doc.data() as Achievement), id });
            } else if (change.type === 'removed') {
              idsToDelete.push(id);
            }
          });

          if (achToPut.length > 0) await dexieDb.achievements.bulkPut(achToPut);
          if (idsToDelete.length > 0) await dexieDb.achievements.bulkDelete(idsToDelete);
        }
      } catch (error) {
        console.error('Realtime Sync achievements processing error:', error);
      } finally {
        if (!achievementsReady) {
          achievementsReady = true;
          checkInitialSync();
        }
      }
    }, (error) => {
      console.error('Firestore Achievements subscription error:', error);
      if (!achievementsReady) {
        achievementsReady = true;
        checkInitialSync();
      }
    });
    unsubscribes.push(unsubAchievements);

    return () => {
      clearTimeout(timeoutId);
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [user]);

  return (
    <RealtimeSyncContext.Provider value={{ syncing, onInitialSyncComplete: null }}>
      {children}
    </RealtimeSyncContext.Provider>
  );
};
export default RealtimeSyncProvider;
