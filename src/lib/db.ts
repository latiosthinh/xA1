import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const url = process.env.TURSO_DATABASE_URL || "file:local.db";
const authToken = process.env.TURSO_AUTH_TOKEN || undefined;

export const rawClient = createClient({
  url,
  authToken,
});

export const db = drizzle(rawClient, { schema });

let initDbPromise: Promise<void> | null = null;

// Initialize tables once per server instance lifecycle
export async function initDb() {
  if (initDbPromise) {
    return initDbPromise;
  }

  initDbPromise = (async () => {
    try {
      await rawClient.execute(`
        CREATE TABLE IF NOT EXISTS products (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          duration TEXT DEFAULT '',
          delivery_type TEXT DEFAULT '',
          warranty TEXT DEFAULT '',
          price REAL NOT NULL,
          stock INTEGER NOT NULL DEFAULT 0,
          image_url TEXT DEFAULT '',
          created_at INTEGER DEFAULT (unixepoch())
        );
      `);

      await rawClient.execute(`
        CREATE TABLE IF NOT EXISTS orders (
          id TEXT PRIMARY KEY,
          public_memo TEXT NOT NULL UNIQUE,
          client_token TEXT NOT NULL,
          items_json TEXT NOT NULL,
          total_amount REAL NOT NULL,
          payment_method TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'PENDING',
          created_at INTEGER DEFAULT (unixepoch()),
          updated_at INTEGER DEFAULT (unixepoch())
        );
      `);

      await rawClient.execute(`
        CREATE TABLE IF NOT EXISTS order_messages (
          id TEXT PRIMARY KEY,
          order_id TEXT,
          public_memo TEXT NOT NULL DEFAULT 'GLOBAL',
          sender TEXT NOT NULL DEFAULT 'ADMIN',
          content TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'PENDING',
          created_at INTEGER DEFAULT (unixepoch()),
          FOREIGN KEY (order_id) REFERENCES orders (id)
        );
      `);
    } catch (err) {
      console.warn("initDb non-critical check note:", err);
    }
  })();

  return initDbPromise;
}
