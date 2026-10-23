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

  useEffect(() => {
    (async () => {
      const allActs = await db.activity.toArray();
      setActivities(allActs);
      setLoaded(true);
    })();
  }, []);

  const activityMap = useMemo(() => {
    const map = new Map<string, DailyActivity>();
    for (const a of activities) {
      map.set(a.date, a);
    }
    return map;
  }, [activities]);

  const activeDates = useMemo(() => {
    return activities.filter((a) => a.wordsRevealed > 0).map((a) => a.date);
  }, [activities]);

  const currentStreak = useMemo(() => calcCurrentStreak(activeDates), [activeDates]);
  const longestStreak = useMemo(() => calcLongestStreak(activeDates), [activeDates]);

  // Current week days (Monday to Sunday) based on weekOffset
  const weekDays = useMemo(() => {
    return getWeekDays(activityMap, new Date(), weekOffset);
  }, [activityMap, weekOffset]);

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
      <div className="flex items-center justify-between min-h-[46px] border-b border-[#ede7d8] pb-3">
        {/* Back Button */}
        <button
          onClick={handleBack}
          className="inline-flex items-center justify-center px-4 py-1.5 rounded-xl text-xs sm:text-sm font-semibold tracking-wide text-[#193d2b] bg-white hover:bg-[#efe9d8] active:bg-[#e4dcce] border border-[#d6cbaf] shadow-sm active:scale-95 transition-all duration-200 cursor-pointer"
        >
          Back
        </button>

        {/* Centered Page Title */}
        <h1 className="font-display text-base sm:text-lg font-bold text-[#112a1d] tracking-tight">
          Streak & Activity
        </h1>

        {/* Improved Dashboard Button */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#1e402e] bg-[#f0ebd9] hover:bg-[#e4dcce] border border-[#ded5c0] active:scale-95 transition-all shadow-sm"
        >
          <svg className="w-3.5 h-3.5 text-emerald-800" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span>Dashboard</span>
        </Link>
      </div>

      {/* Main Hero Streak Banner Card */}
      <div className="relative overflow-hidden rounded-2xl bg-white border border-[#ded5c0] p-4 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          {/* Flame Icon & Display Numbers */}
          <div className="flex items-center gap-3.5">
            {/* Circular Glowing Flame Badge */}
            <div className="relative flex items-center justify-center shrink-0">
              <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-amber-400/25 via-amber-300/15 to-orange-400/20 blur-[6px] opacity-80" />
              <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full p-0.5 bg-gradient-to-b from-[#fcd34d] via-[#f59e0b] to-[#d97706] shadow-[0_2px_10px_rgba(245,158,11,0.25)]">
                <div className="w-full h-full rounded-full bg-gradient-to-b from-[#fffef7] via-[#fffbeb] to-[#fef3c7] flex items-center justify-center shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.95)]">
                  <svg
                    className="w-6 h-6 sm:w-7 sm:h-7 drop-shadow-[0_2px_4px_rgba(217,119,6,0.3)]"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <defs>
                      <linearGradient id="streakFlameGrad" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#f59e0b" />
                        <stop offset="60%" stopColor="#d97706" />
                        <stop offset="100%" stopColor="#b45309" />
                      </linearGradient>
                      <linearGradient id="streakFlameInner" x1="12" y1="10" x2="12" y2="21" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#fef08a" />
                        <stop offset="100%" stopColor="#f59e0b" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M12 2c.5 2.5 2 4.5 4 6 2.5 1.9 3.5 4.3 3.5 7 0 4.14-3.36 7.5-7.5 7.5S4.5 19.14 4.5 15c0-3.3 2-6.2 4-8.5.3 1.2 1 2.2 2 2.8 0-3.5 1-6.5 1.5-7.3z"
                      fill="url(#streakFlameGrad)"
                    />
                    <path
                      d="M12 10.5c.3 1.1 1.1 2 2 2.7 1.1.9 1.6 2 1.6 3.2 0 2-1.6 3.6-3.6 3.6s-3.6-1.6-3.6-3.6c0-1.5.9-2.9 1.8-3.9.2.5.5 1 .9 1.2 0-1.5.4-2.7.9-3.2z"
                      fill="url(#streakFlameInner)"
                      opacity="0.95"
                    />
                  </svg>
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

      {/* Day-by-Day Detailed Recitation Cards */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-emerald-100/90 border border-emerald-300 text-emerald-800 flex items-center justify-center text-xs shadow-2xs">
              <svg className="w-3.5 h-3.5 text-emerald-800" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
            </div>
            <h2 className="text-sm sm:text-base font-bold text-[#112a1d] tracking-tight">
              Daily Breakdown
            </h2>
          </div>
          <span className="text-[11px] text-[#527060] font-medium bg-[#f0ebd9] px-2 py-0.5 rounded-full border border-[#ded5c0]">
            7-Day Activity
          </span>
        </div>

        <div className="space-y-2">
          {weekDays.map((d) => {
            return (
              <div
                key={d.date}
                className={`rounded-2xl p-3 sm:p-3.5 border transition-all duration-200 ${
                  d.isToday
                    ? "bg-gradient-to-r from-[#fffef7] via-[#fffcf2] to-white border-[#f59e0b] shadow-[0_4px_16px_rgba(245,158,11,0.12)] ring-1 ring-[#f59e0b]/40"
                    : d.hasRecited
                    ? "bg-white border-[#c9decb] hover:border-emerald-400 shadow-sm"
                    : d.isPast
                    ? "bg-[#faf7ee]/80 border-[#ded5c0] hover:bg-[#faf7ee]"
                    : "bg-white/60 border border-dashed border-[#ded5c0]"
                }`}
              >
                <div className="flex items-center justify-between gap-2.5">
                  {/* Left: Day Icon + Day Name & Date */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform ${
                        d.hasRecited
                          ? "bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-sm"
                          : d.isToday
                          ? "bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-sm ring-2 ring-amber-300"
                          : d.isPast
                          ? "bg-[#ede7d8] border border-[#ded5c0] text-[#8e8574]"
                          : "bg-transparent border border-dashed border-[#ded5c0] text-[#a89f8f]"
                      }`}
                    >
                      {d.hasRecited ? (
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : d.isToday ? (
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : d.isPast ? (
                        <svg className="w-4 h-4 text-[#8e8574]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
                        </svg>
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-[#ded5c0]" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-sm sm:text-base font-bold tracking-tight ${d.isToday ? "text-[#112a1d]" : "text-[#112a1d]"}`}>
                          {d.fullDayName}
                        </span>
                        {d.isToday && (
                          <span className="bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-2xs">
                            Today
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-[#527060] font-medium block">
                        {formatReadableDate(d.date)}
                      </span>
                    </div>
                  </div>

                  {/* Right: Metrics + Status Action */}
                  <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
                    {/* Metrics */}
                    <div className="text-right">
                      {d.hasRecited ? (
                        <>
                          <div className="font-bold text-emerald-950 text-xs sm:text-sm">
                            {formatTimeSpent(d.timeSpentSeconds)}
                          </div>
                          <div className="text-[11px] text-[#527060] font-medium">
                            {d.wordsRevealed} words
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-xs text-[#8e8574] font-medium">
                            0m
                          </div>
                          <div className="text-[11px] text-[#a89f8f]">
                            0 words
                          </div>
                        </>
                      )}
                    </div>

                    {/* Status Pill or Recite Action */}
                    <div className="min-w-[80px] sm:min-w-[90px] text-right">
                      {d.hasRecited ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-300 text-emerald-800 text-[11px] font-bold px-2.5 py-1 rounded-full shadow-2xs">
                          <svg className="w-3 h-3 text-emerald-700" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Done</span>
                        </span>
                      ) : d.isToday ? (
                        <Link
                          href="/surahs"
                          className="inline-flex items-center gap-1.5 bg-gradient-to-r from-emerald-700 via-emerald-800 to-teal-800 hover:from-emerald-800 hover:to-teal-900 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl active:scale-95 transition-all shadow-md hover:shadow-lg cursor-pointer"
                        >
                          <svg className="w-3 h-3 text-emerald-200" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
                          </svg>
                          <span>Recite</span>
                        </Link>
                      ) : d.isPast ? (
                        <span className="inline-block text-[11px] font-semibold text-[#8e8574] bg-[#f0ebd9]/80 border border-[#ded5c0] px-2.5 py-1 rounded-lg">
                          Missed
                        </span>
                      ) : (
                        <span className="inline-block text-[11px] font-medium text-[#a89f8f] bg-[#faf7ee] border border-dashed border-[#ded5c0] px-2 py-0.5 rounded-md">
                          Upcoming
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Surahs Recited on that day */}
                {d.hasRecited && d.surahs.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-[#edf4ee] flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-800 mr-1">
                      Recited:
                    </span>
                    {d.surahs.map((s) => (
                      <Link
                        key={s.number}
                        href={`/recite/${s.number}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#f0f8f3] hover:bg-[#e1f3e7] border border-emerald-200 text-[#112a1d] text-xs font-semibold transition-all shadow-2xs hover:border-emerald-300"
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

