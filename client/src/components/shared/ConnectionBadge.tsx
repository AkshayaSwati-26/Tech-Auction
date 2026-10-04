import { useEventStore } from "../../store/eventStore";

export default function ConnectionBadge() {
  const connected = useEventStore((s) => s.connected);
  const latencyMs = useEventStore((s) => s.latencyMs);
  const mode = useEventStore((s) => s.mode);

  const label = connected ? "Connected" : "Reconnecting…";

  return (
    <div className="flex items-center gap-2 text-xs font-medium">
      <span
        className={`h-2 w-2 rounded-full ${connected ? "bg-mint shadow-[0_0_8px_2px_rgba(52,211,153,0.6)]" : "bg-coral"}`}
      />
      <span className={connected ? "text-slate-muted" : "text-coral"}>{label}</span>
      {connected && mode === "admin" && latencyMs !== null && (
        <span className="text-slate-muted/70">· {latencyMs}ms</span>
      )}
    </div>
  );
}
