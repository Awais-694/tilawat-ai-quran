import { redirect } from "next/navigation";

export default async function TajweedSurahPage({
  params,
  searchParams,
}: {
  params: Promise<{ surahId: string }>;
  searchParams?: Promise<{ page?: string }>;
}) {
  const { surahId } = await params;
  const sp = searchParams ? await searchParams : undefined;
  const pageQuery = sp?.page ? `&page=${sp.page}` : "";
  redirect(`/tajweed?surah=${surahId}${pageQuery}`);
}
