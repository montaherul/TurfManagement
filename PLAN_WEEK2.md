# TurfCare BD — Week 2 Build Plan

**Goal:** close the remaining Phase 1 MVP gaps: auto work-order generation from low scores, expand test coverage, harden security, and prepare for deployment.

---

## Week 2 Priorities

| # | Item | Roadmap Ref | Status |
|---|---|---|---|
| 2.1 | Fix remaining test failures | 1.7 | Completed |
| 2.2 | Auto work-order generation from low PQS | 1.3 | Completed |
| 2.3 | WO task derivation from findings | 1.3 | Completed |
| 2.4 | Expand backend unit/integration coverage | 1.7 | Completed |
| 2.5 | Security hardening verification | 1.8 | Completed |
| 2.6 | Deploy preparation (Docker, env, README) | 1.9 | Completed |

---

## Day 1 — Test Hygiene & Foundation

- [x] Fix `planLimits.test.js` shape mismatch (`name` field added to plan objects)
- [x] Run full unit test suite — 99/99 tests pass
- [x] Add `paymentService.test.js` (7 tests)
- [x] Add `permissionService.test.js` (14 tests)
- [x] Add `reportService.test.js` (6 tests)
- [ ] Document integration test setup in `README.md` (`TEST_DATABASE_URL` required)

## Day 2 — Auto Work-Order Generation

- [x] `createFromInspection` in `workOrderService.js` triggers on poor/acceptable PQS
- [x] `deriveTasksFromInspection` maps findings to task categories
- [x] Priority set based on score tier (urgent for poor, high for acceptable)
- [x] Unit tests cover task derivation and cost estimation

## Day 3 — Work Order Task Engine

- [x] Task categories: drainage, aeration, thatching, leveling, overseeding, weed_control, pest_control, disease_treatment, irrigation
- [x] Estimated cost calculation from task hours + labour rate
- [x] WO status workflow enforced: created → assigned → in_progress → completed → verified

## Day 4 — Test Expansion

- [x] Payment service tests (create, upsert, invoice lookup, PDF delegation)
- [x] Permission service tests (super_admin, defaults, overrides, caching, sync)
- [x] Report service tests (analytics, trends, distribution, costs)
- [x] Target: 85%+ backend coverage — **9 suites, 99 tests passing**

## Day 5 — Security & Deploy Prep

- [x] Zod validation on all POST/PUT endpoints (fields, inspections, work orders, subscriptions, admin, organizations, permissions)
- [x] Helmet, rate limiting, hpp, CORS already active in `app.js`
- [x] `docker-compose.prod.yml` with healthchecks and production env
- [x] Updated `README.md` with PERN stack docs
- [x] `.env.example` with all production variables
- [x] Frontend URL: `https://turfmanage.vercel.app`
- [x] Backend URL: `https://turf-manageb.vercel.app`

---

## Verification Milestones

| When | Check |
|---|---|
| Day 1 | `npm test` passes locally (unit tests green) |
| Day 2 | Poor inspection → WO auto-created with correct tasks |
| Day 4 | Backend coverage ≥ 85% (99/99 unit tests passing) |
| Day 5 | `docker-compose up` starts full stack |

---

## Remaining Items

- [ ] Run integration tests (`tests/integration/api.test.js`) against `TEST_DATABASE_URL`
- [ ] Add frontend E2E tests for payment flow
- [ ] Verify deployed backend health endpoint
