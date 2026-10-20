// Matching engine v2 — word-state machine.
//
// Rule (user ki shart): suna gaya lafz SIRF tab reveal hoga jab woh agla
// expected lafz ho. Galat lafz -> koi reveal nahi, galti record.
// Abhi tajweed NAHI hai — sirf lafz ki durustgi (normalized exact match),
// fuzzy match optional hai (Settings se on/off, default off).

import { normalizeArabic, WORD_ALIASES } from "./normalize";
import type { WordToken } from "@/types/quran";

export interface MatchStep {
  /** is step ke baad kitne alfaaz revealed hain */
  revealed: number;
  /** suna gaya lafz jo match nahi hua (agar hua) */
  wrongWord: string | null;
}

function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = i;
    for (let j = 1; j <= b.length; j++) {
      const val = a[i - 1] === b[j - 1] ? row[j - 1] : Math.min(row[j - 1], row[j], prev) + 1;
      row[j - 1] = prev;
      prev = val;
    }
    row[b.length] = prev;
  }
  return row[b.length];
}

function consonantSkeleton(w: string): string {
  return w.replace(/[اويىء]/g, "");
}

function phoneticCanon(w: string): string {
  return w
    .replace(/[ظذضز]/g, "ذ")
    .replace(/[ثسص]/g, "س")
    .replace(/[طت]/g, "ت")
    .replace(/[قكگ]/g, "ك")
    .replace(/[حھہه]/g, "ه")
    .replace(/[ؤئ]/g, "ي")
    .replace(/[ةه]$/g, "ه")
    .replace(/ا+/g, "ا");
}

export function stripPrefixes(w: string): string[] {
  const prefixes = ["وال", "فال", "بال", "كال", "لل", "ال", "و", "ف", "ب", "ل", "ك"];
  const res = new Set<string>([w]);
  for (const p of prefixes) {
    if (w.startsWith(p) && w.length - p.length >= 2) {
      res.add(w.slice(p.length));
    }
  }
  return Array.from(res);
}

export function wordMatches(target: string, heard: string): boolean {
  if (target === heard) return true;
  const tNorm = target.replace(/ا+/g, "ا");
  const hNorm = heard.replace(/ا+/g, "ا");
  if (tNorm === hNorm) return true;
  if (phoneticCanon(tNorm) === phoneticCanon(hNorm)) return true;

  // Aliases check (e.g. Speech engine writing "انزل" for "انذر", "الله" for "لله")
  const tAliases = WORD_ALIASES[target] || WORD_ALIASES[tNorm];
  if (tAliases && (tAliases.includes(heard) || tAliases.includes(hNorm))) return true;
  const hAliases = WORD_ALIASES[heard] || WORD_ALIASES[hNorm];
  if (hAliases && (hAliases.includes(target) || hAliases.includes(tNorm))) return true;

  // Taa Marbuta / Taa open variation in construct state (e.g. "رحمه" vs "رحمت", "نعمه" vs "نعمت")
  if (
    (tNorm.endsWith("ه") && hNorm.endsWith("ت") && tNorm.slice(0, -1) === hNorm.slice(0, -1)) ||
    (tNorm.endsWith("ت") && hNorm.endsWith("ه") && tNorm.slice(0, -1) === hNorm.slice(0, -1))
  ) {
    return true;
  }

  // Wasl initial Alef omission/addition in fast connected recitation (e.g. "اهدنا" vs "هدنا")
  if (tNorm.length >= 3 && tNorm.startsWith("ا") && tNorm.slice(1) === hNorm) return true;
  if (hNorm.length >= 3 && hNorm.startsWith("ا") && hNorm.slice(1) === tNorm) return true;

  // Wasl Sun letter assimilation (e.g. "الصراط" heard as "اسراط" or "السراط")
  if (
    (tNorm === "الصراط" || tNorm.startsWith("ال")) &&
    hNorm.startsWith("ا") &&
    tNorm.slice(2) === hNorm.slice(1)
  ) {
    return true;
  }

  // Stems check: strip Arabic prepositions/prefixes (و، ف، ب، ل، ك، ال، وال، فال، بال، لل)
  const tStems = stripPrefixes(tNorm);
  const hStems = stripPrefixes(hNorm);
  for (const ts of tStems) {
    for (const hs of hStems) {
      if (ts === hs) return true;
      if (phoneticCanon(ts) === phoneticCanon(hs)) return true;
      const skT = consonantSkeleton(ts);
      const skH = consonantSkeleton(hs);
      if (skT.length >= 4 && skT === skH) return true;
      const minL = Math.min(ts.length, hs.length);
      // Only allow 1-edit typo on long stems (>= 5 letters) to prevent false matches between 3-letter roots (e.g. فلق vs خلق)
      if (minL >= 5 && editDistance(ts, hs) <= 1) return true;
    }
  }

  // Handle Tanween Alif addition / omission in fast recitation (e.g. "عظيما" vs "عظيم")
  if (tNorm.length >= 3 && tNorm.endsWith("ا") && tNorm.slice(0, -1) === hNorm) return true;
  if (hNorm.length >= 3 && hNorm.endsWith("ا") && hNorm.slice(0, -1) === tNorm) return true;

  // Handle phonetic Tanween noon transcription (e.g. "عظيمن" vs "عظيما", "احدن" vs "احد")
  if (tNorm.length >= 3 && tNorm.endsWith("ا") && hNorm.endsWith("ن") && tNorm.slice(0, -1) === hNorm.slice(0, -1)) return true;
  if (hNorm.length >= 3 && hNorm.endsWith("ا") && tNorm.endsWith("ن") && hNorm.slice(0, -1) === tNorm.slice(0, -1)) return true;
  if (hNorm.length >= 3 && hNorm.endsWith("ن") && hNorm.slice(0, -1) === tNorm) return true;

  // Consonant skeleton matching for long Madd vowels / dagger alif variations (e.g. "الرحمن" vs "الرحمان")
  const skT = consonantSkeleton(tNorm);
  const skH = consonantSkeleton(hNorm);
  if (skT.length >= 4 && skT === skH) return true;

  const minLen = Math.min(tNorm.length, hNorm.length);
  // Fuzzy match only for longer words (>= 6 characters) with minor browser speech transcription variations
  if (minLen >= 6 && editDistance(tNorm, hNorm) <= 1) return true;
  return false;
}

/** Advance past non-recitable tokens (ayah-end markers etc. normalize to ""). */
export function skipEmpty(expectedNormalized: string[], r: number): number {
  while (r < expectedNormalized.length && expectedNormalized[r] === "") r++;
  return r;
}

/** Check one heard word against the expected sequence. */
export function matchOne(
  expectedNormalized: string[],
  revealed: number,
  heardWord: string,
  expectedForms?: string[][]
): MatchStep {
  const r = skipEmpty(expectedNormalized, revealed);
  if (r < expectedNormalized.length) {
    const forms = [expectedNormalized[r], ...(expectedForms?.[r] ?? [])];
    for (const f of forms) {
      if (wordMatches(f, heardWord)) {
        return { revealed: skipEmpty(expectedNormalized, r + 1), wrongWord: null };
      }
    }
  }
  return { revealed: r, wrongWord: heardWord };
}

/** Final results ke alfaaz ko tartib se process karo. */
export function matchMany(
  expectedNormalized: string[],
  revealed: number,
  heardWords: string[],
  expectedForms?: string[][]
): { revealed: number; wrongWords: string[] } {
  let r = skipEmpty(expectedNormalized, revealed);
  const wrongWords: string[] = [];
  const formsAt = (idx: number): string[] => {
    if (idx >= expectedNormalized.length) return [];
    const out = [expectedNormalized[idx], ...(expectedForms?.[idx] ?? [])];
    return [...new Set(out)];
  };
  const matches = (idx: number, s: string): boolean => {
    const forms = formsAt(idx);
    for (const f of forms) {
      if (wordMatches(f, s)) return true;
    }
    return false;
  };
  let i = 0;
  while (i < heardWords.length) {
    const w = heardWords[i];
    // 1. Direct match for current expected token r
    if (matches(r, w)) {
      r = skipEmpty(expectedNormalized, r + 1);
      i++;
      continue;
    }
    // 2. Speech recognition split one Quran word into two
    if (i + 1 < heardWords.length && matches(r, w + heardWords[i + 1])) {
      r = skipEmpty(expectedNormalized, r + 1);
      i += 2;
      continue;
    }
    // 3. Speech recognition split one Quran word into three
    if (i + 2 < heardWords.length && matches(r, w + heardWords[i + 1] + heardWords[i + 2])) {
      r = skipEmpty(expectedNormalized, r + 1);
      i += 3;
      continue;
    }
    // 4. Two Quran words merged into one heard word (e.g. "رب العالمين" -> "ربالعالمين", "ولا الضالين" -> "والضالين", "حبل من" -> "حبلمن")
    const r2 = skipEmpty(expectedNormalized, r + 1);
    if (r2 < expectedNormalized.length) {
      const combos = new Set<string>();
      for (const a of formsAt(r)) {
        for (const b of formsAt(r2)) {
          combos.add((a + b).replace(/ا+/g, "ا"));
          if (a === "ولا" && b.startsWith("ال")) {
            combos.add(("وال" + b.slice(2)).replace(/ا+/g, "ا"));
          }
        }
      }
      if (combos.has(w.replace(/ا+/g, "ا"))) {
        r = skipEmpty(expectedNormalized, r2 + 1);
        i++;
        continue;
      }
      let startsWithR = false;
      for (const a of formsAt(r)) {
        if (w.startsWith(a) && w.length > a.length) {
          const rest = w.slice(a.length);
          for (const b of formsAt(r2)) {
            if (wordMatches(b, rest)) {
              r = skipEmpty(expectedNormalized, r2 + 1);
              i++;
              startsWithR = true;
              break;
            }
          }
        }
        if (startsWithR) break;
      }
      if (startsWithR) continue;

      // 5. Three Quran words merged into one heard word (e.g. "يا ايها الذين" -> "ياايهاالذين")
      const r3 = skipEmpty(expectedNormalized, r2 + 1);
      if (r3 < expectedNormalized.length) {
        for (const a of formsAt(r)) {
          if (w.startsWith(a) && w.length > a.length) {
            const rest = w.slice(a.length);
            for (const b of formsAt(r2)) {
              if (rest.startsWith(b) && rest.length > b.length) {
                const rest2 = rest.slice(b.length);
                for (const c of formsAt(r3)) {
                  if (wordMatches(c, rest2)) {
                    r = skipEmpty(expectedNormalized, r3 + 1);
                    i++;
                    startsWithR = true;
                    break;
                  }
                }
              }
              if (startsWithR) break;
            }
          }
          if (startsWithR) break;
        }
        if (startsWithR) continue;
      }
    }

    // 6. Full History Rolling Buffer Check:
    // In continuous speech recognition, heardWords can be a long rolling buffer of the entire recitation session.
    // Check if w was already matched in ANY previous token (0 to r - 1).
    // If it was already matched earlier in the sequence, skip it cleanly WITHOUT flagging as a mistake!
    let alreadyMatched = false;
    for (let k = r - 1; k >= 0; k--) {
      if (matches(k, w)) {
        alreadyMatched = true;
        break;
      }
    }
    if (alreadyMatched) {
      i++;
      continue;
    }

    // If w does not match current word r (nor compound/split forms), record as mistake and do NOT skip ahead
    wrongWords.push(w);
    i++;
  }
  return { revealed: r, wrongWords };
}

/** Surah ke alfaaz ko WordToken[] me badlo (sab hidden, pehla current). */
export function buildTokens(
  groups: { words: string[]; ayahNumber: number; page: number }[]
): WordToken[] {
  const tokens: WordToken[] = [];
  for (const g of groups) {
    for (const w of g.words) {
      tokens.push({
        display: w,
        normalized: normalizeArabic(w),
        state: tokens.length === 0 ? "current" : "hidden",
        ayahNumber: g.ayahNumber,
        page: g.page,
      });
    }
  }
  return tokens;
}
