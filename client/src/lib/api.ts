const BASE = import.meta.env.VITE_API_URL ?? "/api";
const TOKEN_KEY = "tech-auction-admin-token";

export class ApiRequestError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

function operatorName(): string {
  try {
    return localStorage.getItem("tech-auction-operator") || "operator";
  } catch {
    return "operator";
  }
}

export function getAdminToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAdminToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* private browsing / blocked storage — session just won't persist across reloads */
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAdminToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-operator-name": operatorName(),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  const body = await res.json();
  if (!res.ok || body.ok === false) {
    if (res.status === 401) setAdminToken(null);
    throw new ApiRequestError(body.code ?? "UNKNOWN", body.error ?? "Request failed");
  }
  return body.data as T;
}

export const api = {
  login: (accessCode: string) => request<{ token: string }>("/auth/login", { method: "POST", body: JSON.stringify({ accessCode }) }),

  // Public: what the audience display fetches on load (sanitized, no auth).
  getState: () => request("/event/state"),
  // Admin-only: the full, unsanitized state (operator names, etc.) for the organizer console's initial load.
  getAdminState: () => request("/event/admin-state"),

  updateSettings: (patch: Record<string, unknown>) =>
    request("/event/settings", { method: "PATCH", body: JSON.stringify(patch) }),
  startEvent: () => request("/event/start", { method: "POST" }),
  pauseEvent: () => request("/event/pause", { method: "POST" }),
  resumeEvent: () => request("/event/resume", { method: "POST" }),
  completeEvent: () => request("/event/complete", { method: "POST" }),
  proceedToBuild: () => request("/event/build/proceed", { method: "POST" }),
  backToSummary: () => request("/event/build/back", { method: "POST" }),
  replayBuild: () => request("/event/build/replay", { method: "POST" }),
  startPrepTimer: (countdown: boolean) => request("/event/build/start-timer", { method: "POST", body: JSON.stringify({ countdown }) }),
  resetPrepTimer: () => request("/event/build/reset-timer", { method: "POST" }),
  updateBuildText: (text: { kicker: string; headline: string; tagline: string; message: string }) =>
    request("/event/build/text", { method: "PUT", body: JSON.stringify(text) }),
  startEventFlow: () => request("/event/flow/start", { method: "POST" }),
  setFlowStep: (step: number) => request("/event/flow/step", { method: "POST", body: JSON.stringify({ step }) }),
  replayFlow: () => request("/event/flow/replay", { method: "POST" }),
  continueFromFlow: () => request("/event/flow/continue", { method: "POST" }),
  updateFlowSteps: (steps: Array<{ kicker: string; heading: string; text: string }>) =>
    request("/event/flow/steps", { method: "PUT", body: JSON.stringify({ steps }) }),
  getAudit: () => request("/event/audit"),
  resetEvent: (confirm: string) => request("/event/reset", { method: "POST", body: JSON.stringify({ confirm }) }),
  diagnostics: () =>
    request<{
      uptimeSeconds: number;
      databaseKind: string;
      connectedAdmins: number;
      connectedDisplays: number;
      lastEventVersion: number;
      now: string;
    }>("/event/diagnostics"),
  pingDisplay: () => request("/event/ping-display", { method: "POST" }),

  listTeams: () => request("/teams"),
  getTeam: (id: string) => request(`/teams/${id}`),
  adjustWallet: (id: string, body: { amount: number; type: "debit" | "credit"; reason: string }) =>
    request(`/teams/${id}/adjust`, { method: "POST", body: JSON.stringify(body) }),

  listLots: () => request("/lots"),
  createLot: (body: Record<string, unknown>) => request("/lots", { method: "POST", body: JSON.stringify(body) }),
  updateLot: (id: string, body: Record<string, unknown>) =>
    request(`/lots/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  revealLot: (id: string) => request(`/lots/${id}/reveal`, { method: "POST" }),
  startLive: (id: string) => request(`/lots/${id}/start-live`, { method: "POST" }),
  markUnsold: (id: string) => request(`/lots/${id}/unsold`, { method: "POST" }),
  recordBid: (id: string, teamId: string, amount: number) =>
    request(`/lots/${id}/bid`, { method: "POST", body: JSON.stringify({ teamId, amount }) }),
  advanceLot: () => request("/lots/advance", { method: "POST" }),

  confirmLotResults: (
    lotId: string,
    body: { winners: Array<{ teamId: string; amount: number }>; note?: string; requestId?: string; expectedVersion?: number }
  ) => request(`/lots/${lotId}/results`, { method: "POST", body: JSON.stringify(body) }),

  getHistory: () => request("/sales"),
  correctSale: (id: string, reason: string) =>
    request(`/sales/${id}/correct`, { method: "POST", body: JSON.stringify({ reason }) }),
  correctLotResult: (id: string, reason: string) =>
    request(`/lot-results/${id}/correct`, { method: "POST", body: JSON.stringify({ reason }) }),
};

/** Every export/backup endpoint requires the admin Bearer token, so a plain <a href> download
    won't work — this fetches authenticated, then triggers a save via a throwaway object URL. */
export async function downloadAuthenticated(path: string, filename: string) {
  const token = getAdminToken();
  const res = await fetch(`${BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiRequestError(body.code ?? "UNKNOWN", body.error ?? "Download failed");
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function setOperatorName(name: string) {
  try {
    localStorage.setItem("tech-auction-operator", name);
  } catch {
    /* ignore storage failures (private browsing, etc.) */
  }
}

export function getOperatorName(): string {
  return operatorName();
}
