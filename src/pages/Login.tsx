import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, LogIn, User, Info, ArrowRight, Check, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthProvider';

export default function Login() {
  const navigate = useNavigate();
  const { user, isGuest, loading: authLoading, loginAsGuest } = useAuth();
  const [showInfo, setShowInfo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (user || isGuest)) {
      navigate('/', { replace: true });
    }
  }, [user, isGuest, authLoading, navigate]);

  const handleGuestLogin = () => {
    setLoading(true);
    try {
      loginAsGuest();
      sessionStorage.removeItem('hasRedirectedOnOpen');
      navigate('/');
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء الدخول كضيف");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FDFBF7] via-[#F4F1E6] to-[#E9E4D3] dark:bg-gradient-to-br dark:from-[#0D1210] dark:via-[#121A15] dark:to-[#0A0F0D] flex items-center justify-center p-4 sm:p-8 relative overflow-hidden transition-colors duration-500">
      
      {/* Intricate Islamic Rosette (Mandala) Wallpaper in Background */}
      <div className="absolute inset-0 opacity-[0.05] dark:opacity-[0.035] pointer-events-none flex items-center justify-center overflow-hidden">
        <svg viewBox="0 0 200 200" className="text-[#1A2E1A] dark:text-[#D4AF37] w-[140%] h-[140%] md:w-[90%] md:h-[90%] select-none">
          <circle cx="100" cy="100" r="95" stroke="currentColor" strokeWidth="0.4" strokeDasharray="3 3" />
          <circle cx="100" cy="100" r="85" stroke="currentColor" strokeWidth="0.8" />
          <circle cx="100" cy="100" r="60" stroke="currentColor" strokeWidth="0.6" />
          <circle cx="100" cy="100" r="40" stroke="currentColor" strokeWidth="0.5" />
          {/* Concentric 12-point stars */}
          {[0, 30, 60, 90, 120, 150].map((angle) => (
            <g key={angle} transform={`rotate(${angle} 100 100)`}>
              <rect x="35" y="35" width="130" height="130" stroke="currentColor" strokeWidth="0.5" />
              <line x1="100" y1="5" x2="100" y2="195" stroke="currentColor" strokeWidth="0.4" />
              <line x1="5" y1="100" x2="195" y2="100" stroke="currentColor" strokeWidth="0.4" />
            </g>
          ))}
          {[15, 45, 75, 105, 135, 165].map((angle) => (
            <g key={angle} transform={`rotate(${angle} 100 100)`}>
              <rect x="42" y="42" width="116" height="116" stroke="currentColor" strokeWidth="0.3" strokeDasharray="2 2" />
            </g>
          ))}
          <circle cx="100" cy="100" r="10" fill="currentColor" opacity="0.1" />
        </svg>
      </div>

      {/* Decorative Corner Patterns - High Fidelity Traditional Islamic Geometry */}
      <div className="absolute top-0 left-0 w-36 h-36 md:w-72 md:h-72 opacity-50 dark:opacity-35 pointer-events-none">
        <svg viewBox="0 0 100 100" fill="none" strokeWidth="1.2" className="w-full h-full">
          <path d="M 2,2 L 98,2 M 2,2 L 2,98" strokeWidth="2.5" className="stroke-[#5A6E4B] dark:stroke-[#8A9C78]" />
          <path d="M 6,6 L 90,6 M 6,6 L 6,90" strokeWidth="1" className="stroke-[#D4AF37] dark:stroke-[#E5C158]" />
          <path d="M 10,10 L 80,10 M 10,10 L 10,80" strokeWidth="0.8" strokeDasharray="3 1" className="stroke-[#5A6E4B] dark:stroke-[#8A9C78]" />
          <path d="M 2,40 L 40,2 M 2,60 L 60,2" className="stroke-[#D4AF37] dark:stroke-[#E5C158]" />
          <path d="M 12,12 L 45,12 L 45,45 L 12,45 Z" strokeWidth="0.8" className="stroke-[#D4AF37] dark:stroke-[#E5C158]" />
          <path d="M 20,20 L 35,20 L 35,35 L 20,35 Z" strokeWidth="0.5" className="stroke-[#5A6E4B] dark:stroke-[#8A9C78]" />
          <path d="M 2,12 L 12,12 L 12,2" className="stroke-[#D4AF37] dark:stroke-[#E5C158]" />
          <path d="M 2,20 L 20,20 L 20,2" className="stroke-[#5A6E4B] dark:stroke-[#8A9C78]" />
          <path d="M 2,30 L 30,30 L 30,2" className="stroke-[#D4AF37] dark:stroke-[#E5C158]" />
          <g transform="translate(12, 12) scale(0.15)" className="stroke-[#D4AF37] dark:stroke-[#E5C158]">
            <rect x="0" y="0" width="100" height="100" strokeWidth="3" transform="rotate(0 50 50)" />
            <rect x="0" y="0" width="100" height="100" strokeWidth="3" transform="rotate(45 50 50)" />
            <circle cx="50" cy="50" r="25" strokeWidth="2" />
          </g>
          <g transform="translate(45, 12) scale(0.12)" className="stroke-[#5A6E4B] dark:stroke-[#8A9C78]">
            <rect x="0" y="0" width="100" height="100" strokeWidth="3" transform="rotate(0 50 50)" />
            <rect x="0" y="0" width="100" height="100" strokeWidth="3" transform="rotate(45 50 50)" />
          </g>
          <g transform="translate(12, 45) scale(0.12)" className="stroke-[#5A6E4B] dark:stroke-[#8A9C78]">
            <rect x="0" y="0" width="100" height="100" strokeWidth="3" transform="rotate(0 50 50)" />
            <rect x="0" y="0" width="100" height="100" strokeWidth="3" transform="rotate(45 50 50)" />
          </g>
        </svg>
      </div>

      <div className="absolute top-0 right-0 w-36 h-36 md:w-72 md:h-72 opacity-50 dark:opacity-35 pointer-events-none" style={{ transform: 'scaleX(-1)' }}>
        <svg viewBox="0 0 100 100" fill="none" strokeWidth="1.2" className="w-full h-full">
          <path d="M 2,2 L 98,2 M 2,2 L 2,98" strokeWidth="2.5" className="stroke-[#5A6E4B] dark:stroke-[#8A9C78]" />
          <path d="M 6,6 L 90,6 M 6,6 L 6,90" strokeWidth="1" className="stroke-[#D4AF37] dark:stroke-[#E5C158]" />
          <path d="M 10,10 L 80,10 M 10,10 L 10,80" strokeWidth="0.8" strokeDasharray="3 1" className="stroke-[#5A6E4B] dark:stroke-[#8A9C78]" />
          <path d="M 2,40 L 40,2 M 2,60 L 60,2" className="stroke-[#D4AF37] dark:stroke-[#E5C158]" />
          <path d="M 12,12 L 45,12 L 45,45 L 12,45 Z" strokeWidth="0.8" className="stroke-[#D4AF37] dark:stroke-[#E5C158]" />
          <path d="M 20,20 L 35,20 L 35,35 L 20,35 Z" strokeWidth="0.5" className="stroke-[#5A6E4B] dark:stroke-[#8A9C78]" />
          <path d="M 2,12 L 12,12 L 12,2" className="stroke-[#D4AF37] dark:stroke-[#E5C158]" />
          <path d="M 2,20 L 20,20 L 20,2" className="stroke-[#5A6E4B] dark:stroke-[#8A9C78]" />
          <path d="M 2,30 L 30,30 L 30,2" className="stroke-[#D4AF37] dark:stroke-[#E5C158]" />
          <g transform="translate(12, 12) scale(0.15)" className="stroke-[#D4AF37] dark:stroke-[#E5C158]">
            <rect x="0" y="0" width="100" height="100" strokeWidth="3" transform="rotate(0 50 50)" />
            <rect x="0" y="0" width="100" height="100" strokeWidth="3" transform="rotate(45 50 50)" />
            <circle cx="50" cy="50" r="25" strokeWidth="2" />
          </g>
          <g transform="translate(45, 12) scale(0.12)" className="stroke-[#5A6E4B] dark:stroke-[#8A9C78]">
            <rect x="0" y="0" width="100" height="100" strokeWidth="3" transform="rotate(0 50 50)" />
            <rect x="0" y="0" width="100" height="100" strokeWidth="3" transform="rotate(45 50 50)" />
          </g>
          <g transform="translate(12, 45) scale(0.12)" className="stroke-[#5A6E4B] dark:stroke-[#8A9C78]">
            <rect x="0" y="0" width="100" height="100" strokeWidth="3" transform="rotate(0 50 50)" />
            <rect x="0" y="0" width="100" height="100" strokeWidth="3" transform="rotate(45 50 50)" />
          </g>
        </svg>
      </div>

      {/* Decorative Corner Patterns - Bottom Left */}
      <div className="absolute bottom-0 left-0 w-36 h-36 md:w-72 md:h-72 opacity-50 dark:opacity-35 pointer-events-none" style={{ transform: 'scaleY(-1)' }}>
        <svg viewBox="0 0 100 100" fill="none" strokeWidth="1.2" className="w-full h-full">
          <path d="M 2,2 L 98,2 M 2,2 L 2,98" strokeWidth="2.5" className="stroke-[#5A6E4B] dark:stroke-[#8A9C78]" />
          <path d="M 6,6 L 90,6 M 6,6 L 6,90" strokeWidth="1" className="stroke-[#D4AF37] dark:stroke-[#E5C158]" />
          <path d="M 10,10 L 80,10 M 10,10 L 10,80" strokeWidth="0.8" strokeDasharray="3 1" className="stroke-[#5A6E4B] dark:stroke-[#8A9C78]" />
          <path d="M 2,40 L 40,2 M 2,60 L 60,2" className="stroke-[#D4AF37] dark:stroke-[#E5C158]" />
          <path d="M 12,12 L 45,12 L 45,45 L 12,45 Z" strokeWidth="0.8" className="stroke-[#D4AF37] dark:stroke-[#E5C158]" />
          <path d="M 20,20 L 35,20 L 35,35 L 20,35 Z" strokeWidth="0.5" className="stroke-[#5A6E4B] dark:stroke-[#8A9C78]" />
          <path d="M 2,12 L 12,12 L 12,2" className="stroke-[#D4AF37] dark:stroke-[#E5C158]" />
          <path d="M 2,20 L 20,20 L 20,2" className="stroke-[#5A6E4B] dark:stroke-[#8A9C78]" />
          <path d="M 2,30 L 30,30 L 30,2" className="stroke-[#D4AF37] dark:stroke-[#E5C158]" />
          <g transform="translate(12, 12) scale(0.15)" className="stroke-[#D4AF37] dark:stroke-[#E5C158]">
            <rect x="0" y="0" width="100" height="100" strokeWidth="3" transform="rotate(0 50 50)" />
            <rect x="0" y="0" width="100" height="100" strokeWidth="3" transform="rotate(45 50 50)" />
            <circle cx="50" cy="50" r="25" strokeWidth="2" />
          </g>
          <g transform="translate(45, 12) scale(0.12)" className="stroke-[#5A6E4B] dark:stroke-[#8A9C78]">
            <rect x="0" y="0" width="100" height="100" strokeWidth="3" transform="rotate(0 50 50)" />
            <rect x="0" y="0" width="100" height="100" strokeWidth="3" transform="rotate(45 50 50)" />
          </g>
          <g transform="translate(12, 45) scale(0.12)" className="stroke-[#5A6E4B] dark:stroke-[#8A9C78]">
            <rect x="0" y="0" width="100" height="100" strokeWidth="3" transform="rotate(0 50 50)" />
            <rect x="0" y="0" width="100" height="100" strokeWidth="3" transform="rotate(45 50 50)" />
          </g>
        </svg>
      </div>

      {/* Decorative Corner Patterns - Bottom Right */}
      <div className="absolute bottom-0 right-0 w-36 h-36 md:w-72 md:h-72 opacity-50 dark:opacity-35 pointer-events-none" style={{ transform: 'scale(-1)' }}>
        <svg viewBox="0 0 100 100" fill="none" strokeWidth="1.2" className="w-full h-full">
          <path d="M 2,2 L 98,2 M 2,2 L 2,98" strokeWidth="2.5" className="stroke-[#5A6E4B] dark:stroke-[#8A9C78]" />
          <path d="M 6,6 L 90,6 M 6,6 L 6,90" strokeWidth="1" className="stroke-[#D4AF37] dark:stroke-[#E5C158]" />
          <path d="M 10,10 L 80,10 M 10,10 L 10,80" strokeWidth="0.8" strokeDasharray="3 1" className="stroke-[#5A6E4B] dark:stroke-[#8A9C78]" />
          <path d="M 2,40 L 40,2 M 2,60 L 60,2" className="stroke-[#D4AF37] dark:stroke-[#E5C158]" />
          <path d="M 12,12 L 45,12 L 45,45 L 12,45 Z" strokeWidth="0.8" className="stroke-[#D4AF37] dark:stroke-[#E5C158]" />
          <path d="M 20,20 L 35,20 L 35,35 L 20,35 Z" strokeWidth="0.5" className="stroke-[#5A6E4B] dark:stroke-[#8A9C78]" />
          <path d="M 2,12 L 12,12 L 12,2" className="stroke-[#D4AF37] dark:stroke-[#E5C158]" />
          <path d="M 2,20 L 20,20 L 20,2" className="stroke-[#5A6E4B] dark:stroke-[#8A9C78]" />
          <path d="M 2,30 L 30,30 L 30,2" className="stroke-[#D4AF37] dark:stroke-[#E5C158]" />
          <g transform="translate(12, 12) scale(0.15)" className="stroke-[#D4AF37] dark:stroke-[#E5C158]">
            <rect x="0" y="0" width="100" height="100" strokeWidth="3" transform="rotate(0 50 50)" />
            <rect x="0" y="0" width="100" height="100" strokeWidth="3" transform="rotate(45 50 50)" />
            <circle cx="50" cy="50" r="25" strokeWidth="2" />
          </g>
          <g transform="translate(45, 12) scale(0.12)" className="stroke-[#5A6E4B] dark:stroke-[#8A9C78]">
            <rect x="0" y="0" width="100" height="100" strokeWidth="3" transform="rotate(0 50 50)" />
            <rect x="0" y="0" width="100" height="100" strokeWidth="3" transform="rotate(45 50 50)" />
          </g>
          <g transform="translate(12, 45) scale(0.12)" className="stroke-[#5A6E4B] dark:stroke-[#8A9C78]">
            <rect x="0" y="0" width="100" height="100" strokeWidth="3" transform="rotate(0 50 50)" />
            <rect x="0" y="0" width="100" height="100" strokeWidth="3" transform="rotate(45 50 50)" />
          </g>
        </svg>
      </div>

      <div className="max-w-md w-full relative z-10 px-4">
        {/* Inner Decorative Container with enhanced glassmorphism */}
        <div className="border-[5px] border-[#5A6E4B] dark:border-[#4E5B3D] p-2 rounded-[44px] bg-white/60 dark:bg-[#121212]/40 backdrop-blur-xl shadow-[0_32px_64px_-15px_rgba(0,0,0,0.2)] dark:shadow-[0_32px_64px_-15px_rgba(0,0,0,0.6)]">
          <div className="border-2 border-[#D4AF37] dark:border-[#D4AF37]/80 rounded-[37px] p-0.5 bg-gradient-to-b from-[#1A2E1A]/5 to-[#D4AF37]/10 dark:from-[#D4AF37]/15 dark:to-transparent">
            <div className="relative border-2 border-dashed border-[#1A2E1A]/10 dark:border-[#D4AF37]/25 rounded-[34px] p-6 sm:p-10 space-y-8 bg-white/90 dark:bg-[#131815]/95 overflow-visible">
              
              {/* Top Arched Dome Ornament (Mihrab Element) */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-10 pointer-events-none flex items-center justify-center">
                <svg viewBox="0 0 100 20" className="text-[#1A2E1A] dark:text-[#D4AF37] fill-current w-full h-full opacity-10 dark:opacity-25">
                  <path d="M 0,20 Q 35,20 40,8 Q 50,0 50,0 Q 50,0 60,8 Q 65,20 100,20 Z" />
                </svg>
                <div className="absolute bottom-1 w-28 h-0.5 bg-gradient-to-r from-transparent via-[#D4AF37]/50 to-transparent"></div>
              </div>
              
              {/* Header/Logo Container with Spin-back animated Custom App Logo */}
              <div className="text-center space-y-5 pt-4">
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 25 }}
                  className="mx-auto flex items-center justify-center"
                >
                  <img src="/app_icon_v6.png" alt="App Logo" className="w-28 h-28 rounded-3xl bg-white shadow-[0_10px_30px_rgba(26,46,26,0.15)] dark:shadow-[0_10px_30px_rgba(212,175,55,0.1)] border-2 border-white/50 dark:border-[#D4AF37]/10" />
                </motion.div>
                
                <motion.div
                  initial={{ y: 15, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.15 }}
                  className="space-y-2"
                >
                  <h1 className="text-4xl font-black tracking-tight text-[#1A2E1A] dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-b dark:from-white dark:via-[#ECE3CB] dark:to-[#D4AF37]">منصة الحفظ</h1>
                  <p className="text-[#1A2E1A]/60 dark:text-gray-400 text-xs sm:text-sm font-medium leading-relaxed">خطتك القرآنية المتكاملة لحفظ وتثبيت القرآن الكريم</p>
                </motion.div>
              </div>

              <motion.div 
                initial={{ y: 15, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="bg-[#FDFBF7]/80 dark:bg-black/25 border border-[#1A2E1A]/5 dark:border-white/5 rounded-[30px] p-6 shadow-inner space-y-5"
              >
                {error && (
                  <div className="bg-red-50/80 dark:bg-red-950/40 border border-red-200/30 text-red-700 dark:text-red-300 p-3.5 rounded-2xl text-xs sm:text-sm text-center font-bold animate-pulse">
                    {error}
                  </div>
                )}

                <div className="flex gap-2 items-center justify-between pb-2 border-b border-[#1A2E1A]/5 dark:border-white/5">
                  <span className="text-[11px] text-[#1A2E1A]/50 dark:text-[#D4AF37]/60 font-black uppercase tracking-wider">تسجيل الدخول للنظام</span>
                  <button 
                    onClick={() => setShowInfo(!showInfo)}
                    className="p-1.5 bg-white dark:bg-white/10 text-[#1A2E1A]/80 dark:text-[#D4AF37] border border-[#1A2E1A]/10 dark:border-white/10 rounded-full hover:bg-[#F4F1E6] dark:hover:bg-white/20 transition-all shadow-sm"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  <button
                    onClick={handleGuestLogin}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 py-4.5 px-6 bg-[#1A2E1A] dark:bg-[#D4AF37] hover:bg-[#233D23] dark:hover:bg-[#E2C981] text-white dark:text-[#0D1210] rounded-[22px] transition-all font-bold shadow-lg shadow-[#1A2E1A]/10 dark:shadow-[#D4AF37]/5 cursor-pointer hover:shadow-xl hover:-translate-y-1 active:translate-y-0 text-sm overflow-hidden relative group"
                  >
                    <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/40 dark:border-black/40 border-t-white dark:border-t-black rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <User className="w-5 h-5" />
                        <span className="relative z-10">ابدأ الآن</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>

              <AnimatePresence>
                {showInfo && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="bg-[#1A2E1A]/5 dark:bg-[#D4AF37]/10 p-6 rounded-3xl border border-[#1A2E1A]/10 dark:border-[#D4AF37]/20 text-xs sm:text-sm overflow-hidden space-y-4 shadow-sm"
                  >
                    <h3 className="font-black text-[#1A2E1A] dark:text-[#D4AF37] flex items-center gap-2 border-b border-[#1A2E1A]/10 dark:border-white/5 pb-2.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>خيارات الحفظ والخصوصية</span>
                    </h3>
                    <div className="space-y-4 pt-1">
                      <div className="flex gap-3 items-start">
                        <div className="mt-1 bg-[#1A2E1A] dark:bg-[#D4AF37] p-0.5 rounded-full text-white dark:text-[#0D1210]">
                          <Check className="w-3 h-3" />
                        </div>
                        <div>
                          <span className="font-bold text-[#1A2E1A] dark:text-white block text-sm mb-1">تخزين محلي آمن</span>
                          <p className="text-[#1A2E1A]/60 dark:text-gray-400 text-xs leading-relaxed font-medium">
                            تخزين محلي كامل (Offline) على جهازك الحالي فقط. آمن وسريع، ولا يتطلب الاتصال بالإنترنت.
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Floating Accent Dots (Decorative) */}
        <div className="absolute -top-12 -right-12 w-24 h-24 bg-[#D4AF37]/10 dark:bg-[#D4AF37]/5 blur-3xl rounded-full"></div>
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-[#1A2E1A]/10 dark:bg-[#1A2E1A]/5 blur-3xl rounded-full"></div>
      </div>
    </div>
  );
}
