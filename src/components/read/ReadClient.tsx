"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SURAHS_META, type LoadedSurah } from "@/lib/quran/data";
import {
  getMushaf16Pdf,
  saveMushaf16Pdf,
  isMushaf16PdfSaved,
} from "@/lib/storage/mushaf16Storage";

export function ReadClient({
  surahNumber,
  initialSurah,
}: {
  surahNumber: number;
  initialSurah?: LoadedSurah | null;
}) {
  const router = useRouter();
  const meta = useMemo(() => {
    return SURAHS_META.find((s) => s.number === surahNumber) || SURAHS_META[0];
  }, [surahNumber]);

  const [isFullscreenPdf, setIsFullscreenPdf] = useState(false);
  const [isSavedOffline, setIsSavedOffline] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [offlineBlobUrl, setOfflineBlobUrl] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const activeBlobUrlRef = useRef<string | null>(null);

  // Reliable API route for fallback / direct download
  const serverPdfUrl = `/api/pdf/mushaf16/${surahNumber}`;
  const directDownloadUrl = `/api/pdf/mushaf16/${surahNumber}?download=1`;

  // The active PDF URL passed to the iframe
  const activePdfUrl = useMemo(() => {
    if (offlineBlobUrl) {
      return `${offlineBlobUrl}#view=FitH&toolbar=1&navpanes=1`;
    }
    return `${serverPdfUrl}#view=FitH&toolbar=1&navpanes=1`;
  }, [offlineBlobUrl, serverPdfUrl]);

  // Clean up blob URLs when surah changes or component unmounts
  const cleanupBlobUrl = useCallback(() => {
    if (activeBlobUrlRef.current) {
      URL.revokeObjectURL(activeBlobUrlRef.current);
      activeBlobUrlRef.current = null;
    }
  }, []);

  // Check IndexedDB on mount / surah change, and auto-cache in background if not saved
  useEffect(() => {
    let isCancelled = false;

    async function loadOrCachePdf() {
      cleanupBlobUrl();
      setOfflineBlobUrl(null);
      setIsSavedOffline(false);

      try {
        // 1. Check if already saved in local IndexedDB
        const localBlob = await getMushaf16Pdf(surahNumber);
        if (isCancelled) return;

        if (localBlob) {
          const blobUrl = URL.createObjectURL(localBlob);
          activeBlobUrlRef.current = blobUrl;
          setOfflineBlobUrl(blobUrl);
          setIsSavedOffline(true);
          return;
        }

        // 2. If not saved in IndexedDB, fetch and automatically save permanently into IndexedDB!
        const res = await fetch(serverPdfUrl);
        if (res.ok && !isCancelled) {
          const blob = await res.blob();
          if (isCancelled) return;
          await saveMushaf16Pdf(surahNumber, blob, meta.name);
          if (isCancelled) return;

          const blobUrl = URL.createObjectURL(blob);
          activeBlobUrlRef.current = blobUrl;
          setOfflineBlobUrl(blobUrl);
          setIsSavedOffline(true);
        }
      } catch (err) {
        console.error("Auto-caching PDF error (will stream via server route):", err);
      }
    }

    void loadOrCachePdf();

    return () => {
      isCancelled = true;
      cleanupBlobUrl();
    };
  }, [surahNumber, meta.name, serverPdfUrl, cleanupBlobUrl]);

  // Download PDF to device (and save locally into IndexedDB)
  const handleDownloadAndSave = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    setStatusMessage("ڈاؤنلوڈ جاری ہے... محفوظ کیا جا رہا ہے");

    try {
      let blobToUse: Blob | null = null;
      const existingBlob = await getMushaf16Pdf(surahNumber);

      if (existingBlob) {
        blobToUse = existingBlob;
      } else {
        const res = await fetch(serverPdfUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        blobToUse = await res.blob();
        await saveMushaf16Pdf(surahNumber, blobToUse, meta.name);
      }

      if (blobToUse) {
        if (!offlineBlobUrl) {
          const newUrl = URL.createObjectURL(blobToUse);
          activeBlobUrlRef.current = newUrl;
          setOfflineBlobUrl(newUrl);
        }
        setIsSavedOffline(true);

        // Trigger native browser download to save file to phone/PC
        const a = document.createElement("a");
        const downloadBlobUrl = URL.createObjectURL(blobToUse);
        a.href = downloadBlobUrl;
        a.download = `Surah-${surahNumber}-${meta.name}-16Line.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(downloadBlobUrl), 10000);

        setStatusMessage("سورت پی ڈی ایف کامیابی سے محفوظ اور ڈاؤنلوڈ ہو چکی ہے!");
        setTimeout(() => setStatusMessage(null), 3500);
      }
    } catch (err) {
      console.error("Download failed:", err);
      setStatusMessage("ڈاؤنلوڈ میں خرابی آئی۔ براہ کرم انٹرنیٹ چیک کریں۔");
      setTimeout(() => setStatusMessage(null), 4000);
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
    <div
      className={`max-w-4xl mx-auto space-y-3 pb-8 w-full max-w-full overflow-x-hidden ${
        isFullscreenPdf ? "fixed inset-0 z-50 bg-[#f8f6f0] p-2 space-y-2 max-w-none pb-2 flex flex-col" : "px-2 sm:px-0"
      }`}
    >
      {/* Status Alert Notification */}
      {statusMessage && (
        <div className="bg-emerald-800 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl shadow-md text-center transition-all animate-fade-in flex items-center justify-center gap-2">
          <span>✓</span>
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Top Header Controls Toolbar */}
      <div className="space-y-2 shrink-0">
        {/* Row 1: Back to Surahs, Surah Title, Offline Badge & Action Buttons */}
        <div className="flex items-center justify-between gap-2 bg-white border border-[#ded5c0] rounded-2xl p-2 sm:p-2.5 shadow-xs flex-wrap">
          <div className="flex items-center gap-2">
            <Link
              href="/read"
              className="px-3 py-1.5 rounded-xl bg-[#faf7ee] hover:bg-[#efe8d6] active:bg-[#e4dcce] border border-[#ded5c0] text-xs font-semibold text-[#112a1d] shadow-xs active:scale-95 transition-all shrink-0"
            >
              ← Surahs
            </Link>

            <div className="flex items-baseline gap-1.5 min-w-0">
              <span className="font-bold text-sm sm:text-base text-[#112a1d] truncate">
                {meta.number}. {meta.name}
              </span>
              <span className="font-quran text-emerald-900 text-sm hidden sm:inline" dir="rtl">
                ({meta.arabicName})
              </span>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-wrap">
            {/* Offline Saved Badge / Download Button */}
            <button
              onClick={handleDownloadAndSave}
              disabled={isDownloading}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-xs cursor-pointer ${
                isSavedOffline
                  ? "bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900"
                  : "bg-gradient-to-r from-emerald-700 to-teal-800 hover:from-emerald-800 text-white"
              }`}
              title={
                isSavedOffline
                  ? "Already saved in offline storage. Click to download PDF file to device."
                  : "Save PDF locally in offline storage and download to device."
              }
            >
              {isDownloading ? (
                <>
                  <span className="animate-spin text-xs">⏳</span>
                  <span>Saving…</span>
                </>
              ) : isSavedOffline ? (
                <>
                  <svg className="w-3.5 h-3.5 text-emerald-700" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Saved Offline</span>
                  <span className="text-[10px] opacity-75 font-normal hidden sm:inline">(Download)</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  <span>Download & Save</span>
                </>
              )}
            </button>

            {/* Open in New Tab Button */}
            <a
              href={offlineBlobUrl || serverPdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-[#faf7ee] border border-[#ded5c0] text-xs font-semibold text-[#112a1d] flex items-center gap-1 active:scale-95 transition-all shadow-xs"
              title="Open full PDF in a dedicated browser tab"
            >
              <svg className="w-3.5 h-3.5 text-[#527060]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
              <span className="hidden sm:inline">Open Tab</span>
            </a>

            {/* Recite Mode with Mic */}
            <Link
              href={`/recite/${surahNumber}`}
              className="px-2.5 py-1.5 rounded-xl bg-[#faf7ee] hover:bg-[#efe8d6] border border-[#ded5c0] text-emerald-900 font-bold text-xs flex items-center gap-1 shadow-xs active:scale-95 transition-all"
              title="Test recitation with microphone"
            >
              <svg className="w-3.5 h-3.5 text-emerald-800" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
              </svg>
              <span>Recite</span>
            </Link>

            {/* Fullscreen Expand/Collapse */}
            <button
              onClick={() => setIsFullscreenPdf((f) => !f)}
              className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-[#faf7ee] border border-[#ded5c0] text-[#112a1d] text-xs font-semibold active:scale-95 transition-all shadow-xs cursor-pointer"
              title={isFullscreenPdf ? "Exit Fullscreen" : "Fullscreen View"}
            >
              {isFullscreenPdf ? "Exit ✕" : "⛶ Expand"}
            </button>
          </div>
        </div>

        {/* Row 2: Surah Navigation & Jump Dropdown (Prev, Select 1-114, Next) */}
        <div className="flex items-center justify-between gap-2 bg-[#fbf9f4] border border-[#ded5c0] rounded-xl p-1.5 shadow-xs">
          <button
            onClick={() => router.push(`/read/${Math.max(1, surahNumber - 1)}`)}
            disabled={surahNumber <= 1}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
              surahNumber <= 1
                ? "text-neutral-300 cursor-not-allowed"
                : "text-[#112a1d] hover:bg-white border border-transparent hover:border-[#ded5c0] active:scale-95 cursor-pointer"
            }`}
            title="Previous Surah"
          >
            <span>←</span>
            <span className="hidden xs:inline">Prev Surah</span>
          </button>

          <select
            value={surahNumber}
            onChange={(e) => router.push(`/read/${e.target.value}`)}
            className="flex-1 max-w-sm text-xs sm:text-sm font-bold text-[#112a1d] bg-white border border-[#ded5c0] rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer truncate shadow-2xs text-center"
          >
            {SURAHS_META.map((s) => (
              <option key={s.number} value={s.number}>
                {s.number}. {s.name} ({s.arabicName})
              </option>
            ))}
          </select>

          <button
            onClick={() => router.push(`/read/${Math.min(114, surahNumber + 1)}`)}
            disabled={surahNumber >= 114}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
              surahNumber >= 114
                ? "text-neutral-300 cursor-not-allowed"
                : "text-[#112a1d] hover:bg-white border border-transparent hover:border-[#ded5c0] active:scale-95 cursor-pointer"
            }`}
            title="Next Surah"
          >
            <span className="hidden xs:inline">Next Surah</span>
            <span>→</span>
          </button>
        </div>
      </div>

      {/* Scanned 16-Line Authentic Taj Company PDF Viewer (Exclusively & Directly) */}
      <div
        className={`w-full rounded-2xl overflow-hidden border border-[#ded5c0] bg-white shadow-sm relative flex flex-col ${
          isFullscreenPdf ? "flex-1" : "h-[82vh] sm:h-[88vh]"
        }`}
      >
        <iframe
          key={activePdfUrl}
          src={activePdfUrl}
          className="w-full flex-1 border-0"
          title={`Surah ${meta.name} 16-Line Scanned PDF`}
        />
      </div>
    </div>
  );
}
