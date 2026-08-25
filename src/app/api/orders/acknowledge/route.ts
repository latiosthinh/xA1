import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { orders, orderMessages } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    await initDb();
    const body = await request.json();
    const { messageId, clientToken } = body;

    if (!messageId || !clientToken) {
      return NextResponse.json({ error: "Message ID and client token required" }, { status: 400 });
    }

    // Find the message
    const msg = await db
      .select()
      .from(orderMessages)
      .where(eq(orderMessages.id, messageId))
      .limit(1);

    if (msg.length === 0) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // Validate that caller holds clientToken for this order
    const order = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, msg[0].orderId), eq(orders.clientToken, clientToken)))
      .limit(1);

    if (order.length === 0) {
      return NextResponse.json({ error: "Unauthorized token" }, { status: 403 });
    }

    // Mark as ACKNOWLEDGED
    await db
      .update(orderMessages)
      .set({ status: "ACKNOWLEDGED" })
      .where(eq(orderMessages.id, messageId));

    return NextResponse.json({ success: true, message: "Acknowledged" });
  } catch (error) {
    console.error("Acknowledge message error:", error);
    return NextResponse.json({ error: "Failed to acknowledge message" }, { status: 500 });
  }
}
