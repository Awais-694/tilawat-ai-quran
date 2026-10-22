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

      {/* Dual Main Mode Quick Access: Recitation AI vs Simple Reading */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Mode 1: Recite with Mic */}
        <Link
          href="/surahs"
          className="group relative overflow-hidden rounded-2xl bg-white hover:bg-[#faf7ee] border border-[#e5ded0] hover:border-[#c5a059] p-3.5 sm:p-4 shadow-sm transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm sm:text-base text-[#112a1d]">Recite with Mic</span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">AI Test</span>
              </div>
              <p className="text-xs text-[#527060] truncate">Speech recognition & evaluation</p>
            </div>
          </div>
        </Link>

        {/* Mode 2: Simple Quran Reader */}
        <Link
          href="/read"
          className="group relative overflow-hidden rounded-2xl bg-white hover:bg-[#faf7ee] border border-[#e5ded0] hover:border-[#c5a059] p-3.5 sm:p-4 shadow-sm transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#fff8eb] border border-[#f59e0b]/30 text-amber-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm sm:text-base text-[#112a1d]">Read Quran</span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded">16-Line</span>
              </div>
              <p className="text-xs text-[#527060] truncate">Full Mushaf with audio (No mic)</p>
            </div>
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

      {/* Completed Surahs Section */}
      {stats && stats.completedList.length > 0 && (
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
      )}

      {/* In Progress Surahs */}
      {stats && stats.inProgress.length > 0 && (
        <div className="bg-white border border-[#ded5c0] rounded-2xl p-3.5 sm:p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-semibold text-[#112a1d]">
              In-Progress Surahs
            </h2>
            <span className="text-[11px] text-[#527060] font-medium">
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
                  className="flex items-center justify-between bg-[#fbf9f3] border border-[#e5ded0] rounded-xl px-3.5 py-2.5 sm:px-4 sm:py-3 hover:bg-[#f6f1e3] active:scale-[0.99] transition-all shadow-sm"
                >
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-100 border border-emerald-300 flex items-center justify-center text-xs font-bold text-emerald-900 shrink-0">
                      {meta?.number}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-semibold text-[#112a1d] truncate">
                        {meta?.name}
                      </div>
                      <div className="text-[11px] text-[#527060]">
                        {p.lastAyahNumber ? `Ayah ${p.lastAyahNumber} • ` : ""}{pct}% revealed
                      </div>
                    </div>
                  </div>

                  <span className="text-xs font-semibold text-emerald-800 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 shrink-0">
                    Continue
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          href="/surahs"
          className="block w-full py-3.5 sm:py-4 rounded-xl sm:rounded-2xl text-center font-bold text-white bg-emerald-700 hover:bg-emerald-800 shadow-md active:scale-[0.98] transition-all text-sm sm:text-base tracking-wide"
        >
          Recitation Index (114)
        </Link>
        <Link
          href="/read"
          className="block w-full py-3.5 sm:py-4 rounded-xl sm:rounded-2xl text-center font-bold text-[#112a1d] bg-white hover:bg-[#faf7ee] border border-[#ded5c0] shadow-sm active:scale-[0.98] transition-all text-sm sm:text-base tracking-wide"
        >
          Read Quran (16-Line Mushaf)
        </Link>
      </div>
    </div>
  );
}

