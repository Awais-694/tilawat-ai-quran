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
          {/* Circular Glowing Blue Flame Badge */}
          <div className="relative flex items-center justify-center shrink-0">
            {/* Ambient cyan-blue aura */}
            <div className="absolute -inset-1.5 rounded-full bg-gradient-to-tr from-blue-500/35 via-sky-400/25 to-blue-600/30 blur-[7px] group-hover:blur-[10px] transition-all opacity-90" />
            
            {/* Outer Luxury Ocean/Sapphire Ring */}
            <div className="relative w-12 h-12 rounded-full p-[2px] bg-gradient-to-b from-sky-400 via-blue-500 to-indigo-600 shadow-[0_3px_12px_rgba(2,132,199,0.25)] group-hover:scale-105 transition-all duration-300">
              {/* Inner Clean Disc */}
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden p-1.5 shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.9)]">
                <img
                  src="/icons/streak-flame.png?v=2"
                  alt="Daily Streak Flame"
                  className="w-full h-full object-contain drop-shadow-[0_2px_6px_rgba(2,132,199,0.3)] transition-transform duration-300 group-hover:scale-110"
                />
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

        {/* Right: Unmistakable Weekly Report Button */}
        <div className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-700 via-emerald-800 to-teal-800 group-hover:from-emerald-800 group-hover:to-teal-900 shadow-md group-hover:shadow-lg active:scale-95 transition-all shrink-0 cursor-pointer">
          <svg className="w-3.5 h-3.5 text-emerald-200" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
          <span>Weekly Report</span>
          <svg className="w-3 h-3 text-emerald-200 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
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
