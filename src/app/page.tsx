import { db, initDb } from "@/lib/db";
import { products } from "@/lib/schema";
import { desc } from "drizzle-orm";
import StorefrontClient from "@/components/StorefrontClient";

export const dynamic = "force-dynamic";

export default async function StorefrontPage() {
  await initDb();
  
  // Directly query database on server - 0 client fetch waterfall
  const catalog = await db
    .select()
    .from(products)
    .orderBy(desc(products.createdAt));

  return <StorefrontClient initialProducts={catalog} />;
}
