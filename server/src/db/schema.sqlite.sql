-- TECH AUCTION schema (SQLite dialect). Whole rupees only, stored as integers (never float).
-- created_at/corrected_at have no SQL-level default — the app always supplies an explicit
-- ISO timestamp, so this file stays portable to the Postgres dialect (see schema.pg.sql).

CREATE TABLE IF NOT EXISTS event_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  version INTEGER NOT NULL DEFAULT 0,
  event_name TEXT NOT NULL DEFAULT 'TECH AUCTION',
  tagline TEXT NOT NULL DEFAULT 'Bid. Build. Solve.',
  starting_wallet INTEGER NOT NULL DEFAULT 10000,
  default_starting_bid INTEGER NOT NULL DEFAULT 1500,
  default_min_increment INTEGER NOT NULL DEFAULT 250,
  bid_mode TEXT NOT NULL DEFAULT 'sale_only' CHECK (bid_mode IN ('sale_only','live_tracking')),
  status TEXT NOT NULL DEFAULT 'setup' CHECK (status IN ('setup','ready','live','paused','completed')),
  current_lot_id TEXT,
  display_state TEXT NOT NULL DEFAULT 'opening' CHECK (display_state IN ('opening','event_flow','ready','reveal','live','sold','unsold','summary','build_start')),
  sound_enabled INTEGER NOT NULL DEFAULT 1,
  last_lot_result_id TEXT,
  winners_per_lot INTEGER NOT NULL DEFAULT 3,
  pricing_mode TEXT NOT NULL DEFAULT 'UNIFORM_PRICE' CHECK (pricing_mode IN ('PAY_AS_BID','UNIFORM_PRICE')),
  allow_fewer_winners INTEGER NOT NULL DEFAULT 1,
  block_repeat_winner INTEGER NOT NULL DEFAULT 0,
  max_tech_per_team INTEGER NOT NULL DEFAULT 2,
  pitch_seconds INTEGER NOT NULL DEFAULT 45,
  flow_step INTEGER NOT NULL DEFAULT 0,
  flow_replay INTEGER NOT NULL DEFAULT 0,
  flow_steps TEXT NOT NULL DEFAULT '',
  prep_minutes INTEGER NOT NULL DEFAULT 23,
  prep_started_at TEXT,
  build_replay INTEGER NOT NULL DEFAULT 0,
  build_text TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  initial_balance INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS lots (
  id TEXT PRIMARY KEY,
  order_index INTEGER NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  limitation TEXT NOT NULL DEFAULT '',
  motif TEXT NOT NULL DEFAULT 'generic',
  starting_bid INTEGER NOT NULL,
  min_increment INTEGER NOT NULL,
  quantity_total INTEGER NOT NULL DEFAULT 1,
  quantity_remaining INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','revealed','live','sold','partially_sold','unsold')),
  current_bid INTEGER,
  current_leading_team TEXT,
  pricing_mode TEXT CHECK (pricing_mode IS NULL OR pricing_mode IN ('PAY_AS_BID','UNIFORM_PRICE'))
);

-- A lot_result groups the set of winners the operator confirms for one lot in one action
-- (one physical auction round can crown up to N winners at once; N = lot.quantity_remaining at confirm time).
CREATE TABLE IF NOT EXISTS lot_results (
  id TEXT PRIMARY KEY,
  lot_id TEXT NOT NULL REFERENCES lots(id),
  pricing_mode TEXT NOT NULL CHECK (pricing_mode IN ('PAY_AS_BID','UNIFORM_PRICE')),
  note TEXT,
  operator TEXT NOT NULL DEFAULT 'operator',
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','corrected')),
  correction_reason TEXT,
  corrected_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  lot_id TEXT NOT NULL REFERENCES lots(id),
  team_id TEXT NOT NULL REFERENCES teams(id),
  amount INTEGER NOT NULL,
  bid_amount INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  rank INTEGER,
  lot_result_id TEXT REFERENCES lot_results(id),
  operator TEXT NOT NULL DEFAULT 'operator',
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','corrected')),
  correction_reason TEXT,
  corrected_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams(id),
  type TEXT NOT NULL CHECK (type IN ('debit','credit')),
  amount INTEGER NOT NULL,
  sale_id TEXT REFERENCES sales(id),
  reason TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  operator TEXT NOT NULL DEFAULT 'operator',
  action TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

INSERT INTO event_settings (id, version) VALUES (1, 0) ON CONFLICT (id) DO NOTHING;
