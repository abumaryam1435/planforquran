import { useEffect, useRef } from 'react';
import { usePreferences } from '../context/PreferencesContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { getTasksForDate } from '../utils/planGenerator';
import { startOfDay } from 'date-fns';
import { downloadPagesAndAudio, globalDownloadState, getUncachedPages } from '../utils/offlineCache';
import { useAuth } from '../context/AuthProvider';
import { useUserData } from '../context/UserDataProvider';

export function useAutoDownload() {
  const { preferences, updatePreferences } = usePreferences();
  const { user, isGuest } = useAuth();
  const { activePlan } = useUserData();
  const hasTriggered = useRef(false);

  useEffect(() => {
    if (!preferences.autoDownloadEnabled) return;
    if (hasTriggered.current) return;
    if (globalDownloadState.isDownloading) return;
    if (!navigator.onLine) return;

    // Check WiFi condition
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    const isWifi = connection ? connection.type === 'wifi' : true;
    
    if (preferences.autoDownloadWifiOnly && !isWifi && connection) {
      console.log("Not on WiFi, skipping auto-download due to user preference.");
      return;
    }

    const checkAndDownload = async () => {
      hasTriggered.current = true;
      const downloadAudio = preferences.autoDownloadAudio ?? false;
      const uncached = await getUncachedPages(downloadAudio);

      const allTargetPages = new Set<number>();

      // Case 1: Initial full content download (604 pages)
      if (!preferences.initialDownloadCompleted) {
        for (let i = 1; i <= 604; i++) {
          allTargetPages.add(i);
        }
      } 
      // Case 2: Daily tasks download
      else if (activePlan) {
        const today = startOfDay(new Date());
        const tasksForToday = getTasksForDate(today, activePlan, []);
        tasksForToday.forEach(task => {
          if (task.pages) {
            task.pages.forEach(p => allTargetPages.add(p));
          }
        });
      }

      const pagesArray = Array.from(allTargetPages);
      const finalPages = pagesArray.filter(p => uncached.includes(p));

      if (finalPages.length > 0) {
        // If it's the initial full download, we notify and mark it as completed so we don't restart it next time
        if (!preferences.initialDownloadCompleted) {
          updatePreferences({ initialDownloadCompleted: true }).catch(console.error);
        }

        downloadPagesAndAudio(finalPages, downloadAudio).catch(err => {
          console.error("Auto-download failed:", err);
          hasTriggered.current = false;
        });
      } else {
        if (!preferences.initialDownloadCompleted) {
          updatePreferences({ initialDownloadCompleted: true }).catch(console.error);
        }
      }
    };

    checkAndDownload();

  }, [activePlan, preferences, user, isGuest, updatePreferences]);
}
