# Phase 4 Context: Telegram Inventory Sync & Product Management Bot

## Decisions

- **D-01 (Stock Deduction Trigger)**: When admin verifies payment success via Telegram webhook (`/send <OrderID> 1` or `/reply <OrderID> 1`), automatically deduct product stock in the database based on the item quantities in `order.itemsJson`. Ensure stock does not drop below 0 (`Math.max(0, current_stock - quantity)`).
- **D-02 (Telegram Product Management Commands)**: Add direct Telegram bot commands in the webhook handler for full CRUD management:
  - `/products` or `/list`: Lists all products with ID/short ID, Name, Price (VND/USD), Stock level, and status (IN STOCK / OUT OF STOCK).
  - `/product <id>` or `/view <id>`: Displays detailed info for a single product.
  - `/addproduct <name> | <price> | <stock> | [imageUrl] | [description]`: Adds a new product directly from Telegram.
  - `/setstock <id> <new_stock>`: Quickly updates stock count for a product.
  - `/editproduct <id> <name> | <price> | <stock> | [imageUrl] | [description]`: Updates existing product details.
  - `/delproduct <id>`: Deletes a product by ID.
  - `/help`: Updated help text showing all available order verification, broadcast, and product management commands.
- **D-03 (Security & Admin Authorization)**: Telegram bot commands modifying inventory and products must restrict execution to `TELEGRAM_ADMIN_CHAT_ID` (or ignore unauthorized chat IDs / respond with unauthorized note if attempted from unknown chat).
- **D-04 (UX & Feedback)**: Format Telegram bot responses with clean markdown (code blocks, emoji badges, bold tags) to give immediate visual confirmation of inventory counts and actions.
