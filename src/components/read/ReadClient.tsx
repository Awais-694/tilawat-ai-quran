"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loadSurah, getSurahMeta, SURAHS_META, type LoadedSurah } from "@/lib/quran/data";
import { MushafPage } from "@/components/mushaf/MushafPage";
import { toArabicDigits } from "@/components/mushaf/AyahMarker";
import { playAyah, stopAyah } from "@/lib/audio/player";
import { getFontSize, setFontSize } from "@/lib/settings";

export function ReadClient({
  surahNumber,
  initialSurah,
}: {
  surahNumber: number;
  initialSurah?: LoadedSurah | null;
}) {
  const router = useRouter();
  const [loaded, setLoaded] = useState<LoadedSurah | null>(initialSurah ?? null);
  const [loadErr, setLoadErr] = useState(false);
  const [pageIdx, setPageIdx] = useState(0);
  const [fontSize, setFontSizeState] = useState(24);
  const [playingAyah, setPlayingAyah] = useState<number | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Load surah data
  useEffect(() => {
    if (initialSurah && initialSurah.meta.number === surahNumber) {
      setLoaded(initialSurah);
      return;
    }
    let on = true;
    loadSurah(surahNumber)
      .then((s) => {
        if (!on) return;
        if (s) setLoaded(s);
        else setLoadErr(true);
      })
      .catch((err) => {
        console.error("Failed to load surah for reading:", err);
        if (on) setLoadErr(true);
      });
    return () => {
      on = false;
    };
  }, [surahNumber, initialSurah]);

  // Load saved font size and saved page position
  useEffect(() => {
    setFontSizeState(getFontSize());

    // Restore last read page for this surah if available
    try {
      const raw = localStorage.getItem(`tilawat_read_page_${surahNumber}`);
      if (raw && loaded) {
        const savedPage = Number(raw);
        const idx = loaded.pages.indexOf(savedPage);
        if (idx >= 0) setPageIdx(idx);
      }
    } catch {}
  }, [surahNumber, loaded]);

  // Save bookmark whenever page changes
  useEffect(() => {
    if (!loaded || loaded.pages.length === 0) return;
    const curPage = loaded.pages[pageIdx];
    try {
      localStorage.setItem(`tilawat_read_page_${surahNumber}`, String(curPage));
      localStorage.setItem(
        "tilawat_last_read",
        JSON.stringify({
          surahNumber,
          surahName: loaded.meta.name,
          arabicName: loaded.meta.arabicName,
          pageNumber: curPage,
          timestamp: Date.now(),
        })
      );
    } catch {}
  }, [surahNumber, loaded, pageIdx]);

  // Stop audio when component unmounts
  useEffect(() => {
    return () => {
      stopAyah();
    };
  }, []);

  const totalPages = loaded ? loaded.pages.length : 1;
  const currentPage = loaded ? loaded.pages[pageIdx] : 1;

  // Zoom controls
  const handleZoom = (delta: number) => {
    const next = Math.max(22, Math.min(26, fontSize + delta));
    setFontSizeState(next);
    setFontSize(next);
  };

  // Turn page
  const nextPage = useCallback(() => {
    if (pageIdx < totalPages - 1) {
      stopAyah();
      setIsPlayingAudio(false);
      setPlayingAyah(null);
      setPageIdx((p) => p + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [pageIdx, totalPages]);

  const prevPage = useCallback(() => {
    if (pageIdx > 0) {
      stopAyah();
      setIsPlayingAudio(false);
      setPlayingAyah(null);
      setPageIdx((p) => p - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [pageIdx]);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // In RTL Arabic mushaf, left arrow goes to next page, right arrow to previous page
      if (e.key === "ArrowLeft") nextPage();
      if (e.key === "ArrowRight") prevPage();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nextPage, prevPage]);

  // Play audio for a specific ayah
  const handlePlayAyah = (ayahNum: number, globalAyahId: number) => {
    if (playingAyah === ayahNum && isPlayingAudio) {
      stopAyah();
      setIsPlayingAudio(false);
      setPlayingAyah(null);
      return;
    }

    stopAyah();
    if (!globalAyahId) return;

    try {
      const audio = playAyah(globalAyahId);
      currentAudioRef.current = audio;
      setPlayingAyah(ayahNum);
      setIsPlayingAudio(true);

      audio.onended = () => {
        setIsPlayingAudio(false);
        setPlayingAyah(null);
      };
      audio.onerror = () => {
        setIsPlayingAudio(false);
        setPlayingAyah(null);
      };
    } catch {
      setIsPlayingAudio(false);
      setPlayingAyah(null);
    }
  };

  // Tokens on the current page grouped by line
  const pageTokens = useMemo(() => {
    if (!loaded) return [];
    return loaded.tokens.filter((t) => t.page === currentPage);
  }, [loaded, currentPage]);

  const lines = useMemo(() => {
    const m = new Map<number, typeof pageTokens>();
    for (const t of pageTokens) {
      const arr = m.get(t.line) ?? [];
      arr.push(t);
      m.set(t.line, arr);
    }
    return m;
  }, [pageTokens]);

  const pageAyahs = useMemo(() => {
    if (!loaded) return [];
    const set = new Set<number>();
    pageTokens.forEach((t) => {
      if (t.ayahNumber > 0) set.add(t.ayahNumber);
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [loaded, pageTokens]);

  // Play first ayah of current page
  const handlePlayPage = () => {
    if (pageAyahs.length === 0) return;
    const firstAyah = pageAyahs[0];
    const tok = pageTokens.find((t) => t.ayahNumber === firstAyah && t.globalAyahId > 0);
    if (tok) handlePlayAyah(firstAyah, tok.globalAyahId);
  };

  if (loadErr) {
    return (
      <div className="text-center py-12 space-y-3">
        <p className="text-rose-700 font-semibold">Could not load this Surah.</p>
        <Link href="/read" className="px-4 py-2 bg-emerald-700 text-white rounded-xl text-sm">
          Back to Surah List
        </Link>
      </div>
    );
  }

  if (!loaded) {
    return (
      <div className="text-center py-16 space-y-3">
        <div className="w-8 h-8 mx-auto border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-[#3b5e4c] font-medium text-sm">Opening Mushaf Page…</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-20 px-1 sm:px-0">
      {/* Top Floating Control Bar */}
      <div className="sticky top-14 z-30 bg-white/95 backdrop-blur-md border border-[#e5ded0] rounded-2xl p-2.5 sm:px-4 sm:py-3 shadow-md flex items-center justify-between gap-2">
        {/* Back and Surah Selector */}
        <div className="flex items-center gap-2 min-w-0">
          <Link
            href="/read"
            className="p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-[#faf7ee] hover:bg-[#efe8d6] border border-[#ded5c0] text-[#1b3d2b] font-semibold text-xs sm:text-sm flex items-center gap-1 active:scale-95 transition-all"
            title="Back to Reading Index"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <span className="hidden sm:inline">Surahs</span>
          </Link>

          {/* Surah dropdown switcher */}
          <select
            value={surahNumber}
            onChange={(e) => router.push(`/read/${e.target.value}`)}
            className="text-xs sm:text-sm font-bold text-[#112a1d] bg-white border border-[#ded5c0] rounded-xl px-2 py-1.5 focus:outline-none focus:border-emerald-600 cursor-pointer max-w-[140px] sm:max-w-[200px] truncate"
          >
            {SURAHS_META.map((s) => (
              <option key={s.number} value={s.number}>
                {s.number}. {s.name} ({s.arabicName})
              </option>
            ))}
          </select>
        </div>

        {/* Center / Right Controls: Font size, Audio, Mode switch */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Font Zoom Controls */}
          <div className="flex items-center bg-[#faf7ee] border border-[#ded5c0] rounded-xl p-0.5">
            <button
              onClick={() => handleZoom(-1)}
              disabled={fontSize <= 22}
              className="px-2 py-1 text-xs font-bold text-[#1b3d2b] hover:bg-[#eee6d3] disabled:opacity-40 rounded-lg transition-colors"
              title="Decrease Font Size"
            >
              A-
            </button>
            <span className="text-[11px] font-mono text-[#527060] px-1">{fontSize}</span>
            <button
              onClick={() => handleZoom(1)}
              disabled={fontSize >= 26}
              className="px-2 py-1 text-xs font-bold text-[#1b3d2b] hover:bg-[#eee6d3] disabled:opacity-40 rounded-lg transition-colors"
              title="Increase Font Size"
            >
              A+
            </button>
          </div>

          {/* Audio Play Page button */}
          <button
            onClick={handlePlayPage}
            className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 border ${
              isPlayingAudio
                ? "bg-amber-100 border-amber-300 text-amber-900"
                : "bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-800"
            }`}
            title={isPlayingAudio ? "Stop Audio" : "Listen to this page (Sheikh Alafasy)"}
          >
            {isPlayingAudio ? (
              <svg className="w-4 h-4 fill-current animate-pulse" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
            <span className="hidden md:inline">{isPlayingAudio ? "Stop" : "Listen"}</span>
          </button>

          {/* Switch to Recite with Mic */}
          <Link
            href={`/recite/${surahNumber}`}
            className="px-2.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1 shadow-sm active:scale-95 transition-all"
            title="Switch to Recitation Evaluation with Microphone"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
            </svg>
            <span className="hidden sm:inline">Recite (Mic)</span>
          </Link>
        </div>
      </div>

      {/* Surah Title Calligraphy Banner (if on first page) */}
      {pageIdx === 0 && (
        <div className="text-center py-2 bg-gradient-to-r from-[#fbf8ee] via-white to-[#fbf8ee] border border-[#ded5c0] rounded-2xl shadow-sm space-y-1">
          <h1 className="font-surahTitle text-2xl sm:text-3xl font-bold text-[#112a1d]" dir="rtl">
            {loaded.meta.arabicName}
          </h1>
          <p className="text-xs text-[#527060]">
            {loaded.meta.name} • {loaded.meta.translation} • {loaded.meta.numberOfAyahs} Ayahs • {loaded.meta.revelationType}
          </p>
        </div>
      )}

      {/* The 16-Line Taj Company Mushaf Page */}
      <MushafPage
        surahName={loaded.meta.arabicName}
        pageNumber={currentPage}
        manzil={`منزل ${loaded.manzil}`}
        fontSize={fontSize}
      >
        <div className="space-y-0.5 sm:space-y-1 select-text">
          {Array.from(lines.keys())
            .sort((a, b) => a - b)
            .map((lineNum) => {
              const toks = lines.get(lineNum) ?? [];
              const isBasmala = toks.length > 0 && toks[0].ayahNumber === 0;

              if (isBasmala) {
                return (
                  <div
                    key={`line-${lineNum}`}
                    className="text-center font-bismillah py-1 sm:py-2 text-[#133020] text-xl sm:text-2xl border-y border-[#ebd7b2]/50 my-1 bg-[#faf7ed]/60"
                  >
                    بِسۡمِ اللّٰهِ الرَّحۡمٰنِ الرَّحِیۡمِ
                  </div>
                );
              }

              return (
                <div
                  key={`line-${lineNum}`}
                  className="w-full flex items-center justify-between text-justify px-0.5"
                >
                  {toks.map((t, idx) => {
                    const isPlayingThisAyah = playingAyah === t.ayahNumber && isPlayingAudio;
                    return (
                      <span
                        key={`tok-${lineNum}-${idx}-${t.display}`}
                        onClick={() => {
                          if (t.ayahNumber > 0 && t.globalAyahId > 0) {
                            handlePlayAyah(t.ayahNumber, t.globalAyahId);
                          }
                        }}
                        className={`inline transition-colors cursor-pointer rounded px-0.5 ${
                          isPlayingThisAyah
                            ? "bg-amber-200/80 text-amber-950 font-bold"
                            : "text-[#102419] hover:text-emerald-800 hover:bg-emerald-50"
                        }`}
                        title={t.ayahNumber > 0 ? `Click to listen Ayah ${t.ayahNumber}` : undefined}
                      >
                        {t.display}{" "}
                      </span>
                    );
                  })}
                </div>
              );
            })}
        </div>
      </MushafPage>

      {/* Bottom Page Navigation Controls */}
      <div className="bg-white border border-[#ded5c0] rounded-2xl p-3 shadow-sm flex items-center justify-between gap-3">
        {/* Next Page Button (In Arabic Mushaf: left is next page) */}
        <button
          onClick={nextPage}
          disabled={pageIdx >= totalPages - 1}
          className="flex-1 py-2.5 px-3 rounded-xl bg-[#faf7ee] hover:bg-[#efe8d6] disabled:opacity-40 border border-[#ded5c0] text-[#112a1d] font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span>Next Page</span>
        </button>

        {/* Page selector dropdown */}
        <div className="text-center shrink-0">
          <select
            value={pageIdx}
            onChange={(e) => {
              setPageIdx(Number(e.target.value));
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="text-xs sm:text-sm font-bold text-emerald-900 bg-[#edf5f0] border border-emerald-300 rounded-xl px-2.5 py-1.5 focus:outline-none cursor-pointer"
          >
            {loaded.pages.map((p, idx) => (
              <option key={p} value={idx}>
                Page {toArabicDigits(p)} ({idx + 1} / {totalPages})
              </option>
            ))}
          </select>
        </div>

        {/* Previous Page Button (In Arabic Mushaf: right is previous page) */}
        <button
          onClick={prevPage}
          disabled={pageIdx <= 0}
          className="flex-1 py-2.5 px-3 rounded-xl bg-[#faf7ee] hover:bg-[#efe8d6] disabled:opacity-40 border border-[#ded5c0] text-[#112a1d] font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
        >
          <span>Previous Page</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Helpful Hint */}
      <div className="text-center text-[11px] text-[#527060] space-y-0.5">
        <p>💡 Click any Ayah to listen to Sheikh Alafasy recitation, or use the Listen button.</p>
        <p>You can also use Left/Right Arrow keys to turn pages.</p>
      </div>
    </div>

  );
}
