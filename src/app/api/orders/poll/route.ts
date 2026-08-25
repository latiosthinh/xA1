import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { orders, orderMessages } from "@/lib/schema";
import { eq, and, ne } from "drizzle-orm";

interface OrderTokenPair {
  id: string;
  clientToken: string;
}

export async function POST(request: Request) {
  try {
    await initDb();
    const body = await request.json();
    const orderPairs: OrderTokenPair[] = body.orders || [];

    if (!Array.isArray(orderPairs) || orderPairs.length === 0) {
      return NextResponse.json({ messages: [] });
    }

    const unreadMessages = [];

    for (const pair of orderPairs) {
      if (!pair.id || !pair.clientToken) continue;

      // Verify order ownership with client token
      const validOrder = await db
        .select()
        .from(orders)
        .where(and(eq(orders.id, pair.id), eq(orders.clientToken, pair.clientToken)))
        .limit(1);

      if (validOrder.length === 0) continue;

      // Fetch pending or delivered (unacknowledged) messages
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
        unreadMessages.push(...msgs);

        // Mark as DELIVERED
        for (const msg of msgs) {
          if (msg.status === "PENDING") {
            await db
              .update(orderMessages)
              .set({ status: "DELIVERED" })
              .where(eq(orderMessages.id, msg.id));
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
