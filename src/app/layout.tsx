import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { SwRegister } from "@/components/common/SwRegister";
import { ThemeInit } from "@/components/common/ThemeInit";
import { BismillahSplash } from "@/components/common/BismillahSplash";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tilawat.ai — Quran Recitation (Mushaf)",
  description:
    "Recite and the ayat appear on the Mushaf page word by word. Recite a word wrong and nothing further is revealed until you correct it. Online + Offline.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = { themeColor: "#0f1a14" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#0b1510] text-[#e8f2ec] min-h-screen selection:bg-emerald-800 selection:text-white">
        <BismillahSplash />
        <SwRegister />
        <ThemeInit />
        <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#08140e]/95 border-b border-emerald-900/60 shadow-[0_4px_25px_rgba(0,0,0,0.5)]">
          <nav className="max-w-4xl mx-auto flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3 gap-3">
            {/* Brand Logo & Name */}
            <Link
              href="/"
              className="group flex items-center gap-2.5 transition-all shrink-0 active:scale-95"
            >
              <div className="relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-emerald-600/30 via-emerald-800/40 to-[#04140c] border border-emerald-500/50 shadow-[0_0_14px_rgba(16,185,129,0.25)] group-hover:border-emerald-400 group-hover:shadow-[0_0_18px_rgba(16,185,129,0.4)] transition-all">
                <svg
                  className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-emerald-300 group-hover:text-white transition-colors"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.3"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-base sm:text-lg font-extrabold tracking-tight text-white group-hover:text-emerald-100 transition-colors">
                  Tilawat
                </span>
                <span className="px-1.5 sm:px-2 py-0.5 rounded-md text-[11px] sm:text-xs font-black tracking-wider bg-gradient-to-r from-emerald-400 to-teal-300 text-[#04160e] shadow-[0_0_10px_rgba(16,185,129,0.4)] uppercase">
                  AI
                </span>
              </div>
            </Link>

            {/* Segmented Pill Navigation & Settings */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Segmented Glass Capsule for Surahs, Tarjama & Progress */}
              <div className="flex items-center p-0.5 rounded-full bg-[#05140d]/90 border border-emerald-800/70 shadow-inner">
                <Link
                  href="/surahs"
                  className="px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-semibold tracking-wide text-emerald-200/90 hover:text-white hover:bg-emerald-800/60 transition-all duration-200 active:scale-95"
                >
                  Surahs
                </Link>
                <div className="w-[1px] h-3.5 bg-emerald-800/70" />
                <Link
                  href="/tarjama"
                  className="px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-semibold tracking-wide text-emerald-200/90 hover:text-white hover:bg-emerald-800/60 transition-all duration-200 active:scale-95"
                >
                  Tarjama
                </Link>
                <div className="w-[1px] h-3.5 bg-emerald-800/70" />
                <Link
                  href="/stats"
                  className="px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-semibold tracking-wide text-emerald-200/90 hover:text-white hover:bg-emerald-800/60 transition-all duration-200 active:scale-95"
                >
                  Progress
                </Link>
              </div>

              {/* Hamburger Settings Button */}
              <Link
                href="/settings"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#05140d]/90 hover:bg-emerald-800/50 border border-emerald-800/70 hover:border-emerald-500/70 shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_0_12px_rgba(16,185,129,0.25)] text-emerald-300 hover:text-white flex items-center justify-center transition-all duration-200 active:scale-95 shrink-0"
                title="Settings"
                aria-label="Settings"
              >
                <svg className="w-4 h-4 sm:w-4.5 sm:h-4.5" fill="none" stroke="currentColor" strokeWidth="2.3" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              </Link>
            </div>
          </nav>
        </header>

        <main className="max-w-4xl mx-auto px-1 sm:px-6 py-2 sm:py-6">{children}</main>
      </body>
    </html>
  );
}
