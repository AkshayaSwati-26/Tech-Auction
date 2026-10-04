# Deploying TECH AUCTION for a real event (two laptops, over the internet)

This gets `/admin` on one laptop controlling `/display` on another, across the internet, with
organizer login, a real database, and hardened real-time sync. See `PRE_EVENT_CHECKLIST.md`
for the day-of runbook and the **Local fallback** section below if venue internet fails.

**Architecture**: React/Vite frontend on Vercel, Node/Socket.IO backend on Railway or Render
(one instance, always-on — see "Why one instance" below), Postgres via `DATABASE_URL` (Neon,
Supabase, or your host's managed Postgres). SQLite remains the local-dev default; nothing
about the auction logic changes between the two — the same code and test suite run against
both (see `server/src/db/`).

## 1. Database

Pick one: [Neon](https://neon.tech), [Supabase](https://supabase.com), or your host's managed
Postgres (Railway and Render both offer one-click Postgres add-ons).

1. Create a new Postgres database.
2. Copy its connection string (`postgres://user:pass@host/dbname?sslmode=require` — most
   managed providers require `sslmode=require`; `pg` respects it automatically.
   If your provider doesn't append it, add `?sslmode=require` yourself).
3. Keep it handy — it becomes `DATABASE_URL` on the backend in step 2.

## 2. Backend (Railway or Render)

Both auto-detect a Node app from `package.json`. In `server/`:

- **Build command**: `npm install && npm run build`
- **Start command**: `npm start`

Environment variables to set on the backend service:

| Variable | Value |
|---|---|
| `DATABASE_URL` | the Postgres connection string from step 1 |
| `ALLOWED_ORIGINS` | your Vercel URL, e.g. `https://tech-auction.vercel.app` (comma-separate if you also have a custom domain) |
| `ADMIN_ACCESS_CODE` | a code only your organizers know |
| `SESSION_SECRET` | a long random string — `openssl rand -hex 32` |
| `NODE_ENV` | `production` |
| `PORT` | leave unset — Railway/Render inject this automatically |

After deploying, run the seed script **once** against the new database (Railway/Render both
offer a one-off shell/job runner for this; if yours doesn't, run `DATABASE_URL=... npm run
seed` from your own machine — it talks directly to the remote Postgres):

```bash
DATABASE_URL="postgres://..." npm run seed --prefix server
```

Verify it's up: `curl https://your-backend-url/health` → `{"ok":true}`.

### Why one backend instance only

Socket.IO broadcasts (`event:state`, `admin:count`, etc.) are emitted from plain in-process
`io.emit(...)` calls. If you ever ran two backend instances behind a load balancer, a client
connected to instance A would never see a broadcast triggered by a mutation that hit instance
B — you'd need a Socket.IO adapter (Redis pub/sub, typically) to fan broadcasts out across
instances. A single Railway/Render service (the default — don't turn on autoscaling or
multiple replicas) avoids that entirely, and a two-laptop event has no load problem that would
justify it.

## 3. Frontend (Vercel)

Import the repo, set the **root directory** to `client/`. Vercel auto-detects Vite.

Environment variables:

| Variable | Value |
|---|---|
| `VITE_API_URL` | `https://your-backend-url/api` |
| `VITE_SOCKET_URL` | `https://your-backend-url` (no `/api`, no trailing slash) |

`client/vercel.json` is already in the repo — it rewrites every route to `index.html` so
`/admin`, `/display`, `/admin/control`, etc. all work on a hard refresh or direct link, not
just client-side navigation.

Once deployed, go back to the backend and make sure `ALLOWED_ORIGINS` includes the exact
Vercel URL (and any custom domain) — the backend rejects CORS and Socket.IO connections from
any origin not on that list once it's set.

## 4. Verify end to end

1. Open `https://your-frontend/display` on one device.
2. Open `https://your-frontend/admin` on another — you'll hit the access-code screen first.
3. Log in with `ADMIN_ACCESS_CODE`. Reveal a lot, start it, confirm a result.
4. Confirm `/display` updates within ~300ms.
5. Open `/admin` on a third device/browser too — the sidebar should show "2 admins connected"
   (it only appears once more than one admin session is open).

## Authentication: why a Bearer token, not a cookie

The spec allowed either. A cross-site `httpOnly; SameSite=None; Secure` cookie generally still
works for a page calling its *own* separate-origin API (that's not the third-party-embed
pattern browsers are cracking down on) — but it adds real failure modes here: Safari's ITP can
still cap or evict it, some corporate/venue networks strip `Secure`-flagged cookies over
flaky TLS, and debugging "why didn't my cookie get sent" cross-origin during a live event is
exactly the kind of problem you don't want on event day. A Bearer token in `localStorage`,
attached manually via `Authorization: Bearer <token>` on every request and in the Socket.IO
handshake `auth`, has none of that ambiguity — it works identically in dev and prod, and
"is my token present" is a one-line check instead of a browser-cookie-jar mystery.

## 5. Reliability

- **Don't let the backend sleep.** Railway's always-on plans and Render's paid tiers don't
  sleep; Render's *free* tier does (spins down after inactivity) and is **not safe for a live
  event** — the first admin action after a sleep could take 30+ seconds, which reads as a
  dead connection mid-auction. If you're on a free/sleeping tier, set up an external uptime
  ping (e.g. UptimeRobot hitting `/health` every 5 minutes) to keep it warm, or just pay for
  the always-on tier for the event.
- **Backups.** `Admin → Settings → Diagnostics → Backup Now` downloads a full JSON dump
  (teams, lots, sales, wallet transactions, audit log) at any time. Do this before and after
  the event, and periodically during it if you want extra peace of mind.
- **Backend restarts are safe.** Every sale is committed to the database inside one
  transaction before any broadcast goes out (see `AuctionEngine.confirmLotResults`) — a
  restart mid-event loses nothing. Both `/admin` and `/display` auto-reconnect (Socket.IO's
  built-in exponential backoff) and re-fetch full authoritative state on reconnect.

## 6. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Browser console shows a CORS error | The frontend's exact origin isn't in the backend's `ALLOWED_ORIGINS`. Check for trailing slashes / `http` vs `https` mismatches. |
| `/display` shows "Connecting to event…" forever | Check `VITE_SOCKET_URL` is set and has no trailing slash or `/api` suffix. Open the browser devtools Network tab, filter on `socket.io`, confirm the handshake isn't 404ing. |
| Socket.IO falls back to polling / feels laggy on venue Wi-Fi | Some venue networks/proxies block WebSocket upgrades. The client is already configured with `transports: ["websocket", "polling"]`, so it falls back automatically — it'll work, just with slightly higher latency. Nothing to fix unless you control the network. |
| Admin keeps bouncing back to the login screen | The token expired (12h sessions) or `SESSION_SECRET` changed (e.g. a redeploy regenerated it if you didn't set it explicitly) — log in again. If it happens immediately after every login, check the backend's `SESSION_SECRET` is actually set (not using the dev default, which only applies when `NODE_ENV` isn't `production`). |
| Backend "sleeping" / first request very slow | See Reliability above — you're likely on a free tier that sleeps. |
| `/display` stuck on the red "Connection lost" banner | Confirm the backend is actually reachable (`curl .../health`). If it's reachable, hard-refresh the display page — it re-fetches full state via REST on load, independent of the socket. |
| 401 on every admin action right after deploy | `ADMIN_ACCESS_CODE` or `SESSION_SECRET` not set on the backend — check the Railway/Render environment variables tab. |

## 7. Local fallback (venue internet fails)

Everything also runs on one laptop with zero internet, exactly as it did in local development:

```bash
npm run install:all
npm run seed
npm run dev
```

Put both laptops on the same Wi-Fi router or a phone hotspot. Find the organizer laptop's LAN
IP (`ipconfig` on Windows, look for IPv4 Address), then on the **second** laptop open
`http://<that-ip>:5173/display`. No `VITE_API_URL`/`VITE_SOCKET_URL` needed — Vite's dev
server already proxies `/api` and `/socket.io` to the local backend, and `vite.config.ts` is
set to `host: true` so it accepts connections from other devices on the LAN. This is a
complete downgrade path, not a half-working one: identical auction logic, identical UI, just
without internet.
