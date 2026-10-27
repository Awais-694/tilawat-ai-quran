"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { SURAHS_META, getSurahMeta } from "@/lib/quran/data";
import { PdfCanvasViewer } from "@/components/common/PdfCanvasViewer";
import { getTajweedPdf, saveTajweedPdf } from "@/lib/storage/tajweedStorage";
import { TajweedIndexClient } from "./TajweedIndexClient";
import { useStreakTracker, StreakNotificationToast } from "@/lib/quran/streakTracker";

interface TajweedViewerProps {
  initialSurah: number;
  initialPage?: number;
}

function TajweedViewer({ initialSurah, initialPage }: TajweedViewerProps) {
  const router = useRouter();
  const [selectedSurah, setSelectedSurah] = useState<number>(
    initialSurah >= 1 && initialSurah <= 114 ? initialSurah : 1
  );
  const currentMeta = useMemo(() => getSurahMeta(selectedSurah) || SURAHS_META[0], [selectedSurah]);

  // Offline caching states
  const [cachedBlob, setCachedBlob] = useState<Blob | null>(null);
  const [isSavedOffline, setIsSavedOffline] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Determine starting page from prop or saved bookmark
  const startPage = useMemo(() => {
    if (initialPage && initialPage > 0) return initialPage;
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("tilawat_last_tajweed_read");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.surahNumber === selectedSurah && parsed?.pageNumber > 0) {
            return parsed.pageNumber;
          }
        }
      } catch {}
    }
    return 1;
  }, [initialPage, selectedSurah]);

  // Immediately save/update Tajweed bookmark on mount / surah change
  useEffect(() => {
    try {
      const bookmark = {
        surahNumber: selectedSurah,
        surahName: currentMeta.name,
        arabicName: currentMeta.arabicName,
        pageNumber: startPage,
        timestamp: Date.now(),
      };
      localStorage.setItem("tilawat_last_tajweed_read", JSON.stringify(bookmark));
    } catch (e) {
      console.warn("Failed to save tajweed bookmark on mount:", e);
    }
  }, [selectedSurah, currentMeta, startPage]);

  // Handle page turn updates in Tajweed viewer
  const handlePageChange = useCallback(
    (page: number, totalPages: number) => {
      try {
        const bookmark = {
          surahNumber: selectedSurah,
          surahName: currentMeta.name,
          arabicName: currentMeta.arabicName,
          pageNumber: page,
          totalPages,
          timestamp: Date.now(),
        };
        localStorage.setItem("tilawat_last_tajweed_read", JSON.stringify(bookmark));
      } catch (e) {
        console.warn("Failed to update tajweed bookmark:", e);
      }
    },
    [selectedSurah, currentMeta]
  );

  // Streak & Active reading timer (30 seconds threshold for 1-day streak)
  const { showToast, dismissToast } = useStreakTracker({
    mode: "tajweed",
    surahNumber: selectedSurah,
  });

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
    if (initialSurah >= 1 && initialSurah <= 114) {
      setSelectedSurah(initialSurah);
    }
  }, [initialSurah]);

  const handleSelectSurah = (surahNum: number) => {
    setSelectedSurah(surahNum);
    try {
      localStorage.setItem("tilawat_last_tajweed_surah", String(surahNum));
      router.push(`/tajweed?surah=${surahNum}`);
    } catch {}
  };

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  const pdfUrl = `/api/pdf/tajweed/${selectedSurah}`;
  const downloadUrl = `/api/pdf/tajweed/${selectedSurah}?download=1`;

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

  return (
    <div className="max-w-5xl mx-auto space-y-4 pb-16 px-2 sm:px-0">
      {/* 1 Day Streak Notification Toast */}
      <StreakNotificationToast show={showToast} mode="tajweed" onClose={dismissToast} />

      {/* Top Navigation & Controls Bar */}
      <div className="flex flex-col gap-2.5 border-b border-[#ede7d8] pb-3 shrink-0">
        <div className="flex items-center justify-between gap-2 bg-white border border-[#ded5c0] rounded-2xl px-2.5 py-1.5 sm:px-3 sm:py-2 shadow-xs">
          {/* Back to Surahs list */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={() => router.push("/tajweed")}
              className="inline-flex items-center justify-center px-2.5 py-1.5 rounded-xl text-xs font-semibold text-[#193d2b] bg-[#faf7ee] hover:bg-[#efe8d6] active:bg-[#e4dcce] border border-[#d6cbaf] shadow-2xs active:scale-95 transition-all cursor-pointer"
              title="Back to all 114 Surahs"
            >
              <span>←</span>
              <span className="font-medium ml-1">Surahs</span>
            </button>
          </div>

          {/* Surah Title Badge in center */}
          <div className="text-center min-w-0 flex-1 px-1">
            <div className="flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap">
              <span className="font-bold text-xs sm:text-sm text-[#112a1d] truncate">
                {currentMeta.number}. {currentMeta.name}
              </span>
              <span className="font-quran text-sm sm:text-base text-emerald-900 font-semibold" dir="rtl">
                ({currentMeta.arabicName})
              </span>
              <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0 hidden sm:inline">
                Tajweed 16-Line
              </span>
            </div>
          </div>

          {/* Action buttons (Open Tab, Download) */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Open in New Tab Button */}
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white border border-emerald-600 text-xs font-semibold shadow-2xs transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
              title="Open current Surah PDF in new tab"
            >
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              <span className="hidden sm:inline">Open Tab</span>
            </a>

            {/* Download / Saved Offline Button */}
            <button
              onClick={handleDownloadFile}
              disabled={isDownloading}
              className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border text-xs font-semibold shadow-2xs transition-all flex items-center gap-1 active:scale-95 cursor-pointer ${
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
                  <svg className="w-3.5 h-3.5 text-emerald-700" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="hidden sm:inline">Saved</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5 text-[#527060]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span className="hidden sm:inline">Download</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Native HTML5 Canvas PDF Viewer (Mobile & Offline 100% Compatible) */}
      <PdfCanvasViewer
        key={`tajweed-canvas-${selectedSurah}`}
        pdfUrl={pdfUrl}
        pdfBlob={cachedBlob}
        initialPage={startPage}
        onPageChange={handlePageChange}
        onSaveOffline={async (blob) => {
          try {
            await saveTajweedPdf(selectedSurah, blob, currentMeta.name);
            setCachedBlob(blob);
            setIsSavedOffline(true);
          } catch {}
        }}
        title={`Surah ${currentMeta.name} Tajweed`}
      />

      {/* Bottom Footer Note */}
      <div className="flex items-center justify-between text-[11px] text-[#527060] px-1 pt-1">
        <span>Authentic Color-Coded Tajweed Quran (16-Line)</span>
        <span className="text-[#859f90]">114 Surahs High Definition PDF</span>
      </div>
    </div>
  );
}

export function TajweedViewerClient() {
  const searchParams = useSearchParams();
  const surahParam = searchParams.get("surah");
  const pageParam = searchParams.get("page");

  if (!surahParam) {
    return <TajweedIndexClient />;
  }

  const sNum = parseInt(surahParam, 10);
  const validSurah = !isNaN(sNum) && sNum >= 1 && sNum <= 114 ? sNum : 1;
  const pNum = pageParam ? parseInt(pageParam, 10) : undefined;
  const validPage = pNum && !isNaN(pNum) && pNum > 0 ? pNum : undefined;

  return <TajweedViewer initialSurah={validSurah} initialPage={validPage} />;
}
