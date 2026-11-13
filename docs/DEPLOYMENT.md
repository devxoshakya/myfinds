# Deployment guide

The monorepo ships two Vercel projects plus shared infra:

| Piece | Project | Type |
| --- | --- | --- |
| Express API (`apps/server`) | `myfinds-server` | Vercel serverless functions (`api/index.ts` + `vercel.json`) |
| Next.js web (`apps/web`) | `myfinds-web` | Vercel framework preset (auto-detected) |
| Postgres | Supabase (already provisioned) | Pooled URL for runtime, direct URL for migrations |
| Photo storage | Supabase Storage (S3 protocol) — private bucket | S3-compatible |

CI/CD lives in `.github/workflows/ci-cd.yml`: type-check + tests on every
push/PR, prebuilt production deploys on `main`/`master`.

## 0. Where each secret lives (cheat sheet)

| Secret | Where to get it |
| --- | --- |
| Supabase `DATABASE_URL` / `DIRECT_URL` | Supabase Dashboard → **Project Settings → Database → Connection string**. Pick "Transaction pooler" for `DATABASE_URL` (port 6543) and "Direct connection" for `DIRECT_URL` (port 5432). |
| Supabase S3 keys | ✅ configured in `apps/server/.env` — endpoint `https://ggvnyolssosfrwsduidv.storage.supabase.co/storage/v1/s3`, region `us-east-1`, bucket `myfinds-photos` (verified end-to-end: presign → PUT → HEAD → signed GET → delete). Copy the five `S3_*` values from `apps/server/.env` into the Vercel project. |
| `BETTER_AUTH_SECRET` | `bun -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` or any 32+ char random string. |
| Vercel token | vercel.com → avatar → **Account Settings → Tokens → Create** (scope: your team). |
| `VERCEL_ORG_ID` / project ids | After `npx vercel link` in each app dir, read `apps/<app>/.vercel/project.json`. |
| GitHub Actions secrets | github.com → your repo → **Settings → Secrets and variables → Actions → New repository secret**. |

## 1. Create the two Vercel projects (no GitHub connection needed)

If the Vercel account you deploy with does **not** have access to the GitHub
repo (separate account), skip the dashboard import entirely — the CI pipeline
builds and uploads from the Actions runner, so Vercel never touches GitHub.
Create the projects from your local machine:

```sh
cd apps/server && npx vercel link    # answer: set up new project "myfinds-server"
cd apps/web    && npx vercel link    # answer: set up new project "myfinds-web"
```

(`vercel link` in a monorepo app directory creates the project with that app as
its root directory — confirm with `npx vercel project ls`.)

Copy `orgId` / `projectId` out of each `apps/*/.vercel/project.json` — they
become the GitHub secrets below.

> If the deploying account *can* see the repo: vercel.com → Add New → Project →
> Import `devxoshakya/myfinds` twice, with Root Directory `apps/server`
> (framework: Other) and `apps/web` (framework: Next.js auto-detected).

## 2. Environment variables (Vercel dashboard → Project → Settings → Environment Variables)

### `myfinds-server`

| Variable | Notes |
| --- | --- |
| `BETTER_AUTH_SECRET` | 32+ chars. **Generate a fresh one for production** — it is also the report idempotency/status-token crypto key (`BETTER_AUTH_SECRET` is committed to the repo in `.env` today; treat it as leaked). |
| `BETTER_AUTH_URL` | Production server URL, e.g. `https://myfinds-server.vercel.app`. |
| `CORS_ORIGIN` | The web app's production URL, e.g. `https://myfinds-web.vercel.app` (only one origin is allowed — update if you add domains). |
| `DATABASE_URL` | Supabase **pooled** (transaction-mode, port 6543) connection string. |
| `DIRECT_URL` | Supabase **direct** (port 5432) connection string; needed at build time by `prisma.config.ts`. |
| `S3_ENDPOINT` | Supabase: `https://<project-ref>.supabase.co/storage/v1/s3` |
| `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | Supabase Dashboard → Storage → Settings → **S3 access keys**. |
| `S3_BUCKET_NAME` | A **private** Supabase Storage bucket name. |

### `myfinds-web`

| Variable | Notes |
| --- | --- |
| `NEXT_PUBLIC_SERVER_URL` | Production server URL; build-time, so set it before deploying. |

Note: `.env` files are not committed, and `varlock codegen` (root postinstall)
succeeds without them, so nothing else needs to be staged for Vercel.

## 3. GitHub secrets (Settings → Secrets and variables → Actions)

- `VERCEL_TOKEN` — personal token with deploy scope (vercel.com/account/tokens).
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID_SERVER`
- `VERCEL_PROJECT_ID_WEB`

## 4. Database schema

Apply migrations to production before the first deploy:

```sh
bun run db:migrate        # or: prisma migrate deploy against DIRECT_URL
bun run db:seed           # optional: demo stations + reports
```

## 5. Staff accounts

No admin UI exists yet; bootstrap demo staff with the CLI script (uses Better
Auth signup, so passwords hash correctly):

```sh
cd apps/server
bun run staff:create --email staff@example.test --password "<8+ chars>" \
  --name "Ravi Kumar" --role STATION_STAFF \
  --station "Rajiv Chowk Metro" --station "Central Secretariat Metro"
bun run staff:create --email admin@example.test --password "<8+ chars>" \
  --name "Admin" --role ADMIN
```

Station names must match seeded `Station.name` values. `STATION_STAFF` can then
confirm receipt on their stations: `POST /api/staff/reports/:id/confirm-receipt`.

## 6. Deploy

Push to `main` — the workflow deploys both projects. Manual deploy:

```sh
cd apps/server && npx vercel --prod
cd apps/web    && npx vercel --prod
```

## Known gaps after this setup

- Staff surface is demo-minimum: receipt confirmation only. Still missing:
  staff queue endpoint, claim approve/reject (attempt counting → `LOCKED`),
  handover code flow, counter drop-off report creation (`RECEIVED_BY_STOP`),
  daily rematch/expiry jobs, email notifications.
- In-memory rate limiting is per serverless instance — fine for a demo, needs
  Upstash/Redis for production guarantees.
- In-memory idempotency/rate limiting resets between invocations (same caveat).
- Only one `CORS_ORIGIN` is supported by `src/app.ts`.
- Better Auth warns the generated `auth.prisma` may be stale; re-run
  `bun run auth:generate` and re-add the app relations block if regenerated.
- Supabase pooler TLS currently uses `rejectUnauthorized: false` (see
  `packages/db/src/index.ts`); pin the Supabase CA before launch.
