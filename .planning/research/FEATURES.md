# Feature Landscape: Simple Web Store with Telegram Checkout & 2-Way Bot Bridge

**Domain:** Lightweight E-Commerce / Manual QR Payments & Telegram Bot Operations  
**Researched:** 2026-08-25  
**Confidence:** HIGH  

---

## Table Stakes

Must-have features. Missing breaks checkout, manual verification, or admin delivery flow.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Product Catalog & Cart** | Customer selects items, adjusts quantities, views line item totals before checkout. | Low | React client state + sync with DB product price / currency. |
| **Unique Order ID Generation** | Distinguishes transactions; acts as reference memo for manual transfers. | Low | Short alphanumeric/nanoid (e.g. 6-8 chars) or sequential prefix (e.g. `ORD-8F3A21`). |
| **Manual Payment Instruction Screen (MoMo / Binance Pay)** | Displays payment recipient details (MoMo phone/QR, Binance Pay ID/QR) and exact total. | Low | Dynamic QR generation or static QR asset + dynamic payment instructions. |
| **Required Payment Memo / Transfer Content** | Enables admin to reconcile manual banking/crypto transfer with specific order. | Low | Must prominently display Order ID as required memo. |
| **"I Have Transferred" / Order Submission Action** | Buyer signals payment is sent; locks order state to `PENDING_VERIFICATION`. | Low | Triggers order record creation in Turso DB and Telegram dispatch. |
| **Telegram Bot Order Dispatch** | Admin receives instant order alert (Order ID, item list, total amount, payment method, buyer memo). | Med | Uses Telegram Bot API (`sendMessage` with Markdown/HTML format or inline action buttons). |
| **Admin Telegram Reply Handling** | Admin delivers fulfillment payload (key, link, account, message) to buyer via Telegram. | Med | Bot webhook or polling parses `/reply <OrderID> <message>` or native message reply to bot order card. |
| **Order Status Tracking & Persistence** | Persists order state (`PENDING`, `COMPLETED`, `REJECTED`) and admin message in Turso DB. | Low | Orders table + messages table schema with index on `order_id`. |
| **Client-side Order Identification** | Anonymous buyer retains active order context across page refreshes. | Low | Save active `order_id` / client secret token in `localStorage`. |
| **Admin Authentication (Store Manager)** | Protects admin product management dashboard and manual order override. | Low | `.env` credentials checked via HTTP-only secure cookie session. |

---

## Differentiators

Competitive advantages and UX enhancers. Reduce transfer errors, speed up verification, or secure sensitive fulfillment payload.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **1-Click Copy Buttons (Order ID / Pay ID / Amount)** | Reduces buyer typing mistakes in banking/crypto apps, minimizing misattributed payments. | Low | Uses `navigator.clipboard.writeText` with visual toast feedback. |
| **Live Web Notification Badge (Bell Icon)** | Instantly alerts buyer on storefront when admin approves order/sends delivery message. | Med | Polling (e.g., 3-5s interval) or Server-Sent Events (SSE) checking active `order_id`. |
| **Ephemeral Delivery Modal with Warning Prompt** | Protects sensitive credentials/keys from persistent screen exposure; urges immediate backup. | Low | Modal shows admin message with prominent "Save this now, message disappears on close" warning. |
| **VietQR / MoMo Deep Links & Dynamic QR** | Allows buyer scanning directly with banking app with pre-filled amount and memo. | Low | Generate dynamic VietQR / MoMo quick-pay URL string embedded in QR canvas. |
| **Telegram Inline Action Buttons for Admin** | Admin can approve, reject, or quick-reply with a single tap in Telegram app. | Med | Telegram `InlineKeyboardMarkup` callback queries (e.g., `callback_data: approve:ORD-123`). |
| **Order Lookup by ID Page** | Allows buyers who cleared browser storage to check order delivery status. | Low | Read-only status check page requiring Order ID + optional secret hash. |

---

## Anti-Features

Deliberately NOT built. Prevents scope creep and keeps architecture lightweight.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Automated Payment Gateways (Stripe, PayPal, MoMo IPN)** | High integration overhead, business registration required, merchant fees, potential account freezes. | Pure manual QR verification by admin via Telegram. |
| **Customer User Accounts & Password Auth** | Adds friction to checkout; increases DB complexity and security liability. | Anonymous session stored in `localStorage` + unique Order ID lookup. |
| **Complex Real-time Inventory Reservation Locks** | Overkill for digital goods / low-volume catalog; risks inventory lockouts on abandoned carts. | Stock validation at checkout submission time; manual admin override if out of stock. |
| **Full In-App Live Chat System** | Heavy WebSocket infrastructure and complex multi-threaded UI. | 1-way / 2-way asynchronous broadcast via Telegram bot reply to web modal. |
| **Native Mobile App (iOS/Android)** | Maintenance overhead across app stores; unnecessary for lightweight store. | Responsive mobile-first PWA / web layout. |

---

## Feature Dependencies

```
[Product Catalog & Cart]
           │
           ▼
[Order ID Generation & Manual Payment Screen]
           │
           ├──────────────────────────┐
           ▼                          ▼
[Order Submission & DB Save]    [LocalStorage Token Sync]
           │                          │
           ▼                          │
[Telegram Bot Notification]          │
           │                          │
           ▼                          │
[Admin Telegram /reply Command]       │
           │                          │
           ▼                          ▼
[Turso DB Message Update] ───► [Client SSE / Polling]
                                      │
                                      ▼
                           [Notification Bell Badge]
                                      │
                                      ▼
                        [Ephemeral Delivery Modal]
```

---

## MVP Recommendation

### Phase 1 Priority (Minimum Viable Flow)
1. **Catalog & Cart:** Product browsing, cart management, total price calculation.
2. **Manual Payment View:** Display MoMo QR / Binance Pay ID with dynamic Order ID memo and 1-click copy buttons.
3. **Telegram Dispatch:** Send order payload to Telegram admin chat on "I Have Transferred".
4. **Admin Reply Webhook/Command:** Process `/reply <OrderID> <message>` or direct reply from Telegram to store admin message in Turso DB.
5. **Client Notification & Ephemeral Modal:** Polling mechanism checking order status using `localStorage` Order ID + bell alert + ephemeral modal with save warning.
6. **Basic Admin Auth:** Simple `.env` session for product CRUD operations.

### Defer to Post-MVP
- **VietQR Dynamic Bank Strings:** Nice-to-have, static MoMo QR + Binance Pay ID is sufficient for initial release.
- **Telegram Inline Interactive Buttons:** `/reply` command or direct message reply is faster to ship first.
- **Order Lookup Page:** Fallback for lost sessions, can be added after core single-session flow is stable.

---

## Sources

- Project Context: `PROJECT.md`
- Telegram Bot API Documentation: Webhook & Message Reply specifications
- E-Commerce Manual Payment Design Patterns (VietQR / Binance Pay P2P workflows)
