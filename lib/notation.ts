/**
 * NoobNotes letter notation.
 *
 * Octave is carried by a prefix, confirmed against the reference piano the site
 * renders on every song page (`data-note-octave`):
 *
 *   _C -> octave 2    .C -> octave 3    C -> octave 4    ^C -> octave 5    *C -> octave 6
 *
 * A trailing `#`/`b` is the accidental. Note letters are always uppercase, so a
 * trailing lowercase `b` is unambiguously a flat and never the note B.
 */

const OCTAVE_BY_PREFIX: Record<string, number> = {
  _: 2,
  ".": 3,
  "": 4,
  "^": 5,
  "*": 6,
};

const PITCH_CLASS: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

/** Matches a single note anywhere in a string: optional octave prefix, letter, optional accidental. */
const NOTE_RE = /([_.^*]?)([A-G])([#b]?)/g;

export type SongEvent =
  | { kind: "chord"; midis: number[]; raw: string }
  /** `-` in the source: extends the previous note by one beat. */
  | { kind: "hold" };

export type SongLine = SongEvent[];

/** MIDI number, where C4 = 60 (NoobNotes' unprefixed octave). */
function toMidi(prefix: string, letter: string, accidental: string): number {
  const octave = OCTAVE_BY_PREFIX[prefix];
  const semitone = PITCH_CLASS[letter] + (accidental === "#" ? 1 : accidental === "b" ? -1 : 0);
  return (octave + 1) * 12 + semitone;
}

function matchNotes(text: string): RegExpMatchArray[] {
  return [...text.matchAll(NOTE_RE)];
}

/**
 * Distinguishes a line of notes from a line of lyrics. A note line is made up
 * exclusively of note tokens and structural punctuation; lyrics leave residue
 * behind because they contain letters outside A-G.
 */
export function isNoteLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;

  const noteCount = matchNotes(trimmed).length;
  if (noteCount < 2) return false;

  const residue = trimmed.replace(NOTE_RE, " ").replace(/[-\s[\]()|/,.*_^]/g, "");
  return residue.length === 0;
}

/**
 * Parses a single note line into playable events. Notes inside `[...]` are one
 * chord; every other note is its own event.
 */
function parseLineEvents(line: string): SongEvent[] {
  const events: SongEvent[] = [];
  // Tokenise into bracket groups, single notes, and holds.
  const tokens = line.match(/\[[^\]]*\]|[_.^*]?[A-G][#b]?|-/g) ?? [];

  for (const token of tokens) {
    if (token === "-") {
      events.push({ kind: "hold" });
      continue;
    }
    const midis = matchNotes(token).map((m) => toMidi(m[1], m[2], m[3]));
    if (midis.length > 0) events.push({ kind: "chord", midis, raw: token });
  }
  return events;
}

export type Section = { lyric: string | null; events: SongEvent[] };

/**
 * Splits the page text into sections. On noobnotes a note line is followed by
 * its lyric line, so each note line pairs with the next line when that line is
 * lyrics rather than more notes. Lines that aren't notes and don't follow a note
 * line (leading credits, the description blurb) are dropped.
 */
export function parseSong(text: string): Section[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const sections: Section[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (!isNoteLine(lines[i])) continue;
    const events = parseLineEvents(lines[i]);
    if (events.length === 0) continue;

    const next = lines[i + 1];
    const lyric = next && !isNoteLine(next) ? next : null;
    sections.push({ lyric, events });
  }
  return sections;
}

/** Just the playable lines, for callers that don't care about lyrics. */
export function parseNotation(text: string): SongLine[] {
  return parseSong(text).map((s) => s.events);
}
