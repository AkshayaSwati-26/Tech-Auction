import { useEffect, useState } from "react";
import { Hammer } from "lucide-react";
import { useEventStore } from "../../store/eventStore";
import { api } from "../../lib/api";
import type { BuildText } from "../../lib/types";

const FIELDS: Array<{ key: keyof BuildText; label: string }> = [
  { key: "kicker", label: "Kicker" },
  { key: "headline", label: "Headline" },
  { key: "tagline", label: "Tagline" },
  { key: "message", label: "Message" },
];
const input = "w-full rounded-lg border border-white/10 bg-panel/60 px-3 py-2.5 text-sm outline-none focus:border-live/40";

/** Settings > Build Phase: preparation time and the text on the Build Start page. */
export default function BuildEditor() {
  const build = useEventStore((s) => s.state?.build);
  const [text, setText] = useState<BuildText | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const saved = JSON.stringify(build?.text ?? null);
  useEffect(() => {
    if (build?.text) setText({ ...build.text });
  }, [saved]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!build || !text) return null;

  async function save() {
    setBusy(true);
    setStatus(null);
    try {
      await api.updateBuildText(text!);
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
        <Hammer size={14} className="text-live" /> Build Phase
      </h3>
      <label className="block">
        <span className="mb-1 block text-xs text-slate-muted">Preparation time (minutes). The twist marker sits at the midpoint.</span>
        <input
          type="number"
          min={1}
          defaultValue={build.prepMinutes}
          disabled={!!build.startedAt}
          onBlur={(e) => Number(e.target.value) > 0 && api.updateSettings({ prep_minutes: Number(e.target.value) })}
          className="w-32 rounded-lg border border-white/10 bg-panel/60 px-4 py-2.5 text-sm outline-none focus:border-live/40 disabled:opacity-50"
        />
        {build.startedAt && <span className="ml-3 text-xs text-slate-muted">Locked while the timer is running.</span>}
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <label key={f.key} className="block">
            <span className="mb-1 block text-xs text-slate-muted">{f.label}</span>
            <input className={input} value={text[f.key]} onChange={(e) => setText({ ...text, [f.key]: e.target.value })} />
          </label>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button disabled={busy} onClick={save} className="btn-violet rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-50">
          Save Build Phase text
        </button>
        {status && <span className="text-sm text-slate-muted">{status}</span>}
      </div>
    </section>
  );
}
