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
      className="block group relative overflow-hidden rounded-2xl bg-[#0a2016]/95 hover:bg-[#0c241a] border border-emerald-700/60 hover:border-emerald-500/80 p-4 transition-all duration-200 shadow-md hover:shadow-emerald-950/50 cursor-pointer"
      title="View weekly streak details"
    >
      {/* Top Header: Flame Badge, Streak Number, and View Details Button */}
      <div className="flex items-center justify-between gap-3">
        {/* Left: Flame Icon + Beautiful Display Typography */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 via-amber-500/10 to-transparent border border-amber-500/30 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.15)] group-hover:scale-105 transition-transform">
            <svg
              className="w-6 h-6 text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 2c.5 2.5 2 4.5 4 6 2.5 1.9 3.5 4.3 3.5 7 0 4.14-3.36 7.5-7.5 7.5S4.5 19.14 4.5 15c0-3.3 2-6.2 4-8.5.3 1.2 1 2.2 2 2.8 0-3.5 1-6.5 1.5-7.3z" />
            </svg>
          </div>

          <div className="space-y-0.5">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight leading-none">
                {streak}
              </span>
              <span className="font-display text-base font-semibold text-emerald-100 tracking-tight leading-none">
                {streak === 1 ? "Day Streak" : "Days Streak"}
              </span>
            </div>
            <div className="text-xs text-emerald-400/80 font-medium">
              Personal Best: <span className="font-semibold text-white">{longestStreak} {longestStreak === 1 ? "day" : "days"}</span>
            </div>
          </div>
        </div>

        {/* Right: Clean View Details Pill Button */}
        <div className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-semibold text-emerald-200 bg-emerald-950/80 border border-emerald-700/60 group-hover:bg-emerald-900 group-hover:border-emerald-400 group-hover:text-white transition-all shrink-0 shadow-sm">
          <span>Weekly Report</span>
        </div>
      </div>

      {/* 7-Day Clean Habit Tracker Row */}
      <div className="mt-3.5 pt-3 border-t border-emerald-900/50">
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {days.map((item) => {
            return (
              <div
                key={item.date}
                className="flex flex-col items-center justify-center text-center"
              >
                {/* Day Label (e.g. Mon, Tue) */}
                <span
                  className={`text-[10px] sm:text-[11px] font-medium mb-1.5 select-none ${
                    item.isToday
                      ? "text-amber-300 font-bold"
                      : "text-emerald-300/70"
                  }`}
                >
                  {item.dayLabel}
                </span>

                {/* Day Status Icon */}
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all">
                  {item.hasRecited ? (
                    // Recited: Crisp emerald circle with white checkmark
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm shadow-emerald-500/40">
                      <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  ) : item.isToday ? (
                    // Today pending: Subtle active border with a soft dot
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-amber-400/90 bg-amber-500/10 flex items-center justify-center">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    </div>
                  ) : item.isPast ? (
                    // Past missed day: Minimal muted circle with a faint neutral dot
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-950/40 border border-emerald-900/40 flex items-center justify-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-800/60" />
                    </div>
                  ) : (
                    // Future day: Empty subtle outline
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-emerald-900/30 bg-transparent" />
                  )}
                </div>

                {/* Today indicator label */}
                <span
                  className={`text-[10px] font-semibold mt-1 select-none ${
                    item.isToday ? "text-amber-300" : "text-transparent"
                  }`}
                >
                  {item.isToday ? "Today" : "·"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </Link>
  );
}
