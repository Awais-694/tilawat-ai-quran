"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SURAHS_META } from "@/lib/quran/data";
import {
  getMushaf16Pdf,
  saveMushaf16Pdf,
} from "@/lib/storage/mushaf16Storage";
import { PdfCanvasViewer } from "@/components/common/PdfCanvasViewer";
import { db } from "@/lib/storage/db";
import { getLocalDateString } from "@/lib/quran/streak";
import { useStreakTracker, StreakNotificationToast } from "@/lib/quran/streakTracker";

export function ReadClient({
  surahNumber,
  initialSurah,
  initialPage,
}: {
  surahNumber: number;
  initialSurah?: any;
  initialPage?: number;
}) {
  const router = useRouter();
  const meta = useMemo(() => {
    return SURAHS_META.find((s) => s.number === surahNumber) || SURAHS_META[0];
  }, [surahNumber]);

  const [isSavedOffline, setIsSavedOffline] = useState(false);
  const [cachedBlob, setCachedBlob] = useState<Blob | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Compute starting page from prop or existing bookmark for this surah
  const startPage = useMemo(() => {
    if (initialPage && initialPage > 0) return initialPage;
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("tilawat_last_read");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.surahNumber === surahNumber && parsed?.pageNumber > 0) {
            return parsed.pageNumber;
          }
        }
      } catch {}
    }
    return 1;
  }, [initialPage, surahNumber]);

  // Immediately save/update last read bookmark when this surah is opened
  useEffect(() => {
    try {
      const bookmark = {
        surahNumber,
        surahName: meta.name,
        arabicName: meta.arabicName,
        pageNumber: startPage,
        timestamp: Date.now(),
      };
      localStorage.setItem("tilawat_last_read", JSON.stringify(bookmark));
    } catch (e) {
      console.warn("Failed to save tilawat_last_read on mount:", e);
    }
  }, [surahNumber, meta, startPage]);

  // Update last read bookmark whenever page flips in the viewer
  const handlePageChange = useCallback(
    (page: number, totalPages: number) => {
      try {
        const bookmark = {
          surahNumber,
          surahName: meta.name,
          arabicName: meta.arabicName,
          pageNumber: page,
          totalPages,
          timestamp: Date.now(),
        };
        localStorage.setItem("tilawat_last_read", JSON.stringify(bookmark));
      } catch (e) {
        console.warn("Failed to update tilawat_last_read:", e);
      }
    },
    [surahNumber, meta]
  );

  // Reliable API routes
  const serverPdfUrl = `/api/pdf/mushaf16/${surahNumber}`;
  const directDownloadUrl = `/api/pdf/mushaf16/${surahNumber}?download=1`;

  // Active reading live timer: accumulates reading time while tab is visible
  // Streak & Active reading timer (30 seconds threshold for 1-day streak)
  const { showToast, dismissToast } = useStreakTracker({
    mode: "read16",
    surahNumber,
  });

  // Check if saved offline in IndexedDB
  useEffect(() => {
    let active = true;
    setCachedBlob(null);
    setIsSavedOffline(false);

    getMushaf16Pdf(surahNumber)
      .then((blob) => {
        if (!active) return;
        if (blob) {
          setCachedBlob(blob);
          setIsSavedOffline(true);
        }
      })
      .catch((err) => {
        console.error("IndexedDB read error:", err);
      });

    return () => {
      active = false;
    };
  }, [surahNumber]);

  // Download PDF file directly to device storage
  const handleDownloadFile = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    setStatusMessage("ڈاؤنلوڈ جاری ہے...");

    try {
      let blobToUse = cachedBlob;
      if (!blobToUse) {
        const res = await fetch(serverPdfUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        blobToUse = await res.blob();
        await saveMushaf16Pdf(surahNumber, blobToUse, meta.name);
        setCachedBlob(blobToUse);
        setIsSavedOffline(true);
      }

      // Trigger native download
      const downloadUrl = URL.createObjectURL(blobToUse);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `Surah_${surahNumber}_${meta.name}_16Line.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 10000);

      setStatusMessage("پی ڈی ایف کامیابی سے ڈاؤنلوڈ ہو گئی ہے!");
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err) {
      console.error("Download error:", err);
      // Fallback to direct download URL
      window.open(directDownloadUrl, "_blank");
      setStatusMessage(null);
    } finally {
      setIsDownloading(false);
    }
  };

  // Keyboard navigation for Surahs
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && surahNumber < 114) {
        router.push(`/read/${surahNumber + 1}`);
      }
      if (e.key === "ArrowRight" && surahNumber > 1) {
        router.push(`/read/${surahNumber - 1}`);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [surahNumber, router]);

  return (
    <div className="max-w-3xl mx-auto space-y-3 pb-12 w-full px-2 sm:px-0">
      {/* 1 Day Streak Notification Toast */}
      <StreakNotificationToast show={showToast} mode="read16" onClose={dismissToast} />

      {/* Status Toast */}
      {statusMessage && (
        <div className="bg-emerald-800 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl shadow-md text-center transition-all flex items-center justify-between gap-2 max-w-xl mx-auto">
          <div className="flex items-center gap-2 flex-1 justify-center">
            <span>✓</span>
            <span>{statusMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="w-6 h-6 rounded-full hover:bg-white/20 active:scale-95 flex items-center justify-center text-xs text-white/90 font-bold cursor-pointer shrink-0"
            title="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Header Controls Toolbar - Single Compact & Well-Organized Row */}
      <div className="bg-white border border-[#ded5c0] rounded-2xl px-2.5 py-1.5 sm:px-3 sm:py-2 shadow-xs flex items-center justify-between gap-2 shrink-0">
        {/* Left: Back to Surahs & Title */}
        <div className="flex items-center gap-2 min-w-0">
          <Link
            href="/read"
            className="px-2.5 py-1 rounded-xl bg-[#faf7ee] hover:bg-[#efe8d6] active:bg-[#e4dcce] border border-[#ded5c0] text-xs font-semibold text-[#112a1d] shadow-2xs active:scale-95 transition-all shrink-0 flex items-center gap-1"
            title="All Surahs"
          >
            <span>←</span>
            <span className="font-medium">Surahs</span>
          </Link>

          <div className="flex items-baseline gap-1.5 min-w-0">
            <span className="font-bold text-xs sm:text-sm text-[#112a1d] truncate">
              {meta.number}. {meta.name}
            </span>
            <span className="font-quran text-emerald-900 text-xs sm:text-sm font-semibold hidden sm:inline" dir="rtl">
              ({meta.arabicName})
            </span>
          </div>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">

          {/* Download PDF button */}
          <button
            onClick={handleDownloadFile}
            disabled={isDownloading}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-2xs cursor-pointer ${
              isSavedOffline
                ? "bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900"
                : "bg-emerald-800 hover:bg-emerald-900 text-white"
            }`}
            title="Download 16-Line Surah PDF"
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
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                <span className="hidden sm:inline">Download</span>
              </>
            )}
          </button>

          {/* Open in Tab Button */}
          <a
            href={serverPdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-white hover:bg-[#faf7ee] border border-[#ded5c0] text-xs font-semibold text-[#112a1d] flex items-center gap-1 active:scale-95 transition-all shadow-2xs"
            title="Open PDF in dedicated browser tab"
          >
            <svg className="w-3.5 h-3.5 text-[#527060]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
          </a>
        </div>
      </div>

      {/* Scanned 16-Line Authentic Taj Company PDF Viewer via Native HTML5 Canvas (100% Mobile & Offline Compatible!) */}
      <PdfCanvasViewer
        key={`surah-canvas-${surahNumber}`}
        pdfUrl={serverPdfUrl}
        pdfBlob={cachedBlob}
        initialPage={startPage}
        onPageChange={handlePageChange}
        onSaveOffline={async (blob) => {
          try {
            await saveMushaf16Pdf(surahNumber, blob, meta.name);
            setCachedBlob(blob);
            setIsSavedOffline(true);
          } catch (e) {
            console.warn("Failed to auto-save 16-line PDF offline:", e);
          }
        }}
        title={`Surah ${meta.number}. ${meta.name} (${meta.arabicName})`}
      />
    </div>
  );
}
