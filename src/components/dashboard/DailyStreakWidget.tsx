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
      className="block group relative overflow-hidden rounded-2xl bg-[#ffffff] hover:bg-[#fbf9f4] border border-[#e2d9c5] hover:border-[#c5a059] p-4 transition-all duration-200 shadow-[0_2px_10px_rgba(20,50,30,0.04)] cursor-pointer"
      title="View weekly streak details"
    >
      {/* Top Header: Flame Badge, Streak Number, and View Details Button */}
      <div className="flex items-center justify-between gap-3">
        {/* Left: Flame Icon + Beautiful Display Typography */}
        <div className="flex items-center gap-3.5">
          {/* Circular Glowing Flame Badge */}
          <div className="relative flex items-center justify-center shrink-0">
            {/* Ambient warm glow */}
            <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-amber-400/25 via-amber-300/15 to-orange-400/20 blur-[5px] group-hover:blur-[8px] transition-all opacity-80" />
            
            {/* Outer Ring & Circular Core */}
            <div className="relative w-12 h-12 rounded-full p-0.5 bg-gradient-to-b from-[#fcd34d] via-[#f59e0b] to-[#d97706] shadow-[0_2px_8px_rgba(245,158,11,0.22)] group-hover:scale-105 transition-all duration-300">
              <div className="w-full h-full rounded-full bg-gradient-to-b from-[#fffef7] via-[#fffbeb] to-[#fef3c7] flex items-center justify-center shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.95)]">
                <svg
                  className="w-6 h-6 drop-shadow-[0_2px_4px_rgba(217,119,6,0.3)] transition-transform duration-300 group-hover:scale-110"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <defs>
                    <linearGradient id="widgetFlameGrad" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#f59e0b" />
                      <stop offset="60%" stopColor="#d97706" />
                      <stop offset="100%" stopColor="#b45309" />
                    </linearGradient>
                    <linearGradient id="widgetFlameInner" x1="12" y1="10" x2="12" y2="21" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#fef08a" />
                      <stop offset="100%" stopColor="#f59e0b" />
                    </linearGradient>
                  </defs>
                  {/* Outer vibrant flame */}
                  <path
                    d="M12 2c.5 2.5 2 4.5 4 6 2.5 1.9 3.5 4.3 3.5 7 0 4.14-3.36 7.5-7.5 7.5S4.5 19.14 4.5 15c0-3.3 2-6.2 4-8.5.3 1.2 1 2.2 2 2.8 0-3.5 1-6.5 1.5-7.3z"
                    fill="url(#widgetFlameGrad)"
                  />
                  {/* Inner golden core */}
                  <path
                    d="M12 10.5c.3 1.1 1.1 2 2 2.7 1.1.9 1.6 2 1.6 3.2 0 2-1.6 3.6-3.6 3.6s-3.6-1.6-3.6-3.6c0-1.5.9-2.9 1.8-3.9.2.5.5 1 .9 1.2 0-1.5.4-2.7.9-3.2z"
                    fill="url(#widgetFlameInner)"
                    opacity="0.95"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="space-y-0.5">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-2xl sm:text-3xl font-bold text-[#112a1d] tracking-tight leading-none">
                {streak}
              </span>
              <span className="font-display text-base font-semibold text-[#25523b] tracking-tight leading-none">
                {streak === 1 ? "Day Streak" : "Days Streak"}
              </span>
            </div>
            <div className="text-xs text-[#527060] font-medium">
              Personal Best: <span className="font-semibold text-[#112a1d]">{longestStreak} {longestStreak === 1 ? "day" : "days"}</span>
            </div>
          </div>
        </div>

        {/* Right: Clean View Details Pill Button */}
        <div className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#1e402e] bg-[#f0ebd9]/90 border border-[#ded5c0] group-hover:bg-[#e4dcce] group-hover:text-black transition-all shrink-0 shadow-sm">
          <span>Weekly Report</span>
        </div>
      </div>

      {/* 7-Day Clean Habit Tracker Row */}
      <div className="mt-3.5 pt-3 border-t border-[#ede7d8]">
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
                      ? "text-amber-700 font-bold"
                      : "text-[#527060]"
                  }`}
                >
                  {item.dayLabel}
                </span>

                {/* Day Status Icon */}
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all">
                  {item.hasRecited ? (
                    // Recited: Crisp emerald circle with white checkmark
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                      <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  ) : item.isToday ? (
                    // Today pending: Subtle active border with a soft dot
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-amber-500 bg-amber-50 flex items-center justify-center">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    </div>
                  ) : item.isPast ? (
                    // Past missed day: Minimal muted circle with a faint neutral dot
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#f1ecdf] border border-[#ded5c0] flex items-center justify-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#b8ad91]" />
                    </div>
                  ) : (
                    // Future day: Empty subtle outline
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-[#e5ded0] bg-transparent" />
                  )}
                </div>

                {/* Today indicator label */}
                <span
                  className={`text-[10px] font-semibold mt-1 select-none ${
                    item.isToday ? "text-amber-700" : "text-transparent"
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
