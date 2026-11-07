'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';

interface HabitItem {
  id: string;
  title: string;
  checks: Record<number, boolean>; // dayNum (1..31) -> boolean
}

interface HabitTemplate {
  id: string;
  title: string;
}

interface MonthlyData {
  habits: HabitItem[];
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DEFAULT_HABITS: string[] = [
  'Fajr Prayer on time',
  'Quran Recitation (15 mins)',
  'Morning & Evening Azkar',
  'Dhuhr, Asr, Maghrib, Isha',
  'Tarjama / Tafseer Study',
  'Dua & Istighfar (100x)',
  'Physical Exercise / Walk',
  'Sleep before 11:00 PM',
];

const QUICK_HABIT_SUGGESTIONS = [
  'Surah Al-Mulk before sleep',
  'Tahajjud / Night Prayer',
  'Daily Sadaqah / Charity',
  'Ayat-ul-Kursi after Salah',
  'Durood Sharif (100x)',
  'Drink 8 glasses of water',
];

const MASTER_HABITS_KEY = 'tilawat_habit_tracker_master_list_v4';

const INITIAL_DEFAULT_HABITS: HabitItem[] = DEFAULT_HABITS.map((title, i) => ({
  id: 'def_' + i,
  title,
  checks: {},
}));

function getSavedMasterTemplates(): HabitTemplate[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const rawMaster = localStorage.getItem(MASTER_HABITS_KEY);
    if (rawMaster) {
      const parsed = JSON.parse(rawMaster);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('tilawat_habit_tracker_v4_') || key.startsWith('tilawat_habit_tracker_v3_'))) {
        const rawMonth = localStorage.getItem(key);
        if (rawMonth) {
          const parsedMonth = JSON.parse(rawMonth);
          if (parsedMonth && Array.isArray(parsedMonth.habits) && parsedMonth.habits.length > 0) {
            return parsedMonth.habits.map((h: HabitItem) => ({ id: h.id, title: h.title }));
          }
        }
      }
    }
  } catch {}
  return null;
}

function saveMasterTemplates(habitsList: HabitItem[]) {
  if (typeof window === 'undefined') return;
  try {
    const templates: HabitTemplate[] = habitsList.map((h) => ({
      id: h.id,
      title: h.title,
    }));
    localStorage.setItem(MASTER_HABITS_KEY, JSON.stringify(templates));
  } catch {}
}

export default function HabitTracker() {
  const [mounted, setMounted] = useState(false);
  const [today, setToday] = useState(() => new Date());
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth()); // 0-11
  const [habits, setHabits] = useState<HabitItem[]>(INITIAL_DEFAULT_HABITS);
  const [newHabitTitle, setNewHabitTitle] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const gridContainerRef = useRef<HTMLDivElement>(null);

  // Check if viewing current real-world month
  const isCurrentMonth = today.getFullYear() === selectedYear && today.getMonth() === selectedMonth;
  const currentDayNum = today.getDate();

  // Number of days in selected month (28, 29, 30, or 31)
  const daysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth + 1, 0).getDate();
  }, [selectedYear, selectedMonth]);

  // Array of day details: [ { day: 1, weekday: 'M' }, ... ]
  const daysArray = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => {
      const d = i + 1;
      const dateObj = new Date(selectedYear, selectedMonth, d);
      const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'narrow' });
      return { day: d, weekday };
    });
  }, [daysInMonth, selectedYear, selectedMonth]);

  const storageKey = `tilawat_habit_tracker_v4_${selectedYear}_${selectedMonth}`;
  const legacyStorageKey = `tilawat_habit_tracker_v3_${selectedYear}_${selectedMonth}`;

  // Load from localStorage on month/year change while preserving user's custom habits
  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem(storageKey) || localStorage.getItem(legacyStorageKey);
      const masterTemplates = getSavedMasterTemplates();

      if (saved) {
        const parsed: MonthlyData = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.habits) && parsed.habits.length > 0) {
          const loadedHabits = [...parsed.habits];
          if (masterTemplates) {
            const existingTitles = new Set(loadedHabits.map((h) => h.title.toLowerCase()));
            for (const tpl of masterTemplates) {
              if (!existingTitles.has(tpl.title.toLowerCase())) {
                loadedHabits.push({ id: tpl.id, title: tpl.title, checks: {} });
              }
            }
          }
          setHabits(loadedHabits);
          saveMasterTemplates(loadedHabits);
          return;
        }
      }

      if (masterTemplates && masterTemplates.length > 0) {
        const carriedHabits: HabitItem[] = masterTemplates.map((tpl) => ({
          id: tpl.id,
          title: tpl.title,
          checks: {},
        }));
        setHabits(carriedHabits);
        localStorage.setItem(storageKey, JSON.stringify({ habits: carriedHabits }));
      } else {
        setHabits(INITIAL_DEFAULT_HABITS);
        saveMasterTemplates(INITIAL_DEFAULT_HABITS);
      }
    } catch {
      setHabits(INITIAL_DEFAULT_HABITS);
    }
  }, [storageKey, legacyStorageKey]);

  // Real-time 12:00 AM Midnight Timer: advances active day without ever deleting user's habits
  useEffect(() => {
    const now = new Date();
    const nextMidnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      0, 0, 1
    );
    const msUntilMidnight = Math.max(1000, nextMidnight.getTime() - now.getTime());
    const timerId = setTimeout(() => {
      const freshNow = new Date();
      setToday(freshNow);
      setSelectedYear(freshNow.getFullYear());
      setSelectedMonth(freshNow.getMonth());
    }, msUntilMidnight);

    return () => clearTimeout(timerId);
  }, [today]);

  // Save to localStorage helper (also updates master habit templates so added habits are never lost)
  const saveData = (newHabits: HabitItem[]) => {
    try {
      const data: MonthlyData = {
        habits: newHabits,
      };
      localStorage.setItem(storageKey, JSON.stringify(data));
      saveMasterTemplates(newHabits);
    } catch (e) {
      console.error('Failed to save habit tracker data:', e);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2200);
  };

  // Toggle check for a specific habit and day
  const handleToggleCell = (habitId: string, day: number) => {
    setHabits((prev) => {
      const updated = prev.map((h) => {
        if (h.id !== habitId) return h;
        const currentVal = Boolean(h.checks[day]);
        const newChecks = { ...h.checks, [day]: !currentVal };
        return { ...h, checks: newChecks };
      });
      saveData(updated);
      return updated;
    });
  };

  // Add new habit
  const handleAddHabit = (e?: React.FormEvent, customTitle?: string) => {
    if (e) e.preventDefault();
    const titleToAdd = (customTitle || newHabitTitle).trim();
    if (!titleToAdd) return;

    const newHabit: HabitItem = {
      id: 'h_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      title: titleToAdd,
      checks: {},
    };
    const updated = [...habits, newHabit];
    setHabits(updated);
    saveData(updated);
    setNewHabitTitle('');
    setShowAddModal(false);
    showToast('Habit added & saved');
  };

  // Delete habit immediately on click
  const handleDeleteHabit = (habitId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = habits.filter((h) => h.id !== habitId);
    setHabits(updated);
    saveData(updated);
    showToast('Habit removed');
  };

  // Auto jump to today in horizontal grid
  const handleJumpToToday = () => {
    if (!gridContainerRef.current) return;
    const dayWidth = 46;
    const scrollTarget = Math.max(0, (currentDayNum - 3) * dayWidth);
    gridContainerRef.current.scrollTo({
      left: scrollTarget,
      behavior: 'smooth',
    });
  };

  // Navigation handlers
  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  // Helper to get habits for any (year, month) for Today & Last 7 Days stats
  const getHabitsForMonth = (y: number, m: number): HabitItem[] => {
    if (y === selectedYear && m === selectedMonth) {
      return habits;
    }
    if (mounted && typeof window !== 'undefined') {
      try {
        const raw =
          localStorage.getItem(`tilawat_habit_tracker_v4_${y}_${m}`) ||
          localStorage.getItem(`tilawat_habit_tracker_v3_${y}_${m}`);
        if (raw) {
          const parsed: MonthlyData = JSON.parse(raw);
          if (parsed.habits && parsed.habits.length > 0) {
            return parsed.habits;
          }
        }
      } catch {}
    }
    return habits;
  };

  // Calculate Today's Performance
  const todayHabits = getHabitsForMonth(today.getFullYear(), today.getMonth());
  const todayTotalCount = todayHabits.length;
  const todayCompletedCount = todayHabits.filter((h) => Boolean(h.checks[currentDayNum])).length;
  const todayPercentage =
    todayTotalCount > 0 ? Math.round((todayCompletedCount / todayTotalCount) * 100) : 0;

  // Calculate Last 7 Days (Weekly Performance Breakdown)
  const last7Days = useMemo(() => {
    const list: Array<{
      date: string;
      dayLabel: string;
      dayNum: number;
      percentage: number;
      completed: number;
      total: number;
      isToday: boolean;
      hasData: boolean;
    }> = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const y = d.getFullYear();
      const m = d.getMonth();
      const dayNum = d.getDate();
      const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
      const isToday = i === 0;

      const dayHabits =
        y === selectedYear && m === selectedMonth ? habits : getHabitsForMonth(y, m);
      const total = dayHabits.length;
      const completed = dayHabits.filter((h) => Boolean(h.checks[dayNum])).length;
      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

      list.push({
        date: iso,
        dayLabel,
        dayNum,
        percentage: pct,
        completed,
        total,
        isToday,
        hasData: isToday ? total > 0 : completed > 0,
      });
    }

    return list;
  }, [habits, selectedYear, selectedMonth, today, mounted]);

  // Calculate monthly stats
  const totalPossibleChecks = habits.length * daysInMonth;
  const totalCompletedChecks = useMemo(() => {
    let count = 0;
    habits.forEach((h) => {
      daysArray.forEach(({ day }) => {
        if (h.checks[day]) count++;
      });
    });
    return count;
  }, [habits, daysArray]);

  const monthProgressPct =
    totalPossibleChecks > 0
      ? Math.round((totalCompletedChecks / totalPossibleChecks) * 100)
      : 0;

  return (
    <section className="w-full space-y-5 select-none font-sans text-[#112a1d]">
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#143323] text-emerald-100 px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold animate-in fade-in slide-in-from-bottom-2 border border-emerald-500/40">
          {toastMessage}
        </div>
      )}

      {/* PERFORMANCE PERCENTAGE SECTION */}
      <div className="bg-white border border-[#ded5c0] rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 shadow-xs space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b border-[#ede7d8] pb-2">
          <h2 className="font-bold text-xs sm:text-sm text-[#112a1d] tracking-tight uppercase">
            Performance
          </h2>
        </div>

        {/* Today's Percentage Card */}
        <div className="bg-[#faf8f3] border border-[#ded5c0] rounded-xl p-3 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#143323] uppercase tracking-wider">
              Today&apos;s Performance
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                todayPercentage === 100
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : todayPercentage >= 50
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : 'bg-[#ede7d8] text-[#527060]'
              }`}
            >
              {todayPercentage === 100
                ? '100%'
                : todayPercentage > 0
                ? 'In Progress'
                : 'Not Started'}
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold text-[#112a1d] tracking-tight">
              {todayPercentage}%
            </span>
            <span className="text-[11px] text-[#527060] font-medium">
              {todayCompletedCount} of {todayTotalCount} completed
            </span>
          </div>

          {/* Sleek Progress Bar */}
          <div className="w-full bg-[#e8e0cc] h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.max(todayPercentage, 0)}%` }}
            />
          </div>
        </div>

        {/* 7-Day Day-by-Day Mini Performance Breakdown */}
        <div className="pt-1">
          <div className="flex items-center justify-between mb-1.5 px-0.5">
            <span className="text-[11px] font-bold text-[#527060] uppercase tracking-wider">
              Last 7 Days
            </span>
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center">
            {last7Days.map((d) => (
              <div
                key={d.date}
                className={`py-1.5 px-0.5 rounded-xl border flex flex-col items-center justify-between transition-all ${
                  d.isToday
                    ? 'bg-emerald-50/90 border-emerald-400 ring-1 ring-emerald-300 shadow-2xs'
                    : d.hasData
                    ? 'bg-[#faf8f3] border-[#ded5c0]'
                    : 'bg-[#fbf9f4] border-[#ede7d8]'
                }`}
              >
                <span className="text-[11px] font-bold text-[#143323] leading-tight">
                  {d.dayLabel}
                </span>
                <span className="text-[9px] text-[#8e8574] font-medium leading-none mt-0.5">
                  {d.dayNum}
                </span>

                {/* Vertical mini capsule bar */}
                <div className="w-2.5 sm:w-3 bg-[#ede5d1] h-7 rounded-full overflow-hidden flex flex-col justify-end p-0.5 my-1.5">
                  <div
                    className={`w-full rounded-full transition-all duration-500 ${
                      d.isToday
                        ? 'bg-emerald-600'
                        : d.percentage >= 70
                        ? 'bg-emerald-700'
                        : d.percentage > 0
                        ? 'bg-amber-600'
                        : 'bg-transparent'
                    }`}
                    style={{ height: `${Math.max(d.percentage, 0)}%` }}
                  />
                </div>

                <span
                  className={`text-[10px] font-bold leading-none ${
                    d.isToday
                      ? 'text-emerald-900'
                      : d.hasData
                      ? 'text-[#112a1d]'
                      : 'text-neutral-400'
                  }`}
                >
                  {d.hasData ? `${d.percentage}%` : '–'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ================= MAIN HABIT TRACKER CARD ================= */}
      <div className="bg-white border border-[#ded5c0] rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm space-y-5">
        
        {/* Header Bar: Title, Month Selector & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#ede7d8] pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="font-display text-xl sm:text-2xl font-bold text-[#112a1d] tracking-tight">
                Habit Tracker
              </h2>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                {habits.length} Habits
              </span>
            </div>
            <p className="text-xs text-[#527060] mt-0.5">
              Track your daily consistency across all {daysInMonth} days of {MONTH_NAMES[selectedMonth]}.
            </p>
          </div>

          {/* Month Switcher & Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Month Navigator */}
            <div className="inline-flex items-center bg-[#faf8f3] border border-[#ded5c0] rounded-xl p-1 shadow-2xs">
              <button
                type="button"
                onClick={handlePrevMonth}
                aria-label="Previous Month"
                className="w-8 h-8 flex items-center justify-center rounded-lg text-[#143323] hover:bg-[#efe9d8] active:scale-95 transition-all cursor-pointer font-bold"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <div className="px-3 text-center" style={{ minWidth: '130px' }}>
                <span className="text-xs sm:text-sm font-bold text-[#143323]">
                  {MONTH_NAMES[selectedMonth]} {selectedYear}
                </span>
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                aria-label="Next Month"
                className="w-8 h-8 flex items-center justify-center rounded-lg text-[#143323] hover:bg-[#efe9d8] active:scale-95 transition-all cursor-pointer font-bold"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {isCurrentMonth && (
              <button
                type="button"
                onClick={handleJumpToToday}
                className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 active:scale-95 text-emerald-900 border border-emerald-200 text-xs font-bold transition-all cursor-pointer"
                title="Scroll directly to today's column"
              >
                Today: Day {currentDayNum}
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <span>+</span>
              <span>Add Habit</span>
            </button>
          </div>
        </div>

        {/* ================= 31-DAY HABIT MATRIX ================= */}
        <div className="relative">
          {/* Mobile scroll hint */}
          <div className="flex sm:hidden items-center justify-between text-xs text-[#527060] font-medium mb-2 px-1">
            <span>Swipe horizontally to view days 1–{daysInMonth}</span>
            {isCurrentMonth && (
              <span className="font-bold text-emerald-800">Today: Day {currentDayNum}</span>
            )}
          </div>

          {/* Scrollable Table Container with Solid Sticky Habit Column */}
          <div
            ref={gridContainerRef}
            className="w-full overflow-x-auto border border-[#ded5c0] rounded-2xl shadow-xs bg-white scroll-smooth relative"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <table className="border-collapse w-full" style={{ minWidth: 'max-content' }}>
              <thead>
                <tr className="bg-[#faf8f3] text-[#143323] border-b border-[#ded5c0]">
                  {/* Sticky 'HABITS' Column with explicit minWidth so it never collapses */}
                  <th
                    className="sticky left-0 z-30 bg-[#faf8f3] border-r border-[#ded5c0] px-4 py-3 text-left text-xs sm:text-sm font-bold tracking-wider uppercase text-[#143323] shadow-[4px_0_10px_rgba(0,0,0,0.04)]"
                    style={{ minWidth: '210px', width: '230px' }}
                  >
                    Habits
                  </th>

                  {/* Days 1 to daysInMonth */}
                  {daysArray.map(({ day, weekday }) => {
                    const isTodayCell = isCurrentMonth && day === currentDayNum;
                    return (
                      <th
                        key={day}
                        style={{ minWidth: '44px', width: '44px' }}
                        className={`border-r border-[#ede7d8] last:border-r-0 text-center py-2.5 ${
                          isTodayCell
                            ? 'bg-emerald-700 text-white'
                            : 'bg-[#faf8f3] text-[#143323]'
                        }`}
                      >
                        <div className="flex flex-col items-center justify-center leading-tight">
                          <span
                            className={`text-[9px] font-bold uppercase ${
                              isTodayCell ? 'text-emerald-100' : 'text-[#8e8574]'
                            }`}
                          >
                            {weekday}
                          </span>
                          <span className="text-xs sm:text-sm font-extrabold mt-0.5">{day}</span>
                        </div>
                      </th>
                    );
                  })}

                  {/* Done Column */}
                  <th
                    style={{ minWidth: '68px', width: '68px' }}
                    className="border-l border-[#ded5c0] bg-[#faf8f3] text-center font-bold text-xs uppercase tracking-wider text-[#143323] px-2 py-2.5"
                  >
                    Done
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#ede7d8]">
                {habits.map((habit) => {
                  const doneDaysCount = daysArray.filter(({ day }) => habit.checks[day]).length;
                  const habitPct = Math.round((doneDaysCount / daysInMonth) * 100);

                  return (
                    <tr
                      key={habit.id}
                      className="bg-white hover:bg-[#fcfaf5] transition-colors group"
                    >
                      {/* Sticky Habit Name Column */}
                      <td
                        style={{ minWidth: '210px', width: '230px' }}
                        className="sticky left-0 z-20 bg-white group-hover:bg-[#fcfaf5] border-r border-[#ded5c0] px-4 py-3 text-xs sm:text-sm font-semibold text-[#112a1d] shadow-[4px_0_10px_rgba(0,0,0,0.04)]"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className="truncate leading-snug text-[#112a1d]"
                            style={{ maxWidth: '165px' }}
                            title={habit.title}
                          >
                            {habit.title}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteHabit(habit.id, e)}
                            className="w-6 h-6 rounded-md flex items-center justify-center text-[#8e8574] hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0 cursor-pointer"
                            title="Delete habit"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </td>

                      {/* 1..31 Checkable Cells */}
                      {daysArray.map(({ day }) => {
                        const isChecked = Boolean(habit.checks[day]);
                        const isTodayCell = isCurrentMonth && day === currentDayNum;

                        return (
                          <td
                            key={day}
                            onClick={() => handleToggleCell(habit.id, day)}
                            style={{ minWidth: '44px', width: '44px', height: '50px' }}
                            className={`border-r border-[#ede7d8] last:border-r-0 text-center cursor-pointer select-none transition-colors p-0 ${
                              isTodayCell ? 'bg-emerald-50/60' : ''
                            } hover:bg-emerald-50`}
                          >
                            <div className="w-full h-full flex items-center justify-center">
                              {isChecked ? (
                                <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs transition-transform active:scale-90">
                                  ✓
                                </div>
                              ) : (
                                <div
                                  className={`w-6 h-6 rounded-xl border-2 transition-all ${
                                    isTodayCell
                                      ? 'border-emerald-500 bg-white ring-2 ring-emerald-200'
                                      : 'border-[#d6cbaf] bg-white hover:border-emerald-600'
                                  }`}
                                />
                              )}
                            </div>
                          </td>
                        );
                      })}

                      {/* Done Summary Column */}
                      <td
                        style={{ minWidth: '68px', width: '68px' }}
                        className="border-l border-[#ded5c0] text-center bg-[#faf8f3] px-2 py-2"
                      >
                        <div className="flex flex-col items-center justify-center">
                          <span className="leading-tight text-xs sm:text-sm font-bold text-[#143323]">
                            {doneDaysCount}
                          </span>
                          <span className="text-[10px] text-[#527060] leading-none font-semibold mt-0.5">
                            {habitPct}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ================= BOTTOM MONTHLY CONSISTENCY BAR ================= */}
        <div className="pt-4 border-t border-[#ede7d8]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="text-xs sm:text-sm font-bold text-[#112a1d]">
                Overall Month Consistency: <span className="text-emerald-700 font-extrabold">{monthProgressPct}%</span>
              </div>
              <div className="text-xs text-[#527060]">
                {totalCompletedChecks} of {totalPossibleChecks} total checks completed this month
              </div>
            </div>

            <div className="w-full sm:w-64 bg-[#e8e0cc] h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, monthProgressPct)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ================= ADD HABIT MODAL ================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-[#ded5c0] p-5 sm:p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#ede7d8] pb-3">
              <h4 className="font-bold text-base text-[#112a1d] tracking-wide">
                Add New Habit
              </h4>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8e8574] hover:text-[#112a1d] hover:bg-[#faf8f3] font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={(e) => handleAddHabit(e)} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#527060] mb-1.5 uppercase tracking-wider">
                  Habit Name
                </label>
                <input
                  type="text"
                  value={newHabitTitle}
                  onChange={(e) => setNewHabitTitle(e.target.value)}
                  placeholder="e.g. Read Surah Al-Mulk before bed"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#ded5c0] bg-[#faf8f3] focus:bg-white text-sm font-semibold text-[#112a1d] focus:outline-none focus:border-emerald-600"
                  autoFocus
                />
              </div>

              <div>
                <span className="block text-[11px] font-bold text-[#527060] uppercase tracking-wider mb-2">
                  Quick Islamic Suggestions:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_HABIT_SUGGESTIONS.map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => handleAddHabit(undefined, sug)}
                      className="px-2.5 py-1 rounded-lg bg-[#faf8f3] hover:bg-emerald-50 border border-[#ded5c0] text-xs font-semibold text-[#143323] transition-all cursor-pointer active:scale-95 text-left"
                    >
                      + {sug}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#ede7d8]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#d6cbaf] text-xs font-bold text-[#527060] hover:bg-[#faf8f3] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newHabitTitle.trim()}
                  className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold disabled:opacity-50 transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  Save Habit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
