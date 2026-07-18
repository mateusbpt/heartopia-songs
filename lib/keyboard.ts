/**
 * The Heartopia piano: 22 diatonic keys, no accidentals, spanning C3 to C6.
 * Rows follow jianpu convention — dot below the number is the low octave, dot
 * above is high, two dots above is two octaves up.
 */

/** Scale degrees of C major, in semitones from C. */
export const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];

export const SOLFEGE = ["DO", "RE", "MI", "FA", "SOL", "LA", "TI"];

export type KeyRow = {
  id: "high" | "mid" | "low";
  label: string;
  octave: number;
  keys: string[];
};

export const KEY_ROWS: KeyRow[] = [
  { id: "high", label: "Aguda", octave: 5, keys: ["Q", "W", "E", "R", "T", "Y", "U"] },
  { id: "mid", label: "Média", octave: 4, keys: ["A", "S", "D", "F", "G", "H", "J"] },
  { id: "low", label: "Grave", octave: 3, keys: ["Z", "X", "C", "V", "B", "N", "M"] },
];

/** The lone extra key: DO two octaves above the middle row. */
const TOP_KEY = { key: "I", midi: midiOf(6, 0) };

function midiOf(octave: number, semitone: number): number {
  return (octave + 1) * 12 + semitone;
}

export const MIDI_TO_KEY: ReadonlyMap<number, string> = (() => {
  const map = new Map<number, string>();
  for (const row of KEY_ROWS) {
    row.keys.forEach((key, i) => map.set(midiOf(row.octave, MAJOR_SCALE[i]), key));
  }
  map.set(TOP_KEY.midi, TOP_KEY.key);
  return map;
})();

export const PLAYABLE_MIDIS: ReadonlySet<number> = new Set(MIDI_TO_KEY.keys());

export const LOWEST_MIDI = Math.min(...PLAYABLE_MIDIS);
export const HIGHEST_MIDI = Math.max(...PLAYABLE_MIDIS);

export function isNatural(midi: number): boolean {
  return MAJOR_SCALE.includes(((midi % 12) + 12) % 12);
}
