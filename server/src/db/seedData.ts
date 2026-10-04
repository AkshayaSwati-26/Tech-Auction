import { nanoid } from "nanoid";
import { AuctionError } from "../logic/errors.js";
import type { DbAdapter } from "./types.js";

export const EVENT_DEFAULTS = {
  startingWallet: 10000,
  startingBid: 1500,
  priceStep: 250,
  slotsPerLot: 3,
  maxTechPerTeam: 2,
};

export const SEED_TEAMS = Array.from({ length: 21 }, (_, i) => {
  const n = String(i + 1).padStart(2, "0");
  return { id: `T${n}`, name: `Team ${n}` };
});

/** The 12 technologies, in auction order. `icon` is stored in the lot's `motif` column. */
export const SEED_LOTS = [
  { name: "Smart Sensors", category: "Sensing", icon: "sensors", description: "Measure heat, smoke, gas or vibration at chosen points", limitation: "Only see where they are placed" },
  { name: "Smart Cameras", category: "Vision", icon: "cameras", description: "Count people and spot unusual movement", limitation: "Need light and a clear view; raise privacy concerns" },
  { name: "Drone Aerial Monitor", category: "Aerial", icon: "drone", description: "A bird's-eye view of a large area", limitation: "Short battery life; weather-dependent" },
  { name: "Prediction Engine (AI)", category: "AI", icon: "prediction", description: "Forecasts where trouble is likely to start", limitation: "Only as good as the data it gets" },
  { name: "Edge Processing Unit", category: "Edge", icon: "edge", description: "Makes decisions on the spot, without the cloud", limitation: "Limited compute and storage" },
  { name: "Communication Network", category: "Network", icon: "network", description: "Radio or mesh link between teams and devices", limitation: "Range and congestion limit it" },
  { name: "Mobile App & Alerts", category: "Mobile", icon: "mobile", description: "Sends messages and guidance to people's phones", limitation: "Needs people to have phones, signal and to respond" },
  { name: "Public Address & Smart Signage", category: "Public alert", icon: "signage", description: "Announcements and lit directions that reach everyone", limitation: "One-way; people may not listen in a panic" },
  { name: "Automatic Switching & Gate Control", category: "Control", icon: "switching", description: "Cuts power to a faulty point, opens or closes gates", limitation: "Only controls what it is wired to" },
  { name: "Battery Storage & Backup Power", category: "Power", icon: "battery", description: "Keeps key systems running in a power cut", limitation: "Limited capacity; must be recharged" },
  { name: "Command Dashboard", category: "Command", icon: "dashboard", description: "One live view for the organisers", limitation: "Only as useful as the data feeding it" },
  { name: "Cybersecurity Shield", category: "Security", icon: "shield", description: "Blocks fake alerts and misuse", limitation: "Doesn't fix physical problems" },
];

/**
 * Replaces the lots with the 12 technologies and sets every team to the starting wallet.
 * Refuses to touch an event that has any recorded result: reset it first through the
 * explicit confirmation flow (Admin, Event Settings, Reset Event), then seed again.
 */
export async function seedEvent(db: DbAdapter) {
  const results = (await db.get<{ c: number }>("SELECT COUNT(*) as c FROM lot_results"))!;
  const sales = (await db.get<{ c: number }>("SELECT COUNT(*) as c FROM sales"))!;
  if (Number(results.c) > 0 || Number(sales.c) > 0) {
    throw new AuctionError(
      "SEED_BLOCKED",
      "This event already has recorded sales, so the lots were not replaced. Reset the event first (Admin, Event Settings, Reset Event) and seed again."
    );
  }

  await db.transaction(async (tx) => {
    for (const t of SEED_TEAMS) {
      await tx.run(
        "INSERT INTO teams (id, name, initial_balance) VALUES (?, ?, ?) ON CONFLICT (id) DO UPDATE SET initial_balance = excluded.initial_balance",
        [t.id, t.name, EVENT_DEFAULTS.startingWallet]
      );
    }

    await tx.run(
      `UPDATE event_settings
       SET starting_wallet = ?, default_starting_bid = ?, default_min_increment = ?, winners_per_lot = ?,
           max_tech_per_team = ?, pricing_mode = 'UNIFORM_PRICE', allow_fewer_winners = 1, block_repeat_winner = 1,
           status = 'setup', display_state = 'opening', current_lot_id = NULL, last_lot_result_id = NULL
       WHERE id = 1`,
      [EVENT_DEFAULTS.startingWallet, EVENT_DEFAULTS.startingBid, EVENT_DEFAULTS.priceStep, EVENT_DEFAULTS.slotsPerLot, EVENT_DEFAULTS.maxTechPerTeam]
    );

    await tx.run("DELETE FROM lots");
    for (let idx = 0; idx < SEED_LOTS.length; idx++) {
      const lot = SEED_LOTS[idx];
      await tx.run(
        `INSERT INTO lots (id, order_index, name, category, description, limitation, motif, starting_bid, min_increment, quantity_total, quantity_remaining, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [nanoid(10), idx, lot.name, lot.category, lot.description, lot.limitation, lot.icon, EVENT_DEFAULTS.startingBid, EVENT_DEFAULTS.priceStep, EVENT_DEFAULTS.slotsPerLot, EVENT_DEFAULTS.slotsPerLot]
      );
    }
  });

  return { teams: SEED_TEAMS.length, lots: SEED_LOTS.length };
}
