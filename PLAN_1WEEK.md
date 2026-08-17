# TurfCare BD — 1-Week Build Plan (PERN: Postgres + Express + React + Node)

Goal: a working, demoable, deployable MVP in **7 days** on PostgreSQL. Frontend stays React/Vite (API-compatible with the existing code). Backend moves from Mongoose → **Prisma + PostgreSQL**.

## Stack Decisions (PERN)

| Layer | Choice | Notes |
|---|---|---|
| DB | PostgreSQL 16 (+ PostGIS for nearby queries, optional) | Docker |
| ORM | Prisma | Schema + migrations + client; replaces Mongoose entirely |
| Multi-tenancy | `organizationId` column everywhere + Prisma client extension (global `where` filter, mirrors the Mongoose middleware) | Same tenant-discriminator pattern, RLS optional later |
| Geospatial | PostGIS extension; fallback = Haversine in raw SQL | Existing `2dsphere` "nearby" endpoint |
| Scoring engine | Pure JS, unchanged | `backend/src/utils/scoring.js` |
| Payments | SSLCommerz `sslcommerz-lts` SDK (sandbox → live env flag) | Drop `stripe` dep |
| Cache/session | Redis (unchanged) | |

## Cut List (explicitly OUT of this week)

Offline IndexedDB sync, bKash/Nagad, SMS, benchmarking, white-label, PWA push, ML/IoT, full Bangla i18n, WCAG audit, load testing, immutable audit log, scheduled report emails, RLS row-level security.

## Day-by-Day (≈10–12h/day — this is tight, no slack days)

### Day 1 — Postgres Foundation
- Install git + Node 20 + Docker
- `docker-compose.yml`: postgres:16 (+ redis) — rewrite DB section, keep services
- Install Prisma (`@prisma/client`, `prisma` dev dep) in backend; `prisma init`
- Write `prisma/schema.prisma`: Organization, User, Field, Inspection, WorkOrder, Subscription, AuditLog — flat tables, `pitchQualityScore` + assessment sub-objects as JSONB columns, `organizationId` indexed on every table (composite indexes: `(organizationId, fieldId, inspectionDate)`, `(organizationId, status, priority)`)
- First migration + seed script (`backend/scripts/seed.js` via Prisma): demo org, 3 fields, inspections across tiers
- **Done when:** `prisma migrate dev` applies; seed data queryable via Prisma Studio

### Day 2 — Replace Mongoose Layer (the heavy lift)
- Rewrite all 6 `backend/src/models/*.js` as Prisma queries inline in controllers; delete Mongoose models
- Rewrite controllers: auth, organizations, fields, inspections, workOrders, subscriptions, reports, admin — swap `Model.find/populate/lean` → Prisma `include`/`select`
- Rewrite `utils/pagination.js` → Prisma `skip/take` + `_count` (keep the response envelope)
- Tenant isolation: Prisma client extension in `config/db.js` auto-injects `organizationId` into all queries (mirrors old middleware); keep `middleware/tenant.js`
- `fields/nearby` → PostGIS `ST_Distance` raw query (fallback Haversine)
- `scoring.js` stays; wire into inspection create/update (embed score JSONB)
- **Done when:** every route returns the same JSON as before against Postgres; full CRUD loop: register → field → inspection → score → WO

### Day 3 — Scoring & Work Order Engine
- PQS: org-configurable weights (FR-4.5.1); fix buggy moisture branch in `scoring.js:18`
- Work-order tasks derived from findings (drainage→drainage task, compaction→aeration, etc.) (FR-4.6.1)
- WO status workflow created→assigned→in_progress→completed→verified + estimated/actual costs (FR-4.6.3)
- Scoring unit tests (Jest): boundary tiers 85/70/55/54, 100% coverage
- **Done when:** `npm test` green; poor-score inspection → urgent, task-specific WO

### Day 4 — Billing & Tier Enforcement
- `middleware/planLimits.js`: Free=2 fields/3 users/10 inspections, Basic=10/50/100, Pro=unlimited — 409 + upgrade prompt
- Billing state machine: active → past_due (7-day grace) → free downgrade; midnight-BDT renewal cron
- SSLCommerz: `sslcommerz-lts`, init → hosted page redirect → IPN webhook `/api/v1/payments/webhook/sslcommerz` with signature verify → activate plan (sandbox first, `IS_LIVE` env flag)
- Billing UI: plan card, usage meter, upgrade CTA
- **Done when:** free org blocked at 2 fields; sandbox checkout → IPN → plan activated

### Day 5 — Reports & Analytics
- PDF via pdfmake (implement `inspectionController.js:185` stub): score breakdown, tier, photos, recommendations (FR-4.4.4)
- Analytics endpoints (Postgres `GROUP BY`): score trends/field, distribution histogram, WO status breakdown, completion rate (FR-4.7.1)
- CSV export (inspections + scores)
- Dashboard: wire Recharts, date-range filter
- **Done when:** PDF downloads; dashboard shows 4+ live charts

### Day 6 — Notifications, Security, Tests
- In-app notifications via Socket.io (WO created, score breach, verified) (FR-4.9.1)
- Email via SendGrid (console fallback) on WO created + plan activated
- Zod validation on all POST/PUT (422 fail-closed); helmet CSP, rate limiting, express-mongo-sanitize → replace with SQL-safe Prisma (parameterized by default), hpp
- Integration tests: auth flow, cross-tenant access blocked, inspection→WO pipeline
- **Done when:** poor-score inspection fires in-app + email <5s; tests green; `npm audit` clean

### Day 7 — Deploy & Demo
- Production `docker-compose`: postgres (volume-backed) + redis + backend + frontend/nginx with TLS; `prisma migrate deploy` in release
- Deploy to VPS (or local demo server)
- Seed prod demo data; write 10-min demo script: org → fields → poor inspection → WO → PDF → upgrade → SSLCommerz payment → analytics
- Update README (PERN install/deploy steps)
- **Done when:** product live at URL; full demo passes; sign-off

## What I Need From You (Day 1–4)

- **SSLCommerz sandbox store_id + store_passwd** from https://developer.sslcommerz.com (instant signup) — required Day 4
- VPS/domain for Day 7 (or local demo OK)
- SendGrid API key (optional — console fallback)

## Risk Register (be honest with stakeholders)

| Risk | Mitigation |
|---|---|
| Prisma rewrite slips (largest risk) | Day 1–2 are dedicated to data layer only; if Day 2 slips, cut analytics depth on Day 5, not the data layer |
| PostGIS setup pain | Haversine fallback is pre-approved |
| SSLCommerz sandbox account delay | Start signup Day 1 in parallel |
| 7 days with zero slack | Cut order if needed: CSV export → scheduled cron → cost tracking UI → email templates |
| Existing Mongoose code half-converted | Delete `models/*.js` on Day 2 completion; never keep two data layers |

## Verification Milestones

| When | Check |
|---|---|
| Day 1 | Migration applied, seed data in Postgres |
| Day 2 | Full CRUD loop on Postgres, JSON envelopes unchanged |
| Day 4 | Tier limits block over-limit; SSLCommerz sandbox end-to-end |
| Day 6 | Tests green; security middleware active |
| Day 7 | Live demo + sign-off |