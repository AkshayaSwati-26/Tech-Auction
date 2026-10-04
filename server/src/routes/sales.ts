import { Router } from "express";
import { z } from "zod";
import type { AuctionEngine } from "../logic/auction.js";
import { requireAdmin } from "../auth/middleware.js";
import { asyncRoute, idOf, operatorOf } from "./helpers.js";

const correctSchema = z.object({
  reason: z.string().min(1),
});

export function salesRouter(engine: AuctionEngine) {
  const router = Router();
  router.use(requireAdmin);

  router.get("/", asyncRoute(() => engine.getHistory()));

  router.post(
    "/:id/correct",
    asyncRoute(async (req) => {
      const body = correctSchema.parse(req.body);
      await engine.correctSale(idOf(req), body.reason, operatorOf(req));
      return { corrected: idOf(req) };
    })
  );

  return router;
}
