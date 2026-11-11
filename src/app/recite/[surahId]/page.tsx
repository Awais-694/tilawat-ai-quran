import { getSurahMeta, loadSurah } from "@/lib/quran/data";
import { ReciteClient } from "@/components/recitation/ReciteClient";

// Recitation screen — mushaf page format, lafz-ba-lafz reveal.
export default async function RecitePage({
  params,
  searchParams,
}: {
  params: Promise<{ surahId: string }>;
  searchParams?: Promise<{ ayah?: string }>;
}) {
  const { surahId } = await params;
  const resolvedSearch = searchParams ? await searchParams : undefined;
  const initialAyah = resolvedSearch?.ayah ? Number(resolvedSearch.ayah) : undefined;
  const meta = getSurahMeta(Number(surahId));
  if (!meta) return <p className="text-center py-12 text-emerald-200">Surah not found.</p>;
  const initialSurah = await loadSurah(meta.number);
  return (
    <ReciteClient
      key={`${meta.number}_${initialAyah ?? ""}`}
      surahNumber={meta.number}
      initialSurah={initialSurah}
      initialAyah={initialAyah && !isNaN(initialAyah) && initialAyah > 0 ? initialAyah : undefined}
    />
  );
}
