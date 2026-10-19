"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { db, type SurahProgress } from "@/lib/storage/db";
import { getSurahMeta, loadSurah } from "@/lib/quran/data";
import { StatCard } from "./StatCard";
import { ProgressBar } from "@/components/common/ProgressBar";

interface Stats {
  streak: number;
  accuracy: number | null;
  inProgress: SurahProgress[];
  completedCount: number;
  completedList: SurahProgress[];
  lastActive: SurahProgress | null;
}

function calcStreak(dates: string[]): number {
  const set = new Set(dates);
  let streak = 0;
  const d = new Date();
  if (!set.has(d.toISOString().slice(0, 10))) d.setDate(d.getDate() - 1);
  while (set.has(d.toISOString().slice(0, 10))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export function DashboardClient() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [lastAyah, setLastAyah] = useState<number | null>(null);

  const loadStats = async () => {
    const activity = await db.activity.toArray();
    const progress = await db.progress.toArray();
    const totalWords = activity.reduce((s, a) => s + a.wordsRevealed, 0);
    const totalMistakes = activity.reduce((s, a) => s + a.mistakes, 0);

    // 1. Completed Surahs: Surahs that are finished
    // Unique by surahNumber (Map ensures exactly one entry per surah)
    const completedMap = new Map<number, SurahProgress>();
    for (const p of progress) {
      if (p.completed || (p.completedTimes ?? 0) > 0 || (p.totalWords > 0 && p.revealedWords >= p.totalWords)) {
        completedMap.set(p.surahNumber, p);
      }
    }
    const completedList = Array.from(completedMap.values()).sort(
      (a, b) => (b.completedAt || b.lastPracticedAt || 0) - (a.completedAt || a.lastPracticedAt || 0)
    );

    // 2. In-Progress Surahs: ONLY half-recited surahs!
    // (revealedWords > 0, revealedWords < totalWords, and NOT currently completed)
    const inProgressList = progress
      .filter((p) => !p.completed && p.revealedWords > 0 && (p.totalWords ? p.revealedWords < p.totalWords : true))
      .sort((a, b) => (b.lastPracticedAt || 0) - (a.lastPracticedAt || 0));

    // 3. Resume Card Item: ONLY a currently half-read surah!
    let active = inProgressList[0] ?? null;

    try {
      const rawLast = localStorage.getItem("tilawat_last_recitation");
      if (rawLast) {
        const parsed = JSON.parse(rawLast);
        if (
          parsed &&
          typeof parsed.surahNumber === "number" &&
          !parsed.completed &&
          (parsed.revealedWords || 0) > 0 &&
          (parsed.revealedWords || 0) < (parsed.totalWords || Infinity)
        ) {
          const lsTime = parsed.timestamp || 0;
          const dbTime = active?.lastPracticedAt || 0;
          if (!active || lsTime >= dbTime) {
            active = {
              surahNumber: parsed.surahNumber,
              revealedWords: parsed.revealedWords || 0,
              totalWords: parsed.totalWords || 0,
              completed: false,
              lastPracticedAt: lsTime || Date.now(),
              lastAyahNumber: parsed.lastAyahNumber || 1,
            };
          }
        }
      }
    } catch {}

    // If no surah is half-read, default to ready state for Surah 1 Al-Fatihah
    if (!active) {
      active = {
        surahNumber: 1,
        revealedWords: 0,
        totalWords: 29,
        completed: false,
        lastPracticedAt: Date.now(),
        lastAyahNumber: 1,
      };
    }

    setStats({
      streak: calcStreak(activity.filter((a) => a.wordsRevealed > 0).map((a) => a.date)),
      accuracy:
        totalWords + totalMistakes > 0
          ? Math.round((totalWords / (totalWords + totalMistakes)) * 100)
          : null,
      inProgress: inProgressList.slice(0, 4),
      completedCount: completedList.length,
      completedList,
      lastActive: active,
    });

    if (active) {
      if (active.lastAyahNumber) {
        setLastAyah(active.lastAyahNumber);
      } else if (active.revealedWords > 0) {
        const s = await loadSurah(active.surahNumber);
        if (s) {
          const idx = Math.max(0, Math.min(active.revealedWords - 1, s.tokens.length - 1));
          setLastAyah(s.tokens[idx]?.ayahNumber || 1);
        }
      } else {
        setLastAyah(1);
      }
    }
  };

  useEffect(() => {
    void loadStats();
  }, []);

  const handleResetSurah = async (surahNum: number, e: React.MouseEvent) => {
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
      await loadStats();
    } catch (err) {
      console.error("Failed to reset surah progress:", err);
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
      await loadStats();
    } catch (err) {
      console.error("Failed to delete completed surah:", err);
    }
  };

  const lastActiveMeta = stats?.lastActive ? getSurahMeta(stats.lastActive.surahNumber) : null;
  const lastActivePct =
    stats?.lastActive && stats.lastActive.totalWords
      ? Math.round((stats.lastActive.revealedWords / stats.lastActive.totalWords) * 100)
      : 0;

  return (
    <div className="max-w-2xl mx-auto space-y-5 sm:space-y-6 px-2 sm:px-0 pb-16">
      
      {/* Centered Professional Header with Islamic Motif */}
      <div className="text-center pt-2 sm:pt-4 pb-1 space-y-3">

        {/* Assalam-o-Alaikum & Calligraphic Salam */}
        <div className="space-y-1">
          <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-100 via-amber-100 to-emerald-200 drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
            Assalam-o-Alaikum
          </h1>
          <p className="font-arabic text-emerald-200 text-lg sm:text-2xl font-normal leading-relaxed tracking-wide" dir="rtl">
            اَلسَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللهِ وَبَرَكَاتُهُ
          </p>
        </div>
      </div>

      {/* Quick Resume Card (Ayah Progress & Resume Prompt) */}
      {stats?.lastActive && lastActiveMeta && (
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#0e2a1d] via-[#091b12] to-[#040e08] border border-emerald-600/50 p-4 sm:p-5 shadow-[0_8px_30px_rgba(0,0,0,0.45)]">
          {/* Subtle Ambient Decorative Glow */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="space-y-3 relative z-10">
            {/* Header Badge & Question */}
            <div className="flex items-center justify-between border-b border-emerald-800/40 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400"></span>
                </span>
                <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-amber-300">
                  {stats.lastActive.revealedWords > 0 ? "Resume Tilawat" : "Continue Tilawat"}
                </span>
              </div>
              <span className="text-[11px] sm:text-xs font-semibold text-emerald-300/80 bg-emerald-950/70 border border-emerald-800/60 px-2 py-0.5 rounded-md">
                {stats.lastActive.revealedWords > 0 ? `${lastActivePct}% Completed` : "Ready"}
              </span>
            </div>

            {/* Surah & Ayah Information */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-baseline gap-2.5 flex-wrap">
                  <span className="text-lg sm:text-xl font-bold text-white tracking-tight">
                    {lastActiveMeta.number}. {lastActiveMeta.name}
                  </span>
                  <span className="font-quran text-emerald-300 text-xl sm:text-2xl" dir="rtl">
                    {lastActiveMeta.arabicName}
                  </span>
                </div>

                <div className="mt-1.5 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap text-xs sm:text-sm font-semibold text-emerald-100">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-800/60 border border-emerald-600/50 text-white text-xs">
                      {lastAyah ? `Ayah ${lastAyah}` : "Ayah 1"}
                    </span>
                    <span className="text-emerald-300/70 font-normal text-xs">
                      {stats.lastActive.revealedWords > 0
                        ? `${stats.lastActive.revealedWords} / ${stats.lastActive.totalWords} words revealed`
                        : "Ready to recite from Ayah 1"}
                    </span>
                  </div>
                  
                  {/* Prompt question */}
                  <p className="text-xs text-amber-200/90 font-medium pt-1">
                    {stats.lastActive.revealedWords > 0
                      ? "Would you like to resume reciting from where you left off?"
                      : "Would you like to continue reciting this Surah?"}
                  </p>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="pt-0.5">
              <ProgressBar pct={lastActivePct} />
            </div>

            {/* Action Buttons: Resume vs Reset */}
            {stats.lastActive.revealedWords > 0 ? (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                <Link
                  href={`/recite/${stats.lastActive.surahNumber}`}
                  className="flex-1 py-3 sm:py-3.5 px-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/60 active:scale-[0.98] transition-all"
                >
                  <svg className="w-4 h-4 text-white fill-current" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  <span>Resume Recitation ({lastAyah ? `آیت ${lastAyah} سے` : "Continue"})</span>
                </Link>

                <button
                  onClick={(e) => handleResetSurah(stats.lastActive!.surahNumber, e)}
                  title="سورت کی پیش رفت ریزیٹ کریں اور شروع سے پڑھیں"
                  className="py-3 px-3.5 rounded-xl sm:rounded-2xl bg-emerald-950/80 hover:bg-rose-950/70 text-emerald-300 hover:text-rose-200 border border-emerald-800/70 hover:border-rose-700/70 text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Reset Progress</span>
                </button>
              </div>
            ) : (
              <Link
                href={`/recite/${stats.lastActive.surahNumber}`}
                className="w-full py-3 sm:py-3.5 px-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/60 active:scale-[0.98] transition-all"
              >
                <svg className="w-4 h-4 text-white fill-current" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                <span>Start Recitation</span>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Recitation Overview Stats (Words Today & Total Correct Words Removed) */}
      <div className="space-y-2">
        <div className="text-[11px] sm:text-xs font-semibold text-emerald-300/80 uppercase tracking-wider px-1">
          Recitation Overview
        </div>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <StatCard
            label="Daily Streak"
            value={stats ? `${stats.streak} ${stats.streak === 1 ? "day" : "days"}` : "…"}
            sublabel="Daily recitation habit"
          />
          <StatCard
            label="Accuracy"
            value={stats?.accuracy !== null && stats ? `${stats.accuracy}%` : "—"}
            sublabel="AI speech score"
          />
          <StatCard
            label="Completed"
            value={stats ? `${stats.completedCount} / 114` : "…"}
            sublabel="Full Surahs"
          />
        </div>
      </div>

      {/* Completed Surahs Section */}
      {stats && stats.completedList.length > 0 && (
        <div className="bg-[#0a2217]/90 border border-emerald-600/50 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-[0_8px_30px_rgba(0,0,0,0.45)] backdrop-blur-md space-y-3.5">
          {/* Section Header */}
          <div className="flex items-center justify-between border-b border-emerald-800/50 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-400/60 flex items-center justify-center text-emerald-300 text-xs font-bold shadow-sm">
                ✓
              </span>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
                Completed Surahs
              </h2>
              <span className="text-[11px] font-quran text-emerald-300/80 mr-1" dir="rtl">
                (مکمل شدہ سورتیں)
              </span>
            </div>
            <span className="text-[11px] sm:text-xs font-semibold text-emerald-300 bg-emerald-950/80 border border-emerald-700/60 px-2.5 py-0.5 rounded-full shadow-sm">
              {stats.completedList.length} {stats.completedList.length === 1 ? "Surah" : "Surahs"}
            </span>
          </div>

          {/* Completed Surahs List (Each surah appears strictly once) */}
          <div className="flex flex-col gap-2">
            {stats.completedList.map((p) => {
              const meta = getSurahMeta(p.surahNumber);
              return (
                <div
                  key={p.surahNumber}
                  className="flex items-center justify-between gap-2.5 bg-[#07160f]/90 border border-emerald-800/60 rounded-xl p-3 sm:px-4 sm:py-3 hover:bg-[#0c2419] hover:border-emerald-600/70 transition-all shadow-sm"
                >
                  {/* Left: Surah number + English name + Completed tag */}
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                    <span className="w-8 h-8 rounded-xl bg-gradient-to-b from-emerald-700/90 to-emerald-900 border border-emerald-500/60 flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-sm">
                      {meta?.number}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs sm:text-sm font-bold text-white truncate">
                          {meta?.name}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-300 bg-emerald-950 border border-emerald-600/50 px-2 py-0.5 rounded-full shrink-0">
                          <span>✓</span> Completed
                        </span>
                      </div>
                      <div className="text-[11px] text-emerald-300/60 truncate mt-0.5">
                        {meta?.numberOfAyahs} Ayahs • {p.totalWords || meta?.numberOfAyahs} words recited
                      </div>
                    </div>
                  </div>

                  {/* Right: Arabic Name & Actions */}
                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <span className="font-quran text-lg sm:text-2xl text-emerald-200 leading-none select-none hidden xs:inline" dir="rtl">
                      {meta?.arabicName}
                    </span>

                    {/* Recite Again Button */}
                    <Link
                      href={`/recite/${p.surahNumber}`}
                      className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-emerald-900/70 hover:bg-emerald-800 text-emerald-100 hover:text-white border border-emerald-700/60 text-xs font-semibold flex items-center gap-1 transition-all active:scale-95 shadow-sm cursor-pointer"
                      title="سورت کو دوبارہ پڑھیں"
                    >
                      <svg className="w-3.5 h-3.5 text-emerald-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span className="hidden sm:inline">Recite Again</span>
                    </Link>

                    {/* Delete from Completed Button */}
                    <button
                      onClick={(e) => handleDeleteCompleted(p.surahNumber, e)}
                      className="p-1.5 sm:p-2 rounded-lg text-emerald-400/60 hover:text-rose-300 hover:bg-rose-950/70 border border-transparent hover:border-rose-800/60 transition-all active:scale-90 cursor-pointer"
                      title="مکمل شدہ فہرست سے ڈیلیٹ کریں"
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
      )}

      {/* In Progress Surahs */}
      {stats && stats.inProgress.length > 0 && (
        <div className="bg-[#0c1c14]/90 border border-emerald-900/60 rounded-2xl p-3.5 sm:p-5 shadow-lg backdrop-blur-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-semibold text-emerald-100">
              In-Progress Surahs
            </h2>
            <span className="text-[11px] text-emerald-400/60 font-medium">
              {stats.inProgress.length} active
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {stats.inProgress.map((p) => {
              const meta = getSurahMeta(p.surahNumber);
              const pct = p.totalWords ? Math.round((p.revealedWords / p.totalWords) * 100) : 0;
              return (
                <Link
                  key={p.surahNumber}
                  href={`/recite/${p.surahNumber}`}
                  className="flex items-center justify-between bg-[#08150f]/80 border border-emerald-900/50 rounded-xl px-3.5 py-2.5 sm:px-4 sm:py-3 hover:bg-[#0f241a] hover:border-emerald-700/60 active:scale-[0.99] transition-all shadow-sm"
                >
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-950 border border-emerald-800/80 flex items-center justify-center text-xs font-bold text-emerald-200 shrink-0">
                      {meta?.number}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-semibold text-emerald-100 truncate">
                        {meta?.name}
                      </div>
                      <div className="text-[11px] text-emerald-300/60">
                        {p.lastAyahNumber ? `Ayah ${p.lastAyahNumber} • ` : ""}{pct}% revealed
                      </div>
                    </div>
                  </div>

                  <span className="text-xs font-semibold text-emerald-300 px-3 py-1.5 rounded-lg bg-emerald-900/40 border border-emerald-700/40 shrink-0">
                    Continue
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Action Button - Mobile Focused */}
      <Link
        href="/surahs"
        className="block w-full py-3.5 sm:py-4 rounded-xl sm:rounded-2xl text-center font-bold text-white bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-700 hover:from-emerald-600 hover:to-emerald-500 shadow-xl shadow-emerald-950/60 border border-emerald-500/50 active:scale-[0.98] transition-all text-sm sm:text-base tracking-wide"
      >
        Browse All 114 Surahs
      </Link>
    </div>
  );
}
