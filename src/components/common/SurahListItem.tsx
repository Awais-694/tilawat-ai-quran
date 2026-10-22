import Link from "next/link";
import type { SurahMeta } from "@/types/quran";

// Surahs list ki ek row — naam, ayat ki tadaad, progress %
export function SurahListItem({
  meta,
  progressPct,
  customHref,
}: {
  meta: SurahMeta;
  progressPct?: number;
  customHref?: string;
}) {
  const href = customHref ?? `/recite/${meta.number}`;
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-2.5 sm:gap-4 bg-white hover:bg-[#fbf9f4] border border-[#e6dfd1] hover:border-[#c5a059]/80 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 shadow-[0_1px_4px_rgba(20,50,30,0.04)] active:scale-[0.99] transition-all group"
    >
      {/* Left: Number + English Name + Ayahs count */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
        <span className="w-8 h-8 sm:w-9 sm:h-9 grid place-items-center rounded-full border border-[#c5a059] text-[#996515] bg-[#fbf8ee] text-xs sm:text-sm font-bold shrink-0 group-hover:bg-[#f5eed6] transition-colors">
          {meta.number}
        </span>
        <div className="min-w-0 flex-1">
          <span className="block font-semibold text-sm sm:text-base text-[#123122] group-hover:text-emerald-950 truncate">
            {meta.name}
          </span>
          <span className="block text-[11px] sm:text-xs text-[#527060] truncate">
            {meta.translation} • {meta.numberOfAyahs} ayahs
          </span>
        </div>
      </div>

      {/* Right: Arabic Name (strictly single-line nowrap) */}
      <div className="text-right shrink-0 flex items-center gap-2">
        <span
          className="font-quran text-lg sm:text-2xl text-[#143323] whitespace-nowrap leading-none tracking-normal"
          dir="rtl"
        >
          {meta.arabicName}
        </span>
        {progressPct !== undefined && (
          <span className="text-xs sm:text-sm text-emerald-800 font-mono font-medium bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
            {progressPct}%
          </span>
        )}
      </div>
    </Link>
  );
}

