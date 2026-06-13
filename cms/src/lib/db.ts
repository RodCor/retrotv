import mysql from "mysql2/promise";
import { config } from "./config";

/**
 * Shared MariaDB/MySQL connection pool. We keep a single pool on the global
 * object so Next.js hot-reloads in development don't exhaust connections.
 */
declare global {
  // eslint-disable-next-line no-var
  var __retrotvPool: mysql.Pool | undefined;
}

export const pool: mysql.Pool =
  global.__retrotvPool ??
  mysql.createPool({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    waitForConnections: true,
    connectionLimit: 10,
    namedPlaceholders: true,
    charset: "utf8mb4",
  });

if (process.env.NODE_ENV !== "production") {
  global.__retrotvPool = pool;
}

/** Run a query and return rows as an array of the given type. */
export async function query<T = Record<string, unknown>>(
  sql: string,
  params?: Record<string, unknown> | unknown[],
): Promise<T[]> {
  const [rows] = await pool.execute(sql, params as never);
  return rows as T[];
}

/** Run a query and return the first row, or null. */
export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params?: Record<string, unknown> | unknown[],
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

/** Execute an INSERT/UPDATE/DELETE and return the result metadata. */
export async function execute(
  sql: string,
  params?: Record<string, unknown> | unknown[],
): Promise<mysql.ResultSetHeader> {
  const [result] = await pool.execute(sql, params as never);
  return result as mysql.ResultSetHeader;
}
