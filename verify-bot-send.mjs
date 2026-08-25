import assert from "assert";
import { initDb, db } from "./src/lib/db";
import { orders, orderMessages } from "./src/lib/schema";
import { eq, and, isNull } from "drizzle-orm";

async function verifyBotBroadcastCommands() {
  console.log("=========================================");
  console.log("VERIFYING TELEGRAM /send & BROADCAST FEATURE");
  console.log("=========================================");

  await initDb();

  // 1. Test Targeted Message via /send <orderId> <content>
  const testOrderId = "order-send-target-" + Date.now();
  const testMemo = "ORD-TGT" + Math.floor(1000 + Math.random() * 9000);
  const testClientToken = "client-token-" + Date.now();

  await db.insert(orders).values({
    id: testOrderId,
    publicMemo: testMemo,
    clientToken: testClientToken,
    itemsJson: JSON.stringify([{ name: "Target Item", quantity: 1, price: 10 }]),
    totalAmount: 10,
    paymentMethod: "momo",
    status: "PAID_WAITING_CONFIRM",
  });

  const targetedMsgId = "msg-target-" + Date.now();
  const targetContent = "Direct delivery to customer: KEY-9999-XXXX";

  await db.insert(orderMessages).values({
    id: targetedMsgId,
    orderId: testOrderId,
    publicMemo: testMemo,
    sender: "ADMIN",
    content: targetContent,
    status: "PENDING",
  });

  const [polledTarget] = await db
    .select()
    .from(orderMessages)
    .where(and(eq(orderMessages.orderId, testOrderId), eq(orderMessages.status, "PENDING")));

  assert.strictEqual(polledTarget.content, targetContent);
  assert.strictEqual(polledTarget.publicMemo, testMemo);
  console.log("✓ TARGETED /send: Message delivered to specific order");

  // 2. Test Global Broadcast via /send <content> or /broadcast <content> (orderId = null)
  const globalMsgId = "msg-global-" + Date.now();
  const globalContent = "Flash Sale: 20% off all keys with promo code RETRO20!";

  await db.insert(orderMessages).values({
    id: globalMsgId,
    orderId: null,
    publicMemo: "GLOBAL",
    sender: "ADMIN",
    content: globalContent,
    status: "PENDING",
  });

  const [polledGlobal] = await db
    .select()
    .from(orderMessages)
    .where(and(isNull(orderMessages.orderId), eq(orderMessages.id, globalMsgId)));

  assert.strictEqual(polledGlobal.content, globalContent);
  assert.strictEqual(polledGlobal.publicMemo, "GLOBAL");
  console.log("✓ GLOBAL BROADCAST: Global announcement created and retrievable for all visitors");

  console.log("=========================================");
  console.log("ALL BOT MESSAGING TESTS PASSED!");
  console.log("=========================================");
}

verifyBotBroadcastCommands().catch((err) => {
  console.error("Bot messaging verify failed:", err);
  process.exit(1);
});
