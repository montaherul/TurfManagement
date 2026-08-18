# TurfBook — System Design (built on the existing TurfCare BD architecture)

Version 1.0 | Based on `TurfBook_System_Design_Document.docx` | 2026-08-18

## 0. Scope Decision

TurfBook **replaces** the current turf-inspection domain inside the existing monorepo
(`backend/` + `frontend/`). The *architecture* is reused wholesale; the *domain model,
routes, pages, and roles* are rebuilt. The existing platform is not a git repo — **git
init + initial commit is recommended before this rewrite.**

Reused as-is (architecture, zero domain coupling):
- Backend: Express factory (`app.js`), DI container (`container.js`), repository
  factories (`baseRepository` / `paginatedRepository`), middleware stack (helmet,
  rate-limit, CORS, zod `validate`, `errorHandler`), JWT auth + tenant isolation via
  Prisma `$extends` + AsyncLocalStorage, Socket.io rooms, interval schedulers,
  `pdfService` (pdfmake), `emailService`, upload pipeline (multer → sharp → /uploads),
  AuditLog, Zod validators, jest + supertest integration pattern.
- Frontend: Vite + React 18 + Redux Toolkit thunks, `api.js` axios client (401 →
  refresh → retry), `ProtectedRoute`/`RoleRoute`, `Layout` + `NotificationBell`,
  `DataTable` (Tabulator, CSV/XLSX/PDF export), `ui/*` components, i18n (en/bn),
  PWA (`sw.js` + manifest), socket singleton.

## 1. Tenant Model

| Concept | Old (TurfCare) | New (TurfBook) |
|---|---|---|
| Tenant | `Organization` | `Facility` |
| JWT payload | `{ userId, role, organizationId }` | `{ userId, role, facilityId }` (same 3-field shape) |
| Tenant middleware | `tenantMiddleware` on `req.organizationId` | rename key to `facilityId`; `platform_admin` bypasses |
| DB scoping | Prisma `$extends` injects `organizationId` | same mechanism, column renamed `facilityId` |
| Roles | `super_admin, org_admin, inspector, viewer` | `platform_admin, facility_owner, manager, operator, booker` |

Customers (`booker`) are tenant-less users (facilityId null) — like the current
`super_admin` pattern, and bookings scope by `booking.customerId`.

## 2. Prisma Data Model

Keep: `User`, `RolePermission`, `UserPermission`, `AuditLog`, `Notification`,
`ScheduledReport` (reused for owner report emails). Remove: `Field`, `Inspection`,
`WorkOrder`, `Subscription` (per-booking fee replaces subscriptions), `Payment`
(rebuilt), `Organization` (replaced by `Facility`).

```
Facility          name, slug(unique), status(PENDING|APPROVED|REJECTED|SUSPENDED|ACTIVE),
                  logo?, coverPhoto?, phone, email, address Json{line,area,city,lat,lng},
                  facebookUrl?, bkashNumber?, nagadNumber?, operatingHours Json{day→[open,close]},
                  description?, gallery Json[], cancellationPolicy Json{noticeHours,fullRefund,partialRefund},
                  application Json{ownerName,ownerEmail,ownerPhone,documentNote,reviewedBy?,reviewedAt?}
Resource          facilityId, name, type(FOOTBALL|BADMINTON|POOL|SNOOKER|CRICKET|BASKETBALL|TENNIS|OTHER),
                  capacity, basePrice Decimal, status(ACTIVE|INACTIVE|MAINTENANCE),
                  scheduleTemplate Json?{start,end,stepMinutes,days[],peakRanges[]}
Slot              facilityId, resourceId, date, startTime, endTime, price Decimal,
                  isPeak Bool, status(AVAILABLE|BOOKED|BLOCKED|MAINTENANCE),
                  unique [resourceId, date, startTime]  ← double-booking impossible
Booking           facilityId, bookingNo(unique), customerId→User, resourceId, date, startTime,
                  endTime, totalAmount, paidAmount, dueAmount, status(PENDING|CONFIRMED|COMPLETED|
                  CANCELLED|REFUNDED|NO_SHOW), paymentMethod(BKASH|NAGAD|CASH), transactionId?,
                  otpVerifiedAt?, cancelledBy?, cancelledAt?, notes?, checkInAt?, checkOutAt?
BookingItem       bookingId, slotId  (multi-slot bookings share one Booking + payment)
Payment           facilityId, bookingId?, paymentNo(unique), customerId?, amount,
                  method(BKASH|NAGAD|CASH), tranId?, status(PENDING|VERIFIED|REJECTED|REFUNDED),
                  platformFee(15), verifiedBy?, verifiedAt?, note?
Package           facilityId, name, sessions Int, hours Int, price, validityDays, active
PackagePurchase   facilityId, customerId, packageId, remainingSessions, remainingHours,
                  expiresAt, status(ACTIVE|EXHAUSTED|EXPIRED)
Tournament        facilityId, name, sportType, format(KNOCKOUT|ROUND_ROBIN|GROUP), entryFee,
                  maxTeams, registrationDeadline, startDate, status(OPEN|REGISTRATION_CLOSED|LIVE|FINISHED)
TournamentTeam    tournamentId, customerId, teamName, players Json, contactNumber,
                  status(PENDING|CONFIRMED)   ← payment-verified
TournamentMatch   tournamentId, round, teamAId?, teamBId?, matchDate, status(SCHEDULED|PLAYED),
                  result Json{scoreA,scoreB,winnerId}
Expense           facilityId, amount, category(ELECTRICITY|STAFF_SALARY|CLEANING|MAINTENANCE|EQUIPMENT|
                  MARKETING|RENT|REPAIR|INTERNET|OTHER), date, description?
Blacklist         facilityId, customerId?, teamName?, category(REPEATED_NO_SHOW|PAYMENT_FRAUD|
                  MISCONDUCT|PROPERTY_DAMAGE|VERBAL_ABUSE), reason, addedBy
Maintenance       resourceId, date, note, status(SCHEDULED|DONE)
OtpCode           mobile, code, purpose(LOGIN|BOOKING), expiresAt, attempts,
                  unique [mobile, purpose, createdAt]  (5/hour rate limit)
```

Wallet = computed view (no table): `totalIn = Σ verified payments`, `dues = Σ dueAmount`,
`pendingVerifications`, `platformFeeObligation = Σ platformFee`.

## 3. RBAC

Reuse `permissions.js` catalog + `permit()` middleware + per-user overrides.

| Module actions | platform_admin | facility_owner | manager | operator | booker |
|---|---|---|---|---|---|
| facility.* (own/global) | CRUD all | CRUD own | R | – | R public |
| resource.* | R | CRUD | CRU | R | R |
| slot.* | R | CRUD + generate | CRU | U (block/maintenance) | R |
| booking.* | R | CRUD | CRU | CRU (verify/check-in/out) | C/R own |
| payment.* | R | CRUD | R | U (verify/reject) | C own |
| expense.* | R | CRUD | – | – | – |
| package.* | R | CRUD | CRU | – | C purchase |
| tournament.* | R | CRUD | CRU | R | C register |
| blacklist.* | CRUD global | CRUD own | – | – | – |
| report.view | R all | CRUD own | R | – | – |
| admin.* | CRUD | – | – | – | – |

## 4. API Surface (`/api/v1/*` per spec §10.2; existing app mounts under `/api`, axios base ends with `/api` — mount TurfBook routers at `/api/v1/...` and set `VITE_API_URL` accordingly)

| Group | Prefix | Access | Key endpoints |
|---|---|---|---|
| Auth | `/auth` | public | `POST login`, `POST register` (owner application), `POST otp/request`, `POST otp/verify`, `POST refresh`, `POST logout`, `GET me` |
| Facilities | `/facilities` | public+auth | `GET ?q&type&date&time&lat&lng` (search), `GET /:slug` (public page), `GET /mine`, `PUT /me/profile`, `POST /apply` (onboarding) |
| Resources | `/resources` | owner | CRUD + `PATCH /:id/status` |
| Slots | `/slots` | owner+public | `GET ?resourceId&date` (availability), `POST /generate?date` (daily gen), `PATCH /:id` (block/maintenance) |
| Bookings | `/bookings` | auth | `POST` (OTP + tranId), `GET /mine?tab=upcoming|completed|cancelled`, `GET ?facilityId&date&status` (owner/operator), `PATCH /:id/status` (confirm/check-in/check-out/no-show), `POST /:id/cancel` |
| Payments | `/payments` | owner+operator | `GET ?status=pending` (verification queue), `PATCH /:id/verify|reject`, `GET /wallet` (balance/dues/fees) |
| Packages | `/packages` | owner+public | CRUD, `POST /:id/purchase`, `GET /mine` |
| Tournaments | `/tournaments` | owner+public | CRUD, `POST /:id/register`, `GET /:id/matches`, `POST /matches/:id/result` |
| Expenses | `/expenses` | owner | CRUD |
| Blacklist | `/blacklist` | owner+platform | CRUD |
| Admin | `/admin` | platform_admin | `GET/POST /facility-applications`, `PATCH /applications/:id/approve|reject`, `GET /facilities`, `GET /customers`, `GET /fees`, `GET /blacklist`, `PUT /settings` (fee amount, SMS provider) |
| Reports | `/reports` | owner+platform | booking/income/expense/customer/resource/payment/tournament + `?format=csv|pdf` |
| Notifications | `/notifications` | auth | reuse existing router + socket |

Socket events: `booking:created` (→ facility room), `payment:submitted` (→ facility),
`booking:confirmed` (→ customer), `booking:completed`, `notifications:new` (existing).

## 5. Frontend Routes & Pages

Keep: `Layout`, `NotificationBell`, `DataTable`, `ui/*`, Redux slices pattern, `api.js`,
i18n (new keys), PWA. Replace all turf pages.

| Route | Page | Roles |
|---|---|---|
| `/` | Landing + facility search (q, sport type, date, time) | public |
| `/f/:slug` | Public facility page (gallery, resources, prices, operating hours, packages, tournaments, embedded map) + booking flow (date → slots → mobile OTP → method + tranId → pending) | public |
| `/login`, `/register` (owner application), `/otp` (customer login) | Auth | public |
| `/my-bookings` | Upcoming / Completed / Cancelled tabs + cancel | booker |
| `/my-packages`, `/tournaments` (register) | Customer extras | booker |
| `/dashboard` | Owner: today's bookings, month revenue, today's expenses, available slots, daily schedule by resource, recent payments | owner/manager/operator |
| `/resources`, `/slots` (grid + generate), `/bookings` (manage/verify), `/payments` (wallet + verification queue) | Ops | owner/manager/operator |
| `/income-expenses`, `/packages`, `/tournaments`, `/blacklist`, `/reports` (7 report types + CSV/PDF) | Finance/ops | owner (reports: owner+manager) |
| `/settings` | Facility profile, operating hours, bKash/Nagad numbers, cancellation policy, users, notifications | owner |
| `/admin` | Applications, facilities, customers, fees, blacklist, platform settings | platform_admin |
| `/operator` | Operator daily ops: today + next-7-days schedule, check-in/out, verify payments, slot status | operator |

## 6. Key Business Flows

1. **Onboarding** — public `POST /auth/register` (application) → `Facility(status=PENDING)`
   → platform admin reviews → approve → creates owner `User` (temp password) → email
   (SendGrid w/ console fallback) → owner changes password on first login.
2. **Slot generation** — `jobs/slotScheduler.js` (interval, like `reportScheduler`):
   each day generates `Slot` instances per active resource from `scheduleTemplate`
   (step minutes, peak ranges → `isPeak` + price). Manual `POST /slots/generate` for
   ad-hoc days. Holiday/blocked = slot `BLOCKED`.
3. **Booking** — public slot pick → mobile + OTP (5/hr rate limit, console-logged OTP
   until an SMS provider is configured) → payment method + tranId → `Booking(PENDING)`
   + `Payment(PENDING)` → socket + in-app notification to facility → owner/operator
   verifies tranId against their bKash/Nagad app → `CONFIRMED` → customer notified.
   Multi-slot: consecutive slots → one Booking + `BookingItem` rows.
4. **Money flow** — customer pays facility directly (offline); platform fee **15 BDT per
   booking** recorded on `Payment.platformFee` at verification; platform admin reports
   cumulative fees. Collection mechanism (deduct-at-payment vs settle-at-payout) is a
   `SystemSetting` flag, per spec §9.3.
5. **Check-in/out & no-show** — operator marks `CHECKED_IN` (reuse status stream:
   `PENDING → CONFIRMED → (checkInAt) → COMPLETED`); end-of-day scheduler flags
   un-attended confirmed bookings → `NO_SHOW`.
6. **Cancellation/refund** — policy from `Facility.cancellationPolicy`; refund recorded
   on payment history (REFUNDED); platform fee never refunded (spec §9.4).
7. **Blacklist enforcement** — `bookingService.create` rejects if `Blacklist` row exists
   for customer+facility (API-level, not just UI).
8. **Packages** — purchase → `PackagePurchase` (balance); booking against package
   decrements balance; expiry job closes expired; depleted → EXHAUSTED.
9. **Tournaments** — owner creates → teams register (entry fee via payment flow,
   `TournamentTeam` PENDING→CONFIRMED) → fixtures (`TournamentMatch`) → results.

## 7. Scheduled Reports (reuse)

`ScheduledReport` + `reportScheduler` reused for owner report emails (daily booking
summary, weekly income, monthly expense). New `reportService` builds HTML/PDF via
existing pdfmake + emailService.

## 8. Implementation Phases (spec §11.2)

- **Phase 1 (MVP):** schema + migrations + seed; auth (incl. OTP); facility apply →
  admin approval; resources; slots (template + daily generation); public search +
  facility page + booking flow; payment submit/verify; booking status machine;
  notifications (in-app + socket). Tests: unit (slot gen, booking rules, blacklist,
  fee calc) + integration (booking lifecycle, tenant isolation).
- **Phase 2:** income/expense mgmt; blacklist mgmt; 7 report types + CSV/PDF export;
  operator daily-ops page; customer DB (platform admin).
- **Phase 3:** tournaments; packages; SMS/email notifications; search/discovery polish.
- **Phase 4:** advanced analytics (resource utilization), platform fee automation,
  mobile PWA polish.

## 9. Gaps / Notes vs Spec

- **SMS provider**: none configured — OTP + SMS notifications console-logged (same
  pattern as existing SendGrid fallback); provider slot in system settings.
- **Google Maps**: no API key — reuse Leaflet/static embed; geolocation stored but map
  picker degraded (no key needed for display of lat/lng).
- **OTP storage**: DB table (not Redis) for portability; rate limit 5/hour/mobile.
- **JWT**: existing secret-signed HS256 tokens; spec asks RS256 — flagged, not blocking.
- **Platform fee collection mechanism** (deduct vs settle): config flag, both recorded.
- **Next.js/NextAuth per spec §11.1 are NOT adopted** — decision: reuse the existing
  Vite/React + Express stack (the architecture being reused). Zustand/TanStack Query
  not adopted — Redux pattern stays.