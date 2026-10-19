// Offline progress storage — IndexedDB (Dexie).
// Sab data user ke device par rehta hai: koi server nahi, koi paid database nahi.

import Dexie, { type Table } from "dexie";
import type { RecitationSession } from "@/types/quran";

export interface SurahProgress {
  surahNumber: number;
  revealedWords: number; // jahan tak parha
  totalWords: number;
  completed: boolean;
  lastPracticedAt: number;
  lastAyahNumber?: number; // last recited ayah number
  completedAt?: number;
  completedTimes?: number;
}

export interface DailyActivity {
  date: string; // "2026-10-12"
  wordsRevealed: number;
  mistakes: number;
  sessions: number;
  timeSpentSeconds?: number; // total active recitation time in seconds
  surahsPracticed?: number[]; // list of surah numbers recited on this date
}

export interface SavedTarjamaPdfRecord {
  surahNumber: number;
  blob: Blob;
  size: number;
  savedAt: number;
  name: string;
}

class TilawatDB extends Dexie {
  progress!: Table<SurahProgress, number>;
  sessions!: Table<RecitationSession & { id?: number }, number>;
  activity!: Table<DailyActivity, string>;
  wrongWords!: Table<{ word: string; count: number }, string>;
  tarjamaPdfs!: Table<SavedTarjamaPdfRecord, number>;

  constructor() {
    super("tilawat-db");
    this.version(1).stores({
      progress: "surahNumber",
      sessions: "++id, surahNumber, startedAt",
      activity: "date",
      wrongWords: "word",
    });
    this.version(2).stores({
      progress: "surahNumber",
      sessions: "++id, surahNumber, startedAt",
      activity: "date",
      wrongWords: "word",
      tarjamaPdfs: "surahNumber, savedAt",
    });
  }
}

export const db = new TilawatDB();

