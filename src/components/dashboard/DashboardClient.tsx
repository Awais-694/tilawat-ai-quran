"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { db, type SurahProgress } from "@/lib/storage/db";
import { getSurahMeta, loadSurah } from "@/lib/quran/data";
import { DailyStreakWidget } from "./DailyStreakWidget";
import { StatCard } from "./StatCard";
import { ProgressBar } from "@/components/common/ProgressBar";
import {
  calcCurrentStreak,
  calcLongestStreak,
  getRolling7Days,
  type DayStreakItem,
} from "@/lib/quran/streak";
import type { DailyActivity } from "@/lib/storage/db";

interface Stats {
  streak: number;
  longestStreak: number;
  rollingDays: DayStreakItem[];
  accuracy: number | null;
  inProgress: SurahProgress[];
  completedCount: number;
  completedList: SurahProgress[];
  lastActive: SurahProgress | null;
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

    const actMap = new Map<string, DailyActivity>();
    for (const a of activity) {
      actMap.set(a.date, a);
    }
    const activeDates = activity.filter((a) => a.wordsRevealed > 0).map((a) => a.date);
    const streak = calcCurrentStreak(activeDates);
    const longestStreak = calcLongestStreak(activeDates);
    const rollingDays = getRolling7Days(actMap);

    setStats({
      streak,
      longestStreak,
      rollingDays,
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


  const lastActiveMeta = stats?.lastActive ? getSurahMeta(stats.lastActive.surahNumber) : null;
  const lastActivePct =
    stats?.lastActive && stats.lastActive.totalWords
      ? Math.round((stats.lastActive.revealedWords / stats.lastActive.totalWords) * 100)
      : 0;

  return (
    <div className="max-w-2xl mx-auto space-y-5 sm:space-y-6 px-2 sm:px-0 pb-16">
      
      {/* Centered Professional Header with Islamic Motif */}
      <div className="text-center pt-2 sm:pt-4 pb-1 space-y-2">
        <div className="space-y-1">
          <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-[#112a1d]">
            Assalam-o-Alaikum
          </h1>
          <p className="font-arabic text-[#1b5037] text-lg sm:text-2xl font-normal leading-relaxed tracking-wide" dir="rtl">
            اَلسَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللهِ وَبَرَكَاتُهُ
          </p>
        </div>
      </div>

      {/* Four Main Modes Quick Access with Clear Interactive Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Mode 1: Recite with Mic */}
        <Link
          href="/surahs"
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-white via-[#fcfaf6] to-[#f8f4ea] border border-[#ded5c0] hover:border-emerald-600/70 p-3.5 sm:p-4 shadow-2xs hover:shadow-md active:scale-[0.99] transition-all flex items-center justify-between gap-3"
        >
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-500 to-teal-700 group-hover:w-1.5 transition-all" />

          <div className="flex items-center gap-3 min-w-0 pl-1">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-100/60 border border-emerald-200/80 text-emerald-800 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-sm sm:text-base text-[#112a1d] group-hover:text-emerald-900 transition-colors">
                  Recite with Mic
                </span>
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300/60 px-1.5 py-0.5 rounded-full">
                  AI Test
                </span>
              </div>
              <p className="text-xs text-[#527060] truncate">Speech recognition & test</p>
            </div>
          </div>

          <div className="shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 group-hover:bg-emerald-800 text-white font-bold text-xs shadow-xs group-hover:shadow transition-all">
              <span>Recite</span>
              <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </span>
          </div>
        </Link>

        {/* Mode 2: Simple Quran Reader */}
        <Link
          href="/read"
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-white via-[#fcfaf6] to-[#fcf6e8] border border-[#ded5c0] hover:border-amber-600/70 p-3.5 sm:p-4 shadow-2xs hover:shadow-md active:scale-[0.99] transition-all flex items-center justify-between gap-3"
        >
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-500 to-amber-700 group-hover:w-1.5 transition-all" />

          <div className="flex items-center gap-3 min-w-0 pl-1">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#fff8eb] to-[#fef3c7] border border-[#f59e0b]/40 text-amber-800 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-sm sm:text-base text-[#112a1d] group-hover:text-amber-900 transition-colors">
                  Read Quran
                </span>
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300/60 px-1.5 py-0.5 rounded-full">
                  16-Line
                </span>
              </div>
              <p className="text-xs text-[#527060] truncate">Full Mushaf 16-Line</p>
            </div>
          </div>

          <div className="shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-800 group-hover:bg-amber-900 text-white font-bold text-xs shadow-xs group-hover:shadow transition-all">
              <span>Read</span>
              <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </span>
          </div>
        </Link>

        {/* Mode 3: Tajweed Quran PDF */}
        <Link
          href="/tajweed"
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-white via-[#fcfaf6] to-[#ecfdf5] border border-[#ded5c0] hover:border-teal-600/70 p-3.5 sm:p-4 shadow-2xs hover:shadow-md active:scale-[0.99] transition-all flex items-center justify-between gap-3"
        >
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-teal-500 to-emerald-700 group-hover:w-1.5 transition-all" />

          <div className="flex items-center gap-3 min-w-0 pl-1">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#ecfdf5] to-teal-100/70 border border-teal-300/70 text-teal-800 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 10h6m-6 3h4" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-sm sm:text-base text-[#112a1d] group-hover:text-teal-900 transition-colors">
                  Tajweed Quran
                </span>
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-teal-100 text-teal-900 border border-teal-300/60 px-1.5 py-0.5 rounded-full">
                  Color Coded
                </span>
              </div>
              <p className="text-xs text-[#527060] truncate">Tajweed-e-Al-Quran</p>
            </div>
          </div>

          <div className="shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-700 group-hover:bg-teal-800 text-white font-bold text-xs shadow-xs group-hover:shadow transition-all">
              <span>Tajweed</span>
              <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </span>
          </div>
        </Link>

        {/* Mode 4: Quran Translation & Tafseer */}
        <Link
          href="/tarjama"
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-white via-[#fcfaf6] to-[#f0fdf4] border border-[#ded5c0] hover:border-emerald-600/70 p-3.5 sm:p-4 shadow-2xs hover:shadow-md active:scale-[0.99] transition-all flex items-center justify-between gap-3"
        >
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-600 to-teal-800 group-hover:w-1.5 transition-all" />

          <div className="flex items-center gap-3 min-w-0 pl-1">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#f0fdf4] to-emerald-100/70 border border-emerald-300/70 text-emerald-800 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h4M5 3v4m10 9h6m-3-3v6" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-sm sm:text-base text-[#112a1d] group-hover:text-emerald-900 transition-colors">
                  Translation
                </span>
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-300/60 px-1.5 py-0.5 rounded-full">
                  Urdu
                </span>
              </div>
              <p className="text-xs text-[#527060] truncate">Kanz-ul-Irfan Urdu Tarjama</p>
            </div>
          </div>

          <div className="shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-750 bg-[#165b38] group-hover:bg-[#124b2e] text-white font-bold text-xs shadow-xs group-hover:shadow transition-all">
              <span>Tarjama</span>
              <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </span>
          </div>
        </Link>
      </div>

      {/* Quick Resume Card (Ayah Progress & Resume Prompt) */}
      {stats?.lastActive && lastActiveMeta && (
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-white border border-[#ded5c0] p-4 sm:p-5 shadow-[0_4px_16px_rgba(20,50,30,0.06)]">
          <div className="space-y-3 relative z-10">
            {/* Header Badge & Question */}
            <div className="flex items-center justify-between border-b border-[#ebd7b2]/70 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
                </span>
                <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-emerald-850">
                  {stats.lastActive.revealedWords > 0 ? "Resume Tilawat" : "Continue Tilawat"}
                </span>
              </div>
              <span className="text-[11px] sm:text-xs font-semibold text-emerald-800 bg-[#edf5f0] border border-emerald-200 px-2 py-0.5 rounded-md">
                {stats.lastActive.revealedWords > 0 ? `${lastActivePct}% Completed` : "Ready"}
              </span>
            </div>

            {/* Surah & Ayah Information */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-baseline gap-2.5 flex-wrap">
                  <span className="text-lg sm:text-xl font-bold text-[#112a1d] tracking-tight">
                    {lastActiveMeta.number}. {lastActiveMeta.name}
                  </span>
                  <span className="font-quran text-[#143323] text-xl sm:text-2xl" dir="rtl">
                    {lastActiveMeta.arabicName}
                  </span>
                </div>

                <div className="mt-1.5 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap text-xs sm:text-sm font-semibold text-[#112a1d]">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-700 text-white text-xs">
                      {lastAyah ? `Ayah ${lastAyah}` : "Ayah 1"}
                    </span>
                    <span className="text-[#527060] font-normal text-xs">
                      {stats.lastActive.revealedWords > 0
                        ? `${stats.lastActive.revealedWords} / ${stats.lastActive.totalWords} words revealed`
                        : "Ready to recite from Ayah 1"}
                    </span>
                  </div>
                  
                  {/* Prompt question */}
                  <p className="text-xs text-[#6e5828] font-medium pt-1">
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
                  className="flex-1 py-3 sm:py-3.5 px-4 rounded-xl sm:rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-all"
                >
                  <svg className="w-4 h-4 text-white fill-current" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  <span>Resume Recitation ({lastAyah ? `Ayah ${lastAyah}` : "Continue"})</span>
                </Link>

                <button
                  onClick={(e) => handleResetSurah(stats.lastActive!.surahNumber, e)}
                  title="Reset Surah progress and start over"
                  className="py-3 px-3.5 rounded-xl sm:rounded-2xl bg-[#faf7ee] hover:bg-rose-50 text-[#527060] hover:text-rose-700 border border-[#ded5c0] hover:border-rose-300 text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer"
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
                className="w-full py-3 sm:py-3.5 px-4 rounded-xl sm:rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-all"
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

      {/* Daily Streak Featured Interactive Widget (Clickable to /streak) */}
      {stats && (
        <DailyStreakWidget
          streak={stats.streak}
          longestStreak={stats.longestStreak}
          days={stats.rollingDays}
        />
      )}

      {/* Recitation Overview Secondary Stats: Accuracy & Completed Surahs */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
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
  );
}

