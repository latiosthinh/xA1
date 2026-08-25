import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { orders } from "@/lib/schema";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    await initDb();
    const body = await request.json();
    const { items, paymentMethod } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Cart items are required" }, { status: 400 });
    }

    const validMethods = ["momo", "binance"];
    const selectedMethod = validMethods.includes(paymentMethod) ? paymentMethod : "momo";

    const totalAmount = items.reduce((sum: number, item: { price: number; quantity: number }) => {
      return sum + (Number(item.price) || 0) * (Number(item.quantity) || 1);
    }, 0);

    const id = crypto.randomUUID();
    const publicMemo = "ORD-" + Math.floor(100000 + Math.random() * 900000);
    const clientToken = crypto.randomUUID();

    const newOrder = {
      id,
      publicMemo,
      clientToken,
      itemsJson: JSON.stringify(items),
      totalAmount,
      paymentMethod: selectedMethod,
      status: "PENDING",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(orders).values(newOrder);

    return NextResponse.json({
      success: true,
      order: {
        id,
        publicMemo,
        clientToken,
        totalAmount,
        paymentMethod: selectedMethod,
        items,
        status: "PENDING",
      },
    });
  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
