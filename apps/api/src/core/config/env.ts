import dotenv from "dotenv";

dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env variable: ${name}`);
  }
  return value;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: Number(process.env.PORT ?? 3001),
  JWT_SECRET: process.env.JWT_SECRET ?? "dev-secret-change-this",
  BCRYPT_ROUNDS: Number(process.env.BCRYPT_ROUNDS ?? 10),

  DB: {
    HOST: required("DB_HOST"),
    PORT: Number(process.env.DB_PORT ?? 3306),
    USER: required("DB_USER"),
    PASS: process.env.DB_PASS ?? "",
    NAME: required("DB_NAME"),
    CONN_LIMIT: Number(process.env.DB_CONN_LIMIT ?? 10),
  },

  SSE_RETRY_MS: Number(process.env.SSE_RETRY_MS ?? 3000),
};
