import { LOWEST_MIDI, MIDI_TO_KEY, PLAYABLE_MIDIS, isNatural } from "./keyboard";
import type { SongLine } from "./notation";

export type PlacedNote = {
  key: string;
  /** Where the note ended up on the Heartopia keyboard. */
  midi: number;
  /** Semitones moved off the (already transposed) pitch, to reach a natural. */
  snapped: number;
  /** Octaves moved to fit inside C3-C6. */
  octaveShift: number;
};

export type ArrangedEvent =
  | { kind: "chord"; notes: PlacedNote[]; raw: string }
  | { kind: "hold" };

export type ArrangedLine = ArrangedEvent[];

export type Arrangement = {
  shift: number;
  lines: ArrangedLine[];
  stats: {
    total: number;
    /** Notes bent to a neighbouring natural because the piano has no accidentals. */
    snapped: number;
    /** Notes moved by one or more octaves to fit the range. */
    folded: number;
  };
};

/**
 * Places a pitch on the keyboard, preferring the octave nearest the original so
 * the melody keeps its shape. Accidentals have no key, so they bend to the
 * closest natural (ties go down, matching how these arrangements usually read).
 */
function place(midi: number): PlacedNote {
  const candidates = isNatural(midi) ? [midi] : [midi - 1, midi + 1];

  let best: PlacedNote | null = null;
  for (const candidate of candidates) {
    const snapped = candidate - midi;
    for (let octaves = -3; octaves <= 3; octaves++) {
      const target = candidate + octaves * 12;
      if (!PLAYABLE_MIDIS.has(target)) continue;
      const note: PlacedNote = {
        key: MIDI_TO_KEY.get(target)!,
        midi: target,
        snapped,
        octaveShift: octaves,
      };
      if (best === null || cost(note) < cost(best)) best = note;
    }
  }

  // Nothing landed: the pitch is far outside C3-C6. Clamp to the nearest edge.
  return best ?? place(midi < LOWEST_MIDI ? midi + 12 : midi - 12);
}

/** Bending a pitch is worse than moving it an octave — an octave keeps it in tune. */
function cost(note: PlacedNote): number {
  return Math.abs(note.snapped) * 10 + Math.abs(note.octaveShift);
}

function collectMidis(lines: SongLine[]): number[] {
  return lines.flatMap((line) =>
    line.flatMap((event) => (event.kind === "chord" ? event.midis : [])),
  );
}

/**
 * The keyboard is diatonic in C, so a song in any other key only fits once
 * transposed. Scores every one of the 12 transpositions and keeps the one that
 * leaves the fewest notes needing to be bent.
 */
export function bestShift(lines: SongLine[]): number {
  const midis = collectMidis(lines);
  if (midis.length === 0) return 0;

  let best = 0;
  let bestScore = -Infinity;

  for (let shift = -6; shift <= 5; shift++) {
    let score = 0;
    for (const midi of midis) {
      const note = place(midi + shift);
      // In-tune notes dominate; octave folding and big shifts break ties.
      score -= Math.abs(note.snapped) * 100 + Math.abs(note.octaveShift);
    }
    score -= Math.abs(shift) * 0.5;

    if (score > bestScore) {
      bestScore = score;
      best = shift;
    }
  }
  return best;
}

export function arrange(lines: SongLine[], shift: number): Arrangement {
  let total = 0;
  let snapped = 0;
  let folded = 0;

  const arrangedLines: ArrangedLine[] = lines.map((line) =>
    line.map((event): ArrangedEvent => {
      if (event.kind === "hold") return { kind: "hold" };

      const notes = event.midis.map((midi) => {
        const note = place(midi + shift);
        total += 1;
        if (note.snapped !== 0) snapped += 1;
        if (note.octaveShift !== 0) folded += 1;
        return note;
      });
      return { kind: "chord", notes, raw: event.raw };
    }),
  );

  return { shift, lines: arrangedLines, stats: { total, snapped, folded } };
}

/** Renders an arrangement as the key string you type in game. */
export function toKeyString(arrangement: Arrangement): string {
  return arrangement.lines
    .map((line) =>
      line
        .map((event) =>
          event.kind === "hold"
            ? "-"
            : event.notes.length > 1
              ? `[${event.notes.map((n) => n.key).join("")}]`
              : event.notes[0].key,
        )
        .join(" "),
    )
    .join("\n");
}
