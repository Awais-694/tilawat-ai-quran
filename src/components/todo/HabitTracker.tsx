'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';

interface HabitItem {
  id: string;
  title: string;
  checks: Record<number, boolean>; // dayNum (1..31) -> boolean
}

interface MonthlyData {
  goals: string[];
  notes: string[];
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

const DEFAULT_GOALS: string[] = [
  'Complete 1 full Quran recitation this month',
  'Never miss Fajr in congregation / on time',
  'Learn meaning of 5 new Quranic words daily',
  'Build 21-day continuous habit streak'
];

const DEFAULT_NOTES: string[] = [
  'Consistency is loved by Allah even if it is small.',
  'Focus on progress, not perfection.',
  'Remind self: Every letter of Quran brings 10 rewards.',
  'Stay hydrated and start day with Bismillah.'
];

const INITIAL_DEFAULT_HABITS: HabitItem[] = DEFAULT_HABITS.map((title, i) => ({
  id: 'def_' + i,
  title,
  checks: {},
}));

export default function HabitTracker() {
  const [mounted, setMounted] = useState(false);
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth()); // 0-11
  const [goals, setGoals] = useState<string[]>(DEFAULT_GOALS);
  const [notes, setNotes] = useState<string[]>(DEFAULT_NOTES);
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

  // Load from localStorage on month/year change
  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed: MonthlyData = JSON.parse(saved);
        setGoals(parsed.goals && parsed.goals.length === 4 ? parsed.goals : DEFAULT_GOALS);
        setNotes(parsed.notes && parsed.notes.length === 4 ? parsed.notes : DEFAULT_NOTES);
        setHabits(
          parsed.habits && parsed.habits.length > 0
            ? parsed.habits
            : INITIAL_DEFAULT_HABITS
        );
      } else {
        setGoals(DEFAULT_GOALS);
        setNotes(DEFAULT_NOTES);
        setHabits(INITIAL_DEFAULT_HABITS);
      }
    } catch {
      setHabits(INITIAL_DEFAULT_HABITS);
    }
  }, [storageKey]);

  // Save to localStorage helper
  const saveData = (newHabits: HabitItem[], newGoals: string[], newNotes: string[]) => {
    try {
      const data: MonthlyData = {
        goals: newGoals,
        notes: newNotes,
        habits: newHabits
      };
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save habit tracker data:', e);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2000);
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
      saveData(updated, goals, notes);
      return updated;
    });
  };

  // Update a single goal line
  const handleGoalChange = (index: number, val: string) => {
    const updated = [...goals];
    updated[index] = val;
    setGoals(updated);
    saveData(habits, updated, notes);
  };

  // Delete all goals (Clear All)
  const handleDeleteAllGoals = () => {
    const emptyGoals = ['', '', '', ''];
    setGoals(emptyGoals);
    saveData(habits, emptyGoals, notes);
    showToast('All goals cleared');
  };

  // Update a single note line
  const handleNoteChange = (index: number, val: string) => {
    const updated = [...notes];
    updated[index] = val;
    setNotes(updated);
    saveData(habits, goals, updated);
  };

  // Delete all notes (Clear All)
  const handleDeleteAllNotes = () => {
    const emptyNotes = ['', '', '', ''];
    setNotes(emptyNotes);
    saveData(habits, goals, emptyNotes);
    showToast('All notes cleared');
  };

  // Add new habit
  const handleAddHabit = (e?: React.FormEvent, customTitle?: string) => {
    if (e) e.preventDefault();
    const titleToAdd = (customTitle || newHabitTitle).trim();
    if (!titleToAdd) return;
    const newHabit: HabitItem = {
      id: 'h_' + Date.now() + Math.random().toString(36).substring(2, 5),
      title: titleToAdd,
      checks: {}
    };
    const updated = [...habits, newHabit];
    setHabits(updated);
    saveData(updated, goals, notes);
    setNewHabitTitle('');
    setShowAddModal(false);
    showToast('Habit added');
  };

  // Delete habit immediately on click WITHOUT asking for permission
  const handleDeleteHabit = (habitId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = habits.filter((h) => h.id !== habitId);
    setHabits(updated);
    saveData(updated, goals, notes);
    showToast('Habit removed');
  };

  // Auto jump to today in horizontal grid
  const handleJumpToToday = () => {
    if (!gridContainerRef.current) return;
    const dayWidth = 46;
    const scrollTarget = Math.max(0, (currentDayNum - 3) * dayWidth);
    gridContainerRef.current.scrollTo({
      left: scrollTarget,
      behavior: 'smooth'
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
    <section className="w-full space-y-6 select-none font-sans text-[#221c17]">
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1e1914] text-amber-100 px-4 py-2.5 rounded-2xl shadow-2xl text-xs font-semibold animate-in fade-in slide-in-from-bottom-3 border border-amber-500/30">
          {toastMessage}
        </div>
      )}

      {/* Main Journal Card */}
      <div className="bg-[#fffefe] rounded-3xl border-2 border-[#2b2621] shadow-[0_8px_30px_rgba(40,30,20,0.06)] overflow-hidden p-4 sm:p-8 transition-all">
        
        {/* ================= HEADER SECTION (Centered Luxury Style) ================= */}
        <div className="flex flex-col items-center justify-center text-center pb-6 sm:pb-7 border-b-2 border-[#2b2621] space-y-4 sm:space-y-5">
          {/* Main Title with Elegant Underline Motif */}
          <div className="space-y-1">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-[#2b2621] font-mono">
              Habit Tracker
            </h2>
            <div className="w-16 h-1 bg-[#fadfd4] mx-auto rounded-full border border-[#2b2621]" />
          </div>

          {/* Centered Month Selector Widget */}
          <div className="w-full max-w-[280px] sm:max-w-xs border-2 border-[#2b2621] rounded-2xl overflow-hidden bg-white shadow-sm">
            {/* Header: MONTH */}
            <div className="bg-[#fadfd4] text-[#2b2621] border-b-2 border-[#2b2621] px-4 py-1.5 flex items-center justify-between text-xs font-black tracking-widest uppercase">
              <span>MONTH:</span>
              <span className="text-xs font-black text-[#85341a]">{selectedYear}</span>
            </div>
            {/* Month Switcher Controls */}
            <div className="flex items-center justify-between px-3 py-2 bg-white">
              <button
                type="button"
                onClick={handlePrevMonth}
                aria-label="Previous Month"
                className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[#f7ece8] active:scale-90 transition-all font-bold text-sm text-[#2b2621] cursor-pointer"
              >
                ◀
              </button>
              <div className="text-center font-black text-base sm:text-lg text-[#2b2621] tracking-wide">
                {MONTH_NAMES[selectedMonth]}
              </div>
              <button
                type="button"
                onClick={handleNextMonth}
                aria-label="Next Month"
                className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[#f7ece8] active:scale-90 transition-all font-bold text-sm text-[#2b2621] cursor-pointer"
              >
                ▶
              </button>
            </div>
          </div>
        </div>

        {/* ================= GOALS & SELF-REMINDERS (2 Cards with Delete All) ================= */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 my-6">
          
          {/* Card 1: GOALS FOR THE MONTH */}
          <div className="border-2 border-[#2b2621] rounded-2xl overflow-hidden bg-white shadow-2xs">
            <div className="bg-[#fadfd4] text-[#2b2621] border-b-2 border-[#2b2621] px-4 py-2.5 flex items-center justify-between">
              <span className="text-xs sm:text-sm font-black tracking-wider uppercase">GOALS FOR THE MONTH:</span>
              <button
                type="button"
                onClick={handleDeleteAllGoals}
                className="text-xs font-extrabold text-[#872d12] hover:text-red-700 hover:underline cursor-pointer transition-all active:scale-95"
                title="Clear all goals"
              >
                Delete All
              </button>
            </div>
            <div className="divide-y-2 divide-[#2b2621] bg-white">
              {goals.map((goal, idx) => (
                <div key={idx} className="flex items-center px-4 py-3 hover:bg-[#fdfaf7] transition-colors group">
                  <span className="w-5 h-5 rounded-full bg-[#fcedea] border border-[#f0c2b2] text-[11px] font-black text-[#85341a] flex items-center justify-center mr-2.5 shrink-0">
                    {idx + 1}
                  </span>
                  <input
                    type="text"
                    value={goal}
                    onChange={(e) => handleGoalChange(idx, e.target.value)}
                    placeholder={`Goal ${idx + 1}...`}
                    className="w-full text-xs sm:text-sm text-[#2b2621] font-semibold bg-transparent focus:outline-none placeholder:text-[#ab9f90]"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Card 2: SELF-REMINDERS / NOTES */}
          <div className="border-2 border-[#2b2621] rounded-2xl overflow-hidden bg-white shadow-2xs">
            <div className="bg-[#fadfd4] text-[#2b2621] border-b-2 border-[#2b2621] px-4 py-2.5 flex items-center justify-between">
              <span className="text-xs sm:text-sm font-black tracking-wider uppercase">SELF-REMINDERS / NOTES:</span>
              <button
                type="button"
                onClick={handleDeleteAllNotes}
                className="text-xs font-extrabold text-[#872d12] hover:text-red-700 hover:underline cursor-pointer transition-all active:scale-95"
                title="Clear all notes"
              >
                Delete All
              </button>
            </div>
            <div className="divide-y-2 divide-[#2b2621] bg-white">
              {notes.map((note, idx) => (
                <div key={idx} className="flex items-center px-4 py-3 hover:bg-[#fdfaf7] transition-colors group">
                  <span className="w-5 h-5 rounded-full bg-[#fcedea] border border-[#f0c2b2] text-xs font-black text-[#85341a] flex items-center justify-center mr-2.5 shrink-0">
                    •
                  </span>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => handleNoteChange(idx, e.target.value)}
                    placeholder={`Reminder / Note ${idx + 1}...`}
                    className="w-full text-xs sm:text-sm text-[#2b2621] font-semibold bg-transparent focus:outline-none placeholder:text-[#ab9f90]"
                  />
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* ================= CONTROLS & ACTIONS BAR ================= */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-2 border-b border-[#e6ddd1]">
          {/* Section Indicator */}
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-700" />
            <span className="text-xs sm:text-sm font-black text-[#2b2621] tracking-wider uppercase">
              31-Day Habit Grid
            </span>
            <span className="text-xs text-[#8e8070] font-semibold hidden xs:inline">
              ({habits.length} habits)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick jump to today */}
            {isCurrentMonth && (
              <button
                type="button"
                onClick={handleJumpToToday}
                className="px-3.5 py-2 rounded-xl bg-[#fadfd4] hover:bg-[#f6cdbe] active:scale-95 text-[#74351a] border-2 border-[#2b2621] text-xs sm:text-sm font-extrabold transition-all cursor-pointer shadow-xs"
                title="Scroll directly to today's date"
              >
                Today: Day {currentDayNum}
              </button>
            )}

            {/* Add Habit button */}
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 rounded-xl bg-[#2b2621] hover:bg-[#3d362f] active:scale-95 text-white text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <span>+</span>
              <span>Add Habit</span>
            </button>
          </div>
        </div>

        {/* ================= 31-DAY MATRIX (Spacious, Clear Names, Weekday Headers) ================= */}
        <div className="relative">
          
          {/* Mobile scroll hint */}
          <div className="flex sm:hidden items-center justify-between text-xs text-[#706456] font-medium mb-2 px-1">
            <span>Swipe horizontally to view days 1-{daysInMonth}</span>
            {isCurrentMonth && (
              <span className="font-bold text-[#74351a]">Today: Day {currentDayNum}</span>
            )}
          </div>

          {/* Scrollable Container with Sticky Left Column */}
          <div
            ref={gridContainerRef}
            className="w-full overflow-x-auto border-2 border-[#2b2621] rounded-2xl shadow-xs bg-white scroll-smooth relative"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <table className="border-collapse table-fixed w-full min-w-max">
              <thead>
                <tr className="bg-[#fadfd4] text-[#2b2621] border-b-2 border-[#2b2621]">
                  {/* Sticky 'HABITS' Column (Wider so full title is readable) */}
                  <th className="sticky left-0 z-30 bg-[#fadfd4] border-r-2 border-[#2b2621] px-4 py-3 text-left text-xs sm:text-sm font-black tracking-wider uppercase w-[220px] sm:w-[300px] shadow-[4px_0_10px_rgba(0,0,0,0.06)]">
                    HABITS
                  </th>
                  {/* Days 1 to daysInMonth with Day Number & Weekday */}
                  {daysArray.map(({ day, weekday }) => {
                    const isTodayCell = isCurrentMonth && day === currentDayNum;
                    return (
                      <th
                        key={day}
                        className={`border-r border-[#2b2621] last:border-r-0 text-center font-black text-xs sm:text-sm w-[42px] sm:w-[48px] py-2.5 ${
                          isTodayCell
                            ? 'bg-[#fac4b0] text-[#74351a] ring-2 ring-inset ring-[#c75529]'
                            : 'text-[#2b2621]'
                        }`}
                      >
                        <div className="flex flex-col items-center justify-center leading-tight">
                          <span className="text-[9px] sm:text-[10px] text-[#85341a] font-bold uppercase opacity-80">
                            {weekday}
                          </span>
                          <span className="text-xs sm:text-sm font-black">{day}</span>
                          {isTodayCell && (
                            <span className="text-[7px] font-black uppercase text-[#c75529] tracking-tighter leading-none mt-0.5">
                              TODAY
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                  {/* Done Column */}
                  <th className="border-l-2 border-[#2b2621] bg-[#fadfd4] text-center font-black text-xs sm:text-sm uppercase tracking-wider w-[66px] sm:w-[78px] px-2 py-2.5">
                    Done
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y-2 border-[#2b2621] divide-[#2b2621]">
                {habits.map((habit) => {
                  const doneDaysCount = daysArray.filter(({ day }) => habit.checks[day]).length;
                  const habitPct = Math.round((doneDaysCount / daysInMonth) * 100);

                  return (
                    <tr
                      key={habit.id}
                      className="hover:bg-[#fcfaf7] transition-colors group"
                    >
                      {/* Sticky Habit Name Column with immediate one-click delete */}
                      <td className="sticky left-0 z-20 bg-white group-hover:bg-[#fcfaf7] border-r-2 border-[#2b2621] px-4 py-3 text-xs sm:text-sm font-bold text-[#2b2621] shadow-[4px_0_10px_rgba(0,0,0,0.06)]">
                        <div className="flex items-center justify-between gap-2.5">
                          <span className="truncate max-w-[180px] sm:max-w-[250px] leading-snug" title={habit.title}>
                            {habit.title}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteHabit(habit.id, e)}
                            className="w-6 h-6 rounded-md flex items-center justify-center text-[#ab9f90] hover:text-red-700 hover:bg-red-50 transition-colors shrink-0 cursor-pointer"
                            title="Delete habit immediately"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </td>

                      {/* 1..31 Checkable Cells (Large & Satisfying) */}
                      {daysArray.map(({ day }) => {
                        const isChecked = Boolean(habit.checks[day]);
                        const isTodayCell = isCurrentMonth && day === currentDayNum;

                        return (
                          <td
                            key={day}
                            onClick={() => handleToggleCell(habit.id, day)}
                            className={`border-r border-[#2b2621] last:border-r-0 text-center cursor-pointer select-none transition-all p-0 h-[48px] sm:h-[54px] ${
                              isTodayCell ? 'bg-amber-50/70' : ''
                            } hover:bg-[#fadfd4]/60`}
                          >
                            <div className="w-full h-full flex items-center justify-center">
                              {isChecked ? (
                                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center font-black text-sm sm:text-base shadow-xs transition-transform active:scale-90 animate-in zoom-in-75">
                                  ✓
                                </div>
                              ) : (
                                <div
                                  className={`w-6 h-6 sm:w-7 sm:h-7 rounded-xl border-2 border-[#c7b8a7] hover:border-[#74351a] hover:bg-white transition-all ${
                                    isTodayCell ? 'border-amber-500 ring-2 ring-amber-400 bg-amber-100/40' : 'bg-transparent'
                                  }`}
                                />
                              )}
                            </div>
                          </td>
                        );
                      })}

                      {/* Total Count Column with Progress Pill */}
                      <td className="border-l-2 border-[#2b2621] text-center font-black text-xs sm:text-sm text-[#2b2621] bg-white group-hover:bg-[#fcfaf7]">
                        <div className="flex flex-col items-center justify-center py-1">
                          <span className="leading-tight text-xs sm:text-sm font-black text-[#143323]">{doneDaysCount}</span>
                          <span className="text-[10px] text-[#8e8070] leading-none font-bold mt-0.5">{habitPct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ================= GORGEOUS PROGRESS SUMMARY AT BOTTOM ================= */}
        <div className="mt-7 pt-5 border-t border-[#ede7d8] space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="space-y-0.5">
              <div className="text-xs sm:text-sm font-extrabold text-[#2b2621]">
                Overall Month Consistency: <span className="text-emerald-800 font-black">{monthProgressPct}%</span>
              </div>
              <div className="text-xs text-[#877868]">
                {totalCompletedChecks} of {totalPossibleChecks} total checks completed this month
              </div>
            </div>

            <div className="w-full sm:w-64 bg-[#f0ebd9] h-3 rounded-full overflow-hidden border border-[#ded5c0]">
              <div
                className="bg-gradient-to-r from-emerald-600 to-teal-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, monthProgressPct)}%` }}
              />
            </div>
          </div>
        </div>

      </div>

      {/* ================= ADD HABIT MODAL (With Quick Islamic Suggestions) ================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl border-2 border-[#2b2621] p-5 sm:p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#eee5d8] pb-3">
              <h4 className="font-black text-base text-[#2b2621] tracking-wide">
                Add New Habit
              </h4>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8e8070] hover:text-[#2b2621] hover:bg-[#f5eee8] font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={(e) => handleAddHabit(e)} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#5c5043] mb-1.5 uppercase tracking-wider">
                  Habit Name
                </label>
                <input
                  type="text"
                  value={newHabitTitle}
                  onChange={(e) => setNewHabitTitle(e.target.value)}
                  placeholder="e.g. Read Surah Al-Mulk before bed"
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-[#2b2621] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#fadfd4]"
                  autoFocus
                />
              </div>

              {/* Quick suggestions */}
              <div>
                <span className="block text-[11px] font-bold text-[#8e8070] uppercase tracking-wider mb-2">
                  Quick Islamic Suggestions:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_HABIT_SUGGESTIONS.map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => handleAddHabit(undefined, sug)}
                      className="px-2.5 py-1 rounded-lg bg-[#faf6ee] hover:bg-[#f3ead6] border border-[#ded5c0] text-xs font-bold text-[#143323] transition-all cursor-pointer active:scale-95 text-left"
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
                  className="px-4 py-2 rounded-xl border border-[#d6cbaf] text-xs font-bold text-[#5c5043] hover:bg-[#faf6ee] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newHabitTitle.trim()}
                  className="px-5 py-2 rounded-xl bg-[#2b2621] hover:bg-[#3d362f] text-white text-xs font-bold disabled:opacity-50 transition-all cursor-pointer shadow-xs active:scale-95"
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
