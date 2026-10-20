"use client";

import { useState } from "react";

export function FeedbackPanel({
  lastHeard,
  mistakes,
  revealed,
  total,
  listening,
  activeEngine,
}: {
  lastHeard: string;
  mistakes: number;
  revealed: number;
  total: number;
  listening: boolean;
  activeEngine: string;
}) {
  const [open, setOpen] = useState(false);
  const pct = total ? Math.round((revealed / total) * 100) : 0;
  const isWhisper = activeEngine === "whisper";

  if (!open) {
    return (
      <div className="flex justify-center mt-1.5 mb-3">
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium text-emerald-300/70 hover:text-emerald-200 bg-emerald-950/30 hover:bg-emerald-900/40 border border-emerald-500/15 backdrop-blur-md active:scale-95 transition-all cursor-pointer"
          title="Click to view voice recognition status and heard text"
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              listening ? "bg-emerald-400 animate-pulse" : "bg-emerald-600/70"
            }`}
          />
          <span className="font-medium text-[11px]">
            {listening ? "Live Voice Active" : "Voice Status"}
          </span>
          <span className="text-emerald-400/50 font-mono text-[10px]">
            ({revealed}/{total})
          </span>
          <svg className="w-3 h-3 text-emerald-400/60 ml-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#0b1a13]/90 backdrop-blur-md border border-emerald-800/60 rounded-2xl p-3 sm:p-3.5 shadow-lg text-emerald-100 mt-4 mb-8 transition-all">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-300/80 mb-2 border-b border-emerald-900/50 pb-2">
        <div className="flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              listening ? "bg-emerald-400 animate-pulse" : "bg-emerald-800"
            }`}
          />
          <span className="font-semibold tracking-wide text-white">
            {listening ? "Live Voice Input" : "Microphone Idle"}
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
              isWhisper
                ? "bg-amber-950/60 text-amber-300 border-amber-800/60"
                : "bg-emerald-950/80 text-emerald-300 border-emerald-700/60"
            }`}
          >
            {isWhisper ? "Offline Whisper (GPU)" : "Online Web Speech (Instant)"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-md bg-emerald-950/70 border border-emerald-800/60 text-emerald-200 font-mono text-[11px]">
            {revealed} / {total} words ({pct}%)
          </span>
          {mistakes > 0 && (
            <span className="px-2 py-0.5 rounded-md bg-rose-950/70 border border-rose-800/60 text-rose-300 text-[11px]">
              {mistakes} {mistakes === 1 ? "correction" : "corrections"}
            </span>
          )}

          {/* Hide / Collapse Button */}
          <button
            onClick={() => setOpen(false)}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300 hover:text-white bg-emerald-950/70 hover:bg-emerald-900/70 border border-emerald-800/60 px-2 py-0.5 rounded-md transition-all active:scale-95 cursor-pointer ml-1"
            title="Hide status panel to reduce scrolling"
          >
            <span>Hide</span>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
            </svg>
          </button>
        </div>
      </div>

      <div
        dir="rtl"
        className="font-quran text-base sm:text-lg text-emerald-100 leading-relaxed min-h-[2rem] flex items-center justify-end px-1"
      >
        {lastHeard ? (
          <span className="drop-shadow-sm text-emerald-200">{lastHeard}</span>
        ) : (
          <span className="text-emerald-400/50 text-xs sm:text-sm font-sans not-italic text-left w-full" dir="ltr">
            {listening
              ? isWhisper
                ? "Listening… recite clearly. Offline GPU model analyzes in phrases (~2-4s)."
                : "Listening… recite aloud, words will reveal on the Mushaf instantly."
              : "Press 'Start Reciting' to begin reading."}
          </span>
        )}
      </div>
    </div>
  );
}
