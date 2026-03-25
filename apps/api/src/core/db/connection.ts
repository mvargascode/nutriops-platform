import mysql from "mysql2/promise";
import { env } from "../config/env";

export const pool = mysql.createPool({
  host: env.DB.HOST,
  port: env.DB.PORT,
  user: env.DB.USER,
  password: env.DB.PASS,
  database: env.DB.NAME,
  waitForConnections: true,
  connectionLimit: env.DB.CONN_LIMIT,
  queueLimit: 0,
  dateStrings: true,
  charset: "utf8mb4",
});

export async function query<T = any>(
  sql: string,
  params?: any[],
): Promise<T[]> {
  const [rows] = await pool.query(sql, params);
  return rows as T[];
}
