export function WinnerStamp() {
  return (
    <span
      aria-label="Winner"
      title="Winner"
      className="ml-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-confirm text-confirm"
      style={{ transform: "rotate(-12deg)" }}
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
        <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
