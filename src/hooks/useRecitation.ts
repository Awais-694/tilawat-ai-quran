import { useCallback, useMemo, useRef, useState } from "react";
import { matchMany, skipEmpty } from "@/lib/quran/matcher";
import { wordsOf, MUQATTA_AT, MUQATTA_AT_FORMS, collapseMuqattaat } from "@/lib/quran/normalize";
import type { WordToken } from "@/types/quran";

// Recitation ka markazi hook: speech results ko matcher se guzaar kar
// WordToken states update karta hai. UI sirf is hook ki state parhti hai.
//
// Final results -> permanent reveal (ya galti record)
// Interim results -> live preview (galti par reveal nahi)

export function useRecitation(tokens: WordToken[], initialRevealed: number = 0) {
  const expected = useMemo(() => tokens.map((t) => t.normalized), [tokens]);
  const expectedForms = useMemo(() => tokens.map((t) => t.forms ?? []), [tokens]);
  // Basmala ke lafz shuru me hain; user aksar ayat 1 se shuru
  // karta hai — is liye itne lafz skip kiye ja sakte hain.
  const basmalaLen = useMemo(() => {
    let n = 0;
    while (n < tokens.length && tokens[n].ayahNumber === 0) n++;
    if (n === 0 && tokens.length >= 4) {
      // Check if tokens 0..3 are the Basmala in Ayah 1 (e.g. Surah Al-Fatiha)
      if (tokens[0]?.normalized === "بسم" && tokens[1]?.normalized === "الله") {
        while (n < tokens.length && tokens[n].ayahNumber <= 1) n++;
      }
    }
    return n;
  }, [tokens]);
  const [revealed, setRevealed] = useState(initialRevealed);
  const [displayRevealed, setDisplayRevealed] = useState(initialRevealed);
  const [wrongWords, setWrongWords] = useState<string[]>([]);
  const [lastHeard, setLastHeard] = useState("");
  const processedFinalWords = useRef(0);
  // Muqatta'at carry: trailing letter names of an incomplete spelled-out
  // sequence (e.g. ["الف","لام"] when the user paused before "ميم").
  // They are NOT mistakes — the next batch may complete the sequence.
  const carryRef = useRef<string[]>([]);
  // revealed ka ref mirror — tez peeche aane wale results purani closure se
  // ghalat position par match na karein ya progress overwrite na karein.
  const revealedRef = useRef(initialRevealed);

  const setInitialProgress = useCallback((n: number) => {
    revealedRef.current = n;
    setRevealed(n);
    setDisplayRevealed(n);
  }, []);

  const jumpToProgress = useCallback((n: number) => {
    revealedRef.current = n;
    setRevealed(n);
    setDisplayRevealed(n);
    processedFinalWords.current = 0;
    carryRef.current = [];
  }, []);

  const handleResult = useCallback(
    (finalText: string, interimText: string, interimAlts?: string[]) => {
      const finalWords = wordsOf(finalText);
      const rawNew = finalWords.slice(processedFinalWords.current);
      let committed = revealedRef.current;

      if (rawNew.length > 0 || carryRef.current.length > 0) {
        // Candidate start positions: only allow skipping Basmala if at the very beginning (committed === 0)
        const starts: number[] =
          committed === 0 && basmalaLen > 0 ? [0, basmalaLen] : [committed];
        // Har candidate ke liye: muqatta'at (e.g. الم, يس) ke liye bole gaye
        // harfon ke naam ("الف لام ميم", "يا سين", ya single alias "ياسين") ko mushaf token me collapse karo.
        const procFor = (s: number): { proc: string[]; carryAfter: string[] } => {
          let input = [...carryRef.current, ...rawNew];
          const proc: string[] = [];
          let pos = skipEmpty(expected, s);
          let carryAfter: string[] = [];
          for (;;) {
            const tok = pos < expected.length ? expected[pos] : "";
            if (!tok || input.length === 0) break;

            // 1. Single-word alias check (e.g. "ياسين" for "يس", "طاها" for "طه")
            const aliases = MUQATTA_AT_FORMS[tok];
            if (aliases && aliases.includes(input[0])) {
              proc.push(tok);
              input = input.slice(1);
              pos = skipEmpty(expected, pos + 1);
              continue;
            }

            // 2. Multi-word alias check (e.g. "طاسين ميم")
            if (aliases && input.length >= 2 && aliases.includes(input[0] + " " + input[1])) {
              proc.push(tok);
              input = input.slice(2);
              pos = skipEmpty(expected, pos + 1);
              continue;
            }

            // 3. Spelled-out letter sequence check (e.g. ["يا", "سين"])
            const letters = MUQATTA_AT[tok];
            if (!letters) break;
            let full = input.length >= letters.length;
            if (full) {
              for (let k = 0; k < letters.length; k++) {
                if (input[k] !== letters[k]) {
                  full = false;
                  break;
                }
              }
            }
            if (full) {
              proc.push(tok);
              input = input.slice(letters.length);
              pos = skipEmpty(expected, pos + 1);
              continue;
            }
            let pre = input.length < letters.length;
            if (pre) {
              for (let k = 0; k < input.length; k++) {
                if (input[k] !== letters[k]) {
                  pre = false;
                  break;
                }
              }
            }
            if (pre) {
              carryAfter = input;
              input = [];
              break;
            }
            break;
          }
          proc.push(...input);
          return { proc, carryAfter };
        };
        // Jeetne wali position woh jahan SAB SE ZYADA NAYE lafz match hon
        let best: { revealed: number; wrongWords: string[] } | null = null;
        let bestNew = -1;
        let bestCarry: string[] = [];
        let carriedOnly: string[] | null = null;
        for (const s of starts) {
          const { proc, carryAfter } = procFor(s);
          if (proc.length === 0) {
            if (carryAfter.length > 0 && carriedOnly === null) carriedOnly = carryAfter;
            continue;
          }
          const r2 = matchMany(expected, s, proc, expectedForms);
          const newly = r2.revealed - s;
          if (newly > bestNew) {
            bestNew = newly;
            best = r2;
            bestCarry = carryAfter;
          }
        }
        if (best && bestNew > 0) {
          committed = best.revealed;
          carryRef.current = bestCarry;
          revealedRef.current = committed;
          setRevealed(committed);
          if (best.wrongWords.length) setWrongWords((w) => [...w, ...best.wrongWords]);
        } else if (interimAlts && interimAlts.length > 0) {
          let altMatched = false;
          for (const alt of interimAlts) {
            const altWords = wordsOf(alt);
            if (altWords.length > 0) {
              const altMatch = matchMany(expected, committed, altWords, expectedForms);
              if (altMatch.revealed > committed) {
                committed = altMatch.revealed;
                carryRef.current = [];
                revealedRef.current = committed;
                setRevealed(committed);
                altMatched = true;
                break;
              }
            }
          }
          if (!altMatched) {
            if (carriedOnly) {
              carryRef.current = carriedOnly;
            } else if (best) {
              carryRef.current = [];
              if (best.wrongWords.length) setWrongWords((w) => [...w, ...best.wrongWords]);
            }
          }
        } else if (carriedOnly) {
          carryRef.current = carriedOnly;
        } else if (best) {
          carryRef.current = [];
          if (best.wrongWords.length) setWrongWords((w) => [...w, ...best.wrongWords]);
        }
      }
      processedFinalWords.current = finalWords.length;
      let interimWords = wordsOf(interimText);
      const rLive = skipEmpty(expected, committed);
      const muqLive = rLive < expected.length ? expected[rLive] : "";
      if ((MUQATTA_AT[muqLive] || MUQATTA_AT_FORMS[muqLive]) && interimWords.length > 0) {
        interimWords = collapseMuqattaat(interimWords, muqLive).words;
      }

      // Live interim matching for fast recitation:
      // Match incoming words in sequence against the expected Quran tokens starting from committed.
      // matchMany enforces strict sequential order (no skipping unrecited words).
      let live = committed;
      if (interimWords.length > 0) {
        const interimMatch = matchMany(expected, committed, interimWords, expectedForms);
        live = Math.min(interimMatch.revealed, expected.length);
      }

      // If speech recognition alternatives are available, check if an alternative matches further
      if (interimAlts && interimAlts.length > 0) {
        for (const alt of interimAlts) {
          let altWords = wordsOf(alt);
          if ((MUQATTA_AT[muqLive] || MUQATTA_AT_FORMS[muqLive]) && altWords.length > 0) {
            altWords = collapseMuqattaat(altWords, muqLive).words;
          }
          if (altWords.length > 0) {
            const altMatch = matchMany(expected, committed, altWords, expectedForms);
            if (altMatch.revealed > live) {
              live = Math.min(altMatch.revealed, expected.length);
            }
          }
        }
      }

      // When live match from speech stream advances, lock it in so the word reveals
      // instantly on the first recitation attempt and never blurs back when speech pauses.
      if (live > committed) {
        committed = live;
        revealedRef.current = committed;
        setRevealed(committed);
      }

      setDisplayRevealed((prev) => Math.max(prev, committed, live));
      const heard = (finalText + " " + interimText).trim();
      if (heard) setLastHeard(heard);
    },
    [expected, expectedForms, basmalaLen]
  );

  const reset = useCallback(() => {
    processedFinalWords.current = 0;
    carryRef.current = [];
    revealedRef.current = 0;
    setRevealed(0);
    setDisplayRevealed(0);
    setWrongWords([]);
    setLastHeard("");
  }, []);

  return {
    revealed,
    displayRevealed,
    mistakes: wrongWords.length,
    wrongWords,
    lastHeard,
    handleResult,
    reset,
    setInitialProgress,
    jumpToProgress,
    completed: expected.length > 0 && displayRevealed >= expected.length,
  };
}
