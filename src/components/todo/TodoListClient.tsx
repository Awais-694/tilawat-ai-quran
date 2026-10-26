"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}

interface PlannerData {
  userName: string;
  date: string;
  tasks: TodoItem[];
  priorities: TodoItem[];
  notes?: string;
}

interface DayPerformance {
  date: string; // YYYY-MM-DD
  dayLabel: string; // Mon, Tue, etc.
  percentage: number; // 0 - 100
  completed: number;
  total: number;
}

const STORAGE_KEY = "tilawat_todo_planner_v1";
const STORAGE_PERFORMANCE_KEY = "tilawat_todo_performance_history_v1";
const STORAGE_LAST_DATE_KEY = "tilawat_todo_last_active_date_v1";

function getTodayIsoDate(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getTodayFormatted(): string {
  const d = new Date();
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const DEFAULT_PLANNER: PlannerData = {
  userName: "",
  date: "",
  tasks: [
    { id: "t1", text: "Daily Tilawat (1 Ruku / 1 Surah)", completed: false },
    { id: "t2", text: "Morning Adhkar (اذكار الصباح)", completed: false },
    { id: "t3", text: "Review recited Ayahs on Tilawat.Ai", completed: false },
    { id: "t4", text: "Evening Adhkar (اذكار المساء)", completed: false },
    { id: "t5", text: "Read Quran translation & Tafseer", completed: false },
    { id: "t6", text: "Recite Surah Al-Mulk before sleeping", completed: false },
  ],
  priorities: [
    { id: "p1", text: "Keep recitation streak alive today", completed: false },
    { id: "p2", text: "Practice Tajweed pronunciation with AI mic", completed: false },
  ],
};

const QUICK_SUGGESTIONS = [
  "Daily Tilawat (1 Ruku)",
  "Morning Adhkar (اذكار الصباح)",
  "Evening Adhkar (اذكار المساء)",
  "Surah Al-Mulk before sleep",
  "Tajweed practice with AI mic",
  "Read Tarjama & Tafseer",
];

export function TodoListClient() {
  const router = useRouter();
  const [data, setData] = useState<PlannerData>(() => DEFAULT_PLANNER);
  const [loaded, setLoaded] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  // Performance history dictionary (keyed by YYYY-MM-DD)
  const [performanceHistory, setPerformanceHistory] = useState<Record<string, DayPerformance>>({});

  // Filter for tasks list: "all" | "done" | "not_done"
  const [taskFilter, setTaskFilter] = useState<"all" | "done" | "not_done">("all");

  // New item inputs
  const [newTaskInput, setNewTaskInput] = useState("");
  const [newPriorityInput, setNewPriorityInput] = useState("");

  const showToast = (msg: string) => {
    setStatusFeedback(msg);
    setTimeout(() => {
      setStatusFeedback(null);
    }, 4000);
  };

  // 1. Initial Load: Check date, handle 12 AM midnight auto-reset, load performance history
  useEffect(() => {
    const todayIso = getTodayIsoDate();
    let history: Record<string, DayPerformance> = {};

    try {
      const rawHist = localStorage.getItem(STORAGE_PERFORMANCE_KEY);
      if (rawHist) {
        history = JSON.parse(rawHist) || {};
      }
    } catch {}

    try {
      const lastActiveDate = localStorage.getItem(STORAGE_LAST_DATE_KEY);
      const rawData = localStorage.getItem(STORAGE_KEY);
      let parsedData: PlannerData | null = null;
      if (rawData) {
        parsedData = JSON.parse(rawData);
      }

      // Check if 12 AM midnight (new calendar day) has arrived since last session
      if (lastActiveDate && lastActiveDate !== todayIso) {
        // Record previous day's final performance percentage
        if (parsedData) {
          const prevItems = [...(parsedData.tasks || []), ...(parsedData.priorities || [])];
          const prevTotal = prevItems.length;
          const prevCompleted = prevItems.filter((i) => i.completed).length;

          if (prevTotal > 0) {
            const prevPct = Math.round((prevCompleted / prevTotal) * 100);
            const dObj = new Date(lastActiveDate + "T12:00:00");
            history[lastActiveDate] = {
              date: lastActiveDate,
              dayLabel: isNaN(dObj.getTime())
                ? "Day"
                : dObj.toLocaleDateString("en-US", { weekday: "short" }),
              percentage: prevPct,
              completed: prevCompleted,
              total: prevTotal,
            };
            localStorage.setItem(STORAGE_PERFORMANCE_KEY, JSON.stringify(history));
          }
        }

        // Automatic 12 AM reset: remove previous tasks and start fresh day
        const freshDayPlanner: PlannerData = {
          userName: parsedData?.userName || "",
          date: getTodayFormatted(),
          tasks: [], // tasks cleared for the new day as requested
          priorities: [],
        };

        setData(freshDayPlanner);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(freshDayPlanner));
        localStorage.setItem(STORAGE_LAST_DATE_KEY, todayIso);
        showToast("🌙 12:00 AM Midnight: New day started! Previous record saved and tasks reset.");
      } else {
        // Same day or first visit
        if (parsedData && typeof parsedData === "object") {
          setData({
            userName: parsedData.userName ?? "",
            date: parsedData.date || getTodayFormatted(),
            tasks: Array.isArray(parsedData.tasks) ? parsedData.tasks : DEFAULT_PLANNER.tasks,
            priorities: Array.isArray(parsedData.priorities) ? parsedData.priorities : DEFAULT_PLANNER.priorities,
          });
        } else {
          setData({
            ...DEFAULT_PLANNER,
            date: getTodayFormatted(),
          });
        }
        localStorage.setItem(STORAGE_LAST_DATE_KEY, todayIso);
      }
    } catch {
      setData({
        ...DEFAULT_PLANNER,
        date: getTodayFormatted(),
      });
    }

    setPerformanceHistory(history);
    setLoaded(true);
  }, []);

  // 2. Real-time 12:00 AM Midnight Auto-Reset Timer (for tabs left open overnight)
  useEffect(() => {
    const scheduleMidnightTimer = () => {
      const now = new Date();
      const nextMidnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        0, 0, 1 // 12:00:01 AM
      );
      const msUntilMidnight = Math.max(1000, nextMidnight.getTime() - now.getTime());

      return setTimeout(() => {
        // Midnight has arrived! Save current day's performance and clear tasks
        const todayIso = getTodayIsoDate();
        setData((current) => {
          const allItems = [...current.tasks, ...current.priorities];
          const total = allItems.length;
          const completed = allItems.filter((i) => i.completed).length;

          if (total > 0) {
            const pct = Math.round((completed / total) * 100);
            const dObj = new Date(todayIso + "T12:00:00");
            setPerformanceHistory((prev) => {
              const updated = {
                ...prev,
                [todayIso]: {
                  date: todayIso,
                  dayLabel: isNaN(dObj.getTime())
                    ? "Day"
                    : dObj.toLocaleDateString("en-US", { weekday: "short" }),
                  percentage: pct,
                  completed,
                  total,
                },
              };
              try {
                localStorage.setItem(STORAGE_PERFORMANCE_KEY, JSON.stringify(updated));
              } catch {}
              return updated;
            });
          }

          const resetPlanner: PlannerData = {
            userName: current.userName,
            date: getTodayFormatted(),
            tasks: [], // cleared for new day
            priorities: [],
          };

          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(resetPlanner));
            const newIso = getTodayIsoDate();
            localStorage.setItem(STORAGE_LAST_DATE_KEY, newIso);
          } catch {}

          showToast("🌙 12:00 AM Midnight: Daily performance saved and checklist reset for the new day.");
          return resetPlanner;
        });
      }, msUntilMidnight);
    };

    const timerId = scheduleMidnightTimer();
    return () => clearTimeout(timerId);
  }, []);

  // 3. Save planner data & update today's live performance percentage whenever tasks change
  useEffect(() => {
    if (!loaded) return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {}

    // Calculate real-time today's percentage
    const allItems = [...data.tasks, ...data.priorities];
    const total = allItems.length;
    const completed = allItems.filter((i) => i.completed).length;
    const todayIso = getTodayIsoDate();

    if (total > 0) {
      const todayPct = Math.round((completed / total) * 100);
      setPerformanceHistory((prev) => {
        const dObj = new Date();
        const updated = {
          ...prev,
          [todayIso]: {
            date: todayIso,
            dayLabel: dObj.toLocaleDateString("en-US", { weekday: "short" }),
            percentage: todayPct,
            completed,
            total,
          },
        };
        try {
          localStorage.setItem(STORAGE_PERFORMANCE_KEY, JSON.stringify(updated));
        } catch {}
        return updated;
      });
    }
  }, [data, loaded]);

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/streak");
    }
  };

  // Toggle item completed
  const toggleItem = (listKey: "tasks" | "priorities", id: string) => {
    setData((prev) => ({
      ...prev,
      [listKey]: prev[listKey].map((it) =>
        it.id === id ? { ...it, completed: !it.completed } : it
      ),
    }));
  };

  // Generic delete
  const deleteItem = (listKey: "tasks" | "priorities", id: string) => {
    setData((prev) => ({
      ...prev,
      [listKey]: prev[listKey].filter((it) => it.id !== id),
    }));
  };

  // Add Task
  const handleAddTask = (e?: React.FormEvent, customText?: string) => {
    e?.preventDefault();
    const text = (customText ?? newTaskInput).trim();
    if (!text) return;
    setData((prev) => ({
      ...prev,
      tasks: [...prev.tasks, { id: `t_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`, text, completed: false }],
    }));
    if (!customText) setNewTaskInput("");
  };

  // Add Priority
  const handleAddPriority = (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = newPriorityInput.trim();
    if (!text) return;
    setData((prev) => ({
      ...prev,
      priorities: [...prev.priorities, { id: `p_${Date.now()}`, text, completed: false }],
    }));
    setNewPriorityInput("");
  };


  // Clear completed
  const handleClearCompleted = () => {
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((t) => !t.completed),
      priorities: prev.priorities.filter((p) => !p.completed),
    }));
    showToast("Completed tasks cleared.");
  };

  // Manual Start New Day button
  const handleResetNewDay = () => {
    if (typeof window !== "undefined") {
      const confirmMsg = "Start a fresh new day? Tasks will be cleared for adding today's goals.";
      if (!window.confirm(confirmMsg)) return;
    }

    // Save current day's performance % before clearing
    const allItems = [...data.tasks, ...data.priorities];
    const total = allItems.length;
    const completed = allItems.filter((i) => i.completed).length;
    const todayIso = getTodayIsoDate();

    if (total > 0) {
      const pct = Math.round((completed / total) * 100);
      const dObj = new Date();
      const updatedHistory = {
        ...performanceHistory,
        [todayIso]: {
          date: todayIso,
          dayLabel: dObj.toLocaleDateString("en-US", { weekday: "short" }),
          percentage: pct,
          completed,
          total,
        },
      };
      setPerformanceHistory(updatedHistory);
      try {
        localStorage.setItem(STORAGE_PERFORMANCE_KEY, JSON.stringify(updatedHistory));
      } catch {}
    }

    setData((prev) => ({
      ...prev,
      date: getTodayFormatted(),
      tasks: [],
      priorities: [],
    }));

    showToast("New day started! Tasks reset for fresh daily goals.");
  };

  // Stats calculation
  const allItems = [...data.tasks, ...data.priorities];
  const totalCount = allItems.length;
  const completedCount = allItems.filter((i) => i.completed).length;
  const todayPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Filtered task items
  const filteredTasks = data.tasks.filter((t) => {
    if (taskFilter === "done") return t.completed;
    if (taskFilter === "not_done") return !t.completed;
    return true;
  });

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

    const todayIso = getTodayIsoDate();

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const dayStr = String(d.getDate()).padStart(2, "0");
      const iso = `${y}-${m}-${dayStr}`;

      const dayLabel = d.toLocaleDateString("en-US", { weekday: "short" });
      const dayNum = d.getDate();
      const isToday = iso === todayIso;

      if (isToday) {
        // Use live real-time state for today
        list.push({
          date: iso,
          dayLabel,
          dayNum,
          percentage: todayPercentage,
          completed: completedCount,
          total: totalCount,
          isToday: true,
          hasData: totalCount > 0,
        });
      } else {
        const histItem = performanceHistory[iso];
        list.push({
          date: iso,
          dayLabel,
          dayNum,
          percentage: histItem ? histItem.percentage : 0,
          completed: histItem ? histItem.completed : 0,
          total: histItem ? histItem.total : 0,
          isToday: false,
          hasData: Boolean(histItem && histItem.total > 0),
        });
      }
    }

    return list;
  }, [performanceHistory, todayPercentage, completedCount, totalCount]);

  // Weekly Average Percentage calculation
  const weeklyPercentage = useMemo(() => {
    const daysWithData = last7Days.filter((d) => d.hasData);
    if (daysWithData.length === 0) return todayPercentage;
    const sum = daysWithData.reduce((acc, d) => acc + d.percentage, 0);
    return Math.round(sum / daysWithData.length);
  }, [last7Days, todayPercentage]);

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-16 px-2 sm:px-0">
      {/* Toast feedback */}
      {statusFeedback && (
        <div className="fixed bottom-4 right-4 z-50 bg-[#143323] text-emerald-100 border border-emerald-500/40 px-4 py-2.5 rounded-xl shadow-lg text-xs font-medium animate-in fade-in slide-in-from-bottom-2">
          {statusFeedback}
        </div>
      )}

      {/* Top Header & Navigation Bar */}
      <div className="flex items-center justify-between border-b border-[#ede7d8] pb-3 px-1">
        <button
          onClick={handleBack}
          className="inline-flex items-center justify-center px-4 py-1.5 rounded-xl text-xs sm:text-sm font-semibold tracking-wide text-[#193d2b] bg-white hover:bg-[#efe9d8] active:bg-[#e4dcce] border border-[#d6cbaf] shadow-xs active:scale-95 transition-all duration-200 cursor-pointer min-w-[72px]"
        >
          Back
        </button>

        <Link
          href="/"
          className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-[#193d2b] bg-white hover:bg-[#efe9d8] active:bg-[#e4dcce] border border-[#d6cbaf] shadow-xs active:scale-95 transition-all duration-200 cursor-pointer min-w-[72px]"
        >
          Dashboard
        </Link>
      </div>

      {/* PERFORMANCE PERCENTAGE SECTION: COMPACT & MODERN */}
      <div className="bg-white border border-[#ded5c0] rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 shadow-xs space-y-3">
        {/* Header: Compact, No icons */}
        <div className="flex items-center justify-between gap-2 border-b border-[#ede7d8] pb-2">
          <h2 className="font-bold text-xs sm:text-sm text-[#112a1d] tracking-tight uppercase">
            Performance
          </h2>
          <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
            12:00 AM Reset
          </span>
        </div>

        {/* 2 Compact Metric Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* 1. Today's Percentage Card */}
          <div className="bg-[#faf8f3] border border-[#ded5c0] rounded-xl p-3 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#143323] uppercase tracking-wider">
                Today
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  todayPercentage === 100
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                    : todayPercentage >= 50
                    ? "bg-amber-100 text-amber-800 border border-amber-300"
                    : "bg-[#ede7d8] text-[#527060]"
                }`}
              >
                {todayPercentage === 100
                  ? "100%"
                  : todayPercentage > 0
                  ? "In Progress"
                  : "Not Started"}
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#112a1d] tracking-tight">
                {todayPercentage}%
              </span>
              <span className="text-[11px] text-[#527060] font-medium">
                {completedCount} of {totalCount} completed
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

          {/* 2. Weekly Percentage Card */}
          <div className="bg-[#faf8f3] border border-[#ded5c0] rounded-xl p-3 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#143323] uppercase tracking-wider">
                Weekly Average
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-200">
                7 Days
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-900 tracking-tight">
                {weeklyPercentage}%
              </span>
              <span className="text-[11px] text-[#527060] font-medium">
                7-day average
              </span>
            </div>

            {/* Sleek Progress Bar */}
            <div className="w-full bg-[#e8e0cc] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-700 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.max(weeklyPercentage, 0)}%` }}
              />
            </div>
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
                    ? "bg-emerald-50/90 border-emerald-400 ring-1 ring-emerald-300 shadow-2xs"
                    : d.hasData
                    ? "bg-[#faf8f3] border-[#ded5c0]"
                    : "bg-[#fbf9f4] border-[#ede7d8]"
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
                        ? "bg-emerald-600"
                        : d.percentage >= 70
                        ? "bg-emerald-700"
                        : d.percentage > 0
                        ? "bg-amber-600"
                        : "bg-transparent"
                    }`}
                    style={{ height: `${Math.max(d.percentage, 0)}%` }}
                  />
                </div>

                <span
                  className={`text-[10px] font-bold leading-none ${
                    d.isToday
                      ? "text-emerald-900"
                      : d.hasData
                      ? "text-[#112a1d]"
                      : "text-neutral-400"
                  }`}
                >
                  {d.hasData ? `${d.percentage}%` : "–"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Printable / Planner Sheet Card */}
      <div className="bg-white border border-[#ded5c0] rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm space-y-5">
        
        {/* Planner Header: Title & Clean Date Badge (No useless icons) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#ede7d8] pb-3">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#112a1d] tracking-tight">
              Daily Planner
            </h1>
          </div>

          {/* Clean Modern Date Display (No useless icons) */}
          <div className="px-3 py-1.5 rounded-xl bg-[#faf8f3] border border-[#ded5c0] shadow-2xs self-start sm:self-auto flex items-center gap-2">
            <span className="text-[10px] font-bold text-[#8e8574] uppercase tracking-wider">Date</span>
            <span className="text-xs font-bold text-[#143323]">{data.date || getTodayFormatted()}</span>
          </div>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          
          {/* LEFT COLUMN: TODAY'S CHECKLIST (ELEVATED, MODERN DESIGN) */}
          <div className="md:col-span-7 flex flex-col space-y-3">
            <div className="border border-[#ded5c0] rounded-2xl overflow-hidden bg-white shadow-xs flex flex-col justify-between">
              <div>
                {/* Header Banner */}
                <div className="bg-gradient-to-r from-[#143323] via-[#1b4731] to-[#143323] text-white px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center">
                      <svg className="w-3.5 h-3.5 text-emerald-300" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                    </div>
                    <span className="font-bold text-xs sm:text-sm uppercase tracking-wider">
                      Today's Checklist
                    </span>
                  </div>

                  <span className="text-xs font-bold text-emerald-100 bg-white/10 border border-white/15 px-2.5 py-1 rounded-full shadow-2xs">
                    {data.tasks.filter((t) => t.completed).length}/{data.tasks.length} Completed
                  </span>
                </div>

                {/* Filter Tabs: Modern Segmented Control Pills */}
                <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#faf8f3] border-b border-[#ede7d8] text-xs">
                  <div className="flex items-center gap-1.5 bg-[#eae2ce]/50 p-1 rounded-xl border border-[#ded5c0]/70">
                    <button
                      type="button"
                      onClick={() => setTaskFilter("all")}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        taskFilter === "all"
                          ? "bg-white text-[#143323] shadow-xs font-bold"
                          : "text-[#527060] hover:text-[#143323]"
                      }`}
                    >
                      All ({data.tasks.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setTaskFilter("done")}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        taskFilter === "done"
                          ? "bg-emerald-700 text-white shadow-xs font-bold"
                          : "text-[#527060] hover:text-[#143323]"
                      }`}
                    >
                      Done ({data.tasks.filter((t) => t.completed).length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setTaskFilter("not_done")}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        taskFilter === "not_done"
                          ? "bg-amber-600 text-white shadow-xs font-bold"
                          : "text-[#527060] hover:text-[#143323]"
                      }`}
                    >
                      Pending ({data.tasks.filter((t) => !t.completed).length})
                    </button>
                  </div>

                  <span className="text-[11px] text-[#8e8574] hidden sm:inline">
                    Tap circle to check off
                  </span>
                </div>

                {/* Tasks List with modern, refined cards */}
                <div className="p-3 space-y-2 max-h-[320px] overflow-y-auto scrollbar-thin">
                  {filteredTasks.length === 0 ? (
                    <div className="py-10 text-center text-xs text-[#8e8574] space-y-2">
                      <div className="w-10 h-10 mx-auto rounded-full bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-800 text-base">
                        ✓
                      </div>
                      <p className="font-semibold text-sm text-[#143323]">
                        {data.tasks.length === 0
                          ? "No tasks yet for today."
                          : `No ${taskFilter === "done" ? "completed" : "pending"} tasks.`}
                      </p>
                      {data.tasks.length === 0 && (
                        <p className="text-[11px] text-[#8e8574]">
                          Add tasks below or tap any quick suggestion to start fresh.
                        </p>
                      )}
                    </div>
                  ) : (
                    filteredTasks.map((task) => (
                      <div
                        key={task.id}
                        className={`group flex items-center justify-between p-2.5 sm:p-3 rounded-xl border transition-all ${
                          task.completed
                            ? "bg-[#f4f8f5]/90 border-emerald-200/80 text-[#527060]"
                            : "bg-white hover:bg-[#fcfaf5] border-[#ded5c0] hover:border-emerald-300 shadow-2xs"
                        }`}
                      >
                        {/* Task text & Circular Custom Checkbox */}
                        <div
                          onClick={() => toggleItem("tasks", task.id)}
                          className="flex items-center gap-3 min-w-0 pr-2 cursor-pointer flex-1 select-none"
                        >
                          {/* Circular Smooth Checkbox */}
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-200 ${
                              task.completed
                                ? "bg-emerald-600 border-emerald-600 text-white shadow-2xs scale-105"
                                : "border-[#c4ba9f] bg-white group-hover:border-emerald-600"
                            }`}
                          >
                            {task.completed && (
                              <svg className="w-3 h-3 text-white stroke-current" fill="none" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>

                          {/* Task Text */}
                          <span
                            className={`text-xs sm:text-sm font-medium transition-all break-words ${
                              task.completed
                                ? "line-through text-neutral-400 font-normal"
                                : "text-[#112a1d]"
                            }`}
                          >
                            {task.text}
                          </span>
                        </div>

                        {/* Status Action & Delete Icon */}
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          {/* Status Pill Toggle */}
                          <button
                            type="button"
                            onClick={() => toggleItem("tasks", task.id)}
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                              task.completed
                                ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300"
                                : "bg-[#faf8f3] text-[#527060] hover:bg-emerald-50 hover:text-emerald-800 border border-[#ded5c0]"
                            }`}
                            title="Toggle status"
                          >
                            {task.completed ? "✓ Done" : "Mark Done"}
                          </button>

                          {/* Delete button on hover */}
                          <button
                            type="button"
                            onClick={() => deleteItem("tasks", task.id)}
                            className="opacity-40 group-hover:opacity-100 text-[#8e8574] hover:text-rose-600 p-1.5 text-xs transition-opacity rounded-lg hover:bg-rose-50 cursor-pointer"
                            title="Delete task"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Quick Add Suggestions Chips */}
                {data.tasks.length === 0 && (
                  <div className="px-3.5 py-2.5 bg-[#faf8f3] border-t border-[#ede7d8] space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#527060] block">
                      Quick Suggestions:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_SUGGESTIONS.map((sug) => (
                        <button
                          key={sug}
                          type="button"
                          onClick={() => handleAddTask(undefined, sug)}
                          className="px-2.5 py-1 rounded-lg border border-[#ded5c0] bg-white hover:bg-emerald-50 hover:border-emerald-300 text-[11px] font-semibold text-[#143323] transition-all cursor-pointer active:scale-95 shadow-2xs"
                        >
                          + {sug}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Add Task Input Form: Modern & Polished */}
              <form onSubmit={(e) => handleAddTask(e)} className="p-3 border-t border-[#ede7d8] bg-[#faf8f3]">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Add a new daily goal or task..."
                      value={newTaskInput}
                      onChange={(e) => setNewTaskInput(e.target.value)}
                      className="w-full bg-white border border-[#ded5c0] rounded-xl px-3.5 py-2 text-xs sm:text-sm text-[#112a1d] focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 placeholder:text-[#8e8574] shadow-2xs transition-all"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer shadow-xs flex items-center gap-1"
                  >
                    <span>+</span>
                    <span>Add</span>
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* RIGHT COLUMN: TOP PRIORITIES (Span 5 on desktop) */}
          <div className="md:col-span-5 flex flex-col space-y-4">
            
            {/* 1. TOP PRIORITIES */}
            <div className="border border-[#ded5c0] rounded-2xl overflow-hidden bg-white shadow-xs">
              <div className="bg-gradient-to-r from-[#143323] to-[#1c4731] text-white px-3.5 py-2.5 flex items-center justify-between">
                <span className="font-bold text-xs uppercase tracking-wider">
                  Top Priorities
                </span>
                <span className="text-[10px] font-bold text-amber-300 bg-amber-400/20 border border-amber-300/30 px-2 py-0.5 rounded-full">
                  High Focus
                </span>
              </div>
              <div className="p-2.5 sm:p-3 divide-y divide-[#f0ede6]">
                {data.priorities.length === 0 ? (
                  <div className="py-4 text-center text-xs text-[#8e8574] italic">
                    No priorities set. Add high-focus goals below.
                  </div>
                ) : (
                  data.priorities.map((item) => (
                    <div
                      key={item.id}
                      className="group flex items-center justify-between py-2 first:pt-0 last:pb-0"
                    >
                      <div
                        onClick={() => toggleItem("priorities", item.id)}
                        className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0 pr-2"
                      >
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                            item.completed
                              ? "bg-amber-600 border-amber-600 text-white"
                              : "border-[#ded5c0] bg-white group-hover:border-amber-600"
                          }`}
                        >
                          {item.completed && (
                            <svg className="w-2.5 h-2.5 text-white stroke-current" fill="none" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span
                          className={`text-xs transition-all ${
                            item.completed
                              ? "line-through text-neutral-400"
                              : "text-[#112a1d] font-medium"
                          }`}
                        >
                          {item.text}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteItem("priorities", item.id)}
                        className="opacity-0 group-hover:opacity-100 text-[#8e8574] hover:text-rose-600 text-xs px-1 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  ))
                )}

                {/* Add priority input */}
                <form onSubmit={handleAddPriority} className="pt-2.5 mt-2 border-t border-[#ede7d8]">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder="Add priority goal..."
                      value={newPriorityInput}
                      onChange={(e) => setNewPriorityInput(e.target.value)}
                      className="w-full bg-[#faf8f3] border border-[#ded5c0] rounded-xl px-2.5 py-1.5 text-xs text-[#112a1d] focus:outline-none focus:border-amber-600 placeholder:text-[#8e8574]"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-bold transition-all shrink-0 cursor-pointer shadow-2xs"
                    >
                      Add
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions: Clear Completed & Reset New Day */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-[#ede7d8]">
          <div className="text-xs text-[#527060] font-medium">
            <span>Tasks auto-clear daily at 12:00 AM.</span>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {/* Clear Completed */}
            <button
              onClick={handleClearCompleted}
              disabled={completedCount === 0}
              className="px-3.5 py-1.5 rounded-xl border border-[#ded5c0] bg-white hover:bg-[#faf7ee] text-xs font-semibold text-[#527060] disabled:opacity-40 transition-all cursor-pointer shadow-2xs"
            >
              Clear Completed
            </button>

            {/* Start New Day */}
            <button
              onClick={handleResetNewDay}
              className="px-4 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
              title="Reset tasks for a new day"
            >
              Start New Day
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
