import { Router } from "express";
import { z } from "zod";
import type { Server } from "socket.io";
import type { AuctionEngine } from "../logic/auction.js";
import { requireAdmin } from "../auth/middleware.js";
import { asyncRoute, operatorOf } from "./helpers.js";

const settingsSchema = z.object({
  event_name: z.string().min(1).optional(),
  tagline: z.string().optional(),
  starting_wallet: z.number().int().positive().optional(),
  default_starting_bid: z.number().int().positive().optional(),
  default_min_increment: z.number().int().positive().optional(),
  bid_mode: z.enum(["sale_only", "live_tracking"]).optional(),
  sound_enabled: z.union([z.literal(0), z.literal(1)]).optional(),
  display_state: z.enum(["opening", "event_flow", "ready", "reveal", "live", "sold", "unsold", "summary", "build_start"]).optional(),
  winners_per_lot: z.number().int().positive().optional(),
  pricing_mode: z.enum(["PAY_AS_BID", "UNIFORM_PRICE"]).optional(),
  allow_fewer_winners: z.union([z.literal(0), z.literal(1)]).optional(),
  block_repeat_winner: z.union([z.literal(0), z.literal(1)]).optional(),
  max_tech_per_team: z.number().int().positive().optional(),
  pitch_seconds: z.number().int().positive().optional(),
  prep_minutes: z.number().int().positive().max(600).optional(),
});

const flowStepsSchema = z.object({
  steps: z.array(z.object({ kicker: z.string(), heading: z.string(), text: z.string() })).length(5),
});

const bootedAt = Date.now();

export function eventRouter(engine: AuctionEngine, io: Server) {
  const router = Router();

  // Public: the audience display's initial fetch. Sanitized — no operator names.
  router.get(
    "/state",
    asyncRoute(async () => engine.toPublicState(await engine.getFullState()))
  );

  // Everything below is organizer-only.
  router.use(requireAdmin);

  router.get("/admin-state", asyncRoute(() => engine.getFullState()));

  router.patch(
    "/settings",
    asyncRoute((req) => engine.updateSettings(settingsSchema.parse(req.body), operatorOf(req)))
  );

  router.post("/start", asyncRoute((req) => engine.startEvent(operatorOf(req))));
  router.post("/pause", asyncRoute((req) => engine.pauseEvent(operatorOf(req))));
  router.post("/resume", asyncRoute((req) => engine.resumeEvent(operatorOf(req))));
  router.post("/complete", asyncRoute((req) => engine.completeEvent(operatorOf(req))));

  router.post("/build/proceed", asyncRoute((req) => engine.proceedToBuild(operatorOf(req))));
  router.post("/build/back", asyncRoute((req) => engine.backToSummary(operatorOf(req))));
  router.post("/build/replay", asyncRoute((req) => engine.replayBuild(operatorOf(req))));
  router.post(
    "/build/start-timer",
    asyncRoute(async (req) => ({
      startedAt: await engine.startPrepTimer({ countdown: z.object({ countdown: z.boolean() }).parse(req.body).countdown, operator: operatorOf(req) }),
    }))
  );
  router.post("/build/reset-timer", asyncRoute((req) => engine.resetPrepTimer(operatorOf(req))));
  router.put(
    "/build/text",
    asyncRoute((req) =>
      engine.updateBuildText(
        z.object({ kicker: z.string(), headline: z.string(), tagline: z.string(), message: z.string() }).parse(req.body),
        operatorOf(req)
      )
    )
  );

  router.post("/flow/start", asyncRoute((req) => engine.startEventFlow(operatorOf(req))));
  router.post("/flow/replay", asyncRoute((req) => engine.replayFlow(operatorOf(req))));
  router.post("/flow/continue", asyncRoute((req) => engine.continueFromFlow(operatorOf(req))));
  router.post(
    "/flow/step",
    asyncRoute(async (req) => ({ step: await engine.setFlowStep(z.object({ step: z.number().int() }).parse(req.body).step, operatorOf(req)) }))
  );
  router.put(
    "/flow/steps",
    asyncRoute((req) => engine.updateFlowSteps(flowStepsSchema.parse(req.body).steps, operatorOf(req)))
  );

  router.post(
    "/reset",
    asyncRoute(async (req) => {
      const body = z.object({ confirm: z.string() }).parse(req.body);
      await engine.resetEvent(body.confirm, operatorOf(req));
      return { reset: true };
    })
  );

  router.get(
    "/export/sales.csv",
    asyncRoute(async (_req, res) => {
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=sales.csv");
      res.send(await engine.exportSalesCsv());
    })
  );

  router.get(
    "/export/wallets.csv",
    asyncRoute(async (_req, res) => {
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=wallets.csv");
      res.send(await engine.exportWalletsCsv());
    })
  );

  router.get(
    "/backup",
    asyncRoute(async (_req, res) => {
      const backup = await engine.exportBackupJson();
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename=tech-auction-backup-${Date.now()}.json`);
      res.send(JSON.stringify(backup, null, 2));
    })
  );

  router.get("/audit", asyncRoute(() => engine.getAuditLog()));

  // Diagnostics: connection counts + latency support for the admin Settings page.
  router.get(
    "/diagnostics",
    asyncRoute(async () => {
      const settings = await engine.getSettings();
      return {
        uptimeSeconds: Math.round((Date.now() - bootedAt) / 1000),
        databaseKind: process.env.DATABASE_URL ? "postgres" : "sqlite",
        connectedAdmins: io.of("/admin").sockets.size,
        connectedDisplays: io.of("/public").sockets.size,
        lastEventVersion: settings.version,
        now: new Date().toISOString(),
      };
    })
  );

  router.post(
    "/ping-display",
    asyncRoute(() => {
      io.of("/public").emit("display:ping", { at: new Date().toISOString() });
      return { sent: true };
    })
  );

  return router;
}
