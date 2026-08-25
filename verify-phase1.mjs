import { initDb, db } from "./src/lib/db";
import { products } from "./src/lib/schema";
import { signAdminToken, verifyAdminToken } from "./src/lib/auth";
import assert from "assert";

async function verifyPhase1() {
  console.log("Verifying Phase 1 implementation...");

  // 1. Verify Database Initialization and schema tables
  await initDb();
  console.log("✓ Database initialized with tables (products, orders, order_messages)");

  // 2. Verify Product insertion
  const testId = "test-prod-" + Date.now();
  await db.insert(products).values({
    id: testId,
    name: "Verification Test Item",
    description: "Item to test CRUD",
    price: 19.99,
    imageUrl: "https://example.com/icon.png",
  });
  console.log("✓ Inserted test product");

  // 3. Verify Product read
  const all = await db.select().from(products);
  const found = all.find((p) => p.id === testId);
  assert(found, "Product should exist in database");
  assert.strictEqual(found.name, "Verification Test Item");
  console.log("✓ Read and asserted product from database");

  // 4. Verify Auth token signing and verification
  const token = await signAdminToken("admin");
  const payload = await verifyAdminToken(token);
  assert(payload, "Token should be valid");
  assert.strictEqual(payload.username, "admin");
  assert.strictEqual(payload.role, "admin");
  console.log("✓ Signed and verified Jose admin session JWT");

  console.log("Phase 1 verification self-checks passed!");
}

verifyPhase1().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
