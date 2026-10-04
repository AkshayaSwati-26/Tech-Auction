import type { Request, Response, NextFunction } from "express";
import { verifyAdminToken } from "./token.js";

function bearerToken(req: Request): string | undefined {
  const header = req.header("authorization");
  return header?.startsWith("Bearer ") ? header.slice(7) : undefined;
}

/** Rejects every mutation/organizer-only route without a valid admin session. */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = bearerToken(req);
  if (!token || !verifyAdminToken(token)) {
    res.status(401).json({ ok: false, code: "UNAUTHORIZED", error: "A valid admin session is required" });
    return;
  }
  next();
}
