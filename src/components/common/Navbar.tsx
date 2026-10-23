"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/tarjama", label: "Translation", match: (p: string) => p.startsWith("/tarjama") },
  { href: "/stats", label: "Progress", match: (p: string) => p.startsWith("/stats") || p.startsWith("/streak") },
];

export function Navbar() {
  const pathname = usePathname() || "";

  return (
    <nav className="max-w-4xl mx-auto flex items-center justify-between px-2.5 sm:px-6 py-2 sm:py-2.5 gap-2 w-full">
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

      {/* Navigation Tabs Capsule (Pure Text Names - No Icons, No Overflow) */}
      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
        <div className="flex items-center gap-0.5 p-1 rounded-xl sm:rounded-2xl bg-[#f0ebd9]/90 border border-[#ded5c0] shadow-xs overflow-x-auto no-scrollbar scroll-smooth">
          {NAV_ITEMS.map((item) => {
            const isActive = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs md:text-sm font-semibold transition-all whitespace-nowrap active:scale-95 ${
                  isActive
                    ? "bg-white text-emerald-950 font-bold shadow-xs border border-[#ded5c0]/70"
                    : "text-[#2d4d3c] hover:text-[#0b2416] hover:bg-[#e4dcce]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Settings Gear Button (Always Visible, Never Clipped) */}
        <Link
          href="/settings"
          className={`w-7.5 h-7.5 sm:w-8.5 sm:h-8.5 rounded-lg sm:rounded-xl border shadow-xs flex items-center justify-center transition-all duration-200 active:scale-95 shrink-0 ${
            pathname.startsWith("/settings")
              ? "bg-white text-emerald-950 border-[#ded5c0]"
              : "bg-[#f0ebd9]/90 hover:bg-[#e4dcce] border-[#ded5c0] text-[#1e402e] hover:text-[#0b2416]"
          }`}
          title="Settings"
          aria-label="Settings"
        >
          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-800" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
          </svg>
        </Link>
      </div>
    </nav>
  );
}
