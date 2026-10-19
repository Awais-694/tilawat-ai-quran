// Arabic text normalization + recitation matching engine.
//
// Speech recognition never returns Quranic text with full tashkeel, and it
// often writes words in imla'i spelling (e.g. الرحمان instead of الرحمن).
// So both the expected Quran words and the heard words are reduced to a
// canonical form before comparison: tashkeel removed, alef/ya/hamza forms
// unified. Matching is then a strict in-order walk: a heard word reveals
// text ONLY when it equals the next expected word.

const TASHKEEL = /[\u064B-\u065F\u0670\u0674\u06D6-\u06ED\u0640\u0610-\u061A]/g;

export function normalizeArabic(
  text: string,
  opts: { daggerAsAlef?: boolean; maksuraAsAlef?: boolean } = {}
): string {
  let prepared = opts.daggerAsAlef ? text.replace(/\u0670/g, "\u0627") : text;
  if (opts.maksuraAsAlef) prepared = prepared.replace(/\u0649/g, "\u0627");
  return prepared
    .replace(TASHKEEL, "")
    .replace(/[إأآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    // IndoPak mushafs write ة as ت in construct state (رَحْمَتَ for رحمة) —
    // collapse a word-final ت to ه so both spellings match
    .replace(/ت(?=\s|$)/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ی/g, "ي")
    .replace(/ے/g, "ي")
    .replace(/[ڪک]/g, "ك")
    // IndoPak mushafs write these words with a waw (الصلوة، الزكوة، الحيوة)
    // where standard spelling/recognition uses an alef (الصلاة، الزكاة، الحياة)
    .replace(/صلوه/g, "صلاه")
    .replace(/زكوه/g, "زكاه")
    .replace(/حيوه/g, "حياه")
    // Standalone hamza spellings differ between mushaf and recognition
    // (ءَاَنْذَرْتَهُمْ vs أأنذرتهم) — drop ء and collapse repeated alefs
    .replace(/ء/g, "")
    .replace(/ا+/g, "ا")
    .replace(/ي+/g, "ي")
    // U+F61F in this font encoding is a word-initial alef (اِسْم etc.)
    .replace(/\uF61F/g, "\u0627")
    // Private-use glyphs in the IndoPak font encoding are marks, not letters —
    // remove them completely (a space here would split one word into two)
    .replace(/[\uE000-\uF8FF]/g, "")
    .replace(/[^\u0600-\u06FF\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function wordsOf(text: string): string[] {
  const n = normalizeArabic(text);
  return n ? n.split(" ") : [];
}

/**
 * Muqatta'at (disjointed letters, e.g. الم at the start of Al-Baqarah).
 * A reciter spells them out letter by letter ("الف لام ميم"), but the mushaf
 * stores them as ONE token ("الٓمّٓ" -> normalized "الم"). Speech recognition
 * therefore never returns the single token — it returns the letter names.
 * This map (normalized token -> normalized letter names, in order) lets the
 * recitation matcher accept the spelled-out form.
 *
 * Letter names are normalized the same way heard words are (e.g. "حاء" and
 * "حا" both normalize to "حا" because ء is dropped).
 */
export const MUQATTA_AT: Record<string, string[]> = {
  "الم": ["الف", "لام", "ميم"],
  "المص": ["الف", "لام", "ميم", "صاد"],
  "الر": ["الف", "لام", "را"],
  "المر": ["الف", "لام", "ميم", "را"],
  "كهيعص": ["كاف", "ها", "يا", "عين", "صاد"],
  "طه": ["طا", "ها"],
  "طسم": ["طا", "سين", "ميم"],
  "طس": ["طا", "سين"],
  "يس": ["يا", "سين"],
  "ص": ["صاد"],
  "حم": ["حا", "ميم"],
  "عسق": ["عين", "سين", "قاف"],
  "ق": ["قاف"],
  "ن": ["نون"],
};

/**
 * Common alternative forms returned by Arabic speech recognition for Muqatta'at
 * (e.g. Chrome/Whisper returns single word "ياسين" instead of "يا سين").
 */
export const MUQATTA_AT_FORMS: Record<string, string[]> = {
  "يس": ["ياسين", "يس", "ياس"],
  "طه": ["طاها", "طه", "طاه"],
  "حم": ["حاميم", "حم"],
  "طس": ["طاسين", "طس"],
  "طسم": ["طاسين ميم", "طاسيم", "طسم"],
  "ص": ["صاد", "ص"],
  "ق": ["قاف", "ق"],
  "ن": ["نون", "ن"],
  "الم": ["الم"],
  "المص": ["المص"],
  "الر": ["الر"],
  "المر": ["المر"],
  "كهيعص": ["كهيعص"],
  "عسق": ["عسق"],
};

/**
 * Common speech engine acoustic and language-model transcription variants
 * (e.g. Google STT writes "انزل" for "انذر" after "ما", and "ابائهم" for "اباؤهم").
 */
export const WORD_ALIASES: Record<string, string[]> = {
  "انذر": ["انزل", "انظر"],
  "لتنذر": ["لتنظر"],
  "اباوهم": ["ابايهم", "ابائهم", "اباؤهم"],
  "لله": ["الله", "بالله", "والله", "فلله", "تالله", "للاه"],
  "الله": ["لله", "بالله", "والله", "فلله", "تالله", "اللاه"],
  "بسم": ["اسم", "باسم", "واسم"],
  "اسم": ["بسم", "باسم", "واسم"],
  "الذين": ["الزين", "الدين", "اللذين", "لذين"],
  "ذلك": ["ذالك", "زالك", "دالك"],
  "هذا": ["هاذا", "هزا", "هازا"],
  "هولاء": ["هاؤلاء", "هاولاء", "هؤلاء"],
  "ملك": ["مالك", "مليك"],
  "مالك": ["ملك", "مليك"],
  "الرحمن": ["الرحمان"],
  "الرحمان": ["الرحمن"],
  "الصراط": ["السراط", "صراط", "سراط"],
  "صراط": ["سراط", "الصراط", "السراط"],
  "المستقيم": ["المستقم", "مستقيم", "مستقم"],
  "مستقيم": ["مستقم", "المستقيم", "المستقم"],
  "اياك": ["واياك", "ياك", "إياك"],
  "واياك": ["اياك", "وإياك"],
  "اعوذ": ["اعوز", "أعوذ", "أعوز", "اعود"],
  "اهدنا": ["إهدنا", "اهدنا"],
  "المغضوب": ["المغزوب", "المگزوب", "المگدوب", "مغضوب", "مغزوب"],
  "الضالين": ["الزالين", "والضالين", "ولاالضالين", "ضالين", "زالين"],
  "ولا": ["وال"],
};

/**
 * Collapse spelled-out muqatta'at letter names (or single-word recognizer aliases)
 * in a heard-word batch into the single mushaf token, e.g.:
 * ["الف","لام","ميم"] -> ["الم"]
 * ["ياسين"] -> ["يس"]
 */
export function collapseMuqattaat(
  words: string[],
  muqToken: string
): { words: string[]; carry: string[] } {
  const letters = MUQATTA_AT[muqToken];
  const aliases = MUQATTA_AT_FORMS[muqToken] ?? [];
  if (!letters && aliases.length === 0) return { words, carry: [] };
  const out: string[] = [];
  let i = 0;
  const n = words.length;

  const isStrictPrefixAt = (pos: number): boolean => {
    if (!letters) return false;
    const rem = n - pos;
    if (rem <= 0 || rem >= letters.length) return false;
    for (let k = 0; k < rem; k++) {
      if (words[pos + k] !== letters[k]) return false;
    }
    return true;
  };

  while (i < n) {
    // 1. Single-word alias (e.g. "ياسين" for "يس", "طاها" for "طه")
    if (aliases.includes(words[i])) {
      out.push(muqToken);
      i++;
      continue;
    }

    // 2. Multi-word alias (e.g. "طاسين ميم")
    if (i + 1 < n && aliases.includes(words[i] + " " + words[i + 1])) {
      out.push(muqToken);
      i += 2;
      continue;
    }

    // 3. Full spelled-out letters (e.g. ["يا", "سين"])
    if (letters) {
      let full = i + letters.length <= n;
      if (full) {
        for (let k = 0; k < letters.length; k++) {
          if (words[i + k] !== letters[k]) {
            full = false;
            break;
          }
        }
      }
      if (full) {
        out.push(muqToken);
        i += letters.length;
        continue;
      }

      if (isStrictPrefixAt(i)) return { words: out, carry: words.slice(i) };
    }

    out.push(words[i]);
    i++;
  }
  return { words: out, carry: [] };
}

export interface WalkResult {
  /** how many expected words are revealed after this walk */
  revealed: number;
  /** heard words consumed */
  consumed: number;
  /** heard words that did NOT match the next expected word */
  mistakes: number;
}

/**
 * Walk heard words in order against expected words, starting at `startAt`.
 * - heard word === expected[startAt]  -> reveal it, advance.
 * - otherwise -> count a mistake, discard the heard word, reveal nothing.
 * This is the core rule of the app: galt parho to aage ka text nazar nahi aata.
 */
export function walkWords(
  expected: string[],
  heard: string[],
  startAt: number
): WalkResult {
  let revealed = startAt;
  let consumed = 0;
  let mistakes = 0;
  for (const w of heard) {
    if (revealed < expected.length && w === expected[revealed]) {
      revealed++;
    } else {
      mistakes++;
    }
    consumed++;
  }
  return { revealed, consumed, mistakes };
}
