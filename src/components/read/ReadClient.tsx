"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loadSurah, getSurahMeta, SURAHS_META, type LoadedSurah, type Token } from "@/lib/quran/data";
import { MushafPage } from "@/components/mushaf/MushafPage";
import { toArabicDigits } from "@/components/mushaf/AyahMarker";
import { playAyah, stopAyah } from "@/lib/audio/player";

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
  const [viewMode, setViewMode] = useState<"pdf" | "text">("pdf");
  const [isFullscreenPdf, setIsFullscreenPdf] = useState(false);
  const [playingAyah, setPlayingAyah] = useState<number | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  const surahPdfUrl = `/mushaf16/surahs/${surahNumber}.pdf`;

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

  // Restore saved page position
  useEffect(() => {
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
    } catch (e) {
      console.error("Audio play error:", e);
      setIsPlayingAudio(false);
      setPlayingAyah(null);
    }
  };

  // Play audio for the current page sequentially
  const handlePlayPage = () => {
    if (isPlayingAudio) {
      stopAyah();
      setIsPlayingAudio(false);
      setPlayingAyah(null);
      return;
    }

    if (!loaded) return;
    const pageAyahs = loaded.ayahs.filter((a) => a.page === currentPage);
    if (pageAyahs.length === 0) return;

    let index = 0;
    const playNext = () => {
      if (index >= pageAyahs.length) {
        setIsPlayingAudio(false);
        setPlayingAyah(null);
        return;
      }
      const cur = pageAyahs[index];
      setPlayingAyah(cur.n);
      setIsPlayingAudio(true);
      const audio = playAyah(cur.id);
      currentAudioRef.current = audio;
      audio.onended = () => {
        index++;
        playNext();
      };
      audio.onerror = () => {
        index++;
        playNext();
      };
    };
    playNext();
  };

  // Group tokens of current page into 16 lines
  const linesMap = useMemo(() => {
    const map = new Map<number, Token[]>();
    for (let l = 1; l <= 16; l++) {
      map.set(l, []);
    }
    if (!loaded) return map;
    loaded.tokens.forEach((t) => {
      if (t.page === currentPage) {
        const arr = map.get(t.line) || [];
        arr.push(t);
        map.set(t.line, arr);
      }
    });
    return map;
  }, [loaded, currentPage]);

  if (loadErr) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 text-center space-y-4">
        <p className="text-sm font-semibold text-rose-700">Unable to load Surah data.</p>
        <Link
          href="/read"
          className="inline-block px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold"
        >
          Return to Surah List
        </Link>
      </div>
    );
  }

  if (!loaded) {
    return (
      <div className="max-w-xl mx-auto py-24 text-center space-y-3">
        <div className="w-9 h-9 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-semibold text-[#527060]">Opening Surah...</p>
      </div>
    );
  }

  return (
    <div
      className={`mx-auto transition-all ${
        isFullscreenPdf
          ? "fixed inset-0 z-50 bg-[#f8f6f0] p-2 sm:p-4 flex flex-col"
          : "max-w-3xl space-y-3 sm:space-y-4 px-2 sm:px-0 pb-16"
      }`}
    >
      {/* Top Navigation & Toolbar Bar */}
      <div className="flex items-center justify-between gap-2 border-b border-[#ded5c0] pb-2.5 shrink-0">
        {/* Left: Back button & Surah Jump */}
        <div className="flex items-center gap-2">
          <Link
            href="/read"
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#efe8d6] active:bg-[#e4dcce] border border-[#ded5c0] text-xs font-semibold text-[#112a1d] shadow-xs active:scale-95 transition-all"
          >
            ← Surahs
          </Link>

          <select
            value={surahNumber}
            onChange={(e) => {
              stopAyah();
              router.push(`/read/${e.target.value}`);
            }}
            className="text-xs sm:text-sm font-bold text-[#112a1d] bg-white border border-[#ded5c0] rounded-xl px-2.5 py-1.5 focus:outline-none cursor-pointer max-w-[150px] sm:max-w-[210px] truncate shadow-xs"
          >
            {SURAHS_META.map((s) => (
              <option key={s.number} value={s.number}>
                {s.number}. {s.name} ({s.arabicName})
              </option>
            ))}
          </select>
        </div>

        {/* Right Controls: Mode Toggle, Audio, Recite Switch */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* View Mode Toggle: 16-Line PDF vs Interactive Text */}
          <div className="flex items-center bg-[#faf7ee] border border-[#ded5c0] rounded-xl p-0.5 shadow-xs">
            <button
              onClick={() => {
                stopAyah();
                setIsPlayingAudio(false);
                setViewMode("pdf");
              }}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all active:scale-95 flex items-center gap-1 cursor-pointer ${
                viewMode === "pdf"
                  ? "bg-white text-emerald-950 font-bold shadow-xs border border-[#ded5c0]"
                  : "text-[#527060] hover:text-[#112a1d]"
              }`}
              title="View Authentic 16-Line Taj Company PDF"
            >
              <svg className="w-3.5 h-3.5 text-emerald-800" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <span>16-Line PDF</span>
            </button>

            <button
              onClick={() => setViewMode("text")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all active:scale-95 flex items-center gap-1 cursor-pointer ${
                viewMode === "text"
                  ? "bg-white text-emerald-950 font-bold shadow-xs border border-[#ded5c0]"
                  : "text-[#527060] hover:text-[#112a1d]"
              }`}
              title="Switch to Word-by-Word Mushaf with Audio"
            >
              <svg className="w-3.5 h-3.5 text-emerald-800" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
              <span>Interactive</span>
            </button>
          </div>

          {/* Audio Play Page button (shown in interactive text mode) */}
          {viewMode === "text" && (
            <button
              onClick={handlePlayPage}
              className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 border cursor-pointer ${
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
          )}

          {/* Switch to Recite with Mic */}
          <Link
            href={`/recite/${surahNumber}`}
            className="px-2.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1 shadow-xs active:scale-95 transition-all"
            title="Switch to Recitation Evaluation with Microphone"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
            </svg>
            <span className="hidden sm:inline">Recite (Mic)</span>
          </Link>
        </div>
      </div>

      {/* Mode 1: 16-Line Authentic Taj Company PDF Viewer */}
      {viewMode === "pdf" ? (
        <div
          className={`w-full rounded-2xl overflow-hidden border border-[#ded5c0] bg-white shadow-sm relative flex flex-col ${
            isFullscreenPdf ? "flex-1" : "h-[78vh] sm:h-[84vh]"
          }`}
        >
          {/* Top PDF Toolbar */}
          <div className="flex items-center justify-between p-2.5 bg-[#fbf9f4] border-b border-[#ded5c0] text-xs">
            <div className="flex items-center gap-2 truncate">
              <span className="font-bold text-[#112a1d] truncate">
                {loaded.meta.number}. Surah {loaded.meta.name}
              </span>
              <span className="font-quran text-emerald-900 text-sm" dir="rtl">
                ({loaded.meta.arabicName})
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <a
                href={surahPdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold flex items-center gap-1 active:scale-95 transition-all shadow-xs cursor-pointer"
                title="Open PDF in new tab"
              >
                <span>Open Tab</span>
              </a>

              <a
                href={surahPdfUrl}
                download={`Surah-${surahNumber}-${loaded.meta.name}-16Line.pdf`}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-[#efe9d8] border border-[#ded5c0] text-[#112a1d] font-semibold flex items-center gap-1 active:scale-95 transition-all shadow-xs cursor-pointer"
                title="Download Surah PDF"
              >
                <span>Download</span>
              </a>

              <button
                onClick={() => setIsFullscreenPdf((f) => !f)}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-[#efe9d8] border border-[#ded5c0] text-[#112a1d] font-semibold active:scale-95 transition-all cursor-pointer"
                title={isFullscreenPdf ? "Exit Fullscreen" : "Fullscreen"}
              >
                {isFullscreenPdf ? "Exit" : "Expand"}
              </button>
            </div>
          </div>

          {/* Embedded High-Performance PDF Object */}
          <object
            data={surahPdfUrl}
            type="application/pdf"
            className="w-full flex-1 border-0"
          >
            {/* Fallback for devices without inline PDF support */}
            <div className="flex flex-col items-center justify-center p-6 text-center h-full bg-[#fbf9f4] text-[#112a1d]">
              <div className="w-14 h-14 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-2xl mb-2 text-emerald-800">
                📖
              </div>
              <h2 className="text-base sm:text-lg font-bold mb-1">
                Surah {loaded.meta.name} ({loaded.meta.arabicName})
              </h2>
              <p className="text-xs text-[#527060] mb-3">16-Line Authentic Taj Company Mushaf PDF</p>
              <div className="flex gap-2">
                <a
                  href={surahPdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs"
                >
                  Open Surah PDF
                </a>
                <a
                  href={surahPdfUrl}
                  download={`Surah-${surahNumber}-${loaded.meta.name}-16Line.pdf`}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-[#efe9d8] border border-[#ded5c0] text-[#112a1d] text-xs font-semibold shadow-xs"
                >
                  Download
                </a>
              </div>
            </div>
          </object>
        </div>
      ) : (
        /* Mode 2: Interactive Word-by-Word Mode (without zoom controls) */
        <div className="space-y-3 sm:space-y-4">
          {/* Surah Title Calligraphy Banner (if on first page) */}
          {pageIdx === 0 && (
            <div className="text-center py-2 bg-gradient-to-r from-[#fbf8ee] via-white to-[#fbf8ee] border border-[#ded5c0] rounded-2xl shadow-xs space-y-1">
              <h1 className="font-surahTitle text-2xl sm:text-3xl font-bold text-[#112a1d]" dir="rtl">
                {loaded.meta.arabicName}
              </h1>
              <p className="text-xs text-[#527060]">
                {loaded.meta.name} • {loaded.meta.translation} • {loaded.meta.numberOfAyahs} Ayahs • {loaded.meta.revelationType}
              </p>
            </div>
          )}

          {/* The 16-Line Mushaf Page */}
          <MushafPage surahName={loaded.meta.arabicName} pageNumber={currentPage}>
            <div className="flex flex-col justify-between h-full font-quran select-none">
              {Array.from({ length: 16 }, (_, i) => i + 1).map((lineNum) => {
                const toks = linesMap.get(lineNum) || [];
                const isLineEmpty = toks.length === 0;

                return (
                  <div
                    key={`line-${currentPage}-${lineNum}`}
                    dir="rtl"
                    style={{ fontSize: "24px" }}
                    className={`flex items-center justify-between text-right leading-tight tracking-normal w-full px-1 min-h-[36px] ${
                      isLineEmpty ? "opacity-0" : ""
                    }`}
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
          <div className="bg-white border border-[#ded5c0] rounded-2xl p-3 shadow-xs flex items-center justify-between gap-3">
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

          <div className="text-center text-[11px] text-[#527060] space-y-0.5">
            <p>💡 Click any Ayah to listen to Sheikh Alafasy recitation, or use the Listen button.</p>
            <p>You can also use Left/Right Arrow keys to turn pages.</p>
          </div>
        </div>
      )}
    </div>
  );
}
