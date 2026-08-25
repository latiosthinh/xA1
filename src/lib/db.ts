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

// Auto initialize tables if using local sqlite or first startup
export async function initDb() {
  await rawClient.execute(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      price REAL NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      image_url TEXT DEFAULT '',
      created_at INTEGER DEFAULT (unixepoch())
    );
  `);

  // Migrate stock column if existing table lacks it
  try {
    await rawClient.execute(`ALTER TABLE products ADD COLUMN stock INTEGER NOT NULL DEFAULT 0;`);
  } catch {
    // Column already exists
  }

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
      order_id TEXT NOT NULL,
      public_memo TEXT NOT NULL,
      sender TEXT NOT NULL DEFAULT 'ADMIN',
      content TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (order_id) REFERENCES orders (id)
    );
  `);
}
