export interface BuildText {
  kicker: string;
  headline: string;
  tagline: string;
  message: string;
}

export const DEFAULT_BUILD_TEXT: BuildText = {
  kicker: "The auction is over",
  headline: "Time to build",
  tagline: "Solve it with what you won.",
  message: "Good luck, teams. Your time starts now.",
};

/** Lead-in before the preparation timer starts when the operator chooses "Begin Countdown" (3, 2, 1). */
export const COUNTDOWN_LEAD_MS = 2400;

export const BUILD_TEXT_FIELDS = ["kicker", "headline", "tagline", "message"] as const;

/** The stored text, or the defaults for anything missing. */
export function parseBuildText(raw: string | null | undefined): BuildText {
  if (!raw) return DEFAULT_BUILD_TEXT;
  try {
    const parsed = JSON.parse(raw);
    const out = { ...DEFAULT_BUILD_TEXT };
    for (const f of BUILD_TEXT_FIELDS) if (typeof parsed?.[f] === "string" && parsed[f].trim()) out[f] = parsed[f];
    return out;
  } catch {
    return DEFAULT_BUILD_TEXT;
  }
}
