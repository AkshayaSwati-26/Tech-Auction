import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Sparkles, Activity, Copy, Radio, Download, LogOut, Check } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useEventStore } from "../../store/eventStore";
import { api, ApiRequestError, getOperatorName, setOperatorName, setAdminToken, downloadAuthenticated } from "../../lib/api";
import ConfirmDialog from "../../components/shared/ConfirmDialog";
import { useQualityStore, type Quality } from "../../store/qualityStore";
import { formatRupees } from "../../lib/format";
import FlowEditor from "../../components/admin/FlowEditor";
import BuildEditor from "../../components/admin/BuildEditor";

interface Diagnostics {
  uptimeSeconds: number;
  databaseKind: string;
  connectedAdmins: number;
  connectedDisplays: number;
  lastEventVersion: number;
  now: string;
}

export default function Settings() {
  const navigate = useNavigate();
  const state = useEventStore((s) => s.state);
  const latencyMs = useEventStore((s) => s.latencyMs);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [operator, setOperator] = useState(getOperatorName());
  const quality = useQualityStore((s) => s.quality);
  const setQuality = useQualityStore((s) => s.setQuality);
  const [diagnostics, setDiagnostics] = useState<Diagnostics | null>(null);
  const [pingSent, setPingSent] = useState(false);
  const [copied, setCopied] = useState(false);

  const displayUrl = `${window.location.origin}/display`;

  useEffect(() => {
    let cancelled = false;
    function poll() {
      api
        .diagnostics()
        .then((d) => !cancelled && setDiagnostics(d))
        .catch(() => {});
    }
    poll();
    const id = setInterval(poll, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  function logout() {
    setAdminToken(null);
    navigate("/admin/login", { replace: true });
  }

  async function sendPing() {
    try {
      await api.pingDisplay();
      setPingSent(true);
      setTimeout(() => setPingSent(false), 2000);
    } catch {
      /* diagnostics panel is best-effort */
    }
  }

  async function copyDisplayUrl() {
    try {
      await navigator.clipboard.writeText(displayUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard API may be unavailable (non-HTTPS, permissions) */
    }
  }

  if (!state) return null;
  const { settings } = state;
  const lotIsLive = state.currentLot?.status === "live";

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      await api.updateSettings(body);
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function doReset() {
    setBusy(true);
    setError(null);
    try {
      await api.resetEvent(confirmText);
      setResetOpen(false);
      setConfirmText("");
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h2 className="font-display text-2xl font-bold">Event Settings</h2>
        {error && <p className="mt-2 text-sm text-coral">{error}</p>}
      </div>

      <section className="space-y-3">
        <h3 className="font-display text-sm uppercase tracking-wider text-slate-muted">Identity</h3>
        <label className="block">
          <span className="mb-1 block text-xs text-slate-muted">Event name</span>
          <input
            defaultValue={settings.event_name}
            onBlur={(e) => patch({ event_name: e.target.value })}
            className="w-full rounded-lg border border-white/10 bg-panel/60 px-4 py-2.5 text-sm outline-none focus:border-live/40"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-slate-muted">Tagline</span>
          <input
            defaultValue={settings.tagline}
            onBlur={(e) => patch({ tagline: e.target.value })}
            className="w-full rounded-lg border border-white/10 bg-panel/60 px-4 py-2.5 text-sm outline-none focus:border-live/40"
          />
        </label>
      </section>

      <section className="space-y-3">
        <h3 className="font-display text-sm uppercase tracking-wider text-slate-muted">Auction Rules</h3>
        <div className="flex gap-2">
          <button
            disabled={busy || lotIsLive}
            onClick={() => patch({ bid_mode: "sale_only" })}
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold disabled:opacity-40 ${
              settings.bid_mode === "sale_only" ? "bg-live/20 text-live" : "border border-white/10 text-slate-muted"
            }`}
          >
            Sale-only mode
          </button>
          <button
            disabled={busy || lotIsLive}
            onClick={() => patch({ bid_mode: "live_tracking" })}
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold disabled:opacity-40 ${
              settings.bid_mode === "live_tracking" ? "bg-violet-glow/20 text-violet-glow" : "border border-white/10 text-slate-muted"
            }`}
          >
            Live bid tracking
          </button>
        </div>
        {lotIsLive && <p className="text-xs text-amber-300">Mode is locked while a lot is live.</p>}
        <p className="text-xs text-slate-muted">
          Starting wallet {formatRupees(settings.starting_wallet)} · Default starting bid {formatRupees(settings.default_starting_bid)} ·
          Price step {formatRupees(settings.default_min_increment)}
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="font-display text-sm uppercase tracking-wider text-slate-muted">Multi-Winner Auction (Top-N)</h3>
        <label className="block">
          <span className="mb-1 block text-xs text-slate-muted">Winners per lot (default, overridable per lot)</span>
          <input
            type="number"
            min={1}
            defaultValue={settings.winners_per_lot}
            onBlur={(e) => patch({ winners_per_lot: Number(e.target.value) })}
            className="w-32 rounded-lg border border-white/10 bg-panel/60 px-4 py-2.5 text-sm outline-none focus:border-live/40"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-slate-muted">Max technologies per team</span>
          <input
            type="number"
            min={1}
            defaultValue={settings.max_tech_per_team}
            onBlur={(e) => patch({ max_tech_per_team: Number(e.target.value) })}
            className="w-32 rounded-lg border border-white/10 bg-panel/60 px-4 py-2.5 text-sm outline-none focus:border-live/40"
          />
        </label>

        <div>
          <span className="mb-1 block text-xs text-slate-muted">Pricing mode</span>
          <div className="flex gap-2">
            <button
              disabled={busy || lotIsLive}
              onClick={() => patch({ pricing_mode: "PAY_AS_BID" })}
              className={`flex-1 rounded-lg py-2.5 text-sm font-semibold disabled:opacity-40 ${
                settings.pricing_mode === "PAY_AS_BID" ? "bg-gold-2/20 text-gold-gradient" : "border border-white/10 text-slate-muted"
              }`}
            >
              Pay as bid
            </button>
            <button
              disabled={busy || lotIsLive}
              onClick={() => patch({ pricing_mode: "UNIFORM_PRICE" })}
              className={`flex-1 rounded-lg py-2.5 text-sm font-semibold disabled:opacity-40 ${
                settings.pricing_mode === "UNIFORM_PRICE" ? "bg-gold-2/20 text-gold-gradient" : "border border-white/10 text-slate-muted"
              }`}
            >
              Uniform price
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-muted">
            Pay as bid: each winner pays their own bid. Uniform price: every winner pays the lowest winning bid in
            the batch (e.g. bids 300/250/200 → everyone pays 200).
          </p>
        </div>

        <label className="flex items-center justify-between rounded-lg border border-white/10 px-4 py-3">
          <span className="text-sm text-ink">Allow fewer winners than the lot's remaining units</span>
          <input
            type="checkbox"
            checked={!!settings.allow_fewer_winners}
            onChange={(e) => patch({ allow_fewer_winners: e.target.checked ? 1 : 0 })}
            className="h-4 w-4"
          />
        </label>
        <label className="flex items-center justify-between rounded-lg border border-white/10 px-4 py-3">
          <span className="text-sm text-ink">Block a team from winning the same technology twice</span>
          <input
            type="checkbox"
            checked={!!settings.block_repeat_winner}
            onChange={(e) => patch({ block_repeat_winner: e.target.checked ? 1 : 0 })}
            className="h-4 w-4"
          />
        </label>
      </section>

      <section className="space-y-3">
        <h3 className="font-display text-sm uppercase tracking-wider text-slate-muted">Operator</h3>
        <p className="text-xs text-slate-muted">Recorded against every sale and audit entry from this browser.</p>
        <div className="flex gap-2">
          <input
            value={operator}
            onChange={(e) => setOperator(e.target.value)}
            className="flex-1 rounded-lg border border-white/10 bg-panel/60 px-4 py-2.5 text-sm outline-none focus:border-live/40"
          />
          <button
            onClick={() => setOperatorName(operator)}
            className="rounded-lg border border-white/10 px-4 py-2.5 text-sm text-slate-muted hover:bg-white/5"
          >
            Save
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="flex items-center gap-2 font-display text-sm uppercase tracking-wider text-slate-muted">
          <Sparkles size={14} className="text-live" /> Display Quality
        </h3>
        <p className="text-xs text-slate-muted">
          Controls the 3D rendering on this browser only (per-device, not shared with other screens). Pick Low if a
          laptop struggles, or if the projector's GPU is weak.
        </p>
        <div className="flex gap-2">
          {(["high", "medium", "low"] as Quality[]).map((q) => (
            <button
              key={q}
              onClick={() => setQuality(q)}
              className={`flex-1 rounded-lg py-2.5 text-sm font-semibold capitalize ${
                quality === q ? "bg-live/20 text-live" : "border border-white/10 text-slate-muted"
              }`}
            >
              {q}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="flex items-center gap-2 font-display text-sm uppercase tracking-wider text-slate-muted">
          <Activity size={14} className="text-live" /> Diagnostics
        </h3>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label="Database" value={diagnostics?.databaseKind ?? "…"} />
          <Stat label="Admins connected" value={diagnostics?.connectedAdmins ?? "…"} />
          <Stat label="Displays connected" value={diagnostics?.connectedDisplays ?? "…"} />
          <Stat label="My latency" value={latencyMs !== null ? `${latencyMs}ms` : "…"} />
          <Stat label="State version" value={diagnostics?.lastEventVersion ?? "…"} />
          <Stat label="Backend uptime" value={diagnostics ? `${Math.floor(diagnostics.uptimeSeconds / 60)}m` : "…"} />
        </div>

        <div className="glass-panel rounded-xl p-4">
          <p className="mb-2 text-xs uppercase tracking-wider text-slate-muted">Audience display URL</p>
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <div className="rounded-lg bg-white p-2">
              <QRCodeSVG value={displayUrl} size={88} />
            </div>
            <div className="flex-1">
              <code className="block break-all rounded-lg border border-white/10 bg-void/60 px-3 py-2 text-xs text-ink">{displayUrl}</code>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  onClick={copyDisplayUrl}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-muted hover:bg-white/5"
                >
                  {copied ? <Check size={13} className="text-mint" /> : <Copy size={13} />}
                  {copied ? "Copied" : "Copy link"}
                </button>
                <button
                  onClick={sendPing}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-muted hover:bg-white/5"
                >
                  <Radio size={13} className={pingSent ? "text-mint" : ""} />
                  {pingSent ? "Ping sent" : "Send test ping to display"}
                </button>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={() => downloadAuthenticated("/event/backup", `tech-auction-backup-${Date.now()}.json`)}
          className="flex w-fit items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-muted hover:bg-white/5"
        >
          <Download size={15} /> Backup Now (full JSON export)
        </button>

        <button onClick={logout} className="flex w-fit items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-muted hover:bg-white/5">
          <LogOut size={15} /> Log out of this device
        </button>
      </section>

      <FlowEditor />

      <BuildEditor />

      <section className="space-y-3 rounded-xl border border-coral/20 bg-coral/5 p-4">
        <h3 className="flex items-center gap-2 font-display text-sm uppercase tracking-wider text-coral">
          <AlertTriangle size={15} /> Danger Zone
        </h3>
        <p className="text-xs text-slate-muted">
          Resets all sales, wallets, and lot inventory to a fresh demo state. This cannot be undone — use it only for
          rehearsal, never during a live event.
        </p>
        <button
          onClick={() => setResetOpen(true)}
          className="rounded-lg border border-coral/40 px-4 py-2 text-sm font-semibold text-coral hover:bg-coral/10"
        >
          Reset Event Data
        </button>
      </section>

      <ConfirmDialog
        open={resetOpen}
        title="Reset Event Data"
        danger
        busy={busy}
        confirmLabel="Reset Everything"
        onConfirm={doReset}
        onCancel={() => setResetOpen(false)}
      >
        <p>This permanently deletes all sales and wallet transactions, and restores every lot to available. Type the phrase below to confirm.</p>
        <p className="font-mono text-xs text-coral">RESET EVENT</p>
        <input
          autoFocus
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          className="mt-2 w-full rounded-lg border border-white/10 bg-midnight/60 px-3 py-2 text-sm text-ink outline-none focus:border-coral/40"
        />
        {error && <p className="pt-1 text-coral">{error}</p>}
      </ConfirmDialog>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="glass-panel rounded-lg px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wider text-slate-muted">{label}</div>
      <div className="mt-0.5 font-display text-sm font-bold text-ink">{value}</div>
    </div>
  );
}
