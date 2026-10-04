export type BidMode = "sale_only" | "live_tracking";
export type PricingMode = "PAY_AS_BID" | "UNIFORM_PRICE";
export type EventStatus = "setup" | "ready" | "live" | "paused" | "completed";
export type DisplayState = "opening" | "event_flow" | "ready" | "reveal" | "live" | "sold" | "unsold" | "summary" | "build_start";
export type LotStatus = "pending" | "revealed" | "live" | "sold" | "partially_sold" | "unsold";

export interface Team {
  id: string;
  name: string;
  initial_balance: number;
}

export interface Lot {
  id: string;
  order_index: number;
  name: string;
  category: string;
  description: string;
  limitation: string;
  motif: string;
  starting_bid: number;
  min_increment: number;
  quantity_total: number;
  quantity_remaining: number;
  status: LotStatus;
  current_bid: number | null;
  current_leading_team: string | null;
  pricing_mode: PricingMode | null;
}

export interface Sale {
  id: string;
  lot_id: string;
  team_id: string;
  amount: number;
  bid_amount: number;
  quantity: number;
  rank: number | null;
  lot_result_id: string | null;
  operator: string;
  status: "confirmed" | "corrected";
  correction_reason: string | null;
  corrected_at: string | null;
  created_at: string;
}

export interface LotResult {
  id: string;
  lot_id: string;
  pricing_mode: PricingMode;
  note: string | null;
  operator: string;
  status: "confirmed" | "corrected";
  correction_reason: string | null;
  corrected_at: string | null;
  created_at: string;
}

export interface WinnerView {
  sale_id: string;
  rank: number;
  team_id: string;
  team_name: string;
  bid_amount: number;
  amount: number;
  status: "confirmed" | "corrected";
}

export interface LotResultView extends LotResult {
  lot_name: string;
  winners: WinnerView[];
}

export interface WalletTransaction {
  id: string;
  team_id: string;
  type: "debit" | "credit";
  amount: number;
  sale_id: string | null;
  reason: string;
  created_at: string;
}

export interface AuditEntry {
  id: string;
  operator: string;
  action: string;
  details: string;
  created_at: string;
}

export interface EventSettings {
  id: 1;
  version: number;
  event_name: string;
  tagline: string;
  starting_wallet: number;
  default_starting_bid: number;
  default_min_increment: number;
  bid_mode: BidMode;
  status: EventStatus;
  current_lot_id: string | null;
  display_state: DisplayState;
  sound_enabled: number;
  last_lot_result_id: string | null;
  winners_per_lot: number;
  pricing_mode: PricingMode;
  allow_fewer_winners: number;
  block_repeat_winner: number;
  max_tech_per_team: number;
  pitch_seconds: number;
  /** Spotlighted Event Flow card: 0 = none, 1..5 = that step. */
  flow_step: number;
  /** Bumped by "Replay animation" so displays re-run the entrance. */
  flow_replay: number;
  /** JSON array of { kicker, heading, text } templates; empty = defaults. */
  flow_steps: string;
  /** Total preparation time, in minutes. */
  prep_minutes: number;
  /** ISO time the preparation timer starts (may be a few seconds ahead during the 3-2-1). Null = not started. */
  prep_started_at: string | null;
  build_replay: number;
  /** JSON { kicker, headline, tagline, message }; empty = defaults. */
  build_text: string;
}

export interface TeamWithWallet extends Team {
  spent: number;
  remaining: number;
  purchases: number;
  /** Distinct technologies this team currently owns (confirmed sales only). */
  techs: number;
}

export interface FullState {
  settings: EventSettings;
  teams: TeamWithWallet[];
  lots: Lot[];
  currentLot: Lot | null;
  lastResult: LotResultView | null;
  build: {
    replay: number;
    text: { kicker: string; headline: string; tagline: string; message: string };
    prepMinutes: number;
    pitchSeconds: number;
    /** When the timer starts or started (ISO), or null. */
    startedAt: string | null;
    /** When it ends (ISO), or null. */
    endsAt: string | null;
    /** The midpoint twist marker (ISO), or null. */
    twistAt: string | null;
  };
  /** Server clock at the moment this state was produced, so clients can correct for clock skew. */
  serverTime: string;
  flow: { step: number; replay: number; steps: Array<{ kicker: string; heading: string; text: string }>; templates: Array<{ kicker: string; heading: string; text: string }> };
}
