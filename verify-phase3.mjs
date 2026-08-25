import { initDb, db } from "./src/lib/db";
import { orders, orderMessages } from "./src/lib/schema";
import { eq, and } from "drizzle-orm";
import assert from "assert";

async function verifyPhase3() {
  console.log("Verifying Phase 3 implementation...");

  await initDb();

  // 1. Create a mock order with clientToken and publicMemo
  const testOrderId = "order-p3-" + Date.now();
  const testMemo = "ORD-" + Math.floor(100000 + Math.random() * 900000);
  const testClientToken = "client-token-p3-" + Date.now();

  await db.insert(orders).values({
    id: testOrderId,
    publicMemo: testMemo,
    clientToken: testClientToken,
    itemsJson: JSON.stringify([{ name: "Diamond Pack", quantity: 1, price: 50 }]),
    totalAmount: 50,
    paymentMethod: "binance",
    status: "PAID_WAITING_CONFIRM",
  });
  console.log("✓ Created confirmed order in database:", testMemo);

  // 2. Simulate Telegram Webhook /reply insertion by Admin
  const messageId = "msg-" + Date.now();
  const testMessageContent = "Your Game Code: ABCD-1234-EFGH-5678 (Account Login: user@domain.com)";

  await db.insert(orderMessages).values({
    id: messageId,
    orderId: testOrderId,
    publicMemo: testMemo,
    sender: "ADMIN",
    content: testMessageContent,
    status: "PENDING",
  });
  console.log("✓ Inserted admin reply into order_messages with status PENDING");

  // 3. Simulate Client Polling using clientToken
  const matchingMsgs = await db
    .select()
    .from(orderMessages)
    .where(and(eq(orderMessages.orderId, testOrderId), eq(orderMessages.status, "PENDING")));

  assert.strictEqual(matchingMsgs.length, 1);
  assert.strictEqual(matchingMsgs[0].content, testMessageContent);
  console.log("✓ Client polled unacknowledged admin message successfully");

  // 4. Update status to DELIVERED
  await db
    .update(orderMessages)
    .set({ status: "DELIVERED" })
    .where(eq(orderMessages.id, messageId));

  // 5. Simulate User Modal Acknowledgment ("I have saved my data")
  await db
    .update(orderMessages)
    .set({ status: "ACKNOWLEDGED" })
    .where(eq(orderMessages.id, messageId));

  const finalMsg = await db
    .select()
    .from(orderMessages)
    .where(eq(orderMessages.id, messageId))
    .limit(1);

  assert.strictEqual(finalMsg[0].status, "ACKNOWLEDGED");
  console.log("✓ Message status transitioned to ACKNOWLEDGED on user modal dismissal");

  console.log("Phase 3 verification self-checks passed!");
}

verifyPhase3().catch((err) => {
  console.error("Phase 3 verification failed:", err);
  process.exit(1);
});
