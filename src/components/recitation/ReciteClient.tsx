"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { loadSurah, type LoadedSurah } from "@/lib/quran/data";
import { normalizeArabic, MUQATTA_AT_FORMS, WORD_ALIASES } from "@/lib/quran/normalize";
import { useRecitation } from "@/hooks/useRecitation";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useWhisper } from "@/hooks/useWhisper";
import { MushafPage } from "@/components/mushaf/MushafPage";
import { MushafWord } from "@/components/mushaf/MushafWord";
import { toArabicDigits } from "@/components/mushaf/AyahMarker";
import { ProgressBar } from "@/components/common/ProgressBar";
import { FeedbackPanel } from "@/components/recitation/FeedbackPanel";
import { MicButton } from "@/components/recitation/MicButton";
import { playAyah } from "@/lib/audio/player";
import { db } from "@/lib/storage/db";
import {
  getEnginePref,
  getFontSize,
  type EnginePref,
} from "@/lib/settings";
import mushafMeta from "@/data/mushaf-meta.json";
import type { WordState, WordToken } from "@/types/quran";

export function ReciteClient({
  surahNumber,
  initialSurah,
}: {
  surahNumber: number;
  initialSurah?: LoadedSurah | null;
}) {
  const [loaded, setLoaded] = useState<LoadedSurah | null>(initialSurah ?? null);
  const [loadErr, setLoadErr] = useState(false);

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
        console.error("Failed to load surah:", err);
        if (on) setLoadErr(true);
      });
    return () => {
      on = false;
    };
  }, [surahNumber, initialSurah]);

  const recTokens = useMemo<WordToken[]>(
    () =>
      loaded
        ? loaded.tokens.map((t) => {
            const normalized = normalizeArabic(t.display);
            const daggerNorm = normalizeArabic(t.display, { daggerAsAlef: true });
            const extraForms = [
              ...(MUQATTA_AT_FORMS[normalized] ?? []),
              ...(WORD_ALIASES[normalized] ?? []),
              ...(WORD_ALIASES[daggerNorm] ?? []),
            ];
            const forms = [
              ...new Set([
                ...extraForms,
                daggerNorm,
                normalizeArabic(t.display, { maksuraAsAlef: true }),
                normalizeArabic(t.display, { daggerAsAlef: true, maksuraAsAlef: true }),
                normalizeArabic(t.display.replace(/ؤ/g, "ئ")),
                normalizeArabic(t.display.replace(/ئ/g, "ؤ")),
                normalizeArabic(t.display.replace(/[ظض]/g, "ذ")),
                normalizeArabic(t.display.replace(/[ذض]/g, "ز")),
                normalizeArabic(t.display.replace(/ص/g, "س")),
                normalizeArabic(t.display.replace(/ط/g, "ت")),
                normalizeArabic(t.display.replace(/ح/g, "ه")),
              ]),
            ].filter((f) => f !== normalized);
            return {
              display: t.display,
              normalized,
              forms,
              state: "hidden" as WordState,
              ayahNumber: t.ayahNumber,
              page: t.page,
            };
          })
        : [],
    [loaded]
  );

  const {
    revealed,
    displayRevealed,
    mistakes,
    lastHeard,
    handleResult,
    reset,
    jumpToProgress,
    completed,
  } = useRecitation(recTokens);

  const ws = useSpeechRecognition(handleResult);
  const wh = useWhisper(handleResult);

  // ---- settings + online status ----
  const [mounted, setMounted] = useState(false);
  const [enginePref, setEnginePref] = useState<EnginePref>("auto");
  const [fontSize, setFontSize] = useState<number>(24);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setMounted(true);
    setEnginePref(getEnginePref());
    setFontSize(getFontSize());
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    const onFocusOrStorage = () => {
      setFontSize(getFontSize());
      setEnginePref(getEnginePref());
    };
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    window.addEventListener("focus", onFocusOrStorage);
    window.addEventListener("storage", onFocusOrStorage);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      window.removeEventListener("focus", onFocusOrStorage);
      window.removeEventListener("storage", onFocusOrStorage);
    };
  }, []);

  const router = useRouter();

  const handleBack = () => {
    void saveRef.current();
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/surahs");
    }
  };

  const activeEngine = enginePref === "auto" ? (online ? "webspeech" : "whisper") : enginePref;
  const listening = activeEngine === "webspeech" ? ws.listening : wh.listening;

  // ---- progress saving & restoring (IndexedDB) ----
  const savedRevealed = useRef(0);
  const savedMistakes = useRef(0);
  const sessionCounted = useRef(false);
  const initialLoadedRef = useRef(false);
  const lastSavedTime = useRef(Date.now());
  // Restore progress on first load: Resume from exact Ayah where user left off!
  useEffect(() => {
    if (!loaded || initialLoadedRef.current || recTokens.length === 0) return;
    initialLoadedRef.current = true;

    db.progress.get(surahNumber).then((saved) => {
      let wordsToResume = saved?.revealedWords ?? 0;
      try {
        const rawLast = localStorage.getItem("tilawat_last_recitation");
        if (rawLast) {
          const parsed = JSON.parse(rawLast);
          if (parsed?.surahNumber === surahNumber && typeof parsed.revealedWords === "number") {
            wordsToResume = Math.max(wordsToResume, parsed.revealedWords);
          }
        }
      } catch {}

      if (
        wordsToResume > 0 &&
        (!saved || !saved.completed) &&
        wordsToResume < recTokens.length
      ) {
        jumpToProgress(wordsToResume);
        savedRevealed.current = wordsToResume;

        // Auto jump to the page of the current unread word
        const nextToken = loaded.tokens[wordsToResume];
        const pg = nextToken?.page ?? loaded.pages[0];
        const pi = loaded.pages.indexOf(pg);
        if (pi >= 0) setPageIdx(pi);
      }
    });
  }, [loaded, surahNumber, recTokens.length, jumpToProgress]);

  const saveProgress = async () => {
    if (!loaded) return;
    const effectiveRevealed = Math.max(revealed, displayRevealed);
    if (effectiveRevealed === 0 && mistakes === 0) return;
    const today = new Date().toISOString().slice(0, 10);
    const rDelta = Math.max(0, effectiveRevealed - savedRevealed.current);
    const mDelta = Math.max(0, mistakes - savedMistakes.current);
    const ex = await db.progress.get(surahNumber);
    const isDone = completed || effectiveRevealed >= loaded.tokens.length;
    const currentAyah = loaded.tokens[Math.min(effectiveRevealed, loaded.tokens.length - 1)]?.ayahNumber || 1;

    await db.progress.put({
      surahNumber,
      revealedWords: effectiveRevealed,
      totalWords: loaded.tokens.length,
      completed: isDone,
      completedAt: isDone ? (ex?.completedAt ?? Date.now()) : ex?.completedAt,
      completedTimes: isDone
        ? (ex?.completedTimes ?? 0) + (ex?.completed ? 0 : 1)
        : (ex?.completedTimes ?? 0),
      lastPracticedAt: Date.now(),
      lastAyahNumber: currentAyah,
    });
    try {
      if (isDone) {
        // If completed, remove from tilawat_last_recitation so Resume card never shows a completed surah
        const raw = localStorage.getItem("tilawat_last_recitation");
        if (raw) {
          const p = JSON.parse(raw);
          if (p?.surahNumber === surahNumber) {
            localStorage.removeItem("tilawat_last_recitation");
          }
        }
      } else {
        localStorage.setItem(
          "tilawat_last_recitation",
          JSON.stringify({
            surahNumber,
            revealedWords: effectiveRevealed,
            totalWords: loaded.tokens.length,
            lastAyahNumber: currentAyah,
            completed: false,
            timestamp: Date.now(),
          })
        );
      }
    } catch {}

    const now = Date.now();
    const timeDeltaSec = Math.max(1, Math.round((now - lastSavedTime.current) / 1000));
    lastSavedTime.current = now;

    if (rDelta || mDelta || sessionCounted.current) {
      const row = await db.activity.get(today);
      const prevSurahs = row?.surahsPracticed ?? [];
      const updatedSurahs = Array.from(new Set([...prevSurahs, surahNumber]));
      const totalWords = (row?.wordsRevealed ?? 0) + rDelta;
      const minEstimated = totalWords > 0 ? Math.round(totalWords * 1.3) : 0;
      // Calculate realistic active time (at least 1.3s per revealed word)
      const timeCredit = Math.max(timeDeltaSec <= 600 ? timeDeltaSec : 0, Math.round(rDelta * 1.3));
      const newSec = Math.max((row?.timeSpentSeconds ?? 0) + timeCredit, minEstimated);
      await db.activity.put({
        date: today,
        wordsRevealed: totalWords,
        mistakes: (row?.mistakes ?? 0) + mDelta,
        sessions: (row?.sessions ?? 0) + (sessionCounted.current ? 1 : 0),
        timeSpentSeconds: newSec,
        surahsPracticed: updatedSurahs,
      });
      sessionCounted.current = false;
    }
    savedRevealed.current = effectiveRevealed;
    savedMistakes.current = mistakes;
  };
  const saveRef = useRef(saveProgress);
  saveRef.current = saveProgress;

  useEffect(() => {
    if (completed) {
      void saveRef.current();
    }
  }, [completed]);

  useEffect(() => {
    const effectiveRevealed = Math.max(revealed, displayRevealed);
    if (!loaded || (effectiveRevealed === 0 && mistakes === 0)) return;
    const t = setTimeout(() => void saveRef.current(), 800);
    return () => clearTimeout(t);
  }, [revealed, displayRevealed, mistakes, loaded]);

  useEffect(() => {
    const onBeforeUnload = () => {
      void saveRef.current();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      void saveRef.current();
    };
  }, []);

  // Active recitation live timer: accumulates active recitation seconds while listening
  const activeSecondsBuffer = useRef(0);
  useEffect(() => {
    if (!listening) return;
    const interval = setInterval(() => {
      activeSecondsBuffer.current += 1;
      if (activeSecondsBuffer.current >= 10) {
        const toAdd = activeSecondsBuffer.current;
        activeSecondsBuffer.current = 0;
        const today = new Date().toISOString().slice(0, 10);
        void db.activity.get(today).then((row) => {
          if (row) {
            void db.activity.put({
              ...row,
              timeSpentSeconds: (row.timeSpentSeconds ?? 0) + toAdd,
            });
          }
        });
      }
    }, 1000);
    return () => {
      clearInterval(interval);
      if (activeSecondsBuffer.current > 0) {
        const toAdd = activeSecondsBuffer.current;
        activeSecondsBuffer.current = 0;
        const today = new Date().toISOString().slice(0, 10);
        void db.activity.get(today).then((row) => {
          if (row) {
            void db.activity.put({
              ...row,
              timeSpentSeconds: (row.timeSpentSeconds ?? 0) + toAdd,
            });
          }
        });
      }
    };
  }, [listening]);

  // ---- galat lafz par red flash + kamzor lafz record ----
  const [flash, setFlash] = useState(false);
  const prevMistakes = useRef(0);
  useEffect(() => {
    if (mistakes > prevMistakes.current) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 650);
      const stuck = recTokens[revealed]?.display;
      if (stuck) {
        void (async () => {
          const row = await db.wrongWords.get(stuck);
          await db.wrongWords.put({ word: stuck, count: (row?.count ?? 0) + 1 });
        })();
      }
      return () => clearTimeout(t);
    }
    prevMistakes.current = mistakes;
  }, [mistakes, revealed, recTokens]);

  // ---- page navigation (recitation ke saath auto-follow) ----
  const [pageIdx, setPageIdx] = useState(0);
  const [autoFollow, setAutoFollow] = useState(true);
  const total = loaded?.tokens.length ?? 0;
  useEffect(() => {
    if (!loaded || !autoFollow) return;
    const idx = Math.min(displayRevealed, total - 1);
    const pg = loaded.tokens[idx]?.page;
    const pi = loaded.pages.indexOf(pg);
    if (pi >= 0 && pi !== pageIdx) setPageIdx(pi);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayRevealed, loaded, autoFollow]);

  const toggleMic = () => {
    if (activeEngine === "webspeech") {
      if (ws.listening) ws.stop();
      else {
        sessionCounted.current = true;
        ws.start();
      }
    } else {
      if (wh.listening) wh.stop();
      else {
        sessionCounted.current = true;
        void wh.start();
      }
    }
  };

  const handleReset = async () => {
    ws.stop();
    wh.stop();
    ws.resetFinals();
    wh.resetFinals();
    reset();
    savedRevealed.current = 0;
    savedMistakes.current = 0;
    setPageIdx(0);
    try {
      await db.progress.delete(surahNumber);
      const rawLast = localStorage.getItem("tilawat_last_recitation");
      if (rawLast) {
        const parsed = JSON.parse(rawLast);
        if (parsed?.surahNumber === surahNumber) {
          localStorage.removeItem("tilawat_last_recitation");
        }
      }
    } catch (err) {
      console.error("Failed to delete progress from db:", err);
    }
  };

  const handleJumpToAyah = async (ayahNumber: number) => {
    if (!loaded) return;
    const targetIdx = loaded.tokens.findIndex((t) => t.ayahNumber === ayahNumber);
    if (targetIdx >= 0) {
      ws.stop();
      wh.stop();
      ws.resetFinals();
      wh.resetFinals();
      jumpToProgress(targetIdx);
      savedRevealed.current = targetIdx;

      // Navigate to the page of this ayah
      const pg = loaded.tokens[targetIdx]?.page;
      const pi = loaded.pages.indexOf(pg);
      if (pi >= 0) setPageIdx(pi);

      try {
        await db.progress.put({
          surahNumber,
          revealedWords: targetIdx,
          totalWords: loaded.tokens.length,
          completed: false,
          lastPracticedAt: Date.now(),
          lastAyahNumber: ayahNumber,
        });
      } catch (e) {
        console.error(e);
      }
    }
  };

  const currentAyahNumber = useMemo(() => {
    if (!loaded) return 1;
    const idx = Math.min(displayRevealed, loaded.tokens.length - 1);
    return loaded.tokens[idx]?.ayahNumber || 1;
  }, [loaded, displayRevealed]);

  const playCurrentAyah = () => {
    if (!loaded) return;
    const idx = Math.min(displayRevealed, total - 1);
    const tok = loaded.tokens[idx];
    const id = tok?.globalAyahId || loaded.ayahs[0]?.id;
    if (id) playAyah(id);
  };

  if (loadErr) return <p className="text-center py-10 text-rose-300">Could not load this surah&apos;s data.</p>;
  if (!loaded) return <p className="text-center py-10 text-emerald-300/70">Loading the Mushaf…</p>;

  const currentPage = loaded.pages[pageIdx];
  const pageTokens = loaded.tokens
    .map((t, idx) => ({ ...t, idx }))
    .filter((t) => t.page === currentPage);
  const lines = new Map<number, typeof pageTokens>();
  for (const t of pageTokens) {
    const arr = lines.get(t.line) ?? [];
    arr.push(t);
    lines.set(t.line, arr);
  }
  const isSurahStartPage = loaded.tokens[0]?.page === currentPage;
  const firstAyahOnPage = loaded.ayahs.find((a) => a.page === currentPage);
  const pct = total ? Math.round((displayRevealed / total) * 100) : 0;
  const stateOf = (idx: number): WordState =>
    idx < displayRevealed ? "correct" : idx === displayRevealed ? (flash ? "wrong" : "current") : "hidden";

  return (
    <div className="space-y-4">
      {/* Top Header Card: Ultra-Professional Surah Metadata & Progress */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#0c1e15]/95 via-[#07160f]/95 to-[#040e09]/95 border border-[#1d442f]/80 p-3.5 sm:p-5 shadow-[0_12px_40px_rgba(0,0,0,0.5)] backdrop-blur-md">
        {/* Subtle luminous top accent line */}
        <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent" />

        {/* Top Utility Bar: Back button & Ayah Jump Selector */}
        <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
          {/* Back Button */}
          <button
            onClick={handleBack}
            title="Go back"
            className="inline-flex items-center justify-center px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold tracking-wide text-emerald-100 bg-[#0d2217]/90 hover:bg-[#133022] border border-emerald-600/50 hover:border-emerald-400/80 shadow-[0_2px_8px_rgba(0,0,0,0.35)] hover:shadow-[0_0_12px_rgba(16,185,129,0.25)] backdrop-blur-md active:scale-95 transition-all duration-200 cursor-pointer"
          >
            ← Back
          </button>

          {/* Jump to specific Ayah */}
          <div className="flex items-center gap-1.5 bg-[#06140d]/90 px-3 py-1 rounded-full border border-emerald-700/60 shadow-sm">
            <span className="text-[11px] text-emerald-300/80 font-medium whitespace-nowrap">
              آیت پر جائیں:
            </span>
            <select
              aria-label="Select Ayah to recite"
              value={currentAyahNumber}
              onChange={(e) => handleJumpToAyah(Number(e.target.value))}
              className="bg-transparent text-emerald-200 font-bold text-xs focus:outline-none cursor-pointer pr-1"
            >
              {loaded.ayahs.map((a) => (
                <option key={a.n} value={a.n} className="bg-[#06140d] text-white">
                  آیت {toArabicDigits(a.n)} ({a.n})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Centered Surah Identity & Information */}
        <div className="text-center my-2 sm:my-3">
          <div className="inline-flex items-center justify-center gap-2.5 sm:gap-3 flex-wrap">
            <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-b from-emerald-800/80 to-emerald-950 border border-emerald-600/60 flex items-center justify-center font-bold text-emerald-200 text-xs sm:text-sm shadow-md ring-1 ring-[#c5a059]/20">
              {loaded.meta.number}
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-wide">
              {loaded.meta.name}
            </h1>
            <span className="text-emerald-300 font-quran text-2xl sm:text-3xl leading-none" dir="rtl">
              {loaded.meta.arabicName}
            </span>
          </div>

          {/* Subtitle Metadata */}
          <div className="flex items-center justify-center gap-2 text-xs text-emerald-300/75 mt-1.5 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-900/60 text-[11px] font-medium text-emerald-200">
              {loaded.meta.revelationType === "Meccan" ? "Makki" : "Madani"}
            </span>
            <span className="text-emerald-800 select-none">•</span>
            <span>{loaded.meta.numberOfAyahs} Ayahs</span>
            <span className="text-emerald-800 select-none">•</span>
            <span>Juz {firstAyahOnPage?.juz ?? loaded.juz}</span>
            <span className="text-emerald-800 select-none">•</span>
            <span>Page {currentPage} of {mushafMeta.totalPages}</span>
          </div>
        </div>

        {/* Luminous Glowing Progress Bar */}
        <ProgressBar pct={pct} />

        {/* Word Count Progress Footer */}
        <div className="flex items-center justify-between text-xs text-emerald-300/80 mt-2 px-0.5">
          <span className="text-[11px] text-emerald-400/70">Recitation Progress</span>
          <span className="font-mono text-emerald-200 font-semibold text-xs">
            {displayRevealed} / {total} words ({pct}%)
          </span>
        </div>
      </div>


      {/* Real Mushaf 16-Line Page Container */}
      <MushafPage
        surahName={loaded.meta.arabicName}
        pageNumber={currentPage}
        manzil={`منزل ${toArabicDigits(firstAyahOnPage?.manzil ?? loaded.manzil)}`}
        fontSize={mounted ? fontSize : 24}
      >
        {isSurahStartPage && (
          <div className="relative text-center my-1.5 px-3 py-1 sm:py-1.5 rounded-sm bg-gradient-to-r from-[#ebd6a7]/40 via-[#f8eed7] to-[#ebd6a7]/40 border-[2px] border-double border-[#1b382b] shadow-sm">
            <div className="flex items-center justify-center gap-2.5 font-quran text-[#11311f] font-bold tracking-wide" style={{ fontSize: "1.25em" }}>
              <span className="text-[#a17a2a] text-[0.7em] select-none opacity-80">۞</span>
              <span className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.06)]">{loaded.meta.arabicName}</span>
              <span className="text-[#a17a2a] text-[0.7em] select-none opacity-80">۞</span>
            </div>
          </div>
        )}
        {[...lines.entries()].map(([lineNo, words]) => {
          const isBasmala = words[0].ayahNumber === 0;
          if (isBasmala) {
            return (
              <div
                key={lineNo}
                className="text-center border-b border-[#1b382b]/30 py-2 sm:py-3 mb-1"
              >
                <div
                  className="font-bismillah text-[#0c2215] font-semibold tracking-wider leading-relaxed flex items-center justify-center gap-1.5 sm:gap-2.5 select-none"
                  style={{ fontSize: "1.38em" }}
                >
                  {words.map((t) => (
                    <span key={t.idx} className="inline-block transition-transform">
                      <MushafWord token={{ display: t.display, normalized: "", state: stateOf(t.idx), ayahNumber: 0, page: t.page }} />
                    </span>
                  ))}
                </div>
              </div>
            );
          }

          // Group ayah-end glyphs with the word they complete so they sit snug together
          const groups: { word: (typeof words)[0]; marker?: (typeof words)[0] }[] = [];
          for (const t of words) {
            const isMarker = !normalizeArabic(t.display);
            if (isMarker && groups.length > 0) {
              groups[groups.length - 1].marker = t;
            } else {
              groups.push({ word: t });
            }
          }
          const wordCount = groups.length;
          const isShortLine = wordCount < 4;
          // Authentic Mushaf typography: scale density so all words remain strictly on this line without breaking
          const lineScale =
            wordCount <= 5 ? 1 :
            wordCount <= 7 ? 0.96 :
            wordCount <= 8 ? 0.90 :
            wordCount <= 9 ? 0.83 :
            wordCount <= 10 ? 0.77 : 0.70;
          const letterSpacing = wordCount >= 9 ? "-0.025em" : undefined;

          return (
            <div
              key={lineNo}
              className={`border-b border-[#1b382b]/30 last:border-b-0 py-1 sm:py-1.5 flex items-baseline w-full max-w-full flex-nowrap whitespace-nowrap overflow-hidden ${
                isShortLine ? "justify-center gap-4 sm:gap-6" : "justify-between"
              }`}
              style={{
                fontSize: `${lineScale}em`,
                letterSpacing,
              }}
            >
              {groups.map((g) => {
                const isWordMarker = !normalizeArabic(g.word.display);
                return (
                  <span key={g.word.idx} className="inline-flex items-baseline shrink-0 gap-0.5 sm:gap-1">
                    <MushafWord
                      token={{
                        display: g.word.display,
                        normalized: "",
                        state: isWordMarker ? "correct" : stateOf(g.word.idx),
                        ayahNumber: g.word.ayahNumber,
                        page: g.word.page,
                      }}
                    />
                    {g.marker && (
                      <MushafWord
                        token={{
                          display: g.marker.display,
                          normalized: "",
                          state: "correct",
                          ayahNumber: g.marker.ayahNumber,
                          page: g.marker.page,
                        }}
                      />
                    )}
                  </span>
                );
              })}
            </div>
          );
        })}
      </MushafPage>

      {completed && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0d2618]/95 via-[#103622] to-[#0d2618]/95 border border-emerald-500/60 p-4 sm:p-5 shadow-2xl backdrop-blur-md text-center ring-1 ring-emerald-400/20">
          <div className="text-2xl sm:text-3xl font-quran text-emerald-200 font-bold mb-1 select-none" dir="rtl">
            مَا شَاءَ اللّٰهُ
          </div>
          <div className="text-sm sm:text-base font-semibold text-white tracking-wide">
            Surah Completed Successfully
          </div>
          <p className="text-xs text-emerald-300/80 mt-1">
            All {loaded.meta.numberOfAyahs} ayahs and {total} words have been recited and verified.
          </p>
        </div>
      )}

      {/* Professional Floating Control Toolbar */}
      <div className="sticky bottom-3 z-30 flex flex-col items-center gap-1.5 px-2">
        <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2.5 p-1.5 sm:p-2 rounded-2xl sm:rounded-full bg-[#0a1a12]/95 backdrop-blur-xl border border-emerald-700/60 shadow-[0_12px_40px_rgba(0,0,0,0.6)]">
          {/* Page Navigator Pill */}
          <div className="flex items-center rounded-full bg-[#05130d]/80 border border-emerald-900/70 p-0.5">
            <button
              onClick={() => {
                setAutoFollow(false);
                setPageIdx((i) => Math.max(0, i - 1));
              }}
              disabled={pageIdx === 0}
              title="Previous page"
              className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full text-emerald-300 hover:text-white hover:bg-emerald-800/60 disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-emerald-300 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <span className="px-1.5 text-[11px] sm:text-xs font-mono font-medium text-emerald-200 select-none whitespace-nowrap">
              {pageIdx + 1} / {loaded.pages.length}
            </span>

            <button
              onClick={() => {
                setAutoFollow(false);
                setPageIdx((i) => Math.min(loaded.pages.length - 1, i + 1));
              }}
              disabled={pageIdx >= loaded.pages.length - 1}
              title="Next page"
              className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full text-emerald-300 hover:text-white hover:bg-emerald-800/60 disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-emerald-300 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Primary Record Button */}
          <MicButton
            listening={listening}
            onClick={toggleMic}
            disabled={activeEngine === "webspeech" && !ws.supported}
          />

          {/* Audio Reference Player */}
          <button
            onClick={playCurrentAyah}
            title="Listen to reference recitation"
            className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-full text-xs font-semibold text-emerald-200 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 hover:border-emerald-500/80 transition-all active:scale-95 shadow-sm cursor-pointer"
          >
            <svg className="w-4 h-4 text-emerald-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
            <span className="hidden sm:inline">Listen</span>
          </button>

          {/* Reset Progress Button */}
          <button
            onClick={handleReset}
            title="Reset current recitation session"
            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full text-emerald-300/80 hover:text-white hover:bg-emerald-900/60 border border-emerald-900/60 hover:border-emerald-700 transition-all active:scale-95 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* Clean auto-follow indicator pill */}
        <label className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#07160f]/90 border border-emerald-900/60 text-[11px] text-emerald-300/80 hover:text-emerald-100 cursor-pointer backdrop-blur-md shadow-sm transition-colors">
          <input
            type="checkbox"
            checked={autoFollow}
            onChange={(e) => setAutoFollow(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-emerald-700 bg-emerald-950 text-emerald-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
          />
          <span>Auto-turn pages with recitation</span>
        </label>
      </div>

      {/* Warnings & Engine Status at Bottom */}
      {mounted && activeEngine === "webspeech" && !ws.supported && (
        <div className="bg-amber-950/50 border border-amber-800/60 text-amber-200/90 rounded-xl p-3 text-xs sm:text-sm mt-3">
          ⚠️ This browser does not support online speech recognition. Please use Google Chrome or Microsoft Edge.
        </div>
      )}
      {activeEngine === "whisper" && wh.modelState !== "ready" && (
        <div className="bg-emerald-950/60 border border-emerald-800/60 text-emerald-200/90 rounded-xl p-3 text-xs sm:text-sm mt-3">
          📥 Offline model {wh.modelState === "loading" ? `is downloading… ${Math.round(wh.modelProgress)}%` : "is not downloaded yet — press the mic to download."}
        </div>
      )}
      {(ws.error || wh.error) && (
        <div className="bg-rose-950/50 border border-rose-800/60 text-rose-200 rounded-xl p-3 text-xs sm:text-sm mt-3">
          ⚠️ {ws.error || wh.error}
        </div>
      )}

      {/* Discrete Live Feedback Panel at Bottom */}
      <FeedbackPanel
        lastHeard={lastHeard}
        mistakes={mistakes}
        revealed={displayRevealed}
        total={total}
        listening={listening}
        activeEngine={activeEngine}
      />
    </div>
  );
}
