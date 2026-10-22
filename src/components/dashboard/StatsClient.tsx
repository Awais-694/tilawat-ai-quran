"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { db, type SurahProgress, type DailyActivity } from "@/lib/storage/db";
import { getSurahMeta } from "@/lib/quran/data";
import { ProgressBar } from "@/components/common/ProgressBar";

// Progress & Stats Client — IndexedDB verified recitation progress
export function StatsClient() {
  const router = useRouter();
  const [progress, setProgress] = useState<SurahProgress[]>([]);
  const [wrong, setWrong] = useState<{ word: string; count: number }[]>([]);
  const [activity, setActivity] = useState<DailyActivity[]>([]);
  const [loaded, setLoaded] = useState(false);

  const loadData = async () => {
    try {
      const p = await db.progress.toArray();
      setProgress(p.sort((a, b) => (b.lastPracticedAt || 0) - (a.lastPracticedAt || 0)));
      const w = await db.wrongWords.toArray();
      setWrong(w.sort((a, b) => b.count - a.count).slice(0, 20));
      const act = await db.activity.toArray();
      setActivity(act.sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 7));
      setLoaded(true);
    } catch (err) {
      console.error("Failed to load stats data:", err);
      setLoaded(true);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  const handleDeleteCompleted = async (surahNum: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await db.progress.delete(surahNum);
      const rawLast = localStorage.getItem("tilawat_last_recitation");
      if (rawLast) {
        const parsed = JSON.parse(rawLast);
        if (parsed?.surahNumber === surahNum) {
          localStorage.removeItem("tilawat_last_recitation");
        }
      }
      await loadData();
    } catch (err) {
      console.error("Failed to delete completed surah:", err);
    }
  };

  const handleResetProgress = async (surahNum: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await db.progress.delete(surahNum);
      const rawLast = localStorage.getItem("tilawat_last_recitation");
      if (rawLast) {
        const parsed = JSON.parse(rawLast);
        if (parsed?.surahNumber === surahNum) {
          localStorage.removeItem("tilawat_last_recitation");
        }
      }
      await loadData();
    } catch (err) {
      console.error("Failed to reset progress:", err);
    }
  };

  // 1. Completed Surahs: Unique per surahNumber, sorted by recency
  const completedMap = new Map<number, SurahProgress>();
  for (const p of progress) {
    if (p.completed || (p.completedTimes ?? 0) > 0 || (p.totalWords > 0 && p.revealedWords >= p.totalWords)) {
      completedMap.set(p.surahNumber, p);
    }
  }
  const completedList = Array.from(completedMap.values()).sort(
    (a, b) => (b.completedAt || b.lastPracticedAt || 0) - (a.completedAt || a.lastPracticedAt || 0)
  );

  // 2. In-Progress Surahs: ONLY half-recited surahs (not completed, revealed > 0)
  const inProgressList = progress
    .filter((p) => !p.completed && p.revealedWords > 0 && (p.totalWords ? p.revealedWords < p.totalWords : true))
    .sort((a, b) => (b.lastPracticedAt || 0) - (a.lastPracticedAt || 0));

  const totalWordsCount =
    activity.reduce((sum, a) => sum + (a.wordsRevealed || 0), 0) ||
    progress.reduce((sum, p) => sum + (p.revealedWords || 0), 0);

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Top Navigation Bar with Centered Title */}
      <div className="relative flex items-center justify-between min-h-[40px] px-1">
        <button
          onClick={handleBack}
          className="inline-flex items-center justify-center px-4 py-1.5 rounded-xl text-xs sm:text-sm font-semibold tracking-wide text-[#193d2b] bg-white hover:bg-[#efe9d8] active:bg-[#e4dcce] border border-[#d6cbaf] shadow-sm active:scale-95 transition-all duration-200 cursor-pointer"
        >
          Back
        </button>

        <h1 className="text-xl sm:text-2xl font-bold text-[#112a1d] tracking-wide text-center">
          Progress & Stats
        </h1>
        <div className="w-14" />
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
        <div className="bg-white border border-[#ded5c0] rounded-2xl p-3.5 sm:p-4 shadow-sm text-center">
          <div className="text-[11px] sm:text-xs font-semibold text-[#527060]">Completed Surahs</div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-800 mt-1">
            {loaded ? completedList.length : "…"} <span className="text-xs font-normal text-[#859f90]">/ 114</span>
          </div>
        </div>

        <div className="bg-white border border-[#ded5c0] rounded-2xl p-3.5 sm:p-4 shadow-sm text-center">
          <div className="text-[11px] sm:text-xs font-semibold text-[#527060]">In-Progress</div>
          <div className="text-xl sm:text-2xl font-bold text-[#112a1d] mt-1">
            {loaded ? inProgressList.length : "…"} <span className="text-xs font-normal text-[#859f90]">active</span>
          </div>
        </div>

        <div className="bg-white border border-[#ded5c0] rounded-2xl p-3.5 sm:p-4 shadow-sm text-center col-span-2 sm:col-span-1">
          <div className="text-[11px] sm:text-xs font-semibold text-[#527060]">Words Recited</div>
          <div className="text-xl sm:text-2xl font-bold text-[#112a1d] mt-1">
            {loaded ? totalWordsCount.toLocaleString() : "…"}
          </div>
        </div>
      </div>

      {/* Completed Surahs Section */}
      <div className="bg-white border border-[#ded5c0] rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm space-y-3.5">
        {/* Section Header */}
        <div className="flex items-center justify-between border-b border-[#ede7d8] pb-2.5">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800 text-xs font-bold shadow-sm">
              ✓
            </span>
            <h2 className="text-sm sm:text-base font-bold text-[#112a1d] tracking-wide">
              Completed Surahs
            </h2>
          </div>
          <span className="text-[11px] sm:text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full shadow-sm">
            {completedList.length} {completedList.length === 1 ? "Surah" : "Surahs"}
          </span>
        </div>

        {/* Empty state */}
        {loaded && completedList.length === 0 && (
          <p className="text-[#527060] text-xs sm:text-sm py-2">
            No completed Surahs yet. When you complete a Surah recitation, it will be listed here with options to practice again or manage.
          </p>
        )}

        {/* Completed Surahs List */}
        <div className="flex flex-col gap-2">
          {completedList.map((p) => {
            const meta = getSurahMeta(p.surahNumber);
            return (
              <div
                key={p.surahNumber}
                className="flex items-center justify-between gap-2.5 bg-[#fbf9f3] border border-[#e5ded0] rounded-xl p-3 sm:px-4 sm:py-3 hover:bg-[#f6f1e3] transition-all shadow-sm"
              >
                {/* Left: Surah number + English name + Completed tag */}
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                  <span className="w-8 h-8 rounded-xl bg-emerald-700 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-sm">
                    {meta?.number}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs sm:text-sm font-bold text-[#112a1d] truncate">
                        {meta?.name}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0">
                        <span>✓</span> Completed
                      </span>
                    </div>
                    <div className="text-[11px] text-[#527060] truncate mt-0.5">
                      {meta?.numberOfAyahs} Ayahs • {p.totalWords || meta?.numberOfAyahs} words recited
                    </div>
                  </div>
                </div>

                {/* Right: Arabic Name & Actions */}
                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                  <span className="font-quran text-lg sm:text-2xl text-[#143323] leading-none select-none hidden xs:inline" dir="rtl">
                    {meta?.arabicName}
                  </span>

                  {/* Recite Again Button */}
                  <Link
                    href={`/recite/${p.surahNumber}`}
                    className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white border border-emerald-600 text-xs font-semibold flex items-center gap-1 transition-all active:scale-95 shadow-sm cursor-pointer"
                    title="Recite this Surah again"
                  >
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span className="hidden sm:inline">Recite Again</span>
                  </Link>

                  {/* Delete from Completed Button */}
                  <button
                    onClick={(e) => handleDeleteCompleted(p.surahNumber, e)}
                    className="p-1.5 sm:p-2 rounded-lg text-[#859f90] hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all active:scale-90 cursor-pointer"
                    title="Delete from completed list"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* In-Progress Surahs Section */}
      <div className="bg-white border border-[#ded5c0] rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm space-y-3.5">
        <div className="flex items-center justify-between border-b border-[#ede7d8] pb-2.5">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 text-xs font-bold shadow-sm">
              ⏳
            </span>
            <h2 className="text-sm sm:text-base font-bold text-[#112a1d] tracking-wide">
              In-Progress Surahs
            </h2>
          </div>
          <span className="text-[11px] sm:text-xs font-semibold text-[#527060] bg-[#faf7ee] border border-[#ded5c0] px-2.5 py-0.5 rounded-full shadow-sm">
            {inProgressList.length} active
          </span>
        </div>

        {/* Empty state */}
        {loaded && inProgressList.length === 0 && (
          <p className="text-[#527060] text-xs sm:text-sm py-2">
            No active recitation in progress. Select any Surah from the Recitation Index to begin.
          </p>
        )}

        <div className="flex flex-col gap-2.5">
          {inProgressList.map((p) => {
            const meta = getSurahMeta(p.surahNumber);
            const pct = p.totalWords ? Math.round((p.revealedWords / p.totalWords) * 100) : 0;
            return (
              <div
                key={p.surahNumber}
                className="bg-[#fbf9f3] border border-[#e5ded0] rounded-xl p-3 sm:px-4 sm:py-3.5 hover:bg-[#f6f1e3] transition-all shadow-sm space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span className="w-8 h-8 rounded-xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-xs font-bold text-emerald-900 shrink-0">
                      {meta?.number}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-bold text-[#112a1d] truncate">
                          {meta?.name}
                        </span>
                        <span className="font-mono text-xs font-bold text-emerald-800">
                          {pct}%
                        </span>
                      </div>
                      <div className="text-[11px] text-[#527060]">
                        {p.lastAyahNumber ? `Ayah ${p.lastAyahNumber} • ` : ""}{p.revealedWords} of {p.totalWords || meta?.numberOfAyahs} words revealed
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/recite/${p.surahNumber}`}
                      className="text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 px-3.5 py-1.5 rounded-lg shadow-sm active:scale-95 transition-all"
                    >
                      Continue
                    </Link>
                    <button
                      onClick={(e) => handleResetProgress(p.surahNumber, e)}
                      className="p-1.5 rounded-lg text-[#859f90] hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all active:scale-90 cursor-pointer"
                      title="Reset progress"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                <ProgressBar pct={pct} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Last 7 Days Activity */}
      <div className="bg-white border border-[#ded5c0] rounded-2xl p-4 sm:p-5 shadow-sm">
        <h2 className="text-base font-semibold text-[#112a1d] mb-3">Last 7 Days Activity</h2>
        {loaded && activity.length === 0 && (
          <p className="text-[#527060] text-xs sm:text-sm">No activity recorded yet — recitation sessions will be tracked here.</p>
        )}
        <div className="flex flex-col gap-2">
          {activity.map((a) => (
            <div
              key={a.date}
              className="flex flex-wrap items-center justify-between text-xs sm:text-sm bg-[#fbf9f3] border border-[#e5ded0] rounded-xl px-3.5 py-2.5"
            >
              <span className="font-mono text-emerald-850 font-medium">{a.date}</span>
              <div className="flex items-center gap-2.5 text-xs sm:text-sm">
                <span className="text-[#112a1d]">
                  <span className="font-semibold text-emerald-800">{a.wordsRevealed}</span> words
                </span>
                <span className="text-[#cfc4ad] select-none">•</span>
                <span className="text-rose-700">
                  <span className="font-semibold">{a.mistakes}</span> mistakes
                </span>
                <span className="text-[#cfc4ad] select-none">•</span>
                <span className="text-[#527060]">
                  <span className="font-semibold text-[#112a1d]">{a.sessions}</span> {a.sessions === 1 ? "session" : "sessions"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Weak Words (Previous Mistakes) */}
      <div className="bg-white border border-[#ded5c0] rounded-2xl p-4 sm:p-5 shadow-sm">
        <h2 className="text-base font-semibold text-[#112a1d] mb-3">Weak Words (Previous Mistakes)</h2>
        {loaded && wrong.length === 0 && (
          <p className="text-[#527060] text-xs sm:text-sm">No mistakes recorded yet.</p>
        )}
        <div className="flex flex-wrap gap-2" dir="rtl">
          {wrong.map((w) => (
            <span
              key={w.word}
              className="bg-rose-50 border border-rose-200 rounded-xl px-3 py-1.5 font-quran text-lg text-rose-900 shadow-sm"
            >
              {w.word} <span className="text-xs font-mono text-rose-700 mr-1">×{w.count}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
