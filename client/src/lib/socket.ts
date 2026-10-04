import { io, type Socket } from "socket.io-client";
import { getAdminToken } from "./api";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? ""; // "" = same-origin (local dev via Vite proxy)

let publicSocket: Socket | null = null;
let adminSocket: Socket | null = null;

/** The read-only audience-display connection — no auth, receives sanitized state only. */
export function getPublicSocket(): Socket {
  if (!publicSocket) {
    publicSocket = io(`${SOCKET_URL}/public`, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
    });
  }
  return publicSocket;
}

/** The organizer connection — sends the admin session token in the handshake; the server
    rejects the connection outright if it's missing or invalid. */
export function getAdminSocket(): Socket {
  if (!adminSocket) {
    // `auth` as a function is re-invoked on every (re)connection attempt, so a fresh
    // login's token is always picked up without needing to touch this socket directly.
    adminSocket = io(`${SOCKET_URL}/admin`, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      auth: (cb) => cb({ token: getAdminToken() }),
    });
  }
  return adminSocket;
}

export function disconnectAdminSocket() {
  adminSocket?.disconnect();
  adminSocket = null;
}

/** Forces an immediate (re)connect attempt with whatever token is in storage right now —
    used right after login instead of waiting for the default reconnection backoff. */
export function reconnectAdminSocket() {
  const socket = getAdminSocket();
  if (!socket.connected) socket.connect();
}
