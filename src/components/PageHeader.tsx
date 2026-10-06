import { Logo } from "@/components/Logo";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-10 flex items-start justify-between gap-4 border-b border-line pb-6">
      <div>
        <div className="flex items-center gap-2">
          <Logo size={28} className="mx-0" />
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold-dark">RUNACOS</p>
        </div>
        <h1 className="mt-2 text-2xl font-semibold italic">{title}</h1>
        {subtitle && <div className="mt-1 text-sm text-ink-soft">{subtitle}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">{actions}</div>}
    </header>
  );
}
