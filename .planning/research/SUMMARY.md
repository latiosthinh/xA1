# Research Summary: Simple Web Store with Telegram Checkout & 2-Way Bot Bridge

## Executive Summary

This project is a high-efficiency e-commerce application built with Next.js 15 (App Router), Turso LibSQL (`@libsql/client` + Drizzle ORM), and Telegram Bot API (`grammY` via webhook). It provides an anonymous, zero-registration storefront where customers pay manually via MoMo QR or Binance Pay ID with a unique Order ID / Memo. Telegram alerts notify admins of new orders, and admins can reply back to users directly via Telegram commands (`/reply <order_id> <message>`). The user's browser polls for messages, rings a notification bell, and displays an ephemeral modal with save warnings.

## Key Stack Decisions

| Layer | Recommended Choice | Rationale |
|-------|-------------------|-----------|
| **Framework** | Next.js 15 (App Router) + TypeScript | Unified monolith for UI, Server Actions, API routes, and Telegram webhook. |
| **Styling & UI** | Tailwind CSS + `lucide-react` | Clean, responsive UI with minimal bundle footprint. |
| **Database & ORM** | Turso LibSQL + Drizzle ORM (`turso` driver) | Serverless SQLite, zero heavy binaries, edge-ready, ultra-fast queries. |
| **Telegram Bot** | `grammY` (Webhook route handler) | Lightweight, typed, seamless integration with Next.js App Router route handlers. |
| **QR Code Rendering** | `qrcode.react` (`QRCodeSVG`) | Pure client-side SVG QR generation (no server canvas/lib dependency). |
| **Admin Auth** | `jose` (JWT in HTTP-only cookie) + `.env` credentials | Ultra-simple single-admin auth without large libraries. |
| **Client Sync** | Adaptive Short Polling (HTTP) + `localStorage` Token Pair | Resilient in serverless environments, avoids SSE connection exhaustion. |

## Core Architecture & Data Flow

```
[User Browser] (localStorage tokens)
   │
   ├─► 1. Browse Catalog & Manage Cart
   ├─► 2. Checkout -> Create Order -> Display MoMo QR / Binance Pay ID (Memo: OrderID)
   ├─► 3. Click "Done" -> POST /api/orders/notify-paid
   │                                  │
   │                                  ▼
   │                          [Telegram Bot Dispatch]
   │                                  │
   │                                  ▼
   │                           [Admin in Telegram]
   │                                  │
   │                      Replies: /reply <OrderID> <message>
   │                                  │
   │                                  ▼
   │                      [Next.js Webhook /api/telegram/webhook]
   │                                  │
   │                                  ▼
   │                       [Turso LibSQL Database]
   │                          (status: DELIVERED)
   │                                  ▲
   ├─► 4. Short Polling (GET /api/orders/poll)
   ▼
[Bell Icon Rings] -> User Opens Ephemeral Modal -> Message Dismissed (ACK)
```

## Critical Pitfalls & Mitigations

1. **Anonymous IDOR Security**: Orders use a dual identifier scheme: a short human-readable `public_memo` (e.g., `ORD-7892`) for payment description, and a UUID `client_token` stored in `localStorage` for authorized polling of admin messages.
2. **Serverless Webhook Timeouts**: Telegram webhook responses return HTTP 200 immediately after verifying the secret token, processing db updates asynchronously or rapidly without hanging.
3. **Premature Ephemeral Message Loss**: Messages follow a strict state machine (`PENDING` -> `DELIVERED` -> `ACKNOWLEDGED`). Messages are only purged or marked seen when the user explicitly confirms or closes the ephemeral modal.
4. **MoMo & Binance Data Integrity**: Provide 1-click copy buttons for MoMo phone/account, Binance Pay ID, exact amount, and required memo string to minimize manual transfer entry errors.
