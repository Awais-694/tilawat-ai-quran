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

export interface SavedMushaf16PdfRecord {
  surahNumber: number;
  blob: Blob;
  size: number;
  savedAt: number;
  name: string;
}

export interface SavedTajweedPdfRecord {
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
  mushaf16Pdfs!: Table<SavedMushaf16PdfRecord, number>;
  tajweedPdfs!: Table<SavedTajweedPdfRecord, number>;

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
    this.version(3).stores({
      progress: "surahNumber",
      sessions: "++id, surahNumber, startedAt",
      activity: "date",
      wrongWords: "word",
      tarjamaPdfs: "surahNumber, savedAt",
      mushaf16Pdfs: "surahNumber, savedAt",
    });
    this.version(4).stores({
      progress: "surahNumber",
      sessions: "++id, surahNumber, startedAt",
      activity: "date",
      wrongWords: "word",
      tarjamaPdfs: "surahNumber, savedAt",
      mushaf16Pdfs: "surahNumber, savedAt",
      tajweedPdfs: "surahNumber, savedAt",
    });
    this.version(5).stores({
      progress: "surahNumber",
      sessions: "++id, surahNumber, startedAt",
      activity: "date",
      wrongWords: "word",
      tarjamaPdfs: "surahNumber, savedAt",
      mushaf16Pdfs: "surahNumber, savedAt",
      tajweedPdfs: "surahNumber, savedAt",
      appFiles: "id, savedAt",
    });
    this.version(6).stores({
      progress: "surahNumber",
      sessions: "++id, surahNumber, startedAt",
      activity: "date",
      wrongWords: "word",
      tarjamaPdfs: "surahNumber, savedAt",
      mushaf16Pdfs: "surahNumber, savedAt",
      tajweedPdfs: "surahNumber, savedAt",
      appFiles: null,
    });
  }
}

export const db = new TilawatDB();

if (typeof window !== "undefined") {
  db.on("versionchange", () => {
    try {
      db.close();
    } catch {}
    return false;
  });
}
