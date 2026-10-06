"use client";

import { useEffect, useRef } from "react";

const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 3; // shows one above, the selected one, one below

export function WheelPicker({
  value,
  max,
  disabled = false,
  onChange,
  label,
}: {
  value: number;
  max: number; // inclusive, range is 0..max
  disabled?: boolean;
  onChange: (value: number) => void;
  label: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const programmaticScroll = useRef(false);

  const options = Array.from({ length: max + 1 }, (_, i) => i);

  // Keep the wheel's scroll position in sync when value changes from outside
  // (e.g. a preset button), without re-triggering onChange from our own scroll.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const target = value * ITEM_HEIGHT;
    if (Math.abs(el.scrollTop - target) > 1) {
      programmaticScroll.current = true;
      el.scrollTo({ top: target, behavior: "smooth" });
      window.setTimeout(() => {
        programmaticScroll.current = false;
      }, 300);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function handleScroll() {
    if (disabled || programmaticScroll.current) return;
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      const el = containerRef.current;
      if (!el) return;
      const index = Math.round(el.scrollTop / ITEM_HEIGHT);
      const clamped = Math.min(Math.max(index, 0), max);
      if (clamped !== value) onChange(clamped);
      else {
        // snap back exactly even if value didn't change (e.g. overscroll)
        el.scrollTo({ top: clamped * ITEM_HEIGHT, behavior: "smooth" });
      }
    }, 110);
  }

  return (
    <div className="flex flex-col items-center">
      <span className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">{label}</span>
      <div
        className={`relative overflow-hidden rounded-sm border border-line bg-white ${
          disabled ? "opacity-40" : ""
        }`}
        style={{ height: ITEM_HEIGHT * VISIBLE_ITEMS, width: 72 }}
      >
        <div
          className="pointer-events-none absolute left-0 right-0 border-y border-gold/50 bg-gold/5"
          style={{ top: ITEM_HEIGHT, height: ITEM_HEIGHT }}
        />
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="no-scrollbar h-full overflow-y-auto scroll-smooth"
          style={{
            scrollSnapType: "y mandatory",
            paddingTop: ITEM_HEIGHT,
            paddingBottom: ITEM_HEIGHT,
            pointerEvents: disabled ? "none" : "auto",
          }}
        >
          {options.map((n) => (
            <div
              key={n}
              style={{ height: ITEM_HEIGHT, scrollSnapAlign: "center" }}
              className={`flex items-center justify-center font-mono text-xl tabular-nums transition-colors ${
                n === value ? "font-semibold text-ink" : "text-ink-soft/40"
              }`}
            >
              {String(n).padStart(2, "0")}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
