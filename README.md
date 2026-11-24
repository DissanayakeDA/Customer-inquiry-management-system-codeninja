# InquiryDesk: Customer Inquiry Management System

Staff sign in, record customer inquiries, find them again, and move them through **New → In Progress → Resolved**, with a clear owner at every step.

| Layer    | Technology                                                                       |
| -------- | -------------------------------------------------------------------------------- |
| Frontend | Next.js 16 (App Router), React 19, TanStack Query                                 |
| Backend  | Node.js, Express 5, `pg` (plain SQL with a repository layer, no ORM)            |
| Database | PostgreSQL 14+ (SQL migrations in `server/src/db/migrations`)                    |
| Shared   | `shared/`: Zod validation schemas, status rules, access rule, API types; used by both tiers |
| Tests    | Vitest + Supertest (API, against a real PostgreSQL), Vitest + Testing Library (UI) |

The design decisions and trade-offs are in **[DECISIONS.md](DECISIONS.md)**. The original clickable prototype is in [`prototype/index.html`](prototype/index.html).

---

## Run it locally

**Prerequisites:** Node.js 20.12+ and PostgreSQL 14+: local through Docker (below), or a hosted database such as Neon (see the note after the steps).

```bash
# 1. Install all workspaces (shared, server, client)
npm install

# 2. Start PostgreSQL. This creates the `inquirydesk` and `inquirydesk_test` databases.
docker compose up -d

# 3. Create the schema and load demo data
npm run db:setup

# 4. Start the API (http://localhost:4000) and the web app (http://localhost:3000)
npm run dev
```

Open **http://localhost:3000** and sign in with a test account below.

<details>
<summary>Using Neon (hosted PostgreSQL) or your own PostgreSQL instead of Docker</summary>

Skip `docker compose up -d`. Copy `server/.env.example` to `server/.env` and set two connection strings:

- **`DATABASE_URL`**: the app's database.
  - **Neon:** paste the connection string from the Neon dashboard. The pooled endpoint (`-pooler` in the host) works for both the app and `npm run db:setup`. Change `sslmode=require` to `sslmode=verify-full`: node-postgres already treats them the same, but warns about `require`.
  - **Your own install:** `createdb inquirydesk`.
- **`TEST_DATABASE_URL`**: a **separate** database whose name ends in `_test`. The test suite drops and recreates its schema. On Neon, add a database named `inquirydesk_test` to the same project and reuse the connection string with that name. On your own install, run `createdb inquirydesk_test`.

Then continue from step 3. Without a `server/.env`, the defaults match `docker-compose.yml` (`postgres:postgres@localhost:5432`).
</details>

### Test accounts

All seeded by `npm run db:seed`. The password for all three is **`Password123!`**. The sign-in page can also fill them in for you.

| Email                     | Role  | Sees                                       |
| ------------------------- | ----- | ------------------------------------------ |
| `nimal@inquirydesk.test`  | Admin | every inquiry                              |
| `ayesha@inquirydesk.test` | Agent | inquiries she created or is assigned to    |
| `kasun@inquirydesk.test`  | Agent | inquiries he created or is assigned to     |

To see the access rule work, sign in as Ayesha and open **http://localhost:3000/inquiries/1004** (Kasun's). You get "Inquiry not found", and the API returns 404. As Nimal, the same link opens.

### Scripts (from the repository root)

| Command               | What it does                                                         |
| --------------------- | -------------------------------------------------------------------- |
| `npm run dev`         | API (`tsx watch`) and Next.js dev server together                    |
| `npm run db:migrate`  | Apply pending SQL migrations (safe to re-run)                        |
| `npm run db:seed`     | **Reset** users and inquiries to the demo data (refuses to run in production) |
| `npm run db:setup`    | `db:migrate` then `db:seed`                                          |
| `npm test`            | Server tests, then client tests                                      |
| `npm run typecheck`   | TypeScript check of all three packages                               |
| `npm run build`       | Production build of the web app                                      |

## Tests

```bash
npm test               # everything
npm run test:server    # needs PostgreSQL running (uses inquirydesk_test)
npm run test:client    # no database needed
```

- **Server (53 tests).** Unit tests for the status lifecycle, the access rule and the validation rules. API tests run the real Express app against a real PostgreSQL. They cover: 401 without a valid session, 400 field errors when the UI is bypassed, 404 for another agent's inquiry (read *and* write), 400 for malformed ids, 422 for New → Resolved, 409 for a stale version, the duplicate guard (including two *simultaneous* submissions), search and filters. The API suite **drops and recreates the schema** of the test database, so it refuses to run unless the database name ends in `_test`.
- **Client (13 tests).**
  - The new-inquiry form: guidance, focus, live error clearing, trimmed payload, double-submit guard, and server errors shown inline.
  - The status panel only offers allowed transitions.
  - The detail view's handling of a 409 from another tab, a 404, and an invalid link. This test mocks only `fetch`, not components.

Known gaps are listed in [DECISIONS.md](DECISIONS.md#testing-gaps).

---

## How it fits together

```
Browser ──► Next.js :3000 ──(rewrite /api/*)──► Express :4000 ──► PostgreSQL
            pages + React Query                 routes → controllers → services → repositories
```

The browser only talks to Next.js. Next proxies `/api/*` to Express, so the session cookie stays first-party (`httpOnly`, `SameSite=Lax`) and no CORS is needed.

```
shared/src/        status.ts (lifecycle table) · validation.ts (Zod) · access.ts · api-types.ts
server/src/
  domain/          entities, error hierarchy, StatusTransitionPolicy, InquiryAccessPolicy
  repositories/    interfaces + PostgreSQL implementations (parameterised SQL)
  services/        AuthService, InquiryService, DashboardService (business rules)
  http/            controllers, authenticate middleware, error handler, session cookie
  security/        PasswordHasher (bcrypt), TokenService (JWT)
  container.ts     composition root: the only place concrete classes are chosen
  db/              pool, migration runner, migrations/*.sql, seed data
client/src/
  app/             routes: /login, /dashboard, /inquiries, /inquiries/new, /inquiries/[id]
  components/      feature components (inquiries, dashboard, auth, layout) + ui primitives
  hooks/           React Query hooks; the only code that touches the API and the cache
  lib/api/         HttpClient, per-resource API classes, ApiError
  proxy.ts         redirects visitors without a session cookie to /login (UX only)
```

## API

All endpoints are under `/api`. Everything except `health`, `auth/login` and `auth/logout` requires a session.

| Method & path                        | Purpose                           | Success | Notable failures |
| ------------------------------------ | --------------------------------- | ------- | ---------------- |
| `POST /auth/login`                   | Sign in, sets session cookie      | 200     | 400 invalid body, 401 `INVALID_CREDENTIALS` |
| `POST /auth/logout`                  | Clear session cookie              | 204     | |
| `GET /auth/me`                       | Current user                      | 200     | 401 |
| `GET /users`                         | Staff list (for assignment)       | 200     | 401 |
| `GET /dashboard`                     | Counts, my open queue, recent     | 200     | 401 |
| `GET /inquiries?q=&status=&assignee=me\|none&page=&pageSize=` | Search & filter (scoped to what you may see) | 200 | 400 bad filter |
| `POST /inquiries`                    | Record an inquiry (always starts New) | 201 + `Location` | 400 `VALIDATION_ERROR`, 409 `DUPLICATE_INQUIRY` |
| `GET /inquiries/:id`                 | One inquiry                       | 200     | 400 `INVALID_ID`, 404 `NOT_FOUND` (missing *or* not yours) |
| `PATCH /inquiries/:id/status` `{status, version}` | Move through the lifecycle | 200 | 409 `STALE_VERSION`, 422 `INVALID_TRANSITION`, 404 |
| `PATCH /inquiries/:id/assignee` `{assigneeId, version}` | Assign / unassign | 200 | 409 `STALE_VERSION`, 400 unknown staff, 404 |

Every error has the same shape, and `code` is stable so the UI can branch on it:

```json
{ "error": { "code": "STALE_VERSION", "message": "This inquiry was changed by Kasun Silva after you loaded it. Your change was not saved.", "details": { "current": { "...": "..." } } } }
```

Try it without the UI (works against `:3000` or `:4000`):

```bash
curl -c jar -H 'Content-Type: application/json' -d '{"email":"ayesha@inquirydesk.test","password":"Password123!"}' localhost:4000/api/auth/login
curl -b jar localhost:4000/api/inquiries/1004                      # 404: Kasun's inquiry
curl -b jar -X PATCH -H 'Content-Type: application/json' -d '{"status":"resolved","version":1}' localhost:4000/api/inquiries/1009/status   # 422
```

## Troubleshooting

- **`ECONNREFUSED 127.0.0.1:5432`**: PostgreSQL isn't running. Run `docker compose up -d` and wait a few seconds.
- **`relation "users" does not exist`**: run `npm run db:setup`.
- **First request after a pause is slow on Neon**: Neon suspends an idle database after a few minutes, and the next query wakes it (a few seconds). Later requests are fast again.
- **Server tests say the test database is unreachable**: the Docker init script only runs the first time the volume is created. If you created the volume before, run `docker compose exec db createdb -U postgres inquirydesk_test`.
- **Port 3000 or 4000 in use**: set `PORT` in `server/.env`, and `API_URL` in `client/.env.local` to match.
