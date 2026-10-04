import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { DbAdapter } from "./types.js";

const DISPLAY_STATES = "'opening','event_flow','ready','reveal','live','sold','unsold','summary','build_start'";

/**
 * The display_state CHECK constraint has to learn about new display states. Postgres can swap
 * the constraint in place. SQLite cannot alter a CHECK, so the one-row settings table is
 * rebuilt from the current schema and its row copied across.
 */
async function migrateDisplayStateCheck(db: DbAdapter) {
  if (db.kind === "postgres") {
    await db.exec(
      `ALTER TABLE event_settings DROP CONSTRAINT IF EXISTS event_settings_display_state_check;
       ALTER TABLE event_settings ADD CONSTRAINT event_settings_display_state_check CHECK (display_state IN (${DISPLAY_STATES}));`
    );
    return;
  }
  const table = await db.get<{ sql: string }>("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'event_settings'");
  if (!table || table.sql.includes("'build_start'")) return;

  const schema = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "schema.sqlite.sql"), "utf-8");
  const create = schema.match(/CREATE TABLE IF NOT EXISTS event_settings \([\s\S]*?\n\);/);
  if (!create) throw new Error("event_settings definition not found in schema.sqlite.sql");
  const oldCols = [...(await db.listColumns("event_settings"))];

  await db.exec("BEGIN");
  try {
    await db.exec("ALTER TABLE event_settings RENAME TO event_settings_old");
    await db.exec(create[0]);
    const newCols = await db.listColumns("event_settings");
    const cols = oldCols.filter((c) => newCols.has(c)).join(", ");
    await db.exec(`INSERT INTO event_settings (${cols}) SELECT ${cols} FROM event_settings_old`);
    await db.exec("DROP TABLE event_settings_old");
    await db.exec("COMMIT");
  } catch (err) {
    await db.exec("ROLLBACK");
    throw err;
  }
}

/**
 * Idempotent migration, shared by both dialects (the ALTER TABLE syntax used here happens to
 * be identical in SQLite and Postgres). Only adds columns/tables that don't exist yet, then
 * backfills the minimum needed for old rows to stay valid under the current schema. Never
 * drops or rewrites existing rows. Safe to run on every boot.
 */
export async function migrate(db: DbAdapter) {
  const eventCols = await db.listColumns("event_settings");
  const eventMigrations: Array<[string, string]> = [
    ["version", "ALTER TABLE event_settings ADD COLUMN version INTEGER NOT NULL DEFAULT 0"],
    ["winners_per_lot", "ALTER TABLE event_settings ADD COLUMN winners_per_lot INTEGER NOT NULL DEFAULT 3"],
    ["pricing_mode", "ALTER TABLE event_settings ADD COLUMN pricing_mode TEXT NOT NULL DEFAULT 'PAY_AS_BID'"],
    ["allow_fewer_winners", "ALTER TABLE event_settings ADD COLUMN allow_fewer_winners INTEGER NOT NULL DEFAULT 1"],
    ["block_repeat_winner", "ALTER TABLE event_settings ADD COLUMN block_repeat_winner INTEGER NOT NULL DEFAULT 0"],
    ["last_lot_result_id", "ALTER TABLE event_settings ADD COLUMN last_lot_result_id TEXT"],
    ["max_tech_per_team", "ALTER TABLE event_settings ADD COLUMN max_tech_per_team INTEGER NOT NULL DEFAULT 2"],
    ["pitch_seconds", "ALTER TABLE event_settings ADD COLUMN pitch_seconds INTEGER NOT NULL DEFAULT 45"],
    ["flow_step", "ALTER TABLE event_settings ADD COLUMN flow_step INTEGER NOT NULL DEFAULT 0"],
    ["flow_replay", "ALTER TABLE event_settings ADD COLUMN flow_replay INTEGER NOT NULL DEFAULT 0"],
    ["flow_steps", "ALTER TABLE event_settings ADD COLUMN flow_steps TEXT NOT NULL DEFAULT ''"],
    ["prep_minutes", "ALTER TABLE event_settings ADD COLUMN prep_minutes INTEGER NOT NULL DEFAULT 23"],
    ["prep_started_at", "ALTER TABLE event_settings ADD COLUMN prep_started_at TEXT"],
    ["build_replay", "ALTER TABLE event_settings ADD COLUMN build_replay INTEGER NOT NULL DEFAULT 0"],
    ["build_text", "ALTER TABLE event_settings ADD COLUMN build_text TEXT NOT NULL DEFAULT ''"],
  ];
  for (const [col, sql] of eventMigrations) {
    if (!eventCols.has(col)) await db.exec(sql);
  }
  await migrateDisplayStateCheck(db);

  const lotCols = await db.listColumns("lots");
  if (!lotCols.has("pricing_mode")) {
    await db.exec("ALTER TABLE lots ADD COLUMN pricing_mode TEXT");
  }

  if (!lotCols.has("limitation")) {
    await db.exec("ALTER TABLE lots ADD COLUMN limitation TEXT NOT NULL DEFAULT ''");
  }

  const saleCols = await db.listColumns("sales");
  if (!saleCols.has("bid_amount")) {
    await db.exec("ALTER TABLE sales ADD COLUMN bid_amount INTEGER");
    // Backfill: for every pre-existing sale, the bid and the charge were the same number
    // (the old single-winner model only ever charged the winner their own final bid).
    await db.exec("UPDATE sales SET bid_amount = amount WHERE bid_amount IS NULL");
  }
  if (!saleCols.has("rank")) {
    await db.exec("ALTER TABLE sales ADD COLUMN rank INTEGER");
    await db.exec("UPDATE sales SET rank = 1 WHERE rank IS NULL");
  }
  if (!saleCols.has("lot_result_id")) {
    await db.exec("ALTER TABLE sales ADD COLUMN lot_result_id TEXT REFERENCES lot_results(id)");
  }
}
