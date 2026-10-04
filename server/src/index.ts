import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { db } from "./db/singleton.js";
import { AuctionEngine } from "./logic/auction.js";
import { verifyAdminToken } from "./auth/token.js";
import { eventRouter } from "./routes/event.js";
import { teamsRouter } from "./routes/teams.js";
import { lotsRouter } from "./routes/lots.js";
import { salesRouter } from "./routes/sales.js";
import { lotResultsRouter } from "./routes/lotResults.js";
import { authRouter } from "./routes/auth.js";
import { errorHandler } from "./routes/helpers.js";

const PORT = Number(process.env.PORT ?? 4000);
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// Local dev (Vite on 5173, proxying /api and /socket.io to this server) needs no
// ALLOWED_ORIGINS entry — same-origin-via-proxy requests don't send a CORS Origin header
// that needs allow-listing. In production, ALLOWED_ORIGINS must list the real frontend URL(s).
function corsOriginCheck(origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) {
  if (!origin) return cb(null, true); // same-origin, curl, health checks, server-to-server
  if (ALLOWED_ORIGINS.length === 0) return cb(null, true); // nothing configured yet (local dev)
  if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
  cb(new Error(`Origin ${origin} is not in ALLOWED_ORIGINS`));
}

const app = express();
app.set("trust proxy", 1); // required behind Railway/Render's reverse proxy for correct IPs (rate limiting)
app.use(cors({ origin: corsOriginCheck }));
app.use(express.json());

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false });
const mutationLimiter = rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: true, legacyHeaders: false });

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: corsOriginCheck },
  // A dropped laptop should read as disconnected within ~10s, not minutes.
  pingInterval: 4000,
  pingTimeout: 8000,
});

const publicNamespace = io.of("/public");
const adminNamespace = io.of("/admin");

const engine = new AuctionEngine(db, (event, payload) => {
  if (event === "event:state") {
    adminNamespace.emit(event, payload);
    publicNamespace.emit(event, engine.toPublicState(payload as Awaited<ReturnType<typeof engine.getFullState>>));
  } else {
    // Every other broadcast payload in this app is already display-safe (ids, names,
    // the sanitized WinnerView shape) — see auction.test.ts's "no private fields" check.
    adminNamespace.emit(event, payload);
    publicNamespace.emit(event, payload);
  }
});

app.use("/api/auth", loginLimiter, authRouter());
app.use("/api/event", mutationLimiter, eventRouter(engine, io));
app.use("/api/teams", mutationLimiter, teamsRouter(engine));
app.use("/api/lots", mutationLimiter, lotsRouter(engine));
app.use("/api/sales", mutationLimiter, salesRouter(engine));
app.use("/api/lot-results", mutationLimiter, lotResultsRouter(engine));

app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use(errorHandler);

// The public namespace needs no auth — it's the read-only audience display.
publicNamespace.on("connection", async (socket) => {
  socket.emit("event:state", engine.toPublicState(await engine.getFullState()));
});

function broadcastAdminCount() {
  adminNamespace.emit("admin:count", { count: adminNamespace.sockets.size });
}

// Every admin socket connection must present a valid session token in the handshake —
// a display client can never join this namespace, so it can never receive organizer-only
// data or (if mutation-over-socket is ever added later) issue one.
adminNamespace.use((socket, next) => {
  const token = socket.handshake.auth?.token as string | undefined;
  if (!token || !verifyAdminToken(token)) {
    next(new Error("UNAUTHORIZED"));
    return;
  }
  next();
});

adminNamespace.on("connection", async (socket) => {
  socket.emit("event:state", await engine.getFullState());
  broadcastAdminCount();
  socket.on("disconnect", () => broadcastAdminCount());
  // A tiny app-level round trip so the admin UI can show real latency, independent of
  // whatever Socket.IO's own engine-level ping/pong happens to expose in this version.
  socket.on("latency:ping", (sentAt: number) => socket.emit("latency:pong", sentAt));
});

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`TECH AUCTION server listening on http://0.0.0.0:${PORT}`);
  if (ALLOWED_ORIGINS.length === 0) {
    console.warn("ALLOWED_ORIGINS is not set — CORS is wide open. Set it before deploying.");
  }
});
