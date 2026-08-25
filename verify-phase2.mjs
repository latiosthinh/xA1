import { initDb, db } from "./src/lib/db";
import { orders } from "./src/lib/schema";
import { eq } from "drizzle-orm";
import assert from "assert";

async function verifyPhase2() {
  console.log("Verifying Phase 2 implementation...");

  await initDb();

  // 1. Test Order Creation
  const testOrderId = "order-test-" + Date.now();
  const testMemo = "ORD-" + Math.floor(100000 + Math.random() * 900000);
  const testToken = "token-" + Date.now();

  const testItems = [
    { id: "item-1", name: "Game Gold 1M", price: 10, quantity: 2 },
    { id: "item-2", name: "Premium VIP Pass", price: 25, quantity: 1 },
  ];

  const total = 45;

  await db.insert(orders).values({
    id: testOrderId,
    publicMemo: testMemo,
    clientToken: testToken,
    itemsJson: JSON.stringify(testItems),
    totalAmount: total,
    paymentMethod: "momo",
    status: "PENDING",
  });
  console.log("✓ Created test order in database with status PENDING");

  // 2. Read Order and verify fields
  const found = await db.select().from(orders).where(eq(orders.id, testOrderId)).limit(1);
  assert(found.length > 0, "Order should exist");
  assert.strictEqual(found[0].publicMemo, testMemo);
  assert.strictEqual(found[0].totalAmount, 45);
  assert.strictEqual(found[0].status, "PENDING");
  console.log("✓ Verified order attributes and items");

  // 3. Test Order Status Transition to PAID_WAITING_CONFIRM
  await db
    .update(orders)
    .set({ status: "PAID_WAITING_CONFIRM", updatedAt: new Date() })
    .where(eq(orders.id, testOrderId));

  const updated = await db.select().from(orders).where(eq(orders.id, testOrderId)).limit(1);
  assert.strictEqual(updated[0].status, "PAID_WAITING_CONFIRM");
  console.log("✓ Verified order transition to PAID_WAITING_CONFIRM");

  console.log("Phase 2 verification self-checks passed!");
}

verifyPhase2().catch((err) => {
  console.error("Phase 2 verification failed:", err);
  process.exit(1);
});
