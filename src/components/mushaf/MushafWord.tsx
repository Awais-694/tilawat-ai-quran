import type { WordToken } from "@/types/quran";
import { normalizeArabic } from "@/lib/quran/normalize";

// Ek lafz mushaf page par — state ke hisab se style:
// Ayah markers (numbers): Hamesha visible (blur-none) taake user ko ayat ke numbers shuru se nazar aate rahein.
// Words: Sirf "correct" (parha gaya) lafz unblurred hota hai. Unrecited words blurred rehte hain.
export function MushafWord({ token }: { token: WordToken }) {
  const isMarker = !normalizeArabic(token.display);
  const isCurrent = token.state === "current";
  const isWrong = token.state === "wrong";
  const isHighlighted = (isCurrent || isWrong) && !isMarker;

  // Ayah markers (numbers) are ALWAYS visible from the start.
  // Quran words remain blurred until recited correctly!
  const cls = isMarker
    ? "text-[#143323] blur-none opacity-95 select-none"
    : token.state === "correct"
      ? "text-[#102419] blur-none opacity-100"
      : isCurrent
        ? "bg-[#c5a059]/20 text-[#1a382b] blur-[6px] opacity-40 rounded px-0.5 py-0.5 ring-1 ring-[#c5a059]/50 select-none"
        : isWrong
          ? "bg-[#fed7d7] text-[#9b2c2c] blur-[5px] opacity-50 rounded px-0.5 py-0.5 ring-1 ring-red-400/50 select-none"
          : "blur-[6px] opacity-25 select-none";

  return (
    <span
      className={`transition-all duration-75 ${isHighlighted ? "inline-block" : "inline"} ${cls}`}
    >
      {token.display}
    </span>
  );
}
