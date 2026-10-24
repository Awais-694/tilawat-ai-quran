import { db, type SavedTarjamaPdfRecord } from "./db";

export type { SavedTarjamaPdfRecord };

/**
 * Save a Surah translation PDF blob into IndexedDB for 100% offline access.
 */
export async function saveTarjamaPdf(
  surahNumber: number,
  blob: Blob,
  name: string
): Promise<void> {
  if (!blob || blob.size < 100) return;
  await db.tarjamaPdfs.put({
    surahNumber,
    blob,
    size: blob.size,
    savedAt: Date.now(),
    name,
  });
}

/**
 * Retrieve a Surah translation PDF blob from IndexedDB.
 */
export async function getTarjamaPdf(surahNumber: number): Promise<Blob | null> {
  try {
    const item = await db.tarjamaPdfs.get(surahNumber);
    if (!item?.blob || item.blob.size < 100) {
      if (item) void db.tarjamaPdfs.delete(surahNumber);
      return null;
    }
    // Corruption check: Surah 1 is ~200-400KB, if > 2MB it was previously corrupted by Surah 45
    if (surahNumber === 1 && item.blob.size > 2000000) {
      void db.tarjamaPdfs.delete(surahNumber);
      return null;
    }
    return item.blob;
  } catch (err) {
    console.error("Failed to get tarjama pdf from db:", err);
    return null;
  }
}

/**
 * Check if a Surah translation PDF is saved locally for offline access.
 */
export async function isTarjamaPdfSaved(surahNumber: number): Promise<boolean> {
  try {
    const item = await db.tarjamaPdfs.get(surahNumber);
    return !!item;
  } catch {
    return false;
  }
}

/**
 * Delete a Surah translation PDF from local offline storage.
 */
export async function deleteTarjamaPdf(surahNumber: number): Promise<void> {
  try {
    await db.tarjamaPdfs.delete(surahNumber);
  } catch (err) {
    console.error("Failed to delete tarjama pdf from db:", err);
  }
}

/**
 * Get metadata of a saved Surah translation PDF (without loading the full blob).
 */
export async function getTarjamaPdfMeta(surahNumber: number) {
  try {
    const item = await db.tarjamaPdfs.get(surahNumber);
    if (!item) return null;
    return {
      surahNumber: item.surahNumber,
      size: item.size,
      savedAt: item.savedAt,
      name: item.name,
    };
  } catch {
    return null;
  }
}

/**
 * Get all saved Surah translation PDFs metadata.
 */
export async function getAllSavedTarjamaPdfs() {
  try {
    const all = await db.tarjamaPdfs.toArray();
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
