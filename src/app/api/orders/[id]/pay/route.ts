import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { orders } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { sendTelegramOrderAlert } from "@/lib/telegram";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initDb();
    const { id } = await params;

    // Check if order exists
    const existing = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (!existing || existing.length === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const order = existing[0];

    // Update status to PAID_WAITING_CONFIRM
    await db
      .update(orders)
      .set({
        status: "PAID_WAITING_CONFIRM",
        updatedAt: new Date(),
      })
      .where(eq(orders.id, id));

    // Dispatch Telegram bot alert to admin
    await sendTelegramOrderAlert(order);

    return NextResponse.json({
      success: true,
      message: "Order updated to paid pending confirmation",
      status: "PAID_WAITING_CONFIRM",
      order,
    });
  } catch (error) {
    console.error("Error updating order payment status:", error);
    return NextResponse.json({ error: "Failed to update payment status" }, { status: 500 });
  }
}
