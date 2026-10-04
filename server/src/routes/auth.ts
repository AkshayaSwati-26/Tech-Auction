import { Router } from "express";
import { z } from "zod";
import { signAdminToken } from "../auth/token.js";

const loginSchema = z.object({ accessCode: z.string().min(1) });

export function authRouter() {
  const router = Router();

  router.post("/login", (req, res) => {
    const body = loginSchema.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ ok: false, code: "INVALID_BODY", error: "accessCode is required" });
      return;
    }

    const expected = process.env.ADMIN_ACCESS_CODE;
    if (!expected) {
      res.status(500).json({ ok: false, code: "SERVER_MISCONFIGURED", error: "ADMIN_ACCESS_CODE is not set on the server" });
      return;
    }

    if (body.data.accessCode !== expected) {
      res.status(401).json({ ok: false, code: "INVALID_CODE", error: "Incorrect access code" });
      return;
    }

    res.json({ ok: true, data: { token: signAdminToken() } });
  });

  return router;
}
