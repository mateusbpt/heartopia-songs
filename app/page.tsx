"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Keyboard from "@/components/Keyboard";
import { arrange, bestShift, toKeyString } from "@/lib/arrange";
import { parseSong } from "@/lib/notation";
import { playClicks, playNotes } from "@/lib/synth";
import { inferredSourceKey } from "@/lib/theory";

type Step = { keys: string[]; midis: number[]; beats: number; line: number };

/** Flattens the arrangement into a beat timeline; a `-` extends the note before it. */
function buildTimeline(lines: ReturnType<typeof arrange>["lines"]): Step[] {
  const steps: Step[] = [];
  lines.forEach((line, lineIndex) => {
    for (const event of line) {
      if (event.kind === "hold") {
        if (steps.length > 0) steps[steps.length - 1].beats += 1;
        continue;
      }
      steps.push({
        keys: event.notes.map((n) => n.key),
        midis: event.notes.map((n) => n.midi),
        beats: 1,
        line: lineIndex,
      });
    }
  });
  return steps;
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [song, setSong] = useState<{ title: string; notation: string } | null>(null);
  const [shiftOverride, setShiftOverride] = useState<number | null>(null);
  const [bpm, setBpm] = useState(120);
  const [playing, setPlaying] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [copied, setCopied] = useState(false);
  const [sound, setSound] = useState(true);
  const [metronome, setMetronome] = useState(false);

  const sections = useMemo(() => (song ? parseSong(song.notation) : []), [song]);
  const parsed = useMemo(() => sections.map((s) => s.events), [sections]);
  const lyrics = useMemo(() => sections.map((s) => s.lyric), [sections]);
  const hasLyrics = useMemo(() => lyrics.some(Boolean), [lyrics]);
  const autoShift = useMemo(() => bestShift(parsed), [parsed]);
  const shift = shiftOverride ?? autoShift;
  const arrangement = useMemo(() => arrange(parsed, shift), [parsed, shift]);
  const timeline = useMemo(() => buildTimeline(arrangement.lines), [arrangement]);
  const keyString = useMemo(() => toKeyString(arrangement), [arrangement]);
  // Per-line key strings, aligned with `sections`/`lyrics` by index.
  const keyLines = useMemo(() => keyString.split("\n"), [keyString]);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Read through a ref so toggling sound mid-play doesn't retrigger the current note.
  const soundRef = useRef(sound);
  useEffect(() => {
    soundRef.current = sound;
  }, [sound]);
  const metronomeRef = useRef(metronome);
  useEffect(() => {
    metronomeRef.current = metronome;
  }, [metronome]);

  const finished = cursor >= timeline.length;

  useEffect(() => {
    // Reaching the end simply stops scheduling — `playing` stays as-is so the
    // button can offer a replay without the effect writing state back.
    if (!playing || finished) return;
    const step = timeline[cursor];
    const secondsPerBeat = 60 / bpm;
    const seconds = secondsPerBeat * step.beats;
    if (soundRef.current) playNotes(step.midis, seconds);
    if (metronomeRef.current) playClicks(step.beats, secondsPerBeat);
    timerRef.current = setTimeout(() => setCursor((c) => c + 1), seconds * 1000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [playing, finished, cursor, timeline, bpm]);

  const activeKeys = useMemo(
    () => new Set(playing && timeline[cursor] ? timeline[cursor].keys : []),
    [playing, timeline, cursor],
  );

  // Which lyric line the playhead is on (only while playing).
  const currentLine = playing && timeline[cursor] ? timeline[cursor].line : -1;

  async function loadSong(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSong(null);
    setShiftOverride(null);
    setPlaying(false);
    setCursor(0);
    try {
      const response = await fetch(`/api/song?url=${encodeURIComponent(url)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não deu pra carregar.");
      setSong(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não deu pra carregar.");
    } finally {
      setLoading(false);
    }
  }

  async function copyKeys() {
    await navigator.clipboard.writeText(keyString);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const { stats } = arrangement;
  const progress = timeline.length ? Math.min(cursor / timeline.length, 1) : 0;
  const sourceKey = inferredSourceKey(shift);

  const sunBtn = {
    background: "linear-gradient(180deg,var(--sun-1),var(--sun-2))",
    color: "var(--sun-ink)",
    boxShadow: "0 5px 0 #e08b2f",
  };
  const roseBtn = {
    background: "linear-gradient(180deg,#f79ac0,var(--rose))",
    color: "#fff",
    boxShadow: "0 5px 0 var(--rose-deep)",
  };
  const sheetBg = {
    background:
      "repeating-linear-gradient(180deg, transparent 0 37px, rgba(219,82,137,0.16) 37px 38px), var(--paper)",
  };

  return (
    <main className="relative mx-auto max-w-3xl overflow-hidden px-4 py-10 sm:px-6">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        {STARS.map((s, i) => (
          <span
            key={i}
            className="absolute"
            style={{ ...s.pos, width: s.size, height: s.size, background: s.color, transform: s.rot, clipPath: STAR_CLIP, opacity: 0.5 }}
          />
        ))}
      </div>

      <header className="text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-rose-soft px-4 py-1.5 text-sm font-bold text-rose-deep">
          <span aria-hidden>♫</span> piano do Heartopia
        </div>
        <h1
          className="mt-3 font-display text-5xl leading-none font-extrabold tracking-tight text-rose sm:text-6xl"
          style={{ textShadow: "3px 3px 0 #fff, 4px 5px 0 rgba(219,82,137,0.28)" }}
        >
          Heartopia{" "}
          <span
            className="text-lav-deep"
            style={{ textShadow: "3px 3px 0 #fff, 4px 5px 0 rgba(141,107,196,0.28)" }}
          >
            Songs
          </span>
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm font-semibold text-ink-soft">
          Cole o link de uma música do noobnotes e receba a sequência de teclas prontinha pra tocar
          no jogo.
        </p>
      </header>

      <form onSubmit={loadSong} className="mt-6 flex flex-col gap-2.5 sm:flex-row">
        <input
          type="url"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://noobnotes.net/nome-da-musica/"
          className="flex-1 rounded-2xl border-2 border-line bg-paper px-4 py-3.5 text-sm font-semibold text-ink shadow-[0_18px_40px_-20px_rgba(150,70,110,0.42)] outline-none placeholder:text-ink-soft/70 focus:border-rose"
        />
        <button
          type="submit"
          disabled={loading}
          style={sunBtn}
          className="rounded-2xl px-7 py-3.5 text-sm font-extrabold transition-transform active:translate-y-0.5 disabled:opacity-60"
        >
          {loading ? "Buscando…" : "Gerar"}
        </button>
      </form>

      {error && (
        <p className="mt-4 rounded-2xl border-2 border-rose/30 bg-rose-soft px-4 py-3 text-center text-sm font-bold text-rose-deep">
          {error}
        </p>
      )}

      {song && (
        <section className="mt-7 space-y-6">
          <div
            className="relative rounded-2xl bg-paper p-5 shadow-[0_18px_40px_-20px_rgba(150,70,110,0.42)]"
            style={{ transform: "rotate(-1.2deg)" }}
          >
            <span
              aria-hidden
              className="absolute -top-3 left-1/2 h-6 w-24 -translate-x-1/2 rounded-sm border border-dashed border-lav-deep/50"
              style={{ background: "rgba(203,182,236,0.55)", transform: "translateX(-50%) rotate(-3deg)" }}
            />
            <h2 className="font-display text-2xl font-extrabold text-ink">{song.title}</h2>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
              <span className="rounded-full bg-paper-2 px-3 py-1.5 text-ink-soft">
                {stats.total} notas
              </span>
              <span className="rounded-full bg-lav-soft px-3 py-1.5 text-lav-deep">
                Tom: {sourceKey}
              </span>
              <span className="rounded-full bg-rose-soft px-3 py-1.5 text-rose-deep">
                {shift === 0 ? "cabe em Dó maior" : `transposto ${shift > 0 ? `+${shift}` : shift}`}
              </span>
              <span
                className={`rounded-full px-3 py-1.5 ${
                  stats.snapped === 0
                    ? "bg-mint-soft text-mint-deep"
                    : "bg-rose-soft text-rose-deep"
                }`}
              >
                {stats.snapped === 0 ? "afinação perfeita" : `${stats.snapped} desafinadas`}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-3xl bg-paper p-5 shadow-[0_18px_40px_-20px_rgba(150,70,110,0.42)]">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-ink">Transpor</span>
              <button
                onClick={() => setShiftOverride(shift - 1)}
                className="size-9 rounded-xl bg-paper-2 font-display text-lg font-extrabold text-ink shadow-[0_3px_0_var(--line)] transition-transform active:translate-y-0.5"
              >
                −
              </button>
              <span className="w-9 text-center font-mono text-sm font-extrabold text-ink">
                {shift > 0 ? `+${shift}` : shift}
              </span>
              <button
                onClick={() => setShiftOverride(shift + 1)}
                className="size-9 rounded-xl bg-paper-2 font-display text-lg font-extrabold text-ink shadow-[0_3px_0_var(--line)] transition-transform active:translate-y-0.5"
              >
                +
              </button>
              {shiftOverride !== null && (
                <button
                  onClick={() => setShiftOverride(null)}
                  className="text-xs font-bold text-rose-deep underline"
                >
                  auto ({autoShift > 0 ? `+${autoShift}` : autoShift})
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-ink">Andamento</span>
              <input
                type="range"
                min={40}
                max={240}
                value={bpm}
                onChange={(e) => setBpm(Number(e.target.value))}
              />
              <span className="w-16 font-mono text-sm font-bold text-ink-soft">{bpm} bpm</span>
            </div>

            <label className="flex items-center gap-1.5 text-sm font-bold text-ink">
              <input type="checkbox" checked={sound} onChange={(e) => setSound(e.target.checked)} />
              Som
            </label>

            <label className="flex items-center gap-1.5 text-sm font-bold text-ink">
              <input
                type="checkbox"
                checked={metronome}
                onChange={(e) => setMetronome(e.target.checked)}
              />
              Metrônomo
            </label>

            <div className="ml-auto flex gap-2.5">
              <button
                onClick={() => {
                  if (finished) {
                    setCursor(0);
                    setPlaying(true);
                    return;
                  }
                  setPlaying((p) => !p);
                }}
                style={roseBtn}
                className="rounded-2xl px-6 py-2.5 text-sm font-extrabold transition-transform active:translate-y-0.5"
              >
                {playing && !finished ? "❚❚ Pausar" : "▶ Tocar"}
              </button>
              <button
                onClick={() => {
                  setPlaying(false);
                  setCursor(0);
                }}
                className="rounded-2xl border-2 border-line bg-paper px-4 py-2.5 text-sm font-bold text-ink shadow-[0_3px_0_var(--line)] transition-transform active:translate-y-0.5"
              >
                Reiniciar
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/60 shadow-[inset_0_1px_3px_rgba(150,70,110,0.15)]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-rose to-[#f79ac0] transition-[width] duration-100"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <Keyboard active={activeKeys} />
          </div>

          <div
            className="relative rounded-[20px] px-5 pt-7 pb-4 shadow-[0_18px_40px_-20px_rgba(150,70,110,0.42)]"
            style={sheetBg}
          >
            <div aria-hidden className="absolute inset-x-6 top-2.5 flex justify-between">
              {Array.from({ length: 10 }).map((_, i) => (
                <span
                  key={i}
                  className="size-3 rounded-full bg-desk-2 shadow-[inset_0_2px_3px_rgba(150,70,110,0.4)]"
                />
              ))}
            </div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-lg font-extrabold text-ink">
                {hasLyrics ? "Letra e teclas" : "Sequência de teclas"}
              </h3>
              <button
                onClick={copyKeys}
                className="rounded-full bg-rose-soft px-3 py-1.5 text-xs font-bold text-rose-deep transition-colors hover:brightness-95"
              >
                {copied ? "Copiado!" : "Copiar teclas"}
              </button>
            </div>
            <div className="max-h-96 space-y-1.5 overflow-y-auto">
              {keyLines.map((keys, i) => (
                <div
                  key={i}
                  ref={(el) => {
                    if (i === currentLine) el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
                  }}
                  className={`rounded-xl px-3 py-1.5 transition-colors ${
                    i === currentLine
                      ? "bg-gradient-to-r from-rose/25 to-rose/5 shadow-[inset_3px_0_0_var(--rose)]"
                      : ""
                  }`}
                >
                  {lyrics[i] && (
                    <p
                      className={`text-sm font-bold ${
                        i === currentLine ? "text-rose-deep" : "text-ink-soft"
                      }`}
                    >
                      {lyrics[i]}
                    </p>
                  )}
                  <p className="font-mono text-sm font-bold tracking-[3px] text-ink">{keys}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <footer className="mt-12 text-center text-xs font-semibold text-ink-soft">
        Notas de{" "}
        <a href="https://noobnotes.net" className="font-bold text-rose-deep underline">
          noobnotes.net
        </a>{" "}
        · feito pra tocar no Heartopia
      </footer>
    </main>
  );
}

const STAR_CLIP =
  "polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)";

const STARS = [
  { pos: { top: "60px", left: "5%" }, size: 26, color: "var(--sun-1)", rot: "rotate(12deg)" },
  { pos: { top: "150px", right: "8%" }, size: 18, color: "var(--lav)", rot: "rotate(-14deg)" },
  { pos: { top: "40px", right: "20%" }, size: 14, color: "var(--mint)", rot: "rotate(0deg)" },
  { pos: { top: "320px", left: "3%" }, size: 20, color: "var(--rose)", rot: "rotate(20deg)" },
  { pos: { top: "260px", right: "4%" }, size: 16, color: "var(--lav-deep)", rot: "rotate(-10deg)" },
];
