// User settings — localStorage me (device par, offline-safe).

export type EnginePref = "auto" | "webspeech" | "whisper";
export type ThemePref = "dark" | "light";

const K = {
  engine: "tilawat-engine",
  fontSize: "tilawat-font-size",
  theme: "tilawat-theme",
};

function read(key: string): string | null {
  if (typeof window === "undefined") return null;
  try { return localStorage.getItem(key); } catch { return null; }
}
function write(key: string, v: string) {
  try { localStorage.setItem(key, v); } catch { /* ignore */ }
}

function remove(key: string) {
  try { localStorage.removeItem(key); } catch { /* ignore */ }
}

export function getEnginePref(): EnginePref {
  const v = read(K.engine);
  return v === "webspeech" || v === "whisper" ? v : "auto";
}
export function setEnginePref(v: EnginePref) { write(K.engine, v); }

/**
 * Default Mushaf scale: 24px.
 */
export function getDefaultMushafFontSize(): number {
  return 24;
}

export function getFontSize(): number {
  const raw = read(K.fontSize);
  if (!raw) return getDefaultMushafFontSize();
  const v = Number(raw);
  if (v >= 22 && v <= 26) {
    return v;
  }
  return getDefaultMushafFontSize();
}

export function setFontSize(v: number) { write(K.fontSize, String(v)); }

export function resetFontSize(): number {
  remove(K.fontSize);
  return getDefaultMushafFontSize();
}

export function getTheme(): ThemePref {
  return "light";
}
export function setTheme(v: ThemePref) { write(K.theme, "light"); }
