"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { db, type DailyActivity } from "@/lib/storage/db";
import {
  calcCurrentStreak,
  calcLongestStreak,
  getWeekDays,
  formatTimeSpent,
} from "@/lib/quran/streak";
import { getAllDailyActivities } from "@/lib/quran/streakTracker";

function formatReadableDate(dateStr: string): string {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatWeekRange(startStr: string, endStr: string): string {
  if (!startStr || !endStr) return "";
  const [y1, m1, d1] = startStr.split("-").map(Number);
  const [y2, m2, d2] = endStr.split("-").map(Number);
  const dt1 = new Date(y1, m1 - 1, d1);
  const dt2 = new Date(y2, m2 - 1, d2);
  const start = dt1.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const end = dt2.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${start} – ${end}`;
}

export function StreakClient() {
  const router = useRouter();
  const [activities, setActivities] = useState<DailyActivity[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [weekOffset, setWeekOffset] = useState<number>(0); // 0 = current week, -1 = last week

  const [completedSurahsMap, setCompletedSurahsMap] = useState<Map<number, { completed: boolean; completedAt?: number }>>(new Map());

  useEffect(() => {
    const load = async () => {
      const allActs = await getAllDailyActivities();
      setActivities(allActs);
      try {
        const allProgress = await db.progress.toArray();
        const cMap = new Map<number, { completed: boolean; completedAt?: number }>();
        for (const p of allProgress) {
          if (p.completed || (p.revealedWords >= p.totalWords && p.totalWords > 0)) {
            cMap.set(p.surahNumber, { completed: true, completedAt: p.completedAt });
          }
        }
        setCompletedSurahsMap(cMap);
      } catch (err) {
        console.error("Failed to load progress in StreakClient:", err);
      }
      setLoaded(true);
    };
    void load();

    const handleStreakEvent = () => {
      void load();
    };
    window.addEventListener("tilawat_streak_achieved", handleStreakEvent);
    return () => {
      window.removeEventListener("tilawat_streak_achieved", handleStreakEvent);
    };
  }, []);

  const activityMap = useMemo(() => {
    const map = new Map<string, DailyActivity>();
    for (const a of activities) {
      map.set(a.date, a);
    }
    return map;
  }, [activities]);

  const activeDates = useMemo(() => {
    return activities
      .filter((a) => (a.wordsRevealed || 0) > 0 || (a.timeSpentSeconds || 0) > 0 || ((a.surahsPracticed?.length || 0) > 0))
      .map((a) => a.date);
  }, [activities]);

  const currentStreak = useMemo(() => calcCurrentStreak(activeDates), [activeDates]);
  const longestStreak = useMemo(() => calcLongestStreak(activeDates), [activeDates]);

  // Current week days (Monday to Sunday) based on weekOffset
  const weekDays = useMemo(() => {
    return getWeekDays(activityMap, new Date(), weekOffset, completedSurahsMap);
  }, [activityMap, weekOffset, completedSurahsMap]);

  // Weekly aggregates
  const weekStats = useMemo(() => {
    let totalSeconds = 0;
    let totalWords = 0;
    let totalMistakes = 0;
    let daysActive = 0;
    const surahSet = new Set<number>();

    for (const d of weekDays) {
      if (d.hasRecited) {
        daysActive++;
        totalSeconds += d.timeSpentSeconds;
        totalWords += d.wordsRevealed;
        totalMistakes += d.mistakes;
        d.surahs.forEach((s) => surahSet.add(s.number));
      }
    }

    const accuracy =
      totalWords + totalMistakes > 0
        ? Math.round((totalWords / (totalWords + totalMistakes)) * 100)
        : totalWords > 0
        ? 100
        : null;

    return {
      totalSeconds,
      totalWords,
      totalMistakes,
      daysActive,
      uniqueSurahsCount: surahSet.size,
      accuracy,
    };
  }, [weekDays]);

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  const weekRangeText = useMemo(() => {
    if (weekDays.length < 7) return "";
    return formatWeekRange(weekDays[0].date, weekDays[6].date);
  }, [weekDays]);

  return (
    <div className="max-w-xl mx-auto space-y-4 pb-16 px-2 sm:px-0">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between min-h-[44px] border-b border-[#ede7d8] pb-3 px-1">
        {/* Back Button */}
        <button
          onClick={handleBack}
          className="inline-flex items-center justify-center px-4 py-1.5 rounded-xl text-xs sm:text-sm font-semibold tracking-wide text-[#193d2b] bg-white hover:bg-[#efe9d8] active:bg-[#e4dcce] border border-[#d6cbaf] shadow-xs active:scale-95 transition-all duration-200 cursor-pointer min-w-[72px]"
        >
          Back
        </button>

        {/* Centered Page Title */}
        <h1 className="text-base sm:text-lg font-bold text-[#112a1d] tracking-tight text-center px-2">
          Streak & Activity
        </h1>

        {/* Dashboard Button */}
        <Link
          href="/"
          className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-[#193d2b] bg-white hover:bg-[#efe9d8] active:bg-[#e4dcce] border border-[#d6cbaf] shadow-xs active:scale-95 transition-all duration-200 min-w-[72px]"
        >
          Dashboard
        </Link>
      </div>

      {/* Main Hero Streak Banner Card */}
      <div className="relative overflow-hidden rounded-2xl bg-white border border-[#ded5c0] p-4 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          {/* Flame Icon & Display Numbers */}
          <div className="flex items-center gap-3.5">
            {/* Circular Glowing Blue Flame Badge */}
            <div className="relative flex items-center justify-center shrink-0">
              <div className="absolute -inset-1.5 rounded-full bg-gradient-to-tr from-blue-500/35 via-sky-400/25 to-blue-600/30 blur-[8px] opacity-90" />
              <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full p-[2px] bg-gradient-to-b from-sky-400 via-blue-500 to-indigo-600 shadow-[0_3px_14px_rgba(2,132,199,0.25)]">
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden p-1.5 sm:p-2 shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.9)]">
                  <img
                    src="/icons/streak-flame.png?v=2"
                    alt="Streak Flame"
                    className="w-full h-full object-contain drop-shadow-[0_2px_8px_rgba(2,132,199,0.35)]"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-0.5">
              <div className="flex items-baseline gap-2">
                <span className="font-display text-3xl sm:text-4xl font-bold text-[#112a1d] tracking-tight leading-none">
                  {currentStreak}
                </span>
                <span className="font-display text-base font-semibold text-[#25523b] tracking-tight leading-none">
                  {currentStreak === 1 ? "Day Streak" : "Days Streak"}
                </span>
              </div>
              <div className="text-xs text-[#527060] font-medium">
                Personal Best: <span className="font-semibold text-[#112a1d]">{longestStreak} {longestStreak === 1 ? "day" : "days"}</span>
              </div>
            </div>
          </div>

          {/* Quick CTA to start reciting */}
          <Link
            href="/surahs"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-sm active:scale-95 transition-all shrink-0"
          >
            <span>📖</span>
            <span>Recite</span>
          </Link>
        </div>

        {/* 3 Summary KPIs this week */}
        <div className="grid grid-cols-3 gap-2 mt-3.5 pt-3 border-t border-[#ede7d8]">
          <div className="bg-[#fbf9f3] border border-[#e5ded0] rounded-xl p-2.5 text-center">
            <span className="text-[10px] text-[#527060] font-medium block">
              Time
            </span>
            <span className="font-display text-sm sm:text-base font-bold text-[#112a1d] mt-0.5 block">
              {formatTimeSpent(weekStats.totalSeconds)}
            </span>
          </div>

          <div className="bg-[#fbf9f3] border border-[#e5ded0] rounded-xl p-2.5 text-center">
            <span className="text-[10px] text-[#527060] font-medium block">
              Active Days
            </span>
            <span className="font-display text-sm sm:text-base font-bold text-emerald-900 mt-0.5 block">
              {weekStats.daysActive} / 7
            </span>
          </div>

          <div className="bg-[#fbf9f3] border border-[#e5ded0] rounded-xl p-2.5 text-center">
            <span className="text-[10px] text-[#527060] font-medium block">
              Words
            </span>
            <span className="font-display text-sm sm:text-base font-bold text-[#112a1d] mt-0.5 block">
              {weekStats.totalWords}
            </span>
          </div>
        </div>
      </div>

      {/* Daily Tasks / Quran Planner Banner Card */}
      <Link
        href="/todo"
        className="group relative overflow-hidden rounded-2xl bg-white hover:bg-[#fbf9f4] border border-[#ded5c0] hover:border-emerald-600/80 p-3.5 sm:p-4 shadow-sm hover:shadow-md transition-all flex items-center justify-between gap-3 active:scale-[0.99] cursor-pointer"
      >
        <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center shrink-0 group-hover:bg-emerald-700 group-hover:text-white group-hover:border-emerald-700 transition-all shadow-xs">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-sm sm:text-base text-[#112a1d] group-hover:text-emerald-950 transition-colors">
              Daily Planner
            </h3>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 group-hover:bg-emerald-800 text-white text-xs font-bold shrink-0 shadow-xs transition-all">
          <span>Open Planner</span>
          <span className="group-hover:translate-x-0.5 transition-transform text-emerald-200">→</span>
        </span>
      </Link>

      {/* Habit Tracker Banner Card (Matching exactly as requested) */}
      <Link
        href="/habits"
        className="group relative overflow-hidden rounded-2xl bg-white hover:bg-[#fbf9f4] border border-[#ded5c0] hover:border-emerald-600/80 p-3.5 sm:p-4 shadow-sm hover:shadow-md transition-all flex items-center justify-between gap-3 active:scale-[0.99] cursor-pointer"
      >
        <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center shrink-0 group-hover:bg-emerald-700 group-hover:text-white group-hover:border-emerald-700 transition-all shadow-xs">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.253M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
            </svg>
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-sm sm:text-base text-[#112a1d] group-hover:text-emerald-950 transition-colors">
              Habit Tracker
            </h3>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 group-hover:bg-emerald-800 text-white text-xs font-bold shrink-0 shadow-xs transition-all">
          <span>Open Tracker</span>
          <span className="group-hover:translate-x-0.5 transition-transform text-emerald-200">→</span>
        </span>
      </Link>

      {/* Week Navigation Selector */}
      <div className="flex items-center justify-between bg-white border border-[#ded5c0] rounded-2xl px-3 py-2 shadow-sm">
        <button
          onClick={() => setWeekOffset((prev) => prev - 1)}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-[#112a1d] hover:bg-[#efe8d6] bg-[#faf7ee] border border-[#ded5c0] active:scale-95 transition-all cursor-pointer"
          aria-label="Previous Week"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="text-center">
          <div className="font-display text-xs sm:text-sm font-bold text-[#112a1d] leading-tight">
            {weekOffset === 0 ? "This Week" : weekOffset === -1 ? "Last Week" : `${Math.abs(weekOffset)} Weeks Ago`}
          </div>
          <div className="text-[11px] text-[#527060] mt-0.5 font-medium">
            {weekRangeText}
          </div>
        </div>

        <button
          onClick={() => setWeekOffset((prev) => Math.min(0, prev + 1))}
          disabled={weekOffset >= 0}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
            weekOffset >= 0
              ? "text-[#c2baa8] border border-[#e5ded0] bg-transparent cursor-not-allowed"
              : "text-[#112a1d] hover:bg-[#efe8d6] bg-[#faf7ee] border border-[#ded5c0] active:scale-95 cursor-pointer"
          }`}
          aria-label="Next Week"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* 7-Day Visual Timeline Bar */}
      <div className="bg-white border border-[#ded5c0] rounded-2xl p-3 sm:p-4 shadow-sm">
        <div className="text-xs font-semibold text-[#112a1d] mb-2.5 flex items-center justify-between">
          <span>Weekly Overview</span>
          <span className="text-[11px] text-[#527060] font-normal">
            {weekStats.daysActive} of 7 days
          </span>
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center bg-[#faf7ee] border border-[#ded5c0] rounded-xl p-2 sm:p-2.5">
          {weekDays.map((item) => (
            <div key={item.date} className="flex flex-col items-center justify-center">
              {/* Day Label */}
              <span
                className={`text-[10px] sm:text-[11px] font-medium mb-1 select-none ${
                  item.isToday ? "text-amber-700 font-bold" : "text-[#527060]"
                }`}
              >
                {item.dayLabel}
              </span>

              {/* Clean Status Circle */}
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center my-0.5">
                {item.hasRecited ? (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                ) : item.isToday ? (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-amber-500 bg-amber-50 flex items-center justify-center">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  </div>
                ) : item.isPast ? (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#f1ecdf] border border-[#ded5c0] flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#b8ad91]" />
                  </div>
                ) : (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-[#ded5c0] bg-transparent" />
                )}
              </div>

              {/* Day Number */}
              <span className="font-display text-[11px] text-[#527060] font-semibold mt-0.5">
                {item.dayNumber}
              </span>

              {/* Time spent */}
              <span
                className={`text-[9px] mt-0.5 ${
                  item.hasRecited
                    ? "text-emerald-800 font-semibold"
                    : "text-[#9e9482]"
                }`}
              >
                {item.hasRecited ? formatTimeSpent(item.timeSpentSeconds) : "—"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Day-by-Day Detailed Recitation Card */}
      <div className="bg-white border border-[#ded5c0] rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm space-y-3.5">
        {/* Card Header */}
        <div className="flex items-center justify-between border-b border-[#ede7d8] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center shadow-2xs">
              <svg className="w-4 h-4 text-emerald-800" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[#112a1d] tracking-tight leading-tight">
                Daily Breakdown
              </h2>
              <p className="text-[11px] text-[#527060]">
                Day-by-day recitation time &amp; words
              </p>
            </div>
          </div>
          <span className="text-[11px] text-emerald-800 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            7-Day Activity
          </span>
        </div>

        {/* 7 Day Rows */}
        <div className="space-y-2">
          {weekDays.map((d) => {
            const [, mStr, dayStr] = d.date.split("-");
            const monthShort = new Date(2026, Number(mStr) - 1, 1).toLocaleDateString("en-US", {
              month: "short",
            });

            return (
              <div
                key={d.date}
                className={`rounded-2xl p-3 sm:px-4 sm:py-3 border transition-all duration-200 ${
                  d.isToday
                    ? "bg-emerald-50/50 border-emerald-400 ring-1 ring-emerald-300/60 shadow-xs"
                    : d.hasRecited
                    ? "bg-[#fbfcfa] border-emerald-200 hover:border-emerald-400 shadow-2xs"
                    : d.isPast
                    ? "bg-[#faf8f3] border-[#e5ded0] hover:border-[#d6cbaf]"
                    : "bg-[#fcfbf8] border border-dashed border-[#ded5c0] opacity-75"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  {/* Left: Calendar Date Tile + Day Name & Subtitle */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center shrink-0 border transition-all ${
                        d.hasRecited
                          ? "bg-emerald-700 border-emerald-700 text-white shadow-xs"
                          : d.isToday
                          ? "bg-[#143323] border-[#143323] text-white shadow-xs"
                          : "bg-white border-[#ded5c0] text-[#143323]"
                      }`}
                    >
                      <span
                        className={`text-[9px] font-bold uppercase tracking-wider leading-none ${
                          d.hasRecited || d.isToday ? "text-emerald-200" : "text-[#8e8574]"
                        }`}
                      >
                        {monthShort}
                      </span>
                      <span className="text-sm sm:text-base font-extrabold leading-tight mt-0.5">
                        {Number(dayStr)}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm sm:text-base font-bold text-[#112a1d] tracking-tight">
                          {d.fullDayName}
                        </span>
                        {d.isToday && (
                          <span className="bg-emerald-700 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Today
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-0.5 text-xs">
                        {d.hasRecited ? (
                          <span className="text-emerald-800 font-semibold">
                            {formatTimeSpent(d.timeSpentSeconds)} • {d.wordsRevealed} words
                          </span>
                        ) : (
                          <span className="text-[#8e8574] font-medium">
                            0m • 0 words
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Status Badge or Recite Action */}
                  <div className="shrink-0">
                    {d.hasRecited ? (
                      <span className="inline-flex items-center gap-1 bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold px-3 py-1.5 rounded-xl">
                        <svg className="w-3.5 h-3.5 text-emerald-700" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Done</span>
                      </span>
                    ) : d.isToday ? (
                      <Link
                        href="/surahs"
                        className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3.5 py-2 rounded-xl active:scale-95 transition-all shadow-xs cursor-pointer"
                      >
                        <span>Recite</span>
                        <span className="text-emerald-200">→</span>
                      </Link>
                    ) : d.isPast ? (
                      <span className="inline-flex items-center text-[11px] font-semibold text-[#7a7060] bg-[#efeadd] border border-[#ded5c0] px-2.5 py-1 rounded-xl">
                        Missed
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-[11px] font-medium text-[#9e9482] bg-white border border-dashed border-[#ded5c0] px-2.5 py-1 rounded-xl">
                        Upcoming
                      </span>
                    )}
                  </div>
                </div>

                {/* Surahs Completed on that day */}
                {d.hasRecited && d.surahs.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-emerald-200/60 flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-800 mr-1 flex items-center gap-1">
                      <svg className="w-3 h-3 text-emerald-700" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Practiced:
                    </span>
                    {d.surahs.map((s) => (
                      <Link
                        key={s.number}
                        href={`/recite/${s.number}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white hover:bg-emerald-50 border border-emerald-200 text-[#112a1d] text-xs font-semibold transition-all shadow-2xs"
                      >
                        <span className="text-emerald-800 font-bold">{s.number}.</span>
                        <span>{s.name}</span>
                        <span className="font-quran text-[#143323] text-xs" dir="rtl">
                          ({s.arabicName})
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Hadith & Motivational Reflection */}
      <div className="rounded-xl bg-white border border-[#ded5c0] p-3 text-center space-y-1 shadow-sm">
        <p className="font-quran text-[#112a1d] text-xs sm:text-sm leading-relaxed" dir="rtl">
          &quot;أَحَبُّ الْأَعْمَالِ إِلَى اللَّهِ أَدْوَمُهَا وَإِنْ قَلَّ&quot;
        </p>
        <p className="text-[11px] text-[#527060]">
          “The most beloved deeds to Allah are those that are most consistent, even if small.”
        </p>
        <p className="text-[9px] text-[#8e8574]">
          — Sahih al-Bukhari
        </p>
      </div>
    </div>
  );
}

