# Decisions

## Assumptions

- A small internal team: a few **agents** who handle inquiries and an **admin** (team lead) who oversees them. Customers never use the app; staff record what arrives by phone, email or chat.
- One contact field (an email *or* a phone number) is enough. Replies happen outside the app.
- Accounts are provisioned by an administrator, so there's no registration. Three accounts are seeded.

## Design choices

**1. Access: agents see what they created or are assigned to; admins see everything.**
Customer contact details are need-to-know, and a personal queue answers the brief's core problem: *who is handling this?* Assignment is the one additional field, and it is what moves work between people. The rule is enforced in the API at two points that can't drift apart:
- Every list and count query must be given a `scope`, so the repository cannot run an unscoped query.
- Every single-record read or write goes through `InquiryAccessPolicy.canView`. A unit test checks that the two always agree.

An inquiry you may not see returns **404, exactly like one that doesn't exist**, so ids can't be probed. The rule lives in one class (`RoleBasedInquiryAccessPolicy`), so changing it, e.g. to team-based access, doesn't touch services or SQL.

**2. The lifecycle is a data table shared by API and UI.**
`STATUS_TRANSITIONS` (in `shared/`) allows New → In Progress → Resolved, plus Resolved → In Progress (*reopen*), because customers do follow up. The API rejects anything else with **422** and lists what is allowed. The UI renders buttons from the same table, so it never offers an invalid move.
- New → Resolved is not allowed: an inquiry must be picked up first.
- Picking up an unassigned inquiry assigns it to you, so nothing is in progress or resolved without an owner.

**3. Stale data: optimistic concurrency with a version number.**
Every update sends the `version` the screen was showing. `UPDATE … WHERE id = $1 AND version = $2` makes "check, then write" one atomic step.
- If the version is stale, the API returns **409 with the current record**. The UI shows who changed what, swaps in the latest data, and says the change was not saved.
- Returning to a tab refetches, and the UI flags "updated by Nimal 2m ago". This narrows the window; the version check closes it.
- The version is checked *before* the transition rule. Otherwise a stale "Start working" on an inquiry someone already resolved would look like a valid *reopen*.

**Customer input.** One Zod schema in `shared/` validates on the client (instant guidance, focus moves to the first problem) and on the server (the real gate). Whitespace-only counts as missing. The API returns per-field messages that the form shows in the same places. For duplicates, a **partial unique index** allows only one *open* inquiry per normalised contact + subject. PostgreSQL arbitrates, so a double-click or two tabs cannot both succeed (there's a test for this). The 409 links to the existing inquiry, or says a colleague has it if you can't see it. Once that inquiry is resolved, the same request may be logged again.

**Structure.** Express: routes → controllers (parse and serialise only) → services (rules) → repositories (SQL). Classes receive their dependencies as interfaces through constructors (`InquiryRepository`, `InquiryAccessPolicy`, `PasswordHasher`, `TokenService`). Only `container.ts` picks concrete classes. The frontend mirrors this: components → hooks → typed API classes.

Library choices that shape the design:
- **Plain SQL via `pg`**, so the access scope and the version check are visible in the query.
- **TanStack Query** for cache, refetch-on-focus and the loading/error states.
- An **httpOnly, SameSite=Lax cookie** behind a Next.js proxy, so no token is readable by scripts and no CORS is needed.

## Trade-off accepted

**The whole record is versioned, not individual fields.** If one tab reassigns an inquiry while another changes its status, the second gets a 409 even though the two edits don't really conflict. I accepted this because it is simple, always safe, and costs the user one click: they see the latest state and retry. Field-level merging would add complexity for a rare case.

## What I'd improve next

1. **Activity history**, i.e. who changed status or owner and when. The brief mentions losing track of "what happened last"; today only the last update is shown.
2. **Revocable sessions.** JWTs are stateless: logging out clears the cookie, but a copied token stays valid until it expires (8 h). The user is re-read on every request, so a deleted account is locked out immediately. Next steps would be a server-side session table and login rate limiting.
3. Internal notes on an inquiry, and Playwright tests in CI.

## Testing gaps

- **No browser end-to-end suite in the repo.** The full workflow was checked with a scripted browser run (sign-in, create, duplicate, search, lifecycle, two-window conflict, forbidden link, session expiry, phone width), but that script is not part of `npm test`.
- **Not every view has component tests.** The list, dashboard and login screens have none. Tests focus on the form, the lifecycle controls and the conflict handling.
- **The SQL is only tested through the API tests.** There are no separate repository unit tests and no performance tests on large data sets.

## Use of AI

I used Claude Code as a pair programmer. I set the direction, the constraints and what "done" meant. It wrote most of the code. I reviewed and tested the result, and kept only what I could explain.

**Decisions I made before code was written**
- **Stack.** The assistant first proposed React + Vite. I chose Next.js because the brief lists it first, and kept it to the frontend only: every rule and all data access stay in the Express API, with no Next.js API routes or Server Actions. That keeps the backend half of the work clearly separate.
- **Prototype first.** I had a clickable HTML prototype (`prototype/index.html`) built in the ERP-style dashboard and login layout I wanted. I used it to settle the access rule, the lifecycle, and the conflict and duplicate behaviour before any API existed, and then treated it as the spec.
- **Architecture rules.** I required SOLID and OOP to be visible in the code: layers with one job each, dependencies passed in as interfaces, and one place (`container.ts`) that picks concrete classes. This is why the access rule and the database can be changed or tested in isolation.

**Where it helped most:** turning the prototype into typed code across three packages, writing SQL and tests for edge cases (races, stale versions, invalid ids), and drafting the README and this document, which I then edited.

**How I checked its work:** the rules in this document are covered by tests that run against real PostgreSQL. Those include a test that the list scope and `canView` always agree, and two tests that send simultaneous requests to prove the race handling. The full workflow was also checked in a browser (see *Testing gaps*).

**Accepted, changed, rejected**
- **Accepted:** enforcing duplicates with a partial unique index instead of "check, then insert" in code. Two requests can both pass the check before either one inserts. With the index, PostgreSQL decides, and a test fires two requests at once to prove it.
- **Changed:** besides the stack, a generated test expected unknown API routes to return 404 even when signed out. I changed it to expect authentication first (401), so anonymous callers can't map the API. This matches returning 404 for inquiries you may not see.
- **Rejected:** an in-memory fake repository for the API tests. It would have re-implemented the access scoping, so the tests would check a copy instead of the real SQL. I also rejected `If-Match`/ETag headers for versioning in favour of a plain `version` field, which is easier to use from the UI and to explain.
