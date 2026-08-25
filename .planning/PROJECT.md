# Simple Web Store with Telegram Checkout & Live Notification

## What This Is

A lightweight e-commerce web application built with Next.js and Turso SQLite database. It allows buyers to browse products, select quantities into a cart, and check out with multi-option manual payment (MoMo QR / Binance Pay ID) using a generated Order ID. Orders are dispatched to a Telegram bot where an admin can reply directly; the buyer receives the message live via a web notification bell and ephemeral modal.

## Core Value

Frictionless product selection and manual payment flow with instant 2-way Telegram admin-to-user notification bridge.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Simple Admin Login: Authenticate via `.env` credentials (session/cookie).
- [ ] Product Management: Admin can add/edit/delete products with image/icon URL, name, description, and price.
- [ ] Storefront & Cart: Customer browses product list, selects quantity, manages cart, and initiates checkout.
- [ ] Multi-Payment QR Checkout: Generates unique Order ID and displays payment instructions (MoMo QR / Binance Pay ID) with exact memo/description.
- [ ] Payment Notification Dispatch: Customer clicks "Done", order details are sent to Telegram channel/bot with order metadata and items.
- [ ] 2-Way Telegram Admin Reply: Admin replies to the Telegram order notification via Telegram bot reply/command (`/reply <OrderID> <message>`).
- [ ] Realtime Client Notification & Ephemeral Modal: Customer browser (tracked via `localStorage`) receives admin message via polling/SSE, rings a bell icon badge, and displays message in a one-time ephemeral modal with save warnings.
- [ ] Database Persistence: Turso SQLite (`@libsql/client`) for products, orders, and message states.

### Out of Scope

- Automated payment gateway webhooks (Stripe, PayPal automated IPN) — relying on manual QR verification.
- Full multi-tenant customer authentication / registration — using client-side Order ID token persistence in localStorage.
- Complex inventory reservation systems — out of scope for lightweight catalog.

## Context

- **Platform**: Next.js App Router (Fullstack TypeScript/JavaScript).
- **Database**: Turso SQLite via `@libsql/client`.
- **Bot Integration**: Telegram Bot API (`node-telegram-bot-api` / Telegraf or webhook route) with admin chat ID routing.
- **Payment Methods**: Binance Pay ID / QR and MoMo QR with unique Order ID memo.
- **Client State**: LocalStorage for persistent active order tracking and SSE/polling for admin reply delivery.

## Constraints

- **Tech Stack**: Next.js (App Router), Tailwind CSS, Turso (LibSQL), Telegram Bot API.
- **Auth**: Simple `.env`-based admin credentials (secure cookie session).
- **Notification**: Notification content in modal must clearly warn user it is ephemeral and will disappear upon dismissal.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Next.js App Router | Single project structure covering frontend UI, server actions/API routes, and bot webhook | — Pending |
| Turso LibSQL | Serverless SQLite with edge compatibility and low latency | — Pending |
| Telegram Webhook / Long Polling | Receive admin replies directly from Telegram chat and map to Order ID in database | — Pending |
| LocalStorage + Polling/SSE | Simplest reliable delivery mechanism for anonymous buyers to receive notifications | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-08-25 after initialization*
