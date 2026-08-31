import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { products } from "@/lib/schema";
import { desc } from "drizzle-orm";
import crypto from "crypto";

export async function GET() {
  try {
    await initDb();
    const allProducts = await db.select().from(products).orderBy(desc(products.createdAt));
    return NextResponse.json({ products: allProducts });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await initDb();
    const body = await request.json();
    const { name, duration, deliveryType, warranty, price, stock, imageUrl } = body;

    if (!name || price === undefined || isNaN(Number(price))) {
      return NextResponse.json({ error: "Name and valid price are required" }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const newProduct = {
      id,
      name: String(name).trim(),
      duration: duration ? String(duration).trim() : "",
      deliveryType: deliveryType ? String(deliveryType).trim() : "",
      warranty: warranty ? String(warranty).trim() : "",
      price: Number(price),
      stock: stock !== undefined && !isNaN(Number(stock)) ? Math.max(0, Number(stock)) : 0,
      imageUrl: imageUrl ? String(imageUrl).trim() : "",
      createdAt: new Date(),
    };

    await db.insert(products).values(newProduct);

    return NextResponse.json({ success: true, product: newProduct }, { status: 201 });
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}
