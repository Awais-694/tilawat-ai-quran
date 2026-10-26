"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { SURAHS_META } from "@/lib/quran/data";
import { SurahListItem } from "@/components/common/SurahListItem";
import { normalizeArabic } from "@/lib/quran/normalize";
import { getAllSavedTarjamaPdfs } from "@/lib/storage/tarjamaStorage";
import { useStreakTracker, StreakNotificationToast } from "@/lib/quran/streakTracker";

function normalizeEnglishSearch(str: string): string {
  return str
    .toLowerCase()
    .replace(/^surah\s*/i, "")
    .replace(/^(al|an|ar|as|ash|at|az|ad|adh|aj|akh|al-|an-|ar-|as-|ash-|at-|az-|ad-)\s*/i, "")
    .replace(/[^a-z0-9]/g, "")
    .replace(/aa/g, "a")
    .replace(/ee/g, "i")
    .replace(/oo/g, "u")
    .replace(/ii/g, "i");
}

export function TarjamaIndexClient() {
  const [query, setQuery] = useState("");
  const [savedSurahNumbers, setSavedSurahNumbers] = useState<Set<number>>(new Set());

  // 30 seconds spent in Translation unlocks 1-day streak
  const { showToast, dismissToast } = useStreakTracker({
    mode: "translation",
  });

  // Load list of offline saved Surah translations from IndexedDB
  useEffect(() => {
    let active = true;
    getAllSavedTarjamaPdfs()
      .then((records) => {
        if (!active) return;
        const set = new Set<number>();
        for (const r of records) {
          if (r.size > 100) {
            set.add(r.surahNumber);
          }
        }
        setSavedSurahNumbers(set);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const filteredSurahs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SURAHS_META;

    const isNum = /^\d+$/.test(q);
    const normQ = normalizeArabic(q);
    const normSearch = normalizeEnglishSearch(q);

    return SURAHS_META.filter((m) => {
      if (isNum) {
        if (m.number === parseInt(q, 10) || String(m.number).startsWith(q)) {
          return true;
        }
      }

      const cleanName = m.name.toLowerCase().replace(/[^a-z0-9]/g, "");
      const cleanQ = q.replace(/[^a-z0-9]/g, "");
      const normName = normalizeEnglishSearch(m.name);

      if (
        m.name.toLowerCase().includes(q) ||
        (cleanQ && cleanName.includes(cleanQ)) ||
        (normSearch && normName.includes(normSearch)) ||
        m.translation.toLowerCase().includes(q) ||
        (normQ && normalizeArabic(m.arabicName).includes(normQ))
      ) {
        return true;
      }

      return false;
    });
  }, [query]);

  return (
    <div className="max-w-2xl mx-auto space-y-4 sm:space-y-5 px-1 sm:px-0 pb-16">
      {/* 1 Day Streak Notification Toast */}
      <StreakNotificationToast show={showToast} mode="translation" onClose={dismissToast} />

      {/* Top Header with Back button and Title */}
      <div className="relative flex items-center justify-between min-h-[42px] px-1">
        <Link
          href="/"
          title="Back to Home Dashboard"
          className="inline-flex items-center justify-center px-4 py-1.5 rounded-xl text-xs sm:text-sm font-semibold tracking-wide text-[#193d2b] bg-white/90 hover:bg-[#efe9d8] active:bg-[#e4dcce] border border-[#d6cbaf] shadow-sm active:scale-95 transition-all duration-200 cursor-pointer"
        >
          Back
        </Link>

        <div className="text-center px-2">
          <h1 className="text-lg sm:text-2xl font-bold text-[#112a1d] tracking-wide">
            Tarjama & Tafseer
          </h1>
          <p className="text-[11px] text-[#527060] font-arabic" dir="rtl">
            مَعْرِفَةُ الْقُرْآن عَلَىٰ كَنْزِ الْعِرْفَان (مفتی محمد قاسم قادری)
          </p>
        </div>

        <span className="text-[11px] sm:text-xs font-semibold text-emerald-800 bg-[#edf5f0] border border-emerald-200 px-2.5 py-1 rounded-full shrink-0">
          {filteredSurahs.length} / 114
        </span>
      </div>

      {/* Search Input Box */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-700/70">
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Surah for Translation (e.g. Yaseen, 36, يس)..."
          autoComplete="off"
          autoCorrect="off"
          spellCheck="false"
          className="w-full pl-10 pr-10 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl bg-white border border-[#ded5c0] focus:border-emerald-600 text-sm sm:text-base text-[#112a1d] placeholder-[#6b8b7a] focus:outline-none focus:ring-1 focus:ring-emerald-600 shadow-sm transition-all"
        />

        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-emerald-700/60 hover:text-emerald-950 transition-colors"
            title="Clear search"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Surahs List for Translation */}
      <div className="flex flex-col gap-2">
        {filteredSurahs.map((m) => {
          const isSaved = savedSurahNumbers.has(m.number);
          return (
            <div key={m.number} className="relative group">
              <SurahListItem
                meta={m}
                customHref={`/tarjama?surah=${m.number}`}
              />
              {isSaved && (
                <div className="absolute right-28 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded-full">
                  <span>✓</span>
                  <span>Offline</span>
                </div>
              )}
            </div>
          );
        })}

        {filteredSurahs.length === 0 && (
          <div className="text-center py-12 px-4 rounded-2xl bg-white border border-[#e5ded0] shadow-sm space-y-3">
            <p className="text-sm font-semibold text-[#112a1d]">No Surah found matching "{query}"</p>
            <button
              onClick={() => setQuery("")}
              className="px-4 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-semibold"
            >
              Clear Search
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
