import { useMemo, useState } from "react";
import { Search, Wallet } from "lucide-react";
import { useEventStore } from "../../store/eventStore";
import { api, ApiRequestError, downloadAuthenticated } from "../../lib/api";
import { formatRupees } from "../../lib/format";

export default function Teams() {
  const state = useEventStore((s) => s.state);
  const [query, setQuery] = useState("");
  const [adjustTeam, setAdjustTeam] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [type, setType] = useState<"debit" | "credit">("credit");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!state) return null;
  const { teams } = state;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return teams;
    return teams.filter((t) => t.id.toLowerCase().includes(q) || t.name.toLowerCase().includes(q));
  }, [teams, query]);

  async function submitAdjust() {
    if (!adjustTeam || !reason.trim() || !Number.isInteger(Number(amount)) || Number(amount) <= 0) return;
    setBusy(true);
    setError(null);
    try {
      await api.adjustWallet(adjustTeam, { amount: Number(amount), type, reason: reason.trim() });
      setAdjustTeam(null);
      setAmount("");
      setReason("");
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold">Team Wallets</h2>
        <button
          onClick={() => downloadAuthenticated("/event/export/wallets.csv", "wallets.csv")}
          className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-muted hover:bg-white/5"
        >
          Export CSV
        </button>
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-lg border border-white/10 bg-panel/50 px-3 py-2">
        <Search size={14} className="text-slate-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search team ID or name…"
          className="w-full bg-transparent text-sm outline-none placeholder:text-slate-muted"
        />
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-coral/30 bg-coral/10 px-4 py-2 text-sm text-coral">{error}</div>
      )}

      <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-panel/70 text-left text-xs uppercase tracking-wider text-slate-muted">
            <tr>
              <th className="px-4 py-3">Team</th>
              <th className="px-4 py-3">Initial</th>
              <th className="px-4 py-3">Spent</th>
              <th className="px-4 py-3">Remaining</th>
              <th className="px-4 py-3">Purchases</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map((t) => (
              <tr key={t.id} className="hover:bg-white/5">
                <td className="px-4 py-3">
                  <span className="font-mono text-live">{t.id}</span> <span className="text-ink">{t.name}</span>
                </td>
                <td className="px-4 py-3 tabular-nums text-slate-muted">{formatRupees(t.initial_balance)}</td>
                <td className="px-4 py-3 tabular-nums text-slate-muted">{formatRupees(t.spent)}</td>
                <td className={`px-4 py-3 font-semibold ${t.remaining < 0 ? "text-coral" : "text-ink"}`}>{formatRupees(t.remaining)}</td>
                <td className="px-4 py-3 text-slate-muted">
                  {t.techs} of {state?.settings.max_tech_per_team ?? 2}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => setAdjustTeam(t.id)}
                    className="flex items-center gap-1 text-xs text-slate-muted hover:text-live"
                  >
                    <Wallet size={13} /> Adjust
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {adjustTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setAdjustTeam(null)}>
          <div
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-panel p-6 shadow-glow"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-lg font-bold">Manual Wallet Adjustment — {adjustTeam}</h3>
            <p className="mt-1 text-xs text-slate-muted">Requires a reason. This is recorded in the audit log.</p>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setType("credit")}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold ${type === "credit" ? "bg-mint/20 text-mint" : "border border-white/10 text-slate-muted"}`}
              >
                Credit (+)
              </button>
              <button
                onClick={() => setType("debit")}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold ${type === "debit" ? "bg-coral/20 text-coral" : "border border-white/10 text-slate-muted"}`}
              >
                Debit (−)
              </button>
            </div>

            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount"
              className="mt-4 w-full rounded-lg border border-white/10 bg-midnight/60 px-4 py-2.5 text-sm outline-none focus:border-live/40"
            />
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason (required)"
              className="mt-3 w-full rounded-lg border border-white/10 bg-midnight/60 px-4 py-2.5 text-sm outline-none focus:border-live/40"
              rows={2}
            />

            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setAdjustTeam(null)} className="rounded-lg px-4 py-2 text-sm text-slate-muted hover:bg-white/5">
                Cancel
              </button>
              <button
                disabled={busy}
                onClick={submitAdjust}
                className="rounded-lg bg-live px-4 py-2 text-sm font-semibold text-midnight disabled:opacity-50"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
