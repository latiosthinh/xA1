import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { orders, orderMessages } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    await initDb();
    const body = await request.json();
    const { messageId, clientToken } = body;

    if (!messageId) {
      return NextResponse.json({ error: "Message ID required" }, { status: 400 });
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

    const message = msg[0];

    // If targeted order message, verify client token
    if (message.orderId && message.publicMemo !== "GLOBAL") {
      if (!clientToken) {
        return NextResponse.json({ error: "Client token required for order message" }, { status: 400 });
      }

      const order = await db
        .select()
        .from(orders)
        .where(and(eq(orders.id, message.orderId), eq(orders.clientToken, clientToken)))
        .limit(1);

      if (order.length === 0) {
        return NextResponse.json({ error: "Unauthorized token" }, { status: 403 });
      }
    }

    // Mark message as ACKNOWLEDGED
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


