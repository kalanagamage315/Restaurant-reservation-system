# 🍽️ Restaurant Reservation System

A full-stack, microservices-based restaurant reservation platform built with a modern dark-themed UI. Customers can browse restaurants, check table availability, and make reservations — validated against each restaurant's opening hours and open days. Staff and Admins can manage, confirm, and check out reservations via a dedicated dashboard.

---

## 📐 Architecture Overview

```
┌─────────────────────────────────────────────┐
│               React Frontend                │
│           (Vite + React 19 + TS)            │
│              localhost:5173                 │
└──────────────────────┬──────────────────────┘
                       │ HTTP
                       ▼
┌─────────────────────────────────────────────┐
│              API Gateway                    │
│           (NestJS) :3000                    │
└────┬─────────┬─────────┬──────────┬─────────┘
     │         │         │          │
     ▼         ▼         ▼          ▼
 Identity  Reservation Restaurant  Table
  :3001      :3002       :3003     :3004
     │         │         │          │
     └────┬────┴────┬────┘          │
          │         │               │
          ▼         ▼               ▼
     ┌────────────────────────────────┐
     │     PostgreSQL :5432           │
     │  (schema-isolated per service) │
     └────────────────────────────────┘
```

All backend services are **NestJS** apps with **Prisma ORM** and **PostgreSQL** (separate schemas per service).

---

## 🗂️ Project Structure

```
restaurant-reservation-system/
├── infra/
│   └── docker-compose.yml        # Full stack orchestration
├── services/
│   ├── gateway/                  # API Gateway (port 3000)
│   ├── identity/                 # Auth & Users (port 3001)
│   ├── reservation/              # Reservations (port 3002)
│   ├── restaurant/               # Restaurants (port 3003)
│   └── table/                   # Tables (port 3004)
└── reservation-frontend/         # React SPA (port 5173)
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, React Query, React Router |
| Backend | NestJS 11, TypeScript, Passport JWT |
| ORM | Prisma 6 |
| Database | PostgreSQL 16 |
| API Gateway | NestJS HTTP reverse proxy |
| Containerization | Docker, Docker Compose |

---

## 🚀 Getting Started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- [Node.js 20+](https://nodejs.org/) (for local frontend development)
- [npm](https://npmjs.com/)

---

### Option 1 — Docker (All Backend Services)

Start all backend services (gateway + all microservices + PostgreSQL) with a single command:

```bash
cd infra
docker compose up --build
```

Services will be available at:

| Service | URL |
|---|---|
| API Gateway | http://localhost:3000 |
| Identity Service | http://localhost:3001 |
| Reservation Service | http://localhost:3002 |
| Restaurant Service | http://localhost:3003 |
| Table Service | http://localhost:3004 |

> **Note:** On first run, Docker will build all images and PostgreSQL will run schema migrations automatically.

---

### Option 2 — Run Frontend Locally

After the backend is running via Docker:

```bash
cd reservation-frontend
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

---

### Option 3 — Run Everything Locally (No Docker)

1. **Start PostgreSQL** (locally or via Docker):
   ```bash
   docker run -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres \
     -e POSTGRES_DB=restaurant_platform -p 5432:5432 postgres:16
   ```

2. **Start each service** (in separate terminals):
   ```bash
   # Identity
   cd services/identity && npm install && npm run start:dev

   # Restaurant
   cd services/restaurant && npm install && npm run start:dev

   # Table
   cd services/table && npm install && npm run start:dev

   # Reservation
   cd services/reservation && npm install && npm run start:dev

   # Gateway
   cd services/gateway && npm install && npm run start:dev
   ```

3. **Start the frontend:**
   ```bash
   cd reservation-frontend && npm install && npm run dev
   ```

---

## ⚙️ Environment Variables

Each service uses a `.env` file. Below are the key variables per service.

### Gateway (`services/gateway/.env`)
```env
PORT=3000
IDENTITY_URL=http://127.0.0.1:3001
RESERVATION_URL=http://127.0.0.1:3002
RESTAURANT_URL=http://127.0.0.1:3003
TABLE_URL=http://127.0.0.1:3004
```

### Identity (`services/identity/.env`)
```env
PORT=3001
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/restaurant_platform?schema=identity
JWT_ACCESS_SECRET=change_me_access
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=change_me_refresh
JWT_REFRESH_EXPIRES_IN=7d
```

### Reservation (`services/reservation/.env`)
```env
PORT=3002
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/restaurant_platform?schema=reservation
IDENTITY_SERVICE_URL=http://127.0.0.1:3001
RESTAURANT_SERVICE_URL=http://127.0.0.1:3003
TABLE_SERVICE_URL=http://127.0.0.1:3004
JWT_ACCESS_SECRET=change_me_access
APP_TZ_OFFSET=+05:30
```

### Restaurant (`services/restaurant/.env`)
```env
PORT=3003
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/restaurant_platform?schema=restaurant
JWT_ACCESS_SECRET=change_me_access
```

### Table (`services/table/.env`)
```env
PORT=3004
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/restaurant_platform?schema=table
JWT_ACCESS_SECRET=change_me_access
```

---

## 👥 User Roles

| Role | Permissions |
|---|---|
| **CUSTOMER** | Register, login, make reservations, cancel pending reservations, view own reservations |
| **STAFF** | View & manage reservations for their assigned restaurant, confirm with table, checkout |
| **ADMIN** | Full access across all restaurants — manage reservations, restaurants, tables, users |

---

## 📋 Key Features

### For Customers
- 🔍 Browse active restaurants
- 📅 Check table availability by date and guest count
- 📝 Create reservations (up to 30 days in advance) — validated against restaurant opening hours and open days
- ❌ Cancel pending reservations
- 👤 View and edit profile

### For Staff / Admin
- ✅ Confirm pending reservations by assigning a table
- ❌ Reject pending reservations
- 🆓 **Check out** (free) a confirmed reservation when the customer leaves
- 📊 View confirmed reservations filtered by date and table
- 🏪 Manage restaurants and tables (Admin only)
- 🕐 Set restaurant opening hours (`openTime`, `closeTime`) and open days per restaurant (Admin only)

### Table Assignment Logic
A table can only be assigned to a new reservation if **all existing CONFIRMED reservations on that table have been checked out**. This prevents double-booking without needing time-window math.

---

## 🔌 API Reference

All requests go through the **API Gateway** at `http://localhost:3000`.

The gateway routes requests based on the first path segment:

| Path prefix | Routes to |
|---|---|
| `/auth/*` | Identity Service — login, register, refresh |
| `/users/*` | Identity Service — user management |
| `/reservations/*` | Reservation Service |
| `/restaurants/*` | Restaurant Service |
| `/tables/*` | Table Service |

### Key Endpoints

#### Auth
| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/register` | Register a new customer |
| `POST` | `/auth/login` | Login (returns JWT) |
| `POST` | `/auth/refresh` | Refresh access token |

#### Reservations
| Method | Path | Role | Description |
|---|---|---|---|
| `POST` | `/reservations` | Customer | Create a reservation |
| `GET` | `/reservations/me` | Customer | My reservations |
| `GET` | `/reservations/availability` | Public | Available tables |
| `PATCH` | `/reservations/:id/cancel` | Customer | Cancel a reservation |
| `GET` | `/reservations` | Staff/Admin | List all reservations |
| `PATCH` | `/reservations/:id/confirm` | Staff/Admin | Confirm with table |
| `PATCH` | `/reservations/:id/reject` | Staff/Admin | Reject a reservation |
| `PATCH` | `/reservations/:id/checkout` | Staff/Admin | Check out / free table |
| `GET` | `/reservations/confirmed` | Staff/Admin | Confirmed reservations |

#### Restaurants
| Method | Path | Role | Description |
|---|---|---|---|
| `GET` | `/restaurants` | Public | List all active restaurants |
| `GET` | `/restaurants/:id` | Public | Get restaurant by ID (incl. hours) |
| `GET` | `/restaurants/admin/all` | Admin | List all restaurants (incl. inactive & hours) |
| `POST` | `/restaurants` | Admin | Create a restaurant |
| `PATCH` | `/restaurants/:id` | Admin | Update a restaurant (incl. hours & open days) |

#### Tables
| Method | Path | Role | Description |
|---|---|---|---|
| `GET` | `/tables` | Public | List tables by restaurant |
| `POST` | `/tables` | Admin | Add a table |
| `PATCH` | `/tables/:id` | Admin | Update a table |

---

## 🗄️ Database Schema (Overview)

Each microservice owns its own PostgreSQL schema:

| Schema | Key Models |
|---|---|
| `identity` | `User` (id, email, fullName, role, restaurantId) |
| `restaurant` | `Restaurant` (id, name, isActive, openTime, closeTime, openDays) |
| `table` | `DiningTable` (id, restaurantId, tableNumber, capacity, isActive) |
| `reservation` | `Reservation` (id, userId, restaurantId, tableId, status, reservedAt, checkedOutAt, ...) |

### Reservation Status Flow
```
PENDING → CONFIRMED (with table assigned) → checkedOutAt set (Freed)
        → REJECTED
        → CANCELLED (by customer)
```

---

## 🐳 Docker Services Summary

| Container | Image | Port | Schema |
|---|---|---|---|
| `restaurant_postgres` | postgres:16 | 5432 | — |
| `identity_service` | custom build | 3001 | identity |
| `reservation_service` | custom build | 3002 | reservation |
| `restaurant_service` | custom build | 3003 | restaurant |
| `table_service` | custom build | 3004 | table |
| `gateway_service` | custom build | 3000 | — |

---

## 📜 Available Scripts (per service)

```bash
npm run start:dev   # Development mode with hot-reload
npm run build       # Production build
npm run start:prod  # Run production build
npm run test        # Unit tests
npm run lint        # Lint & autofix
```

---

## 📁 Swagger / API Docs

Each backend service exposes a Swagger UI at `/api`:

| Service | Swagger URL |
|---|---|
| Identity | http://localhost:3001/api |
| Reservation | http://localhost:3002/api |
| Restaurant | http://localhost:3003/api |
| Table | http://localhost:3004/api |
