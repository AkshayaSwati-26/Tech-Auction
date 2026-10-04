import { useState } from "react";
import { Package, Users, Trophy, Coins, Play, Pause, CheckCircle2 } from "lucide-react";
import { useEventStore } from "../../store/eventStore";
import { api } from "../../lib/api";
import StatCard from "../../components/shared/StatCard";
import FlowControls from "../../components/admin/FlowControls";
import BuildControls from "../../components/admin/BuildControls";
import { formatRupees } from "../../lib/format";

export default function Overview() {
  const state = useEventStore((s) => s.state);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!state) return null;
  const { settings, teams, lots } = state;

  const soldLots = lots.filter((l) => l.quantity_remaining === 0).length;
  const totalSpent = teams.reduce((s, t) => s + t.spent, 0);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">Auction Command Center</h2>
          <p className="text-sm text-slate-muted">Event status: {settings.status}</p>
        </div>
        <div className="flex gap-2">
          {settings.status === "setup" || settings.status === "ready" ? (
            <button
              disabled={busy}
              onClick={() => run(api.startEventFlow)}
              className="flex items-center gap-2 rounded-lg bg-live px-4 py-2 text-sm font-semibold text-midnight shadow-glow disabled:opacity-50"
            >
              <Play size={15} /> Start Event
            </button>
          ) : settings.status === "paused" ? (
            <button
              disabled={busy}
              onClick={() => run(api.resumeEvent)}
              className="flex items-center gap-2 rounded-lg bg-live px-4 py-2 text-sm font-semibold text-midnight shadow-glow disabled:opacity-50"
            >
              <Play size={15} /> Resume
            </button>
          ) : settings.status === "live" ? (
            <button
              disabled={busy}
              onClick={() => run(api.pauseEvent)}
              className="flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-slate-muted hover:bg-white/5 disabled:opacity-50"
            >
              <Pause size={15} /> Pause
            </button>
          ) : null}

          {settings.status !== "completed" && (
            <button
              disabled={busy}
              onClick={() => run(api.completeEvent)}
              className="flex items-center gap-2 rounded-lg border border-violet-glow/40 px-4 py-2 text-sm font-semibold text-violet-glow hover:bg-violet-glow/10 disabled:opacity-50"
            >
              <CheckCircle2 size={15} /> Complete Event
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-coral/30 bg-coral/10 px-4 py-2 text-sm text-coral">
          {error}
        </div>
      )}

      <FlowControls />
      <BuildControls />

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Lots Sold" value={`${soldLots} / ${lots.length}`} icon={<Package size={16} className="text-live" />} />
        <StatCard label="Teams" value={teams.length} icon={<Users size={16} className="text-live" />} />
        <StatCard label="Current Lot" value={state.currentLot?.name ?? "—"} icon={<Trophy size={16} className="text-violet-glow" />} />
        <StatCard label="Total Spent" value={formatRupees(totalSpent)} icon={<Coins size={16} className="text-violet-glow" />} />
      </div>

      <div className="mt-8">
        <h3 className="mb-3 font-display text-sm uppercase tracking-wider text-slate-muted">Recent Result</h3>
        {state.lastResult ? (
          <div className="rounded-xl border border-white/10 bg-panel/70 p-4 text-sm">
            <span className="font-semibold text-ink">{state.lastResult.lot_name}</span> —{" "}
            {state.lastResult.winners.map((w) => (
              <span key={w.sale_id} className="mr-3">
                <span className="font-mono text-live">{w.team_id}</span> for{" "}
                <span className="font-semibold text-gold tabular-nums">{formatRupees(w.amount)}</span>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-muted">No sales recorded yet.</p>
        )}
      </div>
    </div>
  );
}
