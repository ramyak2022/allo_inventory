# Allo Inventory — Take-Home Exercise

A Next.js inventory and reservation platform for multi-warehouse retail. Built with the App Router, Prisma, Postgres, Redis, and Tailwind.

---
## Live Demo

> Deploy URL goes here after Vercel deployment.

■ [Click here to run live](https://ramyak2022.github.io/allo_inventory/)
## Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 14 App Router |
| Language | TypeScript end-to-end |
| ORM | Prisma |
| Database | Postgres (hosted — Supabase / Neon / Railway) |
| Distributed lock | Redis (Upstash) |
| Validation | Zod |
| UI | Tailwind CSS + shadcn/ui patterns |
| Hosting | Vercel |

---

## Running locally

### 1. Install dependencies

```bash
npm install
```

### 2. Set environment variables

```bash
cp .env.example .env.local
# Fill in DATABASE_URL and REDIS_URL
```

### 3. Run DB migrations and generate Prisma client

```bash
npx prisma migrate dev --name init
# or, to just push without creating a migration file:
npx prisma db push
```

### 4. Seed the database

```bash
npm run db:seed
```

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](https://ramyak2022.github.io/allo_inventory/).

---

## How reservation expiry works

### In production (Vercel)

A Vercel Cron job (`vercel.json`) calls `GET /api/cron/expire-reservations` every minute. The route:

1. Queries all `PENDING` reservations where `expiresAt < NOW()`.
2. For each expired reservation, runs a transaction that decrements `Stock.reserved` and sets the reservation to `RELEASED`.

The `CRON_SECRET` env var protects the endpoint — Vercel passes it as `Authorization: Bearer <secret>`.

### Lazy cleanup (defence in depth)

The `/api/reservations` route checks `expiresAt` before confirming, so even if the cron job misses a cycle, an expired reservation cannot be confirmed.

---

## Concurrency guarantee

The core race condition: two simultaneous `POST /api/reservations` requests for the last unit of a SKU.

**Solution — two layers:**

1. **Redis distributed lock** (`SET NX PX`): scoped per `productId:warehouseId`, held for ≤8 s. Only one process enters the critical section at a time.

2. **Postgres `SELECT FOR UPDATE`** inside a transaction: even without Redis (cold start, Redis unavailable), the row-level lock on `Stock` ensures exactly one transaction can read-and-write the available count atomically.

Both layers are required:
- Redis alone doesn't protect against Redis downtime.
- `SELECT FOR UPDATE` alone works for a single Postgres instance but Redis gives us the lock before even hitting the DB, reducing contention on busy SKUs.

---

## Idempotency (bonus)

Pass `Idempotency-Key: <uuid>` on `POST /api/reservations` and `POST /api/reservations/:id/confirm`.

- The key is stored on the `Reservation` row (unique constraint).
- On retry, the server returns the original response without re-running the side effect.
- Keys are scoped per operation type by convention (client should use different keys for reserve vs confirm).

---

## Trade-offs and what I'd do with more time

- **Quantity > 1**: The current model supports it in the schema and API, but the UI only reserves 1 unit at a time. A quantity picker would be a quick addition.
- **Warehouse selection UX**: Right now the user picks warehouse implicitly via the Reserve button per warehouse row. A smarter UX would auto-select the nearest warehouse or the one with the most stock.
- **Cron granularity**: Vercel free tier runs crons at most every minute. For sub-minute precision, a long-polling approach or a dedicated background worker (e.g. BullMQ on a Node server) would be better.
- **Auth**: There's no user authentication. In production, reservations would be tied to a user session.
- **Metrics**: I'd add logging/tracing around the lock acquisition and release paths to observe contention in production.
- **Tests**: I'd add integration tests for the concurrent reservation path using `Promise.all` to fire simultaneous requests and assert exactly one 201 and one 409.
