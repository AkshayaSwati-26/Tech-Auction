/** A connection- or transaction-scoped query surface. Every read/write in the app goes through this. */
export interface QueryRunner {
  get<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T | undefined>;
  all<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  run(sql: string, params?: unknown[]): Promise<{ changes: number }>;
}

/** The full adapter: a QueryRunner plus lifecycle and transaction management. */
export interface DbAdapter extends QueryRunner {
  kind: "sqlite" | "postgres";
  exec(sql: string): Promise<void>;
  /** Runs `fn` with a QueryRunner scoped to one transaction. Commits on success, rolls back on throw. */
  transaction<T>(fn: (tx: QueryRunner) => Promise<T>): Promise<T>;
  /** Column names currently present on `table` — used by the migration step. */
  listColumns(table: string): Promise<Set<string>>;
  close(): Promise<void>;
}
