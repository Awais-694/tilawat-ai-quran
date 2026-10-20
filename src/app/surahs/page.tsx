"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SURAHS_META } from "@/lib/quran/data";
import { SurahListItem } from "@/components/common/SurahListItem";
import { normalizeArabic } from "@/lib/quran/normalize";

function normalizeEnglishSearch(str: string): string {
  return str
    .toLowerCase()
    .replace(/^surah\s*/i, "")
    // Strip Arabic articles: "al-", "an-", "ar-", "as-", "ash-", "at-", "az-", "ad-", "al ", "an ", etc.
    .replace(/^(al|an|ar|as|ash|at|az|ad|adh|aj|akh|al-|an-|ar-|as-|ash-|at-|az-|ad-)\s*/i, "")
    .replace(/[^a-z0-9]/g, "")
    .replace(/aa/g, "a")
    .replace(/ee/g, "i")
    .replace(/oo/g, "u")
    .replace(/ii/g, "i");
}

export default function SurahsPage() {
  const [query, setQuery] = useState("");

  const filteredSurahs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SURAHS_META;

    const isNum = /^\d+$/.test(q);
    const normQ = normalizeArabic(q);
    const normSearch = normalizeEnglishSearch(q);

    return SURAHS_META.filter((m) => {
      // 1. Check number (exact or prefix, e.g. "1" or "114")
      if (isNum) {
        if (m.number === parseInt(q, 10) || String(m.number).startsWith(q)) {
          return true;
        }
      }

      // 2. Check transliterated English name with smart article & vowel normalization
      // e.g. "al nas" matches "An-Naas", "baqarah" matches "Al-Baqara", "fatiha" matches "Al-Faatiha"
      const cleanName = m.name.toLowerCase().replace(/[^a-z0-9]/g, "");
      const cleanQ = q.replace(/[^a-z0-9]/g, "");
      const normName = normalizeEnglishSearch(m.name);

      if (
        m.name.toLowerCase().includes(q) ||
        (cleanQ && cleanName.includes(cleanQ)) ||
        (normSearch && normName.includes(normSearch))
      ) {
        return true;
      }

      // 3. Check English translation (e.g. "The Cow", "Mankind", "The Opening")
      if (m.translation.toLowerCase().includes(q)) {
        return true;
      }

      // 4. Check Arabic Name (normalized tashkeel-free)
      if (normQ && normalizeArabic(m.arabicName).includes(normQ)) {
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
          className="inline-flex items-center justify-center px-4 py-1.5 rounded-xl text-xs sm:text-sm font-semibold tracking-wide text-white bg-white/10 hover:bg-white/15 active:bg-white/20 border border-white/20 hover:border-emerald-400/50 shadow-[0_2px_10px_rgba(0,0,0,0.3)] backdrop-blur-md active:scale-95 transition-all duration-200 cursor-pointer"
        >
          Back
        </Link>

        <h1 className="text-lg sm:text-2xl font-bold text-white tracking-wide text-center">
          Select a Surah
        </h1>

        <span className="text-[11px] sm:text-xs font-semibold text-emerald-300/80 bg-emerald-950/80 border border-emerald-800/60 px-2.5 py-1 rounded-full">
          {filteredSurahs.length} / 114
        </span>
      </div>

      {/* Search Input Box */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-400/60">
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by Surah name, number, or translation..."
          autoComplete="off"
          autoCorrect="off"
          spellCheck="false"
          className="w-full pl-10 pr-10 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl bg-[#06150e]/90 border border-emerald-700/60 focus:border-emerald-400 text-sm sm:text-base text-white placeholder-emerald-300/40 focus:outline-none focus:ring-1 focus:ring-emerald-400 shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all"
        />

        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-emerald-400/60 hover:text-white transition-colors"
            title="Clear search"
            aria-label="Clear search"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Surahs List */}
      <div className="flex flex-col gap-2">
        {filteredSurahs.map((m) => (
          <SurahListItem key={m.number} meta={m} />
        ))}

        {/* Empty State */}
        {filteredSurahs.length === 0 && (
          <div className="text-center py-12 px-4 rounded-2xl bg-[#07170f]/60 border border-emerald-900/60 space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>
            <div className="space-y-1">
              <h3 className="text-sm sm:text-base font-semibold text-emerald-100">
                No Surah Found
              </h3>
              <p className="text-xs text-emerald-300/60">
                No Surah matching "{query}" was found.
              </p>
            </div>
            <button
              onClick={() => setQuery("")}
              className="px-4 py-1.5 rounded-lg bg-emerald-800/60 hover:bg-emerald-700/60 text-xs font-semibold text-white border border-emerald-600/50 transition-all active:scale-95"
            >
              Clear Search
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
