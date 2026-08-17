# TurfCare BD — SaaS Development Roadmap

Grounded in `TurfCare_BD_Requirements_and_Design_Document.docx` and the current state of the codebase (Aug 2026).

## Current State Assessment (v1.0 skeleton exists)

| Area | Status |
|---|---|
| Auth (register/login/refresh/logout), JWT + refresh tokens | Implemented |
| Multi-tenancy (organizationId middleware, tenant isolation) | Implemented |
| RBAC (super_admin, org_admin, inspector, viewer) | Implemented |
| Fields CRUD + geospatial "nearby" | Implemented |
| Inspections CRUD, submit/verify workflow | Implemented |
| Pitch Quality Score (PQS) engine | Partially (basic scoring in `utils/scoring.js`; no configurable weights, tiers, trend analysis) |
| Work orders CRUD | Implemented (no calendar, auto-generation, cost tracking UI) |
| Subscriptions / billing | Skeleton only — uses **Stripe**, but doc requires SSLCommerz/bKash/Nagad; no tier limits enforced, no pay-per-inspection |
| Reports / analytics endpoints | Basic endpoints only (no scheduled reports, benchmarking, exports) |
| PDF reports | Route exists (pdfmake dep) — not verified |
| File upload (multer + sharp) | Implemented (no ClamAV scan, no S3/MinIO) |
| Frontend pages | Login/Register, Dashboard, Fields, Inspections, Work Orders, Reports, Settings, Admin — present |
| Offline support (IndexedDB) | Missing |
| Notifications (in-app/email/SMS) | Socket.io service exists; SendGrid dep present; no SMS, no scheduled jobs |
| i18n (English/Bangla) | Missing |
| PWA | Missing |
| Tests | No test files; jest/supertest deps present |
| CI/CD | `.github/workflows/ci.yml` exists |

## Gap Analysis → Roadmap

### Phase 1 — MVP Completion & Launch (Weeks 1–12)

Goal: production-ready MVP per doc milestones M1–M7.

| # | Work Item | Ref (FR/NFR) | Deliverable / Done-when |
|---|---|---|---|
| 1.1 | Hardening: field/user/inspection **tier limits enforcement** on the backend | FR-4.8.1 | Free=2 fields/10 inspections/3 users; 409 + upgrade prompt on breach |
| 1.2 | **PQS engine v2**: 0–20 per parameter ×5, tier classification (Excellent/Good/Acceptable/Poor), org-configurable weights | FR-4.5.1–2 | Unit tests at 100% coverage incl. boundary values |
| 1.3 | **Auto work-order generation** from low scores + follow-up inspection scheduling | FR-4.6.1, 9.2 | WO auto-created on threshold breach, priority derived from score deviation |
| 1.4 | **PDF reports** (Puppeteer/pdfmake): score breakdown, photo evidence, trends, recommendations | FR-4.4.4 | Endpoint verified, layout QA'd |
| 1.5 | **Bangladesh payments**: replace Stripe with SSLCommerz (cards/bank) + webhook verification | FR-4.8.3, 15.4 | Checkout + webhook in sandbox, renewal cron (midnight BDT) |
| 1.6 | **Billing logic**: grace period (7-day past_due), downgrade to Free | §15.1 | Cron + state machine tested |
| 1.7 | **Testing suite**: Jest+supertest backend (scoring engine 100%, middleware 85%+), RTL frontend, k6 smoke | §18 | Coverage targets met, CI green |
| 1.8 | **Security hardening**: Zod validation on all endpoints, helmet CSP, xss-clean, rate limits, ClamAV scan on upload | NFR-5.2.2, 17.x | OWASP Top 10 pass |
| 1.9 | **Deploy to Bangladesh hosting** (xFusion/BDCloud or AWS ap-south-1) behind Nginx, TLS 1.3, backups every 6h | NFR-5.4.1, 16.1 | 99.5% uptime, RTO <1h |
| 1.10 | **UAT with 3 pilot orgs** | Milestone M7 | Sign-off + bug backlog triaged |

**Exit criteria (M7 / Month 3):** MVP live in production; 3 pilot organizations actively inspecting; billing collecting payments.

### Phase 2 — Advanced Features (Months 4–8, M8–M10)

Goal: differentiate from manual/paper workflows; deepen analytics.

| # | Work Item | Ref | Deliverable / Done-when |
|---|---|---|---|
| 2.1 | **Offline inspections**: IndexedDB local store, auto-sync on reconnect, last-write-wins conflict resolution | FR-4.4.2 | Tablet demo with airplane mode |
| 2.2 | **Trend analytics**: moving averages (3/5-inspection), linear regression w/ p<0.05 deterioration alerts, score projection | FR-4.5.3 | Charts in Reports page |
| 2.3 | **Analytics dashboard v2**: PQS trend, score histogram, completion rate, WO status pie, cost area chart + CSV/PNG export | FR-4.7.1 | All 5 visualizations live |
| 2.4 | **Maintenance calendar**: monthly/weekly/daily, drag-drop rescheduling, priority color-coding, status workflow (Created→…→Verified) | FR-4.6.2 | Interactive calendar page |
| 2.5 | **Cost tracking**: labor/material/equipment/contractor costs, org budget analysis, cost-per-field | FR-4.6.3 | Cost analytics module |
| 2.6 | **bKash + Nagad integration**, pay-per-inspection credits (BDT 150/120/100 tiers) + hybrid billing | FR-4.8.2, 15.2 | Credit purchase + deduction flow |
| 2.7 | **Notifications**: in-app (Socket.io) + email (SendGrid) + SMS (Twilio/local) for threshold, reminders, overdue, limit warnings | FR-4.9.1–2 | Preference center per channel/event |
| 2.8 | **Scheduled reports** emailed to configured recipients (daily/weekly/monthly) | FR-4.7.2 | BullMQ cron jobs |
| 2.9 | **PWA**: installable, offline shell, push notifications | §19 Phase 2 | Lighthouse PWA audit ≥90 |
| 2.10 | **Bangla i18n** (i18next), BDT/DD-MM-YYYY/24h formatting | NFR-5.5.1 | Language toggle works, all UI strings translated |

**Exit criteria (M10 / Month 8):** fully offline-capable field app; all three payment methods; scheduled reporting running in production.

### Phase 3 — Scale & Enterprise (Months 9–12, M11–M12)

Goal: enterprise readiness, differentiation, scale.

| # | Work Item | Ref | Deliverable / Done-when |
|---|---|---|---|
| 3.1 | **Enterprise/white-label**: custom domain, logo, color scheme, custom plans, annual billing (10–20% discount) | FR-4.8.1, 15.3 | Tenant-level branding service |
| 3.2 | **Benchmarking module**: opt-in anonymized aggregation, percentile ranking vs regional average | FR-4.7.3 | Opt-in flag + ranking UI |
| 3.3 | **Public API marketplace**: API keys, webhooks, rate-limit tiers | FR-4.8.1 | Developer docs + key management |
| 3.4 | **Super Admin v2**: tenant lifecycle (create/suspend/terminate), immutable audit log (2-yr retention), billing overview, feature flags | FR-4.10.1–2 | Admin panel complete |
| 3.5 | **IoT sensor framework** + **predictive maintenance ML** (train on historical inspections) | §19 Phase 3 | Pilot with sensor partner |
| 3.6 | **Scale & performance**: Redis pub/sub for multi-instance Socket.io, Mongo sharding on tenantId (>500GB), auto-scaling at 70% CPU, k6 at 1,000 rps / 500 concurrent users | NFR-5.1–5.3 | Load test report green |
| 3.7 | **Compliance pass**: DPA 2023 (consent, data-subject rights, 30-day responses), BIDA/VAT 15% invoicing, 7-yr transaction records, data localization audit | §6 | Compliance checklist signed off |
| 3.8 | **Accessibility**: WCAG 2.1 AA (keyboard nav, contrast, NVDA/JAWS) | NFR-5.6.1 | Accessibility audit pass |
| 3.9 | **Full release + scale test** | M12 | 12-month milestone review, expansion to 20+ orgs |

**Exit criteria (M12 / Month 12):** enterprise customers onboarded; 1,000+ concurrent users supported; full regulatory compliance.

## Critical Risks & Decisions

1. **Payment gateway mismatch**: code currently integrates Stripe; SSLCommerz/bKash/Nagad are mandatory for the BD market — prioritize 1.5.
2. **No tests exist** despite the doc's coverage targets — testing must start in Phase 1 or debt compounds.
3. **Data localization**: MongoDB + photo storage must live in Bangladesh (or ap-south-1 fallback) — hosting decision blocks Phase 1 deployment.
4. **Offline sync** (2.1) is the highest-effort single feature — start spike in Phase 2 kickoff.
5. **Git is not installed** on this machine — install it before any commit/PR workflow.

## Suggested Immediate Sprint (next 2 weeks)

1. Install git + toolchain; set up dev env (Docker Compose, Mongo, Redis)
2. Implement tier-limit enforcement middleware (1.1)
3. Complete PQS engine v2 with tier thresholds + unit tests (1.2)
4. Auto work-order generation (1.3)
5. Swap Stripe for SSLCommerz sandbox (1.5)