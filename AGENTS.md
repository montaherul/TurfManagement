# AGENTS.md

# PERN Stack Development Rules — JavaScript + JSX

## 1. Purpose

This document defines the mandatory architecture, coding, security, database,
API, frontend, testing, and development rules for this PERN Stack project.

The agent MUST follow these rules when creating, modifying, refactoring,
debugging, reviewing, or testing code.

The project uses:

```text
P — PostgreSQL
E — Express.js
R — React.js + JSX
N — Node.js
```

The project uses JavaScript, NOT TypeScript.

---

# 2. Mandatory Technology Stack

## Frontend

```text
React
JSX
Vite
React Router
TanStack Query
Axios or fetch
CSS / Tailwind CSS / established UI system
ESLint
Prettier
```

## Backend

```text
Node.js
Express.js
JavaScript
PostgreSQL
pg
Zod or established runtime validation library
JWT or secure session authentication
```

## Testing

```text
Vitest or Jest
React Testing Library
Supertest
Playwright when E2E testing is required
```

Do NOT automatically introduce:

```text
Next.js
NestJS
TypeScript
Prisma
Sequelize
TypeORM
GraphQL
Redux
MobX
tRPC
CQRS
microservices
event sourcing
```

unless explicitly requested or genuinely required.

Do not add dependencies merely because they are popular.

---

# 3. Mandatory Project Structure

The project MUST use a clear frontend/backend separation.

```text
project-root/
│
├── AGENTS.md
├── README.md
├── .gitignore
├── .env.example
├── docker-compose.yml
│
├── frontend/
│   ├── public/
│   │
│   ├── src/
│   │   ├── app/
│   │   │   ├── App.jsx
│   │   │   └── providers/
│   │   │
│   │   ├── components/
│   │   │   ├── common/
│   │   │   ├── layout/
│   │   │   └── ui/
│   │   │
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── roles/
│   │   │   └── dashboard/
│   │   │
│   │   ├── hooks/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── routes/
│   │   ├── services/
│   │   │   └── api/
│   │   ├── utils/
│   │   ├── constants/
│   │   ├── assets/
│   │   ├── main.jsx
│   │   └── index.css
│   │
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── eslint.config.js
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── env.js
│   │   │   └── database.js
│   │   │
│   │   ├── controllers/
│   │   │   ├── auth.controller.js
│   │   │   └── user.controller.js
│   │   │
│   │   ├── services/
│   │   │   ├── auth.service.js
│   │   │   └── user.service.js
│   │   │
│   │   ├── repositories/
│   │   │   ├── user.repository.js
│   │   │   └── role.repository.js
│   │   │
│   │   ├── routes/
│   │   │   ├── index.js
│   │   │   ├── auth.routes.js
│   │   │   └── user.routes.js
│   │   │
│   │   ├── middlewares/
│   │   │   ├── authenticate.js
│   │   │   ├── authorize.js
│   │   │   ├── validate.js
│   │   │   └── errorHandler.js
│   │   │
│   │   ├── validators/
│   │   ├── errors/
│   │   ├── utils/
│   │   ├── constants/
│   │   ├── app.js
│   │   └── server.js
│   │
│   ├── migrations/
│   ├── seeds/
│   ├── tests/
│   │   ├── unit/
│   │   └── integration/
│   ├── package.json
│   └── eslint.config.js
│
├── shared/
│   └── src/
│       ├── schemas/
│       └── constants/
│
└── docs/
    ├── architecture/
    ├── api/
    └── database/
```

---

# 4. Frontend Rules

Everything inside `frontend/` is browser/client code.

Frontend MAY contain:

- React components
- JSX
- pages
- layouts
- routing
- API clients
- TanStack Query hooks
- UI state
- client-side validation
- presentation logic
- browser utilities

Frontend MUST NOT contain:

```text
PostgreSQL connections
SQL queries
database credentials
server secrets
password hashing
server-side authorization enforcement
Express controllers
Express middleware
backend business logic
```

The browser MUST communicate with the backend through HTTP/HTTPS APIs.

Correct:

```text
React
  ↓
API
  ↓
Express
  ↓
Service
  ↓
Repository
  ↓
PostgreSQL
```

Forbidden:

```text
React
  ↓
PostgreSQL
```

---

# 5. JSX Rules

The frontend uses `.jsx` files.

Examples:

```text
App.jsx
main.jsx
UserForm.jsx
UserTable.jsx
UserDetails.jsx
Login.jsx
Dashboard.jsx
```

JavaScript utility files use `.js`.

Examples:

```text
apiClient.js
userApi.js
useUsers.js
auth.js
formatDate.js
```

Do NOT create:

```text
.ts
.tsx
```

unless TypeScript is explicitly approved.

---

# 6. React Component Rules

Every component should have one clear responsibility.

Good:

```text
UserTable
UserForm
UserDetails
UserFilters
Navbar
Sidebar
```

Avoid giant components that contain:

```text
API calls
multiple unrelated workflows
business rules
authentication logic
permission logic
large amounts of duplicated UI
```

Break large components into focused components.

Do not create components merely to reduce line count. The component should have
a meaningful reusable or organizational responsibility.

---

# 7. React State Rules

Use the simplest state solution that fits the requirement.

Preferred:

```text
Local UI state
    ↓
useState / useReducer

Shared UI state
    ↓
Context when appropriate

Server state
    ↓
TanStack Query
```

Do not introduce Redux or another global state library without a real requirement.

Do not store server data in global state merely because it can be done.

---

# 8. Server State Rules

Use TanStack Query for:

```text
fetching
caching
loading states
error states
mutations
refetching
pagination
query invalidation
```

Do not build a custom global cache when TanStack Query already solves the problem.

---

# 9. API Client Rules

Frontend API calls should be centralized.

Preferred:

```text
frontend/src/services/api/
├── apiClient.js
├── authApi.js
├── userApi.js
└── roleApi.js
```

Components should not repeatedly configure Axios/fetch manually.

Bad:

```jsx
useEffect(() => {
  fetch("/api/users", {
    headers: {
      Authorization: token
    }
  });
}, []);
```

throughout many components.

Prefer:

```js
const users = await userApi.getUsers();
```

---

# 10. Backend Architecture

The mandatory backend flow is:

```text
Express Route
      ↓
Middleware
      ↓
Controller
      ↓
Service
      ↓
Repository
      ↓
PostgreSQL
```

Responsibilities:

```text
Route
    = endpoint definition

Middleware
    = cross-cutting HTTP concerns

Controller
    = HTTP request/response handling

Service
    = business/application logic

Repository
    = database access

PostgreSQL
    = persistent data/integrity
```

Never bypass these boundaries without a justified reason.

---

# 11. Route Rules

Routes define endpoints only.

Correct:

```js
router.get(
  "/users",
  authenticate,
  authorize("user:read"),
  userController.list
);
```

Routes MUST NOT:

- execute SQL
- access PostgreSQL directly
- contain business rules
- contain transactions
- perform complex workflows
- contain large validation logic

Bad:

```js
router.get("/users", async (req, res) => {
  const result = await pool.query("SELECT * FROM users");
  res.json(result.rows);
});
```

---

# 12. Controller Rules

Controllers MUST remain thin.

Controllers MAY:

- read request parameters
- read request body
- read authenticated user
- invoke validation
- call services
- return HTTP status codes
- return JSON
- handle HTTP-specific concerns

Controllers MUST NOT:

```text
SQL
PostgreSQL queries
business rules
database transactions
repository implementation
password hashing
complex workflows
large data-processing operations
React/UI logic
```

Correct:

```js
export async function createUser(req, res) {
  const input = createUserSchema.parse(req.body);

  const result = await userService.create(input);

  return res.status(201).json({
    success: true,
    data: result
  });
}
```

The controller should coordinate HTTP, not implement the application.

---

# 13. Service Rules

Services own business/application logic.

Services are responsible for:

- business rules
- workflows
- business validation
- authorization decisions that require business context
- coordinating repositories
- transactions
- mapping application data
- external service orchestration

Example:

```text
UserService
    ↓
validate business rules
    ↓
create user
    ↓
assign role
    ↓
create audit record
    ↓
commit transaction
```

Services MUST NOT:

```text
use Express Response
return HTTP status codes
contain React logic
contain JSX
contain UI logic
contain raw SQL
```

A service answers:

> What should the application do?

A repository answers:

> How should the data be stored/retrieved?

---

# 14. Repository Rules

Repositories own database access.

Repositories are responsible for:

```text
PostgreSQL queries
parameterized SQL
CRUD
complex queries
pagination
filtering
sorting
aggregation
database result mapping
database-specific operations
```

Repositories MUST NOT contain:

```text
HTTP logic
Express Request/Response
React logic
business rules
UI formatting
authorization policy
```

Correct:

```js
export async function findUserById(id) {
  const result = await pool.query(
    `
      SELECT id, username, email, role_id
      FROM users
      WHERE id = $1
        AND deleted_at IS NULL
    `,
    [id]
  );

  return result.rows[0] ?? null;
}
```

---

# 15. Generic Repository Rule

Do NOT automatically create a universal:

```text
GenericRepository.js
```

for every entity.

PostgreSQL applications frequently need domain-specific queries.

Prefer explicit repositories when they make the code clearer:

```text
user.repository.js
role.repository.js
order.repository.js
invoice.repository.js
```

Use shared database helpers when they genuinely reduce duplication.

Golden rule:

```text
Reuse where useful.
Do not abstract away meaningful domain behavior.
```

---

# 16. PostgreSQL Rules

Use PostgreSQL through the `pg` driver unless another driver is explicitly
approved.

Database configuration belongs in:

```text
backend/src/config/database.js
```

Example:

```js
import pg from "pg";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});
```

Never create a new database pool per request.

Use one configured application pool.

---

# 17. SQL Injection Prevention

Parameterized SQL is mandatory.

Correct:

```js
pool.query(
  "SELECT * FROM users WHERE email = $1",
  [email]
);
```

Forbidden:

```js
pool.query(
  `SELECT * FROM users WHERE email = '${email}'`
);
```

Never concatenate user input into SQL.

All external input is untrusted.

---

# 18. Dynamic SQL Rules

Never directly insert client-provided column names into SQL.

Bad:

```js
`ORDER BY ${req.query.sort}`
```

Use an allowlist:

```js
const allowedSortColumns = {
  username: "u.username",
  createdAt: "u.created_at"
};

const sortColumn =
  allowedSortColumns[req.query.sort] ?? "u.created_at";
```

Only approved SQL fragments may be selected dynamically.

---

# 19. Database Schema Rules

Use PostgreSQL constraints for data integrity.

Prefer:

```text
PRIMARY KEY
FOREIGN KEY
UNIQUE
NOT NULL
CHECK
DEFAULT
INDEX
```

Do not rely only on frontend validation.

Example:

```sql
email TEXT NOT NULL UNIQUE
```

is preferable to relying only on React validation.

---

# 20. Database Naming Rules

Use PostgreSQL `snake_case`.

Tables:

```text
users
user_roles
role_permissions
orders
order_items
```

Columns:

```text
created_at
updated_at
deleted_at
user_id
company_id
role_id
```

Primary key:

```text
id
```

Foreign key:

```text
user_id
role_id
company_id
```

Do not mix:

```text
camelCase
PascalCase
snake_case
```

inside database naming.

---

# 21. Migration Rules

Every schema change MUST have a migration.

Examples:

```text
001_create_users.sql
002_create_roles.sql
003_create_permissions.sql
004_add_company_id_to_users.sql
```

Rules:

- migrations must be deterministic
- migrations must be reviewed
- migrations should be forward-only after shared deployment
- do not edit an already-applied migration
- create a new migration for subsequent changes
- destructive migrations require explicit review

Never manually modify production schema without recording the change in a migration.

---

# 22. Seed Rules

Seeds are for deterministic initial/reference data.

Good seed data:

```text
roles
permissions
system configuration
development/reference data
```

Never seed:

```text
production passwords
API keys
tokens
database credentials
real customer data
```

Seeds should be idempotent where practical.

---

# 23. Transactions

Use transactions when multiple changes must succeed or fail together.

Example:

```text
Create User
+
Assign Role
+
Create Audit Record
```

must behave atomically.

Conceptually:

```text
BEGIN
    create user
    assign role
    create audit
COMMIT
```

If something fails:

```text
ROLLBACK
```

Transactions belong to the service/application workflow.

Repositories should accept a transaction client when multiple repository calls
must participate in the same transaction.

Example:

```js
await withTransaction(async (client) => {
  const user = await userRepository.create(input, client);
  await roleRepository.assign(user.id, roleId, client);
});
```

Controllers MUST NOT manage transactions.

---

# 24. Validation Rules

All external input MUST be validated.

Validate:

```text
request body
query parameters
path parameters
relevant headers
```

Use Zod or the project's established runtime validation library.

Example:

```js
const createUserSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(8)
});
```

Do not treat JavaScript objects as trusted merely because they came from the API.

---

# 25. Three-Level Validation

Use:

```text
Frontend validation
    ↓
UX

Backend validation
    ↓
Security + API contract

Database constraints
    ↓
Data integrity
```

Never rely on only frontend validation.

---

# 26. Error Handling

Use centralized error handling.

Recommended:

```text
backend/src/errors/
├── AppError.js
├── NotFoundError.js
├── UnauthorizedError.js
├── ForbiddenError.js
└── ValidationError.js
```

Central middleware:

```js
app.use(errorHandler);
```

Never silently swallow errors.

Forbidden:

```js
try {
  // ...
} catch {
}
```

Production responses MUST NOT expose:

```text
stack traces
SQL
database credentials
internal filesystem paths
secrets
```

---

# 27. API Response Rules

Use a consistent API response format.

Success:

```json
{
  "success": true,
  "data": {}
}
```

List:

```json
{
  "success": true,
  "data": [],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 100
  }
}
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "User not found"
  }
}
```

Do not expose raw PostgreSQL errors to clients.

---

# 28. HTTP Status Codes

Use correct HTTP status codes.

```text
200 OK
201 Created
204 No Content
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
422 Unprocessable Entity
429 Too Many Requests
500 Internal Server Error
```

Do not return `200 OK` for every outcome.

---

# 29. Authentication Rules

Authentication answers:

> Who is the user?

Authorization answers:

> What is the user allowed to do?

Keep these concepts separate.

Recommended:

```text
authenticate.js
authorize.js
auth.service.js
```

Authentication must be centralized.

---

# 30. Password Rules

Passwords MUST:

- never be stored in plaintext
- never be logged
- never be returned by an API
- use a modern password hashing algorithm

Preferred:

```text
Argon2id
```

or an approved secure alternative such as bcrypt.

Never use:

```text
MD5
SHA1
plain SHA256
Base64
reversible encryption
```

for password storage.

---

# 31. JWT / Session Rules

If JWT is used:

- verify the signature
- validate expiration
- validate issuer/audience when configured
- use appropriate token lifetimes
- protect refresh tokens
- never trust an unverified decoded payload
- never expose signing secrets to the frontend

For browser applications, prefer secure `HttpOnly` and `Secure` cookies for
long-lived authentication material when the architecture supports them.

If refresh tokens are stored server-side, prefer storing secure hashes rather
than plaintext tokens where practical.

---

# 32. RBAC Rules

Authorization MUST be enforced on the backend.

Recommended:

```text
User
  ↓
Role
  ↓
Permission
```

Example:

```js
router.delete(
  "/users/:id",
  authenticate,
  authorize("user:delete"),
  userController.remove
);
```

Frontend permission checks are for UX only.

They are NOT security.

A user modifying React code in browser developer tools must still be denied by
the API.

---

# 33. Multi-Tenant Rules

If the application is multi-tenant, tenant isolation is mandatory.

Every tenant-scoped database operation MUST enforce tenant scope.

Bad:

```sql
SELECT *
FROM users
WHERE id = $1;
```

when users belong to companies.

Preferred:

```sql
SELECT *
FROM users
WHERE id = $1
  AND company_id = $2;
```

Never trust a client-provided `company_id` as proof of authorization.

The server must derive the current tenant from authenticated context.

A company user MUST NOT access another company's records by changing:

```text
company_id
user_id
order_id
URL parameters
request body
query parameters
```

---

# 34. Platform vs Company RBAC

If the project has both platform and company scopes:

```text
PLATFORM
    ↓
Platform Admin

COMPANY
    ↓
Company Admin
    ↓
Operational Roles
    ↓
Permissions
```

Platform and company roles MUST be explicitly distinguishable.

Do NOT use:

```js
role === "Admin"
```

as proof of platform-level access if every company can also have an Admin role.

Scope must be part of the authorization decision.

---

# 35. Frontend Permission Rules

Frontend should hide or disable actions the current user cannot perform.

Example:

```jsx
{can("user:create") && (
  <button>Create User</button>
)}
```

But the backend MUST still enforce:

```text
user:create
user:edit
user:delete
```

Do not calculate security privileges only in React.

---

# 36. API Pagination

Large datasets MUST use server-side pagination.

Example:

```text
GET /api/v1/users?page=1&pageSize=25&search=ali
```

Pagination, filtering, sorting, and searching should happen in PostgreSQL for
large datasets.

Do not load thousands of rows into React just to paginate them in memory.

---

# 37. Filtering and Sorting

For large datasets:

```text
Filtering → PostgreSQL
Sorting   → PostgreSQL
Search    → PostgreSQL
Pagination → PostgreSQL
```

Validate filter and sort parameters.

Never directly concatenate user-provided SQL fragments.

---

# 38. N+1 Query Prevention

Avoid N+1 queries.

Bad:

```text
Get 100 users
↓
Run one role query per user
↓
101 database queries
```

Prefer:

```text
JOIN
batch queries
aggregations
```

when appropriate.

---

# 39. Database Performance

Create indexes based on real query patterns.

Potential candidates:

```text
foreign keys
unique lookup fields
tenant_id
frequently filtered fields
created_at
composite query patterns
```

Do not create indexes blindly.

Indexes have storage and write-performance costs.

Use:

```sql
EXPLAIN ANALYZE
```

when diagnosing query performance.

---

# 40. Soft Delete

If soft deletion is required, prefer:

```text
deleted_at
```

over inconsistent boolean deletion flags.

Normal queries should exclude deleted records.

Administrative/recovery queries may explicitly include them.

---

# 41. Audit Logging

For systems requiring auditability, record important actions:

```text
create
update
delete
login
logout
role change
permission change
sensitive export
```

Useful fields include:

```text
actor_id
action
entity
entity_id
company_id
timestamp
```

Never put passwords, tokens, or secrets in audit logs.

---

# 42. File Upload Rules

Validate:

```text
file size
extension
MIME type
content where necessary
```

Never trust the client filename or MIME type alone.

Do not allow arbitrary uploads to become executable server content.

Use controlled storage or object storage when appropriate.

---

# 43. Security Middleware

Use appropriate security middleware when needed:

```text
helmet
CORS
rate limiting
request size limits
secure cookies
input validation
```

Security middleware does not replace authorization.

---

# 44. CORS Rules

CORS must be explicit in production.

Do NOT blindly use:

```js
cors({
  origin: "*"
});
```

for authenticated production applications.

Configure trusted frontend origins.

Example:

```text
Development:
http://localhost:5173

Production:
https://app.example.com
```

---

# 45. Environment Variables

Never commit:

```text
.env
.env.local
database passwords
JWT secrets
API keys
private keys
production credentials
```

Commit:

```text
.env.example
```

Example:

```env
NODE_ENV=development
PORT=5000
DATABASE_URL=
JWT_SECRET=
CORS_ORIGIN=
```

Validate required environment variables at backend startup.

---

# 46. Frontend Environment Rules

Only browser-safe variables may be exposed to Vite.

Never expose:

```text
DATABASE_URL
DB_PASSWORD
JWT_SECRET
PRIVATE_API_KEY
```

Remember:

> Anything shipped to the browser can be inspected by the user.

---

# 47. Logging Rules

Use the project's configured logging system.

Do not use permanent debugging such as:

```js
console.log()
```

as production application logging.

Never log:

```text
passwords
tokens
JWTs
API keys
database passwords
authorization headers
session cookies
sensitive personal information
```

---

# 48. Accessibility Rules

Use semantic HTML:

```html
button
nav
main
form
label
header
footer
```

Avoid:

```html
<div onClick={...}>
```

for interactive controls when a semantic element exists.

All important interactions should support keyboard usage.

Inputs must have labels.

Images require meaningful `alt` text unless decorative.

---

# 49. Loading / Error / Empty States

Every important asynchronous page should handle:

```text
Loading
Success
Empty
Error
Retry
```

Do not leave a blank screen while data is loading.

---

# 50. Form Rules

Forms should have:

```text
validation
labels
loading state
disabled submit during request
server error handling
success feedback
accessible controls
```

Do not duplicate the same validation logic across many components unnecessarily.

---

# 51. XSS / HTML Rules

Avoid injecting arbitrary HTML.

Do not use:

```jsx
dangerouslySetInnerHTML
```

unless content is trusted and appropriately sanitized.

User-generated HTML MUST be sanitized.

---

# 52. CSRF Rules

If authentication uses cookies, consider:

```text
SameSite cookies
CSRF tokens
Origin validation
Referer validation where appropriate
```

Do not assume JWT automatically solves browser security concerns.

---

# 53. API Versioning

If API versioning is required, use one consistent convention:

```text
/api/v1/users
/api/v1/roles
/api/v1/orders
```

Do not mix versioning styles.

---

# 54. Health Checks

When appropriate, expose:

```text
GET /health
```

and optionally:

```text
GET /ready
```

Do not expose secrets or sensitive database details in health responses.

---

# 55. Graceful Shutdown

The Node.js server should handle:

```text
SIGTERM
SIGINT
```

and close resources gracefully:

```text
HTTP server
PostgreSQL pool
other external connections
```

---

# 56. Testing Rules

Meaningful features MUST have tests.

Backend:

```text
service tests
API tests
repository/database tests where valuable
```

Frontend:

```text
component tests
hook tests
page behavior tests
```

Critical workflows may require:

```text
E2E tests
```

---

# 57. Security Testing Priority

Prioritize tests for:

```text
authentication
authorization
RBAC
tenant isolation
password handling
business rules
critical workflows
database constraints
API contracts
```

A test proving that Company A cannot access Company B's data is more valuable
than a superficial UI snapshot.

---

# 58. Test Isolation

Tests MUST NOT use production databases.

Use:

```text
TEST_DATABASE_URL
```

or an isolated PostgreSQL test container/database.

Test data should be deterministic.

---

# 59. JavaScript Rules

Use modern JavaScript.

Prefer:

```text
const
let
async/await
optional chaining
nullish coalescing
destructuring
modules
```

Avoid unnecessary:

```text
var
callback pyramids
global variables
```

Do not use `eval()`.

Do not use dynamic code execution for untrusted input.

---

# 60. JavaScript Type Safety

Because this project uses JavaScript rather than TypeScript:

- validate runtime data
- use JSDoc when it materially improves maintainability
- use ESLint
- use clear object structures
- validate API boundaries
- avoid uncontrolled `any-like` objects
- do not assume external data has the expected shape

Runtime validation is especially important at:

```text
HTTP boundaries
database boundaries
external API boundaries
file boundaries
```

---

# 61. JSDoc

JSDoc may be used for important functions and shared modules.

Example:

```js
/**
 * Creates a new user.
 * @param {Object} input
 * @param {string} input.email
 * @param {string} input.password
 * @returns {Promise<Object>}
 */
async function createUser(input) {
  // ...
}
```

Do not add meaningless comments to obvious code.

---

# 62. Naming Conventions

JavaScript variables/functions:

```text
camelCase
```

Examples:

```js
getUserById
createOrder
currentUser
```

React components:

```text
PascalCase
```

Examples:

```text
UserForm
UserTable
Dashboard
```

Constants:

```text
UPPER_SNAKE_CASE
```

when genuinely constant:

```js
DEFAULT_PAGE_SIZE
MAX_FILE_SIZE
```

Database:

```text
snake_case
```

---

# 63. File Naming

Backend:

```text
user.controller.js
user.service.js
user.repository.js
user.routes.js
user.schema.js
```

Frontend:

```text
UserForm.jsx
UserTable.jsx
UserDetails.jsx
useUsers.js
userApi.js
```

Do not mix arbitrary naming conventions.

---

# 64. Async Rules

Prefer:

```js
async/await
```

Avoid deeply nested promise chains.

Always handle rejected promises.

Do not create unhandled promises.

Use `Promise.all()` when operations are genuinely independent.

Do NOT parallelize operations that depend on one another or must occur in a
specific transaction order.

---

# 65. Dependency Rules

Before installing a package:

```text
1. Check whether existing code already solves the problem.
2. Check package maintenance.
3. Check security.
4. Check bundle/runtime impact.
5. Check whether native functionality is enough.
```

Avoid dependency proliferation.

---

# 66. SOLID Principles

The project MUST follow SOLID pragmatically.

## SRP — Single Responsibility

```text
Controller
    = HTTP

Service
    = business/application logic

Repository
    = database

React Component
    = UI responsibility
```

## OCP — Open/Closed

Prefer reusable components and services where they reduce repeated modification.

## LSP — Liskov Substitution

Functions/modules honoring an established contract must preserve that contract.

## ISP — Interface Segregation

Although JavaScript does not require interfaces, modules should remain focused.

Avoid giant modules such as:

```text
applicationManager.js
```

containing:

```text
users
orders
payments
authentication
reports
permissions
database
```

## DIP — Dependency Inversion

High-level application logic should depend on stable abstractions/configuration
rather than tightly coupling itself to infrastructure details.

---

# 67. SOLID Does Not Mean More Files

Do NOT create:

```text
UserManager
UserHelper
UserUtil
UserProcessor
UserHandler
UserFactory
UserAdapter
```

without a genuine responsibility.

The goal is:

```text
simple
clear
reusable
testable
maintainable
```

not maximum abstraction.

---

# 68. No Architecture Drift

The agent MUST NOT automatically introduce:

```text
microservices
CQRS
event sourcing
GraphQL
message brokers
ORMs
Redux
complex DI frameworks
repository factories
service factories
```

without explicit approval or a strong requirement.

Start with a modular monolith.

---

# 69. Feature Implementation Order

For a typical backend feature:

```text
1. Requirement
2. Database migration if needed
3. Shared schema/type if needed
4. Repository
5. Service
6. Validator
7. Authorization
8. Controller
9. Route
10. Tests
```

Frontend:

```text
11. API client
12. Query/mutation hook
13. Component
14. Page
15. UI permission handling
16. Loading/error/empty states
17. Tests
```

Do not bypass layers merely to save a few lines.

---

# 70. Standard CRUD Flow

For standard CRUD:

```text
PostgreSQL Table
       ↓
Migration
       ↓
Repository
       ↓
Service
       ↓
Controller
       ↓
Route
       ↓
API Client
       ↓
TanStack Query
       ↓
React Page
       ↓
Form / Table
```

Do not create unnecessary managers or factories.

---

# 71. Complex Workflow Flow

For workflows such as:

```text
order approval
shipment processing
invoice generation
payment processing
role assignment
```

use a dedicated service.

Example:

```text
OrderController
      ↓
OrderService
      ↓
OrderRepository
PaymentRepository
AuditRepository
      ↓
PostgreSQL Transaction
```

The service coordinates the workflow.

---

# 72. Database vs Application Logic

Use PostgreSQL constraints for:

```text
uniqueness
foreign key integrity
basic data validity
```

Use services for:

```text
business workflows
authorization decisions
cross-entity rules
application policies
```

Use repositories for:

```text
SQL
queries
database-specific operations
```

Do not put all business logic into SQL.

Do not put all database logic into services.

---

# 73. Refactoring Rules

Before refactoring:

```text
1. Understand current behavior.
2. Search all usages.
3. Check API contracts.
4. Check database dependencies.
5. Check tests.
6. Make the smallest safe change.
7. Run lint.
8. Run tests.
9. Run build.
```

Do not rewrite working architecture without a real requirement.

---

# 74. Debugging Rules

When debugging:

```text
1. Reproduce the problem.
2. Identify the failing layer.
3. Inspect frontend request.
4. Inspect route.
5. Inspect middleware.
6. Inspect controller.
7. Inspect service.
8. Inspect repository query.
9. Inspect database result.
10. Fix root cause.
11. Add regression test.
```

Do not patch symptoms blindly.

---

# 75. Git Rules

Use meaningful commits:

```text
feat: add user management
fix: prevent cross-company access
refactor: simplify permission service
test: add authorization tests
docs: update API documentation
chore: update dependencies
```

Avoid:

```text
update
changes
final
done
test
asdf
```

Do not commit secrets or unnecessary generated files.

---

# 76. Pull Request / Completion Rules

Before considering a feature complete:

```text
- [ ] Requirement implemented
- [ ] Correct architecture
- [ ] Input validation
- [ ] Authentication where required
- [ ] Authorization where required
- [ ] Tenant isolation where applicable
- [ ] Database constraints reviewed
- [ ] Migration included where needed
- [ ] Transactions used where needed
- [ ] Error handling implemented
- [ ] Loading/error/empty UI states
- [ ] Tests added
- [ ] ESLint passes
- [ ] Tests pass
- [ ] Production build passes
- [ ] No secrets committed
- [ ] No debug logging
```

A feature is NOT complete merely because the happy-path UI works.

---

# 77. API Security Checklist

Before completing an authenticated endpoint:

```text
- [ ] Authentication is required where appropriate.
- [ ] Authorization is enforced server-side.
- [ ] Body is validated.
- [ ] Query parameters are validated.
- [ ] Path parameters are validated.
- [ ] Tenant scope is enforced where applicable.
- [ ] SQL is parameterized.
- [ ] Sensitive fields are excluded.
- [ ] Errors do not expose internal details.
- [ ] Rate limiting is considered.
- [ ] Audit logging is considered for sensitive mutations.
```

---

# 78. Agent Decision Rules

Before creating or modifying code, the agent MUST ask:

```text
1. What layer does this belong to?
2. Is there already an existing implementation?
3. Am I duplicating functionality?
4. Am I putting business logic in the wrong layer?
5. Am I putting database logic in a service/controller?
6. Is external input validated?
7. Is authorization enforced server-side?
8. Is tenant scope enforced?
9. Is sensitive data protected?
10. Does this operation require a transaction?
11. Does the database need a migration?
12. Does this need a regression test?
13. Am I introducing an unnecessary dependency?
14. Can the implementation be simpler?
```

If a new abstraction, dependency, folder, service, repository, helper, or framework
is not justified, do not create it.

---

# 79. Mandatory Golden Rules

These rules have the highest priority:

1. **Frontend never accesses PostgreSQL directly.**
2. **Frontend uses JSX and JavaScript.**
3. **Controllers remain thin.**
4. **Services own business/application logic.**
5. **Repositories own database execution.**
6. **All SQL uses parameterized queries.**
7. **All external input is validated.**
8. **Authentication and authorization remain separate.**
9. **Authorization is always enforced server-side.**
10. **Tenant isolation is enforced server-side.**
11. **Passwords are never stored in plaintext.**
12. **Secrets are never committed.**
13. **Secrets are never exposed to the browser.**
14. **Transactions are used for multi-step atomic workflows.**
15. **Schema changes use migrations.**
16. **Large datasets use server-side pagination.**
17. **Avoid N+1 database queries.**
18. **Do not create unnecessary abstractions.**
19. **Do not introduce major frameworks without approval.**
20. **Use runtime validation because this project uses JavaScript.**
21. **Frontend permission hiding is UX, not security.**
22. **Tests must cover important business/security behavior.**
23. **Do not silently swallow exceptions.**
24. **Do not return sensitive database fields.**
25. **Prefer simple, reusable, maintainable designs.**
26. **Do not rewrite working architecture without a requirement.**
27. **When uncertain, preserve the existing project convention.**

---

# 80. Final Architecture

```text
                        PERN APPLICATION
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
        FRONTEND/                         BACKEND/
       React + JSX                       Node + Express
              │                               │
              │ HTTP/HTTPS                    │
              └───────────────┐               │
                              ▼               │
                         REST API              │
                              │               │
                              ▼               │
                           Routes              │
                              │               │
                              ▼               │
                         Middleware            │
                              │               │
                              ▼               │
                         Controller            │
                              │               │
                              ▼               │
                           Service             │
                              │               │
                              ▼               │
                         Repository            │
                              │               │
                              ▼               │
                         PostgreSQL            │
```

The clean dependency direction is:

```text
frontend
   ↓
HTTP API
   ↓
backend routes
   ↓
controllers
   ↓
services
   ↓
repositories
   ↓
PostgreSQL
```

---

# 81. Final Principle

When deciding where code belongs:

```text
Is it browser/UI code?
    → frontend/

Is it React/JSX?
    → frontend/

Is it HTTP endpoint definition?
    → backend/routes/

Is it HTTP request/response handling?
    → backend/controllers/

Is it business/application logic?
    → backend/services/

Is it database access?
    → backend/repositories/

Is it authentication/authorization middleware?
    → backend/middlewares/

Is it runtime validation?
    → backend/validators/

Is it database schema?
    → backend/migrations/

Is it deterministic reference data?
    → backend/seeds/

Is it genuinely shared and browser-safe?
    → shared/

Is it documentation?
    → docs/
```

Do not bypass these boundaries without a documented and justified reason.

# END OF AGENTS.md
