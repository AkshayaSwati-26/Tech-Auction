import { createDb } from "./index.js";

/** The app's one shared connection, chosen by DATABASE_URL at boot. Only the real server
    entry point and the seed script should import this — tests use `createDb()` directly
    so they never touch the default on-disk SQLite file. */
export const db = await createDb();
