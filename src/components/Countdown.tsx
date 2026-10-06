"use client";

import { useEffect, useState } from "react";

export function Countdown({ endTime, onExpire }: { endTime: string; onExpire?: () => void }) {
  const [remaining, setRemaining] = useState<number>(() => new Date(endTime).getTime() - Date.now());

  useEffect(() => {
    const id = setInterval(() => {
      const next = new Date(endTime).getTime() - Date.now();
      setRemaining(next);
      if (next <= 0) {
        clearInterval(id);
        onExpire?.();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [endTime, onExpire]);

  const clamped = Math.max(0, remaining);
  const totalSeconds = Math.floor(clamped / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");

  const low = clamped < 5 * 60 * 1000;

  return (
    <span className={`font-mono text-sm ${low ? "text-danger" : "text-ink-soft"}`}>
      {h > 0 ? `${pad(h)}:` : ""}
      {pad(m)}:{pad(s)} left
    </span>
  );
}
