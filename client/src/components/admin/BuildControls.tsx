import { useEffect, useMemo, useState } from "react";
import { Hammer, Play, FastForward, RotateCcw, ArrowLeftCircle, TimerReset } from "lucide-react";
import { useEventStore } from "../../store/eventStore";
import { api } from "../../lib/api";
import ConfirmDialog from "../shared/ConfirmDialog";

type Pending = "countdown" | "now" | "reset" | null;

/** Operator controls for the Build Phase Start page and the preparation timer. */
export default function BuildControls() {
  const state = useEventStore((s) => s.state);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Pending>(null);
  const [error, setError] = useState<string | null>(null);
  const [, tick] = useState(0);

  const startedAt = state?.build.startedAt ?? null;
  const serverTime = state?.serverTime;
  // Offset between this laptop's clock and the server's, taken when the state arrived.
  const offset = useMemo(() => (serverTime ? Date.parse(serverTime) - Date.now() : 0), [serverTime]);
  useEffect(() => {
    if (!startedAt) return;
    const id = setInterval(() => tick((n) => n + 1), 500);
    return () => clearInterval(id);
  }, [startedAt]);

  if (!state) return null;
  const display = state.settings.display_state;
  if (display !== "summary" && display !== "build_start") return null;

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      setPending(null);
    }
  }

  if (display === "summary") {
    return (
      <section className="mt-6 rounded-xl border border-violet-glow/30 bg-panel p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-muted">The auction summary is on the display</p>
        <button disabled={busy} onClick={() => run(api.proceedToBuild)} className="btn-violet mt-3 flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold disabled:opacity-50">
          <Hammer size={16} /> Proceed to Build Phase
        </button>
        {error && <p className="mt-2 text-sm text-coral">{error}</p>}
      </section>
    );
  }

  const now = Date.now() + offset;
  const total = state.build.prepMinutes * 60_000;
  const remaining = startedAt ? Math.max(0, total - Math.max(0, now - Date.parse(startedAt))) : total;
  const secs = Math.ceil(remaining / 1000);
  const clock = `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;
  const btn = "flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-ink hover:bg-white/5 disabled:opacity-40";

  return (
    <section className="mt-6 rounded-xl border border-violet-glow/30 bg-panel p-5" aria-label="Build phase controls">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-muted">Build Phase is on the display</p>
          <p className="mt-1 font-display text-lg text-ink">
            {startedAt ? "Preparation timer running" : "Timer not started"} · <span className="tabular-nums">{clock}</span> of {state.build.prepMinutes} min
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button disabled={busy || !!startedAt} onClick={() => setPending("countdown")} className="btn-violet flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-40">
          <Play size={15} /> Begin Countdown
        </button>
        <button disabled={busy || !!startedAt} onClick={() => setPending("now")} className={btn}>
          <FastForward size={15} /> Skip countdown, start now
        </button>
        <button disabled={busy} onClick={() => run(api.replayBuild)} className={btn}>
          <RotateCcw size={15} /> Replay animation
        </button>
        <button disabled={busy} onClick={() => run(api.backToSummary)} className={btn}>
          <ArrowLeftCircle size={15} /> Back to Summary
        </button>
        {startedAt && (
          <button disabled={busy} onClick={() => setPending("reset")} className="ml-auto flex items-center gap-2 rounded-lg border border-coral/40 px-4 py-2 text-sm font-semibold text-coral hover:bg-coral/10 disabled:opacity-40">
            <TimerReset size={15} /> Reset timer
          </button>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-coral">{error}</p>}

      <ConfirmDialog
        open={pending === "countdown" || pending === "now"}
        title="Start the preparation timer?"
        busy={busy}
        confirmLabel={pending === "countdown" ? "Begin Countdown" : "Start now"}
        onConfirm={() => run(() => api.startPrepTimer(pending === "countdown"))}
        onCancel={() => setPending(null)}
      >
        <p>
          {pending === "countdown" ? "The display counts 3, 2, 1 and then" : "The display immediately"} starts a {state.build.prepMinutes}-minute timer for every team. The twist marker is at the midpoint.
        </p>
      </ConfirmDialog>
      <ConfirmDialog open={pending === "reset"} title="Reset the preparation timer?" danger busy={busy} confirmLabel="Reset timer" onConfirm={() => run(api.resetPrepTimer)} onCancel={() => setPending(null)}>
        <p>The timer is cleared on every display. Teams lose the running countdown. Use this only if it was started by mistake.</p>
      </ConfirmDialog>
    </section>
  );
}
