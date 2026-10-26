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
  notes: "رَبِّ زِدْنِي عِلْمًا — O my Lord, increase me in knowledge.",
};

export function TodoListClient() {
  const router = useRouter();
  const [data, setData] = useState<PlannerData>(() => DEFAULT_PLANNER);
  const [loaded, setLoaded] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  // Filter for tasks list: "all" | "done" | "not_done"
  const [taskFilter, setTaskFilter] = useState<"all" | "done" | "not_done">("all");

  // New item inputs
  const [newTaskInput, setNewTaskInput] = useState("");
  const [newPriorityInput, setNewPriorityInput] = useState("");
  const [noteSavedFeedback, setNoteSavedFeedback] = useState(false);

  // Load planner from localStorage on mount
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
            notes: typeof parsed.notes === "string" ? parsed.notes : DEFAULT_PLANNER.notes,
          });
        }
      } else {
        setData({
          ...DEFAULT_PLANNER,
          date: getTodayFormatted(),
        });
      }
    } catch {}
    setLoaded(true);
  }, []);

  // Save to localStorage whenever planner data changes
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {}
  }, [data, loaded]);

  const showToast = (msg: string) => {
    setStatusFeedback(msg);
    setTimeout(() => {
      setStatusFeedback(null);
    }, 3500);
  };

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/streak");
    }
  };

  // Generic toggle
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

  // Reset for a new day
  const handleResetNewDay = () => {
    if (typeof window !== "undefined") {
      const confirmMsg = "Start a new day? All daily tasks will be reset to unchecked.";
      if (!window.confirm(confirmMsg)) return;
    }

    setData((prev) => ({
      ...prev,
      date: getTodayFormatted(),
      tasks: prev.tasks.map((t) => ({ ...t, completed: false })),
      priorities: prev.priorities.map((p) => ({ ...p, completed: false })),
    }));

    showToast("New day started! Tasks reset.");
  };

  // Stats
  const allItems = [...data.tasks, ...data.priorities];
  const totalCount = allItems.length;
  const completedCount = allItems.filter((i) => i.completed).length;
  const allTasksCompleted = data.tasks.length > 0 && data.tasks.every((t) => t.completed);

  // Filtered task items
  const filteredTasks = data.tasks.filter((t) => {
    if (taskFilter === "done") return t.completed;
    if (taskFilter === "not_done") return !t.completed;
    return true;
  });

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

      {/* Main Printable / Planner Sheet Card */}
      <div className="bg-white border border-[#ded5c0] rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm space-y-5">
        
        {/* Planner Header: Title & Name/Date Box */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-[#ede7d8] pb-4">
          <div className="space-y-1">
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#112a1d] tracking-tight">
              Daily Task
            </h1>
            <p className="text-xs sm:text-sm text-[#527060] font-medium">
              Daily Tilawat checklist, priorities, reminders & reflection notes
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
                    <div className="py-10 text-center text-xs text-[#8e8574] italic">
                      {data.tasks.length === 0
                        ? "No tasks yet. Add your daily recitation tasks below."
                        : `No ${taskFilter === "done" ? "completed" : "pending"} tasks right now.`}
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
              </div>

              {/* Add Task Input Form */}
              <form onSubmit={handleAddTask} className="p-3 border-t border-[#ede7d8] bg-[#faf8f3]">
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

          {/* RIGHT COLUMN: PRIORITIES, REMINDERS, NOTES (Span 5 on desktop) */}
          <div className="md:col-span-5 flex flex-col space-y-4">
            
            {/* 1. TOP PRIORITIES (Icon removed, Add button added) */}
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
                <div className="space-y-1 min-h-[70px] max-h-[140px] overflow-y-auto scrollbar-thin pr-1">
                  {data.priorities.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => toggleItem("priorities", item.id)}
                      className={`group flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-amber-50/50 cursor-pointer transition-colors ${
                        item.completed ? "bg-gray-50/80" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <div
                          className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                            item.completed
                              ? "bg-amber-600 border-amber-600 text-white"
                              : "border-[#c4ba9f] bg-white group-hover:border-amber-600"
                          }`}
                        >
                          {item.completed && (
                            <svg className="w-2.5 h-2.5 text-white stroke-current" fill="none" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span
                          className={`text-xs font-medium truncate ${
                            item.completed ? "line-through text-neutral-400 font-normal" : "text-[#112a1d]"
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
                        className="opacity-0 group-hover:opacity-100 text-[#8e8574] hover:text-rose-600 p-0.5 text-xs transition-opacity rounded"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                {/* Form with Add button */}
                <form onSubmit={handleAddPriority} className="pt-2 mt-1">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder="+ Add priority..."
                      value={newPriorityInput}
                      onChange={(e) => setNewPriorityInput(e.target.value)}
                      className="flex-1 bg-[#faf8f3] border border-[#ded5c0] rounded-xl px-2.5 py-1.5 text-xs text-[#112a1d] focus:outline-none focus:border-amber-600 focus:bg-white placeholder:text-[#8e8574]"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white text-xs font-bold transition-all shrink-0 cursor-pointer shadow-2xs"
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
            <span>Saved on your device automatically.</span>
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
