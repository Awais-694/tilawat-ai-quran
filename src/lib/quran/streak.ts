import { getSurahMeta } from "./data";
import type { DailyActivity } from "@/lib/storage/db";

export function getLocalDateString(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function calcCurrentStreak(activeDates: string[]): number {
  const set = new Set(activeDates);
  let streak = 0;
  const d = new Date();
  const todayStr = getLocalDateString(d);
  if (!set.has(todayStr)) {
    d.setDate(d.getDate() - 1);
  }
  while (set.has(getLocalDateString(d))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export function calcLongestStreak(activeDates: string[]): number {
  if (!activeDates || activeDates.length === 0) return 0;
  const uniqueDates = Array.from(new Set(activeDates)).sort();
  let maxStreak = 0;
  let currentStreak = 0;
  let prevTime: number | null = null;

  for (const dateStr of uniqueDates) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    const time = dateObj.getTime();

    if (prevTime === null) {
      currentStreak = 1;
    } else {
      const diffDays = Math.round((time - prevTime) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        currentStreak++;
      } else if (diffDays > 1) {
        currentStreak = 1;
      }
    }
    prevTime = time;
    if (currentStreak > maxStreak) maxStreak = currentStreak;
  }
  return maxStreak;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const FULL_DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const URDU_DAY_NAMES = ["اتوار", "پیر", "منگل", "بدھ", "جمعرات", "جمعہ", "ہفتہ"];

export interface DayStreakItem {
  date: string;
  dayLabel: string; // e.g. "Mon"
  fullDayName: string; // "Monday"
  urduDayName: string; // "پیر"
  dayNumber: number; // 19
  isPast: boolean;
  isToday: boolean;
  isFuture: boolean;
  hasRecited: boolean;
  wordsRevealed: number;
  timeSpentSeconds: number;
  mistakes: number;
  sessions: number;
  surahs: Array<{ number: number; name: string; arabicName: string }>;
}

/**
 * Returns a 7-day rolling window centered around today:
 * 3 days past, today (with indicator), 3 days future.
 * Matches the user's UI screenshot (Fri Sat Sun Mon Tue Wed Thu when today is Monday).
 */
export function getRolling7Days(
  activityMap: Map<string, DailyActivity>,
  refDate: Date = new Date(),
  completedProgressMap?: Map<number, { completed: boolean; completedAt?: number }>
): DayStreakItem[] {
  const todayStr = getLocalDateString(refDate);
  const items: DayStreakItem[] = [];

  for (let offset = -3; offset <= 3; offset++) {
    const d = new Date(refDate);
    d.setDate(refDate.getDate() + offset);
    const dateStr = getLocalDateString(d);
    const isToday = dateStr === todayStr;
    const isPast = offset < 0;
    const isFuture = offset > 0;

    const act = activityMap.get(dateStr);
    const words = act?.wordsRevealed ?? 0;
    const timeInSec = act?.timeSpentSeconds ?? 0;
    const surahNumbers = act?.surahsPracticed ?? [];
    const hasRecited = words > 0 || timeInSec > 0 || surahNumbers.length > 0;
    // Ensure realistic time floor (average recitation is ~45-50 words/min = 1.3s/word)
    const minEstimatedTime = words > 0 ? Math.max(60, Math.round(words * 1.3)) : 0;
    const timeSpent = Math.max(timeInSec, minEstimatedTime);

    // ONLY include Surahs that were FULLY completed!
    const completedNums: number[] = [];

    // A. Direct record from act.surahsCompleted
    if (act?.surahsCompleted && act.surahsCompleted.length > 0) {
      for (const n of act.surahsCompleted) {
        if (!completedNums.includes(n)) completedNums.push(n);
      }
    }

    // B. Any surah that was recited on this date AND is marked completed in db.progress
    if (surahNumbers && surahNumbers.length > 0 && completedProgressMap) {
      for (const sNum of surahNumbers) {
        const prog = completedProgressMap.get(sNum);
        if (prog && prog.completed && !completedNums.includes(sNum)) {
          completedNums.push(sNum);
        }
      }
    }

    // C. Any surah with completedAt falling on this exact date
    if (completedProgressMap) {
      for (const [sNum, prog] of completedProgressMap.entries()) {
        if (prog.completed && prog.completedAt) {
          const cDate = getLocalDateString(new Date(prog.completedAt));
          if (cDate === dateStr && !completedNums.includes(sNum)) {
            completedNums.push(sNum);
          }
        }
      }

      // D. Strictly filter OUT any surah that is NOT completed in db.progress
      for (let j = completedNums.length - 1; j >= 0; j--) {
        const prog = completedProgressMap.get(completedNums[j]);
        if (!prog || !prog.completed) {
          completedNums.splice(j, 1);
        }
      }
    }

    const surahs = completedNums
      .map((num) => {
        const meta = getSurahMeta(num);
        return meta ? { number: num, name: meta.name, arabicName: meta.arabicName } : null;
      })
      .filter((s): s is NonNullable<typeof s> => s !== null);

    const dayIdx = d.getDay();
    items.push({
      date: dateStr,
      dayLabel: DAY_LABELS[dayIdx],
      fullDayName: FULL_DAY_NAMES[dayIdx],
      urduDayName: URDU_DAY_NAMES[dayIdx],
      dayNumber: d.getDate(),
      isPast,
      isToday,
      isFuture,
      hasRecited,
      wordsRevealed: words,
      timeSpentSeconds: timeSpent,
      mistakes: act?.mistakes ?? 0,
      sessions: act?.sessions ?? (hasRecited ? 1 : 0),
      surahs,
    });
  }

  return items;
}

/**
 * Returns full Monday-to-Sunday week days for any week offset.
 */
export function getWeekDays(
  activityMap: Map<string, DailyActivity>,
  refDate: Date = new Date(),
  weekOffset: number = 0,
  completedProgressMap?: Map<number, { completed: boolean; completedAt?: number }>
): DayStreakItem[] {
  const d = new Date(refDate);
  d.setDate(d.getDate() + weekOffset * 7);
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);

  const todayStr = getLocalDateString(new Date());
  const items: DayStreakItem[] = [];

  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(monday);
    dayDate.setDate(monday.getDate() + i);
    const dateStr = getLocalDateString(dayDate);
    const isToday = dateStr === todayStr;
    const isPast = dateStr < todayStr;
    const isFuture = dateStr > todayStr;

    const act = activityMap.get(dateStr);
    const words = act?.wordsRevealed ?? 0;
    const timeInSec = act?.timeSpentSeconds ?? 0;
    const surahNumbers = act?.surahsPracticed ?? [];
    const hasRecited = words > 0 || timeInSec > 0 || surahNumbers.length > 0;
    const minEstimatedTime = words > 0 ? Math.max(60, Math.round(words * 1.3)) : 0;
    const timeSpent = Math.max(timeInSec, minEstimatedTime);

    // ONLY include Surahs that were FULLY completed!
    const completedNums: number[] = [];

    // A. Direct record from act.surahsCompleted
    if (act?.surahsCompleted && act.surahsCompleted.length > 0) {
      for (const n of act.surahsCompleted) {
        if (!completedNums.includes(n)) completedNums.push(n);
      }
    }

    // B. Any surah that was recited on this date AND is marked completed in db.progress
    if (surahNumbers && surahNumbers.length > 0 && completedProgressMap) {
      for (const sNum of surahNumbers) {
        const prog = completedProgressMap.get(sNum);
        if (prog && prog.completed && !completedNums.includes(sNum)) {
          completedNums.push(sNum);
        }
      }
    }

    // C. Any surah with completedAt falling on this exact date
    if (completedProgressMap) {
      for (const [sNum, prog] of completedProgressMap.entries()) {
        if (prog.completed && prog.completedAt) {
          const cDate = getLocalDateString(new Date(prog.completedAt));
          if (cDate === dateStr && !completedNums.includes(sNum)) {
            completedNums.push(sNum);
          }
        }
      }

      // D. Strictly filter OUT any surah that is NOT completed in db.progress
      for (let j = completedNums.length - 1; j >= 0; j--) {
        const prog = completedProgressMap.get(completedNums[j]);
        if (!prog || !prog.completed) {
          completedNums.splice(j, 1);
        }
      }
    }

    const surahs = completedNums
      .map((num) => {
        const meta = getSurahMeta(num);
        return meta ? { number: num, name: meta.name, arabicName: meta.arabicName } : null;
      })
      .filter((s): s is NonNullable<typeof s> => s !== null);

    const dayIdx = dayDate.getDay();
    items.push({
      date: dateStr,
      dayLabel: DAY_LABELS[dayIdx],
      fullDayName: FULL_DAY_NAMES[dayIdx],
      urduDayName: URDU_DAY_NAMES[dayIdx],
      dayNumber: dayDate.getDate(),
      isPast,
      isToday,
      isFuture,
      hasRecited,
      wordsRevealed: words,
      timeSpentSeconds: timeSpent,
      mistakes: act?.mistakes ?? 0,
      sessions: act?.sessions ?? (hasRecited ? 1 : 0),
      surahs,
    });
  }

  return items;
}

export function formatTimeSpent(seconds: number): string {
  if (!seconds || seconds <= 0) return "0 mins";
  const m = Math.floor(seconds / 60);
  const h = Math.floor(m / 60);
  const remM = m % 60;
  if (h > 0) {
    return remM > 0 ? `${h}h ${remM}m` : `${h} hr`;
  }
  return `${Math.max(1, m)} mins`;
}

export function formatTimeSpentUrdu(seconds: number): string {
  if (!seconds || seconds <= 0) return "۰ منٹ";
  const m = Math.floor(seconds / 60);
  const h = Math.floor(m / 60);
  const remM = m % 60;
  if (h > 0) {
    return remM > 0 ? `${h} گھنٹے ${remM} منٹ` : `${h} گھنٹہ`;
  }
  return `${Math.max(1, m)} منٹ`;
}
