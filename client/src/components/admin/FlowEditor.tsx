import { useEffect, useState } from "react";
import { ListOrdered } from "lucide-react";
import { useEventStore } from "../../store/eventStore";
import { api } from "../../lib/api";
import type { FlowStep } from "../../lib/types";

const PLACEHOLDERS = ["{startingWallet}", "{winnersPerLot}", "{maxTechPerTeam}", "{pitchSeconds}", "{lotCount}"];
const input = "w-full rounded-lg border border-white/10 bg-panel/60 px-3 py-2.5 text-sm outline-none focus:border-live/40";

/** Settings > Event Flow: the kicker, heading and text of each of the five steps. */
export default function FlowEditor() {
  const flow = useEventStore((s) => s.state?.flow);
  const pitchSeconds = useEventStore((s) => s.state?.settings.pitch_seconds);
  const [steps, setSteps] = useState<FlowStep[] | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const templates = JSON.stringify(flow?.templates ?? null);
  useEffect(() => {
    if (flow?.templates) setSteps(flow.templates.map((s) => ({ ...s })));
  }, [templates]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!steps) return null;

  const set = (i: number, field: keyof FlowStep, value: string) => setSteps((all) => all!.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)));

  async function save() {
    setBusy(true);
    setStatus(null);
    try {
      await api.updateFlowSteps(steps!);
      setStatus("Saved");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4">
      <h3 className="flex items-center gap-2 font-display text-sm uppercase tracking-wider text-slate-muted">
        <ListOrdered size={14} className="text-live" /> Event Flow
      </h3>
      <p className="text-xs text-slate-muted">
        Copy for the five cards shown after the title screen. These placeholders are filled from the live settings: {PLACEHOLDERS.join(" ")}
      </p>

      <label className="block">
        <span className="mb-1 block text-xs text-slate-muted">Pitch time per team (seconds)</span>
        <input
          type="number"
          min={1}
          defaultValue={pitchSeconds}
          onBlur={(e) => Number(e.target.value) > 0 && api.updateSettings({ pitch_seconds: Number(e.target.value) })}
          className="w-32 rounded-lg border border-white/10 bg-panel/60 px-4 py-2.5 text-sm outline-none focus:border-live/40"
        />
      </label>

      {steps.map((s, i) => (
        <div key={i} className="rounded-xl border border-white/[0.08] bg-panel p-4">
          <p className="mb-3 text-xs uppercase tracking-[0.2em] text-slate-muted">Step {String(i + 1).padStart(2, "0")}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs text-slate-muted">Kicker</span>
              <input className={input} value={s.kicker} onChange={(e) => set(i, "kicker", e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-slate-muted">Heading</span>
              <input className={input} value={s.heading} onChange={(e) => set(i, "heading", e.target.value)} />
            </label>
          </div>
          <label className="mt-3 block">
            <span className="mb-1 block text-xs text-slate-muted">Text</span>
            <textarea className={input} rows={2} value={s.text} onChange={(e) => set(i, "text", e.target.value)} />
          </label>
          {flow && <p className="mt-2 text-xs text-slate-muted">On the display now: {flow.steps[i].text}</p>}
        </div>
      ))}

      <div className="flex items-center gap-3">
        <button disabled={busy} onClick={save} className="btn-violet rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-50">
          Save Event Flow text
        </button>
        {status && <span className="text-sm text-slate-muted">{status}</span>}
      </div>
    </section>
  );
}
