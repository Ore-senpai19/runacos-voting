export function Logo({ size = 56, className = "" }: { size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.png"
      alt="RUNACOS"
      width={size}
      height={size}
      className={`mx-auto ${className}`}
    />
  );
}
