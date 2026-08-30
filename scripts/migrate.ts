import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

// Load env
const url = process.env.TURSO_DATABASE_URL || "file:local.db";
const authToken = process.env.TURSO_AUTH_TOKEN || undefined;

console.log("Database target:", url);

const rawClient = createClient({ url, authToken });

async function run() {
  console.log("Applying table alterations...");

  try {
    await rawClient.execute(`ALTER TABLE products ADD COLUMN duration TEXT DEFAULT '';`);
    console.log("✓ Added column `duration`");
  } catch (e: any) {
    console.log("• Column `duration` exists or skipped:", e.message);
  }

  try {
    await rawClient.execute(`ALTER TABLE products ADD COLUMN delivery_type TEXT DEFAULT '';`);
    console.log("✓ Added column `delivery_type`");
  } catch (e: any) {
    console.log("• Column `delivery_type` exists or skipped:", e.message);
  }

  try {
    await rawClient.execute(`ALTER TABLE products ADD COLUMN warranty TEXT DEFAULT '';`);
    console.log("✓ Added column `warranty`");
  } catch (e: any) {
    console.log("• Column `warranty` exists or skipped:", e.message);
  }

  // Migrate data from description into new columns
  console.log("Backfilling rows from existing description...");
  const existing = await rawClient.execute(`
    SELECT id, name, description, duration, delivery_type, warranty FROM products;
  `);

  let updatedCount = 0;
  for (const row of existing.rows) {
    const id = String(row.id);
    const descStr = String(row.description || "");
    const segments = descStr.split("-").map((s) => s.trim()).filter(Boolean);
    let dur = String(row.duration || "");
    let dt = String(row.delivery_type || "");
    let war = String(row.warranty || "");

    if (!dur && !dt && !war && segments.length > 0) {
      if (segments.length >= 3) {
        dur = segments[0];
        dt = segments[1];
        war = segments.slice(2).join(" - ").replace(/^warranty\s*/i, "");
      } else if (segments.length === 2) {
        dur = segments[0];
        dt = segments[1];
      } else if (segments.length === 1) {
        dur = segments[0];
      }

      await rawClient.execute({
        sql: `UPDATE products SET duration = ?, delivery_type = ?, warranty = ? WHERE id = ?;`,
        args: [dur, dt, war, id],
      });
      updatedCount++;
    }
  }
  console.log(`✓ Migrated & backfilled ${updatedCount} products.`);

  const res = await rawClient.execute("PRAGMA table_info(products);");
  console.log("\nProducts table schema:");
  console.table(res.rows);

  const sample = await rawClient.execute("SELECT id, name, duration, delivery_type, warranty, description FROM products LIMIT 5;");
  console.log("\nSample rows in products:");
  console.table(sample.rows);

  process.exit(0);
}

run().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});

