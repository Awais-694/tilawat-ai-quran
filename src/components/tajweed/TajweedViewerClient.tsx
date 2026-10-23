"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { SURAHS_META, getSurahMeta } from "@/lib/quran/data";
import { PdfCanvasViewer } from "@/components/common/PdfCanvasViewer";
import { getTajweedPdf, saveTajweedPdf } from "@/lib/storage/tajweedStorage";

export function TajweedViewerClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read initial surah from query param ?surah=... or localStorage or default to 1 (Al-Fatihah)
  const [selectedSurah, setSelectedSurah] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Offline caching states
  const [cachedBlob, setCachedBlob] = useState<Blob | null>(null);
  const [isSavedOffline, setIsSavedOffline] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    let active = true;
    setCachedBlob(null);
    setIsSavedOffline(false);

    getTajweedPdf(selectedSurah)
      .then((blob) => {
        if (!active) return;
        if (blob) {
          setCachedBlob(blob);
          setIsSavedOffline(true);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [selectedSurah]);

  useEffect(() => {
    const sParam = searchParams.get("surah");
    if (sParam) {
      const n = parseInt(sParam, 10);
      if (n >= 1 && n <= 114) {
        setSelectedSurah(n);
        return;
      }
    }
    try {
      const saved = localStorage.getItem("tilawat_last_tajweed_surah");
      if (saved) {
        const n = parseInt(saved, 10);
        if (n >= 1 && n <= 114) {
          setSelectedSurah(n);
        }
      }
    } catch {}
  }, [searchParams]);

  const handleSelectSurah = (surahNum: number) => {
    setSelectedSurah(surahNum);
    setIsDropdownOpen(false);
    try {
      localStorage.setItem("tilawat_last_tajweed_surah", String(surahNum));
      window.history.replaceState(null, "", `/tajweed?surah=${surahNum}`);
    } catch {}
  };

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  const currentMeta = getSurahMeta(selectedSurah) || SURAHS_META[0];
  const pdfUrl = `/api/pdf/tajweed/${selectedSurah}`;
  const downloadUrl = `/api/pdf/tajweed/${selectedSurah}?download=1`;
  const fullMushafUrl = "/tajveed-e-al-quran-ul-kareem.pdf";

  const handleDownloadFile = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      let blobToUse = cachedBlob;
      if (!blobToUse) {
        const res = await fetch(pdfUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        blobToUse = await res.blob();
        await saveTajweedPdf(selectedSurah, blobToUse, currentMeta.name);
        setCachedBlob(blobToUse);
        setIsSavedOffline(true);
      }
      const u = URL.createObjectURL(blobToUse);
      const a = document.createElement("a");
      a.href = u;
      a.download = `Surah_${selectedSurah}_${currentMeta.name}_Tajweed.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(u), 10000);
    } catch {
      window.open(downloadUrl, "_blank");
    } finally {
      setIsDownloading(false);
    }
  };

  const filteredSurahs = useMemo(() => {
    if (!searchQuery.trim()) return SURAHS_META;
    const q = searchQuery.toLowerCase().trim();
    return SURAHS_META.filter(
      (s) =>
        s.number.toString().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.arabicName.includes(q)
    );
  }, [searchQuery]);

  return (
    <div
      className={`mx-auto transition-all duration-300 ${
        isFullscreen
          ? "fixed inset-0 z-50 bg-[#f8f6f0] p-2 sm:p-4 flex flex-col"
          : "max-w-5xl space-y-4 pb-16 px-2 sm:px-0"
      }`}
    >
      {/* Top Navigation & Controls Bar */}
      <div className="flex flex-col gap-2.5 border-b border-[#ede7d8] pb-3 shrink-0">
        <div className="flex items-center justify-between gap-2">
          {/* Back & Dashboard */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleBack}
              className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold tracking-wide text-[#193d2b] bg-white hover:bg-[#efe9d8] active:bg-[#e4dcce] border border-[#d6cbaf] shadow-sm active:scale-95 transition-all cursor-pointer"
            >
              Back
            </button>
            <Link
              href="/"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#1e402e] bg-white hover:bg-[#efe9d8] border border-[#ded5c0] shadow-sm transition-all"
            >
              Dashboard
            </Link>
          </div>

          {/* Surah Title Badge in center */}
          <div className="text-center min-w-0 flex-1 px-1">
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <span className="font-bold text-sm sm:text-base text-[#112a1d] truncate">
                {currentMeta.number}. {currentMeta.name}
              </span>
              <span className="font-quran text-base sm:text-lg text-emerald-900" dir="rtl">
                {currentMeta.arabicName}
              </span>
              <span className="text-[10px] sm:text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0">
                Tajweed 16-Line
              </span>
            </div>
          </div>

          {/* Action buttons (Fullscreen, Open Tab, Download) */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Fullscreen Toggle */}
            <button
              onClick={() => setIsFullscreen((prev) => !prev)}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-white hover:bg-[#efe9d8] border border-[#ded5c0] text-[#112a1d] text-xs font-semibold shadow-sm transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              <svg
                className="w-4 h-4 text-emerald-800"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                {isFullscreen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 9L4 4m0 0h5m-5 0v5m11 11l5 5m0 0h-5m5 0v-5m-5-11l5-5m0 0h-5m5 0v5M9 15l-5 5m0 0h5m-5 0v-5"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5h-4m4 0v-4m0 4l-5-5"
                  />
                )}
              </svg>
              <span className="hidden md:inline">{isFullscreen ? "Exit" : "Expand"}</span>
            </button>

            {/* Open in New Tab Button */}
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white border border-emerald-600 text-xs font-semibold shadow-sm transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
              title="Open current Surah PDF in new tab"
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              <span className="hidden sm:inline">Open Tab</span>
            </a>

            {/* Download / Saved Offline Button */}
            <button
              onClick={handleDownloadFile}
              disabled={isDownloading}
              className={`p-2 sm:px-3 sm:py-1.5 rounded-xl border text-xs font-semibold shadow-sm transition-all flex items-center gap-1 active:scale-95 cursor-pointer ${
                isSavedOffline
                  ? "bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-900"
                  : "bg-white hover:bg-[#efe9d8] border-[#ded5c0] text-[#112a1d]"
              }`}
              title={isSavedOffline ? "Saved for offline reading" : "Download Surah PDF for offline use"}
            >
              {isDownloading ? (
                <>
                  <span className="animate-spin text-xs">⏳</span>
                  <span className="hidden sm:inline">Saving…</span>
                </>
              ) : isSavedOffline ? (
                <>
                  <svg className="w-4 h-4 text-emerald-700" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="hidden sm:inline">Saved Offline</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 text-[#527060]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span className="hidden sm:inline">Download</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Second Row: Surah Selector & Prev/Next Navigation */}
        <div className="flex items-center justify-between gap-2 bg-white border border-[#ded5c0] rounded-xl p-1.5 sm:p-2 shadow-sm">
          {/* Previous Surah Button */}
          <button
            onClick={() => handleSelectSurah(Math.max(1, selectedSurah - 1))}
            disabled={selectedSurah <= 1}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
              selectedSurah <= 1
                ? "text-neutral-300 cursor-not-allowed"
                : "text-[#112a1d] hover:bg-[#faf7ee] border border-transparent hover:border-[#ded5c0] active:scale-95 cursor-pointer"
            }`}
            title="Previous Surah"
          >
            <span>←</span>
            <span className="hidden sm:inline">Previous</span>
          </button>

          {/* Surah Dropdown Selector */}
          <div className="relative flex-1 max-w-sm">
            <button
              onClick={() => setIsDropdownOpen((v) => !v)}
              className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-[#fbf9f4] hover:bg-[#f6f1e3] border border-[#ded5c0] text-xs sm:text-sm font-semibold text-[#112a1d] transition-all cursor-pointer"
            >
              <span className="truncate">
                {currentMeta.number}. {currentMeta.name} ({currentMeta.arabicName})
              </span>
              <svg className="w-4 h-4 text-[#527060] shrink-0 ml-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white border border-[#ded5c0] rounded-xl shadow-xl max-h-72 overflow-hidden flex flex-col">
                <div className="p-2 border-b border-[#ede7d8] bg-[#faf7ee]">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search Surah by name or number..."
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#ded5c0] text-xs text-[#112a1d] placeholder-[#859f90] focus:outline-none focus:border-emerald-600"
                    autoFocus
                  />
                </div>
                <div className="overflow-y-auto p-1 divide-y divide-[#f6f1e3]">
                  {filteredSurahs.map((s) => (
                    <button
                      key={s.number}
                      onClick={() => handleSelectSurah(s.number)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between hover:bg-[#f6f1e3] transition-colors cursor-pointer ${
                        s.number === selectedSurah
                          ? "bg-emerald-50 text-emerald-900 font-bold border border-emerald-200"
                          : "text-[#112a1d]"
                      }`}
                    >
                      <span>
                        {s.number}. {s.name}
                      </span>
                      <span className="font-quran text-sm text-emerald-800" dir="rtl">
                        {s.arabicName}
                      </span>
                    </button>
                  ))}
                  {filteredSurahs.length === 0 && (
                    <div className="p-4 text-center text-xs text-[#859f90]">
                      No Surah found matching &quot;{searchQuery}&quot;
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Next Surah Button */}
          <button
            onClick={() => handleSelectSurah(Math.min(114, selectedSurah + 1))}
            disabled={selectedSurah >= 114}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
              selectedSurah >= 114
                ? "text-neutral-300 cursor-not-allowed"
                : "text-[#112a1d] hover:bg-[#faf7ee] border border-transparent hover:border-[#ded5c0] active:scale-95 cursor-pointer"
            }`}
            title="Next Surah"
          >
            <span className="hidden sm:inline">Next</span>
            <span>→</span>
          </button>
        </div>
      </div>

      {/* Native HTML5 Canvas PDF Viewer (Mobile & Offline 100% Compatible) */}
      <PdfCanvasViewer
        key={`tajweed-canvas-${selectedSurah}`}
        pdfUrl={pdfUrl}
        pdfBlob={cachedBlob}
        onSaveOffline={async (blob) => {
          try {
            await saveTajweedPdf(selectedSurah, blob, currentMeta.name);
            setCachedBlob(blob);
            setIsSavedOffline(true);
          } catch {}
        }}
        title={`Surah ${currentMeta.name} Tajweed`}
      />

      {/* Bottom Footer Note with optional link to full 597MB Mushaf */}
      <div className="flex items-center justify-between text-[11px] text-[#527060] px-1 pt-1">
        <span>Authentic Color-Coded Tajweed Quran (16-Line)</span>
        <a
          href={fullMushafUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-emerald-800 underline decoration-dotted"
          title="Download the full 597 MB master Tajweed Quran PDF"
        >
          Complete Quran PDF (597 MB)
        </a>
      </div>
    </div>
  );
}
