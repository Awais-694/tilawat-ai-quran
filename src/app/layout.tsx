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

export const viewport: Viewport = { themeColor: "#f8f6f0" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#f8f6f0] text-[#132a1e] min-h-screen selection:bg-emerald-200 selection:text-emerald-950">
        <BismillahSplash />
        <SwRegister />
        <ThemeInit />
        <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#ffffff]/90 border-b border-[#e6dfd1] shadow-[0_2px_12px_rgba(20,50,30,0.05)] w-full">
          <nav className="max-w-4xl mx-auto flex items-center justify-between px-3.5 sm:px-6 py-2.5 sm:py-3 gap-3">
            {/* Brand Logo & Name */}
            <Link
              href="/"
              className="group flex items-center gap-2 sm:gap-2.5 transition-all shrink-0 active:scale-95"
            >
              <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-100 via-emerald-50 to-[#edf7f2] border border-emerald-600/40 shadow-sm group-hover:border-emerald-500 transition-all">
                <svg
                  className="w-4 h-4 text-emerald-800 group-hover:text-emerald-950 transition-colors"
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
                <span className="text-base sm:text-lg font-extrabold tracking-tight text-[#0f291e] group-hover:text-emerald-900 transition-colors">
                  Tilawat
                </span>
                <span className="px-1.5 py-0.5 rounded-md text-[10px] sm:text-xs font-black tracking-wider bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm uppercase">
                  AI
                </span>
              </div>
            </Link>

            {/* Navigation Tabs & Settings */}
            <div className="flex items-center gap-2 sm:gap-3.5 shrink-0">
              {/* Clean Segmented Navigation Capsule in Light Theme */}
              <div className="flex items-center gap-0.5 sm:gap-1 p-1 rounded-2xl bg-[#f0ebd9]/85 border border-[#ded5c0] shadow-sm">
                <Link
                  href="/surahs"
                  className="px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-[#1e402e] hover:text-[#0b2416] hover:bg-[#e4dcce] active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  title="Recite with Speech Recognition"
                >
                  <svg className="w-4 h-4 text-emerald-700 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
                  </svg>
                  <span className="hidden sm:inline">Recite</span>
                </Link>

                <Link
                  href="/read"
                  className="px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-[#1e402e] hover:text-[#0b2416] hover:bg-[#e4dcce] active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  title="Read Quran (Mushaf Mode)"
                >
                  <svg className="w-4 h-4 text-emerald-700 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <span>Read</span>
                </Link>

                <Link
                  href="/tarjama"
                  className="px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-[#1e402e] hover:text-[#0b2416] hover:bg-[#e4dcce] active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  title="Tafseer & Translation (Kanz-ul-Irfan)"
                >
                  <svg className="w-4 h-4 text-emerald-700 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 10h6m-6 3h4" />
                  </svg>
                  <span className="hidden sm:inline">Tafseer</span>
                </Link>

                <Link
                  href="/stats"
                  className="px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-[#1e402e] hover:text-[#0b2416] hover:bg-[#e4dcce] active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  title="Recitation Progress & Stats"
                >
                  <svg className="w-4 h-4 text-emerald-700 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                  </svg>
                  <span className="hidden sm:inline">Progress</span>
                </Link>
              </div>

              {/* Settings Gear Button with refined light styling */}
              <Link
                href="/settings"
                className="w-8.5 h-8.5 sm:w-9 sm:h-9 p-2 rounded-xl sm:rounded-2xl bg-[#f0ebd9]/85 hover:bg-[#e4dcce] border border-[#ded5c0] shadow-sm text-[#1e402e] hover:text-[#0b2416] flex items-center justify-center transition-all duration-200 active:scale-95 shrink-0"
                title="Settings"
                aria-label="Settings"
              >
                <svg className="w-4 h-4 text-emerald-800" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
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
