# TurfCare BD - Enterprise Turf Management Platform

A modern, enterprise-grade SaaS platform for sports field turf management and inspection, built with the PERN stack (PostgreSQL, Express.js, React, Node.js).

## Features

- Multi-tenant SaaS architecture with organization isolation
- Role-based dashboards (Super Admin, Org Admin, Inspector, Viewer)
- Server-side pagination for optimal performance
- Pitch Quality Score (PQS) engine with configurable weights
- Maintenance work order management with auto-generation from inspections
- Comprehensive reporting and analytics (PDF + CSV)
- Bangladesh payment gateway integration (SSLCommerz)
- Tier-based subscription limits (Free / Basic / Professional)
- Real-time notifications via Socket.io
- Responsive web app with Tailwind CSS

## Tech Stack

### Backend
- Node.js + Express.js
- PostgreSQL 16 + Prisma ORM
- Redis (caching & sessions)
- JWT authentication with refresh tokens
- Socket.io (real-time notifications)
- Winston (logging)
- pdfmake (invoice/report PDFs)

### Frontend
- React 18 + Vite
- Redux Toolkit (state management)
- Tailwind CSS (styling)
- React Router (routing)
- Axios (API client)

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 16+
- Redis 7+

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd TurfManagement
```

2. Install dependencies
```bash
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

3. Configure environment variables
```bash
cp backend/.env.example backend/.env
```

4. Start with Docker
```bash
docker-compose up -d
```

5. Or run locally
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

## Project Structure

```
├── backend/
│   ├── src/
│   │   ├── config/         # Database, Redis, env configs
│   │   ├── controllers/    # HTTP request handlers
│   │   ├── routes/         # API route definitions
│   │   ├── middleware/     # Auth, validation, errors, tenant
│   │   ├── services/       # Business logic
│   │   ├── repositories/   # Database access (Prisma)
│   │   ├── validators/     # Zod schemas
│   │   ├── utils/          # Helpers, scoring, pagination
│   │   └── server.js       # Entry point
│   ├── prisma/
│   │   └── schema.prisma   # Database schema
│   ├── tests/
│   │   ├── unit/
│   │   └── integration/
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Route pages
│   │   ├── store/          # Redux slices
│   │   ├── services/       # API clients
│   │   ├── utils/          # Helpers
│   │   ├── layouts/        # Layout components
│   │   └── App.jsx         # Entry point
│   ├── public/
│   ├── Dockerfile
│   └── nginx.conf
├── docker-compose.yml
└── README.md
```

## Architecture

### Multi-Tenancy
- Shared PostgreSQL database with `organizationId` tenant discriminator
- Automatic tenant scoping via Prisma client extension
- Row-level isolation enforced on every tenant-scoped query

### Performance
- Server-side pagination (Prisma skip/take + _count)
- Database composite indexes on `organizationId` + common filters
- Redis caching for frequent queries
- Compression middleware
- CDN-ready static assets via Nginx

### Security
- Helmet.js security headers
- Rate limiting (configurable per environment)
- JWT with refresh tokens
- Password hashing (bcrypt)
- Zod validation on all external input
- CORS restricted to configured frontend origin
- Tenant isolation enforced server-side

## API Documentation

Base URL: `/api`

### Auth
- `POST /api/auth/login` — Login with email/password
- `POST /api/auth/register` — Register new organization
- `POST /api/auth/refresh` — Refresh access token
- `POST /api/auth/logout` — Logout

### Fields
- `GET /api/fields` — List fields (tenant-scoped)
- `POST /api/fields` — Create field
- `GET /api/fields/:id` — Get field detail
- `PUT /api/fields/:id` — Update field
- `DELETE /api/fields/:id` — Delete field

### Inspections
- `GET /api/inspections` — List inspections
- `POST /api/inspections` — Create inspection (triggers PQS + auto-WO)
- `POST /api/inspections/:id/submit` — Submit for verification
- `POST /api/inspections/:id/verify` — Verify inspection
- `GET /api/inspections/:id/pdf` — Download inspection PDF

### Work Orders
- `GET /api/work-orders` — List work orders
- `POST /api/work-orders` — Create work order
- `PUT /api/work-orders/:id` — Update work order
- `DELETE /api/work-orders/:id` — Delete work order

### Subscriptions & Payments
- `GET /api/subscriptions` — Get current subscription
- `POST /api/subscriptions/checkout` — Create SSLCommerz checkout
- `GET /api/payments/invoice/:tranId` — Get invoice
- `GET /api/payments/invoice/:tranId/pdf` — Download invoice PDF
- `POST /api/payments/sslcommerz-ipn` — SSLCommerz webhook

## Testing

```bash
cd backend
npm test
```

Unit tests cover:
- Scoring engine (boundary tiers, malformed input)
- Plan limits (free/basic/professional enforcement)
- Work order auto-generation from inspections
- Payment service (invoice lifecycle)
- Pagination utilities

## License

Proprietary - TurfCare BD Enterprise

## Contact

TurfCare BD - Bangladesh Sports Infrastructure Management
