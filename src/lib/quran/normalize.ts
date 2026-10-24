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
  "الم": [
    "الم",
    "الفلاميم",
    "الفلميم",
    "الف لام ميم",
    "الفلام ميم",
    "الف لاام مييم",
    "الف لاااام مييييم",
    "الفلامين",
  ],
  "المص": [
    "المص",
    "الفلاميمصاد",
    "الف لام ميم صاد",
    "الفلاميم صاد",
    "الف لام ميم صااد",
  ],
  "الر": [
    "الر",
    "الفلامرا",
    "الفلام را",
    "الف لام را",
    "الف لام راء",
    "الف لاام را",
    "الفلامراء",
  ],
  "المر": [
    "المر",
    "الفلاميمرا",
    "الف لام ميم را",
    "الفلاميم را",
    "الف لام ميم راء",
  ],
  "كهيعص": [
    "كهيعص",
    "كافهاياعينصاد",
    "كاف ها يا عين صاد",
    "كاف هايا عين صاد",
    "كافها ياعين صاد",
    "كاف هاء ياء عين صاد",
    "كاف هاء ياء عين صااد",
  ],
  "طه": [
    "طه",
    "طاها",
    "طا ها",
    "طاه",
    "طاء هاء",
    "طہ",
  ],
  "طسم": [
    "طسم",
    "طاسين ميم",
    "طاسينميم",
    "طا سين ميم",
    "طاسيم",
    "طاء سين ميم",
    "طاسيين مييم",
  ],
  "طس": [
    "طس",
    "طاسين",
    "طا سين",
    "طاء سين",
    "طاسيين",
  ],
  "يس": [
    "يس",
    "ياسين",
    "يا سين",
    "ياس",
    "ياء سين",
    "ياسيين",
    "ياسین",
  ],
  "ص": [
    "ص",
    "صاد",
    "صااد",
    "صاااد",
  ],
  "حم": [
    "حم",
    "حاميم",
    "حا ميم",
    "حاء ميم",
    "حامييم",
    "حاميين",
  ],
  "عسق": [
    "عسق",
    "عين سين قاف",
    "عينسينقاف",
    "عين سين قااف",
  ],
  "حمعسق": [
    "حمعسق",
    "حم عسق",
    "حاميم عين سين قاف",
    "حا ميم عين سين قاف",
  ],
  "ق": [
    "ق",
    "قاف",
    "قااف",
    "قاااف",
  ],
  "ن": [
    "ن",
    "نون",
    "نوون",
    "نووون",
  ],
};

/**
 * Normalize individual spelled-out Muqatta'at letter names, folding elongation (Madd 6 harakat):
 * e.g. "لاااام" -> "لام", "مییییم" -> "میم", "صاااد" -> "صاد", "قاااف" -> "قاف"
 */
export function normalizeMuqattaatLetter(w: string): string {
  const norm = normalizeArabic(w).replace(/(.)\1+/g, "$1");
  const rawDedup = w.replace(/(.)\1+/g, "$1");

  if (w.startsWith("الف") || norm.startsWith("الف") || norm === "الف") return "الف";
  if (w.startsWith("لام") || norm.startsWith("لام") || norm === "لام" || rawDedup === "لام") return "لام";
  if (w.startsWith("ميم") || norm.startsWith("ميم") || norm === "ميم" || rawDedup === "ميم") return "ميم";
  if (w.startsWith("صاد") || norm.startsWith("صاد") || norm === "صاد" || rawDedup === "صاد") return "صاد";
  if (w.startsWith("قاف") || norm.startsWith("قاف") || norm === "قاف" || rawDedup === "قاف") return "قاف";
  if (w.startsWith("نون") || norm.startsWith("نون") || norm === "نون" || rawDedup === "نون") return "نون";
  if (w.startsWith("سين") || norm.startsWith("سين") || norm === "سين" || rawDedup === "سين") return "سين";
  if (w.startsWith("عين") || norm.startsWith("عين") || norm === "عين" || rawDedup === "عين") return "عين";
  if (w.startsWith("كاف") || norm.startsWith("كاف") || norm === "كاف" || rawDedup === "كاف") return "كاف";
  if (norm === "طا" || norm === "طاء" || rawDedup === "طا") return "طا";
  if (norm === "ها" || norm === "هاء" || rawDedup === "ها") return "ها";
  if (norm === "يا" || norm === "ياء" || rawDedup === "يا") return "يا";
  if (norm === "را" || norm === "راء" || rawDedup === "را") return "را";
  if (norm === "حا" || norm === "حاء" || rawDedup === "حا") return "حا";

  return norm;
}

/**
 * Common speech engine acoustic and language-model transcription variants
 * (e.g. Google STT writes "انزل" for "انذر" after "ما", and "ابائهم" for "اباؤهم").
 */
export const WORD_ALIASES: Record<string, string[]> = {
  "انذر": ["انزل", "انظر"],
  "لتنذر": ["لتنظر"],
  "اباوهم": ["ابايهم", "ابائهم", "اباؤهم"],
  "لله": ["الله", "بالله", "والله", "فلله", "تالله", "للاه"],
  "الله": ["لله", "بالله", "والله", "فلله", "تالله", "اللاه", "نالله"],
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
  "الصراط": ["السراط", "صراط", "سراط", "اسراط"],
  "صراط": ["سراط", "الصراط", "السراط", "اسراط"],
  "المستقيم": ["المستقم", "مستقيم", "مستقم"],
  "مستقيم": ["مستقم", "المستقيم", "المستقم"],
  "اياك": ["واياك", "ياك", "إياك", "فاياك"],
  "واياك": ["اياك", "وإياك", "ياك"],
  "اعوذ": ["اعوز", "أعوذ", "أعوز", "اعود"],
  "اهدنا": ["إهدنا", "اهدنا", "هدنا", "واهدنا"],
  "المغضوب": ["المغزوب", "المگزوب", "المگدوب", "مغضوب", "مغزوب"],
  "الضالين": ["الزالين", "ضالين", "زالين", "الظالين"],
  "ولا": ["وال", "لا", "فلا"],
  "احد": ["احدن", "واحد"],
  "الصمد": ["صمد", "الصمد"],
  "كفوا": ["كفؤا", "كفوان", "كفو"],
  "يلد": ["ولد"],
  "يولد": ["ولد"],
  "يكن": ["يكل"],
  "له": ["لاه", "له"],
  "العصر": ["عصر", "والعصر"],
  "الفلق": ["فلق", "الفلق"],
  "الناس": ["ناس", "الناس"],
  "الكوثر": ["كوثر", "الكوثر"],
  "مسد": ["مسد"],
  "حبل": ["حبل"],
};

/**
 * Collapse spelled-out muqatta'at letter names (or single-word recognizer aliases)
 * in a heard-word batch into the single mushaf token, e.g.:
 * ["الف","لام","ميم"] -> ["الم"]
 * ["الف","لاااام","مييييم"] -> ["الم"] (elongated Madd)
 * ["ياسين"] -> ["يس"]
 * ["الفلاميم"] -> ["الم"]
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

  const letterMatches = (heardWord: string, targetLetter: string): boolean => {
    if (heardWord === targetLetter) return true;
    const normH = normalizeMuqattaatLetter(heardWord);
    return normH === targetLetter;
  };

  const isStrictPrefixAt = (pos: number): boolean => {
    if (!letters) return false;
    const rem = n - pos;
    if (rem <= 0 || rem >= letters.length) return false;
    for (let k = 0; k < rem; k++) {
      if (!letterMatches(words[pos + k], letters[k])) return false;
    }
    return true;
  };

  while (i < n) {
    const curWord = words[i];
    const wDedup = curWord.replace(/(.)\1+/g, "$1");

    // 1. Single-word alias (e.g. "ياسين", "طاها", "الفلاميم", "حاميم", "الم")
    if (aliases.includes(curWord) || aliases.includes(wDedup)) {
      out.push(muqToken);
      i++;
      continue;
    }

    // 2. Multi-word alias (e.g. "طاسين ميم", "الف لام ميم", "كاف ها يا عين صاد")
    let matchedAlias = false;
    for (let len = 5; len >= 2; len--) {
      if (i + len <= n) {
        const slice = words.slice(i, i + len);
        const joined = slice.join(" ");
        const joinedDedup = slice.map((w) => w.replace(/(.)\1+/g, "$1")).join(" ");
        const joinedNorm = slice.map((w) => normalizeMuqattaatLetter(w)).join(" ");
        if (
          aliases.includes(joined) ||
          aliases.includes(joinedDedup) ||
          aliases.includes(joinedNorm)
        ) {
          out.push(muqToken);
          i += len;
          matchedAlias = true;
          break;
        }
      }
    }
    if (matchedAlias) continue;

    // 3. Full spelled-out letters with elongation support (e.g. ["الف", "لاااام", "مييييم"])
    if (letters) {
      let full = i + letters.length <= n;
      if (full) {
        for (let k = 0; k < letters.length; k++) {
          if (!letterMatches(words[i + k], letters[k])) {
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

      // 4. Incomplete letter prefix (paused recitation, e.g. user said "الف" and paused)
      if (isStrictPrefixAt(i)) {
        return { words: out, carry: words.slice(i) };
      }
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
