const STEPS = ["Unlock", "Vote", "Review", "Done"] as const;

export function VoteStepper({ current }: { current: number }) {
  return (
    <div className="mx-auto mb-8 flex max-w-md items-center justify-between">
      {STEPS.map((step, i) => {
        const index = i + 1;
        const state = index < current ? "done" : index === current ? "active" : "upcoming";
        return (
          <div key={step} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full border-2 font-mono text-xs transition-colors ${
                  state === "done"
                    ? "border-confirm bg-confirm text-paper"
                    : state === "active"
                      ? "border-ink bg-ink text-paper"
                      : "border-line text-ink-soft"
                }`}
              >
                {state === "done" ? "✓" : index}
              </div>
              <span
                className={`text-[10px] uppercase tracking-wide ${
                  state === "upcoming" ? "text-ink-soft/60" : "text-ink-soft"
                }`}
              >
                {step}
              </span>
            </div>
            {index < STEPS.length && (
              <div
                className={`mx-2 mb-4 h-px flex-1 ${index < current ? "bg-confirm" : "bg-line"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
