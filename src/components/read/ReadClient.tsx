"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SURAHS_META } from "@/lib/quran/data";
import {
  getMushaf16Pdf,
  saveMushaf16Pdf,
} from "@/lib/storage/mushaf16Storage";
import { PdfCanvasViewer } from "@/components/common/PdfCanvasViewer";

export function ReadClient({
  surahNumber,
}: {
  surahNumber: number;
  initialSurah?: any;
}) {
  const router = useRouter();
  const meta = useMemo(() => {
    return SURAHS_META.find((s) => s.number === surahNumber) || SURAHS_META[0];
  }, [surahNumber]);

  const [isSavedOffline, setIsSavedOffline] = useState(false);
  const [cachedBlob, setCachedBlob] = useState<Blob | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Reliable API routes
  const serverPdfUrl = `/api/pdf/mushaf16/${surahNumber}`;
  const directDownloadUrl = `/api/pdf/mushaf16/${surahNumber}?download=1`;

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
      {/* Status Toast */}
      {statusMessage && (
        <div className="bg-emerald-800 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl shadow-md text-center transition-all flex items-center justify-center gap-2">
          <span>✓</span>
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Top Header Controls Toolbar */}
      <div className="space-y-2 shrink-0">
        {/* Row 1: Back to Surahs, Surah Title, Action Buttons */}
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
            {/* Download PDF button */}
            <button
              onClick={handleDownloadFile}
              disabled={isDownloading}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-xs cursor-pointer ${
                isSavedOffline
                  ? "bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900"
                  : "bg-gradient-to-r from-emerald-700 to-teal-800 hover:from-emerald-800 text-white"
              }`}
              title="Download 16-Line Surah PDF to device"
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
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  <span>Download PDF</span>
                </>
              )}
            </button>

            {/* Open in Tab Button */}
            <a
              href={serverPdfUrl}
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

      {/* Scanned 16-Line Authentic Taj Company PDF Viewer via Native HTML5 Canvas (100% Mobile & Offline Compatible!) */}
      <PdfCanvasViewer
        key={`surah-canvas-${surahNumber}`}
        pdfUrl={serverPdfUrl}
        pdfBlob={cachedBlob}
        onSaveOffline={async (blob) => {
          setCachedBlob(blob);
          setIsSavedOffline(true);
        }}
        title={`Surah ${meta.number}. ${meta.name} (${meta.arabicName})`}
      />
    </div>
  );
}
