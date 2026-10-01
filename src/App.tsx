
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import Tasks from './pages/Tasks';
import CreatePlan from './pages/CreatePlan';
import Stats from './pages/Stats';
import Settings from './pages/Settings';
import Quran from './pages/Quran';
import Guide from './pages/Guide';
import Login from './pages/Login';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthProvider';
import { RealtimeSyncProvider } from './context/RealtimeSyncProvider';
import { UserDataProvider, useUserData } from './context/UserDataProvider';
import { PreferencesProvider } from './context/PreferencesContext';
import { unlockOrientation } from './utils/orientation';
import { AudioProvider } from './context/AudioContext';
import { useAutoDownload } from './hooks/useAutoDownload';

const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isGuest, loading } = useAuth();
  const { syncing } = useUserData();
  const location = useLocation();

  if (loading) {
    return <div className="flex h-screen items-center justify-center"><div className="w-8 h-8 border-4 border-[#1A2E1A] dark:border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (syncing && user) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-white dark:bg-zinc-950 px-4 text-center">
        <div className="w-10 h-10 border-4 border-[#1A2E1A] dark:border-[#D4AF37] border-t-transparent rounded-full animate-spin mb-4"></div>
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-1">جاري مزامنة البيانات</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">نسترجع خططك وإنجازاتك من السحابة... يرجى الانتظار لحظات</p>
      </div>
    );
  }

  if (!user && !isGuest) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

const AppContent: React.FC = () => {
  const { user, isGuest } = useAuth();
  useAutoDownload();

  return (
    <div key={user?.uid || (isGuest ? 'guest' : 'anonymous')} className="min-h-screen bg-white dark:bg-zinc-950 transition-colors duration-200">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/*" element={
          <RequireAuth>
            <Layout>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/tasks" element={<Tasks />} />
                <Route path="/quran" element={<Quran />} />
                <Route path="/plans/new" element={<CreatePlan />} />
                <Route path="/plans/edit/:id" element={<CreatePlan />} />
                <Route path="/stats" element={<Stats />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/guide" element={<Guide />} />
              </Routes>
            </Layout>
          </RequireAuth>
        } />
      </Routes>
    </div>
  );
};

export default function App() {
  React.useEffect(() => {
    // Attempt to unlock orientation on load
    unlockOrientation();

    // 1. Listen for new service worker taking control, and reload to apply updates immediately.
    let refreshing = false;
    const handleControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    }

    // 2. On focus or visibility change, check for Service Worker updates.
    const checkForUpdates = () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.update().catch((err) => {
              console.warn('Service worker update check failed:', err);
            });
          }
        }).catch((err) => {
          console.warn('Service worker getRegistrations failed in Safari:', err);
        });
      }
    };

    window.addEventListener('visibilitychange', checkForUpdates);
    window.addEventListener('focus', checkForUpdates);

    // Initial check on load
    checkForUpdates();

    // Setup periodic check every 15 minutes
    const interval = setInterval(checkForUpdates, 15 * 60 * 1000);

    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      }
      window.removeEventListener('visibilitychange', checkForUpdates);
      window.removeEventListener('focus', checkForUpdates);
      clearInterval(interval);
    };
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <RealtimeSyncProvider>
          <UserDataProvider>
            <PreferencesProvider>
              <AudioProvider>
                <BrowserRouter>
                  <AppContent />
                </BrowserRouter>
              </AudioProvider>
            </PreferencesProvider>
          </UserDataProvider>
        </RealtimeSyncProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
