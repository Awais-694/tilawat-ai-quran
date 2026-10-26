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
  notes: string;
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
  notes: "رَبِّ زِدْنِي عِلْمًا — O my Lord, increase me in knowledge.",
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
  const [noteSavedFeedback, setNoteSavedFeedback] = useState(false);

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
          notes: parsedData?.notes || "",
        };

        setData(freshDayPlanner);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(freshDayPlanner));
        localStorage.setItem(STORAGE_LAST_DATE_KEY, todayIso);
        showToast("🌙 12:00 AM: نیا دن شروع ہو گیا ہے! پچھلا ریکارڈ محفوظ کر کے لسٹ ری سیٹ کر دی گئی ہے۔");
      } else {
        // Same day or first visit
        if (parsedData && typeof parsedData === "object") {
          setData({
            userName: parsedData.userName ?? "",
            date: parsedData.date || getTodayFormatted(),
            tasks: Array.isArray(parsedData.tasks) ? parsedData.tasks : DEFAULT_PLANNER.tasks,
            priorities: Array.isArray(parsedData.priorities) ? parsedData.priorities : DEFAULT_PLANNER.priorities,
            notes: typeof parsedData.notes === "string" ? parsedData.notes : DEFAULT_PLANNER.notes,
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
            notes: current.notes,
          };

          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(resetPlanner));
            const newIso = getTodayIsoDate();
            localStorage.setItem(STORAGE_LAST_DATE_KEY, newIso);
          } catch {}

          showToast("🌙 رات کے 12 بج گئے ہیں! آج کی کارکردگی محفوظ ہو گئی اور نئے دن کے لیے ٹاسک لسٹ تیار ہے۔");
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

  // Explicit set item status (Done / Not Done)
  const setItemStatus = (listKey: "tasks" | "priorities", id: string, completed: boolean) => {
    setData((prev) => ({
      ...prev,
      [listKey]: prev[listKey].map((it) =>
        it.id === id ? { ...it, completed } : it
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

  // Save Note button
  const handleSaveNote = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setNoteSavedFeedback(true);
      setTimeout(() => setNoteSavedFeedback(false), 2500);
      showToast("Note saved successfully!");
    } catch {}
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
      shortDate: string;
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
      const shortDate = d.toLocaleDateString("en-US", { month: "numeric", day: "numeric" });
      const isToday = iso === todayIso;

      if (isToday) {
        // Use live real-time state for today
        list.push({
          date: iso,
          dayLabel,
          shortDate,
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
          shortDate,
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

      {/* PERFORMANCE PERCENTAGE SECTION: DAILY (ROZANA) & WEEKLY (HAR WEEK) */}
      <div className="bg-white border border-[#ded5c0] rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#ede7d8] pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">📊</span>
            <div>
              <h2 className="font-bold text-sm sm:text-base text-[#112a1d]">
                Task Performance & Completion
              </h2>
              <p className="text-[11px] text-[#527060]">
                Automatic 12:00 AM midnight reset • Real-time daily & weekly tracking
              </p>
            </div>
          </div>
          <span className="self-start sm:self-auto text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1">
            <span>⏱️</span>
            <span>Resets at 12:00 AM Daily</span>
          </span>
        </div>

        {/* 2-Card Metric Overview: Today vs This Week */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* 1. Today's Percentage Card */}
          <div className="bg-gradient-to-br from-[#faf8f3] to-[#f4ede0] border border-[#ded5c0] rounded-2xl p-3.5 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#143323] uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                <span>Today's Performance (روزانہ)</span>
              </span>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  todayPercentage === 100
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                    : todayPercentage >= 50
                    ? "bg-amber-100 text-amber-800 border border-amber-300"
                    : "bg-neutral-100 text-neutral-700"
                }`}
              >
                {todayPercentage === 100
                  ? "ماشاء اللہ! Done"
                  : todayPercentage > 0
                  ? "In Progress"
                  : "Not Started"}
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold text-[#112a1d] tracking-tight">
                {todayPercentage}%
              </span>
              <span className="text-xs text-[#527060] font-medium">
                ({completedCount} of {totalCount} tasks completed)
              </span>
            </div>

            {/* Linear Progress Bar */}
            <div className="w-full bg-[#e8e0cc] h-2.5 rounded-full overflow-hidden p-0.5 border border-[#ded5c0]">
              <div
                className="bg-gradient-to-r from-emerald-600 to-teal-500 h-full rounded-full transition-all duration-500 shadow-2xs"
                style={{ width: `${Math.max(todayPercentage, 0)}%` }}
              />
            </div>
          </div>

          {/* 2. Weekly Percentage Card */}
          <div className="bg-gradient-to-br from-[#faf8f3] to-[#f4ede0] border border-[#ded5c0] rounded-2xl p-3.5 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#143323] uppercase tracking-wider flex items-center gap-1.5">
                <span>📅</span>
                <span>Weekly Average (ہر ہفتے)</span>
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-200">
                Last 7 Days
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold text-emerald-900 tracking-tight">
                {weeklyPercentage}%
              </span>
              <span className="text-xs text-[#527060] font-medium">
                7-day average score
              </span>
            </div>

            {/* Linear Progress Bar */}
            <div className="w-full bg-[#e8e0cc] h-2.5 rounded-full overflow-hidden p-0.5 border border-[#ded5c0]">
              <div
                className="bg-gradient-to-r from-emerald-800 to-emerald-600 h-full rounded-full transition-all duration-500 shadow-2xs"
                style={{ width: `${Math.max(weeklyPercentage, 0)}%` }}
              />
            </div>
          </div>
        </div>

        {/* 7-Day Day-by-Day Mini Performance Breakdown */}
        <div className="pt-1">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-[11px] font-bold text-[#527060] uppercase tracking-wider">
              Weekly Breakdown (روزانہ کی کارکردگی):
            </span>
            <span className="text-[10px] text-[#8e8574]">
              Hover or tap a day to see score
            </span>
          </div>

          <div className="grid grid-cols-7 gap-1.5 text-center">
            {last7Days.map((d) => (
              <div
                key={d.date}
                className={`p-2 rounded-xl border transition-all ${
                  d.isToday
                    ? "bg-emerald-50/90 border-emerald-400 ring-1 ring-emerald-300"
                    : d.hasData
                    ? "bg-[#faf8f3] border-[#ded5c0]"
                    : "bg-[#f5f1e6]/60 border-[#eae3d2]"
                }`}
              >
                <div className="text-[10px] font-bold text-[#143323] truncate">
                  {d.dayLabel}
                </div>
                <div className="text-[9px] text-[#8e8574] truncate mb-1">
                  {d.shortDate}
                </div>

                {/* Vertical mini bar */}
                <div className="w-full bg-[#ede5d1] h-10 rounded-lg overflow-hidden flex flex-col justify-end p-0.5 border border-[#ded5c0]/60 my-1">
                  <div
                    className={`w-full rounded transition-all duration-500 ${
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

                <div
                  className={`text-[10px] font-bold ${
                    d.isToday
                      ? "text-emerald-900"
                      : d.hasData
                      ? "text-[#112a1d]"
                      : "text-neutral-400"
                  }`}
                >
                  {d.hasData ? `${d.percentage}%` : "–"}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Printable / Planner Sheet Card */}
      <div className="bg-white border border-[#ded5c0] rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm space-y-5">
        
        {/* Planner Header: Title & Name/Date Box */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-[#ede7d8] pb-4">
          <div className="space-y-1">
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#112a1d] tracking-tight">
              Daily Task
            </h1>
            <p className="text-xs sm:text-sm text-[#527060] font-medium">
              Daily Tilawat checklist, priorities & reflection notes
            </p>
          </div>

          {/* Name & Date Table Box */}
          <div className="w-full sm:w-64 border border-[#ded5c0] rounded-xl overflow-hidden bg-[#faf8f3] text-xs divide-y divide-[#ded5c0] shadow-2xs">
            <div className="flex items-center px-3 py-1.5 gap-2">
              <span className="font-bold text-[#143323] uppercase w-12 shrink-0 text-[11px]">Name:</span>
              <input
                type="text"
                placeholder="Enter name..."
                value={data.userName}
                onChange={(e) => setData({ ...data, userName: e.target.value })}
                className="w-full bg-transparent font-medium text-[#112a1d] focus:outline-none placeholder:text-gray-400 text-xs py-0.5"
              />
            </div>
            <div className="flex items-center px-3 py-1.5 gap-2">
              <span className="font-bold text-[#143323] uppercase w-12 shrink-0 text-[11px]">Date:</span>
              <input
                type="text"
                value={data.date}
                onChange={(e) => setData({ ...data, date: e.target.value })}
                className="w-full bg-transparent font-medium text-[#112a1d] focus:outline-none text-xs py-0.5"
              />
            </div>
          </div>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          
          {/* LEFT COLUMN: TODAY'S CHECKLIST (Span 7 on desktop) */}
          <div className="md:col-span-7 flex flex-col space-y-3">
            {/* Tasks Container */}
            <div className="border border-[#ded5c0] rounded-2xl overflow-hidden bg-white shadow-2xs flex flex-col justify-between">
              <div>
                {/* Header Banner */}
                <div className="bg-gradient-to-r from-[#143323] via-[#1a442f] to-[#143323] text-white px-4 py-2.5 flex items-center justify-between">
                  <span className="font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-emerald-300" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    <span>Today's Checklist</span>
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-100 bg-white/10 border border-white/10 px-2 py-0.5 rounded-full">
                    {data.tasks.filter((t) => t.completed).length}/{data.tasks.length} Completed
                  </span>
                </div>

                {/* Filter Tabs: All, Done, Not Done */}
                <div className="flex items-center gap-1 px-3 py-2 bg-[#faf8f3] border-b border-[#ede7d8] text-[11px] font-semibold">
                  <span className="text-[#8e8574] mr-1 text-[10px] uppercase tracking-wider">Filter:</span>
                  <button
                    type="button"
                    onClick={() => setTaskFilter("all")}
                    className={`px-2.5 py-0.5 rounded-lg transition-all cursor-pointer ${
                      taskFilter === "all"
                        ? "bg-[#143323] text-white shadow-2xs"
                        : "text-[#527060] hover:bg-[#ede7d8]"
                    }`}
                  >
                    All ({data.tasks.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaskFilter("done")}
                    className={`px-2.5 py-0.5 rounded-lg transition-all cursor-pointer ${
                      taskFilter === "done"
                        ? "bg-emerald-700 text-white shadow-2xs"
                        : "text-[#527060] hover:bg-emerald-50"
                    }`}
                  >
                    Done ({data.tasks.filter((t) => t.completed).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaskFilter("not_done")}
                    className={`px-2.5 py-0.5 rounded-lg transition-all cursor-pointer ${
                      taskFilter === "not_done"
                        ? "bg-amber-600 text-white shadow-2xs"
                        : "text-[#527060] hover:bg-amber-50"
                    }`}
                  >
                    Not Done ({data.tasks.filter((t) => !t.completed).length})
                  </button>
                </div>

                {/* Tasks List with internal inside scrolling (fixed height container) */}
                <div className="p-2 sm:p-3 space-y-1.5 max-h-[300px] overflow-y-auto scrollbar-thin">
                  {filteredTasks.length === 0 ? (
                    <div className="py-8 text-center text-xs text-[#8e8574] space-y-2">
                      <p className="font-semibold text-[#143323]">
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
                        className={`group flex items-center justify-between py-2 px-2.5 rounded-xl hover:bg-[#fbf9f4] border border-[#ede7d8]/60 transition-all ${
                          task.completed ? "bg-[#f5f8f5]/80" : "bg-white"
                        }`}
                      >
                        {/* Task text & Checkbox */}
                        <div
                          onClick={() => toggleItem("tasks", task.id)}
                          className="flex items-center gap-2.5 min-w-0 pr-2 cursor-pointer flex-1"
                        >
                          <div
                            className={`w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                              task.completed
                                ? "bg-emerald-700 border-emerald-700 text-white shadow-2xs"
                                : "border-[#c4ba9f] bg-white group-hover:border-emerald-700"
                            }`}
                          >
                            {task.completed && (
                              <svg className="w-3 h-3 text-white stroke-current" fill="none" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>

                          <span
                            className={`text-xs sm:text-sm font-medium transition-all select-none break-words ${
                              task.completed
                                ? "line-through text-neutral-400 font-normal"
                                : "text-[#112a1d]"
                            }`}
                          >
                            {task.text}
                          </span>
                        </div>

                        {/* Status Options: Done & Not Done buttons + Delete button */}
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          <button
                            type="button"
                            onClick={() => setItemStatus("tasks", task.id, true)}
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                              task.completed
                                ? "bg-emerald-700 text-white shadow-2xs"
                                : "bg-neutral-100 text-neutral-600 hover:bg-emerald-50 hover:text-emerald-700"
                            }`}
                            title="Mark as Done"
                          >
                            Done
                          </button>
                          <button
                            type="button"
                            onClick={() => setItemStatus("tasks", task.id, false)}
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                              !task.completed
                                ? "bg-amber-600 text-white shadow-2xs"
                                : "bg-neutral-100 text-neutral-600 hover:bg-amber-50 hover:text-amber-700"
                            }`}
                            title="Mark as Not Done"
                          >
                            Not Done
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteItem("tasks", task.id)}
                            className="opacity-0 group-hover:opacity-100 text-[#8e8574] hover:text-rose-600 p-1 text-xs transition-opacity rounded-md hover:bg-rose-50"
                            title="Delete task"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Quick Add Suggestions Chips */}
                {data.tasks.length === 0 && (
                  <div className="px-3 py-2 bg-[#faf8f3] border-t border-[#ede7d8] space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#527060] block">
                      Quick Suggestions (ایک کلک پر شامل کریں):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_SUGGESTIONS.map((sug) => (
                        <button
                          key={sug}
                          type="button"
                          onClick={() => handleAddTask(undefined, sug)}
                          className="px-2 py-1 rounded-lg border border-[#ded5c0] bg-white hover:bg-emerald-50 hover:border-emerald-300 text-[11px] font-semibold text-[#143323] transition-all cursor-pointer active:scale-95"
                        >
                          + {sug}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Add Task Input Form */}
              <form onSubmit={(e) => handleAddTask(e)} className="p-3 border-t border-[#ede7d8] bg-[#faf8f3]">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="+ Add new task (e.g. Surah Mulk before sleep)..."
                    value={newTaskInput}
                    onChange={(e) => setNewTaskInput(e.target.value)}
                    className="flex-1 bg-white border border-[#ded5c0] rounded-xl px-3 py-1.5 text-xs sm:text-sm text-[#112a1d] focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 placeholder:text-[#8e8574]"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white text-xs font-bold transition-all shrink-0 cursor-pointer shadow-2xs"
                  >
                    Add
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* RIGHT COLUMN: PRIORITIES & NOTES (Span 5 on desktop) */}
          <div className="md:col-span-5 flex flex-col space-y-4">
            
            {/* 1. TOP PRIORITIES */}
            <div className="border border-[#ded5c0] rounded-2xl overflow-hidden bg-white shadow-2xs">
              <div className="bg-gradient-to-r from-[#143323] to-[#1c4731] text-white px-3.5 py-2 flex items-center justify-between">
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
                      className="group flex items-center justify-between py-1.5 first:pt-0 last:pb-0"
                    >
                      <div
                        onClick={() => toggleItem("priorities", item.id)}
                        className="flex items-center gap-2 cursor-pointer flex-1 min-w-0 pr-2"
                      >
                        <div
                          className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-all ${
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
                        className="opacity-0 group-hover:opacity-100 text-[#8e8574] hover:text-rose-600 text-xs px-1"
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
                      className="w-full bg-[#faf8f3] border border-[#ded5c0] rounded-xl px-2.5 py-1 text-xs text-[#112a1d] focus:outline-none focus:border-amber-600 placeholder:text-[#8e8574]"
                    />
                    <button
                      type="submit"
                      className="px-2.5 py-1 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-bold transition-all shrink-0 cursor-pointer shadow-2xs"
                    >
                      Add
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* 2. NOTES & REFLECTIONS */}
            <div className="border border-[#ded5c0] rounded-2xl overflow-hidden bg-white shadow-2xs">
              <div className="bg-gradient-to-r from-[#143323] to-[#1c4731] text-white px-3.5 py-2 flex items-center justify-between">
                <span className="font-bold text-xs uppercase tracking-wider">
                  Notes & Reflections
                </span>
                <span className="text-[10px] text-emerald-200/90 font-medium">Autosaves</span>
              </div>
              <div className="p-2.5 sm:p-3 space-y-2">
                <textarea
                  rows={4}
                  placeholder="Jot down Tadabbur thoughts, Ayah notes, or daily reflections here..."
                  value={data.notes}
                  onChange={(e) => setData({ ...data, notes: e.target.value })}
                  className="w-full bg-[#faf8f2] border border-[#ded5c0] rounded-xl p-2.5 text-xs text-[#112a1d] leading-relaxed focus:outline-none focus:border-emerald-600 focus:bg-white focus:ring-1 focus:ring-emerald-600 resize-y transition-all placeholder:text-[#8e8574]"
                />
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[#527060]">
                    {noteSavedFeedback ? "✓ Note saved!" : "Click Add Note to confirm"}
                  </span>
                  <button
                    type="button"
                    onClick={handleSaveNote}
                    className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white text-xs font-bold transition-all cursor-pointer shadow-2xs"
                  >
                    Add Note
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Footer Actions: Clear Completed & Reset New Day */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-[#ede7d8]">
          <div className="flex items-center gap-2 text-xs text-[#527060] font-medium">
            <span>Saved on your device automatically. Tasks auto-clear at 12:00 AM midnight.</span>
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
              Start New Day ↺
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
