import { db } from "./db";

const GUIDE_FILE_ID = "tilawat-user-guide";
const GUIDE_FILENAME = "Tilawat_AI_Complete_User_Guide.pdf";

/**
 * Save user guide PDF into IndexedDB permanently for offline reading.
 */
export async function saveGuidePdf(blob: Blob): Promise<void> {
  if (!blob || blob.size < 1000) return;
  await db.appFiles.put({
    id: GUIDE_FILE_ID,
    blob,
    size: blob.size,
    savedAt: Date.now(),
    name: GUIDE_FILENAME,
  });

  // Also prime browser cache if Cache API is available
  try {
    if (typeof window !== "undefined" && "caches" in window) {
      const cache = await caches.open("tilawat-offline-guide-v1");
      const resp = new Response(blob, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Length": blob.size.toString(),
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
      await cache.put("/user-guide.pdf", resp);
    }
  } catch {}
}

/**
 * Retrieve user guide PDF from local IndexedDB storage.
 */
export async function getGuidePdf(): Promise<Blob | null> {
  try {
    const record = await db.appFiles.get(GUIDE_FILE_ID);
    if (!record?.blob || record.blob.size < 1000) {
      return null;
    }
    return record.blob;
  } catch (err) {
    console.error("Failed to get guide pdf from IndexedDB:", err);
    return null;
  }
}

/**
 * Check if the user guide is already saved offline.
 */
export async function isGuidePdfSaved(): Promise<boolean> {
  try {
    const record = await db.appFiles.get(GUIDE_FILE_ID);
    return !!(record && record.blob && record.blob.size > 1000);
  } catch {
    return false;
  }
}

/**
 * Delete guide PDF from offline storage.
 */
export async function deleteGuidePdf(): Promise<void> {
  try {
    await db.appFiles.delete(GUIDE_FILE_ID);
    if (typeof window !== "undefined" && "caches" in window) {
      const cache = await caches.open("tilawat-offline-guide-v1");
      await cache.delete("/user-guide.pdf");
    }
  } catch {}
}

/**
 * Trigger direct download to the user's phone / computer files folder.
 */
export function downloadGuideToDevice(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = GUIDE_FILENAME;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
