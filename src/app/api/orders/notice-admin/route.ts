import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { orders, orderMessages } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { sendTelegramOrderAlert } from "@/lib/telegram";

export async function POST(request: Request) {
  try {
    await initDb();
    const body = await request.json();
    const { orderId, clientToken } = body;

    if (!orderId || !clientToken) {
      return NextResponse.json({ error: "Order ID and clientToken required" }, { status: 400 });
    }

    // 1. Verify order
    const matching = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.clientToken, clientToken)))
      .limit(1);

    if (matching.length === 0) {
      return NextResponse.json({ error: "Order not found or invalid token" }, { status: 404 });
    }

    const order = matching[0];

    // 2. Check if user already received a message from admin for this order
    const receivedMsgs = await db
      .select()
      .from(orderMessages)
      .where(and(eq(orderMessages.orderId, order.id), eq(orderMessages.sender, "ADMIN")));

    if (receivedMsgs.length > 0) {
      return NextResponse.json(
        { error: "Admin has already delivered your order message." },
        { status: 400 }
      );
    }

    // 3. Send prompt notification to Telegram
    await sendTelegramOrderAlert(order);

    return NextResponse.json({
      success: true,
      message: "Notification dispatched to admin telegram.",
    });
  } catch (error) {
    console.error("Notice admin error:", error);
    return NextResponse.json({ error: "Failed to dispatch notification" }, { status: 500 });
  }
}
