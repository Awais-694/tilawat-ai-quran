"use client";

import { useEffect, useState } from "react";
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
  reminders: TodoItem[];
  notes: string;
}

const STORAGE_KEY = "tilawat_todo_planner_v1";

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
  reminders: [
    { id: "r1", text: "Perform 5 Daily Prayers on time", completed: false },
    { id: "r2", text: "Make Istighfar & Durood Sharif", completed: false },
  ],
  notes: "رَبِّ زِدْنِي عِلْمًا — O my Lord, increase me in knowledge.",
};

export function TodoListClient() {
  const router = useRouter();
  const [data, setData] = useState<PlannerData>(() => DEFAULT_PLANNER);
  const [loaded, setLoaded] = useState(false);

  // New item inputs
  const [newTaskInput, setNewTaskInput] = useState("");
  const [newPriorityInput, setNewPriorityInput] = useState("");
  const [newReminderInput, setNewReminderInput] = useState("");

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          setData({
            userName: parsed.userName ?? "",
            date: parsed.date || getTodayFormatted(),
            tasks: Array.isArray(parsed.tasks) ? parsed.tasks : DEFAULT_PLANNER.tasks,
            priorities: Array.isArray(parsed.priorities) ? parsed.priorities : DEFAULT_PLANNER.priorities,
            reminders: Array.isArray(parsed.reminders) ? parsed.reminders : DEFAULT_PLANNER.reminders,
            notes: typeof parsed.notes === "string" ? parsed.notes : DEFAULT_PLANNER.notes,
          });
          setLoaded(true);
          return;
        }
      }
    } catch {}
    setData({
      ...DEFAULT_PLANNER,
      date: getTodayFormatted(),
    });
    setLoaded(true);
  }, []);

  // Save to localStorage whenever data changes
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {}
  }, [data, loaded]);

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/streak");
    }
  };

  // Generic toggle
  const toggleItem = (listKey: "tasks" | "priorities" | "reminders", id: string) => {
    setData((prev) => ({
      ...prev,
      [listKey]: prev[listKey].map((it) =>
        it.id === id ? { ...it, completed: !it.completed } : it
      ),
    }));
  };

  // Generic delete
  const deleteItem = (listKey: "tasks" | "priorities" | "reminders", id: string) => {
    setData((prev) => ({
      ...prev,
      [listKey]: prev[listKey].filter((it) => it.id !== id),
    }));
  };

  // Add Task
  const handleAddTask = (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = newTaskInput.trim();
    if (!text) return;
    setData((prev) => ({
      ...prev,
      tasks: [...prev.tasks, { id: `t_${Date.now()}`, text, completed: false }],
    }));
    setNewTaskInput("");
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

  // Add Reminder
  const handleAddReminder = (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = newReminderInput.trim();
    if (!text) return;
    setData((prev) => ({
      ...prev,
      reminders: [...prev.reminders, { id: `r_${Date.now()}`, text, completed: false }],
    }));
    setNewReminderInput("");
  };

  // Quick suggestion chips
  const addSuggestedTask = (text: string) => {
    if (data.tasks.some((t) => t.text === text)) return;
    setData((prev) => ({
      ...prev,
      tasks: [...prev.tasks, { id: `t_${Date.now()}`, text, completed: false }],
    }));
  };

  // Clear completed
  const handleClearCompleted = () => {
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((t) => !t.completed),
      priorities: prev.priorities.filter((p) => !p.completed),
      reminders: prev.reminders.filter((r) => !r.completed),
    }));
  };

  // Reset for a new day
  const handleResetNewDay = () => {
    if (typeof window !== "undefined" && !window.confirm("Start a new day? This will uncheck all tasks and update today's date.")) {
      return;
    }
    setData((prev) => ({
      ...prev,
      date: getTodayFormatted(),
      tasks: prev.tasks.map((t) => ({ ...t, completed: false })),
      priorities: prev.priorities.map((p) => ({ ...p, completed: false })),
      reminders: prev.reminders.map((r) => ({ ...r, completed: false })),
    }));
  };

  // Stats
  const allItems = [...data.tasks, ...data.priorities, ...data.reminders];
  const totalCount = allItems.length;
  const completedCount = allItems.filter((i) => i.completed).length;
  const completionPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-16 px-2 sm:px-0">
      {/* Top Header & Navigation Bar */}
      <div className="flex items-center justify-between border-b border-[#ede7d8] pb-3">
        <button
          onClick={handleBack}
          className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-[#193d2b] bg-white hover:bg-[#efe9d8] border border-[#d6cbaf] shadow-xs active:scale-95 transition-all cursor-pointer"
        >
          <span>←</span>
          <span className="ml-1">Back</span>
        </button>

        <div className="flex items-center gap-1.5">
          <span className="text-xs sm:text-sm font-bold text-[#112a1d]">Daily Task Planner</span>
          <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
            {completedCount}/{totalCount} Done ({completionPct}%)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/streak"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 shadow-2xs active:scale-95 transition-all"
          >
            <span>🔥</span>
            <span className="hidden sm:inline">Streak</span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#193d2b] bg-[#f0ebd9] hover:bg-[#e4dcce] border border-[#ded5c0] shadow-2xs active:scale-95 transition-all"
          >
            <span>Dashboard</span>
          </Link>
        </div>
      </div>

      {/* Main Printable / Planner Sheet Card */}
      <div className="bg-[#fffefb] border-2 border-[#202020] rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-[0_8px_30px_rgba(0,0,0,0.06)] space-y-5">
        
        {/* Planner Header: TO-DO LIST and Name/Date Box */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b-2 border-[#202020] pb-4">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-black text-[#151515] tracking-tight uppercase">
              TO-DO LIST
            </h1>
            <p className="text-xs sm:text-sm text-[#455048] font-medium mt-0.5">
              Daily Quran, Tilawat & Islamic Habit Tracker
            </p>
          </div>

          {/* Name & Date Table Box */}
          <div className="w-full sm:w-64 border-2 border-[#202020] rounded-lg overflow-hidden bg-white text-xs divide-y-2 divide-[#202020]">
            <div className="flex items-center px-2.5 py-1 gap-2">
              <span className="font-bold text-[#151515] uppercase w-12 shrink-0 text-[11px]">Name:</span>
              <input
                type="text"
                placeholder="Enter name..."
                value={data.userName}
                onChange={(e) => setData({ ...data, userName: e.target.value })}
                className="w-full bg-transparent font-medium text-[#112a1d] focus:outline-none placeholder:text-gray-400 text-xs py-0.5"
              />
            </div>
            <div className="flex items-center px-2.5 py-1 gap-2">
              <span className="font-bold text-[#151515] uppercase w-12 shrink-0 text-[11px]">Date:</span>
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
          
          {/* LEFT COLUMN: TASK LIST (Span 7 on desktop) */}
          <div className="md:col-span-7 flex flex-col space-y-3">
            {/* Header Banner */}
            <div className="bg-[#112a1d] text-white px-3 py-2 rounded-t-lg flex items-center justify-between">
              <span className="font-black text-xs sm:text-sm uppercase tracking-wider">
                TASK LIST
              </span>
              <span className="text-[11px] font-semibold opacity-90 text-emerald-200">
                {data.tasks.filter((t) => t.completed).length}/{data.tasks.length}
              </span>
            </div>

            {/* Tasks Container */}
            <div className="border-2 border-[#202020] rounded-b-lg -mt-3 bg-white p-2 sm:p-3 divide-y divide-gray-200 min-h-[360px] flex flex-col justify-between">
              <div className="space-y-0.5 divide-y divide-gray-150">
                {data.tasks.length === 0 ? (
                  <div className="py-8 text-center text-xs text-gray-400 italic">
                    No tasks yet. Add your daily tasks below.
                  </div>
                ) : (
                  data.tasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => toggleItem("tasks", task.id)}
                      className={`group flex items-center justify-between py-2 px-1.5 rounded-md hover:bg-emerald-50/50 cursor-pointer transition-colors ${
                        task.completed ? "bg-gray-50/80" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        {/* Clean Square Checkbox */}
                        <div
                          className={`w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-sm border-2 flex items-center justify-center shrink-0 transition-all ${
                            task.completed
                              ? "bg-emerald-700 border-emerald-700 text-white"
                              : "border-[#202020] bg-white group-hover:border-emerald-700"
                          }`}
                        >
                          {task.completed && (
                            <svg className="w-3 h-3 text-white stroke-current" fill="none" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>

                        {/* Task Text */}
                        <span
                          className={`text-xs sm:text-sm font-medium transition-all select-none break-words ${
                            task.completed
                              ? "line-through text-gray-400 font-normal"
                              : "text-[#151515]"
                          }`}
                        >
                          {task.text}
                        </span>
                      </div>

                      {/* Delete Button on Hover */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteItem("tasks", task.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-rose-600 p-1 text-xs transition-opacity"
                        title="Delete task"
                      >
                        ✕
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Add Task Input Form */}
              <form onSubmit={handleAddTask} className="pt-3 mt-2 border-t-2 border-dashed border-gray-200">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="+ Add new task..."
                    value={newTaskInput}
                    onChange={(e) => setNewTaskInput(e.target.value)}
                    className="flex-1 bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm text-[#112a1d] focus:outline-none focus:border-emerald-600 focus:bg-white"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg bg-[#112a1d] hover:bg-emerald-900 text-white text-xs font-bold transition-all shrink-0 cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </form>
            </div>

            {/* Quick Suggestion Chips */}
            <div className="pt-1">
              <span className="text-[11px] font-bold text-[#55695c] uppercase tracking-wider block mb-1.5">
                Suggested Quran & Islamic Habits:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "Tilawat 1 Juz",
                  "Surah Al-Kahf (جمعة)",
                  "Read Urdu Translation",
                  "Morning Adhkar",
                  "Evening Adhkar",
                  "Surah Yaseen",
                  "Tadabbur on 5 Ayahs",
                ].map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => addSuggestedTask(sug)}
                    className="text-[10px] sm:text-[11px] font-medium px-2 py-0.5 rounded-md bg-[#faf7ee] hover:bg-emerald-100 text-[#193d2b] border border-[#d6cbaf] hover:border-emerald-400 transition-all cursor-pointer"
                  >
                    + {sug}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: PRIORITIES, REMINDERS, NOTES (Span 5 on desktop) */}
          <div className="md:col-span-5 flex flex-col space-y-4">
            
            {/* 1. TOP PRIORITIES */}
            <div className="flex flex-col">
              <div className="bg-[#112a1d] text-white px-3 py-2 rounded-t-lg flex items-center justify-between">
                <span className="font-black text-xs sm:text-sm uppercase tracking-wider">
                  TOP PRIORITIES
                </span>
                <span className="text-[11px] font-semibold opacity-90 text-amber-300">★ High Focus</span>
              </div>
              <div className="border-2 border-[#202020] rounded-b-lg -mt-3 bg-white p-2.5 divide-y divide-gray-150">
                <div className="space-y-0.5 min-h-[90px]">
                  {data.priorities.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => toggleItem("priorities", item.id)}
                      className={`group flex items-center justify-between py-1.5 px-1 rounded-md hover:bg-amber-50/50 cursor-pointer transition-colors ${
                        item.completed ? "bg-gray-50" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <div
                          className={`w-4 h-4 rounded-sm border-2 flex items-center justify-center shrink-0 ${
                            item.completed
                              ? "bg-amber-600 border-amber-600 text-white"
                              : "border-[#202020] bg-white group-hover:border-amber-600"
                          }`}
                        >
                          {item.completed && (
                            <svg className="w-2.5 h-2.5 text-white stroke-current" fill="none" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span
                          className={`text-xs font-semibold truncate ${
                            item.completed ? "line-through text-gray-400" : "text-[#151515]"
                          }`}
                        >
                          {item.text}
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteItem("priorities", item.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-rose-600 p-0.5 text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleAddPriority} className="pt-2 mt-1">
                  <input
                    type="text"
                    placeholder="+ Add priority..."
                    value={newPriorityInput}
                    onChange={(e) => setNewPriorityInput(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded px-2 py-1 text-xs text-[#112a1d] focus:outline-none focus:border-amber-600"
                  />
                </form>
              </div>
            </div>

            {/* 2. REMINDER */}
            <div className="flex flex-col">
              <div className="bg-[#112a1d] text-white px-3 py-2 rounded-t-lg flex items-center justify-between">
                <span className="font-black text-xs sm:text-sm uppercase tracking-wider">
                  REMINDER
                </span>
                <span className="text-[11px] font-semibold opacity-90 text-sky-300">⏰ Daily</span>
              </div>
              <div className="border-2 border-[#202020] rounded-b-lg -mt-3 bg-white p-2.5 divide-y divide-gray-150">
                <div className="space-y-0.5 min-h-[90px]">
                  {data.reminders.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => toggleItem("reminders", item.id)}
                      className={`group flex items-center justify-between py-1.5 px-1 rounded-md hover:bg-sky-50/50 cursor-pointer transition-colors ${
                        item.completed ? "bg-gray-50" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <div
                          className={`w-4 h-4 rounded-sm border-2 flex items-center justify-center shrink-0 ${
                            item.completed
                              ? "bg-sky-600 border-sky-600 text-white"
                              : "border-[#202020] bg-white group-hover:border-sky-600"
                          }`}
                        >
                          {item.completed && (
                            <svg className="w-2.5 h-2.5 text-white stroke-current" fill="none" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span
                          className={`text-xs font-medium truncate ${
                            item.completed ? "line-through text-gray-400" : "text-[#151515]"
                          }`}
                        >
                          {item.text}
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteItem("reminders", item.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-rose-600 p-0.5 text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleAddReminder} className="pt-2 mt-1">
                  <input
                    type="text"
                    placeholder="+ Add reminder..."
                    value={newReminderInput}
                    onChange={(e) => setNewReminderInput(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded px-2 py-1 text-xs text-[#112a1d] focus:outline-none focus:border-sky-600"
                  />
                </form>
              </div>
            </div>

            {/* 3. NOTES */}
            <div className="flex flex-col">
              <div className="bg-[#112a1d] text-white px-3 py-2 rounded-t-lg flex items-center justify-between">
                <span className="font-black text-xs sm:text-sm uppercase tracking-wider">
                  NOTES / REFLECTIONS
                </span>
                <span className="text-[10px] text-gray-300 font-normal">Autosaves</span>
              </div>
              <div className="border-2 border-[#202020] rounded-b-lg -mt-3 bg-white p-2.5">
                <textarea
                  rows={4}
                  placeholder="Jot down Tadabbur thoughts, Ayah notes, or daily reflections here..."
                  value={data.notes}
                  onChange={(e) => setData({ ...data, notes: e.target.value })}
                  className="w-full bg-[#fdfaf3] border border-gray-200 rounded-lg p-2 text-xs text-[#112a1d] leading-relaxed focus:outline-none focus:border-emerald-600 focus:bg-white resize-y"
                />
              </div>
            </div>

          </div>
        </div>

        {/* Footer Actions: Clear & Reset */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t-2 border-[#202020]">
          <div className="text-xs text-gray-500 font-medium">
            Saved on your device automatically.
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClearCompleted}
              disabled={completedCount === 0}
              className="px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-100 text-xs font-semibold text-gray-700 disabled:opacity-40 transition-all cursor-pointer"
            >
              Clear Completed
            </button>
            <button
              onClick={handleResetNewDay}
              className="px-3 py-1.5 rounded-lg bg-[#112a1d] hover:bg-emerald-900 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              Start New Day ↺
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
