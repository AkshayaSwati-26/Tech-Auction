# TECH AUCTION

See [STYLE_GUIDE.md](./STYLE_GUIDE.md) for the design tokens, 3D Stage architecture, motion system, quality tiers, and a list of visual deviations from the original spec.

Deploying so `/admin` on one laptop controls `/display` on another, over the internet? See [DEPLOYMENT.md](./DEPLOYMENT.md) (exact steps for Vercel + Railway/Render + Postgres) and [PRE_EVENT_CHECKLIST.md](./PRE_EVENT_CHECKLIST.md) (the day-of runbook).

A real-time, two-screen live auction management platform: a cinematic **audience display** and a private **organizer command center**, both synchronized from one authoritative backend.

Physical bidding stays entirely in the room (paddles + auctioneer). After each lot closes, the operator records the **top-N winners** (not just one) and their final bids; the system handles wallets, inventory, history, and the big-screen experience.

## Stack

- **Client**: React + TypeScript + Vite + Tailwind CSS + Framer Motion + React Three Fiber (Three.js) + Zustand + Socket.IO client
- **Server**: Node.js + TypeScript + Express + Socket.IO + Zod
- **Database**: SQLite via Node's built-in `node:sqlite` by default (zero-setup local dev), or Postgres via `DATABASE_URL` for a real deployment — same schema, same `AuctionEngine` code, same test suite, against either one (see `server/src/db/`). SQLite was originally chosen over `better-sqlite3`/Prisma because this machine has no C++ build toolchain for native modules; `node:sqlite` needs no compilation.

## Requirements

- Node.js 22.5+ (built-in `node:sqlite` support). This repo was built and tested against Node 25.2.1.
- No external services, no internet access required at event time.

## Setup

```bash
npm run install:all   # installs server + client dependencies
npm run seed           # creates the SQLite DB with 21 teams (T01–T21) and 12 sample tech lots
npm run dev             # starts backend (port 4000) and frontend (port 5173) together
```

Open:
- `http://localhost:5173/` — landing page
- `http://localhost:5173/admin` — organizer command center
- `http://localhost:5173/display` — audience display (full-screen this on the projector)

### LAN / second-device audience display

The Vite dev server binds `0.0.0.0` (see `client/vite.config.ts`, `server.host: true`). From the projector laptop, open `http://<organizer-laptop-LAN-ip>:5173/display`. Both laptops must be on the same network; the organizer laptop's firewall may need to allow inbound connections on ports 5173 and 4000.

### Running the tests

```bash
cd server && npm test   # Node's built-in test runner, in-memory SQLite, no network
```

24 tests cover the full multi-winner engine: top-N confirmation, both pricing modes with worked examples, tie handling, duplicate-team/order-violation/insufficient-inventory rejections, atomic all-or-nothing on insufficient funds, whole-result vs. single-row correction, duplicate-submission blocking, restart persistence, the `sale:confirmed` broadcast shape, and the audit trail.

### Resetting demo data

`Admin → Settings → Danger Zone → Reset Event Data` wipes all sales/wallets and restores every lot, after typing the confirmation phrase `RESET EVENT`. Use this only during rehearsal — never mid-event.

## Architecture

```
tech-auction/
  server/            Express + Socket.IO backend (the single source of truth)
    src/db/          dual SQLite/Postgres adapter, schema files, migration, seed script
    src/auth/        admin session tokens (JWT) + the requireAdmin middleware
    src/logic/       AuctionEngine — all business rules & transactional sale logic (async, DB-agnostic)
    src/routes/      REST endpoints (auth, event, teams, lots, sales, lot-results)
    src/logic/auction.test.ts   Node's built-in test runner (`npm test`), covers every rule below —
                                 runs against SQLite by default, Postgres via TEST_DATABASE_URL
  client/
    src/store/       Zustand store subscribed to Socket.IO; `init("public"|"admin")` picks the
                      namespace (sanitized vs. full state) and whether a session token is sent
    src/pages/       Landing, Display (audience), Admin/* (organizer console, gated by Login.tsx)
    src/components/  display screens (opening/reveal/live/sold/unsold/summary),
                      admin controls, shared UI
```

Every mutation goes through the REST API (requiring an admin session, except the one public, sanitized `GET /api/event/state` that `/display` uses); the backend validates it inside one DB transaction and then broadcasts to two Socket.IO namespaces — `/public` (sanitized, no auth — the audience display) and `/admin` (full state, requires the session token in the handshake). Both the admin console and the audience display render from that one broadcast, so there's never a separate wallet calculation on each screen. See [DEPLOYMENT.md](./DEPLOYMENT.md) for the full auth/CORS/real-time-sync hardening story.

## Event Flow page

After the title screen, **Start Event** (Admin → Overview) marks the event live and moves `/display` to the Event Flow page: five cards explaining the run of show. The operator paces it from Admin → Overview with **Previous step / Next step** (or the left and right arrow keys), **Replay animation**, an optional **Auto-play** (one step every 6s), and **Continue to Auction**, which moves to the Ready screen for the first open lot.

- The display state (`event_flow`) and the spotlighted step are stored on the server, so a refreshed or restarted display resumes on the same step.
- The kicker, heading and text of each step are editable in Admin → Event Settings → Event Flow.
- Text may use `{startingWallet}`, `{winnersPerLot}`, `{maxTechPerTeam}`, `{pitchSeconds}` and `{lotCount}`; these are filled from the live settings, so the cards cannot disagree with the rules.
- Endpoints (admin only): `POST /api/event/flow/start`, `POST /api/event/flow/step` `{ step }`, `POST /api/event/flow/replay`, `POST /api/event/flow/continue`, `PUT /api/event/flow/steps` `{ steps }`.

## Build Phase Start page

After the auction summary, **Proceed to Build Phase** (Admin → Overview) moves `/display` to the Build Start page. From there the operator can **Begin Countdown** (3, 2, 1, then the timer starts), **Skip countdown, start now**, **Replay animation**, or go **Back to Summary**. Starting the timer asks for confirmation.

- Starting the timer stores one server timestamp (`prep_started_at`). Every display renders the countdown from it, corrected for clock skew, so refreshes, reconnects and server restarts cannot move the timer. The total is `prep_minutes` (default 23); the twist marker is at the midpoint.
- The timer keeps running if the display moves to another screen and back. **Reset timer** clears it (confirmation required). Starts and resets are audited.
- The kicker, headline, tagline and message are editable in Admin → Event Settings → Build Phase. The chips read `prep_minutes` and `pitch_seconds` from the live settings.
- Endpoints (admin only): `POST /api/event/build/proceed`, `/build/back`, `/build/replay`, `/build/start-timer` `{ countdown }`, `/build/reset-timer`, `PUT /api/event/build/text`.

## Auction rules implemented

> **Core rule:** ₹10,000 → buy up to 2 technologies → the top 3 win each one → all winners pay the same price → solve the challenge using only what you bought.

- 21 teams (T01–T21), **₹10,000** each. Money is whole rupees, stored as integers and shown in the en-IN format (₹10,000).
- 12 technologies, **3 slots each** (36 slots). Starting price **₹1,500**, price step **₹250**, at most **2 technologies per team**. All of these are editable in Settings (and per lot) before the event starts.
- The 12 lots, in order: Smart Sensors, Smart Cameras, Drone Aerial Monitor, Prediction Engine (AI), Edge Processing Unit, Communication Network, Mobile App & Alerts, Public Address & Smart Signage, Automatic Switching & Gate Control, Battery Storage & Backup Power, Command Dashboard, Cybersecurity Shield. Each has a description and a limitation, both shown on the reveal screen.
- `npm run seed` loads these teams and lots. It **refuses to run if the event has any recorded sale**; reset first with Admin → Event Settings → Reset Event (type `RESET EVENT`), then seed again.
- **Sale-only mode** (default): operator enters only the final winning bids. **Live bid tracking mode**: operator can record each accepted bid during the physical auction; the audience display shows the current leader (informational only — never charged). Mode is locked while a lot is live.
- Manual wallet adjustments (credits/debits outside of sales) require a reason and are logged.
- CSV export for sales and wallets (`Admin → Teams/History → Export CSV`).
- Duplicate-submission guard on result confirmation (`requestId`), so a double-click can't double-charge a team.

### Multi-winner ("Top-N") auction model

Each lot has a quantity (`quantity_total`), which is the number of winner slots for that lot — by default `winners_per_lot` = **3**, configurable globally in Settings or per-lot in the Lots editor. After the auctioneer closes a lot, the operator records up to that many winners in one **Record Results** action: a team + final bid per rank, ordered 1st → Nth.

**Validation (all server-side, one atomic transaction — if any row fails, nothing is saved):**
- Every team must exist, and no team can appear twice in the same result.
- Each bid must be ≥ the lot's starting bid and land exactly on a valid increment step: `(bid − starting_bid) % min_increment === 0`.
- Bids must be submitted in non-increasing order (rank 2's bid ≤ rank 1's bid); **ties are allowed**, increases are not.
- Winners submitted must not exceed the lot's remaining units. If `allow_fewer_winners` (default on) is off, you must submit exactly as many winners as units remain.
- If `block_repeat_winner` is on (the seed turns it on), a team that already won this exact lot in an earlier batch is rejected.
- A team that already owns `max_tech_per_team` (default **2**) other technologies is rejected (`TECH_LIMIT_REACHED`). Corrected sales don't count.
- Every winner must be able to afford their charge (see pricing below) — if even one can't, **the entire batch is rejected and nothing is saved or charged**.

**Pricing modes** (`pricing_mode`, global default or per-lot override):
- **UNIFORM_PRICE** (default) — every winner pays the same price: the lowest winning bid in that batch.
  *Example: the price reaches ₹2,250 with three teams left → enter ₹2,250 for each → all three pay ₹2,250 (₹6,750 in total).*
  *Example: bids ₹2,500 / ₹2,250 / ₹2,000 → all three pay ₹2,000.*
- **PAY_AS_BID** — each winner pays exactly their own bid.
  *Example: bids ₹2,500 / ₹2,250 / ₹2,000 → winners pay ₹2,500, ₹2,250 and ₹2,000.*

Non-winning teams are never touched — no ledger entry, no balance change — and the operator can attach an optional free-text note ("other notable bids") that is purely informational and never affects any wallet.

**Corrections** come in two forms, both requiring a reason and both auditable (originals are kept, never deleted):
- **Whole-result correction** (`POST /api/lot-results/:id/correct`) — reverses every winner in that batch: restores all their money and the full inventory count, marks the whole result `corrected`.
- **Single-row correction** (`POST /api/sales/:id/correct`, unchanged from before) — reverses just one winner's charge and restores one unit of inventory, leaving the rest of that batch untouched.

### API surface added for multi-winner

- `POST /api/lots/:id/results` — body `{ winners: [{ teamId, amount }, ...], note?, requestId? }`, returns the confirmed `LotResultView` (grouped winners with rank, bid, and charged amount).
- `POST /api/lot-results/:id/correct` — body `{ reason }`, reverses an entire result.
- `GET /api/lot-results/:id` — fetch one result with its winners.
- The old single-winner `POST /api/sales` endpoint was **removed** — a single winner is just a one-row call to `/results` now, so there's one code path instead of two.
- `sale:confirmed` (Socket.IO) now broadcasts `{ lotResultId, lotId, lotName, pricingMode, winners: [...] }` — the full ordered winners array, operator name omitted (display-safe).

### Migration note

This project has no ORM (see the `node:sqlite` decision above), so "the migration" is an idempotent bootstrap step in `server/src/db/index.ts`: on every startup it checks `PRAGMA table_info(...)` for each table and runs `ALTER TABLE ... ADD COLUMN` only for columns that don't exist yet, then backfills old rows (e.g. a pre-existing single-winner sale gets `bid_amount = amount`, `rank = 1`) so they remain valid under the new schema. It never drops or rewrites existing rows. Existing *demo* data can also just be wiped via Settings → Reset if you'd rather start clean than migrate it.

## What's simplified from the full spec

Given the scope of the original spec (a multi-day roadmap across two major change requests), this build prioritizes the essential + high-value items end-to-end over exhaustive coverage of every optional extra:

- **Included in full**: multi-winner (top-N) auction engine with PAY_AS_BID/UNIFORM_PRICE, atomic batch confirm + two correction granularities, wallet/sale transactional logic, real-time sync, organizer command center (overview, auction control with the Record Results form, teams, lots, history grouped by result, settings), cinematic audience display with all 7 states, 3D hero visuals that vary by technology category, CSV export, event reset, and a 24-case automated test suite.
- **Simplified**: a single reusable Three.js hero component drives per-category visuals (geometry + color swap) rather than 12 fully bespoke 3D scenes; no sound effects; no Socket.IO reconnection backoff tuning beyond the client library's defaults (it already re-fetches full state on reconnect); no ORM/migration framework (see the migration note above).
- **Not implemented**: authentication/access codes for the organizer console (per spec, this is a local event tool, not a public service — don't expose port 4000/5173 beyond the venue LAN), printable transaction reports beyond CSV.

## Operator procedure (per lot)

1. **Admin → Auction Control**: click the eye icon next to a pending lot to **Reveal** it — the audience display shows the cinematic reveal.
2. Auctioneer runs the physical bidding in the room.
3. Click **Start Auction** when bidding begins (audience display switches to the live state).
4. When the auctioneer closes the lot, fill in the **Record Results** rows — one per winner, searchable team picker + bid amount, ranked top to bottom. Use **Add result row** / **Remove row** if fewer or more than the default number of winners apply (capped at the lot's remaining units). Press **Enter** in an amount field to jump to the next row.
5. Click **Confirm N Winners** — review the confirmation table (bid vs. charged amount vs. balance after, per team) before confirming. The button is disabled until every row passes validation.
6. The audience display automatically shows the SOLD celebration with all winners once the backend commits the transaction.
7. Click **Advance to Next Lot** when ready. If a lot gets no valid bids at all, use **Mark Unsold** instead of recording results.
8. When all lots are closed, **Advance to Next Lot** automatically completes the event and shows the summary screen.

## Event-day checklist

- [ ] Run `npm run seed` once beforehand if starting fresh (or use Settings → Reset for rehearsal).
- [ ] Verify all 21 teams and the lot list in Admin → Teams / Lots.
- [ ] Open `/display` full-screen on the projector; open `/admin` on the organizer's laptop.
- [ ] Do one test sale end-to-end and confirm the audience screen updates.
- [ ] Keep a paper backup of winning team + lot + price as a fallback.
