import { Metadata } from "next";
import { HabitTrackerClient } from "@/components/habits/HabitTrackerClient";

export const metadata: Metadata = {
  title: "Habit Tracker | Tilawat AI",
  description: "Monthly Islamic Habit Tracker with 31-day grid, monthly goals and self-reminders.",
};

export default function HabitsPage() {
  return <HabitTrackerClient />;
}
