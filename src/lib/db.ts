import { neon } from "@neondatabase/serverless";

/**
 * Server-only database access. DATABASE_URL must never be exposed to
 * the client bundle — this module is only imported from Server Actions
 * and scripts.
 */
export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    return null;
  }
  return neon(url);
}

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}
