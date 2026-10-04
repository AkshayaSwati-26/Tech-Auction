import { nanoid } from "nanoid";
import { AuctionError } from "./errors.js";
import { FLOW_STEP_COUNT, parseFlowSteps, renderFlowSteps, type FlowStep } from "./flow.js";
import { BUILD_TEXT_FIELDS, COUNTDOWN_LEAD_MS, parseBuildText, type BuildText } from "./build.js";
import type { DbAdapter, QueryRunner } from "../db/types.js";
import type {
  EventSettings,
  FullState,
  Lot,
  LotResult,
  LotResultView,
  PricingMode,
  Sale,
  Team,
  TeamWithWallet,
  WinnerView,
} from "../types.js";

type Emit = (event: string, payload: unknown) => void;

export interface WinnerInput {
  teamId: string;
  amount: number;
}

const processedRequestIds = new Set<string>();

const rupees = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
function inr(amount: number): string {
  return rupees.format(amount);
}

function now(): string {
  return new Date().toISOString();
}

/**
 * All business logic lives here, unchanged in behavior from the single-process SQLite
 * version — only the mechanics of running a query changed (sync node:sqlite calls became
 * `await db.get/all/run(...)` through the DbAdapter, so the same code runs against Postgres
 * too). Methods that read-then-write inside one commit accept an explicit QueryRunner (the
 * transaction's own connection) so nested reads see uncommitted writes from the same batch.
 */
export class AuctionEngine {
  constructor(private db: DbAdapter, private emit: Emit) {}

  // ---------- Reads ----------

  async getSettings(db: QueryRunner = this.db): Promise<EventSettings> {
    return (await db.get("SELECT * FROM event_settings WHERE id = 1")) as unknown as EventSettings;
  }

  private walletSubquery() {
    return `
      SELECT
        t.id, t.name, t.initial_balance,
        COALESCE(SUM(CASE WHEN wt.type = 'debit' THEN wt.amount ELSE 0 END), 0) AS spent,
        COALESCE(SUM(CASE WHEN wt.type = 'credit' THEN wt.amount ELSE 0 END), 0) AS credited,
        COALESCE(SUM(CASE WHEN wt.type = 'debit' AND wt.sale_id IS NOT NULL THEN 1 ELSE 0 END), 0) AS purchases,
        (SELECT COUNT(DISTINCT s.lot_id) FROM sales s WHERE s.team_id = t.id AND s.status = 'confirmed') AS techs
      FROM teams t
      LEFT JOIN wallet_transactions wt ON wt.team_id = t.id
      GROUP BY t.id
      ORDER BY t.id
    `;
  }

  async listTeams(db: QueryRunner = this.db): Promise<TeamWithWallet[]> {
    const rows = (await db.all(this.walletSubquery())) as unknown as Array<
      Team & { spent: number; credited: number; purchases: number; techs: number }
    >;
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      initial_balance: r.initial_balance,
      spent: Number(r.spent),
      remaining: r.initial_balance + Number(r.credited) - Number(r.spent),
      purchases: Number(r.purchases),
      techs: Number(r.techs),
    }));
  }

  async getTeam(teamId: string, db: QueryRunner = this.db): Promise<TeamWithWallet> {
    const teams = await this.listTeams(db);
    const team = teams.find((t) => t.id === teamId);
    if (!team) throw new AuctionError("UNKNOWN_TEAM", `Team ${teamId} does not exist`);
    return team;
  }

  async listLots(db: QueryRunner = this.db): Promise<Lot[]> {
    return (await db.all("SELECT * FROM lots ORDER BY order_index")) as unknown as Lot[];
  }

  async getLot(lotId: string, db: QueryRunner = this.db): Promise<Lot> {
    const lot = (await db.get("SELECT * FROM lots WHERE id = ?", [lotId])) as unknown as Lot | undefined;
    if (!lot) throw new AuctionError("UNKNOWN_LOT", `Lot ${lotId} does not exist`);
    return lot;
  }

  async getHistory(db: QueryRunner = this.db) {
    return db.all(
      `SELECT s.*, t.name as team_name, l.name as lot_name,
              lr.pricing_mode as result_pricing_mode, lr.note as result_note, lr.status as result_status
       FROM sales s
       JOIN teams t ON t.id = s.team_id
       JOIN lots l ON l.id = s.lot_id
       LEFT JOIN lot_results lr ON lr.id = s.lot_result_id
       ORDER BY s.created_at DESC, s.rank ASC`
    );
  }

  async getAuditLog(db: QueryRunner = this.db) {
    return db.all("SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 200");
  }

  async getLotResultView(lotResultId: string, db: QueryRunner = this.db): Promise<LotResultView> {
    const result = (await db.get("SELECT * FROM lot_results WHERE id = ?", [lotResultId])) as unknown as
      | LotResult
      | undefined;
    if (!result) throw new AuctionError("UNKNOWN_RESULT", "Lot result not found");
    const lot = await this.getLot(result.lot_id, db);
    const winners = (await db.all(
      `SELECT s.id as sale_id, s.rank, s.team_id, t.name as team_name, s.bid_amount, s.amount, s.status
       FROM sales s JOIN teams t ON t.id = s.team_id
       WHERE s.lot_result_id = ?
       ORDER BY s.rank ASC`,
      [lotResultId]
    )) as unknown as WinnerView[];
    return { ...result, lot_name: lot.name, winners };
  }

  async getFullState(db: QueryRunner = this.db): Promise<FullState> {
    const settings = await this.getSettings(db);
    const teams = await this.listTeams(db);
    const lots = await this.listLots(db);
    const currentLot = settings.current_lot_id ? lots.find((l) => l.id === settings.current_lot_id) ?? null : null;
    const lastResult = settings.last_lot_result_id ? await this.getLotResultView(settings.last_lot_result_id, db) : null;
    const flow = { step: settings.flow_step, replay: settings.flow_replay, steps: renderFlowSteps(settings, lots.length), templates: parseFlowSteps(settings.flow_steps) };
    const startMs = settings.prep_started_at ? Date.parse(settings.prep_started_at) : null;
    const totalMs = settings.prep_minutes * 60_000;
    const build = {
      replay: settings.build_replay,
      text: parseBuildText(settings.build_text),
      prepMinutes: settings.prep_minutes,
      pitchSeconds: settings.pitch_seconds,
      startedAt: settings.prep_started_at,
      endsAt: startMs === null ? null : new Date(startMs + totalMs).toISOString(),
      twistAt: startMs === null ? null : new Date(startMs + totalMs / 2).toISOString(),
    };
    return { settings, teams, lots, currentLot, lastResult, flow, build, serverTime: now() };
  }

  /** Public, display-safe projection: strips operator names and correction reasons. */
  toPublicState(state: FullState) {
    return {
      settings: state.settings,
      teams: state.teams,
      lots: state.lots,
      currentLot: state.currentLot,
      flow: state.flow,
      build: state.build,
      serverTime: state.serverTime,
      lastResult: state.lastResult
        ? {
            id: state.lastResult.id,
            lot_id: state.lastResult.lot_id,
            lot_name: state.lastResult.lot_name,
            pricing_mode: state.lastResult.pricing_mode,
            note: state.lastResult.note,
            status: state.lastResult.status,
            created_at: state.lastResult.created_at,
            winners: state.lastResult.winners.map((w) => ({
              sale_id: w.sale_id,
              rank: w.rank,
              team_id: w.team_id,
              team_name: w.team_name,
              bid_amount: w.bid_amount,
              amount: w.amount,
              status: w.status,
            })),
          }
        : null,
    };
  }

  private async audit(db: QueryRunner, operator: string, action: string, details: unknown) {
    await db.run("INSERT INTO audit_log (id, operator, action, details, created_at) VALUES (?, ?, ?, ?, ?)", [
      nanoid(12),
      operator,
      action,
      JSON.stringify(details ?? {}),
      now(),
    ]);
  }

  /** Bumps the state version (for admin-side stale-write detection), then broadcasts to both
      the public (sanitized) and admin (full) Socket.IO namespaces. */
  private async broadcastState(db: QueryRunner, extraEvent?: string, extraPayload?: unknown) {
    await db.run("UPDATE event_settings SET version = version + 1 WHERE id = 1");
    const state = await this.getFullState(db);
    if (extraEvent) this.emit(extraEvent, extraPayload);
    this.emit("event:state", state);
  }

  // ---------- Event lifecycle ----------

  async updateSettings(patch: Partial<EventSettings>, operator: string): Promise<EventSettings> {
    const current = await this.getSettings();
    const lot = current.current_lot_id ? await this.getLot(current.current_lot_id) : null;
    const lotIsLive = lot?.status === "live";

    if (patch.bid_mode && patch.bid_mode !== current.bid_mode && lotIsLive) {
      throw new AuctionError("MODE_LOCKED", "Cannot change bid mode while a lot is live");
    }
    if (patch.pricing_mode && patch.pricing_mode !== current.pricing_mode && lotIsLive) {
      throw new AuctionError("MODE_LOCKED", "Cannot change pricing mode while a lot is live");
    }

    const fields = (Object.keys(patch) as Array<keyof EventSettings>).filter((f) => f !== "version");
    if (fields.length === 0) return this.getSettings();
    const setClause = fields.map((f) => `${f} = ?`).join(", ");
    const values = fields.map((f) => patch[f]);
    await this.db.run(`UPDATE event_settings SET ${setClause} WHERE id = 1`, values as unknown[]);
    await this.audit(this.db, operator, "settings:update", patch);
    await this.broadcastState(this.db);
    return this.getSettings();
  }

  async startEvent(operator: string) {
    await this.db.run("UPDATE event_settings SET status = 'live' WHERE id = 1");
    await this.audit(this.db, operator, "event:start", {});
    await this.broadcastState(this.db, "auction:started", {});
  }

  async pauseEvent(operator: string) {
    await this.db.run("UPDATE event_settings SET status = 'paused' WHERE id = 1");
    await this.audit(this.db, operator, "event:pause", {});
    await this.broadcastState(this.db, "auction:paused", {});
  }

  async resumeEvent(operator: string) {
    await this.db.run("UPDATE event_settings SET status = 'live' WHERE id = 1");
    await this.audit(this.db, operator, "event:resume", {});
    await this.broadcastState(this.db, "auction:resumed", {});
  }

  async completeEvent(operator: string) {
    await this.db.run("UPDATE event_settings SET status = 'completed', display_state = 'summary' WHERE id = 1");
    await this.audit(this.db, operator, "event:complete", {});
    await this.broadcastState(this.db, "auction:completed", {});
  }

  // ---------- Event Flow (the run-of-show page shown after the title screen) ----------

  /** "Start Event": marks the event live and moves the display from the title to Event Flow. */
  async startEventFlow(operator: string) {
    await this.db.run("UPDATE event_settings SET status = 'live', display_state = 'event_flow', flow_step = 0, flow_replay = flow_replay + 1 WHERE id = 1");
    await this.audit(this.db, operator, "flow:start", {});
    await this.broadcastState(this.db, "flow:started", {});
  }

  /** Spotlights one card (1..5), or none (0). Out-of-range values are clamped. */
  async setFlowStep(step: number, operator: string) {
    if (!Number.isInteger(step)) throw new AuctionError("INVALID_STEP", "Step must be a whole number");
    const clamped = Math.max(0, Math.min(FLOW_STEP_COUNT, step));
    await this.db.run("UPDATE event_settings SET flow_step = ? WHERE id = 1", [clamped]);
    await this.audit(this.db, operator, "flow:step", { step: clamped });
    await this.broadcastState(this.db, "flow:step", { step: clamped });
    return clamped;
  }

  async replayFlow(operator: string) {
    await this.db.run("UPDATE event_settings SET flow_step = 0, flow_replay = flow_replay + 1 WHERE id = 1");
    await this.audit(this.db, operator, "flow:replay", {});
    await this.broadcastState(this.db, "flow:replay", {});
  }

  /** "Continue to Auction": Ready screen for the current lot, or the first open lot. */
  async continueFromFlow(operator: string) {
    const settings = await this.getSettings();
    const lots = await this.listLots();
    const open = (l: Lot) => l.quantity_remaining > 0 && l.status !== "unsold";
    const current = lots.find((l) => l.id === settings.current_lot_id && open(l)) ?? lots.find(open) ?? null;
    await this.db.run("UPDATE event_settings SET display_state = 'ready', current_lot_id = ?, flow_step = 0 WHERE id = 1", [current?.id ?? null]);
    await this.audit(this.db, operator, "flow:continue", { lotId: current?.id ?? null });
    await this.broadcastState(this.db, "flow:continued", { lotId: current?.id ?? null });
  }

  /** Saves the editable kicker / heading / text templates for the five steps. */
  async updateFlowSteps(steps: FlowStep[], operator: string) {
    if (!Array.isArray(steps) || steps.length !== FLOW_STEP_COUNT) {
      throw new AuctionError("INVALID_FLOW_STEPS", `Event Flow needs exactly ${FLOW_STEP_COUNT} steps`);
    }
    for (const [i, s] of steps.entries()) {
      for (const field of ["kicker", "heading", "text"] as const) {
        if (typeof s?.[field] !== "string" || !s[field].trim()) {
          throw new AuctionError("INVALID_FLOW_STEPS", `Step ${i + 1}: ${field} cannot be empty`);
        }
      }
    }
    const clean = steps.map((s) => ({ kicker: s.kicker.trim(), heading: s.heading.trim(), text: s.text.trim() }));
    await this.db.run("UPDATE event_settings SET flow_steps = ? WHERE id = 1", [JSON.stringify(clean)]);
    await this.audit(this.db, operator, "flow:edit", { steps: clean });
    await this.broadcastState(this.db);
    return (await this.getFullState()).flow.steps;
  }

  // ---------- Build phase (shown after the auction summary) ----------

  /** "Proceed to Build Phase": Summary -> Build Start. A timer that is already running is left alone. */
  async proceedToBuild(operator: string) {
    await this.db.run("UPDATE event_settings SET display_state = 'build_start', build_replay = build_replay + 1 WHERE id = 1");
    await this.audit(this.db, operator, "build:proceed", {});
    await this.broadcastState(this.db, "build:shown", {});
  }

  async backToSummary(operator: string) {
    await this.db.run("UPDATE event_settings SET display_state = 'summary' WHERE id = 1");
    await this.audit(this.db, operator, "build:back", {});
    await this.broadcastState(this.db, "build:back", {});
  }

  async replayBuild(operator: string) {
    await this.db.run("UPDATE event_settings SET build_replay = build_replay + 1 WHERE id = 1");
    await this.audit(this.db, operator, "build:replay", {});
    await this.broadcastState(this.db, "build:replay", {});
  }

  /**
   * Starts the preparation timer by storing its start time. With `countdown`, the start is a few
   * seconds ahead so every display shows the same 3-2-1. Clients only ever render from this
   * timestamp, so a refresh or a server restart cannot move the timer.
   */
  async startPrepTimer(args: { countdown: boolean; operator: string }) {
    const settings = await this.getSettings();
    if (settings.prep_started_at) {
      throw new AuctionError("TIMER_ALREADY_STARTED", "The preparation timer is already running. Reset it first if it was started by mistake.");
    }
    const startedAt = new Date(Date.now() + (args.countdown ? COUNTDOWN_LEAD_MS : 0)).toISOString();
    await this.db.run("UPDATE event_settings SET prep_started_at = ? WHERE id = 1", [startedAt]);
    await this.audit(this.db, args.operator, "build:timer_start", { startedAt, countdown: args.countdown, prepMinutes: settings.prep_minutes });
    await this.broadcastState(this.db, "build:timer_started", { startedAt });
    return startedAt;
  }

  async resetPrepTimer(operator: string) {
    await this.db.run("UPDATE event_settings SET prep_started_at = NULL WHERE id = 1");
    await this.audit(this.db, operator, "build:timer_reset", {});
    await this.broadcastState(this.db, "build:timer_reset", {});
  }

  async updateBuildText(text: Partial<BuildText>, operator: string) {
    const clean: Record<string, string> = {};
    for (const f of BUILD_TEXT_FIELDS) {
      const v = text[f];
      if (typeof v !== "string" || !v.trim()) throw new AuctionError("INVALID_BUILD_TEXT", `${f} cannot be empty`);
      clean[f] = v.trim();
    }
    await this.db.run("UPDATE event_settings SET build_text = ? WHERE id = 1", [JSON.stringify(clean)]);
    await this.audit(this.db, operator, "build:edit", clean);
    await this.broadcastState(this.db);
    return (await this.getFullState()).build.text;
  }

  // ---------- Lot flow ----------

  async revealLot(lotId: string, operator: string) {
    const lot = await this.getLot(lotId);
    if (lot.quantity_remaining <= 0) {
      throw new AuctionError("LOT_SOLD_OUT", "This lot has no remaining units");
    }
    await this.db.run("UPDATE lots SET status = 'revealed' WHERE id = ?", [lotId]);
    await this.db.run("UPDATE event_settings SET current_lot_id = ?, display_state = 'reveal' WHERE id = 1", [lotId]);
    await this.audit(this.db, operator, "lot:reveal", { lotId });
    await this.broadcastState(this.db, "lot:revealed", { lotId });
  }

  async startLive(lotId: string, operator: string) {
    const lot = await this.getLot(lotId);
    await this.db.run("UPDATE lots SET status = 'live', current_bid = ?, current_leading_team = NULL WHERE id = ?", [
      lot.starting_bid,
      lotId,
    ]);
    await this.db.run("UPDATE event_settings SET display_state = 'live' WHERE id = 1");
    await this.audit(this.db, operator, "lot:start_live", { lotId });
    await this.broadcastState(this.db, "auction:lot_started", { lotId });
  }

  async recordBid(lotId: string, teamId: string, amount: number, operator: string) {
    const settings = await this.getSettings();
    if (settings.bid_mode !== "live_tracking") {
      throw new AuctionError("WRONG_MODE", "Live bid tracking is not enabled for this event");
    }
    const lot = await this.getLot(lotId);
    if (lot.status !== "live") throw new AuctionError("LOT_NOT_LIVE", "Lot is not currently live");
    const team = await this.getTeam(teamId);

    const floor = lot.current_bid ?? lot.starting_bid;
    const minValid = lot.current_leading_team ? floor + lot.min_increment : floor;
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new AuctionError("INVALID_AMOUNT", "Bid amount must be a positive integer");
    }
    if (amount < minValid) {
      throw new AuctionError("BELOW_INCREMENT", `Bid must be at least ${inr(minValid)} (starting bid / increment rule)`);
    }
    if (amount > team.remaining) {
      throw new AuctionError("INSUFFICIENT_FUNDS", `${teamId} does not have enough balance for this bid`);
    }

    await this.db.run("UPDATE lots SET current_bid = ?, current_leading_team = ? WHERE id = ?", [amount, teamId, lotId]);
    await this.audit(this.db, operator, "bid:record", { lotId, teamId, amount });
    await this.broadcastState(this.db, "bid:updated", { lotId, teamId, amount });
  }

  async markUnsold(lotId: string, operator: string) {
    const lot = await this.getLot(lotId);
    if (lot.quantity_remaining !== lot.quantity_total) {
      throw new AuctionError("ALREADY_PARTIALLY_SOLD", "This lot already has confirmed winners; it cannot be marked fully unsold");
    }
    await this.db.run("UPDATE lots SET status = 'unsold', current_bid = NULL, current_leading_team = NULL WHERE id = ?", [lotId]);
    await this.db.run("UPDATE event_settings SET display_state = 'unsold' WHERE id = 1");
    await this.audit(this.db, operator, "lot:unsold", { lotId });
    await this.broadcastState(this.db, "lot:unsold", { lotId });
  }

  async advanceToNext(operator: string) {
    const lots = await this.listLots();
    const settings = await this.getSettings();
    const currentIndex = settings.current_lot_id ? lots.findIndex((l) => l.id === settings.current_lot_id) : -1;
    const next = lots.slice(currentIndex + 1).find((l) => l.quantity_remaining > 0 && l.status !== "unsold");
    if (!next) {
      await this.completeEvent(operator);
      return;
    }
    await this.db.run("UPDATE event_settings SET current_lot_id = ?, display_state = 'ready' WHERE id = 1", [next.id]);
    await this.audit(this.db, operator, "lot:advance", { lotId: next.id });
    await this.broadcastState(this.db, "lot:advanced", { lotId: next.id });
  }

  // ---------- Multi-winner result confirmation (the critical transactional path) ----------
  //
  // Pricing rules (documented with worked examples in README):
  //   PAY_AS_BID    — each winner pays exactly the amount they bid.
  //   UNIFORM_PRICE — every winner pays the lowest winning bid in this batch
  //                   (i.e. the last-ranked winner's amount, since winners must
  //                   be submitted in non-increasing bid order).

  async confirmLotResults(args: {
    lotId: string;
    winners: WinnerInput[];
    note?: string;
    operator: string;
    requestId?: string;
    expectedVersion?: number;
  }): Promise<LotResultView> {
    const { lotId, winners, note, operator, requestId, expectedVersion } = args;

    if (requestId && processedRequestIds.has(requestId)) {
      throw new AuctionError("DUPLICATE_REQUEST", "This result has already been submitted");
    }
    if (!Array.isArray(winners) || winners.length === 0) {
      throw new AuctionError("NO_WINNERS", "At least one winner is required (use Mark Unsold for no valid bids)");
    }

    const resultId = await this.db.transaction(async (tx) => {
      const settings = await this.getSettings(tx);
      if (expectedVersion !== undefined && expectedVersion !== settings.version) {
        throw new AuctionError(
          "VERSION_CONFLICT",
          "The event state changed since this form was loaded — refresh and try again"
        );
      }

      const lot = await this.getLot(lotId, tx);

      if (lot.status === "unsold" && lot.quantity_remaining === lot.quantity_total) {
        throw new AuctionError("LOT_CLOSED", "This lot was marked unsold and is closed");
      }
      if (winners.length > lot.quantity_remaining) {
        throw new AuctionError(
          "INSUFFICIENT_INVENTORY",
          `Only ${lot.quantity_remaining} unit(s) remain, but ${winners.length} winner(s) were submitted`
        );
      }
      if (!settings.allow_fewer_winners && winners.length < lot.quantity_remaining) {
        throw new AuctionError("FEWER_WINNERS_NOT_ALLOWED", `This event requires exactly ${lot.quantity_remaining} winner(s) for this lot`);
      }

      const seenTeams = new Set<string>();
      for (const w of winners) {
        if (seenTeams.has(w.teamId)) {
          throw new AuctionError("DUPLICATE_TEAM_IN_BATCH", `${w.teamId} appears more than once in this result`);
        }
        seenTeams.add(w.teamId);
      }

      if (settings.block_repeat_winner) {
        for (const w of winners) {
          const already = (await tx.get("SELECT COUNT(*) as c FROM sales WHERE lot_id = ? AND team_id = ? AND status = 'confirmed'", [
            lotId,
            w.teamId,
          ])) as { c: number };
          if (Number(already.c) > 0) {
            throw new AuctionError("REPEAT_WINNER_BLOCKED", `${w.teamId} has already won this technology and repeat winners are blocked`);
          }
        }
      }

      const teams: TeamWithWallet[] = [];
      for (const w of winners) teams.push(await this.getTeam(w.teamId, tx));

      for (const w of winners) {
        const owned = (await tx.get("SELECT COUNT(DISTINCT lot_id) as c FROM sales WHERE team_id = ? AND status = 'confirmed' AND lot_id <> ?", [
          w.teamId,
          lotId,
        ])) as { c: number };
        if (Number(owned.c) >= settings.max_tech_per_team) {
          throw new AuctionError(
            "TECH_LIMIT_REACHED",
            `${w.teamId} already owns ${Number(owned.c)} technologies (the limit is ${settings.max_tech_per_team}). Nothing was saved.`
          );
        }
      }

      let previousAmount = Infinity;
      winners.forEach((w, i) => {
        if (!Number.isInteger(w.amount) || w.amount <= 0) {
          throw new AuctionError("INVALID_AMOUNT", `Rank ${i + 1}: amount must be a positive integer`);
        }
        if (w.amount < lot.starting_bid) {
          throw new AuctionError("BELOW_STARTING_BID", `Rank ${i + 1}: bid (${w.amount}) is below the starting bid (${lot.starting_bid})`);
        }
        if ((w.amount - lot.starting_bid) % lot.min_increment !== 0) {
          throw new AuctionError(
            "BELOW_INCREMENT",
            `Rank ${i + 1}: bid (${w.amount}) does not land on a valid increment step of ${lot.min_increment} from the starting bid (${lot.starting_bid})`
          );
        }
        if (w.amount > previousAmount) {
          throw new AuctionError(
            "ORDER_VIOLATION",
            `Rank ${i + 1}'s bid (${w.amount}) cannot exceed rank ${i}'s bid (${previousAmount}); ties are allowed, increases are not`
          );
        }
        previousAmount = w.amount;
      });

      const pricingMode: PricingMode = (lot.pricing_mode ?? settings.pricing_mode) as PricingMode;
      const uniformPrice = winners[winners.length - 1].amount;
      const chargeFor = (amount: number) => (pricingMode === "UNIFORM_PRICE" ? uniformPrice : amount);

      winners.forEach((w, i) => {
        const team = teams[i];
        const charge = chargeFor(w.amount);
        if (team.remaining < charge) {
          throw new AuctionError("INSUFFICIENT_FUNDS", `${team.id} has ${inr(team.remaining)}, which is less than the charge (${inr(charge)}). Nothing was saved.`);
        }
      });

      const newResultId = nanoid(12);
      await tx.run(`INSERT INTO lot_results (id, lot_id, pricing_mode, note, operator, status, created_at) VALUES (?, ?, ?, ?, ?, 'confirmed', ?)`, [
        newResultId,
        lotId,
        pricingMode,
        note?.trim() || null,
        operator,
        now(),
      ]);

      for (let i = 0; i < winners.length; i++) {
        const w = winners[i];
        const rank = i + 1;
        const charge = chargeFor(w.amount);
        const saleId = nanoid(12);
        await tx.run(
          `INSERT INTO sales (id, lot_id, team_id, amount, bid_amount, quantity, rank, lot_result_id, operator, status, created_at)
           VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, 'confirmed', ?)`,
          [saleId, lotId, w.teamId, charge, w.amount, rank, newResultId, operator, now()]
        );

        await tx.run(`INSERT INTO wallet_transactions (id, team_id, type, amount, sale_id, reason, created_at) VALUES (?, ?, 'debit', ?, ?, ?, ?)`, [
          nanoid(12),
          w.teamId,
          charge,
          saleId,
          `Purchase: ${lot.name} (rank ${rank})`,
          now(),
        ]);
      }

      const remaining = lot.quantity_remaining - winners.length;
      const newStatus = remaining === 0 ? "sold" : "partially_sold";
      await tx.run("UPDATE lots SET quantity_remaining = ?, status = ?, current_bid = NULL, current_leading_team = NULL WHERE id = ?", [
        remaining,
        newStatus,
        lotId,
      ]);

      await tx.run("UPDATE event_settings SET display_state = 'sold', last_lot_result_id = ? WHERE id = 1", [newResultId]);

      await this.audit(tx, operator, "lot_result:confirm", {
        lotResultId: newResultId,
        lotId,
        pricingMode,
        note: note?.trim() || null,
        winners: winners.map((w, i) => ({ teamId: w.teamId, rank: i + 1, bidAmount: w.amount, charge: chargeFor(w.amount) })),
      });

      if (requestId) processedRequestIds.add(requestId);

      return newResultId;
    });

    const view = await this.getLotResultView(resultId);
    await this.broadcastState(this.db, "sale:confirmed", {
      lotResultId: view.id,
      lotId: view.lot_id,
      lotName: view.lot_name,
      pricingMode: view.pricing_mode,
      winners: view.winners,
    });
    return view;
  }

  async correctLotResult(lotResultId: string, reason: string, operator: string) {
    if (!reason || !reason.trim()) {
      throw new AuctionError("REASON_REQUIRED", "A correction reason is required");
    }
    await this.db.transaction(async (tx) => {
      const result = (await tx.get("SELECT * FROM lot_results WHERE id = ?", [lotResultId])) as unknown as LotResult | undefined;
      if (!result) throw new AuctionError("UNKNOWN_RESULT", "Lot result not found");
      if (result.status === "corrected") {
        throw new AuctionError("ALREADY_CORRECTED", "This result was already corrected");
      }

      const sales = (await tx.all("SELECT * FROM sales WHERE lot_result_id = ? AND status = 'confirmed'", [lotResultId])) as unknown as Sale[];

      for (const sale of sales) {
        await tx.run(`INSERT INTO wallet_transactions (id, team_id, type, amount, sale_id, reason, created_at) VALUES (?, ?, 'credit', ?, ?, ?, ?)`, [
          nanoid(12),
          sale.team_id,
          sale.amount,
          sale.id,
          `Correction reversal: ${reason}`,
          now(),
        ]);

        await tx.run("UPDATE sales SET status = 'corrected', correction_reason = ?, corrected_at = ? WHERE id = ?", [reason, now(), sale.id]);
      }

      const lot = await this.getLot(result.lot_id, tx);
      const restored = Math.min(lot.quantity_total, lot.quantity_remaining + sales.length);
      const newStatus = restored === lot.quantity_total ? "revealed" : "partially_sold";
      await tx.run("UPDATE lots SET quantity_remaining = ?, status = ? WHERE id = ?", [restored, newStatus, lot.id]);

      await tx.run("UPDATE lot_results SET status = 'corrected', correction_reason = ?, corrected_at = ? WHERE id = ?", [reason, now(), lotResultId]);

      await this.audit(tx, operator, "lot_result:correct", { lotResultId, reason, reversedSales: sales.map((s) => s.id) });
    });
    await this.broadcastState(this.db, "lot_result:corrected", { lotResultId });
  }

  async correctSale(saleId: string, reason: string, operator: string) {
    if (!reason || !reason.trim()) {
      throw new AuctionError("REASON_REQUIRED", "A correction reason is required");
    }
    await this.db.transaction(async (tx) => {
      const sale = (await tx.get("SELECT * FROM sales WHERE id = ?", [saleId])) as unknown as Sale | undefined;
      if (!sale) throw new AuctionError("UNKNOWN_SALE", "Sale not found");
      if (sale.status === "corrected") throw new AuctionError("ALREADY_CORRECTED", "This sale was already corrected");

      await tx.run(`INSERT INTO wallet_transactions (id, team_id, type, amount, sale_id, reason, created_at) VALUES (?, ?, 'credit', ?, ?, ?, ?)`, [
        nanoid(12),
        sale.team_id,
        sale.amount,
        sale.id,
        `Correction reversal: ${reason}`,
        now(),
      ]);

      await tx.run("UPDATE sales SET status = 'corrected', correction_reason = ?, corrected_at = ? WHERE id = ?", [reason, now(), saleId]);

      const lot = await this.getLot(sale.lot_id, tx);
      const restored = Math.min(lot.quantity_total, lot.quantity_remaining + sale.quantity);
      const newStatus = restored === lot.quantity_total ? "revealed" : "partially_sold";
      await tx.run("UPDATE lots SET quantity_remaining = ?, status = ? WHERE id = ?", [restored, newStatus, lot.id]);

      await this.audit(tx, operator, "sale:correct", { saleId, reason });
    });
    await this.broadcastState(this.db, "sale:corrected", { saleId });
  }

  async adjustWallet(teamId: string, amount: number, type: "debit" | "credit", reason: string, operator: string) {
    if (!reason || !reason.trim()) {
      throw new AuctionError("REASON_REQUIRED", "A reason is required for manual wallet adjustments");
    }
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new AuctionError("INVALID_AMOUNT", "Adjustment amount must be a positive integer");
    }
    await this.getTeam(teamId);
    await this.db.run(`INSERT INTO wallet_transactions (id, team_id, type, amount, sale_id, reason, created_at) VALUES (?, ?, ?, ?, NULL, ?, ?)`, [
      nanoid(12),
      teamId,
      type,
      amount,
      reason,
      now(),
    ]);
    await this.audit(this.db, operator, "wallet:manual_adjust", { teamId, amount, type, reason });
    await this.broadcastState(this.db, "wallet:adjusted", { teamId });
  }

  // ---------- Lot management ----------

  async createLot(
    data: {
      name: string;
      category: string;
      description?: string;
      limitation?: string;
      motif?: string;
      starting_bid: number;
      min_increment: number;
      quantity_total: number;
      pricing_mode?: PricingMode | null;
    },
    operator: string
  ) {
    const maxOrder = (await this.db.get("SELECT COALESCE(MAX(order_index), -1) as m FROM lots")) as { m: number };
    const id = nanoid(10);
    await this.db.run(
      `INSERT INTO lots (id, order_index, name, category, description, limitation, motif, starting_bid, min_increment, quantity_total, quantity_remaining, status, pricing_mode)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [
        id,
        Number(maxOrder.m) + 1,
        data.name,
        data.category,
        data.description ?? "",
        data.limitation ?? "",
        data.motif ?? "generic",
        data.starting_bid,
        data.min_increment,
        data.quantity_total,
        data.quantity_total,
        data.pricing_mode ?? null,
      ]
    );
    await this.audit(this.db, operator, "lot:create", { id, ...data });
    await this.broadcastState(this.db);
    return this.getLot(id);
  }

  async updateLot(lotId: string, patch: Partial<Lot>, operator: string) {
    const lot = await this.getLot(lotId);
    const hasSales = (await this.db.get("SELECT COUNT(*) as c FROM sales WHERE lot_id = ? AND status = 'confirmed'", [lotId])) as { c: number };
    if (Number(hasSales.c) > 0 && (patch.starting_bid !== undefined || patch.quantity_total !== undefined)) {
      throw new AuctionError("LOT_LOCKED", "This lot has confirmed winners; use a correction instead of editing price/quantity directly");
    }
    const editable: Array<keyof Lot> = [
      "name",
      "category",
      "description",
      "limitation",
      "motif",
      "starting_bid",
      "min_increment",
      "quantity_total",
      "order_index",
      "pricing_mode",
    ];
    const fields = editable.filter((f) => patch[f] !== undefined);
    if (fields.length === 0) return lot;
    const setClause = fields.map((f) => `${f} = ?`).join(", ");
    const values = fields.map((f) => patch[f]);
    await this.db.run(`UPDATE lots SET ${setClause} WHERE id = ?`, [...(values as unknown[]), lotId]);
    if (patch.quantity_total !== undefined && Number(hasSales.c) === 0) {
      await this.db.run("UPDATE lots SET quantity_remaining = ? WHERE id = ?", [patch.quantity_total, lotId]);
    }
    await this.audit(this.db, operator, "lot:update", { lotId, patch });
    await this.broadcastState(this.db);
    return this.getLot(lotId);
  }

  // ---------- Export ----------

  async exportSalesCsv(): Promise<string> {
    const rows = (await this.getHistory()) as any[];
    const header = "sale_id,lot,team,rank,bid_amount_inr,amount_charged_inr,pricing_mode,status,operator,created_at";
    const body = rows
      .map((r) =>
        [r.id, r.lot_name, r.team_name, r.rank, r.bid_amount, r.amount, r.result_pricing_mode, r.status, r.operator, r.created_at]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");
    return `${header}\n${body}\n`;
  }

  async exportWalletsCsv(): Promise<string> {
    const teams = await this.listTeams();
    const header = "team_id,name,initial_balance_inr,spent_inr,remaining_inr,purchases,technologies_owned";
    const body = teams.map((t) => [t.id, t.name, t.initial_balance, t.spent, t.remaining, t.purchases, t.techs].join(",")).join("\n");
    return `${header}\n${body}\n`;
  }

  /** Full JSON dump of every table — the admin-only "Backup Now" export. */
  async exportBackupJson() {
    const [settings, teams, lots, lotResults, sales, walletTransactions, auditLog] = await Promise.all([
      this.getSettings(),
      this.db.all("SELECT * FROM teams"),
      this.listLots(),
      this.db.all("SELECT * FROM lot_results"),
      this.db.all("SELECT * FROM sales"),
      this.db.all("SELECT * FROM wallet_transactions"),
      this.db.all("SELECT * FROM audit_log ORDER BY created_at"),
    ]);
    return {
      exportedAt: now(),
      settings,
      teams,
      lots,
      lotResults,
      sales,
      walletTransactions,
      auditLog,
    };
  }

  // ---------- Reset (demo data only; requires an explicit confirm phrase) ----------

  async resetEvent(confirmPhrase: string, operator: string) {
    if (confirmPhrase !== "RESET EVENT") {
      throw new AuctionError("CONFIRMATION_REQUIRED", 'Type "RESET EVENT" exactly to confirm this irreversible action');
    }
    await this.db.transaction(async (tx) => {
      await tx.run("DELETE FROM wallet_transactions");
      await tx.run("DELETE FROM sales");
      await tx.run("DELETE FROM lot_results");
      await tx.run("UPDATE lots SET quantity_remaining = quantity_total, status = 'pending', current_bid = NULL, current_leading_team = NULL");
      await tx.run("UPDATE event_settings SET status = 'setup', current_lot_id = NULL, display_state = 'opening', last_lot_result_id = NULL, flow_step = 0, prep_started_at = NULL WHERE id = 1");
      await this.audit(tx, operator, "event:reset", {});
    });
    await this.broadcastState(this.db, "event:reset", {});
  }
}
