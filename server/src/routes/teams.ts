import { Router } from "express";
import { z } from "zod";
import type { AuctionEngine } from "../logic/auction.js";
import { requireAdmin } from "../auth/middleware.js";
import { asyncRoute, idOf, operatorOf } from "./helpers.js";

const adjustSchema = z.object({
  amount: z.number().int().positive(),
  type: z.enum(["debit", "credit"]),
  reason: z.string().min(1),
});

export function teamsRouter(engine: AuctionEngine) {
  const router = Router();
  router.use(requireAdmin);

  router.get("/", asyncRoute(() => engine.listTeams()));
  router.get("/:id", asyncRoute((req) => engine.getTeam(idOf(req))));

  router.post(
    "/:id/adjust",
    asyncRoute(async (req) => {
      const body = adjustSchema.parse(req.body);
      await engine.adjustWallet(idOf(req), body.amount, body.type, body.reason, operatorOf(req));
      return engine.getTeam(idOf(req));
    })
  );

  return router;
}
