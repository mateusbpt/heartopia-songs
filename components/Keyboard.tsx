import { KEY_ROWS, SOLFEGE } from "@/lib/keyboard";

type KeyCap = {
  key: string;
  degree: number;
  /** Jianpu octave dots: positive above the number, negative below. */
  dots: number;
};

const DISPLAY_ROWS: { id: string; label: string; caps: KeyCap[] }[] = [
  {
    id: "high",
    label: "Aguda",
    caps: [
      ...KEY_ROWS[0].keys.map((key, degree) => ({ key, degree, dots: 1 })),
      { key: "I", degree: 0, dots: 2 },
    ],
  },
  {
    id: "mid",
    label: "Média",
    caps: KEY_ROWS[1].keys.map((key, degree) => ({ key, degree, dots: 0 })),
  },
  {
    id: "low",
    label: "Grave",
    caps: KEY_ROWS[2].keys.map((key, degree) => ({ key, degree, dots: -1 })),
  },
];

function Dots({ count }: { count: number }) {
  return (
    <span className="flex h-1.5 items-center justify-center gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className="size-[3px] rounded-full bg-current opacity-70" />
      ))}
    </span>
  );
}

function Cap({ cap, active }: { cap: KeyCap; active: boolean }) {
  return (
    <div className="flex w-12 shrink-0 flex-col items-center gap-1.5 sm:w-[52px]">
      <div
        className={`flex w-full flex-col items-center rounded-[15px] px-1 pt-1.5 pb-2 transition-all duration-100 ${
          active
            ? "-translate-y-0.5 bg-gradient-to-b from-[#f9a5c1] to-rose text-white shadow-[0_4px_0_0_var(--rose-deep)]"
            : "bg-gradient-to-b from-white to-keycap text-keycap-ink shadow-[0_4px_0_0_var(--keycap-edge)]"
        }`}
      >
        <span className={active ? "text-white" : "text-[#a9758d]"}>
          <Dots count={cap.dots > 0 ? cap.dots : 0} />
        </span>
        <span className="font-display text-lg leading-none font-extrabold">{cap.degree + 1}</span>
        <span
          className={`text-[8.5px] leading-none font-bold tracking-wide ${
            active ? "text-white/90" : "text-[#bd93a8]"
          }`}
        >
          {SOLFEGE[cap.degree]}
        </span>
        <span className={active ? "text-white" : "text-[#a9758d]"}>
          <Dots count={cap.dots < 0 ? -cap.dots : 0} />
        </span>
      </div>
      <span
        className={`rounded-md px-2 py-0.5 text-[11px] font-extrabold transition-colors ${
          active ? "bg-rose-deep text-white" : "bg-keytab text-keytab-ink"
        }`}
      >
        {cap.key}
      </span>
    </div>
  );
}

export default function Keyboard({ active }: { active: ReadonlySet<string> }) {
  return (
    <div className="overflow-x-auto rounded-[22px] bg-gradient-to-b from-wood-1 to-wood-2 p-4 shadow-[0_18px_40px_-20px_rgba(150,70,110,0.42),inset_0_2px_8px_rgba(255,255,255,0.12)] sm:p-5">
      <div className="flex flex-col gap-3">
        {DISPLAY_ROWS.map((row, i) => (
          <div
            key={row.id}
            className="flex items-end gap-1.5 sm:gap-2"
            style={{ marginLeft: i * 22 }}
          >
            <span className="w-12 shrink-0 self-center text-xs font-bold text-white/55">
              {row.label}
            </span>
            {row.caps.map((cap) => (
              <Cap key={cap.key} cap={cap} active={active.has(cap.key)} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
