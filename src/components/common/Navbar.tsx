"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Navbar() {
  const pathname = usePathname() || "";

  // When user opens Quran reading sections or Daily Task planner (/todo),
  // hide the top navbar so maximum screen space is dedicated to the content!
  const shouldHideNavbar =
    pathname.startsWith("/read") ||
    pathname.startsWith("/recite") ||
    pathname.startsWith("/surahs") ||
    pathname.startsWith("/tajweed") ||
    pathname.startsWith("/tarjama") ||
    pathname.startsWith("/todo") || pathname.startsWith("/habits");

  if (shouldHideNavbar) {
    return null;
  }

  const isTranslation = pathname.startsWith("/tarjama");
  const isProgress = pathname.startsWith("/stats") || pathname.startsWith("/streak");
  const isSettings = pathname.startsWith("/settings");

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#ffffff]/90 border-b border-[#e6dfd1] shadow-[0_2px_12px_rgba(20,50,30,0.05)] w-full">
      <nav className="max-w-4xl mx-auto flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3 gap-2 w-full">
      {/* Brand Name: Tilawat.Ai (Clean, Large, Icon-free) */}
      <Link
        href="/"
        className="group flex items-center tracking-tight transition-all shrink-0 active:scale-95"
        title="Tilawat.Ai Home"
      >
        <span className="font-display text-xl sm:text-2xl md:text-[26px] font-black text-[#0c2419] group-hover:text-[#061710] transition-colors">
          Tilawat
        </span>
        <span className="font-display text-xl sm:text-2xl md:text-[26px] font-black text-emerald-600">
          .
        </span>
        <span className="font-display text-xl sm:text-2xl md:text-[26px] font-black bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 bg-clip-text text-transparent group-hover:from-emerald-500 group-hover:to-teal-500 transition-all">
          Ai
        </span>
      </Link>

      {/* Navigation Controls Cluster */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        {/* Navigation Tabs Capsule (Translation & Progress) */}
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-[#f0ebd9]/90 border border-[#ded5c0] shadow-xs">
          {/* Translation Tab */}
          <Link
            href="/tarjama"
            className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap active:scale-95 ${
              isTranslation
                ? "bg-white text-emerald-950 font-bold shadow-xs border border-[#ded5c0]/80"
                : "text-[#2d4d3c] hover:text-[#0b2416] hover:bg-white/60"
            }`}
          >
            <svg
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${isTranslation ? "text-emerald-700" : "text-[#527060]"}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
              />
            </svg>
            <span>Translation</span>
          </Link>

          {/* Progress Tab */}
          <Link
            href="/stats"
            className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap active:scale-95 ${
              isProgress
                ? "bg-white text-emerald-950 font-bold shadow-xs border border-[#ded5c0]/80"
                : "text-[#2d4d3c] hover:text-[#0b2416] hover:bg-white/60"
            }`}
          >
            <svg
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${isProgress ? "text-emerald-700" : "text-[#527060]"}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
              />
            </svg>
            <span>Progress</span>
          </Link>
        </div>

        {/* Enhanced Settings Button */}
        <Link
          href="/settings"
          className={`group flex items-center gap-1.5 px-3 py-2 rounded-2xl border text-xs sm:text-sm font-semibold transition-all duration-200 active:scale-95 shrink-0 shadow-xs cursor-pointer ${
            isSettings
              ? "bg-emerald-700 text-white border-emerald-800 shadow-sm"
              : "bg-white hover:bg-[#faf7ee] border-[#ded5c0] text-[#1e402e] hover:border-emerald-500 hover:text-emerald-850"
          }`}
          title="Settings & Mushaf Scaling"
          aria-label="Settings"
        >
          <svg
            className={`w-4 h-4 sm:w-4.5 sm:h-4.5 transition-transform duration-500 group-hover:rotate-90 ${
              isSettings ? "text-white" : "text-emerald-800"
            }`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
            />
          </svg>
          <span className="hidden sm:inline">Settings</span>
        </Link>
      </div>
    </nav>
    </header>
  );
}
