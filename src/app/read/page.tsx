"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { SURAHS_META } from "@/lib/quran/data";
import { SurahListItem } from "@/components/common/SurahListItem";
import { normalizeArabic } from "@/lib/quran/normalize";

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

interface LastReadBookmark {
  surahNumber: number;
  surahName: string;
  arabicName: string;
  pageNumber: number;
  totalPages?: number;
  timestamp: number;
}

export default function ReadIndexPage() {
  const [query, setQuery] = useState("");
  const [lastRead, setLastRead] = useState<LastReadBookmark | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("tilawat_last_read");
      if (raw) {
        setLastRead(JSON.parse(raw));
      }
    } catch {}
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
      {/* Top Header with Back button and Title */}
      <div className="relative flex items-center justify-between min-h-[42px] px-1">
        <Link
          href="/"
          title="Back to Home Dashboard"
          className="inline-flex items-center justify-center px-4 py-1.5 rounded-xl text-xs sm:text-sm font-semibold tracking-wide text-[#193d2b] bg-white/90 hover:bg-[#efe9d8] active:bg-[#e4dcce] border border-[#d6cbaf] shadow-sm active:scale-95 transition-all duration-200 cursor-pointer"
        >
          Back
        </Link>

        <div className="text-center">
          <h1 className="text-lg sm:text-2xl font-bold text-[#112a1d] tracking-wide">
            Read Quran
          </h1>
          <p className="text-[11px] text-[#527060]">16-Line Taj Company Mushaf</p>
        </div>


        <span className="text-[11px] sm:text-xs font-semibold text-emerald-800 bg-[#edf5f0] border border-emerald-200 px-2.5 py-1 rounded-full">
          {filteredSurahs.length} / 114
        </span>
      </div>

      {/* Last Read Bookmark Banner */}
      {lastRead && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#ffffff] via-[#fbf8ee] to-[#ffffff] border border-[#d6cbaf] p-3.5 sm:p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                  Continue Reading
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm sm:text-base text-[#112a1d]">
                    {lastRead.surahNumber}. {lastRead.surahName}
                  </span>
                  <span className="font-quran text-base text-[#143323]" dir="rtl">
                    {lastRead.arabicName}
                  </span>
                </div>
                <span className="text-xs text-[#527060]">Page {lastRead.pageNumber}{lastRead.totalPages ? ` of ${lastRead.totalPages}` : ""}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link
                href={`/read/${lastRead.surahNumber}${lastRead.pageNumber > 1 ? `?page=${lastRead.pageNumber}` : ""}`}
                className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm shadow-sm active:scale-95 transition-all shrink-0 cursor-pointer"
              >
                Resume
              </Link>
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.removeItem("tilawat_last_read");
                    setLastRead(null);
                  } catch {}
                }}
                className="w-8 h-8 rounded-xl bg-white hover:bg-rose-50 border border-[#ded5c0] hover:border-rose-200 text-stone-400 hover:text-rose-600 flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
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
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-700/70">
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Surah to read..."
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

      {/* Surahs List for Reading */}
      <div className="flex flex-col gap-2">
        {filteredSurahs.map((m) => (
          <SurahListItem
            key={m.number}
            meta={m}
            customHref={`/read/${m.number}`}
          />
        ))}

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
