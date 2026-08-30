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
      duration TEXT DEFAULT '',
      delivery_type TEXT DEFAULT '',
      warranty TEXT DEFAULT '',
      description TEXT DEFAULT '',
      price REAL NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      image_url TEXT DEFAULT '',
      created_at INTEGER DEFAULT (unixepoch())
    );
  `);

  // Migrate new attribute columns if existing table lacks them
  try {
    await rawClient.execute(`ALTER TABLE products ADD COLUMN stock INTEGER NOT NULL DEFAULT 0;`);
  } catch {}
  try {
    await rawClient.execute(`ALTER TABLE products ADD COLUMN duration TEXT DEFAULT '';`);
  } catch {}
  try {
    await rawClient.execute(`ALTER TABLE products ADD COLUMN delivery_type TEXT DEFAULT '';`);
  } catch {}
  try {
    await rawClient.execute(`ALTER TABLE products ADD COLUMN warranty TEXT DEFAULT '';`);
  } catch {}

  // Migrate existing description strings to duration/delivery_type/warranty columns
  try {
    const existing = await rawClient.execute(`
      SELECT id, description, duration, delivery_type, warranty FROM products
      WHERE (duration IS NULL OR duration = '') 
        AND description IS NOT NULL 
        AND description != '';
    `);

    for (const row of existing.rows) {
      const id = String(row.id);
      const descStr = String(row.description || "");
      const segments = descStr.split("-").map((s) => s.trim()).filter(Boolean);
      let dur = "";
      let dt = "";
      let war = "";

      if (segments.length >= 3) {
        dur = segments[0];
        dt = segments[1];
        war = segments.slice(2).join(" - ");
      } else if (segments.length === 2) {
        dur = segments[0];
        dt = segments[1];
      } else if (segments.length === 1) {
        dur = segments[0];
      }

      if (dur || dt || war) {
        await rawClient.execute({
          sql: `UPDATE products SET duration = ?, delivery_type = ?, warranty = ? WHERE id = ?;`,
          args: [dur, dt, war, id],
        });
      }
    }
  } catch (err) {
    console.warn("Product attribute data migration note:", err);
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

  // Recreate or migrate order_messages table if order_id has NOT NULL constraint
  try {
    await rawClient.execute(`
      CREATE TABLE IF NOT EXISTS order_messages_new (
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
    await rawClient.execute(`
      INSERT OR IGNORE INTO order_messages_new SELECT id, order_id, public_memo, sender, content, status, created_at FROM order_messages;
    `);
    await rawClient.execute(`DROP TABLE order_messages;`);
    await rawClient.execute(`ALTER TABLE order_messages_new RENAME TO order_messages;`);
  } catch {
    // Migration done or table newly created
  }
}
