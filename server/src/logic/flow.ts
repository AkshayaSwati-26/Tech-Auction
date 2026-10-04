import type { EventSettings } from "../types.js";

export interface FlowStep {
  kicker: string;
  heading: string;
  text: string;
}

export const FLOW_STEP_COUNT = 5;

/** Default Event Flow copy. Numbers are placeholders so they can never disagree with the rules. */
export const DEFAULT_FLOW_STEPS: FlowStep[] = [
  {
    kicker: "Know your options",
    heading: "Explore the tech",
    text: "Discover the {lotCount} technologies on offer: what each can do, and where it falls short.",
  },
  {
    kicker: "Win your tools",
    heading: "Bid & acquire",
    text: "Start with {startingWallet}. Raise your card to stay in. The last {winnersPerLot} teams win and pay the same price. Max {maxTechPerTeam} technologies per team.",
  },
  {
    kicker: "The problem revealed",
    heading: "Crack the challenge",
    text: "A real-world problem is unveiled. Solve it using only the technologies you won.",
  },
  {
    kicker: "Design your answer",
    heading: "Build & prepare",
    text: "Plan your solution with your team in the time given. A twist may arrive mid-way.",
  },
  {
    kicker: "Make your case",
    heading: "Pitch & present",
    text: "Present your solution to the judges. {pitchSeconds} seconds per team, strictly timed.",
  },
];

const rupees = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

/** The stored templates, or the defaults when nothing valid has been saved. */
export function parseFlowSteps(raw: string | null | undefined): FlowStep[] {
  if (!raw) return DEFAULT_FLOW_STEPS;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length === FLOW_STEP_COUNT) {
      return parsed.map((s, i) => ({
        kicker: typeof s?.kicker === "string" ? s.kicker : DEFAULT_FLOW_STEPS[i].kicker,
        heading: typeof s?.heading === "string" ? s.heading : DEFAULT_FLOW_STEPS[i].heading,
        text: typeof s?.text === "string" ? s.text : DEFAULT_FLOW_STEPS[i].text,
      }));
    }
  } catch {
    /* fall through to the defaults */
  }
  return DEFAULT_FLOW_STEPS;
}

/** Fills {startingWallet}, {winnersPerLot}, {maxTechPerTeam}, {pitchSeconds} and {lotCount} from live settings. */
export function renderFlowSteps(settings: EventSettings, lotCount: number): FlowStep[] {
  const values: Record<string, string> = {
    startingWallet: rupees.format(settings.starting_wallet),
    winnersPerLot: String(settings.winners_per_lot),
    maxTechPerTeam: String(settings.max_tech_per_team),
    pitchSeconds: String(settings.pitch_seconds),
    lotCount: String(lotCount),
  };
  const fill = (s: string) => s.replace(/\{(\w+)\}/g, (whole, key: string) => values[key] ?? whole);
  return parseFlowSteps(settings.flow_steps).map((s) => ({ kicker: fill(s.kicker), heading: fill(s.heading), text: fill(s.text) }));
}
