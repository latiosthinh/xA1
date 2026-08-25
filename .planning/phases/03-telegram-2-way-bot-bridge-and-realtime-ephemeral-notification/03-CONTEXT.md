# Phase 3 Context: Telegram 2-Way Bot Bridge & Realtime Ephemeral Notification

## Phase Goal
Connect the payment notice submission to Telegram bot alert messages, implement a Telegram Webhook route that parses `/reply <OrderID> <message>` or Telegram message replies, persist messages to Turso DB, build client adaptive polling based on `localStorage` order tokens, and display incoming messages in a header notification bell badge with a one-time ephemeral delivery modal warning users to copy/save the info.

## Locked Technical Decisions
- **Telegram Bot Framework**: `grammY` used via Next.js Route Handler (`/api/telegram/webhook`).
- **Telegram Outbound Alerts**: Triggered directly upon `/api/orders/[id]/pay` POST. Formats items, total, Order ID, and instructions on how admin can reply (`/reply <OrderID> <account_details>`).
- **Telegram Inbound Webhook**:
  - Validates `X-Telegram-Bot-Api-Secret-Token` header if configured.
  - Matches command `/reply <OrderID> <message>` or parses text replies to bot messages.
  - Saves message to `order_messages` table with `status = 'PENDING'`.
- **Client Polling**:
  - Endpoint `POST /api/orders/poll` accepts array of `{ orderId, clientToken }`.
  - Returns any new unacknowledged messages.
  - Updates message status to `DELIVERED`.
- **Notification Bell & Badge**:
  - Located in `Navbar`.
  - Displays animated ringing effect + badge count when unread messages arrive.
- **Ephemeral Message Modal**:
  - Pops up when user clicks notification bell or when message arrives.
  - Prominently warns: *"This message is EPHEMERAL and will disappear once closed. Copy and store your data now!"*
  - Includes a 1-click "Copy All Details" button.
  - On Close / "I have saved it", calls `POST /api/orders/acknowledge-message` to mark message as `ACKNOWLEDGED`.

## Requirements Covered
- `BOT-01`: Telegram alert dispatch upon payment confirmation.
- `BOT-02`: Telegram webhook route for `/reply <OrderID> <message>`.
- `BOT-03`: Turso database persistence for order messages.
- `NOTIF-01`: Notification bell icon with unread badge in Navbar.
- `NOTIF-02`: Browser polling endpoint using `localStorage` tokens.
- `NOTIF-03`: Ephemeral modal display on bell click.
- `NOTIF-04`: Warning banner instructing user to store/save data.
- `NOTIF-05`: Message acknowledgment on modal dismissal.
