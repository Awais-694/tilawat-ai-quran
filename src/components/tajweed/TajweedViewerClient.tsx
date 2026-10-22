"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function TajweedViewerClient() {
  const router = useRouter();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const pdfUrl = "/tajveed-e-al-quran-ul-kareem.pdf";

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  return (
    <div
      className={`mx-auto transition-all duration-300 ${
        isFullscreen
          ? "fixed inset-0 z-50 bg-[#f8f6f0] p-2 sm:p-4 flex flex-col"
          : "max-w-5xl space-y-4 pb-16 px-2 sm:px-0"
      }`}
    >
      {/* Top Navigation & Toolbar Bar */}
      <div className="flex items-center justify-between gap-2 border-b border-[#ede7d8] pb-3 shrink-0">
        {/* Back Button */}
        <div className="flex items-center gap-2">
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

        {/* Center Title */}
        <div className="text-center min-w-0">
          <h1 className="font-bold text-sm sm:text-base text-[#112a1d] truncate">
            Tajweed-e-Al-Quran-ul-Kareem
          </h1>
          <p className="text-[11px] text-[#527060] font-quran" dir="rtl">
            تجويد القرآن الكريم (Color Coded PDF)
          </p>
        </div>

        {/* Action Controls: Fullscreen, Open in Tab, Download */}
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
            <span className="hidden md:inline">
              {isFullscreen ? "Exit" : "Expand"}
            </span>
          </button>

          {/* Open in New Tab Button */}
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white border border-emerald-600 text-xs font-semibold shadow-sm transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
            title="Open PDF directly in new tab"
          >
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
            <span className="hidden sm:inline">Open Tab</span>
          </a>

          {/* Download Button */}
          <a
            href={pdfUrl}
            download="tajveed-e-al-quran-ul-kareem.pdf"
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-white hover:bg-[#efe9d8] border border-[#ded5c0] text-[#112a1d] text-xs font-semibold shadow-sm transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
            title="Download PDF"
          >
            <svg
              className="w-4 h-4 text-[#527060]"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            <span className="hidden sm:inline">Download</span>
          </a>
        </div>
      </div>

      {/* Embedded High-Performance PDF Frame */}
      <div
        className={`w-full rounded-2xl overflow-hidden border border-[#ded5c0] bg-white shadow-sm relative ${
          isFullscreen ? "flex-1" : "h-[78vh] sm:h-[84vh]"
        }`}
      >
        <object
          data={pdfUrl}
          type="application/pdf"
          className="w-full h-full border-0"
        >
          {/* Fallback for browsers / devices that do not support inline PDF object */}
          <div className="flex flex-col items-center justify-center p-6 sm:p-10 text-center h-full bg-[#fbf9f4] text-[#112a1d]">
            <div className="w-16 h-16 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-3xl mb-3 shadow-sm text-emerald-800">
              📖
            </div>
            <h2 className="text-lg sm:text-xl font-bold mb-1">
              Tajweed-e-Al-Quran-ul-Kareem
            </h2>
            <p className="text-xs sm:text-sm text-[#527060] mb-4 max-w-md">
              Your browser may not support embedding high-resolution PDF files directly inside this view. You can open or download the complete Tajweed Mushaf below:
            </p>

            <div className="flex flex-col sm:flex-row gap-2.5 w-full max-w-sm">
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
              >
                <span>Open Tajweed Quran PDF</span>
              </a>

              <a
                href={pdfUrl}
                download="tajveed-e-al-quran-ul-kareem.pdf"
                className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-[#efe9d8] border border-[#ded5c0] text-[#112a1d] font-semibold text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
              >
                <span>Download PDF</span>
              </a>
            </div>
          </div>
        </object>
      </div>
    </div>
  );
}
