"use client";

import { useEffect, useState } from "react";

// Declare window global augmentation
declare global {
  interface Window {
    __BISMILLAH_PAGE_LOAD_ID?: string;
    __BISMILLAH_SHOWN_IN_LOAD?: boolean;
  }
}

export function BismillahSplash() {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Fast check: if already displayed in this browser document load, exit immediately
    if (window.__BISMILLAH_SHOWN_IN_LOAD) {
      return;
    }

    // Initialize unique page load identifier once per full browser document load
    if (!window.__BISMILLAH_PAGE_LOAD_ID) {
      window.__BISMILLAH_PAGE_LOAD_ID = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    }

    // Check browser navigation type
    let isBackForward = false;
    let isReload = false;
    try {
      const navEntry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      if (navEntry) {
        if (navEntry.type === "back_forward") isBackForward = true;
        if (navEntry.type === "reload") isReload = true;
      } else if (window.performance && (window.performance as unknown as { navigation?: { type: number } }).navigation) {
        const type = (window.performance as unknown as { navigation: { type: number } }).navigation.type;
        if (type === 2) isBackForward = true;
        if (type === 1) isReload = true;
      }
    } catch {
      // safe fallback
    }

    // Never display on browser back/forward history navigation
    if (isBackForward) {
      window.__BISMILLAH_SHOWN_IN_LOAD = true;
      return;
    }

    // Check sessionStorage to verify whether this is an internal client-side route navigation
    // (e.g. clicking "Weekly Report", "Back", "Surahs", etc.) vs a fresh reload or app open
    let isSameClientSession = false;
    try {
      const storedPageLoadId = sessionStorage.getItem("tilawat_bismillah_page_load");
      if (storedPageLoadId === window.__BISMILLAH_PAGE_LOAD_ID) {
        isSameClientSession = true;
      }
    } catch {
      // safe fallback
    }

    // Client-side route transitions (like clicking "Weekly Report" or "Back")
    // must NEVER trigger the splash screen!
    if (isSameClientSession && !isReload) {
      window.__BISMILLAH_SHOWN_IN_LOAD = true;
      return;
    }

    // Mark as shown for this document load and session
    window.__BISMILLAH_SHOWN_IN_LOAD = true;
    try {
      sessionStorage.setItem("tilawat_bismillah_page_load", window.__BISMILLAH_PAGE_LOAD_ID);
    } catch {
      // ignore
    }

    // Display splash screen on fresh app open or browser reload
    setVisible(true);

    const timer = setTimeout(() => {
      setFading(true);
      const hideTimer = setTimeout(() => {
        setVisible(false);
      }, 700);
      return () => clearTimeout(hideTimer);
    }, 2400);

    return () => clearTimeout(timer);
  }, []);

  // Ensure BFCache restore (pageshow with persisted) never displays splash
  useEffect(() => {
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        setVisible(false);
      }
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  const handleDismiss = () => {
    if (typeof window !== "undefined") {
      window.__BISMILLAH_SHOWN_IN_LOAD = true;
    }
    setFading(true);
    setTimeout(() => setVisible(false), 300);
  };

  if (!visible) return null;

  return (
    <div
      onClick={handleDismiss}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center p-5 sm:p-6 bg-[#fbf9f4]/95 backdrop-blur-md select-none transition-all duration-700 cursor-pointer ${
        fading ? "opacity-0 scale-95 pointer-events-none" : "opacity-100 scale-100"
      }`}
      aria-label="Opening Bismillah Screen"
      role="banner"
    >
      {/* Background Ambient Radial Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/80 via-[#f8f5eb]/90 to-[#ece3cb]/90 pointer-events-none" />
      
      {/* Golden Decorative Card Frame */}
      <div className="relative max-w-lg w-full mx-auto flex flex-col items-center text-center px-5 sm:px-8 py-9 sm:py-11 rounded-3xl border-2 border-[#d8cbb0] bg-gradient-to-b from-white via-[#fcfaf5] to-[#f8f4ea] shadow-[0_12px_45px_rgba(40,30,10,0.12)]">
        
        {/* Top Islamic Geometric / Holy Book Icon */}
        <div className="w-13 h-13 mb-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-[#ecfdf5] border border-emerald-300 text-emerald-800 flex items-center justify-center shadow-xs">
          <svg
            className="w-6 h-6 text-emerald-800"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
        </div>

        {/* Bismillah Calligraphy (Authentic classical Arabic font in deep royal Islamic emerald) */}
        <div className="relative my-2 sm:my-3 px-2">
          <h1
            dir="rtl"
            lang="ar"
            className="font-arabic text-3xl sm:text-4xl md:text-5xl font-normal leading-relaxed text-[#143d2b] drop-shadow-xs tracking-wide"
          >
            بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْمِ
          </h1>
        </div>

        {/* English Translation */}
        <div className="mt-3 max-w-md mx-auto w-full">
          <p className="text-[#3b5e4c] text-xs sm:text-sm tracking-wider font-semibold">
            In the name of Allah, the Most Gracious, the Most Merciful
          </p>
        </div>

        {/* Elegant Animated Progress Line */}
        <div className="w-28 h-1 bg-[#e8deca] rounded-full mt-6 sm:mt-8 overflow-hidden border border-[#ded5c0]">
          <div className="h-full bg-gradient-to-r from-emerald-600 via-amber-500 to-emerald-600 rounded-full animate-[pulse_1.5s_ease-in-out_infinite]" />
        </div>

        <span className="text-[11px] text-[#6b8a78] mt-3.5 uppercase tracking-widest font-semibold">
          Tap anywhere to continue
        </span>
      </div>
    </div>
  );
}
