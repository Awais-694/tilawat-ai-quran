'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import HabitTracker from '@/components/todo/HabitTracker';

export function HabitTrackerClient() {
  const router = useRouter();

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/streak');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-20 px-2 sm:px-4">
      {/* Top Header & Navigation Bar */}
      <div className="flex items-center justify-between border-b border-[#ede7d8] pb-3 px-1 pt-2">
        <button
          onClick={handleBack}
          className="inline-flex items-center justify-center px-4 py-1.5 rounded-xl text-xs sm:text-sm font-semibold tracking-wide text-[#193d2b] bg-white hover:bg-[#efe9d8] active:bg-[#e4dcce] border border-[#d6cbaf] shadow-xs active:scale-95 transition-all duration-200 cursor-pointer min-w-[72px]"
        >
          ← Back
        </button>

        <div className="text-center">
          <h1 className="text-lg sm:text-2xl font-bold text-[#143323] tracking-tight">
            Habit Tracker
          </h1>
          <p className="text-[11px] sm:text-xs text-[#527060] font-medium hidden xs:block">
            Track 31-day habits, monthly goals & daily notes
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <Link
            href="/todo"
            className="inline-flex items-center justify-center px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-[#193d2b] bg-white hover:bg-[#efe9d8] active:bg-[#e4dcce] border border-[#d6cbaf] shadow-xs active:scale-95 transition-all duration-200 cursor-pointer"
            title="Go to Daily Tasks"
          >
            Planner
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-[#193d2b] bg-white hover:bg-[#efe9d8] active:bg-[#e4dcce] border border-[#d6cbaf] shadow-xs active:scale-95 transition-all duration-200 cursor-pointer"
          >
            Home
          </Link>
        </div>
      </div>

      {/* Main Habit Tracker Component */}
      <HabitTracker />
    </div>
  );
}
