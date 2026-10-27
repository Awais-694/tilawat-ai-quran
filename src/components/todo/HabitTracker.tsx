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
  const [activeTab, setActiveTab] = useState<'grid' | 'today'>('grid');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const gridContainerRef = useRef<HTMLDivElement>(null);

  // Check if viewing current real-world month
  const isCurrentMonth = today.getFullYear() === selectedYear && today.getMonth() === selectedMonth;
  const currentDayNum = today.getDate();

  // Number of days in selected month (28, 29, 30, or 31)
  const daysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth + 1, 0).getDate();
  }, [selectedYear, selectedMonth]);

  // Array of day numbers: [1, 2, ..., daysInMonth]
  const daysArray = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }, [daysInMonth]);

  const storageKey = `tilawat_habit_tracker_v2_${selectedYear}_${selectedMonth}`;

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
    }, 2500);
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

  // Update a goal line
  const handleGoalChange = (index: number, val: string) => {
    const updated = [...goals];
    updated[index] = val;
    setGoals(updated);
    saveData(habits, updated, notes);
  };

  // Update a note line
  const handleNoteChange = (index: number, val: string) => {
    const updated = [...notes];
    updated[index] = val;
    setNotes(updated);
    saveData(habits, goals, updated);
  };

  // Add new habit
  const handleAddHabit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newHabitTitle.trim();
    if (!trimmed) return;
    const newHabit: HabitItem = {
      id: 'h_' + Date.now(),
      title: trimmed,
      checks: {}
    };
    const updated = [...habits, newHabit];
    setHabits(updated);
    saveData(updated, goals, notes);
    setNewHabitTitle('');
    setShowAddModal(false);
    showToast('Habit added successfully');
  };

  // Delete habit
  const handleDeleteHabit = (habitId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this habit?')) return;
    const updated = habits.filter((h) => h.id !== habitId);
    setHabits(updated);
    saveData(updated, goals, notes);
    showToast('Habit deleted');
  };

  // Auto jump to today in horizontal grid
  const handleJumpToToday = () => {
    if (!gridContainerRef.current) return;
    const dayWidth = 40;
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
      daysArray.forEach((d) => {
        if (h.checks[d]) count++;
      });
    });
    return count;
  }, [habits, daysArray]);

  const monthProgressPct =
    totalPossibleChecks > 0
      ? Math.round((totalCompletedChecks / totalPossibleChecks) * 100)
      : 0;

  // Today stats
  const todayCompletedHabits = useMemo(() => {
    if (!isCurrentMonth) return 0;
    return habits.filter((h) => h.checks[currentDayNum]).length;
  }, [habits, isCurrentMonth, currentDayNum]);

  return (
    <section className="w-full space-y-5 select-none font-sans text-[#2b2621]">
      {/* Toast feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#2b2621] text-white px-4 py-2.5 rounded-xl shadow-xl text-xs font-semibold animate-in fade-in slide-in-from-bottom-2">
          {toastMessage}
        </div>
      )}

      {/* Main Container styled cleanly matching the template */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border-2 border-[#2b2621] shadow-sm overflow-hidden p-4 sm:p-7 transition-all">
        
        {/* ================= HEADER SECTION ================= */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b-2 border-[#2b2621]">
          {/* Title */}
          <div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#2b2621] font-mono">
              Habit Tracker
            </h2>
          </div>

          {/* Month Box matching template */}
          <div className="w-full sm:w-auto self-end sm:self-auto flex sm:block justify-end">
            <div className="w-52 sm:w-56 border-2 border-[#2b2621] rounded-xl overflow-hidden bg-white shadow-2xs">
              {/* Header: MONTH */}
              <div className="bg-[#f9ded3] text-[#2b2621] border-b-2 border-[#2b2621] px-3.5 py-1.5 flex items-center justify-between text-xs font-black tracking-widest uppercase">
                <span>MONTH:</span>
                <span className="text-xs font-black text-[#74351a]">{selectedYear}</span>
              </div>
              {/* Month Picker */}
              <div className="flex items-center justify-between px-2.5 py-2 bg-white">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  aria-label="Previous Month"
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f5eee8] active:scale-90 transition-all font-bold text-sm text-[#2b2621] cursor-pointer"
                >
                  ◀
                </button>
                <div className="text-center font-extrabold text-sm sm:text-base text-[#2b2621] tracking-wide">
                  {MONTH_NAMES[selectedMonth]}
                </div>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  aria-label="Next Month"
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f5eee8] active:scale-90 transition-all font-bold text-sm text-[#2b2621] cursor-pointer"
                >
                  ▶
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ================= GOALS & SELF-REMINDERS (2 Cards) ================= */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 my-6">
          
          {/* Card 1: GOALS FOR THE MONTH */}
          <div className="border-2 border-[#2b2621] rounded-xl overflow-hidden bg-white shadow-2xs">
            <div className="bg-[#f9ded3] text-[#2b2621] border-b-2 border-[#2b2621] px-4 py-2">
              <span className="text-xs sm:text-sm font-black tracking-wider uppercase">GOALS FOR THE MONTH:</span>
            </div>
            <div className="divide-y-2 divide-[#2b2621] bg-white">
              {goals.map((goal, idx) => (
                <div key={idx} className="flex items-center px-3.5 py-2.5 hover:bg-[#faf7f2] transition-colors">
                  <span className="text-xs font-black text-[#877868] mr-2.5 w-4">{idx + 1}.</span>
                  <input
                    type="text"
                    value={goal}
                    onChange={(e) => handleGoalChange(idx, e.target.value)}
                    placeholder={`Goal ${idx + 1}...`}
                    className="w-full text-xs sm:text-sm text-[#2b2621] font-medium bg-transparent focus:outline-none placeholder:text-[#a89c8d]"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Card 2: SELF-REMINDERS / NOTES */}
          <div className="border-2 border-[#2b2621] rounded-xl overflow-hidden bg-white shadow-2xs">
            <div className="bg-[#f9ded3] text-[#2b2621] border-b-2 border-[#2b2621] px-4 py-2">
              <span className="text-xs sm:text-sm font-black tracking-wider uppercase">SELF-REMINDERS / NOTES:</span>
            </div>
            <div className="divide-y-2 divide-[#2b2621] bg-white">
              {notes.map((note, idx) => (
                <div key={idx} className="flex items-center px-3.5 py-2.5 hover:bg-[#faf7f2] transition-colors">
                  <span className="text-xs font-black text-[#877868] mr-2.5 w-4">•</span>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => handleNoteChange(idx, e.target.value)}
                    placeholder={`Reminder / Note ${idx + 1}...`}
                    className="w-full text-xs sm:text-sm text-[#2b2621] font-medium bg-transparent focus:outline-none placeholder:text-[#a89c8d]"
                  />
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* ================= CONTROLS & ACTIONS BAR ================= */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-2 border-b border-[#e6ddd1]">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1.5 bg-[#f5eee8] p-1 rounded-xl border border-[#ded3c5]">
            <button
              type="button"
              onClick={() => setActiveTab('grid')}
              className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'grid'
                  ? 'bg-white text-[#2b2621] shadow-xs border border-[#d6cbaf]'
                  : 'text-[#6b5f51] hover:text-[#2b2621]'
              }`}
            >
              31-Day Grid
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('today')}
              className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'today'
                  ? 'bg-white text-[#2b2621] shadow-xs border border-[#d6cbaf]'
                  : 'text-[#6b5f51] hover:text-[#2b2621]'
              }`}
            >
              Today's View ({todayCompletedHabits}/{habits.length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick jump to today */}
            {isCurrentMonth && activeTab === 'grid' && (
              <button
                type="button"
                onClick={handleJumpToToday}
                className="px-3.5 py-1.5 rounded-xl bg-[#fadfd4] hover:bg-[#f6cdbe] active:scale-95 text-[#74351a] border border-[#f0c2b2] text-xs sm:text-sm font-extrabold transition-all cursor-pointer shadow-2xs"
                title="Scroll directly to today's date"
              >
                Today: Day {currentDayNum}
              </button>
            )}

            {/* Add Habit button */}
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-4 py-1.5 rounded-xl bg-[#2b2621] hover:bg-[#3d362f] active:scale-95 text-white text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-xs"
            >
              + Add Habit
            </button>
          </div>
        </div>

        {/* ================= TAB 1: FULL 31-DAY MATRIX ================= */}
        {activeTab === 'grid' && (
          <div className="relative">
            
            {/* Scroll hint on mobile */}
            <div className="flex sm:hidden items-center justify-between text-xs text-[#706456] font-medium mb-2 px-1">
              <span>Swipe horizontally to view days 1-{daysInMonth}</span>
              {isCurrentMonth && (
                <span className="font-bold text-[#74351a]">Today: Day {currentDayNum}</span>
              )}
            </div>

            {/* Scrollable Container with Sticky Left Column */}
            <div
              ref={gridContainerRef}
              className="w-full overflow-x-auto border-2 border-[#2b2621] rounded-xl shadow-xs bg-white scroll-smooth relative"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              <table className="border-collapse table-fixed w-full min-w-max">
                <thead>
                  <tr className="bg-[#f9ded3] text-[#2b2621] border-b-2 border-[#2b2621]">
                    {/* Sticky 'Habits' Column */}
                    <th className="sticky left-0 z-30 bg-[#f9ded3] border-r-2 border-[#2b2621] px-4 py-2.5 text-left text-xs sm:text-sm font-black tracking-wider uppercase w-[180px] sm:w-[240px] shadow-[2px_0_5px_rgba(0,0,0,0.06)]">
                      HABITS
                    </th>
                    {/* Days 1 to daysInMonth */}
                    {daysArray.map((d) => {
                      const isTodayCell = isCurrentMonth && d === currentDayNum;
                      return (
                        <th
                          key={d}
                          className={`border-r border-[#2b2621] last:border-r-0 text-center font-black text-xs sm:text-sm w-[36px] sm:w-[42px] py-2 ${
                            isTodayCell
                              ? 'bg-[#fad2c3] text-[#74351a] ring-2 ring-inset ring-[#c75529]'
                              : 'text-[#2b2621]'
                          }`}
                        >
                          <div className="flex flex-col items-center justify-center leading-tight">
                            <span>{d}</span>
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
                    <th className="border-l-2 border-[#2b2621] bg-[#f9ded3] text-center font-black text-xs sm:text-sm uppercase tracking-wider w-[60px] sm:w-[70px] px-2 py-2">
                      Done
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y-2 border-[#2b2621] divide-[#2b2621]">
                  {habits.map((habit) => {
                    const doneDaysCount = daysArray.filter((d) => habit.checks[d]).length;
                    const habitPct = Math.round((doneDaysCount / daysInMonth) * 100);

                    return (
                      <tr
                        key={habit.id}
                        className="hover:bg-[#fbf8f4] transition-colors group"
                      >
                        {/* Sticky Habit Name Column with clean delete option */}
                        <td className="sticky left-0 z-20 bg-white group-hover:bg-[#fbf8f4] border-r-2 border-[#2b2621] px-3.5 py-3 text-xs sm:text-sm font-bold text-[#2b2621] shadow-[2px_0_5px_rgba(0,0,0,0.06)]">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate max-w-[145px] sm:max-w-[195px]" title={habit.title}>
                              {habit.title}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteHabit(habit.id, e)}
                              className="opacity-0 group-hover:opacity-80 hover:!opacity-100 hover:text-red-600 text-xs px-1 text-[#877868] transition-opacity cursor-pointer shrink-0"
                              title="Delete habit"
                            >
                              ✕
                            </button>
                          </div>
                        </td>

                        {/* 1..31 Checkable Cells */}
                        {daysArray.map((d) => {
                          const isChecked = Boolean(habit.checks[d]);
                          const isTodayCell = isCurrentMonth && d === currentDayNum;

                          return (
                            <td
                              key={d}
                              onClick={() => handleToggleCell(habit.id, d)}
                              className={`border-r border-[#2b2621] last:border-r-0 text-center cursor-pointer select-none transition-all p-0 h-[42px] sm:h-[46px] ${
                                isTodayCell ? 'bg-amber-50/60' : ''
                              } hover:bg-[#fadfd4]/60`}
                            >
                              <div className="w-full h-full flex items-center justify-center">
                                {isChecked ? (
                                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-black text-sm sm:text-base shadow-xs transition-transform active:scale-90 animate-in zoom-in-75">
                                    ✓
                                  </div>
                                ) : (
                                  <div
                                    className={`w-5 h-5 sm:w-6 sm:h-6 rounded-lg border-2 border-[#c4b7a8] transition-all ${
                                      isTodayCell ? 'border-amber-500 ring-2 ring-amber-400 bg-amber-100/40' : ''
                                    }`}
                                  />
                                )}
                              </div>
                            </td>
                          );
                        })}

                        {/* Total Count Column */}
                        <td className="border-l-2 border-[#2b2621] text-center font-extrabold text-xs sm:text-sm text-[#2b2621] bg-white group-hover:bg-[#fbf8f4]">
                          <div className="flex flex-col items-center justify-center py-1">
                            <span className="leading-tight">{doneDaysCount}</span>
                            <span className="text-[10px] text-[#8e8070] leading-none font-semibold">{habitPct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB 2: TODAY'S FOCUS LIST ================= */}
        {activeTab === 'today' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="bg-[#fbf8f4] border-2 border-[#2b2621] rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-[#74351a] uppercase tracking-wider">
                  {MONTH_NAMES[selectedMonth]} {currentDayNum}, {selectedYear}
                </span>
                <h3 className="text-lg font-extrabold text-[#2b2621]">
                  Today's Habits Checklist
                </h3>
              </div>
              <div className="text-right">
                <div className="text-xl font-black text-emerald-800">
                  {todayCompletedHabits} / {habits.length}
                </div>
                <div className="text-xs font-bold text-[#706456]">
                  {habits.length > 0 ? Math.round((todayCompletedHabits / habits.length) * 100) : 0}% Done
                </div>
              </div>
            </div>

            <div className="divide-y-2 divide-[#2b2621] border-2 border-[#2b2621] rounded-2xl overflow-hidden bg-white">
              {habits.map((h) => {
                const isChecked = Boolean(h.checks[currentDayNum]);
                return (
                  <div
                    key={h.id}
                    onClick={() => handleToggleCell(h.id, currentDayNum)}
                    className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${
                      isChecked ? 'bg-emerald-50/60' : 'hover:bg-[#faf7f2]'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-base transition-all ${
                          isChecked
                            ? 'bg-emerald-700 text-white shadow-xs'
                            : 'border-2 border-[#2b2621] bg-white'
                        }`}
                      >
                        {isChecked && '✓'}
                      </div>
                      <div>
                        <span className={`text-sm sm:text-base font-bold text-[#2b2621] ${isChecked ? 'line-through opacity-70' : ''}`}>
                          {h.title}
                        </span>
                        <div className="text-xs text-[#877868] font-medium mt-0.5">
                          {daysArray.filter((d) => h.checks[d]).length} days completed this month
                        </div>
                      </div>
                    </div>

                    <span className="text-xs font-bold text-[#877868]">
                      {isChecked ? 'Completed' : 'Tap to mark'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================= CLEAN FOOTER STATS ================= */}
        <div className="mt-6 pt-4 border-t border-[#ede7d8] flex flex-col sm:flex-row items-center justify-between text-xs text-[#877868] font-medium gap-2">
          <div>
            Month Completion: <strong className="text-[#2b2621]">{monthProgressPct}%</strong> ({totalCompletedChecks} of {totalPossibleChecks} total checks)
          </div>
        </div>

      </div>

      {/* ================= ADD HABIT MODAL ================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl border-2 border-[#2b2621] p-5 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#eee5d8] pb-2">
              <h4 className="font-black text-sm text-[#2b2621] uppercase tracking-wider">
                Add New Habit
              </h4>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-[#8e8070] hover:text-[#2b2621] font-bold text-base"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddHabit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#5c5043] mb-1">
                  Habit Name
                </label>
                <input
                  type="text"
                  value={newHabitTitle}
                  onChange={(e) => setNewHabitTitle(e.target.value)}
                  placeholder="e.g. Read Surah Al-Mulk before bed"
                  className="w-full px-3 py-2 rounded-xl border-2 border-[#2b2621] text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#fadfd4]"
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-[#d6cbaf] text-xs font-bold text-[#5c5043] hover:bg-[#faf6ee]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newHabitTitle.trim()}
                  className="px-4 py-1.5 rounded-xl bg-[#2b2621] hover:bg-[#3d362f] text-white text-xs font-bold disabled:opacity-50 transition-all cursor-pointer shadow-xs"
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
