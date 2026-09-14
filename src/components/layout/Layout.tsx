
import React, { useEffect, useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Home, Calendar, PlusCircle, BarChart3, Settings, CheckCircle2, HelpCircle, LogOut, User, BookOpen, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAuth } from '../../context/AuthProvider';
import { globalDownloadState, subscribeToDownload, DownloadProgress } from '../../utils/offlineCache';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isGuest, signOutUser } = useAuth();
  const [downloadState, setDownloadState] = useState<DownloadProgress>(globalDownloadState);
  const [isNotificationDismissed, setIsNotificationDismissed] = useState(false);

  useEffect(() => {
    return subscribeToDownload((state) => {
      setDownloadState(state);
      if (state.isDownloading && !downloadState.isDownloading) {
        setIsNotificationDismissed(false); // Reset dismissal if a new download starts
      }
    });
  }, [downloadState.isDownloading]);

  const handleLogout = async () => {
    await signOutUser();
    navigate('/login');
  };

  const splitName = user?.displayName?.split(' ') || [];
  const initials = splitName.map(n => n.charAt(0)).join('').toUpperCase().substring(0, 2);

  const navItems = [
    { path: '/', icon: Home, label: 'الرئيسة' },
    { path: '/tasks', icon: CheckCircle2, label: 'مهام اليوم' },
    { path: '/quran', icon: BookOpen, label: 'المصحف' },
    { path: '/stats', icon: BarChart3, label: 'التقدم' },
    { path: '/settings', icon: Settings, label: 'الإعدادات' },
  ];

  return (
    <div className="min-h-screen bg-[#FDFBF7] dark:bg-[#121212] text-[#1A2E1A] dark:text-[#E0E0E0] font-sans selection:bg-[#B8860B]/20 transition-colors" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-[#f7f3e8] dark:bg-[#1a160d] backdrop-blur-md border-b border-[#D4AF37]/20 px-4 h-16 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
           <img src="/app_icon_v6.png" alt="App Logo" className="w-8 h-8 rounded-lg bg-white shadow-sm" />
           <h1 className="text-xl font-bold tracking-tight text-[#1A2E1A] dark:text-white">خطة الحفظ</h1>
        </div>
        <div className="flex items-center gap-2">
          {user || isGuest ? (
            <div className="flex items-center gap-2 relative">
              <button 
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                title="تسجيل الخروج"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <Link 
              to="/login"
              className="text-[10px] font-bold py-1.5 px-2 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 rounded-lg hover:opacity-90 flex items-center gap-1"
            >
              <User className="w-4 h-4" />
              <span>دخول</span>
            </Link>
          )}
          <Link 
            to="/guide" 
            className="text-[#1A2E1A] dark:text-white p-2 rounded-full transition-colors active:scale-95"
          >
            <HelpCircle className="w-6 h-6" />
          </Link>
          <Link 
            to="/plans/new" 
            className="bg-[#D4AF37] hover:bg-[#B8860B] dark:bg-[#D4AF37] dark:hover:bg-[#C19A2E] text-white p-2 rounded-full transition-colors shadow-lg active:scale-95"
          >
            <PlusCircle className="w-6 h-6" />
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-24 pt-4 max-w-lg mx-auto px-4 overflow-y-auto [WebkitOverflowScrolling:touch]">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
        >
          {children}
        </motion.div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#f7f3e8] dark:bg-[#1a160d] border-t border-[#D4AF37]/20 px-1 py-2 flex justify-between items-center max-w-lg mx-auto rounded-t-2xl shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col flex-1 min-w-0 items-center gap-1 px-1 py-2 transition-all duration-300 rounded-xl",
                isActive ? "text-[#1A2E1A] dark:text-[#D4AF37] bg-[#1A2E1A]/5 dark:bg-[#D4AF37]/10" : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              )}
            >
              <Icon className={cn("w-6 h-6 transition-transform", isActive && "scale-110")} />
              <span className="text-[10px] font-medium">{item.label}</span>
              {isActive && (
                <motion.div 
                  layoutId="active-tab"
                  className="absolute bottom-1 w-1.5 h-1.5 bg-[#D4AF37] rounded-full"
                />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
