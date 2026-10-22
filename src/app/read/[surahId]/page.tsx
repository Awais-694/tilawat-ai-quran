import type { Metadata } from "next";
import { getSurahMeta, loadSurah } from "@/lib/quran/data";
import { ReadClient } from "@/components/read/ReadClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ surahId: string }>;
}): Promise<Metadata> {
  const { surahId } = await params;
  const meta = getSurahMeta(Number(surahId));
  if (!meta) return { title: "Read Quran — Tilawat AI" };
  return {
    title: `Read Surah ${meta.name} (${meta.arabicName}) — 16-Line Mushaf | Tilawat AI`,
    description: `Read Surah ${meta.name} in the authentic 16-line Taj Company Mushaf format with audio playback.`,
  };
}

export default async function ReadSurahPage({
  params,
}: {
  params: Promise<{ surahId: string }>;
}) {
  const { surahId } = await params;
  const meta = getSurahMeta(Number(surahId));
  if (!meta) {
    return <p className="text-center py-12 text-rose-700 font-semibold">Surah not found.</p>;
  }
  const initialSurah = await loadSurah(meta.number);
  return <ReadClient key={meta.number} surahNumber={meta.number} initialSurah={initialSurah} />;
}
