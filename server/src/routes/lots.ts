import { Router } from "express";
import { z } from "zod";
import type { AuctionEngine } from "../logic/auction.js";
import { requireAdmin } from "../auth/middleware.js";
import { asyncRoute, idOf, operatorOf } from "./helpers.js";

const pricingModeSchema = z.enum(["PAY_AS_BID", "UNIFORM_PRICE"]).nullable();

const createSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  description: z.string().optional(),
  limitation: z.string().optional(),
  motif: z.string().optional(),
  starting_bid: z.number().int().positive(),
  min_increment: z.number().int().positive(),
  quantity_total: z.number().int().positive(),
  pricing_mode: pricingModeSchema.optional(),
});

const updateSchema = createSchema.partial().extend({
  order_index: z.number().int().optional(),
});

const winnerSchema = z.object({
  teamId: z.string().min(1),
  amount: z.number().int().positive(),
});

const resultsSchema = z.object({
  winners: z.array(winnerSchema).min(1),
  note: z.string().optional(),
  requestId: z.string().optional(),
  expectedVersion: z.number().int().optional(),
});

export function lotsRouter(engine: AuctionEngine) {
  const router = Router();
  router.use(requireAdmin);

  router.get("/", asyncRoute(() => engine.listLots()));
  router.get("/:id", asyncRoute((req) => engine.getLot(idOf(req))));

  router.post(
    "/",
    asyncRoute((req) => engine.createLot(createSchema.parse(req.body), operatorOf(req)))
  );

  router.patch(
    "/:id",
    asyncRoute((req) => engine.updateLot(idOf(req), updateSchema.parse(req.body), operatorOf(req)))
  );

  router.post("/:id/reveal", asyncRoute((req) => engine.revealLot(idOf(req), operatorOf(req))));
  router.post("/:id/start-live", asyncRoute((req) => engine.startLive(idOf(req), operatorOf(req))));
  router.post("/:id/unsold", asyncRoute((req) => engine.markUnsold(idOf(req), operatorOf(req))));

  router.post(
    "/:id/bid",
    asyncRoute(async (req) => {
      const body = z.object({ teamId: z.string(), amount: z.number().int().positive() }).parse(req.body);
      await engine.recordBid(idOf(req), body.teamId, body.amount, operatorOf(req));
      return engine.getLot(idOf(req));
    })
  );

  router.post(
    "/:id/results",
    asyncRoute((req) => {
      const body = resultsSchema.parse(req.body);
      return engine.confirmLotResults({
        lotId: idOf(req),
        winners: body.winners,
        note: body.note,
        operator: operatorOf(req),
        requestId: body.requestId,
        expectedVersion: body.expectedVersion,
      });
    })
  );

  router.post("/advance", asyncRoute((req) => engine.advanceToNext(operatorOf(req))));

  return router;
}
