import type { Metadata, Viewport } from "next";
import { Navbar } from "@/components/common/Navbar";
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
      <body className="bg-[#f8f6f0] text-[#132a1e] min-h-screen selection:bg-emerald-200 selection:text-emerald-950 overflow-x-hidden">
        <BismillahSplash />
        <SwRegister />
        <ThemeInit />
        <Navbar />


        <main className="max-w-4xl mx-auto px-1 sm:px-6 py-2 sm:py-6">{children}</main>
      </body>
    </html>
  );
}
