"use client";

import React, { useEffect, useRef, useState } from "react";
import { db, type DailyActivity } from "@/lib/storage/db";
import { getLocalDateString } from "./streak";

export type StreakMode = "recite" | "read16" | "translation" | "tajweed";

export const STREAK_THRESHOLDS: Record<StreakMode, number> = {
  recite: 60, // 1 minute (60 seconds)
  read16: 30, // 30 seconds
  translation: 30, // 30 seconds
  tajweed: 30, // 30 seconds
};

export const STREAK_LABELS: Record<StreakMode, string> = {
  recite: "Recitation (تلاوت)",
  read16: "16-Line Quran (16 سطر قرآن)",
  translation: "Quran Translation (ترجمہ)",
  tajweed: "Color Tajweed (تجوید)",
};

/**
 * Records reading/recitation active seconds into both IndexedDB and localStorage (offline + online).
 * If the threshold for this mode is reached, marks today's streak as credited!
 */
export async function recordStreakProgress(
  mode: StreakMode,
  secondsSpent: number,
  surahNumber?: number
): Promise<{ streakAchievedToday: boolean; isNewlyAchieved: boolean; totalSecondsToday: number }> {
  if (typeof window === "undefined" || secondsSpent <= 0) {
    return { streakAchievedToday: false, isNewlyAchieved: false, totalSecondsToday: 0 };
  }

  const today = getLocalDateString();
  const threshold = STREAK_THRESHOLDS[mode];

  // 1. Get or initialize today's activity
  let current: DailyActivity = {
    date: today,
    wordsRevealed: 0,
    mistakes: 0,
    sessions: 1,
    timeSpentSeconds: 0,
    surahsPracticed: surahNumber ? [surahNumber] : [],
  };

  try {
    const dbRow = await db.activity.get(today);
    if (dbRow) {
      current = {
        ...dbRow,
        timeSpentSeconds: dbRow.timeSpentSeconds ?? 0,
        surahsPracticed: dbRow.surahsPracticed ?? [],
      };
    }
  } catch (err) {
    console.warn("IndexedDB read error, using local fallback:", err);
  }

  // Check localStorage backup as well
  try {
    const rawLocal = localStorage.getItem(`tilawat_act_${today}`);
    if (rawLocal) {
      const parsedLocal = JSON.parse(rawLocal);
      if (parsedLocal && typeof parsedLocal === "object") {
        current.timeSpentSeconds = Math.max(current.timeSpentSeconds || 0, parsedLocal.timeSpentSeconds || 0);
        current.wordsRevealed = Math.max(current.wordsRevealed || 0, parsedLocal.wordsRevealed || 0);
        if (Array.isArray(parsedLocal.surahsPracticed)) {
          current.surahsPracticed = Array.from(
            new Set([...(current.surahsPracticed || []), ...parsedLocal.surahsPracticed])
          );
        }
      }
    }
  } catch {}

  const previousSeconds = current.timeSpentSeconds || 0;
  const newTotalSeconds = previousSeconds + secondsSpent;

  // Track session seconds for this specific mode today in localStorage
  const modeKey = `tilawat_streak_mode_sec_${today}_${mode}`;
  let modeTotalSec = 0;
  try {
    const rawMode = localStorage.getItem(modeKey);
    modeTotalSec = (rawMode ? parseInt(rawMode, 10) : 0) + secondsSpent;
    localStorage.setItem(modeKey, String(modeTotalSec));
  } catch {
    modeTotalSec = newTotalSeconds;
  }

  const alreadyCredited = (current.timeSpentSeconds || 0) >= threshold || (modeTotalSec - secondsSpent) >= threshold;
  const nowCredited = modeTotalSec >= threshold || newTotalSeconds >= threshold;
  const isNewlyAchieved = !alreadyCredited && nowCredited;

  // Update surahsPracticed
  const updatedSurahs = surahNumber
    ? Array.from(new Set([...(current.surahsPracticed || []), surahNumber]))
    : (current.surahsPracticed || []);

  const updatedActivity: DailyActivity = {
    date: today,
    // Ensure wordsRevealed is positive so streak & activity calculations always register today as active
    wordsRevealed: Math.max(current.wordsRevealed || 0, nowCredited ? 30 : 10),
    mistakes: current.mistakes || 0,
    sessions: Math.max(current.sessions || 1, 1),
    timeSpentSeconds: newTotalSeconds,
    surahsPracticed: updatedSurahs,
  };

  // Save to IndexedDB (Offline & Online)
  try {
    await db.activity.put(updatedActivity);
  } catch (err) {
    console.error("Failed to write activity to IndexedDB:", err);
  }

  // Save to localStorage backup (100% Offline resilient)
  try {
    localStorage.setItem(`tilawat_act_${today}`, JSON.stringify(updatedActivity));
    // Add to tilawat_streak_dates
    const rawDates = localStorage.getItem("tilawat_streak_dates");
    const dates: string[] = rawDates ? JSON.parse(rawDates) : [];
    if (!dates.includes(today)) {
      dates.push(today);
      localStorage.setItem("tilawat_streak_dates", JSON.stringify(dates));
    }
  } catch {}

  // If newly achieved, dispatch custom event
  if (isNewlyAchieved) {
    try {
      window.dispatchEvent(
        new CustomEvent("tilawat_streak_achieved", {
          detail: {
            date: today,
            mode,
            threshold,
            totalSeconds: newTotalSeconds,
          },
        })
      );
    } catch {}
  }

  return {
    streakAchievedToday: nowCredited,
    isNewlyAchieved,
    totalSecondsToday: newTotalSeconds,
  };
}

/**
 * Loads all daily activities with full offline localStorage fallback & synchronization.
 */
export async function getAllDailyActivities(): Promise<DailyActivity[]> {
  const map = new Map<string, DailyActivity>();

  // 1. Load from Dexie IndexedDB
  try {
    const list = await db.activity.toArray();
    for (const a of list) {
      if (a && a.date) map.set(a.date, a);
    }
  } catch (e) {
    console.warn("Could not load from db.activity:", e);
  }

  // 2. Load and merge from localStorage
  if (typeof window !== "undefined") {
    try {
      const rawDates = localStorage.getItem("tilawat_streak_dates");
      if (rawDates) {
        const dates: string[] = JSON.parse(rawDates);
        for (const d of dates) {
          if (!map.has(d)) {
            let actFromLocal: DailyActivity | null = null;
            try {
              const rawA = localStorage.getItem(`tilawat_act_${d}`);
              if (rawA) actFromLocal = JSON.parse(rawA);
            } catch {}

            const fallbackAct: DailyActivity = actFromLocal || {
              date: d,
              wordsRevealed: 30,
              mistakes: 0,
              sessions: 1,
              timeSpentSeconds: 60,
              surahsPracticed: [1],
            };
            map.set(d, fallbackAct);

            // Also sync back to Dexie if missing
            try {
              void db.activity.put(fallbackAct);
            } catch {}
          }
        }
      }
    } catch {}
  }

  return Array.from(map.values());
}

/**
 * React hook to automatically track active time on Recite, 16-Line Quran, Translation, and Tajweed pages.
 */
export function useStreakTracker({
  mode,
  surahNumber,
  enabled = true,
}: {
  mode: StreakMode;
  surahNumber?: number;
  enabled?: boolean;
}) {
  const [secondsOnPage, setSecondsOnPage] = useState(0);
  const [streakUnlocked, setStreakUnlocked] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const threshold = STREAK_THRESHOLDS[mode];
  const bufferRef = useRef(0);
  const alreadyCelebrated = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    // Check if already credited for today
    if (typeof window !== "undefined") {
      const today = getLocalDateString();
      const rawMode = localStorage.getItem(`tilawat_streak_mode_sec_${today}_${mode}`);
      if (rawMode && parseInt(rawMode, 10) >= threshold) {
        setStreakUnlocked(true);
      }
    }

    const flush = async () => {
      if (bufferRef.current <= 0) return;
      const toFlush = bufferRef.current;
      bufferRef.current = 0;
      const res = await recordStreakProgress(mode, toFlush, surahNumber);
      if (res.streakAchievedToday) {
        setStreakUnlocked(true);
      }
      if (res.isNewlyAchieved && !alreadyCelebrated.current) {
        alreadyCelebrated.current = true;
        setShowToast(true);
        setTimeout(() => setShowToast(false), 4500);
      }
    };

    const timer = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        bufferRef.current += 1;
        setSecondsOnPage((s) => {
          const next = s + 1;
          if (next >= threshold && !alreadyCelebrated.current) {
            alreadyCelebrated.current = true;
            setShowToast(true);
            setTimeout(() => setShowToast(false), 4500);
          }
          return next;
        });

        // Flush to storage every 4-5 seconds
        if (bufferRef.current >= 4) {
          void flush();
        }
      }
    }, 1000);

    const handleBeforeUnload = () => {
      void flush();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      clearInterval(timer);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      void flush();
    };
  }, [mode, surahNumber, enabled, threshold]);

  return {
    secondsOnPage,
    threshold,
    streakUnlocked,
    showToast,
    dismissToast: () => setShowToast(false),
  };
}

/**
 * Toast banner that pops up smoothly when the daily streak is unlocked.
 */
export function StreakNotificationToast({
  show,
  mode,
  onClose,
}: {
  show: boolean;
  mode: StreakMode;
  onClose?: () => void;
}) {
  if (!show) return null;
  const label = STREAK_LABELS[mode];
  return (
    <div className="fixed top-4 right-4 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="bg-gradient-to-r from-[#143323] via-[#1a442f] to-[#143323] border border-amber-400/40 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 max-w-sm backdrop-blur-md">
        <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-xl shrink-0">
          🔥
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-amber-300 flex items-center gap-1">
            <span>1 Day Streak Credited!</span>
            <span>✓</span>
          </div>
          <div className="text-[11px] text-emerald-100/90 leading-tight">
            ما شاء اللہ! {label} پر وقت گزارنے پر آج کی سٹریک شمار ہو گئی ہے۔
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-emerald-200/70 hover:text-white text-xs p-1 cursor-pointer"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
