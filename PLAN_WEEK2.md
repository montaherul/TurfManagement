# TurfCare BD — Week 2 Build Plan

**Goal:** close the remaining Phase 1 MVP gaps: auto work-order generation from low scores, expand test coverage, harden security, and prepare for deployment.

---

## Week 2 Priorities

| # | Item | Roadmap Ref | Status |
|---|---|---|---|
| 2.1 | Fix remaining test failures | 1.7 | In progress |
| 2.2 | Auto work-order generation from low PQS | 1.3 | Pending |
| 2.3 | WO task derivation from findings | 1.3 | Pending |
| 2.4 | Expand backend unit/integration coverage | 1.7 | Pending |
| 2.5 | Security hardening verification | 1.8 | Pending |
| 2.6 | Deploy preparation (Docker, env, README) | 1.9 | Pending |

---

## Day 1 — Test Hygiene & Foundation (Today)

- [x] Fix `planLimits.test.js` shape mismatch (`name` field added to plan objects)
- [ ] Investigate integration test timeout (`api.test.js` — missing `TEST_DATABASE_URL`)
- [ ] Run full test suite, record baseline
- [ ] Document test setup in `README.md`

## Day 2 — Auto Work-Order Generation (Next)

- [ ] Add `autoGenerateWorkOrders` to `inspectionService.js`
- [ ] Trigger on inspection status change to `verified`
- [ ] Derive WO tasks from low-score categories (drainage, compaction, etc.)
- [ ] Set priority based on score deviation
- [ ] Add unit tests for WO auto-generation

## Day 3 — Work Order Task Engine

- [ ] Map findings → task categories in `workOrderService.js`
- [ ] Add estimated cost calculation from task severity
- [ ] Ensure WO status workflow is enforced (created → assigned → in_progress → completed → verified)

## Day 4 — Test Expansion

- [ ] Add payment service unit tests
- [ ] Add permission service tests
- [ ] Add report service tests
- [ ] Target: 85%+ backend coverage

## Day 5 — Security & Deploy Prep

- [ ] Verify Zod on all POST/PUT endpoints
- [ ] Verify helmet CSP headers in production mode
- [ ] Add `docker-compose.prod.yml`
- [ ] Update `README.md` with PERN deploy steps
- [ ] Create `.env.example` with all required vars

---

## Verification Milestones

| When | Check |
|---|---|
| Day 1 | `npm test` passes locally (unit tests green) |
| Day 2 | Poor inspection → WO auto-created with correct tasks |
| Day 4 | Backend coverage ≥ 85% |
| Day 5 | `docker-compose up` starts full stack |
