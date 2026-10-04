import pg from "pg";
import type { DbAdapter, QueryRunner } from "./types.js";

/** Translates this app's SQLite-style `?` placeholders to Postgres `$1, $2, ...`.
    Safe here because no query in this app embeds a literal `?` inside a string value. */
function toPgSql(sql: string): string {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

function runnerFor(client: Pick<pg.PoolClient, "query">): QueryRunner {
  return {
    async get(sql, params = []) {
      const res = await client.query(toPgSql(sql), params as any[]);
      return res.rows[0] as any;
    },
    async all(sql, params = []) {
      const res = await client.query(toPgSql(sql), params as any[]);
      return res.rows as any[];
    },
    async run(sql, params = []) {
      const res = await client.query(toPgSql(sql), params as any[]);
      return { changes: res.rowCount ?? 0 };
    },
  };
}

export function createPostgresAdapter(connectionString: string): DbAdapter {
  const pool = new pg.Pool({ connectionString });
  const poolRunner = runnerFor(pool);

  return {
    kind: "postgres",
    get: poolRunner.get,
    all: poolRunner.all,
    run: poolRunner.run,
    async exec(sql) {
      await pool.query(sql);
    },
    async listColumns(table) {
      const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = $1", [table]);
      return new Set(res.rows.map((r) => r.column_name as string));
    },
    async transaction(fn) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const tx = runnerFor(client);
        const result = await fn(tx);
        await client.query("COMMIT");
        return result;
      } catch (err) {
        try {
          await client.query("ROLLBACK");
        } catch {
          /* ignore rollback failure, original error is what matters */
        }
        throw err;
      } finally {
        client.release();
      }
    },
    async close() {
      await pool.end();
    },
  };
}
