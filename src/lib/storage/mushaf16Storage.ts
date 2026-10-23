import { db, type SavedMushaf16PdfRecord } from "./db";

export type { SavedMushaf16PdfRecord };

/**
 * Save a 16-line Surah PDF blob into IndexedDB for 100% offline access.
 */
export async function saveMushaf16Pdf(
  surahNumber: number,
  blob: Blob,
  name: string
): Promise<void> {
  await db.mushaf16Pdfs.put({
    surahNumber,
    blob,
    size: blob.size,
    savedAt: Date.now(),
    name,
  });
}

/**
 * Retrieve a 16-line Surah PDF blob from IndexedDB.
 */
export async function getMushaf16Pdf(surahNumber: number): Promise<Blob | null> {
  try {
    const item = await db.mushaf16Pdfs.get(surahNumber);
    return item?.blob ?? null;
  } catch (err) {
    console.error("Failed to get 16-line pdf from db:", err);
    return null;
  }
}

/**
 * Check if a 16-line Surah PDF is saved locally for offline access.
 */
export async function isMushaf16PdfSaved(surahNumber: number): Promise<boolean> {
  try {
    const item = await db.mushaf16Pdfs.get(surahNumber);
    return !!item;
  } catch {
    return false;
  }
}

/**
 * Delete a 16-line Surah PDF from local offline storage.
 */
export async function deleteMushaf16Pdf(surahNumber: number): Promise<void> {
  try {
    await db.mushaf16Pdfs.delete(surahNumber);
  } catch (err) {
    console.error("Failed to delete 16-line pdf from db:", err);
  }
}

/**
 * Get all saved 16-line Surah PDFs metadata.
 */
export async function getAllSavedMushaf16Pdfs() {
  try {
    const all = await db.mushaf16Pdfs.toArray();
    return all.map((item) => ({
      surahNumber: item.surahNumber,
      size: item.size,
      savedAt: item.savedAt,
      name: item.name,
    }));
  } catch {
    return [];
  }
}
