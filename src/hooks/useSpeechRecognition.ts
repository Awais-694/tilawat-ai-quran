import { useEffect, useRef, useState } from "react";

// Minimal typings for the Web Speech API (not in TS DOM lib yet).
interface SRAlternative { transcript: string }
interface SRResult { isFinal: boolean; 0: SRAlternative }
interface SRResultList { length: number; [index: number]: SRResult }
interface SREvent { resultIndex: number; results: SRResultList }
interface SRInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SREvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
}

type ResultHandler = (finalText: string, interimText: string, interimAlts?: string[]) => void;

/**
 * Arabic speech recognition (Chrome/Edge Web Speech API, lang ar-SA).
 *
 * - continuous + interim results for live feedback
 * - auto-restart while the user wants to keep reciting (Chrome stops after
 *   pauses). Final transcripts are ACCUMULATED inside this hook across those
 *   restarts, so the caller always receives the full final text of the whole
 *   recitation session plus the current interim text.
 */
export function useSpeechRecognition(onResult: ResultHandler) {
  const [supported, setSupported] = useState<boolean>(false);
  useEffect(() => {
    setSupported(
      typeof window !== "undefined" &&
      !!((window as unknown as Record<string, unknown>).SpeechRecognition ||
        (window as unknown as Record<string, unknown>).webkitSpeechRecognition)
    );
  }, []);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SRInstance | null>(null);
  const wantListening = useRef(false);
  const handlerRef = useRef(onResult);
  handlerRef.current = onResult;
  const finalsAll = useRef<string[]>([]);
  const sessionFinalsAppended = useRef(0);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startSession = () => {
    if (!wantListening.current || typeof window === "undefined") return;

    try {
      recRef.current?.stop();
    } catch {}

    const w = window as unknown as Record<string, new () => SRInstance>;
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;

    const rec = new Ctor();
    rec.lang = "ar-SA";
    rec.continuous = true;
    rec.interimResults = true;
    (rec as unknown as { maxAlternatives: number }).maxAlternatives = 5;
    sessionFinalsAppended.current = 0;

    rec.onresult = (e) => {
      let finalsInSession = 0;
      let interimText = "";
      const interimAlts: string[] = [];

      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i] as unknown as { length: number; isFinal: boolean; [idx: number]: { transcript: string } };
        if (r.isFinal) {
          finalsInSession++;
          if (finalsInSession > sessionFinalsAppended.current) {
            const t = r[0]?.transcript?.trim();
            if (t) {
              finalsAll.current.push(t);
            }
            sessionFinalsAppended.current = finalsInSession;
          }
        } else {
          const chunk = r[0]?.transcript?.trim();
          if (chunk) {
            interimText += (interimText ? " " : "") + chunk;
          }
          // Collect alternative hypotheses for fast speech disambiguation
          if (r.length > 1) {
            for (let a = 1; a < r.length; a++) {
              const altChunk = r[a]?.transcript?.trim();
              if (altChunk) {
                interimAlts.push(altChunk);
              }
            }
          }
        }
      }

      handlerRef.current(finalsAll.current.join(" "), interimText.trim(), interimAlts);
    };

    rec.onerror = (e) => {
      if (e.error === "no-speech") {
        // Normal silence/pause — Chrome triggers this when speech pauses.
        // It will trigger onend next, which will auto-restart if wantListening is true.
        return;
      }
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        wantListening.current = false;
        setListening(false);
        setError("Microphone permission was denied. Please allow mic access in your browser and try again.");
      } else if (e.error === "network") {
        wantListening.current = false;
        setListening(false);
        setError("Online speech recognition failed (network error). Please check your internet connection or use the offline (Whisper) engine.");
      } else if (e.error === "audio-capture") {
        wantListening.current = false;
        setListening(false);
        setError("No microphone was detected. Please connect a microphone and try again.");
      }
    };

    rec.onend = () => {
      if (wantListening.current) {
        sessionFinalsAppended.current = 0;
        if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
        // Clean restart with fresh instance so pauses between words never stall the mic
        restartTimerRef.current = setTimeout(() => {
          if (wantListening.current) {
            startSession();
          }
        }, 60);
      } else {
        setListening(false);
      }
    };

    recRef.current = rec;
    setError(null);
    try {
      rec.start();
      setListening(true);
    } catch {
      if (wantListening.current) {
        if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
        restartTimerRef.current = setTimeout(() => {
          if (wantListening.current) startSession();
        }, 100);
      }
    }
  };

  const start = () => {
    if (!supported) return;
    if (wantListening.current) return;
    wantListening.current = true;
    startSession();
  };

  const stop = () => {
    wantListening.current = false;
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    try {
      recRef.current?.stop();
    } catch {}
    recRef.current = null;
    setListening(false);
  };

  const resetFinals = () => {
    finalsAll.current = [];
    sessionFinalsAppended.current = 0;
  };

  useEffect(() => {
    return () => {
      wantListening.current = false;
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      try {
        recRef.current?.stop();
      } catch {}
    };
  }, []);

  return { supported, listening, error, start, stop, resetFinals };
}
