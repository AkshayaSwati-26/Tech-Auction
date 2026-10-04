import { useState, type ReactNode } from "react";
import { Plus, Lock } from "lucide-react";
import { useEventStore } from "../../store/eventStore";
import { api, ApiRequestError } from "../../lib/api";
import { getMotif, MOTIFS } from "../../lib/motifs";
import type { Lot } from "../../lib/types";
import { formatRupees } from "../../lib/format";

const EMPTY_FORM = {
  name: "",
  category: "",
  description: "",
  limitation: "",
  motif: "generic",
  starting_bid: 1500,
  min_increment: 250,
  quantity_total: 3,
  pricing_mode: null as "PAY_AS_BID" | "UNIFORM_PRICE" | null,
};

export default function Lots() {
  const state = useEventStore((s) => s.state);
  const [editing, setEditing] = useState<Lot | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!state) return null;
  const { lots } = state;

  function startCreate() {
    setForm(EMPTY_FORM);
    setCreating(true);
    setEditing(null);
  }

  function startEdit(lot: Lot) {
    setForm({
      name: lot.name,
      category: lot.category,
      description: lot.description,
      limitation: lot.limitation ?? "",
      motif: lot.motif,
      starting_bid: lot.starting_bid,
      min_increment: lot.min_increment,
      quantity_total: lot.quantity_total,
      pricing_mode: lot.pricing_mode,
    });
    setEditing(lot);
    setCreating(false);
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      if (editing) {
        await api.updateLot(editing.id, form);
      } else {
        await api.createLot(form);
      }
      setEditing(null);
      setCreating(false);
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const locked = editing ? lots.find((l) => l.id === editing.id)?.status !== "pending" : false;

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold">Lot Inventory</h2>
        <button
          onClick={startCreate}
          className="flex items-center gap-2 rounded-lg bg-live px-4 py-2 text-sm font-semibold text-midnight shadow-glow"
        >
          <Plus size={15} /> Add Lot
        </button>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-panel/70 text-left text-xs uppercase tracking-wider text-slate-muted">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Technology</th>
              <th className="px-4 py-3">Starting Bid</th>
              <th className="px-4 py-3">Qty</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {lots.map((lot, idx) => {
              const motif = getMotif(lot.motif);
              const Icon = motif.icon;
              const hasSales = lot.quantity_remaining < lot.quantity_total;
              return (
                <tr key={lot.id} className="hover:bg-white/5">
                  <td className="px-4 py-3 text-slate-muted">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Icon size={15} style={{ color: motif.primary }} />
                      <span className="text-ink">{lot.name}</span>
                      {hasSales && <Lock size={12} className="text-slate-muted" />}
                    </div>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-slate-muted">{formatRupees(lot.starting_bid)}</td>
                  <td className="px-4 py-3 text-slate-muted">
                    {lot.quantity_remaining}/{lot.quantity_total}
                  </td>
                  <td className="px-4 py-3 text-slate-muted">{lot.status}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => startEdit(lot)} className="text-xs text-slate-muted hover:text-live">
                      Edit
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {(editing || creating) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => {
            setEditing(null);
            setCreating(false);
          }}
        >
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-panel p-6 shadow-glow" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg font-bold">{editing ? `Edit ${editing.name}` : "New Lot"}</h3>
            {locked && (
              <p className="mt-1 text-xs text-amber-300">
                This lot has confirmed sales — price and quantity are locked. Use a sale correction instead.
              </p>
            )}

            {error && <p className="mt-2 text-sm text-coral">{error}</p>}

            <div className="mt-4 space-y-3">
              <Field label="Name">
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </Field>
              <Field label="Category">
                <input className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              </Field>
              <Field label="Description">
                <textarea
                  className="input"
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </Field>
              <Field label="Limitation">
                <input className="input" value={form.limitation} onChange={(e) => setForm({ ...form, limitation: e.target.value })} />
              </Field>
              <Field label="Icon">
                <select className="input" value={form.motif} onChange={(e) => setForm({ ...form, motif: e.target.value })}>
                  {Object.entries(MOTIFS).map(([key, m]) => (
                    <option key={key} value={key}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Starting bid">
                  <input
                    disabled={locked}
                    className="input"
                    type="number"
                    value={form.starting_bid}
                    onChange={(e) => setForm({ ...form, starting_bid: Number(e.target.value) })}
                  />
                </Field>
                <Field label="Min increment">
                  <input
                    className="input"
                    type="number"
                    value={form.min_increment}
                    onChange={(e) => setForm({ ...form, min_increment: Number(e.target.value) })}
                  />
                </Field>
                <Field label="Winners (qty)">
                  <input
                    disabled={locked}
                    className="input"
                    type="number"
                    value={form.quantity_total}
                    onChange={(e) => setForm({ ...form, quantity_total: Number(e.target.value) })}
                  />
                </Field>
              </div>
              <Field label="Pricing override">
                <select
                  className="input"
                  value={form.pricing_mode ?? ""}
                  onChange={(e) => setForm({ ...form, pricing_mode: (e.target.value || null) as typeof form.pricing_mode })}
                >
                  <option value="">Use event default</option>
                  <option value="PAY_AS_BID">Pay as bid</option>
                  <option value="UNIFORM_PRICE">Uniform price</option>
                </select>
              </Field>
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => {
                  setEditing(null);
                  setCreating(false);
                }}
                className="rounded-lg px-4 py-2 text-sm text-slate-muted hover:bg-white/5"
              >
                Cancel
              </button>
              <button disabled={busy} onClick={save} className="rounded-lg bg-live px-4 py-2 text-sm font-semibold text-midnight disabled:opacity-50">
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`.input { width: 100%; border-radius: 0.5rem; border: 1px solid rgba(255,255,255,0.1); background: rgba(11,6,24,0.6); padding: 0.5rem 0.75rem; font-size: 0.875rem; outline: none; }
      .input:focus { border-color: rgba(217,70,239,0.4); }
      .input:disabled { opacity: 0.5; }`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-slate-muted">{label}</span>
      {children}
    </label>
  );
}
