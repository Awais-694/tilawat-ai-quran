"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { SURAHS_META } from "@/lib/quran/data";
import { SurahListItem } from "@/components/common/SurahListItem";
import { normalizeArabic } from "@/lib/quran/normalize";
import { getAllSavedTajweedPdfs } from "@/lib/storage/tajweedStorage";
import { useStreakTracker, StreakNotificationToast } from "@/lib/quran/streakTracker";

interface LastReadBookmark {
  surahNumber: number;
  surahName: string;
  arabicName: string;
  pageNumber: number;
  totalPages?: number;
  timestamp: number;
}

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

export function TajweedIndexClient() {
  const [query, setQuery] = useState("");
  const [savedSurahNumbers, setSavedSurahNumbers] = useState<Set<number>>(new Set());
  const [lastRead, setLastRead] = useState<LastReadBookmark | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("tilawat_last_tajweed_read");
      if (raw) {
        setLastRead(JSON.parse(raw));
      }
    } catch {}
  }, []);

  // 30 seconds spent in Tajweed unlocks 1-day streak
  const { showToast, dismissToast } = useStreakTracker({
    mode: "tajweed",
  });

  // Load list of offline saved Tajweed Surahs from IndexedDB
  useEffect(() => {
    let active = true;
    getAllSavedTajweedPdfs()
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
      <StreakNotificationToast show={showToast} mode="tajweed" onClose={dismissToast} />

      {/* Top Header with Back button and Title */}
      <div className="relative flex items-center justify-between min-h-[42px] px-1">
        <Link
          href="/"
          title="Back to Home Dashboard"
          className="inline-flex items-center justify-center px-4 py-1.5 rounded-xl text-xs sm:text-sm font-semibold tracking-wide text-[#193d2b] bg-white hover:bg-[#efe9d8] active:bg-[#e4dcce] border border-[#d6cbaf] shadow-xs active:scale-95 transition-all duration-200 cursor-pointer"
        >
          ← Dashboard
        </Link>

        <div className="text-center px-2">
          <h1 className="text-lg sm:text-2xl font-bold text-[#112a1d] tracking-wide">
            Tajweed Quran
          </h1>
          <p className="text-[11px] text-[#0f766e] font-arabic font-semibold" dir="rtl">
            تجوید القرآن الکریم (16 سطری رنگین)
          </p>
        </div>

        <span className="text-[11px] sm:text-xs font-semibold text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-full shrink-0">
          {filteredSurahs.length} / 114
        </span>
      </div>

      {/* Last Read Tajweed Bookmark Banner */}
      {lastRead && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#ffffff] via-[#f0fdf9] to-[#ffffff] border border-teal-200/90 p-3.5 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-100 border border-teal-300 text-teal-800 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800">
                  Continue Tajweed (تجوید القرآن)
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm sm:text-base text-[#112a1d]">
                    {lastRead.surahNumber}. {lastRead.surahName}
                  </span>
                  <span className="font-quran text-base text-[#143323]" dir="rtl">
                    {lastRead.arabicName}
                  </span>
                </div>
                <span className="text-xs text-[#527060]">
                  Page {lastRead.pageNumber}{lastRead.totalPages ? ` of ${lastRead.totalPages}` : ""}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link
                href={`/tajweed?surah=${lastRead.surahNumber}${lastRead.pageNumber > 1 ? `&page=${lastRead.pageNumber}` : ""}`}
                className="px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs sm:text-sm shadow-xs active:scale-95 transition-all shrink-0 cursor-pointer"
              >
                Resume
              </Link>
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.removeItem("tilawat_last_tajweed_read");
                    setLastRead(null);
                  } catch {}
                }}
                className="w-8 h-8 rounded-xl bg-white hover:bg-rose-50 border border-teal-200 hover:border-rose-200 text-stone-400 hover:text-rose-600 flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
                title="Dismiss Bookmark"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search Input Box */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Surah name, number, or Arabic (e.g. Mulk, 67, الملك)..."
          className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-white border border-[#ded5c0] focus:border-teal-600 focus:outline-none text-xs sm:text-sm text-[#112a1d] placeholder-[#859f90] shadow-2xs transition-colors"
        />
        <svg
          className="w-4 h-4 text-[#859f90] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#859f90] hover:text-[#112a1d] p-1 cursor-pointer"
          >
            ✕
          </button>
        )}
      </div>

      {/* 114 Surahs Directory List */}
      <div className="flex flex-col gap-2">
        {filteredSurahs.map((meta) => {
          const isOffline = savedSurahNumbers.has(meta.number);
          return (
            <div key={meta.number} className="relative group">
              <SurahListItem
                meta={meta}
                customHref={`/tajweed?surah=${meta.number}`}
              />
              {isOffline && (
                <div className="absolute right-28 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:flex items-center gap-1 text-[10px] font-bold text-teal-800 bg-teal-50 border border-teal-300 px-2 py-0.5 rounded-full">
                  <span>✓</span>
                  <span>Offline</span>
                </div>
              )}
            </div>
          );
        })}

        {filteredSurahs.length === 0 && (
          <div className="p-8 text-center text-xs text-[#859f90] bg-white rounded-2xl border border-[#ded5c0]">
            کوئی سورت &quot;{query}&quot; کے نام سے نہیں ملی۔
          </div>
        )}
      </div>
    </div>
  );
}
