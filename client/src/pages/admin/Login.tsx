import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Gavel, Lock } from "lucide-react";
import { api, ApiRequestError, setAdminToken } from "../../lib/api";
import { useEventStore } from "../../store/eventStore";

export default function Login() {
  const navigate = useNavigate();
  const reconnectAdmin = useEventStore((s) => s.reconnectAdmin);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { token } = await api.login(code);
      setAdminToken(token);
      reconnectAdmin();
      navigate("/admin", { replace: true });
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : "Could not reach the server");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-midnight px-6">
      <form onSubmit={submit} className="glass-panel w-full max-w-sm rounded-3xl p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-live/10 text-live">
            <Gavel size={22} />
          </div>
          <h1 className="font-display text-lg font-bold text-chrome-gradient">Organizer Access</h1>
          <p className="mt-1 text-xs text-slate-muted">Enter the access code given for this event.</p>
        </div>

        <label className="relative block">
          <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-muted" />
          <input
            autoFocus
            type="password"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Access code"
            className="w-full rounded-lg border border-white/10 bg-void/60 py-3 pl-10 pr-4 text-sm text-ink outline-none focus:border-live/40"
          />
        </label>

        {error && <p className="mt-3 text-sm text-coral">{error}</p>}

        <button
          type="submit"
          disabled={busy || !code}
          className="btn-violet mt-5 w-full rounded-lg py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Checking…" : "Enter"}
        </button>
      </form>
    </div>
  );
}
