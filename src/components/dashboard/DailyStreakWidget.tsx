"use client";

import Link from "next/link";
import { type DayStreakItem } from "@/lib/quran/streak";

interface DailyStreakWidgetProps {
  streak: number;
  longestStreak: number;
  days: DayStreakItem[];
}

export function DailyStreakWidget({
  streak,
  longestStreak,
  days,
}: DailyStreakWidgetProps) {
  return (
    <Link
      href="/streak"
      className="block group relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#0c1e15]/95 via-[#07160f]/95 to-[#040e09]/95 border border-emerald-500/40 hover:border-emerald-400/80 p-3 sm:p-4.5 shadow-[0_10px_35px_rgba(0,0,0,0.5)] hover:shadow-[0_14px_45px_rgba(16,185,129,0.25)] backdrop-blur-md transition-all duration-300 cursor-pointer"
      title="پورے ہفتے کی اسٹریک اور تلاوت کی تفصیلات دیکھیں"
    >
      {/* Subtle top luminous accent line */}
      <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent group-hover:via-emerald-300 transition-all" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        {/* Left Side: Flame Icon & Streak Numbers */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Flame Icon with Circular Progress Ring */}
          <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center bg-gradient-to-br from-emerald-950 via-[#0d281a] to-[#06140d] border border-emerald-500/50 shadow-[0_0_18px_rgba(16,185,129,0.25)] group-hover:scale-105 group-hover:shadow-[0_0_24px_rgba(245,158,11,0.35)] transition-all">
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 44 44">
              <circle
                cx="22"
                cy="22"
                r="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="text-emerald-950"
              />
              <circle
                cx="22"
                cy="22"
                r="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeDasharray="113"
                strokeDashoffset={streak > 0 ? Math.max(10, 113 - (streak / Math.max(7, longestStreak || 7)) * 113) : 113}
                strokeLinecap="round"
                className="text-amber-400 transition-all duration-700"
              />
            </svg>
            <span className="text-xl sm:text-2xl filter drop-shadow-[0_0_8px_rgba(245,158,11,0.6)] animate-pulse select-none">
              🔥
            </span>
          </div>

          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-white tracking-tight font-mono">
                {streak}
              </span>
              <span className="text-sm sm:text-base font-bold text-emerald-200">
                {streak === 1 ? "Day" : "Days"}
              </span>
              <span className="text-xs text-amber-300 font-semibold ml-1">
                Streak
              </span>
            </div>
            <div className="text-[11px] sm:text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
              <span>Longest Streak {longestStreak} {longestStreak === 1 ? "Day" : "Days"}</span>
              <span className="text-emerald-700 select-none">•</span>
              <span className="text-emerald-300/80 group-hover:text-emerald-200 underline underline-offset-2">
                تفصیلات دیکھیں →
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: 7-Day Visual Diamonds matching screenshot */}
        <div className="bg-[#05130b]/90 border border-emerald-900/70 rounded-xl sm:rounded-2xl px-2.5 sm:px-3.5 py-2 sm:py-2.5 shadow-inner flex items-center justify-between sm:justify-around gap-1.5 sm:gap-2.5 overflow-x-auto">
          {days.map((item) => {
            return (
              <div
                key={item.date}
                className="flex flex-col items-center min-w-[32px] sm:min-w-[38px] text-center"
              >
                {/* Day Name Label (e.g. Mon) */}
                <span
                  className={`text-[10px] sm:text-[11px] font-semibold mb-1.5 select-none ${
                    item.isToday
                      ? "text-emerald-400 font-bold"
                      : "text-emerald-300/70"
                  }`}
                >
                  {item.dayLabel}
                </span>

                {/* Status Diamond */}
                <div className="relative flex items-center justify-center my-0.5">
                  {item.hasRecited ? (
                    // Recited: Filled vibrant emerald diamond with checkmark ✓
                    <div className="w-6 h-6 sm:w-7 sm:h-7 rotate-45 rounded-[3px] bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-[0_0_12px_rgba(16,185,129,0.6)] flex items-center justify-center group-hover:scale-110 transition-transform">
                      <span className="-rotate-45 text-white text-[10px] sm:text-xs font-black select-none">
                        ✓
                      </span>
                    </div>
                  ) : item.isPast ? (
                    // Missed in past: Dark diamond with sad face ☹
                    <div className="w-6 h-6 sm:w-7 sm:h-7 rotate-45 rounded-[3px] border border-emerald-900/90 bg-[#06150d] flex items-center justify-center opacity-70">
                      <span className="-rotate-45 text-emerald-600 text-[10px] sm:text-xs select-none">
                        ☹
                      </span>
                    </div>
                  ) : item.isToday ? (
                    // Today pending: Active glowing diamond border
                    <div className="w-6 h-6 sm:w-7 sm:h-7 rotate-45 rounded-[3px] border-2 border-emerald-400 bg-emerald-950/60 shadow-[0_0_12px_rgba(52,211,153,0.4)] animate-pulse flex items-center justify-center">
                      <span className="-rotate-45 text-emerald-300 text-[9px] font-bold select-none">
                        ⏳
                      </span>
                    </div>
                  ) : (
                    // Future day: Empty outline diamond
                    <div className="w-6 h-6 sm:w-7 sm:h-7 rotate-45 rounded-[3px] border border-emerald-800/40 bg-transparent opacity-40" />
                  )}
                </div>

                {/* Active Indicator Arrow ▲ underneath Today */}
                <div className="h-2.5 flex items-center justify-center mt-0.5">
                  {item.isToday && (
                    <span className="text-emerald-400 text-[8px] font-black leading-none select-none drop-shadow-[0_0_4px_rgba(52,211,153,0.8)]">
                      ▲
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Link>
  );
}
