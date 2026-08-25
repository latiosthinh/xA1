# Requirements: Simple Web Store with Telegram Checkout & 2-Way Bot Bridge

## v1 Requirements

### Authentication & Admin
- [ ] **AUTH-01**: Admin can authenticate via `.env` credentials through a clean login page and receive a secure HTTP-only session cookie.
- [ ] **AUTH-02**: Admin can access protected routes and log out cleanly.

### Product Management
- [ ] **PROD-01**: Admin can view, create, edit, and delete products with name, description, price, and image/icon URL.
- [ ] **PROD-02**: Products are stored and indexed in Turso LibSQL database.

### Storefront & Cart
- [ ] **STORE-01**: Customer can browse the product catalog on a responsive storefront.
- [ ] **STORE-02**: Customer can select quantities and add/modify/remove items in a client-side cart.
- [ ] **STORE-03**: Customer can view cart summary with calculated totals before checkout.

### Checkout & Manual Payment Flow
- [ ] **PAY-01**: Customer can proceed to checkout, creating an order with a unique short Order ID / memo and a secure client token stored in `localStorage`.
- [ ] **PAY-02**: Checkout screen renders MoMo QR code and Binance Pay ID with exact payable amount and transfer memo instructions.
- [ ] **PAY-03**: 1-click copy buttons for Binance Pay ID, MoMo Account/Phone, Amount, and Order Memo.
- [ ] **PAY-04**: Customer clicks "Done" button to confirm payment transfer, triggering an order status transition to "Paid Pending Confirmation" and displaying a 5-10 minute processing guideline.

### Telegram Bot 2-Way Notification Bridge
- [ ] **BOT-01**: When customer clicks "Done", server formats order details (items, total, Order ID, timestamp) and dispatches alert message to Telegram admin chat.
- [ ] **BOT-02**: Next.js webhook endpoint receives Telegram updates, authenticates the request secret, and parses admin reply commands (`/reply <OrderID> <message>`).
- [ ] **BOT-03**: Admin reply is persisted in Turso database mapped to the specific Order ID.

### Realtime Notification & Ephemeral Delivery Modal
- [ ] **NOTIF-01**: Storefront header displays a notification bell icon with an unread badge indicator.
- [ ] **NOTIF-02**: Client polls API with stored `localStorage` order tokens to check for new admin messages.
- [ ] **NOTIF-03**: Clicking the bell icon opens an ephemeral modal showing the admin message content.
- [ ] **NOTIF-04**: Ephemeral modal displays an explicit warning instructing the user to copy/save the data because it will disappear upon closing.
- [ ] **NOTIF-05**: Closing the modal marks the message as acknowledged/read.

## v2 Requirements (Deferred)

- Automated payment webhooks (MoMo IPN, Binance Pay Webhook).
- Multi-channel push notifications (Web Push API).
- Rich media file uploads for product images (Cloudflare R2 / S3 integration).
- Full customer account registration and order history dashboard.

## Out of Scope

- Multi-vendor marketplace support.
- Stripe / PayPal automated card chargebacks.
- Live customer-to-admin WebSocket continuous chat widget.

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| PROD-01 | Phase 1 | Pending |
| PROD-02 | Phase 1 | Pending |
| STORE-01 | Phase 2 | Pending |
| STORE-02 | Phase 2 | Pending |
| STORE-03 | Phase 2 | Pending |
| PAY-01 | Phase 2 | Pending |
| PAY-02 | Phase 2 | Pending |
| PAY-03 | Phase 2 | Pending |
| PAY-04 | Phase 2 | Pending |
| BOT-01 | Phase 3 | Pending |
| BOT-02 | Phase 3 | Pending |
| BOT-03 | Phase 3 | Pending |
| NOTIF-01 | Phase 3 | Pending |
| NOTIF-02 | Phase 3 | Pending |
| NOTIF-03 | Phase 3 | Pending |
| NOTIF-04 | Phase 3 | Pending |
| NOTIF-05 | Phase 3 | Pending |
