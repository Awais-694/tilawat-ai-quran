"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getEnginePref,
  setEnginePref,
  getFontSize,
  setFontSize,
  resetFontSize,
  getDefaultMushafFontSize,
  type EnginePref,
} from "@/lib/settings";
import { useWhisper } from "@/hooks/useWhisper";

export function SettingsClient() {
  const router = useRouter();
  const [engine, setEngine] = useState<EnginePref>("auto");
  const [fontSize, setFontSizeState] = useState(24);
  const [mounted, setMounted] = useState(false);
  const whisper = useWhisper(() => {});

  useEffect(() => {
    setMounted(true);
    setEngine(getEnginePref());
    setFontSizeState(getFontSize());
  }, []);

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/surahs");
    }
  };

  const handleResetFont = () => {
    const def = resetFontSize();
    setFontSizeState(def);
  };

  const adjustFont = (delta: number) => {
    const next = Math.max(22, Math.min(26, fontSize + delta));
    setFontSizeState(next);
    setFontSize(next);
  };

  const defaultMushafSize = mounted ? getDefaultMushafFontSize() : 24;
  const isDefaultSize = fontSize === defaultMushafSize;

  const radioCls =
    "flex items-center gap-3 bg-[#fbf9f3] hover:bg-[#f6f1e3] border border-[#e5ded0] rounded-xl px-4 py-3 cursor-pointer transition-all";

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Top Navigation & Title Bar */}
      <div className="relative flex items-center justify-between min-h-[40px] px-1">
        <button
          onClick={handleBack}
          className="inline-flex items-center justify-center px-4 py-1.5 rounded-xl text-xs sm:text-sm font-semibold tracking-wide text-[#193d2b] bg-white hover:bg-[#efe9d8] active:bg-[#e4dcce] border border-[#d6cbaf] shadow-sm active:scale-95 transition-all duration-200 cursor-pointer"
        >
          Back
        </button>

        <h1 className="text-xl sm:text-2xl font-bold text-[#112a1d] tracking-wide text-center">Settings</h1>
        <div className="w-14" />
      </div>

      {/* Speech Recognition Engine */}
      <div className="bg-white border border-[#ded5c0] rounded-2xl p-4 sm:p-5 shadow-sm">
        <h2 className="text-base font-semibold text-[#112a1d] mb-3">
          Speech Recognition Engine
        </h2>
        <div className="flex flex-col gap-2.5 text-xs sm:text-sm">
          <label className={radioCls}>
            <input
              type="radio"
              name="engine"
              checked={engine === "auto"}
              onChange={() => {
                setEngine("auto");
                setEnginePref("auto");
              }}
              className="accent-emerald-700 w-4 h-4 cursor-pointer"
            />
            <span className="text-[#112a1d] font-medium">
              Auto — Online Web Speech when available, Whisper when offline
            </span>
          </label>
          <label className={radioCls}>
            <input
              type="radio"
              name="engine"
              checked={engine === "webspeech"}
              onChange={() => {
                setEngine("webspeech");
                setEnginePref("webspeech");
              }}
              className="accent-emerald-700 w-4 h-4 cursor-pointer"
            />
            <span className="text-[#112a1d] font-medium">Online only (Web Speech API — Chrome / Edge)</span>
          </label>
          <label className={radioCls}>
            <input
              type="radio"
              name="engine"
              checked={engine === "whisper"}
              onChange={() => {
                setEngine("whisper");
                setEnginePref("whisper");
              }}
              className="accent-emerald-700 w-4 h-4 cursor-pointer"
            />
            <span className="text-[#112a1d] font-medium">Offline only (Whisper — on-device model)</span>
          </label>
        </div>
      </div>

      {/* Offline Model (Whisper) */}
      <div className="bg-white border border-[#ded5c0] rounded-2xl p-4 sm:p-5 shadow-sm">
        <h2 className="text-base font-semibold text-[#112a1d] mb-2">
          Offline Model (Whisper)
        </h2>
        <p className="text-xs sm:text-sm text-[#527060] mb-3">
          Status:{" "}
          <b className="text-[#112a1d]">
            {whisper.modelState === "ready"
              ? "Downloaded & Ready"
              : whisper.modelState === "loading"
                ? `Downloading… ${Math.round(whisper.modelProgress)}%`
                : "Not downloaded"}
          </b>
        </p>
        <button
          onClick={() => whisper.loadModel()}
          disabled={whisper.modelState === "loading" || whisper.modelState === "ready"}
          className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold transition-all shadow-sm active:scale-95 cursor-pointer"
        >
          {whisper.modelState === "ready" ? "Model Installed" : "Download Model (~300 MB GPU, one-time)"}
        </button>
        {whisper.error && <p className="text-rose-700 text-xs sm:text-sm mt-2">{whisper.error}</p>}
      </div>

      {/* Mushaf Font Size & Zoom */}
      <div className="bg-white border border-[#ded5c0] rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 className="text-base font-semibold text-[#112a1d]">
            Mushaf Font Size & Zoom
          </h2>

          <button
            onClick={handleResetFont}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 border cursor-pointer ${
              isDefaultSize
                ? "bg-[#f5eed6]/40 border-[#ded5c0] text-[#a09070] cursor-default"
                : "bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100 shadow-sm"
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Reset to Default (24px)</span>
          </button>
        </div>

        <p className="text-xs text-[#527060] mb-3">
          Scale range is <b>22px – 26px</b> (Default: <b>24px</b>). Optimized for Taj 16-line Mushaf PDF layout.
        </p>

        {/* Zoom In & Out Stepper */}
        <div className="flex items-center gap-3 mb-4 p-2 rounded-xl bg-[#faf7ee] border border-[#ded5c0] w-fit">
          <button
            onClick={() => adjustFont(-1)}
            disabled={fontSize <= 22}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-[#ded5c0] hover:bg-[#efe8d6] disabled:opacity-30 disabled:cursor-not-allowed text-[#112a1d] font-bold text-sm transition-all active:scale-95 cursor-pointer"
            title="Zoom Out (Min 22px)"
          >
            A−
          </button>
          <span className="text-sm font-mono font-bold text-emerald-900 min-w-[50px] text-center select-none">
            {fontSize}px
          </span>
          <button
            onClick={() => adjustFont(1)}
            disabled={fontSize >= 26}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-[#ded5c0] hover:bg-[#efe8d6] disabled:opacity-30 disabled:cursor-not-allowed text-[#112a1d] font-bold text-sm transition-all active:scale-95 cursor-pointer"
            title="Zoom In (Max 26px)"
          >
            A+
          </button>
        </div>

        {/* Preset Font Sizes (22px, 24px, 26px) */}
        <div className="flex flex-wrap gap-2.5">
          {[22, 24, 26].map((s) => (
            <button
              key={s}
              onClick={() => {
                setFontSizeState(s);
                setFontSize(s);
              }}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-medium border transition-all active:scale-95 cursor-pointer ${
                fontSize === s
                  ? "bg-emerald-700 border-emerald-700 text-white shadow-sm font-semibold"
                  : "bg-[#faf7ee] border-[#ded5c0] text-[#112a1d] hover:bg-[#efe8d6]"
              }`}
            >
              {s}px {s === defaultMushafSize && "(Default)"}
            </button>
          ))}
        </div>

        {/* Live Mushaf Sample Preview */}
        <div className="mt-4 pt-3.5 border-t border-[#ede7d8]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#527060] font-medium">
              Live Mushaf Preview ({fontSize}px):
            </span>
            <span className="text-[11px] text-emerald-800 font-mono font-semibold">
              Taj 16-Line PDF Layout
            </span>
          </div>

          <div className="bg-[#fcfaf5] text-[#13281d] rounded-xl p-2 sm:p-3 border border-[#d9ccb0] shadow-sm max-w-full overflow-hidden">
            <div className="border-[2px] border-double border-[#1b382b] rounded-sm px-2 py-2 bg-[#fbf9f2]">
              <div
                dir="rtl"
                className="font-quran leading-[1.75] text-right select-none w-full"
                style={{ fontSize: `${fontSize}px` }}
              >
                <div className="border-b border-[#1b382b]/30 pb-1 mb-1 flex items-baseline justify-between flex-nowrap whitespace-nowrap overflow-hidden">
                  <span>بِسْمِ</span>
                  <span>اللّٰهِ</span>
                  <span>الرَّحْمٰنِ</span>
                  <span>الرَّحِیْمِ</span>
                  <span className="text-[#143323] text-[0.8em]">۝١</span>
                </div>
                <div className="flex items-baseline justify-between flex-nowrap whitespace-nowrap overflow-hidden">
                  <span>الْحَمْدُ</span>
                  <span>لِلّٰهِ</span>
                  <span>رَبِّ</span>
                  <span>الْعٰلَمِیْنَ</span>
                  <span className="text-[#143323] text-[0.8em]">۝٢</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


