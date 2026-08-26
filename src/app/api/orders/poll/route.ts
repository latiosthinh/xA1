import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { orders, orderMessages } from "@/lib/schema";
import { eq, and, ne, isNull, or, gt } from "drizzle-orm";

interface OrderTokenPair {
  id: string;
  clientToken: string;
}

export async function POST(request: Request) {
  try {
    await initDb();
    const body = await request.json();
    const orderPairs: OrderTokenPair[] = body.orders || [];
    const acknowledgedIds: string[] = body.acknowledgedIds || [];

    const unreadMessages = [];

    // Only consider recent messages created in the last 24 hours to avoid historic stale messages
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // 1. Fetch Global Broadcasts (orderId is null or publicMemo is 'GLOBAL')
    const globalMsgs = await db
      .select()
      .from(orderMessages)
      .where(
        and(
          or(isNull(orderMessages.orderId), eq(orderMessages.publicMemo, "GLOBAL")),
          ne(orderMessages.status, "ACKNOWLEDGED"),
          gt(orderMessages.createdAt, oneDayAgo)
        )
      );

    for (const gMsg of globalMsgs) {
      if (!acknowledgedIds.includes(gMsg.id)) {
        unreadMessages.push(gMsg);
      }
    }

    // 2. Fetch Targeted Order Messages if order pairs provided
    if (Array.isArray(orderPairs) && orderPairs.length > 0) {
      for (const pair of orderPairs) {
        if (!pair.id || !pair.clientToken) continue;

        // Verify order ownership with client token
        const validOrder = await db
          .select()
          .from(orders)
          .where(and(eq(orders.id, pair.id), eq(orders.clientToken, pair.clientToken)))
          .limit(1);

        if (validOrder.length === 0) continue;

        // Fetch targeted unacknowledged messages
        const msgs = await db
          .select()
          .from(orderMessages)
          .where(
            and(
              eq(orderMessages.orderId, pair.id),
              ne(orderMessages.status, "ACKNOWLEDGED")
            )
          );

        if (msgs.length > 0) {
          for (const msg of msgs) {
            if (!acknowledgedIds.includes(msg.id)) {
              unreadMessages.push(msg);

              if (msg.status === "PENDING") {
                await db
                  .update(orderMessages)
                  .set({ status: "DELIVERED" })
                  .where(eq(orderMessages.id, msg.id));
              }
            }
          }
        }
      }
    }

    return NextResponse.json({ messages: unreadMessages });
  } catch (error) {
    console.error("Poll messages error:", error);
    return NextResponse.json({ error: "Failed to poll messages" }, { status: 500 });
  }
}


