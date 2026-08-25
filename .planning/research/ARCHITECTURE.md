# Architecture Patterns: Simple Web Store with Telegram 2-Way Notification Bridge

**Domain:** Lightweight E-Commerce & Ephemeral Live Notification
**Date:** 2026-08-25
**Confidence:** HIGH

---

## System Overview

Single-instance fullstack Next.js App Router application backed by Turso SQLite (`@libsql/client`).
No external customer account creation. Buyers tracked client-side via LocalStorage order keys (`order_id` + secret read `token`).
Admin interacts through Next.js dashboard (password session) and directly in Telegram chat (replies routed via webhook).

```
                                    +-----------------------------------------+
                                    |              Telegram App               |
                                    |        (Admin Chat / Channel)           |
                                    +--------------------+--------------------+
                                                         ^          |
                                (1) Dispatch Order Notice|          | (2) Reply /reply <id> <msg>
                                                         |          v
+------------------+         +---------------------------+----------+--------------------------+
|  Buyer Browser   |         |                    Next.js Backend                      |
|                  |         |                                                                 |
| [Store & Cart]   | ------> | POST /api/orders (Create Order & Token)                         |
|                  |         | POST /api/orders/[id]/pay-notify (Trigger Telegram Dispatch)    |
|                  |         |                                                                 |
| [Polling / SSE]  | <====== | GET  /api/orders/[id]/messages?token=... (Fetch unread msg)     |
| [Modal & Bell]   | ------> | POST /api/orders/[id]/messages/ack (Acknowledge / Mark read)    |
|                  |         |                                                                 |
|                  |         | POST /api/telegram/webhook (Parse Admin /reply or Telegram reply)|
+------------------+         +-------------------------------+---------------------------------+
                                                             |
                                                             v
                                             +---------------+---------------+
                                             |      Turso LibSQL (SQLite)    |
                                             |  - products                   |
                                             |  - orders                     |
                                             |  - order_items                |
                                             |  - messages                   |
                                             +-------------------------------+
```

---

## Component Boundaries

| Component | Layer / Path | Responsibility | Communicates With |
|---|---|---|---|
| **Storefront & Cart** | React Client Component (`/`, `components/cart/`) | Product display, quantity pick, LocalStorage cart state, checkout trigger | LocalStorage, `POST /api/orders` |
| **Payment Modal & QR** | React Client Component (`components/checkout/`) | Show dynamic MoMo QR (VietQR standard / phone memo) & Binance Pay ID with Order ID memo; "I have paid" trigger | `POST /api/orders/[id]/pay-notify` |
| **Notification Engine** | React Client Component (`components/notifications/`) | Polls or listens for new message, controls badge counter on bell icon, displays destructive/ephemeral modal | `GET /api/orders/[id]/messages`, LocalStorage |
| **Admin Dashboard** | React Server/Client (`/admin`) | Manage products, view incoming orders, trigger manual fulfillment / messages | Cookie Auth, Turso DB, Telegram Bot API |
| **Admin Auth Handler** | Route Handlers / Middleware (`/api/admin/login`, `/api/admin/logout`) | Validate against `ADMIN_PASSWORD` in `.env`, issue encrypted HTTP-only cookie session (Iron-Session or HMAC token) | Next.js Cookie Store, Admin routes |
| **Order & Dispatch API** | API Route (`/api/orders`, `/api/orders/[id]/pay-notify`) | Create order, write to Turso, send formatted Markdown message with inline details to Telegram Admin Chat | Turso DB, Telegram Bot API |
| **Telegram Webhook** | API Route (`/api/telegram/webhook`) | Verify Telegram secret token, parse `/reply <OrderID> <text>` or direct replies, append message record | Turso DB |
| **Message Sync API** | API Route (`/api/orders/[id]/messages`) | Serve messages destined for given `order_id` verified via client token; handle ACK marking | Turso DB, Buyer Browser |

---

## Data Flow: 2-Way Order & Reply Pipeline

### 1. Order Creation & Payment Notification
1. **User** fills cart and clicks Checkout -> Browser generates/requests new order.
2. `POST /api/orders`:
   - Calculates total price on server from DB product prices.
   - Inserts `orders` row (`status: 'pending'`) and `order_items`.
   - Generates random `client_token` (e.g. `nanoid(16)`).
   - Returns `order_id`, `client_token`, `total_amount`, and payment metadata.
3. **Browser** stores `{ orderId, token, createdAt }` in `localStorage.getItem('mmo_orders')`.
4. **Checkout Modal** renders MoMo QR with memo `MMO<order_id>` and Binance Pay details.
5. **User** clicks "I have paid":
   - Calls `POST /api/orders/[id]/pay-notify` with `token`.
   - Server updates status to `awaiting_confirmation`.
   - Server formats Telegram message:
     ```markdown
     *NEW ORDER #1042*
     Total: 150,000 VND / 6.00 USDT
     Items:
     - 2x Product A (100,000 VND)
     - 1x Product B (50,000 VND)
     Memo: MMO1042
     Status: Awaiting Verification

     To reply to buyer:
     `/reply 1042 Here is your license key: XXXX-YYYY`
     ```
   - Dispatches message to `TELEGRAM_CHAT_ID` via Telegram Bot API `sendMessage`.

### 2. Admin Reply Dispatch
1. **Admin** reads Telegram chat and sees incoming payment on bank/Binance app.
2. **Admin** types in Telegram: `/reply 1042 Here is your key: ABCD-1234` (or replies directly to bot message).
3. **Telegram** invokes `POST /api/telegram/webhook`.
4. **Webhook Handler**:
   - Verifies `X-Telegram-Bot-Api-Secret-Token`.
   - Parses regex `/reply\s+([A-Za-z0-9_-]+)\s+([\s\S]+)/i` or extracts replied message context.
   - Verifies `order_id` exists in Turso DB.
   - Inserts row into `messages`: `(order_id, sender='admin', content=..., is_read=0)`.
   - Returns HTTP 200 to Telegram.

### 3. Client Ephemeral Delivery
1. **Browser Notification Manager** (runs on layout root):
   - Reads active orders list from LocalStorage.
   - Polls `GET /api/orders/batch-poll` (or SSE endpoint) every 4-6 seconds with array of `{ id, token }`.
2. **Server** returns any unread message matching `order_id` + `token`.
3. **Browser**:
   - Increments unread badge count on Bell icon.
   - Triggers persistent toast / opens Ephemeral Modal.
   - Modal renders message content with warning banner: *"Important: This message is one-time only. Copy credentials before closing."*
   - On close or copy action, browser calls `POST /api/orders/[id]/messages/ack` with `message_id`.
   - Server updates `is_read = 1` in DB.

---

## Database Schema (Turso / SQLite)

```sql
-- 1. Products Table
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,               -- e.g. 'prod_abc123' or nanoid
    name TEXT NOT NULL,
    description TEXT,
    price_vnd INTEGER NOT NULL,        -- store in lowest unit (VND integer)
    price_usdt REAL NOT NULL,          -- store USDT rate (e.g. 5.50)
    image_url TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- 2. Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,               -- Short alphanumeric or integer ID (e.g. '1042' or 'ord_xxx')
    client_token TEXT NOT NULL,        -- Secret random token stored in user's localStorage
    payment_method TEXT NOT NULL,      -- 'momo' | 'binance'
    total_vnd INTEGER NOT NULL,
    total_usdt REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'awaiting_confirmation' | 'completed' | 'cancelled'
    telegram_message_id INTEGER,       -- ID of dispatched Telegram message (for message thread replies)
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- 3. Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES products(id),
    product_name TEXT NOT NULL,        -- Snapshot at time of order
    unit_price_vnd INTEGER NOT NULL,
    unit_price_usdt REAL NOT NULL,
    quantity INTEGER NOT NULL
);

-- 4. Messages Table (2-Way Communication)
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    sender TEXT NOT NULL,              -- 'admin' | 'buyer'
    content TEXT NOT NULL,
    is_read INTEGER NOT NULL DEFAULT 0, -- 0 = unread, 1 = read/acked
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_orders_client_token ON orders(id, client_token);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(order_id, is_read);
```

---

## Implementation Patterns & Snippets

### Pattern 1: Admin Simple Auth (Password Session via Native Cookie)
No heavy auth libraries (Auth.js/NextAuth). Use simple Iron-Session or HMAC cookie token against `ADMIN_PASSWORD`.

```typescript
// lib/auth.ts
import { cookies } from "next/headers";
import crypto from "crypto";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD!;
const COOKIE_NAME = "mmo_admin_session";

export function createAdminSession(): string {
  const token = crypto.createHmac("sha256", ADMIN_PASSWORD).update("admin_auth_v1").digest("hex");
  return token;
}

export async function verifyAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;
  if (!session) return false;
  const expected = createAdminSession();
  return crypto.timingSafeEqual(Buffer.from(session), Buffer.from(expected));
}
```

### Pattern 2: Lightweight Telegram Webhook Handler
Process raw Telegram updates without heavy daemon processes.

```typescript
// app/api/telegram/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-telegram-bot-api-secret-token");
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const update = await req.json();
  const message = update.message;
  if (!message || !message.text) {
    return NextResponse.json({ ok: true });
  }

  // Support `/reply <orderId> <message>`
  const match = message.text.match(/^\/reply\s+([a-zA-Z0-9_-]+)\s+([\s\S]+)$/i);
  if (match) {
    const [, orderId, replyContent] = match;

    // Check order existence
    const order = await db.execute({
      sql: "SELECT id FROM orders WHERE id = ?",
      args: [orderId]
    });

    if (order.rows.length === 0) {
      await sendTelegramMessage(message.chat.id, `❌ Order #${orderId} not found.`);
      return NextResponse.json({ ok: true });
    }

    const msgId = crypto.randomUUID();
    await db.execute({
      sql: "INSERT INTO messages (id, order_id, sender, content, is_read) VALUES (?, ?, 'admin', ?, 0)",
      args: [msgId, orderId, replyContent]
    });

    await sendTelegramMessage(message.chat.id, `✅ Message delivered to Order #${orderId}`);
  }

  return NextResponse.json({ ok: true });
}
```

### Pattern 3: Client Notification Hook (Short Polling / SSE fallback)
`ponytail: using short-polling (4s) for simplicity. Upgrade to Server-Sent Events (SSE) if traffic exceeds 10k users.`

```typescript
// hooks/useOrderNotifications.ts
"use client";
import { useEffect, useState } from "react";

export function useOrderNotifications() {
  const [unreadMessages, setUnreadMessages] = useState<any[]>([]);

  useEffect(() => {
    const poll = async () => {
      const stored = localStorage.getItem("mmo_orders");
      if (!stored) return;
      const orders = JSON.parse(stored); // array of { id, token }
      if (!orders.length) return;

      try {
        const res = await fetch("/api/orders/messages/poll", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orders })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.messages && data.messages.length > 0) {
            setUnreadMessages(data.messages);
          }
        }
      } catch (err) {
        console.error("Poll error:", err);
      }
    };

    const interval = setInterval(poll, 4000);
    poll();
    return () => clearInterval(interval);
  }, []);

  return { unreadMessages, setUnreadMessages };
}
```

---

## Anti-Patterns to Avoid

| Anti-Pattern | Why Bad | Correct Approach |
|---|---|---|
| **Full Auth / Account Setup for Buyers** | High friction, drops conversion for simple digital items | Anonymous order ID + client-side secret token in LocalStorage |
| **Storing Long-Lived WebSocket Server in Next.js Serverless** | Next.js API routes / Vercel disconnect persistent stateful WebSockets | Client HTTP short-polling (4s interval) or SSE streaming route |
| **Sending Telegram message without Secret Header check** | Anyone can POST to webhook and inject fake messages into database | Set `TELEGRAM_WEBHOOK_SECRET` and check `X-Telegram-Bot-Api-Secret-Token` |
| **Trusting Client-Supplied Prices at Checkout** | Client can tamper with price in request body | Client sends only `productId` and `quantity`; server computes total from DB prices |
| **Auto-Dismissing Sensitive Notification Modals** | If user accidentally clicks outside, delivered keys/codes are lost forever | Modal cannot close on backdrop click; requires explicit "I have saved this" checkbox or copy action |

---

## Suggested Build Order & Dependencies

```
[Phase 1: DB & Core Admin Auth]
  ├── Turso Client & Schema Setup (products, orders, messages)
  └── Admin Authentication & Product CRUD (/admin)
         │
         v
[Phase 2: Public Storefront & Local Cart]
  ├── Product catalog grid & detail cards
  └── LocalStorage Cart state & Checkout Drawer
         │
         v
[Phase 3: Order Engine & Multi-Payment QR Modal]
  ├── POST /api/orders (Price calculation & token issue)
  ├── VietQR / MoMo dynamic URL generator & Binance Pay ID card
  └── Order Token persistence in Buyer LocalStorage
         │
         v
[Phase 4: Telegram Bot 2-Way Bridge]
  ├── Telegram dispatch on "I have paid" (/api/orders/[id]/pay-notify)
  └── Telegram Webhook route (/api/telegram/webhook) with /reply parser
         │
         v
[Phase 5: Notification Bell & Ephemeral Modal]
  ├── Polling/Sync API (/api/orders/messages/poll & /ack)
  ├── Root layout Notification Bell with unread counter
  └── Destructive/Ephemeral delivery modal with clipboard copy warning
```
