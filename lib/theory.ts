/** Portuguese major-key names by pitch class (0 = C). */
const MAJOR_KEY_NAMES = [
  "Dó maior",
  "Ré♭ maior",
  "Ré maior",
  "Mi♭ maior",
  "Mi maior",
  "Fá maior",
  "Fá♯ maior",
  "Sol maior",
  "Lá♭ maior",
  "Lá maior",
  "Si♭ maior",
  "Si maior",
];

/**
 * The arrangement transposes the song by `shift` semitones so its scale lands on
 * C major. That means the original tonic sat `shift` semitones below C, so we can
 * name the source key straight from the shift. It's the major reading — a song in
 * the relative minor shares the same scale, so this can't tell them apart.
 */
export function inferredSourceKey(shift: number): string {
  const pc = (((-shift % 12) + 12) % 12);
  return MAJOR_KEY_NAMES[pc];
}

/** Equal-temperament frequency for a MIDI note, where A4 (69) = 440 Hz. */
export function midiToFreq(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}
