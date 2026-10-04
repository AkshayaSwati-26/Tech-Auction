import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, RotateCcw, ArrowRightCircle, ListOrdered } from "lucide-react";
import { useEventStore } from "../../store/eventStore";
import { api } from "../../lib/api";

const AUTO_MS = 6000;

/** Operator pacing for the Event Flow page: spotlight a step, replay, or continue to the auction. */
export default function FlowControls() {
  const state = useEventStore((s) => s.state);
  const [busy, setBusy] = useState(false);
  const [auto, setAuto] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFlow = state?.settings.display_state === "event_flow";
  const step = state?.flow.step ?? 0;
  const total = state?.flow.steps.length ?? 5;

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
  const go = (to: number) => run(() => api.setFlowStep(Math.max(0, Math.min(total, to))));

  // Arrow keys step through the cards, but never while the operator is typing.
  useEffect(() => {
    if (!onFlow) return;
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      if (el && (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement || (el as HTMLElement).isContentEditable)) return;
      if (e.key === "ArrowRight") go(step + 1);
      if (e.key === "ArrowLeft") go(step - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onFlow, step, total]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!onFlow || !auto) return;
    const id = setInterval(() => {
      const current = useEventStore.getState().state?.flow.step ?? 0;
      if (current >= total) setAuto(false);
      else void api.setFlowStep(current + 1).catch(() => setAuto(false));
    }, AUTO_MS);
    return () => clearInterval(id);
  }, [onFlow, auto, total]);

  useEffect(() => {
    if (!onFlow) setAuto(false);
  }, [onFlow]);

  if (!state) return null;

  if (!onFlow) {
    return (
      <button
        disabled={busy}
        onClick={() => run(api.startEventFlow)}
        className="mt-4 flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-slate-muted hover:bg-white/5 disabled:opacity-50"
      >
        <ListOrdered size={15} /> Show Event Flow on the display
      </button>
    );
  }

  const btn = "flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-ink hover:bg-white/5 disabled:opacity-40";
  return (
    <section className="mt-6 rounded-xl border border-violet-glow/30 bg-panel p-5" aria-label="Event Flow controls">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-muted">Event Flow is on the display</p>
          <p className="mt-1 font-display text-lg text-ink">
            {step === 0 ? "Overview (no card spotlighted)" : `Step ${step} of ${total}: ${state.flow.steps[step - 1].heading}`}
          </p>
        </div>
        <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm text-slate-muted">
          <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} className="h-4 w-4 accent-violet-500" />
          Auto-play (every 6s)
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button disabled={busy || step <= 0} onClick={() => go(step - 1)} className={btn}>
          <ChevronLeft size={16} /> Previous step
        </button>
        <button disabled={busy || step >= total} onClick={() => go(step + 1)} className="btn-violet flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-40">
          Next step <ChevronRight size={16} />
        </button>
        <button disabled={busy} onClick={() => run(api.replayFlow)} className={btn}>
          <RotateCcw size={15} /> Replay animation
        </button>
        <button disabled={busy} onClick={() => run(api.continueFromFlow)} className="ml-auto flex items-center gap-2 rounded-lg bg-paper px-4 py-2 text-sm font-semibold text-midnight disabled:opacity-40">
          Continue to Auction <ArrowRightCircle size={16} />
        </button>
      </div>
      <p className="mt-3 text-xs text-slate-muted">Left and right arrow keys also step through the cards.</p>
      {error && <p className="mt-2 text-sm text-coral">{error}</p>}
    </section>
  );
}
