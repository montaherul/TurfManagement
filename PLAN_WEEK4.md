# TurfCare BD — Week 4 Build Plan

**Goal:** Fix production deployment, add Bangladesh payment methods, and begin Phase 2 advanced features (notifications, scheduled reports, PWA, i18n).

---

## Week 4 Priorities

| # | Item | Roadmap Ref | Status |
|---|---|---|---|
| 4.1 | Fix Vercel backend health endpoint | 1.9 | Complete |
| 4.2 | bKash + Nagad payment integration | 2.6 | Complete |
| 4.3 | In-app notifications (Socket.io) | 2.7 | Complete |
| 4.4 | Scheduled email reports (cron) | 2.8 | Complete |
| 4.5 | PWA baseline (manifest + service worker) | 2.9 | Complete |
| 4.6 | Bangla i18n toggle | 2.10 | Complete |
| 4.7 | Fix frontend tests and add coverage | 1.7 | Complete |

---

## Day 1 — Deployment Fixes

- [x] Diagnose Vercel backend 500 (logs / env vars / build)
- [x] Redeploy backend and verify `/api/health` returns 200
- [x] Verify frontend can login through deployed backend
- [x] Document Vercel settings in README

## Day 2 — Bangladesh Payments

- [x] Create payment service abstraction (`paymentService.js`)
- [x] Add SSLCommerz sandbox integration (init + validate + cancel)
- [x] Add bKash checkout flow (create → execute → query)
- [x] Add Nagad refund/inquiry flow
- [x] Update frontend payment pages with BD method selector
- [x] Store transaction records in DB

## Day 3 — Notifications

- [x] Add `Notification` model + seed data
- [x] Build notification service (in-app + email via SendGrid)
- [x] Emit Socket.io events on threshold breaches, WO updates
- [x] Add notification bell + dropdown in Layout
- [x] Mark-as-read / dismiss functionality

## Day 4 — Scheduled Reports + PWA

- [x] Add BullMQ + Redis for cron jobs
- [x] Build scheduled report service (daily/weekly/monthly)
- [x] Add PWA manifest + service worker registration
- [x] Add install prompt + offline shell
- [x] Run Lighthouse PWA audit

## Day 5 — i18n + Tests

- [x] Add i18next + react-i18next
- [x] Translate core UI strings (EN/BN)
- [x] Add language toggle in Settings
- [x] Fix failing frontend RTL tests
- [x] Run full test suite, record baseline

---

## Verification Milestones

| When | Check |
|---|---|
| Day 1 | `https://turf-manageb.vercel.app/api/health` = 200 |
| Day 2 | Payment page shows bKash/Nagad/SSLCommerz options |
| Day 3 | Notification bell shows unread count + dropdown |
| Day 4 | Scheduled report cron runs; PWA installable |
| Day 5 | Language toggle switches EN/BN; tests pass |

## Baseline (recorded 2026-08-18)

- Backend: 107 tests pass (10 suites), `npm run lint` clean
- Frontend: 10 tests pass (5 suites), `npm run build` succeeds
- Smoke-tested live: `/api/health` 200; notifications create/read/clear; report schedules CRUD