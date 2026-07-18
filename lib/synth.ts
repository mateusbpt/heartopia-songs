import { midiToFreq } from "./theory";

/**
 * Tiny Web Audio synth: one plucked-ish voice per note with a quick attack and
 * exponential decay, so a chord's notes ring together without clipping. The
 * context is created lazily on the first play gesture (autoplay policy needs a
 * user interaction before audio can start).
 */
let ctx: AudioContext | null = null;

function context(): AudioContext {
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function playNotes(midis: number[], seconds: number) {
  if (midis.length === 0) return;
  const audio = context();
  const now = audio.currentTime;
  const duration = Math.min(Math.max(seconds, 0.15), 1.2);
  // Keep the total gain in check so chords don't distort.
  const perVoice = 0.28 / Math.sqrt(midis.length);

  for (const midi of midis) {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = "triangle";
    osc.frequency.value = midiToFreq(midi);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(perVoice, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain).connect(audio.destination);
    osc.start(now);
    osc.stop(now + duration + 0.05);
  }
}
