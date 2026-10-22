import dotenv from "dotenv";

dotenv.config();

const required = (name: string): string => {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

export const env = {
  mongodbUri: process.env.MONGODB_URI?.trim() || "mongodb://127.0.0.1:27017/chemical_safety_db",
  port: Number(process.env.PORT ?? 5000),
  database: {
    host: required("DB_HOST"),
    port: Number(process.env.DB_PORT ?? 5432),
    name: required("DB_NAME"),
    user: required("DB_USER"),
    password: required("DB_PASSWORD"),
  },
  redisUrl: process.env.REDIS_URL?.trim() || "redis://localhost:6379",
  frontendOrigin: process.env.FRONTEND_ORIGIN?.trim() || "http://localhost:5173",
  auth: {
    jwtSecret: required("AUTH_JWT_SECRET"),
    cookieName: process.env.AUTH_COOKIE_NAME?.trim() || "chem_safe_session",
    csrfCookieName: "chem_safe_csrf",
    tokenTtl: process.env.AUTH_TOKEN_TTL?.trim() || "8h",
  },
};

if (!Number.isInteger(env.port) || env.port < 1 || env.port > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535");
}

if (!Number.isInteger(env.database.port) || env.database.port < 1 || env.database.port > 65535) {
  throw new Error("DB_PORT must be an integer between 1 and 65535");
}

