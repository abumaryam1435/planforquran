import Dexie, { type Table } from 'dexie';
import fakeIndexedDB from 'fake-indexeddb';
import fakeIDBKeyRange from 'fake-indexeddb/lib/FDBKeyRange';
import { QuranPlan, ProgressLog, Achievement } from '../types';

function checkSafariIDBFunctional(): boolean {
  if (typeof window === 'undefined') return true;
  if (!window.indexedDB || !window.IDBKeyRange) return false;
  try {
    const req = window.indexedDB.open('__idb_safari_check__', 1);
    req.onerror = () => {};
    req.onsuccess = () => {
      try { req.result.close(); } catch {}
    };
    return true;
  } catch (e) {
    return false;
  }
}

export class QuranDatabase extends Dexie {
  plans!: Table<QuranPlan>;
  progress!: Table<ProgressLog>;
  achievements!: Table<Achievement>;

  constructor(dbName: string, isInMemory: boolean = false) {
    const useMemory = isInMemory || !checkSafariIDBFunctional();
    if (useMemory) {
      super(dbName, {
        indexedDB: fakeIndexedDB,
        IDBKeyRange: fakeIDBKeyRange
      });
    } else {
      super(dbName);
    }
    this.version(2).stores({
      plans: '++id, juzNumber, status, startDate',
      progress: '++id, planId, date, [planId+date]',
      achievements: '++id, type, dateEarned'
    });
  }
}

// Keep track of the active database name, state, and instance
let activeDbName = 'QuranPlannerDB_guest';
let activeDbIsInMemory = !checkSafariIDBFunctional();
let activeDb = new QuranDatabase(activeDbName, activeDbIsInMemory);

export function getActiveDb(): QuranDatabase {
  return activeDb;
}

// Function to switch the active database
export function switchDatabase(userId: string | null) {
  // Always use standard IndexedDB for persistent offline capabilities, separated by userId
  const isInMemory = !checkSafariIDBFunctional();
  const newName = userId ? `QuranPlannerDB_${userId}` : 'QuranPlannerDB_guest';
  
  if (activeDbName !== newName || activeDbIsInMemory !== isInMemory) {
    activeDbName = newName;
    activeDbIsInMemory = isInMemory;
    try {
      if (activeDb && typeof activeDb.close === 'function') {
        activeDb.close();
      }
    } catch (e) {
      console.error('Error closing database:', e);
    }
    activeDb = new QuranDatabase(newName, isInMemory);
  }
}

// Export a Proxy that delegates all property/method access to the activeDb
export const db = new Proxy({}, {
  get(target, prop, receiver) {
    const dbInst = getActiveDb();
    const val = Reflect.get(dbInst, prop);
    if (typeof val === 'function') {
      return val.bind(dbInst);
    }
    return val;
  },
  set(target, prop, value, receiver) {
    const dbInst = getActiveDb();
    return Reflect.set(dbInst, prop, value);
  }
}) as QuranDatabase;
