import type { ReactNode } from "react";

export default function StatCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-panel p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-slate-muted">{label}</span>
        {icon}
      </div>
      <div className="mt-2 font-display text-2xl tabular-nums text-ink">{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-muted">{sub}</div>}
    </div>
  );
}
