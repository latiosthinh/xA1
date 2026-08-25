import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { products } from "@/lib/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    await initDb();
    const list = await db.select().from(products).orderBy(desc(products.createdAt));
    return NextResponse.json({ products: list });
  } catch (error) {
    console.error("Error loading products:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}
