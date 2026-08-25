# Roadmap: Simple Web Store with Telegram Checkout & 2-Way Bot Bridge

## Overview

Deliver a lightweight e-commerce storefront with Turso SQLite persistence, multi-payment QR checkout (MoMo & Binance Pay), and an instant 2-way Telegram admin-to-customer notification bridge.

## Phases

- [ ] **Phase 1: Foundation, Admin Auth & Product Catalog** - Project foundation, Turso SQLite schema, secure admin auth, and product CRUD management.
- [ ] **Phase 2: Storefront, Cart & Multi-Payment QR Checkout** - Public product catalog, client-side cart, order creation, and MoMo/Binance QR checkout with copy utilities.
- [ ] **Phase 3: Telegram 2-Way Bot Bridge & Realtime Ephemeral Notification** - Telegram bot alert dispatch, `/reply` webhook ingestion, client polling, and bell icon ephemeral delivery modal.

## Phase Details

### Phase 1: Foundation, Admin Auth & Product Catalog
**Goal**: Admin can securely log in to the management dashboard and manage product catalog in Turso database.
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, PROD-01, PROD-02
**Success Criteria** (what must be TRUE):
  1. Admin can log in using credentials from `.env` and is redirected to the protected dashboard with a valid HTTP-only session cookie.
  2. Admin can create, edit, view, and delete products (name, description, price, image URL) with updates immediately reflected in Turso SQLite.
  3. Unauthenticated users attempting to access `/admin` or protected admin APIs are rejected and redirected to the login page.
  4. Admin can log out, clearing the session cookie and revoking dashboard access.
**Plans**: TBD
**UI hint**: yes

### Phase 2: Storefront, Cart & Multi-Payment QR Checkout
**Goal**: Customers can browse products, manage their cart, and complete manual checkout with MoMo QR and Binance Pay instructions.
**Depends on**: Phase 1
**Requirements**: STORE-01, STORE-02, STORE-03, PAY-01, PAY-02, PAY-03, PAY-04
**Success Criteria** (what must be TRUE):
  1. Customer can browse responsive product catalog and add/adjust/remove item quantities in cart with live price calculations.
  2. Customer can initiate checkout to generate a unique short Order ID and store a client authorization token in `localStorage`.
  3. Checkout page displays MoMo QR code, Binance Pay ID, and 1-click copy buttons for exact amount and order memo.
  4. Customer clicking "Done" marks the order as pending confirmation and receives clear 5-10 minute fulfillment instructions.
**Plans**: TBD
**UI hint**: yes

### Phase 3: Telegram 2-Way Bot Bridge & Realtime Ephemeral Notification
**Goal**: Telegram bot automatically receives order alerts, lets admin reply via `/reply`, and delivers messages to buyer's browser via bell badge and ephemeral modal.
**Depends on**: Phase 2
**Requirements**: BOT-01, BOT-02, BOT-03, NOTIF-01, NOTIF-02, NOTIF-03, NOTIF-04, NOTIF-05
**Success Criteria** (what must be TRUE):
  1. When customer clicks "Done", Telegram bot sends an order alert with item breakdown, total, and Order ID to the admin chat.
  2. Admin can send `/reply <OrderID> <message>` in Telegram, which the webhook validates and persists into Turso.
  3. Buyer's browser polls order status using `localStorage` tokens and rings/updates the header notification bell with an unread badge when admin replies.
  4. Clicking the bell displays the admin message in an ephemeral modal with prominent data loss warnings, and closing it marks the message acknowledged.
**Plans**: TBD
**UI hint**: yes

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation, Admin Auth & Product Catalog | 1/1 | Complete | 2026-08-25 |
| 2. Storefront, Cart & Multi-Payment QR Checkout | 1/1 | Complete | 2026-08-25 |
| 3. Telegram 2-Way Bot Bridge & Realtime Ephemeral Notification | 1/1 | Complete | 2026-08-25 |
