import { redirect } from "next/navigation";

export default async function TajweedSurahPage({
  params,
}: {
  params: Promise<{ surahId: string }>;
}) {
  const { surahId } = await params;
  redirect(`/tajweed?surah=${surahId}`);
}
