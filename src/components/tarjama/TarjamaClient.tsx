"use client";

import { useState, useMemo, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { JILDS, SURAH_TARJAMA_PAGES } from "@/data/tarjama-meta";
import surahsMeta from "@/data/surahs-meta.json";

// Quick-access popular Surahs for instant 1-click reading
const POPULAR_SURAHS = [
  { number: 1, name: "الفاتحة", en: "Al-Fatiha" },
  { number: 2, name: "البقرة", en: "Al-Baqarah" },
  { number: 18, name: "الكهف", en: "Al-Kahf" },
  { number: 36, name: "يسٓ", en: "Yaseen" },
  { number: 55, name: "الرَّحْمٰن", en: "Ar-Rahman" },
  { number: 56, name: "الواقعة", en: "Al-Waqi'ah" },
  { number: 67, name: "الملك", en: "Al-Mulk" },
  { number: 112, name: "الإخلاص", en: "Al-Ikhlas" },
];

function TarjamaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State: Default to Surah 1 (Al-Fatiha) if no parameter is provided
  const [selectedSurahNumber, setSelectedSurahNumber] = useState<number>(1);
  const [selectedAyahNumber, setSelectedAyahNumber] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Read URL query parameter ?surah=X if provided
  useEffect(() => {
    const surahParam = searchParams.get("surah");
    if (surahParam) {
      const sNum = parseInt(surahParam, 10);
      if (!isNaN(sNum) && sNum >= 1 && sNum <= 114) {
        setSelectedSurahNumber(sNum);
      }
    }
  }, [searchParams]);

  // Close search dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto-update Service Worker to ensure fresh PDF streaming
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const reg of registrations) {
          reg.update().catch(() => {});
        }
      });
    }
  }, []);

  // Current active Surah metadata
  const currentSurah = useMemo(() => {
    return (
      surahsMeta.find((s) => s.number === selectedSurahNumber) ?? surahsMeta[0]
    );
  }, [selectedSurahNumber]);

  // Mapping info (silently retrieves volume and page behind the scenes)
  const surahMapping = useMemo(() => {
    return SURAH_TARJAMA_PAGES[selectedSurahNumber] ?? { jildId: 1, page: 7 };
  }, [selectedSurahNumber]);

  const activeJild = useMemo(() => {
    return (
      JILDS.find((j) => j.id === surahMapping.jildId) ?? JILDS[0]
    );
  }, [surahMapping.jildId]);

  // Autocomplete search suggestions
  const filteredSuggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return surahsMeta
      .filter((s) => {
        return (
          s.number.toString() === q ||
          s.number.toString().startsWith(q) ||
          s.name.toLowerCase().includes(q) ||
          s.arabicName.includes(q) ||
          s.translation.toLowerCase().includes(q)
        );
      })
      .slice(0, 8); // Top 8 suggestions
  }, [searchQuery]);

  const handleSelectSurah = (surahNumber: number) => {
    if (surahNumber >= 1 && surahNumber <= 114) {
      setSelectedSurahNumber(surahNumber);
      setSelectedAyahNumber("");
      setSearchQuery("");
      setIsSearchOpen(false);
    }
  };

  const handlePrevSurah = () => {
    if (selectedSurahNumber > 1) {
      handleSelectSurah(selectedSurahNumber - 1);
    }
  };

  const handleNextSurah = () => {
    if (selectedSurahNumber < 114) {
      handleSelectSurah(selectedSurahNumber + 1);
    }
  };

  // PDF URL with page hash
  const currentPdfUrl = useMemo(() => {
    const pageNum = surahMapping.page;
    return `${activeJild.fileName}#page=${pageNum}&view=FitH&toolbar=1&navpanes=1`;
  }, [activeJild.fileName, surahMapping.page]);

  return (
    <div
      className={`space-y-3 pb-12 ${
        isFullscreen
          ? "fixed inset-0 z-50 bg-[#06120b] p-2 sm:p-4 overflow-hidden"
          : ""
      }`}
    >
      {/* Top Header & Search Area */}
      {!isFullscreen && (
        <div className="relative overflow-visible rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#0c1e15]/95 via-[#07160f]/95 to-[#040e09]/95 border border-[#1d442f]/80 p-3.5 sm:p-5 shadow-[0_12px_40px_rgba(0,0,0,0.5)] backdrop-blur-md">
          <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent" />

          {/* Top Row: Back Button & Page Title */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <button
              onClick={() => router.push("/surahs")}
              className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold tracking-wide text-emerald-100 bg-[#0d2217]/90 hover:bg-[#133022] border border-emerald-600/50 hover:border-emerald-400/80 shadow-md backdrop-blur-md active:scale-95 transition-all cursor-pointer"
            >
              ← Back to Surahs
            </button>

            <div className="text-right">
              <span className="text-xs sm:text-sm font-bold text-emerald-200 font-quran" dir="rtl">
                مَعْرِفَةُ الْقُرْآن عَلَىٰ كَنْزِ الْعِرْفَان
              </span>
              <span className="hidden sm:inline text-xs text-emerald-400/70 ml-2">
                (اردو ترجمہ و تفسیر)
              </span>
            </div>
          </div>

          {/* User-Friendly Question & Search Section */}
          <div className="text-center mt-1 mb-3">
            <h1 className="text-base sm:text-xl font-bold text-white flex items-center justify-center gap-2">
              <span>📖</span>
              <span>آپ کون سی سورت کا ترجمہ پڑھنا چاہتے ہیں؟</span>
            </h1>
            <p className="text-xs sm:text-sm text-emerald-300/70 mt-1">
              Select or search any Surah to open its authentic Urdu translation directly
            </p>
          </div>

          {/* Search & Selector Row */}
          <div
            ref={searchContainerRef}
            className="relative flex flex-col sm:flex-row items-stretch sm:items-center gap-2 max-w-2xl mx-auto"
          >
            {/* Quick Dropdown Picker */}
            <div className="relative sm:w-1/2">
              <select
                aria-label="Select Surah"
                value={selectedSurahNumber}
                onChange={(e) => handleSelectSurah(Number(e.target.value))}
                className="w-full appearance-none px-3.5 py-2.5 rounded-xl bg-[#06140d] border border-emerald-700/80 text-white font-medium text-xs sm:text-sm focus:outline-none focus:border-emerald-400 cursor-pointer shadow-inner pr-8"
              >
                {surahsMeta.map((s) => (
                  <option key={s.number} value={s.number} className="bg-[#06140d] text-white">
                    {s.number}. {s.name} ({s.arabicName})
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-emerald-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </div>
            </div>

            {/* Instant Search Bar */}
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onFocus={() => setIsSearchOpen(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                placeholder="سورت کا نام یا نمبر لکھیں (e.g. Yaseen, Rahman, 36)..."
                className="w-full px-3.5 py-2.5 pl-9 rounded-xl bg-[#06140d] border border-emerald-700/80 text-white placeholder-emerald-400/40 text-xs sm:text-sm focus:outline-none focus:border-emerald-400 transition-colors shadow-inner"
              />
              <svg
                className="w-4 h-4 text-emerald-400/70 absolute left-3 top-3"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>

              {/* Autocomplete Suggestions Popup */}
              {isSearchOpen && filteredSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-[#091b12] border border-emerald-600/80 rounded-xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto divide-y divide-emerald-950/70 animate-fadeIn">
                  {filteredSuggestions.map((s) => (
                    <button
                      key={s.number}
                      onClick={() => handleSelectSurah(s.number)}
                      className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-emerald-900/50 transition-colors group cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-emerald-800 text-white text-[11px] font-bold flex items-center justify-center">
                          {s.number}
                        </span>
                        <div>
                          <div className="text-xs sm:text-sm font-semibold text-white group-hover:text-emerald-200">
                            {s.name}
                          </div>
                          <div className="text-[10px] text-emerald-400/70">
                            {s.translation} • {s.numberOfAyahs} آیات
                          </div>
                        </div>
                      </div>
                      <span className="font-quran text-emerald-200 text-sm" dir="rtl">
                        {s.arabicName}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Optional Ayah Number Field */}
            <div className="w-full sm:w-28 flex items-center">
              <input
                type="number"
                min="1"
                max={currentSurah.numberOfAyahs}
                value={selectedAyahNumber}
                onChange={(e) => setSelectedAyahNumber(e.target.value)}
                placeholder={`آیت (1-${currentSurah.numberOfAyahs})`}
                className="w-full px-3 py-2.5 rounded-xl bg-[#06140d] border border-emerald-800/80 text-white placeholder-emerald-400/40 text-xs sm:text-sm focus:outline-none focus:border-emerald-400 text-center shadow-inner"
              />
            </div>
          </div>

          {/* Quick Popular Surah Pills */}
          <div className="flex items-center justify-center gap-1.5 flex-wrap mt-3 pt-3 border-t border-emerald-900/50">
            <span className="text-[11px] text-emerald-400/70 mr-1 font-medium hidden sm:inline">
              مشہور سورتیں:
            </span>
            {POPULAR_SURAHS.map((p) => {
              const isActive = selectedSurahNumber === p.number;
              return (
                <button
                  key={p.number}
                  onClick={() => handleSelectSurah(p.number)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all active:scale-95 cursor-pointer flex items-center gap-1 border ${
                    isActive
                      ? "bg-emerald-600 border-emerald-300 text-white shadow-[0_0_10px_rgba(16,185,129,0.4)] font-semibold"
                      : "bg-[#06140d]/70 border-emerald-900/80 text-emerald-200/90 hover:bg-emerald-900/60 hover:text-white"
                  }`}
                >
                  <span className="font-quran">{p.name}</span>
                  <span className="text-[10px] opacity-75 hidden sm:inline">({p.en})</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Viewer Container Card */}
      <div
        className={`bg-[#0c1c14]/90 border border-emerald-900/70 rounded-2xl sm:rounded-3xl p-2 sm:p-3.5 shadow-xl backdrop-blur-md flex flex-col ${
          isFullscreen ? "h-full" : ""
        }`}
      >
        {/* Navigation & Active Surah Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2 px-1">
          {/* Active Surah Badge with Prev / Next Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {/* Prev Surah Button */}
            <button
              onClick={handlePrevSurah}
              disabled={selectedSurahNumber <= 1}
              className="px-2.5 py-1 rounded-lg bg-[#07170f] hover:bg-emerald-900/60 border border-emerald-800/70 text-emerald-200 text-xs font-semibold flex items-center gap-1 transition-all active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title="Previous Surah"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
              <span>پچھلی سورت</span>
            </button>

            {/* Current Surah Title Chip */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-lg bg-emerald-800/90 border border-emerald-500/80 text-white text-xs sm:text-sm font-semibold shadow-sm">
              <span className="font-quran text-sm sm:text-base text-emerald-100" dir="rtl">
                {currentSurah.arabicName}
              </span>
              <span className="text-white">({currentSurah.name})</span>
              <span className="text-[10px] sm:text-xs text-emerald-200 bg-emerald-950/80 px-2 py-0.5 rounded-full font-normal">
                {currentSurah.numberOfAyahs} آیات • {currentSurah.revelationType}
              </span>
              {selectedAyahNumber && (
                <span className="text-[10px] text-amber-200 bg-amber-950/80 px-2 py-0.5 rounded-full font-normal border border-amber-500/40">
                  آیت {selectedAyahNumber}
                </span>
              )}
            </div>

            {/* Next Surah Button */}
            <button
              onClick={handleNextSurah}
              disabled={selectedSurahNumber >= 114}
              className="px-2.5 py-1 rounded-lg bg-[#07170f] hover:bg-emerald-900/60 border border-emerald-800/70 text-emerald-200 text-xs font-semibold flex items-center gap-1 transition-all active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title="Next Surah"
            >
              <span>اگلی سورت</span>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>

          {/* Quick Viewer Utility Buttons */}
          <div className="flex items-center gap-1.5 ml-auto">
            {/* Fullscreen Button */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="px-2.5 py-1 rounded-lg bg-[#07170f] hover:bg-emerald-900/60 border border-emerald-800/70 text-emerald-200 text-xs font-medium flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen View"}
            >
              {isFullscreen ? (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                  </svg>
                  <span>Close Fullscreen</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                  </svg>
                  <span>Fullscreen</span>
                </>
              )}
            </button>

            {/* Direct Open in New Tab Button */}
            <a
              href={currentPdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 rounded-lg bg-[#07170f] hover:bg-emerald-900/60 border border-emerald-800/70 text-emerald-200 text-xs font-medium flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
              title="Open current translation in browser tab"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
              <span>Open Tab</span>
            </a>

            {/* Download Button */}
            <a
              href={activeJild.fileName}
              download={`${currentSurah.name}-Tarjama.pdf`}
              className="px-2.5 py-1 rounded-lg bg-emerald-900/60 hover:bg-emerald-800 border border-emerald-600/60 text-emerald-100 text-xs font-medium flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
              title="Download translation to read offline anytime"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              <span>Download</span>
            </a>
          </div>
        </div>

        {/* Embedded High-Performance PDF Frame */}
        <div
          className={`w-full rounded-xl overflow-hidden border border-emerald-900/60 bg-[#06120b] shadow-inner relative ${
            isFullscreen ? "flex-1" : "h-[74vh] sm:h-[82vh]"
          }`}
        >
          <object
            key={`${activeJild.fileName}-s${selectedSurahNumber}-p${surahMapping.page}`}
            data={currentPdfUrl}
            type="application/pdf"
            className="w-full h-full border-0"
          >
            {/* Fallback for devices without inline PDF support (e.g. some mobile browsers) */}
            <div className="flex flex-col items-center justify-center p-6 sm:p-10 text-center h-full bg-gradient-to-b from-[#091f14] to-[#040e09] text-white">
              <div className="w-16 h-16 rounded-2xl bg-emerald-900/60 border border-emerald-600/50 flex items-center justify-center text-3xl mb-4 shadow-[0_0_25px_rgba(16,185,129,0.25)] text-emerald-200 animate-pulse">
                📖
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-1.5 font-quran" dir="rtl">
                {currentSurah.arabicName}
              </h3>
              <p className="text-sm font-semibold text-emerald-300 mb-1">
                {currentSurah.name} ({currentSurah.translation})
              </p>
              <p className="text-xs text-emerald-400/80 mb-5">
                {currentSurah.numberOfAyahs} آیات • {currentSurah.revelationType}
              </p>

              <div className="flex flex-col gap-2.5 w-full max-w-sm">
                <a
                  href={currentPdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs sm:text-sm shadow-[0_4px_20px_rgba(16,185,129,0.35)] flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                  </svg>
                  <span>براہ راست آن لائن ترجمہ پڑھیں (Read Online)</span>
                </a>

                <a
                  href={activeJild.fileName}
                  download={`${currentSurah.name}-Tarjama.pdf`}
                  className="w-full py-2 px-3 rounded-xl bg-[#092215] hover:bg-[#0f2e1e] border border-emerald-600/70 text-emerald-100 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer text-center"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  <span>ڈاؤنلوڈ پی ڈی ایف (Offline)</span>
                </a>
              </div>
            </div>
          </object>
        </div>
      </div>
    </div>
  );
}

export function TarjamaClient() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center text-emerald-400 font-medium">
          Loading Tarjama & Tafseer...
        </div>
      }
    >
      <TarjamaContent />
    </Suspense>
  );
}
