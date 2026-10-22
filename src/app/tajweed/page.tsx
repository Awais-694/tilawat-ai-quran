import type { Metadata } from "next";
import { TajweedViewerClient } from "@/components/tajweed/TajweedViewerClient";

export const metadata: Metadata = {
  title: "Tajweed-e-Al-Quran-ul-Kareem | Color Coded Tajweed Mushaf",
  description: "Read complete Tajweed-e-Al-Quran-ul-Kareem in high definition color-coded PDF format.",
};

export default function TajweedPage() {
  return <TajweedViewerClient />;
}
