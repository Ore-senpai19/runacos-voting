"use client";

import { WheelPicker } from "@/components/WheelPicker";

const PRESETS = [
  { label: "30 min", minutes: 30 },
  { label: "45 min", minutes: 45 },
  { label: "1 hr", minutes: 60 },
  { label: "1 hr 30", minutes: 90 },
  { label: "2 hr (max)", minutes: 120 },
];

export function DurationPicker({
  minutes,
  onChange,
}: {
  minutes: number;
  onChange: (minutes: number) => void;
}) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const atCap = minutes >= 120;

  function setHours(h: number) {
    const next = Math.min(h * 60 + mins, 120);
    onChange(next);
  }

  function setMinutes(m: number) {
    const next = Math.min(hours * 60 + m, 120);
    onChange(next);
  }

  return (
    <div>
      <div className="flex items-center justify-center gap-3">
        <WheelPicker label="Hours" value={hours} max={2} onChange={setHours} />
        <span className="mt-5 font-mono text-xl text-ink-soft">:</span>
        <WheelPicker
          label="Minutes"
          value={mins}
          max={59}
          disabled={hours === 2}
          onChange={setMinutes}
        />
      </div>
      <p className="mt-2 text-center text-xs text-ink-soft">
        {atCap ? "Capped at the 2 hour maximum." : `${hours > 0 ? `${hours}h ` : ""}${mins}min selected.`}
      </p>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.minutes}
            type="button"
            onClick={() => onChange(p.minutes)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              minutes === p.minutes
                ? "border-ink bg-ink text-paper"
                : "border-line text-ink-soft hover:border-ink-soft"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
