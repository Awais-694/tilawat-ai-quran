"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { db, type SurahProgress, type DailyActivity } from "@/lib/storage/db";
import { getSurahMeta } from "@/lib/quran/data";
import { ProgressBar } from "@/components/common/ProgressBar";

// Progress / Stats — IndexedDB se asal data.
export function StatsClient() {
  const router = useRouter();
  const [progress, setProgress] = useState<SurahProgress[]>([]);
  const [wrong, setWrong] = useState<{ word: string; count: number }[]>([]);
  const [activity, setActivity] = useState<DailyActivity[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      setProgress((await db.progress.toArray()).sort((a, b) => b.lastPracticedAt - a.lastPracticedAt));
      setWrong((await db.wrongWords.toArray()).sort((a, b) => b.count - a.count).slice(0, 20));
      setActivity((await db.activity.toArray()).sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 7));
      setLoaded(true);
    })();
  }, []);

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/surahs");
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Top Navigation Bar with Centered Title */}
      <div className="relative flex items-center justify-between min-h-[40px] px-1">
        <button
          onClick={handleBack}
          className="inline-flex items-center justify-center px-4 py-1.5 rounded-xl text-xs sm:text-sm font-semibold tracking-wide text-[#193d2b] bg-white hover:bg-[#efe9d8] active:bg-[#e4dcce] border border-[#d6cbaf] shadow-sm active:scale-95 transition-all duration-200 cursor-pointer"
        >
          Back
        </button>

        <h1 className="text-xl sm:text-2xl font-bold text-[#112a1d] tracking-wide text-center">
          Progress & Stats
        </h1>
        <div className="w-14" />
      </div>

      <div className="bg-white border border-[#ded5c0] rounded-2xl p-4 sm:p-5 shadow-sm">
        <h2 className="text-base font-semibold text-[#112a1d] mb-3">Last 7 Days Activity</h2>
        {loaded && activity.length === 0 && (
          <p className="text-[#527060] text-xs sm:text-sm">No activity recorded yet — recitation sessions will be tracked here.</p>
        )}
        <div className="flex flex-col gap-2">
          {activity.map((a) => (
            <div
              key={a.date}
              className="flex flex-wrap items-center justify-between text-xs sm:text-sm bg-[#fbf9f3] border border-[#e5ded0] rounded-xl px-3.5 py-2.5"
            >
              <span className="font-mono text-emerald-850 font-medium">{a.date}</span>
              <div className="flex items-center gap-2.5 text-xs sm:text-sm">
                <span className="text-[#112a1d]">
                  <span className="font-semibold text-emerald-800">{a.wordsRevealed}</span> words
                </span>
                <span className="text-[#cfc4ad] select-none">•</span>
                <span className="text-rose-700">
                  <span className="font-semibold">{a.mistakes}</span> mistakes
                </span>
                <span className="text-[#cfc4ad] select-none">•</span>
                <span className="text-[#527060]">
                  <span className="font-semibold text-[#112a1d]">{a.sessions}</span> {a.sessions === 1 ? "session" : "sessions"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-[#ded5c0] rounded-2xl p-4 sm:p-5 shadow-sm">
        <h2 className="text-base font-semibold text-[#112a1d] mb-3">Surah Progress</h2>
        {loaded && progress.length === 0 && (
          <p className="text-[#527060] text-xs sm:text-sm">No surah progress saved yet.</p>
        )}
        <div className="flex flex-col gap-2.5">
          {progress.map((p) => {
            const meta = getSurahMeta(p.surahNumber);
            const pct = p.totalWords ? Math.round((p.revealedWords / p.totalWords) * 100) : 0;
            return (
              <Link
                key={p.surahNumber}
                href={`/recite/${p.surahNumber}`}
                className="block bg-[#fbf9f3] border border-[#e5ded0] rounded-xl px-4 py-3 hover:bg-[#f6f1e3] transition-all shadow-sm"
              >
                <div className="flex justify-between items-center text-sm mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#112a1d]">
                      {meta?.number}. {meta?.name}
                    </span>
                    {p.completed && (
                      <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Completed
                      </span>
                    )}
                  </div>
                  <span className="font-mono font-semibold text-emerald-800 text-xs sm:text-sm">{pct}%</span>
                </div>
                <ProgressBar pct={pct} />
              </Link>
            );
          })}
        </div>
      </div>

      <div className="bg-white border border-[#ded5c0] rounded-2xl p-4 sm:p-5 shadow-sm">
        <h2 className="text-base font-semibold text-[#112a1d] mb-3">Weak Words (Previous Mistakes)</h2>
        {loaded && wrong.length === 0 && (
          <p className="text-[#527060] text-xs sm:text-sm">No mistakes recorded yet.</p>
        )}
        <div className="flex flex-wrap gap-2" dir="rtl">
          {wrong.map((w) => (
            <span
              key={w.word}
              className="bg-rose-50 border border-rose-200 rounded-xl px-3 py-1.5 font-quran text-lg text-rose-900 shadow-sm"
            >
              {w.word} <span className="text-xs font-mono text-rose-700 mr-1">×{w.count}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );

}
