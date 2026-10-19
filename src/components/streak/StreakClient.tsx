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
import { getSurahMeta } from "@/lib/quran/data";

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
      <div className="relative flex items-center justify-between min-h-[46px] border-b border-emerald-900/40 pb-3">
        <button
          onClick={handleBack}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold tracking-wide text-emerald-100 bg-[#0d2217]/90 hover:bg-[#133022] border border-emerald-600/50 hover:border-emerald-400/80 shadow-[0_2px_8px_rgba(0,0,0,0.35)] backdrop-blur-md active:scale-95 transition-all duration-200 cursor-pointer"
        >
          <span>←</span>
          <span>Home</span>
        </button>

        <div className="text-center">
          <h1 className="text-lg sm:text-2xl font-black text-white tracking-wide">
            Daily Streak & Activity
          </h1>
          <p className="text-[11px] sm:text-xs text-emerald-300/80 font-quran" dir="rtl">
            روزانہ تلاوت کا تسلسل اور ہفتہ وار ریکارڈ
          </p>
        </div>

        <Link
          href="/"
          className="text-xs text-emerald-400/80 hover:text-emerald-200 font-semibold px-2 py-1 rounded transition-colors"
        >
          Dashboard
        </Link>
      </div>

      {/* Main Hero Streak Banner Card */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#0c1e15]/95 via-[#07160f]/95 to-[#040e09]/95 border border-emerald-500/50 p-4 sm:p-6 shadow-[0_12px_40px_rgba(0,0,0,0.55)] backdrop-blur-md">
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
          {/* Flame Badge */}
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center bg-gradient-to-br from-emerald-950 via-[#0d281a] to-[#06140d] border-2 border-amber-500/60 shadow-[0_0_25px_rgba(245,158,11,0.35)] shrink-0">
              <span className="text-3xl sm:text-4xl filter drop-shadow-[0_0_12px_rgba(245,158,11,0.7)] animate-bounce select-none">
                🔥
              </span>
            </div>

            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-black text-white font-mono">
                  {currentStreak}
                </span>
                <span className="text-base sm:text-lg font-bold text-emerald-200">
                  {currentStreak === 1 ? "Day Streak" : "Days Streak"}
                </span>
              </div>
              <div className="text-xs sm:text-sm text-amber-300 font-semibold mt-0.5">
                {currentStreak > 0
                  ? "🔥 تلاوت کا تسلسل جاری ہے! شاباش!"
                  : "آج کی تلاوت مکمل کر کے اپنی اسٹریک شروع کریں!"}
              </div>
              <div className="text-[11px] sm:text-xs text-emerald-400/90 font-medium mt-1">
                🏆 سب سے لمبی اسٹریک (Best Record): <span className="font-bold text-emerald-200">{longestStreak} {longestStreak === 1 ? "Day" : "Days"}</span>
              </div>
            </div>
          </div>

          {/* Quick CTA to start reciting */}
          <Link
            href="/surahs"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold text-xs sm:text-sm shadow-lg hover:shadow-emerald-500/30 active:scale-95 transition-all text-center"
          >
            <span>📖</span>
            <span>آج کی تلاوت کریں</span>
          </Link>
        </div>

        {/* 3 Summary KPIs this week */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-5 pt-4 border-t border-emerald-900/60">
          <div className="bg-[#05140b]/80 border border-emerald-900/50 rounded-xl p-2.5 sm:p-3 text-center">
            <span className="text-[10px] sm:text-xs text-emerald-300/80 font-medium block">
              ⏱️ صرف کیا گیا وقت
            </span>
            <span className="text-sm sm:text-base font-bold text-white mt-0.5 block font-mono">
              {formatTimeSpent(weekStats.totalSeconds)}
            </span>
            <span className="text-[10px] text-emerald-400/70 font-quran block" dir="rtl">
              {formatTimeSpentUrdu(weekStats.totalSeconds)}
            </span>
          </div>

          <div className="bg-[#05140b]/80 border border-emerald-900/50 rounded-xl p-2.5 sm:p-3 text-center">
            <span className="text-[10px] sm:text-xs text-emerald-300/80 font-medium block">
              📅 فعال دن (Days Active)
            </span>
            <span className="text-sm sm:text-base font-bold text-emerald-200 mt-0.5 block font-mono">
              {weekStats.daysActive} / 7
            </span>
            <span className="text-[10px] text-emerald-400/70 block">
              {Math.round((weekStats.daysActive / 7) * 100)}% Consistency
            </span>
          </div>

          <div className="bg-[#05140b]/80 border border-emerald-900/50 rounded-xl p-2.5 sm:p-3 text-center">
            <span className="text-[10px] sm:text-xs text-emerald-300/80 font-medium block">
              📖 کل پڑھے گئے الفاظ
            </span>
            <span className="text-sm sm:text-base font-bold text-white mt-0.5 block font-mono">
              {weekStats.totalWords}
            </span>
            <span className="text-[10px] text-emerald-400/70 block">
              {weekStats.accuracy ? `${weekStats.accuracy}% Accuracy` : " الفاظ"}
            </span>
          </div>
        </div>
      </div>

      {/* Week Navigation Selector */}
      <div className="flex items-center justify-between bg-[#0a2016]/90 border border-emerald-800/50 rounded-2xl px-3 sm:px-4 py-2.5 shadow-md">
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

      {/* 7-Day Visual Diamonds Timeline Bar */}
      <div className="bg-[#0c1f15]/90 border border-emerald-700/50 rounded-2xl p-3 sm:p-4 shadow-md">
        <div className="text-xs font-semibold text-emerald-200 mb-2.5 flex items-center justify-between">
          <span>Weekly Streak Tracker (ہفتہ وار جائزہ)</span>
          <span className="text-[11px] text-emerald-400">
            {weekStats.daysActive} دن تلاوت کی
          </span>
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center bg-[#05130b]/80 border border-emerald-900/70 rounded-xl p-2 sm:p-3">
          {weekDays.map((item) => (
            <div key={item.date} className="flex flex-col items-center">
              {/* Day Label */}
              <span
                className={`text-[10px] sm:text-xs font-semibold mb-1 select-none ${
                  item.isToday
                    ? "text-emerald-400 font-bold"
                    : "text-emerald-300/70"
                }`}
              >
                {item.dayLabel}
              </span>

              {/* Diamond indicator */}
              <div className="my-1">
                {item.hasRecited ? (
                  <div className="w-6 h-6 sm:w-8 sm:h-8 rotate-45 rounded-[3px] bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-[0_0_10px_rgba(16,185,129,0.5)] flex items-center justify-center">
                    <span className="-rotate-45 text-white text-[10px] sm:text-xs font-black">
                      ✓
                    </span>
                  </div>
                ) : item.isPast ? (
                  <div className="w-6 h-6 sm:w-8 sm:h-8 rotate-45 rounded-[3px] border border-emerald-900/90 bg-[#06150d] flex items-center justify-center opacity-65">
                    <span className="-rotate-45 text-emerald-600 text-[10px] sm:text-xs">
                      ☹
                    </span>
                  </div>
                ) : item.isToday ? (
                  <div className="w-6 h-6 sm:w-8 sm:h-8 rotate-45 rounded-[3px] border-2 border-emerald-400 bg-emerald-950/60 shadow-[0_0_10px_rgba(52,211,153,0.4)] animate-pulse flex items-center justify-center">
                    <span className="-rotate-45 text-emerald-300 text-[9px] font-bold">
                      ⏳
                    </span>
                  </div>
                ) : (
                  <div className="w-6 h-6 sm:w-8 sm:h-8 rotate-45 rounded-[3px] border border-emerald-800/40 bg-transparent opacity-40" />
                )}
              </div>

              {/* Day Number */}
              <span className="text-[10px] text-emerald-400/80 font-mono mt-1">
                {item.dayNumber}
              </span>

              {/* Time spent badge */}
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
      <div className="space-y-3">
        <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2 px-1">
          <span>📋</span>
          <span>روزانہ کی تفصیلی رپورٹ (Day by Day Details)</span>
        </h2>

        <div className="space-y-2.5">
          {weekDays.map((d) => {
            return (
              <div
                key={d.date}
                className={`rounded-2xl p-3.5 sm:p-4 border transition-all ${
                  d.isToday
                    ? "bg-[#0c2419]/95 border-emerald-400/60 shadow-[0_0_20px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/30"
                    : d.hasRecited
                    ? "bg-[#091a13]/90 border-emerald-800/60 shadow-sm"
                    : "bg-[#05110a]/70 border-emerald-950/70 opacity-80"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  {/* Day Info */}
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        d.hasRecited
                          ? "bg-emerald-500/20 border border-emerald-400/60 text-emerald-300 font-bold"
                          : d.isPast
                          ? "bg-rose-950/30 border border-rose-900/40 text-rose-400"
                          : "bg-emerald-950/40 border border-emerald-900/40 text-emerald-600"
                      }`}
                    >
                      {d.hasRecited ? (
                        <span className="text-emerald-300 font-black text-sm">✓</span>
                      ) : d.isPast ? (
                        <span className="text-rose-400 text-sm">☹</span>
                      ) : (
                        <span className="text-emerald-500 text-xs">⏳</span>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm sm:text-base font-bold text-white">
                          {d.fullDayName} ({d.urduDayName})
                        </span>
                        {d.isToday && (
                          <span className="bg-emerald-500 text-emerald-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                            آج (Today)
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-emerald-300/70 font-mono">
                        {d.date}
                      </span>
                    </div>
                  </div>

                  {/* Recitation Metrics / Status */}
                  <div className="flex items-center gap-3 sm:gap-4 text-xs">
                    {/* Time Spent */}
                    <div className="bg-[#030e07] border border-emerald-900/60 rounded-xl px-2.5 py-1.5 text-center min-w-[70px]">
                      <span className="text-[10px] text-emerald-400/70 block">
                        صرف کیا گیا وقت
                      </span>
                      <span className="font-bold text-white font-mono block">
                        {d.hasRecited ? formatTimeSpent(d.timeSpentSeconds) : "0 min"}
                      </span>
                    </div>

                    {/* Words & Mistakes */}
                    <div className="bg-[#030e07] border border-emerald-900/60 rounded-xl px-2.5 py-1.5 text-center min-w-[70px]">
                      <span className="text-[10px] text-emerald-400/70 block">
                        پڑھے گئے الفاظ
                      </span>
                      <span className="font-bold text-emerald-200 font-mono block">
                        {d.wordsRevealed}
                      </span>
                    </div>

                    {/* Recited / Missed Status Pill */}
                    <div className="min-w-[80px] text-right sm:text-center">
                      {d.hasRecited ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-950 border border-emerald-500/60 text-emerald-300 text-[11px] font-semibold px-2.5 py-1 rounded-full">
                          <span>✓</span>
                          <span>تلاوت کی گئی</span>
                        </span>
                      ) : d.isPast ? (
                        <span className="inline-flex items-center gap-1 bg-rose-950/50 border border-rose-800/50 text-rose-300 text-[11px] font-semibold px-2.5 py-1 rounded-full">
                          <span>✕</span>
                          <span>نہیں پڑھی</span>
                        </span>
                      ) : d.isToday ? (
                        <Link
                          href="/surahs"
                          className="inline-flex items-center gap-1 bg-amber-950 border border-amber-600/60 text-amber-300 hover:text-amber-100 text-[11px] font-bold px-2.5 py-1 rounded-full hover:scale-105 transition-all"
                        >
                          <span>▶</span>
                          <span>ابھی پڑھیں</span>
                        </Link>
                      ) : (
                        <span className="text-[11px] text-emerald-700 select-none">
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
                      پڑھی گئی سورتیں:
                    </span>
                    {d.surahs.map((s) => (
                      <Link
                        key={s.number}
                        href={`/recite/${s.number}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#06150e] hover:bg-[#0c2418] border border-emerald-700/60 hover:border-emerald-500 text-emerald-200 text-xs font-semibold transition-all"
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
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950/80 via-[#0a2318]/90 to-emerald-950/80 border border-emerald-700/40 p-4 text-center space-y-1.5 shadow-md">
        <span className="text-xl">✨</span>
        <p className="font-quran text-emerald-100 text-sm sm:text-base leading-relaxed" dir="rtl">
          &quot;أَحَبُّ الْأَعْمَالِ إِلَى اللَّهِ أَدْوَمُهَا وَإِنْ قَلَّ&quot;
        </p>
        <p className="text-xs text-emerald-300/80">
          (صحیح بخاری — اللہ تعالیٰ کو سب سے پسندیدہ عمل وہ ہے جو مستقل کیا جائے، اگرچہ تھوڑا ہی کیوں نہ ہو)
        </p>
        <p className="text-[11px] text-emerald-400/70 mt-1">
          روزانہ کم از کم چند آیات پڑھنے کی عادت بنائیں تاکہ آپ کا تسلسل اور ثواب قائم رہے!
        </p>
      </div>
    </div>
  );
}
