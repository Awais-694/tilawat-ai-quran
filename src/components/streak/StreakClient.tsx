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
  formatTimeSpentUrdu,
  type DayStreakItem,
} from "@/lib/quran/streak";

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

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-16 px-1 sm:px-2">
      {/* Top Header Navigation */}
      <div className="flex items-center justify-between min-h-[46px] border-b border-emerald-900/50 pb-3">
        <button
          onClick={handleBack}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold text-emerald-100 bg-[#0d2217] hover:bg-[#133022] border border-emerald-600/50 hover:border-emerald-400 shadow-sm active:scale-95 transition-all cursor-pointer"
        >
          <span>←</span>
          <span>Home</span>
        </button>

        <div className="text-center">
          <h1 className="text-lg sm:text-xl font-bold text-white tracking-wide">
            Daily Streak & Activity
          </h1>
          <p className="text-xs text-emerald-300/80 font-quran" dir="rtl">
            روزانہ تلاوت کا تسلسل اور تفصیلی ریکارڈ
          </p>
        </div>

        <Link
          href="/"
          className="text-xs text-emerald-300 hover:text-white font-medium px-2 py-1 transition-colors"
        >
          Dashboard
        </Link>
      </div>

      {/* Main Hero Streak Banner Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0c2419] via-[#091b12] to-[#05130b] border border-emerald-600/50 p-4 sm:p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Flame Badge & Numbers */}
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 via-emerald-950 to-emerald-900/40 border border-amber-500/50 flex items-center justify-center shrink-0 shadow-sm">
              <svg
                className="w-8 h-8 text-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2c.5 2.5 2 4.5 4 6 2.5 1.9 3.5 4.3 3.5 7 0 4.14-3.36 7.5-7.5 7.5S4.5 19.14 4.5 15c0-3.3 2-6.2 4-8.5.3 1.2 1 2.2 2 2.8 0-3.5 1-6.5 1.5-7.3z" />
              </svg>
            </div>

            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-white font-mono tracking-tight">
                  {currentStreak}
                </span>
                <span className="text-base font-bold text-emerald-200">
                  {currentStreak === 1 ? "Day Streak" : "Days Streak"}
                </span>
              </div>
              <div className="text-xs text-emerald-400 font-medium mt-0.5">
                {currentStreak > 0
                  ? "ماشاءاللہ! روزانہ تلاوت کا تسلسل برقرار ہے۔"
                  : "آج کی تلاوت مکمل کریں اور اپنی اسٹریک شروع کریں۔"}
              </div>
              <div className="text-[11px] text-emerald-400/80 mt-1">
                سب سے بہترین ریکارڈ: <span className="font-bold text-white">{longestStreak} {longestStreak === 1 ? "Day" : "Days"}</span>
              </div>
            </div>
          </div>

          {/* Quick CTA to start reciting */}
          <Link
            href="/surahs"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold text-xs sm:text-sm shadow-md active:scale-95 transition-all text-center"
          >
            <span>📖</span>
            <span>آج کی تلاوت کریں</span>
          </Link>
        </div>

        {/* 3 Summary KPIs this week */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-4 pt-3.5 border-t border-emerald-900/60">
          <div className="bg-[#05140b]/80 border border-emerald-900/60 rounded-xl p-2.5 text-center">
            <span className="text-[11px] text-emerald-300/80 font-medium block">
              صرف کیا گیا وقت
            </span>
            <span className="text-sm sm:text-base font-bold text-white mt-0.5 block font-mono">
              {formatTimeSpent(weekStats.totalSeconds)}
            </span>
            <span className="text-[10px] text-emerald-400/70 font-quran block" dir="rtl">
              {formatTimeSpentUrdu(weekStats.totalSeconds)}
            </span>
          </div>

          <div className="bg-[#05140b]/80 border border-emerald-900/60 rounded-xl p-2.5 text-center">
            <span className="text-[11px] text-emerald-300/80 font-medium block">
              حاضری کے دن
            </span>
            <span className="text-sm sm:text-base font-bold text-emerald-200 mt-0.5 block font-mono">
              {weekStats.daysActive} / 7
            </span>
            <span className="text-[10px] text-emerald-400/70 block">
              {Math.round((weekStats.daysActive / 7) * 100)}% Consistency
            </span>
          </div>

          <div className="bg-[#05140b]/80 border border-emerald-900/60 rounded-xl p-2.5 text-center">
            <span className="text-[11px] text-emerald-300/80 font-medium block">
              کل پڑھے گئے الفاظ
            </span>
            <span className="text-sm sm:text-base font-bold text-white mt-0.5 block font-mono">
              {weekStats.totalWords}
            </span>
            <span className="text-[10px] text-emerald-400/70 block">
              {weekStats.accuracy ? `${weekStats.accuracy}% درستگی` : "الفاظ"}
            </span>
          </div>
        </div>
      </div>

      {/* Week Navigation Selector */}
      <div className="flex items-center justify-between bg-[#0a2016]/90 border border-emerald-800/50 rounded-2xl px-3 sm:px-4 py-2 shadow-sm">
        <button
          onClick={() => setWeekOffset((prev) => prev - 1)}
          className="text-xs text-emerald-200 hover:text-white bg-emerald-950/80 border border-emerald-700/50 hover:border-emerald-500 rounded-lg px-2.5 py-1.5 transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
        >
          <span>←</span>
          <span>پچھلا ہفتہ</span>
        </button>

        <div className="text-center">
          <span className="text-xs sm:text-sm font-bold text-white block">
            {weekOffset === 0 ? "یہ ہفتہ (This Week)" : weekOffset === -1 ? "پچھلا ہفتہ (Last Week)" : `${Math.abs(weekOffset)} ہفتے پہلے`}
          </span>
          <span className="text-[10px] sm:text-[11px] text-emerald-300/70 block font-mono">
            {weekDays[0]?.date} تا {weekDays[6]?.date}
          </span>
        </div>

        <button
          onClick={() => setWeekOffset((prev) => Math.min(0, prev + 1))}
          disabled={weekOffset >= 0}
          className={`text-xs rounded-lg px-2.5 py-1.5 transition-all flex items-center gap-1 ${
            weekOffset >= 0
              ? "text-emerald-800 border border-emerald-950 bg-transparent cursor-not-allowed"
              : "text-emerald-200 hover:text-white bg-emerald-950/80 border border-emerald-700/50 hover:border-emerald-500 active:scale-95 cursor-pointer"
          }`}
        >
          <span>اگلا ہفتہ</span>
          <span>→</span>
        </button>
      </div>

      {/* 7-Day Visual Timeline Bar (Clean Circles) */}
      <div className="bg-[#0c2419] border border-emerald-700/50 rounded-2xl p-3 sm:p-4 shadow-sm">
        <div className="text-xs font-semibold text-emerald-200 mb-2.5 flex items-center justify-between">
          <span>Weekly Overview (ہفتہ وار جائزہ)</span>
          <span className="text-[11px] text-emerald-400 font-normal">
            {weekStats.daysActive} دن تلاوت مکمل
          </span>
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center bg-[#05130b]/80 border border-emerald-900/60 rounded-xl p-2.5 sm:p-3">
          {weekDays.map((item) => (
            <div key={item.date} className="flex flex-col items-center justify-center">
              {/* Day Label */}
              <span
                className={`text-[10px] sm:text-xs font-medium mb-1 select-none ${
                  item.isToday ? "text-amber-300 font-bold" : "text-emerald-300/70"
                }`}
              >
                {item.dayLabel}
              </span>

              {/* Clean Status Circle */}
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center my-1">
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
      <div className="space-y-2.5">
        <h2 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2 px-1">
          <span>روزانہ کی تفصیلی رپورٹ (Day by Day Breakdown)</span>
        </h2>

        <div className="space-y-2">
          {weekDays.map((d) => {
            return (
              <div
                key={d.date}
                className={`rounded-2xl p-3 sm:p-3.5 border transition-all ${
                  d.isToday
                    ? "bg-[#0c2419] border-amber-500/50 shadow-sm"
                    : d.hasRecited
                    ? "bg-[#091a13] border-emerald-800/60"
                    : "bg-[#05110a]/60 border-emerald-950/60 opacity-75"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  {/* Day Info */}
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        d.hasRecited
                          ? "bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 font-bold"
                          : d.isToday
                          ? "bg-amber-500/15 border border-amber-500/40 text-amber-300"
                          : "bg-emerald-950/40 border border-emerald-900/40 text-emerald-700"
                      }`}
                    >
                      {d.hasRecited ? (
                        <svg className="w-4 h-4 text-emerald-300" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : d.isToday ? (
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                      ) : (
                        <span className="text-xs select-none">—</span>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">
                          {d.fullDayName} ({d.urduDayName})
                        </span>
                        {d.isToday && (
                          <span className="bg-amber-400 text-amber-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                            آج
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-emerald-400/70 font-mono">
                        {d.date}
                      </span>
                    </div>
                  </div>

                  {/* Recitation Metrics / Status */}
                  <div className="flex items-center gap-2 sm:gap-3 text-xs">
                    {/* Time Spent */}
                    <div className="bg-[#030e07] border border-emerald-900/60 rounded-xl px-2.5 py-1.5 text-center min-w-[70px]">
                      <span className="text-[10px] text-emerald-400/70 block">
                        وقت
                      </span>
                      <span className="font-bold text-white font-mono block">
                        {d.hasRecited ? formatTimeSpent(d.timeSpentSeconds) : "0m"}
                      </span>
                    </div>

                    {/* Words */}
                    <div className="bg-[#030e07] border border-emerald-900/60 rounded-xl px-2.5 py-1.5 text-center min-w-[70px]">
                      <span className="text-[10px] text-emerald-400/70 block">
                        الفاظ
                      </span>
                      <span className="font-bold text-emerald-200 font-mono block">
                        {d.wordsRevealed}
                      </span>
                    </div>

                    {/* Status Button / Pill */}
                    <div className="min-w-[85px] text-right sm:text-center">
                      {d.hasRecited ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-950 border border-emerald-600/60 text-emerald-300 text-[11px] font-medium px-2.5 py-1 rounded-full">
                          <span>✓</span>
                          <span>پڑھی گئی</span>
                        </span>
                      ) : d.isToday ? (
                        <Link
                          href="/surahs"
                          className="inline-flex items-center gap-1 bg-amber-500 hover:bg-amber-400 text-amber-950 text-[11px] font-bold px-3 py-1 rounded-full active:scale-95 transition-all shadow-sm"
                        >
                          <span>ابھی پڑھیں</span>
                        </Link>
                      ) : d.isPast ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 text-[11px] px-2 py-1">
                          <span>نہیں پڑھی</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-emerald-800">
                          آئندہ دن
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Surahs Recited on that day */}
                {d.hasRecited && d.surahs.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-emerald-900/50 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-emerald-400/80 font-medium mr-1">
                      سورتیں:
                    </span>
                    {d.surahs.map((s) => (
                      <Link
                        key={s.number}
                        href={`/recite/${s.number}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#06150e] hover:bg-[#0c2418] border border-emerald-700/60 hover:border-emerald-400 text-emerald-200 text-xs font-medium transition-all"
                      >
                        <span className="font-quran" dir="rtl">{s.arabicName}</span>
                        <span className="text-[10px] text-emerald-400/70">({s.name})</span>
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
      <div className="rounded-2xl bg-gradient-to-r from-emerald-950/80 via-[#0a2318]/90 to-emerald-950/80 border border-emerald-800/40 p-4 text-center space-y-1.5 shadow-sm">
        <p className="font-quran text-emerald-100 text-sm sm:text-base leading-relaxed" dir="rtl">
          &quot;أَحَبُّ الْأَعْمَالِ إِلَى اللَّهِ أَدْوَمُهَا وَإِنْ قَلَّ&quot;
        </p>
        <p className="text-xs text-emerald-300/80">
          (صحیح بخاری — اللہ تعالیٰ کے نزدیک سب سے پسندیدہ عمل وہ ہے جو پابندی سے کیا جائے، خواہ تھوڑا ہی کیوں نہ ہو)
        </p>
      </div>
    </div>
  );
}
