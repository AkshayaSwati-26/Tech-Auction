import jwt from "jsonwebtoken";

const INSECURE_DEFAULT = "dev-insecure-secret-change-me";

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) {
    if (process.env.NODE_ENV === "production") {
      // Fail loud rather than silently signing admin sessions with a guessable secret in prod.
      throw new Error("SESSION_SECRET must be set in production");
    }
    return INSECURE_DEFAULT;
  }
  return s;
}

const SESSION_HOURS = 12;

export function signAdminToken(): string {
  return jwt.sign({ role: "admin" }, secret(), { expiresIn: `${SESSION_HOURS}h` });
}

export function verifyAdminToken(token: string): boolean {
  try {
    const payload = jwt.verify(token, secret()) as { role?: string };
    return payload.role === "admin";
  } catch {
    return false;
  }
}
