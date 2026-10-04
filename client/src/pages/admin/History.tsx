import { useEffect, useMemo, useState } from "react";
import { RotateCcw, Check } from "lucide-react";
import { api, ApiRequestError, downloadAuthenticated } from "../../lib/api";
import { useEventStore } from "../../store/eventStore";
import ConfirmDialog from "../../components/shared/ConfirmDialog";
import type { SaleHistoryRow } from "../../lib/types";
import { formatRupees } from "../../lib/format";

interface Batch {
  lotResultId: string | null;
  lotName: string;
  pricingMode: string | null;
  resultStatus: string | null;
  createdAt: string;
  rows: SaleHistoryRow[];
}

export default function History() {
  const [sales, setSales] = useState<SaleHistoryRow[]>([]);
  const [correctingResult, setCorrectingResult] = useState<Batch | null>(null);
  const [correctingRow, setCorrectingRow] = useState<SaleHistoryRow | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastResultId = useEventStore((s) => s.state?.lastResult?.id);

  async function load() {
    try {
      const data = await api.getHistory();
      setSales(data as SaleHistoryRow[]);
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : String(e));
    }
  }

  useEffect(() => {
    load();
  }, [lastResultId]);

  const batches = useMemo<Batch[]>(() => {
    const map = new Map<string, Batch>();
    const order: string[] = [];
    for (const s of sales) {
      const key = s.lot_result_id ?? s.id;
      if (!map.has(key)) {
        map.set(key, {
          lotResultId: s.lot_result_id,
          lotName: s.lot_name,
          pricingMode: s.result_pricing_mode,
          resultStatus: s.result_status,
          createdAt: s.created_at,
          rows: [],
        });
        order.push(key);
      }
      map.get(key)!.rows.push(s);
    }
    for (const b of map.values()) b.rows.sort((a, b2) => (a.rank ?? 0) - (b2.rank ?? 0));
    return order.map((k) => map.get(k)!);
  }, [sales]);

  async function submitResultCorrection() {
    if (!correctingResult?.lotResultId || !reason.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api.correctLotResult(correctingResult.lotResultId, reason.trim());
      setCorrectingResult(null);
      setReason("");
      await load();
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function submitRowCorrection() {
    if (!correctingRow || !reason.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api.correctSale(correctingRow.id, reason.trim());
      setCorrectingRow(null);
      setReason("");
      await load();
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold">Sale History</h2>
        <button
          onClick={() => downloadAuthenticated("/event/export/sales.csv", "sales.csv")}
          className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-muted hover:bg-white/5"
        >
          Export CSV
        </button>
      </div>

      {error && <div className="mt-4 rounded-lg border border-coral/30 bg-coral/10 px-4 py-2 text-sm text-coral">{error}</div>}

      <div className="mt-4 space-y-4">
        {batches.map((b) => (
          <div key={b.lotResultId ?? b.rows[0].id} className={`overflow-hidden rounded-xl border border-white/10 ${b.resultStatus === "corrected" ? "opacity-50" : ""}`}>
            <div className="flex items-center justify-between bg-panel/70 px-4 py-3">
              <div>
                <span className="text-sm font-semibold text-ink">{b.lotName}</span>
                <span className="ml-2 text-xs text-slate-muted">
                  {b.pricingMode === "UNIFORM_PRICE" ? "Uniform price" : "Pay as bid"} · {new Date(b.createdAt).toLocaleTimeString()}
                </span>
                {b.resultStatus === "corrected" && <span className="ml-2 text-xs text-amber-300">(result corrected)</span>}
              </div>
              {b.lotResultId && b.resultStatus === "confirmed" && (
                <button
                  onClick={() => setCorrectingResult(b)}
                  className="flex items-center gap-1 text-xs text-slate-muted hover:text-coral"
                >
                  <RotateCcw size={13} /> Correct entire result
                </button>
              )}
            </div>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-white/5">
                {b.rows.map((row) => (
                  <tr key={row.id} className="hover:bg-white/5">
                    <td className="w-10 px-4 py-2">
                      <Check size={14} className="text-gold" aria-label="Winner" />
                    </td>
                    <td className="px-4 py-2 font-mono text-live">{row.team_id}</td>
                    <td className="px-4 py-2 text-slate-muted">bid {formatRupees(row.bid_amount)}</td>
                    <td className="px-4 py-2 text-ink">charged {formatRupees(row.amount)}</td>
                    <td className="px-4 py-2">
                      {row.status === "corrected" ? (
                        <span className="text-xs text-amber-300">corrected: {row.correction_reason}</span>
                      ) : (
                        <span className="text-xs text-mint">confirmed</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {row.status === "confirmed" && (
                        <button onClick={() => setCorrectingRow(row)} className="text-xs text-slate-muted hover:text-coral">
                          Correct row
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
        {batches.length === 0 && <p className="text-sm text-slate-muted">No sales yet.</p>}
      </div>

      <ConfirmDialog
        open={!!correctingResult}
        title="Correct Entire Result"
        danger
        busy={busy}
        confirmLabel="Correct All Winners"
        onConfirm={submitResultCorrection}
        onCancel={() => setCorrectingResult(null)}
      >
        {correctingResult && (
          <>
            <p>
              This reverses all {correctingResult.rows.length} winner(s) for{" "}
              <span className="font-semibold text-ink">{correctingResult.lotName}</span>, restoring their money and the
              lot's inventory. Original records are kept, not deleted.
            </p>
            <textarea
              autoFocus
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for correction (required)"
              rows={2}
              className="mt-3 w-full rounded-lg border border-white/10 bg-midnight/60 px-3 py-2 text-sm text-ink outline-none focus:border-live/40"
            />
          </>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={!!correctingRow}
        title="Correct This Winner"
        danger
        busy={busy}
        confirmLabel="Correct Row"
        onConfirm={submitRowCorrection}
        onCancel={() => setCorrectingRow(null)}
      >
        {correctingRow && (
          <>
            <p>
              Reverses <span className="font-semibold text-ink">{formatRupees(correctingRow.amount)}</span> back to{" "}
              <span className="font-mono text-live">{correctingRow.team_id}</span> and restores one unit of
              inventory. Other winners in this result are untouched.
            </p>
            <textarea
              autoFocus
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for correction (required)"
              rows={2}
              className="mt-3 w-full rounded-lg border border-white/10 bg-midnight/60 px-3 py-2 text-sm text-ink outline-none focus:border-live/40"
            />
          </>
        )}
      </ConfirmDialog>
    </div>
  );
}
