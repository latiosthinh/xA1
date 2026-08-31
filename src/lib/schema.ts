import { sqliteTable, text, real, integer } from "drizzle-orm/sqlite-core";

export const products = sqliteTable("products", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  duration: text("duration").default(""),
  deliveryType: text("delivery_type").default(""),
  warranty: text("warranty").default(""),
  price: real("price").notNull(),
  stock: integer("stock").notNull().default(0),
  imageUrl: text("image_url").default(""),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const orders = sqliteTable("orders", {
  id: text("id").primaryKey(), // Full internal ID or UUID
  publicMemo: text("public_memo").notNull().unique(), // e.g. ORD-1234
  clientToken: text("client_token").notNull(), // UUID token stored in user localStorage
  itemsJson: text("items_json").notNull(), // JSON serialized items
  totalAmount: real("total_amount").notNull(),
  paymentMethod: text("payment_method").notNull(), // 'momo' | 'binance'
  status: text("status").notNull().default("PENDING"), // PENDING, PAID_WAITING_CONFIRM, COMPLETED, CANCELLED
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const orderMessages = sqliteTable("order_messages", {
  id: text("id").primaryKey(),
  orderId: text("order_id").references(() => orders.id), // Nullable for global broadcast
  publicMemo: text("public_memo").notNull().default("GLOBAL"), // e.g. ORD-1234 or GLOBAL
  sender: text("sender").notNull().default("ADMIN"), // ADMIN | USER
  content: text("content").notNull(),
  status: text("status").notNull().default("PENDING"), // PENDING, DELIVERED, ACKNOWLEDGED
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderMessage = typeof orderMessages.$inferSelect;
export type NewOrderMessage = typeof orderMessages.$inferInsert;
