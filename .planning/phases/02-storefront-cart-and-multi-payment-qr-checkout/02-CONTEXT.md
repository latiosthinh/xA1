# Phase 2 Context: Storefront, Cart & Multi-Payment QR Checkout

## Phase Goal
Build the customer-facing storefront with responsive product browsing, quantity selection, client-side cart drawer/modal, order checkout initiation, and dual-payment view (MoMo QR + Binance Pay ID) with 1-click copy buttons and "Done" payment notice action.

## Locked Technical Decisions
- **Cart State**: Stored in client React state with `localStorage` persistence (`mmo_cart`).
- **Order Model**: When customer clicks checkout, creates order in Turso with:
  - `id`: UUID
  - `publicMemo`: Short alphanumeric code (e.g. `ORD-9481`)
  - `clientToken`: Secret UUID stored in browser `localStorage` (`mmo_orders`)
  - `itemsJson`: Serialized list of items (id, name, price, qty, imageUrl)
  - `totalAmount`: Sum of total
  - `paymentMethod`: `momo` or `binance`
  - `status`: `PENDING` -> transitions to `PAID_WAITING_CONFIRM` upon clicking "Done".
- **QR Code Rendering**: `qrcode.react` (`QRCodeSVG`) to generate dynamic MoMo transfer payload or static MoMo QR URL / Binance Pay QR code.
- **Copy Utilities**: Native `navigator.clipboard.writeText` with toast/badge feedback for Order ID, Binance Pay ID, and MoMo account number.
- **Guidance & Notice**: Clear banner instructing the customer to include the Order ID in payment memo/transfer description, followed by a 5-10 minute confirmation notice after clicking "Done".

## Requirements Covered
- `STORE-01`: Public catalog browsing.
- `STORE-02`: Quantity selector & cart management.
- `STORE-03`: Cart summary with live totals.
- `PAY-01`: Order ID generation & client token storage in `localStorage`.
- `PAY-02`: MoMo QR code and Binance Pay ID display with payment memo instructions.
- `PAY-03`: 1-click copy buttons for payment identifiers.
- `PAY-04`: "Done" button submission, status update, and 5-10 min notice.
