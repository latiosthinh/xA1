# MMO Store - Developer Guide & Project Instructions

This project is a lightweight e-commerce storefront built with Next.js 15 App Router, Turso LibSQL, and Telegram Bot API.

## Project Structure
- `.planning/`: GSD project artifacts, roadmaps, state, and research documents.
- `src/` (or root): Next.js 15 App Router application.

## Key Stack
- **Framework**: Next.js 15 (App Router, Server Actions, Route Handlers)
- **Database**: Turso LibSQL (`@libsql/client` + Drizzle ORM)
- **Styling**: Tailwind CSS + `lucide-react`
- **QR Engine**: `qrcode.react`
- **Telegram Bot**: `grammY` (Webhook endpoint)
- **Admin Auth**: `jose` HTTP-only cookie with `.env` credentials

## Workflow Enforcements
- All project updates and implementations are tracked in `.planning/`.
- Run `/gsd-plan-phase <N>` to plan phase execution.
- Maintain atomic commits and verify tests at every step.
