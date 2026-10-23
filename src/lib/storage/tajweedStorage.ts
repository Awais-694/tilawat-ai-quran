// Tajweed Quran Surah PDFs offline storage manager via IndexedDB
import { db, type SavedTajweedPdfRecord } from "./db";

export async function saveTajweedPdf(
  surahNumber: number,
  blob: Blob,
  name: string
): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await db.tajweedPdfs.put({
      surahNumber,
      blob,
      size: blob.size,
      savedAt: Date.now(),
      name,
    });
  } catch (error) {
    console.error("Failed to save Tajweed PDF to IndexedDB:", error);
    throw error;
  }
}

export async function getTajweedPdf(
  surahNumber: number
): Promise<Blob | null> {
  if (typeof window === "undefined") return null;
  try {
    const record = await db.tajweedPdfs.get(surahNumber);
    return record?.blob ?? null;
  } catch (error) {
    console.error("Failed to get Tajweed PDF from IndexedDB:", error);
    return null;
  }
}

export async function deleteTajweedPdf(surahNumber: number): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await db.tajweedPdfs.delete(surahNumber);
  } catch (error) {
    console.error("Failed to delete Tajweed PDF from IndexedDB:", error);
  }
}

export async function getAllSavedTajweedPdfs(): Promise<SavedTajweedPdfRecord[]> {
  if (typeof window === "undefined") return [];
  try {
    return await db.tajweedPdfs.toArray();
  } catch (error) {
    console.error("Failed to list saved Tajweed PDFs:", error);
    return [];
  }
}
