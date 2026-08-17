# TurfCare BD — Week 3 Build Plan

**Goal:** Fix production deployment, expand frontend feature coverage, and begin Phase 2 advanced features.

---

## Week 3 Priorities

| # | Item | Roadmap Ref | Status |
|---|---|---|---|
| 3.1 | Fix Vercel backend crash / deployment | 1.9 | In progress |
| 3.2 | Expand frontend page coverage | 1.4, 1.7 | Pending |
| 3.3 | Add frontend tests (RTL) | 1.7 | Pending |
| 3.4 | Implement offline inspection support (IndexedDB) | 2.1 | Pending |
| 3.5 | Trend analytics charts in Reports page | 2.2, 2.3 | Pending |
| 3.6 | Maintenance calendar page | 2.4 | Pending |
| 3.7 | Cost tracking module | 2.5 | Pending |

---

## Day 1 — Deployment & Foundation

- [x] Fix `@prisma/client` dependency placement for Vercel
- [x] Add explicit `buildCommand` in `vercel.json`
- [x] Add startup error logging in `server.js`
- [ ] Verify backend health endpoint returns 200 on Vercel
- [ ] Verify frontend can login through deployed backend
- [ ] Document exact Vercel settings in README

## Day 2 — Frontend Expansion

- [ ] Complete Reports page with charts (PQS trend, distribution, WO status, costs)
- [ ] Add Work Orders Kanban/calendar view
- [ ] Add Inspection detail page with scoring breakdown
- [ ] Add Field detail page with inspection history

## Day 3 — Offline Support

- [ ] Add IndexedDB wrapper for inspections
- [ ] Implement offline queue with auto-sync
- [ ] Add network status indicator in Layout
- [ ] Conflict resolution (last-write-wins)

## Day 4 — Advanced Analytics

- [ ] Moving averages (3/5-inspection) in backend
- [ ] Linear regression deterioration alerts
- [ ] Score projection endpoint
- [ ] Chart.js/Recharts integration in Reports

## Day 5 — Testing & Polish

- [ ] Add RTL tests for Login, Dashboard, Fields pages
- [ ] Add integration test for payment flow
- [ ] Run full test suite, record baseline
- [ ] Performance audit (Lighthouse)

---

## Verification Milestones

| When | Check |
|---|---|
| Day 1 | `https://turf-manageb.vercel.app/api/health` returns 200 |
| Day 2 | All 5 main pages load without errors |
| Day 3 | Offline inspection creation works in airplane mode |
| Day 4 | Reports page shows 4+ chart types |
| Day 5 | Frontend test coverage > 60% |
