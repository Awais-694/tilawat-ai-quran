import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSurahMeta } from "@/lib/quran/data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ surahId: string }>;
}): Promise<Metadata> {
  const { surahId } = await params;
  const meta = getSurahMeta(Number(surahId));
  if (!meta) return { title: "Tarjama & Tafseer — Tilawat AI" };
  return {
    title: `Surah ${meta.name} (${meta.arabicName}) Tarjama & Tafseer — Kanz-ul-Irfan | Tilawat AI`,
    description: `Read authentic Urdu translation & commentary of Surah ${meta.name} (Ma'rifat-ul-Quran ala Kanz-ul-Irfan).`,
  };
}

export default async function TarjamaSurahPage({
  params,
  searchParams,
}: {
  params: Promise<{ surahId: string }>;
  searchParams?: Promise<{ page?: string }>;
}) {
  const { surahId } = await params;
  const sp = searchParams ? await searchParams : undefined;
  const pageQuery = sp?.page ? `&page=${sp.page}` : "";
  const sNum = parseInt(surahId, 10);
  if (isNaN(sNum) || sNum < 1 || sNum > 114) {
    redirect("/tarjama");
  }
  redirect(`/tarjama?surah=${sNum}${pageQuery}`);
}
