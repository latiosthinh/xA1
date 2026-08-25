# Technology Stack

**Project:** Simple Web Store with Telegram Checkout & 2-Way Bot Bridge  
**Researched:** 2026-08-25  
**Overall Confidence:** HIGH  

---

## Recommended Stack

### Core Framework & Runtime
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **Next.js (App Router)** | `^15.x` | Fullstack web app, Server Actions, Route Handlers, Storefront UI | Unified monolith. Zero separate backend needed. Native streaming / Route Handlers fit both SSE/polling and Telegram webhook endpoints. | HIGH |
| **React** | `^19.x` | UI rendering, client state, ephemeral modal display | Next.js default. Server/Client component boundary keeps cart and notifications interactive while product pages stay static/server-rendered. | HIGH |
| **TypeScript** | `^5.x` | Type safety end-to-end | Enforces strict typing across database schema, Telegram payloads, and client checkout events. | HIGH |

### Database & ORM
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **@libsql/client** | `^0.14.x` | Database driver for Turso LibSQL | Serverless SQLite driver with HTTP/WebSocket transport, zero native binary bloat, edge/serverless ready. | HIGH |
| **Drizzle ORM** | `^0.39.x` | Type-safe SQL ORM and query builder | Lightweight, zero runtime overhead compared to Prisma, native `turso` dialect support, generates clean SQL migrations. | HIGH |
| **drizzle-kit** | `^0.30.x` | Schema migrations and prototyping CLI | Fast SQLite schema management with `dialect: "turso"`. | HIGH |

### Telegram Integration
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **grammY** | `^1.35.x` | Telegram Bot API framework | Modular, TypeScript-first, native `webhookCallback(bot, "std/http")` for Next.js App Router route handlers. Cleaner than Telegraf/node-telegram-bot-api in serverless routes. | HIGH |

### Styling & UI
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **Tailwind CSS** | `^4.x` / `^3.4.x` | Utility-first CSS | Fast responsive layout for storefront, checkout modal, admin dashboard, notification toast. Zero runtime CSS overhead. | HIGH |
| **lucide-react** | `^0.475.x` | UI icons | Lightweight tree-shakeable icons (bell, cart, trash, check, qr, copy, external-link). | HIGH |

### Utilities (QR, Auth, State)
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **qrcode.react** | `^4.2.x` | Client-side QR generation (`QRCodeSVG`) | Pure SVG/canvas component for MoMo / Binance Pay QR codes. No server canvas rendering dependencies required. | HIGH |
| **jose** | `^6.0.x` | Admin session JWT cookie signing & verification | Universal Web Crypto API standard. Zero Node.js crypto binary dependencies, works in Next.js middleware and edge/node runtimes. | HIGH |
| **nanoid** / `crypto.randomUUID` | Native / `^5.1.x` | Order ID & token generation | Unique short human-readable order references for Telegram commands (`/reply <OrderID> <message>`). | HIGH |
| **zustand** | `^5.0.x` | Client cart state persistence (optional lightweight layer) | Micro footprint (<1KB) with `persist` middleware for sync to `localStorage`. Simple React Context + `useSyncExternalStore` also valid. | HIGH |

---

## Architecture Alignment

```
[Customer Browser]
  ├── Storefront & Cart (React / LocalStorage)
  ├── QR Modal (qrcode.react - MoMo / Binance Pay)
  └── Notification Bell (Polling / SSE Route /api/orders/[id]/events)
         │
         ▼
[Next.js App Router Server]
  ├── Server Actions (Create Order, Product CRUD)
  ├── Auth Middleware (jose JWT verify via .env admin credentials)
  ├── API Route: /api/telegram/webhook (grammY std/http webhookCallback)
  └── Drizzle ORM -> Turso LibSQL (@libsql/client)
         │
         ▼
[Telegram Cloud API]
  ├── Order notification posted to Admin Group/Chat
  └── Admin replies (/reply <OrderID> <text>) -> Webhook -> DB update -> Customer notified
```

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not Recommended |
|----------|-------------|-------------|---------------------|
| **Database ORM** | **Drizzle ORM** | Prisma | Prisma generates heavy query engine binaries, slows cold starts on serverless, requires separate LibSQL drivers, higher memory usage. |
| **Database ORM** | **Drizzle ORM** | Raw SQL (`@libsql/client` execute) | Raw SQL lacks type safety for multi-table relationships and schema migration tracking as schema grows. Drizzle gives raw-SQL performance with TypeScript safety. |
| **Telegram Bot** | **grammY** | `node-telegram-bot-api` | Outdated callback architecture, poor TypeScript support, problematic in serverless/edge environments. |
| **Telegram Bot** | **grammY** | `telegraf` | Heavier bundle, less ergonomic webhook adapter for Next.js web standards (`Request`/`Response`). |
| **Admin Auth** | **`jose` signed cookies** | NextAuth / Auth.js | Overkill for single `.env`-based admin credential login; brings unnecessary database tables, adapters, and complexity. |
| **Realtime Push** | **HTTP Polling / SSE** | WebSockets (Socket.io) | Next.js serverless cannot maintain persistent stateful WebSocket servers without external infra (Pusher/Ably). SSE or short polling against Turso state is lightweight and free. |
| **QR Rendering** | **qrcode.react** | `qrcode` (node-canvas backend) | Server-side canvas rendering requires native binaries (`cairo`, `pango`) or base64 data URIs. `qrcode.react` SVG is instant, vector-crisp, and zero server CPU cost. |

---

## What NOT to Use and Why

1. **Avoid `node-telegram-bot-api`:** Uses long-polling defaults and Node-specific event emitters that hang serverless server instances.
2. **Avoid Heavy Auth Frameworks (NextAuth/Clerk/Supabase Auth):** The store only requires one admin login with credentials defined in `.env`. A signed HTTP-only cookie via `jose` is standard, secure, and needs zero external dependencies.
3. **Avoid External WebSocket Providers (Pusher/Ably/Socket.io):** Adding third-party WebSocket subscriptions adds cost and setup overhead. Anonymous buyer order tracking with 2-3s interval polling or single-order SSE route satisfies all latency requirements.
4. **Avoid Heavy State Managers (Redux Toolkit):** Simple client-side cart requires only `localStorage` and minimal React state or mini Zustand store.

---

## Installation Commands

### Core Dependencies
```bash
npm install @libsql/client drizzle-orm grammy qrcode.react jose lucide-react zustand
```

### Dev Dependencies
```bash
npm install -D drizzle-kit typescript @types/node @types/react @types/react-dom tailwindcss postcss autoprefixer
```

---

## Confidence Assessment

| Layer | Recommended Choice | Confidence | Evidence |
|-------|-------------------|------------|----------|
| Framework | Next.js 15 App Router | HIGH | Context7 / Next.js official specs |
| DB / Driver | Turso (`@libsql/client` + Drizzle) | HIGH | LibSQL TS SDK docs & Drizzle `turso` dialect support |
| Bot Engine | grammY (`webhookCallback`) | HIGH | Official grammY serverless/web standard adapter docs |
| QR Generator | `qrcode.react` (`QRCodeSVG`) | HIGH | Standard React SVG vector renderer |
| Session Auth | `jose` (JWT HTTP-only cookie) | HIGH | Web Crypto standard, compatible with edge and Node runtime |

---

## Sources

- **Turso & LibSQL Documentation:** `/tursodatabase/libsql-client-ts`
- **Drizzle ORM Turso Dialect:** `/drizzle-team/drizzle-orm` (Drizzle Kit `dialect: "turso"`)
- **grammY Webhook Handlers:** `/grammyjs/website` (`webhookCallback(bot, "std/http")`)
- **qrcode.react:** `/zpao/qrcode.react`
- **jose:** `/panva/jose`
