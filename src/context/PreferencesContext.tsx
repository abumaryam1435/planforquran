import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthProvider';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db as firestoreDb } from '../firebase';

export interface AdhkarItem {
  dhikr: string;
  count: number;
}

export interface UserPreferences {
  globalAdhkarEnabled: boolean;
  globalAdhkarList: AdhkarItem[];
  autoDownloadWifi?: boolean; // legacy
  autoDownloadEnabled?: boolean;
  autoDownloadWifiOnly?: boolean;
  autoDownloadAudio?: boolean;
  initialDownloadCompleted?: boolean;
}

interface PreferencesContextType {
  preferences: UserPreferences;
  updatePreferences: (newPrefs: Partial<UserPreferences>) => Promise<void>;
}

const getDefaultList = () => [
  { dhikr: 'سبحان الله وبحمده', count: 100 },
  { dhikr: 'أستغفر الله العظيم وأتوب إليه', count: 100 },
  { dhikr: 'اللهم صل وسلم على نبينا محمد', count: 100 }
];

const PreferencesContext = createContext<PreferencesContextType>({
  preferences: { globalAdhkarEnabled: false, globalAdhkarList: getDefaultList(), autoDownloadWifi: true, autoDownloadEnabled: false, autoDownloadWifiOnly: true, autoDownloadAudio: false, initialDownloadCompleted: false },
  updatePreferences: async () => {},
});

export const usePreferences = () => useContext(PreferencesContext);

export const PreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  
  const getStorageKey = (key: string) => user ? `${key}_${user.uid}` : `${key}_guest`;

  const [preferences, setPreferences] = useState<UserPreferences>({
    globalAdhkarEnabled: false,
    globalAdhkarList: getDefaultList(),
    autoDownloadWifi: true,
    autoDownloadEnabled: false,
    autoDownloadWifiOnly: true,
    autoDownloadAudio: false,
    initialDownloadCompleted: false,
  });

  // Re-load from local storage when user changes
  useEffect(() => {
    const enabledKey = getStorageKey("global_adhkar_enabled");
    const listKey = getStorageKey("global_adhkar_list");
    const autoDlKey = getStorageKey("auto_download_wifi");
    const autoDlEnKey = getStorageKey("auto_dl_en");
    const autoDlWifiKey = getStorageKey("auto_dl_wifi_only");
    const autoDlAudioKey = getStorageKey("auto_dl_audio");
    const initialDlKey = getStorageKey("initial_dl_completed");
    
    const storedEnabled = localStorage.getItem(enabledKey);
    const storedList = localStorage.getItem(listKey);
    const storedAutoDl = localStorage.getItem(autoDlKey);
    const storedAutoDlEn = localStorage.getItem(autoDlEnKey);
    const storedAutoDlWifi = localStorage.getItem(autoDlWifiKey);
    const storedAutoDlAudio = localStorage.getItem(autoDlAudioKey);
    const storedInitialDl = localStorage.getItem(initialDlKey);
    
    let parsedList = getDefaultList();
    if (storedList) {
      try { parsedList = JSON.parse(storedList); } catch (e) {}
    }
    
    setPreferences({
      globalAdhkarEnabled: storedEnabled !== null ? storedEnabled === "true" : false,
      globalAdhkarList: parsedList,
      autoDownloadWifi: storedAutoDl !== null ? storedAutoDl === "true" : true,
      autoDownloadEnabled: storedAutoDlEn !== null ? storedAutoDlEn === "false" ? false : storedAutoDlEn === "true" : false,
      autoDownloadWifiOnly: storedAutoDlWifi !== null ? storedAutoDlWifi === "true" : true,
      autoDownloadAudio: storedAutoDlAudio !== null ? storedAutoDlAudio === "true" : false,
      initialDownloadCompleted: storedInitialDl !== null ? storedInitialDl === "true" : false,
    });
  }, [user]);

  // Sync to local storage whenever state changes
  useEffect(() => {
    const enabledKey = getStorageKey("global_adhkar_enabled");
    const listKey = getStorageKey("global_adhkar_list");
    const autoDlKey = getStorageKey("auto_download_wifi");
    const autoDlEnKey = getStorageKey("auto_dl_en");
    const autoDlWifiKey = getStorageKey("auto_dl_wifi_only");
    const autoDlAudioKey = getStorageKey("auto_dl_audio");
    const initialDlKey = getStorageKey("initial_dl_completed");
    
    localStorage.setItem(enabledKey, String(preferences.globalAdhkarEnabled));
    localStorage.setItem(listKey, JSON.stringify(preferences.globalAdhkarList));
    localStorage.setItem(autoDlKey, String(preferences.autoDownloadWifi ?? false));
    localStorage.setItem(autoDlEnKey, String(preferences.autoDownloadEnabled ?? true));
    localStorage.setItem(autoDlWifiKey, String(preferences.autoDownloadWifiOnly ?? true));
    localStorage.setItem(autoDlAudioKey, String(preferences.autoDownloadAudio ?? false));
    localStorage.setItem(initialDlKey, String(preferences.initialDownloadCompleted ?? false));
  }, [preferences, user]);

  // Sync with Firestore
  useEffect(() => {
    if (!user) return;
    const prefsRef = doc(firestoreDb, `users/${user.uid}/settings/preferences`);
    const unsubscribe = onSnapshot(prefsRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as UserPreferences;
        if (data.globalAdhkarList) {
          setPreferences((prev) => ({
            ...prev,
            globalAdhkarEnabled: data.globalAdhkarEnabled ?? prev.globalAdhkarEnabled,
            globalAdhkarList: data.globalAdhkarList,
            autoDownloadWifi: data.autoDownloadWifi ?? prev.autoDownloadWifi,
            autoDownloadEnabled: data.autoDownloadEnabled ?? prev.autoDownloadEnabled,
            autoDownloadWifiOnly: data.autoDownloadWifiOnly ?? prev.autoDownloadWifiOnly,
            autoDownloadAudio: data.autoDownloadAudio ?? prev.autoDownloadAudio,
            initialDownloadCompleted: data.initialDownloadCompleted ?? prev.initialDownloadCompleted,
          }));
        }
      }
    });
    return () => unsubscribe();
  }, [user]);

  const updatePreferences = async (newPrefs: Partial<UserPreferences>) => {
    // 1. Update local state instantly (optimistic update)
    const updated = { ...preferences, ...newPrefs };
    setPreferences(updated);

    // 2. Persist to Firestore if logged in
    if (user) {
      try {
        const prefsRef = doc(firestoreDb, `users/${user.uid}/settings/preferences`);
        await setDoc(prefsRef, {
          ...updated,
          updatedAt: serverTimestamp()
        }, { merge: true });
      } catch (err) {
        console.error("Failed to sync preferences to Firestore", err);
      }
    }
  };

  return (
    <PreferencesContext.Provider value={{ preferences, updatePreferences }}>
      {children}
    </PreferencesContext.Provider>
  );
};
