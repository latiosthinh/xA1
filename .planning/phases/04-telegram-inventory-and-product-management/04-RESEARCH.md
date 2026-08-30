# Phase 4 Research: Telegram Inventory Sync & Product Management

## Architecture & Integration

### 1. Stock Deduction on Payment Confirmation
- **Location**: `src/app/api/telegram/webhook/route.ts` inside status update branch `statusArg === "1"`.
- **Logic**:
  - Parse `matchedOrder.itemsJson` (Array of `{ id?: string, name?: string, quantity: number, price: number }`).
  - For each item in the order, look up product in `products` table by `item.id` (or fallback matching by exact `name`).
  - Calculate `newStock = Math.max(0, (product.stock ?? 0) - item.quantity)`.
  - Update `products` record with new stock.
  - Include summary of updated stock in the Telegram confirmation response sent back to admin.

### 2. Product Management via Telegram Bot Commands
- **Command Parser**: Expand command branching in `src/app/api/telegram/webhook/route.ts` with pipe `|` delimiter support for multi-field inputs.
- **Commands**:
  1. `/products` or `/list`: Fetch all products, format as concise markdown table/list showing ID, Name, Price, and Stock status.
  2. `/product <id>`: View details of a specific product.
  3. `/addproduct <name> | <price> | <stock> | [imageUrl] | [description]`: Create new product in `products` table using `crypto.randomUUID()`.
  4. `/setstock <id> <stock>`: Direct fast stock adjustment.
  5. `/editproduct <id> | <name> | <price> | <stock> | [imageUrl] | [description]`: Update product in `products` table.
  6. `/delproduct <id>`: Delete product from `products` table.
  7. `/help` or `/start`: Display all available admin commands.

### 3. Edge Cases & Safeguards
- **Delimiters**: Pipe `|` format allows product names/descriptions containing spaces without messy quote escaping.
- **Admin Chat Verification**: Verify `String(chatId) === String(process.env.TELEGRAM_ADMIN_CHAT_ID)` before executing product mutations or listing.
- **Drizzle Queries**: Safe atomic updates with error handling and fallback messages if product ID is not found.
