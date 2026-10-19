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
      {/* Top Header Navigation - Clean Pill Buttons with No Arrow */}
      <div className="flex items-center justify-between min-h-[46px] border-b border-emerald-900/40 pb-3">
        {/* Back Button (No Arrow) */}
        <button
          onClick={handleBack}
          className="inline-flex items-center justify-center px-4 py-1.5 rounded-full text-xs font-semibold text-emerald-100 bg-[#0d2217] hover:bg-[#133022] border border-emerald-600/50 hover:border-emerald-400 active:scale-95 transition-all shadow-sm cursor-pointer"
        >
          Back
        </button>

        {/* Centered Page Title */}
        <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
          Streak & Activity
        </h1>

        {/* Improved Dashboard Button */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-emerald-200 bg-[#0d2217] hover:bg-[#133022] border border-emerald-600/50 hover:border-emerald-400 active:scale-95 transition-all shadow-sm"
        >
          <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span>Dashboard</span>
        </Link>
      </div>

      {/* Main Hero Streak Banner Card */}
      <div className="relative overflow-hidden rounded-2xl bg-[#0a2016] border border-emerald-700/60 p-4 sm:p-5 shadow-lg">
        <div className="flex items-center justify-between gap-3">
          {/* Flame Icon & Streak Numbers */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center shrink-0 shadow-sm">
              <svg
                className="w-7 h-7 text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2c.5 2.5 2 4.5 4 6 2.5 1.9 3.5 4.3 3.5 7 0 4.14-3.36 7.5-7.5 7.5S4.5 19.14 4.5 15c0-3.3 2-6.2 4-8.5.3 1.2 1 2.2 2 2.8 0-3.5 1-6.5 1.5-7.3z" />
              </svg>
            </div>

            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight leading-none">
                  {currentStreak}
                </span>
                <span className="text-sm font-bold text-emerald-200 leading-none">
                  {currentStreak === 1 ? "Day Streak" : "Days Streak"}
                </span>
              </div>
              <div className="text-[11px] text-emerald-400/80 mt-1">
                Personal Best: <span className="font-semibold text-white">{longestStreak} {longestStreak === 1 ? "day" : "days"}</span>
              </div>
            </div>
          </div>

          {/* Quick CTA to start reciting */}
          <Link
            href="/surahs"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md active:scale-95 transition-all shrink-0"
          >
            <span>📖</span>
            <span>Recite</span>
          </Link>
        </div>

        {/* 3 Summary KPIs this week */}
        <div className="grid grid-cols-3 gap-2 mt-3.5 pt-3 border-t border-emerald-900/60">
          <div className="bg-[#05140b]/90 border border-emerald-900/60 rounded-xl p-2 text-center">
            <span className="text-[10px] text-emerald-400/80 font-medium block">
              Time
            </span>
            <span className="text-sm sm:text-base font-bold text-white mt-0.5 block font-mono">
              {formatTimeSpent(weekStats.totalSeconds)}
            </span>
          </div>

          <div className="bg-[#05140b]/90 border border-emerald-900/60 rounded-xl p-2 text-center">
            <span className="text-[10px] text-emerald-400/80 font-medium block">
              Active Days
            </span>
            <span className="text-sm sm:text-base font-bold text-emerald-200 mt-0.5 block font-mono">
              {weekStats.daysActive} / 7
            </span>
          </div>

          <div className="bg-[#05140b]/90 border border-emerald-900/60 rounded-xl p-2 text-center">
            <span className="text-[10px] text-emerald-400/80 font-medium block">
              Words
            </span>
            <span className="text-sm sm:text-base font-bold text-white mt-0.5 block font-mono">
              {weekStats.totalWords}
            </span>
          </div>
        </div>
      </div>

      {/* Week Navigation Selector */}
      <div className="flex items-center justify-between bg-[#0a2016] border border-emerald-800/50 rounded-2xl px-3 py-2 shadow-sm">
        <button
          onClick={() => setWeekOffset((prev) => prev - 1)}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-emerald-200 hover:text-white bg-emerald-950/90 border border-emerald-700/60 hover:border-emerald-400 active:scale-95 transition-all cursor-pointer"
          aria-label="Previous Week"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="text-center">
          <div className="text-xs sm:text-sm font-bold text-white leading-tight">
            {weekOffset === 0 ? "This Week" : weekOffset === -1 ? "Last Week" : `${Math.abs(weekOffset)} Weeks Ago`}
          </div>
          <div className="text-[11px] text-emerald-400/80 font-mono mt-0.5">
            {weekRangeText}
          </div>
        </div>

        <button
          onClick={() => setWeekOffset((prev) => Math.min(0, prev + 1))}
          disabled={weekOffset >= 0}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
            weekOffset >= 0
              ? "text-emerald-900 border border-emerald-950 bg-transparent cursor-not-allowed"
              : "text-emerald-200 hover:text-white bg-emerald-950/90 border border-emerald-700/60 hover:border-emerald-400 active:scale-95 cursor-pointer"
          }`}
          aria-label="Next Week"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* 7-Day Visual Timeline Bar */}
      <div className="bg-[#0a2016] border border-emerald-700/50 rounded-2xl p-3 sm:p-4 shadow-sm">
        <div className="text-xs font-semibold text-emerald-200 mb-2.5 flex items-center justify-between">
          <span>Weekly Overview</span>
          <span className="text-[11px] text-emerald-400 font-normal">
            {weekStats.daysActive} of 7 days
          </span>
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center bg-[#05130b]/80 border border-emerald-900/60 rounded-xl p-2 sm:p-2.5">
          {weekDays.map((item) => (
            <div key={item.date} className="flex flex-col items-center justify-center">
              {/* Day Label */}
              <span
                className={`text-[10px] sm:text-[11px] font-medium mb-1 select-none ${
                  item.isToday ? "text-amber-300 font-bold" : "text-emerald-300/70"
                }`}
              >
                {item.dayLabel}
              </span>

              {/* Clean Status Circle */}
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center my-0.5">
                {item.hasRecited ? (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm shadow-emerald-500/40">
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                ) : item.isToday ? (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-amber-400 bg-amber-500/10 flex items-center justify-center">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  </div>
                ) : item.isPast ? (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-950/40 border border-emerald-900/40 flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-800/60" />
                  </div>
                ) : (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-emerald-900/30 bg-transparent" />
                )}
              </div>

              {/* Day Number */}
              <span className="text-[10px] text-emerald-400/80 font-mono mt-0.5">
                {item.dayNumber}
              </span>

              {/* Time spent */}
              <span
                className={`text-[9px] font-mono mt-0.5 ${
                  item.hasRecited
                    ? "text-emerald-300 font-bold"
                    : "text-emerald-800"
                }`}
              >
                {item.hasRecited ? formatTimeSpent(item.timeSpentSeconds) : "—"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Day-by-Day Detailed Recitation Cards */}
      <div className="space-y-2">
        <h2 className="text-xs sm:text-sm font-bold text-white px-1">
          Daily Breakdown
        </h2>

        <div className="space-y-1.5">
          {weekDays.map((d) => {
            return (
              <div
                key={d.date}
                className={`rounded-xl p-2.5 sm:p-3 border transition-all ${
                  d.isToday
                    ? "bg-[#0c2419] border-amber-500/50 shadow-sm"
                    : d.hasRecited
                    ? "bg-[#091a13] border-emerald-800/60"
                    : "bg-[#05110a]/60 border-emerald-950/60 opacity-75"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  {/* Day Info */}
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        d.hasRecited
                          ? "bg-emerald-500/20 border border-emerald-500/50 text-emerald-300"
                          : d.isToday
                          ? "bg-amber-500/15 border border-amber-500/40 text-amber-300"
                          : "bg-emerald-950/40 border border-emerald-900/40 text-emerald-700"
                      }`}
                    >
                      {d.hasRecited ? (
                        <svg className="w-3.5 h-3.5 text-emerald-300" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : d.isToday ? (
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      ) : (
                        <span className="text-[10px] select-none">—</span>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs sm:text-sm font-bold text-white">
                          {d.fullDayName}
                        </span>
                        {d.isToday && (
                          <span className="bg-amber-400 text-amber-950 text-[9px] font-black px-1.5 py-0.5 rounded uppercase">
                            Today
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-emerald-400/70 font-mono">
                        {formatReadableDate(d.date)}
                      </span>
                    </div>
                  </div>

                  {/* Recitation Metrics / Status */}
                  <div className="flex items-center gap-2 text-xs">
                    <div className="text-right">
                      <div className="font-bold text-white font-mono text-xs">
                        {d.hasRecited ? formatTimeSpent(d.timeSpentSeconds) : "0m"}
                      </div>
                      <div className="text-[10px] text-emerald-400/70 font-mono">
                        {d.wordsRevealed} words
                      </div>
                    </div>

                    {/* Status Pill */}
                    <div className="min-w-[76px] text-right">
                      {d.hasRecited ? (
                        <span className="inline-block bg-emerald-950 border border-emerald-600/60 text-emerald-300 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                          Done ✓
                        </span>
                      ) : d.isToday ? (
                        <Link
                          href="/surahs"
                          className="inline-block bg-amber-500 hover:bg-amber-400 text-amber-950 text-[10px] font-bold px-2 py-0.5 rounded-full active:scale-95 transition-all shadow-sm"
                        >
                          Recite
                        </Link>
                      ) : d.isPast ? (
                        <span className="text-[10px] text-emerald-700 px-1">
                          Missed
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-800 px-1">
                          Upcoming
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Surahs Recited on that day */}
                {d.hasRecited && d.surahs.length > 0 && (
                  <div className="mt-2 pt-1.5 border-t border-emerald-900/50 flex flex-wrap items-center gap-1.5">
                    {d.surahs.map((s) => (
                      <Link
                        key={s.number}
                        href={`/recite/${s.number}`}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#06150e] hover:bg-[#0c2418] border border-emerald-700/60 hover:border-emerald-400 text-emerald-200 text-[11px] font-medium transition-all"
                      >
                        <span>{s.number}. {s.name}</span>
                        <span className="font-quran text-emerald-400/80 text-[10px]" dir="rtl">({s.arabicName})</span>
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
      <div className="rounded-xl bg-[#0a2016] border border-emerald-800/40 p-3 text-center space-y-1 shadow-sm">
        <p className="font-quran text-emerald-100 text-xs sm:text-sm leading-relaxed" dir="rtl">
          &quot;أَحَبُّ الْأَعْمَالِ إِلَى اللَّهِ أَدْوَمُهَا وَإِنْ قَلَّ&quot;
        </p>
        <p className="text-[11px] text-emerald-300/80">
          “The most beloved deeds to Allah are those that are most consistent, even if small.”
        </p>
        <p className="text-[9px] text-emerald-500/70 font-mono">
          — Sahih al-Bukhari
        </p>
      </div>
    </div>
  );
}
