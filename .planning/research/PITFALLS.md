# Domain Pitfalls

**Domain:** Simple Web Store with Manual QR Checkout & 2-Way Telegram Bot Notification Bridge  
**Researched:** 2026-08-25  

---

## Critical Pitfalls

Mistakes causing architectural rewrites, data loss, or critical security vulnerabilities.

---

### Pitfall 1: Predictable Order IDs & Order Hijacking (IDOR)

* **What goes wrong:** Sequential or short alphanumeric Order IDs (`#1001`, `ORD-1234`) allow attackers to enumerate endpoints, spy on other customers' carts/memos, and intercept confidential admin responses (delivery keys, codes, download links).
* **Why it happens:** Developer assumes manual QR memo readability requires short integer IDs without a separate client authorization mechanism.
* **Consequences:** Critical privacy breach. Anonymous buyers view/hijack other buyers' orders and claim digital items or sensitive delivery instructions.
* **Detection:**
  * Order lookup endpoint accepts bare numeric ID: `GET /api/orders?id=123`.
  * No secondary verification token stored in client `localStorage`.
* **Prevention:**
  * Generate two distinct identifiers per order:
    1. `publicMemo` / `orderCode`: Short readable unique string for bank/MoMo transfer memo (e.g., `ORD-7K9X2`).
    2. `clientSecret`: Cryptographically random UUIDv4 or NanoID stored in client `localStorage` and sent via `X-Order-Token` header.
  * DB query for polling/SSE must require both `id` AND `client_token_hash`.
* **Phase to address:** Phase 2 (Data Layer & Checkout API).

---

### Pitfall 2: Telegram Webhook Timeout & Retry Storm on Serverless

* **What goes wrong:** Next.js Route Handler (`/api/telegram/webhook`) executes synchronous database queries, notification parsing, or external API calls before responding to Telegram. If execution takes > 5 seconds, Telegram drops connection and retries the webhook every few seconds.
* **Why it happens:** Telegram requires HTTP `200 OK` within short window (< 5-10s). Serverless cold starts + DB roundtrips exceed this limit.
* **Consequences:** Telegram floods webhook with duplicate updates. Single `/reply` command creates multiple duplicate notifications in database and spams client SSE/polling stream.
* **Detection:**
  * Server logs show duplicate `update_id` payloads arriving in bursts.
  * Telegram webhook info (`getWebhookInfo`) shows `has_custom_certificate: false, pending_update_count > 10`.
* **Prevention:**
  * Validate webhook payload structure and secret token immediately.
  * Record processed `update_id` in database / KV with unique constraint to drop duplicate updates idempotently.
  * Return `Response.json({ ok: true })` immediately; handle business logic via decoupled handler or fast single-statement DB update.
  * Never use long-polling (`bot.launch()`) inside Next.js serverless functions.
* **Phase to address:** Phase 3 (Telegram Bot Bridge & Webhooks).

---

### Pitfall 3: Ephemeral Delivery Race Condition & Data Loss

* **What goes wrong:** Admin sends digital item (license key, account info, private download link) via Telegram `/reply`. Customer tab refreshes or loses connection right as message arrives. System marks message as "delivered" or "read" upon initial fetch. Modal never renders or closes immediately, permanently destroying customer's one-time data.
* **Why it happens:** Server marks message state `read` upon delivery in the GET/poll response instead of waiting for explicit client-side confirmation.
* **Consequences:** Customer never receives purchased item. Customer support friction, chargebacks, or manual admin intervention.
* **Detection:**
  * DB schema lacks explicit `acknowledged_at` or `dismissed_at` timestamp.
  * Client polling route updates message status to `READ` during `SELECT`.
* **Prevention:**
  * Treat ephemeral UI as frontend presentation only, not destructive DB deletion.
  * Server sets message status: `PENDING` -> `DELIVERED` (received by client) -> `ACKNOWLEDGED` (customer clicked "I have saved this / Dismiss").
  * Client stores acknowledged state in `localStorage`. If user refreshes before clicking dismiss, notification reappears.
  * Add clear visual warning in modal: *"Copy or save this information. Once dismissed, this window cannot be reopened."*
* **Phase to address:** Phase 4 (Realtime Sync & Client Notification UI).

---

### Pitfall 4: Unauthenticated Telegram Webhook Spoofing

* **What goes wrong:** Anyone sends fake HTTP POST requests to `/api/telegram/webhook` impersonating Telegram servers, executing `/reply` commands to send phishing links or mark orders paid.
* **Why it happens:** Webhook endpoint is publicly exposed on internet without validating `X-Telegram-Bot-Api-Secret-Token`.
* **Consequences:** Unauthorized users inject arbitrary messages into buyer notification modals and tamper with order states.
* **Detection:**
  * `app/api/telegram/webhook/route.ts` does not check `request.headers.get("x-telegram-bot-api-secret-token")`.
  * Telegram `setWebhook` API was called without `secret_token` parameter.
* **Prevention:**
  * Generate high-entropy secret token (`TELEGRAM_WEBHOOK_SECRET` in `.env`).
  * Pass secret token when registering webhook with Telegram API: `setWebhook?url=...&secret_token=...`.
  * Reject all requests where header does not match exact secret with HTTP `401 Unauthorized`.
  * Restrict accepted Telegram chat IDs strictly to configured `TELEGRAM_ADMIN_CHAT_ID`.
* **Phase to address:** Phase 3 (Telegram Bot Bridge & Webhooks).

---

## Moderate Pitfalls

---

### Pitfall 5: Telegram Rate Limiting & Notification Flood (429 Too Many Requests)

* **What goes wrong:** Multiple buyers click "Done / I have paid" simultaneously or rapid checkout bursts occur. Bot hits Telegram API rate limits: max 1 message/second per group/chat and 30 messages/second overall.
* **Why it happens:** Client "I have paid" button directly fires Telegram `sendMessage` API without debounce or queue.
* **Consequences:** Telegram returns HTTP `429 Too Many Requests` with `retry_after`. Notifications fail silently; admin never sees orders in Telegram channel.
* **Detection:**
  * Logs show `ETELEGRAM: 429 Too Many Requests: retry after X seconds`.
  * Customer can click "I have paid" button 10 times in 2 seconds.
* **Prevention:**
  * Client-side button disable + spinner upon click.
  * Server-side cooldown per Order ID: reject duplicate "paid" status dispatch if last notification sent < 30 seconds ago.
  * Handle Telegram 429 responses with exponential backoff / retry catch block.
* **Phase to address:** Phase 2 (Checkout Flow) & Phase 3 (Telegram Bot Bridge).

---

### Pitfall 6: Bank & MoMo Memo Truncation and Character Stripping

* **What goes wrong:** Order memo generated as `ORDER_#104_ABC` gets corrupted during banking transfers. Vietnamese banking apps, Binance Pay notes, or MoMo apps strip special characters (`#`, `_`, hyphens) or truncate memos longer than 15-20 characters.
* **Why it happens:** Memos contain unsupported symbols or exceed payment gateway note fields.
* **Consequences:** Admin receives bank notification with truncated memo `ORDER 104 ABC` or `ORDER104`, cannot match payment with Telegram order ID, causing manual order lookup delays.
* **Detection:**
  * Memo format contains special characters (`#`, `$`, `_`, `-`) or exceeds 10 alphanumeric characters.
* **Prevention:**
  * Enforce strict regex for payment memos: `^[A-Z0-9]{6,10}$` (e.g., `MMO8921X`).
  * Display 1-click "Copy Memo" and "Copy Exact Amount" buttons in checkout UI.
  * Render explicit QR codes with pre-filled memo parameters (MoMo quicklink / VietQR format).
* **Phase to address:** Phase 2 (Checkout UI & Payment Instructions).

---

### Pitfall 7: Serverless SSE Connection Starvation & Timeouts

* **What goes wrong:** Using Server-Sent Events (SSE) on Next.js serverless functions (e.g., Vercel / Cloudflare Workers without Durable Objects) keeps lambdas alive, running out of execution timeout (10s–60s) and hitting maximum concurrent connection limits.
* **Why it happens:** Serverless compute is designed for short request/response lifecycles, not persistent streaming sockets.
* **Consequences:** SSE stream abruptly cuts off every 15–30 seconds; client enters aggressive reconnect loops; serverless bill spikes.
* **Detection:**
  * Next.js route uses `ReadableStream` with `setInterval` on standard Vercel serverless functions without external pub/sub.
  * Console displays constant `EventSource's response has a status code 504 / connection closed`.
* **Prevention:**
  * For lightweight serverless store: use adaptive short-polling (poll `/api/orders/[id]/notifications` every 4–5 seconds when order is pending, slow to 15s after 5 minutes, stop when dismissed or order completed).
  * If SSE is strictly required: ensure client handles reconnection transparently with `Last-Event-ID` offset or use external realtime layer.
* **Phase to address:** Phase 4 (Realtime Notification Sync).

---

### Pitfall 8: LocalStorage Wiping & Multi-Tab Desynchronization

* **What goes wrong:** Buyer opens store in Safari Private Browsing / Incognito, navigates to payment app, Safari clears localStorage session, or buyer opens notification in a second tab causing desync.
* **Why it happens:** LocalStorage is isolated per incognito session and prone to OS-level mobile browser cache purging.
* **Consequences:** Buyer returns to web store, finds empty active order state, loses access to pending order and admin reply modal.
* **Detection:**
  * App crashes or redirects to empty cart if `localStorage.getItem('active_order')` is null.
  * User cannot recover order without asking admin.
* **Prevention:**
  * Store Order Access Token in both `localStorage` and URL query parameter fallback (e.g., `/checkout/status?order=ORD123&token=xyz`).
  * Provide simple "Track Order" modal where customer can enter their Order ID + Phone/Email/Pin if localStorage is wiped.
  * Broadcast channel / `storage` event listener on `window` to sync modal state across multiple open tabs.
* **Phase to address:** Phase 2 (State Persistence) & Phase 4 (Client UI).

---

## Minor Pitfalls

---

### Pitfall 9: Markdown / HTML Injection in Telegram Message Formatting

* **What goes wrong:** Buyer names or product titles contain unescaped characters like `_`, `*`, `[`, `]`, `(`, `)`, `<`, `>`, `&`. Telegram bot fails to send notification with `Bad Request: can't parse entities`.
* **Why it happens:** Constructing Telegram messages using naive string concatenation with `parse_mode: 'MarkdownV2'` or `parse_mode: 'HTML'`.
* **Consequences:** Order notifications fail silently or crash bot worker when specific characters appear in cart items.
* **Detection:**
  * Logs show `TelegramError: 400 Bad Request: can't parse entities: character '_' is reserved`.
* **Prevention:**
  * Use dedicated sanitization helper (e.g., escaping all MarkdownV2 reserved characters `\_*[]()~>#+-=|{}.!`) or use standard plain text / strict HTML escaping (`&lt;`, `&gt;`, `&amp;`).
* **Phase to address:** Phase 3 (Telegram Bot Bridge).

---

### Pitfall 10: Admin Command Parsing Ambiguity in Telegram

* **What goes wrong:** Admin tries to reply to an order using `/reply ORD123 Here is your account: user:pass 123`. Parser splits on spaces incorrectly or fails when message contains line breaks and spaces.
* **Why it happens:** Naive `message.text.split(' ')` where index 0 is `/reply`, index 1 is `orderId`, and rest is joined without handling multi-line strings.
* **Consequences:** Admin reply gets truncated or fails regex, resulting in no message delivered to customer.
* **Detection:**
  * Multi-line credentials sent from Telegram only deliver the first line to buyer modal.
* **Prevention:**
  * Support two intuitive reply mechanisms:
    1. Direct Telegram message reply (admin swipes right / replies to the bot's order message, bot extracts Order ID from original message metadata/DB tracking).
    2. Regex-based command parser: `/reply\s+([A-Za-z0-9_-]+)\s+([\s\S]+)` capturing all remaining text including newlines.
* **Phase to address:** Phase 3 (Telegram Bot Bridge).

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|---|---|---|
| **Phase 1: Foundation & Auth** | Cookie session hijacking or `.env` credential leak | Secure HttpOnly cookies, strict SameSite, hashed password check in constant time (`crypto.timingSafeEqual`). |
| **Phase 2: Cart & Checkout API** | IDOR order lookup & memo collisions | Cryptographic `clientSecret` token + strict alphanumeric short memo generator. |
| **Phase 3: Telegram Bot Bridge** | Webhook timeout, retry storms & unauthenticated spoofing | Validate `X-Telegram-Bot-Api-Secret-Token`, idempotent update processing, immediate 200 OK. |
| **Phase 4: Client Notification Sync** | Ephemeral message loss & serverless SSE timeouts | Client-side explicit ACK (`acknowledged_at`), adaptive short-polling over unmanaged long-lived SSE. |
| **Phase 5: Storefront UI & Edge Polish** | Bank memo character stripping & copy-paste errors | Single-tap copy buttons, clear transfer instructions, VietQR/MoMo deep link formatting. |

---

## Sources

* [Telegram Bot API - Webhooks Best Practices & Security](https://core.telegram.org/bots/api#setwebhook) (HIGH confidence)
* [Next.js App Router Route Handlers & Streaming Lifecycle](https://nextjs.org/docs/app/building-your-application/routing/route-handlers) (HIGH confidence)
* [LibSQL / Turso Serverless SQLite Transaction Concurrency](https://docs.turso.tech) (HIGH confidence)
* Common E-commerce IDOR & Manual QR Payment Post-Mortems (MEDIUM confidence)
