import { DatabaseSync } from "node:sqlite";
import type { DbAdapter, QueryRunner } from "./types.js";

/**
 * Wraps node:sqlite's synchronous API behind the async DbAdapter interface. The methods
 * return already-resolved promises — there's no real I/O wait, so a transaction's BEGIN…COMMIT
 * can never be interleaved by other work on this same single-process, single-connection server.
 */
export function createSqliteAdapter(path: string): DbAdapter {
  const db = new DatabaseSync(path);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");

  function runnerFor(target: DatabaseSync): QueryRunner {
    return {
      async get(sql, params = []) {
        return target.prepare(sql).get(...(params as any[])) as any;
      },
      async all(sql, params = []) {
        return target.prepare(sql).all(...(params as any[])) as any;
      },
      async run(sql, params = []) {
        const r = target.prepare(sql).run(...(params as any[]));
        return { changes: Number(r.changes) };
      },
    };
  }

  const rootRunner = runnerFor(db);

  return {
    kind: "sqlite",
    get: rootRunner.get,
    all: rootRunner.all,
    run: rootRunner.run,
    async exec(sql) {
      db.exec(sql);
    },
    async listColumns(table) {
      const rows = db.prepare(`PRAGMA table_info(${table})`).all() as unknown as Array<{ name: string }>;
      return new Set(rows.map((r) => r.name));
    },
    async transaction(fn) {
      db.exec("BEGIN");
      try {
        const result = await fn(rootRunner);
        db.exec("COMMIT");
        return result;
      } catch (err) {
        try {
          db.exec("ROLLBACK");
        } catch {
          /* ignore rollback failure, original error is what matters */
        }
        throw err;
      }
    },
    async close() {
      db.close();
    },
  };
}
