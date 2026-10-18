"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import surahsMeta from "@/data/surahs-meta.json";

function TarjamaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State: Default to Surah 1 (Al-Fatiha) or URL ?surah=X
  const [selectedSurahNumber, setSelectedSurahNumber] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  const handleSelectSurah = (surahNumber: number) => {
    if (surahNumber >= 1 && surahNumber <= 114) {
      setSelectedSurahNumber(surahNumber);
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

  // Individual Surah PDF URL (Page 1 is the start of this exact Surah)
  const surahPdfFile = `/tarjama/surahs/${selectedSurahNumber}.pdf`;
  const currentPdfUrl = useMemo(() => {
    return `${surahPdfFile}#view=FitH&toolbar=1&navpanes=1`;
  }, [surahPdfFile]);

  return (
    <div
      className={`space-y-3 pb-12 ${
        isFullscreen
          ? "fixed inset-0 z-50 bg-[#06120b] p-2 sm:p-4 overflow-hidden"
          : ""
      }`}
    >
      {/* Top Header Card */}
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

          {/* User Question Header */}
          <div className="text-center mt-1 mb-3">
            <h1 className="text-base sm:text-xl font-bold text-white flex items-center justify-center gap-2">
              <span>📖</span>
              <span>آپ کون سی سورت کا ترجمہ پڑھنا چاہتے ہیں؟</span>
            </h1>
          </div>

          {/* Clean, Single Surah Dropdown Selector */}
          <div className="max-w-md mx-auto">
            <div className="relative">
              <select
                aria-label="Select Surah"
                value={selectedSurahNumber}
                onChange={(e) => handleSelectSurah(Number(e.target.value))}
                className="w-full appearance-none px-4 py-2.5 sm:py-3 rounded-2xl bg-[#06140d] border border-emerald-600/80 hover:border-emerald-400 text-white font-medium text-xs sm:text-sm focus:outline-none focus:border-emerald-300 cursor-pointer shadow-lg pr-10 transition-colors"
              >
                {surahsMeta.map((s) => (
                  <option key={s.number} value={s.number} className="bg-[#06140d] text-white">
                    {s.number}. {s.name} ({s.arabicName})
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-emerald-400">
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </div>
            </div>
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
              href={surahPdfFile}
              download={`${currentSurah.name}-Tarjama.pdf`}
              className="px-2.5 py-1 rounded-lg bg-emerald-900/60 hover:bg-emerald-800 border border-emerald-600/60 text-emerald-100 text-xs font-medium flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
              title="Download this Surah translation to read offline anytime"
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
            key={`surah-pdf-${selectedSurahNumber}`}
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
                  href={surahPdfFile}
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
