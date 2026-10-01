import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search } from 'lucide-react';

interface SearchableSurahSelectProps {
  value: number;
  onChange: (surahNumber: number) => void;
  surahs: { name: string; number?: number }[];
}

export function SearchableSurahSelect({ value, onChange, surahs }: SearchableSurahSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredSurahs = useMemo(() => {
    if (!search.trim()) return surahs;
    
    // Normalize arabic text for search (remove tashkeel, unify alef, etc.)
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
    
    const normSearch = normalize(search);
    return surahs.filter((s, idx) => {
      const num = s.number || (idx + 1);
      return normalize(s.name).includes(normSearch) || String(num).includes(normSearch);
    });
  }, [search, surahs]);

  const selectedSurah = surahs[value - 1];

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => {
            setIsOpen(!isOpen);
            if (!isOpen) setSearch('');
        }}
        className="w-full bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-zinc-800 rounded-lg p-2 text-sm focus:ring-2 focus:ring-amber-500 flex justify-between items-center"
      >
        <span className="truncate">{value}. {selectedSurah?.name}</span>
        <ChevronDown className="w-4 h-4 text-gray-500" />
      </button>

      {isOpen && (
        <div className="absolute z-[100] w-full mt-1 bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-zinc-800 rounded-lg shadow-xl max-h-60 flex flex-col overflow-hidden">
          <div className="p-2 border-b border-gray-100 dark:border-zinc-800 flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث عن سورة..."
              className="w-full bg-transparent border-none focus:outline-none text-sm dark:text-gray-200"
            />
          </div>
          <div className="overflow-y-auto flex-1 p-1">
            {filteredSurahs.length > 0 ? (
              filteredSurahs.map((s, idx) => {
                const originalIndex = surahs.indexOf(s);
                const num = s.number || (originalIndex + 1);
                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => {
                      onChange(num);
                      setIsOpen(false);
                    }}
                    className={`w-full text-right px-3 py-2 text-sm rounded-md hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors ${value === num ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-900 dark:text-amber-100 font-bold' : 'dark:text-gray-300'}`}
                  >
                    {num}. {s.name}
                  </button>
                );
              })
            ) : (
              <div className="p-3 text-center text-xs text-gray-500">لا توجد نتائج</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
