import { createClient } from "@libsql/client";

// Normalize URL: Turso https:// vs libsql://
let url = process.env.TURSO_DATABASE_URL || "file:local.db";
if (url.startsWith("libsql://")) {
  url = url.replace("libsql://", "https://");
}
const authToken = process.env.TURSO_AUTH_TOKEN ? process.env.TURSO_AUTH_TOKEN.trim().replace(/^["']|["']$/g, "") : undefined;

console.log("Database target:", url);
console.log("Auth token present:", Boolean(authToken), authToken ? `length: ${authToken.length}` : "");

const rawClient = createClient({ url, authToken });

async function run() {
  console.log("Checking current table schema...");
  const tableInfo = await rawClient.execute("PRAGMA table_info(products);");
  const existingColumns = new Set(tableInfo.rows.map((r: any) => String(r.name)));
  console.log("Existing columns:", Array.from(existingColumns).join(", "));

  const targetCols = [
    { name: "duration", type: "TEXT" },
    { name: "delivery_type", type: "TEXT" },
    { name: "warranty", type: "TEXT" },
  ];

  for (const col of targetCols) {
    if (!existingColumns.has(col.name)) {
      console.log(`Adding column ${col.name}...`);
      try {
        await rawClient.execute(`ALTER TABLE products ADD COLUMN ${col.name} ${col.type} DEFAULT '';`);
        console.log(`✓ Added column ${col.name}`);
      } catch (err: any) {
        console.error(`Failed to add column ${col.name}:`, err.message || err);
      }
    } else {
      console.log(`• Column ${col.name} already exists.`);
    }
  }

  // Backfill if description column exists
  if (existingColumns.has("description")) {
    console.log("Backfilling rows from existing description before drop...");
    const existing = await rawClient.execute("SELECT id, name, description, duration, delivery_type, warranty FROM products;");

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
          sql: "UPDATE products SET duration = ?, delivery_type = ?, warranty = ? WHERE id = ?;",
          args: [dur, dt, war, id],
        });
        updatedCount++;
      }
    }
    console.log(`✓ Backfilled ${updatedCount} products.`);

    console.log("Dropping column `description`...");
    try {
      await rawClient.execute("ALTER TABLE products DROP COLUMN description;");
      console.log("✓ Column `description` dropped successfully.");
    } catch (err: any) {
      console.warn("• Drop column description skipped or requires table rebuild:", err.message || err);
    }
  }

  const finalSchema = await rawClient.execute("PRAGMA table_info(products);");
  console.log("\nProducts table schema:");
  console.table(finalSchema.rows);

  const sample = await rawClient.execute("SELECT id, name, duration, delivery_type, warranty FROM products LIMIT 5;");
  console.log("\nSample rows in products:");
  console.table(sample.rows);

  process.exit(0);
}

run().catch((err) => {
  console.error("Migration fatal error:", err);
  process.exit(1);
});





