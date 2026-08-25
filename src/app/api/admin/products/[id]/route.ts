import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { products } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDb();
    const { id } = await params;
    const body = await request.json();
    const { name, description, price, stock, imageUrl } = body;

    if (!name || price === undefined || isNaN(Number(price))) {
      return NextResponse.json({ error: "Name and valid price are required" }, { status: 400 });
    }

    const updated = {
      name: String(name).trim(),
      description: description ? String(description).trim() : "",
      price: Number(price),
      stock: stock !== undefined && !isNaN(Number(stock)) ? Math.max(0, Number(stock)) : 0,
      imageUrl: imageUrl ? String(imageUrl).trim() : "",
    };

    await db.update(products).set(updated).where(eq(products.id, id));

    return NextResponse.json({ success: true, message: "Product updated successfully" });
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDb();
    const { id } = await params;

    await db.delete(products).where(eq(products.id, id));

    return NextResponse.json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
