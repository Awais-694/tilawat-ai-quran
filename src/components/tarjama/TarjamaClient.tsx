"use client";

import { useState, useMemo, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import surahsMeta from "@/data/surahs-meta.json";
import {
  saveTarjamaPdf,
  getTarjamaPdf,
  deleteTarjamaPdf,
} from "@/lib/storage/tarjamaStorage";
import { PdfCanvasViewer } from "@/components/common/PdfCanvasViewer";
import { TarjamaIndexClient } from "./TarjamaIndexClient";

function TarjamaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const surahParam = searchParams.get("surah");

  // State: Default to URL ?surah=X or 1
  const initialSurah = surahParam ? parseInt(surahParam, 10) : 1;
  const [selectedSurahNumber, setSelectedSurahNumber] = useState<number>(
    !isNaN(initialSurah) && initialSurah >= 1 && initialSurah <= 114 ? initialSurah : 1
  );
  const [isFullscreen, setIsFullscreen] = useState(false);

  // If no surah parameter is present in URL, display the full 114 Surahs directory!
  if (!surahParam) {
    return <TarjamaIndexClient />;
  }

  // Offline PDF storage states
  const [isOfflineSaved, setIsOfflineSaved] = useState(false);
  const [cachedBlob, setCachedBlob] = useState<Blob | null>(null);
  const [offlineBlobUrl, setOfflineBlobUrl] = useState<string | null>(null);
  const [pdfSize, setPdfSize] = useState<number | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const deviceFileInputRef = useRef<HTMLInputElement | null>(null);

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

  // Check and load offline PDF whenever selectedSurahNumber changes
  useEffect(() => {
    let active = true;
    getTarjamaPdf(selectedSurahNumber)
      .then((blob) => {
        if (!active) return;
        if (blob) {
          setCachedBlob(blob);
          const url = URL.createObjectURL(blob);
          setOfflineBlobUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return url;
          });
          setIsOfflineSaved(true);
          setPdfSize(blob.size);
        } else {
          setCachedBlob(null);
          setOfflineBlobUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return null;
          });
          setIsOfflineSaved(false);
          setPdfSize(null);
        }
      })
      .catch((err) => {
        console.error("Failed to check offline PDF:", err);
      });

    return () => {
      active = false;
    };
  }, [selectedSurahNumber]);

  // Current active Surah metadata
  const currentSurah = useMemo(() => {
    return (
      surahsMeta.find((s) => s.number === selectedSurahNumber) ?? surahsMeta[0]
    );
  }, [selectedSurahNumber]);

  const prevSurah = useMemo(() => {
    if (selectedSurahNumber <= 1) return null;
    return surahsMeta.find((s) => s.number === selectedSurahNumber - 1) ?? null;
  }, [selectedSurahNumber]);

  const nextSurah = useMemo(() => {
    if (selectedSurahNumber >= 114) return null;
    return surahsMeta.find((s) => s.number === selectedSurahNumber + 1) ?? null;
  }, [selectedSurahNumber]);

  const handleSelectSurah = (surahNumber: number) => {
    if (surahNumber >= 1 && surahNumber <= 114) {
      setSelectedSurahNumber(surahNumber);
      router.push(`/tarjama?surah=${surahNumber}`);
    }
  };

  const handlePrevSurah = () => {
    if (prevSurah) {
      handleSelectSurah(prevSurah.number);
    }
  };

  const handleNextSurah = () => {
    if (nextSurah) {
      handleSelectSurah(nextSurah.number);
    }
  };

  // Individual Surah PDF URL
  const surahPdfFile = `/api/pdf/tarjama/${selectedSurahNumber}`;
  const currentPdfUrl = useMemo(() => {
    const base = offlineBlobUrl || surahPdfFile;
    return `${base}#view=FitH&toolbar=1&navpanes=1`;
  }, [offlineBlobUrl, surahPdfFile]);

  // Download & Save PDF locally into IndexedDB and browser downloads
  const handleDownloadOffline = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    setStatusMessage("ڈاؤنلوڈ جاری ہے... براہ کرم انتظار کریں");
    try {
      const res = await fetch(surahPdfFile);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      await saveTarjamaPdf(selectedSurahNumber, blob, currentSurah.name);

      // Create blob URL for in-app viewing
      const blobUrl = URL.createObjectURL(blob);
      setOfflineBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return blobUrl;
      });
      setIsOfflineSaved(true);
      setPdfSize(blob.size);

      // Also trigger device file download so user has the file in gallery/files
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `${selectedSurahNumber}-${currentSurah.name}-Tarjama.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setStatusMessage("سورت کا ترجمہ ایپ میں محفوظ ہو گیا ہے اور ڈیوائس میں ڈاؤنلوڈ بھی ہو چکا ہے!");
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err) {
      console.error("Offline download failed:", err);
      setStatusMessage("ڈاؤنلوڈ میں خرابی آئی۔ براہ کرم انٹرنیٹ چیک کریں یا دوبارہ کوشش کریں۔");
      setTimeout(() => setStatusMessage(null), 5000);
    } finally {
      setIsDownloading(false);
    }
  };

  // Open file from device (if user already downloaded it earlier to their phone)
  const handleDeviceFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await saveTarjamaPdf(selectedSurahNumber, file, currentSurah.name);
      const url = URL.createObjectURL(file);
      setOfflineBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
      setIsOfflineSaved(true);
      setPdfSize(file.size);
      setStatusMessage("پی ڈی ایف کامیابی سے ایپ میں شامل اور محفوظ ہو گئی ہے!");
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err) {
      console.error("Failed to load device PDF:", err);
      setStatusMessage("فائل لوڈ کرنے میں خرابی آئی۔");
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  // Delete from offline storage
  const handleDeleteOffline = async () => {
    if (confirm(`کیا آپ واقعی سورۃ ${currentSurah.name} کو آف لائن اسٹوریج سے حذف کرنا چاہتے ہیں؟`)) {
      await deleteTarjamaPdf(selectedSurahNumber);
      if (offlineBlobUrl) {
        URL.revokeObjectURL(offlineBlobUrl);
        setOfflineBlobUrl(null);
      }
      setIsOfflineSaved(false);
      setPdfSize(null);
      setStatusMessage("سورت کو آف لائن اسٹوریج سے ہٹا دیا گیا ہے۔");
      setTimeout(() => setStatusMessage(null), 3500);
    }
  };

  return (
    <div
      className={`max-w-4xl mx-auto space-y-3 pb-8 w-full max-w-full overflow-x-hidden ${
        isFullscreen
          ? "fixed inset-0 z-50 bg-[#f8f6f0] p-2 sm:p-4 overflow-hidden flex flex-col max-w-none"
          : "px-2 sm:px-0"
      }`}
    >
      {/* Hidden file input for picking previously downloaded PDF from phone/gallery */}
      <input
        ref={deviceFileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleDeviceFileSelect}
      />

      {/* Floating Status Notification Toast */}
      {statusMessage && (
        <div className="bg-emerald-800 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl shadow-md text-center transition-all animate-fade-in flex items-center justify-center gap-2">
          <span>✓</span>
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Top Header Card */}
      {!isFullscreen && (
        <div className="relative overflow-visible rounded-2xl bg-white border border-[#ded5c0] p-3 sm:p-4 shadow-xs">
          {/* Top Row: Back Button & Title */}
          <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
            <button
              onClick={() => router.push("/tarjama")}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold tracking-wide text-[#112a1d] bg-[#faf7ee] hover:bg-[#efe8d6] active:bg-[#e4dcce] border border-[#ded5c0] shadow-xs active:scale-95 transition-all cursor-pointer"
              title="سورتوں کی فہرست پر واپس جائیں"
            >
              <span>←</span>
              <span>All Surahs (سورتوں کی فہرست)</span>
            </button>

            <div className="text-right">
              <span className="text-xs sm:text-sm font-bold text-emerald-950 font-quran" dir="rtl">
                مَعْرِفَةُ الْقُرْآن عَلَىٰ كَنْزِ الْعِرْفَان
              </span>
              <span className="hidden sm:inline text-xs text-[#527060] ml-2">
                (اردو ترجمہ و تفسیر)
              </span>
            </div>
          </div>

          {/* User Question Header & Single Clean Dropdown */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-3 my-1">
            <h1 className="text-xs sm:text-sm font-semibold text-[#112a1d] flex items-center gap-1.5 whitespace-nowrap">
              <span>📖</span>
              <span>آپ کون سی سورت کا ترجمہ پڑھنا چاہتے ہیں؟</span>
            </h1>

            {/* Dropdown Selector */}
            <div className="relative w-full sm:w-80">
              <select
                aria-label="Select Surah"
                value={selectedSurahNumber}
                onChange={(e) => handleSelectSurah(Number(e.target.value))}
                className="w-full appearance-none px-3.5 py-2 rounded-xl bg-white border border-[#ded5c0] hover:border-emerald-500 text-[#112a1d] font-bold text-xs sm:text-sm focus:outline-none focus:border-emerald-600 cursor-pointer shadow-2xs pr-9 transition-colors"
              >
                {surahsMeta.map((s) => (
                  <option key={s.number} value={s.number} className="bg-white text-[#112a1d]">
                    {s.number}. {s.name} ({s.arabicName})
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#527060]">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Surah Showcase Banner & Controls */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#fbf8ee] via-white to-[#fbf8ee] border border-[#ded5c0] p-3 sm:p-4 shadow-xs">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4">
          {/* Left: Previous Surah Button */}
          <div className="order-2 md:order-1 flex items-center justify-between w-full md:w-auto gap-2">
            <button
              onClick={handlePrevSurah}
              disabled={!prevSurah}
              className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#faf7ee] hover:bg-[#efe8d6] border border-[#ded5c0] text-[#112a1d] text-xs font-semibold shadow-xs active:scale-95 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              title={prevSurah ? `پچھلی سورت: ${prevSurah.name}` : "یہ پہلی سورت ہے"}
            >
              <svg className="w-4 h-4 text-emerald-800" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
              <span>پچھلی سورت</span>
              {prevSurah && (
                <span className="hidden xl:inline text-[11px] opacity-75 font-quran">({prevSurah.arabicName})</span>
              )}
            </button>

            {/* Mobile Next Surah Button */}
            <button
              onClick={handleNextSurah}
              disabled={!nextSurah}
              className="flex-1 md:hidden inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#faf7ee] hover:bg-[#efe8d6] border border-[#ded5c0] text-[#112a1d] text-xs font-semibold shadow-xs active:scale-95 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              title={nextSurah ? `اگلی سورت: ${nextSurah.name}` : "یہ آخری سورت ہے"}
            >
              <span>اگلی سورت</span>
              <svg className="w-4 h-4 text-emerald-800" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>

          {/* Center: Surah Title Plate */}
          <div className="order-1 md:order-2 flex flex-col items-center text-center">
            {/* Arabic Calligraphy Title */}
            <div className="flex items-center gap-2">
              <span className="text-amber-600 text-xs sm:text-sm">۞</span>
              <h2
                className="text-xl sm:text-2xl md:text-3xl font-bold font-quran text-[#112a1d] tracking-wide select-none"
                dir="rtl"
              >
                {currentSurah.arabicName}
              </h2>
              <span className="text-amber-600 text-xs sm:text-sm">۞</span>
            </div>

            {/* English Title & Badges */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-center mt-1">
              <span className="text-xs sm:text-sm font-bold text-[#112a1d]">
                {currentSurah.name}
              </span>
              <span className="text-xs text-[#527060]">
                ({currentSurah.translation})
              </span>
              <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800">
                {currentSurah.numberOfAyahs} آیات
              </span>
              <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-900">
                {currentSurah.revelationType === "Meccan" ? "مکی سورت" : "مدنی سورت"}
              </span>

              {/* Offline Status Badge */}
              {isOfflineSaved ? (
                <span className="text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-900 flex items-center gap-1 shadow-2xs">
                  <svg className="w-3 h-3 text-emerald-700" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  <span>آف لائن محفوظ {pdfSize ? `(${(pdfSize / (1024 * 1024)).toFixed(1)} MB)` : ""}</span>
                </span>
              ) : (
                <span className="text-[10px] sm:text-xs font-medium px-2 py-0.5 rounded-full bg-[#f0ebd9] border border-[#ded5c0] text-[#527060]">
                  آن لائن موڈ
                </span>
              )}
            </div>
          </div>

          {/* Right: Next Surah & Utility Actions (Desktop) */}
          <div className="order-3 flex items-center justify-center md:justify-end gap-1.5 w-full md:w-auto flex-wrap">
            {/* Desktop Next Surah Button */}
            <button
              onClick={handleNextSurah}
              disabled={!nextSurah}
              className="hidden md:inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#faf7ee] hover:bg-[#efe8d6] border border-[#ded5c0] text-[#112a1d] text-xs font-semibold shadow-xs active:scale-95 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              title={nextSurah ? `اگلی سورت: ${nextSurah.name}` : "یہ آخری سورت ہے"}
            >
              {nextSurah && (
                <span className="hidden xl:inline text-[11px] opacity-75 font-quran">({nextSurah.arabicName})</span>
              )}
              <span>اگلی سورت</span>
              <svg className="w-4 h-4 text-emerald-800" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>

            {/* Load from Device Button */}
            <button
              onClick={() => deviceFileInputRef.current?.click()}
              className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-[#faf7ee] border border-[#ded5c0] text-[#112a1d] text-xs font-semibold flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-xs"
              title="ڈیوائس / گیلری میں پہلے سے موجود پی ڈی ایف منتخب کریں"
            >
              <svg className="w-3.5 h-3.5 text-[#527060]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
              </svg>
              <span className="hidden sm:inline">ڈیوائس سے کھولیں</span>
            </button>

            {/* Fullscreen Button */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-[#faf7ee] border border-[#ded5c0] text-[#112a1d] text-xs font-semibold flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-xs"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen View"}
            >
              {isFullscreen ? (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                  </svg>
                  <span className="hidden sm:inline">Close</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                  </svg>
                  <span className="hidden sm:inline">Fullscreen</span>
                </>
              )}
            </button>

            {/* Direct Open in New Tab Button */}
            <a
              href={currentPdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-[#faf7ee] border border-[#ded5c0] text-[#112a1d] text-xs font-semibold flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-xs"
              title="Open current translation in browser tab"
            >
              <svg className="w-3.5 h-3.5 text-[#527060]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
              <span className="hidden sm:inline">Tab</span>
            </a>

            {/* Smart Offline Download / Saved Status Button */}
            {isOfflineSaved ? (
              <button
                onClick={handleDeleteOffline}
                className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-rose-50 border border-emerald-300 hover:border-rose-300 text-emerald-900 hover:text-rose-700 text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer group"
                title="یہ سورت آف لائن محفوظ ہے۔ کلک کر کے حذف کر سکتے ہیں"
              >
                <svg className="w-3.5 h-3.5 text-emerald-700 group-hover:hidden" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                <svg className="w-3.5 h-3.5 text-rose-600 hidden group-hover:inline" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
                <span className="group-hover:hidden">محفوظ ہے ✓</span>
                <span className="hidden group-hover:inline">حذف کریں</span>
              </button>
            ) : (
              <button
                onClick={handleDownloadOffline}
                disabled={isDownloading}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-700 via-emerald-800 to-teal-800 hover:from-emerald-800 hover:to-teal-900 text-white text-xs font-bold flex items-center gap-1.5 shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                title="Download this Surah translation to read offline inside the app"
              >
                {isDownloading ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>ڈاؤنلوڈ جاری ہے...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5 text-emerald-200" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    <span>ڈاؤنلوڈ آف لائن</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Native HTML5 Canvas PDF Viewer (Mobile & Offline 100% Compatible) */}
      <PdfCanvasViewer
        key={`tarjama-canvas-${selectedSurahNumber}`}
        pdfUrl={`/api/pdf/tarjama/${selectedSurahNumber}`}
        pdfBlob={cachedBlob}
        onSaveOffline={async (blob) => {
          try {
            await saveTarjamaPdf(selectedSurahNumber, blob, currentSurah.name);
            setCachedBlob(blob);
            setIsOfflineSaved(true);
            setPdfSize(blob.size);
          } catch {}
        }}
        title={`Surah ${currentSurah.name} Tarjama`}
      />
    </div>
  );
}

export function TarjamaClient() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center text-emerald-900 font-semibold">
          Loading Tarjama & Tafseer...
        </div>
      }
    >
      <TarjamaContent />
    </Suspense>
  );
}
