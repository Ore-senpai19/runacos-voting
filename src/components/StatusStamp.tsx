export function StatusStamp({ status }: { status: "DRAFT" | "LIVE" | "ENDED" }) {
  const cls =
    status === "LIVE" ? "stamp-live" : status === "ENDED" ? "stamp-ended" : "stamp-draft";
  const label = status === "LIVE" ? "Voting Open" : status === "ENDED" ? "Closed" : "Draft";
  return <span className={cls}>{label}</span>;
}
