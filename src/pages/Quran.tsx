import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Search, Play, Volume2, Settings, ChevronLeft, Filter, BookOpenCheck, Headphones, Plus, Trash2 } from 'lucide-react';
import { SURAH_METADATAList } from '../utils/quranPageMapping';
import { QURAN_QUARTERS } from '../utils/quranQuarters';
import { QuranViewer } from '../components/ui/QuranViewer';
import { useAudio } from '../context/AudioContext';
import { SearchableSurahSelect } from '../components/ui/SearchableSurahSelect';
import { SearchableNumberSelect } from '../components/ui/SearchableNumberSelect';

type TabType = 'read' | 'listen' | 'search';
type ReadFilterType = 'full' | 'surah' | 'juz' | 'hizb';

export default function Quran() {
  const [activeTab, setActiveTab] = useState<TabType>('read');
  const [readFilter, setReadFilter] = useState<ReadFilterType>('surah');
  
  const [viewerOpen, setViewerOpen] = useState(false);
  const [quranData, setQuranData] = useState<any[] | null>(null);
  const [dbLoadingState, setDbLoadingState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [dbErrorMsg, setDbErrorMsg] = useState<string | null>(null);

  const loadQuranData = async () => {
    if (quranData) return;
    setDbLoadingState('loading');
    setDbErrorMsg(null);
    
    try {
      console.log('Attempting to fetch Quran chunks in parallel...');
      const chunkPromises = Array.from({ length: 6 }, (_, i) => {
        const chunkIndex = i + 1;
        const urls = [
          `quran-chunk-${chunkIndex}.json`,
          `./quran-chunk-${chunkIndex}.json`,
          `/quran-chunk-${chunkIndex}.json`
        ];
        
        return (async () => {
          for (const url of urls) {
            try {
              const res = await fetch(url);
              if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) {
                  return data;
                }
              }
            } catch (err) {
              console.warn(`Failed to fetch chunk ${chunkIndex} from ${url}:`, err);
            }
          }
          throw new Error(`تعذر تحميل الجزء ${chunkIndex} من المصحف`);
        })();
      });

      const chunks = await Promise.all(chunkPromises);
      const combined = chunks.flat();
      
      if (combined.length > 0) {
        setQuranData(combined);
        setDbLoadingState('success');
        console.log('Successfully loaded all Quran chunks, total:', combined.length);
      } else {
        throw new Error('بيانات فارغة');
      }
    } catch (err: any) {
      setDbLoadingState('error');
      setDbErrorMsg(err.message || 'تعذر تحميل بيانات المصحف الشريف');
      console.error('Failed to load Quran chunks:', err);
    }
  };

  useEffect(() => {
    loadQuranData();
  }, []);

  const [viewerPages, setViewerPages] = useState<number[]>([]);
  const [viewerTitle, setViewerTitle] = useState("");
  
  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Surah browse search
  const [surahSearchQuery, setSurahSearchQuery] = useState("");

  const filteredSurahs = useMemo(() => {
    return SURAH_METADATAList.map((surah, originalIndex) => ({ surah, originalIndex }))
      .filter(({ surah }) => {
        if (!surahSearchQuery.trim()) return true;
        const normalize = (str: string) => {
          return str.replace(/[ً-ٟۖ-ۜ۟-۪ۨ-ۭ]/g, '')
                     .replace(/\u0670/g, 'ا')
                     .replace(/[أإآاٱ]/g, 'ا')
                     .replace(/[ةه]/g, 'ه')
                     .replace(/[ىي]/g, 'ي')
                     .replace(/ؤ/g, 'و')
                     .replace(/ئ/g, 'ي')
                     .replace(/ء/g, '').replace(/\uFEFF/g, '');
        };
        const normSearch = normalize(surahSearchQuery.trim());
        const normName = normalize(surah.name);
        return normName.includes(normSearch) || surah.name.includes(surahSearchQuery.trim());
      });
  }, [surahSearchQuery]);
  
  // Audio
  const [listenRanges, setListenRanges] = useState<{id: string, surah: number, start: number, end: number}[]>([
    { id: '1', surah: 1, start: 1, end: SURAH_METADATAList[0].endVerse }
  ]);
  const [ayahRepeat, setAyahRepeat] = useState(1);
  const [sequenceRepeat, setSequenceRepeat] = useState(1);
  const [customSequenceMode, setCustomSequenceMode] = useState(false);
  
  const { currentQari, currentSpeed, updatePlaybackSettings, playPages, playCustomSequence } = useAudio();

  const openSurah = (surahIndex: number) => {
    const meta = SURAH_METADATAList[surahIndex];
    if (meta) {
      const pages = [];
      for (let i = meta.startPage; i <= meta.endPage; i++) {
        pages.push(i);
      }
      setViewerPages(pages);
      setViewerTitle(`سورة ${meta.name}`);
      setViewerOpen(true);
    }
  };

  const openJuz = (juzNumber: number) => {
    const startQuarter = QURAN_QUARTERS[(juzNumber - 1) * 8];
    const endQuarter = QURAN_QUARTERS[juzNumber * 8 - 1];
    if (startQuarter && endQuarter) {
      const pages = [];
      for (let i = startQuarter.startPage; i <= endQuarter.endPage; i++) {
        pages.push(i);
      }
      setViewerPages(pages);
      setViewerTitle(`الجزء ${juzNumber}`);
      setViewerOpen(true);
    }
  };

  const openHizb = (hizbNumber: number) => {
    const startQuarter = QURAN_QUARTERS[(hizbNumber - 1) * 4];
    const endQuarter = QURAN_QUARTERS[hizbNumber * 4 - 1];
    if (startQuarter && endQuarter) {
      const pages = [];
      for (let i = startQuarter.startPage; i <= endQuarter.endPage; i++) {
        pages.push(i);
      }
      setViewerPages(pages);
      setViewerTitle(`الحزب ${hizbNumber}`);
      setViewerOpen(true);
    }
  };

  const openFullQuran = () => {
    const pages = [];
    for (let i = 1; i <= 604; i++) {
      pages.push(i);
    }
    setViewerPages(pages);
    setViewerTitle(`المصحف كاملاً`);
    setViewerOpen(true);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 400); // 400ms debounce
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const performSearch = () => {
    const query = debouncedSearchQuery.trim();
    if (!query) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    if (!quranData) {
      setIsSearching(true);
      return;
    }
    
    setIsSearching(true);
    
    try {
      // Normalize string for searching (removing tatweel and common variations if needed)
      const normalize = (str: string) => {
        return str.replace(/[ً-ٟۖ-ۜ۟-۪ۨ-ۭ]/g, '')
                   .replace(/\u0670/g, 'ا')
                   .replace(/[أإآاٱ]/g, 'ا')
                   .replace(/[ةه]/g, 'ه')
                   .replace(/[ىي]/g, 'ي')
                   .replace(/ؤ/g, 'و')
                   .replace(/ئ/g, 'ي')
                   .replace(/ء/g, '').replace(/\uFEFF/g, '');
      };
      
      const terms = query.split(/\s+/).filter(t => t.length > 0).map(normalize).filter(t => t.length > 0);
      
      if (terms.length === 0) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }
      
      const matches = [];
      for (let i = 0; i < quranData.length; i++) {
        const ayah = quranData[i];
        if (!ayah || !ayah.t) continue;
        const normalizedAyah = normalize(ayah.t);
        if (terms.every(term => normalizedAyah.includes(term))) {
          matches.push({
            surah: { name: ayah.s },
            numberInSurah: ayah.n,
            page: ayah.p,
            text: ayah.u
          });
          if (matches.length > 100) break; // Limit results for performance
        }
      }
      
      setSearchResults(matches);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'search') {
      performSearch();
    }
  }, [debouncedSearchQuery, quranData, activeTab]);

  const openSearchResult = (match: any) => {
    setViewerPages([match.page]);
    setViewerTitle(`سورة ${match.surah.name} - آية ${match.numberInSurah}`);
    setViewerOpen(true);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold dark:text-white flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-[#D4AF37]" />
          المصحف الشريف
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-gray-100 dark:bg-white/5 rounded-xl border border-[#1A2E1A]/5 dark:border-white/5">
        <button
          onClick={() => setActiveTab('read')}
          className={`flex-1 py-2 flex items-center justify-center gap-1.5 text-sm font-bold rounded-lg transition-all ${
            activeTab === 'read'
              ? 'bg-white dark:bg-[#1A1A1A] text-[#1A2E1A] dark:text-[#D4AF37] shadow-sm'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          <BookOpenCheck className="w-4 h-4" />
          تصفح
        </button>
        <button
          onClick={() => setActiveTab('listen')}
          className={`flex-1 py-2 flex items-center justify-center gap-1.5 text-sm font-bold rounded-lg transition-all ${
            activeTab === 'listen'
              ? 'bg-white dark:bg-[#1A1A1A] text-[#1A2E1A] dark:text-[#D4AF37] shadow-sm'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          <Volume2 className="w-4 h-4" />
          استماع
        </button>
        <button
          onClick={() => setActiveTab('search')}
          className={`flex-1 py-2 flex items-center justify-center gap-1.5 text-sm font-bold rounded-lg transition-all ${
            activeTab === 'search'
              ? 'bg-white dark:bg-[#1A1A1A] text-[#1A2E1A] dark:text-[#D4AF37] shadow-sm'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          <Search className="w-4 h-4" />
          بحث
        </button>
      </div>

      <div className="bg-white dark:bg-[#1A1A1A] rounded-2xl border border-[#1A2E1A]/5 dark:border-white/5 shadow-sm p-4 min-h-[400px]">
        {activeTab === 'read' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 mb-4 pb-2">
              <button
                onClick={() => openFullQuran()}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors bg-[#D4AF37] text-white dark:bg-[#D4AF37] dark:text-[#1A1A1A] shadow-md`}
              >
                المصحف كاملاً
              </button>
              <button
                onClick={() => setReadFilter('surah')}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                  readFilter === 'surah' 
                    ? 'bg-[#1A2E1A] text-white dark:bg-[#D4AF37] dark:text-[#1A1A1A]' 
                    : 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-300'
                }`}
              >
                السور
              </button>
              <button
                onClick={() => setReadFilter('juz')}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                  readFilter === 'juz' 
                    ? 'bg-[#1A2E1A] text-white dark:bg-[#D4AF37] dark:text-[#1A1A1A]' 
                    : 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-300'
                }`}
              >
                الأجزاء
              </button>
              <button
                onClick={() => setReadFilter('hizb')}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                  readFilter === 'hizb' 
                    ? 'bg-[#1A2E1A] text-white dark:bg-[#D4AF37] dark:text-[#1A1A1A]' 
                    : 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-300'
                }`}
              >
                الأحزاب
              </button>
            </div>

            {readFilter === 'surah' && (
              <div className="relative mb-4">
                <input 
                  type="text" 
                  value={surahSearchQuery}
                  onChange={(e) => setSurahSearchQuery(e.target.value)}
                  placeholder="ابحث عن سورة..."
                  className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl py-2.5 pr-10 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37] text-right"
                />
                <Search className="w-4 h-4 text-gray-400 absolute right-3 top-3.5" />
                {surahSearchQuery && (
                  <button 
                    onClick={() => setSurahSearchQuery("")}
                    className="absolute left-3 top-2.5 px-2 py-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 font-sans"
                  >
                    مسح
                  </button>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {readFilter === 'surah' && filteredSurahs.map(({ surah, originalIndex }) => (
                <button
                  key={`surah-${originalIndex}`}
                  onClick={() => openSurah(originalIndex)}
                  className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-[#D4AF37] flex items-center justify-center font-bold text-sm">
                      {(originalIndex + 1)}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-[#1A2E1A] dark:text-gray-100 font-amiri text-lg">سورة {surah.name}</p>
                      <p className="text-[10px] text-gray-500">{surah.endVerse} آية • صفحة {surah.startPage}</p>
                    </div>
                  </div>
                  <ChevronLeft className="w-4 h-4 text-gray-400" />
                </button>
              ))}

              {readFilter === 'surah' && filteredSurahs.length === 0 && (
                <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400">
                  لا توجد نتائج مطابقة لبحثك عن "{surahSearchQuery}"
                </div>
              )}

              {readFilter === 'juz' && Array.from({ length: 30 }).map((_, i) => (
                <button
                  key={`juz-${i}`}
                  onClick={() => openJuz(i + 1)}
                  className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-[#D4AF37] flex items-center justify-center font-bold text-sm">
                      {i + 1}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-[#1A2E1A] dark:text-gray-100 font-amiri text-lg">الجزء {i + 1}</p>
                      <p className="text-[10px] text-gray-500">من صفحة {QURAN_QUARTERS[i * 8]?.startPage} إلى {QURAN_QUARTERS[(i + 1) * 8 - 1]?.endPage}</p>
                    </div>
                  </div>
                  <ChevronLeft className="w-4 h-4 text-gray-400" />
                </button>
              ))}

              {readFilter === 'hizb' && Array.from({ length: 60 }).map((_, i) => (
                <button
                  key={`hizb-${i}`}
                  onClick={() => openHizb(i + 1)}
                  className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-[#D4AF37] flex items-center justify-center font-bold text-sm">
                      {i + 1}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-[#1A2E1A] dark:text-gray-100 font-amiri text-lg">الحزب {i + 1}</p>
                      <p className="text-[10px] text-gray-500">من صفحة {QURAN_QUARTERS[i * 4]?.startPage} إلى {QURAN_QUARTERS[(i + 1) * 4 - 1]?.endPage}</p>
                    </div>
                  </div>
                  <ChevronLeft className="w-4 h-4 text-gray-400" />
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'listen' && (
          <div className="space-y-6">
            <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-xl border border-amber-200/50 dark:border-amber-700/30">
              <h3 className="font-bold text-amber-900 dark:text-amber-400 mb-4 flex items-center gap-2">
                <Headphones className="w-5 h-5" />
                استماع مخصص للقرآن الكريم
              </h3>
              
              <div className="space-y-4">
                {listenRanges.map((range, index) => (
                  <div key={range.id} className="relative bg-white dark:bg-[#1A1A1A] border border-amber-200 dark:border-amber-700/30 rounded-xl p-3 shadow-sm mt-3">
                    {listenRanges.length > 1 && (
                      <button 
                        onClick={() => setListenRanges(prev => prev.filter(r => r.id !== range.id))}
                        className="absolute top-2 left-2 text-red-500 hover:text-red-600 bg-red-50 dark:bg-red-900/20 p-1 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <h4 className="text-xs font-bold text-amber-700 dark:text-amber-500 mb-3">المقطع {index + 1}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-600 dark:text-gray-300 block">السورة</label>
                        <SearchableSurahSelect 
                          value={range.surah}
                          onChange={(newSurah) => {
                            setListenRanges(prev => prev.map(r => r.id === range.id ? { ...r, surah: newSurah, start: 1, end: SURAH_METADATAList[newSurah - 1]?.endVerse || 1 } : r));
                          }}
                          surahs={SURAH_METADATAList}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-600 dark:text-gray-300 block">آية البدء</label>
                        <SearchableNumberSelect 
                          value={range.start}
                          onChange={(newStart) => {
                            setListenRanges(prev => prev.map(r => r.id === range.id ? { ...r, start: newStart, end: Math.max(r.end, newStart) } : r));
                          }}
                          options={Array.from({ length: SURAH_METADATAList[range.surah - 1]?.endVerse || 1 }).map((_, i) => i + 1)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-600 dark:text-gray-300 block">آية النهاية</label>
                        <SearchableNumberSelect 
                          value={range.end}
                          onChange={(newEnd) => {
                            setListenRanges(prev => prev.map(r => r.id === range.id ? { ...r, end: newEnd } : r));
                          }}
                          options={Array.from({ length: SURAH_METADATAList[range.surah - 1]?.endVerse || 1 })
                            .map((_, i) => i + 1)
                            .filter(num => num >= range.start)}
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <button 
                  onClick={() => setListenRanges(prev => [...prev, { id: Date.now().toString(), surah: 1, start: 1, end: SURAH_METADATAList[0].endVerse }])}
                  className="w-full border-2 border-dashed border-amber-300 dark:border-amber-700/50 text-amber-700 dark:text-amber-500 hover:bg-amber-100/50 dark:hover:bg-amber-900/20 font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  إضافة سورة أخرى
                </button>

                <div className="bg-white dark:bg-[#1A1A1A] border border-amber-200 dark:border-amber-700/30 rounded-xl p-4 mt-6">
                  <h4 className="text-xs font-bold text-amber-700 dark:text-amber-500 mb-3 flex items-center gap-2"><Settings className="w-4 h-4" />خيارات التكرار والقارئ</h4>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-600 dark:text-gray-300 block">القارئ</label>
                      <select 
                        value={currentQari}
                        onChange={(e) => updatePlaybackSettings(e.target.value, undefined)}
                        className="w-full bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-zinc-800 rounded-lg p-2 text-sm focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="Minshawy_Murattal_128kbps">الشيخ محمد صديق المنشاوي (مرتل)</option>
                        <option value="Husary_128kbps">الشيخ محمود خليل الحصري (مرتل)</option>
                        <option value="Abdul_Basit_Murattal_64kbps">الشيخ عبد الباسط عبد الصمد (مرتل)</option>
                        <option value="Ayman_Sowaid_64kbps">الشيخ الدكتور أيمن سويد</option>
                        <option value="Muhammad_Ayyoub_128kbps">الشيخ محمد أيوب</option>
                        <option value="Ghamadi_40kbps">الشيخ سعد الغامدي</option>
                        <option value="MaherAlMuaiqly128kbps">الشيخ ماهر المعيقلي</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-600 dark:text-gray-300 block">تكرار كل آية</label>
                        <select 
                          value={ayahRepeat}
                          onChange={(e) => setAyahRepeat(Number(e.target.value))}
                          className="w-full bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-zinc-800 rounded-lg p-2 text-sm focus:ring-2 focus:ring-amber-500"
                        >
                          {[1, 2, 3, 4, 5, 7, 10].map(n => (
                            <option key={n} value={n}>{n === 1 ? 'مرة واحدة' : `${n} مرات`}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-600 dark:text-gray-300 block">تكرار المقطع كاملاً</label>
                        <select 
                          value={sequenceRepeat}
                          onChange={(e) => setSequenceRepeat(Number(e.target.value))}
                          className="w-full bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-zinc-800 rounded-lg p-2 text-sm focus:ring-2 focus:ring-amber-500"
                        >
                          {[1, 2, 3, 4, 5, 7, 10].map(n => (
                            <option key={n} value={n}>{n === 1 ? 'مرة واحدة' : `${n} مرات`}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={async () => {
                    const pages = new Set<number>();
                    listenRanges.forEach(r => {
                       const meta = SURAH_METADATAList[r.surah - 1];
                       if (meta) {
                          for(let p = meta.startPage; p <= meta.endPage; p++) pages.add(p);
                       }
                    });
                    setViewerPages(Array.from(pages));
                    setViewerTitle(`استماع مخصص`);
                    setCustomSequenceMode(true);
                    setViewerOpen(true);
                    
                    const ranges = listenRanges.map(vr => ({surah: Number(vr.surah), start: vr.start, end: vr.end}));
                    await playCustomSequence(ranges, ayahRepeat || 1, sequenceRepeat || 1);
                  }}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors mt-4"
                >
                  <Play className="w-5 h-5" />
                  بدء الاستماع
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'search' && (
          <div className="space-y-4">
            {dbLoadingState === 'loading' && (
              <div className="text-center py-12 space-y-4">
                <div className="w-10 h-10 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm text-gray-500 dark:text-gray-400">جاري تحميل قاعدة بيانات المصحف الشريف للبحث...</p>
              </div>
            )}

            {dbLoadingState === 'error' && (
              <div className="text-center py-12 space-y-4">
                <div className="text-red-500 font-bold text-lg">⚠️ حدث خطأ أثناء تحميل بيانات البحث</div>
                <p className="text-xs text-gray-400 dark:text-gray-500">{dbErrorMsg}</p>
                <button
                  onClick={() => loadQuranData()}
                  className="bg-[#1A2E1A] dark:bg-[#D4AF37] text-white dark:text-[#1A1A1A] px-6 py-2.5 rounded-xl text-sm font-bold shadow hover:opacity-90 transition-opacity"
                >
                  إعادة المحاولة
                </button>
              </div>
            )}

            {(dbLoadingState === 'success' || dbLoadingState === 'idle') && (
              <>
                <div className="relative flex gap-2">
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && performSearch()}
                    placeholder="ابحث في كلمات القرآن الكريم..."
                    className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl py-3 pr-4 pl-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                  />
                  <button 
                    onClick={performSearch}
                    disabled={isSearching}
                    className="bg-[#1A2E1A] dark:bg-[#D4AF37] text-white dark:text-[#1A1A1A] px-6 rounded-xl font-bold flex items-center justify-center disabled:opacity-50"
                  >
                    {isSearching ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Search className="w-5 h-5" />}
                  </button>
                </div>
                
                <div className="space-y-3 mt-6">
                  {searchResults.length > 0 ? (
                     <div className="text-xs text-gray-500 mb-2">تم العثور على {searchResults.length} نتيجة</div>
                  ) : null}

                  {searchResults.map((result, idx) => (
                    <div key={idx} onClick={() => openSearchResult(result)} className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/10 hover:border-[#D4AF37]/50 cursor-pointer transition-colors group">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-[#D4AF37]">سورة {result.surah.name} • الآية {result.numberInSurah}</span>
                      </div>
                      <p className="font-amiri text-lg leading-loose text-gray-800 dark:text-gray-200 text-right" dangerouslySetInnerHTML={{
                        __html: (() => {
                           let highlighted = result.text;
                           const terms = debouncedSearchQuery.trim().split(/\s+/).filter(t => t.length > 0);
                           
                           const normalize = (str: string) => {
                             return str.replace(/[ً-ٟۖ-ۜ۟-۪ۨ-ۭ]/g, '')
                                       .replace(/\u0670/g, 'ا')
                                       .replace(/[أإآاٱ]/g, 'ا')
                                       .replace(/[ةه]/g, 'ه')
                                       .replace(/[ىي]/g, 'ي')
                                       .replace(/ؤ/g, 'و')
                                       .replace(/ئ/g, 'ي')
                                       .replace(/ء/g, '').replace(/\uFEFF/g, '');
                           };

                           terms.forEach(term => {
                             const normTerm = normalize(term);
                             if (!normTerm) return;
                             // Escape any special regex characters to avoid SyntaxErrors
                             const escapedTerm = normTerm.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                             const pattern = escapedTerm.split('').map(char => {
                                const harakat = '[\\u0617-\\u061A\\u0640\\u064B-\\u065F\\u0670\\u06D6-\\u06DC\\u06DF-\\u06E8\\u06EA-\\u06ED]*';
                                if ('أإآاٱ'.includes(char)) return '[أإآاٱ]?' + harakat;
                                if ('ةه'.includes(char)) return '[ةه]' + harakat;
                                if ('يى'.includes(char)) return '[يى]?' + harakat;
                                if ('وؤ'.includes(char)) return '[وؤ]?' + harakat;
                                return char + harakat;
                             }).join('');
                             try {
                               const regex = new RegExp(`(${pattern})`, 'gi');
                               highlighted = highlighted.replace(regex, (match) => `<b class="text-amber-600 dark:text-amber-400 font-extrabold bg-amber-100 dark:bg-amber-900/30 px-1 rounded">${match}</b>`);
                             } catch (e) {
                               console.warn("Highlight regex failure:", e);
                             }
                           });
                           return highlighted;
                        })()
                      }} />
                    </div>
                  ))}

                  {!isSearching && searchResults.length === 0 && searchQuery && (
                    <div className="text-center p-8">
                      <h3 className="font-bold text-gray-700 dark:text-gray-200">لا توجد نتائج</h3>
                      <p className="text-sm text-gray-500 mt-2">جرب البحث بكلمة أخرى أو تأكد من الإملاء</p>
                    </div>
                  )}

                  {!isSearching && !searchQuery && searchResults.length === 0 && (
                    <div className="text-center p-8 opacity-50">
                      <Search className="w-12 h-12 text-[#D4AF37] mx-auto mb-4" />
                      <p className="text-sm text-gray-500 mt-2">اكتب كلمة للبحث عنها في كامل المصحف</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <QuranViewer
        isOpen={viewerOpen}
        onClose={() => {
          setViewerOpen(false);
          setCustomSequenceMode(false);
        }}
        pages={viewerPages}
        taskTitle={viewerTitle}
        verseRanges={
           activeTab === 'listen' && customSequenceMode
             ? listenRanges.map(r => ({ surah: r.surah, start: r.start, end: r.end }))
             : undefined
        }
        customSequenceMode={customSequenceMode}
        ayahRepeat={ayahRepeat}
        sequenceRepeat={sequenceRepeat}
      />
    </div>
  );
}
