import { useMemo, useState } from "react";
import { Search, ChevronDown } from "lucide-react";
import type { TeamWithWallet } from "../../lib/types";
import { formatRupees } from "../../lib/format";

export default function TeamSelect({
  teams,
  value,
  onChange,
}: {
  teams: TeamWithWallet[];
  value: string | null;
  onChange: (teamId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return teams;
    return teams.filter((t) => t.id.toLowerCase().includes(q) || t.name.toLowerCase().includes(q));
  }, [teams, query]);

  const selected = teams.find((t) => t.id === value) ?? null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-midnight/60 px-4 py-3 text-left text-sm hover:border-live/40"
      >
        {selected ? (
          <span className="flex items-center gap-2">
            <span className="rounded bg-live/10 px-2 py-0.5 font-mono text-xs text-live">
              {selected.id}
            </span>
            <span className="text-ink">{selected.name}</span>
            <span className="text-xs text-slate-muted">· {formatRupees(selected.remaining)} left</span>
          </span>
        ) : (
          <span className="text-slate-muted">Select team…</span>
        )}
        <ChevronDown size={16} className="text-slate-muted" />
      </button>

      {open && (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-lg border border-white/10 bg-panel shadow-glow">
          <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
            <Search size={14} className="text-slate-muted" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search team ID or name…"
              className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-slate-muted"
            />
          </div>
          <div className="max-h-64 overflow-y-auto">
            {filtered.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  onChange(t.id);
                  setOpen(false);
                  setQuery("");
                }}
                className="flex w-full items-center justify-between px-4 py-2 text-left text-sm hover:bg-white/5"
              >
                <span className="flex items-center gap-2">
                  <span className="rounded bg-white/5 px-2 py-0.5 font-mono text-xs text-live">{t.id}</span>
                  <span className="text-ink">{t.name}</span>
                </span>
                <span className="text-xs text-slate-muted">{formatRupees(t.remaining)}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="px-4 py-3 text-sm text-slate-muted">No teams match "{query}"</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
