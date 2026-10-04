import { create } from "zustand";
import { api, ApiRequestError } from "../lib/api";
import { getPublicSocket, getAdminSocket, reconnectAdminSocket } from "../lib/socket";
import type { FullState } from "../lib/types";

export type EventStoreMode = "public" | "admin";

interface EventStoreState {
  state: FullState | null;
  connected: boolean;
  unauthorized: boolean;
  latencyMs: number | null;
  adminCount: number | null;
  error: string | null;
  mode: EventStoreMode | null;
  init: (mode: EventStoreMode) => void;
  /** Tears down the admin socket and refetches as a fresh connection — used right after login. */
  reconnectAdmin: () => void;
}

let initializedMode: EventStoreMode | null = null;
let latencyTimer: ReturnType<typeof setInterval> | null = null;

function startLatencyProbe(set: (partial: Partial<EventStoreState>) => void) {
  const socket = getAdminSocket();
  if (latencyTimer) clearInterval(latencyTimer);
  const ping = () => socket.emit("latency:ping", Date.now());
  socket.off("latency:pong");
  socket.on("latency:pong", (sentAt: number) => set({ latencyMs: Date.now() - sentAt }));
  socket.on("connect", ping);
  latencyTimer = setInterval(ping, 5000);
  ping();
}

export const useEventStore = create<EventStoreState>((set, get) => ({
  state: null,
  connected: false,
  unauthorized: false,
  latencyMs: null,
  adminCount: null,
  error: null,
  mode: null,

  init: (mode) => {
    if (initializedMode === mode) return;
    initializedMode = mode;
    set({ mode });

    if (mode === "public") {
      api
        .getState()
        .then((data) => set({ state: data as FullState }))
        .catch((err) => set({ error: String(err) }));

      const socket = getPublicSocket();
      socket.on("connect", () => set({ connected: true }));
      socket.on("disconnect", () => set({ connected: false }));
      socket.on("event:state", (data: FullState) => set({ state: data }));

      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          api.getState().then((data) => set({ state: data as FullState })).catch(() => {});
        }
      });
      return;
    }

    // mode === "admin"
    const fetchFullState = () =>
      api
        .getAdminState()
        .then((data) => set({ state: data as FullState, unauthorized: false }))
        .catch((err) => {
          if (err instanceof ApiRequestError && err.code === "UNAUTHORIZED") set({ unauthorized: true });
          else set({ error: String(err) });
        });

    fetchFullState();

    const socket = getAdminSocket();
    socket.on("connect", () => set({ connected: true, unauthorized: false }));
    socket.on("connect_error", (err) => {
      set({ connected: false });
      if (err.message === "UNAUTHORIZED") set({ unauthorized: true });
    });
    socket.on("disconnect", () => set({ connected: false }));
    socket.on("event:state", (data: FullState) => set({ state: data }));
    socket.on("admin:count", (payload: { count: number }) => set({ adminCount: payload.count }));

    startLatencyProbe(set);

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") fetchFullState();
    });
  },

  reconnectAdmin: () => {
    initializedMode = null;
    set({ unauthorized: false, state: null });
    reconnectAdminSocket();
    get().init("admin");
  },
}));
