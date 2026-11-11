"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SURAHS_META } from "@/lib/quran/data";
import { SurahListItem } from "@/components/common/SurahListItem";
import { normalizeArabic } from "@/lib/quran/normalize";

function normalizeEnglishSearch(str: string): string {
  return str
    .toLowerCase()
    .replace(/\b(surah|surath|surat|sura|soorah|sorah|suarh)\b/gi, "")
    .replace(/^(al|an|ar|as|ash|at|az|ad|adh|aj|akh|al-|an-|ar-|as-|ash-|at-|az-|ad-)\s*/i, "")
    .replace(/h\b/g, "") // e.g. baqarah -> baqara, fatihah -> fatiha, sajdah -> sajda
    .replace(/[^a-z0-9]/g, "")
    .replace(/aa/g, "a")
    .replace(/ee/g, "i")
    .replace(/oo/g, "u")
    .replace(/ii/g, "i")
    .replace(/uu/g, "u")
    .replace(/yasin/g, "yasin")
    .replace(/yaseen/g, "yasin");
}

function parseSurahAndAyahQuery(rawQuery: string): {
  surahQuery: string;
  ayahNumber: number | null;
} {
  const trimmed = rawQuery.trim();
  if (!trimmed) return { surahQuery: "", ayahNumber: null };

  // 1. Check "36:33" or "36/33" or "36-33"
  const colonMatch = trimmed.match(/^(\d{1,3})\s*[:/-]\s*(\d{1,3})$/);
  if (colonMatch) {
    return {
      surahQuery: colonMatch[1],
      ayahNumber: parseInt(colonMatch[2], 10),
    };
  }

  // 2. Check explicit "ayat/ayah/verse [no/number/#] N" anywhere in the string
  // e.g. "surah yaseen ayat no 33", "surath yaseen ayat 33", "ayat 33 surah yaseen"
  const explicitAyahMatch = trimmed.match(
    /\b(?:ayat|ayah|aayat|aya|verse|ayat\s*no\.?|ayah\s*no\.?|ayat\s*number|ayah\s*number|no\.?|number|#)\s*(?:no\.?|number|#|:|-)?\s*(\d{1,3})\b/i
  );
  if (explicitAyahMatch) {
    const ayahNum = parseInt(explicitAyahMatch[1], 10);
    const cleanedSurah = trimmed
      .replace(explicitAyahMatch[0], " ")
      .replace(/\b(surah|surath|surat|sura|soorah|sorah|suarh|ayat|ayah|aayat|aya|verse|no|number)\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (cleanedSurah) {
      return {
        surahQuery: cleanedSurah,
        ayahNumber: ayahNum,
      };
    }
  }

  // 3. Check "<surah name or number> <ayah number>" at the end
  // e.g. "yaseen 33", "surah yaseen 33", "al baqarah 255", "36 33"
  const cleanedTokens = trimmed
    .replace(/\b(surah|surath|surat|sura|soorah|sorah|suarh|ayat|ayah|aayat|aya|verse|no\.?|number|#)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  const trailingNumMatch = cleanedTokens.match(/^(.+?)\s+(\d{1,3})$/);
  if (trailingNumMatch) {
    const surahPart = trailingNumMatch[1].trim();
    const ayahNum = parseInt(trailingNumMatch[2], 10);
    if (surahPart && ayahNum > 0) {
      return {
        surahQuery: surahPart,
        ayahNumber: ayahNum,
      };
    }
  }

  return { surahQuery: trimmed, ayahNumber: null };
}

export default function SurahsPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const { surahQuery, ayahNumber } = useMemo(
    () => parseSurahAndAyahQuery(query),
    [query]
  );

  const filteredSurahs = useMemo(() => {
    const q = surahQuery.trim().toLowerCase();
    if (!q) return SURAHS_META;

    const isNum = /^\d+$/.test(q);
    const normQ = normalizeArabic(q);
    const normSearch = normalizeEnglishSearch(q);

    return SURAHS_META.filter((m) => {
      // 1. Check number (exact if ayahNumber is specified, or prefix otherwise)
      if (isNum) {
        if (ayahNumber !== null) {
          return m.number === parseInt(q, 10);
        }
        if (m.number === parseInt(q, 10) || String(m.number).startsWith(q)) {
          return true;
        }
      }

      // 2. Check transliterated English name with smart article & vowel normalization
      const cleanName = m.name.toLowerCase().replace(/[^a-z0-9]/g, "");
      const cleanQ = q.replace(/[^a-z0-9]/g, "");
      const normName = normalizeEnglishSearch(m.name);

      if (
        m.name.toLowerCase().includes(q) ||
        (cleanQ && cleanName.includes(cleanQ)) ||
        (normSearch && normName.includes(normSearch)) ||
        (normSearch && normSearch.includes(normName) && normName.length >= 3)
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
  }, [surahQuery, ayahNumber]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && filteredSurahs.length > 0) {
      const topSurah = filteredSurahs[0];
      if (ayahNumber && ayahNumber >= 1 && ayahNumber <= topSurah.numberOfAyahs) {
        router.push(`/recite/${topSurah.number}?ayah=${ayahNumber}`);
      } else {
        router.push(`/recite/${topSurah.number}`);
      }
    }
  };

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

        <h1 className="text-lg sm:text-2xl font-bold text-[#112a1d] tracking-wide text-center">
          Select a Surah
        </h1>

        <span className="text-[11px] sm:text-xs font-semibold text-emerald-800 bg-[#edf5f0] border border-emerald-200 px-2.5 py-1 rounded-full">
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
          onKeyDown={handleKeyDown}
          placeholder="Search Surah or Ayah (e.g. Surah Yaseen ayat 33, 36:33)..."
          autoComplete="off"
          autoCorrect="off"
          spellCheck="false"
          className="w-full pl-10 pr-10 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl bg-white border border-[#ded5c0] focus:border-emerald-600 text-sm sm:text-base text-[#112a1d] placeholder-[#6b8b7a] focus:outline-none focus:ring-1 focus:ring-emerald-600 shadow-[0_2px_10px_rgba(20,50,30,0.05)] transition-all"
        />

        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-emerald-700/60 hover:text-emerald-950 transition-colors cursor-pointer"
            title="Clear search"
            aria-label="Clear search"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Direct Ayah Match Banner when user searches for a specific Ayah */}
      {ayahNumber !== null && filteredSurahs.length > 0 && (
        <div className="space-y-2.5">
          {filteredSurahs.slice(0, 3).map((m) => {
            const isValidAyah = ayahNumber >= 1 && ayahNumber <= m.numberOfAyahs;
            return isValidAyah ? (
              <Link
                key={`ayah_jump_${m.number}_${ayahNumber}`}
                href={`/recite/${m.number}?ayah=${ayahNumber}`}
                className="block rounded-2xl border border-[#d6cbaf] hover:border-[#c5a059] bg-white shadow-[0_6px_20px_rgba(20,50,30,0.06)] hover:shadow-[0_8px_24px_rgba(20,50,30,0.1)] overflow-hidden transition-all active:scale-[0.99] group"
              >
                {/* Top Header Strip */}
                <div className="bg-[#143323] px-3.5 sm:px-4 py-2 flex items-center justify-between gap-2 border-b border-[#c5a059]/25">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-[#e6c885] shrink-0" />
                    <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-emerald-50 truncate">
                      Direct Ayah Match
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-[#f3dca2] text-[10px] font-bold tracking-wide shrink-0">
                      {m.number}:{ayahNumber}
                    </span>
                  </div>
                  <span
                    className="font-quran text-base sm:text-lg text-[#f3dca2] whitespace-nowrap leading-none shrink-0"
                    dir="rtl"
                  >
                    {m.arabicName}
                  </span>
                </div>

                {/* Main Card Body */}
                <div className="p-3 sm:p-4 bg-gradient-to-r from-white via-[#fdfcf9] to-[#fbf8ee]/70 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Gold-accented Ayah Badge */}
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-[#fbf8ee] border border-[#c5a059]/80 group-hover:bg-[#f5eed6] flex flex-col items-center justify-center shrink-0 shadow-xs transition-colors">
                      <span className="text-[8px] font-extrabold uppercase tracking-wider text-[#996515] leading-none">
                        Ayah
                      </span>
                      <span className="text-sm sm:text-base font-extrabold text-[#143323] leading-tight mt-0.5">
                        {ayahNumber}
                      </span>
                    </div>

                    {/* Surah & Ayah Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm sm:text-base text-[#112a1d] group-hover:text-emerald-950 truncate">
                          Surah {m.name} — Ayah {ayahNumber}
                        </span>
                      </div>
                      <span className="block text-[11px] sm:text-xs text-[#527060] truncate mt-0.5">
                        Open Mushaf page directly at Verse {m.number}:{ayahNumber}
                      </span>
                    </div>
                  </div>

                  {/* CTA Button */}
                  <span className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-[#143323] group-hover:bg-emerald-800 text-white text-xs sm:text-xs font-semibold shrink-0 shadow-sm transition-all">
                    <span>Open Ayah {ayahNumber}</span>
                    <svg
                      className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </span>
                </div>
              </Link>
            ) : (
              <div
                key={`ayah_invalid_${m.number}_${ayahNumber}`}
                className="bg-[#fdf8ed] border border-[#e2c68d] rounded-xl px-4 py-3 text-xs sm:text-sm text-[#785118] flex items-center justify-between gap-2 shadow-xs"
              >
                <span>
                  <strong>Surah {m.name}</strong> has <strong>{m.numberOfAyahs} Ayahs</strong> (Ayah {ayahNumber} does not exist in this Surah).
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Surahs List */}
      <div className="flex flex-col gap-2">
        {filteredSurahs.map((m) => {
          const validAyah =
            ayahNumber !== null && ayahNumber >= 1 && ayahNumber <= m.numberOfAyahs
              ? ayahNumber
              : null;
          return (
            <SurahListItem
              key={m.number}
              meta={m}
              customHref={validAyah ? `/recite/${m.number}?ayah=${validAyah}` : undefined}
            />
          );
        })}

        {/* Empty State */}
        {filteredSurahs.length === 0 && (
          <div className="text-center py-12 px-4 rounded-2xl bg-white border border-[#e5ded0] shadow-sm space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>
            <div className="space-y-1">
              <h3 className="text-sm sm:text-base font-semibold text-[#112a1d]">
                No Surah Found
              </h3>
              <p className="text-xs text-[#527060]">
                No Surah matching &quot;{query}&quot; was found.
              </p>
            </div>
            <button
              onClick={() => setQuery("")}
              className="px-4 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-xs font-semibold text-white transition-all active:scale-95 cursor-pointer"
            >
              Clear Search
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
