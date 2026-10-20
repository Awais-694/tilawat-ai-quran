// Studio-grade acoustic chime feedback using Web Audio API.
// Completely offline, 0kb network assets, instantaneous response.

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioCtx || audioCtx.state === "closed") {
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === "suspended") {
    void audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Ascending crystal chime when the microphone turns ON.
 * Harmonious pleasant tones (G5 = 784Hz -> C6 = 1046.5Hz) with a gentle bell decay and sparkling overtone.
 */
export function playMicStartSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Harmonic bell sequence: G5 (784Hz) -> C6 (1046.5Hz) with subtle sparkle at C7 (2093Hz)
    const notes = [
      { freq: 783.99, start: 0, dur: 0.22, gain: 0.18 },
      { freq: 1046.5, start: 0.09, dur: 0.38, gain: 0.24 },
      { freq: 2093.0, start: 0.09, dur: 0.26, gain: 0.07 },
    ];

    notes.forEach(({ freq, start, dur, gain }) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + start);

      gainNode.gain.setValueAtTime(0.0001, now + start);
      gainNode.gain.linearRampToValueAtTime(gain, now + start + 0.015);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now + start);
      osc.stop(now + start + dur);
    });
  } catch {
    // Graceful fallback if audio is not permitted by browser yet
  }
}

/**
 * Soft descending tone when the microphone turns OFF.
 */
export function playMicStopSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Gentle soft tone: G5 (784Hz) -> E5 (523.25Hz)
    const notes = [
      { freq: 783.99, start: 0, dur: 0.14, gain: 0.14 },
      { freq: 523.25, start: 0.07, dur: 0.24, gain: 0.16 },
    ];

    notes.forEach(({ freq, start, dur, gain }) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + start);

      gainNode.gain.setValueAtTime(0.0001, now + start);
      gainNode.gain.linearRampToValueAtTime(gain, now + start + 0.015);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now + start);
      osc.stop(now + start + dur);
    });
  } catch {
    // Graceful fallback
  }
}

/**
 * Joyful ascending celebration chime when a Surah is completed.
 * Harmonious C-major crystal arpeggio (C5 -> E5 -> G5 -> C6).
 */
export function playCompletionSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const notes = [
      { freq: 523.25, start: 0, dur: 0.28, gain: 0.16 },
      { freq: 659.25, start: 0.1, dur: 0.32, gain: 0.19 },
      { freq: 783.99, start: 0.2, dur: 0.4, gain: 0.22 },
      { freq: 1046.5, start: 0.32, dur: 0.65, gain: 0.26 },
      { freq: 1318.5, start: 0.32, dur: 0.45, gain: 0.1 },
    ];

    notes.forEach(({ freq, start, dur, gain }) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + start);

      gainNode.gain.setValueAtTime(0.0001, now + start);
      gainNode.gain.linearRampToValueAtTime(gain, now + start + 0.015);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now + start);
      osc.stop(now + start + dur);
    });
  } catch {
    // Graceful fallback
  }
}

