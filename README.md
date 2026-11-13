# MyFinds

Lost & found for the Delhi-NCR transport network. Commuters file lost-item reports, a rule-based engine matches them against found reports and the checked-in transport directory (DMRC, Indian Railways, DTC, ISBT), and station staff run the claim → handover flow with 6-digit one-time codes.

Live: server at `myfinds-server.vercel.app` (web deploy pending)
Demo credentials: see [`docs/DEMO_CREDENTIALS.md`](docs/DEMO_CREDENTIALS.md)

## Stack

- **Next.js** (App Router) + Tailwind + shadcn/ui + Serwist PWA — `apps/web`
- **Express** on Bun — `apps/server`, deployed to Vercel with zero config (framework auto-detected)
- **Prisma** + PostgreSQL (driver adapters, `pg_trgm` search) — `packages/db`
- **Better Auth** (email/password) — `packages/auth`
- **Shared validation & matching rules** — `packages/shared`
- **Cloudflare R2** for private photo storage
- **Turborepo** + bun workspaces

## Structure

```
apps/web        Next.js client (port 3001)
apps/server     Express API (port 3000, Vercel function)
packages/db     Prisma schema, generated client, seed
packages/auth   Better Auth config + adapters
packages/shared Zod schemas, matching rules, transport catalog
packages/ui     shadcn/ui primitives
```

## Getting started

```bash
bun install
bun run db:generate          # prisma generate (after schema changes too)
bun run db:push              # apply schema
bun run db:seed              # Delhi seed data
bun run dev                  # turbo dev (web + server)
```

Env lives in `apps/server/.env` (server) and web/db via varlock-encrypted env files. Vars: `DATABASE_URL`, `DIRECT_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `CORS_ORIGIN`, R2 keys.

## Tests & checks

```bash
cd apps/server && bun test   # 38 tests
cd apps/web && bun test      # vitest
bun run check-types          # turbo, whole monorepo
```

Run tests per package — running `bun test` at the root gives false failures.

## Deploying

Both projects deploy manually to Vercel (CI/CD was removed on purpose):

```bash
cd apps/server
npx vercel@latest build --prod     # local prebuilt build
vercel deploy --prebuilt           # preview, then promote when green
```

- The server's `vercel.json` buildCommand sources `apps/server/.env` when present (for `db:generate`) and runs `scripts/materialize-deps.mjs`, which makes the workspace packages and better-auth loadable inside Vercel's function runtime.
- On Vercel (not local) build env comes from Project Settings — no `.env` needed there.
- After a `vercel build`, run `bun install` once to restore the `@myfinds` symlinks for local dev.
- Web needs `bun run db:generate && bun run build` as its build command.

Full guide: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) · Architecture & rules: [`docs/Plan.md`](docs/Plan.md) · [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

## Day-wise progress

### Nov 03–05 — foundation & reports
- [x] Repo scaffolded (Better-T-Stack), monorepo + auth + DB wired
- [x] Shared report validation package (Zod schemas client + server)
- [x] Report submission + status integration end-to-end

### Nov 06 — photos, seed, matching
- [x] Cloudflare R2 photo uploads (private buckets, presigned)
- [x] Delhi-NCR seed data + `pg_trgm` search
- [x] Rule-based report matching engine (weighted: place/text/date/attributes)
- [x] Transport directory search expanded (DMRC + more operators)

### Nov 07 — matching flow & frontend review
- [x] Matching flow complete on frontend
- [x] Frontend review fixes merged

### Nov 10–13 — matching & frontend polish
- [x] Matching + frontend review work completed (PR #7)

### Nov 13 — staff console, claims & handover
- [x] Staff console, claim pipeline, handover codes (AES-256-GCM, one-time, constant-time verify)
- [x] Vercel deploy setup for server + web projects
- [x] CI/CD pipeline removed (manual deploys)

### Nov 13 — deploy hardening (Vercel)
- [x] Varlock removed from the server app entirely; env read via `process.env`
- [x] Zero-config Express on Vercel: no `api/` folder, no rewrites, no custom bundler; `export default app` entry
- [x] Function emits CommonJS (`module: "commonjs"`) so extensionless relative imports resolve
- [x] Hoisted bun linker + `materialize-deps.mjs`: workspace packages shipped as compiled CJS copies (packer strips symlinks)
- [x] Prisma generated client compiled to CJS in the deployed copies
- [x] better-auth (ESM-only) compiled to CJS and registered under the `require` export condition
- [x] Mid-file import in `transport-catalog.ts` moved to top (ESM hoisting vs CJS order)
- [x] Web `turbopack.resolveAlias` restored for `@myfinds/*`
- [x] Verified end-to-end: function module graph loads under plain Node, 38 server tests + typecheck green, web build green, live server responds (root + sign-in)

### Nov 16 — staff auth & access
- [x] Better Auth sign-in for staff
- [x] Server-side role guards on all `/staff` routes (staff/admin only)

### Nov 17 — staff queue & verification view
- [x] `/staff` queue of suggested matches sorted by score
- [x] Side-by-side match verification revealing hidden details strictly to staff

### Nov 18 — status machine
- [x] Status transition service (`/api/report-status`, timeline lookup by token)
- [x] Approve/reject transitions refuse illegal state jumps (e.g. rejection frees the lost report)

### Nov 19 — owner & staff verification
- [x] Owner flow after approval: claim a match ("this is mine") with verification questions
- [x] Staff verification step with required decision

### Nov 20 — privacy & abuse
- [x] Leak tests: secret owner details never appear in unauthorized responses
- [x] Rate limiting (per-IP windows on report submission and status lookups, claim/code attempt limits)

### Nov 23 — handover
- [x] Handover flow: ready-for-handover → one-time 6-digit code (AES-256-GCM encrypted at rest, expiring) → confirm receipt
- [x] `RETURNED` / `CLOSED` transitions wired

### Nov 26 — launch prep
- [x] Documentation finalized (ARCHITECTURE, DEPLOYMENT, Plan, PRD, demo credentials)
- [x] Server deployed to Vercel and verified live (web deploy pending)

### Still open
- [ ] Nov 24–25: external usability sessions, regression checklist, accessibility pass
- [ ] Nov 27: teach-backs, fresh-clone demo, post-MVP backlog
- [ ] Web app deploy to Vercel
