import { StreakClient } from "@/components/streak/StreakClient";

export const metadata = {
  title: "Daily Streak & Activity | Tilawat AI",
  description: "View your daily Quran recitation streak, weekly progress, and time spent.",
};

export default function StreakPage() {
  return <StreakClient />;
}
