import { createDb } from "../db/index.js";
import { AuctionEngine } from "./auction.js";
import { nanoid } from "nanoid";
import type { DbAdapter } from "../db/types.js";

export async function makeEngine(databaseUrl?: string) {
  const db = await createDb(databaseUrl ? { databaseUrl } : { sqlitePath: ":memory:" });
  if (databaseUrl) {
    // Postgres has no ":memory:" equivalent — every test shares one database, so each
    // run starts by wiping it clean instead of relying on process-level isolation.
    await db.exec("TRUNCATE teams, lots, lot_results, sales, wallet_transactions, audit_log, event_settings CASCADE");
    await db.exec("INSERT INTO event_settings (id, version) VALUES (1, 0)");
  }
  const events: Array<{ event: string; payload: unknown }> = [];
  const engine = new AuctionEngine(db, (event, payload) => events.push({ event, payload }));
  return { db, engine, events };
}

/** Seeds N teams (T01, T02, ...) each with the given balance, and returns their ids. */
export async function seedTeams(db: DbAdapter, count: number, balance = 10000): Promise<string[]> {
  const ids: string[] = [];
  for (let i = 1; i <= count; i++) {
    const id = `T${String(i).padStart(2, "0")}`;
    await db.run("INSERT INTO teams (id, name, initial_balance) VALUES (?, ?, ?)", [id, `Team ${id}`, balance]);
    ids.push(id);
  }
  return ids;
}

export async function seedLot(
  db: DbAdapter,
  overrides: Partial<{
    name: string;
    starting_bid: number;
    min_increment: number;
    quantity_total: number;
    pricing_mode: string | null;
  }> = {}
): Promise<string> {
  const id = nanoid(10);
  const o = {
    name: "Test Lot",
    starting_bid: 1500,
    min_increment: 250,
    quantity_total: 3,
    pricing_mode: null as string | null,
    ...overrides,
  };
  await db.run(
    `INSERT INTO lots (id, order_index, name, category, description, motif, starting_bid, min_increment, quantity_total, quantity_remaining, status, pricing_mode)
     VALUES (?, 0, ?, 'Test', '', 'generic', ?, ?, ?, ?, 'revealed', ?)`,
    [id, o.name, o.starting_bid, o.min_increment, o.quantity_total, o.quantity_total, o.pricing_mode]
  );
  return id;
}
