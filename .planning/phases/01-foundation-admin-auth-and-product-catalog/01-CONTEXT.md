# Phase 1 Context: Foundation, Admin Auth & Product Catalog

## Phase Goal
Set up Next.js 15 App Router project structure, Turso SQLite database connection (`@libsql/client` + Drizzle ORM), `.env` credentials admin authentication with secure HTTP-only cookies (`jose`), and full product CRUD administration interface.

## Locked Technical Decisions
- **Framework**: Next.js 15 (App Router with TypeScript & Tailwind CSS).
- **Database**: Turso LibSQL (`@libsql/client` + Drizzle ORM).
- **Admin Auth**: Simple `.env` username & password check; session token encoded via `jose` stored in an HTTP-only cookie.
- **Image handling**: External image/icon URLs (e.g. direct image links or Unsplash/Cloudinary URLs) with URL fallback icon.
- **Product Schema**: `id` (text/uuid), `name` (text), `description` (text), `price` (real/numeric), `image_url` (text), `created_at` (integer/timestamp).

## Verification Strategy
- Admin login successfully sets HTTP-only cookie and redirects to `/admin`.
- Unauthenticated access to `/admin` redirects to `/admin/login`.
- Admin can create, edit, view, and delete products in Turso SQLite.
- Admin logout clears the cookie and redirects to `/admin/login`.
