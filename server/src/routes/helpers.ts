import type { Request, Response, NextFunction } from "express";
import { AuctionError } from "../logic/errors.js";

export function asyncRoute(fn: (req: Request, res: Response) => unknown | Promise<unknown>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await fn(req, res);
      if (!res.headersSent) res.json({ ok: true, data: result });
    } catch (err) {
      next(err);
    }
  };
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AuctionError) {
    res.status(400).json({ ok: false, code: err.code, error: err.message });
    return;
  }
  if (err instanceof Error && err.message.includes("ALLOWED_ORIGINS")) {
    // Expected, intentional rejection — not a server bug, so don't log it as one.
    res.status(403).json({ ok: false, code: "ORIGIN_NOT_ALLOWED", error: "This origin is not permitted to call this API" });
    return;
  }
  console.error(err);
  res.status(500).json({ ok: false, code: "INTERNAL_ERROR", error: "Unexpected server error" });
}

export function operatorOf(req: Request): string {
  const header = req.header("x-operator-name");
  return (header && header.trim()) || "operator";
}

export function idOf(req: Request): string {
  return String(req.params.id);
}
