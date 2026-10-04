import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { readFileSync, mkdirSync } from "node:fs";
import { createSqliteAdapter } from "./sqliteAdapter.js";
import { createPostgresAdapter } from "./postgresAdapter.js";
import { migrate } from "./migrate.js";
import type { DbAdapter } from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface CreateDbOptions {
  /** Postgres connection string. Defaults to process.env.DATABASE_URL. */
  databaseUrl?: string;
  /** SQLite file path, or ":memory:". Ignored if a Postgres URL is in play. */
  sqlitePath?: string;
}

/**
 * Creates and fully initializes a database adapter: SQLite by default (this project's local,
 * zero-setup path), or Postgres when a connection string is supplied — via `DATABASE_URL` in
 * production, or explicitly (tests use this to run the same suite against both dialects).
 */
export async function createDb(options: CreateDbOptions = {}): Promise<DbAdapter> {
  const databaseUrl = options.databaseUrl ?? process.env.DATABASE_URL;

  let db: DbAdapter;
  if (databaseUrl) {
    db = createPostgresAdapter(databaseUrl);
    const schema = readFileSync(join(__dirname, "schema.pg.sql"), "utf-8");
    await db.exec(schema);
  } else {
    const sqlitePath = options.sqlitePath ?? defaultSqlitePath();
    db = createSqliteAdapter(sqlitePath);
    const schema = readFileSync(join(__dirname, "schema.sqlite.sql"), "utf-8");
    await db.exec(schema);
  }

  await migrate(db);
  return db;
}

export function defaultSqlitePath(): string {
  const dataDir = join(__dirname, "..", "..", "data");
  mkdirSync(dataDir, { recursive: true });
  return join(dataDir, "tech-auction.db");
}
