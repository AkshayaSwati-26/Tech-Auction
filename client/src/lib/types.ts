export type BidMode = "sale_only" | "live_tracking";
export type PricingMode = "PAY_AS_BID" | "UNIFORM_PRICE";
export type EventStatus = "setup" | "ready" | "live" | "paused" | "completed";
export type DisplayState = "opening" | "event_flow" | "ready" | "reveal" | "live" | "sold" | "unsold" | "summary" | "build_start";
export type LotStatus = "pending" | "revealed" | "live" | "sold" | "partially_sold" | "unsold";

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
  sound_enabled: 0 | 1;
  last_lot_result_id: string | null;
  winners_per_lot: number;
  pricing_mode: PricingMode;
  allow_fewer_winners: 0 | 1;
  block_repeat_winner: 0 | 1;
  max_tech_per_team: number;
  pitch_seconds: number;
  flow_step: number;
  flow_replay: number;
  flow_steps: string;
  prep_minutes: number;
  prep_started_at: string | null;
  build_replay: number;
  build_text: string;
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

export interface TeamWithWallet {
  id: string;
  name: string;
  initial_balance: number;
  spent: number;
  remaining: number;
  purchases: number;
  techs: number;
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

export interface LotResultView {
  id: string;
  lot_id: string;
  lot_name: string;
  pricing_mode: PricingMode;
  note: string | null;
  operator: string;
  status: "confirmed" | "corrected";
  correction_reason: string | null;
  corrected_at: string | null;
  created_at: string;
  winners: WinnerView[];
}

export interface SaleHistoryRow {
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
  team_name: string;
  lot_name: string;
  result_pricing_mode: PricingMode | null;
  result_note: string | null;
  result_status: "confirmed" | "corrected" | null;
}

export interface FlowStep {
  kicker: string;
  heading: string;
  text: string;
}

export interface FlowState {
  /** 0 = no card spotlighted, 1..5 = that step. */
  step: number;
  replay: number;
  /** Text with placeholders already filled from the live settings. */
  steps: FlowStep[];
  /** The editable templates, placeholders intact. */
  templates: FlowStep[];
}

export interface BuildText {
  kicker: string;
  headline: string;
  tagline: string;
  message: string;
}

export interface BuildState {
  replay: number;
  text: BuildText;
  prepMinutes: number;
  pitchSeconds: number;
  /** ISO time the preparation timer starts or started; null until the operator starts it. */
  startedAt: string | null;
  endsAt: string | null;
  twistAt: string | null;
}

export interface FullState {
  settings: EventSettings;
  teams: TeamWithWallet[];
  lots: Lot[];
  currentLot: Lot | null;
  lastResult: LotResultView | null;
  flow: FlowState;
  build: BuildState;
  /** Server clock when this state was produced. */
  serverTime: string;
}

export interface ApiError {
  ok: false;
  code: string;
  error: string;
}
