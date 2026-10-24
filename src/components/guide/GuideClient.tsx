"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  getGuidePdf,
  saveGuidePdf,
  downloadGuideToDevice,
} from "@/lib/storage/guideStorage";
import { PdfCanvasViewer } from "@/components/common/PdfCanvasViewer";

export function GuideClient() {
  const [cachedBlob, setCachedBlob] = useState<Blob | null>(null);
  const [isSavedOffline, setIsSavedOffline] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const guidePdfUrl = "/user-guide.pdf";

  // Check if already saved in local phone storage (IndexedDB), or auto-cache on first load
  useEffect(() => {
    let active = true;
    getGuidePdf()
      .then(async (blob) => {
        if (!active) return;
        if (blob) {
          setCachedBlob(blob);
          setIsSavedOffline(true);
        } else {
          // If first time visit, fetch and automatically save permanently to phone storage
          try {
            const res = await fetch(guidePdfUrl);
            if (res.ok) {
              const fetchedBlob = await res.blob();
              if (active && fetchedBlob.size > 1000) {
                await saveGuidePdf(fetchedBlob);
                setCachedBlob(fetchedBlob);
                setIsSavedOffline(true);
              }
            }
          } catch {}
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Save offline and download to device
  const handleSaveAndDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    setStatusMessage("رہنمائے صارف ڈاؤنلوڈ اور محفوظ ہو رہی ہے...");
    try {
      let blobToUse = cachedBlob;
      if (!blobToUse) {
        const res = await fetch(guidePdfUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        blobToUse = await res.blob();
        await saveGuidePdf(blobToUse);
        setCachedBlob(blobToUse);
        setIsSavedOffline(true);
      }
      // Also trigger device file download so it's in user's downloads folder
      downloadGuideToDevice(blobToUse);
      setStatusMessage("رہنمائے صارف فون میں مستقل محفوظ ہو گئی ہے اور ڈاؤنلوڈز میں بھی شامل کر دی گئی ہے!");
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (err) {
      console.error("Failed to download user guide:", err);
      setStatusMessage("ڈاؤنلوڈ میں خرابی آئی۔ براہ کرم انٹرنیٹ کنکشن چیک کریں۔");
      setTimeout(() => setStatusMessage(null), 5000);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-3 pb-16 px-2 sm:px-0">
      {/* Floating Notification Toast */}
      {statusMessage && (
        <div className="bg-emerald-800 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl shadow-md text-center transition-all animate-fade-in flex items-center justify-center gap-2">
          <span>✓</span>
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Top Header & Navigation Bar */}
      <div className="flex flex-col gap-2 border-b border-[#ede7d8] pb-3 shrink-0">
        <div className="flex items-center justify-between gap-2 bg-white border border-[#ded5c0] rounded-2xl px-2.5 py-1.5 sm:px-3 sm:py-2 shadow-xs">
          {/* Left: Back Button */}
          <Link
            href="/"
            className="inline-flex items-center justify-center px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-[#193d2b] bg-[#faf7ee] hover:bg-[#efe8d6] active:bg-[#e4dcce] border border-[#d6cbaf] shadow-2xs active:scale-95 transition-all cursor-pointer"
            title="Back to Home Dashboard"
          >
            <span>←</span>
            <span className="font-medium ml-1">Dashboard</span>
          </Link>

          {/* Center: Title & 11 Pages Badge */}
          <div className="text-center min-w-0 flex-1 px-1">
            <div className="flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap">
              <span className="font-bold text-xs sm:text-sm text-[#112a1d] truncate">
                مکمل اردو رہنمائے صارف
              </span>
              <span className="text-[10px] sm:text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0">
                11 صفحات (HD Guide)
              </span>
            </div>
          </div>

          {/* Right: Actions (Open Tab, Save/Download) */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Open in New Tab Button */}
            <a
              href={guidePdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white border border-emerald-600 text-xs font-semibold shadow-2xs transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
              title="Open Guide PDF in new browser tab"
            >
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              <span className="hidden sm:inline">Open Tab</span>
            </a>

            {/* Save Offline / Download Button */}
            <button
              onClick={handleSaveAndDownload}
              disabled={isDownloading}
              className={`p-1.5 sm:px-3 sm:py-1.5 rounded-xl border text-xs font-semibold shadow-2xs transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer ${
                isSavedOffline
                  ? "bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-900"
                  : "bg-gradient-to-r from-emerald-700 to-teal-800 text-white border-emerald-700 hover:from-emerald-800 hover:to-teal-900"
              }`}
              title={isSavedOffline ? "فون میں محفوظ ہے (دوبارہ ڈاؤنلوڈ کرنے کے لیے کلک کریں)" : "فون میں محفوظ کریں تاکہ بعد میں بغیر انٹرنیٹ کھلے"}
            >
              {isDownloading ? (
                <>
                  <span className="animate-spin text-xs">⏳</span>
                  <span>محفوظ ہو رہی ہے…</span>
                </>
              ) : isSavedOffline ? (
                <>
                  <svg className="w-3.5 h-3.5 text-emerald-700" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>محفوظ ہے ✓</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5 text-emerald-100" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>فون میں محفوظ کریں</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Canvas PDF Viewer */}
      <PdfCanvasViewer
        pdfUrl={guidePdfUrl}
        pdfBlob={cachedBlob}
        title="Tilawat.Ai Complete User Guide"
      />
    </div>
  );
}
