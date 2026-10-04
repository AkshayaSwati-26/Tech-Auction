import { useState } from "react";
import { MonitorPlay, ChevronDown, ChevronUp } from "lucide-react";

/**
 * A genuinely live preview of /display — not a re-implementation, an actual iframe of the
 * real page — so it's always exactly in sync. Forces low-quality rendering (?preview=1)
 * so the operator's laptop isn't running two full 3D scenes at once.
 */
export default function AudiencePreview() {
  const [open, setOpen] = useState(true);

  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-white/[0.08] bg-panel">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-ink">
          <MonitorPlay size={15} className="text-live" /> Live display
        </span>
        {open ? <ChevronUp size={16} className="text-slate-muted" /> : <ChevronDown size={16} className="text-slate-muted" />}
      </button>
      {open && (
        <div className="border-t border-white/[0.08] p-3">
          <div className="relative mx-auto aspect-video w-full max-w-md overflow-hidden rounded-lg border border-white/10 bg-midnight">
            <iframe
              src="/display?preview=1"
              title="Audience display preview"
              className="pointer-events-none h-full w-full"
              loading="lazy"
            />
          </div>
        </div>
      )}
    </div>
  );
}
