// Runs against SQLite (in-memory) by default. Set TEST_DATABASE_URL to also exercise
// the exact same suite against Postgres — e.g.:
//   TEST_DATABASE_URL=postgres://user:pass@localhost:5433/techauction_test npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import * as os from "node:os";
import * as path from "node:path";
import * as fs from "node:fs";
import { createDb } from "../db/index.js";
import { AuctionEngine } from "./auction.js";
import { makeEngine, seedTeams, seedLot } from "./testHarness.js";
import { seedEvent, SEED_LOTS } from "../db/seedData.js";
import { AuctionError } from "./errors.js";

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

async function balanceOf(engine: AuctionEngine, teamId: string) {
  return (await engine.getTeam(teamId)).remaining;
}

async function rejectsWith(fn: () => Promise<unknown>, code: string) {
  await assert.rejects(fn, (err: unknown) => err instanceof AuctionError && err.code === code);
}

test("confirms top-3 winners at one uniform price: 3 sales, 3 debits, correct balances, non-winners untouched", async () => {
  const { engine, db } = await makeEngine(TEST_DATABASE_URL);
  const [t1, t2, t3, t4] = await seedTeams(db, 4, 10000);
  const lotId = await seedLot(db, { starting_bid: 1500, min_increment: 250, quantity_total: 3 });

  const result = await engine.confirmLotResults({
    lotId,
    winners: [
      { teamId: t1, amount: 2500 },
      { teamId: t2, amount: 2250 },
      { teamId: t3, amount: 2000 },
    ],
    operator: "op",
  });

  assert.equal(result.winners.length, 3);
  // Uniform price is the default: bids 2,500 / 2,250 / 2,000 -> all three pay 2,000.
  assert.equal(await balanceOf(engine, t1), 8000);
  assert.equal(await balanceOf(engine, t2), 8000);
  assert.equal(await balanceOf(engine, t3), 8000);
  assert.equal(await balanceOf(engine, t4), 10000, "non-winning team must be untouched");

  const sales = await db.all<any>("SELECT * FROM sales WHERE lot_result_id = ?", [result.id]);
  assert.equal(sales.length, 3);
  assert.equal(sales.filter((s) => s.status === "confirmed").length, 3);

  const debits = await db.all("SELECT * FROM wallet_transactions WHERE type = 'debit'");
  assert.equal(debits.length, 3);

  const lot = await engine.getLot(lotId);
  assert.equal(lot.quantity_remaining, 0);
  assert.equal(lot.status, "sold");
});

test("fewer than configured winners is accepted when allow_fewer_winners is true (default)", async () => {
  const { engine, db } = await makeEngine(TEST_DATABASE_URL);
  const [t1] = await seedTeams(db, 2, 10000);
  const lotId = await seedLot(db, { quantity_total: 3 });

  const result = await engine.confirmLotResults({ lotId, winners: [{ teamId: t1, amount: 1750 }], operator: "op" });
  assert.equal(result.winners.length, 1);

  const lot = await engine.getLot(lotId);
  assert.equal(lot.quantity_remaining, 2);
  assert.equal(lot.status, "partially_sold");
});

test("fewer than remaining units is rejected when allow_fewer_winners is false", async () => {
  const { engine, db } = await makeEngine(TEST_DATABASE_URL);
  const [t1] = await seedTeams(db, 2, 10000);
  const lotId = await seedLot(db, { quantity_total: 3 });
  await engine.updateSettings({ allow_fewer_winners: 0 }, "op");

  await rejectsWith(
    () => engine.confirmLotResults({ lotId, winners: [{ teamId: t1, amount: 1750 }], operator: "op" }),
    "FEWER_WINNERS_NOT_ALLOWED"
  );
});

test("tie handling: equal amounts are allowed and order is preserved", async () => {
  const { engine, db } = await makeEngine(TEST_DATABASE_URL);
  const [t1, t2] = await seedTeams(db, 2, 10000);
  const lotId = await seedLot(db, { quantity_total: 2 });

  const result = await engine.confirmLotResults({
    lotId,
    winners: [
      { teamId: t1, amount: 2000 },
      { teamId: t2, amount: 2000 },
    ],
    operator: "op",
  });

  assert.equal(result.winners[0].rank, 1);
  assert.equal(result.winners[0].team_id, t1);
  assert.equal(result.winners[1].rank, 2);
  assert.equal(result.winners[1].team_id, t2);
});

test("same team appearing twice in one batch is rejected", async () => {
  const { engine, db } = await makeEngine(TEST_DATABASE_URL);
  const [t1] = await seedTeams(db, 1, 10000);
  const lotId = await seedLot(db, { quantity_total: 3 });

  await rejectsWith(
    () =>
      engine.confirmLotResults({
        lotId,
        winners: [
          { teamId: t1, amount: 2500 },
          { teamId: t1, amount: 2000 },
        ],
        operator: "op",
      }),
    "DUPLICATE_TEAM_IN_BATCH"
  );
});

test("ordering violation (a lower rank bidding higher than the one above) is rejected", async () => {
  const { engine, db } = await makeEngine(TEST_DATABASE_URL);
  const [t1, t2] = await seedTeams(db, 2, 10000);
  const lotId = await seedLot(db, { quantity_total: 2 });

  await rejectsWith(
    () =>
      engine.confirmLotResults({
        lotId,
        winners: [
          { teamId: t1, amount: 2000 },
          { teamId: t2, amount: 2500 },
        ],
        operator: "op",
      }),
    "ORDER_VIOLATION"
  );
});

test("one winner with insufficient funds aborts the whole batch atomically", async () => {
  const { engine, db } = await makeEngine(TEST_DATABASE_URL);
  const [t1, t2] = await seedTeams(db, 2, 10000);
  await db.run("UPDATE teams SET initial_balance = 500 WHERE id = ?", [t2]);
  const lotId = await seedLot(db, { starting_bid: 1500, quantity_total: 2 });

  await rejectsWith(
    () =>
      engine.confirmLotResults({
        lotId,
        winners: [
          { teamId: t1, amount: 2500 },
          { teamId: t2, amount: 1500 },
        ],
        operator: "op",
      }),
    "INSUFFICIENT_FUNDS"
  );

  // Nothing saved: t1's balance is untouched, no sales exist, lot inventory unchanged.
  assert.equal(await balanceOf(engine, t1), 10000);
  assert.equal(await balanceOf(engine, t2), 500);
  const sales = (await db.get<{ c: number }>("SELECT COUNT(*) as c FROM sales"))!;
  assert.equal(Number(sales.c), 0);
  const lot = await engine.getLot(lotId);
  assert.equal(lot.quantity_remaining, 2);
});

test("winners exceeding remaining units are rejected", async () => {
  const { engine, db } = await makeEngine(TEST_DATABASE_URL);
  const [t1, t2, t3] = await seedTeams(db, 3, 10000);
  const lotId = await seedLot(db, { quantity_total: 2 });

  await rejectsWith(
    () =>
      engine.confirmLotResults({
        lotId,
        winners: [
          { teamId: t1, amount: 2500 },
          { teamId: t2, amount: 2250 },
          { teamId: t3, amount: 2000 },
        ],
        operator: "op",
      }),
    "INSUFFICIENT_INVENTORY"
  );
});

test("PAY_AS_BID charges each winner their own bid", async () => {
  const { engine, db } = await makeEngine(TEST_DATABASE_URL);
  const [t1, t2] = await seedTeams(db, 2, 10000);
  const lotId = await seedLot(db, { quantity_total: 2, pricing_mode: "PAY_AS_BID" });

  const result = await engine.confirmLotResults({
    lotId,
    winners: [
      { teamId: t1, amount: 2500 },
      { teamId: t2, amount: 2000 },
    ],
    operator: "op",
  });

  assert.equal(result.winners[0].amount, 2500);
  assert.equal(result.winners[1].amount, 2000);
  assert.equal(await balanceOf(engine, t1), 7500);
  assert.equal(await balanceOf(engine, t2), 8000);
});

test("UNIFORM_PRICE charges every winner the lowest winning bid in the batch", async () => {
  const { engine, db } = await makeEngine(TEST_DATABASE_URL);
  const [t1, t2, t3] = await seedTeams(db, 3, 10000);
  const lotId = await seedLot(db, { quantity_total: 3, pricing_mode: "UNIFORM_PRICE" });

  const result = await engine.confirmLotResults({
    lotId,
    winners: [
      { teamId: t1, amount: 2500 },
      { teamId: t2, amount: 2250 },
      { teamId: t3, amount: 2000 },
    ],
    operator: "op",
  });

  // Worked example: bids 2,500 / 2,250 / 2,000 -> everyone pays the lowest winning bid, 2,000.
  for (const w of result.winners) {
    assert.equal(w.amount, 2000, "charged amount");
  }
  assert.equal(result.winners[0].bid_amount, 2500, "bid amount is still recorded per winner");
  assert.equal(await balanceOf(engine, t1), 8000);
  assert.equal(await balanceOf(engine, t2), 8000);
  assert.equal(await balanceOf(engine, t3), 8000);
});

test("whole-lot correction restores all wallets and inventory, keeps the original rows", async () => {
  const { engine, db } = await makeEngine(TEST_DATABASE_URL);
  const [t1, t2] = await seedTeams(db, 2, 10000);
  const lotId = await seedLot(db, { quantity_total: 2 });

  const result = await engine.confirmLotResults({
    lotId,
    winners: [
      { teamId: t1, amount: 2500 },
      { teamId: t2, amount: 2250 },
    ],
    operator: "op",
  });

  await engine.correctLotResult(result.id, "operator mis-recorded both teams", "op2");

  assert.equal(await balanceOf(engine, t1), 10000);
  assert.equal(await balanceOf(engine, t2), 10000);
  const lot = await engine.getLot(lotId);
  assert.equal(lot.quantity_remaining, 2);
  assert.equal(lot.status, "revealed");

  const sales = await db.all<any>("SELECT * FROM sales WHERE lot_result_id = ?", [result.id]);
  assert.equal(sales.length, 2, "original sale rows are kept, not deleted");
  assert.ok(sales.every((s) => s.status === "corrected"));

  const resultRow = await db.get<any>("SELECT * FROM lot_results WHERE id = ?", [result.id]);
  assert.equal(resultRow.status, "corrected");
  assert.equal(resultRow.correction_reason, "operator mis-recorded both teams");
});

test("single-row correction only restores that one winner", async () => {
  const { engine, db } = await makeEngine(TEST_DATABASE_URL);
  const [t1, t2] = await seedTeams(db, 2, 10000);
  const lotId = await seedLot(db, { quantity_total: 2 });

  const result = await engine.confirmLotResults({
    lotId,
    winners: [
      { teamId: t1, amount: 2500 },
      { teamId: t2, amount: 2250 },
    ],
    operator: "op",
  });

  const saleToCorrect = result.winners[0].sale_id;
  await engine.correctSale(saleToCorrect, "wrong team for rank 1", "op2");

  assert.equal(await balanceOf(engine, t1), 10000, "corrected winner restored");
  assert.equal(await balanceOf(engine, t2), 7750, "other winner untouched (uniform price 2,250)");

  const lot = await engine.getLot(lotId);
  assert.equal(lot.quantity_remaining, 1, "one unit restored");

  const resultRow = await db.get<any>("SELECT * FROM lot_results WHERE id = ?", [result.id]);
  assert.equal(resultRow.status, "confirmed", "the batch itself is not marked corrected");
});

test("duplicate submission via the same requestId is blocked", async () => {
  const { engine, db } = await makeEngine(TEST_DATABASE_URL);
  const [t1] = await seedTeams(db, 1, 10000);
  const lotId = await seedLot(db, { quantity_total: 3 });

  await engine.confirmLotResults({ lotId, winners: [{ teamId: t1, amount: 1750 }], operator: "op", requestId: "req-1" });

  await rejectsWith(
    () => engine.confirmLotResults({ lotId, winners: [{ teamId: t1, amount: 1750 }], operator: "op", requestId: "req-1" }),
    "DUPLICATE_REQUEST"
  );
});

test(
  "restart persistence: reopening the same file-backed database preserves confirmed sales",
  { skip: Boolean(TEST_DATABASE_URL) && "SQLite-file-specific; Postgres persistence is the server/DB's job, not this app's" },
  async () => {
    const file = path.join(os.tmpdir(), `tech-auction-test-${Date.now()}.db`);

    try {
      const db1 = await createDb({ sqlitePath: file });
      const events1: Array<{ event: string; payload: unknown }> = [];
      const engine1 = new AuctionEngine(db1, (event, payload) => events1.push({ event, payload }));
      await seedTeams(db1, 1, 10000);
      const lotId = await seedLot(db1, { quantity_total: 1 });
      const result = await engine1.confirmLotResults({
        lotId,
        winners: [{ teamId: "T01", amount: 1750 }],
        operator: "op",
      });
      await db1.close();

      const db2 = await createDb({ sqlitePath: file });
      const events2: Array<{ event: string; payload: unknown }> = [];
      const engine2 = new AuctionEngine(db2, (event, payload) => events2.push({ event, payload }));
      const reopened = await engine2.getLotResultView(result.id);
      assert.equal(reopened.winners.length, 1);
      assert.equal(reopened.winners[0].team_id, "T01");
      assert.equal(await balanceOf(engine2, "T01"), 8250);
      await db2.close();
    } finally {
      fs.rmSync(file, { force: true });
      fs.rmSync(`${file}-wal`, { force: true });
      fs.rmSync(`${file}-shm`, { force: true });
    }
  }
);

test("sale:confirmed broadcast carries the full ordered winners array, no private fields", async () => {
  const { engine, db, events } = await makeEngine(TEST_DATABASE_URL);
  const [t1, t2] = await seedTeams(db, 2, 10000);
  const lotId = await seedLot(db, { quantity_total: 2 });

  await engine.confirmLotResults({
    lotId,
    winners: [
      { teamId: t1, amount: 2500 },
      { teamId: t2, amount: 2250 },
    ],
    operator: "op",
  });

  const confirmedEvent = events.find((e) => e.event === "sale:confirmed");
  assert.ok(confirmedEvent, "sale:confirmed must be broadcast");
  const payload = confirmedEvent!.payload as any;
  assert.equal(payload.winners.length, 2);
  assert.equal(payload.winners[0].rank, 1);
  assert.equal(payload.winners[0].team_id, t1);
  assert.equal(payload.winners[1].rank, 2);
  assert.ok(!("operator" in payload), "broadcast payload should not leak the operator's name");
});

test("audit trail records the full multi-winner result in one entry", async () => {
  const { engine, db } = await makeEngine(TEST_DATABASE_URL);
  const [t1, t2] = await seedTeams(db, 2, 10000);
  const lotId = await seedLot(db, { quantity_total: 2 });

  await engine.confirmLotResults({
    lotId,
    winners: [
      { teamId: t1, amount: 2500 },
      { teamId: t2, amount: 2250 },
    ],
    operator: "head-judge",
  });

  const audit = (await engine.getAuditLog()) as any[];
  const entry = audit.find((a) => a.action === "lot_result:confirm");
  assert.ok(entry);
  assert.equal(entry.operator, "head-judge");
  const details = JSON.parse(entry.details);
  assert.equal(details.winners.length, 2);
});

test("bid amount must land on a valid increment step from the starting bid", async () => {
  const { engine, db } = await makeEngine(TEST_DATABASE_URL);
  const [t1] = await seedTeams(db, 1, 10000);
  const lotId = await seedLot(db, { starting_bid: 1500, min_increment: 250, quantity_total: 1 });

  await rejectsWith(() => engine.confirmLotResults({ lotId, winners: [{ teamId: t1, amount: 1625 }], operator: "op" }), "BELOW_INCREMENT");
});

test("bid below the starting bid is rejected", async () => {
  const { engine, db } = await makeEngine(TEST_DATABASE_URL);
  const [t1] = await seedTeams(db, 1, 10000);
  const lotId = await seedLot(db, { starting_bid: 1500, quantity_total: 1 });

  await rejectsWith(() => engine.confirmLotResults({ lotId, winners: [{ teamId: t1, amount: 1250 }], operator: "op" }), "BELOW_STARTING_BID");
});

test("unknown team in a winners list is rejected", async () => {
  const { engine, db } = await makeEngine(TEST_DATABASE_URL);
  await seedTeams(db, 1, 10000);
  const lotId = await seedLot(db, { quantity_total: 1 });

  await rejectsWith(() => engine.confirmLotResults({ lotId, winners: [{ teamId: "T99", amount: 1750 }], operator: "op" }), "UNKNOWN_TEAM");
});

test("block_repeat_winner setting rejects a team that already won this lot", async () => {
  const { engine, db } = await makeEngine(TEST_DATABASE_URL);
  const [t1, t2] = await seedTeams(db, 2, 10000);
  const lotId = await seedLot(db, { quantity_total: 3 });
  await engine.updateSettings({ block_repeat_winner: 1 }, "op");

  await engine.confirmLotResults({ lotId, winners: [{ teamId: t1, amount: 2500 }], operator: "op" });

  await rejectsWith(
    () => engine.confirmLotResults({ lotId, winners: [{ teamId: t1, amount: 2000 }], operator: "op" }),
    "REPEAT_WINNER_BLOCKED"
  );

  // A different team is unaffected.
  await engine.confirmLotResults({ lotId, winners: [{ teamId: t2, amount: 2000 }], operator: "op" });
  assert.equal(await balanceOf(engine, t2), 8000);
});

test("empty winners array is rejected in favor of Mark Unsold", async () => {
  const { engine, db } = await makeEngine(TEST_DATABASE_URL);
  const lotId = await seedLot(db, { quantity_total: 1 });

  await rejectsWith(() => engine.confirmLotResults({ lotId, winners: [], operator: "op" }), "NO_WINNERS");
});

test("updateLot persists changes to the correct row (regression: WHERE id must be bound)", async () => {
  const { engine, db } = await makeEngine(TEST_DATABASE_URL);
  const lotA = await seedLot(db, { name: "Lot A", quantity_total: 2 });
  const lotB = await seedLot(db, { name: "Lot B", quantity_total: 2 });

  const updated = await engine.updateLot(lotA, { name: "Lot A Renamed", pricing_mode: "UNIFORM_PRICE" as any }, "op");
  assert.equal(updated.name, "Lot A Renamed");
  assert.equal(updated.pricing_mode, "UNIFORM_PRICE");

  // The untouched lot must be unaffected, and re-reading from the DB must agree with the return value.
  assert.equal((await engine.getLot(lotB)).name, "Lot B");
  assert.equal((await engine.getLot(lotA)).name, "Lot A Renamed");
  assert.equal((await engine.getLot(lotA)).pricing_mode, "UNIFORM_PRICE");
});

test("createLot inserts a lot usable immediately by confirmLotResults", async () => {
  const { engine, db } = await makeEngine(TEST_DATABASE_URL);
  const [t1] = await seedTeams(db, 1, 10000);
  const lot = await engine.createLot(
    { name: "New Tech", category: "Cat", starting_bid: 1500, min_increment: 250, quantity_total: 1 },
    "op"
  );
  await engine.revealLot(lot.id, "op");
  await engine.startLive(lot.id, "op");
  const result = await engine.confirmLotResults({ lotId: lot.id, winners: [{ teamId: t1, amount: 1750 }], operator: "op" });
  assert.equal(result.winners[0].amount, 1750);
});

test("getFullState exposes lastResult with the full winners array after a confirmed result", async () => {
  const { engine, db } = await makeEngine(TEST_DATABASE_URL);
  const [t1] = await seedTeams(db, 1, 10000);
  const lotId = await seedLot(db, { quantity_total: 1 });

  const result = await engine.confirmLotResults({ lotId, winners: [{ teamId: t1, amount: 1750 }], operator: "op" });
  const state = await engine.getFullState();

  assert.ok(state.lastResult);
  assert.equal(state.lastResult!.id, result.id);
  assert.equal(state.lastResult!.winners.length, 1);
  assert.equal(state.settings.display_state, "sold");
});

test("confirmLotResults rejects a stale expectedVersion (optimistic concurrency)", async () => {
  const { engine, db } = await makeEngine(TEST_DATABASE_URL);
  const [t1] = await seedTeams(db, 1, 10000);
  const lotId = await seedLot(db, { quantity_total: 1 });

  const staleVersion = (await engine.getSettings()).version;
  await engine.updateSettings({ event_name: "Changed" }, "op"); // bumps version

  await rejectsWith(
    () => engine.confirmLotResults({ lotId, winners: [{ teamId: t1, amount: 1750 }], operator: "op", expectedVersion: staleVersion }),
    "VERSION_CONFLICT"
  );
});

// ---------- Event configuration: Rs 10,000 wallets, 12 technologies, 2-technology cap ----------

test("fresh database defaults: Rs 10,000 wallet, Rs 1,500 start, Rs 250 step, uniform price, top 3, max 2 technologies", async () => {
  const { engine } = await makeEngine(TEST_DATABASE_URL);
  const s = await engine.getSettings();
  assert.equal(s.starting_wallet, 10000);
  assert.equal(s.default_starting_bid, 1500);
  assert.equal(s.default_min_increment, 250);
  assert.equal(s.pricing_mode, "UNIFORM_PRICE");
  assert.equal(s.winners_per_lot, 3);
  assert.equal(s.max_tech_per_team, 2);
});

test("seed creates 21 teams with Rs 10,000 each and the 12 technologies with 3 slots each", async () => {
  const { engine, db } = await makeEngine(TEST_DATABASE_URL);
  await seedEvent(db);

  const teams = await engine.listTeams();
  assert.equal(teams.length, 21);
  assert.ok(teams.every((t) => t.remaining === 10000 && t.techs === 0));

  const lots = await engine.listLots();
  assert.equal(lots.length, 12);
  assert.deepEqual(lots.map((l) => l.name), SEED_LOTS.map((l) => l.name));
  assert.deepEqual(lots.map((l) => l.motif), ["sensors", "cameras", "drone", "prediction", "edge", "network", "mobile", "signage", "switching", "battery", "dashboard", "shield"]);
  assert.equal(lots.reduce((n, l) => n + l.quantity_total, 0), 36);
  assert.ok(lots.every((l) => l.quantity_total === 3 && l.quantity_remaining === 3 && l.starting_bid === 1500 && l.min_increment === 250));
  assert.ok(lots.every((l) => l.limitation.length > 0 && l.description.length > 0 && l.status === "pending"));
});

test("seed replaces existing demo lots when nothing has been sold", async () => {
  const { engine, db } = await makeEngine(TEST_DATABASE_URL);
  await seedTeams(db, 2, 1000);
  await seedLot(db, { name: "Old Demo Lot" });

  await seedEvent(db);

  const lots = await engine.listLots();
  assert.equal(lots.length, 12);
  assert.ok(!lots.some((l) => l.name === "Old Demo Lot"));
  assert.equal(await balanceOf(engine, "T01"), 10000, "an existing team is moved to the new starting wallet");
});

test("seed refuses to touch an event that already has sales", async () => {
  const { engine, db } = await makeEngine(TEST_DATABASE_URL);
  const [t1] = await seedTeams(db, 1);
  const lotId = await seedLot(db, { name: "Live Lot" });
  await engine.confirmLotResults({ lotId, winners: [{ teamId: t1, amount: 1500 }], operator: "op" });

  await rejectsWith(() => seedEvent(db), "SEED_BLOCKED");

  const lots = await engine.listLots();
  assert.equal(lots.length, 1, "lots are untouched");
  assert.equal(lots[0].name, "Live Lot");
  assert.equal(await balanceOf(engine, t1), 8500, "wallets are untouched");
});

test("seeded event: price reaches Rs 2,250 with 3 teams left, all three pay Rs 2,250", async () => {
  const { engine, db } = await makeEngine(TEST_DATABASE_URL);
  await seedEvent(db);
  const lot = (await engine.listLots())[0];
  await engine.revealLot(lot.id, "op");
  await engine.startLive(lot.id, "op");

  const result = await engine.confirmLotResults({
    lotId: lot.id,
    winners: ["T01", "T02", "T03"].map((teamId) => ({ teamId, amount: 2250 })),
    operator: "op",
  });

  assert.ok(result.winners.every((w) => w.amount === 2250));
  for (const id of ["T01", "T02", "T03"]) assert.equal(await balanceOf(engine, id), 7750);
  assert.equal(await balanceOf(engine, "T04"), 10000);
  assert.equal((await engine.getLot(lot.id)).status, "sold");
});

test("a team that already owns 2 technologies cannot win a third, and nothing is saved", async () => {
  const { engine, db } = await makeEngine(TEST_DATABASE_URL);
  const [t1, t2] = await seedTeams(db, 2);
  const lotA = await seedLot(db, { name: "A" });
  const lotB = await seedLot(db, { name: "B" });
  const lotC = await seedLot(db, { name: "C" });

  await engine.confirmLotResults({ lotId: lotA, winners: [{ teamId: t1, amount: 1500 }], operator: "op" });
  await engine.confirmLotResults({ lotId: lotB, winners: [{ teamId: t1, amount: 1500 }], operator: "op" });
  assert.equal((await engine.getTeam(t1)).techs, 2);

  await rejectsWith(
    () =>
      engine.confirmLotResults({
        lotId: lotC,
        winners: [
          { teamId: t2, amount: 1500 },
          { teamId: t1, amount: 1500 },
        ],
        operator: "op",
      }),
    "TECH_LIMIT_REACHED"
  );

  assert.equal(await balanceOf(engine, t1), 7000);
  assert.equal(await balanceOf(engine, t2), 10000, "the other winner in the rejected batch is not charged");
  assert.equal((await engine.getLot(lotC)).quantity_remaining, 3);
});

test("the technology cap follows the setting, and a correction frees a slot under the cap", async () => {
  const { engine, db } = await makeEngine(TEST_DATABASE_URL);
  const [t1] = await seedTeams(db, 1);
  const lotA = await seedLot(db, { name: "A" });
  const lotB = await seedLot(db, { name: "B" });
  await engine.updateSettings({ max_tech_per_team: 1 }, "op");

  const first = await engine.confirmLotResults({ lotId: lotA, winners: [{ teamId: t1, amount: 1500 }], operator: "op" });
  await rejectsWith(() => engine.confirmLotResults({ lotId: lotB, winners: [{ teamId: t1, amount: 1500 }], operator: "op" }), "TECH_LIMIT_REACHED");

  await engine.correctSale(first.winners[0].sale_id, "recorded against the wrong team", "op");
  assert.equal((await engine.getTeam(t1)).techs, 0);

  await engine.confirmLotResults({ lotId: lotB, winners: [{ teamId: t1, amount: 1500 }], operator: "op" });
  assert.equal(await balanceOf(engine, t1), 8500);
});

test("a lot's limitation text is stored on create and editable afterwards", async () => {
  const { engine } = await makeEngine(TEST_DATABASE_URL);
  const lot = await engine.createLot(
    { name: "New Tech", category: "Cat", limitation: "Needs power", starting_bid: 1500, min_increment: 250, quantity_total: 3 },
    "op"
  );
  assert.equal(lot.limitation, "Needs power");
  const updated = await engine.updateLot(lot.id, { limitation: "Needs power and signal" }, "op");
  assert.equal(updated.limitation, "Needs power and signal");
});

test("CSV exports label money columns as rupees", async () => {
  const { engine, db } = await makeEngine(TEST_DATABASE_URL);
  const [t1] = await seedTeams(db, 1);
  const lotId = await seedLot(db);
  await engine.confirmLotResults({ lotId, winners: [{ teamId: t1, amount: 1750 }], operator: "op" });

  const sales = await engine.exportSalesCsv();
  assert.match(sales.split("\n")[0], /bid_amount_inr,amount_charged_inr/);
  assert.match(sales, /"1750","1750"/);

  const wallets = await engine.exportWalletsCsv();
  assert.equal(wallets.split("\n")[0], "team_id,name,initial_balance_inr,spent_inr,remaining_inr,purchases,technologies_owned");
  assert.equal(wallets.split("\n")[1], "T01,Team T01,10000,1750,8250,1,1");
});

// ---------- Event Flow ----------

test("Start Event moves the display to EVENT_FLOW and the public display receives it", async () => {
  const { engine, events } = await makeEngine(TEST_DATABASE_URL);
  assert.equal((await engine.getSettings()).display_state, "opening");

  await engine.startEventFlow("op");

  const settings = await engine.getSettings();
  assert.equal(settings.display_state, "event_flow");
  assert.equal(settings.status, "live");
  assert.equal(settings.flow_step, 0);

  const broadcast = events.filter((e) => e.event === "event:state").pop();
  assert.ok(broadcast, "event:state must be broadcast");
  const publicState = engine.toPublicState(broadcast!.payload as any) as any;
  assert.equal(publicState.settings.display_state, "event_flow");
  assert.equal(publicState.flow.step, 0);
  assert.equal(publicState.flow.steps.length, 5);
});

test("the flow step is clamped to 0..5 and survives a refresh (re-read from the database)", async () => {
  const { engine } = await makeEngine(TEST_DATABASE_URL);
  await engine.startEventFlow("op");

  assert.equal(await engine.setFlowStep(3, "op"), 3);
  assert.equal((await engine.getFullState()).flow.step, 3, "a refreshed display resumes on step 3");
  assert.equal(await engine.setFlowStep(9, "op"), 5);
  assert.equal(await engine.setFlowStep(-2, "op"), 0);
});

test(
  "the flow state and step persist across a restart",
  { skip: Boolean(TEST_DATABASE_URL) && "SQLite-file-specific" },
  async () => {
    const file = path.join(os.tmpdir(), `tech-auction-flow-${Date.now()}.db`);
    try {
      const db1 = await createDb({ sqlitePath: file });
      const engine1 = new AuctionEngine(db1, () => {});
      await engine1.startEventFlow("op");
      await engine1.setFlowStep(4, "op");
      await db1.close();

      const db2 = await createDb({ sqlitePath: file });
      const engine2 = new AuctionEngine(db2, () => {});
      const state = await engine2.getFullState();
      assert.equal(state.settings.display_state, "event_flow");
      assert.equal(state.flow.step, 4);
      await db2.close();
    } finally {
      fs.rmSync(file, { force: true });
      fs.rmSync(`${file}-wal`, { force: true });
      fs.rmSync(`${file}-shm`, { force: true });
    }
  }
);

test("Replay bumps the replay counter and clears the spotlight", async () => {
  const { engine } = await makeEngine(TEST_DATABASE_URL);
  await engine.startEventFlow("op");
  await engine.setFlowStep(2, "op");
  const before = (await engine.getFullState()).flow.replay;

  await engine.replayFlow("op");

  const flow = (await engine.getFullState()).flow;
  assert.equal(flow.replay, before + 1);
  assert.equal(flow.step, 0);
});

test("Continue to Auction moves to the Ready screen on the first open lot", async () => {
  const { engine, db } = await makeEngine(TEST_DATABASE_URL);
  await seedEvent(db);
  await engine.startEventFlow("op");
  await engine.setFlowStep(5, "op");

  await engine.continueFromFlow("op");

  const state = await engine.getFullState();
  assert.equal(state.settings.display_state, "ready");
  assert.equal(state.currentLot?.name, SEED_LOTS[0].name);
  assert.equal(state.flow.step, 0);
});

test("flow text placeholders render the real settings, and follow them when they change", async () => {
  const { engine, db } = await makeEngine(TEST_DATABASE_URL);
  await seedEvent(db);

  let steps = (await engine.getFullState()).flow.steps;
  assert.match(steps[0].text, /Discover the 12 technologies/);
  assert.match(steps[1].text, /Start with \u20b910,000\./);
  assert.match(steps[1].text, /The last 3 teams win/);
  assert.match(steps[1].text, /Max 2 technologies per team/);
  assert.match(steps[4].text, /45 seconds per team/);
  assert.ok(!steps.some((s) => /[{}]/.test(s.text)), "no placeholder is left unfilled");

  await engine.updateSettings({ starting_wallet: 12500, winners_per_lot: 2, max_tech_per_team: 3, pitch_seconds: 60 }, "op");

  steps = (await engine.getFullState()).flow.steps;
  assert.match(steps[1].text, /Start with \u20b912,500\./);
  assert.match(steps[1].text, /The last 2 teams win/);
  assert.match(steps[1].text, /Max 3 technologies per team/);
  assert.match(steps[4].text, /60 seconds per team/);
});

test("kicker, heading and text are editable, persist, and still fill placeholders", async () => {
  const { engine } = await makeEngine(TEST_DATABASE_URL);
  const defaults = (await engine.getFullState()).flow.steps;
  assert.equal(defaults[2].kicker, "The problem revealed");
  assert.equal(defaults[2].heading, "Crack the challenge");

  const edited = defaults.map((s) => ({ ...s }));
  edited[0] = { kicker: "Look around", heading: "Meet the tools", text: "Budget: {startingWallet}." };
  await engine.updateFlowSteps(edited, "op");

  const steps = (await engine.getFullState()).flow.steps;
  assert.equal(steps[0].kicker, "Look around");
  assert.equal(steps[0].heading, "Meet the tools");
  assert.equal(steps[0].text, "Budget: \u20b910,000.");
  assert.equal(steps[4].heading, "Pitch & present", "untouched steps keep their copy");

  await rejectsWith(() => engine.updateFlowSteps(edited.slice(0, 4), "op"), "INVALID_FLOW_STEPS");
  await rejectsWith(() => engine.updateFlowSteps(edited.map((s, i) => (i === 1 ? { ...s, heading: " " } : s)), "op"), "INVALID_FLOW_STEPS");
});

test(
  "an existing database created before EVENT_FLOW existed is migrated in place",
  { skip: Boolean(TEST_DATABASE_URL) && "SQLite-file-specific" },
  async () => {
    const file = path.join(os.tmpdir(), `tech-auction-oldschema-${Date.now()}.db`);
    try {
      const db1 = await createDb({ sqlitePath: file });
      await db1.run("UPDATE event_settings SET event_name = 'Kept Name', starting_wallet = 7000 WHERE id = 1");
      // Recreate the old constraint, as a database from the previous version would have it.
      await db1.exec(`ALTER TABLE event_settings RENAME TO es_tmp;
        CREATE TABLE event_settings AS SELECT * FROM es_tmp;
        DROP TABLE es_tmp;`);
      await db1.exec(`ALTER TABLE event_settings RENAME TO es_tmp;
        CREATE TABLE event_settings (id INTEGER PRIMARY KEY CHECK (id = 1), version INTEGER NOT NULL DEFAULT 0, event_name TEXT NOT NULL DEFAULT 'X',
          starting_wallet INTEGER NOT NULL DEFAULT 1000,
          display_state TEXT NOT NULL DEFAULT 'opening' CHECK (display_state IN ('opening','ready','reveal','live','sold','unsold','summary')));
        INSERT INTO event_settings (id, version, event_name, starting_wallet, display_state) SELECT id, version, event_name, starting_wallet, display_state FROM es_tmp;
        DROP TABLE es_tmp;`);
      await db1.close();

      const db2 = await createDb({ sqlitePath: file });
      const engine = new AuctionEngine(db2, () => {});
      await engine.startEventFlow("op");
      const settings = await engine.getSettings();
      assert.equal(settings.display_state, "event_flow");
      assert.equal(settings.event_name, "Kept Name", "existing settings survive the rebuild");
      assert.equal(settings.starting_wallet, 7000);
      await db2.close();
    } finally {
      fs.rmSync(file, { force: true });
      fs.rmSync(`${file}-wal`, { force: true });
      fs.rmSync(`${file}-shm`, { force: true });
    }
  }
);

// ---------- Build phase ----------

test("Proceed to Build Phase moves the display from Summary to BUILD_START and the display receives it", async () => {
  const { engine, events } = await makeEngine(TEST_DATABASE_URL);
  await engine.completeEvent("op");
  assert.equal((await engine.getSettings()).display_state, "summary");

  await engine.proceedToBuild("op");

  assert.equal((await engine.getSettings()).display_state, "build_start");
  const broadcast = events.filter((e) => e.event === "event:state").pop();
  const publicState = engine.toPublicState(broadcast!.payload as any) as any;
  assert.equal(publicState.settings.display_state, "build_start");
  assert.equal(publicState.build.startedAt, null, "the timer does not start on its own");
  assert.equal(publicState.build.prepMinutes, 23);
  assert.ok(publicState.serverTime);

  await engine.backToSummary("op");
  assert.equal((await engine.getSettings()).display_state, "summary");
});

test("starting the timer stores one server timestamp; a refresh derives the same end and twist times", async () => {
  const { engine } = await makeEngine(TEST_DATABASE_URL);
  await engine.proceedToBuild("op");

  const before = Date.now();
  const startedAt = await engine.startPrepTimer({ countdown: false, operator: "op" });
  assert.ok(Math.abs(Date.parse(startedAt) - before) < 2000);

  const a = (await engine.getFullState()).build;
  const b = (await engine.getFullState()).build;
  assert.equal(a.startedAt, startedAt);
  assert.deepEqual([a.startedAt, a.endsAt, a.twistAt], [b.startedAt, b.endsAt, b.twistAt], "a refreshed display sees the same times");
  assert.equal(Date.parse(a.endsAt!) - Date.parse(a.startedAt!), 23 * 60_000);
  assert.equal(Date.parse(a.twistAt!) - Date.parse(a.startedAt!), 11.5 * 60_000, "the twist marker sits at the midpoint");

  await rejectsWith(() => engine.startPrepTimer({ countdown: false, operator: "op" }), "TIMER_ALREADY_STARTED");
  const audit = (await engine.getAuditLog()) as any[];
  assert.ok(audit.some((x) => x.action === "build:timer_start"), "the start is audited");
});

test("Begin Countdown starts the timer a few seconds ahead so every display shows the same 3-2-1", async () => {
  const { engine } = await makeEngine(TEST_DATABASE_URL);
  const before = Date.now();
  const startedAt = await engine.startPrepTimer({ countdown: true, operator: "op" });
  const lead = Date.parse(startedAt) - before;
  assert.ok(lead >= 2400 && lead < 4000, `lead was ${lead}ms`);
});

test("the timer carries on unchanged when the display moves between screens, and can be reset", async () => {
  const { engine } = await makeEngine(TEST_DATABASE_URL);
  await engine.proceedToBuild("op");
  const startedAt = await engine.startPrepTimer({ countdown: false, operator: "op" });

  await engine.backToSummary("op");
  await engine.proceedToBuild("op");
  await engine.replayBuild("op");
  assert.equal((await engine.getFullState()).build.startedAt, startedAt, "same timer, not restarted");

  await engine.resetPrepTimer("op");
  assert.equal((await engine.getFullState()).build.startedAt, null);
});

test(
  "the build state and timer start survive a restart",
  { skip: Boolean(TEST_DATABASE_URL) && "SQLite-file-specific" },
  async () => {
    const file = path.join(os.tmpdir(), `tech-auction-build-${Date.now()}.db`);
    try {
      const db1 = await createDb({ sqlitePath: file });
      const engine1 = new AuctionEngine(db1, () => {});
      await engine1.proceedToBuild("op");
      const startedAt = await engine1.startPrepTimer({ countdown: false, operator: "op" });
      const endsAt = (await engine1.getFullState()).build.endsAt;
      await db1.close();

      const db2 = await createDb({ sqlitePath: file });
      const engine2 = new AuctionEngine(db2, () => {});
      const state = await engine2.getFullState();
      assert.equal(state.settings.display_state, "build_start");
      assert.equal(state.build.startedAt, startedAt);
      assert.equal(state.build.endsAt, endsAt);
      await db2.close();
    } finally {
      fs.rmSync(file, { force: true });
      fs.rmSync(`${file}-wal`, { force: true });
      fs.rmSync(`${file}-shm`, { force: true });
    }
  }
);

test("the build page's chips follow the real settings (prep minutes, pitch seconds)", async () => {
  const { engine } = await makeEngine(TEST_DATABASE_URL);
  let build = (await engine.getFullState()).build;
  assert.equal(build.prepMinutes, 23);
  assert.equal(build.pitchSeconds, 45);

  await engine.updateSettings({ prep_minutes: 30, pitch_seconds: 60 }, "op");
  build = (await engine.getFullState()).build;
  assert.equal(build.prepMinutes, 30);
  assert.equal(build.pitchSeconds, 60);

  const startedAt = await engine.startPrepTimer({ countdown: false, operator: "op" });
  build = (await engine.getFullState()).build;
  assert.equal(Date.parse(build.endsAt!) - Date.parse(startedAt), 30 * 60_000);
});

test("build phase text has defaults, is editable, and persists", async () => {
  const { engine } = await makeEngine(TEST_DATABASE_URL);
  assert.deepEqual((await engine.getFullState()).build.text, {
    kicker: "The auction is over",
    headline: "Time to build",
    tagline: "Solve it with what you won.",
    message: "Good luck, teams. Your time starts now.",
  });

  await engine.updateBuildText({ kicker: "Bidding closed", headline: "Build time", tagline: "Use what you won.", message: "Go." }, "op");
  assert.equal((await engine.getFullState()).build.text.headline, "Build time");
  assert.equal((await engine.getFullState()).build.text.message, "Go.");

  await rejectsWith(() => engine.updateBuildText({ kicker: "x", headline: " ", tagline: "y", message: "z" }, "op"), "INVALID_BUILD_TEXT");
});
