import { Metadata } from "next";
import { TodoListClient } from "@/components/todo/TodoListClient";

export const metadata: Metadata = {
  title: "Daily Tasks & Quran Planner | Tilawat AI",
  description: "Organize your daily Quran recitation, Islamic habits, top priorities, and reminders.",
};

export default function TodoPage() {
  return <TodoListClient />;
}
