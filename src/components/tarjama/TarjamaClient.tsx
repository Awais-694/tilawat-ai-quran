"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import surahsMeta from "@/data/surahs-meta.json";
import {
  saveTarjamaPdf,
  getTarjamaPdf,
} from "@/lib/storage/tarjamaStorage";
import { PdfCanvasViewer } from "@/components/common/PdfCanvasViewer";
import { TarjamaIndexClient } from "./TarjamaIndexClient";

interface TarjamaViewerProps {
  initialSurah: number;
}

function TarjamaViewer({ initialSurah }: TarjamaViewerProps) {
  const router = useRouter();
  const [selectedSurahNumber, setSelectedSurahNumber] = useState<number>(
    initialSurah >= 1 && initialSurah <= 114 ? initialSurah : 1
  );

  // Offline PDF storage states
  const [isOfflineSaved, setIsOfflineSaved] = useState(false);
  const [cachedBlob, setCachedBlob] = useState<Blob | null>(null);
  const [offlineBlobUrl, setOfflineBlobUrl] = useState<string | null>(null);
  const [, setPdfSize] = useState<number | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // One-time cache migration: clear legacy misaligned / mismatched offline PDFs
  useEffect(() => {
    if (typeof window !== "undefined") {
      const v = localStorage.getItem("tarjama_cache_v3");
      if (v !== "true") {
        import("@/lib/storage/db").then(({ db }) => {
          db.tarjamaPdfs.clear().catch(() => {});
        });
        localStorage.setItem("tarjama_cache_v3", "true");
        setCachedBlob(null);
        setIsOfflineSaved(false);
      }
    }
  }, []);

  // Sync when initialSurah prop changes
  useEffect(() => {
    if (initialSurah >= 1 && initialSurah <= 114) {
      setSelectedSurahNumber(initialSurah);
    }
  }, [initialSurah]);

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

  return (
    <div className="max-w-5xl mx-auto space-y-3 pb-16 px-2 sm:px-0">
      {/* Floating Status Notification Toast */}
      {statusMessage && (
        <div className="bg-emerald-800 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl shadow-md text-center transition-all animate-fade-in flex items-center justify-center gap-2">
          <span>✓</span>
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Compact Top Navigation & Controls Bar */}
      <div className="flex flex-col gap-2.5 border-b border-[#ede7d8] pb-3 shrink-0">
        <div className="flex items-center justify-between gap-2 bg-white border border-[#ded5c0] rounded-2xl px-2.5 py-1.5 sm:px-3 sm:py-2 shadow-xs">
          {/* Back & Quick Prev/Next */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={() => router.push("/tarjama")}
              className="inline-flex items-center justify-center px-2.5 py-1.5 rounded-xl text-xs font-semibold text-[#193d2b] bg-[#faf7ee] hover:bg-[#efe8d6] active:bg-[#e4dcce] border border-[#d6cbaf] shadow-2xs active:scale-95 transition-all cursor-pointer"
              title="Back to all 114 Surahs"
            >
              <span>←</span>
              <span className="font-medium ml-1">Surahs</span>
            </button>

            {/* Quick Prev / Next Surah Navigation */}
            <div className="flex items-center bg-[#fbf9f4] border border-[#ded5c0] rounded-xl p-0.5">
              <button
                onClick={handlePrevSurah}
                disabled={!prevSurah}
                className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                  !prevSurah
                    ? "text-neutral-300 cursor-not-allowed"
                    : "text-[#112a1d] hover:bg-white active:scale-95 cursor-pointer"
                }`}
                title="Previous Surah"
              >
                <span>←</span>
                <span className="hidden md:inline text-[11px]">Prev</span>
              </button>
              <span className="text-[#ded5c0] text-xs px-0.5">|</span>
              <button
                onClick={handleNextSurah}
                disabled={!nextSurah}
                className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                  !nextSurah
                    ? "text-neutral-300 cursor-not-allowed"
                    : "text-[#112a1d] hover:bg-white active:scale-95 cursor-pointer"
                }`}
                title="Next Surah"
              >
                <span className="hidden md:inline text-[11px]">Next</span>
                <span>→</span>
              </button>
            </div>
          </div>

          {/* Surah Title Badge in center */}
          <div className="text-center min-w-0 flex-1 px-1">
            <div className="flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap">
              <span className="font-bold text-xs sm:text-sm text-[#112a1d] truncate">
                {currentSurah.number}. {currentSurah.name}
              </span>
              <span className="font-quran text-sm sm:text-base text-emerald-900 font-semibold" dir="rtl">
                ({currentSurah.arabicName})
              </span>
              <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0 hidden sm:inline">
                ترجمہ و تفسیر
              </span>
            </div>
          </div>

          {/* Action buttons (Open Tab, Download) */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Open in New Tab Button */}
            <a
              href={currentPdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white border border-emerald-600 text-xs font-semibold shadow-2xs transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
              title="Open current Surah translation in new tab"
            >
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              <span className="hidden sm:inline">Open Tab</span>
            </a>

            {/* Download / Saved Offline Button */}
            <button
              onClick={handleDownloadOffline}
              disabled={isDownloading}
              className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border text-xs font-semibold shadow-2xs transition-all flex items-center gap-1 active:scale-95 cursor-pointer ${
                isOfflineSaved
                  ? "bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-900"
                  : "bg-white hover:bg-[#efe9d8] border-[#ded5c0] text-[#112a1d]"
              }`}
              title={isOfflineSaved ? "Saved offline for reading" : "Download Surah translation for offline reading"}
            >
              {isDownloading ? (
                <>
                  <span className="animate-spin text-xs">⏳</span>
                  <span className="hidden sm:inline">Saving…</span>
                </>
              ) : isOfflineSaved ? (
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

function TarjamaContent() {
  const searchParams = useSearchParams();
  const surahParam = searchParams.get("surah");

  if (!surahParam) {
    return <TarjamaIndexClient />;
  }

  const sNum = parseInt(surahParam, 10);
  const validSurah = !isNaN(sNum) && sNum >= 1 && sNum <= 114 ? sNum : 1;

  return <TarjamaViewer initialSurah={validSurah} />;
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
