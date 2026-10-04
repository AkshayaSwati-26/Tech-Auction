import { useEffect, useMemo, useRef, useState } from "react";
import { Eye, Play, Ban, ArrowRightCircle, Gavel, Plus, Minus } from "lucide-react";
import { useEventStore } from "../../store/eventStore";
import { api, ApiRequestError } from "../../lib/api";
import TeamSelect from "../../components/admin/TeamSelect";
import AudiencePreview from "../../components/admin/AudiencePreview";
import ConfirmDialog from "../../components/shared/ConfirmDialog";
import { getMotif } from "../../lib/motifs";
import type { Lot, PricingMode, TeamWithWallet } from "../../lib/types";
import { formatRupees } from "../../lib/format";

interface Row {
  teamId: string | null;
  amount: string;
}

function emptyRows(n: number): Row[] {
  return Array.from({ length: n }, () => ({ teamId: null, amount: "" }));
}

interface RowValidation {
  teamMissing: boolean;
  amountInvalid: boolean;
  belowStarting: boolean;
  badIncrement: boolean;
  orderViolation: boolean;
  duplicate: boolean;
  insufficientFunds: boolean;
  techLimit: boolean;
  charge: number | null;
  balanceAfter: number | null;
  ok: boolean;
}

export default function AuctionControl() {
  const state = useEventStore((s) => s.state);
  const [rows, setRows] = useState<Row[]>(emptyRows(3));
  const [note, setNote] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const amountRefs = useRef<Array<HTMLInputElement | null>>([]);
  const requestIdRef = useRef<string | null>(null);

  const currentLot = state?.currentLot ?? null;
  const settings = state?.settings;

  useEffect(() => {
    if (!currentLot || !settings) return;
    const n = Math.max(1, Math.min(settings.winners_per_lot, currentLot.quantity_remaining));
    setRows(emptyRows(n));
    setNote("");
    requestIdRef.current = null;
  }, [currentLot?.id]);

  if (!state) return null;
  const { lots, teams } = state;
  if (!settings) return null;

  const pendingLots = lots.filter((l) => l.quantity_remaining > 0 || l.status === "partially_sold");
  const pricingMode: PricingMode = (currentLot?.pricing_mode ?? settings.pricing_mode) as PricingMode;

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function teamOf(id: string | null): TeamWithWallet | null {
    return teams.find((t) => t.id === id) ?? null;
  }

  // Mirrors the server's validation so operators see problems before submitting.
  function validateRows(currentRows: Row[], lot: Lot): RowValidation[] {
    const filledAmounts = currentRows
      .filter((r) => r.teamId && Number.isInteger(Number(r.amount)) && Number(r.amount) > 0)
      .map((r) => Number(r.amount));
    const uniformCharge = filledAmounts.length ? Math.min(...filledAmounts) : null;

    const seenTeams = new Map<string, number>();
    currentRows.forEach((r, i) => {
      if (r.teamId) seenTeams.set(r.teamId, (seenTeams.get(r.teamId) ?? 0) + 1);
    });

    let previousAmount = Infinity;
    return currentRows.map((row) => {
      const teamMissing = !row.teamId;
      const amountNum = Number(row.amount);
      const amountInvalid = row.amount !== "" && (!Number.isInteger(amountNum) || amountNum <= 0);
      const belowStarting = !amountInvalid && row.amount !== "" && amountNum < lot.starting_bid;
      const badIncrement =
        !amountInvalid && !belowStarting && row.amount !== "" && (amountNum - lot.starting_bid) % lot.min_increment !== 0;
      const orderViolation = !amountInvalid && row.amount !== "" && amountNum > previousAmount;
      if (!amountInvalid && row.amount !== "" && !orderViolation) previousAmount = amountNum;
      const duplicate = !!row.teamId && (seenTeams.get(row.teamId) ?? 0) > 1;

      const team = teamOf(row.teamId);
      const charge = pricingMode === "UNIFORM_PRICE" ? uniformCharge : row.amount !== "" && !amountInvalid ? amountNum : null;
      const insufficientFunds = !!team && charge !== null && team.remaining < charge;
      const balanceAfter = team && charge !== null ? team.remaining - charge : null;
      const techLimit = !!team && team.techs >= (settings?.max_tech_per_team ?? 2);

      const ok =
        !teamMissing &&
        !amountInvalid &&
        !belowStarting &&
        !badIncrement &&
        !orderViolation &&
        !duplicate &&
        !insufficientFunds &&
        !techLimit &&
        row.amount !== "";

      return { teamMissing, amountInvalid, belowStarting, badIncrement, orderViolation, duplicate, insufficientFunds, techLimit, charge, balanceAfter, ok };
    });
  }

  const step =
    settings.display_state === "sold" || settings.display_state === "unsold"
      ? 3
      : currentLot?.status === "live"
        ? 2
        : currentLot?.status === "revealed"
          ? 1
          : 0;

  const validations = currentLot ? validateRows(rows, currentLot) : [];
  const allRowsValid = rows.length > 0 && validations.every((v) => v.ok);

  function updateRow(i: number, patch: Partial<Row>) {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }

  function addRow() {
    if (!currentLot) return;
    if (rows.length >= currentLot.quantity_remaining) return;
    setRows((r) => [...r, { teamId: null, amount: "" }]);
  }

  function removeRow(i: number) {
    setRows((r) => (r.length > 1 ? r.filter((_, idx) => idx !== i) : r));
  }

  async function doConfirmResults() {
    if (!currentLot) return;
    setBusy(true);
    setError(null);
    if (!requestIdRef.current) requestIdRef.current = `${currentLot.id}-${Date.now()}`;
    try {
      await api.confirmLotResults(currentLot.id, {
        winners: rows.map((r) => ({ teamId: r.teamId!, amount: Number(r.amount) })),
        note: note.trim() || undefined,
        requestId: requestIdRef.current,
        expectedVersion: settings?.version,
      });
      setConfirmOpen(false);
      setNote("");
      requestIdRef.current = null;
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid max-w-6xl grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
      <div>
        <h3 className="mb-3 font-display text-sm uppercase tracking-wider text-slate-muted">Lot Queue</h3>
        <div className="space-y-2">
          {pendingLots.map((lot) => (
            <LotRow key={lot.id} lot={lot} active={lot.id === currentLot?.id} onReveal={() => run(() => api.revealLot(lot.id))} />
          ))}
          {pendingLots.length === 0 && <p className="text-sm text-slate-muted">All lots have been closed.</p>}
        </div>
        <AudiencePreview />
      </div>

      <div>
        <Stepper step={step} />
        {error && (
          <div className="mb-4 rounded-lg border border-coral/30 bg-coral/10 px-4 py-2 text-sm text-coral">
            {error}
          </div>
        )}

        {!currentLot && (
          <div className="rounded-xl border border-white/10 bg-panel/50 p-8 text-center text-slate-muted">
            Select a lot from the queue and click Reveal to begin.
          </div>
        )}

        {currentLot && (
          <div className="rounded-xl border border-white/[0.08] bg-panel p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-muted">{currentLot.category}</p>
                <h2 className="font-display text-2xl font-bold text-ink">{currentLot.name}</h2>
                <p className="mt-1 text-xs text-slate-muted">
                  Starting bid {formatRupees(currentLot.starting_bid)} · Step {formatRupees(currentLot.min_increment)} ·{" "}
                  {currentLot.quantity_remaining} slot(s) open · {pricingMode === "UNIFORM_PRICE" ? "Uniform price" : "Pay as bid"}
                </p>
              </div>
              <StatusBadge status={currentLot.status} />
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {currentLot.status === "revealed" && (
                <button
                  disabled={busy}
                  onClick={() => run(() => api.startLive(currentLot.id))}
                  className="flex items-center gap-2 rounded-lg btn-violet px-4 py-2 text-sm font-semibold disabled:opacity-50"
                >
                  <Play size={15} /> Start Auction
                </button>
              )}
              {(currentLot.status === "revealed" || currentLot.status === "live") && currentLot.quantity_remaining === currentLot.quantity_total && (
                <button
                  disabled={busy}
                  onClick={() => run(() => api.markUnsold(currentLot.id))}
                  className="flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-slate-muted hover:bg-white/5 disabled:opacity-50"
                >
                  <Ban size={15} /> Mark Unsold
                </button>
              )}
              <button
                disabled={busy}
                onClick={() => run(api.advanceLot)}
                className="flex items-center gap-2 rounded-lg border border-violet-glow/30 px-4 py-2 text-sm font-semibold text-violet-glow hover:bg-violet-glow/10 disabled:opacity-50"
              >
                <ArrowRightCircle size={15} /> Advance to Next Lot
              </button>
            </div>

            {currentLot.status === "live" && (
              <div className="mt-8 border-t border-white/5 pt-6">
                <div className="mb-4 flex items-center justify-between">
                  <h4 className="flex items-center gap-2 font-display text-sm uppercase tracking-wider text-slate-muted">
                    <Gavel size={15} /> Record Results — {rows.length} winner{rows.length > 1 ? "s" : ""}
                  </h4>
                  <div className="flex gap-2">
                    <button
                      onClick={() => removeRow(rows.length - 1)}
                      disabled={rows.length <= 1}
                      className="flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-xs text-slate-muted hover:bg-white/5 disabled:opacity-30"
                    >
                      <Minus size={12} /> Remove row
                    </button>
                    <button
                      onClick={addRow}
                      disabled={rows.length >= currentLot.quantity_remaining}
                      className="flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-xs text-slate-muted hover:bg-white/5 disabled:opacity-30"
                    >
                      <Plus size={12} /> Add result row
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {rows.map((row, i) => {
                    const v = validations[i];
                    return (
                      <div key={i} className="rounded-lg border border-white/5 bg-midnight/40 p-3">
                        <div className="flex items-center gap-3">
                          <SlotBadge slot={i + 1} />
                          <div className="flex-1">
                            <TeamSelect teams={teams} value={row.teamId} onChange={(id) => updateRow(i, { teamId: id })} />
                          </div>
                          <div className="w-36">
                            <input
                              ref={(el) => (amountRefs.current[i] = el)}
                              value={row.amount}
                              onChange={(e) => updateRow(i, { amount: e.target.value })}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  if (i < rows.length - 1) amountRefs.current[i + 1]?.focus();
                                  else if (rows.length < currentLot.quantity_remaining) {
                                    addRow();
                                  }
                                }
                              }}
                              placeholder="Price (₹)"
                              className="w-full rounded-lg border border-white/10 bg-midnight/60 px-3 py-2.5 text-sm outline-none focus:border-live/40"
                            />
                          </div>
                        </div>
                        <RowErrors v={v} />
                      </div>
                    );
                  })}
                </div>

                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Other notable bids (optional, informational only — never financial)"
                  className="mt-4 w-full rounded-lg border border-white/10 bg-midnight/60 px-4 py-2.5 text-sm outline-none placeholder:text-slate-muted focus:border-live/40"
                />

                <button
                  disabled={!allRowsValid}
                  onClick={() => setConfirmOpen(true)}
                  className="btn-gold mt-5 w-full rounded-lg py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40 disabled:grayscale"
                >
                  Confirm {rows.length} Winner{rows.length > 1 ? "s" : ""}
                </button>
              </div>
            )}
          </div>
        )}

      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Confirm Auction Results"
        gold
        busy={busy}
        confirmLabel={`Confirm ${rows.length} Winner${rows.length > 1 ? "s" : ""}`}
        onConfirm={doConfirmResults}
        onCancel={() => setConfirmOpen(false)}
      >
        {currentLot && (
          <div className="space-y-3">
            <p className="text-xs">
              {currentLot.name} · {pricingMode === "UNIFORM_PRICE" ? "Uniform price (everyone pays the lowest winning bid)" : "Pay as bid (each team pays their own bid)"}
            </p>
            <table className="w-full text-xs">
              <thead className="text-slate-muted">
                <tr className="text-left">
                  <th className="pb-1">Slot</th>
                  <th className="pb-1">Team</th>
                  <th className="pb-1">Bid</th>
                  <th className="pb-1">Charged</th>
                  <th className="pb-1">Balance after</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const team = teamOf(row.teamId);
                  const v = validations[i];
                  return (
                    <tr key={i} className={v.insufficientFunds ? "text-coral" : "text-ink"}>
                      <td className="py-0.5">{i + 1}</td>
                      <td className="py-0.5 font-mono">{team?.id}</td>
                      <td className="py-0.5">{row.amount && formatRupees(Number(row.amount))}</td>
                      <td className="py-0.5 font-semibold text-gold-gradient">{v.charge !== null && formatRupees(v.charge)}</td>
                      <td className="py-0.5">{v.balanceAfter !== null && formatRupees(v.balanceAfter)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="text-xs">
              Total moving: <span className="font-semibold text-gold-gradient">{formatRupees(validations.reduce((s, v) => s + (v.charge ?? 0), 0))}</span>
            </p>
            {validations.some((v) => v.insufficientFunds) && (
              <p className="text-coral">One or more teams cannot afford this charge. Fix before confirming.</p>
            )}
          </div>
        )}
      </ConfirmDialog>
    </div>
  );
}

/** Winners are equal: the number only labels the row, it is not a rank. */
function SlotBadge({ slot }: { slot: number }) {
  return (
    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-sm font-semibold tabular-nums text-slate-muted">
      {slot}
    </div>
  );
}

const STEPS = ["Reveal", "Start", "Record", "Next"];

function Stepper({ step }: { step: number }) {
  return (
    <ol className="mb-5 flex items-center gap-2" aria-label="Lot workflow">
      {STEPS.map((label, i) => {
        const state = i < step ? "done" : i === step ? "active" : "todo";
        return (
          <li key={label} className="flex flex-1 items-center gap-2" aria-current={state === "active" ? "step" : undefined}>
            <span
              className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular-nums ${
                state === "active"
                  ? "border-violet bg-violet text-white"
                  : state === "done"
                    ? "border-violet-glow/50 text-violet-glow"
                    : "border-white/10 text-faint"
              }`}
            >
              {i + 1}
            </span>
            <span className={`text-xs uppercase tracking-[0.2em] ${state === "todo" ? "text-faint" : "text-ink"}`}>{label}</span>
            {i < STEPS.length - 1 && <span className={`h-px flex-1 ${i < step ? "bg-violet-glow/50" : "bg-white/10"}`} />}
          </li>
        );
      })}
    </ol>
  );
}

function RowErrors({ v }: { v: RowValidation }) {
  const msgs: string[] = [];
  if (v.amountInvalid) msgs.push("Amount must be a positive whole number");
  if (v.belowStarting) msgs.push("Below the starting bid");
  if (v.badIncrement) msgs.push("Does not land on a valid increment step");
  if (v.orderViolation) msgs.push("Cannot exceed the bid above it");
  if (v.duplicate) msgs.push("This team is already used in another row");
  if (v.insufficientFunds) msgs.push("Team cannot afford this charge");
  if (v.techLimit) msgs.push("Team already owns the maximum number of technologies");
  if (msgs.length === 0) return null;
  return <p className="mt-2 pl-12 text-xs text-coral">{msgs.join(" · ")}</p>;
}

function StatusBadge({ status }: { status: Lot["status"] }) {
  const map: Record<Lot["status"], string> = {
    pending: "bg-white/5 text-slate-muted",
    revealed: "bg-white/5 text-ink",
    live: "bg-live/15 text-live",
    sold: "bg-mint/10 text-mint",
    partially_sold: "bg-violet-glow/10 text-violet-glow",
    unsold: "bg-white/5 text-slate-muted",
  };
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${map[status]}`}>{status.replace("_", " ")}</span>;
}

function LotRow({ lot, active, onReveal }: { lot: Lot; active: boolean; onReveal: () => void }) {
  const motif = getMotif(lot.motif);
  const Icon = motif.icon;
  return (
    <div
      className={`flex items-center justify-between rounded-lg border px-3 py-2.5 ${
        active ? "border-live/40 bg-live/10" : "border-white/5 bg-panel/50"
      }`}
    >
      <div className="flex items-center gap-2">
        <Icon size={15} style={{ color: motif.primary }} />
        <div>
          <div className="text-sm text-ink">{lot.name}</div>
          <div className="text-[10px] uppercase tracking-wider text-slate-muted">
            {lot.quantity_remaining}/{lot.quantity_total} left
          </div>
        </div>
      </div>
      {lot.status === "pending" && (
        <button onClick={onReveal} title="Reveal this lot" className="rounded-md p-1.5 text-slate-muted hover:bg-white/10 hover:text-live">
          <Eye size={15} />
        </button>
      )}
    </div>
  );
}
