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
    <div className="max-w-4xl mx-auto space-y-4 pb-20 px-2 sm:px-4 pt-1 sm:pt-3">
      {/* Top Header & Navigation Bar matching Streak page */}
      <div className="flex items-center justify-between border-b border-[#ede7d8] pb-3 px-1">
        <button
          onClick={handleBack}
          className="inline-flex items-center justify-center px-4 py-1.5 rounded-xl text-xs sm:text-sm font-semibold tracking-wide text-[#193d2b] bg-white hover:bg-[#efe9d8] active:bg-[#e4dcce] border border-[#d6cbaf] shadow-xs active:scale-95 transition-all duration-200 cursor-pointer min-w-[76px]"
        >
          Back
        </button>

        <h1 className="text-xl sm:text-2xl font-bold text-[#143323] tracking-tight">
          Habit Tracker
        </h1>

        <Link
          href="/"
          className="inline-flex items-center justify-center px-4 py-1.5 rounded-xl text-xs sm:text-sm font-semibold tracking-wide text-[#193d2b] bg-white hover:bg-[#efe9d8] active:bg-[#e4dcce] border border-[#d6cbaf] shadow-xs active:scale-95 transition-all duration-200 cursor-pointer min-w-[76px]"
        >
          Dashboard
        </Link>
      </div>

      {/* Main Habit Tracker Component */}
      <HabitTracker />
    </div>
  );
}
