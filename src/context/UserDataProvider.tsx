import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthProvider';
import { useRealtimeSync } from './RealtimeSyncProvider';
import { db } from '../db/database';
import { QuranPlan, ProgressLog, Achievement } from '../types';
import { useLiveQuery } from 'dexie-react-hooks';

interface UserDataContextType {
  activePlan: QuranPlan | undefined;
  plans: QuranPlan[];
  progressLogs: ProgressLog[];
  achievements: Achievement[];
  loading: boolean;
  syncing: boolean;
  selectedPlanId: number | null;
  setSelectedPlanId: (id: number | null) => void;
}

const UserDataContext = createContext<UserDataContextType | undefined>(undefined);

export const useUserData = () => {
  const context = useContext(UserDataContext);
  if (!context) {
    throw new Error('useUserData must be used within a UserDataProvider');
  }
  return context;
};

export const UserDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const { syncing } = useRealtimeSync();

  const [selectedPlanId, setSelectedPlanIdState] = useState<number | null>(() => {
    const saved = localStorage.getItem('selectedPlanId');
    return saved ? parseInt(saved, 10) : null;
  });

  const setSelectedPlanId = (id: number | null) => {
    setSelectedPlanIdState(id);
    if (id !== null) {
      localStorage.setItem('selectedPlanId', id.toString());
    } else {
      localStorage.removeItem('selectedPlanId');
    }
  };

  // Reactive queries from the active database
  const rawPlans = useLiveQuery(() => db.plans.toArray(), [user?.uid]);
  const rawProgressLogs = useLiveQuery(() => db.progress.toArray(), [user?.uid]);
  const rawAchievements = useLiveQuery(() => db.achievements.toArray(), [user?.uid]);

  const plans = rawPlans || [];
  
  let activePlan: QuranPlan | undefined;
  if (selectedPlanId) {
    activePlan = plans.find(p => p.id === selectedPlanId);
  }
  if (!activePlan && plans.length > 0) {
    activePlan = plans.find(p => p.status === 'active') || plans[0];
  }

  const progressLogs = rawProgressLogs || [];
  const achievements = rawAchievements || [];

  const isDbLoading = rawPlans === undefined;

  const value: UserDataContextType = {
    activePlan,
    plans,
    progressLogs,
    achievements,
    loading: authLoading || isDbLoading,
    syncing,
    selectedPlanId,
    setSelectedPlanId
  };

  return (
    <UserDataContext.Provider value={value}>
      {children}
    </UserDataContext.Provider>
  );
};

export default UserDataProvider;
